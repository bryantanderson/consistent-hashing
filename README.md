## Introduction: What is Consistent Hashing?

[High Scalability's article on Consistent Hashing](https://highscalability.com/consistent-hashing-algorithm/)

Consistent hashing is a distributed systems technique that operates by assigning the data objects and nodes a position on a virtual ring structure (hash ring). Consistent hashing minimizes the number of keys to be remapped when the total number of nodes changes

The key of a data object is hashed using the same hash function to locate the position of the key on the hash ring. The hash ring is traversed in the clockwise direction starting from the position of the key until a node is found. The data object is stored on the node that was found. 

In simple words, the first node with a position value greater than the position of the key stores the data object

## Implementation detail

This project uses MD5 as the hashing function, and uses 3 Redises as the cache "nodes". To start the project, run:

`docker compose -f docker-compose.yml up` OR
`npm run dev:redises` in one terminal, and `npm run dev` in a different terminal

Once all the redises are up and running, write to standard input of the node application. All values written to stdin will be treated as values, with the exception of the string `PRINT_HASH_RING` which will trigger printing of the current state of the hash ring to standard output.