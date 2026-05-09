# PMOS Product Repo Rules

## Default Language

Use Chinese by default unless the user explicitly requests otherwise.

## Product Repo Scope

This repository is the standalone public-facing `PMOS product repo`.

It should contain:

1. platform runtime
2. platform truth docs
3. deployment docs
4. public config samples
5. cloud mirror samples

It should not contain:

1. business subproject bodies
2. private inbox source materials
3. private session memory
4. real credentials

## Truth Docs

When resuming work, read:

1. `docs/operations/platform-truth-source-index.md`
2. `docs/operations/current-version-progress.md`
3. `docs/operations/pmaios-v1.0-direction.md`
4. `docs/operations/v1.0-product-version-program.md`
5. `docs/operations/v1.0-acceptance-standard.md`

## Cloud Knowledge Rule

Treat:

1. `GitHub` as system of record
2. `Notion` as operator cockpit
3. `cloud-mirror/` as latest-state sample and future generated mirror layer

## Config Rule

Commit examples and templates only.
Never commit real secrets, local-only paths, or private runtime state.
