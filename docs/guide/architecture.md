# Architecture and repository map

Melite is a DSH + Cordis + TypeScript estate in three layers:

- **Layer A — the harness:** the Cordis tools, shared bench, card view
  and deck, run registry, and operator UI (`packages/harness/`,
  `packages/estate/`, `packages/web/`).
- **Layer B — engines:** ComfyUI (and MCP-backed engines), called
  through the `engines` service contract (`packages/engines/`).
- **Layer C — engine extensions:** first-party ComfyUI packs under
  `vendor/comfyui_extensions/`; foreign packs install through the
  provisioning path.

## Repository map

| Path | Contents |
| --- | --- |
| `packages/harness/` | tools, queue, provisioner, shared harness contracts |
| `packages/estate/` | drafts, runs, media, models, manage, and provisioning seats |
| `packages/engines/` | engine contract and ComfyUI/MCP adapters |
| `packages/models/` | model family declarations and provision rows |
| `packages/{image,audio,video,motion,3d}/` | card families |
| `packages/web-kit/`, `packages/web/` | shared UI primitives and DSH web surfaces |
| `vendor/comfyui_extensions/` | first-party ComfyUI packs (Layer C) |
| `vendor/cordis_plugins/` | pinned Cordis platform packages |
| `flows/` | named multi-stage flows served to the agent |

Contributors: the agent and developer contract is `AGENTS.md` at the
repository root. Development setup lives in
[getting started](/guide/getting-started); the test plane in
[testing](/guide/testing).
