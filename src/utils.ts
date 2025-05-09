import * as crypto from "crypto";
import { HashRingNode, PhysicalNode } from "./types";

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

type PhysicalNodeGetter = (key: string) => PhysicalNode | undefined;

function visualizeHashRing(
	ring: HashRingNode[],
	getPhysicalNode: PhysicalNodeGetter
) {
	// Create a circular representation with 64 positions
	const positions = 64;
	const circle = new Array(positions).fill("·");

	// Map node positions to circle positions
	for (const node of ring) {
		// Scale the position to our circle size
		const scaled = Math.floor((node.position / 0xffffffff) * positions);
		circle[scaled] = "◆";
	}

	// Build the ring visualization
	let output = "Hash Ring Visualization:\n\n";

	// Top quarter
	output += "         " + circle.slice(0, 8).join(" ") + "\n";

	// Top-right quarter
	output += "       " + circle[63] + "                " + circle[8] + "\n";
	output += "     " + circle[62] + "                    " + circle[9] + "\n";
	output +=
		"    " + circle[61] + "                      " + circle[10] + "\n";
	output +=
		"   " + circle[60] + "                        " + circle[11] + "\n";
	output +=
		"  " + circle[59] + "                          " + circle[12] + "\n";
	output +=
		" " + circle[58] + "                            " + circle[13] + "\n";
	output +=
		" " + circle[57] + "                            " + circle[14] + "\n";
	output +=
		" " + circle[56] + "                            " + circle[15] + "\n";

	// Left and right sides
	output += circle[55] + "                              " + circle[16] + "\n";
	output += circle[54] + "                              " + circle[17] + "\n";
	output += circle[53] + "                              " + circle[18] + "\n";
	output += circle[52] + "                              " + circle[19] + "\n";
	output += circle[51] + "                              " + circle[20] + "\n";
	output += circle[50] + "                              " + circle[21] + "\n";
	output += circle[49] + "                              " + circle[22] + "\n";
	output += circle[48] + "                              " + circle[23] + "\n";

	// Bottom-left quarter
	output +=
		" " + circle[47] + "                            " + circle[24] + "\n";
	output +=
		" " + circle[46] + "                            " + circle[25] + "\n";
	output +=
		" " + circle[45] + "                            " + circle[26] + "\n";
	output +=
		"  " + circle[44] + "                          " + circle[27] + "\n";
	output +=
		"   " + circle[43] + "                        " + circle[28] + "\n";
	output +=
		"    " + circle[42] + "                      " + circle[29] + "\n";
	output += "     " + circle[41] + "                    " + circle[30] + "\n";
	output += "       " + circle[40] + "                " + circle[31] + "\n";

	// Bottom quarter
	output += "         " + circle.slice(32, 40).join(" ") + "\n\n";

	// Legend
	output += "Legend: ◆ = Node  · = Empty position\n\n";

	// Node positions in hex
	output += "Node Positions:\n";

	for (const node of ring) {
		const hexPosition = node.position.toString(16).padStart(8, "0");
		output += `  ${node.virtualNodeId}: 0x${hexPosition}\n`;
	}

	// Sample key distributions
	if (ring.length > 0) {
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
