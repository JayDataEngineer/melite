#!/usr/bin/env python3
"""tools/gen_routes_mirror.py — generate the gateway ROUTES mirror FROM
the route table (the wire SSOT in py/gateway.py).

Emits:
  plugins/gateway/src/routes.ts — the `GatewayRoute` row type + the
    full ROUTES table as a GENERATED MIRROR (Phase 0 of the
    gateway → TypeScript cutover, .scratch/gateway-ts-map.md §5:
    SSOT retarget with no behavior change).

Every field the table carries that TypeScript can express lands in
the mirror: method/path/template/group/summary/query/bodyKind/
regex/ws/attr, plus the python handler's NAME as a traceability
string (the callable itself cannot cross the language boundary —
the Phase 1+ door ports in plugins/gateway/src/doors/ map each
row to its TS implementation via this name).

Erasable-syntax TS only (node --experimental-strip-types, the
estate runtime): no enums, no namespaces, no parameter properties.
The wall (tests/walls/suites/test_routes_mirror.py) refuses drift:
row-count 54 + template-set equality py-vs-ts + this generator's
--check in CI mode.

Usage: python3 tools/gen_routes_mirror.py [--check]
  --check: exit 1 if the on-disk file differs from what the table
  generates (CI mode — no writes).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "py"))

import gateway  # noqa: E402  (stdlib only; the table imports clean)

OUT_PATH = REPO / "plugins" / "gateway" / "src" / "routes.ts"

HEADER = """// GENERATED from py/gateway.py ROUTES (the wire SSOT) by
// tools/gen_routes_mirror.py — DO NOT EDIT. Regenerate after every
// route change; tests/walls/suites/test_routes_mirror.py refuses
// drift (row-count 54 + template-set equality py-vs-ts).
//
// Phase 0 of the gateway → TypeScript cutover
// (.scratch/gateway-ts-map.md §5): a GENERATED MIRROR, no behavior.
// The py gateway stays authoritative until the final flag-flip; this
// table is the shape the Phase 1+ door ports implement against.
// Row order is significant: the dispatcher serves first-match-wins,
// so the stage-patch arm stays BEFORE the greedy draft :id arm here
// exactly as in the python table.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, no namespaces — bodyKind is a string union, query is a
// readonly array, every row is a plain object literal.

/** Request-body discipline, mirroring Route.body in py/gateway.py. */
export type BodyKind = "none" | "strict" | "lenient" | "raw";

/** One route row — the TS mirror of Route in py/gateway.py. */
export interface GatewayRoute {
  /** "GET" | "POST" | "DELETE" | "PATCH" | "A|B" multi-arm | "*" any. */
  readonly method: string;
  /** Literal path; the regex source when regex is true. */
  readonly path: string;
  /** Doc/OpenAPI form ("/v1/flows/status/{run_id}"); "" when path is literal. */
  readonly template: string;
  /** Doc group heading (Queue & runs, Health & chrome, …). */
  readonly group: string;
  /** One line for generated docs. */
  readonly summary: string;
  /** Documented query parameter names. */
  readonly query: readonly string[];
  /** Body discipline: none | strict | lenient | raw. */
  readonly body: BodyKind;
  /** True when path is a regex matched against the request path. */
  readonly regex: boolean;
  /** True for websocket doors (hijacked on Upgrade). */
  readonly ws: boolean;
  /** Chrome stubs: the editor_runs attribute serving this door. */
  readonly attr: string;
  /** Python handler NAME (traceability only — the callable cannot
   *  cross the language boundary; Phase 1+ doors map each row to
   *  its TS implementation via this name). */
  readonly handler: string;
}
"""


def _ts_str(value: str) -> str:
    """A python string as a TS double-quoted string literal.

    JSON string syntax is valid TS (summaries carry {braces} but
    never ${ or backticks, so no interpolation hazard), and it
    round-trips backslashes (the regex rows' [^/]+ classes) exactly.
    """
    return json.dumps(value, ensure_ascii=False)


def _row_lines(row: gateway.Route) -> list[str]:
    query = ", ".join(_ts_str(q) for q in row.query)
    handler = row.handler.__name__ if row.handler is not None else ""
    return [
        "  {",
        "    method: %s," % _ts_str(row.method),
        "    path: %s," % _ts_str(row.path),
        "    template: %s," % _ts_str(row.template),
        "    group: %s," % _ts_str(row.group),
        "    summary: %s," % _ts_str(row.summary),
        "    query: [%s]," % query,
        "    body: %s," % _ts_str(row.body),
        "    regex: %s," % ("true" if row.regex else "false"),
        "    ws: %s," % ("true" if row.ws else "false"),
        "    attr: %s," % _ts_str(row.attr),
        "    handler: %s," % _ts_str(handler),
        "  },",
    ]


def generate() -> str:
    lines = [HEADER]
    lines.append("/** The gateway wire table — %d rows, first-match-wins order. */"
                 % len(gateway.ROUTES))
    lines.append("export const ROUTES: readonly GatewayRoute[] = [")
    group = None
    for row in gateway.ROUTES:
        if row.group != group:
            group = row.group
            lines.append("  // ── %s ──" % group)
        lines.extend(_row_lines(row))
    lines.append("];")
    lines.append("")
    lines.append("/** Row count pin — the table holds 54 rows (see the wall). */")
    lines.append("export const ROUTE_COUNT: number = ROUTES.length;")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    out = generate()
    if "--check" in sys.argv[1:]:
        current = OUT_PATH.read_text(encoding="utf-8") \
            if OUT_PATH.exists() else ""
        if current != out:
            print("STALE: %s differs from the ROUTES table — "
                  "run python3 tools/gen_routes_mirror.py" % OUT_PATH)
            return 1
        print("fresh: %s matches the ROUTES table (%d routes)"
              % (OUT_PATH, len(gateway.ROUTES)))
        return 0
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(out, encoding="utf-8")
    print("wrote %s (%d routes)" % (OUT_PATH, len(gateway.ROUTES)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
