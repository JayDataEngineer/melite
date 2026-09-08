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
    regex arms across python/*.py).
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
from collections.abc import Iterator

from _anchor import REPO

# Frontend roots whose wire surface we pin. __tests__/__e2e__ fixtures and
# spec files are excluded — mock-server tests deliberately cite dead doors.
FRONTEND_ROOTS = (
    os.path.join(REPO, "packages", "web", "editor", "src"),
    os.path.join(REPO, "packages", "web-kit", "catalog", "src"),
    os.path.join(REPO, "packages", "web-kit", "ui", "src"),
    os.path.join(REPO, "packages", "web-kit", "formats", "src"),
    os.path.join(REPO, "packages", "web-kit", "contracts", "src"),
)
GATEWAY_ROOT = os.path.join(REPO, "python")

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
# EMPTIED 2026-09-07 (the legacy-removal stroke): the last REVIEWING
# entries died here — /v1/comfyui/interrupt repointed at the queue's
# stop door (cancelRun Arm 1), render_glb + render_textured callers
# deleted. The WAS-here history below stays as the audit trail; a NEW
# entry lands here only with a date, a reason, and the operator's
# serve/stub/delete decision.
REVIEWING_PREFIXES = (
    # ('/v1/llm/' WAS here — the keystore/enhance lane's last caller
    # died 2026-09-05 with the door-gate kill stroke; exemption deleted
    # in the same stroke, fossil-guard order.)
    # ('/v1/agent/' WAS here — AgentSettingsPanel + webToolsStore/
    # toolModeStore died the same day; exemption deleted in the same
    # stroke.)
    # (The poser lane WAS here — exempted while the whole prefix 404'd.
    # The studio bridge was rebuilt 2026-09-05: the gateway now serves
    # /poser/* by forwarding to the engine endpoint's poser pack, so
    # the exemption retired with the fix.)
    # ('/v1/manager/' WAS here — the ComfyUI-manager passthrough's last
    # panel died 2026-09-05; exemption deleted in the same stroke.)
    # ('/v1/comfyui/' WAS here — ComfyUI direct doors (endpoint /
    # extensions install / interrupt). The interrupt call died
    # 2026-09-07: cancelRun Arm 1 rides the queue's stop door now;
    # exemption deleted in the same stroke, fossil-guard order.)
)
REVIEWING_EXACT = (
    # C-retirement orphans: doors the deleted C server served, never
    # ported to the py gateway, still cited by the editorApi route map
    # ("audited against server/app.py" — a file that no longer exists).
    # ('/v1/compose' WAS here — its last frontend caller was deleted
    # 2026-09-05; the exemption died in the same stroke, fossil-guard
    # order.)
    # ('/v1/controlnets', '/v1/flow-catalog',
    # '/v1/flows/yaml/export-comfyui' died the same day — callers gone,
    # exemptions deleted in the same stroke.)
    # ('/v1/loras' WAS here too — the py gateway grew the door
    # (/v1/loras?model=, the declared LorasMod pack) 2026-09-05 and the
    # LIVE process was brought to source parity the same hour; served
    # now, so un-exempted. The query-string-literal caller shape ALSO
    # forced the STRING_ROUTE_RE fix above.)
    # ('/v1/download-model/stream' WAS here — ModelDownloadDialog died
    # 2026-09-05; exemption deleted in the same stroke.)
    # ('/v1/media/upload' WAS here — editorClient.uploadMedia died the
    # same day; exemption deleted in the same stroke.)
    # ('/v1/tools/speech-length' WAS here — the speechLength helper died
    # the same day; exemption deleted in the same stroke.)
    # ('/v1/flows/render_glb', '/v1/flows/render_textured' WAS here —
    # C-retirement orphans the py gateway never ported; their last
    # frontend callers (renderGlb/renderTextured) died 2026-09-07;
    # exemptions deleted in the same stroke, fossil-guard order.)
    # ('/health' WAS here — GpuStatus polled it at boot and the gateway
    # has no root health arm; the caller died with the 2026-09-05
    # editorClient cleanup, exemption deleted in the same stroke.)
    # (Bare template prefix `/comfyui/${...}` WAS here — same dead family
    # as above; last emitter died 2026-09-05, exemption deleted in the
    # same stroke.)
)

STRING_ROUTE_RE = re.compile(
    # The optional `?...` tail catches query-STRING literals before the
    # closing delimiter — `/v1/loras?model=${x}` (backticked) was blind
    # to this wall until 2026-09-05: the ? blocked the quote anchor, the
    # caller read as "no longer called", and a LIVE exemption
    # (/v1/loras, LoraPicker) failed as stale. Query-stripped below.
    r"""["'`](/(?:v1|poser|comfyui|health)[A-Za-z0-9/_-]*(?:\?[^"'`]*)?)["'`]"""
)
PATH_EQ_RE = re.compile(r'''path\s*(?:==|!=)\s*["'](/[A-Za-z0-9/_-]+)["']''')
PATH_TARGET_EQ_RE = re.compile(r'''target\s*(?:==|!=)\s*["'](/[A-Za-z0-9/_-]+)["']''')
PATH_STARTSWITH_RE = re.compile(r'''path\.startswith\(\s*["'](/[A-Za-z0-9/_-]+)["']''')
ROUTE_REGEX_RE = re.compile(r'''(?:re\.match|re\.fullmatch)\(\s*r?["'](\^/[^"']+)["']''')
# Dict-key route tables (editor_runs.py CHROME_STUBS and friends):
#     "/v1/themes": {"themes": []},
DICT_KEY_RE = re.compile(r'''["'](/(?:v1|poser|comfyui|health)[A-Za-z0-9/_-]*)["']\s*:''')


def _walk(root: str, suffixes: tuple[str, ...] = (".ts", ".tsx", ".py")) -> Iterator[str]:
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            d for d in dirnames
            if d not in ("__tests__", "__e2e__", "__pycache__", "node_modules", "dist")
        ]
        for name in filenames:
            if name.endswith(suffixes) and not name.endswith(".spec.ts"):
                yield os.path.join(dirpath, name)


def frontend_routes() -> set[str]:
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


def gateway_arms() -> tuple[set[str], set[str], set[str]]:
    """(exact_literals, prefix_arms, regex_patterns) the gateway can answer.

    The route table IS the wire SSOT (2026-09-04 Phase 1 refactor: the
    if-chain became ROUTES rows in python/gateway.py) — read it directly.
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


def _normalize(route: str) -> str:
    return route.rstrip("/") or "/"


def _matches(route: str, literals: set[str], prefixes: set[str], patterns: set[str]) -> bool:
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

    def test_frontend_wire_is_served_by_gateway(self) -> None:
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

    def test_reviewing_exemptions_are_not_yet_fossilized(self) -> None:
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
