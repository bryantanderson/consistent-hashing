import * as readline from "readline";
import { HashRing } from "./hashRing";

async function main() {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false,
	});

	const hashRing = new HashRing();

	rl.on("line", (line) => {
		console.log(`Received: ${line}`);

		if (line === "PRINT_HASH_RING") {
			console.log(hashRing.toString());
      return;
		}

    hashRing.setValue(line, line);
	});

	rl.on("close", () => {
		console.log("Input stream closed");
		console.log(hashRing.toString());
	});

	process.on("SIGINT", () => {
		rl.close();
	});
}

main().catch((error) =>
	console.error(`Fatal error in main(): ${JSON.stringify(error)}`)
);
