# packages/harness — DSH tools, queue, and provisioning

This family gives DSH its Melite capabilities: model-facing tools, the shared
bench/estate seats, the serial queue, and the profile provisioner.

| Package | Responsibility |
| --- | --- |
| `melite-tools` | Browser/headless DSH tool surface and in-process estate transport |
| `estate-queue` | queue, runs, card registry, disclosure, skills, load, and management seats |
| `estate-call` | shared card-tool envelope and JSON-array transport helpers |
| `provisioner` | vanilla-DSH bundle and profile renderer |
| `estate-drafts` / `estate-runs` / `estate-media` / `estate-models` | DSH-native domain remotes and serving surfaces |

## Current composition

`packages/web/melite-estate/src/index.ts` is the estate host row. It mounts
the engine contract/providers, drafts, queue, card registry, provisioning,
management, skills/load, runs remotes, media, and model surfaces in dependency
order. The tools call those seats in-process; there is no gateway URL or
second estate process.

The tool vocabulary and interface split are declared in
`packages/harness/melite-tools/src/index.ts`:

- base: `melite_discover`, `melite_load`, `melite_construct`;
- deferred: `melite_view`, `comfy_manage`, `melite_skill_index`,
  `melite_skill_read`, `ledger_tail`;
- headless: `melite_flow`, `run_status`.

## Profiles

`packages/harness/provisioner/bin/infer-provision.mjs` renders:

- `inference` — web studio;
- `headless` — one-shot DSH agent;
- `estate` — SDK/job-server composition;
- `melite-test` — test web composition.

Render profiles into a DSH home with:

```sh
node packages/harness/provisioner/bin/infer-provision.mjs all
```

The provisioner writes machine-local profile state under
`${DSH_HOME:-$HOME/.dsh}/profiles/`. The source of truth is the package
manifest and its Cordis patch rows.

## Queue and state

`estate-queue` requires an explicit `repoRoot` or `MELITE_STATE_ROOT`. It owns
the state-root lock, FIFO, run records, journal, card registry, and
cross-root read manifest. A consumer must not guess a root from its current
working directory.

## Testing

Package specs run under the root Vitest configuration. Cross-cutting walls are
under `tests/walls/ts/`. Start with:

```sh
pnpm run test
pnpm run lint
```

The complete command and prerequisite table is in
[`../../docs/testing/index.md`](../../docs/testing/index.md).
