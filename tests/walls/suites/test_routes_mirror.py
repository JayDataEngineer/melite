#!/usr/bin/env python3
"""Routes wall — the AUTHORED TS table pinned TS-only.

SSOT FLIP (generators STEP 2, 2026-09-08): packages/gateway-core/src/routes.ts
is hand-authored (the wire SSOT); tools/gen_routes_mirror.py is DELETED.

ORACLE DEATH (2026-09-08): python/gateway.py — the retired serving
stack that this wall checked as a row-for-row mirror — is DELETED per
the operator order "we do not need parity, we need to migrate, not
keep the old machinery". The py-mirror legs (py row count,
row-count equality, template-set equality, full-row equality) die
with it; the TS-SSOT legs below are the wall now. A route change
edits routes.ts in the same stroke, then regens docs + doors from
the TS table.

Legs:
  1. ROW COUNT — the authored table holds exactly 54 rows.
  2. RETIRED GENERATOR — tools/gen_routes_mirror.py must NOT exist
     (the mirror direction is dead; a resurrection fails here).
  3. AUTHORED MARKER — routes.ts carries the AUTHORED header and no
     gen_routes_mirror provenance (a regen overwrite fails here).
  4. TSC — packages/gateway typechecks (routes.ts compiles and every
     doors/decl consumer still resolves its import).
  5. ROUTE_COUNT — node evaluates the table: ROUTES.length is 54 and
     ROUTE_COUNT agrees (the export is the pin, not a comment).

The TS side is parsed with stdlib only (a string-aware scan — no node
needed for legs 1-3): the authored table keeps one rigid object
literal per row, and this wall reads exactly that shape back. A
hand-edit that breaks the rigid shape fails the parse leg LOUDLY
(fix = restore the shape, never weaken the reader).

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Run: python3 tests/walls/suites/test_routes_mirror.py
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]

MIRROR = REPO / "packages" / "gateway-core" / "src" / "routes.ts"
GENERATOR = REPO / "tools" / "gen_routes_mirror.py"
GATEWAY_PKG = REPO / "packages" / "gateway"

EXPECT_ROWS = 54

PASS: list[str] = []
FAIL: list[str] = []


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
    text = MIRROR.read_text(encoding="utf-8")
    anchor = text.index("export const ROUTES")
    body = _strip_comments(text[anchor:])
    lb, rb = body.index("["), body.rindex("]")
    rows = []
    for obj in _split_top_objects(body[lb:rb]):
        qm = re.search(r"query\s*:\s*\[([^\]]*)\]", obj)
        query = [json.loads('"%s"' % s) for s in
                 re.findall(r"\"((?:[^\"\\]|\\.)*)\"", qm.group(1))] \
            if qm else None
        if query is None:
            raise ValueError("row has no query array")
        rows.append({
            "method": _str_field(obj, "method"),
            "path": _str_field(obj, "path"),
            "template": _str_field(obj, "template"),
            "group": _str_field(obj, "group"),
            "summary": _str_field(obj, "summary"),
            "query": query,
            "body": _str_field(obj, "body"),
            "regex": "regex: true" in obj,
            "ws": "ws: true" in obj,
            "attr": _str_field(obj, "attr"),
            "handler": _str_field(obj, "handler"),
        })
    return rows


def _ts_surface(rows: list[dict[str, object]]) -> set[tuple[str, str]]:
    out = set()
    for r in rows:
        tmpl = r["template"] or r["path"]
        assert isinstance(tmpl, str)
        assert isinstance(r["method"], str)
        out.add((r["method"], tmpl))
    return out


def main() -> int:
    # 1. row-count leg — the authored table holds 54 rows.
    try:
        ts_rows = _parse_ts_rows()
    except (OSError, ValueError) as e:
        FAIL.append("ts_parse: cannot read the authored table %s: %s"
                    % (MIRROR, e))
        ts_rows = []

    if ts_rows:
        if len(ts_rows) == EXPECT_ROWS:
            PASS.append("ts_row_count_%d" % EXPECT_ROWS)
        else:
            FAIL.append("ts_row_count: routes.ts holds %d rows, want %d "
                        "(edit the table — it is authored, not generated)"
                        % (len(ts_rows), EXPECT_ROWS))

    # 2. retired generator — the mirror direction is dead.
    if not GENERATOR.exists():
        PASS.append("generator_retired")
    else:
        FAIL.append("generator_retired: %s exists — the mirror direction "
                    "is deleted, routes.ts is authored" % GENERATOR)

    # 3. authored marker — a regen overwrite fails here, not silently.
    try:
        header = MIRROR.read_text(encoding="utf-8")
    except OSError as e:
        FAIL.append("authored_marker: cannot read %s: %s" % (MIRROR, e))
        header = ""
    if header:
        if "AUTHORED, not generated" in header:
            PASS.append("authored_marker_present")
        else:
            FAIL.append("authored_marker: routes.ts lost its AUTHORED "
                        "header — restore it, the table is hand-edited")
        if "gen_routes_mirror" in header:
            FAIL.append("authored_marker: routes.ts still cites "
                        "gen_routes_mirror provenance — the flip owns "
                        "the header")
        else:
            PASS.append("generator_provenance_gone")

    # 4. tsc — the authored table compiles and its consumers resolve.
    tsc = GATEWAY_PKG / "node_modules" / ".bin" / "tsc"
    if not tsc.exists():
        FAIL.append("tsc: gateway toolchain not installed (%s)" % tsc)
    else:
        r = subprocess.run(
            [str(tsc), "--noEmit"], capture_output=True, text=True,
            timeout=300, cwd=str(GATEWAY_PKG))
        if r.returncode == 0:
            PASS.append("gateway_tsc_clean")
        else:
            FAIL.append("gateway_tsc: packages/gateway fails typecheck "
                        "(routes.ts or a consumer broke):\n%s"
                        % ((r.stdout + r.stderr)[-3000:]))

    # 5. ROUTE_COUNT — the export agrees with the table, evaluated.
    r = subprocess.run(
        ["node", "--experimental-strip-types", "--no-warnings",
         "--input-type=module", "-e",
         "import('./packages/gateway-core/src/routes.ts').then(m => "
         "console.log(m.ROUTES.length + ' ' + m.ROUTE_COUNT))"],
        capture_output=True, text=True, timeout=120, cwd=str(REPO))
    if r.returncode == 0 and r.stdout.strip() == "%d %d" % (EXPECT_ROWS,
                                                            EXPECT_ROWS):
        PASS.append("route_count_consistent_%d" % EXPECT_ROWS)
    else:
        FAIL.append("route_count: node eval gave %r (want %r)"
                    % (r.stdout.strip(),
                       "%d %d" % (EXPECT_ROWS, EXPECT_ROWS)))

    for p in PASS:
        print(f"  ok   {p}")
    for f in FAIL:
        print(f"  FAIL {f}")
    print(f"PASS {len(PASS)} / FAIL {len(FAIL)}")
    return 1 if FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
