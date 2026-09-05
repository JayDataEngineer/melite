"""test_route_weave.py - the /v1 route weave: src references vs served doors.

The rename-sweep class (pipelines to flows, 2026-09-04): a route is
renamed on the gateway but one web-family surface still calls the
old name. Every test passed because each layer was self-consistent;
only the CROSS-LAYER weave was broken - the browser got silent 404s
until someone probed by hand.

This wall extracts both sides from SOURCE (no network, no GPU):

  REFERENCED: every quoted /v1/... literal in the production source
  of the web family (web/catalog, plugins/web/editor, plugins/web/dsh)
  - tests, dists, and libs excluded (test fixtures use fake URLs).

  SERVED: every /v1 route the py gateway answers (static literals +
  dynamic regex prefixes) PLUS the /v1 stubs the card-deck host
  owns (/v1/llm - the assistant lives in DSH).

A referenced route is COVERED if it equals a static door, sits under
a dynamic prefix, is a static prefix of a dynamic door, or sits
under a host stub. Anything else is drift: FAIL with both sides
printed.

Run: pytest tests/walls/suites/test_route_weave.py -v
"""
from __future__ import annotations

import re
from pathlib import Path

from _anchor import REPO

GATEWAY = REPO / "py" / "gateway.py"
DECK_HOST = REPO / "plugins" / "web" / "dsh" / "melite-card-deck" / "src" / "index.ts"

WEB_SOURCES = [
    REPO / "web" / "catalog" / "src",
    REPO / "plugins" / "web" / "editor" / "src",
    REPO / "plugins" / "web" / "dsh",
]

SKIP_PARTS = {"__tests__", "node_modules", "dist", "lib", "test", "e2e"}
SKIP_SUFFIXES = (".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx", ".md", ".json")

ROUTE_RE = re.compile('[\'\"](/v1/[A-Za-z0-9/_.-]*)')


def _served() -> tuple[set[str], set[str]]:
    """(static doors, dynamic prefixes) the gateway + deck host answer."""
    text = GATEWAY.read_text()
    static = set(re.findall(r"(/v1/[A-Za-z0-9/_-]+)", text))
    dynamic = set()
    for m in re.finditer(r"\^(/v1/[A-Za-z0-9/_-]+)/", text):
        dynamic.add(m.group(1))
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


# KNOWN DRIFT - the fossil field this wall found on its FIRST run
# (2026-09-04; every entry live-404-confirmed against the running
# gateway). All are legacy editor surfaces calling doors that died
# with the C gateway or never existed in py:
#   - /v1/manager/* (13 doors): the ComfyUI manager panel store.
#     The gateway serves one /v1/manage door instead.
#   - /v1/agent/*: the editor agent-settings lane (dead surface in
#     the DSH embed - the assistant IS DSH; standalone 404s).
#   - /v1/loras, /v1/controlnets, /v1/compose, /v1/flow-catalog,
#     /v1/media/upload, /v1/comfyui/*, /v1/download-model/stream,
#     /v1/flows/render_*, /v1/flows/yaml/export-comfyui: editor
#     client doors with no py-side door at all.
# Fix = either port the doors or delete the callers (product call,
# not a test change). Remove entries here in the same commit that
# fixes their drift. NEW drift (a rename sweep missing a surface)
# still fails this wall - that is its job.
KNOWN_DRIFT = {
    "/v1/agent/tool-mode",
    "/v1/agent/web-tools",
    "/v1/comfyui/endpoint",
    "/v1/comfyui/extensions/install",
    "/v1/comfyui/interrupt",
    "/v1/compose",
    "/v1/controlnets",
    "/v1/download-model/stream",
    "/v1/flow-catalog",
    "/v1/flows/render_glb",
    "/v1/flows/render_textured",
    "/v1/flows/yaml/export-comfyui",
    "/v1/loras",
    "/v1/manager/check-active-models",
    "/v1/manager/check-active-nodes",
    "/v1/manager/check-updates",
    "/v1/manager/install-model",
    "/v1/manager/install-node",
    "/v1/manager/models",
    "/v1/manager/reboot",
    "/v1/manager/start",
    "/v1/manager/status",
    "/v1/manager/stop",
    "/v1/manager/switch-version",
    "/v1/manager/update-all",
    "/v1/manager/update-comfyui",
    "/v1/media/upload",
}


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

    If the gateway route extraction or the web-source walk breaks
    (file moved, format changed), the main test would pass vacuously
    with an empty served set... no - it would fail everything. This
    guard catches the OTHER vacuous case: both sets so small the
    weave is meaningless.
    """
    static, dynamic = _served()
    referenced = _referenced()
    assert len(static) >= 15, f"gateway extraction found only {len(static)} static doors"
    assert len(referenced) >= 5, f"web extraction found only {len(referenced)} references"
