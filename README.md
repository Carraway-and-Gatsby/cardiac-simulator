# CardioLab · Cardiovascular Physiology Lab

**[English](README.md) · [한국어](README.ko.md)**

An interactive educational cardiovascular lab with a 3D anatomy viewer, a
closed-loop numerical circulation model, synchronized blood flow, cardiac motion
and valve animation. Built with React, TypeScript, Three.js and a reproducible
Blender pipeline. The interface defaults to **English**, with an **EN / KO**
switch and a saved language preference.

**[Open the browser demo](https://carraway-and-gatsby.github.io/cardiac-simulator/)**
— no installation, account or API key required. Use a browser with WebGL support
to explore the 3D heart, blood flow and synchronized valve animation.

**This is an educational software prototype, not a clinically validated
simulator.** The HRA atlas, educational deformation and reconstructed leaflets
have not received project anatomical approval. The public demo presents this
unreviewed prototype for exploration; it is not an approved anatomical reference
or a tool for clinical decisions. Generated anatomical binaries are distributed
with the demo as a GitHub Pages artifact, and remain excluded from Git history.

## Run locally

Requirements: Node.js from [`.nvmrc`](.nvmrc), npm, Python 3, and **Blender 4.5 LTS**
for local anatomical asset generation. The numerical engine and source tests do
not require Blender. The shared Blender launcher currently supports macOS/Linux
file locking; Windows users can use a supported POSIX development environment.

```bash
git clone https://github.com/Carraway-and-Gatsby/cardiac-simulator.git
cd cardiac-simulator
npm ci
npm run check:source
```

To run the complete 3D viewer, install Blender 4.5 LTS, set its executable path
when necessary, then acquire and build the local assets:

```bash
# macOS example; on Linux, use the absolute path to your Blender executable.
export BLENDER_BIN="/Applications/Blender 4.5 LTS.app/Contents/MacOS/Blender"
npm run setup:assets
npm run dev
```

Open the localhost URL printed by Vite. `setup:assets` downloads two versioned
**CC BY 4.0 HRA sources**, verifies their pinned SHA-256 hashes, generates the
three owned scenes in a separate background Blender process, and verifies the
outputs. Downloads remain in ignored `.local/anatomy-sources/`; generated GLBs
and `.blend` files are also ignored by Git. The Pages workflow builds its own
demo assets from the same pinned sources. No API key or clinical dataset is needed.
The acquisition command refuses to overwrite an existing source with a different
hash. Use `python3 scripts/acquire-anatomy.py --verify-only` for an offline source
check. A source-only build can pass before assets exist, but rendering the 3D
viewer requires the asset setup above.

If a project Blender MCP connection owns the shared lock, shut it down normally
before generating assets. Do not delete or bypass the lock. See
[the source-release guide](docs/public-source-release.md) for setup, omitted
files, license boundaries and release checks.

## Explore the lab

- Choose a baseline or a mechanism: impaired contractility (HFrEF), a passive
  stiffness phenotype (HFpEF), aortic resistance or mitral regurgitation. Adjust
  heart rate, contractility, stiffness, systemic resistance, blood volume and
  mechanism strength. A Web Worker computes a new periodic equilibrium.
- Play, pause or inspect a point on the pressure–volume loop, pressure, volume or
  valve-flow charts. The 3D heart, leaflets, particles, circuit and numeric values
  share that sample. Parameter changes start a new experiment rather than a
  continuous treatment response.
- Inspect 44 source structures in exterior, interior and coronary views. Select,
  isolate, hide, adjust opacity, clip, show labels, rotate, zoom, pan and reset.
  Tissue, teaching and neutral colors are illustrative material presets.
- Compare the end of LV filling and ejection. Four chambers shorten and relax,
  ventricles show illustrative twisting, and coronary structures and flow guides
  follow the same deformation. Each of the four valves uses its own forward-flow
  and pressure-gradient signal; mitral reverse flow produces a distinct small
  coaptation gap. Focus a valve to inspect its leaflets.
- Toggle heart/valve motion off to restore the static source geometry. Hide flow
  while keeping the heart animated, or filter flow to the right or left
  circulation. Set particle density, guide visibility and playback speed.
- Switch between English and Korean without resetting the experiment. Automatic
  playback respects the browser's reduced-motion preference.

Read the [English user and animation guide](docs/user-guide.md) for controls,
interpretation, motion equations, limitations and troubleshooting.

## Scientific scope

| Layer | Implemented | Important limits |
| --- | --- | --- |
| Anatomy | 44 complete source nodes from HRA male heart/vasculature v1.3, preserved source scale and correspondence | A static Visible Human-based atlas reconstruction; not this project's CT segmentation, a universal normal heart or approved anatomy |
| Circulation | Eight blood-volume compartments, time-varying elastance, exponential passive ventricular pressure, resistances/compliances, signed valve flows, RK4 and periodic convergence | Estimated parameters; no patient calibration, autonomic regulation, electrophysiology or external waveform validation |
| Cardiac motion | Volume/activation-driven continuous display deformation, synchronized coronary and flow-guide motion | No measured strain, wall incompressibility, lumen-volume matching, tissue stress or patient-specific motion |
| Valves | Two mitral and three tricuspid/aortic/pulmonary educational leaflets, forward opening and a separate MR gap | Reconstructed surfaces; no source leaflet segmentation, chordae, contact mechanics, inertia, measured orifice area or stenosis grading |
| Blood flow | Twelve illustrative routes driven by integrated signed 0D flow | No CFD, measured velocity field, verified lumen containment or physically scaled blood cells |

The [physiology model](docs/physiology-model.md) documents equations, all numerical
defaults, units, assumptions, disease transformations, integration and metric
definitions in English. The [generated numerical report](docs/physiology-validation.json)
records code hashes and reproducible regression results. Asset provenance and
known defects are retained in [the HRA notice](assets/licenses/heart-hra.md),
[acquisition specification](assets/sources/heart-hra.json) and
[manifest](assets/manifest.json).

Numerical correctness, plausible mechanism responses, anatomical correctness and
clinical validity are different questions. The application blocks output for
known unsupported parameter combinations; a converged result alone does not
establish physiological or clinical validity. Expert anatomical, motion and
physiology review remains outstanding.

## Development and checks

```bash
npm run check:source        # Public source audit, tests, types and production build
npm run setup:local         # Optional local Codex/Claude MCP configuration
npm run check               # Full local checks, including assets and MCP config
npm run test:physiology     # Conservation, response, convergence and refinement
npm run test:flow           # Routes, signs, stasis, integration and cycle boundaries
npm run test:motion         # Deformation, leaflets, geometry, picking and restoration
npm run validate:physiology # Regenerate the numerical report with source hashes
npm run blender:check       # Actual Blender generation, preservation and reimport checks
npm run verify:assets       # Check local assets and manifest integrity
npm run verify:release      # Expected failure: current assets lack expert/release approval
npm run build:pages         # Build /cardiac-simulator/ and stage the audited demo artifact
npm run verify:pages        # Recheck .local/pages, model provenance and included notices
npm run licenses            # Dependency license inventory from lockfile and install
npm run preview             # Serve the production build locally
```

`setup:local` creates missing local MCP configurations and preserves existing
ones. Both clients must use `scripts/blender-mcp.py`; only one may own the shared
connection at a time. The app itself needs neither an AI client nor MCP. Background
asset generation does not open or overwrite the live GUI scene.

The source CI checks software without downloading anatomical binaries. The
separate Pages workflow builds the public demo from hash-pinned HRA sources with
Blender 4.5 LTS, checks source and generated-asset integrity, and publishes the
web build with attribution and license notices. Only the HRA model used by the
viewer is included in the demo; the legacy schematic and procedural assets, raw
downloads and `.blend` scenes are omitted.

This public demonstration does not satisfy the separate expert-reviewed release
gate: `verify:release` must still fail. Approval records remain unchanged, and
passing software checks does not establish anatomical or clinical accuracy.
Changing bpy requires `blender:check` and `verify:assets`. See
[CONTRIBUTING.md](CONTRIBUTING.md) for translation, scientific-change and review
requirements. Historical validation and handoff logs, including Korean records,
remain in `docs/`; their local screenshot/log references are not public artifacts.

## Repository layout

```text
src/                  Bilingual React UI, 3D viewer, Worker and source metadata
src/simulation/       Rendering-independent numerical model
src/motion/           Cardiac deformation and reconstructed leaflet functions
src/flow/             Educational routes and signed-flow integration
blender/scripts/      Reproducible bpy generation and validation
scripts/              Acquisition, local setup, verification and shared MCP lock
assets/               Source/license evidence and unapproved asset manifest
tests/                Numerical, motion, flow, geometry and coordination checks
docs/                 Model equations, user guide, provenance and validation records
public/models/        Generated GLBs (excluded from Git; HRA model used by Pages)
blender/generated/    Locally generated .blend files and reports (excluded from Git)
.local/               Local source caches, backups and evidence (excluded from Git)
```

## License and attribution

Original code, tests, scripts, translations and documentation are available under
[MIT](LICENSE). HRA-derived material retains **CC BY 4.0**; dependencies retain
their upstream licenses. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for
creators, citations, modifications and notices. Open-source publication does not
change the manifest's pending `internal-only` / `unreviewed` approval records or
imply endorsement by HRA, HuBMAP or source reviewers. The specifically authorized
public demo and the still-blocked expert-reviewed release are documented in
[the publication guide](docs/public-source-release.md).
