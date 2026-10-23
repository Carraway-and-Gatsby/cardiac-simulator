"""Original parameterized development geometry. No imported meshes or textures.

All control points below are authored in web Y-up coordinates, in arbitrary units.
This is a visual prototype, not measured anatomy or a continuous fluid domain.
"""
import hashlib
import json
import math
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SPEC = json.loads((ROOT / 'src/data/heart-procedural.json').read_text())
TAG = 'cardiolab_procedural_v1'
SCENE_NAME = 'CardioLab_Procedural'
GLB = ROOT / 'public/models/heart-procedural.glb'
BLEND = ROOT / 'blender/generated/heart-procedural.blend'
ITEMS = {item['id']: item for item in SPEC['structures']}


def smooth_path(points, steps=9):
    """Locally authored Catmull-Rom interpolation; no external geometry library."""
    values = []
    for i in range(len(points) - 1):
        p0, p1, p2, p3 = [points[j] for j in (max(i-1, 0), i, i+1, min(i+2, len(points)-1))]
        for j in range(steps):
            t = j / steps
            values.append([.5 * (2*b + (-a+c)*t + (2*a-5*b+4*c-d)*t*t
                                 + (-a+3*b-3*c+d)*t*t*t)
                           for a, b, c, d in zip(p0, p1, p2, p3)])
    return values + [list(points[-1])]


def material(item):
    name = 'CardioLab_Original_' + item['id']
    mat = bpy.data.materials.get(name)
    if mat and not mat.get(TAG):
        raise RuntimeError('Foreign material: ' + name)
    mat = mat or bpy.data.materials.new(name)
    mat[TAG] = True
    mat.use_nodes = True
    shader = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    srgb = [int(item['color'][i:i+2], 16)/255 for i in (1, 3, 5)]
    linear = [c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in srgb]
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = .43 if item['group'] == 'surface' else .36
    mat.diffuse_color = (*linear, 1)
    return mat


def mesh_object(scene, name, vertices, faces):
    object_name = 'CP_' + name
    if bpy.data.objects.get(object_name):
        raise RuntimeError('Object name collision: ' + object_name)
    mesh = bpy.data.meshes.new('Original_' + name)
    # (x, y, z) web -> (x, -z, y) Blender; determinant +1, so winding is preserved.
    mesh.from_pydata([(x, -z, y) for x, y, z in vertices], [], faces)
    mesh.update()
    bm = bmesh.new()
    try:
        bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        if bm.calc_volume(signed=True) < 0:
            bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
        bm.to_mesh(mesh)
    finally:
        bm.free()
    obj = bpy.data.objects.new(object_name, mesh)
    scene.collection.objects.link(obj)
    item = ITEMS[name]
    obj[TAG] = True
    obj['structure_id'] = name
    obj['structure_group'] = item['group']
    obj['anatomy_status'] = SPEC['status']
    obj['units'] = 'arbitrary'
    obj['provenance'] = 'Original procedural geometry; no external assets'
    mesh.materials.append(material(item))
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def join_rings(faces, first, second, count, reverse=False):
    for j in range(count):
        k = (j+1) % count
        face = (first+j, first+k, second+k, second+j)
        faces.append(tuple(reversed(face)) if reverse else face)


def outer_surface(scene):
    # y, lateral centre, depth centre, lateral radius, depth radius.
    profile = [(-1.90,.57,.10,.025,.025), (-1.67,.40,.07,.29,.23),
               (-1.30,.18,.03,.64,.43), (-.78,-.03,0, .96,.64),
               (-.18,-.12,-.04,1.11,.73), (.35,-.16,-.10,1.06,.67),
               (.70,-.16,-.17,.94,.57), (.96,-.15,-.24,.66,.42),
               (1.12,-.12,-.27,.32,.25), (1.18,-.10,-.27,.025,.025)]
    rings = smooth_path(profile, 7)
    count, vertices, faces = 72, [], []
    for y, cx, cz, rx, rz in rings:
        for j in range(count):
            theta = 2*math.pi*j/count
            # Shallow original surface grooves, not modeled coronary arteries.
            anterior = max(0, math.sin(theta))
            groove = .065 * math.exp(-((theta-1.39)/.13)**2) * math.exp(-((y+.35)/1.1)**4)
            waist = .035 * math.exp(-((y-.47)/.11)**2) * anterior
            radius = 1 - groove - waist + .012*math.sin(3*theta + y)*anterior
            vertices.append((cx+rx*math.cos(theta)*radius, y,
                             cz+rz*math.sin(theta)*radius))
    for i in range(len(rings)-1):
        join_rings(faces, i*count, (i+1)*count, count)
    faces += [tuple(reversed(range(count))), tuple((len(rings)-1)*count+j for j in range(count))]
    mesh_object(scene, 'HEART', vertices, faces)


def chamber(scene, name, centre, scale, lean, flatten=0):
    # Hollow, open-at-base bowls with a rounded apex and visible rim. The wall
    # thickness is a display choice; valves/septa and validated wall layers are absent.
    profile = [(-1,.025),(-.90,.35),(-.65,.67),(-.25,.94),
               (.20,1),(.55,.87),(.82,.61),(1,.38)]
    rings, count = smooth_path(profile, 5), 48
    vertices, faces = [], []
    for inner in (False, True):
        for y, radius in rings:
            local_y = y*.90 + .04 if inner else y
            for j in range(count):
                a = j*2*math.pi/count
                r = max(radius, .02) * (.80 if inner else 1)
                x = scale[0]*r*math.cos(a)
                z = scale[2]*r*math.sin(a)
                x += flatten*max(0, math.cos(a))**2*r
                vertices.append((centre[0]+x+lean*(1-local_y)/2,
                                 centre[1]+scale[1]*local_y, centre[2]+z))
    offset = len(rings)*count
    for i in range(len(rings)-1):
        join_rings(faces, i*count, (i+1)*count, count)
        join_rings(faces, offset+i*count, offset+(i+1)*count, count, True)
    faces += [tuple(reversed(range(count))), tuple(offset+j for j in range(count))]
    join_rings(faces, (len(rings)-1)*count, offset+(len(rings)-1)*count, count)
    mesh_object(scene, name, vertices, faces)


def vessel(scene, name, points):
    # Each point is x, y, z, radius. Outer and inner tubes share annular end rims.
    rings, count = smooth_path(points), 28
    frames, previous = [], None
    for i, p in enumerate(rings):
        tangent = (Vector(rings[min(i+1,len(rings)-1)][:3]) - Vector(rings[max(0,i-1)][:3])).normalized()
        reference = previous if previous is not None else Vector((0, 0, 1))
        normal = reference - tangent*reference.dot(tangent)
        if normal.length < 1e-6:
            normal = tangent.cross(Vector((1, 0, 0)))
        normal.normalize()
        frames.append((normal, tangent.cross(normal).normalized()))
        previous = normal
    vertices, faces = [], []
    for inner in (False, True):
        for p, (normal, binormal) in zip(rings, frames):
            centre, radius = Vector(p[:3]), p[3]*(.76 if inner else 1)
            for j in range(count):
                a = 2*math.pi*j/count
                vertices.append(tuple(centre+radius*(math.cos(a)*normal+math.sin(a)*binormal)))
    offset = len(rings)*count
    for i in range(len(rings)-1):
        join_rings(faces, i*count, (i+1)*count, count)
        join_rings(faces, offset+i*count, offset+(i+1)*count, count, True)
    join_rings(faces, offset, 0, count)
    join_rings(faces, (len(rings)-1)*count, offset+(len(rings)-1)*count, count)
    mesh_object(scene, name, vertices, faces)


VESSELS = {
    'AORTA':[(.32,-.10,-.13,.23),(.12,.62,.02,.25),(.07,1.38,.02,.25),(.23,1.92,-.05,.25),(.65,2.08,-.27,.24),(1.02,1.77,-.53,.22),(1.07,.80,-.75,.21),(1.03,-.60,-.80,.20)],
    'PT':[(-.35,-.12,.43,.23),(-.30,.55,.50,.26),(-.22,1.11,.41,.25),(-.03,1.47,.12,.24)],
    'RPA':[(-.03,1.47,.12,.19),(-.45,1.48,-.31,.18),(-1.10,1.32,-.42,.17),(-1.57,1.25,-.36,.16)],
    'LPA':[(-.03,1.47,.12,.19),(.52,1.50,-.12,.18),(1.13,1.39,-.21,.17),(1.58,1.33,-.28,.16)],
    'SVC':[(-.73,.50,-.10,.23),(-.91,1.12,-.08,.23),(-.94,1.60,-.09,.22),(-.96,2.12,-.10,.22)],
    'IVC':[(-.76,.43,-.30,.23),(-1.00,.02,-.36,.24),(-1.08,-.48,-.42,.23),(-1.10,-.93,-.47,.22)],
    'RSPV':[(-1.53,.91,-.66,.14),(-.85,.90,-.70,.15),(-.20,.84,-.68,.15),(.18,.78,-.60,.15)],
    'RIPV':[(-1.49,.31,-.63,.14),(-.83,.36,-.76,.15),(-.17,.43,-.75,.15),(.18,.48,-.64,.15)],
    'LSPV':[(1.46,.98,-.57,.14),(1.00,.92,-.59,.15),(.58,.80,-.56,.16)],
    'LIPV':[(1.47,.39,-.54,.14),(.99,.41,-.65,.15),(.57,.49,-.62,.16)],
    'BCT':[(.13,1.72,.00,.115),(-.01,2.14,.02,.115),(-.24,2.58,.04,.105)],
    'LCC':[(.44,2.03,-.14,.095),(.47,2.33,-.12,.095),(.48,2.67,-.09,.085)],
    'LSA':[(.73,2.00,-.32,.11),(.94,2.33,-.37,.105),(1.13,2.55,-.38,.095)],
}


def build():
    scene = bpy.data.scenes.get(SCENE_NAME)
    if scene and (not scene.get(TAG) or any(not obj.get(TAG) for obj in scene.objects)):
        raise RuntimeError('Refusing to replace a scene or object not owned by this generator')
    if scene:
        for obj in list(scene.objects):
            data = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            if data.users == 0:
                bpy.data.meshes.remove(data)
    else:
        scene = bpy.data.scenes.new(SCENE_NAME)
        scene[TAG] = True
    bpy.context.window.scene = scene
    outer_surface(scene)
    chamber(scene, 'RA', (-.67,.47,-.02), (.46,.60,.47), -.06)
    chamber(scene, 'LA', (.29,.66,-.51), (.47,.45,.38), .03)
    chamber(scene, 'RV', (-.42,-.52,.26), (.47,.91,.37), .18, flatten=.08)
    chamber(scene, 'LV', (.34,-.64,-.09), (.47,1.11,.43), .18)
    for name, points in VESSELS.items():
        vessel(scene, name, points)
    bpy.context.view_layer.update()
    assert {obj.get('structure_id') for obj in scene.objects} == set(ITEMS)
    for obj in scene.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = scene.objects['CP_HEART']
    GLB.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(GLB), export_format='GLB', use_selection=True,
        use_active_scene=True, export_yup=True, export_extras=True, export_animations=False,
        export_cameras=False, export_lights=False)
    BLEND.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    manifest_path = ROOT / 'assets/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    asset = next(a for a in manifest['assets'] if a['id'] == SPEC['id'])
    asset.update(sha256=hashlib.sha256(GLB.read_bytes()).hexdigest(), generatorVersion=bpy.app.version_string,
                 anatomyReview='unreviewed', licenseReview='internal-only', reviewer=None,
                 reviewDate=None, reviewEvidence=None, reviewedSha256=None)
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False)+'\n')
    print('PASS: original heart surface, four hollow chambers and thirteen vessel meshes; no images/textures')
    return scene


if __name__ == '__main__':
    build()
