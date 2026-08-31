#!/usr/bin/env python3
"""USER-SURFACE LAW SUITE (2026-08-31) — the sidebar contract.

Every check here is a failure a real user hit in the DSH media sidebar
on 2026-08-31, each of which shipped while the agent claimed "done":

  S1  catalog non-empty on boot (--catalog-dir law): the gateway booted
      from build/ and scanned ./plugins (nonexistent) → "All models · 0"
      in the card palette, every boot since day one.
  S2  the lane's own model present in the catalog (h3-timeline).
  S3  form-spec answers PIPELINE LANE names (h3-timeline) — was
      404 "model not found" → "Card form unavailable".
  S4  the nine editor registry lanes answer 200 with the exact envelope
      keys the editor parses (uiSlots/panes/entries/…) — a 404 killed
      the editor's plugin-registry sync ("registry untouched") and its
      surfaces rendered empty.
  S5  test-fixture runs (`_`-prefixed yaml) NEVER surface in the runs
      listing — 315 leaked test runs buried the user's real cards and
      clicking their deleted drafts 404'd ("card does not recover").
  S6  every run the listing shows with a draft_id opens: GET draft 200
      and parses — the sidebar click contract, end to end.
  S7  form-spec still 404s for unknown names (no-fallback law intact).

Scratch server, free port, cwd=build (shares nothing with prod except
the read-only catalog/pipeline trees). Cleanup: server + fixtures.
"""
import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, ".."))
BUILD = os.path.join(REPO, "build")

n_pass = [0]
failures = []


def check(name, ok, detail=""):
    if ok:
        n_pass[0] += 1
        print(f"  PASS  {name}")
    else:
        failures.append(name)
        print(f"  FAIL  {name} {detail}")


def get(base, path, timeout=8):
    try:
        r = urllib.request.urlopen(base + path, timeout=timeout)
        return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except OSError as e:
        return -1, str(e).encode()


def main():
    if not os.path.isfile(os.path.join(BUILD, "inference_cli")):
        print("no build/inference_cli; run cmake --build build first")
        return 1
    port = 18631
    base = f"http://127.0.0.1:{port}"
    log = tempfile.NamedTemporaryFile(delete=False, suffix=".log")
    env = dict(os.environ)
    proc = subprocess.Popen(
        ["./inference_cli", "serve", "--port", str(port),
         "--catalog-dir", "..",
         "--plugin-dir", BUILD],
        cwd=BUILD, stdout=log, stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL, start_new_session=True, env=env)

    fixture_run = None
    fixture_pipe = os.path.join(REPO, "pipelines", "_surf_lane")
    try:
        deadline = time.time() + 20
        code = -1
        while time.time() < deadline:
            code, _ = get(base, "/v1/health", timeout=2)
            if code == 200:
                break
            time.sleep(0.4)
        check("scratch gateway boots", code == 200, f"health={code}")

        # ── S1: catalog non-empty (the empty-catalog boot bug) ──────────
        code, body = get(base, "/v1/model-catalog")
        models = []
        if code == 200:
            d = json.loads(body)
            m = d.get("models")
            models = list(m.keys()) if isinstance(m, dict) else [
                x.get("id") for x in (m or [])]
        check("S1 catalog non-empty on build-cwd boot",
              code == 200 and len(models) > 0,
              f"code={code} models={len(models)} "
              "(was: every boot 0 → 'All models · 0')")

        # ── S2: the lane's own model present ────────────────────────────
        check("S2 h3-timeline in catalog",
              "h3-timeline" in models, f"have={models[:6]}")

        # ── S3: form-spec answers PIPELINE LANE names ───────────────────
        code, body = get(base, "/v1/form-spec?model=h3-timeline")
        parses = False
        try:
            d = json.loads(body)
            parses = "defaults" in d or "variants" in d or len(d) > 0
        except Exception:
            pass
        check("S3 form-spec pipeline lane 200+parses",
              code == 200 and parses, f"code={code}")

        # ── S4: the nine editor registry lanes ──────────────────────────
        lanes = {
            "/v1/shell": "entries",
            "/v1/right-panes": "panes",
            "/v1/ui-slots": "uiSlots",
            "/v1/themes": "themes",
            "/v1/tags": "tags",
            "/v1/services": "services",
            "/v1/tools": "tools",
            "/v1/plugins": "plugins",
            "/v1/forms": "forms",
        }
        for path, key in lanes.items():
            code, body = get(base, path)
            ok = code == 200
            if ok:
                try:
                    ok = isinstance(json.loads(body).get(key), list)
                except Exception:
                    ok = False
            check(f"S4 lane {path} 200 + envelope '{key}' is a list",
                  ok, f"code={code}")

        # ── S5: fixture runs never surface (the sidebar burial bug) ─────
        os.makedirs(fixture_pipe, exist_ok=True)
        with open(os.path.join(fixture_pipe, "pipeline.yaml"), "w") as f:
            f.write("name: _surf_lane\nnodes: []\n")
        fixture_run = "run-surf-fixture-test-0"
        rd = os.path.join(BUILD, "output", fixture_run)
        os.makedirs(rd, exist_ok=True)
        with open(os.path.join(rd, "_request.json"), "w") as f:
            json.dump({"yaml": "_surf_lane", "prompt": "fixture"}, f)
        with open(os.path.join(rd, "_pipeline.json"), "w") as f:
            json.dump({"model": "_surf_lane", "prompt": "fixture",
                       "status": "completed", "draft_id": "",
                       "created": int(time.time())}, f)
        code, body = get(base, "/v1/pipelines/runs")
        ids = []
        parsed = None
        if code == 200:
            try:
                parsed = json.loads(body)
                ids = [r.get("run_id") for r in parsed.get("runs", [])]
            except Exception:
                parsed = None
        check("S5 runs listing healthy",
              parsed is not None,
              f"code={code} body={body[:120]!r}")
        check("S5 underscore-fixture run hidden from listing",
              parsed is not None and fixture_run not in ids,
              f"visible={fixture_run in ids}")

        # ── S6: every listed run's draft opens (click contract) ─────────
        code, body = get(base, "/v1/pipelines/runs")
        bad = []
        rows = json.loads(body).get("runs", []) if code == 200 else []
        for r in rows[:20]:
            did = r.get("draft_id") or ""
            if not did:
                continue
            c, b = get(base, "/v1/pipelines/drafts/" + did)
            if c != 200:
                bad.append(f"{did}:{c}")
                continue
            try:
                json.loads(b)
            except Exception:
                bad.append(f"{did}:unparseable")
        check("S6 every listed draft opens 200+parses",
              code == 200 and not bad, f"bad={bad[:3]} rows={len(rows)}")

        # ── S7: unknown form-spec still 404 (no-fallback law) ───────────
        code, _ = get(base, "/v1/form-spec?model=no-such-lane-xyz")
        check("S7 unknown form-spec still 404", code == 404, f"code={code}")

    finally:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except Exception:
            pass
        if fixture_run:
            shutil.rmtree(os.path.join(BUILD, "output", fixture_run),
                          ignore_errors=True)
        shutil.rmtree(fixture_pipe, ignore_errors=True)
        try:
            os.remove(log.name)
        except OSError:
            pass

    total = n_pass[0] + len(failures)
    print(f"\n{total} checks, {len(failures)} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
