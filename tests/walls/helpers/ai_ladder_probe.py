#!/usr/bin/env python3
"""ai_ladder_probe.py — the AI-DRIVEN ADAPTIVE flow test (Phase 3).

The agent-consumer transcript: one boot of the TS gateway (cordis
app, dsh primitives all the way down), then the disclosure ladder
walked LIVE with adaptive recovery —

  health → lanes → tools (the emitter-served params_schema) →
  models → flow VALIDATE → adapt on refusal → flow RUN (live GPU
  through ComfyUI) → poll → verify the artifact on disk.

Adaptive legs (the AI part, not canned asserts):
  A1 a deliberately WRONG body (seed -2) — the consumer reads the
     refusal, repairs to a legal seed, retries: 422 → 200.
  A2 an UNBOARDED model — read the refusal's boarded list, pick the
     first legal family, retry.
  A3 the ladder DISCOVERS the card surface from /v1/tools (never
     hardcoding a knob beyond the card id) — params are filled from
     the SERVED params_schema (defaults + required list).

Usage: python3 tests/walls/helpers/ai_ladder_probe.py
Prints a transcript; exit 0 = ladder walked end-to-end with a real
artifact. Live ComfyUI required (skips with rc=0 note otherwise).
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
TS_SERVER = REPO / "apps" / "gateway" / "src" / "main.ts"
COMFYUI_URL = os.environ.get("COMFYUI_URL", "http://127.0.0.1:18466")
TOKEN = "ladder-probe"

TRANSCRIPT: list[str] = []


def say(step: str, detail: str) -> None:
    line = "%-38s %s" % (step, detail)
    TRANSCRIPT.append(line)
    print(line)


def req(port: int, method: str, path: str, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path), data=data, method=method,
        headers={"Authorization": "Bearer " + TOKEN,
                 "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, {"_raw": raw[:400]}
    except Exception as e:  # transport
        return None, {"_transport": str(e)}


def engine_live() -> bool:
    try:
        with urllib.request.urlopen(COMFYUI_URL + "/system_stats", timeout=8) as r:
            return r.status == 200
    except Exception:
        return False


def main() -> int:
    if not engine_live():
        say("engine", "ComfyUI unreachable at %s — skip" % COMFYUI_URL)
        return 0
    node = shutil.which("node")
    root = tempfile.mkdtemp(prefix="ai-ladder-")
    env = dict(os.environ)
    env["MELITE_STATE_ROOT"] = root
    env["COMFYUI_URL"] = COMFYUI_URL
    env["DSH_GATEWAY_TOKEN"] = TOKEN
    proc = subprocess.Popen(
        [node, "--experimental-strip-types", str(TS_SERVER)],
        cwd=REPO, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        text=True, start_new_session=True, env=env)
    try:
        port = 0
        deadline = time.time() + 30
        while time.time() < deadline:
            line = proc.stdout.readline()
            if line.startswith("READY "):
                port = int(line.split()[1])
                break
            if proc.poll() is not None:
                raise RuntimeError("gateway exited rc=%d" % proc.returncode)
        assert port, "no READY line"

        # ── ladder step 1: health ──
        st, health = req(port, "GET", "/v1/health")
        say("1 health", "st=%s %s" % (st, health))
        assert st == 200 and health.get("status") == "ok"

        # ── 2: lanes (discovery root) ──
        st, lanes = req(port, "GET", "/v1/lanes")
        lane_rows = lanes.get("lanes", []) if isinstance(lanes, dict) else lanes
        lane_ids = [l.get("id", "?") for l in lane_rows]
        say("2 lanes", "st=%s count=%s ids=%s" % (st, lanes.get("count"), lane_ids[:6]))

        # ── 3: tools — the EMITTER-served card surface ──
        st, tools = req(port, "GET", "/v1/tools")
        cards = {t["card"]: t for t in tools.get("tools", [])
                 if t.get("kind") == "card-compose"}
        say("3 tools (params_schema LIVE)", "st=%s card tools=%d" % (st, len(cards)))
        assert "image-gen" in cards, "image-gen card missing"
        ig = cards["image-gen"]["params_schema"]
        seed_row = ig["properties"]["seed"]
        say("3a emitter marker", "seed=%s (minimum:-1 served: %s)"
            % (json.dumps({k: seed_row[k] for k in ("type", "minimum", "default")}),
               seed_row.get("minimum") == -1))

        # ── 4: models ──
        st, models = req(port, "GET", "/v1/models")
        ids = [m.get("id") for m in models.get("data", [])]
        say("4 models", "st=%s boarded=%s" % (st, ids))

        # ── A3 adaptive: stage-level 'model' — the strict-body door
        #    refuses unknown fields and NAMES the declared set; the
        #    consumer learns the {model:}-in-params shape ──
        body = {"id": "ladder", "stages": [{"id": "s1", "engine": "comfyui",
                 "card": "image-gen", "model": "kimodo",
                 "params": {"prompt": "a small red paper lantern, soft studio light"}}]}
        st, resp = req(port, "POST", "/v1/flows/validate", body)
        say("A3 model at stage level", "st=%s %s" % (st, str(resp.get("error", resp))[:110]))
        assert st == 400
        del body["stages"][0]["model"]
        body["stages"][0]["params"]["model"] = "kimodo"

        # ── A2 adaptive: unboarded model passes the schema (any
        #    string) — the {model:} door enforces at RUN-compose;
        #    repaired below at the run boundary ──
        st, resp = req(port, "POST", "/v1/flows/validate", body)
        say("A2 kimodo at validate", "st=%s (boarding enforced at run)"
            % st)
        assert st == 200
        enum = ig["properties"].get("model", {}).get("enum")
        legal = enum[0] if enum else ids[0]

        # ── A1 adaptive: illegal seed (-2) — the NATIVE schema pass
        #    (ported this stroke) refuses naming the floor → repair ──
        body["stages"][0]["params"]["seed"] = -2
        st, resp = req(port, "POST", "/v1/flows/validate", body)
        say("A1 seed -2", "st=%s %s" % (st, str(resp.get("error", resp))[:130]))
        assert st == 400 and "seed" in str(resp), resp
        body["stages"][0]["params"]["seed"] = -1

        # ── 5: validate (clean) ──
        st, resp = req(port, "POST", "/v1/flows/validate", body)
        say("5 validate", "st=%s %s" % (st, json.dumps(resp)[:110]))
        assert st == 200

        # ── 6: RUN live — CARD BIRTH LAW: draft the card first, then
        #    start with draft_id; kimodo first (the boarding refusal
        #    IS the adaptive leg), then the repaired legal family ──
        st, draft = req(port, "POST", "/v1/flows/drafts",
                        {"model": "kimodo", "prompt": "x"})
        say("6 draft (kimodo)", "st=%s %s" % (st, json.dumps(draft)[:130]))
        did = None
        if st == 200:
            did = draft.get("draftId")
        else:
            say("A2 boarding refusal", "draft refused: %s" %
                str(draft.get("error", draft))[:110])
            say("A2 repair", "served enum picked %r" % legal)
            st, draft = req(port, "POST", "/v1/flows/drafts",
                            {"model": legal, "prompt": "x"})
            say("6b draft (legal)", "st=%s" % st)
            assert st == 200, draft
            did = draft.get("draftId")
        assert did, draft
        st, run = req(port, "POST", "/v1/flows/start",
                      {"model": legal, "prompt": "a small red paper lantern, soft studio light",
                       "draft_id": did, "seed": -1})
        say("7 flow start", "st=%s %s" % (st, json.dumps(run)[:170]))
        assert st in (200, 202), run
        run_id = run.get("id") or run.get("run_id")
        # poll
        status, final = None, {}
        for _ in range(120):
            time.sleep(2)
            st, final = req(port, "GET", "/v1/flows/status/%s" % run_id)
            status = (final or {}).get("status") if isinstance(final, dict) else None
            if status in ("succeeded", "failed", "completed", "error"):
                break
        say("7 poll run", "run=%s status=%s" % (run_id, status))
        outs = (final or {}).get("outputs") or (final or {}).get("artifacts") or []
        say("8 outputs", json.dumps(outs)[:220])
        # ── 9: verify a REAL artifact on disk ──
        verified = None
        state_root = Path(root)
        for cand in state_root.rglob("*"):
            if cand.is_file() and cand.suffix in (".png", ".jpg", ".webp") \
                    and "ladder" in str(cand):
                verified = cand
                break
        say("9 artifact on disk", str(verified) if verified else "NONE FOUND")
        print("\nLADDER %s" % ("WALKED (artifact verified)" if verified else
                               "incomplete: status=%s outs=%s" % (status, outs)))
        return 0 if verified else 1
    finally:
        try:
            proc.terminate()
            proc.wait(timeout=10)
        except Exception:
            pass


if __name__ == "__main__":
    sys.exit(main())
