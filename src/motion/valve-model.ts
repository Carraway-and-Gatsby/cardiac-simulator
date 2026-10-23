import atlas from '../data/heart-hra.json' with { type: 'json' };
import { bloodFlowPaths, flowLandmarks, type SourcePoint } from '../flow/paths.ts';
import type { Compartment, SimulationResult, SimulationSample } from '../simulation/types.ts';

export const valveIds = ['MV', 'TV', 'AV', 'PVvalve'] as const;
export type ValveId = typeof valveIds[number];
type ValveFlow = 'mitral' | 'tricuspid' | 'aortic' | 'pulmonary';
export interface ValveDefinition {
  id: ValveId;
  leafletCount: 2 | 3;
  kind: 'atrioventricular' | 'semilunar';
  flowKey: ValveFlow;
  upstream: Compartment;
  downstream: Compartment;
  /** All positions and radii use the unchanged source metre/Y-up frame. */
  center: SourcePoint;
  forward: SourcePoint;
  u: SourcePoint;
  v: SourcePoint;
  radiusU: number;
  radiusV: number;
  bounds: { min: number[]; max: number[] };
}
export interface ValveMotionContext {
  peakForwardFlow: Record<ValveId, number>;
  scenario: SimulationResult['parameters']['scenario'];
  severity: number;
}
export interface ValveMotionState {
  /** Qualitative hinge travel, not measured valve area or opening angle. */
  forwardOpen: number;
  /** Separate qualitative coaptation defect; never a full reverse opening. */
  residualGap: number;
  /** Graphic radial aperture fraction, not a haemodynamic area. */
  aperture: number;
  reverseFlow: boolean;
  pressureGradient: number;
  flow: number;
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const subtract = (a: readonly number[], b: readonly number[]): SourcePoint => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: SourcePoint, b: SourcePoint): SourcePoint => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (value: SourcePoint): SourcePoint => {
  const length = Math.hypot(...value);
  if (!(length > 0)) throw new RangeError('Valve frame needs a nonzero direction');
  return value.map(component => component / length) as SourcePoint;
};

function definition(id: ValveId, leafletCount: 2 | 3, kind: ValveDefinition['kind'], flowKey: ValveFlow,
  upstream: Compartment, downstream: Compartment): ValveDefinition {
  const structure = atlas.structures.find(item => item.id === id)!;
  const center = flowLandmarks[id];
  const route = bloodFlowPaths.find(item => item.structures.includes(id))!;
  const crossing = route.points.findIndex(point => point === center);
  if (crossing < 1 || crossing >= route.points.length - 1) throw new Error(`Valve path lacks neighbours: ${id}`);
  // The atlas has no leaflet hinge frame. This is an illustrative frame aligned
  // with the local authored flow guide, not an anatomically measured annulus.
  const forward = unit(subtract(route.points[crossing + 1], route.points[crossing - 1]));
  const u = unit(cross(forward, Math.abs(forward[1]) < .85 ? [0, 1, 0] : [1, 0, 0]));
  const v = unit(cross(forward, u));
  const ratio = id === 'MV' ? 1.12 : id === 'TV' ? 1.06 : 1;
  const { min, max } = structure.sourceBoundsMetres;
  // Fit the complete animation envelope inside the source valve's box. The
  // conservative envelope includes downstream bending and a small curved belly.
  const radius = Math.min(...min.map((value, axis) => (max[axis] - value) * .46
    / (Math.hypot(u[axis] * ratio, v[axis]) + Math.abs(forward[axis]) * ratio * 1.12)));
  return { id, leafletCount, kind, flowKey, upstream, downstream, center: [...center], forward, u, v,
    radiusU: radius * ratio, radiusV: radius, bounds: structure.sourceBoundsMetres };
}

/** These are newly authored educational leaflets, not split/rigged atlas tissue. */
export const valveDefinitions: Record<ValveId, ValveDefinition> = {
  MV: definition('MV', 2, 'atrioventricular', 'mitral', 'LA', 'LV'),
  TV: definition('TV', 3, 'atrioventricular', 'tricuspid', 'RA', 'RV'),
  AV: definition('AV', 3, 'semilunar', 'aortic', 'LV', 'SA'),
  PVvalve: definition('PVvalve', 3, 'semilunar', 'pulmonary', 'RV', 'PA'),
};

export function createValveMotionContext(result: SimulationResult): ValveMotionContext {
  const peakForwardFlow = Object.fromEntries(valveIds.map(id => [id,
    result.samples.reduce((peak, sample) => Math.max(peak, sample.flows[valveDefinitions[id].flowKey]), 0),
  ])) as Record<ValveId, number>;
  return { peakForwardFlow, scenario: result.parameters.scenario, severity: clamp(result.parameters.severity) };
}

const maxHingeAngle = Math.PI * .44;

/** Stateless: a paused, scrubbed, or revisited sample produces the same pose. */
export function getValveMotionState(id: ValveId, sample: SimulationSample, context: ValveMotionContext): ValveMotionState {
  const valve = valveDefinitions[id];
  const flow = sample.flows[valve.flowKey];
  const pressureGradient = sample.pressures[valve.upstream] - sample.pressures[valve.downstream];
  if (!Number.isFinite(flow) || !Number.isFinite(pressureGradient)) throw new RangeError('Valve signals must be finite');
  // The existing diode model has no leaflet inertia. Therefore do not introduce
  // an independent clock, lag, or opening through a numerically closed valve.
  const forwardOpen = flow > 0 && pressureGradient > 0
    ? Math.sqrt(clamp(flow / Math.max(context.peakForwardFlow[id], 1e-9))) : 0;
  const reverseFlow = flow < 0;
  const residualGap = id === 'MV' && context.scenario === 'mitral-regurgitation'
    && context.severity > 0 && reverseFlow && pressureGradient < 0
    ? .035 + context.severity * .13 : 0;
  return { forwardOpen, residualGap, aperture: 1 - Math.cos(forwardOpen * maxHingeAngle) * (1 - residualGap),
    reverseFlow, pressureGradient, flow };
}

const angularSegments = 24;
const radialSegments = 8;
export const leafletVertexCount = (angularSegments + 1) * (radialSegments + 1);
export interface LeafletGeometryData {
  positions: Float32Array;
  indices: Uint16Array;
  annulusIndices: number[];
  freeEdgeIndices: number[];
}

/** Draw a thin, curved leaflet with a fixed curved hinge and a moving free edge. */
export function writeLeafletPositions(id: ValveId, leaflet: number, state: Pick<ValveMotionState, 'forwardOpen' | 'residualGap'>,
  positions: Float32Array): Float32Array {
  const definition = valveDefinitions[id];
  if (!Number.isInteger(leaflet) || leaflet < 0 || leaflet >= definition.leafletCount) throw new RangeError('Unknown leaflet');
  if (positions.length !== leafletVertexCount * 3) throw new RangeError('Incorrect leaflet position buffer');
  if (!Number.isFinite(state.forwardOpen) || !Number.isFinite(state.residualGap)) throw new RangeError('Valve pose must be finite');
  const opening = clamp(state.forwardOpen), gap = clamp(state.residualGap, 0, .2);
  const angle = opening * maxHingeAngle;
  const sector = Math.PI * 2 / definition.leafletCount;
  const start = leaflet * sector;
  const hingeStart = [definition.radiusU * Math.cos(start), definition.radiusV * Math.sin(start)];
  const hingeEnd = [definition.radiusU * Math.cos(start + sector), definition.radiusV * Math.sin(start + sector)];
  for (let a = 0; a <= angularSegments; a++) {
    const t = a / angularSegments, theta = start + sector * t;
    const hingeX = definition.radiusU * Math.cos(theta), hingeY = definition.radiusV * Math.sin(theta);
    // Two leaflets meet along one diameter. Three cusps meet along three shared
    // radial seams; the free edge of each cusp runs commissure → centre → commissure.
    const edgeX = definition.leafletCount === 2 ? hingeX
      : t <= .5 ? hingeStart[0] * (1 - 2 * t) : hingeEnd[0] * (2 * t - 1);
    const edgeY = definition.leafletCount === 2 ? 0
      : t <= .5 ? hingeStart[1] * (1 - 2 * t) : hingeEnd[1] * (2 * t - 1);
    const length = Math.hypot(edgeX - hingeX, edgeY - hingeY);
    for (let r = 0; r <= radialSegments; r++) {
      const s = r / radialSegments;
      const inward = s * Math.cos(angle) * (1 - gap);
      const x = hingeX + (edgeX - hingeX) * inward;
      const y = hingeY + (edgeY - hingeY) * inward;
      // Bending is largest at the free edge; small belly curvature gives a
      // leaflet surface instead of a flat disk, while both seams close exactly.
      // Semilunar cusps have a deeper pocket; AV leaflets retain a shallower
      // curtain shape. Neither shape is reconstructed from measured leaflet data.
      const bellyDepth = definition.kind === 'semilunar' ? .23 : .07;
      const belly = -bellyDepth * length * Math.sin(Math.PI * s) * (1 - opening);
      const depth = s * length * Math.sin(angle) + belly;
      const index = (a * (radialSegments + 1) + r) * 3;
      for (let axis = 0; axis < 3; axis++) positions[index + axis] = definition.center[axis]
        + definition.u[axis] * x + definition.v[axis] * y + definition.forward[axis] * depth;
    }
  }
  return positions;
}

export function buildLeafletGeometry(id: ValveId, leaflet: number,
  state: Pick<ValveMotionState, 'forwardOpen' | 'residualGap'> = { forwardOpen: 0, residualGap: 0 }): LeafletGeometryData {
  const positions = writeLeafletPositions(id, leaflet, state, new Float32Array(leafletVertexCount * 3));
  const indices: number[] = [];
  for (let a = 0; a < angularSegments; a++) for (let r = 0; r < radialSegments; r++) {
    const x = a * (radialSegments + 1) + r, next = x + radialSegments + 1;
    indices.push(x, next, x + 1, next, next + 1, x + 1);
  }
  return { positions, indices: new Uint16Array(indices),
    annulusIndices: Array.from({ length: angularSegments + 1 }, (_, index) => index * (radialSegments + 1)),
    freeEdgeIndices: Array.from({ length: angularSegments + 1 }, (_, index) => index * (radialSegments + 1) + radialSegments) };
}

/** Closed annular outline for the illustrative leaflet attachment, in metres. */
export function valveAnnulusPoints(id: ValveId, segments = 72): SourcePoint[] {
  const valve = valveDefinitions[id];
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = index * Math.PI * 2 / segments;
    return valve.center.map((value, axis) => value + valve.u[axis] * valve.radiusU * Math.cos(angle)
      + valve.v[axis] * valve.radiusV * Math.sin(angle)) as SourcePoint;
  });
}
