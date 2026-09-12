@echo off
set DOCKER_HOST=tcp://127.0.0.1:2375
echo HOST=%DOCKER_HOST%
docker info --format "server={{.Server.Version}} os={{.Server.Os}}"