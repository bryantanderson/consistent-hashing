const VIRTUAL_NODE_COUNT = 5;
const PHYSICAL_NODE_COUNT = 3;
const PING_FAILURE_THRESHOLD = 3;

const NODE_STATES = {
	ACTIVE: "active",
	INACTIVE: "inactive",
} as const;

type NodeState = (typeof NODE_STATES)[keyof typeof NODE_STATES];

export {
	NODE_STATES,
	NodeState,
	PHYSICAL_NODE_COUNT,
	PING_FAILURE_THRESHOLD,
	VIRTUAL_NODE_COUNT,
};
