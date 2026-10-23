"""HRA import/export integrity checks. Does not certify anatomical accuracy."""
import importlib.util
import json
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('hra_builder', ROOT / 'blender/scripts/build_hra.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

# Existing objects, including the procedural test scene, must not be modified.
owned = {obj.name for obj in bpy.data.objects if obj.get(builder.TAG)}
before = builder.source_scene_signature(excluded=owned)
builder.build()
scene = builder.build()
after = builder.source_scene_signature()
for name, signature in before.items():
    assert after.get(name) == signature, 'HRA build changed another scene object: ' + name

model_spec, _, items, sources = builder.load_inputs()
expected = {item['id'] for item in items.values()}
original = {obj['structure_id']: builder.object_geometry(obj) for obj in scene.objects if obj.type == 'MESH'}
assert set(original) == expected

# Inspect every exported node and prohibit external runtime dependencies or animation.
document, binary, _ = builder.read_glb(builder.GLB)
mesh_nodes = [node for node in document['nodes'] if 'mesh' in node]
assert len(mesh_nodes) == len(expected)
assert {node.get('extras', {}).get('structure_id') for node in mesh_nodes} == expected
assert all(node.get('extras', {}).get('anatomy_status') == model_spec['status'] for node in mesh_nodes)
assert all(node.get('extras', {}).get('motion') == 'static-source-geometry' for node in mesh_nodes)
assert not document.get('animations') and not document.get('cameras')

# Re-import the final web-delivery file into a separate test scene.
roundtrip = bpy.data.scenes.new('CardioLab_HRA_Roundtrip_Test')
bpy.context.window.scene = roundtrip
bpy.ops.import_scene.gltf(filepath=str(builder.GLB), import_pack_images=True, merge_vertices=False)
bpy.context.view_layer.update()
imported = {obj.get('structure_id'): obj for obj in roundtrip.objects if obj.type == 'MESH'}
assert set(imported) == expected and len(imported) == len(expected)
comparisons = {}
for structure_id, obj in imported.items():
    assert obj.get('anatomy_status') == model_spec['status']
    comparisons[structure_id] = builder.compare_geometry(original[structure_id], builder.object_geometry(obj))
    # Report source defects without incorrectly requiring open anatomical surfaces to be watertight.
    builder.diagnostics(obj)

report = json.loads(builder.REPORT.read_text())
report['validation'] = {
    'result': 'PASS: pinned source, repeat build, other-scene preservation, complete IDs, oriented geometry roundtrip',
    'otherSceneObjectsPreserved': len(before),
    'structures': comparisons,
    'maxCoordinateDeviationM': max(item['maxCoordinateDeviationM'] for item in comparisons.values()),
    'anatomicalReview': 'not performed',
    'meshDefects': 'Known source zero-area triangles/open boundaries/disconnected components are reported, not repaired',
}
builder.REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
print(f'PASS: {len(expected)} source-derived HRA structures; original geometry preserved; anatomy UNREVIEWED')
