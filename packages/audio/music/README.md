---
description: Text-to-music card and agent tool over the MiniMax Music 3 and YuE2-3B stock ComfyUI nodes.
kind: package-library
---

# @melite/audio-music

`@melite/audio-music` is the music card plus the `music` agent tool. Two families board: `music3` (MiniMax Music 3) and `yue2` (YuE2-3B), both on the `compose` action. The lane is stock-only — the nodes live in upstream core (`comfy_extras.nodes_minimax_music`, `nodes_yue2`), so the card declares no `requires`. The cardPackages SSOT composes the card from `./card`; the tool registers through melite-tools' cardTools gate from `./tool`.

## Contract

- `./card` — the card definition (sidebar key `audio`). Schema: `prompt` (required — "Genre + Vocal Details + Arrangement"), `lyrics` (empty means instrumental), `duration` (5..360 s, default 30 — exact for music3, a ceiling for yue2), `mode` (`full` | `melody` | `off`, default `full` — the yue2 ABC planning rail), plus music3's `guidance_scale` (default 1.7), `n_diffusion_steps` (default 30), `lm_cfg_scale` (default 1.7), and `seed` (−1).
- `./tool` — `buildMusicTool`, the `music` tool face; preview field `prompt`, model enum from the boarded families.
- `.` — the row-mounted composition marker; it registers the card only when the `comfyui` seat exists, and never registers the tool.
- `./package.json` — the manifest.

## Gates

```sh
pnpm --filter @melite/audio-music exec vitest run
```

## Model Experience

### Request context and condition

The `music` tool fires an agent request when called; the card conditions a ComfyUI run when composed.

#### What the model sees

The music model receives the gated caption, lyrics, duration, mode, and guidance values as the composed graph's inputs; the agent sees the tool's parameter schema and the caller's values.

#### Token effect

conditional — the schema occupies context only in sessions that register the tool; values ride only tool-call turns.

#### KV Cache effect

append-only — tool-call turns append messages; earlier turns stay byte-identical.

## Known Limitations and Deferred Work

- **Duration semantics split by family** — music3 honors the number exactly; yue2 treats it as a maximum.
- **Stock nodes only** — capability changes ride upstream core updates; this package declares no extension packs.
