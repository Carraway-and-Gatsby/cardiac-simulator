"""Initialize MCP; optionally query the live Blender scene with --scene (read-only)."""
import json
from pathlib import Path
import selectors
import subprocess
import sys
import time

root = Path(__file__).resolve().parents[1]
process = subprocess.Popen([sys.executable, str(root/'scripts/blender-mcp.py')], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
selector = selectors.DefaultSelector()
selector.register(process.stdout, selectors.EVENT_READ)

def send(payload):
    process.stdin.write(json.dumps({'jsonrpc':'2.0', **payload})+'\n')
    process.stdin.flush()

def receive(request_id):
    end = time.monotonic()+90
    while time.monotonic()<end:
        if not selector.select(timeout=1):
            continue
        line = process.stdout.readline()
        if not line:
            raise RuntimeError('MCP process closed stdout')
        reply = json.loads(line)
        if reply.get('id') == request_id:
            if 'error' in reply:
                raise RuntimeError(str(reply['error']))
            return reply['result']
    raise RuntimeError('MCP handshake timed out')

try:
    send({'id':1,'method':'initialize','params':{'protocolVersion':'2025-03-26','capabilities':{},'clientInfo':{'name':'cardiolab-setup-check','version':'0.1.0'}}})
    initialized = receive(1)
    send({'method':'notifications/initialized'})
    send({'id':2,'method':'tools/list','params':{}})
    tools = receive(2)['tools']
    names = {tool['name'] for tool in tools}
    assert {'get_scene_info','execute_blender_code'} <= names, names
    print(f"PASS: {initialized['serverInfo']['name']} initialized; {len(tools)} tools, including scene read and bpy execution.")
    if '--scene' in sys.argv:
        send({'id':3,'method':'tools/call','params':{'name':'get_scene_info','arguments':{'fields':['settings','location','size'],'limit':20}}})
        result = receive(3)
        message = '\n'.join(item.get('text','') for item in result.get('content',[]) if item.get('type') == 'text')
        if result.get('isError') or not message or message.lstrip().lower().startswith('error'):
            raise RuntimeError(f'Blender scene query failed: {message}')
        print('PASS: get_scene_info via actual MCP tools/call')
        print(message)
    else:
        print('This validates MCP protocol startup only. Use --scene for a read-only live scene query.')
finally:
    process.stdin.close()
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        process.terminate()
        process.wait(timeout=10)
    selector.close()
