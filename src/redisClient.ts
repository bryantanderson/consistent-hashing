import { Redis } from 'ioredis';

let nodeCountToRedisClient: Map<string, Redis> = new Map();

const STANDARD_REDIS_PORT = 6379;

// NOTE: nodeCount is 0-indexed
function getRedisPortFromNodeCount(nodeCount: number) {
  return STANDARD_REDIS_PORT + nodeCount;
}

// In a real-world scenario, we would have a more robust method to discover the IP addresses
// of the Redis nodes (ex: Kubernetes svc, service discovery, etc.)
function getRedisNode(nodeCount: number) {
  const key = `redis-node-${nodeCount}`;
  if (nodeCountToRedisClient.has(key)) {
    return nodeCountToRedisClient.get(key);
  }
  const redisClient = new Redis({
    host: "localhost",
    port: getRedisPortFromNodeCount(nodeCount),
  });
  nodeCountToRedisClient.set(key, redisClient);
  return redisClient;
}

export { getRedisNode };
