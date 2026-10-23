# CardioLab implementation record — 2026-10-23

## 2026-10-23 심장 수축·이완 및 판막 개폐 추가

HRA 원본을 보존하면서 웹에 여섯 상대 변형 타깃(네 방 단축, 두 심실 비틀림)을 적용했다. 용적·활성도로 표시 자세를 정하며 관상혈관과 혈류 중심 경로가 같은 변형장을 따른다. 네 판막은 원본 위치에 별도로 만든 11개 얇은 교육용 판엽으로 개폐하고, 승모판 음수 유량은 전방 개방과 다른 접합 틈으로 표현한다. 원본 판엽 분할·실측 조직 역학이나 판구 면적을 계산한 결과는 아니다.

하나의 React 상태에 표본과 누적 주기를 함께 기록하여 심장·판막·입자·차트가 동일한 화면 시점을 사용한다. 혈류를 숨겨도 박동은 재생되고, 정지·시간 탐색·속도·판엽 확대·충만/박출 끝 비교·움직임 끄기를 지원한다. 끄면 원본 GLB 형상이 복원된다. 생리 엔진, GLB, manifest 및 승인 상태는 변경하지 않았다.

최종 `npm run check` 통과: Python 10 + 생리 16 + 혈류 9 + 모션 22 = **57개 테스트**, 자산·설정·형 검사·프로덕션 빌드. `verify:release`는 기존 미승인 상태로 예상 실패했다. 브라우저에서 수축/이완, 네 판막, 역류 틈, 정지·재탐색 이미지 동일성, 원본 복원, 숨김·불투명도·절단·선택·회전·확대·초기화 및 390px 화면을 확인했다. 브라우저 오류 없음; 기존 Three.Clock 폐기 예정 경고와 3D 번들 크기 경고는 남는다.

GUI 조회는 다른 클라이언트 잠금으로 차단되었다. GUI 작업과 bpy 변경이 없어 Blender 검사·생성을 재실행하지 않았다. 전문가·cine MRI/초음파·FSI/CFD 검수는 수행하지 않았다. [동작·과학적 범위·검증 기록](cardiac-motion-validation.md), 로컬 화면/명령 증거 `.local/motion-evidence/`를 참고한다.

아래는 이전 작업 이력이다.

## 2026-10-23 혈류 애니메이션 추가

정적 HRA 아틀라스에 12개 교육용 혈류 가이드를 겹치고 0D 유량의 부호 있는 적분으로 입자·잔광을 움직인다. 그래프·수치와 같은 샘플 및 공유 재생/정지/속도를 사용하며 승모판 역류와 모델 정맥 역방향 흐름을 보존한다. 투시, 좌/우 필터, 밀도, 가이드, 구조 숨김·초점·클리핑을 지원한다. 형상·생리 엔진·자산 승인 상태는 변경하지 않았다.

`npm run check` 통과(35개 테스트, 자산/설정/타입/빌드), `verify:release`는 미승인으로 예상 실패했다. 실제 브라우저에서 재생·정지·재탐색 재현성·역류·필터·절단·회전·확대·모바일을 확인했다. 현재 Blender GUI 조회는 다른 클라이언트 잠금으로 차단되어 수행하지 못했으며 GUI/bpy 수정은 없다. 전문가·실측 유동 검수는 수행하지 않았다. 자세한 증거와 한계는 [혈류 검증 기록](blood-flow-validation.md)을 참고한다.

아래는 이전 작업 이력이다.

## Latest increment: source-derived static anatomy

The default renderer now targets a **44-structure HRA atlas** assembled from
versioned male heart v1.3 and male blood-vasculature v1.3 source meshes. The
previous 18-structure procedural asset and four-sphere schematic remain in the
repository and guarded build. This replaces the arbitrary geometry as the
default source; it does not establish anatomical approval, complete anatomy,
specimen photorealism, or a validated normal adult heart.

The selected source contains four chamber tissue surfaces, ventricular septum,
four valves, five papillary muscle surfaces, 15 proximal great-vessel meshes and
15 coronary arterial/cardiac venous meshes: 267,360 selected source triangles,
267,342 delivered triangles after the documented importer exception below. Raw heart
bounds are 124.351 × 105.435 × 105.215 mm; the entire selected vascular scope is
124.351 × 184.978 × 128.761 mm. The HRA graph dimensions independently confirm
the native metre scale. These are atlas surfaces informed by the Visible Human
Male resource, not direct segmented CT/CTA delivered with aligned image labels.
The source subject is described as 38 years old; cardiac phase, per-feature
imaging fidelity and normality of this selected reconstruction are not confirmed.

New or updated anatomy paths:

- `assets/sources/heart-hra.json`, `scripts/acquire-anatomy.py`: official HTTPS
  distributions, fixed SHA-256/byte counts, cache-only acquisition under ignored
  `.local/anatomy-sources/`, and offline `--verify-only` checks. Raw assets are not
  committed, and a mismatching existing file is preserved for investigation.
- `src/data/heart-hra.json`: exact original source node per semantic ID,
  source labels/ontology, evidence category, scope, dimensions, known conflicts
  and explicit unreviewed status.
- `blender/scripts/build_hra.py`: separate owned `CardioLab_HRA` scene, selected
  whole source nodes, preserved coordinates/nonduplicate oriented faces, and round-trip geometric
  comparison. The common build now covers HRA, procedural and schematic scenes.
- `src/HeartModel.tsx`, `src/heart-model.ts`, `src/AnatomyViewer.tsx`: atlas loading,
  surface/interior/coronary inspection, illustrative tissue/educational/neutral
  materials, structure selection/isolation, transparency, labels and movable
  clipping. Clipped ray intersections are filtered before structure selection.
- `assets/licenses/heart-hra.md`, [source-hra-research.md](source-hra-research.md)
  and [ANATOMICAL_VALIDATION.md](ANATOMICAL_VALIDATION.md): attribution,
  selected-source evidence, scientific limitations and structure review scope.

Blender's importer invokes automatic mesh validation and removes exactly **18
duplicate-index faces (RA 12, LM 5, SVC 1)**. The strict comparison requires every
nonduplicate oriented triangle and exactly one original winding per duplicate
group to survive. The observed source/import/export coordinate deviation is **0**.
This is a documented exception to topology preservation, not voluntary smoothing,
decimation or anatomical repair. **835 zero-area faces remain (RA 812, LM 6,
SVC 17)** and require review; successful preservation checks do not make them sound
anatomy or establish a defect-free mesh.

Source GLB geometry stays static. The previous `cbrt(V/Vmax)` chamber scaling is
removed from the default renderer: a 0D pressure-volume trajectory does not
determine regional myocardial displacement. The simulation clock still controls
plots, current values and circuit indicators. Uniform display framing is distinct
from physical resizing or physiological deformation. Camera directions follow
the source-derived, landmark-checked inference +X patient left, +Y superior,
+Z anterior; that anatomical orientation still needs expert review. Clipping
reveals retained surfaces without invented tissue caps.

The sources identify CC BY 4.0 and their authors; those rights permit attributed
adaptation but do not provide this project's expert approval. Known annotation
conflicts remain visible: LAD's original ontology points to a pulmonary-artery
term; an anterior papillary-muscle assignment appears inconsistent with its
position; the male vascular description contains a female prose label; and no
standalone LCx is named in the male set. Ambiguous active ontology mappings are
withheld while original metadata is retained. Do not silently rename, move or
invent structures to resolve these conflicts.

### Verification status of the anatomy increment

| Check | Current evidence |
| --- | --- |
| Source acquisition and fixed hashes | Verified for selected heart and vascular files. Original cache remains ignored by Git. |
| Semantic source mapping | 44 unique IDs map to 44 exact existing mesh nodes; selected triangle count inspected. |
| Unit and coordinate inspection | Raw spans agree with HRA's millimetre dimensions. Source nodes have identity transforms; anatomical axes remain a documented inference. |
| New guarded Blender build / round-trip checks | Passed the final strengthened run: repeat generation, 43 unrelated objects preserved by transform/mesh hashes, 44 mapped structures and source/export/reimport comparisons. Exact duplicate exception and zero observed coordinate deviation recorded above. |
| New `blender:check`, `verify:assets`, full `check` | All passed for this increment. Full check includes 10 Python tests and 16 physiology tests, configuration, assets, typecheck and production build. Release gate failed as expected for all three unapproved assets. |
| New browser captures and controls | Actual rendered anterior/posterior/inferior, coronary, valve and source-coordinate sections captured; selection/hiding/isolation/transparency/labels/orbit/pan/zoom/reset/playback and 390px layout checked. See ANATOMICAL_VALIDATION.md §9 for evidence and remaining scientific limits. |
| Project expert / imaging comparison | Not performed. No ground-truth imaging was acquired for this import. |

Missing or unverified requirements include independent LCx identity, complete
chordae/leaflet apparatus, epicardial fat, quantitative tissue thickness, vascular
origins/continuity/dominance, fine internal morphology and source-driven motion.
No photographed tissue textures were acquired. Conservative PBR color and
lighting do not meet the requested specimen photorealism by themselves. P0/P1
anatomical acceptance and P2 biomechanics remain incomplete.

## Earlier physiology increment — 2026-10-23 (historical verification)

The sections below retain the numerical implementation and the checks performed
before the HRA anatomy upgrade. Their old asset counts, viewer modes, screenshots
and build passes must not be treated as validation of the new atlas.

## A. Repository assessment and executed plan

The starting repository was a working React/TypeScript/Vite + React Three Fiber anatomical viewer with 18 procedural GLB structures, selection/hiding/transparency/orbit/zoom/reset, shared guarded Blender tooling, asset integrity/release gates, and one Python lock test. It had no numerical physiology, disease mechanisms, plots, or scientific tests. All original files were untracked; no reset, clean, automatic commit, or replacement checkout was used. An ignored local source snapshot was retained in `.local/before-physiology/`.

Audit covered application source, data contracts, dependencies, tests, build/configuration tools, Blender scripts, generated metadata, manifests and documentation. The retained architecture was suitable for adding a pure calculation module. Work proceeded in verifiable increments: (1) audit and primary-source research, (2) conservative closed-loop engine and mechanism tests, (3) Worker/UI synchronization, (4) anatomy dataset/license evaluation while retaining existing assets, (5) independent numerical-domain review, (6) browser/build verification and traceable documentation. No speculative rewrite or infrastructure service was introduced.

## B. Architecture and rationale

| Layer | Implementation | Boundary |
|---|---|---|
| A: representation | GLB/manifest, `AnatomyViewer.tsx`, `HeartModel.tsx` | Geometry never determines the physiological numbers. The original relative-volume glyph has since been replaced by static HRA anatomy; see the latest increment above. |
| B: physiology | `src/simulation/{types,parameters,engine,index}.ts` | Pure deterministic eight-compartment ODE. No React, graphics or network dependency. |
| C: mechanisms | Typed scenario transformations in `parameters.ts` and `resolveModel` | HFrEF Emax, HFpEF passive B, AS valve R, MR signed reverse conductance. No prerecorded disease waveforms. |
| D: learning | `App.tsx`, SVG charts/circuit, Worker lifecycle hook | One selected numerical sample drives plot marker, timing, circuit arrows and instantaneous values. Default HRA meshes no longer scale with the sample. |

The solver uses paired signed flow balances and RK4; a finite equilibration loop records one periodic beat. User adjustments launch a separate experiment. A cancellable, debounced Worker prevents obsolete parameter results from appearing. Previous numerical output is hidden while recomputing or when invalid. Camera/selection/opacity/hidden structures, chart tab, speed and inspection phase are preserved between experiments. Heavy 3D code is lazy loaded, with a boundary that leaves the scientific dashboard usable if that chunk fails. The existing internal WebGL/model boundary remains.

No new npm dependency was necessary. SVG plots connect actual solver samples without decorative smoothing; Node 22 executes the same TypeScript for tests. Mesh controls, manifest approval gates and Blender scripts remain intact.

## C. Implemented files and behavior

- Added `src/simulation/*`, `src/simulation.worker.ts`, `src/hooks/useSimulation.ts`: explicit typed parameter schema, signed pressure-driven flow, domain/convergence diagnostics, bounded computation and cancellation.
- Added `src/AnatomyViewer.tsx`: extracted the existing explorer; preserved selection, individual/vessel visibility, opacity, view presets and reset; enabled pan. This earlier increment optionally applied `cbrt(V/Vmax)` around procedural chamber centers without changing the GLBs. The later HRA increment removes that display deformation.
- Added `src/components/HemodynamicCharts.tsx` and CSS: LV PV loop, pressure/volume/flow tabs, keyboard and pointer inspection, units/legends, signed MR flow and 8-compartment circuit. Whole-beat paths/axes are memoized for playback.
- Updated `src/App.tsx`; added `src/lab.css`: scenario/parameter controls, forward CO vs volumetric SV/EF, arterial/filling pressure, reverse volume/fraction, playback/pause/speed/timeline, synchronized current values and visible limitations.
- Added `tests/simulation.test.ts`, `scripts/validate-physiology.ts`, `docs/physiology-model.md`, `docs/physiology-validation.json`, `docs/anatomical-datasets.md` and this record.
- Updated `package.json` to include physiology in `npm test`/`npm run check`, added `test:physiology` and `validate:physiology`; enabled TypeScript import extensions for the native Node test runner. Updated title, README and stale anatomy-status wording. Package dependencies and lockfile are unchanged.

## D. Scientific validity and traceability

Full equations, sources, every default with units, scenario definitions and limitations are in [physiology-model.md](physiology-model.md). Numeric defaults are engineering estimates informed by equation classes in the cited literature; they are not a replicated published fit or patient measurements. Automatic sanity bands are not clinical reference intervals.

All five default presets converge, conserve volume and pass the current interpretation-domain guard. Default CO/EF are approximately 5.458 L/min / 53.73%; HFrEF 4.542 / 38.41%; HFpEF stiffness phenotype 4.020 / 52.38%; AS resistance surrogate 5.176 / 48.15%; MR 4.857 / 68.45%. MR returns 37.54 mL/beat to LA, illustrating why higher volumetric EF can coexist with lower forward output.

An independent code/numerical review identified an important failure outside the nominal presets: extreme combined stiffness/contractility can make the passive ventricular curve exceed the active line. Some extreme combinations also permit simultaneous forward AV/semilunar flow. These are now explicit scientific-domain failures, even if integration converges. The UI withholds their physiological plots and metrics. Regression tests include the discovered case.

The 160 extreme-corner regression establishes numerical robustness, with 22 combinations separately flagged as unsupported. Maximum total-volume drift is about 1.264e−10 mL. Default 1 ms → 0.5 ms step refinement changes the tested metrics by at most approximately 0.0063%. The generated JSON includes hashes of scientific source/test/report files and exact parameters. Re-run `npm run validate:physiology` when those files change.

## E. Executed physiology verification — 2026-10-23, before HRA import

| Check | Result / scope |
|---|---|
| Initial `npm run check` | Passed before implementation: existing asset/config/lock/type/build baseline. |
| Final `npm run check` | Passed: 2 asset registrations, MCP config parity, 1 Python lock test, 16 scientific tests, TypeScript and production build. |
| `npm run validate:physiology` | Passed; actual outputs and current source hashes saved in JSON. |
| `npm run verify:release` | Expected exit 1: both assets remain unreviewed, with no distribution approval or signed/hash-matched expert evidence. Gate unchanged. |
| Dev browser | Actual WebGL GLB rendering, all 5 presets, HR 75→120 and contractility changes, timeline/PV keyboard inspection, playback/pause/speed, plot tabs and negative MR flow verified. PV readout and instantaneous values agree at the selected sample. |
| Production browser | `npm run preview -- --port 4173`: compiled Worker and lazy 3D chunk loaded; baseline/MR values, negative reverse flow, and pointer PV selection verified. Plot index 66 matched timeline index 66 and the same 111.5 mmHg / 96.7 mL readouts. No application console errors. |
| Existing viewer regression | List and mesh-click selection, individual/vessel hiding, surface/chamber/overlay, 25% opacity, drag rotation, wheel zoom and view reset verified. New pan is enabled but right-drag was not separately exercised by the browser automation. |
| View-state preservation | Changed contractility after selecting RV, hiding RA, setting 25% opacity, volume tab and 0.25× speed; settings remained and new computed metrics appeared. |
| Domain guard in browser | Exact severe HFrEF corner produces explicit unsupported-domain alert and hides plots; reset restores the supported baseline. |
| Responsive browser | 1440px and 390px viewport checks; no page-level horizontal overflow. Narrow plots and controls remain visible; circuit uses its own labeled horizontal scroll region. Not a physical mobile-device test. |
| Console | No application errors observed during development workflow; existing Three.js `Clock` deprecation warning remains. |
| Blender GUI | Native MCP addon/scene/save-status reads attempted; GUI could not be reached. No scene mutation, save, import or export performed. |
| `blender:check` | Not run: no bpy/script/mesh changes. Original Blender sources, generated files, GLBs and manifest hashes unchanged. |
| Expert / clinical review | Not performed. Neither anatomy nor physiology is clinically validated. |

Browser evidence is saved under ignored `.local/physiology-evidence/`. The 3D lazy chunk remains about 1.02 MB uncompressed and triggers Vite's existing size warning; the main scientific UI chunk is about 249 kB, with a separate approximately 10 kB Worker. There is no configured lint command or checked-in browser automation framework; browser checks above were executed through the desktop browser tool, not claimed as a permanent E2E suite.

The task's Blender MCP wrapper and its two children were normally terminated after the read attempts; process absence and normal availability of the original lock inode were verified. No lock deletion or global client settings change occurred.

## F. Limitations

**Scientific:** No external waveform validation, empirical calibration, parameter uncertainty analysis or expert review. HFpEF is only a passive-stiffness phenotype, AS a linear obstruction, and MR a resistive reverse path. No autonomic/renal/chronic remodeling, delayed relaxation, pericardial coupling, coronary/oxygen transport, wave propagation, ECG, leaflet dynamics, CFD or myocardial mechanics. Domain guards catch identified constitutive failures, not every possible physiological inadequacy.

**Anatomical, updated after source acquisition:** The default now uses the HRA source cohort described above. It includes source-named valves, septum, papillary structures and coronary vessels, but these have not received project-specific expert approval. Annotation conflicts, incomplete apparatus, absent separately named LCx and unverified vessel continuity/wall thickness remain. The prior procedural geometry is preserved as a draft. Current colors are illustrative, camera anatomy is inferred, and no clinical geometry-to-volume calibration is claimed.

**Engineering/verification:** Existing 3D bundle-size and Three.Clock warnings remain; pan, low-end physical devices, screen-reader behavior and cross-browser coverage need dedicated checks. Worker/chunk error boundaries are implemented but destructive network-failure injection was not performed. UI parameter changes are re-equilibrated experiments, not transient intervention simulation. No deployment or account changes were made.

## G. Next priorities

1. Expert review and openly licensed external baseline waveform comparison; calibrate with uncertainty bounds before extending physiological claims.
2. Complete the HRA guarded import/round-trip and actual-render checks; resolve source-label conflicts with qualified anatomy review; verify vessel origins, wall morphology and missing structures before any asset approval.
3. Improve ventricular/valve constitutive behavior and active relaxation to expand the supported domain, each with its own regression and independent reference data.
4. Add reproducible browser E2E coverage for Worker cancellation, camera preservation, device/assistive-technology interaction and failure fallbacks; then profile and reduce the 3D chunk.

At the end of the earlier physiology verification, the development server was left at `http://127.0.0.1:5173/` for local review, the temporary production preview was stopped, and browser viewport overrides were reset. This is a historical session record rather than a guarantee of current process state. No remote publication occurred.
