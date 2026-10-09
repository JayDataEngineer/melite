---
description: The video lane's only door — the h3-timeline card, tool, and studio that tile H3 film windows and score them with dialogue, sfx, and music clips.
kind: package-bundle
---

# @melite/video-h3-timeline

`@melite/video-h3-timeline` is the timeline film card over the H3 family — the only video door (the single-model video cards retired 2026-09-21). The card (`h3-timeline`, declared `film` action) tiles a runtime into H3 windows via the `calls` parameter, and the optional `audio_clips` rail scores each window. `./card` carries the card def, `./tool` the tool face (registered by melite-tools' cardTools gate), `./client` the browser half, and the manifest's `dsh.bundle.patch` (`./cordis.patch.yml`) inserts the row-mounted plugin (`h3-studio`) into the web profile. The cardPackages SSOT composes `./card`; the root face registers nothing.

## Contract

- `./card` — the card definition. `BOARDED` is the `h3` checkpoint; `VARIANT_ADDRESSES` (`h3-timeline`, `h3-fl2va`, `h3-ref2va`, `h3-timeline-ref`, `h3-keyframe`) keep the retired h3 and h3-keyframe family packages alive as variant routes, resolving old drafts migration-free. The schema declares the card's own fields; the window families (t4r/t4_open/t4_chain), the motion-context chaining rail, and the SLA/SR/interp leaves are renderer vocabulary riding the compose door's explicit-params overlay. Node creation order is serialized id order (t4r creates fps before seconds; the reference resizer precedes the geometry resizer — kept verbatim). The autofill strip rides the h3 family's `finalizeH3`; t4r strips nothing. The span-grid contract (`assertCarriedSpanGrid`, `assertGridLength`, `assertSpanGrid`, `gridSnap`) re-exports from `@melite/models-h3` alongside the `carrier`, `JSON_ARRAY_PARAMS`, and `schema` modules.
- `./tool` — `buildH3TimelineTool` (name `h3_timeline`). Params: `calls` — the shots tiling law: each call's `start_frame` equals the previous call's `end_frame`; first calls and `"transition": "cut"` calls author 22+17-frame spans (56, 73, 90, ...), carried later calls author 17-frame spans (the seam overlap comes from the generation head); off-grid frames refuse with the nearest legal frame. `audio_clips` — dialogue, sfx, and music clips; dialogue text rides the window prompt as a timed tag (the lip-sync law), sfx text rides the overall soundscape, music text rides non-diegetic music, and generated voice ducks -14 dB under conditioned clips.
- `./client` — the bench studio registration (browser half, materialized from `lib/client.js`).
- `.` — the row-mounted host face; it registers nothing.
- `./package.json` — the manifest.

## Model Experience

### Request context and condition

The `h3_timeline` tool fires an agent request when called; the card conditions a ComfyUI run when composed.

#### What the model sees

Each H3 window receives its prompt, reference frames, and the audio classes stamped onto it; the agent sees the tool's two long-form JSON schemas and the caller's calls and clips.

#### Token effect

conditional — and heavy: the `calls` and `audio_clips` schemas are long-form contracts that occupy context whenever the tool is registered.

#### KV Cache effect

append-only — tool-call turns append messages; earlier turns stay byte-identical.

## Known Limitations and Deferred Work

- **Off-grid frames refuse** — the tiling law has no flex; a miscounted call stops at the nearest legal frame, by design.
- **One audio lane per class per window** — a clip crossing a seam stamps both windows; a second same-class clip in one window refuses.
- **No per-call audio** — audio authoring lives in `audio_clips`; a `calls`-level audio field is not declared.
