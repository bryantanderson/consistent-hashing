concurrently "redis-server --port 6379 --save 20 1 --loglevel warning" \
  "redis-server --port 6380 --save 20 1 --loglevel warning" \
  "redis-server --port 6381 --save 20 1 --loglevel warning"
