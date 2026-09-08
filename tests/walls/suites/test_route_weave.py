"""test_route_weave.py - the /v1 route weave: src references vs served doors.

The rename-sweep class (pipelines to flows, 2026-09-04): a route is
renamed on the gateway but one web-family surface still calls the
old name. Every test passed because each layer was self-consistent;
only the CROSS-LAYER weave was broken - the browser got silent 404s
until someone probed by hand.

This wall extracts both sides from SOURCE (no network, no GPU):

  REFERENCED: every quoted /v1/... literal in the production source
  of the web family (packages/web-kit/catalog, packages/web/editor, packages/web/dsh)
  - tests, dists, and libs excluded (test fixtures use fake URLs).

  SERVED: every /v1 route the TS gateway answers — the authored wire
  SSOT (packages/gateway/src/routes.ts: literal rows + template
  prefixes) PLUS the /v1 stubs the card-deck host owns (/v1/llm -
  the assistant lives in DSH).

A referenced route is COVERED if it equals a static door, sits under
a dynamic prefix, is a static prefix of a dynamic door, or sits
under a host stub. Anything else is drift: FAIL with both sides
printed.

ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not need
parity, we need to migrate, not keep the old machinery"): the SERVED
side used to be extracted from the retired py serving stack's
source text. It now reads the TS SSOT with the same rigid-shape
string-aware scan as tests/walls/suites/test_routes_mirror.py (the
row parser below is copied from that wall — the mirror owns the
shape; a hand-edit that breaks the rigid literal-per-row shape fails
the parse leg LOUDLY here too).

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Run: pytest tests/walls/suites/test_route_weave.py -v
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from _anchor import REPO

ROUTES_TS = REPO / "packages" / "gateway" / "src" / "routes.ts"
DECK_HOST = REPO / "packages" / "web" / "dsh" / "melite-card-deck" / "src" / "index.ts"

# The mirror wall owns the authored row count (54 rows 2026-09-08);
# this wall re-asserts it so the served set can never shrink or grow
# without the weave noticing (a new door with no caller, or a
# dropped door with callers left behind, both fail loudly).
EXPECT_ROWS = 54

WEB_SOURCES = [
    REPO / "web" / "catalog" / "src",
    REPO / "packages" / "web" / "editor" / "src",
    REPO / "packages" / "web" / "dsh",
]

SKIP_PARTS = {"__tests__", "node_modules", "dist", "lib", "test", "e2e"}
SKIP_SUFFIXES = (".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx", ".md", ".json")

ROUTE_RE = re.compile('[\'"](/v1/[A-Za-z0-9/_.-]*)')


# ── TS row scan (copied from test_routes_mirror.py — the mirror ──
# ── owns this shape; do not evolve the copy, fix the source) ─────

def _strip_comments(text: str) -> str:
    """Remove // and /* */ comments outside string literals."""
    out: list[str] = []
    i, n = 0, len(text)
    in_str = False
    while i < n:
        c = text[i]
        if in_str:
            out.append(c)
            if c == "\\":
                if i + 1 < n:
                    out.append(text[i + 1])
                    i += 1
            elif c == '"':
                in_str = False
            i += 1
            continue
        if c == '"':
            in_str = True
            out.append(c)
            i += 1
        elif c == "/" and i + 1 < n and text[i + 1] == "/":
            while i < n and text[i] != "\n":
                i += 1
        elif c == "/" and i + 1 < n and text[i + 1] == "*":
            i += 2
            while i + 1 < n and not (text[i] == "*" and text[i + 1] == "/"):
                i += 1
            i += 2
        else:
            out.append(c)
            i += 1
    return "".join(out)


def _split_top_objects(array_body: str) -> list[str]:
    """Top-level {...} spans of an array literal (string-aware)."""
    objs: list[str] = []
    i, n = 0, len(array_body)
    while i < n:
        if array_body[i] != "{":
            i += 1
            continue
        depth = 0
        in_str = False
        j = i
        while j < n:
            c = array_body[j]
            if in_str:
                if c == "\\":
                    j += 1
                elif c == '"':
                    in_str = False
            elif c == '"':
                in_str = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    objs.append(array_body[i:j + 1])
                    break
            j += 1
        i = j + 1
    return objs


def _str_field(obj: str, name: str) -> str:
    m = re.search(r"%s\s*:\s*\"((?:[^\"\\]|\\.)*)\"" % re.escape(name), obj)
    if m is None:
        raise ValueError("row has no %r string field" % name)
    return json.loads('"%s"' % m.group(1))


def _parse_ts_rows() -> list[dict[str, object]]:
    """Read the authored table back into plain row dicts."""
    text = ROUTES_TS.read_text(encoding="utf-8")
    anchor = text.index("export const ROUTES")
    body = _strip_comments(text[anchor:])
    lb, rb = body.index("["), body.rindex("]")
    rows = []
    for obj in _split_top_objects(body[lb:rb]):
        rows.append({
            "path": _str_field(obj, "path"),
            "template": _str_field(obj, "template"),
            "regex": "regex: true" in obj,
        })
    return rows


def _served() -> tuple[set[str], set[str]]:
    """(static doors, dynamic prefixes) the TS table + deck host answer."""
    rows = _parse_ts_rows()
    static = {str(r["path"]) for r in rows if not r["regex"]}
    dynamic = set()
    for r in rows:
        if not r["regex"]:
            continue
        tmpl = str(r["template"])
        if tmpl:
            # "/v1/flows/status/{run_id}" -> "/v1/flows/status";
            # "/poser/{route}" -> "/poser".
            dynamic.add(tmpl.split("{")[0].rstrip("/"))
        else:
            # No template: strip the regex tail off the path
            # ("^/v1/assets/runs/" -> "/v1/assets/runs").
            path = str(r["path"]).lstrip("^")
            m = re.match(r"/[A-Za-z0-9/_-]+", path)
            assert m is not None, "unparseable regex row %r" % path
            dynamic.add(m.group(0).rstrip("/"))
    dynamic.discard("")
    # The deck host stubs the /v1/llm lane at the wire.
    host_text = DECK_HOST.read_text()
    if re.search(r'path:\s*[\'"]/v1/llm', host_text):
        static.add("/v1/llm")
    return static, dynamic


def _referenced() -> dict[str, str]:
    """{route: first_file_that_references_it} from production src."""
    out: dict[str, str] = {}
    for root in WEB_SOURCES:
        if not root.exists():
            continue
        for f in root.rglob("*"):
            if not f.is_file() or f.suffix not in (".ts", ".tsx"):
                continue
            rel = f.relative_to(REPO)
            if any(p in SKIP_PARTS for p in rel.parts):
                continue
            if str(rel).endswith(SKIP_SUFFIXES):
                continue
            try:
                text = f.read_text(errors="replace")
            except OSError:
                continue
            for m in ROUTE_RE.finditer(text):
                route = m.group(1).rstrip("/")
                if route and route not in out:
                    out[route] = str(rel)
    return out


def _covered(route: str, static: set[str], dynamic: set[str]) -> bool:
    if route in static:
        return True
    for d in dynamic:
        if route.startswith(d + "/") or route == d:
            return True
        # referenced static prefix of a dynamic door (callers build the
        # full URL by appending the id at runtime)
        if d.startswith(route + "/"):
            return True
    for s in static:
        if route.startswith(s + "/"):
            return True
    return False


# KNOWN DRIFT — emptied 2026-09-07 (the legacy-removal stroke): every
# entry below was verified unreferenced-or-served against prod src
# (this wall's own quote-anchored extraction) and deleted. History
# (all recovered, callers deleted or doors ported — the last three,
# /v1/comfyui/interrupt repointed at the stop door, render_glb +
# render_textured callers deleted, died in this stroke):
#   - /v1/manager/* (13 doors): the ComfyUI manager panel store.
#     The gateway serves one /v1/manage door instead.
#   - /v1/agent/*: the editor agent-settings lane (dead surface in
#     the DSH embed - the assistant IS DSH; standalone 404s).
#   - /v1/loras, /v1/controlnets, /v1/compose, /v1/flow-catalog,
#     /v1/media/upload, /v1/comfyui/*, /v1/download-model/stream,
#     /v1/flows/render_*, /v1/flows/yaml/export-comfyui: editor
#     client doors with no TS-side door at all.
# Fix = either port the doors or delete the callers (product call,
# not a test change). NEW drift (a rename sweep missing a surface)
# still fails this wall - that is its job. If a NEW known-drift
# entry ever lands here, give it the fossil-guard treatment from
# test_wire_surface (an exemption whose calls disappear must fail).
KNOWN_DRIFT = set()  # type: set[str]


def test_authored_table_row_count() -> None:
    """The served set is the whole table: no silent row gain/loss."""
    rows = _parse_ts_rows()
    assert len(rows) == EXPECT_ROWS, (
        "routes.ts holds %d rows, want %d — the mirror wall "
        "(test_routes_mirror.py) owns this count; update both walls "
        "in the same stroke" % (len(rows), EXPECT_ROWS))


def test_every_referenced_v1_route_is_served() -> None:
    static, dynamic = _served()
    referenced = _referenced()
    assert referenced, "no /v1 references found in the web family - extraction broke"

    uncovered = {
        r: where for r, where in referenced.items()
        if not _covered(r, static, dynamic) and r not in KNOWN_DRIFT
    }
    if uncovered:
        lines = ["these /v1 routes are referenced by web-family src but "]
        lines.append("NO door serves them (rename drift?):")
        for r, where in sorted(uncovered.items()):
            lines.append("  " + r + "   <- " + where)
        lines.append("")
        lines.append("served static doors: " + ", ".join(sorted(static)))
        lines.append("served dynamic prefixes: " + ", ".join(sorted(dynamic)))
        raise AssertionError(chr(10).join(lines))


def test_the_weave_sees_both_sides() -> None:
    """Sanity: extraction is alive on both ends.

    If the TS table extraction or the web-source walk breaks
    (file moved, format changed), the main test would pass vacuously
    with an empty served set... no - it would fail everything. This
    guard catches the OTHER vacuous case: both sets so small the
    weave is meaningless.
    """
    static, dynamic = _served()
    referenced = _referenced()
    assert len(static) >= 15, f"TS table extraction found only {len(static)} static doors"
    assert len(referenced) >= 5, f"web extraction found only {len(referenced)} references"
