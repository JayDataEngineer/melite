#!/usr/bin/env python3
"""Card-decl parity wall — the generated decl snapshot vs the py cards.

Ladder P0, declarations stream (.scratch/declarations-ts-map.md §5
step 2): tools/export_card_decls.py emits
plugins/engines/comfyui/cordis/data/card-decls.json (nothing imports it
yet). This wall regenerates to temp and asserts BYTE-EQUALITY with the
committed snapshot (fail on drift — regenerate + inspect, never hand-
edit), and asserts all 18 comfyui card ids are present (the 4
non-comfyui cards the shared scanner also sees ride along, never gate).

Run: python3 tests/walls/suites/test_card_decls_parity.py
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
EXPORTER = REPO / "tools" / "export_card_decls.py"
COMMITTED = REPO / "plugins" / "engines" / "comfyui" / "cordis" / "data" \
    / "card-decls.json"

# The 18 comfyui action_cards (map §0 ground truth — card ids, hyphens).
COMFYUI_IDS = sorted([
    "anny", "fit", "img-to-mesh", "skin",
    "music", "sfx", "tts", "voice-lock",
    "ideogram4", "image-edit", "image-gen",
    "input-prep", "mask-studio", "tagger",
    "upscale-tools", "motion",
    "h3-timeline", "video-gen",
])

PASS: list[str] = []
FAIL: list[str] = []


def main() -> int:
    if not COMMITTED.is_file():
        print("FAIL card-decls.json missing — run tools/export_card_decls.py")
        return 1
    with tempfile.NamedTemporaryFile(
            suffix=".json", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    r = subprocess.run(
        [sys.executable, str(EXPORTER)],
        capture_output=True, text=True, timeout=300,
        cwd=str(REPO))
    if r.returncode != 0:
        FAIL.append(f"exporter exited {r.returncode}: "
                    f"{r.stderr.strip()[:200]}")
    else:
        tmp_path.write_text(r.stdout)
        want = COMMITTED.read_bytes()
        got = tmp_path.read_bytes()
        if got == want:
            PASS.append("byte-equal")
        else:
            FAIL.append(
                "drift: regenerated decls differ from committed "
                f"card-decls.json ({len(got)} vs {len(want)} bytes) — "
                "regenerate + inspect, never hand-edit")
    try:
        import json
        decls = json.loads(COMMITTED.read_text())
    except ValueError as e:
        FAIL.append(f"committed JSON unreadable: {e}")
        decls = {}
    missing = [c for c in COMFYUI_IDS if c not in decls]
    if missing:
        FAIL.append(f"missing comfyui cards: {', '.join(missing)}")
    else:
        PASS.append(f"18-comfyui-present ({len(decls)} cards total)")

    for p in PASS:
        print(f"  ok   {p}")
    for f in FAIL:
        print(f"  FAIL {f}")
    print(f"PASS {len(PASS)} / FAIL {len(FAIL)}")
    return 1 if FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
