# CardioLab user and animation guide

CardioLab combines an educational 0D circulation model with a provisional atlas
viewer. It is intended for exploring implemented mechanisms, software and
visualization. Neither the anatomy nor the model is clinically validated.

## Language and navigation

The first visit uses English. Use **EN / KO** to change the interface language;
the preference is saved in browser storage when available. A language change
preserves the experiment, selected structure, camera and playback state. Korean
and English versions use the same numerical data, units and structure IDs.

The upper lab controls define the experiment. The 3D viewer explores anatomy and
illustrative flow/motion; the charts and circulation circuit describe the
computed state. A WebGL-capable browser is required for 3D. If a fresh clone has
no model, follow `npm run setup:assets` in the [README](../README.md).

## Set up an experiment

Choose a scenario, then adjust the numeric controls. Each change asks a Web
Worker to solve a new closed-loop periodic equilibrium. It does not advance an
ongoing patient's treatment or simulate chronic remodeling. While recalculation
is pending, stale results are hidden. Numerical failure and unsupported model
combinations must be resolved before interpreting the output.

| Scenario | Implemented change | What the name does not establish |
| --- | --- | --- |
| Baseline | Estimated reference parameters | A clinical normal range or a patient measurement |
| HFrEF | Reduced LV peak active elastance | Chronic remodeling, neurohormonal compensation or every HFrEF phenotype |
| HFpEF stiffness phenotype | Increased passive LV stiffness | Full HFpEF physiology or delayed active relaxation |
| Aortic resistance | Increased linear aortic-valve flow resistance | Measured orifice area, a Bernoulli jet or clinical stenosis grade |
| Mitral regurgitation | Reverse mitral conductance under a reverse pressure gradient | A particular leaflet lesion, prolapse or chordal rupture |

The mechanism-strength control interpolates the chosen change. At zero strength,
scenarios share baseline dynamics. Other controls change rate, LV contractility,
LV passive stiffness, systemic resistance and total blood volume. Refer to
[the model specification](physiology-model.md) for exact equations, ranges,
constants and warnings. Arbitrary parameter combinations need not preserve a
scenario's usual clinical EF category.

## Read charts and values

Play or pause the cardiac cycle, adjust speed, use the time slider, or select a
chart point. The pressure–volume loop, pressure/volume/valve-flow views, circulation
arrows, numbers, heart, leaflets and particles use one committed sample. Scrubbing
returns the particle timeline to that time in the first recorded cycle. Repeated
playback accumulates transported volume across cycles.

Pressures are in mmHg, volumes in mL and flows in mL/s. Forward cardiac output is
reported in L/min. Volume-based stroke volume and EF describe ventricular volume
change; forward output describes blood delivered across the outlet. In a
regurgitant experiment those measures differ. The model separately integrates
negative mitral flow and reports regurgitant volume/fraction. A negative pulmonary
venous flow value is not automatically mitral regurgitation.

A converged solution means successive beat boundaries meet a numerical
criterion. It does not prove physiology, anatomy or clinical validity. The model
checks finite positive volumes, closed-loop blood-volume conservation, numerical
refinement and selected qualitative responses. Parameters are engineering
estimates, not fitted human measurements. ECG and 3D fluid dynamics are absent.

## Inspect anatomy

Select a structure in the list or on the model. Exterior, interior and coronary
views provide different subsets. Focus/isolating controls, individual hiding,
opacity, labels and clipping help inspect overlapping structures. Drag to rotate,
scroll to zoom and right-drag to pan; use reset to restore the view. Camera
orientation labels follow inferred source axes and still need expert review.

The three material presets are display styles, not measured tissue properties or
photographic textures. Clipping reveals the existing surfaces and does not fill
cut edges with invented tissue. Open vessel ends and unclosed surfaces may be
visible. Turning motion off restores the unchanged source mesh.

The local HRA conversion selects 14 heart and 30 vasculature nodes in the same
source coordinate system. No source surface is smoothed or anatomically repaired.
Blender removes 18 duplicate-index faces; 835 zero-area faces remain. The output
retains source scale and has known label conflicts. The LAD ontology association
and an anterior papillary muscle's chamber association remain unresolved. No
independently labeled LCx, verified chordae, epicardial fat or measured wall
thickness is provided. See [the HRA notice](../assets/licenses/heart-hra.md) and
[the original review record](ANATOMICAL_VALIDATION.md) for detailed provenance.

## Inspect contraction and relaxation

Enable heart/valve motion and compare the end of LV filling and ejection. Motion
also continues when blood-flow particles are hidden. A single shared deformation
field moves the chamber surfaces, coronary structures and flow-guide geometry.
Camera manipulation does not restart the cycle. Pausing and returning to a time
reproduce the same pose.

For each chamber, the display shortening weight uses its recorded maximum
volume, `c = clamp(1 − V/Vmax, 0, 1)`. RV and LV twisting weights also multiply
shortening by the square root of ventricular activation. A weaker contraction is
not stretched to the baseline animation amplitude. Activation-dependent untwisting
allows illustrative recoil before ventricular filling.

The spatial function blends six targets: RA, LA, RV and LV shortening, plus RV and
LV torsion. It uses estimated source axes and display coefficients. Valve
bounding boxes are fixed with a smooth surrounding collar. Consequently the
model does not reproduce measured annular translation or descent. The atlas's
acquisition phase is unknown: it is only an expanded graphic reference, not a
verified end-diastolic image from the same subject as the numerical model.

The motion is **not** a mechanics solver. It does not preserve myocardial mass,
wall incompressibility or measured lumen volume, and does not compute strain,
wall thickness, fiber mechanics, stress, tissue contact or patient-specific
motion. Positive sampled deformation Jacobians are a local numerical check,
not a guarantee against all intersections or an anatomical approval.

## Inspect the four valves

Use the valve view or an individual valve's focus control. The animated leaflets
are newly generated explanatory surfaces because the static source does not
supply separately rigged leaflets. Switching motion off restores the source
valves.

| Valve | Forward direction | Display leaflet count |
| --- | --- | ---: |
| Mitral (MV) | LA → LV | 2 |
| Tricuspid (TV) | RA → RV | 3 |
| Aortic (AV) | LV → aorta | 3 |
| Pulmonary (PVvalve) | RV → pulmonary artery | 3 |

Each valve opens only when its own computed forward flow and upstream-minus-
downstream pressure gradient are positive. Its graphic opening is proportional
to `sqrt(clamp(Q/Qpeak, 0, 1))`, where `Qpeak` is that valve's maximum forward
flow during the recorded beat. The hinge angle reaches `0.44π` radians at full
graphic opening. These are display choices, not measured valve kinetics. Normal
AV and outflow valves therefore do not share an independent all-open oscillator.

In the MR experiment, negative mitral flow under reverse pressure produces a
small coaptation gap rather than normal forward opening. Its radial fraction is
`0.035 + 0.13s` for nonzero mechanism strength `s`, and zero at `s = 0`. It is an
illustrative distinction, not an estimated regurgitant orifice. There is no
additional stenosis aperture restriction: the AS surrogate changes resistance
and computed flow, not measured opening area.

The surfaces have fixed hinges and no measured thickness, chordae, leaflet
inertia, tissue contact or fluid–structure interaction. Being inside the source
valve bounds does not prove correspondence to source anatomy or freedom from
surrounding-tissue intersections. Do not use normalized opening sizes to compare
clinical stenosis severity across experiments.

## Inspect blood flow

Enable blood flow, choose both/right/left circulation, set particle density and
show or hide guide lines. A transparent anatomy context can expose otherwise
hidden routes. Structure hiding and clipping apply to relevant routes; isolated
structure and coronary views suppress the complete circulation paths. Particles
do not intercept anatomy selection.

Twelve illustrative routes join source-based landmarks through the circulation.
Particle travel integrates the signed 0D flow, rather than using an unrelated
constant speed. Near-zero flow stops transport; a negative signal reverses it.
Mitral reverse flow is highlighted separately. Both branches at a split are
visual representations, not a solved regional distribution. A single committed
sample supplies phase and accumulated particle time to all views.

Route centerlines deform with the heart. Particle offsets around those paths
remain graphic values. Their size, spread, density, speed scale and trails are
visual aids: they do not represent true blood-cell size, volumetric particle
counts, measured speed, streamlines or a 3D velocity field. Lumen containment and
collision avoidance have not been validated.

## Review and reproducibility

The English [physiology specification](physiology-model.md) contains primary
references and the full numerical contract. Detailed historical feature records
are preserved in [cardiac-motion-validation.md](cardiac-motion-validation.md)
and [blood-flow-validation.md](blood-flow-validation.md), primarily in Korean.
They distinguish automated tests, browser observations, blocked GUI inspection
and outstanding expert review. Local screenshots referenced there are excluded
from this public source repository.

Original source-license permission and CardioLab release approval are separate.
The manifest remains `internal-only` / `unreviewed`; no reviewer is inferred from
upstream creator metadata. Expert review must identify the exact asset hash,
reviewer, date, evidence, errors, corrections and approved scope. The current
`npm run verify:release` must fail. Publishing source code does not turn the
model into an approved medical or educational anatomical asset.

## Troubleshooting

- **3D model missing:** run `npm run setup:assets`, then `npm run verify:assets`.
  A source-only clone does not contain GLB files.
- **Blender executable missing:** set `BLENDER_BIN` to the full path of the
  Blender 4.5 LTS executable. Background generation needs no open Blender window.
- **Blender lock occupied:** normally stop the other client's project MCP
  connection before retrying. Do not delete the lock or kill an unrelated GUI.
- **Recalculation or unsupported values:** wait for the Worker, return to baseline
  or reduce extreme parameter combinations. Hidden stale output is intentional.
- **Animation paused initially:** the browser's reduced-motion preference disables
  autoplay. Manual play remains available.
- **Language preference not retained:** browser storage can be disabled or private.
  Switching still works in the current session; a new visit falls back to English.
- **Build warning about bundle size:** the 3D dependency bundle is substantial.
  A successful build does not establish target-device frame rate or thermal
  performance; those need separate measurements.
