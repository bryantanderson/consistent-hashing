import { Redis } from "ioredis";
import { NODE_STATES, PING_FAILURE_THRESHOLD } from "./constants";
import { PhysicalNode } from "./types";
import { generateHash, visualizeHashRing } from "./utils";
import { AVLTree } from "./avlTree";

class HashRing {
	private ring: AVLTree;
	private verboseLog: boolean = false;
	private physicalNodeRegistry: Map<string, PhysicalNode>;

	constructor() {
		this.ring = new AVLTree();
		this.verboseLog = process.env.VERBOSE_LOGGING_ENABLED !== "false";
		// In a production environment, the data structure is stored on a centralized highly available service.
		// Alternatively, the data structure is stored on each node, and the state information between the nodes
		// is synchronized through the gossip protocol
		this.physicalNodeRegistry = new Map();

		const physicalNodeCount = parseInt(process.env.PHYSICAL_NODES ?? "3");

		for (let i = 0; i < physicalNodeCount; i++) {
			this.physicalNodeRegistry.set(
				this.getPhysicalNodeId(i),
				this.createPhysicalNode(i)
			);
		}

		this.createVirtualNodes();
		this.startProbe();
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

		const virtualNodeCount = parseInt(
			process.env.VIRTUAL_NODE_COUNT ?? "5"
		);

		// Generate hashes for the address / identifier of each node
		// and push the hashes onto the ring
		for (const n of this.activeCacheNodes) {
			// For each node, generate virtual nodes
			for (let i = 0; i < virtualNodeCount; i++) {
				const virtualNodeId = `${n.nodeId}-virtual-${i}`;
				const position = generateHash(virtualNodeId);
				this.ring.insert({
					position,
					virtualNodeId,
					physicalNodeId: n.nodeId,
				});
			}
		}
	}

	// Checks the liveness of the Redis nodes on an interval. If a node is found to be inactive,
	// it is removed from the hash ring, and the hash ring is rebalanced.
	private startProbe(intervalMs: number = 1000) {
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

	private get activeCacheNodes() {
		const nodesRaw = this.physicalNodeRegistry.values();
		// Ignore any inactive nodes
		return Array.from(nodesRaw).filter(
			(n) => n.state === NODE_STATES.ACTIVE
		);
	}

	setValue(key: string, value: string) {
		const cacheNode = this.getPhysicalNode(key);

		if (!cacheNode) {
			return;
		}

		if (this.verboseLog) {
			console.log(
				`Setting key ${key}. Next clockwise Cache node: ${cacheNode.nodeId}`
			);
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
			console.log(
				`Fetching key ${key}. Next clockwise Cache node: ${cacheNode.nodeId}`
			);
		}

		try {
			return cacheNode.client.get(key);
		} catch (error) {
			console.error(`Error retrieving key ${key}:`, error);
			return null;
		}
	}

	visualize() {
		try {
      return visualizeHashRing(this.ring, this.getPhysicalNode.bind(this));
    } catch (error) {
      console.error(`Error while visualizing hash ring: ${JSON.stringify(error)}`);
      return 'Error while visualizing hash ring';
    }
	}

	async shutdown() {
		for (const node of this.physicalNodeRegistry.values()) {
			console.log(`Closing connection to cache node ${node.nodeId}...`);
			try {
				await node.client.quit();
			} catch (error) {
				console.error(
					`Error disconnecting from node: ${JSON.stringify(error)}`
				);
			}
		}
	}

	addNode(node: PhysicalNode) {
		console.log(
			`Physical node ${node.nodeId} added. Redistributing keys...`
		);
		// TODO: Add node to ring. The keys that fall within the range of the new node 
    // are moved out from the immediate neighboring node in the clockwise direction
	}

	removeNode(failedNode: PhysicalNode) {
		console.log(
			`Physical node ${failedNode.nodeId} has failed. Redistributing keys...`
		);
		// TODO: Remove node from ring. The keys that belonged to the node
		// are moved out to the immediate neighboring node in the clockwise direction.
	}
}

export { HashRing };
