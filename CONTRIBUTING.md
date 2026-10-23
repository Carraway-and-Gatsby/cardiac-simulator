# Contributing to CardioLab

CardioLab is an educational software prototype. Contributions should make its
behavior reproducible and its scientific limits understandable. See
[the English guide](docs/user-guide.md), [the model equations](docs/physiology-model.md)
and the shared repository instructions in [AGENTS.md](AGENTS.md).

## Development

Use the Node version in `.nvmrc`, Python 3 and `npm ci`. Run
`npm run check:source` for source, numerical tests, types and the production build.
The [README](README.md) explains local asset generation with Blender 4.5 LTS and
optional MCP setup. For changes to bpy generation, run `npm run blender:check`
followed by `npm run verify:assets` against local assets.

Keep pull requests focused. Describe the behavior changed, the reason for it,
the tests actually run and any unresolved limitations. Do not equate a successful
build or numerical regression with anatomical or clinical validation.

## English and Korean

English is the initial application language. Every user-facing addition needs
both English and Korean text, including labels, help, tooltips, validation and
error messages, chart legends and accessible names. Keep units and stable
structure identifiers consistent across languages. Switching language must not
reset the experiment, selection, camera or animation state.

Check both languages at desktop and narrow widths. Verify the document language,
keyboard controls and persisted language choice. Translate the meaning and the
scientific qualification together; never omit a limitation in one language.

## Physiology and animation

Keep the numerical engine independent of rendering. Document equations, units,
parameter provenance, assumptions and scope. Use targeted tests for conservation,
numerical convergence, qualitative mechanism response and edge cases. Do not
introduce silent mass correction or invent measured values.

Cardiac, valve, blood-flow, chart and numeric views must use the same committed
sample. Pause and scrubbing must be deterministic. The atlas is static and the
animation is illustrative: preserve the source-geometry comparison and keep
display deformation distinct from tissue mechanics or fluid dynamics.

## Anatomy, source data and review

Do not commit downloaded or generated anatomical binaries, local caches, private
configuration, secrets or patient information. Add source/version/license
evidence, hashes, transformation history and reviewer information when proposing
an asset. Existing `internal-only` and `unreviewed` values must remain until a
qualified reviewer completes the documented review; automated checks cannot
grant approval. `npm run verify:release` intentionally fails for the current
unapproved assets. The source-only CI is not an asset-release approval.

Only one client may own the shared Blender MCP connection. Use the project
launcher and normal shutdown; do not bypass its lock or overwrite another user's
live scene. Reproducible work belongs in `blender/scripts/`.

## License

Original contributions are provided under the repository's [MIT license](LICENSE).
Retain the separate attribution and license notices for third-party material in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Open-source licensing does not
establish scientific accuracy or source-author endorsement.
