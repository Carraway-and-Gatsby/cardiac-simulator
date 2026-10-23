"""Read-only add-on handshake; never executes code in the user's scene."""
import importlib.util
import json
from pathlib import Path
import socket
import sys

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("blender_lock", root / "scripts/blender-lock.py")
lock_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lock_module)
try:
    with lock_module.acquire(), socket.create_connection(("127.0.0.1", 9876), timeout=5) as connection:
        connection.sendall(json.dumps({"type": "get_scene_info", "params": {}}).encode())
        data = b""
        while len(data) < 4_000_000:
            block = connection.recv(65536)
            if not block:
                break
            data += block
            try:
                reply = json.loads(data)
                break
            except json.JSONDecodeError:
                continue
        else:
            raise RuntimeError("Blender reply exceeds size limit")
        reply = json.loads(data)
        if reply.get("status") != "success":
            raise RuntimeError(str(reply))
        print("PASS: Blender add-on get_scene_info returned success (read-only).")
except (OSError, ValueError, RuntimeError) as error:
    print(f"NOT CONNECTED: {error}", file=sys.stderr)
    sys.exit(1)
