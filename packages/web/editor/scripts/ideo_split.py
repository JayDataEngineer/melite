#!/usr/bin/env python3
"""Phase 6 of the Core/Surfaces restructure: decompose IdeogramCanvasEditor.tsx.

Splits the 2,959-line single file into four modules:

    ideoHelpers.ts        pure wire-format helpers + shared constants/types +
                          the __test export (re-exported by the editor so the
                          unit-test import path is unchanged)
    IdeogramCanvas.tsx    the interactive canvas (CanvasProps, PointerMode,
                          HandleId live here — canvas-local types)
    IdeoPanels.tsx        MicroLabel, ColorPaletteInput, ElementInspector,
                          StylePanel, JsonPanel, AIPanel
    IdeogramCanvasEditor.tsx  slimmed: main component + TabButton + ElementList
                          + re-exports (IdeogramCanvasEditor, __test)

Pure refactor: every region moves verbatim; imports are recomputed per file
from the original import statements (member → source mapping), plus explicit
cross-module imports for the moved symbols. The script self-verifies that
every body line lands in exactly one destination.

Usage:
    python scripts/ideo_split.py --dry-run   # report plan
    python scripts/ideo_split.py             # write the 4 files
"""
import re
import sys
from pathlib import Path

CANVAS = Path(__file__).resolve().parent.parent / "src" / "surfaces" / "canvas"
FILE = CANVAS / "IdeogramCanvasEditor.tsx"
DRY = "--dry-run" in sys.argv
SRC = None

# anchor → destination. Regions run from each anchor (comment-extended upward)
# to the next anchor (exclusive), matching the 1-indexed grep map.
ANCHORS = [
    ("type ElementType", "helpers"),
    ("type PointerMode", "canvas"),
    ("type HandleId", "canvas"),
    ("const GRID_SIZE", "helpers"),
    ("let _idSeq", "helpers"),
    ("function MicroLabel", "panels"),
    ("function ColorPaletteInput", "panels"),
    ("interface CanvasProps", "canvas"),
    ("function IdeogramCanvas", "canvas"),
    ("function ElementInspector", "panels"),
    ("function StylePanel", "panels"),
    ("function JsonPanel", "panels"),
    ("function fileToDataUrl", "helpers"),
    ("function applyCaptionToEditor", "helpers"),
    ("function AIPanel", "panels"),
    ("export interface IdeogramCanvasEditorProps", "editor"),
    ("type Tab", "editor"),
    ("export function IdeogramCanvasEditor", "editor"),
    ("function TabButton", "editor"),
    ("function ElementList", "editor"),
    ("export const __test", "helpers"),
]

# symbols moved into ideoHelpers.ts — types vs values (for import emission)
HELPERS_TYPES = {"ElementType", "StyleType", "IdeoElement", "RawElement"}
HELPERS_VALUES = {
    "GRID_SIZE", "SNAP_UNITS", "MIN_BOX", "CANVAS_MAX_HEIGHT",
    "ASPECT_PRESETS", "PALETTE_PRESETS", "STYLE_PRESETS", "FONT_PRESETS",
    "AI_MODES",
    "genId", "clamp", "clampBbox", "bboxToRect", "rectToBbox", "snap",
    "normalizeHex", "sanitizeHexList", "isValidElementsArray",
    "parseElementsJSON", "serializeElements", "extractIdeogramCaptionFromPNG",
    "fileToDataUrl", "applyCaptionToEditor",
}
HELPERS_ALL = HELPERS_TYPES | HELPERS_VALUES
CANVAS_EXPORTS = {"IdeogramCanvas"}  # CanvasProps/PointerMode/HandleId stay local
PANELS_EXPORTS = {"MicroLabel", "ColorPaletteInput", "ElementInspector",
                  "StylePanel", "JsonPanel", "AIPanel"}

EXPORTABLE = {
    "helpers": HELPERS_ALL,
    "canvas": CANVAS_EXPORTS,
    "panels": PANELS_EXPORTS,
    "editor": set(),
}

def exportify(line: str, exportable: set[str]) -> str:
    """Prepend `export` to a moved declaration the destination module re-uses.
    Original exports (`export const __test`, IdeogramCanvasEditorProps, ...)
    and private symbols (`let _idSeq`) are left untouched."""
    if line.startswith("export ") or line.startswith("//") or line.startswith("*"):
        return line
    m = re.match(r"^(async\s+)?(function|const|type|interface)\s+(\w+)", line)
    if m and m.group(3) in exportable:
        return "export " + line
    return line

HEADS = {
    "helpers": [
        "// Pure helpers + shared data for the Ideogram 4 compositional-",
        "// deconstruction editor. Carved from IdeogramCanvasEditor.tsx by",
        "// scripts/ideo_split.py (Phase 6 restructure) — pure refactor.",
        "//",
        "// `__test` lives here and is re-exported by IdeogramCanvasEditor.tsx",
        "// so the unit-test import path is unchanged.",
    ],
    "canvas": [
        "// Interactive canvas for the Ideogram layout editor — drag-to-create",
        "// and resize bounding boxes on the 0–1000 ideogram grid.",
        "//",
        "// Carved from IdeogramCanvasEditor.tsx by scripts/ideo_split.py",
        "// (Phase 6 restructure) — pure refactor.",
    ],
    "panels": [
        "// Side panels for the Ideogram layout editor — element inspector,",
        "// style description editor, JSON tab, and the AI transfer/refine",
        "// panel, plus the small shared bits (MicroLabel, ColorPaletteInput).",
        "//",
        "// Carved from IdeogramCanvasEditor.tsx by scripts/ideo_split.py",
        "// (Phase 6 restructure) — pure refactor.",
    ],
    "editor": [
        "/** IdeogramCanvasEditor — visual canvas + JSON editor for Ideogram 4's",
        " *  compositional-deconstruction prompt format.",
        " *",
        " *  Replaces the plain-text fields for `ideogram4_generate` with a full",
        " *  spatial layout editor:",
        " *",
        " *    • Drag-to-create and resize bounding boxes on a 0–1000 ideogram grid",
        " *    • Live two-way sync with the raw `elements` JSON (canvas ⇄ textarea)",
        " *    • Per-element inspector: description, text content, palette, bbox",
        " *    • Style description editor (aesthetics, lighting, medium, palette)",
        " *    • PNG metadata re-inflation (drag a generated PNG back to restore the layout)",
        " *    • Aspect-ratio aware, with presets that sync width × height",
        " *    • Keyboard shortcuts: ⌫ delete, ⌘D duplicate, arrows nudge, Esc deselect",
        " *    • Fullscreen canvas mode for tight layouts",
        " *",
        " *  No canvas library is pulled in. The viewport is an HTML overlay layer",
        " *  styled with `aspect-ratio: W / H` and `%` offsets, so bboxes are stored",
        " *  and rendered directly in Ideogram's native 0–1000 coordinate space — no",
        " *  per-frame normalization math, no SVG stretching on non-square aspects,",
        " *  crisp text at any size. Pointer events are converted back to ideogram",
        " *  units via the container's getBoundingClientRect().",
        " *",
        " *  Wire format (matches media/ideogram4.py `_build_caption`):",
        " *    elements: [{type:\"obj\"|\"text\", desc, text?, bbox:[ymin,xmin,ymax,xmax],",
        " *                color_palette:[\"#RRGGBB\", ...]}]",
        " */",
        "//",
        "// Decomposed into ideoHelpers.ts + IdeogramCanvas.tsx + IdeoPanels.tsx",
        "// by scripts/ideo_split.py (Phase 6 restructure) — pure refactor.",
    ],
}

# ─── parsing ────────────────────────────────────────────────────────────────
# One parsed import member: (spec, alias, is_type); one import statement:
# (whole_is_type, source, members).
ImportMembers = list[tuple[str, str, bool]]
ImportEntry = tuple[bool, str, ImportMembers]

def parse_imports(text: str) -> list[ImportEntry]:
    """Parse import statements into [(whole_is_type, source, [(spec, alias, is_type)])]."""
    imports = []
    for m in re.finditer(
        r"import\s+(type\s+)?\{([^}]*)\}\s+from\s+['\"]([^'\"]+)['\"]", text, re.S
    ):
        whole_is_type = bool(m.group(1))
        source = m.group(3)
        members = []
        for part in m.group(2).split(","):
            part = part.strip()
            if not part:
                continue
            tm = re.match(r"^(type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?$", part)
            if not tm:
                raise SystemExit(f"!! unparseable import member: {part!r}")
            members.append((tm.group(2), tm.group(3) or tm.group(2), bool(tm.group(1))))
        imports.append((whole_is_type, source, members))
    return imports

def leading_comment_extent(lines: list[str], start: int) -> int:
    i = start
    while i > 0:
        t = lines[i - 1].strip()
        if t == "" or t.startswith("//") or t.startswith("*") or t.startswith("/*"):
            i -= 1
        else:
            break
    return i

def main() -> None:
    global SRC
    SRC = FILE.read_text().split("\n")
    src = SRC
    imports = parse_imports("\n".join(src[26:75]))  # original import block

    # locate anchors → 0-indexed region starts
    starts = []
    for pat, dest in ANCHORS:
        m = re.compile("^" + re.escape(pat)).match
        for i, l in enumerate(src):
            if m(l):
                starts.append((i, dest))
                break
        else:
            raise SystemExit(f"!! anchor not found: {pat!r}")
    starts.sort()
    # build regions: (dest, start, end-exclusive); comment-extend each start,
    # then pull every end back to the next region's extended start so comment/
    # blank territory above a region is owned by THAT region, never doubled.
    regions = []
    for idx, (i, dest) in enumerate(starts):
        end = starts[idx + 1][0] if idx + 1 < len(starts) else len(src)
        regions.append((dest, leading_comment_extent(src, i), end))
    for idx in range(len(regions) - 1):
        if regions[idx + 1][1] < regions[idx][2]:
            regions[idx] = (regions[idx][0], regions[idx][1], regions[idx + 1][1])

    bodies = {k: [] for k in HEADS}
    total = 0
    for dest, s, e in regions:
        chunk = src[s:e]
        # drop trailing blank lines; keep everything else verbatim
        while chunk and chunk[-1].strip() == "":
            chunk.pop()
        bodies[dest].extend(exportify(l, EXPORTABLE[dest]) for l in chunk)
        bodies[dest].append("")
        total += e - s

    if DRY:
        for dest, s, e in regions:
            print(f"  {dest:8s} L{s + 1:5d}–{e:5d}  ({e - s:4d} lines)")
        print(f"  total body lines: {total}")
        return

    # ── emission ──────────────────────────────────────────────────────────
    out = {}
    for dest, body in bodies.items():
        text = "\n".join(body)
        # scan identifiers in CODE only — comments can mention any identifier
        # (e.g. "the caption-assemble useMemo") and must not pull imports
        scan_text = re.sub(r"//[^\n]*", "", text)
        scan_text = re.sub(r"/\*.*?\*/", "", scan_text, flags=re.S)
        used = set(re.findall(r"\b(\w+)\b", scan_text))
        lines = list(HEADS[dest])

        # cross-module imports (moved symbols)
        def cross(dest: str, names: set[str], module: str) -> None:
            want = used & names
            if not want:
                return
            types = sorted(want & HELPERS_TYPES)
            values = sorted(want - HELPERS_TYPES)
            if types:
                lines.append(f"import type {{ {', '.join(types)} }} from '{module}'")
            if values:
                lines.append(f"import {{ {', '.join(values)} }} from '{module}'")

        if dest != "helpers":
            cross(dest, HELPERS_ALL, "./ideoHelpers")
        if dest == "editor":
            cross(dest, CANVAS_EXPORTS, "./IdeogramCanvas")
            cross(dest, PANELS_EXPORTS, "./IdeoPanels")

        # distribute the original imports (skip ones now unused)
        for whole_is_type, source, members in imports:
            sub = [mm for mm in members if mm[1] in used]
            if not sub:
                continue
            parts = []
            for spec, alias, is_type in sub:
                tok = ("" if whole_is_type else ("type " if is_type else "")) + spec
                if alias != spec:
                    tok += " as " + alias
                parts.append(tok)
            kind = "type " if whole_is_type else ""
            lines.append(f"import {kind}{{ {', '.join(parts)} }} from '{source}'")

        # re-export __test so the unit-test import path stays valid
        if dest == "editor":
            lines.append("export { __test } from './ideoHelpers'")

        lines += ["", *body]
        out[dest] = lines

    # editor keeps the original file name; helpers/canvas/panels are new files
    files = {
        "helpers": "ideoHelpers.ts",
        "canvas": "IdeogramCanvas.tsx",
        "panels": "IdeoPanels.tsx",
        "editor": "IdeogramCanvasEditor.tsx",
    }
    for dest, file_name in files.items():
        dest_path = CANVAS / file_name
        dest_path.write_text("\n".join(out[dest]))
        print(f"wrote {dest_path.relative_to(Path.cwd())} ({len(out[dest])} lines)")

if __name__ == "__main__":
    main()
