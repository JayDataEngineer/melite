#!/usr/bin/env python3
"""PLUGIN FRESHNESS LAW SUITE (2026-09-01) — the stale-build contract.

The Timeline-card crash ("Cannot access 'at' before initialization",
2026-09-01) shipped because commit da243dc4 fixed two TDZ bugs in the
editor SOURCE at 06:34 while the served dist/ was built at 00:40 —
nobody rebuilt. The fix was correct; the artifact was stale. Same class
bit the deck/card-view plugins: two copies exist (ray checkout + this
repo's dsh/), and a fix landed in one while the other kept serving.

Checks:

  F1  every dsh plugin's lib/ bundles are >= its newest src/ file
      (source newer than build output = "rebuild before deploy")
  F2  the editor's dist/ is >= its newest source file (src/ + the
      plugins/ tree that feeds its build) — SKIP when the ray checkout
      is absent (not this machine's concern)
  F3  content pin: the deck client bundle carries the wand reload nonce
      (_r=) — revert of the recreate-caching fix fails the build gate
  F4  content pin: the card-view bundle has NO `const at ` declaration
      — the shadowing name from the TDZ investigation stays dead

F3/F4 are honest grep pins: they pin the exact shipped fixes so a
silent revert (edit without rebuild, or rebuild from reverted source)
cannot pass.
"""
import os
import sys
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, ".."))
RAY = "/home/user/Documents/programs/ray"

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
        dirnames[:] = [d for d in dirnames if d not in ("node_modules", ".git", "__pycache__")]
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
    # ── F1: plugin lib/ freshness (this repo's copies) ────────────────
    plugins = [
        "media-plugin", "melite-card-deck", "melite-card-view",
        "melite-tools", "infer-gallery", "melite-hello",
    ]
    for plug in plugins:
        src = os.path.join(REPO, "dsh", plug, "src")
        lib = os.path.join(REPO, "dsh", plug, "lib")
        if not os.path.isdir(src) or not os.path.isdir(lib):
            continue
        src_t, src_f = newest(src, (".ts", ".tsx", ".css"))
        lib_t, lib_f = newest(lib, (".js", ".mjs"))
        if lib_t == 0.0:
            check(f"F1 {plug}: lib >= src (no stale build)",
                  src_t == 0.0,
                  f"no .js build output under dsh/{plug}/lib — build it")
            continue
        src_rel = os.path.relpath(src_f, REPO) if src_f else "(none)"
        lib_rel = os.path.relpath(lib_f, REPO) if lib_f else "(none)"
        check(f"F1 {plug}: lib >= src (no stale build)",
              lib_t >= src_t,
              f"src {fmt(src_t)} ({src_rel}) NEWER than "
              f"lib {fmt(lib_t)} ({lib_rel}) — rebuild it")

    # ── F2: editor dist freshness (ray checkout; skip if absent) ──────
    ed_src = os.path.join(RAY, "web", "editor", "src")
    ed_dist = os.path.join(RAY, "web", "editor", "dist", "assets")
    ray_plugins = os.path.join(RAY, "plugins")
    if not os.path.isdir(ed_src) or not os.path.isdir(ed_dist):
        skips.append("F2 editor dist (ray checkout absent)")
        print(f"  SKIP  F2 editor dist (ray checkout absent)")
    else:
        src_t, src_f = newest(ed_src, (".ts", ".tsx"))
        plug_t, plug_f = newest(ray_plugins, (".ts", ".tsx")) if os.path.isdir(ray_plugins) else (0.0, "")
        newest_src_t = max(src_t, plug_t)
        newest_src_f = src_f if src_t >= plug_t else plug_f
        dist_t, dist_f = newest(ed_dist, (".js",))
        check("F2 editor dist >= editor+plugins src (no stale dist)",
              dist_t >= newest_src_t,
              f"src {fmt(newest_src_t)} ({newest_src_f}) NEWER than dist "
              f"{fmt(dist_t)} ({os.path.basename(dist_f)}) — run vite build")

    # ── F3: wand reload nonce — BEHAVIORAL + content pin ──────────────
    # The behavioral test drives the real DeckCanvas component in
    # happy-dom: renders, fires OPEN_DRAFT_EVENT with the same id, and
    # asserts the iframe URL nonce bumps (_r=1 → _r=2). This catches
    # both the React no-op regression AND silent source reverts. When
    # vitest infra is unavailable, fall back to a content grep.
    deck_test = os.path.join(REPO, "dsh", "melite-card-deck",
                             "test", "deck-canvas-open.test.tsx")
    vitest_bin = os.path.join(REPO, "dsh", "node_modules", ".bin", "vitest")
    if os.path.isfile(deck_test) and (os.path.isfile(vitest_bin)
                                      or os.path.isfile(vitest_bin + ".cmd")):
        try:
            r = subprocess.run(
                [vitest_bin, "run", "melite-card-deck/test/"
                 "deck-canvas-open.test.tsx"],
                cwd=os.path.join(REPO, "dsh"),
                capture_output=True, text=True, timeout=30,
            )
            ok = r.returncode == 0 and "6 passed" in r.stdout
            detail = "" if ok else (
                f"vitest exit {r.returncode}\n{r.stdout[-500:] if r.stdout else ''}"
                f"\n{r.stderr[-500:] if r.stderr else ''}")
            check("F3 deck nonce behavioral test (vitest 6/6)", ok, detail)
        except (subprocess.TimeoutExpired, OSError) as exc:
            check("F3 deck nonce behavioral test (vitest 6/6)",
                  False, f"run failed: {exc}")
            # content pin as fallback
            deck_bundle = os.path.join(REPO, "dsh", "melite-card-deck",
                                       "lib", "client.js")
            if os.path.isfile(deck_bundle):
                body = open(deck_bundle, encoding="utf-8",
                            errors="replace").read()
                check("F3 fallback: deck bundle contains _r= (content pin)",
                      "_r=" in body)
    elif os.path.isfile(deck_test):
        skips.append("F3 behavioral (vitest not installed)")
        # content pin fallback
        deck_bundle = os.path.join(REPO, "dsh", "melite-card-deck",
                                   "lib", "client.js")
        if os.path.isfile(deck_bundle):
            body = open(deck_bundle, encoding="utf-8",
                        errors="replace").read()
            check("F3 fallback: deck bundle contains _r= (content pin)",
                  "_r=" in body)
    else:
        skips.append("F3 (test file missing)")

    # ── F4: no shadowing `const at ` in the card-view bundle ──────────
    view_bundle = os.path.join(REPO, "dsh", "melite-card-view", "lib", "client.js")
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
