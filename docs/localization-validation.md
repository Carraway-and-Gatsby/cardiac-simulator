# English/Korean interface and public source verification

Date: 2026-10-23. This record covers interface localization and source publication,
not anatomical approval or clinical validation.

## Language behavior

English is the explicit first-visit default, regardless of browser language.
The header EN/KO buttons change the interface and `html.lang`; the selected
language is saved locally when browser storage is available. If storage is
unavailable, switching still works for the current session. Switching does not
recreate the simulation, change parameters, reset the selected time, or rebuild
source geometry.

Translations cover scenario explanations, all six parameter controls, metrics,
phase descriptions, 44 structure labels and caveats, camera/material controls,
heart and valve motion, flow settings, all charts and circuit labels, SVG titles
and descriptions, accessible control labels, loading/error fallbacks, numerical
warnings, methods and limitations. Identifiers, units, citations and original
source anatomical nomenclature retain their original forms.

## Executed verification

| Check | Result |
| --- | --- |
| `npm run check` | Passed: assets/config, 65 tests, TypeScript and production build |
| Localization tests | 8 passed: English default, saved preference resolution, chart coverage, all 44 structures, diagnostics and scenario/parameter translations |
| Public source copy | `npm ci`, `npm run check:source`, `setup:local` and `verify:config` passed in a new temporary checkout without GLB files or private MCP configuration |
| English content | No Hangul found in rendered page text, accessible names/values, SVG titles/descriptions or select options with methods expanded |
| Switch preservation | Selected valve, paused sample 123, input values/visibility, chart signal and 0.25× speed retained across EN→KO |
| Saved preference | Reload after selecting KO retained Korean and the Korean document title |
| Domain warnings | Extreme HFrEF produces both model-domain warnings in KO, then the complete English messages when switched; no Hangul remains in the English visible page |
| Small screen | EN and KO at 390×844: document width 390, controls remain inside the viewport |
| Numerical model | Engine file and preset metrics unchanged; numerical report regenerated to include current translation-bearing parameter-file hashes |
| Assets | Manifest and original GLBs unchanged; no approval status updated |
| `verify:release` | Expected failure: anatomy/distribution approval and signed review evidence remain absent |

Local screenshots and command logs are in ignored `.local/i18n-evidence/`.
The 3D bundle-size and upstream `THREE.Clock` deprecation warnings remain;
translation changes do not resolve those pre-existing warnings.

The public repository contains MIT-licensed original source and separately
attributed HRA-derived metadata. Downloaded/generated anatomical binaries,
machine-specific assistant configuration, caches and local evidence are excluded.
See [the source-release guide](public-source-release.md) for reproducible local
asset setup and the separate asset approval gate.

The live Blender scene was read successfully through the guarded project MCP
launcher: Blender 4.5.12 LTS, unsaved default scene, Cube/Light/Camera. No GUI or
bpy modifications were made, so Blender generation checks were not rerun.
No expert anatomy, physiology, motion or valve review was performed.
