# packages/web — the WEB FAMILY (one card surface, many windows)

> **THE ONE SENTENCE:** `web/dsh` and `web/editor` are essentially the same
> thing — the DSH panels **embed the editor** in an iframe; there is ONE card
> design, rendered by ONE app, seen through two windows.

## The family

| member | what it is |
|---|---|
| `editor/` | **THE card surface** — the React app that renders action cards (`FlowTileGrid`), the studios, the library canvas. Builds to `editor/dist`. |
| `dsh/` | **the DSH windows onto it** — chat toolviews + sidebar panels. The `melite-card-deck` HOST serves `editor/dist` under `/editor/`; `melite-card-view` mounts it in iframes (`/editor/?meliteCards=<draftId>`). |
| `ui_components/` | **the kit** — `@melite/{ui,slots,contracts,formats,catalog}`, engine-agnostic packages any pathway renders. |

## How the embedding works (the "identical appearance" mechanism)

The action cards in the DSH webui look EXACTLY like the editor's cards
because they ARE the editor's cards:

```
DSH conversation
 └─ build_flow toolview          (web/dsh/melite-card-view — CLIENT)
     └─ <iframe src="/editor/?meliteCards=<draftId>">
          │
          ├─ served by web/dsh/melite-card-deck — HOST:
          │    ├─ serves packages/web/editor/dist under /editor/
          │    ├─ proxies /v1/* → the gateway (the vite proxy table, same)
          │    └─ stubs the editor's LLM lane — "the assistant lives in DSH"
          │
          ├─ renders FlowTileGrid — ONE card design, 1:1
          │
          ├─ startEmbedBridge: copies DSH's --dsw-alias-* theme tokens
          │  INTO the frame (Skin Center re-skins both surfaces live)
          ├─ auto-height: the frame fits its content — the cards read as
          │  LISTED IN THE CHAT ("window in window", operator 2026-08-22)
          └─ zoom promotion: the frame promotes to fullscreen for the
             card drilldown
```

The runtime dependency is **total**: the DSH card surface cannot function
without the editor's built dist. That is why both live in ONE family
directory — the embedder and the embedded are siblings, by law.

## Where the dist path is decided (do not break this)

`web/dsh/melite-card-deck/src/index.ts`:

```ts
const EDITOR_DIST = process.env.RAY_EDITOR_DIST
  ?? path.resolve(here, '..', '..', '..', 'editor', 'dist')
// <pkg>/lib → ×3 up = packages/web → editor/dist
```

Family-relative on purpose. Moving either member without updating this
(and the gate) breaks every embedded card at boot. `RAY_EDITOR_DIST`
overrides for out-of-repo layouts.

## Validation (the alignment gate)

`tests/walls/suites/test_web_family.py` encodes this whole contract as data — member
locations, package names, workspace globs, the EDITOR_DIST traversal
(simulated from `<pkg>/lib`), provisioner `link:` targets, the embed-bridge
import. A wrong depth, a missing member, or a stale link fails the GATE,
not boot. Run it with the rest of the python ladder:

```
python3 tests/walls/suites/test_web_family.py
```

## Siblings elsewhere

- `packages/harness/dsh/` — the OTHER DSH family: agent abilities (tools,
  presets, provisioning). No visual coupling to this family; the
  provisioner links BOTH families by package name.
- `packages/engines/*` — the serving estate (the gateway consumes these;
  everything in packages/web is a consumer).
