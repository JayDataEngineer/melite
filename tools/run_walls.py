#!/usr/bin/env python3
"""run_walls.py — the per-suite isolation runner (2026-09-07).

WHY THIS EXISTS (the incident): one pytest process over
tests/walls/suites/ cross-pollutes — suites share a live estate
(gateway ports, data/runs/, GPU claims) and a suite dying mid-run
leaves its litter for the NEXT suite to trip over. The polluted
single-process run recorded 146 failures at pre-row-5 HEAD while
every suite passed alone; test_run_lifecycle died mid-run and minted
draft-6a9e1e4c + run dirs that test_test_hygiene then failed on.
Never again: ISOLATION IS THE CONTRACT (one pytest process per
suite, fresh interpreter, no shared fixtures, no shared CWD state).

Usage:
  python3 tools/run_walls.py                     # every suite, isolated
  python3 tools/run_walls.py --suite fit_card     # substring filter
  python3 tools/run_walls.py --mark gpu           # extra pytest -m
  python3 tools/run_walls.py --timeout 570        # per-suite seconds
  python3 tools/run_walls.py --list               # just enumerate

Exit code: 0 iff every suite exited 0. The per-suite ritual this
encodes (pytest <suite> -p no:randomly -q --no-header) is the same
one the estate's verification commands have used since the wall era
began; this tool makes it impossible to "just run the directory".
"""

import argparse
import subprocess
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SUITE_DIR = REPO / "tests" / "walls" / "suites"
PY = sys.executable


def suites(filter_sub: str) -> list[Path]:
    rows = sorted(p for p in SUITE_DIR.glob("test_*.py")
                  if p.stem != "__init__")
    if filter_sub:
        rows = [p for p in rows if filter_sub in p.stem]
    return rows


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--suite", default="",
                    help="substring filter on suite file stem")
    ap.add_argument("--mark", default="",
                    help="extra -m marker expression (e.g. gpu)")
    ap.add_argument("--timeout", type=int, default=570,
                    help="per-suite timeout seconds (default 570)")
    ap.add_argument("--list", action="store_true",
                    help="enumerate matching suites and exit")
    args = ap.parse_args()

    rows = suites(args.suite)
    if not rows:
        print("no suites match %r under %s" % (args.suite, SUITE_DIR))
        return 2
    if args.list:
        for p in rows:
            print(p.stem)
        return 0

    red: list[tuple[str, int]] = []
    t0 = time.time()
    for i, path in enumerate(rows, 1):
        cmd = [PY, "-m", "pytest", str(path),
               "-p", "no:randomly", "-q", "--no-header"]
        if args.mark:
            cmd += ["-m", args.mark]
        t1 = time.time()
        try:
            proc = subprocess.run(
                cmd, cwd=REPO, timeout=args.timeout,
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            rc = proc.returncode
        except subprocess.TimeoutExpired:
            rc = 124
        dt = time.time() - t1
        flag = "ok " if rc == 0 else "RED"
        print("[%2d/%2d] %s %-42s rc=%-3d %5.1fs"
              % (i, len(rows), flag, path.stem, rc, dt),
              flush=True)
        if rc != 0:
            red.append((path.stem, rc))

    print("--- %d suites, %d red, %.0fs total"
          % (len(rows), len(red), time.time() - t0))
    for stem, rc in red:
        print("RED %-42s rc=%d" % (stem, rc))
    return 1 if red else 0


if __name__ == "__main__":
    raise SystemExit(main())
