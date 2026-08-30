#!/usr/bin/env python3
"""kit.py — THE game-kit driver. One door, every law baked in.

  kit.py list                     classes + lanes (scans game-kit/, reads registry.yaml)
  kit.py validate [lane|all]      gateway spec validation (sync.sh refuses deploy without it)
  kit.py sync                     deploy lanes + skills (validates first, loud failure)
  kit.py run LANE [LANE...]       SERIAL execution — one lane at a time, always
  kit.py status [RUN_ID]          last runs / one run detail

Laws encoded here (do not work around them, fix them here):
  - SERIAL GPU: the GATEWAY enforces it now (gpu_queue.ts, concurrency 1)
    — concurrent submissions wait as status "queued" with a position.
    `run` still submits serially by habit, but concurrency is safe.
  - No /tmp scripts: this file is the only sanctioned launcher.
  - Lane names take their .yaml suffix or not — normalized.
  - Failures print the run error verbatim; exit code carries the verdict.
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent          # game-kit/
REPO = ROOT.parent                               # ray repo root
GATEWAY = "http://localhost:33081"

# Mirror of sync.sh's cp globs — folders whose lanes DEPLOY to the
# gateway. Template-only folders (creatures-forge) deploy on demand and
# are excluded from validation/sync. Keep the two files in lockstep.
DEPLOY_DIRS = ["sfx", "music", "vo", "icons-ui", "ground-textures", "sprites-2d", "props-3d", "races"]


def norm(lane: str) -> str:
    return lane if lane.endswith(".yaml") else f"{lane}.yaml"


def post(path: str, body: dict) -> dict:
    req = urllib.request.Request(
        GATEWAY + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        return json.load(urllib.request.urlopen(req, timeout=30))
    except urllib.error.HTTPError as e:
        return {"_http_error": e.code, "_body": e.read().decode()[:400]}


def get(path: str) -> dict:
    try:
        return json.load(urllib.request.urlopen(GATEWAY + path, timeout=30))
    except urllib.error.HTTPError as e:
        return {"_http_error": e.code, "_body": e.read().decode()[:400]}


def lanes_on_disk() -> list[Path]:
    out: list[Path] = []
    for d in DEPLOY_DIRS:
        folder = ROOT / d
        if folder.is_dir():
            out.extend(sorted(folder.glob("*.yaml")))
    return out


def cmd_list() -> int:
    print("classes (registry.yaml):")
    reg = ROOT / "registry.yaml"
    if reg.exists():
        for line in reg.read_text().splitlines():
            s = line.strip()
            if s.startswith("- class:") or s.startswith("folder:"):
                print("  " + s)
    print("\nlanes:")
    for p in lanes_on_disk():
        rel = p.relative_to(ROOT)
        print(f"  {rel.parent.name}/{rel.name}")
    return 0


def validate_one(lane: str) -> bool:
    d = post("/v1/pipelines/yaml/validate", {"yaml": norm(lane)})
    ok = bool(d.get("ok"))
    if ok:
        n = d.get("total", "?")
        print(f"  ok        {norm(lane):36s} ({n} bricks)")
    else:
        print(f"  INVALID   {norm(lane)}")
        for v in d.get("violations", [])[:4]:
            print(f"      {v.get('message', v)}")
        if "_body" in d:
            print(f"      {d['_body']}")
    return ok


def cmd_validate(lanes: list[str]) -> int:
    targets = [p.name for p in lanes_on_disk()] if not lanes or lanes == ["all"] else [norm(x) for x in lanes]
    results = [validate_one(t) for t in targets]
    print(f"\n{sum(results)}/{len(results)} valid")
    return 0 if all(results) else 1


def cmd_sync() -> int:
    # Deploy first (the gateway validates only DEPLOYED lanes), then
    # validate every deployed kit lane; invalid ones are REMOVED from
    # data/pipelines so the gateway never serves a broken spec.
    subprocess.run(["bash", str(ROOT / "sync.sh")], capture_output=True, text=True)
    print("deployed; validating (invalid lanes get pulled back):")
    bad: list[str] = []
    for p in lanes_on_disk():
        d = post("/v1/pipelines/yaml/validate", {"yaml": p.name})
        if d.get("ok"):
            print(f"  ok        {p.name:36s} ({d.get('total', '?')} bricks)")
        else:
            print(f"  INVALID   {p.name}")
            for v in d.get("violations", [])[:3]:
                print(f"      {v.get('message', v)}")
            bad.append(p.name)
    for name in bad:
        target = REPO / "data" / "pipelines" / name
        if target.exists():
            target.unlink()
            print(f"  pulled back: {name} (fix in game-kit/, re-sync)")
    if bad:
        print(f"REFUSED: {len(bad)} invalid lane(s) not deployed")
        return 1
    print("all kit lanes valid + deployed")
    return 0


def run_status(rid: str) -> dict:
    return get(f"/v1/pipelines/status/{rid}")


def cmd_run(lanes: list[str]) -> int:
    if not lanes:
        print("usage: kit.py run LANE [LANE...]  (serial — one at a time)")
        return 1
    failures = []
    for lane in lanes:
        name = norm(lane)
        print(f"[serial] start {name}", flush=True)
        d = post("/v1/pipelines/start", {"yaml": name})
        rid = d.get("run_id")
        if not rid:
            print(f"  START FAILED: {json.dumps(d)[:300]}")
            failures.append((name, "start-failed"))
            continue
        t0 = time.time()
        while True:
            st = run_status(rid)
            status = st.get("status")
            if status in ("completed", "failed"):
                dt = int(time.time() - t0)
                if status == "completed":
                    print(f"  completed {name} in {dt}s (run {rid})")
                else:
                    print(f"  FAILED    {name} in {dt}s (run {rid})")
                    print(f"  error: {str(st.get('error'))[:400]}")
                    failures.append((name, rid))
                break
            if status == "queued":
                print(f"  queued    {name} (position {st.get('queue_position')}) — GPU busy", flush=True)
            if status == "queued":
                print(f"  queued    {name} (position {st.get('queue_position')}) — GPU busy", flush=True)
            if time.time() - t0 > 3900:
                print(f"  TIMEOUT   {name} (run {rid}) — still {status}")
                failures.append((name, "timeout"))
                break
            time.sleep(20)
    print(f"\n=== wave done: {len(lanes) - len(failures)}/{len(lanes)} completed ===")
    for name, rid in failures:
        print(f"  failed: {name} ({rid})")
    return 1 if failures else 0


def cmd_status(rid: str | None) -> int:
    if rid:
        st = run_status(rid)
        print(json.dumps({k: st.get(k) for k in ("status", "error") if st.get(k) is not None}, indent=2))
        for s in st.get("stages") or []:
            print(f"  {str(s.get('family_id')):24s} {s.get('status'):10s} {(s.get('file') or '')[:70]}")
        return 0
    runs = get("/v1/pipelines/runs?limit=15")
    items = runs if isinstance(runs, list) else runs.get("runs", [])
    for r in items[:15]:
        rid = r.get("run_id") or r.get("id")
        print(f"  {str(rid)[-12:]}  {str(r.get('name'))[:34]:34s} {r.get('status')}")
    return 0


def main() -> int:
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 0
    cmd, rest = args[0], args[1:]
    if cmd == "list":
        return cmd_list()
    if cmd == "validate":
        return cmd_validate(rest)
    if cmd == "sync":
        return cmd_sync()
    if cmd == "run":
        return cmd_run(rest)
    if cmd == "status":
        return cmd_status(rest[0] if rest else None)
    print(__doc__)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
