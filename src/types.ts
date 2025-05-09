import type { Redis } from "ioredis";

type HashRingNode = {
  position: number;
  cacheNodeKey: string;
}

type CacheNode = {
	client: Redis;
  nodeKey: string;
	pingFailures: number;
  state: "active" | "inactive";
};

export { HashRingNode, CacheNode };
