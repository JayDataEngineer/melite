---
description: Seed-VC voice conversion — re-voice speech or singing from a reference clip on the ComfyUI engine; both DiT lanes (speech 22k + singing f0 44k) with digest-pinned provisions.
kind: package-library
---

# @melite/models-seed-vc

`@melite/models-seed-vc` is the model family package for Seed-VC voice conversion (upstream billwuhao/ComfyUI_Seed-VC, Apache-2.0, over Plachtaa/seed-vc). It declares the family (`form_voice`, genre audio) and the `convert` action the voice-change card binds; the estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect` (fiber-owned, revertible). One upstream node — SeedVCRun — loads every weight itself at init from the engine's `models/TTS` tree, so the DECL declares the whole weight set as digest-pinned provisions (sha256 + size from the HF LFS API) and the graph carries no loader seats: the two lanes (speech 22.05k small-wavenet DiT; singing 44.1k base-f0 DiT with RMVPE) are a `f0_condition` params stamp, never a weights swap. The engine face is the extension manifest row `comfyui-cordis/models/audio/seed-vc/nodes.yaml`.

## Contract

- `.` — the DECL + the `convert` action (`lib/index.js`): two LoadAudio heads (source + reference; a spelled upstream output rides its slot verbatim), the SeedVCRun node, SaveAudio under `<run>/vc`. `required_defaults` are the two user-provided audio seats; no variant-class rows.
- `./package.json` — the manifest (engine manifest carries the matching `@melite/models-seed-vc` dependency row).

## Gates

```sh
pnpm --filter @melite/models-seed-vc exec vitest run
node tools/check-package-readmes.mjs --only models/seed-vc
```

## Model Experience

### Request context and condition

The family is a declare-time seat; it conditions nothing until a card binds the convert action and the bench presses the stage.

#### What the model sees

Nothing directly — the family exposes no agent tool. The bound card's stage row (card id, the two audio paths, the knob set) is what a composing agent reads and writes on the bench.

#### Token effect

No request tokens; the DECL's facts door is empty (the upstream node self-loads), so no model-facing prose rides the transcript.

#### KV Cache effect

None — no agent-loop participation.

## Known Limitations and Deferred Work

First run self-loads ~5GB (both DiT lanes, campplus, RMVPE, two BigVGANs, whisper-small); `unload_model=true` on the bound card frees it per run. The upstream extension pack is the engine's own seat (manager-installable); a fresh estate provisions the weights whole from the digest-pinned rows.
