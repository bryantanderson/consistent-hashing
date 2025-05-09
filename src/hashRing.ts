import * as crypto from "crypto";
import { Redis } from "ioredis";
import { CacheNode, HashRingNode } from "./types";

// const VIRTUAL_NODE_COUNT = 100;
const PING_FAILURE_THRESHOLD = 3;

function generateHash(key: string) {
	const hexDigest = crypto.createHash("md5").update(key).digest("hex");
	const hashValue = parseInt(hexDigest.slice(0, 8), 16);
	return hashValue;
}

class HashRing {
	private verboseLog: boolean = false;
	private ring: HashRingNode[];
	private cacheNodes: Map<string, CacheNode>;

	constructor() {
		this.ring = [];
		this.verboseLog = process.env.VERBOSE_LOGGING_ENABLED !== "false";
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

		if (this.verboseLog) {
			console.log(
				`Setting key ${key}. Next clockwise Cache node: ${cacheNode.nodeKey}`
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
		const cacheNode = this.getCacheNode(key);

		if (!cacheNode) {
			return;
		}

		if (this.verboseLog) {
			console.log(
				`Fetching key ${key}. Next clockwise Cache node: ${cacheNode.nodeKey}`
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
		// Create a circular representation with 64 positions
		const positions = 64;
		const circle = new Array(positions).fill("·");

		// Map node positions to circle positions
		for (const node of this.ring) {
			// Scale the position to our circle size
			const scaled = Math.floor((node.position / 0xffffffff) * positions);
			circle[scaled] = "◆";
		}

		// Build the ring visualization
		let output = "Hash Ring Visualization:\n\n";

		// Top quarter
		output += "         " + circle.slice(0, 8).join(" ") + "\n";

		// Top-right quarter
		output +=
			"       " + circle[63] + "                " + circle[8] + "\n";
		output +=
			"     " + circle[62] + "                    " + circle[9] + "\n";
		output +=
			"    " + circle[61] + "                      " + circle[10] + "\n";
		output +=
			"   " + circle[60] + "                        " + circle[11] + "\n";
		output +=
			"  " +
			circle[59] +
			"                          " +
			circle[12] +
			"\n";
		output +=
			" " +
			circle[58] +
			"                            " +
			circle[13] +
			"\n";
		output +=
			" " +
			circle[57] +
			"                            " +
			circle[14] +
			"\n";
		output +=
			" " +
			circle[56] +
			"                            " +
			circle[15] +
			"\n";

		// Left and right sides
		output +=
			circle[55] + "                              " + circle[16] + "\n";
		output +=
			circle[54] + "                              " + circle[17] + "\n";
		output +=
			circle[53] + "                              " + circle[18] + "\n";
		output +=
			circle[52] + "                              " + circle[19] + "\n";
		output +=
			circle[51] + "                              " + circle[20] + "\n";
		output +=
			circle[50] + "                              " + circle[21] + "\n";
		output +=
			circle[49] + "                              " + circle[22] + "\n";
		output +=
			circle[48] + "                              " + circle[23] + "\n";

		// Bottom-left quarter
		output +=
			" " +
			circle[47] +
			"                            " +
			circle[24] +
			"\n";
		output +=
			" " +
			circle[46] +
			"                            " +
			circle[25] +
			"\n";
		output +=
			" " +
			circle[45] +
			"                            " +
			circle[26] +
			"\n";
		output +=
			"  " +
			circle[44] +
			"                          " +
			circle[27] +
			"\n";
		output +=
			"   " + circle[43] + "                        " + circle[28] + "\n";
		output +=
			"    " + circle[42] + "                      " + circle[29] + "\n";
		output +=
			"     " + circle[41] + "                    " + circle[30] + "\n";
		output +=
			"       " + circle[40] + "                " + circle[31] + "\n";

		// Bottom quarter
		output += "         " + circle.slice(32, 40).join(" ") + "\n\n";

		// Legend
		output += "Legend: ◆ = Node  · = Empty position\n\n";

		// Node positions in hex
		output += "Node Positions:\n";
		for (const node of this.ring) {
			const hexPosition = node.position.toString(16).padStart(8, "0");
			output += `  ${node.cacheNodeKey}: 0x${hexPosition}\n`;
		}

		// Sample key distributions
		if (this.ring.length > 0) {
			output += "\nSample Key Distribution:\n";
			const sampleKeys = [
				"user:1001",
				"product:5432",
				"session:abc123",
				"order:9876",
				"comment:45678",
				"post:1234",
			];

			for (const key of sampleKeys) {
				const hash = generateHash(key);
				const node = this.getCacheNode(key);
				output += `  ${key} → ${node?.nodeKey || "No node"} (0x${hash
					.toString(16)
					.padStart(8, "0")})\n`;
			}
		}

		return output;
	}

	private getCacheNode(key: string) {
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
			const position = generateHash(n.nodeKey);
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
		});
	}

	private getCacheNodeKey(nodeCount: number) {
		return `cache-node-${nodeCount}`;
	}

	private createCacheNode(nodeCount: number) {
		return {
			client: new Redis({
				host: "localhost",
				port: 6379 + nodeCount,
				connectTimeout: 120000,
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
