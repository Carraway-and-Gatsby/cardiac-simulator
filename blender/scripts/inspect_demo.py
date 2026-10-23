"""Temporarily link the generated scene, with a backup and explicit restoration.

Run begin(), inspect with the existing MCP client, then finish() in a finally block.
No generated file or original scene is overwritten. State survives MCP code calls
in bpy.app.driver_namespace; no second MCP client is started.
"""
import hashlib
import json
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import bpy

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'blender/generated/heart-schematic.blend'
STATE_KEY = 'cardiolab_demo_inspection'


def snapshot():
    objects = []
    for obj in bpy.data.objects:
        geometry = None
        if obj.type == 'MESH':
            geometry = hashlib.sha256(repr((
                [tuple(v.co) for v in obj.data.vertices],
                [tuple(p.vertices) for p in obj.data.polygons],
            )).encode()).hexdigest()
        objects.append((obj.name_full, obj.as_pointer(), obj.type,
                        tuple(tuple(row) for row in obj.matrix_world), geometry))
    scene = bpy.context.scene
    return {
        'filepath': bpy.data.filepath,
        'is_saved': bpy.data.is_saved,
        'scene': scene.name_full,
        'scenes': sorted(s.name_full for s in bpy.data.scenes),
        'libraries': sorted(l.filepath for l in bpy.data.libraries),
        'objects': sorted(objects),
        'active': bpy.context.view_layer.objects.active.name_full
                  if bpy.context.view_layer.objects.active else None,
        'selected': sorted(o.name_full for o in bpy.context.selected_objects),
        'mode': bpy.context.mode,
        'frame': scene.frame_current,
        'engine': scene.render.engine,
    }


def begin():
    if STATE_KEY in bpy.app.driver_namespace:
        raise RuntimeError('Finish the existing inspection first')
    if bpy.context.mode != 'OBJECT' or not SOURCE.is_file():
        raise RuntimeError('Requires Object mode and an existing generated blend')
    if any(Path(bpy.path.abspath(l.filepath)).resolve() == SOURCE.resolve()
           for l in bpy.data.libraries):
        raise RuntimeError('The generated library is already loaded; preserve it')
    token = datetime.now().strftime('%Y%m%d-%H%M%S') + '-' + uuid4().hex[:8]
    directory = ROOT / '.local' / 'inspection' / token
    directory.mkdir(parents=True, exist_ok=False)
    backup = directory / 'original-scene.blend'
    state = {
        'window': bpy.context.window,
        'scene': bpy.context.window.scene,
        'view_layer': bpy.context.window.view_layer,
        'before': snapshot(),
        'dirty_before': bpy.data.is_dirty,
        'directory': directory,
        'library': None,
    }
    result = bpy.ops.wm.save_as_mainfile(filepath=str(backup), copy=True)
    if result != {'FINISHED'} or not backup.is_file():
        raise RuntimeError('Backup failed; original scene remains active')
    state['backup'] = str(backup)
    state['backup_sha256'] = hashlib.sha256(backup.read_bytes()).hexdigest()
    bpy.app.driver_namespace[STATE_KEY] = state
    try:
        with bpy.data.libraries.load(str(SOURCE), link=True) as (available, loaded):
            if 'CardioLab_Schematic' not in available.scenes:
                raise RuntimeError('Generated scene is missing')
            loaded.scenes = ['CardioLab_Schematic']
        scene = loaded.scenes[0]
        state['library'] = scene.library
        state['window'].scene = scene
        # Inspect separately so the GUI can activate the linked scene first.
        return {'scene': scene.name, 'backup': state['backup'],
                'backup_sha256': state['backup_sha256'], 'next': 'inspect(), then finish()'}
    except Exception:
        finish()
        raise


def inspect():
    state = bpy.app.driver_namespace[STATE_KEY]
    scene = state['window'].scene
    with bpy.context.temp_override(window=state['window'], scene=scene,
                                   view_layer=scene.view_layers[0]):
        # Linking can leave original object matrices stale until evaluation.
        scene.frame_set(scene.frame_current)
        depsgraph = bpy.context.evaluated_depsgraph_get()
        depsgraph.update()
        report = verify(scene, depsgraph)
    report.update(backup=state['backup'], backup_sha256=state['backup_sha256'])
    (state['directory'] / 'inspection.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


def verify(scene, depsgraph):
    spec = json.loads((ROOT / 'src/data/heart-demo.json').read_text())
    objects = {o.get('structure_id'): o for o in scene.objects}
    assert set(objects) == {s['id'] for s in spec['structures']}
    report = []
    for item in spec['structures']:
        obj = objects[item['id']]
        x, y, z = item['position']
        sx, sy, sz = item['scale']
        assert obj.type == 'MESH' and obj.get('anatomy_status') == spec['status']
        assert all(abs(a-b) < 1e-5 for a, b in zip(obj.location, (x, -z, y)))
        assert all(abs(a-b) < 1e-5 for a, b in zip(obj.scale, (sx, sz, sy)))
        evaluated = obj.evaluated_get(depsgraph)
        assert all(abs(a-b) < 1e-5 for a, b in zip(evaluated.matrix_world.translation, (x, -z, y)))
        expected_dimensions = (2*sx, 2*sz, 2*sy)
        assert all(abs(a-b) < 1e-5 for a, b in zip(evaluated.dimensions, expected_dimensions)), \
            (item['id'], tuple(evaluated.dimensions), expected_dimensions)
        shader = next(n for n in obj.active_material.node_tree.nodes
                      if n.type == 'BSDF_PRINCIPLED')
        srgb = [int(item['color'][i:i+2], 16)/255 for i in (1, 3, 5)]
        linear = [c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in srgb]
        assert all(abs(a-b) < 1e-5 for a, b in zip(shader.inputs['Base Color'].default_value, linear))
        report.append({'id': item['id'], 'location': list(obj.location),
                       'dimensions': list(evaluated.dimensions), 'color_srgb': item['color'],
                       'vertices': len(obj.data.vertices), 'faces': len(obj.data.polygons)})
    return {'source': str(SOURCE), 'scene': scene.name, 'structures': report,
            'result': 'PASS: IDs, axes, scales, dimensions and material colors match JSON'}


def finish():
    state = bpy.app.driver_namespace[STATE_KEY]
    state['window'].scene = state['scene']
    state['window'].view_layer = state['view_layer']
    if state['library'] is not None:
        bpy.data.libraries.remove(state['library'])
        state['library'] = None
    bpy.context.view_layer.update()
    after = snapshot()
    report = {'preserved': after == state['before'], 'backup': state['backup'],
              'backup_sha256': state['backup_sha256'], 'dirty_before': state['dirty_before'],
              'dirty_after': bpy.data.is_dirty, 'before': state['before'], 'after': after}
    (state['directory'] / 'restoration.json').write_text(json.dumps(report, indent=2) + '\n')
    assert report['preserved'], 'Scene differs; inspect restoration.json and retain the backup'
    del bpy.app.driver_namespace[STATE_KEY]
    return report
