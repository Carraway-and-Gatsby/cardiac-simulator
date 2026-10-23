"""Advisory macOS lock shared by both MCP clients and background bpy jobs."""
import fcntl
import os
import tempfile
from pathlib import Path


def acquire():
    # Never unlink this file: replacing the inode can admit two owners.
    path = Path(tempfile.gettempdir()) / f"cardiolab-blender-{os.getuid()}-9876.lock"
    stream = path.open("a+")
    try:
        fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        stream.close()
        raise RuntimeError("Blender is in use. Disconnect the other client's blender MCP first.")
    stream.seek(0)
    stream.truncate()
    stream.write(f"pid={os.getpid()}\n")
    stream.flush()
    return stream
