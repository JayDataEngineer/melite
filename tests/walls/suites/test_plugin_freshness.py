#!/usr/bin/env python3
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
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))

WEB_DSH = os.path.join(REPO, "plugins", "web", "dsh")
HARNESS_DSH = os.path.join(REPO, "plugins", "harness", "dsh")

n_pass = [0]
failures = []
skips = []


def check(name, ok, detail=""):
    if ok:
        n_pass[0] += 1
        print(f"  PASS  {name}")
    else:
        failures.append(name)
        print(f"  FAIL  {name} {detail}")


def newest(root, suffixes):
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


def fmt(t):
    import time
    return time.strftime("%H:%M:%S %Y-%m-%d", time.localtime(t))


def main():
    # ── F1: member lib/ freshness (BOTH families) ─────────────────────
    members = [
        (WEB_DSH, "media-plugin"),
        (WEB_DSH, "melite-card-deck"),
        (WEB_DSH, "melite-card-view"),
        (WEB_DSH, "infer-gallery"),
        (HARNESS_DSH, "melite-tools"),
    ]
    for base, plug in members:
        src = os.path.join(base, plug, "src")
        lib = os.path.join(base, plug, "lib")
        if not os.path.isdir(src) or not os.path.isdir(lib):
            continue
        src_t, src_f = newest(src, (".ts", ".tsx", ".css"))
        lib_t, lib_f = newest(lib, (".js", ".mjs"))
        rel = os.path.relpath(os.path.join(base, plug), REPO)
        if lib_t == 0.0:
            check(f"F1 {plug}: lib >= src (no stale build)",
                  src_t == 0.0,
                  f"no .js build output under {rel}/lib — build it")
            continue
        src_rel = os.path.relpath(src_f, REPO) if src_f else "(none)"
        lib_rel = os.path.relpath(lib_f, REPO) if lib_f else "(none)"
        check(f"F1 {plug}: lib >= src (no stale build)",
              lib_t >= src_t,
              f"src {fmt(src_t)} ({src_rel}) NEWER than "
              f"lib {fmt(lib_t)} ({lib_rel}) — rebuild it")

    # ── F2: editor dist freshness (THIS repo — the SSOT checkout) ─────
    ed_src = os.path.join(REPO, "plugins", "web", "editor", "src")
    ed_dist = os.path.join(REPO, "plugins", "web", "editor", "dist", "assets")
    feeds = [
        os.path.join(REPO, "plugins", "web", "ui_components"),
        os.path.join(REPO, "plugins", "engines"),
    ]
    if not os.path.isdir(ed_src) or not os.path.isdir(ed_dist):
        skips.append("F2 editor dist (not built)")
        print("  SKIP  F2 editor dist (not built)")
    else:
        newest_src_t, newest_src_f = newest(ed_src, (".ts", ".tsx"))
        for feed in feeds:
            if os.path.isdir(feed):
                t, f = newest(feed, (".ts", ".tsx"))
                if t > newest_src_t:
                    newest_src_t, newest_src_f = t, f
        dist_t, dist_f = newest(ed_dist, (".js",))
        check("F2 editor dist >= editor+kit+engines src (no stale dist)",
              dist_t >= newest_src_t,
              f"src {fmt(newest_src_t)} ({os.path.relpath(newest_src_f, REPO)}) "
              f"NEWER than dist {fmt(dist_t)} "
              f"({os.path.basename(dist_f)}) — run vite build")

    # ── F3: wand reload nonce — content pin ───────────────────────────
    # (Behavioral test pending rewrite — dead test documented in
    #  plugins/harness/dsh/testkit/vitest.config.ts. The bundle pin
    #  below is the shipped-fix guard: a silent revert cannot pass.)
    deck_bundle = os.path.join(WEB_DSH, "melite-card-deck", "lib", "client.js")
    if os.path.isfile(deck_bundle):
        body = open(deck_bundle, encoding="utf-8", errors="replace").read()
        check("F3 deck bundle contains _r= (wand nonce pin)",
              "_r=" in body,
              "recreate-caching nonce missing — rebuild or revert-look")
    else:
        skips.append("F3 deck bundle (not built)")

    # ── F4: no shadowing `const at ` in the card-view bundle ──────────
    view_bundle = os.path.join(WEB_DSH, "melite-card-view", "lib", "client.js")
    if os.path.isfile(view_bundle):
        body = open(view_bundle, encoding="utf-8", errors="replace").read()
        check("F4 card-view bundle free of shadowing 'const at '",
              "const at " not in body,
              "TDZ-suspect declaration is back — keep the atIdx rename")
    else:
        skips.append("F4 card-view bundle (not built)")

    total = n_pass[0] + len(failures)
    print(f"\n{total} checks, {len(failures)} failures, {len(skips)} skipped")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
