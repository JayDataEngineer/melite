"""ui_map — THE SEAM VOCABULARY, written once (2026-09-07, the
map stroke; design record docs/design/ui-map.md).

Every closed union the studio seams speak lives HERE and nowhere
else. tools/gen_ui_map.py emits the TypeScript face
(packages/web-kit/ui/src/uiMap.generated.ts) from these enums; the kit imports
the generated unions; the parity wall
(tests/walls/suites/test_ui_map_parity.py) refuses drift in both
directions and refuses any second hand-written union. This is the
portability law made mechanical: the map is the wire format, the
renderers (tsx kit today, a python FT kit at M3) are consumers.

Rows (the M2 DSL skeleton): the frozen pydantic row schemas below
are the python shape plugins will declare against — validated at
construction, closed vocabularies by enum (the PYTHON SHAPE LAW
mirror). The ts row-renderer that walks these rows is queued
behind its first real consumer (the promotion rule).
"""
from enum import Enum

from pydantic import BaseModel, ConfigDict, ValidationError


class ViewportKind(str, Enum):
    """The CENTER seam's viewport primitives (closed union).
    stage3d — the shared 3d Stage (3d/ui/viewers Stage).
    paint2d — PaintCanvas2D (image/ui).
    native  — the tenant's OWN viewport rides the center seam
    directly (anny's one-mesh figure order)."""

    STAGE_3D = "stage3d"
    PAINT_2D = "paint2d"
    NATIVE = "native"


class BarKind(str, Enum):
    """The BOTTOM seam's bar primitives (closed union). Omit
    `bottom` for none — absence is not a kind.
    recipe   — OutputStrip (one subcard per armed recipe).
    timeline — the motion/video transport bar."""

    RECIPE = "recipe"
    TIMELINE = "timeline"


class OverlayKind(str, Enum):
    """What a viewport overlay ROW renders as (closed union;
    view-state chips only — a control that writes card state is a
    VERB, not an overlay).
    toggle    — one chip, active|inactive.
    segmented — one-of-many chips, the active option lit.
    status    — a non-interactive live pill."""

    TOGGLE = "toggle"
    SEGMENTED = "segmented"
    STATUS = "status"


class OverlayDock(str, Enum):
    """Which viewport corner a chip row docks to (closed union)."""

    TOP_LEFT = "tl"
    TOP_RIGHT = "tr"
    BOTTOM_LEFT = "bl"
    BOTTOM_RIGHT = "br"


class ViewportAnchorDock(str, Enum):
    """Where floating CONTENT docks over a viewport (closed union;
    every member names a REAL tenant shape).
    top-right / top-left       — the pins (source badge, pill).
    bottom-right / bottom-left — panels (mask prep preview).
    bottom-center              — the bars (selection bar, hint).
    bottom                     — notice strips (full-width, inset).
    fill                       — the washes (drop rings, veils).
    edge-right / edge-left     — docked drawers (anny shape)."""

    TOP_RIGHT = "top-right"
    TOP_LEFT = "top-left"
    BOTTOM_RIGHT = "bottom-right"
    BOTTOM_LEFT = "bottom-left"
    BOTTOM_CENTER = "bottom-center"
    BOTTOM = "bottom"
    FILL = "fill"
    EDGE_RIGHT = "edge-right"
    EDGE_LEFT = "edge-left"


# ── THE ROWS (the M2 DSL skeleton — frozen, construction-validated) ──


class CenterSeamRow(BaseModel):
    """The center seam: what fills the studio's viewport region."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    kind: ViewportKind


class BottomSeamRow(BaseModel):
    """The bottom seam: the bar. None (omitted) means no bar —
    absence is not a kind."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    kind: BarKind


class RailSeamRow(BaseModel):
    """The rail seam: the slot keys the tenant's card declares."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    slots: tuple[str, ...] = ()


class OverlayRow(BaseModel):
    """One declared viewport chip row (the ViewportOverlays seam)."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    id: str
    kind: OverlayKind
    dock: OverlayDock
    group: str | None = None
    label: str | None = None
    active: bool = False
    options: tuple[str, ...] = ()
    value: str | None = None
    busy: bool = False


class AnchorRow(BaseModel):
    """One declared floating-content dock (the ViewportAnchor seam).
    The row carries WHERE; the content node rides the renderer."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    id: str
    dock: ViewportAnchorDock


class ShellRows(BaseModel):
    """A tenant's whole shell ride, as data — the python face of the
    ts ShellDeclaration. `center` is REQUIRED (a studio without a
    center is not a studio)."""
    model_config = ConfigDict(frozen=True, extra="forbid")

    center: CenterSeamRow
    bottom: BottomSeamRow | None = None
    rail: RailSeamRow | None = None
    overlays: tuple[OverlayRow, ...] = ()
    anchors: tuple[AnchorRow, ...] = ()


__all__ = [
    "ViewportKind", "BarKind", "OverlayKind", "OverlayDock",
    "ViewportAnchorDock", "CenterSeamRow", "BottomSeamRow",
    "RailSeamRow", "OverlayRow", "AnchorRow", "ShellRows",
    "ValidationError",
]
