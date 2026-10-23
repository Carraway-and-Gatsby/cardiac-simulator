import type { SimulationResult, SimulationSample } from '../simulation/types.ts';
import type { FlowKey } from './paths.ts';

export const flowKeys = ['mitral', 'aortic', 'tricuspid', 'pulmonary', 'systemic', 'pulmonaryBed', 'systemicVenous', 'pulmonaryVenous'] as const satisfies readonly FlowKey[];

export interface FlowSignal {
  rates: Float64Array;
  cumulativeVolumes: Float64Array;
  cycleVolume: number;
  peakAbsoluteFlow: number;
}

export interface FlowTimeline {
  period: number;
  times: Float64Array;
  signals: Record<FlowKey, FlowSignal>;
}

/**
 * Build once per simulation result. Each signed mL/s signal is linearly
 * interpolated and integrated analytically over the recorded beat. These
 * volumes drive illustrative displacement, not inferred 3D flow velocity.
 * The endpoint-inclusive sample contract matches SimulationResult.samples.
 */
export function createFlowTimeline(result: Pick<SimulationResult, 'period' | 'samples'>): FlowTimeline {
  const { period, samples } = result;
  if (!Number.isFinite(period) || period <= 0 || samples.length < 2) throw new RangeError('A positive period and at least two flow samples are required.');
  if (samples[0].time !== 0 || Math.abs(samples[samples.length - 1].time - period) > period * 1e-9) {
    throw new RangeError('Flow samples must include time zero and the full period endpoint.');
  }
  const times = Float64Array.from(samples, sample => sample.time);
  times[times.length - 1] = period;
  for (let i = 0; i < times.length; i++) {
    if (!Number.isFinite(times[i]) || (i > 0 && times[i] <= times[i - 1])) throw new RangeError('Flow sample times must be finite and strictly increasing.');
  }
  const signals = {} as Record<FlowKey, FlowSignal>;
  for (const key of flowKeys) {
    const rates = Float64Array.from(samples, (sample: SimulationSample) => sample.flows[key]);
    if (rates.some(rate => !Number.isFinite(rate))) throw new RangeError(`Nonfinite flow signal: ${key}`);
    const cumulativeVolumes = new Float64Array(samples.length);
    let peakAbsoluteFlow = Math.abs(rates[0]);
    for (let i = 1; i < samples.length; i++) {
      cumulativeVolumes[i] = cumulativeVolumes[i - 1] + (rates[i - 1] + rates[i]) * (times[i] - times[i - 1]) / 2;
      peakAbsoluteFlow = Math.max(peakAbsoluteFlow, Math.abs(rates[i]));
    }
    signals[key] = { rates, cumulativeVolumes, cycleVolume: cumulativeVolumes[cumulativeVolumes.length - 1], peakAbsoluteFlow };
  }
  return { period, times, signals };
}

/**
 * Random-access sampling has no animation clock or frame-step state: pausing,
 * scrubbing, replay, and dropped frames yield the same positions. For ongoing
 * playback pass cycle * period + time; adding a beat adds its signed integral,
 * so particles do not jump back at the beat boundary. A negative signal moves
 * the same particles backwards (including MR and modeled venous reversal).
 */
export function sampleFlowAt(timeline: FlowTimeline, key: FlowKey, elapsedSeconds: number): { flow: number; cumulativeVolume: number } {
  if (!Number.isFinite(elapsedSeconds)) throw new RangeError('Flow playback time must be finite.');
  const cycle = Math.floor(elapsedSeconds / timeline.period);
  const time = elapsedSeconds - cycle * timeline.period;
  const { times } = timeline;
  const signal = timeline.signals[key];
  let lower = 0, upper = times.length - 1;
  while (upper - lower > 1) {
    const middle = Math.floor((lower + upper) / 2);
    if (times[middle] <= time) lower = middle;
    else upper = middle;
  }
  const dt = time - times[lower];
  const interval = times[upper] - times[lower];
  const slope = (signal.rates[upper] - signal.rates[lower]) / interval;
  return {
    flow: signal.rates[lower] + slope * dt,
    cumulativeVolume: cycle * signal.cycleVolume + signal.cumulativeVolumes[lower] + signal.rates[lower] * dt + slope * dt * dt / 2,
  };
}
