#!/usr/bin/env bash
# Bridges the native Linux dockerd unix socket to a TCP port so Testcontainers
# can reach it from the Windows-side JVM (localhost forwarding in WSL2).
# Usage: scripts/start-docker-tcp-bridge.sh
set -euo pipefail

PORT="${DOCKER_TCP_PORT:-2375}"

if (exec 3<>"/dev/tcp/127.0.0.1/${PORT}") 2>/dev/null; then
    echo "docker TCP bridge already listening on 127.0.0.1:${PORT}"
    exit 0
fi

if [ ! -S /var/run/docker.sock ]; then
    echo "error: /var/run/docker.sock not found" >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
nohup python3 "${SCRIPT_DIR}/docker-tcp-bridge.py" "${PORT}" >/tmp/docker-tcp-bridge.log 2>&1 &
echo "docker TCP bridge started on 127.0.0.1:${PORT} (pid $!) - log: /tmp/docker-tcp-bridge.log"