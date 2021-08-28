#! /bin/zsh
# Builds a new Docker image of the CCA

# First arg is the container name, e.g. "webserver"
docker container rm $1
# Second arg is the image ID, e.g. "5cbadbbd2441"
docker image rm $2
docker build .
