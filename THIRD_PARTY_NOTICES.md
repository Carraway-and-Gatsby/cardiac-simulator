# Third-party notices

The [MIT license](LICENSE) covers original CardioLab application code, scripts,
tests, translations and documentation. It does not replace the licenses of
third-party dependencies, source data or derived anatomical material.

## Human Reference Atlas

CardioLab uses source identifiers, anatomical labels, bounds and correspondence
metadata derived from the **Human Reference Atlas / HuBMAP 3D Reference Organ
Library v1.3**. These HRA-derived portions retain **Creative Commons Attribution
4.0 International (CC BY 4.0)**. The local asset setup downloads the associated
source GLBs separately; downloaded and generated anatomical binaries are not
included in this source repository.

- **Heart, Male v1.3.** Creator: Kristen Browne. Citation: Browne, Kristen, and
  Heidi Schlehlein. 2024. “3D Reference Organ for Heart, Male v1.3.”
  [DOI: 10.48539/HBM564.WKNG.249](https://doi.org/10.48539/HBM564.WKNG.249).
  [Official metadata](https://cdn.humanatlas.io/digital-objects/ref-organ/heart-male/v1.3/metadata.json).
- **Blood Vasculature, Male v1.3.** Creators: Kristen Browne and Heidi Schlehlein.
  Citation: Browne, Kristen, and Heidi Schlehlein. 2024. “3D Reference Organ for
  Blood Vasculature, Male v1.3.”
  [DOI: 10.48539/HBM473.XTPP.725](https://doi.org/10.48539/HBM473.XTPP.725).
  [Official metadata](https://cdn.humanatlas.io/digital-objects/ref-organ/blood-vasculature-male/v1.3/metadata.json).
- Library citation: Browne, Kristen, Heidi Schlehlein, Bruce W. Herr II, Ellen
  Quardokus, Andreas Bueckle, and Katy Börner. 2024. “HuBMAP CCF 3D Reference
  Object Library.” [HRA 3D Reference Library](https://humanatlas.io/3d-reference-library).
- License: [CC BY 4.0 summary](https://creativecommons.org/licenses/by/4.0/),
  [legal code](https://creativecommons.org/licenses/by/4.0/legalcode).

These references are Visible Human-based atlas reconstructions. Source reviewers
are not reviewers of CardioLab and no source author or institution endorses this
project.

CardioLab changes include selecting 44 complete source nodes, adding stable
identifiers, translations, correspondence metadata and display materials, and
performing the glTF–Blender–glTF axis conversion. The import removes 18
duplicate-index triangles while preserving the positions and all nonduplicate
oriented triangles. Educational cardiac deformation, reconstructed valve
leaflets and flow guides are CardioLab additions, not source measurements.
Detailed changes, hashes and known defects are recorded in
[the asset notice](assets/licenses/heart-hra.md),
[the acquisition specification](assets/sources/heart-hra.json),
[the structure mapping](src/data/heart-hra.json) and
[the asset manifest](assets/manifest.json).

Keep the source attribution, license link and indication of changes with any
reuse of HRA-derived material. CardioLab's unresolved anatomical review and
asset-distribution gate describe the project's quality and release policy; they
do not add restrictions to the rights granted by CC BY 4.0 or MIT.

## JavaScript and development dependencies

Dependencies are installed from `package-lock.json`; their source or compiled
packages are not vendored in this repository. React, React DOM, Three.js,
React Three Fiber and Drei retain their respective upstream licenses. Transitive
packages also retain their own license terms; they are not all covered by this
project's MIT license.

`npm run licenses` records installed package versions and license evidence in
[docs/dependency-licenses.json](docs/dependency-licenses.json). That generated
inventory is an audit aid, not a replacement for package license texts. Preserve
the applicable notices when redistributing a dependency-containing bundle.
Blender is an external tool and is not included or relicensed by this repository.

## Other candidate datasets

The research notes mention datasets considered but not incorporated, including
UMN and CAP. Their licenses and access agreements do not apply to the HRA inputs
and do not authorize downloading or redistributing those other datasets. No
patient images, clinical records, private datasets or third-party textures are
included in this source release.
