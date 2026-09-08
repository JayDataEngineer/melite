#!/usr/bin/env python3
"""gen_registry — regenerate web/registry.json, THE component catalog
(the shadcn method's registry.json, copied — docs/design/web-registry.md
§5).

THE LAW:
  * the catalog is a DERIVED ARTIFACT. The package exports are the
    SSOT; the registry is their machine-readable face. Hand edits to
    web/registry.json are drift; this tool regenerates and the parity
    check (dry run, exit 1 on drift) pins it.
  * item types mirror shadcn: registry:ui (a primitive — one input
    metaphor, no domain knowledge) and registry:block (a composition —
    domain components built from primitives: FilmPlayer, NumberField,
    ProvenanceBadge...).
  * ANYONE CAN HOST A CATALOG (the fork mechanic): every
    packages/engines/<engine>/ui/ and
    packages/engines/<engine>/action_cards/<genre>/ui/ package may
    carry its own registry.json fragment (same schema, relative
    files); the composed catalog merges core + every fragment.
  * the boundary gate consumes this file: a tenant importing a
    component NOT in the composed catalog fails the gate. What exists
    is what the catalog says exists.

Usage:
  python3 tools/gen_registry.py            # dry run: print drift
  python3 tools/gen_registry.py --write    # rewrite web/registry.json
"""

import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The @melite/ui modules that are COMPOSITIONS (domain atoms built from
# primitives) rather than primitives. Everything else exporting a
# component from the kit is registry:ui.
_BLOCKS = {
    "FilmPlayer", "NumberField", "ProvenanceBadge", "SlotSquare",
    "WirePickerModal", "cardControls", "motionThumbStore",
}

# Kit packages that contribute components to the pool. contracts/slots/
# catalog/formats are TYPE/runtime plumbing, not components — they do
# not ride the registry (the boundary gate allows them by package
# name, not by item).
_KIT_PACKAGES = {
    "ui": "@melite/ui",
}

_COMPONENT_RE = re.compile(
    r"^(?:export\s+)?(?:default\s+)?(?:function|const)\s+([A-Z][A-Za-z0-9]*)",
    re.M,
)

# Export identifiers a module provides (functions/consts/types) — the
# NAMES a consumer imports. The boundary gate checks imports against
# these, so the catalog must state them (shadcn's item name covers one
# default component; our kit files export many idents each).
_EXPORT_RE = re.compile(
    r"^export\s+(?:async\s+)?(?:function|const|let|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)",
    re.M,
)
# shadcn-style files declare plainly and export at the bottom:
# `export { Input }` / `export { A, B as C }` — harvest those names too.
_EXPORT_LIST_RE = re.compile(
    r"^export\s*\{([^}]*)\}",
    re.M,
)


def _exports_of(body: str) -> list[str]:
    names = set(_EXPORT_RE.findall(body))
    for group in _EXPORT_LIST_RE.findall(body):
        for part in group.split(","):
            part = part.strip()
            if not part:
                continue
            # `Input` or `X as Y` — the EXPORTED name is the last word.
            names.add(part.split()[-1])
    return sorted(names)


def _kit_items() -> list[dict[str, str | list[dict[str, str]] | list[str] | bool]]:
    """Core items: one per exported component of the kit packages."""
    items = []
    for pkg_dir, pkg_name in sorted(_KIT_PACKAGES.items()):
        src = os.path.join(REPO, "web", pkg_dir, "src")
        for fn in sorted(os.listdir(src)):
            if not fn.endswith((".tsx", ".ts")) or fn == "index.ts":
                continue
            stem = fn.rsplit(".", 1)[0]
            with open(os.path.join(src, fn), encoding="utf-8") as fh:
                body = fh.read()
            exports = _exports_of(body)
            if not exports:
                continue  # a re-export shim or empty module — not a member
            exports_a_component = _COMPONENT_RE.search(body) is not None
            if exports_a_component or stem in _BLOCKS:
                kind = "registry:block" if stem in _BLOCKS else "registry:ui"
            elif any(e.startswith("use") for e in exports):
                kind = "registry:hook"
            else:
                kind = "registry:lib"
            items.append({
                "name": stem,
                "type": kind,
                "package": pkg_name,
                "files": [{"path": "src/%s" % fn}],
                "exports": exports,
                "component": exports_a_component or stem in _BLOCKS,
            })
    return items


def _fragment_items() -> list[dict[str, str | int | float | bool | list[str] | list[dict[str, str]] | dict[str, str | int | float | bool | None] | None]]:
    """Plugin fragments: every engines ui package that carries its own
    registry.json (the fork mechanic — a plugin publishing components
    into the pool)."""
    items = []
    eng_root = os.path.join(REPO, "packages", "engines")
    if not os.path.isdir(eng_root):
        return items
    for engine in sorted(os.listdir(eng_root)):
        base = os.path.join(eng_root, engine)
        ac = os.path.join(base, "action_cards")
        roots = [os.path.join(base, "ui")]
        if os.path.isdir(ac):
            for genre in sorted(os.listdir(ac)):
                roots.append(os.path.join(ac, genre, "ui"))
        for ui_dir in roots:
            frag = os.path.join(ui_dir, "registry.json")
            if not os.path.isfile(frag):
                continue
            with open(frag, encoding="utf-8") as fh:
                data = json.load(fh)
            for it in data.get("items", []):
                it = dict(it)
                it["plugin"] = engine
                items.append(it)
    return items


def main() -> int:
    write = "--write" in sys.argv
    registry = {
        "$schema": "https://ui.shadcn.com/schema/registry.json",
        "items": _kit_items() + _fragment_items(),
    }
    text = json.dumps(registry, indent=2, ensure_ascii=False) + "\n"
    snap = os.path.join(REPO, "web", "generated", "registry.json")
    old = open(snap, encoding="utf-8").read() if os.path.exists(snap) else None
    if old == text:
        print("web/generated/registry.json matches the packages (%d items)"
              % len(registry["items"]))
        return 0
    if write:
        with open(snap, "w", encoding="utf-8") as f:
            f.write(text)
        print("wrote web/generated/registry.json (%d items: %d core + %d plugin)"
              % (len(registry["items"]), len(_kit_items()),
                 len(_fragment_items())))
        return 0
    print("DRIFT web/generated/registry.json — run with --write")
    return 1


if __name__ == "__main__":
    sys.exit(main())
