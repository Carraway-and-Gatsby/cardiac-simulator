import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defaultParameters, modelConstants, parameterDefinitions, parametersForScenario, scenarios, simulate } from '../src/simulation/index.ts';
import type { SimulationParameters, SimulationResult } from '../src/simulation/types.ts';

const root = new URL('../', import.meta.url);
const sourceFiles = ['src/simulation/engine.ts', 'src/simulation/types.ts', 'src/simulation/parameters.ts', 'tests/simulation.test.ts', 'scripts/validate-physiology.ts'];
const sourceHashes = Object.fromEntries(sourceFiles.map(path => [path, createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex')]));
const summarize = (result: SimulationResult) => ({ parameters: result.parameters, metrics: result.metrics, diagnostics: result.diagnostics });
const presets = Object.fromEntries(scenarios.map(scenario => [scenario.id, summarize(simulate(parametersForScenario(scenario.id)))]));
const baseline = presets.normal.metrics;
const perturbationParameters: Record<string, Partial<SimulationParameters>> = {
  reducedBloodVolume: { bloodVolume: 4750 }, increasedBloodVolume: { bloodVolume: 5250 },
  increasedAfterload: { systemicResistance: 1.3 }, reducedContractility: { contractility: 0.7 }, increasedStiffness: { diastolicStiffness: 1.3 },
};
const perturbations = Object.fromEntries(Object.entries(perturbationParameters).map(([name, patch]) => [name, summarize(simulate({ ...defaultParameters, ...patch }))]));
const relativeError = (actual: number, reference: number) => Math.abs(actual - reference) / Math.abs(reference);
const refinement = Object.fromEntries(scenarios.map(scenario => {
  const coarse = presets[scenario.id];
  const fine = summarize(simulate(parametersForScenario(scenario.id), { stepSize: 0.0005 }));
  const keys = ['cardiacOutput', 'edv', 'esv', 'ejectionFraction', 'meanArterialPressure', 'peakLvPressure', 'peakAorticGradient'] as const;
  const relativeErrors = Object.fromEntries(keys.map(key => [key, relativeError(coarse.metrics[key], fine.metrics[key])]));
  return [scenario.id, { fine, relativeErrors, maximumRelativeError: Math.max(...Object.values(relativeErrors)), acceptanceTolerance: 0.002 }];
}));
const mechanismChecks = {
  baselineOutputSanityBand: baseline.cardiacOutput > 4 && baseline.cardiacOutput < 7,
  baselineEfSanityBand: baseline.ejectionFraction > 0.5 && baseline.ejectionFraction < 0.7,
  preloadEdv: perturbations.reducedBloodVolume.metrics.edv < baseline.edv && perturbations.increasedBloodVolume.metrics.edv > baseline.edv,
  preloadForwardStrokeVolume: perturbations.reducedBloodVolume.metrics.forwardStrokeVolume < baseline.forwardStrokeVolume && perturbations.increasedBloodVolume.metrics.forwardStrokeVolume > baseline.forwardStrokeVolume,
  afterloadPressure: perturbations.increasedAfterload.metrics.meanArterialPressure > baseline.meanArterialPressure,
  afterloadOutput: perturbations.increasedAfterload.metrics.forwardStrokeVolume < baseline.forwardStrokeVolume,
  reducedContractility: perturbations.reducedContractility.metrics.ejectionFraction < baseline.ejectionFraction,
  increasedStiffness: perturbations.increasedStiffness.metrics.edv < baseline.edv && perturbations.increasedStiffness.metrics.meanLaPressure > baseline.meanLaPressure,
  hfref: presets.hfref.metrics.ejectionFraction < 0.4 && presets.hfref.metrics.cardiacOutput < baseline.cardiacOutput,
  hfpefSurrogate: presets.hfpef.metrics.ejectionFraction >= 0.5 && presets.hfpef.metrics.meanLaPressure > baseline.meanLaPressure,
  aorticObstruction: presets['aortic-stenosis'].metrics.peakAorticGradient > baseline.peakAorticGradient * 3 && presets['aortic-stenosis'].metrics.cardiacOutput < baseline.cardiacOutput,
  mitralReverseVolume: presets['mitral-regurgitation'].metrics.regurgitantVolume > 20,
  mitralEffectiveOutput: presets['mitral-regurgitation'].metrics.cardiacOutput < baseline.cardiacOutput && presets['mitral-regurgitation'].metrics.ejectionFraction > baseline.ejectionFraction,
};
const cornerSweep = { count: 0, maximumCycles: 0, maximumVolumeErrorMl: 0, minimumVolumeMl: Infinity, outOfDomain: [] as { parameters: SimulationParameters; reasons: string[] }[], failures: [] as { parameters: SimulationParameters; reason: string }[] };
for (const scenario of scenarios) for (const heartRate of [50, 120]) for (const bloodVolume of [4500, 5500])
  for (const contractility of [0.6, 1.4]) for (const diastolicStiffness of [0.7, 1.5]) for (const systemicResistance of [0.6, 1.6]) {
    const parameters = { ...defaultParameters, scenario: scenario.id, severity: 1, heartRate, bloodVolume, contractility, diastolicStiffness, systemicResistance };
    cornerSweep.count++;
    try {
      const result = simulate(parameters, { sampleCount: 50 });
      const d = result.diagnostics;
      cornerSweep.maximumCycles = Math.max(cornerSweep.maximumCycles, d.cycles);
      cornerSweep.maximumVolumeErrorMl = Math.max(cornerSweep.maximumVolumeErrorMl, d.volumeErrorMl);
      cornerSweep.minimumVolumeMl = Math.min(cornerSweep.minimumVolumeMl, d.minVolumeMl);
      if (!d.modelWithinDomain) cornerSweep.outOfDomain.push({ parameters, reasons: d.warnings });
      if (!d.converged || d.volumeErrorMl >= 1e-6 || !Object.values(result.metrics).every(Number.isFinite)) cornerSweep.failures.push({ parameters, reason: 'Convergence, conservation or finite-metric check failed.' });
    } catch (error) { cornerSweep.failures.push({ parameters, reason: String(error) }); }
  }
const allRuns = [...Object.values(presets), ...Object.values(perturbations)];
const checks = {
  mechanisms: Object.values(mechanismChecks).every(Boolean),
  convergenceAndConservation: allRuns.every(r => r.diagnostics.converged && r.diagnostics.volumeErrorMl < 1e-6 && r.diagnostics.minVolumeMl > 0),
  supportedPresetAndPerturbationDomains: allRuns.every(r => r.diagnostics.modelWithinDomain),
  refinement: Object.values(refinement).every(r => r.maximumRelativeError < r.acceptanceTolerance && r.fine.diagnostics.converged),
  corners: cornerSweep.failures.length === 0,
};
const passed = Object.values(checks).every(Boolean);
const report = {
  generatedAt: new Date().toISOString(), nodeVersion: process.version, status: passed ? 'numerical-and-mechanistic-checks-passed' : 'failed',
  scope: 'Engineering verification of an estimated educational model. Numeric stability is distinct from physiological interpretation; out-of-domain combinations are explicitly enumerated and must not be presented as supported physiology. No patient calibration, external waveform comparison, expert review, or clinical validation is implied.',
  sourceHashes, units: { time: 's', volume: 'mL', pressure: 'mmHg', flow: 'mL/s', cardiacOutput: 'L/min', ejectionFraction: 'fraction', regurgitantFraction: 'fraction' },
  parameterSchema: parameterDefinitions, defaultParameters, modelConstants, checks, mechanismChecks, presets, perturbations, refinement, cornerSweep,
};
const destination = new URL('docs/physiology-validation.json', root);
writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
console.log(`${passed ? 'PASS' : 'FAIL'}: numerical and mechanism report written to ${fileURLToPath(destination)}`);
console.table(Object.fromEntries(Object.entries(presets).map(([name, r]) => [name, {
  'CO (L/min)': r.metrics.cardiacOutput.toFixed(3), 'EF (%)': (r.metrics.ejectionFraction * 100).toFixed(2),
  'EDV (mL)': r.metrics.edv.toFixed(2), 'ESV (mL)': r.metrics.esv.toFixed(2), 'LA mean (mmHg)': r.metrics.meanLaPressure.toFixed(2), cycles: r.diagnostics.cycles,
}])));
if (!passed) process.exitCode = 1;
