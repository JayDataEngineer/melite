# Canvas V2 — analysis + execution plan

Eight asks from the user, each with a concrete shortcoming vs. Photoshop and a
fix plan. Ordered by **execution priority** (foundation first, surface last).

---

## 1. Layers: flat peers + per-mask generation config (AI-native)

### Shortcoming vs. Photoshop
In Photoshop, a mask is **parented** to the layer it modifies (parent/child
tree). Our initial plan was to mimic that. **It was wrong** — neither reference
implementation does this:

- **VNCCS UniCanvas** (`unicanvas.py:1790`): flat `state.layers` array of
  rasters; mask is a separate top-level payload field, not even a layer.
- **InvokeAI** (`store/types.ts:664`): flat discriminated union —
  `raster_layer | control_layer | inpaint_mask | regional_guidance` are all
  top-level peers. `zCanvasEntityBase` is just `{ id, name, isEnabled,
  isLocked }` — no `parentId`, no nesting.

The Photoshop parent/child model is unique to Photoshop's raster-editor
heritage. Generative canvases use masks as **generation instructions**, not
pixel-clip modifiers — so binding a mask to a single raster layer is an
anti-pattern (kills multi-layer/global workflows, makes undo/dnd harder).

Our real "big mush" symptom has three causes that we already fixed last round
(tint rendering, solo mode, tinted thumbnails) plus one we haven't:
**masks don't carry their own prompt.** That's why "describe the masked region"
makes no sense with multiple masks — the right rail prompt is global.

### Fix (revised, ~80 LOC — no migration)
Keep the flat `layers[]` peer model. Add a per-mask generation config so each
mask is a self-contained inpaint target — exactly InvokeAI's
`regional_guidance` pattern.

```ts
interface InpaintLayer {
  id: string
  type: 'raster' | 'mask'   // unchanged — flat peers
  // ... existing fields
  /** Per-mask generation config. null on raster layers. When the user
   *  right-clicks a mask → "Generate here", this config drives the request.
   *  Sets up #4 (context-menu generation). */
  genConfig?: LayerGenConfig | null
}

interface LayerGenConfig {
  positive: string
  negative: string
  seed?: number
  steps?: number
  denoise?: number
  loras?: string[]
}
```

UI: when a `mask` layer is active, the prompt panel shows THAT mask's
`genConfig` (not a global prompt). Submit reads from the active mask's config
when present; falls back to the legacy global prompt otherwise. Old projects
deserialize with `genConfig: null` — no migration needed.

This sets up cleanly for #4 (right-click mask → context-menu "Generate here")
without a data-model rewrite.

**Scope: ~80 LOC. No migration. Unblocks #4 and #5.**

---

## 2. Undo / redo

### Shortcoming
Undo is **fragmented across three stacks** with no unified history:
- `past[]/future[]` — only base-image operations (load/expand).
- `layer.maskStrokes/undoneStrokes` — per-stroke undo, **per active layer**
  (`U` / `Shift+U`). Ctrl+Z doesn't touch strokes at all.
- Layer ops (add/delete/duplicate/reorder/transform/rename/visibility/opacity)
  have **zero history**.

Result: Ctrl+Z undoes the last base-image load; deleting a layer is permanent;
transforming is permanent. This is what the user means by "no undo/redo."

### Fix
Replace the three stacks with **one** `HistoryEntry[]` + `cursor` on the store.
Every mutating action pushes a serialized patch (or inverse-action) and clears
`future`. Bound to **Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y** (already partially wired
but pointed at the wrong stacks — repoint to the unified stack).

Use **state snapshots** (serialize `layers + baseImage + bbox` to a structured
clone) — simplest to reason about, ~50ms per snapshot for typical projects,
cap the stack at ~50 entries with FIFO eviction. Cheaper than inverse-patches
for our shape (lots of disparate ops).

**Scope: ~250 LOC. Replacement for `past/future/undoneStrokes`.**

---

## 3. Left vertical tool bar (Photoshop-style)

### Shortcoming
Tools currently live as text buttons in the right `InpaintToolbar` rail mixed
with prompt/controls — nothing like Photoshop's vertical icon palette on the
left edge.

### Fix
New `<ToolDock>` component, left-edge of the canvas viewport (NOT the right
rail). Vertical strip of icon-only buttons grouped:
- **Move / Transform / Hand** (navigation)
- **Brush / Eraser** (paint)
- **Rect / Lasso / Magic-select** (selection)
- **Bbox** (generation region)

Each shows tooltip + keyboard shortcut. Active tool = brand accent. The rail
keeps prompt + submit only.

**Scope: ~150 LOC + removing tool buttons from InpaintToolbar.**

---

## 4. Smart image generation: context-menu, not sidebar

### Shortcoming
Today: write one prompt in the right rail, click Generate, it generates into
the bbox using the union of ALL mask layers. With multiple regions this is
incoherent — "describe the masked region" when there are 3 masks?

### Fix
Right-click **over a masked region** opens a context menu:
```
┌─────────────────────────────────┐
│  Generate here…          ▶      │
│  Edit with Qwen…        ▶      │
│  ─────────────────────────      │
│  Layer via Copy                 │
│  Layer via Cut                  │
│  Select → New Mask              │
│  Clear Mask                     │
└─────────────────────────────────┘
```
"Generate here" opens a **modal** scoped to that single mask:
- positive/negative prompt, seed, steps, denoise, LoRAs
- preview of the mask region being generated
- submit → writes the result back into the bbox'd sub-region of the parent
  layer's pixels (not as a new layer; composites into the source).

Backend contract unchanged (still VNCCS `/draw` with a single mask). We just
narrow the prompt scope per region.

**Scope: ~400 LOC. Replaces the right-rail Generate panel for masks.**

---

## 5. Magic-select: SAM + YOLO segmentation, then Layer via Copy/Cut

### Shortcoming
Current magic-select is "click points → backend SAM-like service" and the UX
is unclear (foreground/background clicks, confirm/clear buttons in the rail).
Doesn't feel like Photoshop's Object Selection + magic-wand.

### Fix
- Click on canvas → **SAM** predicts the segment under the cursor (point prompt).
  Optional: **YOLO** for "select all objects" mode (multi-box).
- Selection renders as marching-ants (standard `setLineDash` animated).
- Right-click on the selection → context menu (same menu as #4, **Layer via
  Copy / Cut**).
- Layer via Copy: new raster layer with the selected pixels (alpha = mask).
- Layer via Cut: same + erase source pixels from the parent.

SAM service: keep the existing endpoint, swap the click-confirm flow for
inference-on-click + context-menu action.

**Scope: ~500 LOC (includes marching-ants + new layer ops).**

---

## 6. Transform ("xform doesn't work")

### Bugs identified (concrete)
1. **Output clipping.** `transformLayer` draws into a canvas the size of the
   ORIGINAL image — any rotation/scale-up crops the result. Fix: compute the
   bounding box of the transformed corners and size the destination canvas to
   fit.
2. **Scale math.** `TransformOverlay` computes scale from distance to the
   image center, but reads from `d.startDist` (also center-distance). On a
   non-square image this conflates X and Y scaling. Should compute per-axis
   from corner handles, center-scale from corner handles only.
3. **No preview commit on Enter / double-click.** The overlay commits on every
   pointerup; user can't "abort." Add Enter=commit / Esc=cancel.
4. **No pointer capture.** Dragging outside the viewport drops events. Add
   `setPointerCapture`.

**Scope: ~200 LOC.**

---

## 7. Qwen-img-edit modal

### Shortcoming
Qwen qwen-img-edit-2511 is wired but only as a separate workspace flow, not callable
on a selection inside Canvas.

### Fix
Shared modal component (the one built in #4) with a "mode" prop:
`'generate' | 'qwen-edit'`. Qwen-edit mode takes a selection (or whole image),
a prompt, and an edit strength. Submit hits the existing qwen-edit endpoint.
Result writes back to the selection's parent layer.

**Scope: ~150 LOC (modal + adapter; reuses #4's shell).**

---

## 8. Testing

### Shortcoming
123 tests cover the store + geometry + smoke. ZERO coverage for:
- Layer ops (add/duplicate/merge/reorder/visibility/lock)
- Stroke commit paths (mask commit, raster commit)
- History (undo/redo across op types)
- Context-menu actions (generate-here, layer via copy/cut)
- Transform (output dimensions, transform-then-undo round-trip)

### Fix
Add `src/__tests__/inpaint-layers.test.ts`,
`inpaint-history.test.ts`, `inpaint-transform.test.ts`,
`inpaint-context-menu.test.tsx`. Pattern: drive the store directly + assert
state; for components, React Testing Library + `userEvent` for context-menu
flows. Mock the backend `/draw` and qwen-edit endpoints at the fetch layer.

**Scope: ~800 LOC of tests, landed alongside each feature above.**

---

## Execution order (this session)

Realistic in one session: items **#6 (transform)**, **#3 (tool dock)**, **#2
(undo/redo)**, and **#8 (test scaffolding + layer-op tests)**. These are the
foundation — they unblock the bigger architectural items (#1 layers, #4
context-menu, #5 SAM) which I'll start on but flag as multi-session work.

| Item | Risk | LOC | Session |
|------|------|-----|---------|
| #6 Transform | low | 200 | **this round** |
| #3 Tool dock | low | 150 | **this round** |
| #2 Undo/redo | medium | 250 | **this round** |
| #8 Tests | low | per-feature | **rolling** |
| #1 Layers restructure | HIGH | 600 | next round |
| #4 Context-menu gen | medium | 400 | next round |
| #5 SAM + LviaC/C | medium | 500 | next round |
| #7 Qwen modal | low | 150 | next round |
