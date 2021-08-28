#! /bin/zsh
# Runs the given Docker image in the given network so that the CCA container can talk to the Postgres + Elasticsearch containers

# First arg is the container name, e.g. "webserver"
# Second arg is the network ID, e.g. "7249d03eab1d"
# Third arg is the image ID, e.g. "5cbadbbd2441"
docker create --name $1 --net $2 -p 4000:4000 $3
docker start $1
docker logs $1 -f
