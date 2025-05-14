import * as crypto from "crypto";
import { AVLTree } from "./avlTree";
import { PhysicalNode } from "./types";

function generateHash(key: string) {
	const hexDigest = crypto.createHash("md5").update(key).digest("hex");
	// MD5 produces a 128 bit hash, represented as a 32 character hex string
	// JS numbers can only represent numbers precisely up to Number.MAX_SAFE_INTERGER (roughly 2^53 - 1)
	// Trying to convert the full MD5 hash to a number will result in a loss of precision
	// We can take the first 8 characters of the hash to get a 32 bit number, which still provides
	// a good distribution of the hash output space (2^32 combinations)
	const hashValue = parseInt(hexDigest.slice(0, 8), 16);
	return hashValue;
}

type VisualizeHashRingParams = {
	ring: AVLTree;
	getPhysicalNode: (key: string) => PhysicalNode | undefined;
	positions?: number;
};

// Mostly gen by Claude
function visualizeHashRing(params: VisualizeHashRingParams) {
	const { ring, getPhysicalNode, positions = 128 } = params;

	const circle = new Array(positions).fill("·");
	const ringNodes = ring.preOrder();

	// Map node positions to circle positions
	for (const node of ringNodes) {
		const scaled = Math.floor((node.position / 0xffffffff) * positions);
		circle[scaled] = "◆";
	}

	let output = "Hash Ring Visualization:\n\n";

	const radius = 15;
	const center = { x: radius, y: radius };

	// Create a 2D grid representation
	const grid = Array(radius * 2 + 1)
		.fill(0)
		.map(() => Array(radius * 2 + 1).fill(" "));

	// Place dots around the circle
	for (let i = 0; i < positions; i++) {
		const angle = (i / positions) * 2 * Math.PI;

		const x = Math.round(center.x + radius * Math.cos(angle));
		const y = Math.round(center.y + radius * Math.sin(angle));

		grid[y][x] = circle[i];
	}

	for (const row of grid) {
		output += row.join("") + "\n";
	}

	output += "\nLegend: ◆ = Node  · = Empty position\n\n";

	// Node positions in hex
	output += "Node Positions:\n";

	for (const node of ringNodes) {
		const hexPosition = node.position.toString(16).padStart(8, "0");
		output += `  ${node.virtualNodeId}: 0x${hexPosition}\n`;
	}

	if (ringNodes.length > 0) {
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
			const node = getPhysicalNode(key);
			output += `  ${key} → ${node?.nodeId || "No node"} (0x${hash
				.toString(16)
				.padStart(8, "0")})\n`;
		}
	}

	return output;
}

export { generateHash, visualizeHashRing };
