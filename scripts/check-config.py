"""Check both clients point to the same guarded server, without starting clients."""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
claude = json.loads((ROOT/'.mcp.json').read_text())['mcpServers']['blender']
text = (ROOT/'.codex/config.toml').read_text()
# The generated TOML uses JSON-compatible strings/arrays; Python 3.9 is sufficient.
command = json.loads(re.search(r'^command = (.+)$', text, re.M).group(1))
args = json.loads(re.search(r'^args = (.+)$', text, re.M).group(1))
assert command == claude['command'] and Path(command).is_file()
assert args == claude['args'] == [str(ROOT/'scripts/blender-mcp.py')]
assert '@AGENTS.md' in (ROOT/'CLAUDE.md').read_text()
assert Path(args[0]).is_file()
print('PASS: Codex/Claude launcher parity and shared instructions import')
