import * as crypto from "crypto";
import * as readline from "readline";

function generateMD5Hash(key: string) {
	return crypto.createHash("md5").update(key).digest("base64");
}

async function main() {
	console.log("Main is running...");

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false,
	});

	rl.on("line", (line) => {
		// TODO: Consistent hashing logic. Hashed value should be assigned to the next Redis node
		// in the clockwise direction
		console.log(`Received: ${line}`);
		const hash = generateMD5Hash(line);
		console.log(`Hash: ${hash}`);
		// TODO: Log the hash ring to stdout on an interval / when a specific command is provided in stdin
	});

	rl.on("close", () => {
		console.log("Input stream closed");
		// TODO: Log the hash ring to stdout
	});
}

main().catch((error) =>
	console.error(`Fatal error in main(): ${JSON.stringify(error)}`)
);
