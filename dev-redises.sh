#!/bin/bash

# Default to 3 physical nodes
NODES=${PHYSICAL_NODE_COUNT:-3}
echo "Starting $NODES Redis instances..."

# Build the concurrently command
CMD=""
for ((i=0; i<NODES; i++)); do
  PORT=$((6379 + i))
  if [ -n "$CMD" ]; then
    CMD="$CMD \"redis-server --port $PORT --save 20 1 --loglevel warning\""
  else
    CMD="\"redis-server --port $PORT --save 20 1 --loglevel warning\""
  fi
done

eval "concurrently $CMD"
