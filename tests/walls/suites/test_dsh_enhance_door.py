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
import re
from pathlib import Path

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
