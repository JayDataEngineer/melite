#!/usr/bin/env python3
"""Vocab parity wall — the generated TS face vs the py declarations
(ladder P1, declarations manifest .scratch/declarations-ts-map.md
§4.4 + §5 step 7-vocabs).

py/card_kinds.py + py/slot_kinds.py + py/flow.py::Kind +
py/melite_models/grammar.py + ActionCard.SIDEBAR_SECTIONS are the SSOT.
tools/export_vocab.py emits plugins/engines/comfyui/cordis/src/
generated/vocab.ts from them (shadow artifact — nothing imports it
yet). This wall refuses three drift classes:

  1. STALE FACE — regen-to-temp byte-equality (drift refuses).
  2. MEMBER ROT — member-set equality py-vs-ts per union (py side
     imported live, ts side parsed stdlib-only: no TS toolchain).
  3. TABLE ROT — CARD_KINDS rows (every flag), SLOT_KINDS entries,
     SLOTS / SIDEBAR_SECTIONS / UNDECLARED_SLOTS sets, sorted order.
Plus two hygiene gates: no TS `enum` (erasable-syntax law — the
Cordis plane runs on node --experimental-strip-types) and no second
spelling of the sibling-owned seam unions (py/ui_map.py owns them;
the MAP stroke's uiMap.generated.ts is their only face).

NEXT STEPS (filed, not half-built — the exporter's refinements verdict):
py/melite_cards/validators.py semantics (positive/seed/ranged/
lora-bag/slot-null/envelope) become generated zod refinements with a
refusal-text parity wall (manifest §5 step 6 shape) once the decl
cutover reaches the gates. Porting them here — per-use bounds
factories, a row shape, schema context — without the zod harness
would be dual-serve drift, so this wall pins vocabs only.

Run: python3 tests/walls/suites/test_vocab_parity.py
"""

from __future__ import annotations

import importlib.util
import re
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import card_kinds  # noqa: E402
import flow as _flow  # noqa: E402
import slot_kinds  # noqa: E402
import ui_map as _ui_map  # noqa: E402  (read-only: second-spelling guard)
from melite_cards.dsl import ActionCard  # noqa: E402
from melite_models.grammar import (  # noqa: E402
    ClipType,
    Genre,
    KnobKind,
    LatentNode,
    Quant,
    StudioKind,
    StudioLayout,
    StudioSize,
)

EXPORTER = REPO / "tools" / "export_vocab.py"
GENERATED = (
    REPO
    / "plugins"
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


def _load_exporter():
    spec = importlib.util.spec_from_file_location("export_vocab", EXPORTER)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


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
        print("FAIL vocab.ts does not exist — run "
              "python3 tools/export_vocab.py --write")
        return 1
    ts = GENERATED.read_text(encoding="utf-8")
    mod = _load_exporter()

    # ── 1. STALE FACE: regen-to-temp byte-equality ──────────────────
    want = mod.render()
    with tempfile.NamedTemporaryFile(
            "w", suffix=".ts", delete=False,
            encoding="utf-8") as fh:
        fh.write(want)
        tmp = Path(fh.name)
    try:
        if tmp.read_bytes() != GENERATED.read_bytes():
            _bad("stale_face",
                 "vocab.ts differs from export_vocab.render() — run "
                 "python3 tools/export_vocab.py --write")
        else:
            _ok("stale_face")
    finally:
        tmp.unlink(missing_ok=True)

    # ── 2. MEMBER ROT: py-vs-ts per union ───────────────────────────
    slot_rows = sorted(slot_kinds.VOCAB.slots, key=lambda r: r.slot)
    card_rows = sorted(card_kinds.TABLE.kinds, key=lambda r: r.kind)
    unions: dict[str, list[str]] = {
        "GenreValues": sorted(m.value for m in Genre),
        "KindValues": sorted(m.value for m in _flow.Kind),
        "FileKindValues": sorted(m.value for m in slot_kinds.FileKind),
        "BadgeToneValues": sorted(m.value for m in card_kinds.BadgeTone),
        "KindRunnerValues": sorted(m.value for m in card_kinds.KindRunner),
        "SidebarSectionValues": sorted(ActionCard.SIDEBAR_SECTIONS),
        "QuantValues": sorted(m.value for m in Quant),
        "ClipTypeValues": sorted(m.value for m in ClipType),
        "LatentNodeValues": sorted(m.value for m in LatentNode),
        "KnobKindValues": sorted(m.value for m in KnobKind),
        "StudioSizeValues": sorted(m.value for m in StudioSize),
        "StudioLayoutValues": sorted(m.value for m in StudioLayout),
        "StudioKindValues": sorted(m.value for m in StudioKind),
        "SlotValues": [r.slot for r in slot_rows],
        "CardKindValues": [r.kind for r in card_rows],
    }
    for const, members in unions.items():
        got = _values_block(ts, const)
        if got is None:
            _bad("union_%s" % const, "no `export const %s` block" % const)
        elif got != members:
            _bad("union_%s" % const,
                 "py %s != ts %s" % (members, got))
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
        want_slots = [r.slot for r in slot_rows]
        if got != want_slots:
            _bad("table_SLOTS", "py %s != ts %s" % (want_slots, got))
        else:
            _ok("table_SLOTS")

    m = re.search(
        r"export const SLOT_KINDS: Record<string, FileKind> = \{(.*?)\};",
        ts, re.DOTALL)
    entries = dict(re.findall(r'"((?:[^"\\]|\\.)*)": "((?:[^"\\]|\\.)*)"',
                              m.group(1))) if m else None
    want_kinds = {r.slot: r.kind.value for r in slot_rows}
    if entries != want_kinds:
        _bad("table_SLOT_KINDS",
             "py %s != ts %s" % (want_kinds, entries))
    else:
        _ok("table_SLOT_KINDS")

    m = re.search(
        r"export const UNDECLARED_SLOTS: readonly string\[\] = \[(.*?)\];",
        ts, re.DOTALL)
    got = re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1)) if m else None
    want_und = sorted(slot_kinds.VOCAB.undeclared_slots)
    if got != want_und:
        _bad("table_UNDECLARED_SLOTS", "py %s != ts %s" % (want_und, got))
    else:
        _ok("table_UNDECLARED_SLOTS")

    m = re.search(
        r"export const SIDEBAR_SECTIONS: readonly SidebarSection\[\] = "
        r"\[(.*?)\];", ts, re.DOTALL)
    got = re.findall(r'"((?:[^"\\]|\\.)*)"', m.group(1)) if m else None
    want_sec = sorted(ActionCard.SIDEBAR_SECTIONS)
    if got != want_sec:
        _bad("table_SIDEBAR_SECTIONS", "py %s != ts %s" % (want_sec, got))
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
    py_rows = {}
    for r in card_rows:
        py_rows[r.kind] = (
            "true" if r.runnable else "false",
            "true" if r.executable else "false",
            "true" if r.formSpec else "false",
            "true" if r.compound else "false",
            "true" if r.opensStudio else "false",
            r.badgeTone.value,
            r.runner.value,
            "null" if r.icon is None else '"%s"' % r.icon,
        )
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

    # sorted-order pins (determinism is the contract)
    for label, seq in (("SLOTS", [r.slot for r in slot_rows]),
                       ("CardKind", [r.kind for r in card_rows]),
                       ("SIDEBAR_SECTIONS",
                        sorted(ActionCard.SIDEBAR_SECTIONS))):
        if list(seq) != sorted(seq):
            _bad("order_%s" % label, "py order is not sorted" % label)
        else:
            _ok("order_%s" % label)

    # ── 4. HYGIENE ──────────────────────────────────────────────────
    if re.search(r"^export enum \w+", ts, re.MULTILINE):
        _bad("no_ts_enums", "vocab.ts declares a TS enum — "
                            "erasable syntax only (const-unions)")
    else:
        _ok("no_ts_enums")
    seam = [m.__name__ for m in (
        _ui_map.ViewportKind, _ui_map.BarKind, _ui_map.OverlayKind,
        _ui_map.OverlayDock, _ui_map.ViewportAnchorDock)]
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
    raise SystemExit(main())
