## Introduction

This project is an implementation of Consistent Hashing. It uses MD5 as the hashing function, and uses 3 Redis containers as the cache "nodes". To start the project, run:

`docker-compose -f docker-compose.yml up`

Once all the containers are up and running, write to standard input of the node application. All values written to stdin will be treated as values, with the exception of the string `PRINT_HASH_RING` which will trigger printing of the current state of the hash ring to standard output.