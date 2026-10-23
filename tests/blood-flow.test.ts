import assert from 'node:assert/strict';
import { test } from 'node:test';
import atlas from '../src/data/heart-hra.json' with { type: 'json' };
import { bloodFlowPaths, createFlowTimeline, flowKeys, flowLandmarks, omittedGeometricFlowKeys, sampleFlowAt } from '../src/flow/index.ts';
import { defaultParameters, parametersForScenario, simulate } from '../src/simulation/index.ts';
import type { SimulationSample } from '../src/simulation/types.ts';

const baseline = simulate(defaultParameters);
const mr = simulate(parametersForScenario('mitral-regurgitation'));
const normalTimeline = createFlowTimeline(baseline);
const mrTimeline = createFlowTimeline(mr);
const near = (actual: number, expected: number, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);

function analyticSamples(): SimulationSample[] {
  return [0, 1, 2, 3, 4].map((time, i) => ({ ...baseline.samples[0], time, phase: time / 4,
    flows: { ...Object.fromEntries(flowKeys.map(key => [key, 0])) as SimulationSample['flows'],
      aortic: [0, 4, 0, 0, 0][i], mitral: [0, -2, 0, 4, 0][i], systemicVenous: -2 } }));
}

test('circulation topology passes through the correct named valves and joins chamber guides', () => {
  const paths = new Map(bloodFlowPaths.map(path => [path.id, path]));
  const expected = [
    ['tricuspid', 'RA', 'TV', 'RV', 'tricuspid'],
    ['mitral', 'LA', 'MV', 'LV', 'mitral'],
    ['pulmonary-outflow', 'RV', 'PVvalve', 'PT', 'pulmonary'],
    ['aortic-outflow', 'LV', 'AV', 'DAO', 'aortic'],
  ] as const;
  for (const [id, inlet, valve, outlet, signal] of expected) {
    const route = paths.get(id)!;
    assert.deepEqual(route.points[0], flowLandmarks[inlet]);
    assert.deepEqual(route.points.at(-1), flowLandmarks[outlet]);
    assert.ok(route.points.some(point => point.every((v, axis) => v === flowLandmarks[valve][axis])));
    assert.equal(route.flowKey, signal);
    assert.ok(route.structures.includes(valve));
  }
  for (const id of ['caval-superior', 'caval-inferior']) {
    assert.deepEqual(paths.get(id)!.points.at(-1), paths.get('tricuspid')!.points[0]);
    assert.equal(paths.get(id)!.flowKey, 'systemicVenous');
  }
  for (const id of ['pulmonary-left', 'pulmonary-right']) {
    assert.deepEqual(paths.get(id)!.points[0], paths.get('pulmonary-outflow')!.points.at(-1));
  }
  for (const id of ['pulmonary-venous-rs', 'pulmonary-venous-ri', 'pulmonary-venous-ls', 'pulmonary-venous-li']) {
    assert.deepEqual(paths.get(id)!.points.at(-1), paths.get('mitral')!.points[0]);
    assert.equal(paths.get(id)!.flowKey, 'pulmonaryVenous');
  }
  assert.deepEqual(paths.get('aortic-outflow')!.structures, ['LV', 'AV', 'AO', 'ARCH', 'DAO']);
});

test('all guides reference existing atlas structures without inventing peripheral-bed geometry', () => {
  const ids = new Set(atlas.structures.map(structure => structure.id));
  const pathIds = new Set<string>();
  for (const route of bloodFlowPaths) {
    assert.ok(!pathIds.has(route.id)); pathIds.add(route.id);
    assert.ok(route.structures.every(id => ids.has(id)));
    assert.ok(route.points.length >= 3);
    assert.ok(route.radiusMetres > 0 && route.radiusMetres < 0.003);
    assert.equal(route.oxygenation, route.side === 'right' ? 'deoxygenated' : 'oxygenated');
    for (const point of route.points) for (let axis = 0; axis < 3; axis++) {
      // Bounding-box containment only. This deliberately does not assert lumen containment.
      assert.ok(Number.isFinite(point[axis]));
      assert.ok(point[axis] >= atlas.sourceBoundsMetres.min[axis] && point[axis] <= atlas.sourceBoundsMetres.max[axis]);
    }
  }
  assert.deepEqual(omittedGeometricFlowKeys, ['systemic', 'pulmonaryBed']);
  assert.ok(bloodFlowPaths.every(path => !omittedGeometricFlowKeys.includes(path.flowKey)));
  assert.deepEqual(new Set([...bloodFlowPaths.map(path => path.flowKey), ...omittedGeometricFlowKeys]), new Set(flowKeys));
});

test('partial intervals integrate linearly interpolated signed flow exactly', () => {
  const timeline = createFlowTimeline({ period: 4, samples: analyticSamples() });
  const first = sampleFlowAt(timeline, 'aortic', 0.5);
  near(first.flow, 2); near(first.cumulativeVolume, 0.5);
  const falling = sampleFlowAt(timeline, 'aortic', 1.5);
  near(falling.flow, 2); near(falling.cumulativeVolume, 3.5);
  near(sampleFlowAt(timeline, 'aortic', 3.5).cumulativeVolume, 4);
  near(sampleFlowAt(timeline, 'mitral', 0.5).flow, -1);
  near(sampleFlowAt(timeline, 'mitral', 0.5).cumulativeVolume, -0.25);
  near(timeline.signals.mitral.cycleVolume, 2);
  near(timeline.signals.systemicVenous.cycleVolume, -8);
  near(timeline.signals.mitral.peakAbsoluteFlow, 4);
});

test('closed-valve intervals remain motionless instead of using a generic beat pulse', () => {
  for (const key of ['aortic', 'mitral', 'tricuspid', 'pulmonary'] as const) {
    let checked = 0;
    for (let i = 0; i < baseline.samples.length - 1; i++) {
      const a = baseline.samples[i], b = baseline.samples[i + 1];
      if (a.flows[key] !== 0 || b.flows[key] !== 0) continue;
      const start = sampleFlowAt(normalTimeline, key, a.time);
      const middle = sampleFlowAt(normalTimeline, key, (a.time + b.time) / 2);
      near(start.flow, 0); near(middle.flow, 0);
      near(start.cumulativeVolume, middle.cumulativeVolume);
      checked++;
    }
    assert.ok(checked > 10, `${key} should include a closed interval`);
  }
  const ejection = baseline.samples.find(sample => sample.flows.aortic > 100)!;
  const filling = baseline.samples.find(sample => sample.flows.mitral > 100)!;
  assert.ok(sampleFlowAt(normalTimeline, 'aortic', ejection.time).flow > 100);
  near(sampleFlowAt(normalTimeline, 'mitral', ejection.time).flow, 0);
  assert.ok(sampleFlowAt(normalTimeline, 'mitral', filling.time).flow > 100);
  near(sampleFlowAt(normalTimeline, 'aortic', filling.time).flow, 0);
});

test('MR reverses mitral travel while aortic flow remains forward', () => {
  const index = mr.samples.findIndex((sample, i) => i < mr.samples.length - 1 && sample.flows.mitral < -20 && mr.samples[i + 1].flows.mitral < -20 && sample.flows.aortic > 0);
  assert.ok(index >= 0);
  const a = mr.samples[index], b = mr.samples[index + 1];
  const before = sampleFlowAt(mrTimeline, 'mitral', a.time);
  const after = sampleFlowAt(mrTimeline, 'mitral', b.time);
  assert.ok(after.cumulativeVolume < before.cumulativeVolume);
  assert.ok(sampleFlowAt(mrTimeline, 'mitral', (a.time + b.time) / 2).flow < 0);
  assert.ok(sampleFlowAt(mrTimeline, 'aortic', (a.time + b.time) / 2).flow > 0);
});

test('venous flow reversal is preserved independently of mitral regurgitation', () => {
  const index = baseline.samples.findIndex((sample, i) => i < baseline.samples.length - 1 && sample.flows.pulmonaryVenous < -10 && baseline.samples[i + 1].flows.pulmonaryVenous < -10);
  assert.ok(index >= 0);
  const a = baseline.samples[index], b = baseline.samples[index + 1];
  assert.ok(sampleFlowAt(normalTimeline, 'pulmonaryVenous', b.time).cumulativeVolume < sampleFlowAt(normalTimeline, 'pulmonaryVenous', a.time).cumulativeVolume);
  assert.equal(baseline.metrics.regurgitantVolume, 0);
});

test('cycle wrapping preserves cumulative motion, including net-negative signals', () => {
  const timeline = createFlowTimeline({ period: 4, samples: analyticSamples() });
  for (const key of flowKeys) for (const t of [0, 0.25, 1.5, 3.9]) {
    const first = sampleFlowAt(timeline, key, t);
    const later = sampleFlowAt(timeline, key, t + 12);
    near(later.flow, first.flow);
    near(later.cumulativeVolume, first.cumulativeVolume + 3 * timeline.signals[key].cycleVolume);
  }
  for (const key of flowKeys) {
    near(sampleFlowAt(timeline, key, 4).cumulativeVolume, timeline.signals[key].cycleVolume);
    const before = sampleFlowAt(timeline, key, 4 - 1e-7).cumulativeVolume;
    const after = sampleFlowAt(timeline, key, 4 + 1e-7).cumulativeVolume;
    assert.ok(Math.abs(after - before) < 1e-6);
  }
  near(sampleFlowAt(timeline, 'systemicVenous', 12).cumulativeVolume, -24);
});

test('pause, scrub, and frame skips are deterministic random-access operations', () => {
  const times = [0, 0.1, 0.3, baseline.period, 2.73 * baseline.period];
  const snapshots = times.map(time => sampleFlowAt(normalTimeline, 'aortic', time));
  for (let i = times.length - 1; i >= 0; i--) {
    assert.deepEqual(sampleFlowAt(normalTimeline, 'aortic', times[i]), snapshots[i]);
    assert.deepEqual(sampleFlowAt(normalTimeline, 'aortic', times[i]), snapshots[i]);
  }
  const samples = analyticSamples();
  const timeline = createFlowTimeline({ period: 4, samples });
  samples[1].flows.aortic = 1e6;
  near(sampleFlowAt(timeline, 'aortic', 0.5).flow, 2, 1e-12);
});

test('invalid playback times, malformed sampling, and nonfinite flows are rejected', () => {
  for (const time of [NaN, Infinity, -Infinity]) assert.throws(() => sampleFlowAt(normalTimeline, 'aortic', time), RangeError);
  for (const period of [0, -1, NaN]) assert.throws(() => createFlowTimeline({ period, samples: analyticSamples() }), RangeError);
  assert.throws(() => createFlowTimeline({ period: 4, samples: [] }), RangeError);
  const samples = analyticSamples();
  samples[1].time = 0;
  assert.throws(() => createFlowTimeline({ period: 4, samples }), RangeError);
  samples[1].time = 1;
  samples[2].flows.mitral = NaN;
  assert.throws(() => createFlowTimeline({ period: 4, samples }), RangeError);
  assert.throws(() => createFlowTimeline({ period: 5, samples: analyticSamples() }), RangeError);
});
