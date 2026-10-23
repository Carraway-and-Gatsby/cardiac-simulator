# CardioLab: closed-loop educational physiology model

This increment adds an explicit numerical model to the existing provisional anatomical viewer. It is an original, simplified educational implementation. It has passed conservation, numerical and qualitative mechanism checks; it has **not** been calibrated to patients, compared with an external waveform dataset, independently reviewed by a cardiovascular expert, or clinically validated. Anatomical asset approval and physiological verification are separate.

## Implementation and scientific basis

`src/simulation/engine.ts` contains pure TypeScript computation, independent of React, Three.js and mesh geometry. `types.ts` defines the state/result contract; `parameters.ts` defines the controls, scenario transformations and limitations. The same engine runs in a browser Worker and Node tests. Pressure, volume, flow and activation plotted in the application come from one recorded numerical beat.

The model classes follow established lumped-parameter practice: time-varying chamber mechanics, resistive/compliant systemic and pulmonary circuits, and conservation at every compartment. Korakianitis and Shi describe four-chamber cardiovascular models and more detailed valve dynamics; their complete implementation is **not** reproduced here. [Korakianitis & Shi, 2006, Journal of Biomechanics](https://doi.org/10.1016/j.jbiomech.2005.06.016).

A four-chamber circulation with CRC vascular compartments and directional resistive valves is also used in a more recent sensitivity study. That study includes baroreflex regulation; this implementation intentionally has no autonomic regulation. [Tlałka et al., PLOS Computational Biology](https://doi.org/10.1371/journal.pcbi.1012377).

Ventricular passive pressure is exponential, allowing increased filling stiffness to change the pressure–volume curve rather than merely relabeling an animation. Computational work on diastolic dysfunction distinguishes passive stiffness from delayed active relaxation and emphasizes that HFpEF is heterogeneous. The present HFpEF scenario represents only a passive-stiffness phenotype and does not reproduce that paper's arterial network, relaxation delays or parameter calibration. [Kadry et al., 2020](https://doi.org/10.1152/ajpheart.00172.2020).

Closed-loop studies also show that circulatory properties affect the consequences of depressed contractility. The magnitude of filling-pressure changes cannot be inferred from LV contractility alone, particularly without compensatory mechanisms. [Burkhoff & Tyberg, 1993](https://pubmed.ncbi.nlm.nih.gov/8238596/), [Magder et al., 2009](https://doi.org/10.1152/japplphysiol.90618.2008).

These sources support the equation classes and mechanistic expectations. **Every numerical default below is an engineering estimate**, not an extracted experimental measurement, a patient fit, or a published parameter set. Broad regression acceptance bands are developer checks, not clinical reference intervals. No clinical normal-range claim is made from the baseline numbers.

## State, topology and units

The eight state variables are blood volumes in LA, LV, systemic arteries (SA), systemic veins (SV), RA, RV, pulmonary arteries (PA), and pulmonary veins (PV). All volumes are in mL, pressures in mmHg, time in seconds, flow in mL/s, compliance in mL/mmHg, and resistance in mmHg·s/mL. Reported cardiac output is converted to L/min. EF and regurgitant fraction are stored as fractions, not percentages.

```text
PV → LA → mitral → LV → aortic → SA → systemic resistance → SV
↑                                                            ↓
pulmonary bed ← PA ← pulmonary valve ← RV ← tricuspid ← RA ← venous return
```

With signed edge flows, each compartment follows `dV/dt = Qin − Qout`. For example:

```text
dV_LA/dt = Q_pulmonaryVenous − Q_mitral
dV_LV/dt = Q_mitral − Q_aortic
dV_SA/dt = Q_aortic − Q_systemic
dV_SV/dt = Q_systemic − Q_systemicVenous
dV_RA/dt = Q_systemicVenous − Q_tricuspid
dV_RV/dt = Q_tricuspid − Q_pulmonary
dV_PA/dt = Q_pulmonary − Q_pulmonaryBed
dV_PV/dt = Q_pulmonaryBed − Q_pulmonaryVenous
```

Each edge is evaluated once and reused with equal and opposite signs. Thus the sum of derivatives is zero algebraically. In MR, negative mitral flow simultaneously removes blood from LV and adds the same blood to LA; there is no external sink or artificial regurgitant reservoir.

## Pressure and flow equations

Let `T = 60/HR`, `φ = (t mod T)/T`, and `x = V − V0`. Ventricular activation is a double cosine:

```text
a_v(φ) = 0.5[1 − cos(πφ/0.30)]                     0 ≤ φ < 0.30
         0.5[1 + cos(π(φ−0.30)/(0.45−0.30))]       0.30 ≤ φ < 0.45
         0                                         otherwise
```

Atrial activation is `a_a(φ)=0.5[1−cos(2π(φ−0.78)/(0.96−0.78))]` for `0.78≤φ<0.96`, and zero otherwise. Both atria and both ventricles share their respective activation functions. Phase zero is the onset of ventricular activation; this is a prescribed mechanical clock, not an electrophysiological simulation. Fixed fractional timing is an approximation, particularly at different heart rates.

For each ventricle:

```text
P_active(V)  = Emax (V − V0)
P_passive(V) = A [exp(B(V − V0)) − 1]
P(V,t)      = a_v(t) P_active(V) + [1−a_v(t)] P_passive(V)
```

For each atrium: `P(V,t)=[Emin+(Emax−Emin)a_a(t)](V−V0)`. For a vascular compartment: `P=(V−V0)/C`. Passive vascular flows obey `Q=(Pup−Pdown)/R`, including signed venous flows. No pressure clipping is applied. Positive volume is required; a pressure relative to the chosen reference need not be positive.

Competent valves are ideal resistive diodes: `Q=max(ΔP,0)/R`. For the mitral valve in MR, `Q=ΔP/R_mitral` when `ΔP≥0`, and `Q=G_reverse ΔP` when `ΔP<0`. These equations have no leaflet inertia, Bernoulli jet relation, effective orifice area, or closing-volume model. AS is explicitly a linear resistive obstruction surrogate.

## Numerical defaults and assumptions

All entries in these tables are estimated model design choices. Values are declared together in `modelConstants`, and the generated JSON report records their exact values and source hashes.

| Chamber | V0 (mL) | Emax (mmHg/mL) | Emin (mmHg/mL) | A (mmHg) | B (1/mL) |
|---|---:|---:|---:|---:|---:|
| LV | 10 | 2.20 | — | 0.30 | 0.027 |
| RV | 10 | 0.65 | — | 0.30 | 0.023 |
| LA | 10 | 0.28 | 0.12 | — | — |
| RA | 10 | 0.20 | 0.08 | — | — |

| Vascular compartment | V0 (mL) | Compliance (mL/mmHg) |
|---|---:|---:|
| SA | 700 | 1.5 |
| SV | 2600 | 100 |
| PA | 100 | 5 |
| PV | 300 | 20 |

| Flow path | Resistance (mmHg·s/mL) |
|---|---:|
| Systemic arterial bed | 1.000 |
| Pulmonary arterial bed | 0.100 |
| SV → RA | 0.030 |
| PV → LA | 0.020 |
| Mitral forward | 0.008 |
| Aortic forward | 0.015 |
| Tricuspid forward | 0.008 |
| Pulmonary valve forward | 0.010 |

Initial reference volumes `[LA,LV,SA,SV,RA,RV,PA,PV]` are `[50,125,850,3100,55,110,175,535]` mL, summing to 5000 mL. Changing total blood volume adds/removes volume in the initial SV reservoir, then the whole system equilibrates. To avoid an artificial large-pressure initial transient with a stiff LV, its initial stressed volume is multiplied by `B_baseline/B_effective`; the opposite volume difference is transferred to SV. This preserves initial passive LV pressure and total blood volume. Initial values are not displayed as the final model state.

| User parameter | Baseline | Allowed interval | Interpretation |
|---|---:|---:|---|
| HR | 75 bpm | 50–120 | Prescribed rate, no baroreflex |
| Contractility | 1× | 0.6–1.4× | LV Emax multiplier |
| Diastolic stiffness | 1× | 0.7–1.5× | LV B multiplier |
| Systemic resistance | 1× | 0.6–1.6× | Systemic bed R multiplier |
| Total blood volume | 5000 mL | 4500–5500 | Closed-loop inventory |
| Mechanism strength s | 0.7 | 0–1 | Scenario interpolation, not a clinical grade |

## Scenario transformations

At `s=0`, every scenario returns exactly to the same baseline dynamics. A scenario modifies the current user-adjusted parameters; it does not substitute a prerecorded waveform.

| Scenario | Transformation | Scope |
|---|---|---|
| Baseline | No disease multiplier | Estimated resting reference state |
| HFrEF | `Emax_LV *= (1−0.7s)` | Impaired systolic function without remodeling or compensation |
| HFpEF stiffness phenotype | `B_LV *= (1+1.1s)` | Increased passive stiffness; Emax unchanged; no active relaxation delay |
| Aortic stenosis | `R_aortic *= (1+14s)` | Resistive obstruction; no valve area or clinical grading |
| Mitral regurgitation | `G_reverse = 2.5s mL/(s·mmHg)` | Signed reverse mitral flow and conserved regurgitant volume |

Scenario names indicate the implemented mechanism. Arbitrary user combinations need not retain a disease's usual EF category. The baseline HFrEF and HFpEF presets meet their stated EF behavior in regression tests; this does not establish a clinical diagnosis or reproduce all phenotypes.

## Integration, equilibration and output definitions

Integration uses fixed-step classical RK4. The maximum default step is 0.001 s; actual `dt=T/ceil(T/requestedStep)` divides each beat exactly. Accepted step requests are 0.000125–0.002 s. Each RK intermediate state and completed state must have finite, positive volumes; failure throws an error. There is no silent clipping, renormalization or mass correction.

The engine advances at least 12 beats, then checks the maximum absolute compartment-volume difference at consecutive beat boundaries. Equilibration requires `<0.001 mL`, with a default upper bound of 160 beats (configurable from 1–200, with consistent minimum). If it cannot settle within the limit, `converged=false` and a warning remain visible. One subsequent full beat supplies the metrics and plots. Default plots contain 401 actual integrated points including both endpoints; metric integration uses every numerical step. All array sizes and loops are bounded for Worker execution.

`EDV` and `ESV` are operationally the maximum and minimum LV volume in that recorded beat. Volumetric `SV=EDV−ESV`; `EF=SV/EDV`. `lvEndDiastolicPressure` is specifically LV pressure at phase zero, immediately before activation, rather than the pressure at the maximum-volume sample. Those moments may differ, especially with MR. Forward SV is the time integral of aortic flow; `CO=forwardSV×HR/1000`. Pulmonary forward SV is independently integrated to test serial flow balance.

Regurgitant volume is `∫max(−Q_mitral,0)dt`. Regurgitant fraction is `regurgitantVolume/(forwardAorticVolume+regurgitantVolume)`. The reported aortic gradient is `P_LV−P_SA`; its mean is time-averaged only while forward aortic flow is present. It is not a Doppler-derived clinical gradient. Pressure means and flow integrals use the trapezoidal rule on all integration samples.

## Supported interpretation domain

Numeric convergence is **not** sufficient for physiological interpretation. If the passive ventricular curve exceeds the peak active relation at a sampled volume, activation in the convex interpolation would lower pressure at fixed volume. That combination lies outside this model's supported domain. Simultaneous forward AV and semilunar flow also invalidates the usual interpretation that volume-extremum SV describes all ventricular throughput. Both conditions set `modelWithinDomain=false`, with explicit diagnostic reasons; the application must withhold physiological plots and interpretation for that result.

The diagnostics record the minimum active-minus-passive pressure margin and the fraction of the beat with simultaneous forward valves on each side. This check preserves the original equations instead of silently forcing results into a plausible-looking shape. The regression includes the concrete unsupported combination: HFrEF, s=1, HR=120, contractility=0.6×, stiffness=1.5×, systemic resistance=1.6×, blood volume=5500 mL. It converges and conserves volume but fails the interpretation-domain check. User-control limits are numerical input limits, not a promise that their Cartesian product is physiologically supported.

## Reproducible verification and observed results

Run `npm run test:physiology` for the 16 regression tests, and `npm run validate:physiology` to regenerate `docs/physiology-validation.json`. The underlying commands are `node --experimental-strip-types --test tests/simulation.test.ts` and `node --experimental-strip-types scripts/validate-physiology.ts`, supported by the project's Node 22 runtime. The report includes engine, type, parameter, test and report-script SHA-256 hashes, the complete parameter schema, exact presets, perturbations, step-refinement errors and the exhaustive 160-corner numerical sweep. Changing the engine requires regenerating this report; its numbers are executed model outputs, not constants displayed by the application.

Observed baseline-control results from this implementation (rounded; disease strength 0.7):

| Scenario | Forward CO (L/min) | LV EDV/ESV (mL) | Volumetric EF | Mean LA pressure (mmHg) |
|---|---:|---:|---:|---:|
| Baseline | 5.458 | 135.43 / 62.66 | 53.73% | 6.39 |
| HFrEF | 4.542 | 157.65 / 97.09 | 38.41% | 10.25 |
| HFpEF stiffness phenotype | 4.020 | 102.33 / 48.73 | 52.38% | 14.07 |
| Aortic obstruction | 5.176 | 143.31 / 74.30 | 48.15% | 7.50 |
| Mitral regurgitation | 4.857 | 149.46 / 47.16 | 68.45% | 9.28 |

Baseline systemic arterial pressure is approximately 116/77 mmHg. MR has approximately 37.54 mL reverse flow per beat and a 36.70% regurgitant fraction: its higher volumetric EF coexists with lower effective systemic output. These are model outputs, not patient observations.

All five presets converge and remain inside the supported interpretation domain. The 1 ms versus 0.5 ms refinement tests require relative error below 0.2% for CO, EDV, ESV, EF, MAP, peak LV pressure and peak aortic gradient; the largest current preset error is approximately 0.0063%. The 160-corner sweep converges within 117 beats, with maximum total-volume drift below 1.3×10⁻¹⁰ mL; 22 combinations are explicitly flagged outside the interpretation domain. Tests verify local/global flow conservation, positive finite volumes, competent-valve direction, phase transitions, deterministic replay, preload/afterload responses, impaired contractility, stiff filling, AS gradients and MR volume balance. Corner tests establish numerical robustness and separately enumerate domain failures; they do not validate those unsupported combinations as physiology.

## Remaining scientific limitations

There is no reflex control, renal regulation, exercise response, chronic remodeling, pericardial/ventricular interaction, respiratory pressure, coronary circulation, oxygen transport, tissue energetics, electrophysiology, inertial valve dynamics, wave propagation or patient-specific anatomy–hemodynamics coupling. RA/RV and LA/LV mechanics are simplified and independent. Parameter identifiability, external calibration and uncertainty quantification remain unstudied. Time-varying elastance is a phenomenological chamber relation, not a myocardial material law. Changes in total blood volume represent independent re-equilibrated experiments, not the time course of an infusion or hemorrhage.

The visible heart remains an unreviewed anatomical illustration; any synchronized displacement, flow path or color is a schematic depiction of numerical state, not computed cardiac tissue mechanics or CFD. Anatomical expert review and redistribution rights remain governed separately by `docs/anatomy-and-licensing.md`.

Next scientific work should compare baseline waveforms against an openly licensed reference dataset, review assumptions with a cardiovascular expert, estimate parameter uncertainty, expand the valid domain with better ventricular constitutive behavior, and add nonlinear valve/orifice and relaxation mechanics only with corresponding evidence and tests.
