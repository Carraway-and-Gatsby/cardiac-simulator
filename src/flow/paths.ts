import atlas from '../data/heart-hra.json' with { type: 'json' };
import type { SimulationSample } from '../simulation/types.ts';

export type FlowKey = keyof SimulationSample['flows'];
export type SourcePoint = [number, number, number];

export interface BloodFlowPath {
  id: string;
  label: string;
  flowKey: FlowKey;
  side: 'right' | 'left';
  /** Conventional circulation colours; the simulation does not model oxygen saturation. */
  oxygenation: 'deoxygenated' | 'oxygenated';
  structures: string[];
  /** Hand-authored guide points in the untransformed atlas metre/Y-up frame. */
  points: SourcePoint[];
  /** Graphic spread only: neither a measured lumen radius nor an RBC size. */
  radiusMetres: number;
}

/**
 * Named atlas bounds provide landmarks, not a segmented blood volume. The guides
 * below illustrate circulation connections and have not been checked for lumen
 * containment. They are not extracted centrelines, CFD streamlines, or particle
 * trajectories. Multiple caval/PA/PV branches share one lumped flow signal; no
 * regional flow split or quantitative particle count is inferred.
 */
function withinBounds(id: string, fractions: SourcePoint = [0.5, 0.5, 0.5]): SourcePoint {
  const structure = atlas.structures.find(item => item.id === id);
  if (!structure) throw new Error(`Missing blood-flow landmark ${id}`);
  const { min, max } = structure.sourceBoundsMetres;
  return fractions.map((fraction, axis) => min[axis] + fraction * (max[axis] - min[axis])) as SourcePoint;
}

export const flowLandmarks = {
  RA: withinBounds('RA', [0.43, 0.55, 0.43]),
  RV: withinBounds('RV', [0.46, 0.28, 0.54]),
  LA: withinBounds('LA', [0.55, 0.50, 0.43]),
  LV: withinBounds('LV', [0.53, 0.35, 0.49]),
  TV: withinBounds('TV'),
  MV: withinBounds('MV'),
  AV: withinBounds('AV'),
  PVvalve: withinBounds('PVvalve'),
  SVC: withinBounds('SVC', [0.52, 0.94, 0.50]),
  IVC: withinBounds('IVC', [0.50, 0.07, 0.55]),
  PT: withinBounds('PT', [0.56, 0.68, 0.35]),
  LPA: withinBounds('LPA', [0.88, 0.48, 0.38]),
  RPA: withinBounds('RPA', [0.10, 0.50, 0.47]),
  RSPV: withinBounds('RSPV', [0.10, 0.57, 0.52]),
  RIPV: withinBounds('RIPV', [0.12, 0.47, 0.50]),
  LSPV: withinBounds('LSPV', [0.88, 0.51, 0.50]),
  LIPV: withinBounds('LIPV', [0.88, 0.45, 0.50]),
  AO: withinBounds('AO', [0.50, 0.52, 0.50]),
  ARCH: withinBounds('ARCH', [0.50, 0.68, 0.50]),
  DAO: withinBounds('DAO', [0.52, 0.10, 0.50]),
} satisfies Record<string, SourcePoint>;

const L = flowLandmarks;
function path(id: string, label: string, flowKey: FlowKey, side: BloodFlowPath['side'], structures: string[], points: SourcePoint[], radiusMetres = 0.0012): BloodFlowPath {
  return { id, label, flowKey, side, structures, points, radiusMetres,
    oxygenation: side === 'right' ? 'deoxygenated' : 'oxygenated' };
}

export const bloodFlowPaths: readonly BloodFlowPath[] = [
  path('caval-superior', '상대정맥 → 우심방', 'systemicVenous', 'right', ['SVC', 'RA'],
    [L.SVC, withinBounds('SVC', [0.52, 0.53, 0.55]), [-0.023, 0.504, 0.024], L.RA]),
  path('caval-inferior', '하대정맥 → 우심방', 'systemicVenous', 'right', ['IVC', 'RA'],
    [L.IVC, withinBounds('IVC', [0.54, 0.63, 0.57]), [-0.021, 0.459, 0.022], L.RA]),
  path('tricuspid', '우심방 → 삼첨판 → 우심실', 'tricuspid', 'right', ['RA', 'TV', 'RV'],
    [L.RA, [-0.013, 0.475, 0.039], L.TV, [0.006, 0.449, 0.054], L.RV], 0.0016),
  path('pulmonary-outflow', '우심실 → 폐동맥판 → 폐동맥줄기', 'pulmonary', 'right', ['RV', 'PVvalve', 'PT'],
    [L.RV, [0.002, 0.468, 0.063], [0.011, 0.493, 0.054], L.PVvalve, [0.020, 0.520, 0.033], L.PT], 0.0015),
  path('pulmonary-left', '폐동맥줄기 → 좌폐동맥', 'pulmonary', 'right', ['PT', 'LPA'],
    [L.PT, [0.027, 0.531, 0.005], [0.038, 0.529, -0.008], L.LPA]),
  path('pulmonary-right', '폐동맥줄기 → 우폐동맥', 'pulmonary', 'right', ['PT', 'RPA'],
    [L.PT, [0.004, 0.530, 0.009], [-0.009, 0.527, 0.007], L.RPA]),
  path('pulmonary-venous-rs', '우상폐정맥 → 좌심방', 'pulmonaryVenous', 'left', ['RSPV', 'LA'],
    [L.RSPV, [-0.024, 0.499, 0.006], [-0.010, 0.497, 0.007], L.LA], 0.0009),
  path('pulmonary-venous-ri', '우하폐정맥 → 좌심방', 'pulmonaryVenous', 'left', ['RIPV', 'LA'],
    [L.RIPV, [-0.017, 0.489, -0.009], [-0.007, 0.490, 0.001], L.LA], 0.0009),
  path('pulmonary-venous-ls', '좌상폐정맥 → 좌심방', 'pulmonaryVenous', 'left', ['LSPV', 'LA'],
    [L.LSPV, [0.032, 0.520, 0.010], [0.020, 0.502, 0.008], L.LA], 0.0009),
  path('pulmonary-venous-li', '좌하폐정맥 → 좌심방', 'pulmonaryVenous', 'left', ['LIPV', 'LA'],
    [L.LIPV, [0.025, 0.493, -0.011], [0.015, 0.491, -0.002], L.LA], 0.0009),
  path('mitral', '좌심방 → 승모판 → 좌심실', 'mitral', 'left', ['LA', 'MV', 'LV'],
    [L.LA, [0.016, 0.490, 0.009], L.MV, [0.035, 0.458, 0.020], L.LV], 0.0016),
  path('aortic-outflow', '좌심실 → 대동맥판 → 대동맥', 'aortic', 'left', ['LV', 'AV', 'AO', 'ARCH', 'DAO'],
    [L.LV, [0.034, 0.467, 0.033], [0.017, 0.484, 0.026], L.AV, L.AO,
      [-0.002, 0.535, 0.027], [0.001, 0.550, 0.021], L.ARCH,
      [0.014, 0.548, -0.014], [0.014, 0.530, -0.026], L.DAO], 0.0014),
];

/** The atlas contains neither systemic nor pulmonary microvascular beds. */
export const omittedGeometricFlowKeys: readonly FlowKey[] = ['systemic', 'pulmonaryBed'];
