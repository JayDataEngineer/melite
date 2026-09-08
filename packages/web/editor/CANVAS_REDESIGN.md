# Inpaint Studio → Canvas: Simplified Redesign

Reference repos studied:
- **InvokeAI** (`infra/repos/InvokeAI`) — Unified Canvas (now `features/controlLayers`)
- **VNCCS UniCanvas** (`infra/repos/ComfyUI/custom_nodes/ComfyUI_VNCCS_Utils/nodes/unicanvas.py`)
- **Photoshop** — interaction conventions (Hand, Bbox tool, layers panel)

## Goal

Take the three reference UIs and produce **one simplified, streamlined canvas**. We
keep what carries its weight; we drop InvokeAI's heavy machinery (control
adapters, regional-guidance ref images, multiple model bases) that doesn't fit
our single-model VNCCS/Z-Image flow.

---

## What we adopt (and what we drop)

| InvokeAI concept                       | Adopt? | Why                                  |
|----------------------------------------|--------|--------------------------------------|
| Bounding box = generation region       | ✅      | The single biggest UX win. "Generate anywhere." |
| Infinite canvas (pan past image)       | ✅      | Enables outpaint without modal expand. |
| Layer types as discriminated union     | ✅      | Cleaner than our ad-hoc raster/mask string. |
| Inpaint mask as first-class layer type | ✅      | One mask layer per region, not a global veil. |
| Native Konva renderer                  | ❌      | Huge dep + rewrite. Our CSS-composited `<img>`-per-layer works. |
| Control adapters (controlnet/T2I/LoRA) | ❌      | Out of scope — we're single-flow. |
| Regional guidance + ref images         | ❌      | Too much for v1. Could add later. |
| Redux + nanostores split               | ❌      | We use zustand; one store is fine. |
| Photoshop Hand tool / Space-pan        | ✅ done | Shipped this session. |
| PSD export                             | ✅      | Already have PNG compositing; PSD is a small format shim. |

---

## Simplified data model

We already have 90% of this. The change is **discriminating layer `type`** and
**promoting the bbox to a first-class draggable overlay**, not a store-only value.

```ts
// stores/inpaint.ts — proposed shape (incremental migration)

type CanvasTool =
  | 'brush' | 'eraser'           // paint on active layer
  | 'rect' | 'lasso'             // selection / shape mask
  | 'move' | 'transform'         // move/scale/rotate layer
  | 'hand'                       // pan (done)
  | 'bbox'                       // NEW: drag the generation region

type LayerType = 'raster' | 'mask'   // same as today, formalized
// (drop 'magic-select' as a top-level tool — fold into rect/lasso + a modifier)

interface GenBBox { x: number; y: number; width: number; height: number }
// bbox is ALWAYS present after first paint (default: centered 512×512 on canvas).
// bbox tool drags it; the staging overlay + generate button read from it.
```

**No schema migration needed** — our `InpaintLayer.type: 'raster' | 'mask'` is
already a discriminated field. We just stop treating masks as a global veil and
start treating each mask layer as a per-region inpaint mask, exactly like
InvokeAI's `inpaint_mask` entity (minus `noiseLevel`/`denoiseLimit`, which we
fold into the global `gen.denoise`).

---

## UX layout (streamlined)

```
┌──────────────────────────────────────────┬────────────────────┐
│                                          │  Layers panel      │
│                                          │  ┌──────────────┐  │
│         Infinite canvas                  │  │ Raster: BG   │  │
│   (pan/zoom, bbox overlay,               │  │ Mask: face   │  │
│    layers composite via CSS)             │  │ + Add layer  │  │
│                                          │  └──────────────┘  │
│   ┌─ bbox (dashed) ─┐                    │                    │
│   │  generate here  │                    │  Generate          │
│   └─────────────────┘                    │  ┌──────────────┐  │
│                                          │  │ prompt       │  │
│                                          │  │ seed/steps…  │  │
│                                          │  │ [Generate]   │  │
│                                          │  └──────────────┘  │
└──────────────────────────────────────────┴────────────────────┘
   toolbar: brush eraser rect lasso move hand bbox   zoom: 75% 
```

**Streamlining rules (vs InvokeAI):**
1. One toolbar row, not two. Tools grouped: paint | select | navigate | region.
2. Bbox is always visible (dashed blue), draggable, with size readout. No modal.
3. Layers panel: flat list (no per-type collapsible groups — we have ≤2 types).
4. Generate lives in the rail, reads bbox + active mask layer implicitly.

---

## Phased plan

### Phase 1 — Bbox tool + draggable generation region ✅ DONE
- ~~Add `'bbox'` to `MaskTool`/`CanvasTool`.~~ — added (G key)
- ~~Render bbox overlay on the canvas (dashed rect with 8 handles).~~ — done
- ~~Bbox tool: drag body to move, drag handles to resize.~~ — done (moveDragRef anchor)
- ~~Generate reads `bbox`~~ — was already wired; now always-on via `defaultBBox`.
- ~~Keep `expand` outpaint as a power-user shortcut~~ — coexists; auto-grow supersedes.

### Phase 2 — Infinite canvas ✅ DONE
- ~~Outpaint = move bbox outside current pixels → backend fills (VNCCS `source_empty`).~~
  Implemented as `ensureCanvasContainsBBox` in submit: if the bbox extends beyond
  the canvas extent, the canvas grows to contain it before the draw request. The
  bounds check is synchronous so the submit idempotent-guard contract holds.
- ~~PSD export: add `lib/psdExport.ts`.~~ — was already present; verified wired.
- NOTE: the full "base image becomes a plain raster layer" decoupling was deemed
  too risky for marginal benefit — the current `baseImage` + `expand` + `growCanvas`
  model already supports infinite-canvas outpaint via auto-grow on submit.

### Phase 3 — Mask layers as regions ✅ DONE
- ~~Each `mask` layer is an independent inpaint region (not a global veil).~~
  `compositeMaskLayersUnion` composites ALL visible mask layers (union) for the
  draw request — replaced the prior first/last-only `find`.
- ~~Active mask layer + bbox together define the generate target.~~ — implicit.
- ~~Selection tools (rect/lasso) operate on the active mask layer.~~ — already worked
  via `activeLayerId`; now each region renders a distinct veil color (`MASK_COLORS`).
- Single-layer fast path skips the canvas round-trip (returns dataUrl as-is).

### Phase 4 — Polish ✅ DONE
- ~~HUD: zoom %, cursor coords, bbox dimensions.~~ — live cursor coords via
  imperative ref update (no re-render); zoom/bbox already present.
- ~~Snap bbox to common sizes (512, 768, 1024) with Shift.~~ — `snapToCommonSize`
  in the resize effect; preserves the non-dragged edges.
- ~~Keyboard shortcuts sheet.~~ — `?` toggles an overlay listing the ~14 shortcuts.

---

## Non-goals (explicitly out of scope)
- ControlNet / T2I adapters / regional guidance ref images.
- Konva migration.
- Multi-model (we're VNCCS UniCanvas → Z-Image only).
- Collaborative editing.
