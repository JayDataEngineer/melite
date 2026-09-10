# packages/harness — the agent-harness family

Things that give an agent harness (DSH) its **abilities** — tools the model
calls, presets the operator picks, provisioning that mounts everything.

| member | what it is |
|---|---|
| `dsh/melite-tools/` | the tool registry, TWO interfaces — BASE: `model_catalog`, `lane_bundle_peek`/`load`, `build_flow`, `refine_draft`, `comfy_manage`, `skill_index`/`skill_read`, `ledger_tail` + dynamic card tools; HEADLESS adds `card_run`/`flow_run`/`run_status` (the queue run doors); `enhance_prompt` is AD HOC |
| `dsh/provisioner/` | **the integrator** — mounts the whole media stack into a vanilla DSH (links BOTH families by package name) |
| `dsh/install-profile.sh` | thin shim over the provisioner renderer (`infer-provision all`) |

Retired 2026-09-09 (the dead-weight cut, 0 external refs each):
`dsh/melite-preset/` (persona preset), `dsh/inference-studio/` (the
preset installer), `dsh/testkit/` (the walls under `tests/walls/`
are the estate's tests), and `infer-daisy-studio/` (the pre-cordis
PYTHON app — the whole py UI died with the render plane).

Retired 2026-09-03 (the cruft cut): the `infer.yml`/`melite.yml`
machine-local overlays (superseded by profiles + the provisioner; the
18090-era config was the catalog-502 root), `melite-hello` (the W0
overlay probe), `melite-gallery` (pre-rename twin of `infer-gallery`),
and the Windows `.bat` pair (still rendering the deleted `profile/`
templates).

## The split (2026-09-02)

`packages/dsh` was two concerns wearing one directory. The split is LOGICAL,
not structural: no code moved between packages, only directories.

- **harness/dsh** — agent-side: DSH *accesses custom AI tools* through these.
- **web/dsh** — visual side: sidebar, cardview, galleries in the webui.
  These EMBED the editor (`packages/web/README.md` — one card surface).

The provisioner and the overlays intentionally span both: an integrator
names both sides by package (`link:` deps re-aimed across the family line).

## Install

```
dsh plugin --profile <name> add <repo>/packages/harness/dsh/provisioner
# or the profile route:
./packages/harness/dsh/install-profile.sh
```

There is no gateway endpoint to configure (the kill, 2026-09-10):
the tools answer in-process over the estate row's ctx seats.

## The three mounts (one bundle)

| Mount | App row | Rendered by |
|---|---|---|
| browser — `inference` profile | dsh-web-app | infer-provision / `dsh plugin add` |
| oneshot — `headless` profile | dsh-headless | infer-provision / `dsh plugin add` |
| server — SDK, any home | dsh-sdk-app | `tools/provision.py dsh` |

The server mount rides the PyPI SDK (`deepseek-harness-sdk`, pinned
in the root pyproject): `provision.py dsh` materializes an isolated
harness home under `data/runtime/dsh-harness-home` whose `estate`
profile composes dsh-base + dsh-sdk-app + this provisioner — the SAME
rows as the GUI mounts, driven over JSON-RPC from python.

Three planes keep the bundle shareable (the estate-bundle experiment
of 2026-09-03 was retired into this law — one integrator, not two):

1. **Recipe** (this repo): relative only — package-name rows,
   `link:../` deps, env-override endpoints. No absolutes, no secrets.
2. **Materialized state** (per machine): rendered profiles, harness
   home, `~/.dsh` — absolutes legal here, gitignored by construction.
3. **Secrets** (never in the repo): env vars or
   `$DSH_HOME/.credentials.yaml`; provider profiles in
   `<home>/settings.yaml` reference keys by `apiKeyEnv` NAME.
