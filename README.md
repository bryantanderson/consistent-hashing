## Introduction: What is Consistent Hashing?

Source: [High Scalability's article on Consistent Hashing](https://highscalability.com/consistent-hashing-algorithm/)

Consistent hashing is a distributed systems technique that operates by assigning the data objects and nodes a position on a virtual ring structure (hash ring). Consistent hashing minimizes the number of keys to be remapped when the total number of nodes changes.

Both nodes and data keys are mapped to positions on a hash ring using the same hash function (ex: MD5). To find where a key should be stored, the system:

-   Calculates the hash position of the key
-   Traverses the hash ring clockwise from the key
-   Places the data on the first node encountered during the clockwise traversal

With this approach, node addition or removal means that only the keys that fall between the affected node and it's predecessor need to be redistributed.

To improve load balancing, each physical node is represented as multiple "virtual nodes" on the ring:
-   Each physical node is assigned multiple positions on the ring
-   This spreads the node's responsibility across different segments of the ring
-   When a node fails, its keys are distributed more evenly among remaining nodes. Hence it significantly reduces hot spots and balances load distribution

Without virtual nodes, failure of a physical node would mean that _all_ of it's keys would go to the next clockwise node, creating a hot spot in the ring.

The Average number of keys stored on a node = k / N
-   Where k is the total number of keys (data objects) and N is the number of nodes.
-   The deletion or addition of a node results in the movement of an average number of keys stored on a single node

Typically, a self-balancing binary search tree (BST) data structure is used to store the positions of the nodes on the hash ring. 
-   The BST offers logarithmic O(log n) time complexity for search, insert, and delete operations. 
-   The keys of the BST contain the positions of the nodes on the hash ring. 

The BST data structure is stored on a centralized highly available service. As an alternative, the BST data structure is stored on each node, and the state information between the nodes is synchronized through the gossip protocol.

The insertion of a new node results in the movement of data objects that fall within the range of the new node from the immediate neighbouring node in the clockwise direction:
1. Insert the hash of the node ID in BST in O(log n) time
2. Identify the keys that fall within the subrange of the new node from the successor node on BST
3. Move the keys to the new node

The deletion of a node results in the movement of data objects that fall within the range of the decommissioned node to the immediate neighbouring node in the clockwise direction:
1. Delete the hash of the decommissioned node ID in BST in logarithmic time
2. Identify the keys that fall within the range of the decommissioned node
3. Move the keys to the successor node

## Running the project

This project uses MD5 as the hashing function, and uses 3 Redises as the cache "nodes". To start the project, run:

`docker compose -f docker-compose.yml up` OR
`npm run dev:redises` in one terminal, and `npm run dev` in a different terminal. Note that hot reloading is not enabled.

By default, the application logging is fairly verbose. This can be disabled by setting `VERBOSE_LOGGING_ENABLED=false` in environment variables.

To set a value, write `SET <key> <value>` to stdin.

To get a value, write `GET <key>` to stdin.

Writing `VISUALIZE` to stdin prints out a visualization of the hash ring and the nodes (virtual and physical) on it to stdout.

Writing `TRIGGER_NODE_FAILURE` to stdin will be accepted, but it is currently unimplemented and will do nothing.

All other commands will be rejected by the application.

## Future work

-   [x] Implement node removal with key redistribution.
-   [x] Implement node addition with key redistribution.
-   [x] Refactor the `HashRing` class to use a self-binary Binary Search Tree, such as a Red-Black tree or an AVL tree.
-   [ ] Improve guide for running application with Docker Compose
-   [x] Make the intro to Consistent Hashing more comprehensive
