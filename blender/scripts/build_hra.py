"""Reproducibly import selected HRA source nodes without geometric alteration.

Run only through ``npm run blender:build`` (guarded, separate Blender process).
Source acquisition, metadata changes and tissue rendering are not anatomy approval.
"""
from collections import Counter, defaultdict
import hashlib
import itertools
import json
import math
from pathlib import Path
import struct
import tempfile

import bpy
import bmesh
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(__file__).resolve().parents[2]
SPEC_PATH = ROOT / 'src/data/heart-hra.json'
SOURCE_PATH = ROOT / 'assets/sources/heart-hra.json'
GLB = ROOT / 'public/models/heart-hra.glb'
BLEND = ROOT / 'blender/generated/heart-hra.blend'
REPORT = ROOT / 'blender/generated/heart-hra.report.json'
TAG = 'cardiolab_hra_v1'
SCENE_NAME = 'CardioLab_HRA'
# 0.0001 mm: export float32 round-off tolerance, not anatomical accuracy.
GEOMETRY_TOLERANCE_M = 1e-7
BLENDER_TO_YUP = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))


def local_path(value):
    path = (ROOT / value).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError('Path must remain in the project: ' + str(value))
    return path


def read_glb(path):
    data = path.read_bytes()
    if len(data) < 20 or struct.unpack_from('<4sII', data) != (b'glTF', 2, len(data)):
        raise ValueError('Invalid GLB header: ' + str(path))
    chunks, offset = [], 12
    while offset < len(data):
        length, kind = struct.unpack_from('<II', data, offset)
        offset += 8
        if offset + length > len(data):
            raise ValueError('Truncated GLB chunk')
        chunks.append((kind, data[offset:offset + length]))
        offset += length
    if not chunks or chunks[0][0] != 0x4E4F534A:
        raise ValueError('Missing GLB JSON')
    document = json.loads(chunks[0][1])
    if len(document.get('buffers', [])) != 1 or any('uri' in b for b in document.get('buffers', [])):
        raise ValueError('Expected one embedded buffer')
    if any('uri' in image for image in document.get('images', [])):
        raise ValueError('External image URI is not allowed')
    binaries = [chunk for kind, chunk in chunks if kind == 0x004E4942]
    if len(binaries) != 1:
        raise ValueError('Expected one BIN chunk')
    return document, binaries[0], chunks


def write_glb(path, document, chunks):
    encoded = json.dumps(document, separators=(',', ':')).encode()
    encoded += b' ' * ((-len(encoded)) % 4)
    updated = [(0x4E4F534A, encoded)] + chunks[1:]
    body = b''.join(struct.pack('<II', len(data), kind) + data for kind, data in updated)
    path.write_bytes(struct.pack('<4sII', b'glTF', 2, len(body) + 12) + body)


def accessor(document, binary, index):
    item = document['accessors'][index]
    if 'sparse' in item or 'bufferView' not in item:
        raise ValueError('Sparse/implicit accessors are unsupported; do not alter the source')
    view = document['bufferViews'][item['bufferView']]
    if view.get('buffer', 0) != 0:
        raise ValueError('Unexpected buffer')
    formats = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}
    sizes = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
    fmt = '<' + formats[item['componentType']] * sizes[item['type']]
    size = struct.calcsize(fmt)
    stride = view.get('byteStride', size)
    offset = view.get('byteOffset', 0) + item.get('byteOffset', 0)
    if stride < size or offset + (item['count'] - 1) * stride + size > len(binary):
        raise ValueError('Accessor bounds are invalid')
    return [struct.unpack_from(fmt, binary, offset + i * stride) for i in range(item['count'])]


def node_matrix(node):
    if 'matrix' in node:
        values = node['matrix']
        return Matrix([values[i::4] for i in range(4)])
    translation = Matrix.Translation(Vector(node.get('translation', [0, 0, 0])))
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    rotation = Quaternion((w, x, y, z)).to_matrix().to_4x4()
    scale = Matrix.Diagonal(Vector((*node.get('scale', [1, 1, 1]), 1)))
    return translation @ rotation @ scale


def source_geometries(document, binary):
    """Return mesh geometry in original glTF Y-up metres, including node parents."""
    output, visited = {}, set()

    def visit(index, parent):
        if index in visited:
            raise ValueError('Source node has multiple parents or a cycle')
        visited.add(index)
        node = document['nodes'][index]
        world = parent @ node_matrix(node)
        if not math.isfinite(world.determinant()) or world.determinant() <= 0:
            raise ValueError('Reflected/singular source transform: ' + node.get('name', str(index)))
        if 'mesh' in node:
            name = node.get('name')
            if not name or name in output:
                raise ValueError('Mesh sourceNode must be unique and named')
            vertices, triangles = [], []
            for primitive in document['meshes'][node['mesh']]['primitives']:
                if primitive.get('mode', 4) != 4 or primitive.get('targets'):
                    raise ValueError('Only static triangle primitives are supported')
                if 'extensions' in primitive:
                    raise ValueError('Compressed/extended primitive requires explicit review')
                positions = accessor(document, binary, primitive['attributes']['POSITION'])
                base = len(vertices)
                vertices.extend(tuple(world @ Vector(position)) for position in positions)
                indices = ([row[0] for row in accessor(document, binary, primitive['indices'])]
                           if 'indices' in primitive else list(range(len(positions))))
                if len(indices) % 3 or any(i >= len(positions) or i < 0 for i in indices):
                    raise ValueError('Invalid triangle indices')
                triangles.extend(tuple(base + j for j in indices[i:i + 3]) for i in range(0, len(indices), 3))
            output[name] = {'vertices': vertices, 'triangles': triangles,
                            'worldMatrixYup': [list(row) for row in world]}
        for child in node.get('children', []):
            visit(child, world)

    scene = document['scenes'][document.get('scene', 0)]
    for root in scene['nodes']:
        visit(root, Matrix.Identity(4))
    return output


def object_geometry(obj):
    obj.data.calc_loop_triangles()
    transform = BLENDER_TO_YUP @ obj.matrix_world
    if not math.isfinite(transform.determinant()) or transform.determinant() <= 0:
        raise ValueError('Reflected/singular imported transform: ' + obj.name)
    return {'vertices': [tuple(transform @ vertex.co) for vertex in obj.data.vertices],
            'triangles': [tuple(triangle.vertices) for triangle in obj.data.loop_triangles]}


def bounds(vertices):
    return {'min': [min(v[i] for v in vertices) for i in range(3)],
            'max': [max(v[i] for v in vertices) for i in range(3)]}


def compare_geometry(reference, actual, label='mesh'):
    """Match coordinates and oriented triangle connectivity despite vertex reordering."""
    tolerance = GEOMETRY_TOLERANCE_M
    source_points = reference['vertices']
    exact_points = set(source_points)
    cells = defaultdict(list)
    for point in exact_points:
        cells[tuple(math.floor(x / tolerance) for x in point)].append(point)
    mapping, maximum = [], 0.0
    for point in actual['vertices']:
        if point in exact_points:
            mapping.append(point)
            continue
        cell = tuple(math.floor(x / tolerance) for x in point)
        candidates = itertools.chain.from_iterable(cells.get(tuple(cell[i] + delta[i] for i in range(3)), [])
                                                    for delta in itertools.product((-1, 0, 1), repeat=3))
        nearest, distance = None, float('inf')
        for candidate in candidates:
            difference = max(abs(a - b) for a, b in zip(point, candidate))
            if difference < distance:
                nearest, distance = candidate, difference
        if nearest is None or distance > tolerance:
            raise AssertionError('Source vertex changed beyond 0.0001 mm tolerance: ' + str(point))
        mapping.append(nearest)
        maximum = max(maximum, distance)

    def canonical(points):
        return min(tuple(points[i:] + points[:i]) for i in range(3))

    expected = Counter(canonical([source_points[i] for i in face]) for face in reference['triangles'])
    observed = Counter(canonical([mapping[i] for i in face]) for face in actual['triangles'])
    # Blender's built-in glTF importer calls mesh.validate(), which removes faces
    # that reuse the same three vertex indices. The source RA has 12 such pairs,
    # oppositely wound. Account for this exact mandatory importer operation:
    # retain EVERY nonduplicate oriented triangle and exactly ONE original
    # winding from each duplicate-index group. Geometric coincidence alone does
    # not qualify for removal; triangles with distinct indices remain required.
    groups = defaultdict(list)
    for index, face in enumerate(reference['triangles']):
        groups[tuple(sorted(face))].append(index)
    duplicate_groups = [indices for indices in groups.values() if len(indices) > 1]
    duplicate_count = sum(len(indices) - 1 for indices in duplicate_groups)
    removed_records = []
    preserved = expected == observed
    if not preserved and duplicate_count:
        required = Counter()
        for indices in groups.values():
            if len(indices) == 1:
                face = reference['triangles'][indices[0]]
                required[canonical([source_points[i] for i in face])] += 1
        remainder = observed - required
        candidates = []
        for indices in duplicate_groups:
            choices = {}
            for index in indices:
                face = reference['triangles'][index]
                choices.setdefault(canonical([source_points[i] for i in face]), index)
            candidates.append((indices, choices))
        candidates.sort(key=lambda entry: len(entry[1]))

        def match_groups(position):
            if position == len(candidates):
                return not +remainder
            indices, choices = candidates[position]
            for key, retained_index in choices.items():
                if remainder[key] <= 0:
                    continue
                remainder[key] -= 1
                removed_records.append({'sourceTriangleIndices': indices,
                                        'retainedWindingSourceTriangleIndex': retained_index,
                                        'removedCount': len(indices) - 1})
                if match_groups(position + 1):
                    return True
                removed_records.pop()
                remainder[key] += 1
            return False

        preserved = not (required - observed) and len(actual['triangles']) == len(reference['triangles']) - duplicate_count and match_groups(0)
    if not preserved:
        missing = expected - observed
        added = observed - expected
        detail = {'label': label, 'sourceTriangles': len(reference['triangles']),
                  'actualTriangles': len(actual['triangles']), 'maxCoordinateDeviationM': maximum,
                  'missingTriangles': sum(missing.values()), 'addedTriangles': sum(added.values()),
                  'missingExamples': list(missing.items())[:5], 'addedExamples': list(added.items())[:5]}
        failure_path = ROOT / '.local/anatomy-geometry-failure.json'
        failure_path.parent.mkdir(exist_ok=True)
        failure_path.write_text(json.dumps(detail, indent=2) + '\n')
        raise AssertionError('Oriented triangle connectivity changed: ' + json.dumps({k: v for k, v in detail.items() if not k.endswith('Examples')}))
    removed_count = sum(record['removedCount'] for record in removed_records)
    return {'maxCoordinateDeviationM': maximum, 'toleranceM': tolerance,
            'orientedTrianglesPreserved': expected == observed,
            'nonduplicateOrientedTrianglesPreserved': True,
            'sourceTriangles': len(reference['triangles']), 'triangles': len(actual['triangles']),
            'sourceDuplicateIndexFaces': duplicate_count, 'duplicateIndexFacesRemoved': removed_count,
            'duplicateIndexRemoval': removed_records,
            'importerOperation': 'Blender glTF mesh.validate removes duplicate index faces; one source winding survives'
                if removed_count else 'none'}


def diagnostics(obj):
    geometry = object_geometry(obj)
    if not geometry['vertices'] or not geometry['triangles']:
        raise ValueError('Empty selected mesh: ' + obj.name)
    if any(not math.isfinite(c) for point in geometry['vertices'] for c in point):
        raise ValueError('Non-finite geometry: ' + obj.name)
    areas = [(Vector(geometry['vertices'][b]) - Vector(geometry['vertices'][a])).cross(
             Vector(geometry['vertices'][c]) - Vector(geometry['vertices'][a])).length / 2
             for a, b, c in geometry['triangles']]
    invalid = sum(not math.isfinite(area) or area <= 0 for area in areas)
    bm = bmesh.new()
    try:
        bm.from_mesh(obj.data)
        boundary = sum(edge.is_boundary for edge in bm.edges)
        nonmanifold = sum(not edge.is_manifold and not edge.is_boundary for edge in bm.edges)
        loose = sum(edge.is_wire for edge in bm.edges)
        normal_conflicts = sum(edge.is_manifold and not edge.is_contiguous for edge in bm.edges)
        remaining = set(bm.verts)
        components = 0
        while remaining:
            stack = [remaining.pop()]
            components += 1
            while stack:
                vertex = stack.pop()
                for edge in vertex.link_edges:
                    neighbor = edge.other_vert(vertex)
                    if neighbor in remaining:
                        remaining.remove(neighbor)
                        stack.append(neighbor)
    finally:
        bm.free()
    result = {'vertices': len(geometry['vertices']), 'triangles': len(areas),
              'worldBoundsYupM': bounds(geometry['vertices']), 'minimumTriangleAreaM2': min(areas),
              'nonpositiveOrNonfiniteTriangleAreas': invalid, 'boundaryEdges': boundary,
              'nonmanifoldNonboundaryEdges': nonmanifold, 'looseEdges': loose,
              'inconsistentWindingEdges': normal_conflicts, 'connectedComponents': components,
              'selfIntersections': 'not tested', 'interStructureIntersections': 'not tested',
              'anatomicalConnectivity': 'not validated', 'repairsApplied': []}
    # Known zero-area source triangles are retained and reported, not silently repaired.
    # The exact triangle comparison rejects any newly introduced geometric defect.
    if any(not math.isfinite(area) for area in areas):
        raise ValueError('Nonfinite triangle area in ' + obj.name)
    return result


def source_diagnostics(geometry):
    zero = 0
    for a, b, c in geometry['triangles']:
        u = [geometry['vertices'][b][i] - geometry['vertices'][a][i] for i in range(3)]
        v = [geometry['vertices'][c][i] - geometry['vertices'][a][i] for i in range(3)]
        cross = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
        zero += all(component == 0 for component in cross)
    return {'vertices': len(geometry['vertices']), 'triangles': len(geometry['triangles']),
            'zeroAreaTriangles': zero, 'worldBoundsYupM': bounds(geometry['vertices'])}


def load_inputs():
    spec = json.loads(SPEC_PATH.read_text())
    config = json.loads(SOURCE_PATH.read_text())
    if config['id'] != spec['id']:
        raise ValueError('Source config/spec IDs differ')
    if spec['units'] != 'metres' or config.get('sourceUnits') != 'metres':
        raise ValueError('This preservation pipeline requires explicitly documented source metres')
    by_key = {source['key']: source for source in config['sources']}
    if len(by_key) != len(config['sources']):
        raise ValueError('Duplicate source key')
    items = {(item['sourceKey'], item['sourceNode']): item for item in spec['structures']}
    if len(items) != len(spec['structures']) or len({i['id'] for i in items.values()}) != len(items):
        raise ValueError('Duplicate source mapping or structure ID')
    if any(key not in by_key for key, _ in items):
        raise ValueError('Unknown source key')
    sources = []
    for source in config['sources']:
        path = local_path(source['path'])
        if not path.is_file():
            raise FileNotFoundError(str(path) + '; run python3 scripts/acquire-anatomy.py, then npm run blender:build')
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != source['sha256']:
            raise ValueError('Source checksum mismatch: ' + str(path) + '; inspect or reacquire the pinned source')
        document, binary, chunks = read_glb(path)
        geometry = source_geometries(document, binary)
        selected = {node for key, node in items if key == source['key']}
        if not selected.issubset(geometry):
            raise ValueError('Mapped source nodes missing: ' + repr(selected - geometry.keys()))
        sources.append((source, document, chunks, geometry))
    return spec, config, items, sources


def source_scene_signature(excluded=None):
    signatures = {}
    for obj in bpy.data.objects:
        if excluded and obj.name in excluded:
            continue
        digest = None
        if obj.type == 'MESH':
            geometry = hashlib.sha256()
            for vertex in obj.data.vertices:
                geometry.update(struct.pack('<3f', *vertex.co))
            for face in obj.data.polygons:
                geometry.update(struct.pack('<I', len(face.vertices)))
                geometry.update(struct.pack('<' + 'I' * len(face.vertices), *face.vertices))
            digest = geometry.hexdigest()
        signatures[obj.name] = (obj.as_pointer(), tuple(tuple(row) for row in obj.matrix_world), digest)
    return signatures


def build():
    spec, config, items, sources = load_inputs()
    manifest_path = ROOT / 'assets/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    asset = next((asset for asset in manifest['assets'] if asset['id'] == spec['id']), None)
    if asset is None:
        raise ValueError('Create source/licensing manifest entry before building: ' + spec['id'])
    scene = bpy.data.scenes.get(SCENE_NAME)
    if scene and (not scene.get(TAG) or any(not obj.get(TAG) for obj in scene.objects)):
        raise RuntimeError('Refusing to replace a foreign HRA scene/object')
    if scene:
        for obj in list(scene.objects):
            data = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            if isinstance(data, bpy.types.Mesh) and data.users == 0:
                bpy.data.meshes.remove(data)
    else:
        scene = bpy.data.scenes.new(SCENE_NAME)
        scene[TAG] = True
    bpy.context.window.scene = scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1
    records, source_records = [], []
    for source, document, chunks, source_geometry in sources:
        # Rename metadata in a temporary GLB so Blender name suffixes cannot break mapping.
        # Binary vertex/index/material payloads and all original transforms are untouched.
        for index, node in enumerate(document['nodes']):
            original = node.get('name', str(index))
            node['name'] = f"HRA_{source['key']}_{index}_{original}"
            node.setdefault('extras', {}).update(hra_source_node=original, hra_source_key=source['key'])
        before = set(bpy.data.objects)
        with tempfile.TemporaryDirectory(prefix='cardiolab-hra-') as temporary:
            prepared = Path(temporary) / 'metadata-only.glb'
            write_glb(prepared, document, chunks)
            bpy.ops.import_scene.gltf(filepath=str(prepared), import_pack_images=True, merge_vertices=False)
        imported = set(bpy.data.objects) - before
        selected = set()
        for obj in imported:
            obj[TAG] = True
            if obj.type != 'MESH':
                continue
            item = items.get((source['key'], obj.get('hra_source_node')))
            if item is None:
                continue
            selected.add(obj)
            obj.name = 'HRA_' + item['id']
            obj['structure_id'] = item['id']
            obj['structure_group'] = item['group']
            obj['anatomy_status'] = spec['status']
            obj['units'] = 'metres'
            obj['source_sha256'] = source['sha256']
            obj['geometric_source'] = source['url']
            obj['evidence_category'] = item.get('evidence', 'source-derived-reference-mesh')
            if item.get('ontologyId'):
                obj['ontology_id'] = item['ontologyId']
            obj['motion'] = 'static-source-geometry'
        # Preserve each selected mesh's ancestor transforms and original relationships.
        retained = set(selected)
        for obj in selected:
            parent = obj.parent
            while parent:
                retained.add(parent)
                parent = parent.parent
        for obj in imported - retained:
            data = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            if isinstance(data, bpy.types.Mesh) and data.users == 0:
                bpy.data.meshes.remove(data)
        bpy.context.view_layer.update()
        for obj in sorted(selected, key=lambda obj: obj['structure_id']):
            source_node = obj['hra_source_node']
            comparison = compare_geometry(source_geometry[source_node], object_geometry(obj), obj['structure_id'])
            records.append({'id': obj['structure_id'], 'sourceKey': source['key'], 'sourceNode': source_node,
                            'sourceGeometry': source_diagnostics(source_geometry[source_node]),
                            'importCorrespondence': comparison, **diagnostics(obj)})
        selected_nodes = {obj['hra_source_node'] for obj in selected}
        source_records.append({'key': source['key'], 'path': source['path'], 'url': source['url'],
                               'sha256': source['sha256'], 'selectedMeshNodes': sorted(selected_nodes),
                               'excludedMeshNodes': [{'sourceNode': node, 'reason': source.get('selectionReason',
                                   'Outside the explicitly selected cardiac structure scope; original source retained')}
                                                     for node in sorted(set(source_geometry) - selected_nodes)],
                               'sourceMeshCount': len(source_geometry)})
    meshes = [obj for obj in scene.objects if obj.type == 'MESH']
    if {obj.get('structure_id') for obj in meshes} != {item['id'] for item in items.values()} or len(meshes) != len(items):
        raise AssertionError('Imported structures do not exactly match the specification')
    for obj in bpy.context.view_layer.objects:
        obj.select_set(obj in scene.objects[:])
    bpy.context.view_layer.objects.active = meshes[0]
    GLB.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(GLB), export_format='GLB', use_selection=True,
        use_active_scene=True, export_yup=True, export_extras=True, export_animations=False,
        export_cameras=False, export_lights=False, export_apply=False)
    exported_document, binary, _ = read_glb(GLB)
    exported_geometry = source_geometries(exported_document, binary)
    for record in records:
        source_geometry = next(geometry for source, _, _, geometry in sources if source['key'] == record['sourceKey'])
        record['exportCorrespondence'] = compare_geometry(source_geometry[record['sourceNode']],
                                                          exported_geometry['HRA_' + record['id']])
    BLEND.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    digest = hashlib.sha256(GLB.read_bytes()).hexdigest()
    all_vertices = [point for obj in meshes for point in object_geometry(obj)['vertices']]
    report = {'schemaVersion': 1, 'id': spec['id'], 'result': 'PASS: source coordinates and nonduplicate oriented triangles preserved; exact duplicate-index removals recorded',
              'anatomyReview': 'unreviewed', 'meshQuality': 'source defects retained; see per-structure diagnostics', 'generatorVersion': bpy.app.version_string, 'sha256': digest,
              'units': 'metres', 'coordinateSystem': 'original glTF right-handed Y-up; source positions retained',
              'sourceToExportTransform': [list(row) for row in Matrix.Identity(4)],
              'blenderToGltfYupTransform': [list(row) for row in BLENDER_TO_YUP],
              'worldBoundsYupM': bounds(all_vertices), 'sourceFiles': source_records, 'structures': records,
              'geometryOperations': ['source node subset selection', 'metadata annotation', 'glTF/Blender axis roundtrip',
                                     'Blender importer duplicate-index face removal (per-structure exact counts recorded)'],
              'notPerformed': ['smoothing', 'decimation', 'hole filling', 'normal repair', 'mesh displacement',
                               'self-intersection testing', 'anatomical expert review', 'motion reconstruction']}
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    # Reload because other owned builders may have updated their own registrations.
    manifest = json.loads(manifest_path.read_text())
    asset = next((asset for asset in manifest['assets'] if asset['id'] == spec['id']), None)
    if asset is None:
        raise ValueError('Source manifest entry disappeared during build')
    asset.update(sha256=digest, generatorVersion=bpy.app.version_string, anatomyReview='unreviewed', licenseReview='internal-only',
                 reviewer=None, reviewDate=None, reviewEvidence=None, reviewedSha256=None)
    # Rebuilding resets project approvals; the source CC BY evidence stays in its record.
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    print(f'PASS: {len(meshes)} HRA structures preserved from pinned sources; anatomy UNREVIEWED')
    return scene


if __name__ == '__main__':
    build()
