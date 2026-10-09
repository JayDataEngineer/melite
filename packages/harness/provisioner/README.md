---
description: The vanilla-DSH provisioner — mounts the Melite estate bundle and renders ready-to-boot profiles into any DSH_HOME.
kind: package-bundle
---

# @melite/harness-provisioner

The provisioner mounts the Melite estate into a vanilla DSH installation and
renders ready-to-boot profiles. It is an integrator, not a gateway or a
second application.

## What it mounts

The workspace-linked bundle mounts the estate host row and its DSH surfaces:

| Surface | Current package |
| --- | --- |
| Estate composition | `@melite-plugin/dsh-estate` |
| Tool plane | `@melite/harness-tools` |
| Card view | `@melite-plugin/dsh-card-view` |
| Card deck | `@melite-plugin/dsh-card-deck` |
| Gallery | `@melite-plugin/dsh-gallery` |
| Card and model packages | linked through the estate and engine packages |

The package's own `cordis.patch.yml` and the packages' self-registration rows
own the Cordis composition. This README does not duplicate those rows.
Declared exports: `.` (the workspace-linked bundle row) and `./package.json`.

## Render profiles

```sh
node packages/harness/provisioner/bin/infer-provision.mjs all
node packages/harness/provisioner/bin/infer-provision.mjs profile melite-test
node packages/harness/provisioner/bin/infer-provision.mjs profile headless --dsh-home /tmp/melite-dsh
```

`all` renders `inference`, `headless`, `estate`, and `melite-test`, then runs
pnpm in each rendered profile. The output is machine-local state; the source
of truth is this package and the workspace.

## Interfaces

- `inference` and `melite-test` mount the web app and the browser card UI.
- `headless` mounts the DSH headless app. `MELITE_HEADLESS=1` selects the
  delegated run interface.
- `estate` mounts the SDK app and the headless tool interface.

The tool transport is in-process through the mounted estate row. Do not add a
`MELITE_GATEWAY` setting or a second HTTP service.

## Requirements

- Node.js and pnpm;
- a DSH installation with the referenced DSH packages available;
- a checkout whose workspace links are installed.

For framework changes, obtain the external DSH reference checkout described
in [`../../../references/README.md`](../../../references/README.md). The rendered
profile is not a substitute for reading that reference.

## Verification

```sh
pnpm --dir packages/harness/provisioner exec infer-provision profile headless --dsh-home /tmp/melite-dsh
pnpm run test
pnpm run lint
```

The profile renderer and its package links are the source of truth for profile
membership; the current documentation index points here for the operator
workflow.

## Model Experience

### Request context and condition

#### What the model sees

None — the package contributes no model-visible input; it renders profiles
and mounts rows, and whatever reaches a model request arrives through the
mounted tool plane, not this package.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no conversation state.

## Known Limitations and Deferred Work

- **Rendered profiles are machine-local state** — they are not a source of
  truth; re-render after manifest or workspace changes.
- **Headless selection is render-time** — `MELITE_HEADLESS` picks the
  delegated run interface per profile; there is no per-request interface
  switch.
