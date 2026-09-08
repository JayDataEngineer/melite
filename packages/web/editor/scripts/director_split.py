#!/usr/bin/env python3
"""Phase 6 of the Core/Surfaces restructure: decompose DirectorStudio.tsx.

Splits the 2,192-line single file into two modules:

    DirectorPanels.tsx   SegmentCard, VariantStrip, DirectorBanner, CtxItem,
                         StatusBadge, ViewModeToggle, capabilitiesForInspector,
                         ModelPill, SchemaSegmentInspector (the storyboard
                         cards + inspector rail components)
    DirectorStudio.tsx   slimmed: helpers, constants, the type re-export, and
                         the main component (store handlers + render JSX)

Pure refactor: every region moves verbatim; imports are recomputed per file
from the original import statements plus explicit cross-module imports.

Usage:
    python scripts/director_split.py --dry-run   # report plan
    python scripts/director_split.py             # write the 2 files
"""
import re
import sys
from pathlib import Path

DIR = Path(__file__).resolve().parent.parent / "src" / "surfaces" / "director"
FILE = DIR / "DirectorStudio.tsx"
DRY = "--dry-run" in sys.argv
SRC = None

# anchor → destination. Regions run from each anchor (comment-extended upward)
# to the next anchor (exclusive).
ANCHORS = [
    ("const FORM_TAG", "main"),
    ("function durationOf", "main"),
    ("export type {", "main"),
    ("const uid", "main"),
    ("function makeSegment", "main"),
    ("function segmentToRunPayload", "main"),
    ("function mapLegacyModel", "main"),
    ("function legacyParamsToSchemaValues", "main"),
    ("export function DirectorStudio", "main"),
    ("function SegmentCard", "panels"),
    ("function VariantStrip", "panels"),
    ("function DirectorBanner", "panels"),
    ("function CtxItem", "panels"),
    ("function StatusBadge", "panels"),
    ("function ViewModeToggle", "panels"),
    ("function capabilitiesForInspector", "panels"),
    ("function ModelPill", "panels"),
    ("function SchemaSegmentInspector", "panels"),
]

PANELS_EXPORTS = {"SegmentCard", "VariantStrip", "DirectorBanner", "CtxItem",
                  "StatusBadge", "ViewModeToggle", "capabilitiesForInspector",
                  "ModelPill", "SchemaSegmentInspector"}

# main-file symbols the panels need (exported from the main so panels can
# import them — circular but safe: used only at render time)
MAIN_EXPORTS = {"FORM_TAG"}
# store types the original module got via the `export type {...} from
# "./directorStore"` re-export — panels need a direct type import
STORE_TYPES = {"DirectorSegment", "DirectorTake", "SegmentStatus"}

EXPORTABLE = {"main": MAIN_EXPORTS, "panels": PANELS_EXPORTS}

HEADS = {
    "main": [
        "// DirectorStudio — storyboard + timeline video director. The panel",
        "// components (segment cards, inspector rail, banner, badges) live in",
        "// DirectorPanels.tsx; this module keeps the store wiring, handlers,",
        "// and the view composition.",
        "//",
        "// Decomposed by scripts/director_split.py (Phase 6 restructure) —",
        "// pure refactor.",
    ],
    "panels": [
        "// Panel components for the video director — storyboard segment cards,",
        "// variant strip, totals banner, context menu items, status badges,",
        "// view-mode toggle, model pills, and the schema-driven segment",
        "// inspector.",
        "//",
        "// Carved from DirectorStudio.tsx by scripts/director_split.py",
        "// (Phase 6 restructure) — pure refactor.",
    ],
}

# ─── parsing ────────────────────────────────────────────────────────────────
# One parsed import member: (spec, alias, is_type); one import statement:
# (whole_is_type, source, members).
ImportMembers = list[tuple[str, str, bool]]
ImportEntry = tuple[bool, str, ImportMembers]

def parse_imports(text: str) -> list[ImportEntry]:
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

def exportify(line: str, exportable: set[str]) -> str:
    if line.startswith("export ") or line.startswith("//") or line.startswith("*"):
        return line
    m = re.match(r"^(async\s+)?(function|const|type|interface)\s+(\w+)", line)
    if m and m.group(3) in exportable:
        return "export " + line
    return line

def main() -> None:
    global SRC
    SRC = FILE.read_text().split("\n")
    src = SRC

    # import block = lines 1..FORM_TAG-1 (everything before the constants)
    first_const = next(i for i, l in enumerate(src) if l.startswith("const FORM_TAG"))
    imports = parse_imports("\n".join(src[:first_const]))

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
        while chunk and chunk[-1].strip() == "":
            chunk.pop()
        bodies[dest].extend(exportify(l, EXPORTABLE[dest]) for l in chunk)
        bodies[dest].append("")
        total += e - s

    if DRY:
        for dest, s, e in regions:
            print(f"  {dest:7s} L{s + 1:5d}–{e:5d}  ({e - s:4d} lines)")
        print(f"  total body lines: {total}")
        return

    out = {}
    for dest, body in bodies.items():
        text = "\n".join(body)
        scan_text = re.sub(r"//[^\n]*", "", text)
        scan_text = re.sub(r"/\*.*?\*/", "", scan_text, flags=re.S)
        used = set(re.findall(r"\b(\w+)\b", scan_text))
        lines = list(HEADS[dest])

        if dest == "main":
            want = used & PANELS_EXPORTS
            if want:
                lines.append(f"import {{ {', '.join(sorted(want))} }} from './DirectorPanels'")
        if dest == "panels":
            want = used & MAIN_EXPORTS
            if want:
                lines.append(f"import {{ {', '.join(sorted(want))} }} from './DirectorStudio'")
            want_types = sorted(used & STORE_TYPES)
            if want_types:
                lines.append(f"import type {{ {', '.join(want_types)} }} from './directorStore'")

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

        lines += ["", *body]
        out[dest] = lines

    files = {"main": "DirectorStudio.tsx", "panels": "DirectorPanels.tsx"}
    for dest, file_name in files.items():
        dest_path = DIR / file_name
        dest_path.write_text("\n".join(out[dest]))
        print(f"wrote {dest_path.relative_to(Path.cwd())} ({len(out[dest])} lines)")

if __name__ == "__main__":
    main()
