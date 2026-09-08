#!/usr/bin/env python3
"""gen_ui_map — emit the TypeScript face of py/ui_map.py (the map
stroke, 2026-09-07; design record docs/design/ui-map.md).

THE LAW (same shape as gen_registry):
  * py/ui_map.py is the SSOT. packages/web-kit/ui/src/uiMap.generated.ts is a
    DERIVED ARTIFACT — hand edits are drift; this tool regenerates
    and the parity wall (dry run, exit 1 on drift) pins it.
  * The kit imports the generated unions and RE-EXPORTS them; no
    second hand-written union may exist in packages/web-kit/ui/src (the
    written-once wall enforces this by scan).

Usage:
  python3 tools/gen_ui_map.py            # dry run: print drift
  python3 tools/gen_ui_map.py --write    # rewrite the generated file
"""
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "py"))

import ui_map  # noqa: E402

GENERATED = os.path.join(REPO, "packages", "web-kit", "ui", "src", "uiMap.generated.ts")

# declaration order is the emission order
ENUMS = [
    ui_map.ViewportKind,
    ui_map.BarKind,
    ui_map.OverlayKind,
    ui_map.OverlayDock,
    ui_map.ViewportAnchorDock,
]

HEADER = """/**
 * GENERATED from py/ui_map.py — DO NOT EDIT.
 * Regenerate: python3 tools/gen_ui_map.py --write
 * The map is the SSOT (docs/design/ui-map.md); this file is its
 * TypeScript face. The parity wall refuses drift, and the
 * written-once wall refuses any second hand-written union.
 */
"""


def ts_doc(doc: str, indent: str = "") -> str:
    """Render a python docstring as a ts block comment."""
    lines = [ln.rstrip() for ln in doc.strip().splitlines()]
    out = [indent + "/**"]
    for ln in lines:
        out.append(indent + (" * " + ln).rstrip())
    out.append(indent + " */")
    return "\n".join(out)


def render() -> str:
    parts = [HEADER]
    for enum in ENUMS:
        members = " | ".join('"%s"' % m.value for m in enum)
        parts.append(ts_doc(enum.__doc__))
        parts.append("export type %s = %s\n" % (enum.__name__, members))
    return "\n".join(parts)


def main() -> int:
    want = render()
    if "--write" in sys.argv:
        with open(GENERATED, "w", encoding="utf-8") as fh:
            fh.write(want)
        print("wrote %s (%d enums)" % (GENERATED, len(ENUMS)))
        return 0
    if not os.path.isfile(GENERATED):
        print("DRIFT: %s does not exist — run --write" % GENERATED)
        return 1
    have = open(GENERATED, encoding="utf-8").read()
    if have != want:
        print("DRIFT: %s is stale — run --write" % GENERATED)
        return 1
    print("%s matches py/ui_map.py (%d enums)" % (GENERATED, len(ENUMS)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
