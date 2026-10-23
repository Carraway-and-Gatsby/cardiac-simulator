"""Rebuild only an explicitly owned scene; export a schematic, not anatomy."""
import hashlib
import json
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
SPEC = json.loads((ROOT / "src/data/heart-demo.json").read_text())
TAG = "cardiolab_schematic_v1"
SCENE_NAME = "CardioLab_Schematic"


def build():
    scene = bpy.data.scenes.get(SCENE_NAME)
    if scene and not scene.get(TAG):
        raise RuntimeError("Refusing to modify a scene not owned by this script")
    if scene:
        for obj in list(scene.objects):
            if not obj.get(TAG):
                raise RuntimeError("Foreign object in generated scene; save/move it before rebuilding")
        for obj in list(scene.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
    else:
        scene = bpy.data.scenes.new(SCENE_NAME)
        scene[TAG] = True
    bpy.context.window.scene = scene
    scene.unit_settings.system = 'NONE'
    for item in SPEC['structures']:
        x, y, z = item['position']
        sx, sy, sz = item['scale']
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=32, location=(x, -z, y))
        obj = bpy.context.object
        obj.name = item['id']
        # Stable object names are part of the export contract; do not steal existing names.
        if obj.name != item['id']:
            raise RuntimeError(f"Object name collision: {item['id']}; use the background command")
        obj.scale = (sx, sz, sy)
        obj[TAG] = True
        obj['structure_id'] = item['id']
        obj['anatomy_status'] = SPEC['status']
        obj['units'] = 'arbitrary'
        for face in obj.data.polygons:
            face.use_smooth = True
        mat_name = f"CardioLab_{item['id']}"
        mat = bpy.data.materials.get(mat_name)
        if mat and not mat.get(TAG):
            raise RuntimeError(f"Material name collision: {mat_name}")
        mat = mat or bpy.data.materials.new(mat_name)
        mat[TAG] = True
        color = [int(item['color'][i:i+2], 16)/255 for i in (1,3,5)]
        # glTF materials store linear RGB; CSS/Three colors arrive as sRGB.
        linear = [c / 12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in color]
        mat.use_nodes = True
        mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*linear, 1)
        mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .4
        obj.data.materials.clear()
        obj.data.materials.append(mat)
    bpy.ops.object.select_all(action='SELECT')
    destination = ROOT / 'public/models/heart-schematic.glb'
    destination.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(destination), export_format='GLB', use_selection=True, use_active_scene=True, export_yup=True, export_extras=True, export_animations=False, export_cameras=False, export_lights=False)
    blend = ROOT / 'blender/generated/heart-schematic.blend'
    blend.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    manifest_path = ROOT / 'assets/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    demo = next(asset for asset in manifest['assets'] if asset['id'] == SPEC['id'])
    demo['sha256'] = hashlib.sha256(destination.read_bytes()).hexdigest()
    demo['generatorVersion'] = bpy.app.version_string
    # A generated schematic must never inherit approval from an earlier artifact.
    demo.update(anatomyReview='unreviewed', licenseReview='internal-only',
                reviewer=None, reviewDate=None, reviewEvidence=None, reviewedSha256=None)
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    print('PASS: generated 4 labeled schematic structures, GLB and .blend')

if __name__ == '__main__':
    build()
