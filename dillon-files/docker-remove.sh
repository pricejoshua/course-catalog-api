#! /bin/zsh
# Removes the given Docker container + image

# First arg is the container name, e.g. "webserver"
docker stop $1
docker container rm $1
# Second arg is the image ID, e.g. "5cbadbbd2441"
docker image rm $2
