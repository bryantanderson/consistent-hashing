import { Redis } from "ioredis";
import { AVLTree } from "./avlTree";
import { NODE_STATES, PING_FAILURE_THRESHOLD } from "./constants";
import { PhysicalNode, VirtualNode } from "./types";
import { generateHash, visualizeHashRing } from "./utils";

class HashRing {
  private ring: AVLTree;
  private physicalNodeRegistry: Map<string, PhysicalNode>;

  // Environment variable based configuration
  private verboseLog: boolean = false;
  private virtualNodeCount: number;
  private physicalNodeCount: number;

  constructor() {
    this.ring = new AVLTree();
    this.verboseLog = process.env.VERBOSE_LOGGING_ENABLED !== "false";
    // In a production environment, the data structure is stored on a centralized highly available service.
    // Alternatively, the data structure is stored on each node, and the state information between the nodes
    // is synchronized through the gossip protocol
    this.physicalNodeRegistry = new Map();

    this.virtualNodeCount = parseInt(process.env.VIRTUAL_NODE_COUNT ?? "5");
    this.physicalNodeCount = parseInt(process.env.PHYSICAL_NODE_COUNT ?? "3");

    for (let i = 0; i < this.physicalNodeCount; i++) {
      this.physicalNodeRegistry.set(this.getPhysicalNodeId(i), this.createPhysicalNode(i));
    }

    this.createVirtualNodes();
    this.startHealthCheckProbe();
  }

  private getPhysicalNode(key: string) {
    if (!this.ring || !this.ring.root) {
      return;
    }

    const hash = generateHash(key);
    const successorNode = this.ring.findNextClockwiseNode(hash);

    if (!successorNode) {
      return;
    }

    return this.physicalNodeRegistry.get(successorNode.physicalNodeId);
  }

  private createVirtualNodes() {
    this.ring = new AVLTree();

    // Generate hashes for the address / identifier of each node
    // and push the hashes onto the ring
    for (const n of this.activeCacheNodes) {
      // For each node, generate virtual nodes
      for (let i = 0; i < this.virtualNodeCount; i++) {
        const virtualNodeId = `${n.nodeId}-virtual-${i}`;
        const nodePosition = generateHash(virtualNodeId);
        this.ring.insert({
          position: nodePosition,
          virtualNodeId,
          physicalNodeId: n.nodeId,
        });
      }
    }
  }

  // Checks the liveness of the Redis nodes on an interval. If a node is found to be inactive,
  // it is removed from the hash ring, and the hash ring is rebalanced.
  private startHealthCheckProbe(intervalMs: number = 1000) {
    const interval = setInterval(() => {
      for (const node of this.physicalNodeRegistry.values()) {
        try {
          node.client.ping();
          node.state = NODE_STATES.ACTIVE;
          node.pingFailures = 0;
        } catch (error) {
          // If the node is inactive, hide it from the hash ring and rebalance
          if (node.pingFailures >= PING_FAILURE_THRESHOLD) {
            node.state = NODE_STATES.INACTIVE;
            this.removeNode(node);
            continue;
          }
          node.pingFailures++;
        }
      }
    }, intervalMs);

    process.on("SIGINT", () => {
      clearInterval(interval);
    });
  }

  private getPhysicalNodeId(nodeCount: number) {
    return `node-${nodeCount}`;
  }

  private createPhysicalNode(nodeCount: number) {
    return {
      client: new Redis({
        host: "localhost",
        port: 6379 + nodeCount,
        connectTimeout: 120000,
      }),
      nodeId: this.getPhysicalNodeId(nodeCount),
      pingFailures: 0,
      state: NODE_STATES.ACTIVE,
    };
  }

  private async redistributeKeysBetweenNodes(
    source: PhysicalNode,
    target: PhysicalNode,
    targetVirtualNodePositions: Array<number>
  ) {
    let cursor = "0";
    let redistributed = 0;

    while (true) {
      // Ref: https://redis.io/docs/latest/commands/scan/
      const [nextCursor, keys] = await source.client.scan(cursor, "COUNT", 1000);

      if (!keys.length) {
        break;
      }

      // SCAN may return the same element multiple times, so we use a set to ensure
      // no duplicates are processed
      const processed = new Set<string>();
      const keysToRedistribute = [];

      for (const key of keys) {
        if (processed.has(key)) {
          continue;
        }
        const hash = generateHash(key);
        // Check if the key belongs to any of the new virtual nodes
        for (const p of targetVirtualNodePositions) {
          if (hash <= p) {
            keysToRedistribute.push(key);
            break;
          }
        }
        processed.add(key);
      }

      if (!keysToRedistribute.length) {
        continue;
      }

      const values = await source.client.mget(...keysToRedistribute);

      if (!values) {
        continue;
      }

      const setPipeline = target.client.pipeline();
      const deletePipeline = source.client.pipeline();

      for (let i = 0; i < keysToRedistribute.length; i++) {
        setPipeline.set(keysToRedistribute[i], values[i] ?? "N/A");
        deletePipeline.del(keysToRedistribute[i]);
        redistributed++;
      }

      await Promise.all([setPipeline.exec(), deletePipeline.exec()]);

      // Check whether we've reached the end of the pagination
      if (nextCursor === "0") {
        break;
      }

      cursor = nextCursor;
    }

    return redistributed;
  }

  private generateVirtualNodes(node: PhysicalNode) {
    const virtualNodes = [];

    for (let i = 0; i < this.virtualNodeCount; i++) {
      const virtualNodeId = `${node.nodeId}-virtual-${i}`;
      const nodePosition = generateHash(virtualNodeId);

      virtualNodes.push({
        virtualNodeId,
        nodePosition,
        physicalNodeId: node.nodeId,
      });
    }

    return virtualNodes;
  }

  private generateKeyRedistributionMap(virtualNodes: Array<VirtualNode>) {
    const keyRedistributionMap = new Map<string, Array<number>>();

    for (const v of virtualNodes) {
      const successorNode = this.ring.findNextClockwiseNode(v.nodePosition);

      if (successorNode && successorNode.physicalNodeId !== v.physicalNodeId) {
        // Group by physical node to avoid redundant scans
        if (!keyRedistributionMap.has(successorNode.physicalNodeId)) {
          keyRedistributionMap.set(successorNode.physicalNodeId, []);
        }
        const arr = keyRedistributionMap.get(successorNode.physicalNodeId);
        arr?.push(v.nodePosition);
      }
    }

    return keyRedistributionMap;
  }

  get activeCacheNodes() {
    const nodesRaw = this.physicalNodeRegistry.values();
    return Array.from(nodesRaw).filter((n) => n.state === NODE_STATES.ACTIVE);
  }

  setValue(key: string, value: string) {
    const cacheNode = this.getPhysicalNode(key);

    if (!cacheNode) {
      return;
    }

    if (this.verboseLog) {
      console.log(`Setting key ${key}. Next clockwise Cache node: ${cacheNode.nodeId}`);
    }

    try {
      return cacheNode.client.set(key, value);
    } catch (error) {
      console.error(`Error setting key ${key}:`, error);
      return null;
    }
  }

  getValue(key: string) {
    const cacheNode = this.getPhysicalNode(key);

    if (!cacheNode) {
      return;
    }

    if (this.verboseLog) {
      console.log(`Fetching key ${key}. Next clockwise Cache node: ${cacheNode.nodeId}`);
    }

    try {
      return cacheNode.client.get(key);
    } catch (error) {
      console.error(`Error retrieving key ${key}:`, error);
      return null;
    }
  }

  // TODO: Thorough testing
  async addNode(node: PhysicalNode) {
    console.log(`Physical node ${node.nodeId} added to ring`);

    let totalRedistributed = 0;

    const virtualNodes = this.generateVirtualNodes(node);
    // Maps an affected physical node's ID to a list of virtual node positions that will
    // overlap with the positions of existing virtual nodes for the given physical node
    const keyRedistributionMap = this.generateKeyRedistributionMap(virtualNodes);

    // Insert virtual nodes into hash ring
    for (const v of virtualNodes) {
      this.ring.insert({
        position: v.nodePosition,
        virtualNodeId: v.virtualNodeId,
        physicalNodeId: node.nodeId,
      });
    }

    const redistributionTasks = [];

    for (const [nodeId, positions] of keyRedistributionMap.entries()) {
      const source = this.physicalNodeRegistry.get(nodeId);
      const target = node;

      if (!source) {
        continue;
      }

      const task = this.redistributeKeysBetweenNodes(source, target, positions)
        .then((count) => {
          totalRedistributed += count;
          console.log(`Redistributed ${count} keys from node ${nodeId} to new node ${node.nodeId}`);
        })
        .catch((error) => {
          console.error(`Error redistributing keys: ${JSON.stringify(error)}`);
        });

      redistributionTasks.push(task);
    }

    await Promise.all(redistributionTasks);

    this.physicalNodeRegistry.set(node.nodeId, node);
    return this; // Allow chaining
  }

  // TODO: Thorough testing
  async removeNode(node: PhysicalNode) {
    console.log(`Physical node ${node.nodeId} has failed`);

    let totalRedistributed = 0;

    const virtualNodes = this.generateVirtualNodes(node);
    // Maps an affected physical node's ID to a list of virtual node positions that will
    // overlap with the positions of existing virtual nodes for the given physical node
    const keyRedistributionMap = this.generateKeyRedistributionMap(virtualNodes);

    // Remove virtual nodes from hash ring
    for (const v of virtualNodes) {
      this.ring.delete({
        position: v.nodePosition,
        virtualNodeId: v.virtualNodeId,
        physicalNodeId: node.nodeId,
      });
    }

    const redistributionTasks = [];

    for (const [nodeId, positions] of keyRedistributionMap.entries()) {
      const source = node;
      const target = this.physicalNodeRegistry.get(nodeId);

      if (!target) {
        continue;
      }

      const task = this.redistributeKeysBetweenNodes(source, target, positions)
        .then((count) => {
          totalRedistributed += count;
          console.log(`Redistributed ${count} keys from failed node ${node.nodeId} to successor node ${nodeId}`);
        })
        .catch((error) => {
          console.error(`Error redistributing keys: ${JSON.stringify(error)}`);
        });

      redistributionTasks.push(task);
    }

    await Promise.all(redistributionTasks);

    this.physicalNodeRegistry.delete(node.nodeId);
    return this; // Allow chaining
  }

  visualize() {
    try {
      return visualizeHashRing({
        ring: this.ring,
        getPhysicalNode: this.getPhysicalNode.bind(this),
      });
    } catch (error) {
      console.error(`Error while visualizing hash ring: ${JSON.stringify(error)}`);
      return "Error while visualizing hash ring";
    }
  }

  async shutdown() {
    for (const node of this.physicalNodeRegistry.values()) {
      console.log(`Closing connection to cache node ${node.nodeId}...`);
      try {
        await node.client.quit();
      } catch (error) {
        console.error(`Error disconnecting from node: ${JSON.stringify(error)}`);
      }
    }
  }
}

export { HashRing };
