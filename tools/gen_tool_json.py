#!/usr/bin/env python3
"""gen_tool_json — regenerate the on-disk tool.json snapshots from the
card classes (the melite_cards SSOT promise: tool manifests derive from
the card, one per served family, mods scoped by Model.mods declarations).

tool.json next to a card.py is a DERIVED ARTIFACT:
  * the card class is the SSOT — edit the card, never the snapshot
  * drift (hand edits, stale snapshots) is a parity failure, not a
    silent second truth
  * pipelines/ tool.json files are NOT touched (no card class rides
    there; a derivation source for them does not exist yet)

Usage:
  python3 tools/gen_tool_json.py            # dry run: print drift
  python3 tools/gen_tool_json.py --write    # rewrite every snapshot
"""

import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "py"))

from melite_cards import scan_engine_cards, tool_manifests  # noqa: E402


def main():
    write = "--write" in sys.argv
    cards = scan_engine_cards(REPO)
    drifted, written = [], []
    for cid in sorted(cards):
        path, cls = cards[cid]
        snap = os.path.join(os.path.dirname(path), "tool.json")
        manifests = tool_manifests(cls)
        text = json.dumps(manifests, indent=2, ensure_ascii=False) + "\n"
        old = open(snap, encoding="utf-8").read() if os.path.exists(snap) \
            else None
        if old == text:
            continue
        if write:
            with open(snap, "w", encoding="utf-8") as f:
                f.write(text)
            written.append(snap)
        else:
            drifted.append(snap)
    if write:
        for p in written:
            print("wrote", os.path.relpath(p, REPO))
        print("%d snapshot(s) regenerated from card classes" % len(written))
    elif drifted:
        for p in drifted:
            print("DRIFT", os.path.relpath(p, REPO))
        print("%d snapshot(s) drifted — run with --write" % len(drifted))
        return 1
    else:
        print("all tool.json snapshots match their card classes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
