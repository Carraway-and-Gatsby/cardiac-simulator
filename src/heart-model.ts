import spec from './data/heart-hra.json';
import manifest from '../assets/manifest.json';

export type ViewMode = 'surface' | 'interior' | 'coronary';
export type MaterialMode = 'tissue' | 'educational' | 'neutral';
export type Structure = (typeof spec.structures)[number];
export const structures = spec.structures;
export const structureById = new Map(structures.map(item => [item.id, item]));
export const sourceSpec = spec;
const asset = manifest.assets.find(item => item.id === spec.id);
export const modelUrl = `${import.meta.env.BASE_URL}models/heart-hra.glb?v=${asset?.sha256 ?? 'pending'}`;
// Uniform display framing only. Source metres and all relative positions are preserved.
export const displayScale = 30;
export const sourceCenter = spec.sourceBoundsMetres.min.map((v, i) =>
  (v + spec.sourceBoundsMetres.max[i]) / 2) as [number, number, number];

export function isVisible(item: Structure, mode: ViewMode, hidden: readonly string[]) {
  return !hidden.includes(item.id)
    && !(mode === 'interior' && item.group === 'chambers')
    && !(mode === 'coronary' && item.group !== 'coronary');
}

export const cameraViews = {
  oblique: { label: 'Overview', labelKo: '전체 사선', direction: [.28, .12, 1], up: [0, 1, 0] },
  anterior: { label: 'Anterior*', labelKo: '전면*', direction: [0, 0, 1], up: [0, 1, 0] },
  posterior: { label: 'Posterior*', labelKo: '후면*', direction: [0, 0, -1], up: [0, 1, 0] },
  inferior: { label: 'Inferior*', labelKo: '하면*', direction: [0, -1, 0], up: [0, 0, 1] },
  superior: { label: 'Superior*', labelKo: '상면*', direction: [0, 1, 0], up: [0, 0, -1] },
  right: { label: 'Patient right*', labelKo: '환자 우측*', direction: [-1, 0, 0], up: [0, 1, 0] },
  left: { label: 'Patient left*', labelKo: '환자 좌측*', direction: [1, 0, 0], up: [0, 1, 0] },
} as const;
export type CameraView = keyof typeof cameraViews;
