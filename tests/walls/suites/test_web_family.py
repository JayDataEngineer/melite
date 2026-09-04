#!/usr/bin/env python3
"""test_web_family.py — the web-family alignment gate.

The contract under test (plugins/web/README.md):

  plugins/web/editor    = THE card surface (builds to editor/dist)
  plugins/web/dsh       = DSH windows onto it (deck HOST serves the dist,
                          card-view CLIENT embeds it in iframes)
  plugins/harness/dsh   = agent abilities (tools/presets/provisioning)

They are ONE card surface seen through two windows — the split is logical.
This gate encodes that alignment as DATA (a pydantic-style table of
expectations): a member in the wrong family, a stale link:, a wrong
EDITOR_DIST depth, or a missing workspace glob fails HERE, at test time —
never as a mystery 404 inside a DSH chat iframe at boot.

Run: python3 tests/walls/suites/test_web_family.py   (part of the python gate ladder)
"""
import json
import os
import re
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))

# ─────────────────────────────────────────────────────────────────────────
# THE FAMILY MAP — the SSOT this gate enforces. Edit HERE when the family
# changes; the assertions below are generic.
# ─────────────────────────────────────────────────────────────────────────

WEB_DSH_MEMBERS = {
    "melite-card-view": "@melite-plugin/dsh-card-view",   # chat toolview (embedder, CLIENT)
    "melite-card-deck": "@melite-plugin/dsh-card-deck",   # sidebar deck + /editor host (embedder, HOST)
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
    "plugins/harness/dsh/*",
    "plugins/web/dsh/*",
    "plugins/web/editor",
    "web/*",
)

# provisioner links: name → path from plugins/harness/dsh/provisioner
PROVISIONER_LINKS = {
    "@melite-plugin/dsh-tools":     "../melite-tools",
    "@melite-plugin/dsh-card-view": "../../../web/dsh/melite-card-view",
    "@melite-plugin/dsh-card-deck": "../../../web/dsh/melite-card-deck",
    "@infer-media/dsh-media":       "../../../web/dsh/media-plugin",
    "@infer-media/dsh-gallery":     "../../../web/dsh/infer-gallery",
}

_checks = {"pass": 0, "fail": 0}


def check(name, ok, detail=""):
    _checks["pass" if ok else "fail"] += 1
    tag = "ok  " if ok else "FAIL"
    print("  %s  %s%s" % (tag, name, (" — " + str(detail)) if detail and not ok else ""))


def pkg_name(member_dir):
    pj = os.path.join(member_dir, "package.json")
    if not os.path.isfile(pj):
        return None
    try:
        with open(pj, encoding="utf-8") as f:
            return json.load(f).get("name")
    except Exception as e:
        return "UNPARSEABLE: %s" % e


def main():
    print("web family alignment (plugins/web/README.md is the contract)")

    # 1. members exist, in the right family, with the right package names
    print("[1] family members")
    for d, name in sorted(WEB_DSH_MEMBERS.items()):
        path = os.path.join(REPO, "plugins", "web", "dsh", d)
        check("web/dsh/%s exists" % d, os.path.isdir(path))
        if name is not None:
            check("web/dsh/%s is %s" % (d, name), pkg_name(path) == name,
                  pkg_name(path))
    for d, name in sorted(HARNESS_DSH_MEMBERS.items()):
        path = os.path.join(REPO, "plugins", "harness", "dsh", d)
        check("harness/dsh/%s exists" % d, os.path.isdir(path))
        if name is not None:
            check("harness/dsh/%s is %s" % (d, name), pkg_name(path) == name,
                  pkg_name(path))

    # the editor is a web sibling
    ed = os.path.join(REPO, "plugins", "web", "editor")
    check("web/editor exists", os.path.isdir(ed))
    check("web/editor pkg is 'editor'", pkg_name(ed) == EDITOR_PKG_NAME,
          pkg_name(ed))

    # the old grab-bag is GONE (two concerns cannot share one directory)
    check("plugins/dsh retired", not os.path.exists(
        os.path.join(REPO, "plugins", "dsh")))

    # 2. the embedding: EDITOR_DIST traversal lands on the real dist dir
    print("[2] the embedding (deck HOST → editor dist)")
    deck_src = os.path.join(REPO, "plugins", "web", "dsh",
                            "melite-card-deck", "src", "index.ts")
    ok = os.path.isfile(deck_src)
    check("deck src present", ok)
    if ok:
        src = open(deck_src, encoding="utf-8").read()
        m = re.search(
            r"EDITOR_DIST\s*=\s*process\.env\.RAY_EDITOR_DIST\s*\?\?\s*"
            r"path\.resolve\(here((?:,\s*'[^']+')+)\)", src)
        check("EDITOR_DIST declares the family-relative traversal", bool(m))
        if m:
            parts = [p.strip().strip("'\"") for p in m.group(1).split(",")[1:]]
            check("traversal is ×3 up + editor/dist",
                  parts == ["..", "..", "..", "editor", "dist"], parts)
            # simulate: resolve from <pkg>/lib the way the built file does
            lib = os.path.join(REPO, "plugins", "web", "dsh",
                               "melite-card-deck", "lib")
            resolved = os.path.normpath(os.path.join(lib, *parts))
            expected = os.path.join(REPO, "plugins", "web", "editor", "dist")
            check("traversal lands on plugins/web/editor/dist",
                  resolved == expected, "%s != %s" % (resolved, expected))

    # 3. the bridge: card-view bundles the deck's embed-bridge
    print("[3] the embed bridge (ONE bridge, ONE theme map)")
    cv = os.path.join(REPO, "plugins", "web", "dsh", "melite-card-view",
                      "src", "client", "PipelineCards.tsx")
    ok = os.path.isfile(cv)
    check("card-view PipelineCards.tsx present", ok)
    if ok:
        src = open(cv, encoding="utf-8").read()
        check("card-view imports the deck's embed-bridge",
              EMBED_BRIDGE_IMPORT in src)
        bridge = os.path.join(REPO, "plugins", "web", "dsh",
                              "melite-card-deck", EMBED_BRIDGE_FILE)
        check("embed-bridge.ts exists in the deck",
              os.path.isfile(bridge), bridge)

    # 4. workspace globs resolve the members
    print("[4] root workspace alignment")
    ws = os.path.join(REPO, "pnpm-workspace.yaml")
    ok = os.path.isfile(ws)
    check("root pnpm-workspace.yaml present", ok)
    if ok:
        text = open(ws, encoding="utf-8").read()
        for g in REQUIRED_WORKSPACE_GLOBS:
            check("workspace globs %s" % g, ("'%s'" % g) in text or
                  ('"%s"' % g) in text)

    # 5. provisioner links both families, targets exist
    print("[5] provisioner spans the family line")
    pj = os.path.join(REPO, "plugins", "harness", "dsh", "provisioner",
                      "package.json")
    ok = os.path.isfile(pj)
    check("provisioner package.json present", ok)
    if ok:
        with open(pj, encoding="utf-8") as f:
            deps = json.load(f).get("dependencies", {})
        for pkg, rel in PROVISIONER_LINKS.items():
            got = deps.get(pkg)
            check("links %s → %s" % (pkg, rel), got == "link:%s" % rel, got)
            target = os.path.normpath(os.path.join(
                os.path.dirname(pj), rel.lstrip("./") if not rel.startswith("..")
                else rel))
            check("link target exists (%s)" % rel, os.path.isdir(target),
                  target)

    # 6. the kit stays engine-agnostic, sibling to the pathways
    print("[6] the kit")
    for k in ("ui", "slots", "contracts", "formats", "catalog"):
        check("web/%s is @melite/%s" % (k, k),
              pkg_name(os.path.join(REPO, "web", k)) == "@melite/%s" % k)

    total = _checks["pass"] + _checks["fail"]
    print("PASS %d / FAIL %d" % (_checks["pass"], _checks["fail"]))
    if _checks["fail"]:
        print("WEB FAMILY MISALIGNED — the contract is plugins/web/README.md")
        sys.exit(1)
    print("web family aligned: one card surface, two windows")


if __name__ == "__main__":
    main()
