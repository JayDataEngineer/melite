---
description: The shared timeline element and its storyboard document store — the bar and state both the motion card and the video card render.
kind: package-library
---

# timeline

`@melite-plugin/timeline` is the shared timeline domain: the bar both action cards render (the motion card's prompt/keyframe lanes and the video card's NLE calls and beats rows), the storyboard document store beneath it, and the playback primitives. Moved out of a single consumer so a shared element no longer forces one card to import a sibling's tenant; core surfaces consume it through this import, never through a core package.

## Contract

Three tenant libraries and one browser face; the manifest also declares the standard `./package.json` re-export.

- `./ui/timeline` — the bar itself: `MotionTimelineBar`, `FilmPlayer`, `TimelineScrubBar`, the vendored `viser-timeline` primitives, and the `TimelineTheme`/`PROMPT_COLORS` styling.
- `./ui/store` — the storyboard document: segments, variants, audio cues and tracks, playback, in/out points, chapters, and the segment-params clipboard. Self-hydrating: the first import of this library boots the IndexedDB-to-memory hydration exactly once, and `timelineReady` is the promise to await.
- `./ui/playback` — the playback helpers shared by both cards.
- `./client` — the browser face, re-exporting the three libraries plus the card-base row door (`ASSET_DRAG_MIME`, `Tip`, the icon set) so the face's bundle carries the door require its `dsh.client.external` declaration promises. There is no `dsh.bundle.patch`: the surface rides the consuming card bundles' graphs.

## Model Experience

### Request context and condition

#### What the model sees

None — the package renders timelines and holds storyboard state; it contributes no field to a model request.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no content of this package reaches a model request.

## Known Limitations and Deferred Work

- **Store persistence is browser-local** — the storyboard document hydrates from the machine's IndexedDB; there is no estate-side sync, so a storyboard does not follow an account across machines.
- **No `./invariant` companion** — the libraries are UI state and rendering with one owner each; no cross-package runtime relationship exists for an assertion to check.
