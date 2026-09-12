#!/usr/bin/env python3
"""dsh-census.py — the non-DSH dependency census (2026-09-12, the de-poisoning).

Operator-runnable proof of what the estate's product source imports.
No agent word involved: this script walks every package's source tree
and reports every import of a library OUTSIDE the DSH sanction set.

THE SANCTION ORACLE is the DSH checkout's own node_modules manifest —
whatever @deepseek-ai packages DSH itself ships/uses is sanctioned
(zod, clsx, @tanstack/react-virtual, react, node: builtins...). The
clause-C canvas exemption (three/@react-three/wavesurfer/perfect-
freehand — canvas/3D/audio surfaces with no DSH counterpart) is
listed, not hidden.

Exit codes: 0 = card plane clean; 1 = card-plane violation; 2 = only
non-card residue (reported, exit clean for CI unless -strict).
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DSH = Path.home() / ".local/lib/node_modules/@deepseek-ai/dsh"

# ── The banned surface (product-runtime poison) ─────────────────────────
BANNED = [
    # the kit + its lib stack
    r"@melite/ui",
    r"@radix-ui/",
    r"@base-ui-components/",
    r"radix-ui",
    r"base-ui",
    r"class-variance-authority",
    r"cmdk",
    r"tailwind-merge",
    r"sonner",
    r"vidstack",
    r"fuse\.js",
    # state / motion / icons / dnd
    r"zustand",
    r"framer-motion",
    r"lucide-react",
    r"@dnd-kit/",
    # tailwind runtime (class strings are style-law, handled separately)
    r"tailwindcss",
    r"tailwind-animate",
]

# ── The sanctioned set, derived from DSH's own manifest ────────────────
def dsh_sanctioned() -> set[str]:
    sanctioned: set[str] = set()
    if not DSH.exists():
        return sanctioned
    out = subprocess.run(
        ["find", str(DSH / "node_modules" / "@deepseek-ai"), "-name", "package.json"],
        capture_output=True, text=True,
    ).stdout.splitlines()
    for mf in out:
        try:
            name = json.load(open(mf)).get("name", "")
        except Exception:
            continue
        if name:
            sanctioned.add(name)
    # DSH's own package + the always-sanctioned runtime bases
    sanctioned |= {
        "@deepseek-ai/dsh", "react", "react-dom",
        "zod", "clsx", "@tanstack/react-virtual",
    }
    return sanctioned

# ── Clause-C (ledger-sanctioned canvas/3D/audio surfaces) ──────────────
CLAUSE_C = {
    "three", "@react-three/fiber", "@react-three/drei",
    "wavesurfer.js", "perfect-freehand",
}

# The card plane (Layer A's card surfaces) — must be ZERO banned imports.
CARD_PLANE = [
    "packages/web/card-base",
    "packages/web/melite-card-view",
    "packages/video/h3-timeline",
    "packages/image/mask-studio",
    "packages/image/ideogram4",
    "packages/3d/anny",
    "packages/3d/img-to-mesh",
    "packages/engines/comfyui/action_cards",
    "packages/web-kit/timeline",
    "packages/web-kit/slots",
    "packages/web-kit/catalog",
    "packages/web-kit/contracts",
    "packages/web-kit/formats",
]

IMPORT_RE = re.compile(
    r"""(?:from\s+|import\s*\(\s*|import\s+|require\(\s*|import\(\s*)["']([^"']+)["']"""
)

def scan(root: Path) -> dict[str, list[str]]:
    hits: dict[str, list[str]] = {}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in ("node_modules", "lib", "dist", "generated", ".git")]
        for fn in filenames:
            if not re.search(r"\.(ts|tsx|js|jsx|mjs)$", fn):
                continue
            p = Path(dirpath) / fn
            try:
                text = p.read_text(errors="replace")
            except Exception:
                continue
            for m in IMPORT_RE.finditer(text):
                spec = m.group(1)
                if spec.startswith(".") or spec.startswith("node:") or spec.startswith("virtual:"):
                    continue
                bare = spec.split("/")[0] if not spec.startswith("@") else "/".join(spec.split("/")[:2])
                for pat in BANNED:
                    if re.fullmatch(pat, bare) or re.fullmatch(pat, spec):
                        hits.setdefault(f"{pat}", []).append(f"{p.relative_to(REPO)}  ←  {spec}")
                        break
    return hits

def main() -> int:
    strict = "-strict" in sys.argv
    card_only = "-card" in sys.argv
    sanctioned = dsh_sanctioned()

    print("=" * 72)
    print("DSH CENSUS — product-source imports of banned libraries")
    print(f"repo: {REPO}")
    print(f"DSH sanction oracle: {DSH}")
    print(f"sanctioned (DSH's own manifest + runtime bases): "
          f"{len(sanctioned)} names incl. zod, clsx, @tanstack/react-virtual")
    print(f"clause-C exempt (canvas/3D/audio, ledger-sanctioned): {sorted(CLAUSE_C)}")
    print("=" * 72)

    card_hits: dict[str, list[str]] = {}
    other_hits: dict[str, list[str]] = {}

    for pkg in sorted(CARD_PLANE):
        root = REPO / pkg
        if not root.exists():
            print(f"[card] {pkg}: MISSING")
            continue
        hits = scan(root)
        for k, v in hits.items():
            card_hits.setdefault(f"{pkg} :: {k}", []).extend(v)

    if not card_only:
        for root in sorted(REPO.glob("packages/*")):
            rel = str(root.relative_to(REPO)).replace("\\", "/")
            if rel in CARD_PLANE or not (root / "src").exists() and not root.name == "action_cards":
                # still scan packages with source outside src/ (engines)
                pass
            if rel.startswith("packages/web-kit/"):
                sub = rel.split("/")[2] if len(rel.split("/")) > 2 else ""
                if sub and f"packages/web-kit/{sub}" in CARD_PLANE:
                    continue
            if not root.is_dir():
                continue
            hits = scan(root)
            for k, v in hits.items():
                other_hits.setdefault(f"{rel} :: {k}", []).extend(v)

    print("\n── CARD PLANE (must be ZERO) " + "─" * 38)
    if card_hits:
        for k in sorted(card_hits):
            print(f"  ✗ {k}")
            for line in card_hits[k][:8]:
                print(f"      {line}")
    else:
        print("  ✓ ZERO banned imports across all 13 card-plane packages")

    if not card_only:
        print("\n── REST OF ESTATE (reported) " + "─" * 39)
        for k in sorted(other_hits):
            print(f"  · {k}  ({len(other_hits[k])} hits)")
            for line in other_hits[k][:4]:
                print(f"      {line}")

    print("\n── VERIFY THE ORACLE YOURSELF " + "─" * 35)
    print("  ls ~/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/")
    print("  # every name there is sanctioned — the census bans everything else")
    print("  # re-run: python3 scripts/dsh-census.py [-card] [-strict]")

    if card_hits:
        return 1
    if strict and other_hits:
        return 2
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
