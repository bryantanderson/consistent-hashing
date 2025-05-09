import { Redis } from "ioredis";
import {
	NODE_STATES,
	PHYSICAL_NODE_COUNT,
	PING_FAILURE_THRESHOLD,
	VIRTUAL_NODE_COUNT,
} from "./constants";
import { HashRingNode, PhysicalNode } from "./types";
import { generateHash, visualizeHashRing } from "./utils";

class HashRing {
	private ring: HashRingNode[];
	private verboseLog: boolean = false;
	private physicalNodes: Map<string, PhysicalNode>;

	constructor() {
		this.ring = [];
		this.verboseLog = process.env.VERBOSE_LOGGING_ENABLED !== "false";
		this.physicalNodes = new Map();

		for (let i = 0; i < PHYSICAL_NODE_COUNT; i++) {
			this.physicalNodes.set(
				this.getPhysicalNodeId(i),
				this.createPhysicalNode(i)
			);
		}

		this.createVirtualNodes();
		this.startProbe();
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
		return visualizeHashRing(this.ring, this.getPhysicalNode);
	}

	async shutdown() {
		for (const node of this.physicalNodes.values()) {
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

	private getPhysicalNode(key: string) {
		if (this.ring.length === 0) {
			return;
		}

		const hash = generateHash(key);

		if (this.verboseLog) {
			console.log(`Key ${key}. Computed hash: ${hash}`);
		}

		// If the hash's value is greater than the position of the last node in the ring,
		// wrap around to the first node in the ring
		if (hash > this.ring[this.ring.length - 1].position) {
			return this.physicalNodes.get(this.ring[0].physicalNodeId);
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
				return this.physicalNodes.get(nodeAtMid.physicalNodeId);
			}
		}

		// After exiting the loop, 'low' is the first index with position >= hash
		return this.physicalNodes.get(this.ring[low].physicalNodeId);
	}

	private createVirtualNodes() {
		this.ring = [];

		// Generate hashes for the address / identifier of each node
		// and push the hashes onto the ring
		for (const n of this.activeCacheNodes) {
			// For each node, generate virtual nodes
			for (let i = 0; i < VIRTUAL_NODE_COUNT; i++) {
				const virtualNodeId = `${n.nodeId}-virtual-${i}`;
				const position = generateHash(virtualNodeId);
				this.ring.push({
					position,
					virtualNodeId,
					physicalNodeId: n.nodeId,
				});
			}
		}

		// Sort the ring by the position of the hashes
		this.ring.sort((a, b) => a.position - b.position);
	}

	// Checks the liveness of the Redis nodes on an interval. If a node is found to be inactive,
	// it is removed from the hash ring, and the hash ring is rebalanced.
	private startProbe(intervalMs: number = 1000) {
		const interval = setInterval(() => {
			for (const node of this.physicalNodes.values()) {
				try {
					node.client.ping();
					node.state = NODE_STATES.ACTIVE;
					node.pingFailures = 0;
				} catch (error) {
					// If the node is inactive, hide it from the hash ring and rebalance
					if (node.pingFailures >= PING_FAILURE_THRESHOLD) {
						node.state = NODE_STATES.INACTIVE;
						// TODO: Rebalance
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
		const nodesRaw = this.physicalNodes.values();
		// Ignore any inactive nodes
		return Array.from(nodesRaw).filter(
			(n) => n.state === NODE_STATES.ACTIVE
		);
	}
}

export { HashRing };
