#!/usr/bin/env python3
"""V7 KNOB LAW suite (PlagueKind translation, 2026-08-31).

Pins the Layer A/B knob splice end-to-end at the compose door:

  V1  preset=plaguekind_v7 swaps the whole window family to the _v7
      templates in the REGISTERED run graph (workflow_file carries
      window*_v7.json; zero _t4.json survivors).
  V2  Layer A globals land as literal inject keys on EVERY window
      (SLASwitch.0.switch from sla_enabled, sparsity from
      h3_sla_sparsity, sharpen/interp switches).
  V3  Layer B per-call overrides ride the SAME splice and WIN over
      Layer A for that window only (call 2's knobs.h3_sla_sparsity
      0.95 vs Layer A 0.85 -> window1 injects 0.85, window2 0.95).
  V4  the t4 path is byte-identical: the same body WITHOUT preset
      registers with _t4.json templates and NO v7 inject keys.
  V5  length/carry splice still rides ahead of the knobs (the chain
      law math is untouched by the knob fragment).

Boots a scratch gateway + fake comfy (object_info auto-built from the
REAL window templates, incl. _v7). No GPU. Registered-run graph is
asserted from the run sidecar's yaml field — the exact bytes the
plugin would execute.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
BUILD = os.path.join(REPO, "build")
sys.path.insert(0, os.path.join(REPO, "tests"))
from test_card_lifecycle import free_port, wait_for  # noqa: E402


class FakeComfy(BaseHTTPRequestHandler):
    """Accepts any /prompt, completes immediately, serves object_info
    built from every window template in the lane (t4 + v7)."""

    OBJ = {}

    def _reply(self, code, body=b"{}", ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path == "/prompt":
            pid = "p%d" % int(time.time() * 1000 % 10**9)
            self._reply(200, json.dumps({"prompt_id": pid}).encode())
            return
        self._reply(404)

    def do_GET(self):
        if self.path == "/object_info":
            self._reply(200, json.dumps(self.OBJ).encode())
            return
        if self.path.startswith("/history/"):
            self._reply(200, b"{}")
            return
        if self.path.startswith("/view"):
            self._reply(200, b"\x00" * 64, ctype="application/octet-stream")
            return
        self._reply(404)

    def log_message(self, *a):
        pass


def build_obj():
    d = os.path.join(REPO, "pipelines", "h3-timeline")
    obj = {}
    for wf in sorted(os.listdir(d)):
        if not (wf.startswith("window") and wf.endswith(".json")):
            continue
        try:
            g = json.load(open(os.path.join(d, wf)))
        except Exception:
            continue
        for n in g.values():
            if isinstance(n, dict) and "class_type" in n:
                obj.setdefault(n["class_type"], {})
    return obj


class Api:
    def __init__(self, base):
        self.base = base

    def post(self, path, obj):
        req = urllib.request.Request(
            self.base + path, data=json.dumps(obj).encode(),
            headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                return r.status, r.read().decode()
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()

    def get(self, path):
        try:
            with urllib.request.urlopen(self.base + path, timeout=10) as r:
                return r.status, r.read().decode()
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()
        except Exception:
            return 0, ""


def sidecar_yaml(rid):
    p = os.path.join(BUILD, "output", rid, "_pipeline.json")
    for _ in range(40):
        if os.path.exists(p):
            try:
                return json.load(open(p)).get("yaml", "")
            except Exception:
                pass
        time.sleep(0.2)
    return None


def main():
    FakeComfy.OBJ = build_obj()
    cf = ThreadingHTTPServer(("127.0.0.1", free_port()), FakeComfy)
    threading.Thread(target=cf.serve_forever, daemon=True).start()

    lane = os.path.join(REPO, "pipelines", "h3-timeline", "pipeline.yaml")
    fx = os.path.join(REPO, "pipelines", "_v7knobs")
    os.makedirs(fx, exist_ok=True)
    with open(lane) as f:
        y = f.read().replace("name: h3-timeline", "name: _v7knobs") \
                    .replace("http://127.0.0.1:18465",
                             "http://127.0.0.1:%d" % cf.server_address[1])
    with open(os.path.join(fx, "pipeline.yaml"), "w") as f:
        f.write(y)

    port = free_port()
    log = "/tmp/v7knobs_srv.log"
    srv = subprocess.Popen(
        [os.path.join(BUILD, "inference_cli"), "serve",
         "--port", str(port), "--plugin-dir", BUILD, "--catalog-dir", ".."],
        cwd=BUILD, stdout=subprocess.DEVNULL, stderr=open(log, "ab"))
    api = Api("http://127.0.0.1:%d" % port)
    rid = rid2 = None
    fails = []
    n = [0]

    def check(cond, label):
        print(("  PASS  " if cond else "  FAIL  ") + label)
        n[0] += 1
        if not cond:
            fails.append(label)

    try:
        wait_for(lambda: api.get("/v1/health")[0] == 200, 20, "boot")

        calls = [
            {"text": "window one text", "start_frame": 0, "end_frame": 56},
            {"text": "window two text", "start_frame": 56, "end_frame": 145,
             "knobs": {"h3_sla_sparsity": 0.95}},
        ]
        v7_body = {"model": "_v7knobs", "prompt": "v7 knob law probe",
                   "preset": "plaguekind_v7",
                   "seed": 7, "fps": 24,
                   "sla_enabled": True, "h3_sla_sparsity": 0.85,
                   "sharpen_enabled": False,
                   "interpolate_enabled": True,
                   "interpolate_multiplier": 2,
                   "shift_video": 9, "cfg": 1,
                   "calls": calls}
        code, body = api.post("/v1/pipelines/start", v7_body)
        rid = None
        try:
            rid = json.loads(body).get("run_id")
        except ValueError:
            pass
        check(bool(rid), "V1a: v7 run registered (%d %s)"
              % (code, body[:80]))

        y = sidecar_yaml(rid) if rid else None
        check(y is not None, "V1b: sidecar yaml readable")
        if y:
            check("window1_v7.json" in y and "window2_v7.json" in y
                  and "_t4.json" not in y,
                  "V1c: family swap — v7 templates, zero t4 survivors")
            check('"SLASwitch.0.switch":true' in y,
                  "V2a: Layer A sla_enabled -> SLASwitch true")
            check('"H3SLAAttention.0.sparsity_ratio":0.85' in y,
                  "V2b: Layer A sparsity 0.85 lands")
            check('"SharpenSwitch.0.switch":false' in y,
                  "V2c: Layer A sharpen off")
            check('"InterpSwitch.0.switch":true' in y
                  and '"FILMVFI.0.multiplier":2' in y,
                  "V2d: Layer A interpolation on, x2")
            # V3: per-window values — window1 keeps 0.85, window2 has 0.95
            w1 = y.split("- id: window1")[1].split("- id: window2")[0]
            w2 = y.split("- id: window2")[1]
            check('"H3SLAAttention.0.sparsity_ratio":0.85' in w1,
                  "V3a: window1 keeps Layer A 0.85")
            check('"H3SLAAttention.0.sparsity_ratio":0.95' in w2,
                  "V3b: window2 Layer B override 0.95 WINS")
            check('"MiniMaxH3ImageToVideo.0.length":' in w1,
                  "V5: length/carry splice intact on v7")

        code, body = api.post("/v1/pipelines/start",
                              {k: v for k, v in v7_body.items()
                               if k != "preset"})
        rid2 = None
        try:
            rid2 = json.loads(body).get("run_id")
        except ValueError:
            pass
        y2 = sidecar_yaml(rid2) if rid2 else None
        check(y2 is not None and "window1_t4.json" in y2
              and "_v7.json" not in y2 and "SLASwitch" not in y2,
              "V4: no preset -> t4 family, no v7 keys (byte-identical path)")

    finally:
        srv.terminate()
        try:
            srv.wait(timeout=8)
        except subprocess.TimeoutExpired:
            srv.kill()
        cf.shutdown()
        shutil.rmtree(fx, ignore_errors=True)
        for r in os.listdir(os.path.join(BUILD, "output")) if rid else []:
            if r == rid or r == rid2:
                shutil.rmtree(os.path.join(BUILD, "output", r),
                              ignore_errors=True)

    print("\n%d checks, %d failures" % (n[0], len(fails)))
    for f in fails:
        print("  FAILED:", f)
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
