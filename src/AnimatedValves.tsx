import { useI18n } from './i18n';
import { structureLabel } from './i18n/anatomy';
import { memo, useEffect, useLayoutEffect, useMemo } from 'react';
import { Html } from '@react-three/drei/web/Html';
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, DoubleSide, DynamicDrawUsage,
  Mesh, Plane, TubeGeometry, Vector3, type Intersection, type Raycaster } from 'three';
import { displayScale, isVisible, sourceCenter, structureById, type ViewMode } from './heart-model';
import { buildLeafletGeometry, createValveMotionContext, getValveMotionState, valveAnnulusPoints,
  valveDefinitions, valveIds, writeLeafletPositions, type ValveId, type ValveMotionState } from './motion/valve-model';
import type { SimulationResult, SimulationSample } from './simulation/types';

export type AnimatedValvesProps = {
  sample: SimulationSample;
  result: SimulationResult;
  clip: { axis: 'none' | 'x' | 'y' | 'z'; position: number; flip: boolean };
  hidden: string[];
  mode: ViewMode;
  selected: string;
  onSelect: (id: string) => void;
  opacity: number;
  flowContext: boolean;
  labels: boolean;
};

const Leaflet = memo(function Leaflet({ id, index, state, selected, opacity, flowContext, clippingPlanes, raycast, onSelect }: {
  id: ValveId; index: number; state: ValveMotionState; selected: boolean; opacity: number;
  flowContext: boolean; clippingPlanes: Plane[]; raycast: (this: Mesh, raycaster: Raycaster, hits: Intersection[]) => void;
  onSelect: (id: string) => void;
}) {
  const geometry = useMemo(() => {
    const data = buildLeafletGeometry(id, index);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(data.positions, 3).setUsage(DynamicDrawUsage));
    geometry.setIndex(new BufferAttribute(data.indices, 1));
    return geometry;
  }, [id, index]);
  useLayoutEffect(() => {
    const position = geometry.getAttribute('position') as BufferAttribute;
    writeLeafletPositions(id, index, state, position.array as Float32Array);
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
  }, [geometry, id, index, state.forwardOpen, state.residualGap]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh name={`educational-leaflet-${id}-${index + 1}`} geometry={geometry} raycast={raycast}
    onClick={event => { event.stopPropagation(); onSelect(id); }} renderOrder={flowContext ? 2 : 0}>
    <meshPhysicalMaterial color={state.reverseFlow && id === 'MV' ? '#efd29c' : '#ead8ba'}
      roughness={.37} metalness={0} clearcoat={.13} clearcoatRoughness={.55} side={DoubleSide}
      emissive={selected ? '#c89241' : '#876a3b'} emissiveIntensity={selected ? .3 : flowContext ? .14 : .035}
      transparent={opacity < 1 || flowContext} opacity={opacity * (flowContext ? .85 : 1)}
      depthWrite={!flowContext && opacity >= .98} clippingPlanes={clippingPlanes} />
  </mesh>;
});

const Annulus = memo(function Annulus({ id, opacity, clippingPlanes }: { id: ValveId; opacity: number; clippingPlanes: Plane[] }) {
  const geometry = useMemo(() => new TubeGeometry(new CatmullRomCurve3(
    valveAnnulusPoints(id).slice(0, -1).map(point => new Vector3(...point)), true), 72, .00032, 5, true), [id]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} raycast={() => {}}>
    <meshStandardMaterial color="#bd9b69" roughness={.58} metalness={.05} transparent={opacity < 1}
      opacity={opacity} clippingPlanes={clippingPlanes} />
  </mesh>;
});

/** Procedural educational replacement surfaces. The original source remains intact. */
export default memo(function AnimatedValves({ sample, result, clip, hidden, mode, selected, onSelect, opacity, flowContext, labels }: AnimatedValvesProps) {
  const { locale, t } = useI18n();
  const context = useMemo(() => createValveMotionContext(result), [result]);
  const clippingPlanes = useMemo(() => {
    if (clip.axis === 'none') return [];
    const normal = new Vector3(); normal[clip.axis] = clip.flip ? -1 : 1;
    return [new Plane(normal, -clip.position * normal[clip.axis])];
  }, [clip.axis, clip.position, clip.flip]);
  const alpha = Math.min(1, Math.max(0, opacity));
  const raycast = useMemo(() => function (this: Mesh, raycaster: Raycaster, hits: Intersection[]) {
    if (alpha <= .01) return;
    const candidates: Intersection[] = [];
    Mesh.prototype.raycast.call(this, raycaster, candidates);
    hits.push(...candidates.filter(hit => clippingPlanes.every(plane => plane.distanceToPoint(hit.point) >= 0)));
  }, [alpha, clippingPlanes]);
  return <group name="educational-moving-valves" scale={displayScale}
    position={sourceCenter.map(value => -value * displayScale) as [number, number, number]}>
    {valveIds.filter(id => isVisible(structureById.get(id)!, mode, hidden)).map(id => {
      const state = getValveMotionState(id, sample, context);
      const labelPoint = new Vector3(...valveDefinitions[id].center).sub(new Vector3(...sourceCenter)).multiplyScalar(displayScale);
      const showLabel = labels && selected === id && alpha > .01
        && clippingPlanes.every(plane => plane.distanceToPoint(labelPoint) >= 0);
      return <group key={id} name={`educational-valve-${id}`}>
        <Annulus id={id} opacity={alpha} clippingPlanes={clippingPlanes} />
        {Array.from({ length: valveDefinitions[id].leafletCount }, (_, index) => <Leaflet key={index}
          id={id} index={index} state={state} selected={selected === id} opacity={alpha}
          flowContext={flowContext} clippingPlanes={clippingPlanes} raycast={raycast} onSelect={onSelect} />)}
        {showLabel && <Html position={valveDefinitions[id].center} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className="anatomy-label" style={{ whiteSpace: 'nowrap', padding: '7px 10px', borderRadius: 6,
            background: 'rgba(24, 30, 31, .9)', color: '#f4e9d9', fontSize: 12,
            border: '1px solid rgba(244, 233, 217, .25)' }}>{structureLabel(structureById.get(id)!, locale)} · {t('educational leaflets', '교육용 판엽')}</div>
        </Html>}
      </group>;
    })}
  </group>;
});
