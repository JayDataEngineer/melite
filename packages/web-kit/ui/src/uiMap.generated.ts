/**
 * GENERATED from py/ui_map.py — DO NOT EDIT.
 * Regenerate: python3 tools/gen_ui_map.py --write
 * The map is the SSOT (docs/design/ui-map.md); this file is its
 * TypeScript face. The parity wall refuses drift, and the
 * written-once wall refuses any second hand-written union.
 */

/**
 * The CENTER seam's viewport primitives (closed union).
 * stage3d — the shared 3d Stage (3d/ui/viewers Stage).
 * paint2d — PaintCanvas2D (image/ui).
 * native  — the tenant's OWN viewport rides the center seam
 * directly (anny's one-mesh figure order).
 */
export type ViewportKind = "stage3d" | "paint2d" | "native"

/**
 * The BOTTOM seam's bar primitives (closed union). Omit
 * `bottom` for none — absence is not a kind.
 * recipe   — OutputStrip (one subcard per armed recipe).
 * timeline — the motion/video transport bar.
 */
export type BarKind = "recipe" | "timeline"

/**
 * What a viewport overlay ROW renders as (closed union;
 * view-state chips only — a control that writes card state is a
 * VERB, not an overlay).
 * toggle    — one chip, active|inactive.
 * segmented — one-of-many chips, the active option lit.
 * status    — a non-interactive live pill.
 */
export type OverlayKind = "toggle" | "segmented" | "status"

/**
 * Which viewport corner a chip row docks to (closed union).
 */
export type OverlayDock = "tl" | "tr" | "bl" | "br"

/**
 * Where floating CONTENT docks over a viewport (closed union;
 * every member names a REAL tenant shape).
 * top-right / top-left       — the pins (source badge, pill).
 * bottom-right / bottom-left — panels (mask prep preview).
 * bottom-center              — the bars (selection bar, hint).
 * bottom                     — notice strips (full-width, inset).
 * fill                       — the washes (drop rings, veils).
 * edge-right / edge-left     — docked drawers (anny shape).
 */
export type ViewportAnchorDock = "top-right" | "top-left" | "bottom-right" | "bottom-left" | "bottom-center" | "bottom" | "fill" | "edge-right" | "edge-left"
