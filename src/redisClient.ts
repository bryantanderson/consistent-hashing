import { Redis } from 'ioredis';

let nodeCountToRedisClient: Map<number, Redis> = new Map();

const STANDARD_REDIS_PORT = 6379;

// NOTE: nodeCount is 0-indexed
function getRedisPortFromNodeCount(nodeCount: number) {
  return STANDARD_REDIS_PORT + nodeCount;
}

// In a real-world scenario, we would have a more robust method to discover the IP addresses
// of the Redis nodes (ex: Kubernetes svc, service discovery, etc.)
function getRedisNode(nodeCount: number) {
  if (nodeCountToRedisClient.has(nodeCount)) {
    return nodeCountToRedisClient.get(nodeCount);
  }
  const redisClient = new Redis({
    host: "localhost",
    port: getRedisPortFromNodeCount(nodeCount),
  });
  nodeCountToRedisClient.set(nodeCount, redisClient);
  return redisClient;
}

export { getRedisNode };
