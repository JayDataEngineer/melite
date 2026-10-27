---
description: The ComfyUI engine's Cordis package — one package, two services (ctx.models declarations and ctx.comfyui composition) plus the merged-single-graph engines adapter.
kind: package-library
---

# @melite/comfyui-cordis

`@melite/comfyui-cordis` is the ComfyUI engine's Cordis plane: the models
registry (family DECLs, catalog, derived views), the compose seat (graph
build, refusals, submission), and the adapter that registers engine id
`comfyui` on the engines seat. It calls the ComfyUI HTTP API through the SDK
client resolved off the endpoint config, and ComfyUI-Manager for model
installs. The estate bundle mounts its rows — wiring, host, adapter — before
the run lane; card packages import the compose seat from here by package
name.

## Contract

- Two services: `ctx.models` (declarations, registry, live table) and
  `ctx.comfyui` (graph build, `ComposeRefusal` compose-time voice,
  submission). `assertNoCheat` refuses a dropped declared default by name.
- Engine adapter law: stage rows splice and merge into ONE prompt per
  submit; graph surgery never leaves this package. Cross-cordis consumers
  ride the re-exported `EngineContext`, never an instanceof check.
- Registration-time boot gate: every card passes the envelope laws before it
  joins the service — a foreign vocabulary refuses at the door.
- Declared exports: `.` (root surface), `./service` (ComfyUIService,
  ComposeRefusal), `./comfyui-engine` (the engines-seat adapter),
  `./comfyui-host` (host provider row), `./comfyui-wiring` (wiring doc row),
  `./catalog-registry` (catalog door row), `./models-service` (models boot),
  `./model-contract` (family DECL types), `./envelope-laws` (registration
  law suite), `./linked` (linked-input spelling), `./params-emit` (served
  params_schema emitter), `./semanticModelKnob` (served style enum),
  `./user-loras` (user LoRA plane), `./provisioning-manifest` (strict
  nodes.yaml reader plus the shipped extension-manifest read — the
  declaration plane's runtime source is the committed
  `data/extension-manifest.json`, derived by `regen:extension-manifest`,
  shipped via the `files` `data/**` set; a missing or malformed file
  refuses loud, never a silent empty manifest), `./cli` (the admission
  CLI), `./package.json`.

## Model Experience

### Request context and condition

#### What the model sees

None — this package's engine is ComfyUI's diffusion runtime, reached over
its HTTP API; nothing here places fields into an LLM request.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no conversation state; run ledgers live on the runs plane.

## Known Limitations and Deferred Work

- **Endpoint resolution is environment-owned** — base URL reads COMFYUI_URL
  or the endpoint config file; a missing engine fails loud at the first
  submit, not at mount.
- **Admission is CLI-gated** — a card whose decl moves re-runs the admission
  CLI; there is no runtime bypass for a stale decl.
