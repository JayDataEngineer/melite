"""PLUGIN FRESHNESS LAW SUITE (2026-09-01; re-aimed 2026-09-02 dsh split)
— the stale-build contract.

The Timeline-card crash ("Cannot access 'at' before initialization",
2026-09-01) shipped because commit da243dc4 fixed two TDZ bugs in the
editor SOURCE at 06:34 while the served dist/ was built at 00:40 —
nobody rebuilt. The fix was correct; the artifact was stale. Same class
bit the deck/card-view plugins when two copies existed (ray checkout +
this repo) and a fix landed in one while the other kept serving.

Post-split layout (2026-09-02): the SSOT checkout is THIS repo —
plugins/web/dsh (the panels), plugins/harness/dsh (the tools), and
plugins/web/editor (the card surface the deck host serves). The ray
twin-checkout watch is RETIRED: one repo, one truth.

Checks:

  F1  every dsh member's lib/ bundles are >= its newest src/ file
      (source newer than build output = "rebuild before deploy") —
      BOTH families: web/dsh members + harness/dsh members
  F2  the editor's dist/ is >= its newest source file (editor src/ +
      the ui_components + engines trees that feed its build)
  F3  content pin: the deck client bundle carries the wand reload nonce
      (_r=) — revert of the recreate-caching fix fails the build gate.
      (The behavioral drive lives in plugins/harness/dsh/testkit —
      deck-canvas-open.test.tsx, 6/6 green since the 2026-09-02 port
      of the machine from the ray twin. This pin stays as the
      shipped-artifact guard.)
  F4  content pin: the card-view bundle has NO `const at ` declaration
      — the shadowing name from the TDZ investigation stays dead

F3/F4 are honest grep pins: they pin the exact shipped fixes so a
silent revert (edit without rebuild, or rebuild from reverted source)
cannot pass.
"""
import os
import time

import pytest

from _anchor import REPO

WEB_DSH = os.path.join(REPO, "plugins", "web", "dsh")
HARNESS_DSH = os.path.join(REPO, "plugins", "harness", "dsh")


def _newest(root, suffixes):
    """Newest mtime under root for files matching suffixes (recursive)."""
    newest_t = 0.0
    newest_f = ""
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in ("node_modules", ".git", "__pycache__", "dist", "lib")]
        for fn in filenames:
            if not any(fn.endswith(s) for s in suffixes):
                continue
            p = os.path.join(dirpath, fn)
            t = os.path.getmtime(p)
            if t > newest_t:
                newest_t, newest_f = t, p
    return newest_t, newest_f


def _fmt(t):
    return time.strftime("%H:%M:%S %Y-%m-%d", time.localtime(t))


# ── F1: member lib/ freshness (BOTH families) ─────────────────────────

F1_MEMBERS = [
    (WEB_DSH, "media-plugin"),
    (WEB_DSH, "melite-card-deck"),
    (WEB_DSH, "melite-card-view"),
    (WEB_DSH, "infer-gallery"),
    (HARNESS_DSH, "melite-tools"),
]


@pytest.mark.parametrize("base,plug", F1_MEMBERS,
                         ids=[m[1] for m in F1_MEMBERS])
def test_f1_member_lib_freshness(base, plug):
    src = os.path.join(base, plug, "src")
    lib = os.path.join(base, plug, "lib")
    if not os.path.isdir(src) or not os.path.isdir(lib):
        pytest.skip(f"{plug}: src or lib dir missing")
    src_t, src_f = _newest(src, (".ts", ".tsx", ".css"))
    lib_t, lib_f = _newest(lib, (".js", ".mjs"))
    rel = os.path.relpath(os.path.join(base, plug), REPO)
    if lib_t == 0.0:
        assert src_t == 0.0, (
            f"no .js build output under {rel}/lib — build it")
        return
    src_rel = os.path.relpath(src_f, REPO) if src_f else "(none)"
    lib_rel = os.path.relpath(lib_f, REPO) if lib_f else "(none)"
    assert lib_t >= src_t, (
        f"src {_fmt(src_t)} ({src_rel}) NEWER than "
        f"lib {_fmt(lib_t)} ({lib_rel}) — rebuild it")


# ── F2: editor dist freshness ─────────────────────────────────────────

def test_f2_editor_dist_freshness():
    ed_src = os.path.join(REPO, "plugins", "web", "editor", "src")
    ed_dist = os.path.join(REPO, "plugins", "web", "editor", "dist", "assets")
    feeds = [
        os.path.join(REPO, "plugins", "web", "ui_components"),
        os.path.join(REPO, "plugins", "engines"),
    ]
    if not os.path.isdir(ed_src) or not os.path.isdir(ed_dist):
        pytest.skip("editor dist not built")
    newest_src_t, newest_src_f = _newest(ed_src, (".ts", ".tsx"))
    for feed in feeds:
        if os.path.isdir(feed):
            t, f = _newest(feed, (".ts", ".tsx"))
            if t > newest_src_t:
                newest_src_t, newest_src_f = t, f
    dist_t, dist_f = _newest(ed_dist, (".js",))
    assert dist_t >= newest_src_t, (
        f"src {_fmt(newest_src_t)} ({os.path.relpath(newest_src_f, REPO)}) "
        f"NEWER than dist {_fmt(dist_t)} "
        f"({os.path.basename(dist_f)}) — run vite build")


# ── F3: wand reload nonce — content pin ────────────────────────────────

def test_f3_deck_bundle_wand_nonce_pin():
    deck_bundle = os.path.join(WEB_DSH, "melite-card-deck", "lib", "client.js")
    if not os.path.isfile(deck_bundle):
        pytest.skip("deck bundle not built")
    body = open(deck_bundle, encoding="utf-8", errors="replace").read()
    assert "_r=" in body, (
        "recreate-caching nonce missing — rebuild or revert-look")


# ── F4: no shadowing `const at ` in the card-view bundle ───────────────

def test_f4_card_view_no_shadowing_const_at():
    view_bundle = os.path.join(WEB_DSH, "melite-card-view", "lib", "client.js")
    if not os.path.isfile(view_bundle):
        pytest.skip("card-view bundle not built")
    body = open(view_bundle, encoding="utf-8", errors="replace").read()
    assert "const at " not in body, (
        "TDZ-suspect declaration is back — keep the atIdx rename")
