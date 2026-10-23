/** Internal units are mL, mmHg and seconds; reported CO is L/min. */
export const compartments = ['LA', 'LV', 'SA', 'SV', 'RA', 'RV', 'PA', 'PV'] as const;
export type Compartment = typeof compartments[number];
export type Chamber = 'LA' | 'LV' | 'RA' | 'RV';
export type ScenarioId = 'normal' | 'hfref' | 'hfpef' | 'aortic-stenosis' | 'mitral-regurgitation';

export interface SimulationParameters {
  scenario: ScenarioId;
  heartRate: number;
  /** Multiplier on baseline LV end-systolic elastance, before disease modifier. */
  contractility: number;
  /** Multiplier on baseline LV passive exponential stiffness, before disease modifier. */
  diastolicStiffness: number;
  /** Multiplier on baseline systemic vascular resistance. */
  systemicResistance: number;
  /** Total closed-loop blood volume (mL). */
  bloodVolume: number;
  /** Mechanism interpolation, 0–1; not a clinical severity grade. */
  severity: number;
}

export interface SimulationSample {
  /** Seconds from start of the recorded beat; phase 0 is ventricular activation onset. */
  time: number;
  phase: number;
  volumes: Record<Compartment, number>;
  pressures: Record<Compartment, number>;
  /** Signed mL/s; negative mitral flow denotes LV-to-LA regurgitation. */
  flows: {
    mitral: number; aortic: number; tricuspid: number; pulmonary: number;
    systemic: number; pulmonaryBed: number; systemicVenous: number; pulmonaryVenous: number;
  };
  activation: Record<Chamber, number>;
}

export interface SimulationMetrics {
  edv: number;
  esv: number;
  /** LV maximum minus minimum volume; includes regurgitant ejection in MR. */
  strokeVolume: number;
  /** Integrated forward aortic volume per beat (mL). */
  forwardStrokeVolume: number;
  /** (EDV − ESV)/EDV, as a fraction 0–1. */
  ejectionFraction: number;
  /** Net systemic aortic output (L/min), not volumetric LV output. */
  cardiacOutput: number;
  meanArterialPressure: number;
  systolicPressure: number;
  diastolicPressure: number;
  meanLaPressure: number;
  meanRaPressure: number;
  meanPulmonaryPressure: number;
  /** LV pressure at phase 0, immediately before ventricular activation. */
  lvEndDiastolicPressure: number;
  peakLvPressure: number;
  /** Reverse mitral volume divided by (forward aortic + reverse mitral volume). */
  regurgitantFraction: number;
  regurgitantVolume: number;
  peakAorticGradient: number;
  /** Mean LV−SA gradient during forward aortic flow, mmHg. */
  meanAorticGradient: number;
  pulmonaryStrokeVolume: number;
}

export interface SimulationDiagnostics {
  converged: boolean;
  /** False if active/passive interpolation or valve overlap prevents supported interpretation. */
  modelWithinDomain: boolean;
  minActivePassiveMarginMmHg: number;
  simultaneousLeftValveFlowFraction: number;
  simultaneousRightValveFlowFraction: number;
  cycles: number;
  periodicResidualMl: number;
  volumeErrorMl: number;
  minVolumeMl: number;
  stepSizeSeconds: number;
  warnings: string[];
}

export interface SimulationResult {
  parameters: SimulationParameters;
  samples: SimulationSample[];
  metrics: SimulationMetrics;
  diagnostics: SimulationDiagnostics;
  period: number;
}

export interface SimulationOptions {
  /** Maximum integration step; actual step divides the beat period exactly. */
  stepSize?: number;
  /** Maximum equilibration beats. Computation is always bounded. */
  maxCycles?: number;
  minCycles?: number;
  /** Maximum absolute beat-boundary volume difference across all compartments. */
  convergenceTolerance?: number;
  /** Number of intervals in the recorded beat; output includes both endpoints. */
  sampleCount?: number;
}
