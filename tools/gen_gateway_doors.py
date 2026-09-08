#!/usr/bin/env python3
"""tools/gen_gateway_doors.py — generate the frontend's DOOR TYPES from
the route table (the wire SSOT in py/gateway.py).

Emits:
  packages/web-kit/catalog/src/generated/gatewayDoors.ts — the `GatewayDoorUrl`
    template-literal union every apiJson/apiFetch call site must
    satisfy. A frontend door with no backend route row is a COMPILE
    ERROR (tsc), not a runtime 404 over live data — the loras
    incident (2026-09-05: LoraPicker fetched /v1/loras over 12
    declared krea-2 rows; the table had no such row) is the cause.

The wall (tests/walls/suites/test_gateway_doors.py) refuses staleness:
run this after every route change, exactly like gen_api_docs.py.

Usage: python3 tools/gen_gateway_doors.py [--check]
  --check: exit 1 if the on-disk file differs from what the table
  generates (CI mode — no writes).
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "py"))

import gateway  # noqa: E402  (stdlib only; the table imports clean)

OUT_PATH = REPO / "web" / "catalog" / "src" / "generated" / "gatewayDoors.ts"

HEADER = """// GENERATED from py/gateway.py ROUTES (the wire SSOT) by
// tools/gen_gateway_doors.py — DO NOT EDIT. Regenerate after every
// route change; tests/walls/suites/test_gateway_doors.py refuses
// staleness.
//
// THE HARD GATE: apiJson/apiFetch accept ONLY GatewayDoorUrl. A
// frontend fetch of a door the gateway does not serve is a COMPILE
// ERROR here — the loras incident (2026-09-05) shipped exactly that
// gap to the operator as "No LoRAs installed" over 12 declared
// rows. If tsc refuses your path, either the door is missing from
// ROUTES (build it) or the call site is dead (delete it).

/** Query-string tail: every door may carry one. */
export type DoorTail = "" | `?${string}`
"""


def _door_template(row: gateway.Route) -> str:
    """Route row -> TS template-literal type member.

    Literal rows  /v1/loras           -> `/v1/loras${DoorTail}`
    Regex rows    ^/v1/flows/status/(.+)$
                                       -> `/v1/flows/status/${string}${DoorTail}`
    Template docs /v1/flows/status/{run_id}
                                       -> same, from the template field
    """
    if row.regex:
        stem = row.path[1:] if row.path.startswith("^") else row.path
        stem = stem.split("(")[0]           # literal stem before the capture
        if not stem.endswith("/"):
            stem += "/"                     # the capture is a path segment
        return stem + "${string}${DoorTail}"
    if row.template and "{" in row.template:
        parts = []
        for seg in re.split(r"(\{[^}]+\})", row.template):
            parts.append("${string}" if seg.startswith("{") else seg)
        return "".join(parts) + "${DoorTail}"
    return row.path + "${DoorTail}"


def generate() -> str:
    members = []
    for row in gateway.ROUTES:
        t = _door_template(row)
        if t not in members:
            members.append(t)
    lines = [HEADER, "",
             "/** Every door the gateway serves, as fetchable URLs. */",
             "export type GatewayDoorUrl ="]
    lines.extend("  | `%s`" % m for m in members)
    return "\n".join(lines) + "\n"


def main() -> int:
    out = generate()
    if "--check" in sys.argv[1:]:
        current = OUT_PATH.read_text(encoding="utf-8") \
            if OUT_PATH.exists() else ""
        if current != out:
            print("STALE: %s differs from the ROUTES table — "
                  "run tools/gen_gateway_doors.py" % OUT_PATH)
            return 1
        print("fresh: %s matches the ROUTES table" % OUT_PATH)
        return 0
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(out, encoding="utf-8")
    print("wrote %s (%d doors)" % (OUT_PATH, out.count("  | `") + 1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
