import * as readline from "readline";
import { COMMANDS } from "./constants";
import { HashRing } from "./hashRing";

function hookExceptionHandlers() {
  process.on("uncaughtException", (error) => {
    console.trace(`Uncaught exception: ${JSON.stringify(error)}`);
  });

  process.on("unhandledRejection", (error) => {
    console.trace(`Unhandled rejection: ${JSON.stringify(error)}`);
  });
}

async function main() {
  hookExceptionHandlers();

  console.log("Initializing hash ring...");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const hashRing = new HashRing();

  rl.on("line", async (line) => {
    console.log(`Received prompt: ${line}`);

    if (line === COMMANDS.VISUALIZE) {
      console.log(hashRing.visualize());
      return;
    }

    const parts = line.split(" ");

    switch (parts.length) {
      case 1: {
        if (parts[0] !== COMMANDS.TRIGGER_NODE_FAILURE) {
          console.error(`Invalid usage: ${line}. Expected "TRIGGER_NODE_FAILURE".`);
          return;
        }
        console.log(`Triggering node failure...`);
        // TODO: Trigger node failure
        break;
      }
      case 2: {
        if (parts[0] !== COMMANDS.GET) {
          console.error(`Invalid usage: ${line}. Expected "GET <key>".`);
          return;
        }
        const key = parts[1];
        const value = await hashRing.getValue(key);
        console.log(`Found value ${value} for key ${key}`);
        break;
      }
      case 3: {
        if (parts[0] !== COMMANDS.SET) {
          console.error(`Invalid usage: ${line}. Expected "SET <key> <value>".`);
          return;
        }
        const key = parts[1];
        const value = parts[2];
        hashRing.setValue(key, value);
        break;
      }
      default:
        console.error(`Invalid usage: ${line}. Expected "GET <key>" or "SET <key> <value>".`);
        return;
    }
  });

  rl.on("close", () => {
    console.log("\nReadline closed. Printing hash ring visualization...");
    console.log(hashRing.visualize());
  });

  process.on("SIGINT", async () => {
    rl.close();
    await hashRing.shutdown();
    process.exit(0);
  });
}

main().catch((error) => console.error(`Fatal error in main(): ${JSON.stringify(error)}`));
