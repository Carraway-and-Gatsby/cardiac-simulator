"""STDIO launcher: stdout is exclusively MCP protocol output."""
import importlib.util
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("blender_lock", ROOT / "scripts/blender-lock.py")
lock_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lock_module)


def main():
    uvx = os.environ.get("CARDIOLAB_UVX") or shutil.which("uvx")
    if not uvx:
        uvx = next((str(p) for p in [Path('/opt/homebrew/bin/uvx'), Path('/usr/local/bin/uvx'), Path.home()/'.local/bin/uvx'] if p.is_file()), None)
    if not uvx:
        print("uvx not found. Install uv: brew install uv", file=sys.stderr)
        return 1
    try:
        lease = lock_module.acquire()
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 75
    env = dict(os.environ, BLENDER_HOST="127.0.0.1", BLENDER_PORT="9876", DISABLE_TELEMETRY="true", UV_PYTHON_PREFERENCE="only-managed")
    with lease:
        # The wrapper owns the lock until uvx and its process group have stopped.
        child = subprocess.Popen([uvx, "--python", "3.11", "mcp-for-blender==2.1.9"], env=env, start_new_session=True)
        def stop(_signal, _frame):
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGTERM)
        for sig in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
            signal.signal(sig, stop)
        try:
            return child.wait()
        finally:
            if child.poll() is None:
                stop(None, None)
                try:
                    child.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    os.killpg(child.pid, signal.SIGKILL)
                    child.wait()


if __name__ == "__main__":
    sys.exit(main())
