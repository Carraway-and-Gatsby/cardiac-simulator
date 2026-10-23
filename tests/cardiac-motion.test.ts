import assert from 'node:assert/strict';
import { test } from 'node:test';
import atlas from '../src/data/heart-hra.json' with { type: 'json' };
import { createMotionReference, deformSourcePoint, evaluateCardiacMotion, motionBasis, motionChambers } from '../src/motion/cardiac-motion.ts';
import type { MotionPoint, MotionWeights } from '../src/motion/cardiac-motion.ts';
import { defaultParameters, parametersForScenario, simulate } from '../src/simulation/index.ts';

const normal = simulate(defaultParameters);
const reference = createMotionReference(normal);
const hfref = simulate(parametersForScenario('hfref'));
const hfrefReference = createMotionReference(hfref);
const near = (actual: number, expected: number, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const probe: MotionPoint = [.070, .443, .050];

test('chamber motion follows fractional volume loss and preserves smaller HFrEF excursion', () => {
  for (const [index, id] of motionChambers.entries()) {
    for (const sample of normal.samples) {
      const motion = evaluateCardiacMotion(sample, reference);
      near(motion.weights[index], 1 - sample.volumes[id] / reference.maxVolumes[id]);
      near(motion.volumeRatios[id], sample.volumes[id] / reference.maxVolumes[id]);
    }
  }
  const normalMaximum = Math.max(...normal.samples.map(sample => evaluateCardiacMotion(sample, reference).weights[3]));
  const hfrefMaximum = Math.max(...hfref.samples.map(sample => evaluateCardiacMotion(sample, hfrefReference).weights[3]));
  near(normalMaximum, normal.metrics.ejectionFraction);
  near(hfrefMaximum, hfref.metrics.ejectionFraction);
  assert.ok(normalMaximum - hfrefMaximum > .15, `normal=${normalMaximum}, HFrEF=${hfrefMaximum}`);
});

test('ejection increases contraction and filling relaxes without a phase oscillator', () => {
  let ejection = 0, filling = 0;
  for (let i = 1; i < normal.samples.length; i++) {
    const before = normal.samples[i - 1], after = normal.samples[i];
    const delta = evaluateCardiacMotion(after, reference).weights[3] - evaluateCardiacMotion(before, reference).weights[3];
    if (before.flows.aortic > 30 && after.flows.aortic > 30) { assert.ok(delta > 0); ejection++; }
    if (before.flows.mitral > 30 && after.flows.mitral > 30) { assert.ok(delta < 0); filling++; }
  }
  assert.ok(ejection > 10 && filling > 10);
  const sample = normal.samples[100];
  assert.deepEqual(evaluateCardiacMotion(sample, reference), evaluateCardiacMotion({ ...sample, time: 123, phase: .99 }, reference));
});

test('ventricular untwisting can precede filling during isovolumic relaxation', () => {
  const sample = normal.samples.reduce((minimum, current) => current.volumes.LV < minimum.volumes.LV ? current : minimum);
  const active = evaluateCardiacMotion({ ...sample, activation: { RA: 0, LA: 0, RV: 1, LV: 1 } }, reference);
  const relaxed = evaluateCardiacMotion({ ...sample, activation: { RA: 0, LA: 0, RV: 0, LV: 0 } }, reference);
  assert.deepEqual(active.weights.slice(0, 4), relaxed.weights.slice(0, 4));
  assert.ok(active.weights[4] > 0 && active.weights[5] > 0);
  assert.deepEqual(relaxed.weights.slice(4), [0, 0]);
  assert.notDeepEqual(deformSourcePoint(probe, active.weights), deformSourcePoint(probe, relaxed.weights));
});

test('LV apical twist is counterclockwise when viewed from the apex toward the base', () => {
  const box = atlas.structures.find(item => item.id === 'LV')!.sourceBoundsMetres;
  const valve = atlas.structures.find(item => item.id === 'MV')!.sourceBoundsMetres;
  const base = valve.min.map((value, axis) => (value + valve.max[axis]) / 2);
  const apex = [box.min[0] + .67 * (box.max[0] - box.min[0]), box.min[1], box.min[2] + .63 * (box.max[2] - box.min[2])];
  const axis = base.map((value, index) => value - apex[index]);
  const offset = probe.map((value, index) => value - base[index]);
  const twist = motionBasis(probe)[5];
  const rotation = [offset[1] * twist[2] - offset[2] * twist[1], offset[2] * twist[0] - offset[0] * twist[2], offset[0] * twist[1] - offset[1] * twist[0]];
  // Looking along apex→base, CCW rotation is opposite that vector's positive
  // right-hand sense, as measured by the signed displacement cross product.
  assert.ok(rotation.reduce((sum, value, index) => sum + value * axis[index], 0) < 0);
});

test('source restoration, pause, replay and common tissue/tracer coordinates are exact', () => {
  const sample = normal.samples[100];
  const state = evaluateCardiacMotion(sample, reference);
  const basis = motionBasis(probe);
  const gpuEquivalent = probe.map((value, axis) => value + basis.reduce((sum, target, index) => sum + target[axis] * state.weights[index], 0));
  assert.deepEqual(deformSourcePoint(probe, state.weights), gpuEquivalent);
  assert.deepEqual(evaluateCardiacMotion(sample, reference), state);
  assert.deepEqual(deformSourcePoint(probe, [0, 0, 0, 0, 0, 0]), probe);
  assert.deepEqual(evaluateCardiacMotion(sample, reference, 0).weights, [0, 0, 0, 0, 0, 0]);
  for (const point of basis) assert.ok(point.every(Number.isFinite));
  assert.deepEqual(probe, [.070, .443, .050]);
  const end = evaluateCardiacMotion(normal.samples.at(-1)!, reference).weights;
  const start = evaluateCardiacMotion(normal.samples[0], reference).weights;
  end.forEach((value, index) => near(value, start[index], 1e-5));
});

test('all four valve source boxes remain anchored while distal ventricular tissue moves', () => {
  const weights: MotionWeights = [.5, .5, .6, .6, .4, .4];
  for (const id of ['MV', 'TV', 'AV', 'PVvalve']) {
    const { min, max } = atlas.structures.find(item => item.id === id)!.sourceBoundsMetres;
    for (const x of [0, .5, 1]) for (const y of [0, .5, 1]) for (const z of [0, .5, 1]) {
      const point = [x, y, z].map((fraction, axis) => min[axis] + fraction * (max[axis] - min[axis])) as MotionPoint;
      assert.deepEqual(deformSourcePoint(point, weights), point, id);
    }
  }
  const moved = deformSourcePoint(probe, weights);
  assert.ok(Math.hypot(...moved.map((value, axis) => value - probe[axis])) > .001);
});

test('shared spatial field stays finite and bounded throughout and outside the atlas', () => {
  const { min, max } = atlas.sourceBoundsMetres;
  const weights: MotionWeights = [1, 1, 1, 1, 1, 1];
  for (let x = 0; x <= 8; x++) for (let y = 0; y <= 8; y++) for (let z = 0; z <= 8; z++) {
    const point = [x, y, z].map((step, axis) => min[axis] + (step / 8) * (max[axis] - min[axis])) as MotionPoint;
    const deformed = deformSourcePoint(point, weights);
    assert.ok(deformed.every(Number.isFinite));
    assert.ok(Math.hypot(...deformed.map((value, axis) => value - point[axis])) <= .0175 + 1e-12);
    const neighbor = [...point] as MotionPoint;
    neighbor[0] += 1e-7;
    const next = deformSourcePoint(neighbor, weights);
    assert.ok(Math.hypot(...next.map((value, axis) => value - deformed[axis])) < 1e-6, 'continuous field across the grid');
  }
  assert.deepEqual(deformSourcePoint([100, 100, 100], weights), [100, 100, 100]);
});

test('sampled spatial field does not fold near the fixed valve collars at weight extremes', () => {
  const { min, max } = atlas.sourceBoundsMetres;
  let minimum = Infinity;
  // A regression against the narrow-collar fold found near RV outflow. This
  // finite grid is a numerical check, not a global non-intersection proof.
  for (let x = 0; x <= 16; x++) for (let y = 0; y <= 16; y++) for (let z = 0; z <= 16; z++) {
    const point = [x, y, z].map((step, axis) => min[axis] + (step / 16) * (max[axis] - min[axis]));
    const step = 1e-6;
    const derivative = [0, 1, 2].map(axis => {
      const before = [...point], after = [...point];
      before[axis] -= step; after[axis] += step;
      const a = motionBasis(before), b = motionBasis(after);
      return b.map((target, index) => target.map((value, component) => (value - a[index][component]) / (2 * step)));
    });
    for (let mask = 0; mask < 64; mask++) {
      const [a, b, c] = derivative.map((column, axis) => [0, 1, 2].map(component => (axis === component ? 1 : 0)
        + column.reduce((sum, target, index) => sum + ((mask & (1 << index)) ? target[component] : 0), 0)));
      const determinant = a[0] * (b[1] * c[2] - b[2] * c[1]) - b[0] * (a[1] * c[2] - a[2] * c[1]) + c[0] * (a[1] * b[2] - a[2] * b[1]);
      minimum = Math.min(minimum, determinant);
    }
  }
  assert.ok(minimum > .04, `Minimum sampled Jacobian determinant ${minimum}`);
});

test('invalid motion inputs are rejected and display gain is bounded', () => {
  assert.throws(() => createMotionReference({ samples: [] }), RangeError);
  assert.throws(() => createMotionReference({ samples: [{ ...normal.samples[0], volumes: { ...normal.samples[0].volumes, LV: NaN } }] }), RangeError);
  assert.throws(() => evaluateCardiacMotion(normal.samples[0], reference, NaN), RangeError);
  assert.throws(() => motionBasis([Infinity, 0, 0]), RangeError);
  assert.throws(() => deformSourcePoint(probe, [0, 0, NaN, 0]), RangeError);
  assert.deepEqual(evaluateCardiacMotion(normal.samples[100], reference, 10).weights, evaluateCardiacMotion(normal.samples[100], reference, 1).weights);
});
