# HRA source acquisition and inspection

Inspected 2026-10-23, Asia/Seoul. This is a source and engineering inspection,
not anatomical certification. The derived viewer remains `unreviewed` and
`internal-only`; the HRA source reviewers have not reviewed this application.

## Decision and provenance

Use the versioned HRA **male heart v1.3** together with discrete cardiac and
proximal great-vessel meshes from **male blood vasculature v1.3**, retaining
their existing coordinates. The original files are cached in the ignored
`.local/anatomy-sources/hra/` folder. No raw clinical images or identifiers were
downloaded. A female heart was inspected as a separate candidate; no female
geometry is mixed into the selected male model.

The [official release manifest](https://humanatlas.io/assets/content/3d-reference-library-page/data.yaml)
identifies these organ versions in HRA collection v2.5. The
[HRA library](https://humanatlas.io/3d-reference-library) states that medical
illustrators make the reference objects using the Visible Human resource and
organ experts review them. This is an **atlas reconstruction**, not a delivered
CT/CTA segmentation, not an image-aligned patient reconstruction, and not proof
of a structurally normal heart. Source phase, detailed pathology, per-feature
segmentation evidence and measured motion are not supplied with these GLBs.

HRA describes the Visible Human Male as 38 years old. The female source is
59 years old. The [NLM source description](https://www.nlm.nih.gov/research/visible/visible_human.html)
documents male CT at 1 mm intervals (512 × 512), anatomical sections at 1 mm
intervals, and a higher-resolution 4096 × 2700 cryosection image collection.
Those are upstream image properties; **they are not a stated geometric error
bound or effective resolution for this atlas mesh**. No voxel labels or aligned
imaging ground truth were acquired, so Dice, Hausdorff and imaging correspondence
metrics are not applicable to this import.

## Versioned files and rights

All selected distributions explicitly use CC BY 4.0. Preserve creator, source,
license link and adaptation notice. Public availability and the original review
do not waive the project's own anatomical review/release gate.

| Distribution | Bytes | SHA-256 |
| --- | ---: | --- |
| [Male heart v1.3](https://cdn.humanatlas.io/digital-objects/ref-organ/heart-male/v1.3/assets/3d-vh-m-heart.glb) | 4,071,772 | `689df039c8bc264ea06a44cd926762976f0666c0ff2dc532d046409b185e6b0c` |
| [Male blood vasculature v1.3](https://cdn.humanatlas.io/digital-objects/ref-organ/blood-vasculature-male/v1.3/assets/3d-vh-m-blood-vasculature.glb) | 18,050,040 | `3a9fe60549769f3a27c15a0901a055e7c4fd3a9f4a37f39a77f5047f0166d4c3` |
| [Female heart v1.3, comparison only](https://cdn.humanatlas.io/digital-objects/ref-organ/heart-female/v1.3/assets/3d-vh-f-heart.glb) | 1,745,560 | `98f66e46b149bfc3836592d9404c50290e21d302ec55c98813435e2d9847b1d9` |

The [heart metadata](https://cdn.humanatlas.io/digital-objects/ref-organ/heart-male/v1.3/metadata.json)
lists Kristen Browne as creator and Shin Lin as source reviewer; its requested
citation is Browne, Kristen, and Heidi Schlehlein. 2024. *3D Reference Organ for
Heart, Male v1.3.* [DOI](https://doi.org/10.48539/HBM564.WKNG.249).
The [vascular metadata](https://cdn.humanatlas.io/digital-objects/ref-organ/blood-vasculature-male/v1.3/metadata.json)
lists creators Kristen Browne and Heidi Schlehlein and source reviewers Marc
Halushka and Shin Lin. Cite *3D Reference Organ for Blood Vasculature, Male
v1.3*, 2024. [DOI](https://doi.org/10.48539/HBM473.XTPP.725).
Both source versions were published June 15, 2024; graph processing occurred
June 8, 2026. Processing date is not a new anatomical acquisition date.

Machine-readable URLs, hashes, authors and source selection rules are in
`assets/sources/heart-hra.json`. Node-level metadata is in
`src/data/heart-hra.json`. The local cache also retains official crosswalks,
metadata, graph JSON and the release manifest as evidence.

## What is actually present

Male heart: **14 meshes, 164,119 triangles**, four chamber-associated tissue
surfaces, an interventricular septum, four valve meshes and five papillary
muscle meshes. HRA's 17 ontology entries include grouping nodes, so that number
must not be presented as 17 independent meshes. The female heart has the same
14-mesh semantic layout but 85,914 triangles. Neither file has images,
texture maps, animation clips, skeletons or morph targets.

The selected addition is **30 vascular meshes**: 15 great-vessel surfaces and
15 coronary arterial/cardiac venous surfaces. The complete male vascular GLB
contains 106 meshes; extracardiac and distal-body meshes are excluded. The
selection retains whole source nodes, including original proximal `_a` pieces;
it does not cut, smooth, extend or invent branching anatomy. The aortic arch and
its three proximal branches, ascending and thoracic descending aorta, pulmonary
trunk and two branches, four pulmonary veins, SVC and proximal IVC are included.

The coronary subset includes source-named left main, LAD, RCA, right marginal,
right posterior descending, two separately named diagonal branches and left
marginal, plus great/middle/small/anterior cardiac veins, coronary sinus,
oblique vein of the left atrium and posterior vein of the left ventricle.
Presence of these names is not verification of their origins, continuity,
diameters or dominance. **A separately named LCx is absent in this male source.**
No additional LCx is fabricated or reassigned from another vessel by appearance.

The combined selection has **267,360 source triangles**. On Blender import,
automatic mesh validation removes **18 duplicate-index faces (RA 12, LM 5,
SVC 1)**, producing **267,342 delivered triangles**. Coordinate comparison
observes **0 deviation**. The preservation check allows only this explicit
exception: every nonduplicate oriented triangle must survive, and each duplicate
index group must retain exactly one of its original windings. Do not describe
this as wholly unchanged topology. The output still has **835 zero-area faces
(RA 812, LM 6, SVC 17)**. Those defects are recorded for review, not repaired or
approved by the import checks. The raw source files and hashes remain unchanged.

There is no separately labeled cavity/blood-pool mesh, epicardial-fat layer,
chordal network, leaflet-by-leaflet hierarchy, moderator band, pectinate muscle,
crista terminalis or fossa ovalis. Some gross internal contours may be part of
the chamber surfaces but are not separate verified semantic features. Ray probes
through chamber surfaces yield four or more intersections on many lines, which
is consistent with internal and external tissue surfaces rather than a simple
blood-pool cast. This engineering observation does **not** establish correct wall
thickness or exclude surface defects. Rendered cutaways still require inspection.

## Scale and coordinate handling

The GLBs use native metre coordinates with identity node transforms. The
[official heart graph](https://cdn.humanatlas.io/digital-objects/ref-organ/heart-male/v1.3/graph.json)
reports dimensions **124.3511841 × 105.4352340 × 105.2152393 mm**, exactly the
raw GLB accessor spans multiplied by 1000. This independently confirms physical
scale against the [glTF metre/Y-up convention](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#coordinate-system-and-units).
The source is not resized to an arbitrary nominal adult dimension.

| Scope | Minimum (m) | Maximum (m) | Span (mm) |
| --- | --- | --- | --- |
| Heart alone | `[-0.04344825, 0.423371166, -0.0150267193]` | `[0.0809029341, 0.5288064, 0.09018852]` | `124.351 × 105.435 × 105.215` |
| Selected 44 meshes | `[-0.04344825, 0.400054872, -0.0385727622]` | `[0.0809029341, 0.585033238, 0.09018852]` | `124.351 × 184.978 × 128.761` |

The inferred anatomical mapping is **+X patient left, +Y superior, +Z anterior**.
It is cross-checked from the source labels and their positions: left pulmonary
veins lie at positive X versus the corresponding right veins at negative X;
SVC/arch are superior to the inferior cava; RV and LAD occupy more-positive Z
than LA and posterior veins. This is explicitly an inference from the selected
source landmarks, pending expert orientation review. No explicit HRA anatomical
axis declaration was found during this investigation. The glTF handedness alone
does not prove anatomical laterality.

Keep the two GLBs in their existing common coordinates. Use Blender's normal
glTF import/export conversion once, preserving world coordinates through the
round trip. The ontology graph's local-placement `x_rotation: -90` is **not an
additional transform to apply to these already Y-up glTF vertices**. No reflection,
nonuniform scaling or source-to-source fitting is justified.

## Source conflicts that must remain visible

1. `VH_M_left_anterior_descending_artery` is paired in the original crosswalk
   with `FMA:8636` and the label *Anterior descending branch of left pulmonary
   artery*. Keep the raw name and source annotation; active `ontologyId` is null
   and the UI label is provisional with an annotation-conflict note.
2. `VH_M_papillary_muscle_of_heart_anterior` is labeled as a left ventricular
   papillary muscle (`FMA:7264`) but its source position appears on the RV side.
   Do not silently move or reassign it. Its ventricular parent and active ontology
   assignment remain unresolved; original metadata is preserved.
3. The male vascular metadata description says *Blood-vasculature-female*.
   Its dataset ID, title, GLB `VH_M_` node prefixes and graph sex identify male.
   Preserve this source prose discrepancy instead of claiming metadata consistency.
4. Two source coronary meshes have diagonal-branch labels. Their identity and
   relationship to the absent separately named LCx need expert review. A
   source-named right posterior descending branch alone does not validate the
   model's coronary dominance.

These are reasons to keep this derivative unapproved, not to invent corrections.
Engineering import/round-trip success, visual inspection, source expert review
and a new project-specific anatomical review are separate evidence categories.

## Unmet scientific requirements

This atlas foundation is substantially more source-grounded than the previous
procedural geometry, but it does not by itself fulfill the requested specimen
photorealism or complete anatomical fidelity. No photographed tissue textures,
validated epicardial fat, complete chordae or independently supported valve
microanatomy were acquired. No image-driven motion or finite-element solution
exists for this asset; it must remain static rather than globally pulsating in
response to the lumped-parameter physiology engine. Quantitative wall thickness,
valve apparatus, vessel continuity, coronary origins and aligned imaging review
remain outstanding.
