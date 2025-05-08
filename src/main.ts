import * as crypto from "crypto";
import * as readline from "readline";
import { createHashRingRelabalancer } from "./redis";

function generateMD5Hash(key: string) {
	return crypto.createHash("md5").update(key).digest("base64");
}

async function main() {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false,
	});

  // TODO: Rebalancing of the values when a node is added / removed
  //
  // If a node is added, values that are in the range of the subsequent clockwise node
  // but now belong to the new node should be re-assigned to the new node
  //
  // If a node is removed, values that are in the range of the removed node but now belong to
  // the subsequent clockwise node should be re-assigned to the new node

	rl.on("line", (line) => {
		// TODO: Consistent hashing logic. Hashed value should be assigned to the next Redis node
		// in the clockwise direction
		console.log(`Received: ${line}`);

    if (line === 'PRINT_HASH_RING') {
      // TODO: Log the hash ring to stdout
    }

		const hash = generateMD5Hash(line);
		console.log(`Hash: ${hash}`);
		// TODO(maybe): Log the hash ring to stdout on an interval
	});

	rl.on("close", () => {
		console.log("Input stream closed");
		// TODO: Log the hash ring to stdout
	});

  const interval = createHashRingRelabalancer();

  process.on("SIGINT", () => {
    clearInterval(interval);
    rl.close();
  });
}

main().catch((error) =>
	console.error(`Fatal error in main(): ${JSON.stringify(error)}`)
);
