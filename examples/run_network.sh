#!/bin/bash

echo "starting local development network"
docker run --rm -itd -p 9701-9708:9701-9708 indy-node:latest