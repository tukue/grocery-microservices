#!/usr/bin/env python3
"""TCP to Unix-socket proxy so the Windows JVM can reach the native WSL docker
daemon through localhost forwarding. Listens on 127.0.0.1:<port> (default 2375)
and forwards byte streams to /var/run/docker.sock."""
import socket
import sys
import threading

SOCK_PATH = "/var/run/docker.sock"


def pump(src, dst):
    try:
        while True:
            data = src.recv(65536)
            if not data:
                break
            dst.sendall(data)
    except OSError:
        pass
    finally:
        try:
            dst.shutdown(socket.SHUT_WR)
        except OSError:
            pass


def handle(conn):
    try:
        backend = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        backend.connect(SOCK_PATH)
    except OSError as exc:
        print(f"connect {SOCK_PATH} failed: {exc}", flush=True)
        conn.close()
        return
    t1 = threading.Thread(target=pump, args=(conn, backend), daemon=True)
    t2 = threading.Thread(target=pump, args=(backend, conn), daemon=True)
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    conn.close()
    backend.close()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 2375
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("127.0.0.1", port))
    server.listen(16)
    print(f"proxy listening on 127.0.0.1:{port} -> {SOCK_PATH}", flush=True)
    while True:
        conn, _ = server.accept()
        threading.Thread(target=handle, args=(conn,), daemon=True).start()


if __name__ == "__main__":
    main()