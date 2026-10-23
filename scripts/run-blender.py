"""Run owned scripts in a separate background Blender, never the live GUI scene."""
import importlib.util
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("blender_lock", ROOT / "scripts/blender-lock.py")
lock_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lock_module)

def main():
    binary = os.environ.get("BLENDER_BIN", "/Applications/Blender 4.5 LTS.app/Contents/MacOS/Blender")
    if not Path(binary).is_file():
        print("Set BLENDER_BIN to your Blender executable.", file=sys.stderr)
        return 1
    script = "validate_all.py" if "--check" in sys.argv else "build_all.py"
    try:
        with lock_module.acquire():
            return subprocess.call([binary, "--background", "--factory-startup", "--python-exit-code", "1", "--python", str(ROOT / "blender/scripts" / script)], cwd=ROOT)
    except RuntimeError as error:
        print(error, file=sys.stderr)
        return 75

if __name__ == "__main__":
    sys.exit(main())
