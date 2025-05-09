## Introduction: What is Consistent Hashing?

[High Scalability's article on Consistent Hashing](https://highscalability.com/consistent-hashing-algorithm/)

Consistent hashing is a distributed systems technique that operates by assigning the data objects and nodes a position on a virtual ring structure (hash ring). Consistent hashing minimizes the number of keys to be remapped when the total number of nodes changes.

Both nodes and data keys are mapped to positions on a hash ring using the same hash function. To find where a key should be stored, the system:
- Calculates the hash position of the key
- Traverses the hash ring clockwise from the key
- Places the data on the first node encountered during the clockwise traversal

With this approach, node addition or removal means that only the keys that fall between the affected node and it's predecessor need to be redistributed.

To improve load balancing, each physical node is represented as multiple "virtual nodes" on the ring:
- Each physical node is assigned multiple positions on the ring
- This spreads the node's responsibility across different segments of the ring
- When a node fails, its keys are distributed more evenly among remaining nodes. Hence it significantly reduces hot spots and balances load distribution

Without virtual nodes, failure of a physical node would mean that _all_ of it's keys would go to the next clockwise node, creating a hot spot in the ring.

## Implementation detail

This project uses MD5 as the hashing function, and uses 3 Redises as the cache "nodes". To start the project, run:

`docker compose -f docker-compose.yml up` OR
`npm run dev:redises` in one terminal, and `npm run dev` in a different terminal

By default, the application logging is fairly verbose. This can be disabled by setting `VERBOSE_LOGGING_ENABLED=false` in environment variables.

To set a value, write `SET <key> <value>` to stdin.

To get a value, write `GET <key>` to stdin.

Writing `VISUALIZE` to stdin prints out a visualization of the hash ring and the cache nodes on it to stdout.

All other commands will be rejected by the application. 

## Future work

[] Implement node removal with key redistribution.
[] Implement node addition with key redistribution.
[] Refactor the `HashRing` class to use a variant of the Binary Search Tree which guarantees O(log n) operations, such as a Red-Black tree or an AVL tree.
[] Improve guide for running application with Docker Compose
[] Make the intro to Consistent Hashing more comprehensive