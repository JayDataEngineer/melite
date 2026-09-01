#!/usr/bin/env python3
"""MEDIA GATEWAY HEALTH SUITE (2026-08-31) — the sidebar contract.

Prevents the "all_gateways_unreachable" failure that hit the DSH media
sidebar on 2026-08-31 when the inference gateway process died and no
test caught it.

Checks:

  M1  gateway boots and /v1/health returns 200
  M2  /v1/pipelines/runs returns 200 with valid JSON envelope
  M3  gateway survives SIGHUP (graceful reload signal) — the exact
      signal that killed the gateway and caused the outage
  M4  gateway survives SIGUSR1 (log rotation signal)
  M5  /v1/pipelines/runs still 200 after signals (no state corruption)
  M6  gateway process stays alive after all signals (no zombie)
  M7  concurrent requests don't crash the gateway (load during startup)

Scratch server, free port, cwd=build. Cleanup: server + fixtures.
"""
import json
import os
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

    port = 18642
    base = f"http://127.0.0.1:{port}"
    log = tempfile.NamedTemporaryFile(delete=False, suffix=".log")

    # Sandbox: dead ComfyUI endpoint so no live contact
    uscfg = "/tmp/mediagw_endpoint.json"
    with open(uscfg, "w") as f:
        json.dump({"url": "http://127.0.0.1:9"}, f)

    env = dict(os.environ)
    env["COMFYUI_ENDPOINT_CONFIG"] = uscfg
    env["INFERENCE_TEST_SANDBOX"] = "1"

    proc = subprocess.Popen(
        ["./inference_cli", "serve", "--port", str(port),
         "--catalog-dir", "..", "--plugin-dir", BUILD],
        cwd=BUILD, stdout=log, stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL, start_new_session=True, env=env)

    try:
        # ── M1: gateway boots and health returns 200 ──────────────────
        deadline = time.time() + 20
        code = -1
        while time.time() < deadline:
            code, _ = get(base, "/v1/health", timeout=2)
            if code == 200:
                break
            time.sleep(0.4)
        check("M1 gateway boots, /v1/health 200", code == 200,
              f"code={code}")

        # ── M2: /v1/pipelines/runs returns 200 with valid envelope ───
        code, body = get(base, "/v1/pipelines/runs")
        runs = []
        envelope_ok = False
        if code == 200:
            try:
                d = json.loads(body)
                runs = d.get("runs", [])
                envelope_ok = isinstance(runs, list)
            except Exception:
                pass
        check("M2 /v1/pipelines/runs 200 + valid JSON",
              code == 200 and envelope_ok,
              f"code={code} runs={len(runs)} envelope_ok={envelope_ok}")

        # ── M3: gateway survives SIGHUP (the killer) ──────────────────
        # SIGHUP is the signal that killed the gateway in production,
        # causing "all_gateways_unreachable". A production gateway must
        # survive it — either ignore it or gracefully reload.
        os.kill(proc.pid, signal.SIGHUP)
        time.sleep(1.0)
        code_hup, _ = get(base, "/v1/health", timeout=3)
        check("M3 gateway survives SIGHUP (health still 200)",
              code_hup == 200,
              f"code={code_hup} (was: SIGHUP killed gateway → "
              "all_gateways_unreachable)")

        # ── M4: gateway survives SIGUSR1 (log rotation) ───────────────
        os.kill(proc.pid, signal.SIGUSR1)
        time.sleep(0.5)
        code_usr1, _ = get(base, "/v1/health", timeout=3)
        check("M4 gateway survives SIGUSR1 (health still 200)",
              code_usr1 == 200,
              f"code={code_usr1}")

        # ── M5: runs endpoint still valid after signals ───────────────
        code, body = get(base, "/v1/pipelines/runs")
        runs_after = []
        if code == 200:
            try:
                runs_after = json.loads(body).get("runs", [])
            except Exception:
                pass
        check("M5 /v1/pipelines/runs still 200 after signals",
              code == 200 and isinstance(runs_after, list),
              f"code={code} runs={len(runs_after)}")

        # ── M6: gateway process is still alive (no zombie) ────────────
        alive = False
        try:
            os.kill(proc.pid, 0)  # signal 0 = existence check
            alive = True
        except OSError:
            alive = False
        check("M6 gateway process alive after all signals",
              alive,
              f"alive={alive} (zombie = silent all_gateways_unreachable)")

        # ── M7: concurrent requests don't crash ───────────────────────
        # Fire 5 parallel health checks — a crash during concurrent
        # load means the gateway dies silently and the sidebar shows
        # "all_gateways_unreachable" on the next visit.
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
            futs = [ex.submit(get, base, "/v1/health", 3) for _ in range(5)]
            results = [f.result() for f in futs]
        all_ok = all(code == 200 for code, _ in results)
        check("M7 concurrent health requests all 200",
              all_ok,
              f"codes={[c for c, _ in results]}")

    finally:
        # Clean up gateway process
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except Exception:
            pass
        try:
            log.close()
            os.unlink(log.name)
        except OSError:
            pass
        try:
            os.unlink(uscfg)
        except OSError:
            pass

    total = n_pass[0] + len(failures)
    print(f"\n{total} checks, {len(failures)} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
