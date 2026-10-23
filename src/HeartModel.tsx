import { useI18n } from './i18n';
import { structureLabel } from './i18n/anatomy';
import { memo, useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei/web/Html';
import { useGLTF } from '@react-three/drei/core/Gltf';
import {
  DoubleSide, Matrix4, Mesh, Plane, Vector3,
  type BufferGeometry, type Intersection, type Raycaster,
} from 'three';
import {
  displayScale, isVisible, modelUrl, sourceCenter, structures, structureById,
  type MaterialMode, type Structure, type ViewMode,
} from './heart-model';
import { createMotionGeometry } from './motion/geometry';
import { deformSourcePoint, type MotionWeights } from './motion/cardiac-motion';

type Part = {
  key: string;
  item: Structure;
  geometry: BufferGeometry;
  matrix: Matrix4;
  sourceCenter: Vector3;
  motionGeometry?: BufferGeometry;
};

type Props = {
  mode: ViewMode;
  hidden: string[];
  selected: string;
  opacity: number;
  onSelect: (id: string) => void;
  materialMode: MaterialMode;
  clip: { axis: 'none' | 'x' | 'y' | 'z'; position: number; flip: boolean };
  labels: boolean;
  flowContext?: boolean;
  motionEnabled: boolean;
  motionWeights: MotionWeights;
};

// These restrained tissue colors are an illustrative material treatment. They
// are not measured specimen textures or additional anatomical evidence.
function tissueColor(item: Structure) {
  if (item.group === 'valves') return '#d4bba8';
  if (item.group === 'muscles') return '#9a6050';
  if (item.group === 'coronary') {
    return /vein|sinus/.test(item.sourceNode) ? '#827369' : '#b58a70';
  }
  if (item.group === 'vessels') return '#936758';
  return '#854f42';
}

export default memo(function HeartModel({
  mode, hidden, selected, opacity, onSelect, materialMode, clip, labels, flowContext = false,
  motionEnabled, motionWeights,
}: Props) {
  const { locale } = useI18n();
  // No decoder/CDN requests: the import pipeline emits an embedded GLB.
  const { scene } = useGLTF(modelUrl, false, false);
  const parts = useMemo(() => {
    const copy = scene.clone(true);
    copy.updateMatrixWorld(true);
    const meshes: Part[] = [];
    const bySourceName = new Map(structures.map(item => [item.sourceNode, item]));
    copy.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const item = structureById.get(object.userData.structure_id ?? object.name)
        ?? bySourceName.get(object.name);
      if (!item) throw new Error(`Unexpected atlas mesh: ${object.name}`);
      object.geometry.computeBoundingBox();
      if (!object.geometry.boundingBox) throw new Error(`Atlas mesh has no bounds: ${item.id}`);
      const center = object.geometry.boundingBox.getCenter(new Vector3()).applyMatrix4(object.matrixWorld);
      meshes.push({
        key: `${item.id}-${meshes.length}`, item, geometry: object.geometry,
        matrix: object.matrixWorld.clone(), sourceCenter: center,
        motionGeometry: item.group !== 'valves' ? createMotionGeometry(object.geometry, object.matrixWorld) : undefined,
      });
    });
    const covered = new Set(meshes.map(part => part.item.id));
    if (covered.size !== structures.length || structures.some(item => !covered.has(item.id))) {
      throw new Error('Incomplete atlas: a declared anatomical structure is missing');
    }
    return meshes;
  }, [scene]);
  useEffect(() => () => { parts.forEach(part => part.motionGeometry?.dispose()); }, [parts]);
  const identity = useMemo(() => new Matrix4(), []);

  const clippingPlanes = useMemo(() => {
    if (clip.axis === 'none') return [];
    const normal = new Vector3();
    normal[clip.axis] = clip.flip ? -1 : 1;
    // Three.js removes negative plane distances. The control position is in
    // displayed world units, independent of source metre coordinates.
    return [new Plane(normal, -clip.position * normal[clip.axis])];
  }, [clip.axis, clip.position, clip.flip]);

  const visible = parts.filter(({ item }) => isVisible(item, mode, hidden) && !(motionEnabled && item.group === 'valves'));
  const alpha = Math.min(1, Math.max(0, opacity));
  const raycastVisible = useMemo(() => function (this: Mesh, raycaster: Raycaster, hits: Intersection[]) {
    if (alpha <= .01) return;
    const candidates: Intersection[] = [];
    Mesh.prototype.raycast.call(this, raycaster, candidates);
    // Filter before R3F keeps the nearest hit per object. This also allows a
    // retained inner wall of the same mesh to be picked behind a clipped face.
    hits.push(...candidates.filter(hit => clippingPlanes.every(plane => plane.distanceToPoint(hit.point) >= 0)));
  }, [alpha, clippingPlanes]);
  const selectedPart = visible.find(({ item }) => item.id === selected);
  const labelSource = selectedPart && (motionEnabled
    ? new Vector3(...deformSourcePoint(selectedPart.sourceCenter.toArray(), motionWeights)) : selectedPart.sourceCenter.clone());
  const labelPosition = labelSource?.sub(new Vector3(...sourceCenter)).multiplyScalar(displayScale);
  const showLabel = labels && selectedPart && labelPosition
    && clippingPlanes.every(plane => plane.distanceToPoint(labelPosition) >= 0);

  return <>
    <group scale={displayScale} position={sourceCenter.map(value => -value * displayScale) as [number, number, number]}>
      {visible.map(({ key, item, geometry, matrix, motionGeometry }) => {
        const color = materialMode === 'educational' ? item.color
          : materialMode === 'neutral' ? '#b8b8ae' : tissueColor(item);
        return <mesh key={`${key}-${motionEnabled}`} name={item.id} geometry={motionEnabled ? motionGeometry : geometry}
          matrix={motionEnabled ? identity : matrix} matrixAutoUpdate={false}
          morphTargetInfluences={motionEnabled ? motionWeights : undefined}
          raycast={raycastVisible}
          onClick={event => {
            // Raycasting includes clipped triangles; allow the next valid
            // intersection to receive the event instead of selecting the cut side.
            if (alpha <= .01 || clippingPlanes.some(plane => plane.distanceToPoint(event.point) < 0)) return;
            event.stopPropagation();
            onSelect(item.id);
          }}>
          {flowContext ? <meshStandardMaterial color={materialMode === 'educational' ? item.color : '#78999f'}
            transparent opacity={alpha * (item.group === 'valves' ? .36 : item.group === 'coronary' ? .22 : .12)}
            depthWrite={false} roughness={.66} metalness={.08} side={DoubleSide}
            emissive="#40616a" emissiveIntensity={selected === item.id ? .14 : .035} clippingPlanes={clippingPlanes} />
          : <meshPhysicalMaterial color={color} metalness={0} side={DoubleSide}
            roughness={materialMode === 'neutral' ? .7 : item.group === 'valves' ? .43 : .54}
            clearcoat={materialMode === 'tissue' ? .12 : 0} clearcoatRoughness={.5}
            specularIntensity={.32} ior={alpha < 1 ? 1 : 1.38}
            transmission={1 - alpha} thickness={0} opacity={1}
            emissive={color} emissiveIntensity={selected === item.id ? .16 : 0}
            clippingPlanes={clippingPlanes} clipShadows />}
        </mesh>;
      })}
    </group>
    {showLabel && <Html position={labelPosition} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div className="anatomy-label" style={{
        whiteSpace: 'nowrap', padding: '7px 10px', borderRadius: 6,
        background: 'rgba(24, 30, 31, .9)', color: '#f4e9d9', fontSize: 12,
        border: '1px solid rgba(244, 233, 217, .25)',
      }}>{structureLabel(selectedPart.item, locale)}</div>
    </Html>}
  </>;
});
