#!/usr/bin/env python3
"""Routes-mirror wall — the py ROUTES table vs its GENERATED TS mirror.

Phase 0 of the gateway → TypeScript cutover (.scratch/gateway-ts-map.md
§5): packages/gateway/src/routes.ts is emitted FROM python/gateway.py ROUTES
by tools/gen_routes_mirror.py. This wall refuses drift between the two
sides of that generation:

  1. ROW COUNT — both sides hold exactly 54 rows.
  2. TEMPLATE-SET EQUALITY — {(method, template-or-path)} is identical
     py-vs-ts (a dropped or renamed door fails here, not as a 404).
  3. GENERATOR FRESHNESS — tools/gen_routes_mirror.py --check is clean,
     so every OTHER field (group/summary/query/bodyKind/regex/ws/attr/
     handler) is byte-identical too, not just the template set.

The TS side is parsed with stdlib only (a string-aware scan — no node
needed): the generator emits one rigid object literal per row, and this
wall reads exactly that shape back. A hand-edited routes.ts that breaks
the emitted shape fails the parse leg LOUDLY (fix = regenerate, never
hand-edit the mirror).

Run: python3 tests/walls/suites/test_routes_mirror.py
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "python"))

import gateway  # noqa: E402  (stdlib only; the table imports clean)

MIRROR = REPO / "packages" / "gateway" / "src" / "routes.ts"
GENERATOR = REPO / "tools" / "gen_routes_mirror.py"

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
    """Read the generated mirror back into plain row dicts."""
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
            "query": query,
            "regex": "regex: true" in obj,
            "ws": "ws: true" in obj,
        })
    return rows


def _py_surface() -> set[tuple[str, str]]:
    return {(r.method, r.template or r.path) for r in gateway.ROUTES}


def _ts_surface(rows: list[dict[str, object]]) -> set[tuple[str, str]]:
    out = set()
    for r in rows:
        tmpl = r["template"] or r["path"]
        assert isinstance(tmpl, str)
        assert isinstance(r["method"], str)
        out.add((r["method"], tmpl))
    return out


def main() -> int:
    py_rows = list(gateway.ROUTES)

    # 1. row-count legs — the table holds 54 rows, on both sides.
    if len(py_rows) == EXPECT_ROWS:
        PASS.append("py_row_count_%d" % EXPECT_ROWS)
    else:
        FAIL.append("py_row_count: ROUTES holds %d rows, want %d"
                    % (len(py_rows), EXPECT_ROWS))

    try:
        ts_rows = _parse_ts_rows()
    except (OSError, ValueError) as e:
        FAIL.append("ts_parse: cannot read the mirror %s: %s" % (MIRROR, e))
        ts_rows = []

    if ts_rows:
        if len(ts_rows) == EXPECT_ROWS:
            PASS.append("ts_row_count_%d" % EXPECT_ROWS)
        else:
            FAIL.append("ts_row_count: routes.ts holds %d rows, want %d "
                        "(regenerate: python3 tools/gen_routes_mirror.py)"
                        % (len(ts_rows), EXPECT_ROWS))
        if len(ts_rows) == len(py_rows):
            PASS.append("row_count_equal_%d" % len(py_rows))
        else:
            FAIL.append("row_count: py=%d vs ts=%d"
                        % (len(py_rows), len(ts_rows)))

        # 2. template-set equality — no dropped or renamed doors.
        py_surface, ts_surface = _py_surface(), _ts_surface(ts_rows)
        missing = sorted(py_surface - ts_surface)
        extra = sorted(ts_surface - py_surface)
        if not missing and not extra:
            PASS.append("template_set_equal_%d" % len(py_surface))
        else:
            if missing:
                FAIL.append("template_set: %d py door(s) missing from "
                            "routes.ts: %s" % (len(missing), missing[:6]))
            if extra:
                FAIL.append("template_set: %d routes.ts door(s) with no "
                            "py row: %s" % (len(extra), extra[:6]))

    # 3. generator freshness — every other field byte-identical too.
    r = subprocess.run(
        [sys.executable, str(GENERATOR), "--check"],
        capture_output=True, text=True, timeout=60, cwd=str(REPO))
    if r.returncode == 0:
        PASS.append("mirror_check_clean")
    else:
        FAIL.append("mirror_check: %s" % (r.stdout.strip() or
                                          "generator --check failed"))

    for p in PASS:
        print(f"  ok   {p}")
    for f in FAIL:
        print(f"  FAIL {f}")
    print(f"PASS {len(PASS)} / FAIL {len(FAIL)}")
    return 1 if FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
