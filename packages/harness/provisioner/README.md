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

## Render profiles

```sh
node packages/harness/provisioner/bin/infer-provision.mjs all
node packages/harness/provisioner/bin/infer-provision.mjs profile inference
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
