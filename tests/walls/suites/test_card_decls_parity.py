#!/usr/bin/env python3
"""Card-registry wall — the TS single declaration stands alone.

RE-DERIVED 2026-09-08 (purge S-decls, operator order: "we do not need
parity, we need to migrate"): the py exporter
(tools/export_card_decls.py) + its snapshot
(packages/engines/comfyui/cordis/data/card-decls.json) + the 19
action_cards card.py classes it scanned are DELETED. There is no
second declaration to be par with — the TS card registry
(packages/engines/comfyui/cordis/src/cards/, served through
loadCardDefs) is the only declaration. This wall pins THAT:

- the deleted machinery stays deleted (exporter, snapshot, card.py
  files — a reappearance fails here, never as a silent second truth);
- the registry census: the 19 migrated cards + the TS-native
  clothing-placement card (no card.py ever — the template);
- every registered card carries the projection input whole
  (non-empty skeleton, schema knobs; model cards board ≥1 family;
  admits/spells are lists);
- the retired row's content survives where it matters: every card's
  knob set + admits + spells + skeleton + boarded == the retired
  snapshot's sets (verified at the cut, 19/19 — the tagger skeleton
  verdict lives in docs/design/python-purge-2026-09-08.md). Behavior
  pins ride the compose wall (37 valid graphs), the validate wall
  (102 legs incl. admission refusals naming the TS definition), and
  the chrome/http walls.

Run: python3 tests/walls/suites/test_card_decls_parity.py
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
DUMPER = (REPO / "packages" / "engines" / "comfyui" / "cordis"
          / "src" / "dump-registry.ts")

# The retired snapshot's card census (set-verified 19/19 at the cut):
# 19 migrated cards + clothing-placement (TS-native, never had a row).
EXPECTED_IDS = sorted([
    "anny", "fit", "img-to-mesh", "skin",
    "music", "sfx", "tts", "voice-lock",
    "ideogram4", "image-edit", "image-gen",
    "input-prep", "mask-studio", "tagger",
    "upscale-tools", "motion",
    "h3-timeline", "video-gen",
    "quad-remesh",
    # clothing-placement (TS-only precedent — no card.py, no decls
    # row; boards no family: requiresModel false, pure-tool card).
    "clothing-placement",
])

# Pure-tool cards board no family (no model arm to compose for).
FAMILY_LESS = {"clothing-placement"}

PASS: list[str] = []
FAIL: list[str] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    if ok:
        PASS.append(label)
    else:
        FAIL.append(label + (" — " + detail if detail else ""))


def main() -> int:
    # ── the deleted machinery stays deleted ──
    check("exporter gone",
          not (REPO / "tools" / "export_card_decls.py").is_file())
    check("snapshot gone",
          not (REPO / "packages" / "engines" / "comfyui" / "cordis"
               / "data" / "card-decls.json").is_file())
    stray = sorted(
        str(p.relative_to(REPO))
        for p in (REPO / "packages" / "engines" / "comfyui"
                  / "action_cards").rglob("card.py"))
    check("no card.py anywhere under action_cards", not stray,
          "; ".join(stray[:4]))

    # ── the registry census ──
    p = subprocess.run(
        ["node", "--experimental-strip-types", "--no-warnings",
         str(DUMPER)],
        cwd=str(REPO), capture_output=True, text=True, timeout=180)
    if p.returncode != 0:
        print(f"  FAIL dumper rc={p.returncode}: {(p.stderr or '')[-300:]}")
        print(f"PASS {len(PASS)} / FAIL {len(FAIL) + 1}")
        return 1
    try:
        cards = json.loads(p.stdout.strip().splitlines()[-1])["cards"]
    except ValueError:
        print("  FAIL dumper output unparseable")
        print(f"PASS {len(PASS)} / FAIL {len(FAIL) + 1}")
        return 1
    check("registry census == 20 expected ids",
          sorted(cards) == EXPECTED_IDS,
          "extra=%s missing=%s" % (
              sorted(set(cards) - set(EXPECTED_IDS)),
              sorted(set(EXPECTED_IDS) - set(cards))))
    for cid in sorted(cards):
        row = cards[cid]
        check(f"{cid} skeleton non-empty",
              isinstance(row["skeleton"], str) and row["skeleton"] != "",
              repr(row["skeleton"]))
        check(f"{cid} schema knobs non-empty", len(row["knobs"]) > 0)
        if cid in FAMILY_LESS:
            check(f"{cid} boards no family (pure-tool)",
                  row["boarded"] == [], repr(row["boarded"]))
        else:
            check(f"{cid} boards >=1 family", len(row["boarded"]) > 0,
                  repr(row["boarded"]))
        check(f"{cid} admits/spells are lists",
              isinstance(row["admits"], list)
              and isinstance(row["spells"], list))

    for p_ in PASS:
        print(f"  ok   {p_}")
    for f in FAIL:
        print(f"  FAIL {f}")
    print(f"PASS {len(PASS)} / FAIL {len(FAIL)}")
    return 1 if FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
