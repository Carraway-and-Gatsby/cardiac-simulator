import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compartments, defaultParameters, evaluateState, modelConstants, parametersForScenario, resolveModel, scenarios, simulate, volumeDerivative } from '../src/simulation/index.ts';
import type { SimulationParameters, SimulationResult } from '../src/simulation/types.ts';

const results = new Map(scenarios.map(scenario => [scenario.id, simulate(parametersForScenario(scenario.id))]));
const baseline = results.get('normal')!;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const relativeError = (actual: number, reference: number) => Math.abs(actual - reference) / Math.abs(reference);

function assertPhysical(result: SimulationResult) {
  assert.equal(result.diagnostics.converged, true);
  assert.ok(result.diagnostics.periodicResidualMl < 0.001);
  assert.ok(result.diagnostics.volumeErrorMl < 1e-6);
  assert.ok(result.diagnostics.minVolumeMl > 0);
  for (const sample of result.samples) {
    assert.ok(Math.abs(sum(Object.values(sample.volumes)) - result.parameters.bloodVolume) < 1e-6);
    assert.ok(Object.values(sample.volumes).every(v => Number.isFinite(v) && v > 0));
    assert.ok(Object.values(sample.pressures).every(Number.isFinite));
    assert.ok(Object.values(sample.flows).every(Number.isFinite));
    assert.ok(sample.flows.aortic >= 0 && sample.flows.pulmonary >= 0 && sample.flows.tricuspid >= 0);
  }
  assert.ok(Math.abs(result.metrics.forwardStrokeVolume - result.metrics.pulmonaryStrokeVolume) < 0.03, 'Closed-loop left and right forward stroke volumes must agree after equilibration.');
}

test('all presets converge, conserve volume and remain finite and positive without volume clipping', () => {
  for (const result of results.values()) {
    assertPhysical(result);
    assert.equal(result.diagnostics.modelWithinDomain, true);
    assert.equal(result.diagnostics.warnings.length, 0);
  }
});

test('baseline is within declared broad educational resting sanity bands', () => {
  const m = baseline.metrics;
  // Broad acceptance bounds for this estimated model, not clinical normal ranges.
  assert.ok(m.cardiacOutput > 4 && m.cardiacOutput < 7);
  assert.ok(m.ejectionFraction > 0.5 && m.ejectionFraction < 0.7);
  assert.ok(m.edv > 100 && m.edv < 160);
  assert.ok(m.systolicPressure > 100 && m.systolicPressure < 140);
  assert.ok(m.diastolicPressure > 60 && m.diastolicPressure < 95);
  assert.ok(m.meanPulmonaryPressure > 10 && m.meanPulmonaryPressure < 25);
  assert.equal(m.regurgitantVolume, 0);
  assert.ok(Math.abs(m.strokeVolume - m.forwardStrokeVolume) < 0.03);
});

test('flow balance is local and global, including signed reverse mitral flow', () => {
  const p = parametersForScenario('mitral-regurgitation');
  const v = { ...modelConstants.initialVolumes };
  const state = evaluateState(0.22, v, p);
  const d = volumeDerivative(0.22, v, p);
  assert.ok(state.flows.mitral < 0);
  assert.equal(d.LA, state.flows.pulmonaryVenous - state.flows.mitral);
  assert.equal(d.LV, state.flows.mitral - state.flows.aortic);
  assert.equal(d.SA, state.flows.aortic - state.flows.systemic);
  assert.ok(Math.abs(sum(Object.values(d))) < 1e-10);
  assert.equal(evaluateState(0.22, v, defaultParameters).flows.mitral, 0);
});

test('deterministic replay and cycle endpoint closure', () => {
  assert.deepEqual(simulate(defaultParameters), baseline);
  const first = baseline.samples[0], last = baseline.samples.at(-1)!;
  assert.equal(first.phase, 0);
  assert.equal(last.phase, 1);
  assert.equal(last.time, baseline.period);
  for (const c of compartments) assert.ok(Math.abs(first.volumes[c] - last.volumes[c]) < 0.001);
  assert.equal(first.activation.LV, last.activation.LV);
  assert.equal(first.activation.LA, last.activation.LA);
  assert.equal(baseline.metrics.lvEndDiastolicPressure, first.pressures.LV);
});

test('normal valve sequence has filling, isolated contraction, ejection and isolated relaxation', () => {
  const points = baseline.samples;
  assert.ok(points.some(s => s.activation.LV === 0 && s.flows.mitral > 0 && s.flows.aortic === 0));
  assert.ok(points.some(s => s.phase < 0.30 && s.activation.LV > 0 && s.flows.mitral === 0 && s.flows.aortic === 0));
  assert.ok(points.some(s => s.flows.aortic > 0 && s.flows.mitral === 0));
  assert.ok(points.some(s => s.phase > 0.30 && s.activation.LV > 0 && s.flows.mitral === 0 && s.flows.aortic === 0));
  assert.ok(points.some(s => s.activation.LA > 0 && s.activation.LV === 0));
  for (const sample of points) {
    if (sample.flows.aortic > 0) assert.ok(sample.pressures.LV > sample.pressures.SA);
    if (sample.flows.mitral > 0) assert.ok(sample.pressures.LA > sample.pressures.LV);
  }
});

test('step refinement from 1 ms to 0.5 ms leaves displayed model outputs within 0.2%', () => {
  for (const scenario of scenarios) {
    const coarse = results.get(scenario.id)!;
    const fine = simulate(parametersForScenario(scenario.id), { stepSize: 0.0005 });
    assertPhysical(fine);
    for (const key of ['cardiacOutput', 'edv', 'esv', 'ejectionFraction', 'meanArterialPressure', 'peakLvPressure', 'peakAorticGradient'] as const) {
      assert.ok(relativeError(coarse.metrics[key], fine.metrics[key]) < 0.002, `${scenario.id}: ${key} did not converge with step refinement.`);
    }
  }
});

test('increased circulating volume raises EDV and forward stroke volume (Starling response)', () => {
  const less = simulate({ ...defaultParameters, bloodVolume: 4750 });
  const more = simulate({ ...defaultParameters, bloodVolume: 5250 });
  assertPhysical(less); assertPhysical(more);
  assert.ok(less.metrics.edv < baseline.metrics.edv && baseline.metrics.edv < more.metrics.edv);
  assert.ok(less.metrics.forwardStrokeVolume < baseline.metrics.forwardStrokeVolume && baseline.metrics.forwardStrokeVolume < more.metrics.forwardStrokeVolume);
  assert.ok(less.metrics.meanLaPressure < more.metrics.meanLaPressure);
});

test('increased systemic afterload raises pressure and ESV, reducing forward stroke volume', () => {
  const afterload = simulate({ ...defaultParameters, systemicResistance: 1.3 });
  assertPhysical(afterload);
  assert.ok(afterload.metrics.meanArterialPressure > baseline.metrics.meanArterialPressure);
  assert.ok(afterload.metrics.esv > baseline.metrics.esv);
  assert.ok(afterload.metrics.forwardStrokeVolume < baseline.metrics.forwardStrokeVolume);
});

test('contractility loss reduces EF and output; HFrEF default has reduced EF', () => {
  const reduced = simulate({ ...defaultParameters, contractility: 0.7 });
  const hfref = results.get('hfref')!;
  assertPhysical(reduced);
  for (const result of [reduced, hfref]) {
    assert.ok(result.metrics.esv > baseline.metrics.esv);
    assert.ok(result.metrics.ejectionFraction < baseline.metrics.ejectionFraction);
    assert.ok(result.metrics.cardiacOutput < baseline.metrics.cardiacOutput);
  }
  assert.ok(hfref.metrics.ejectionFraction < 0.4);
});

test('passive stiffening raises filling pressure, reduces EDV; HFpEF surrogate preserves default EF', () => {
  const stiff = simulate({ ...defaultParameters, diastolicStiffness: 1.3 });
  const hfpef = results.get('hfpef')!;
  assertPhysical(stiff);
  for (const result of [stiff, hfpef]) {
    assert.ok(result.metrics.edv < baseline.metrics.edv);
    assert.ok(result.metrics.meanLaPressure > baseline.metrics.meanLaPressure);
    assert.ok(result.metrics.lvEndDiastolicPressure > baseline.metrics.lvEndDiastolicPressure);
  }
  assert.ok(hfpef.metrics.ejectionFraction >= 0.5);
  assert.equal(resolveModel(parametersForScenario('hfpef')).lvEMax, resolveModel(defaultParameters).lvEMax);
});

test('resistive aortic obstruction raises ejection gradient and LV pressure and lowers forward output', () => {
  const stenosis = results.get('aortic-stenosis')!;
  assert.ok(stenosis.metrics.peakAorticGradient > baseline.metrics.peakAorticGradient * 3);
  assert.ok(stenosis.metrics.meanAorticGradient > baseline.metrics.meanAorticGradient * 3);
  assert.ok(stenosis.metrics.peakLvPressure > baseline.metrics.peakLvPressure);
  assert.ok(stenosis.metrics.cardiacOutput < baseline.metrics.cardiacOutput);
});

test('MR returns real volume to LA; total LV ejection differs from effective systemic output', () => {
  const mr = results.get('mitral-regurgitation')!;
  assert.ok(mr.samples.some(s => s.flows.mitral < 0));
  assert.ok(mr.metrics.regurgitantVolume > 20);
  assert.ok(mr.metrics.regurgitantFraction > 0.2);
  assert.ok(mr.metrics.meanLaPressure > baseline.metrics.meanLaPressure);
  assert.ok(mr.metrics.ejectionFraction > baseline.metrics.ejectionFraction);
  assert.ok(mr.metrics.cardiacOutput < baseline.metrics.cardiacOutput);
  assert.ok(Math.abs(mr.metrics.strokeVolume - mr.metrics.forwardStrokeVolume - mr.metrics.regurgitantVolume) < 0.03);
});

test('all disease mechanism modifiers vanish at zero severity', () => {
  for (const scenario of scenarios) {
    const result = simulate({ ...parametersForScenario(scenario.id), severity: 0 });
    assert.deepEqual(result.metrics, baseline.metrics);
  }
});

test('parameter extremes remain finite, positive-volume and numerically converged in all 160 corners', () => {
  // Numeric robustness is separate from model-domain support; unsupported combinations remain flagged.
  for (const scenario of scenarios) for (const heartRate of [50, 120]) for (const bloodVolume of [4500, 5500])
    for (const contractility of [0.6, 1.4]) for (const diastolicStiffness of [0.7, 1.5]) for (const systemicResistance of [0.6, 1.6]) {
      const parameters = { ...defaultParameters, scenario: scenario.id, severity: 1, heartRate, bloodVolume, contractility, diastolicStiffness, systemicResistance };
      assertPhysical(simulate(parameters, { sampleCount: 50 }));
    }
});

test('converged extreme HFrEF is explicitly rejected for physiological interpretation', () => {
  const unsupported = simulate({ ...defaultParameters, scenario: 'hfref', severity: 1,
    heartRate: 120, contractility: 0.6, diastolicStiffness: 1.5, systemicResistance: 1.6, bloodVolume: 5500 });
  assertPhysical(unsupported);
  assert.equal(unsupported.diagnostics.modelWithinDomain, false);
  assert.ok(unsupported.diagnostics.minActivePassiveMarginMmHg < 0);
  assert.ok(unsupported.diagnostics.simultaneousLeftValveFlowFraction > 0);
  assert.equal(unsupported.diagnostics.warnings.length, 2);
  assert.ok(unsupported.metrics.forwardStrokeVolume > unsupported.metrics.strokeVolume * 2);
});

test('invalid inputs are rejected and equilibration failure remains visible', () => {
  for (const change of [{ heartRate: NaN }, { heartRate: 0 }, { bloodVolume: 0 }, { severity: 1.1 }, { contractility: Infinity }, { scenario: 'unknown' }]) {
    assert.throws(() => simulate({ ...defaultParameters, ...change } as SimulationParameters), RangeError);
  }
  assert.throws(() => simulate(defaultParameters, { stepSize: 0 }), RangeError);
  assert.throws(() => simulate(defaultParameters, { maxCycles: 300 }), RangeError);
  for (const time of [NaN, Infinity, -Infinity]) {
    assert.throws(() => evaluateState(time, { ...modelConstants.initialVolumes }, defaultParameters), RangeError);
    assert.throws(() => volumeDerivative(time, { ...modelConstants.initialVolumes }, defaultParameters), RangeError);
  }
  assert.throws(() => evaluateState(0, { ...modelConstants.initialVolumes, LV: 1e6 }, defaultParameters), /nonfinite/);
  const unsettled = simulate(defaultParameters, { minCycles: 1, maxCycles: 1 });
  assert.equal(unsettled.diagnostics.converged, false);
  assert.ok(unsettled.diagnostics.warnings.length > 0);
  assert.ok(unsettled.diagnostics.periodicResidualMl > 0.001);
});
