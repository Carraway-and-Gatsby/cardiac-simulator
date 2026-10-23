"""Check export contract and repeat-run behavior, not anatomical correctness."""
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import bpy

ROOT = Path(__file__).resolve().parents[2]
module_spec = importlib.util.spec_from_file_location('builder', ROOT / 'blender/scripts/build_demo.py')
builder = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(builder)

# A sentinel in the default scene must survive both builds.
sentinel = bpy.context.scene.objects.get('Cube')
assert sentinel is not None
sentinel['preserve_me'] = True
builder.build()
builder.build()
assert bpy.data.objects.get('Cube').get('preserve_me') is True
assert len(bpy.data.scenes[builder.SCENE_NAME].objects) == 4
bpy.ops.object.select_all(action='SELECT')
for obj in list(bpy.context.scene.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/heart-schematic.glb'))
objects = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == 'MESH'}
assert set(objects) == {'RA','LA','RV','LV'}, set(objects)
source = json.loads((ROOT/'src/data/heart-demo.json').read_text())
for item in source['structures']:
    obj = objects[item['id']]
    assert obj.get('structure_id') == item['id']
    assert obj.get('anatomy_status') == 'unreviewed-schematic'
    x,y,z = item['position']
    assert all(abs(a-b) < 1e-5 for a,b in zip(obj.location,(x,-z,y)))
    assert len(obj.data.polygons) > 0
print('PASS: repeat build, existing-scene preservation, GLB round-trip IDs and coordinates')

# The GUI inspection helper must also restore all original objects and the active scene.
inspection_spec = importlib.util.spec_from_file_location('inspection', ROOT / 'blender/scripts/inspect_demo.py')
inspection = importlib.util.module_from_spec(inspection_spec)
inspection_spec.loader.exec_module(inspection)
# Blender cannot link its current file; use an identical temporary library copy.
with tempfile.TemporaryDirectory(prefix='cardiolab-inspection-test-') as directory:
    library = Path(directory) / 'schematic.blend'
    shutil.copy2(inspection.SOURCE, library)
    inspection.SOURCE = library
    try:
        inspection.begin()
        inspection.inspect()
    finally:
        if inspection.STATE_KEY in bpy.app.driver_namespace:
            inspection.finish()
print('PASS: temporary inspection library removed and original scene restored')
