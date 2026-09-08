#!/usr/bin/env python3
"""OUTPUT CONTRACT wall (operator order, 2026-09-07: "Yes, fill ALL
the gaps, half state, incomplete state = bad").

Every REAL card declares >= 1 typed OutputRow in card_outputs; the
rows are typed instances (the metaclass already refuses str rows at
boot — this wall pins the COMPLETENESS law the metaclass deliberately
does not own: probe cards in tests stay legal); the gateway's
violation helper honors suffix matching and refuses clean.

Wall legs:
  1. every-card-declares    — 22/22 real cards, >= 1 row each
  2. typed rows             — rows are OutputRow instances (frozen,
                              extra=forbid, lowercase dot patterns)
  3. gate behavior          — _output_violation: None on honor, exact
                              refusal naming card+label+patterns on
                              violation; no-rows card = None (probe
                              legality)
"""

from __future__ import annotations

import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.join(REPO, "python"))

from melite_cards import load_card_py  # noqa: E402
from melite_cards.dsl import OutputRow, ActionCard  # noqa: E402
from melite_cards.serialize import scan_engine_cards  # noqa: E402


def _real_cards() -> dict[str, type[ActionCard]]:
    entries = scan_engine_cards(REPO)
    out: dict[str, type[ActionCard]] = {}
    for cid, entry in sorted(entries.items()):
        engine = os.path.dirname(entry[0]).split(os.sep + "engines" + os.sep)[1] \
            .split(os.sep)[0]
        out[cid] = load_card_py(entry[0], engine)
    return out


def gate() -> None:
    """Leg 1: every real card declares >= 1 output row."""
    cards = _real_cards()
    assert len(cards) >= 22, "expected the full card census, got %d" % len(cards)
    bare = [cid for cid, cls in cards.items()
            if not getattr(cls, "card_outputs", ())]
    assert not bare, (
        "cards declaring NO card_outputs (half state = bad; the surface "
        "cannot promise what it delivers): %s" % ", ".join(bare))


def rows_are_typed() -> None:
    """Leg 2: rows are OutputRow instances, patterns lowercase dots."""
    for cid, cls in _real_cards().items():
        for row in cls.card_outputs:
            assert isinstance(row, OutputRow), (
                "%s carries a non-OutputRow row: %r" % (cid, row))
            for pat in row.patterns:
                assert pat.startswith(".") and pat == pat.lower() and " " not in pat, (
                    "%s row %r pattern %r is not a lowercase dot-suffix"
                    % (cid, row.label, pat))
            assert row.label and row.label.strip(), (
                "%s row has an empty label" % cid)


def gate_helper_behavior() -> None:
    """Leg 3: the violation helper honors and refuses exactly."""
    from gateway import _output_violation

    class _Probe(ActionCard):
        id = "probe"

    # probe card (no rows) is legal — None, never a refusal
    assert _output_violation(_Probe, []) is None

    class _PngCard(ActionCard):
        id = "png-probe"
        card_outputs = (OutputRow(patterns=(".png",), label="Image"),)

    assert _output_violation(_PngCard, ["out/image.png"]) is None
    assert _output_violation(_PngCard, ["out/image.PNG"]) is None  # case-insensitive
    v = _output_violation(_PngCard, ["out/clip.mp4"])
    assert v is not None and "png-probe" in v and "Image" in v and ".png" in v, v
    v = _output_violation(_PngCard, [])
    assert v is not None and "delivered none" in v, v
    # artifacts=None / falsy — same refusal, no crash
    assert _output_violation(_PngCard, None) is not None


if __name__ == "__main__":
    gate()
    rows_are_typed()
    gate_helper_behavior()
    print("output-contract wall: OK (22/22 declare, rows typed, gate exact)")
