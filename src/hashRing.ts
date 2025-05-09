import * as crypto from "crypto";
import { Redis } from "ioredis";
import { HashRingNode, CacheNode } from "./types";

const VIRTUAL_NODE_COUNT = 100;
const PING_FAILURE_THRESHOLD = 3;

function generateMD5Hash(key: string) {
	const hexDigest = crypto.createHash("md5").update(key).digest("hex");
	// It's easier to do comparison using integers
	return parseInt(hexDigest.slice(0, 8), 16);
}

class HashRing {
	private ring: HashRingNode[];
	private cacheNodes: Map<string, CacheNode>;

	constructor() {
		this.ring = [];
		this.cacheNodes = new Map();
		this.cacheNodes.set(this.getCacheNodeKey(0), this.createCacheNode(0));
		this.cacheNodes.set(this.getCacheNodeKey(1), this.createCacheNode(1));
		this.cacheNodes.set(this.getCacheNodeKey(2), this.createCacheNode(2));
    this.updateCacheNodes();
    this.startProbe();
	}

  setValue(key: string, value: string) {
    const cacheNode = this.getCacheNode(key);
  
    if (!cacheNode) {
      return;
    }

    return cacheNode.client.set(key, value);
  }

  getValue(key: string) {
    const cacheNode = this.getCacheNode(key);
  
    if (!cacheNode) {
      return;
    }

    return cacheNode.client.get(key);
  }

  private getCacheNode(key: string) {
    if (this.ring.length === 0) {
      return;
    }

    const hash = generateMD5Hash(key);

    // If the hash's value is greater than the position of the last node in the ring,
    // wrap around to the first node in the ring
    if (hash > this.ring[this.ring.length - 1].position) {
      return this.cacheNodes.get(this.ring[0].cacheNodeKey);
    }

    // Use binary search to find the next node clockwise in the ring
    let low = 0;
    let high = this.ring.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const nodeAtMid = this.ring[mid];

      if (nodeAtMid.position < hash) {
        low = mid + 1;
      } else if (nodeAtMid.position > hash) {
        high = mid - 1;
      } else {
        // Exact match found
        return this.cacheNodes.get(nodeAtMid.cacheNodeKey);
      }
    }

    // After exiting the loop, 'low' is the first index with position >= hash
    return this.cacheNodes.get(this.ring[low].cacheNodeKey);
  }

  private updateCacheNodes() {
    this.ring = [];
  
    // Generate hashes for the address / identifier of each node
    // and push the hashes onto the ring
    for (const n of this.activeCacheNodes) {
      const position = generateMD5Hash(n.nodeKey);
      this.ring.push({
        position,
        cacheNodeKey: n.nodeKey,
      });
    }

    // Sort the ring by the position of the hashes
    this.ring.sort((a, b) => a.position - b.position);
  }

	// Checks the liveness of the Redis nodes on an interval. If a node is found to be inactive,
	// it is removed from the hash ring, and the hash ring is rebalanced.
	private startProbe(intervalMs: number = 1000) {
		const interval = setInterval(() => {
			for (const node of this.cacheNodes.values()) {
				try {
					node.client.ping();
					node.state = "active";
					node.pingFailures = 0;
				} catch (error) {
          // If the node is inactive, hide it from the hash ring and rebalance
					if (node.pingFailures >= PING_FAILURE_THRESHOLD) {
						node.state = "inactive";
            // TODO: Rebalance
						continue;
					}
					node.pingFailures++;
        }
			}
		}, intervalMs);

    process.on("SIGINT", () => {
      clearInterval(interval);
    })
	}

	private getCacheNodeKey(nodeCount: number) {
		return `cache-node-${nodeCount}`;
	}

  private createCacheNode(nodeCount: number) {
    return {
      client: new Redis({
        host: "localhost",
        port: 6379 + nodeCount,
      }),
      nodeKey: this.getCacheNodeKey(nodeCount),
      pingFailures: 0,
      state: "active" as const,
    };
  }

  get activeCacheNodes() {
    const nodesRaw = this.cacheNodes.values();
    // Ignore any inactive nodes
    return Array.from(nodesRaw).filter((n) => n.state === "active");
  }
}

export { HashRing };
