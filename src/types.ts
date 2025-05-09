import type { Redis } from "ioredis";

type HashRingNode = {
  position: number;
  physicalNodeId: string;
}

type PhysicalNode = {
	client: Redis;
  nodeId: string;
	pingFailures: number;
  state: "active" | "inactive";
};

export { HashRingNode, PhysicalNode };
