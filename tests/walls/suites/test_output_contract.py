#!/usr/bin/env python3
"""OUTPUT CONTRACT wall (operator order, 2026-09-07: "Yes, fill ALL
the gaps, half state, incomplete state = bad").

Every REAL card declares >= 1 typed OutputRow in card_outputs; the
rows are typed instances (the metaclass already refuses str rows at
boot — this wall pins the COMPLETENESS law the metaclass deliberately
does not own: probe cards in tests stay legal); the TS door's
violation helper honors suffix matching and refuses clean.

Wall legs:
  1. every-card-declares    — 22/22 real cards, >= 1 row each
  2. typed rows             — rows are OutputRow instances (frozen,
                              extra=forbid, lowercase dot patterns)
  3. gate behavior          — outputViolation (TS): None on honor,
                              exact refusal naming card+label+
                              patterns on violation; unknown card
                              id = None (probe legality)

ORACLE DEATH 2026-09-08: see gate_helper_behavior.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).
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
    """Leg 3: the violation helper honors and refuses exactly — via
    the TS door's copy (packages/gateway/src/schema/verbs.ts
    outputViolation, transcribed 1:1 from the py helper that died
    with the oracle).

    ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not
    need parity, we need to migrate, not keep the old machinery"):
    the py helper import died with the py serving oracle. The TS
    helper is table-driven by card id (no synthetic probe cards):
    image-gen promises Generated image (.png); an unknown card id
    is legal (None-class skip, the probe legality). Probed live
    2026-09-08 (node --experimental-strip-types); the refusal
    names card + label + patterns, empty delivery reads
    "delivered none ... artifacts: (none)".

    Date: 2026-09-08. Status: landed (oracle-death re-derivation).
    """
    import json
    import subprocess

    driver = (
        "import('./packages/gateway/src/schema/verbs.ts').then(m => {"
        " const f = m.outputViolation;"
        " const out = ["
        "  f('no-such-card', []),"
        "  f('image-gen', ['out/image.png']),"
        "  f('image-gen', ['out/image.PNG']),"
        "  f('image-gen', ['out/clip.mp4']),"
        "  f('image-gen', []),"
        "  f('image-gen', null)];"
        " console.log(JSON.stringify(out)); })"
    )
    r = subprocess.run(
        ["node", "--experimental-strip-types", "--no-warnings",
         "--input-type=module", "-e", driver],
        capture_output=True, text=True, timeout=120, cwd=REPO)
    assert r.returncode == 0, "TS verbs driver failed:\n%s" % r.stderr[-1000:]
    (unknown, honor, honor_upper, viol_mp4, viol_empty,
     viol_null) = json.loads(r.stdout)

    # unknown/rowless card is legal — None, never a refusal
    assert unknown is None, unknown

    assert honor is None, honor
    assert honor_upper is None, honor_upper  # case-insensitive
    for v in (viol_mp4, viol_empty, viol_null):
        assert (v is not None and "'image-gen'" in v
                and "Generated image" in v and ".png" in v), v
    assert "delivered none" in viol_empty, viol_empty
    # artifacts=None / falsy — same refusal, no crash
    assert viol_null is not None, viol_null


if __name__ == "__main__":
    gate()
    rows_are_typed()
    gate_helper_behavior()
    print("output-contract wall: OK (22/22 declare, rows typed, gate exact)")
