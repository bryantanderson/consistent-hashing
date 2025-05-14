import type { Redis } from "ioredis";
import { NodeState } from "./constants";

type HashRingNode = {
  position: number;
  virtualNodeId: string;
  // This ID is used to fetch the client for the physical node,
  // which is what actually stores tbe data
  physicalNodeId: string;
};

type PhysicalNode = {
  client: Redis;
  nodeId: string;
  pingFailures: number;
  state: NodeState;
};

type VirtualNode = {
  nodePosition: number;
  virtualNodeId: string;
  physicalNodeId: string;
};

type Optional<T> = T | null | undefined;

export { HashRingNode, Optional, PhysicalNode, VirtualNode };
