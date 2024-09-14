#!/bin/bash

if [[ "$1" == "--create" ]]; then
    docker stop neo4j > /dev/null 2>&1
    docker container rm neo4j > /dev/null 2>&1
fi

running=$(docker ps --filter "name=neo4j" -q | wc  -l)
if [[ "$running" == "1" ]]; then 
    echo "Neo4J container is already running..."
    exit 0
fi

output=$(docker container ls -a --filter "name=neo4j" -q | wc  -l)
if [[ "$output" == "1" ]]; then
    echo "Restarting existing container named neo4j"
    docker start neo4j
else 
    echo "Creating and starting container named neo4j"
    docker run -d --name neo4j \
        -v $PWD/docker/neo4j/data:/data \
        -v $PWD/docker/neo4j/plugins:/plugins \
        -e NEO4J_AUTH=neo4j/password \
        -e NEO4J_apoc_export_file_enabled=true \
        -e NEO4J_apoc_import_file_enabled=true \
        -e NEO4J_apoc_import_file_use__neo4j__config=true \
        -e NEO4J_PLUGINS='["apoc", "apoc-extended"]' \
        --publish=7474:7474 \
        --publish=7687:7687 \
        neo4j
fi