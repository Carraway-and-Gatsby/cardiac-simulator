import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bloodFlowPaths, flowLandmarks } from '../src/flow/paths.ts';
import { buildLeafletGeometry, createValveMotionContext, getValveMotionState, valveAnnulusPoints,
  valveDefinitions, valveIds, writeLeafletPositions } from '../src/motion/valve-model.ts';
import { defaultParameters, parametersForScenario, simulate } from '../src/simulation/index.ts';

const baseline = simulate(defaultParameters);
const context = createValveMotionContext(baseline);
const dot = (a: readonly number[], b: readonly number[]) => a.reduce((sum, value, axis) => sum + value * b[axis], 0);
const near = (a: number, b: number, tolerance = 1e-7) => assert.ok(Math.abs(a - b) < tolerance, `${a} versus ${b}`);
const point = (buffer: Float32Array, index: number) => Array.from(buffer.slice(index * 3, index * 3 + 3));

test('four valves have the intended leaflet count and local forward-flow frame', () => {
  assert.deepEqual(valveIds.map(id => valveDefinitions[id].leafletCount), [2, 3, 3, 3]);
  for (const id of valveIds) {
    const valve = valveDefinitions[id];
    assert.deepEqual(valve.center, flowLandmarks[id]);
    near(Math.hypot(...valve.forward), 1); near(dot(valve.forward, valve.u), 0); near(dot(valve.forward, valve.v), 0);
    const route = bloodFlowPaths.find(item => item.structures.includes(id))!;
    const crossing = route.points.findIndex(point => point === flowLandmarks[id]);
    const direction = route.points[crossing + 1].map((value, axis) => value - route.points[crossing - 1][axis]);
    assert.ok(dot(valve.forward, direction) > 0);
  }
});

test('forward valve opening follows its own signed flow and pressure gradient', () => {
  for (const id of valveIds) {
    const key = valveDefinitions[id].flowKey;
    let opened = 0, closed = 0;
    for (const sample of baseline.samples) {
      const state = getValveMotionState(id, sample, context);
      if (sample.flows[key] > 0) { assert.ok(state.forwardOpen > 0); opened++; }
      else { assert.equal(state.forwardOpen, 0); assert.equal(state.aperture, 0); closed++; }
      assert.equal(state.residualGap, 0);
    }
    assert.ok(opened > 10); assert.ok(closed > 10);
  }
  const ejection = baseline.samples.find(sample => sample.flows.aortic > 100)!;
  assert.ok(getValveMotionState('AV', ejection, context).forwardOpen > 0);
  assert.equal(getValveMotionState('MV', ejection, context).forwardOpen, 0);
});

test('MR produces a small coaptation gap during reverse flow instead of forward opening', () => {
  const result = simulate(parametersForScenario('mitral-regurgitation'));
  const context = createValveMotionContext(result);
  const sample = result.samples.find(sample => sample.flows.mitral < -20)!;
  assert.ok(sample);
  const state = getValveMotionState('MV', sample, context);
  assert.equal(state.forwardOpen, 0); assert.equal(state.reverseFlow, true);
  assert.ok(state.residualGap > 0 && state.residualGap < .2);
  assert.ok(state.aperture < .2);
  const fasterReverse = { ...sample, flows: { ...sample.flows, mitral: sample.flows.mitral * 3 } };
  assert.equal(getValveMotionState('MV', fasterReverse, context).residualGap, state.residualGap);
  assert.equal(getValveMotionState('MV', sample, { ...context, severity: 0 }).residualGap, 0);
  const fill = result.samples.find(sample => sample.flows.mitral > 100)!;
  assert.equal(getValveMotionState('MV', fill, context).residualGap, 0);
  assert.ok(getValveMotionState('MV', fill, context).forwardOpen > .2);
});

test('a forward pressure gate prevents opening on inconsistent or closed valve signals', () => {
  const sample = baseline.samples.find(sample => sample.flows.aortic > 100)!;
  const adverse = { ...sample, pressures: { ...sample.pressures, LV: 0, SA: 100 } };
  assert.equal(getValveMotionState('AV', adverse, context).forwardOpen, 0);
  const closed = { ...sample, flows: { ...sample.flows, aortic: 0 } };
  assert.equal(getValveMotionState('AV', closed, context).forwardOpen, 0);
  assert.throws(() => getValveMotionState('AV', { ...sample, flows: { ...sample.flows, aortic: NaN } }, context), RangeError);
  assert.throws(() => buildLeafletGeometry('MV', 2), RangeError);
  assert.throws(() => buildLeafletGeometry('AV', 0, { forwardOpen: NaN, residualGap: 0 }), RangeError);
});

test('annular hinge vertices are fixed while free edges bend downstream and clear the centre', () => {
  for (const id of valveIds) {
    const valve = valveDefinitions[id];
    for (let leaflet = 0; leaflet < valve.leafletCount; leaflet++) {
      const closed = buildLeafletGeometry(id, leaflet);
      const opened = buildLeafletGeometry(id, leaflet, { forwardOpen: 1, residualGap: 0 });
      for (const index of closed.annulusIndices) assert.deepEqual(point(closed.positions, index), point(opened.positions, index));
      const edge = closed.freeEdgeIndices[Math.floor(closed.freeEdgeIndices.length / 2)];
      const closedOffset = point(closed.positions, edge).map((value, axis) => value - valve.center[axis]);
      assert.ok(Math.hypot(...closedOffset) < 1e-7, `${id} closes at coaptation`);
      const openedOffset = point(opened.positions, edge).map((value, axis) => value - valve.center[axis]);
      assert.ok(dot(openedOffset, valve.forward) > .003, `${id} bends downstream`);
      const planeOffset = Math.hypot(dot(openedOffset, valve.u), dot(openedOffset, valve.v));
      assert.ok(planeOffset > Math.min(valve.radiusU, valve.radiusV) * .6, `${id} clears the centre`);
    }
  }
});

test('normal closed coaptation seams meet for both two-leaflet and three-cusp surfaces', () => {
  for (const id of valveIds) {
    const meshes = Array.from({ length: valveDefinitions[id].leafletCount }, (_, leaflet) => buildLeafletGeometry(id, leaflet));
    for (const mesh of meshes) for (const index of mesh.freeEdgeIndices) {
      const a = point(mesh.positions, index);
      const matchesOther = meshes.some(other => other !== mesh && other.freeEdgeIndices.some(otherIndex => {
        const b = point(other.positions, otherIndex);
        return Math.hypot(...a.map((value, axis) => value - b[axis])) < 1e-7;
      }));
      assert.ok(matchesOther, `${id} free edge has a coapting neighbour`);
    }
  }
});

test('animated leaflet envelope and fixed annuli remain inside each source valve bound', () => {
  for (const id of valveIds) {
    const { leafletCount, bounds } = valveDefinitions[id];
    const positions = valveAnnulusPoints(id).flat();
    for (const forwardOpen of [0, .1, .35, .7, 1]) for (const residualGap of [0, .165]) {
      for (let leaflet = 0; leaflet < leafletCount; leaflet++) positions.push(...buildLeafletGeometry(id, leaflet, { forwardOpen, residualGap }).positions);
    }
    for (let index = 0; index < positions.length; index++) {
      const axis = index % 3, value = positions[index];
      assert.ok(Number.isFinite(value));
      assert.ok(value >= bounds.min[axis] - 1e-7 && value <= bounds.max[axis] + 1e-7, `${id} coordinate inside original bounds`);
    }
  }
});

test('pose evaluation is deterministic under scrub/reverse order and leaves source inputs intact', () => {
  const sample = baseline.samples[100];
  const before = structuredClone(sample);
  const state = getValveMotionState('AV', sample, context);
  const first = buildLeafletGeometry('AV', 1, state);
  for (const other of baseline.samples.slice().reverse()) getValveMotionState('AV', other, context);
  const repeated = buildLeafletGeometry('AV', 1, getValveMotionState('AV', sample, context));
  assert.deepEqual(first.positions, repeated.positions);
  assert.deepEqual(before, sample);
  const target = new Float32Array(first.positions.length);
  assert.equal(writeLeafletPositions('AV', 1, state, target), target);
  assert.deepEqual(target, first.positions);
});
