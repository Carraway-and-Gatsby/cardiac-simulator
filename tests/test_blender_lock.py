import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

path = Path(__file__).resolve().parents[1]/'scripts/blender-lock.py'
spec = importlib.util.spec_from_file_location('guard', path)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)

class LockTest(unittest.TestCase):
    def test_competing_process_is_rejected_and_lock_releases(self):
        # Only the test processes share this private directory. Production callers
        # still use the unchanged default lock, including an active GUI MCP client.
        with tempfile.TemporaryDirectory(prefix='cardiolab-lock-test-') as directory:
            code = (
                "import runpy\nfrom unittest.mock import patch\n"
                f"m = runpy.run_path({str(path)!r})\n"
                f"with patch('tempfile.gettempdir', return_value={directory!r}):\n"
                "    lease = m['acquire']()\n"
                "    lease.close()\n"
            )
            with patch.object(guard.tempfile, 'gettempdir', return_value=directory):
                with guard.acquire() as lease:
                    lock_path = Path(lease.name)
                    owner = lock_path.read_text()
                    inode = lock_path.stat().st_ino
                    result = subprocess.run(
                        [sys.executable, '-c', code], capture_output=True,
                        text=True, timeout=10,
                    )
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn('Blender is in use', result.stderr)
                    self.assertEqual(lock_path.read_text(), owner)
                    self.assertEqual(lock_path.stat().st_ino, inode)
                result = subprocess.run(
                    [sys.executable, '-c', code], capture_output=True,
                    text=True, timeout=10,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(lock_path.stat().st_ino, inode)

if __name__ == '__main__':
    unittest.main()
