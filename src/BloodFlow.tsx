import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  AdditiveBlending, CatmullRomCurve3, DynamicDrawUsage, InstancedMesh,
  MeshBasicMaterial, Object3D, Plane, TubeGeometry, Vector3,
} from 'three';
import { displayScale, sourceCenter } from './heart-model';
import type { BloodFlowPath } from './flow/paths';
import { createFlowTimeline, sampleFlowAt, type FlowTimeline } from './flow/timeline';
import type { SimulationResult } from './simulation/types';
import { motionBasis, type MotionWeights } from './motion/cardiac-motion';
import { createMotionGeometry } from './motion/geometry';

export type FlowClip = { axis: 'none' | 'x' | 'y' | 'z'; position: number; flip: boolean };
export const flowColors = { right: '#47d9f2', left: '#ff755b', reverse: '#ffc56b' };
const resolution = 240;
const forwardAxis = new Vector3(0, 0, 1);
const noRaycast = () => {};
const wrap = (value: number) => ((value % 1) + 1) % 1;

function FlowRoute({ path, timeline, elapsedSeconds, density, guides, clippingPlanes, sampleTime, motionWeights }: {
  path: BloodFlowPath; timeline: FlowTimeline; elapsedSeconds: number;
  density: number; guides: boolean; clippingPlanes: Plane[]; sampleTime: number; motionWeights: MotionWeights;
}) {
  const particles = useRef<InstancedMesh>(null);
  const trail = useRef<InstancedMesh>(null);
  const glow = useRef<MeshBasicMaterial>(null);
  const core = useRef<MeshBasicMaterial>(null);
  const guide = useRef<MeshBasicMaterial>(null);
  const { frames, guideGeometry, lookup, deformedLookup, displacementBasis, length } = useMemo(() => {
    const sourceCurve = new CatmullRomCurve3(path.points.map(point => new Vector3(...point)), false, 'centripetal');
    const guideBase = new TubeGeometry(sourceCurve, 120, .006 / displayScale, 5, false);
    const guideGeometry = createMotionGeometry(guideBase, undefined, false); guideBase.dispose();
    const curve = new CatmullRomCurve3(path.points.map(point => new Vector3(
      (point[0] - sourceCenter[0]) * displayScale,
      (point[1] - sourceCenter[1]) * displayScale,
      (point[2] - sourceCenter[2]) * displayScale,
    )), false, 'centripetal');
    const lookup = curve.getSpacedPoints(resolution);
    const displacementBasis = lookup.map(point => motionBasis([
      point.x / displayScale + sourceCenter[0], point.y / displayScale + sourceCenter[1], point.z / displayScale + sourceCenter[2],
    ]).map(delta => new Vector3(...delta).multiplyScalar(displayScale)));
    return { length: curve.getLength(), frames: curve.computeFrenetFrames(resolution, false),
      guideGeometry, lookup, deformedLookup: lookup.map(point => point.clone()), displacementBasis };
  }, [path]);
  const count = Math.max(12, Math.round(length * 13 * density));
  useEffect(() => () => guideGeometry.dispose(), [guideGeometry]);
  const scratch = useMemo(() => ({ object: new Object3D(), point: new Vector3(), normal: new Vector3(),
    binormal: new Vector3(), tangent: new Vector3() }), []);
  useEffect(() => {
    particles.current?.instanceMatrix.setUsage(DynamicDrawUsage);
    trail.current?.instanceMatrix.setUsage(DynamicDrawUsage);
  }, [count]);

  useFrame(() => {
    if (!particles.current || !trail.current) return;
    for (let i = 0; i <= resolution; i++) {
      deformedLookup[i].copy(lookup[i]);
      for (let target = 0; target < motionWeights.length; target++) {
        deformedLookup[i].addScaledVector(displacementBasis[i][target], motionWeights[target]);
      }
    }
    const state = sampleFlowAt(timeline, path.flowKey, elapsedSeconds);
    const rates = timeline.signals[path.flowKey].rates;
    // An explicitly scrubbed inclusive endpoint uses that exact recorded rate;
    // running playback at the next beat's zero uses the first recorded rate.
    const flow = sampleTime === timeline.period ? rates[rates.length - 1] : state.flow;
    const cumulativeVolume = state.cumulativeVolume;
    // Fixed graphic displacement scale across experiments. This is deliberately
    // not normalized per beat: a lower computed output travels less far.
    const travel = cumulativeVolume / 90;
    const strength = Math.min(1, Math.abs(flow) / 300);
    const direction = flow < 0 ? -1 : 1;
    const color = flow < 0 && path.flowKey === 'mitral' ? flowColors.reverse : flowColors[path.side];
    core.current?.color.set(color); glow.current?.color.set(color); guide.current?.color.set(color);
    if (core.current) core.current.opacity = .22 + Math.min(1, Math.abs(flow) / 180) * .72;
    if (glow.current) glow.current.opacity = .025 + strength * .25;
    if (guide.current) guide.current.opacity = .06 + strength * .14;
    const { object, point, normal, binormal, tangent } = scratch;
    const place = (progress: number, particle: number, size: number, elongation: number) => {
      const scaled = wrap(progress) * resolution;
      const low = Math.floor(scaled), blend = scaled - low;
      point.lerpVectors(deformedLookup[low], deformedLookup[low + 1], blend);
      normal.lerpVectors(frames.normals[low], frames.normals[low + 1], blend);
      tangent.subVectors(deformedLookup[low + 1], deformedLookup[low]).normalize();
      normal.addScaledVector(tangent, -normal.dot(tangent)).normalize();
      binormal.crossVectors(tangent, normal).normalize();
      // Deterministic distributed tracers, not oscillating vessel geometry.
      const angle = particle * 2.399963 + wrap(progress) * Math.PI * 2;
      const spread = path.radiusMetres * displayScale * (.45 + .55 * ((particle * 17 % 31) / 31));
      point.addScaledVector(normal, Math.cos(angle) * spread).addScaledVector(binormal, Math.sin(angle) * spread);
      object.position.copy(point); object.quaternion.setFromUnitVectors(forwardAxis, tangent);
      object.scale.set(size, size * .65, size * elongation); object.updateMatrix();
    };
    for (let i = 0; i < count; i++) {
      const progress = i / count + travel;
      const edge = Math.min(wrap(progress) * 18, (1 - wrap(progress)) * 18, 1);
      const radius = (.022 + (i % 3) * .003) * edge;
      place(progress, i, radius, 1.5 + strength * 1.4);
      particles.current.setMatrixAt(i, object.matrix);
      for (let j = 0; j < 3; j++) {
        place(progress - direction * (j + 1) * (.002 + strength * .004), i,
          radius * (1.3 - j * .25), 2.2);
        trail.current.setMatrixAt(i * 3 + j, object.matrix);
      }
    }
    particles.current.instanceMatrix.needsUpdate = true;
    trail.current.instanceMatrix.needsUpdate = true;
  });

  return <group name={`illustrative-flow-${path.id}`}>
    {guides && <mesh geometry={guideGeometry} raycast={noRaycast} renderOrder={3} morphTargetInfluences={motionWeights}
      scale={displayScale} position={sourceCenter.map(value => -value * displayScale) as [number, number, number]}>
      <meshBasicMaterial ref={guide} color={flowColors[path.side]} transparent opacity={.12}
        depthWrite={false} clippingPlanes={clippingPlanes} toneMapped={false} />
    </mesh>}
    <instancedMesh key={`core-${count}`} ref={particles} args={[undefined, undefined, count]}
      frustumCulled={false} raycast={noRaycast} renderOrder={4}>
      <sphereGeometry args={[1, 7, 5]} />
      <meshBasicMaterial ref={core} color={flowColors[path.side]} toneMapped={false}
        transparent opacity={.94} depthWrite={false} clippingPlanes={clippingPlanes} />
    </instancedMesh>
    <instancedMesh key={`trail-${count}`} ref={trail} args={[undefined, undefined, count * 3]}
      frustumCulled={false} raycast={noRaycast} renderOrder={5}>
      <sphereGeometry args={[1, 5, 4]} />
      <meshBasicMaterial ref={glow} color={flowColors[path.side]} transparent opacity={.2}
        blending={AdditiveBlending} depthWrite={false} clippingPlanes={clippingPlanes} toneMapped={false} />
    </instancedMesh>
  </group>;
}

export default memo(function BloodFlow({ result, elapsedSeconds, paths, density, guides, clip, sampleTime, inspectionRevision, motionWeights }: {
  result: SimulationResult; elapsedSeconds: number; paths: readonly BloodFlowPath[];
  density: number; guides: boolean; clip: FlowClip; sampleTime: number; inspectionRevision: number; motionWeights: MotionWeights;
}) {
  const timeline = useMemo(() => createFlowTimeline(result), [result]);
  const { invalidate } = useThree();
  const clippingPlanes = useMemo(() => {
    if (clip.axis === 'none') return [];
    const normal = new Vector3(); normal[clip.axis] = clip.flip ? -1 : 1;
    return [new Plane(normal, -clip.position * normal[clip.axis])];
  }, [clip.axis, clip.position, clip.flip]);
  // Scrubbing a paused, demand-rendered canvas still produces a new exact frame.
  useEffect(() => { invalidate(); }, [sampleTime, result, inspectionRevision, invalidate]);
  return <group>{paths.map(path => <FlowRoute key={path.id} path={path} timeline={timeline} elapsedSeconds={elapsedSeconds}
    density={density} guides={guides} clippingPlanes={clippingPlanes} sampleTime={sampleTime} motionWeights={motionWeights} />)}</group>;
});
