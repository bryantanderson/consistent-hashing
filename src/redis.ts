import { Redis } from "ioredis";

const PING_FAILURE_THRESHOLD = 3;

type RedisNode = {
  client: Redis;
  state: "active" | "inactive";
  pingFailures: number;
}

let nodeCountToRedisNode: Map<string, RedisNode> = new Map();

function getKeyFromNodeCount(nodeCount: number) {
  return `redis-node-${nodeCount}`;
}

// In a real-world scenario, we would have a more robust method to discover the IP addresses
// of the Redis nodes (ex: Kubernetes svc, service discovery, etc.)
function getRedisNode(nodeCount: number) {
	const key = getKeyFromNodeCount(nodeCount);
	const node = nodeCountToRedisNode.get(key);

  if (!node || node.state !== "active") {
    return;
  }

  return node;
}

function createRedisNode(nodeCount: number) {
	return {
    client: new Redis({
      host: "localhost",
      port: 6379 + nodeCount,
    }),
    state: "active" as const,
    pingFailures: 0,
  };
}

// Checks the liveness of the Redis nodes on an interval. If a node is found to be inactive,
// it is removed from the hash ring, and the hash ring is rebalanced.
function createHashRingRelabalancer(intervalMs: number = 1000) {
  const interval = setInterval(() => {
    for (const node of nodeCountToRedisNode.values()) {
      try {
        node.client.ping();
        node.state = "active";
        node.pingFailures = 0;
      } catch (error) {
        if (node.pingFailures >= PING_FAILURE_THRESHOLD) {
          node.state = "inactive";
          continue;
        }
        node.pingFailures++;
      }
      // TODO: Rebalance the hash ring
    }
  }, intervalMs);

  return interval;
}

nodeCountToRedisNode.set(getKeyFromNodeCount(0), createRedisNode(0));
nodeCountToRedisNode.set(getKeyFromNodeCount(1), createRedisNode(1));
nodeCountToRedisNode.set(getKeyFromNodeCount(2), createRedisNode(2));

export { createHashRingRelabalancer, getRedisNode };
