#!/usr/bin/env python3
"""test_cpp_engines.py — THE MONO-ENGINE QUARANTINE wall.

RE-DERIVED 2026-09-08 (operator order, verbatim: "We are building an
api caller for comfyui, not having engines anymore... you mixed in the
old code with the new code in a bad way"): the estate owns NO engines.
ComfyUI is the only engine (LAW 0); the old engine tiers —
cpp/audio-cpp, cpp/skintokens, cpp/autoremesher (retired 2026-09-07),
node/anycreature, sim — were estate-owned subprocess compute, every
one of their cards decl-only (never composable on either gateway), and
are QUARANTINED to vendor/retired-engines/ (operator order: "for the
stuff that would completely die, just put it in vendor, we can make
comfyui custom nodes later").

This wall pins the NEW invariants (the old category gates died with
the quarantine — their subjects live in git history at the parent of
the quarantine commit):

1. packages/engines/ holds ONLY comfyui (the mono-engine law, made
   physical).
2. The five retired tiers sit under vendor/retired-engines/ with
   their vendored payloads (submodules re-pointed) — nothing lost,
   custom-node rebirth keeps its raw material.
3. No live code (packages/, apps/, python/, tools/, scripts/)
   references the retired engine path shapes — old code must not
   reach into the new.
4. The TS gateway's ENGINE_TABLE (flowsValidate.ts) is comfyui-only.
"""

import os
import re
import sys

REPO = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))

PASS = 0
FAIL = 0


def check(name: str, cond: bool, detail: str = "") -> None:
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ok   {name}")
    else:
        FAIL += 1
        print(f"  FAIL {name} {detail}")


RETIRED = ["audio-cpp", "skintokens", "autoremesher", "anycreature", "sim"]

# 1. mono-engine: packages/engines holds only comfyui.
engines_root = os.path.join(REPO, "packages", "engines")
entries = sorted(d for d in os.listdir(engines_root)
                 if os.path.isdir(os.path.join(engines_root, d)))
check("mono-engine (only comfyui under packages/engines)",
      entries == ["comfyui"], f"found: {entries}")

# 2. the quarantine: every retired tier present, submodules re-pointed.
quarantine = os.path.join(REPO, "vendor", "retired-engines")
for name in RETIRED:
    check(f"retired tier quarantined: {name}",
          os.path.isdir(os.path.join(quarantine, name)))
with open(os.path.join(REPO, ".gitmodules"), encoding="utf-8") as f:
    gm = f.read()
for sub in ("anyCreature", "autoremesher", "skin-tokens.cpp"):
    check(f"submodule re-pointed into quarantine: {sub}",
          "vendor/retired-engines/" in gm and sub in gm)

# 3. no live code references the retired engine path shapes.
bad = []
shapes = re.compile(r"packages/engines/(cpp|node|sim)/")
roots = ["packages", "apps", "python", "tools", "scripts"]
for root in roots:
    for dirpath, dirnames, filenames in os.walk(os.path.join(REPO, root)):
        dirnames[:] = [d for d in dirnames
                       if d not in ("node_modules", "__pycache__",
                                    "lib", "dist", "vendor",
                                    "retired-engines", ".git")]
        for fn in filenames:
            if not fn.endswith((".py", ".ts", ".tsx", ".js", ".mjs",
                                ".sh", ".json", ".yml", ".yaml")):
                continue
            p = os.path.join(dirpath, fn)
            try:
                with open(p, encoding="utf-8") as f:
                    body = f.read()
            except (OSError, UnicodeDecodeError):
                continue
            for m in shapes.finditer(body):
                line = body[:m.start()].rsplit("\n", 1)[-1]
                # lines narrating the quarantine are history, not paths
                if "retired-engines" in line or "QUARANTIN" in line:
                    continue
                bad.append(f"{os.path.relpath(p, REPO)}: {line.strip()[:70]}")
check("no live code references retired engine paths",
      not bad, f"violations: {bad[:4]}")

# 4. the TS engine table is comfyui-only.
fv = os.path.join(REPO, "packages", "gateway-doors", "src", "doors",
                  "flowsValidate.ts")
with open(fv, encoding="utf-8") as f:
    body = f.read()
m = re.search(r"const ENGINE_TABLE[^=]*=\s*\{(.*?)\};", body, re.S)
check("ENGINE_TABLE present in flowsValidate.ts", m is not None)
if m:
    tbl = m.group(1)
    check("ENGINE_TABLE keeps comfyui", "comfyui" in tbl)
    for dead in ("anycreature", "audio_cpp", "skintokens", '"sim"'):
        check(f"ENGINE_TABLE dropped {dead}", dead not in tbl)

print("mono-engine quarantine: %d passed, %d failed" % (PASS, FAIL))
sys.exit(1 if FAIL else 0)
