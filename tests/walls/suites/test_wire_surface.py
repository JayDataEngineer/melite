#!/usr/bin/env python3
"""test_wire_surface.py — the 404-drift tripwire (frontend wire ⊆ gateway wire).

The misfire class this pins (operator report, 2026-10-02): "you press the
generate button, or go to the media sidebar, and it says 502 or 404 — I see
these a lot." A 404-with-"no such route" is ROUTE DRIFT: the frontend emits
a door the gateway no longer serves (or never served). Nothing pinned the
JUNCTION before — the parity suites pin the gateway's own contract, the
browser lanes pin the DOM. This gate pins the seam:

  * every wire route the frontend can emit (editor src + the @melite
    workspace packages it imports) must match a route arm in the py
    gateway (literal `path ==` / `startswith(` arms and `re.match(r"^...")`
    regex arms across py/*.py).
  * frontend template routes (`/v1/flows/drafts/${id}`) match as
    prefixes against gateway regex arms.

Known, REVIEWING-status drift lives in the exemption table below — loudly,
with a date and a reason, never silently. Everything else fails HERE at
ladder time, not as a mystery 404 in the user's face at runtime.

Run: python3 tests/walls/suites/test_wire_surface.py   (part of the python gate ladder)
"""
import os
import re
import unittest

from _anchor import REPO

# Frontend roots whose wire surface we pin. __tests__/__e2e__ fixtures and
# spec files are excluded — mock-server tests deliberately cite dead doors.
FRONTEND_ROOTS = (
    os.path.join(REPO, "plugins", "web", "editor", "src"),
    os.path.join(REPO, "web", "catalog", "src"),
    os.path.join(REPO, "web", "ui", "src"),
    os.path.join(REPO, "web", "formats", "src"),
    os.path.join(REPO, "web", "contracts", "src"),
)
GATEWAY_ROOT = os.path.join(REPO, "py")

# ─────────────────────────────────────────────────────────────────────────
# REVIEWING exemptions — KNOWN drift, live-confirmed 2026-10-02 against the
# running gateway (every entry answered "no such route" with the correct
# HTTP method; served routes were probed and excluded). None of these fail
# the ladder while the operator decides each family's fate — serve it,
# stub it for both windows (vite dev + deck host), or delete the caller.
# The companion browser lane (e2e/wire-misfires.spec.ts) counts these in a
# census so NEW drift still fails, and test_wire_surface fails on any
# exemption whose calls disappear (fossil guard below).
# ─────────────────────────────────────────────────────────────────────────
REVIEWING_PREFIXES = (
    # LLM lane moved to DSH plugins; editor + web/catalog still carry the
    # full client family. Found live: /v1/llm/health polled every 10s
    # from boot, 404ing forever.
    "/v1/llm/",
    # Agent lane moved to DSH (vite.config: "no /agent lane and no proxy
    # for it"); AgentSettingsPanel + webToolsStore/toolModeStore still emit.
    "/v1/agent/",
    # The whole poser lane: zero arms anywhere in py/. Vite proxies
    # /poser → the gateway, which answers no-such-route for all of it.
    "/poser/",
    # Old ComfyUI-manager passthrough — retired by the PROVISIONING LAW
    # (comfy-mcp is the one management plane; py/manage.py serves
    # /v1/manage singular). The manager panel still emits the plural.
    "/v1/manager/",
    # ComfyUI direct doors (endpoint / extensions install / interrupt).
    "/v1/comfyui/",
)
REVIEWING_EXACT = (
    # C-retirement orphans: doors the deleted C server served, never
    # ported to the py gateway, still cited by the editorApi route map
    # ("audited against server/app.py" — a file that no longer exists).
    "/v1/compose",
    "/v1/loras",
    "/v1/controlnets",
    "/v1/flow-catalog",
    "/v1/download-model/stream",
    "/v1/media/upload",
    "/v1/tools/speech-length",
    "/v1/flows/render_glb",
    "/v1/flows/render_textured",
    # GpuStatus polls /health at boot; the gateway has no root health arm.
    "/health",
    # Bare template prefix `/comfyui/${...}` — same dead family as above.
    "/comfyui/",
)

STRING_ROUTE_RE = re.compile(
    r"""["'`](/(?:v1|poser|comfyui|health)[A-Za-z0-9/_-]*)["'`]"""
)
PATH_EQ_RE = re.compile(r'''path\s*(?:==|!=)\s*["'](/[A-Za-z0-9/_-]+)["']''')
PATH_TARGET_EQ_RE = re.compile(r'''target\s*(?:==|!=)\s*["'](/[A-Za-z0-9/_-]+)["']''')
PATH_STARTSWITH_RE = re.compile(r'''path\.startswith\(\s*["'](/[A-Za-z0-9/_-]+)["']''')
ROUTE_REGEX_RE = re.compile(r'''(?:re\.match|re\.fullmatch)\(\s*r?["'](\^/[^"']+)["']''')
# Dict-key route tables (editor_runs.py CHROME_STUBS and friends):
#     "/v1/themes": {"themes": []},
DICT_KEY_RE = re.compile(r'''["'](/(?:v1|poser|comfyui|health)[A-Za-z0-9/_-]*)["']\s*:''')


def _walk(root, suffixes=(".ts", ".tsx", ".py")):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            d for d in dirnames
            if d not in ("__tests__", "__e2e__", "__pycache__", "node_modules", "dist")
        ]
        for name in filenames:
            if name.endswith(suffixes) and not name.endswith(".spec.ts"):
                yield os.path.join(dirpath, name)


def frontend_routes():
    """Every literal wire route (query-stripped) + template-literal prefixes."""
    routes = set()
    for path in _walk(FRONTEND_ROOTS[0]):
        with open(path, encoding="utf-8", errors="replace") as fh:
            text = fh.read()
        for m in STRING_ROUTE_RE.finditer(text):
            routes.add(m.group(1).split("?")[0])
    for root in FRONTEND_ROOTS[1:]:
        if not os.path.isdir(root):
            continue
        for path in _walk(root):
            with open(path, encoding="utf-8", errors="replace") as fh:
                text = fh.read()
            for m in STRING_ROUTE_RE.finditer(text):
                routes.add(m.group(1).split("?")[0])
    return routes


def gateway_arms():
    """(exact_literals, prefix_arms, regex_patterns) the gateway can answer.

    The route table IS the wire SSOT (2026-09-04 Phase 1 refactor: the
    if-chain became ROUTES rows in py/gateway.py) — read it directly.
    Literal rows are exact arms; regex rows anchored both ends are
    fullmatch patterns; open-ended regex rows (^prefix with no $) are
    prefix arms (the old path.startswith(...) semantics).
    """
    import gateway as _gw
    literals, prefixes, patterns = set(), set(), set()
    for row in _gw.ROUTES:
        if not row.regex:
            literals.add(row.path)
        elif row.path.endswith("$"):
            patterns.add(row.path)
        else:
            prefixes.add(row.path.lstrip("^"))
    return literals, prefixes, patterns


def _normalize(route):
    return route.rstrip("/") or "/"


def _matches(route, literals, prefixes, patterns):
    """Exact arms match exactly; startswith arms match prefixes; regex
    arms fullmatch. Never conflate the three — /v1/tools (exact, a
    CHROME_STUBS key) must NOT cover /v1/tools/speech-length (dead)."""
    route = _normalize(route)
    if route in literals or route + "/" in literals:
        return True
    for pre in prefixes:
        if route.startswith(pre.rstrip("/") + "/") or route == pre:
            return True
    for pat in patterns:
        try:
            if re.fullmatch(pat, route) or re.fullmatch(pat, route + "/"):
                return True
        except re.error:
            continue
    return False


class WireSurfaceTests(unittest.TestCase):

    def test_frontend_wire_is_served_by_gateway(self):
        literals, prefixes, patterns = gateway_arms()
        self.assertTrue(literals or patterns, "no gateway route arms found — scan broken")
        exempt = REVIEWING_PREFIXES + tuple(REVIEWING_EXACT)
        drift = sorted(
            r for r in frontend_routes()
            if not r.startswith(exempt)
            and not _matches(r, literals, prefixes, patterns)
        )
        self.assertEqual(
            drift, [],
            "ROUTE DRIFT — the frontend emits these doors but the py gateway "
            "has no arm for them (a runtime 'no such route' 404 in the user's "
            "face). Serve them, or delete the caller.",
        )

    def test_reviewing_exemptions_are_not_yet_fossilized(self):
        # Every REVIEWING entry must name real frontend routes that are
        # really unserved — when a lane is settled (re-served or caller
        # deleted), its stale exemption must fail HERE, not rot silently.
        literals, prefixes, patterns = gateway_arms()
        routes = frontend_routes()
        for entry in REVIEWING_PREFIXES + REVIEWING_EXACT:
            still_called = [r for r in routes if r.startswith(entry)]
            if not still_called:
                self.fail(
                    f"stale REVIEWING exemption {entry!r}: frontend no "
                    "longer calls it — delete the exemption."
                )
            if any(_matches(r, literals, prefixes, patterns) for r in still_called):
                self.fail(
                    f"stale REVIEWING exemption {entry!r}: gateway now "
                    "serves it — un-exempt."
                )


if __name__ == "__main__":
    unittest.main()
