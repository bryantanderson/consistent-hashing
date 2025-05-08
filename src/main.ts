import * as crypto from "crypto";

function generateMD5Hash(key: string) {
  return crypto.createHash("md5").update(key).digest("base64");
}

async function main() {
	console.log("Main is running...");
}

main().catch((error) =>
	console.error(`Fatal error in main(): ${JSON.stringify(error)}`)
);
