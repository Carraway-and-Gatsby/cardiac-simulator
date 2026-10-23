# Public source release and local assets

## What is being published

The public repository contains CardioLab's original application source,
English/Korean interface translations, numerical and geometric tests, source
metadata, provenance, documentation and reproducible Blender scripts. Original
code and documentation are licensed under [MIT](../LICENSE). HRA-derived
metadata retains CC BY 4.0 attribution as described in
[THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

This is a **source-code publication**. Downloaded/generated anatomical binaries
remain omitted because their project expert and distribution review is
incomplete. This does not relicense HRA material or place new restrictions on
CC BY 4.0. It preserves the project's existing asset-review policy. The manifest
continues to record `internal-only`, `unreviewed` and no project reviewer.

| Included | Excluded from the public repository |
| --- | --- |
| App, tests, generator/validation scripts | `node_modules/`, `dist/` and other build products |
| Versioned source URLs, hashes and HRA correspondence | Downloaded source GLBs and evidence caches under `.local/` |
| Original English/Korean translations | Generated `public/models/` assets and `blender/generated/` outputs |
| Source/license evidence and unapproved asset manifest | `.blend` backups, screenshots, local logs and experiment backups |
| Local-setup generator and shared MCP launcher | Machine-specific `.mcp.json`, `.codex/` and private client settings |
| Historical validation records | Secrets, `.env` values, patient information and private datasets |

Historical reports can refer to local evidence that is intentionally not
published. Those records describe previous checks; they are not substitutes for
rerunning validation after source changes or proof of independent medical review.

During preparation on 2026-10-23, the project MCP scene-read command successfully
inspected Blender 4.5.12 LTS. The live scene was an unsaved `Scene` containing
`Cube`, `Light` and `Camera`. No GUI objects or bpy generators were changed, and
the inspection bridge exited normally. Earlier feature logs retain their dated
blocked-inspection results; the newer successful read does not retroactively
change those records.

## Fresh-clone workflow

Use the Node version pinned in `.nvmrc` and install with `npm ci`.

```bash
npm run check:source
```

This validates the public source boundary, runs tests and builds the app without
requiring local MCP credentials/configuration or anatomical GLBs. The browser's
3D viewer still needs the following local setup:

```bash
# Set this to the Blender 4.5 LTS executable installed on your computer.
export BLENDER_BIN="/absolute/path/to/blender"
npm run setup:assets
npm run dev
```

`setup:assets` runs the existing source acquisition, owned-scene Blender build
and asset-integrity verification in sequence. The two public HRA URLs and exact
SHA-256 hashes are pinned in `assets/sources/heart-hra.json`. Acquisition refuses
to overwrite a mismatched existing source. There is no automatic fallback to an
unverified model. Inspect [the attribution](../assets/licenses/heart-hra.md)
before reusing or distributing HRA-derived material.

The Blender wrapper uses a separate background process and the project's shared
lock. It does not require a GUI window or MCP. It operates on owned scenes and
must not replace user scenes. The file-locking launcher currently requires a
POSIX environment; a native Windows workflow has not been validated.

## Optional local assistant configuration

```bash
npm run setup:local
npm run verify:config
```

This creates missing project-local Codex and Claude configurations using the
current checkout path. Existing files are preserved. They are ignored by Git
because they contain machine-specific executable and project paths. Both clients
must use `scripts/blender-mcp.py` and only one may own the shared Blender MCP
server. Follow `AGENTS.md` when reading or editing a live GUI scene.

`npm run check` retains the complete local checks, including asset and MCP
configuration verification. It is expected to require the local setup steps;
`check:source` is the portable public-source/CI check.

## Asset approval remains separate

```bash
npm run blender:check
npm run verify:assets
npm run verify:release
```

The first two commands verify generated scenes, source correspondence, metadata
and hashes. The last command is the asset-release approval gate, and **must fail
for the current assets**. It requires completed anatomical and distribution
reviews, reviewer identity/date, evidence and a reviewed hash matching each
output. Do not populate approval fields to make CI green. Source CI deliberately
does not pretend to grant asset approval or automatically publish generated
models.

A successful local generation establishes reproducibility and file integrity,
not wall thickness, physiological function, tissue mechanics, clinical accuracy
or suitability for a particular use. The display deformation, valve leaflets
and blood-flow routes are educational constructions; see
[the user guide](user-guide.md) and [the physiology specification](physiology-model.md).

## License scope

The MIT grant covers original software and accompanying original documentation.
Third-party dependencies retain their upstream terms. HRA attribution, license
links and modification records must remain with HRA-derived material. The
project's quality gate is not an additional license restriction. Source-author
credits and upstream review do not imply endorsement or review of this project.

The standard MIT text is available from the
[Open Source Initiative](https://opensource.org/license/mit). The HRA metadata
records link to [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/);
consult the [legal code](https://creativecommons.org/licenses/by/4.0/legalcode)
for its terms. Exact source citations and modifications are retained in the
third-party notice and asset provenance files.
