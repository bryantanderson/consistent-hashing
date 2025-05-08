async function main() {
	console.log("Main is running...");
}

main().catch((error) =>
	console.error(`Fatal error in main(): ${JSON.stringify(error)}`)
);
