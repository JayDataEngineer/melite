#!/usr/bin/env python3
"""DSH ENHANCE DOOR wall — the ✦ button's link to the DSH model.

Operator context (2026-09-05, verbatim): "Prompt enhance runs inside
the DeepSeek app (/melite-tools/enhance not answered here)" —
"ERM... THAT IS SUPPOSED TO BE LINKED TO DSH MODEL... WHAT THE [REDACTED 2026-11-05]!"

Two strokes had contradicted each other:
  - 2026-09-03 retired the /melite-tools/* host routes as "ray-era
    fossils, zero live callers" — and deleted the registration.
  - 2026-09-05 killed the editor's keystore fallback, making
    /melite-tools/enhance the ONLY door.
  Result: the ✦ button threw exactly the operator-quoted error inside
  the DeepSeek app. On top of that, the plugin was never in the web
  profile's bundles, so no host boot loaded it.

These walls pin the CLASS, both layers:
  1. the plugin registers the enhance route (kind exact, webServer
     injected — the seam the registration needs);
  2. the client's ONLY door matches the served path (drift catcher);
  3. the plugin carries a loadable bundle manifest (dsh.bundle.patch
     -> cordis.patch.yml with the plugin row) — the loading gap.

Run: pytest tests/walls/suites/test_dsh_enhance_door.py -v
"""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from _anchor import REPO

PLUGIN = REPO / "plugins" / "harness" / "dsh" / "melite-tools"
CLIENT = REPO / "web" / "catalog" / "src" / "enhance.ts"


def test_enhance_route_is_registered_on_the_host() -> None:
    src = (PLUGIN / "src" / "index.ts").read_text(encoding="utf-8")
    assert re.search(
        r"kind:\s*'exact'", src), "no exact host route registered"
    assert re.search(
        r"path:\s*'/melite-tools/enhance'", src), (
        "the enhance route registration is GONE — this is the "
        "operator-quoted bug (✦ button: '/melite-tools/enhance not "
        "answered here'). The route is the link to the DSH model "
        "(ctx.llm); restore it beside the enhance_prompt tool.")
    assert re.search(
        r"path:\s*'/melite-tools/catalog'", src), (
        "the catalog registration-proof route is gone")
    assert re.search(
        r"export const inject = \['tools', 'webServer', 'llm'\]", src), (
        "webServer must be injected — without the service the route "
        "registration cannot exist")


def test_client_door_matches_the_served_path() -> None:
    """The editor's enhance.ts targets the route this plugin serves.
    A drift on either side silently breaks the ✦ button with the
    operator-quoted error — the two names must move together."""
    src = CLIENT.read_text(encoding="utf-8")
    assert '"/melite-tools/enhance"' in src or \
        "'/melite-tools/enhance'" in src, (
        "the client no longer targets /melite-tools/enhance — if the "
        "door moved, update BOTH sides in one stroke")


def test_plugin_is_a_loadable_profile_bundle() -> None:
    """The 2026-09-05 bug's second layer: the route code existed in
    history but no host loaded the plugin. A loadable bundle = the
    package.json dsh.bundle.patch manifest + the patch file carrying
    the plugin row."""
    pkg = json.loads((PLUGIN / "package.json").read_text(encoding="utf-8"))
    patch_rel = ((pkg.get("dsh") or {}).get("bundle") or {}).get("patch")
    assert patch_rel, (
        "package.json declares no dsh.bundle.patch — `dsh` cannot load "
        "this plugin as a profile bundle")
    patch = PLUGIN / patch_rel
    assert patch.is_file(), "bundle patch %s missing" % patch
    body = patch.read_text(encoding="utf-8")
    assert "@melite-plugin/dsh-tools" in body and "insert" in body, (
        "the bundle patch does not insert the plugin row")


def test_enhance_door_answers_live() -> None:
    """THE connection test (operator order, 2026-09-06, verbatim
    intent): "NICE TESTS IDIOT, YOU CAN'T EVEN TEST FOR A BASIC
    CONNECTION." Source-greps passed while the button 404'd — the
    :3080 host had booted 8.5h BEFORE the route restoration landed,
    so the running process never registered the door. This probe
    hits the live proof route (/melite-tools/catalog: GET, no LLM,
    no side effects). Host unreachable (CI, host down) SKIPS —
    nothing to judge. Host UP but door missing FAILS: the plugin is
    not loaded in the RUNNING host — restart it
    (dsh --profile web); the code is landed, the process is stale.
    DSH_WEB overrides the host (default http://127.0.0.1:3080)."""
    _probe_each_dsh_host()


_DEFAULT_DSH_HOSTS = ("http://127.0.0.1:3080", "http://127.0.0.1:3909")


def _dsh_hosts() -> list[str]:
    raw = os.environ.get("DSH_HOSTS", os.environ.get("DSH_WEB", ""))
    if raw.strip():
        return [h.strip().rstrip("/") for h in raw.split(",") if h.strip()]
    return list(_DEFAULT_DSH_HOSTS)


def _probe_each_dsh_host() -> None:
    """Both GUIs answer the door: :3080 (prod) and :3909 (test DSH —
    2026-09-06: the operator presses ✦ on cards in the TEST host,
    whose deck profile never carried the dsh-tools bundle at all).
    Per host: unreachable SKIPS (CI — nothing to judge); up but
    doorless FAILS with the fix (wire the bundle / restart)."""
    probed = 0
    for host in _dsh_hosts():
        url = host + "/melite-tools/catalog"
        try:
            with urllib.request.urlopen(url, timeout=10) as res:
                status = res.status
                raw = res.read()
        except urllib.error.HTTPError as e:
            pytest.fail(
                "the DSH host is UP at %s but %s answers %s — the "
                "melite-tools plugin is not loaded in the RUNNING "
                "process (boot predates the route, or the profile "
                "never carried the bundle row). Wire it / restart "
                "the host; the code is landed and the static walls "
                "pass. This is the operator-quoted ✦-button failure, "
                "caught here instead of on click." % (host, url, e.code))
        except Exception as e:
            continue  # no host here — nothing to judge on this one
        probed += 1
        assert status == 200, "%s proof route answered %s" % (host, status)
        try:
            body = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            pytest.fail("%s proof route answered non-JSON — no "
                        "harness route here (SPA fallback or proxy)"
                        % host)
        assert isinstance(body.get("tools"), list), (
            "%s proof route answered JSON without a tools list — "
            "wrong door" % host)
        # 2026-09-06: the card's model picker is populated from the
        # LIVE list — a host serving catalog without llmRoutes is a
        # stale build (pre-model-pick), and the picker stays empty.
        assert isinstance(body.get("llmRoutes"), list) and body["llmRoutes"], (
            "%s proof route has no llmRoutes — stale plugin build "
            "(pre-model-pick): rebuild + reboot" % host)
    if probed == 0:
        pytest.skip("no DSH host up at %r — nothing to judge"
                    % _dsh_hosts())
