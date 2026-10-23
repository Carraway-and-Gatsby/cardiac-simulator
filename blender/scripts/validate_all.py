"""Geometry/export safety checks, explicitly not anatomical validation."""
import importlib.util
import json
import math
from pathlib import Path
import runpy
import struct

import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT / 'blender/scripts/validate_demo.py'), run_name='__main__')
spec = importlib.util.spec_from_file_location('procedural_builder', ROOT / 'blender/scripts/build_procedural.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

before = {o.name: (o.as_pointer(), tuple(tuple(r) for r in o.matrix_world),
                   len(o.data.vertices) if o.type == 'MESH' else None) for o in bpy.data.objects}
builder.build()
scene = builder.build()
for name, signature in before.items():
    o = bpy.data.objects[name]
    assert (o.as_pointer(), tuple(tuple(r) for r in o.matrix_world),
            len(o.data.vertices) if o.type == 'MESH' else None) == signature, name

report = []
for obj in scene.objects:
    assert obj.type == 'MESH'
    assert obj.get('anatomy_status') == 'unreviewed-procedural'
    assert all(math.isfinite(c) for v in obj.data.vertices for c in v.co)
    bm = bmesh.new()
    try:
        bm.from_mesh(obj.data)
        assert all(e.is_manifold for e in bm.edges), obj.name
        assert all(f.calc_area() > 1e-10 for f in bm.faces), obj.name
        assert bm.calc_volume() > 0, obj.name
    finally:
        bm.free()
    assert all(n.type != 'TEX_IMAGE' for n in obj.active_material.node_tree.nodes)
    report.append({'id': obj['structure_id'], 'vertices': len(obj.data.vertices),
                   'faces': len(obj.data.polygons), 'dimensions': list(obj.dimensions)})
expected = set(builder.ITEMS)
assert {r['id'] for r in report} == expected
assert len(report) == 18

data = builder.GLB.read_bytes()
length, chunk_type = struct.unpack_from('<II', data, 12)
assert chunk_type == 0x4E4F534A
document = json.loads(data[20:20+length])
assert not document.get('images') and not document.get('textures')
assert not document.get('animations') and not document.get('cameras')
assert all('uri' not in buffer for buffer in document.get('buffers', []))
nodes = [n for n in document['nodes'] if 'mesh' in n]
assert len(nodes) == 18
assert {n.get('extras', {}).get('structure_id') for n in nodes} == expected

# Import the exported asset into its own scene and compare world bounds to source.
original_bounds = {o['structure_id']: (list(o.dimensions),
                    [list(o.matrix_world @ Vector(p)) for p in o.bound_box])
                   for o in scene.objects}
roundtrip = bpy.data.scenes.new('CardioLab_Procedural_Roundtrip_Test')
bpy.context.window.scene = roundtrip
bpy.ops.import_scene.gltf(filepath=str(builder.GLB))
bpy.context.view_layer.update()
imported = {o.get('structure_id'): o for o in roundtrip.objects if o.type == 'MESH'}
assert set(imported) == expected
for name, obj in imported.items():
    dimensions, corners = original_bounds[name]
    assert all(abs(a-b) < 1e-4 for a, b in zip(dimensions, obj.dimensions)), name
    world = [list(obj.matrix_world @ Vector(p)) for p in obj.bound_box]
    for axis in range(3):
        for compare in (min, max):
            assert abs(compare(p[axis] for p in world) - compare(p[axis] for p in corners)) < 1e-4, name
    assert obj.get('anatomy_status') == 'unreviewed-procedural'

(ROOT / 'blender/generated/heart-procedural.report.json').write_text(json.dumps({
    'result': 'PASS: repeat build, other-scene preservation, closed mesh walls, GLB IDs/bounds roundtrip, zero images/textures',
    'anatomyReview': 'unreviewed', 'structures': report, 'glbBytes': len(data)
}, indent=2)+'\n')
print('PASS: 18 original meshes, manifold walls, preserved other scenes, GLB IDs/bounds roundtrip, no external textures')

# Source atlas integrity is separate from the procedural closed-wall contract.
runpy.run_path(str(ROOT / 'blender/scripts/validate_hra.py'), run_name='__main__')
