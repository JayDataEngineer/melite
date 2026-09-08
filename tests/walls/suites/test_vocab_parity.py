#!/usr/bin/env python3
"""Vocab parity wall — the HAND-OWNED vocab.ts vs the frozen wants.

PURGE S-vocab (2026-09-08): tools/export_vocab.py + python/card_kinds.py
+ python/slot_kinds.py are deleted. packages/engines/comfyui/cordis/src/
generated/vocab.ts is hand-owned frozen data (header re-truthed) — the
want-sides below are FROZEN literals transcribed from the deleted py
SSOT at the cut (verified byte-faithful: this wall passed 26/26
unchanged against the untouched file at transcription time). A hand
edit to vocab.ts without updating the literal fails HERE; the file's
own header names this wall.

This wall refuses three drift classes (same legs, frozen wants):

  1. STALE FACE — retired with the exporter (tombstone print below);
     the hand-owned header pin + exporter-deletion pin replace it.
  2. MEMBER ROT — frozen member-set equality vs ts per union (ts side
     parsed stdlib-only: no TS toolchain).
  3. TABLE ROT — CARD_KINDS rows (every flag), SLOT_KINDS entries,
     SLOTS / SIDEBAR_SECTIONS / UNDECLARED_SLOTS sets, sorted order.
Plus two hygiene gates: no TS `enum` (erasable-syntax law — the
Cordis plane runs on node --experimental-strip-types) and no second
spelling of the sibling-owned seam unions (python/ui_map.py owned
them; the MAP stroke's uiMap.generated.ts is their only face —
ui_map.py dies in this same stroke, the seam NAMES below are frozen
identifiers, not imports).

Run: python3 tests/walls/suites/test_vocab_parity.py
"""

from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]

EXPORTER = REPO / "tools" / "export_vocab.py"
GENERATED = (
    REPO
    / "packages"
    / "engines"
    / "comfyui"
    / "cordis"
    / "src"
    / "generated"
    / "vocab.ts"
)

PASS: list[str] = []
FAIL: list[str] = []


def _ok(name: str) -> None:
    PASS.append(name)


def _bad(name: str, why: str) -> None:
    FAIL.append("%s: %s" % (name, why))


# ── FROZEN WANTS (transcribed 2026-09-08 from the deleted py SSOT:
# card_kinds.TABLE + BadgeTone + KindRunner, slot_kinds.VOCAB +
# FileKind, flow.Kind, grammar Genre/Quant/ClipType/LatentNode/
# KnobKind/StudioSize/StudioLayout/StudioKind, dsl SIDEBAR_SECTIONS,
# ui_map seam names). Hand edits to vocab.ts update these literals. ──
FROZEN_UNIONS: dict[str, list[str]] = {
    "GenreValues": ["", "3d", "audio", "image", "motion", "other",
                    "text", "video"],
    "KindValues": ["audio", "image", "lora", "mesh", "num", "seg",
                   "text", "video"],
    "FileKindValues": ["any", "audio", "glb", "image", "mask", "motion",
                       "text", "video", "voice"],
    "BadgeToneValues": ["brand", "default"],
    "KindRunnerValues": ["", "input"],
    "SidebarSectionValues": ["3d", "audio", "image", "image-edit",
                             "motion", "video"],
    "QuantValues": ["bf16", "f32", "fp8", "int8", "lightning4", "native"],
    "ClipTypeValues": ["ideogram4", "krea2", "lumina2", "minimax",
                       "qwen_image", "stable_diffusion", "wan"],
    "LatentNodeValues": ["EmptyFlux2LatentImage", "EmptyLatentImage",
                         "EmptySD3LatentImage"],
    "KnobKindValues": ["b", "n", "s"],
    "StudioSizeValues": ["huge", "normal", "wide"],
    "StudioLayoutValues": ["panel", "studio"],
    "StudioKindValues": ["assembly", "custom"],
    "SlotValues": ["end_image", "first_frame", "image1", "image2",
                   "image3", "input_glb", "input_image", "input_mask",
                   "lanpaint_mask", "last_frame", "prev_motion_artifact",
                   "preview_glb", "reference_audio", "reference_image",
                   "source_glb", "source_image", "voice_file"],
    "CardKindValues": ["body", "card-compose", "chain", "compound",
                       "generation", "input", "preview", "studio-link"],
}

# (slot, kind) in declaration order — slot_kinds.VOCAB.slots sorted
# by slot at the cut (the order_SLOTS pin keeps it so).
FROZEN_SLOT_ROWS: list[tuple[str, str]] = [
    ("end_image", "image"),
    ("first_frame", "image"),
    ("image1", "image"),
    ("image2", "image"),
    ("image3", "image"),
    ("input_glb", "glb"),
    ("input_image", "image"),
    ("input_mask", "mask"),
    ("lanpaint_mask", "mask"),
    ("last_frame", "image"),
    ("prev_motion_artifact", "motion"),
    ("preview_glb", "glb"),
    ("reference_audio", "audio"),
    ("reference_image", "image"),
    ("source_glb", "glb"),
    ("source_image", "image"),
    ("voice_file", "voice"),
]

FROZEN_UNDECLARED: list[str] = ["lanpaint_mask"]

FROZEN_SIDEBAR: list[str] = ["3d", "audio", "image", "image-edit",
                             "motion", "video"]

# kind -> (runnable, executable, formSpec, compound, opensStudio,
# badgeTone, runner, icon) — card_kinds.TABLE rows sorted by kind.
FROZEN_CARD_ROWS: dict[str, tuple[str, ...]] = {
    "body": ("false", "false", "false", "false", "false",
             "default", "", '"Box"'),
    "card-compose": ("true", "true", "true", "false", "false",
                     "default", "", "null"),
    "chain": ("true", "true", "true", "false", "false",
              "default", "", "null"),
    "compound": ("true", "true", "false", "true", "false",
                 "default", "", "null"),
    "generation": ("true", "true", "true", "false", "false",
                   "default", "", "null"),
    "input": ("true", "true", "false", "false", "false",
              "default", "input", "null"),
    "preview": ("true", "true", "false", "false", "false",
                "default", "", "null"),
    "studio-link": ("true", "false", "false", "false", "true",
                    "brand", "", "null"),
}

# The sibling-owned seam union NAMES (ui_map.py identifiers, frozen —
# the MAP stroke's uiMap.generated.ts is their only face).
FROZEN_SEAM = ["ViewportKind", "BarKind", "OverlayKind", "OverlayDock",
               "ViewportAnchorDock"]


def _values_block(src: str, const: str) -> list[str] | None:
    """Parse `export const <const> = [...] as const;` stdlib-only."""
    m = re.search(
        r"export const %s = \[(.*?)\] as const;" % re.escape(const),
        src, re.DOTALL)
    if m is None:
        return None
    return re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1))


def main() -> int:
    if not GENERATED.is_file():
        print("FAIL vocab.ts does not exist — it is hand-owned frozen "
              "data, restore it from git")
        return 1
    ts = GENERATED.read_text(encoding="utf-8")

    # ── 1. STALE FACE: retired with the exporter — its regen drove
    # the retired serving stack, so running it here would re-anchor
    # the wall to deleted machinery. The hand-owned header pin +
    # exporter-deletion pin replace it.
    print("  retired stale-face regen (the file is hand-owned now — "
          "header + exporter-absence pinned below)")
    if "HAND-OWNED" in ts and "Regenerate:" not in ts:
        _ok("hand_owned_header")
    else:
        _bad("hand_owned_header",
             "vocab.ts header must mark the file HAND-OWNED with no "
             "Regenerate pointer (it may name the deleted exporter "
             "as provenance)")
    if not EXPORTER.is_file():
        _ok("exporter_deleted")
    else:
        _bad("exporter_deleted",
             "tools/export_vocab.py still exists — the stale-face "
             "regen would re-anchor to it")

    # ── 2. MEMBER ROT: frozen-vs-ts per union ───────────────────────
    slot_rows = FROZEN_SLOT_ROWS
    card_rows = sorted(FROZEN_CARD_ROWS)
    unions = FROZEN_UNIONS
    for const, members in unions.items():
        got = _values_block(ts, const)
        if got is None:
            _bad("union_%s" % const, "no `export const %s` block" % const)
        elif got != members:
            _bad("union_%s" % const,
                 "frozen %s != ts %s" % (members, got))
        else:
            _ok("union_%s" % const)

    # ── 3. TABLE ROT ────────────────────────────────────────────────
    slots_got = _values_block(ts, "SLOTS_VALUES")  # never emitted; guard
    if slots_got is not None:
        _bad("slots_shape", "SLOTS must be a plain string array, "
                            "not a Values const")
    else:
        m = re.search(r"export const SLOTS: readonly string\[\] = \[(.*?)\];",
                      ts, re.DOTALL)
        got = re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1)) if m else None
        want_slots = [slot for slot, _kind in slot_rows]
        if got != want_slots:
            _bad("table_SLOTS", "frozen %s != ts %s" % (want_slots, got))
        else:
            _ok("table_SLOTS")

    m = re.search(
        r"export const SLOT_KINDS: Record<string, FileKind> = \{(.*?)\};",
        ts, re.DOTALL)
    entries = dict(re.findall(r'"((?:[^"\\]|\\.)*)": "((?:[^"\\]|\\.)*)"',
                              m.group(1))) if m else None
    want_kinds = {slot: kind for slot, kind in slot_rows}
    if entries != want_kinds:
        _bad("table_SLOT_KINDS",
             "frozen %s != ts %s" % (want_kinds, entries))
    else:
        _ok("table_SLOT_KINDS")

    m = re.search(
        r"export const UNDECLARED_SLOTS: readonly string\[\] = \[(.*?)\];",
        ts, re.DOTALL)
    got = re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1)) if m else None
    want_und = FROZEN_UNDECLARED
    if got != want_und:
        _bad("table_UNDECLARED_SLOTS", "frozen %s != ts %s" % (want_und, got))
    else:
        _ok("table_UNDECLARED_SLOTS")

    m = re.search(
        r"export const SIDEBAR_SECTIONS: readonly SidebarSection\[\] = "
        r"\[(.*?)\];", ts, re.DOTALL)
    got = re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1)) if m else None
    want_sec = FROZEN_SIDEBAR
    if got != want_sec:
        _bad("table_SIDEBAR_SECTIONS", "frozen %s != ts %s" % (want_sec, got))
    else:
        _ok("table_SIDEBAR_SECTIONS")

    row_re = re.compile(
        r"^\s*\{ kind: \"((?:[^\"\\]|\\.)*)\", runnable: (true|false), "
        r"executable: (true|false), formSpec: (true|false), "
        r"compound: (true|false), opensStudio: (true|false), "
        r"badgeTone: \"((?:[^\"\\]|\\.)*)\", runner: \"((?:[^\"\\]|\\.)*)\", "
        r"icon: (null|\"(?:[^\"\\]|\\.)*\") \},$")
    ts_rows = {}
    for line in ts.splitlines():
        rm = row_re.match(line)
        if rm:
            (kind, run, exe, fs, comp, studio,
             tone, runner, icon) = rm.groups()
            ts_rows[kind] = (run, exe, fs, comp, studio, tone, runner, icon)
    py_rows = dict(FROZEN_CARD_ROWS)
    if ts_rows != py_rows:
        only_py = sorted(set(py_rows) - set(ts_rows))
        only_ts = sorted(set(ts_rows) - set(py_rows))
        wrong = sorted(k for k in py_rows
                       if k in ts_rows and py_rows[k] != ts_rows[k])
        _bad("table_CARD_KINDS",
             "missing %s extra %s flag-drift %s"
             % (only_py, only_ts, wrong))
    else:
        _ok("table_CARD_KINDS")

    # sorted-order pins (determinism is the contract — frozen seqs
    # must stay sorted; a hand edit inserting out of order fails here)
    for label, seq in (("SLOTS", [slot for slot, _kind in slot_rows]),
                       ("CardKind", card_rows),
                       ("SIDEBAR_SECTIONS", FROZEN_SIDEBAR)):
        if list(seq) != sorted(seq):
            _bad("order_%s" % label, "frozen order is not sorted" % label)
        else:
            _ok("order_%s" % label)

    # ── 4. HYGIENE ──────────────────────────────────────────────────
    if re.search(r"^export enum \w+", ts, re.MULTILINE):
        _bad("no_ts_enums", "vocab.ts declares a TS enum — "
                            "erasable syntax only (const-unions)")
    else:
        _ok("no_ts_enums")
    seam = FROZEN_SEAM
    dupes = [n for n in seam
             if re.search(r"export (?:const|type) %s\b" % n, ts)]
    if dupes:
        _bad("no_seam_dupes",
             "sibling-owned seam unions re-declared: %s" % dupes)
    else:
        _ok("no_seam_dupes")

    for p in PASS:
        print("  ok   %s" % p)
    for f in FAIL:
        print("  FAIL %s" % f)
    print("PASS %d / FAIL %d" % (len(PASS), len(FAIL)))
    return 1 if FAIL else 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
