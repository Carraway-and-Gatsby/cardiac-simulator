import { BufferAttribute, BufferGeometry, Matrix4, Vector3 } from 'three';
import { motionBasis, motionTargetCount } from './cardiac-motion.ts';

/** Build owned, source-space morph geometry without editing cached atlas buffers. */
export function createMotionGeometry(source: BufferGeometry, localToSource = new Matrix4(), withNormals = true) {
  const geometry = source.clone().applyMatrix4(localToSource);
  const positions = geometry.getAttribute('position');
  const targets = Array.from({ length: motionTargetCount }, () => new Float32Array(positions.count * 3));
  for (let i = 0; i < positions.count; i++) {
    const basis = motionBasis([positions.getX(i), positions.getY(i), positions.getZ(i)]);
    for (let target = 0; target < motionTargetCount; target++) targets[target].set(basis[target], i * 3);
  }
  geometry.morphTargetsRelative = true;
  geometry.morphAttributes.position = targets.map((target, i) => {
    const attribute = new BufferAttribute(target, 3); attribute.name = `educational-motion-${i}`; return attribute;
  });
  if (withNormals) {
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const normals = geometry.getAttribute('normal');
    geometry.morphAttributes.normal = targets.map(target => {
      const displaced = new Float32Array(positions.count * 3);
      for (let i = 0; i < positions.count; i++) {
        displaced[i * 3] = positions.getX(i) + target[i * 3];
        displaced[i * 3 + 1] = positions.getY(i) + target[i * 3 + 1];
        displaced[i * 3 + 2] = positions.getZ(i) + target[i * 3 + 2];
      }
      const temporary = new BufferGeometry();
      temporary.setAttribute('position', new BufferAttribute(displaced, 3));
      if (geometry.index) temporary.setIndex(geometry.index.clone());
      temporary.computeVertexNormals();
      const targetNormals = temporary.getAttribute('normal');
      const delta = new Float32Array(positions.count * 3);
      for (let i = 0; i < positions.count; i++) {
        delta[i * 3] = targetNormals.getX(i) - normals.getX(i);
        delta[i * 3 + 1] = targetNormals.getY(i) - normals.getY(i);
        delta[i * 3 + 2] = targetNormals.getZ(i) - normals.getZ(i);
      }
      temporary.dispose(); return new BufferAttribute(delta, 3);
    });
  }
  // Conservative bounds cover simultaneous morphs for both picking and culling.
  // These bounds are display safeguards, not measurements of dynamic anatomy.
  geometry.computeBoundingBox();
  geometry.boundingBox!.expandByScalar(.05);
  geometry.computeBoundingSphere();
  geometry.boundingSphere!.center.copy(geometry.boundingBox!.getCenter(new Vector3()));
  geometry.boundingSphere!.radius = geometry.boundingBox!.getSize(new Vector3()).length() / 2;
  return geometry;
}
