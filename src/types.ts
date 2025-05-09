import type { Redis } from "ioredis";

type HashRingNode = {
  position: number;
  virtualNodeId: string;
  // This ID is used to fetch the client for the physical node,
  // which is what actually stores tbe data
  physicalNodeId: string;
}

type PhysicalNode = {
	client: Redis;
  nodeId: string;
	pingFailures: number;
  state: "active" | "inactive";
};

export { HashRingNode, PhysicalNode };
