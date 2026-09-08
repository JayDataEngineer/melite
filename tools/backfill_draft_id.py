#!/usr/bin/env python3
"""backfill_draft_id — the 2026-09-04 audit's run→card wire repair.

The py gateway (python/gateway.py, post C-retirement 2026-09-03) silently
dropped `draft_id` at registration AND at sidecar write. The reader
(python/editor_runs.py:467) still expects to find it on disk. The result:
the media sidebar's "Cards" wand refuses every click with "no draft_id
in its run row" — even when the start body DID carry draft_id (now
fixed at submit()).

This tool repairs existing state in two passes:

  1. SIDECAR BACKFILL — runs whose _flow.json exists but lacks
     draft_id AND whose _request.json carries a valid draft_id:
     stamp the draft_id into _flow.json (atomic tmp+rename, same as
     gateway.sidecar() does for fresh writes).

  2. ZOMBIE SWEEP — runs that died before the terminal sidecar
     write (resilience-law leftovers from kill -9 / gateway restart):
     398 of these on the dev DSH carry ONLY _pipeline.json (C-era
     fossil) and _request.json (py-era start-time). The gateway never
     got the chance to write a final _flow.json, so the run row in
     /v1/flows/runs reports status:unknown / created_at:0 / no
     draft_id. Mark them as failed with a sweep reason, per the
     resilience law (docs/audits/queue-audit.md R1: SIGTERM manufactures
     zero zombies; kill -9 swept idempotently). We do NOT synthesize
     _flow.json for runs with no terminal — the row genuinely had
     no recorded outcome; the sweep just marks the run for the next
     reading as failed.

Validated by click-contract law (python/editor_runs.py:480, 2026-09-02):
rows with no draft_id never advertise one, so a row whose draft was
deleted (or never set) reads as draftless without a 404 — no behavior
regression.

Usage:
  python tools/backfill_draft_id.py [--dry-run] [--root PATH]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT_ROOT = REPO / "data" / "runs" / "output"

# JSON value shapes for run sidecars (_flow.json / _request.json):
# scalar leaves, short string lists, one-level string-keyed objects.
_JsonScalar = str | int | float | bool | None
_JsonValue = (
    _JsonScalar
    | list[str]
    | list[dict[str, _JsonScalar]]
    | dict[str, _JsonScalar]
)
_JsonObject = dict[str, _JsonValue]


def _atomic_write(path: Path, payload: _JsonObject) -> None:
    """tmp+rename atomic, matching gateway.atomic_write() (same shape:
    a `.tmp` suffix that os.replace() atomically promotes)."""
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, sort_keys=True, default=str))
    os.replace(tmp, path)


def _draft_id_ok(draft_id: _JsonValue) -> bool:
    if not isinstance(draft_id, str) or not draft_id or len(draft_id) > 96:
        return False
    return all(c.isascii() and (c.isalnum() or c in "-_") for c in draft_id)


def _read_json(path: Path) -> _JsonObject | None:
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return None


def backfill(root: Path, dry_run: bool) -> tuple[int, int, int]:
    """Returns (backfilled, swept, skipped)."""
    backfilled = swept = skipped = 0
    if not root.is_dir():
        print(f"output root missing: {root}", file=sys.stderr)
        return backfilled, swept, skipped

    for entry in sorted(root.iterdir()):
        if entry.name.startswith("_") or not entry.is_dir():
            continue
        run_dir = entry
        flow_path = run_dir / "_flow.json"
        request_path = run_dir / "_request.json"

        if flow_path.is_file():
            # Pass 1: backfill missing draft_id from _request.json.
            flow = _read_json(flow_path)
            request = _read_json(request_path) if request_path.is_file() else None
            if flow is None:
                # Sidecar exists but unparseable — leave alone; the
                # gateway's own sweep (idempotent) will fix it.
                skipped += 1
                continue
            if flow.get("draft_id"):
                # Already stamped — leave alone.
                skipped += 1
                continue
            rid = request.get("draft_id") if isinstance(request, dict) else None
            if _draft_id_ok(rid):
                if dry_run:
                    print(f"[dry-run] backfill {run_dir.name} draft_id={rid}")
                else:
                    flow["draft_id"] = rid
                    _atomic_write(flow_path, flow)
                backfilled += 1
            else:
                # Sidecar present, no valid draft_id — this is a
                # cardless run (test fixtures, bare API hits).
                # Nothing to fix; the click-contract already handles it.
                skipped += 1
        else:
            # Pass 2: zombie sweep — run dir with no terminal sidecar.
            # Mark as failed via a marker file the next read-time sweep
            # catches, OR create a minimal _flow.json so the listing
            # shows a clean "failed" status. The listing path uses
            # `status = "success"` for legacy dirs with no sidecar at
            # all (editor_runs.py:459) — that's WRONG for a run that
            # never reached terminal: it should read "failed". The
            # minimal sidecar below is the same shape sweep_sidecar()
            # writes (docs/queue/sidecar.md).
            pipeline_path = run_dir / "_pipeline.json"
            request = _read_json(request_path) if request_path.is_file() else None
            rid = request.get("draft_id") if isinstance(request, dict) else None
            valid_draft = _draft_id_ok(rid)
            minimal = {
                "run_id": run_dir.name,
                "status": "failed",
                "error": "no terminal sidecar — swept to failed "
                         "(resilience law: kill -9 / restart leftovers)",
                "stages": [],
                "artifacts": [],
                "created_at": time.time(),
                "test": bool(request.get("test", False)) if isinstance(request, dict) else False,
                # Stamped from _request.json when the start body carried one.
                # Invalid / missing → None; the click-contract strips it.
                "draft_id": rid if valid_draft else None,
                "sweep": "backfill_draft_id: zombie_dir",
            }
            if dry_run:
                print(f"[dry-run] sweep {run_dir.name} "
                      f"(status=failed, draft_id={minimal['draft_id']!r})")
            else:
                _atomic_write(flow_path, minimal)
            swept += 1

    return backfilled, swept, skipped


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dry-run", action="store_true",
                    help="show what would be done without writing")
    ap.add_argument("--root", type=Path, default=OUT_ROOT,
                    help="output root (default: %(default)s)")
    args = ap.parse_args()

    b, s, sk = backfill(args.root, args.dry_run)
    verb = "would backfill" if args.dry_run else "backfilled"
    print(f"{verb} {b} run(s), swept {s} zombie(s), skipped {sk}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())