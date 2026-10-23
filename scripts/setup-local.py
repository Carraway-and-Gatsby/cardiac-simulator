"""Create optional project-local Blender MCP configuration without overwriting it."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    command = sys.executable
    args = [str(ROOT / 'scripts/blender-mcp.py')]
    files = {
        ROOT / '.mcp.json': json.dumps({'mcpServers': {'blender': {
            'type': 'stdio', 'command': command, 'args': args,
        }}}, indent=2) + '\n',
        ROOT / '.codex/config.toml': '\n'.join([
            '[mcp_servers.blender]', 'command = ' + json.dumps(command),
            'args = ' + json.dumps(args), 'startup_timeout_sec = 120',
            'tool_timeout_sec = 180', 'enabled = true', '',
        ]),
    }
    for path, contents in files.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with path.open('x') as file:
                file.write(contents)
            print('Created ' + str(path.relative_to(ROOT)))
        except FileExistsError:
            print('Preserved existing ' + str(path.relative_to(ROOT)))
    print('Only project-local files were considered. No global settings changed.')


if __name__ == '__main__':
    main()
