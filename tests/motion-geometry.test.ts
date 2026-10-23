import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BufferAttribute, BufferGeometry, DoubleSide, Euler, Matrix3, Matrix4,
  Mesh, MeshBasicMaterial, Quaternion, Raycaster, Vector3,
} from 'three';
import { createMotionGeometry } from '../src/motion/geometry.ts';
import { deformSourcePoint, motionTargetCount } from '../src/motion/cardiac-motion.ts';
import type { MotionWeights } from '../src/motion/cardiac-motion.ts';

const nearVector = (actual: Vector3, expected: Vector3, tolerance = 1e-8) => assert.ok(
  actual.distanceTo(expected) <= tolerance, `${actual.toArray()} differs from ${expected.toArray()}`);

function fixture() {
  const source = new BufferGeometry();
  source.setAttribute('position', new BufferAttribute(new Float32Array([
    -.008, -.007, -.004, .008, -.005, .002, -.003, .009, -.002, -.004, 0, .011,
  ]), 3));
  source.setIndex([0, 2, 1, 0, 1, 3, 1, 2, 3, 2, 0, 3]);
  source.computeVertexNormals();
  source.morphAttributes.position = [new BufferAttribute(new Float32Array(12).fill(.0001), 3)];
  source.morphAttributes.normal = [new BufferAttribute(new Float32Array(12).fill(.001), 3)];
  source.morphTargetsRelative = false;
  source.computeBoundingBox(); source.computeBoundingSphere();
  // Nonuniform scale and rotation exercise both matrix and inverse-transpose
  // normal baking. The resulting tetrahedron lies on the LV's lateral/apical
  // region, where the cardiac field is nonzero, rather than at the origin.
  const matrix = new Matrix4().compose(new Vector3(.064, .447, .049),
    new Quaternion().setFromEuler(new Euler(.1, -.3, .2)), new Vector3(1.1, .7, 1.2));
  return { source, matrix };
}

function extremeWeights(mask: number): MotionWeights {
  return Array.from({ length: motionTargetCount }, (_, i) => mask & (1 << i) ? 1 : 0) as MotionWeights;
}

test('building morph geometry preserves all cached source buffers and bakes its source transform', () => {
  const { source, matrix } = fixture();
  const snapshot = JSON.stringify(source.toJSON());
  const matrixBefore = matrix.clone();
  const sourcePosition = source.getAttribute('position');
  const sourceNormal = source.getAttribute('normal');
  const sourceIndex = source.index!;
  const sourceMorphPosition = source.morphAttributes.position[0];
  const sourceMorphNormal = source.morphAttributes.normal[0];
  const geometry = createMotionGeometry(source, matrix);
  assert.equal(JSON.stringify(source.toJSON()), snapshot);
  assert.ok(matrix.equals(matrixBefore));
  assert.equal(source.getAttribute('position'), sourcePosition);
  assert.equal(source.getAttribute('normal'), sourceNormal);
  assert.equal(source.index, sourceIndex);
  assert.equal(source.morphAttributes.position[0], sourceMorphPosition);
  assert.equal(source.morphAttributes.normal[0], sourceMorphNormal);
  assert.notEqual(geometry.getAttribute('position').array, sourcePosition.array);
  assert.notEqual(geometry.getAttribute('normal').array, sourceNormal.array);
  assert.notEqual(geometry.index!.array, sourceIndex.array);
  assert.deepEqual(Array.from(geometry.index!.array), Array.from(sourceIndex.array));
  const normalMatrix = new Matrix3().getNormalMatrix(matrix);
  for (let vertex = 0; vertex < sourcePosition.count; vertex++) {
    nearVector(new Vector3().fromBufferAttribute(geometry.getAttribute('position'), vertex),
      new Vector3().fromBufferAttribute(sourcePosition, vertex).applyMatrix4(matrix), 3e-8);
    nearVector(new Vector3().fromBufferAttribute(geometry.getAttribute('normal'), vertex),
      new Vector3().fromBufferAttribute(sourceNormal, vertex).applyNormalMatrix(normalMatrix), 6e-8);
  }
  assert.equal(geometry.morphTargetsRelative, true);
  assert.equal(geometry.morphAttributes.position.length, motionTargetCount);
  assert.equal(geometry.morphAttributes.normal.length, motionTargetCount);
  geometry.dispose(); source.dispose();
});

test('actual Three.js morph vertices agree with CPU tracer deformation and restore exactly', () => {
  const { source, matrix } = fixture();
  const geometry = createMotionGeometry(source, matrix);
  const material = new MeshBasicMaterial();
  const mesh = new Mesh(geometry, material);
  const positions = geometry.getAttribute('position');
  let maximumMovement = 0;
  for (let mask = 0; mask < 64; mask++) {
    const weights = extremeWeights(mask);
    mesh.morphTargetInfluences = weights;
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const rest = new Vector3().fromBufferAttribute(positions, vertex);
      const expected = new Vector3(...deformSourcePoint(rest.toArray(), weights));
      const actual = mesh.getVertexPosition(vertex, new Vector3());
      nearVector(actual, expected, 2e-9); // relative target Float32 round-off
      if (mask === 0) assert.deepEqual(actual.toArray(), rest.toArray());
      maximumMovement = Math.max(maximumMovement, actual.distanceTo(rest));
      assert.ok(geometry.boundingBox!.containsPoint(actual));
      assert.ok(geometry.boundingSphere!.containsPoint(actual));
    }
  }
  assert.ok(maximumMovement > .001, 'fixture exercises a real deformation');
  mesh.morphTargetInfluences = extremeWeights(0);
  for (let vertex = 0; vertex < positions.count; vertex++) {
    assert.deepEqual(mesh.getVertexPosition(vertex, new Vector3()).toArray(), new Vector3().fromBufferAttribute(positions, vertex).toArray());
  }
  geometry.dispose(); source.dispose(); material.dispose();
});

test('raycasting intersects the posed triangle and returns to its original surface on reset', () => {
  const source = new BufferGeometry();
  source.setAttribute('position', new BufferAttribute(new Float32Array([
    .060, .432, .050, .083, .434, .050, .065, .462, .050,
  ]), 3));
  const geometry = createMotionGeometry(source);
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const mesh = new Mesh(geometry, material);
  mesh.updateMatrixWorld(true);
  const rest = Array.from({ length: 3 }, (_, i) => mesh.getVertexPosition(i, new Vector3()));
  mesh.morphTargetInfluences = [.2, .3, .5, .7, .3, .6];
  const posed = Array.from({ length: 3 }, (_, i) => mesh.getVertexPosition(i, new Vector3()));
  const centroid = posed.reduce((sum, vertex) => sum.add(vertex), new Vector3()).multiplyScalar(1 / 3);
  const normal = new Vector3().crossVectors(posed[1].clone().sub(posed[0]), posed[2].clone().sub(posed[0])).normalize();
  const ray = new Raycaster(centroid.clone().addScaledVector(normal, .1), normal.clone().negate());
  const hits = ray.intersectObject(mesh, false);
  assert.equal(hits.length, 1);
  nearVector(hits[0].point, centroid, 1e-8);
  mesh.morphTargetInfluences = extremeWeights(0);
  const restHits = ray.intersectObject(mesh, false);
  assert.equal(restHits.length, 1);
  assert.ok(hits[0].point.distanceTo(restHits[0].point) > .0001, 'raycast follows the moving surface');
  assert.ok(Math.abs(restHits[0].point.z - rest[0].z) < 1e-8);
  mesh.morphTargetInfluences = [.2, .3, .5, .7, .3, .6];
  nearVector(ray.intersectObject(mesh, false)[0].point, hits[0].point, 1e-12);
  geometry.dispose(); source.dispose(); material.dispose();
});

test('deformation normals remain finite and each individual target matches recomputed surface normals', () => {
  const { source, matrix } = fixture();
  const geometry = createMotionGeometry(source, matrix);
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const mesh = new Mesh(geometry);
  for (let target = 0; target < motionTargetCount; target++) {
    const weights = extremeWeights(1 << target);
    mesh.morphTargetInfluences = weights;
    const posed = new BufferGeometry();
    const values = new Float32Array(positions.count * 3);
    for (let vertex = 0; vertex < positions.count; vertex++) mesh.getVertexPosition(vertex, new Vector3()).toArray(values, vertex * 3);
    posed.setAttribute('position', new BufferAttribute(values, 3));
    posed.setIndex(geometry.index!.clone());
    posed.computeVertexNormals();
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const dynamic = new Vector3().fromBufferAttribute(normals, vertex)
        .add(new Vector3().fromBufferAttribute(geometry.morphAttributes.normal[target], vertex));
      nearVector(dynamic, new Vector3().fromBufferAttribute(posed.getAttribute('normal'), vertex), 1e-7);
    }
    posed.dispose();
  }
  for (let mask = 0; mask < 64; mask++) {
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const normal = new Vector3().fromBufferAttribute(normals, vertex);
      for (let target = 0; target < motionTargetCount; target++) if (mask & (1 << target)) {
        normal.add(new Vector3().fromBufferAttribute(geometry.morphAttributes.normal[target], vertex));
      }
      assert.ok(normal.toArray().every(Number.isFinite));
      assert.ok(normal.length() > .1, 'morphed lighting normal must remain nonzero');
      assert.ok(normal.normalize().toArray().every(Number.isFinite));
    }
  }
  geometry.dispose(); source.dispose();
});

test('normal-free guide geometry supports the same positional motion without source mutation', () => {
  const source = new BufferGeometry();
  source.setAttribute('position', new BufferAttribute(new Float32Array([
    .065, .440, .055, .070, .452, .048, .056, .461, .042,
  ]), 3));
  const original = Array.from(source.getAttribute('position').array);
  const geometry = createMotionGeometry(source, new Matrix4(), false);
  assert.equal(geometry.getAttribute('normal'), undefined);
  assert.equal(geometry.morphAttributes.normal, undefined);
  assert.equal(geometry.morphAttributes.position.length, motionTargetCount);
  assert.deepEqual(Array.from(source.getAttribute('position').array), original);
  assert.deepEqual(source.morphAttributes, {});
  geometry.dispose(); source.dispose();
});
