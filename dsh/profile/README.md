# The inference.cpp DSH profile — version-controlled source

ONE profile. It mounts the inference tool surface and media UI into
the DSH host, and every session on that profile gets the tools —
whatever agent preset the session uses.

## What it gives every session

**Tools** (registered by the `melite-tools` host plugin):

- `lane_bundle` — list all lanes (no arg) or load one lane's tool
  manifest (`params_schema`) + its skills in one call
- `build_pipeline` — compose an action card; it appears as an editable
  card in the conversation; only the user presses Run
- `model_catalog` — search the model catalog
- `skill_index` / `skill_read` — progressive skill disclosure
- `provision_model` — queue weight downloads
- `enhance_prompt` — per-model prompt recipes
- `ledger_tail` — gateway audit trail
- plus one tool per card manifest (`image_card`, `tts_card`, …) served
  by `/v1/card-tools`

**UI** (client bundles): card view (editable action cards in chat),
card deck sidebar, runs gallery, inline media previews.

## Layout

```
dsh/profile/
├── package.json.tmpl       ← rendered by the installer ({{REPO_ROOT}})
├── cordis.patch.yml.tmpl   ← rendered likewise; the whole mount surface
├── pnpm-workspace.yaml     ← copied verbatim
└── README.md
```

## Install

```sh
./dsh/install-profile.sh          # Linux / macOS
dsh\install-profile.bat           # Windows
```

Renders the templates into `~/.dsh/profiles/inference/`, installs
dependencies, done. Re-run it any time the repo moves or the gateway
port changes. Remove with `uninstall-profile.sh` / `.bat`.

## Boot

```sh
dsh web --profile inference --port 3081
```

Start a session with any agent preset — the inference tools are there.

## Why templates

DSH profiles must live at `~/.dsh/profiles/<name>` (bare name only —
enforced by `resolveProfileDir`). Host plugin rows need the absolute
path of the built artifact; client rows need the packages in the
profile's `node_modules`. The installer bakes the repo's absolute root
into both at install time.

## Uninstall

```sh
./dsh/uninstall-profile.sh        # Linux / macOS
dsh\uninstall-profile.bat         # Windows
```
