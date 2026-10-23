import { compartments, type Compartment, type SimulationDiagnostics, type SimulationMetrics, type SimulationOptions, type SimulationParameters, type SimulationResult, type SimulationSample } from './types.ts';
import { validateParameters } from './parameters.ts';

/** Educational estimates, not a fitted patient or a reproduction of a published parameter set. */
export const modelConstants = {
  lv: { v0: 10, eMax: 2.2, passiveA: 0.3, passiveB: 0.027 },
  rv: { v0: 10, eMax: 0.65, passiveA: 0.3, passiveB: 0.023 },
  la: { v0: 10, eMin: 0.12, eMax: 0.28 },
  ra: { v0: 10, eMin: 0.08, eMax: 0.20 },
  vessels: {
    SA: { v0: 700, compliance: 1.5 },
    SV: { v0: 2600, compliance: 100 },
    PA: { v0: 100, compliance: 5 },
    PV: { v0: 300, compliance: 20 },
  },
  resistance: { systemic: 1.0, pulmonaryBed: 0.10, systemicVenous: 0.03, pulmonaryVenous: 0.02, mitral: 0.008, aortic: 0.015, tricuspid: 0.008, pulmonary: 0.010 },
  timing: { ventricularPeak: 0.30, ventricularEnd: 0.45, atrialStart: 0.78, atrialEnd: 0.96 },
  initialVolumes: { LA: 50, LV: 125, SA: 850, SV: 3100, RA: 55, RV: 110, PA: 175, PV: 535 },
} as const;

export function resolveModel(parameters: SimulationParameters) {
  validateParameters(parameters);
  const { scenario, severity } = parameters;
  return {
    period: 60 / parameters.heartRate,
    lvEMax: modelConstants.lv.eMax * parameters.contractility * (scenario === 'hfref' ? 1 - 0.7 * severity : 1),
    lvPassiveB: modelConstants.lv.passiveB * parameters.diastolicStiffness * (scenario === 'hfpef' ? 1 + 1.1 * severity : 1),
    systemicResistance: modelConstants.resistance.systemic * parameters.systemicResistance,
    aorticResistance: modelConstants.resistance.aortic * (scenario === 'aortic-stenosis' ? 1 + 14 * severity : 1),
    /** mL/(s mmHg). Zero is a competent ideal diode; reverse flow remains signed. */
    mitralReverseConductance: scenario === 'mitral-regurgitation' ? 2.5 * severity : 0,
  };
}

type ResolvedModel = ReturnType<typeof resolveModel>;
type Volumes = Record<Compartment, number>;
type Vector = number[];
const index = { LA: 0, LV: 1, SA: 2, SV: 3, RA: 4, RV: 5, PA: 6, PV: 7 } as const;

function asRecord(vector: Vector): Volumes {
  return Object.fromEntries(compartments.map((name, i) => [name, vector[i]])) as Volumes;
}

function activationAt(time: number, period: number) {
  const phase = ((time / period) % 1 + 1) % 1;
  const { ventricularPeak: peak, ventricularEnd: end, atrialStart: startA, atrialEnd: endA } = modelConstants.timing;
  const ventricular = phase < peak ? 0.5 * (1 - Math.cos(Math.PI * phase / peak))
    : phase < end ? 0.5 * (1 + Math.cos(Math.PI * (phase - peak) / (end - peak))) : 0;
  const atrial = phase >= startA && phase < endA ? 0.5 * (1 - Math.cos(2 * Math.PI * (phase - startA) / (endA - startA))) : 0;
  return { ventricular, atrial, phase };
}

function ventricularPressure(volume: number, v0: number, eMax: number, a: number, b: number, activation: number): number {
  const stressedVolume = volume - v0;
  return activation * eMax * stressedVolume + (1 - activation) * a * Math.expm1(b * stressedVolume);
}

/** Every edge has one signed flow reused with opposite signs in its two endpoints. */
function evaluate(time: number, v: Vector, model: ResolvedModel) {
  const a = activationAt(time, model.period);
  const { lv, rv, la, ra, vessels, resistance: r } = modelConstants;
  const p = [
    (la.eMin + (la.eMax - la.eMin) * a.atrial) * (v[0] - la.v0),
    ventricularPressure(v[1], lv.v0, model.lvEMax, lv.passiveA, model.lvPassiveB, a.ventricular),
    (v[2] - vessels.SA.v0) / vessels.SA.compliance,
    (v[3] - vessels.SV.v0) / vessels.SV.compliance,
    (ra.eMin + (ra.eMax - ra.eMin) * a.atrial) * (v[4] - ra.v0),
    ventricularPressure(v[5], rv.v0, rv.eMax, rv.passiveA, rv.passiveB, a.ventricular),
    (v[6] - vessels.PA.v0) / vessels.PA.compliance,
    (v[7] - vessels.PV.v0) / vessels.PV.compliance,
  ];
  const mitralGradient = p[0] - p[1];
  const flows = {
    mitral: mitralGradient >= 0 ? mitralGradient / r.mitral : model.mitralReverseConductance === 0 ? 0 : mitralGradient * model.mitralReverseConductance,
    aortic: Math.max(0, p[1] - p[2]) / model.aorticResistance,
    systemic: (p[2] - p[3]) / model.systemicResistance,
    systemicVenous: (p[3] - p[4]) / r.systemicVenous,
    tricuspid: Math.max(0, p[4] - p[5]) / r.tricuspid,
    pulmonary: Math.max(0, p[5] - p[6]) / r.pulmonary,
    pulmonaryBed: (p[6] - p[7]) / r.pulmonaryBed,
    pulmonaryVenous: (p[7] - p[0]) / r.pulmonaryVenous,
  };
  const q = flows;
  const derivative = [q.pulmonaryVenous - q.mitral, q.mitral - q.aortic,
    q.aortic - q.systemic, q.systemic - q.systemicVenous,
    q.systemicVenous - q.tricuspid, q.tricuspid - q.pulmonary,
    q.pulmonary - q.pulmonaryBed, q.pulmonaryBed - q.pulmonaryVenous];
  return { pressures: p, flows, derivative, activation: { LA: a.atrial, LV: a.ventricular, RA: a.atrial, RV: a.ventricular } };
}

export function evaluateState(time: number, volumes: Volumes, parameters: SimulationParameters): SimulationSample {
  if (!Number.isFinite(time)) throw new RangeError('time must be finite.');
  const model = resolveModel(parameters);
  const vector = compartments.map(name => volumes[name]);
  assertState(vector);
  const state = evaluate(time, vector, model);
  assertEvaluation(state);
  return { time, phase: activationAt(time, model.period).phase, volumes: { ...volumes }, pressures: asRecord(state.pressures), flows: state.flows, activation: state.activation };
}

export function volumeDerivative(time: number, volumes: Volumes, parameters: SimulationParameters): Volumes {
  if (!Number.isFinite(time)) throw new RangeError('time must be finite.');
  const model = resolveModel(parameters);
  const vector = compartments.map(name => volumes[name]);
  assertState(vector);
  const state = evaluate(time, vector, model);
  assertEvaluation(state);
  return asRecord(state.derivative);
}

function assertEvaluation(state: ReturnType<typeof evaluate>): void {
  if ([...state.pressures, ...Object.values(state.flows), ...state.derivative].some(value => !Number.isFinite(value))) {
    throw new Error('Model evaluation produced nonfinite pressure, flow or derivative.');
  }
}

function assertState(volumes: Vector): void {
  if (volumes.some(v => !Number.isFinite(v) || v <= 0)) {
    throw new Error('Integration produced nonfinite or nonpositive volume; no clipping or mass correction was applied.');
  }
}

function rk4(time: number, volumes: Vector, dt: number, model: ResolvedModel): Vector {
  const k1 = evaluate(time, volumes, model).derivative;
  const s2 = volumes.map((value, i) => value + dt * k1[i] / 2);
  assertState(s2);
  const k2 = evaluate(time + dt / 2, s2, model).derivative;
  const s3 = volumes.map((value, i) => value + dt * k2[i] / 2);
  assertState(s3);
  const k3 = evaluate(time + dt / 2, s3, model).derivative;
  const s4 = volumes.map((value, i) => value + dt * k3[i]);
  assertState(s4);
  const k4 = evaluate(time + dt, s4, model).derivative;
  const next = volumes.map((value, i) => value + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
  assertState(next);
  return next;
}

function summarize(samples: SimulationSample[], period: number): SimulationMetrics {
  const lv = samples.map(sample => sample.volumes.LV);
  const edv = Math.max(...lv), esv = Math.min(...lv);
  let forward = 0, backward = 0, pulmonary = 0, meanArterial = 0, meanLA = 0, meanRA = 0, meanPA = 0, aorticGradientIntegral = 0, aorticOpenTime = 0;
  for (let i = 1; i < samples.length; i++) {
    const left = samples[i - 1], right = samples[i], dt = right.time - left.time;
    forward += (left.flows.aortic + right.flows.aortic) * dt / 2;
    backward += (Math.max(0, -left.flows.mitral) + Math.max(0, -right.flows.mitral)) * dt / 2;
    pulmonary += (left.flows.pulmonary + right.flows.pulmonary) * dt / 2;
    meanArterial += (left.pressures.SA + right.pressures.SA) * dt / 2;
    meanLA += (left.pressures.LA + right.pressures.LA) * dt / 2;
    meanRA += (left.pressures.RA + right.pressures.RA) * dt / 2;
    meanPA += (left.pressures.PA + right.pressures.PA) * dt / 2;
    for (const point of [left, right]) if (point.flows.aortic > 1e-6) {
      aorticGradientIntegral += (point.pressures.LV - point.pressures.SA) * dt / 2;
      aorticOpenTime += dt / 2;
    }
  }
  return {
    edv, esv, strokeVolume: edv - esv, forwardStrokeVolume: forward,
    ejectionFraction: (edv - esv) / edv, cardiacOutput: forward * 60 / period / 1000,
    meanArterialPressure: meanArterial / period,
    systolicPressure: Math.max(...samples.map(s => s.pressures.SA)),
    diastolicPressure: Math.min(...samples.map(s => s.pressures.SA)),
    meanLaPressure: meanLA / period, meanRaPressure: meanRA / period, meanPulmonaryPressure: meanPA / period,
    lvEndDiastolicPressure: samples[0].pressures.LV,
    peakLvPressure: Math.max(...samples.map(s => s.pressures.LV)),
    regurgitantVolume: backward, regurgitantFraction: backward / (forward + backward),
    peakAorticGradient: Math.max(0, ...samples.map(s => s.pressures.LV - s.pressures.SA)),
    meanAorticGradient: aorticOpenTime > 0 ? aorticGradientIntegral / aorticOpenTime : 0,
    pulmonaryStrokeVolume: pulmonary,
  };
}

function boundedNumber(name: string, value: number, min: number, max: number, integer = false): number {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new RangeError(`${name} must be ${integer ? 'an integer ' : ''}between ${min} and ${max}.`);
  }
  return value;
}

/** Pure bounded CPU computation; suitable for a browser Worker and Node tests. */
export function simulate(parameters: SimulationParameters, options: SimulationOptions = {}): SimulationResult {
  const model = resolveModel(parameters);
  const requestedStep = boundedNumber('stepSize', options.stepSize ?? 0.001, 0.000125, 0.002);
  const maxCycles = boundedNumber('maxCycles', options.maxCycles ?? 160, 1, 200, true);
  const minCycles = boundedNumber('minCycles', options.minCycles ?? 12, 1, 200, true);
  const tolerance = boundedNumber('convergenceTolerance', options.convergenceTolerance ?? 0.001, 1e-6, 1);
  const sampleCount = boundedNumber('sampleCount', options.sampleCount ?? 400, 50, 1000, true);
  if (minCycles > maxCycles) throw new RangeError('minCycles must not exceed maxCycles.');
  const steps = Math.ceil(model.period / requestedStep);
  const dt = model.period / steps;
  let volumes = compartments.map(name => Number(modelConstants.initialVolumes[name]));
  // Preserve the initial passive LV pressure when changing stiffness; redistribute
  // the corresponding initial volume to SV rather than creating/destroying blood.
  // This avoids an unphysical high-pressure initial transient for stiff ventricles.
  const initialLv = modelConstants.lv.v0 + (volumes[index.LV] - modelConstants.lv.v0) * modelConstants.lv.passiveB / model.lvPassiveB;
  volumes[index.SV] += volumes[index.LV] - initialLv;
  volumes[index.LV] = initialLv;
  // A changed blood volume is added/removed in the systemic venous reservoir before equilibration.
  volumes[index.SV] += parameters.bloodVolume - 5000;
  let volumeError = 0, minimumVolume = Math.min(...volumes), residual = Infinity, cycle = 0;
  const inspect = () => {
    volumeError = Math.max(volumeError, Math.abs(volumes.reduce((sum, v) => sum + v, 0) - parameters.bloodVolume));
    minimumVolume = Math.min(minimumVolume, ...volumes);
  };
  for (; cycle < maxCycles; cycle++) {
    const previous = volumes;
    for (let i = 0; i < steps; i++) {
      volumes = rk4(i * dt, volumes, dt, model);
      inspect();
    }
    residual = Math.max(...volumes.map((v, i) => Math.abs(v - previous[i])));
    if (cycle + 1 >= minCycles && residual < tolerance) { cycle++; break; }
  }
  const fullBeat: SimulationSample[] = [];
  for (let i = 0; i <= steps; i++) {
    const time = i * dt;
    const state = evaluate(time, volumes, model);
    assertEvaluation(state);
    fullBeat.push({ time, phase: i / steps, volumes: asRecord(volumes), pressures: asRecord(state.pressures), flows: state.flows, activation: state.activation });
    if (i < steps) { volumes = rk4(time, volumes, dt, model); inspect(); }
  }
  const diagnostics: SimulationDiagnostics = {
    converged: residual < tolerance, cycles: cycle, periodicResidualMl: residual,
    modelWithinDomain: true, minActivePassiveMarginMmHg: Infinity,
    simultaneousLeftValveFlowFraction: 0, simultaneousRightValveFlowFraction: 0,
    volumeErrorMl: volumeError, minVolumeMl: minimumVolume, stepSizeSeconds: dt,
    warnings: residual < tolerance ? [] : ['Periodic equilibration tolerance was not reached; displayed beat is provisional.'],
  };
  for (let i = 0; i < fullBeat.length; i++) {
    const sample = fullBeat[i];
    for (const chamber of ['LV', 'RV'] as const) {
      const c = chamber === 'LV' ? modelConstants.lv : modelConstants.rv;
      const eMax = chamber === 'LV' ? model.lvEMax : c.eMax;
      const b = chamber === 'LV' ? model.lvPassiveB : c.passiveB;
      const stressedVolume = sample.volumes[chamber] - c.v0;
      const margin = eMax * stressedVolume - c.passiveA * Math.expm1(b * stressedVolume);
      diagnostics.minActivePassiveMarginMmHg = Math.min(diagnostics.minActivePassiveMarginMmHg, margin);
    }
    // Trapezoidal integral of overlap indicator, as a fraction of this beat.
    const weight = (i === 0 || i === fullBeat.length - 1 ? 0.5 : 1) / steps;
    if (sample.flows.mitral > 1e-6 && sample.flows.aortic > 1e-6) diagnostics.simultaneousLeftValveFlowFraction += weight;
    if (sample.flows.tricuspid > 1e-6 && sample.flows.pulmonary > 1e-6) diagnostics.simultaneousRightValveFlowFraction += weight;
  }
  if (diagnostics.minActivePassiveMarginMmHg < -1e-6) {
    diagnostics.modelWithinDomain = false;
    diagnostics.warnings.push('Passive ventricular pressure exceeds the peak active relation. Activation would reduce pressure at fixed volume: this parameter combination is outside the supported model domain.');
  }
  if (diagnostics.simultaneousLeftValveFlowFraction > 0 || diagnostics.simultaneousRightValveFlowFraction > 0) {
    diagnostics.modelWithinDomain = false;
    diagnostics.warnings.push('Simultaneous forward filling and ejection occur. Volume-extremum stroke volume and EF no longer describe all ventricular throughput; this parameter combination is outside the supported interpretation domain.');
  }
  // Keep actual integrated samples (no independently generated or interpolated waveforms).
  const outputIntervals = Math.min(sampleCount, steps);
  const samples = Array.from({ length: outputIntervals + 1 }, (_, i) => fullBeat[Math.round(i * steps / outputIntervals)]);
  return { parameters: { ...parameters }, samples, metrics: summarize(fullBeat, model.period), diagnostics, period: model.period };
}
