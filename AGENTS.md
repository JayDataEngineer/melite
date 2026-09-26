# Melite Repository Instructions

Melite is an agent media-creation kit. This repository has three layers:

## Layer A — DSH/Cordis harness, tools, and UI

Cordis is the sole composition framework for Layer A. DSH hosts the web app,
headless app, SDK/job-server composition, services, remotes, and UI packages.
Use the DSH/Cordis reference before implementing lifecycle, service, tool, or
remote behavior:

- `references/cordis.pdf` and its tracked text extraction;
- the external `references/deepseek-harness/` checkout;
- `docs/dsh-homolog/` for the local mapping and doctrine.

The DSH reference checkout is external and intentionally untracked. A fresh
checkout that needs framework implementation context must obtain the pinned
reference; do not invent a substitute from memory.

## Layer B — Engines

Layer A calls engines through the `engines` contract. ComfyUI is the primary
engine. MCP-backed Blender and Unity lanes are mounted through the DSH MCP
client and generic MCP engine provider. AutoRemesh is currently exposed as a
ComfyUI/Layer C capability rather than as a new Layer A plugin.

Layer A may call a Layer B API or a Layer C declared capability. It does not
modify an engine's source in place.

## Layer C — Engine extensions

Layer C contains vendored first-party ComfyUI packs under
`vendor/comfyui_extensions/` and declared external resources resolved through
the provisioning/Manager path. A card or model declares what it requires; a
missing required capability must refuse rather than silently fall back.

## Commands

```sh
pnpm install
pnpm run test
pnpm run test:coverage
pnpm run test:e2e
pnpm run test:expected
pnpm run test:bench
pnpm run test:snapshot
pnpm run test:web
pnpm run test:web:browser
pnpm run test:web:mesh
pnpm run lint
```

`test:web:mesh` is the 3D media door's browser wall: it builds the harness
that mounts the real `MeshView` against a real `.glb` and asserts a live
WebGL context, a real glTF parse and non-uniform pixels in Chromium. It
boots no lane and needs no token, but it does need an artifact — by
default the img-to-mesh run under `data/probe-img-to-mesh-0102`, or
`MESH_DOOR_GLB=<path>`; a self-skip is not a pass.

The e2e tier is mixed. Individual suites declare their own key, engine, lane,
feature, or browser prerequisites; a self-skip is not a pass. `test:coverage`
is the coverage command, but inspect the report because a failing or flaky
suite can prevent coverage from being emitted. The full layout is in
`tests/README.md` and `docs/testing/index.md`.

A non-trivial model- or product-user-visible change updates the relevant
keyless recorded-session snapshot. Use the DSH testing policy in the external
reference checkout when available.

## The 3088 agent loop

Generation commissioning is one human-like task prompt to the headless maker
on the 3088 lane, followed by analysis of its transcript, run records, and
artifacts. Read `docs/RUNBOOK-3088-AGENT.md` before any commission or
end-to-end generation test. Never hand-drive the estate doors as a substitute,
never use 3080 for the maker, and never ask the operator for information the
runbook already specifies.

## Agent mode

A browser/chat agent serving a user composes on the shared bench:

1. `melite_discover` — find the relevant card or flow;
2. `melite_load` — open its contract, models, and skills;
3. `melite_construct` — read and edit the shared bench with `add_stage`,
   `patch`, `rewire`, and related verbs.

The flow is visible in the user's Cards tab. The user presses **Run**. The
agent may continue editing as requested but must not execute in browser mode.
A headless commission may use `melite_flow` and `run_status` through the same
queue and draft-backed registration path.

In agent mode, never shell out to ComfyUI, hand-build a graph, or use raw
estate HTTP as a substitute for the tools. `comfy_manage` is for status and
declared resource management, not generation.

## Architectural integrity

- Keep Layer A in Cordis and TypeScript. Do not add a parallel Python core,
  gateway application, plugin loader, or hand-rolled service framework.
- Keep engine-specific graph and creative policy in the owning card or engine
  package. Keep generic transport, queue, and lifecycle mechanics in the
  shared seats.
- Prefer the DSH/Cordis shape when it can express the requirement. Record a
  justified divergence in `docs/CONFORMANCE_LEDGER.md`; silence is drift.
- Use small changes with focused tests. Do not hide a failure behind a
  fallback, compatibility shim, or broad exemption.

## Documentation and status

`docs/ROADMAP.md` is the forward-looking index of owed work and must be read
before planning a new goal. `docs/CONFORMANCE_LEDGER.md` is the dated record
of landed conformance and historical receipts. `docs/README.md` defines which
documents are current, runbooks, design records, or historical evidence.

Current documentation describes the DSH/Cordis implementation. Retired
Python, gateway, C, and old ComfyUI seam material may remain as history only
when clearly labeled. Update the owning declaration, current documentation,
tests, and the relevant recorded-session snapshot together. Never commit
credentials or machine secrets.
