"""test_web_family.py — the web-family alignment gate.

The contract under test (packages/web/README.md):

  packages/web/editor    = THE card surface (builds to editor/dist)
  packages/web/dsh       = DSH windows onto it (deck HOST serves the dist,
                          card-view CLIENT embeds it in iframes)
  packages/harness/dsh   = agent abilities (tools/presets/provisioning)

They are ONE card surface seen through two windows — the split is logical.
This gate encodes that alignment as DATA (a pydantic-style table of
expectations): a member in the wrong family, a stale link:, a wrong
EDITOR_DIST depth, or a missing workspace glob fails HERE, at test time —
never as a mystery 404 inside a DSH chat iframe at boot.
"""
import json
import os
import re

import pytest

from _anchor import REPO

# ─────────────────────────────────────────────────────────────────────────
# THE FAMILY MAP — the SSOT this gate enforces. Edit HERE when the family
# changes; the assertions below are generic.
# ─────────────────────────────────────────────────────────────────────────

WEB_DSH_MEMBERS = {
    "melite-card-view": "@melite-plugin/dsh-card-view",   # chat toolview (embedder, CLIENT)
    "melite-card-deck": "@melite-plugin/dsh-card-deck",   # /editor main-window host (embedder, HOST)
    "media-plugin":     "@infer-media/dsh-media",
    "infer-gallery":    "@infer-media/dsh-gallery",
    "shared":           None,   # build helpers (tsdown.client.ts) — no package
    "skins":            None,   # UI assets — no package
}

HARNESS_DSH_MEMBERS = {
    "melite-tools":       "@melite-plugin/dsh-tools",     # the tool registry
    "melite-preset":      "@melite-plugin/dsh-preset",
    "inference-studio":   None,   # preset + SKILL.md, no package
    "provisioner":        "@infer/dsh-provisioner",       # the integrator
    "testkit":            "@melite-plugin/dsh-testkit",   # the family test runner (ex-infer-dsh)
}

EDITOR_PKG_NAME = "editor"

# The embedding: deck HOST serves the editor dist, family-relative.
# deck builds to <pkg>/lib; EDITOR_DIST = path.resolve(here, .., .., .., 'editor', 'dist')
DECK_LIB_TO_EDITOR_DIST = (os.pardir, os.pardir, os.pardir, "editor", "dist")

# The bridge card-view bundles (ONE bridge, ONE theme map):
EMBED_BRIDGE_IMPORT = "../../../melite-card-deck/src/client/embed-bridge.ts"
EMBED_BRIDGE_FILE = "src/client/embed-bridge.ts"

# What the root workspace MUST glob (members resolve through these):
REQUIRED_WORKSPACE_GLOBS = (
    "packages/harness/dsh/*",
    "packages/web/dsh/*",
    "packages/web/editor",
    "web/*",
)

# provisioner links: name → path from packages/harness/dsh/provisioner
PROVISIONER_LINKS = {
    "@melite-plugin/dsh-tools":     "../melite-tools",
    "@melite-plugin/dsh-card-view": "../../../web/dsh/melite-card-view",
    "@melite-plugin/dsh-card-deck": "../../../web/dsh/melite-card-deck",
    "@infer-media/dsh-media":       "../../../web/dsh/media-plugin",
    "@infer-media/dsh-gallery":     "../../../web/dsh/infer-gallery",
}


def _pkg_name(member_dir: str) -> str | None:
    pj = os.path.join(member_dir, "package.json")
    if not os.path.isfile(pj):
        return None
    try:
        with open(pj, encoding="utf-8") as f:
            return json.load(f).get("name")
    except Exception as e:
        return "UNPARSEABLE: %s" % e


# ── 1. members exist, in the right family, with the right package names ──

@pytest.mark.parametrize("d,name", sorted(WEB_DSH_MEMBERS.items()))
def test_web_dsh_member_exists(d: str, name: str | None) -> None:
    path = os.path.join(REPO, "packages", "web", "dsh", d)
    assert os.path.isdir(path), f"web/dsh/{d} missing"


@pytest.mark.parametrize("d,name", sorted(WEB_DSH_MEMBERS.items()))
def test_web_dsh_member_package_name(d: str, name: str | None) -> None:
    if name is None:
        pytest.skip(f"{d} has no package")
    path = os.path.join(REPO, "packages", "web", "dsh", d)
    assert _pkg_name(path) == name, _pkg_name(path)


@pytest.mark.parametrize("d,name", sorted(HARNESS_DSH_MEMBERS.items()))
def test_harness_dsh_member_exists(d: str, name: str | None) -> None:
    path = os.path.join(REPO, "packages", "harness", "dsh", d)
    assert os.path.isdir(path), f"harness/dsh/{d} missing"


@pytest.mark.parametrize("d,name", sorted(HARNESS_DSH_MEMBERS.items()))
def test_harness_dsh_member_package_name(d: str, name: str | None) -> None:
    if name is None:
        pytest.skip(f"{d} has no package")
    path = os.path.join(REPO, "packages", "harness", "dsh", d)
    assert _pkg_name(path) == name, _pkg_name(path)


def test_editor_exists() -> None:
    ed = os.path.join(REPO, "packages", "web", "editor")
    assert os.path.isdir(ed)


def test_editor_package_name() -> None:
    ed = os.path.join(REPO, "packages", "web", "editor")
    assert _pkg_name(ed) == EDITOR_PKG_NAME, _pkg_name(ed)


def test_plugins_dsh_retired() -> None:
    assert not os.path.exists(os.path.join(REPO, "packages", "dsh"))


# ── 2. the embedding: EDITOR_DIST traversal ─────────────────────────────

def test_deck_editor_dist_traversal() -> None:
    deck_src = os.path.join(REPO, "packages", "web", "dsh",
                            "melite-card-deck", "src", "index.ts")
    assert os.path.isfile(deck_src), "deck src missing"
    src = open(deck_src, encoding="utf-8").read()
    m = re.search(
        r"EDITOR_DIST\s*=\s*process\.env\.RAY_EDITOR_DIST\s*\?\?\s*"
        r"path\.resolve\(here((?:,\s*'[^']+')+)\)", src)
    assert m, "EDITOR_DIST declares the family-relative traversal"
    parts = [p.strip().strip("'\"") for p in m.group(1).split(",")[1:]]
    assert parts == ["..", "..", "..", "editor", "dist"], parts
    lib = os.path.join(REPO, "packages", "web", "dsh",
                       "melite-card-deck", "lib")
    resolved = os.path.normpath(os.path.join(lib, *parts))
    expected = os.path.join(REPO, "packages", "web", "editor", "dist")
    assert resolved == expected, f"{resolved} != {expected}"


# ── 3. the bridge ───────────────────────────────────────────────────────

def test_card_view_embeds_deck_bridge() -> None:
    cv = os.path.join(REPO, "packages", "web", "dsh", "melite-card-view",
                      "src", "client", "FlowCards.tsx")
    assert os.path.isfile(cv), "card-view FlowCards.tsx missing"
    src = open(cv, encoding="utf-8").read()
    assert EMBED_BRIDGE_IMPORT in src


def test_embed_bridge_file_exists() -> None:
    bridge = os.path.join(REPO, "packages", "web", "dsh",
                          "melite-card-deck", EMBED_BRIDGE_FILE)
    assert os.path.isfile(bridge), bridge


# ── 4. workspace globs ─────────────────────────────────────────────────

def test_root_workspace_globs() -> None:
    ws = os.path.join(REPO, "pnpm-workspace.yaml")
    assert os.path.isfile(ws), "root pnpm-workspace.yaml missing"
    text = open(ws, encoding="utf-8").read()
    for g in REQUIRED_WORKSPACE_GLOBS:
        assert ("'%s'" % g) in text or ('"%s"' % g) in text, (
            f"workspace glob {g} missing")


# ── 5. provisioner links both families ──────────────────────────────────

def test_provisioner_links() -> None:
    pj = os.path.join(REPO, "packages", "harness", "dsh", "provisioner",
                      "package.json")
    assert os.path.isfile(pj), "provisioner package.json missing"
    with open(pj, encoding="utf-8") as f:
        deps = json.load(f).get("dependencies", {})
    for pkg, rel in PROVISIONER_LINKS.items():
        got = deps.get(pkg)
        assert got == "link:%s" % rel, got
        target = os.path.normpath(os.path.join(
            os.path.dirname(pj), rel.lstrip("./") if not rel.startswith("..")
            else rel))
        assert os.path.isdir(target), target


# ── 6. the kit stays engine-agnostic ────────────────────────────────────

@pytest.mark.parametrize("k", ["ui", "slots", "contracts", "formats", "catalog"])
def test_kit_package_name(k: str) -> None:
    assert _pkg_name(os.path.join(REPO, "packages", "web-kit", k)) == "@melite/%s" % k
