import atlas from '../data/heart-hra.json' with { type: 'json' };
import type { Chamber, SimulationResult, SimulationSample } from '../simulation/types.ts';

export type MotionPoint = [number, number, number];
/** RA, LA, RV, LV shortening, followed by RV and LV torsion. */
export type MotionWeights = [number, number, number, number, number, number];
export type MotionBasis = [MotionPoint, MotionPoint, MotionPoint, MotionPoint, MotionPoint, MotionPoint];
export const motionTargetCount = 6;
export const motionChambers = ['RA', 'LA', 'RV', 'LV'] as const satisfies readonly Chamber[];

export interface MotionReference {
  /** Numerical 0D chamber maxima, not volumes measured from the atlas mesh. */
  maxVolumes: Record<Chamber, number>;
}

export interface CardiacMotionState {
  /** RA/LA/RV/LV fractional volume loss, then activation-modulated RV/LV torsion. */
  weights: MotionWeights;
  volumeRatios: Record<Chamber, number>;
}

type Bounds = { min: number[]; max: number[] };
function bounds(id: string): Bounds {
  const item = atlas.structures.find(structure => structure.id === id);
  if (!item) throw new Error(`Missing motion landmark: ${id}`);
  return item.sourceBoundsMetres;
}

function center(box: Bounds): MotionPoint {
  return box.min.map((value, axis) => (value + box.max[axis]) / 2) as MotionPoint;
}
function clamp(value: number, low = 0, high = 1): number { return Math.min(high, Math.max(low, value)); }
function smoothstep(value: number): number { const t = clamp(value); return t * t * (3 - 2 * t); }
function dot(a: MotionPoint, b: MotionPoint): number { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function subtract(a: MotionPoint, b: MotionPoint): MotionPoint { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a: MotionPoint, b: MotionPoint): MotionPoint {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function unit(point: MotionPoint): MotionPoint {
  const length = Math.hypot(...point);
  return point.map(value => value / length) as MotionPoint;
}

/**
 * The source has neither registered cine frames nor a known cardiac phase.
 * This display field is an explicitly synthetic, small-displacement illustration.
 * Source bounds define broad spatial supports, not a fitted myocardium or lumen.
 * It is deliberately shared by tissue, coronaries, guide paths, and particles;
 * independent mesh scaling would tear coincident boundaries apart.
 */
const chambers = motionChambers.map(id => {
  const box = bounds(id);
  const midpoint = center(box);
  const ventricular = id === 'RV' || id === 'LV';
  const base = center(bounds(id === 'RA' || id === 'RV' ? 'TV' : 'MV'));
  const apex = [
    box.min[0] + (box.max[0] - box.min[0]) * (id === 'LV' ? .67 : .54),
    box.min[1],
    box.min[2] + (box.max[2] - box.min[2]) * .63,
  ] as MotionPoint;
  const axis = unit(subtract(base, apex));
  return { id, midpoint, base, axis, ventricular,
    radii: box.min.map((value, i) => (box.max[i] - value) * .68) as MotionPoint,
    axisLength: Math.hypot(...subtract(base, apex)) };
});

const valveBounds = ['MV', 'TV', 'AV', 'PVvalve'].map(bounds);
// The valve boxes, including their atlas surfaces, stay exactly fixed. A smooth
// 24 mm collar links the moving walls to these synthetic stationary frames.
// This also anchors the adjacent aortic/pulmonary roots. It does not reproduce
// measured annular excursion, leaflet mechanics, wall thickening, or strain.
function anchorEnvelope(point: MotionPoint): number {
  let envelope = 1;
  for (const box of valveBounds) {
    const distance = Math.hypot(...point.map((value, axis) => Math.max(box.min[axis] - value, 0, value - box.max[axis])));
    envelope = Math.min(envelope, smoothstep(distance / .024));
  }
  return envelope;
}

export function createMotionReference(result: Pick<SimulationResult, 'samples'>): MotionReference {
  if (result.samples.length === 0) throw new RangeError('Motion requires at least one simulation sample.');
  const maxVolumes = Object.fromEntries(motionChambers.map(id => [id, 0])) as Record<Chamber, number>;
  for (const sample of result.samples) {
    for (const id of motionChambers) {
      const volume = sample.volumes[id];
      if (!Number.isFinite(volume) || volume <= 0) throw new RangeError(`Invalid motion volume for ${id}.`);
      maxVolumes[id] = Math.max(maxVolumes[id], volume);
    }
  }
  return { maxVolumes };
}

/**
 * Random-access, state-free sampling uses the exact currently displayed 0D
 * volumes. Pause, scrubbing, replay and speed changes therefore have no lag.
 * A weakly ejecting chamber retains a smaller excursion: amplitudes are never
 * normalized by that beat's min–max range. The atlas is simply the expanded
 * display reference; this is not a claim that its source phase was diastole.
 */
export function evaluateCardiacMotion(sample: SimulationSample, reference: MotionReference, intensity = 1): CardiacMotionState {
  if (!Number.isFinite(intensity)) throw new RangeError('Motion intensity must be finite.');
  const gain = clamp(intensity);
  const volumeRatios = {} as Record<Chamber, number>;
  const shortening = motionChambers.map(id => {
    const maximum = reference.maxVolumes[id];
    const volume = sample.volumes[id];
    if (!Number.isFinite(maximum) || maximum <= 0 || !Number.isFinite(volume) || volume <= 0) {
      throw new RangeError(`Invalid motion reference/sample for ${id}.`);
    }
    const ratio = volume / maximum;
    volumeRatios[id] = ratio;
    return gain * clamp(1 - ratio);
  });
  const torsion = (['RV', 'LV'] as const).map((id, index) => {
    const activation = sample.activation[id];
    if (!Number.isFinite(activation)) throw new RangeError(`Invalid motion activation for ${id}.`);
    // Activation permits recoil during isovolumic relaxation before filling.
    // This is still a heuristic, not a measured torsional time course.
    return shortening[index + 2] * Math.sqrt(clamp(activation));
  });
  const weights = [...shortening, ...torsion] as MotionWeights;
  return { weights, volumeRatios };
}

/**
 * Six precomputable relative morph targets in original glTF metres/Y-up.
 * The linear basis uses radial shortening, gentler longitudinal shortening,
 * and a modest ventricular tangential displacement. Numerical coefficients
 * are visual design choices, not patient strain/torsion measurements. The
 * weighted field is continuous across object boundaries and bounded to 17.5 mm.
 */
export function motionBasis(point: readonly number[]): MotionBasis {
  if (point.length !== 3 || point.some(value => !Number.isFinite(value))) throw new RangeError('Motion points require three finite source coordinates.');
  const p = point as MotionPoint;
  const envelope = anchorEnvelope(p);
  const zero = (): MotionBasis => [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  if (envelope === 0) return zero();
  const influences = chambers.map(chamber => {
    const distanceSquared = p.reduce((total, value, axis) => total + ((value - chamber.midpoint[axis]) / chamber.radii[axis]) ** 2, 0);
    return distanceSquared >= 4 ? 0 : (1 - distanceSquared / 4) ** 3;
  });
  const total = influences.reduce((sum, value) => sum + value, 0);
  if (total === 0) return zero();
  // Partition-of-unity blending near the heart; smooth extinction outside it.
  const locality = smoothstep(total / .25);
  const torsion: MotionPoint[] = [];
  const shortening = chambers.map((chamber, index) => {
    // A shared conservative gain avoids tight compression next to the fixed
    // annuli. Numerical grid checks cover all 64 binary weight combinations;
    // this is not a proof of anatomical validity or mesh non-intersection.
    const influence = .7 * influences[index] / total * envelope * locality;
    const offset = subtract(p, chamber.ventricular ? chamber.base : chamber.midpoint);
    const axial = dot(offset, chamber.axis);
    const radial = offset.map((value, axis) => value - axial * chamber.axis[axis]) as MotionPoint;
    const tangent = cross(chamber.axis, radial);
    const apexFraction = clamp(-axial / chamber.axisLength);
    const radialGain = chamber.ventricular ? .40 : .28;
    const longGain = chamber.ventricular ? .14 : .22;
    // axis points apex→base. Negative right-hand rotation therefore displays
    // the LV apex counterclockwise when viewed from the apex toward the base.
    const twistGain = (chamber.id === 'LV' ? -.20 : .20) * apexFraction;
    const displacement = radial.map((value, axis) => -radialGain * value
      - longGain * axial * chamber.axis[axis]) as MotionPoint;
    const cap = Math.min(1, .022 / Math.max(Math.hypot(...displacement), 1e-12));
    if (chamber.ventricular) {
      const twist = tangent.map(value => value * twistGain) as MotionPoint;
      const twistCap = Math.min(1, .003 / Math.max(Math.hypot(...twist), 1e-12));
      torsion.push(twist.map(value => value * twistCap * influence) as MotionPoint);
    }
    return displacement.map(value => value * cap * influence) as MotionPoint;
  });
  return [...shortening, ...torsion] as MotionBasis;
}

/** CPU equivalent of the six relative GPU morph targets, for flow overlays. */
export function deformSourcePoint(point: readonly number[], weights: readonly number[]): MotionPoint {
  if (weights.length !== motionTargetCount || weights.some(value => !Number.isFinite(value))) throw new RangeError('Six finite motion weights are required.');
  const basis = motionBasis(point);
  return point.map((value, axis) => value + basis.reduce((sum, displacement, index) => sum + displacement[axis] * clamp(weights[index]), 0)) as MotionPoint;
}
