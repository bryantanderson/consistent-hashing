const PING_FAILURE_THRESHOLD = 3;

const NODE_STATES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

type NodeState = (typeof NODE_STATES)[keyof typeof NODE_STATES];

const COMMANDS = {
  GET: "GET",
  SET: "SET",
  VISUALIZE: "VISUALIZE",
  TRIGGER_NODE_FAILURE: "TRIGGER_NODE_FAILURE",
} as const;

export { COMMANDS, NODE_STATES, NodeState, PING_FAILURE_THRESHOLD };
