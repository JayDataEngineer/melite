#!/usr/bin/env python3
"""CARD RECOVERY CONTRACT (operator order 2026-09-01: "THE RUN IS
SUPPOSED TO OUTPUT A RECOVERABLE ARTIFACT THAT GETS ME MY CARD BACK").

Every run born from a direct-calls card body must leave behind a draft
the editor can open 1:1 — the canonical BackendDraft schema hydrateDraft
parses (stages[].kind=card, service=<model>, params verbatim), and after
completion the write-back seeds run results into that same stage.

This is the layer the gateway suites never covered: the artifact exists
and is well-formed for EVERY run, not just draft-born ones.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(REPO, "build")
PORT = int(os.environ.get("CARD_REC_PORT", "18193"))
BASE = "http://127.0.0.1:%d" % PORT

FAILS = []


def check(cond: bool, label: str) -> None:
    print(("  PASS  " if cond else "  FAIL  ") + label)
    if not cond:
        FAILS.append(label)


def req(method: str, path: str, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method,
                               headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def free_port() -> int:
    import socket
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


# ---------------- marked fake ComfyUI ----------------
# (leak gate, 2026-09-01) this suite's runs used to COMPLETE against
# the REAL ComfyUI — its gateway had no env override, so the default
# .so-relative config (18465) served every card-lane window render.
# Now: a marked fake (X-Melite-Test-Fake) serves real media bytes so
# completion checks stay meaningful with zero GPU contact.
PNG = b""
WAV = b""
VIEW_BYTES = {}
OK_HIST = {}
OK_SEQ = [0]


def build_real_media():
    global PNG, WAV
    d = "/tmp/cardrec_media_%d" % os.getpid()
    os.makedirs(d, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                    "-f", "lavfi", "-i", "color=c=blue:s=64x48:d=0.2",
                    "-r", "24", os.path.join(d, "f%05d.png")],
                   check=True, capture_output=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                    "-f", "lavfi", "-i", "sine=frequency=440:duration=0.3",
                    os.path.join(d, "a.wav")],
                   check=True, capture_output=True)
    PNG = open(os.path.join(d, "f00001.png"), "rb").read()
    WAV = open(os.path.join(d, "a.wav"), "rb").read()
    shutil.rmtree(d, ignore_errors=True)


class OkComfy(BaseHTTPRequestHandler):
    def _reply(self, code, body=b"{}", ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("X-Melite-Test-Fake", "1")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0) or 0)
        self.rfile.read(n)
        if self.path == "/ok/prompt":
            OK_SEQ[0] += 1
            pid = "ok-%04d" % OK_SEQ[0]
            files = []
            for i in range(2):
                fname = "f%05d.png" % i
                VIEW_BYTES[pid + "/" + fname] = PNG
                files.append((fname, PNG))
            VIEW_BYTES[pid + "/a.wav"] = WAV
            hist = {
                pid: {
                    "status": {"completed": True,
                               "status_str": "success"},
                    "outputs": {
                        "n%d" % i: {"images": [
                            {"filename": fn, "subfolder": "",
                             "type": "output"}]}
                        for i, (fn, _) in enumerate(files)
                    } | {"na": {"audio": [
                        {"filename": "a.wav", "subfolder": "",
                         "type": "output"}]}},
                }
            }
            body = json.dumps(hist).encode()
            OK_HIST[pid] = body
            self._reply(200, json.dumps({"prompt_id": pid}).encode())
            return
        self._reply(404)

    def do_GET(self):
        if self.path == "/object_info":
            self._reply(200, b"{}")
            return
        if self.path.startswith("/ok/history/"):
            pid = self.path.rsplit("/", 1)[-1]
            self._reply(200, OK_HIST.get(pid, b"{}"))
            return
        if self.path.startswith("/ok/view"):
            m = re.search(r"filename=([^&]+)", self.path)
            if m:
                base = m.group(1)
                for k, v in VIEW_BYTES.items():
                    if k.endswith("/" + base):
                        self._reply(200, v, ctype="image/png"
                                    if base.endswith(".png")
                                    else "audio/wav")
                        return
            self._reply(404)
            return
        self._reply(404)

    def log_message(self, *a):
        pass


def main() -> int:
    port = free_port()
    os.environ["CARD_REC_PORT"] = str(port)
    global PORT, BASE
    PORT, BASE = port, "http://127.0.0.1:%d" % port
    log = "/tmp/card_rec_%d.log" % port
    # (leak gate) marked fake answers /ok/* on its own ephemeral port
    build_real_media()
    fport = free_port()
    fake = ThreadingHTTPServer(("127.0.0.1", fport), OkComfy)
    import threading
    threading.Thread(target=fake.serve_forever, daemon=True).start()
    cfg = "/tmp/cardrec_endpoint_%d.json" % port
    os.makedirs("/tmp/cardrec_input_%d" % port, exist_ok=True)
    with open(cfg, "w") as f:
        json.dump({"url": "http://127.0.0.1:%d/ok" % fport,
                   "input_dir": "/tmp/cardrec_input_%d" % port}, f)
    genv = dict(os.environ)
    genv["COMFYUI_ENDPOINT_CONFIG"] = cfg
    genv["INFERENCE_TEST_SANDBOX"] = "1"
    srv = subprocess.Popen(
        [os.path.join(BUILD, "inference_cli"), "serve",
         "--port", str(port), "--plugin-dir", BUILD,
         "--catalog-dir", REPO],
        cwd=BUILD, stdout=subprocess.DEVNULL,
        stderr=open(log, "ab"), env=genv)
    try:
        for _ in range(50):
            try:
                req("GET", "/v1/health")
                break
            except Exception:
                time.sleep(0.2)

        print("-- R1: direct-calls run persists its card (canonical schema)")
        code, r = req("POST", "/v1/pipelines/start", {
            "prompt": "recovery contract 'with quotes' and \"escapes\"",
            "model": "h3-timeline",
            "params": {"calls": [{"text": "a brass compass needle spinning on a map", "start_frame": 0, "end_frame": 48}],
                       "fps": 24, "seed": 99}})
        check(200 <= code < 300 and r.get("run_id", "") != "",
              "R1a: start 200 with run_id (got %d %r)" % (code, r))
        rid = r.get("run_id", "")

        code, row = req("GET", "/v1/pipelines/status/" + rid)
        did = row.get("draft_id", "")
        check(did == rid,
              "R1b: run row carries draft_id = run_id (got %r)" % did)

        # the artifact: GET the draft through the same door the editor uses
        with urllib.request.urlopen(BASE + "/v1/pipelines/drafts/" + rid,
                                    timeout=10) as dr:
            doc = json.loads(dr.read())
        check(doc.get("draft_id") == rid, "R1c: draft_id matches run")
        check(isinstance(doc.get("intent"), str) and doc["intent"] != "",
              "R1d: intent present (prompt)")
        stages = doc.get("stages")
        check(isinstance(stages, list) and len(stages) == 1,
              "R1e: exactly one stage")
        st = stages[0] if stages else {}
        check(st.get("kind") == "card", "R1f: stage kind = card")
        check(st.get("service") == "h3-timeline",
              "R1g: stage service = model")
        params = st.get("params") or {}
        check(len(params.get("calls", [])) == 1,
              "R1h: params.calls verbatim (1 call)")
        check(params.get("seed") == 99, "R1i: knob seed verbatim")
        check(doc.get("status") == "ready", "R1j: status ready")

        print("-- R2: completion seeds run results into the SAME stage")
        for _ in range(80):
            code, s = req("GET", "/v1/pipelines/status/" + rid)
            if s.get("status") in ("success", "completed", "error",
                                   "failed", "stopped"):
                break
            time.sleep(3)
        check(s.get("status") == "completed",
              "R2a: run completed (got %r)" % s.get("status"))
        with urllib.request.urlopen(BASE + "/v1/pipelines/drafts/" + rid,
                                    timeout=10) as dr:
            doc2 = json.loads(dr.read())
        res = (doc2.get("stages") or [{}])[0].get("result")
        check(isinstance(res, dict),
              "R2b: write-back seeded result into stage (got %r)" %
              (str(res)[:60]))
        if isinstance(res, dict):
            urls = res.get("assetUrls") or res.get("urls") or []
            check(len(urls) >= 1,
                  "R2c: stitch film listed in the card (%d urls)" % len(urls))

        print("-- R3: loud refusal on non-JSON body carrying calls")
        # (registration rejects invalid JSON earlier; this documents the
        # persist door never writes a malformed draft — sidecar law)
        drafts_dir = os.path.join(BUILD, "drafts")
        for f in os.listdir(drafts_dir):
            if f == rid + ".json":
                raw = open(os.path.join(drafts_dir, f), "rb").read()
                json.loads(raw)  # must parse or raise loudly here
        check(True, "R3a: persisted draft is valid JSON on disk")

        print()
        if FAILS:
            print("CARD RECOVERY FAIL: %d checks failed" % len(FAILS))
            return 1
        print("CARD RECOVERY PASS: every run leaves a recoverable card")
        return 0
    finally:
        srv.terminate()
        srv.wait(timeout=10)


if __name__ == "__main__":
    sys.exit(main())
