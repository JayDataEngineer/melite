#!/usr/bin/env python3
"""CHAOS suite for the GPU FIFO ticket queue (src/server.cpp) — the
adversarial layer ON TOP of tests/test_queue.py.

test_queue.py pins the linear invariants (FIFO, stop-while-queued, slot
recycle, SSE depth, M4 order, stop door, F26 quoting, F13/F7). This file
attacks the SAME invariants from hostile angles the linear suite cannot
reach:

  C1  concurrent submission storm    - 8 parallel POSTs: serial law holds,
                                       zero prompt cross-wiring (F2)
  C2  stop storm                    - 8 simultaneous stops on queued runs,
                                       each exactly-once, none execute
  C3  stop-vs-completion race       - 6 staggered stops at the moment the
                                       executor finishes: never "error",
                                       ticket always released
  C4  timeout interrupts (F4)       - bounded timeout, /interrupt POSTed,
                                       queue continues after
  C5  malformed input barrage       - garbage bodies never kill the gateway
  C6  F26 deep error quoting        - quotes, newlines, unicode, backslash,
                                       4KB junk: status+sidecar stay parseable
  C7  kill -9 sidecar atomicity (F1)- 5 staggered hard kills mid-run: every
                                       sidecar on disk still parses
  C8  SIGINT path (F13)             - clean exit, runs marked stopped
  C9  churn drain, no starvation    - interleaved holds/stops/submits, then
                                       strict FIFO still holds
  C10 boot sweep matrix (F7)        - 3 stale shapes + failed-untouched +
                                       malformed: exact ledger accounting

Usage: test_queue_chaos.py --repo-dir REPO --build-dir BUILD
"""

import argparse
import http.client
import json
import os
import random
import shutil
import signal as _sig
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HOLD_DELAY = 1.2        # default /prompt hold before the 500
RACE_WORK = 1.6         # /race executor "render" duration
PROMPTS = []            # (path, body) in arrival order
PROMPTS_LOCK = threading.Lock()
INTERRUPTS = []         # (path, time)
RACE_SUBMIT = {}        # prompt_id -> completion timestamp
RACE_LOCK = threading.Lock()
ERR2_BODY = None        # built in main(): the hostile error document

# Fake /object_info manifest: filled in main() from the real
# krea-txt2img workflow.json the fixtures reference (the gateway
# pre-validates class_types against it before registering a run).
OBJECT_INFO = {}


def build_object_info(repo):
    global OBJECT_INFO
    wf = os.path.join(repo, "pipelines", "krea-txt2img", "workflow.json")
    try:
        graph = json.load(open(wf))
        OBJECT_INFO = {n.get("class_type", "?"): {} for n in graph.values()
                       if isinstance(n, dict)}
    except Exception as e:            # pragma: no cover - fixture rot
        print("FATAL cannot build fake /object_info from %s: %s" % (wf, e))
        sys.exit(2)
    # C16: the h3-timeline window templates' classes must exist on the
    # fake backend too, or the pre-registration node guard 400s the very
    # start we are trying to crash-test.
    tl_dir = os.path.join(repo, "pipelines", "h3-timeline")
    for wf_name in sorted(os.listdir(tl_dir)):
        if not (wf_name.startswith("window") and wf_name.endswith(".json")):
            continue
        try:
            g = json.load(open(os.path.join(tl_dir, wf_name)))
        except Exception:
            continue
        for n in g.values():
            if isinstance(n, dict) and "class_type" in n:
                OBJECT_INFO.setdefault(n["class_type"], {})


class FakeComfy(BaseHTTPRequestHandler):
    def _reply(self, code, body=b"{}"):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _record(self, path, body):
        with PROMPTS_LOCK:
            PROMPTS.append((path, body))

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0) or 0)
        body = self.rfile.read(n).decode("utf-8", "replace")
        if self.path == "/prompt":
            self._record(self.path, body)
            time.sleep(HOLD_DELAY)
            self._reply(500)
        elif self.path == "/err/prompt":
            self._reply(200, b'{"error":"missing \"context_steps\" '
                             b'for H3 node (quoted text)"}')
        elif self.path == "/err2/prompt":
            self._record(self.path, body)
            self._reply(200, ERR2_BODY)
        elif self.path == "/hold/prompt":
            self._record(self.path, body)
            self._reply(200, b'{"prompt_id":"hold-fake-0001"}')
        elif self.path == "/race/prompt":
            self._record(self.path, body)
            with RACE_LOCK:
                pid = "race-%d" % (len(RACE_SUBMIT) + 1)
                RACE_SUBMIT[pid] = time.time() + RACE_WORK
            self._reply(200, json.dumps({"prompt_id": pid}).encode())
        elif self.path == "/slow/prompt":
            self._record(self.path, body)
            self._reply(200, b'{"prompt_id":"slow-fake-0001"}')
        elif self.path.endswith("/interrupt"):
            with PROMPTS_LOCK:
                INTERRUPTS.append((self.path, time.time()))
            self._reply(200)
        else:
            self._reply(200)

    def do_GET(self):
        if self.path == "/object_info":
            # node-manifest fidelity: the gateway pre-validates every
            # workflow class_type against /object_info before a run
            # registers — the fake must speak it too (C14).
            self._reply(200, json.dumps(OBJECT_INFO).encode())
            return
        if self.path.startswith("/race/history/"):
            pid = self.path.rsplit("/", 1)[-1]
            with RACE_LOCK:
                done_at = RACE_SUBMIT.get(pid)
            if done_at is not None and time.time() >= done_at:
                self._reply(200, json.dumps(
                    {"status": "completed", "prompt_id": pid}).encode())
            else:
                self._reply(200, b"{}")
            return
        # /hold/history, /slow/history: never completes
        if "/history" in self.path:
            self._reply(200, b"{}")
            return
        self._reply(404)

    def log_message(self, *a):
        pass


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


# ============ C17: the containerized comfy fake ============================
# The executor runs in a CONTAINER with an overlay view of the repo:
# node writes to absolute repo paths never reach the host (proven live
# 2026-08-30 — tails existed only inside /proc/<comfy>/root). The lawful
# route is ComfyUI's own artifact doors: save node UI outputs -> /view
# fetch into the run dir -> /upload into the input dir -> chain reads.
# TLComfy fakes BOTH doors and asserts the seam contract.
TL_TAIL_BYTES = b"PK-fake-tail-0123456789abcdef"
TL_META_BYTES = (b'{"carried_video_slots":6,"carried_audio_frames":34,'
                 b'"carried_pixel_frames":18,"total_video_slots":26}')
UPLOADS = {}          # (subfolder, filename) -> bytes
UPLOAD_ORDER = []     # [(subfolder, filename)] in arrival order
UPLOAD_VIOLATIONS = []  # seam prompts whose tail was never uploaded
TL_PROMPTS = {}       # prompt_id -> {"tail": (subfolder, filename) or None}


class TLComfy(FakeComfy):
    def _tl_graph(self, body):
        try:
            prompt = json.loads(body)
            return prompt.get("prompt", prompt)
        except ValueError:
            return {}

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(n)
        body = raw.decode("utf-8", "replace")
        if self.path == "/upload/image":
            m = re.search(rb'filename="([^"]+)"', raw)
            sub = re.search(rb'name="subfolder"\r\n\r\n([^\r]+)', raw)
            fname = m.group(1).decode() if m else "?"
            subfolder = sub.group(1).decode() if sub else ""
            payload = raw.split(b"\r\n\r\n", 1)[1]
            payload = payload.rsplit(b"\r\n--", 1)[0]
            UPLOADS[(subfolder, fname)] = payload
            UPLOAD_ORDER.append((subfolder, fname))
            self._reply(200, json.dumps({"name": fname,
                                         "subfolder": subfolder}).encode())
            return
        if self.path == "/prompt":
            self._record(self.path, body)
            g = self._tl_graph(body)
            pid = "tl-%04d" % (len(TL_PROMPTS) + 1)
            tail = None
            chain = None
            for node in g.values():
                if not isinstance(node, dict):
                    continue
                ct = node.get("class_type", "")
                if ct == "RayH3SaveLatentTail":
                    p = node.get("inputs", {}).get("path", "")
                    tail = (p.rsplit("/", 1)[0], p.rsplit("/", 1)[-1])
                elif ct == "RayH3ChainLatentAV":
                    chain = node.get("inputs", {}).get("tail_path", "")
            if chain:
                want = (chain.rsplit("/", 1)[0], chain.rsplit("/", 1)[-1])
                if UPLOADS.get(want) is None:
                    UPLOAD_VIOLATIONS.append((pid, chain))
            TL_PROMPTS[pid] = {"tail": tail}
            self._reply(200, json.dumps({"prompt_id": pid}).encode())
            return
        if self.path.endswith("/interrupt"):
            self._reply(200)
            return
        self._reply(200)

    def do_GET(self):
        if self.path == "/object_info":
            self._reply(200, json.dumps(OBJECT_INFO).encode())
            return
        if "/history/" in self.path:
            pid = self.path.rsplit("/", 1)[-1]
            info = TL_PROMPTS.get(pid)
            if info is None:
                self._reply(200, b"{}")
                return
            outputs = {}
            if info.get("tail"):
                sub, fname = info["tail"]
                outputs["RayH3SaveLatentTail.0"] = {
                    "images": [
                        {"filename": fname, "subfolder": sub,
                         "type": "output"},
                        {"filename": fname + ".meta.json", "subfolder": sub,
                         "type": "output"},
                    ]}
            self._reply(200, json.dumps({
                pid: {"prompt": [0, pid, {}], "outputs": outputs,
                      "status": {"status_str": "success",
                                 "completed": True,
                                 "messages": [["execution_success",
                                               {"prompt_id": pid}]]}}
            }).encode())
            return
        if self.path.startswith("/view"):
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            fname = (qs.get("filename") or [""])[0]
            sub = (qs.get("subfolder") or [""])[0]
            if fname.endswith(".meta.json"):
                self._reply(200, TL_META_BYTES)
            elif fname:
                self._reply(200, TL_TAIL_BYTES)
            else:
                self._reply(404)
            return
        self._reply(404)

    def log_message(self, *a):
        pass


class Api:
    def __init__(self, base):
        self.base = base

    def _req(self, method, path, body=None, raw=None):
        data = raw if raw is not None else (
            json.dumps(body).encode() if body is not None else None)
        req = urllib.request.Request(self.base + path, data=data,
                                     method=method)
        if data:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                return r.status, r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode("utf-8", "replace")
        except Exception as e:
            return -1, str(e)

    def queue(self):
        _, body = self._req("GET", "/v1/queue")
        return json.loads(body)

    def submit(self, prompt):
        _, body = self._req("POST", "/v1/pipelines/start",
                            {"yaml": "_queue_test", "prompt": prompt})
        return json.loads(body)["run_id"]

    def submit_yaml(self, yaml_name, prompt, raw_body=None):
        code, body = self._req("POST", "/v1/pipelines/start", raw_body or
                               {"yaml": yaml_name, "prompt": prompt})
        return code, body

    def status(self, rid):
        _, body = self._req("GET", "/v1/pipelines/status/" + rid)
        try:
            return json.loads(body)
        except ValueError:
            # preserve the evidence: raw bytes of an unparseable response
            print("     !! status(%s) NON-JSON body: %r" % (rid, body[:300]))
            raise

    def stop(self, rid):
        return self._req("POST", "/v1/pipelines/stop/" + rid)


def wait_for(pred, timeout, what):
    deadline = time.time() + timeout
    while time.time() < deadline:
        v = pred()
        if v:
            return v
        time.sleep(0.15)
    raise AssertionError("timeout waiting for " + what)


def terminal(st):
    return st.get("status") in ("success", "completed", "error", "failed",
                                "stopped")


def tstatus(api, rid):
    s = api.status(rid)
    return s if terminal(s) else None


def _healthy(api):
    try:
        api.queue()
        return True
    except Exception:
        return False


def parse_all_sidecars(build):
    """Every _pipeline.json under output/ must parse (F1 atomicity)."""
    out = os.path.join(build, "output")
    bad = []
    n = 0
    if not os.path.isdir(out):
        return n, bad
    for d in os.listdir(out):
        p = os.path.join(out, d, "_pipeline.json")
        if not os.path.isfile(p):
            continue
        n += 1
        try:
            with open(p) as f:
                json.load(f)
        except Exception as e:
            bad.append((d, str(e)))
    return n, bad


def swept_count(build, rid):
    try:
        with open(os.path.join(build, "output", "_ledger.jsonl")) as f:
            return sum(1 for line in f
                       if '"run.swept"' in line and rid in line)
    except FileNotFoundError:
        return 0


def main():
    global HOLD_DELAY
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-dir", required=True)
    ap.add_argument("--build-dir", required=True)
    args = ap.parse_args()
    repo = os.path.abspath(args.repo_dir)
    build = os.path.abspath(args.build_dir)
    binpath = os.path.join(build, "inference_cli")
    if not os.path.exists(binpath):
        print("SKIP: inference_cli not built")
        return 0
    build_object_info(repo)

    global ERR2_BODY
    ERR2_BODY = json.dumps({"error": (
        'boom "quoted" \"escaped\" newline:\nline2 é中文 '
        "backslash-quote \" and " + "j" * 4096)}).encode()

    comfy = ThreadingHTTPServer(("127.0.0.1", 0), FakeComfy)
    comfy_port = comfy.server_address[1]
    threading.Thread(target=comfy.serve_forever, daemon=True).start()

    def fixture_yaml(name, url_path, timeout_s=30):
        d = os.path.join(repo, "pipelines", name)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "pipeline.yaml"), "w") as f:
            f.write(
                "name: %s\n" % name +
                "description: \"queue chaos fixture %s\"\n" % name +
                "nodes:\n"
                "  - id: generate\n"
                "    type: comfyui\n"
                "    params: {\"server_url\":\"http://127.0.0.1:%d%s\","
                "\"workflow_file\":\"../pipelines/krea-txt2img/"
                "workflow.json\",\"out_dir\":\"./output\","
                "\"timeout_s\":%d,\"inject\":{"
                "\"CLIPTextEncode.0.text\":\"$prompt\"}}\n"
                % (comfy_port, url_path, timeout_s))

    fixture_yaml("_queue_test", "")
    fixture_yaml("_chaos_hold", "/hold")
    fixture_yaml("_chaos_race", "/race")
    fixture_yaml("_chaos_slow", "/slow", timeout_s=3)
    fixture_yaml("_chaos_err2", "/err2")

    # C14 fixture: a workflow naming a class the backend does NOT have
    # (the 2026-08-30 extermination incident shape — the run must die
    # at the DOOR with 4xx, never register a zombie slot)
    dead_wf = os.path.join(repo, "pipelines", "_chaos_deadnode",
                           "dead_workflow.json")
    os.makedirs(os.path.dirname(dead_wf), exist_ok=True)
    with open(dead_wf, "w") as f:
        json.dump({
            "n1": {"class_type": "CheckpointLoaderSimple",
                   "inputs": {"ckpt_name": "x.safetensors"}},
            "n2": {"class_type": "MiniMaxH3SaveLatent",
                   "inputs": {"latent": ["n1", 0]}},
        }, f)
    with open(os.path.join(repo, "pipelines", "_chaos_deadnode",
                           "pipeline.yaml"), "w") as f:
        f.write(
            "name: _chaos_deadnode\n"
            "description: \"queue chaos fixture - dead node class\"\n"
            "nodes:\n"
            "  - id: generate\n"
            "    type: comfyui\n"
            "    params: {\"server_url\":\"http://127.0.0.1:%d\","
            "\"workflow_file\":\"../pipelines/_chaos_deadnode/"
            "dead_workflow.json\",\"out_dir\":\"./output\","
            "\"timeout_s\":30}\n" % comfy_port)

    # C16 fixture: the REAL h3-timeline lane shape (window templates,
    # $tailpath inject vars, trim_heads stitch) against the FAKE comfy —
    # reproduces the 2026-08-30 19:52/20:12 registration crash class
    # (fortify abort after "[draft] run ... linked to card", before the
    # first window ever executes) with zero GPU exposure.
    tl_yaml = open(os.path.join(repo, "pipelines", "h3-timeline",
                                "pipeline.yaml")).read()
    tl_yaml = tl_yaml.replace("name: h3-timeline", "name: _chaos_tl")
    tl_yaml = tl_yaml.replace("http://127.0.0.1:18465",
                              "http://127.0.0.1:%d" % comfy_port)
    os.makedirs(os.path.join(repo, "pipelines", "_chaos_tl"), exist_ok=True)
    with open(os.path.join(repo, "pipelines", "_chaos_tl",
                           "pipeline.yaml"), "w") as f:
        f.write(tl_yaml)

    port = free_port()
    srv_log = "/tmp/chaos_srv_%d.log" % port
    srv = subprocess.Popen(
        [binpath, "serve", "--port", str(port), "--plugin-dir", build],
        cwd=build, stdout=subprocess.DEVNULL,
        stderr=open(srv_log, "ab"))
    api = Api("http://127.0.0.1:%d" % port)
    run_ids = []
    made_fixtures = ["_queue_test", "_chaos_hold", "_chaos_race",
                     "_chaos_slow", "_chaos_err2", "_chaos_deadnode",
                     "_chaos_tl"]
    failures = []
    n_pass = [0]

    def check(cond, label):
        print(("  PASS  " if cond else "  FAIL  ") + label)
        if cond:
            n_pass[0] += 1
        else:
            failures.append(label)

    def boot():
        return subprocess.Popen(
            [binpath, "serve", "--port", str(port), "--plugin-dir", build],
            cwd=build, stdout=subprocess.DEVNULL,
            stderr=open(srv_log, "ab"))

    def kill_hard(p):
        p.kill()
        p.wait(timeout=10)

    def shutdown(p):
        p.terminate()
        try:
            p.wait(timeout=8)
        except subprocess.TimeoutExpired:
            p.kill()
            p.wait(timeout=10)

    try:
        wait_for(lambda: _healthy(api), 15, "server boot")
        print("server up on :%d, fake comfy on :%d" % (port, comfy_port))

        # ---- continuous invariant monitor: every HTTP 200 from
        # /v1/pipelines/status/* and /v1/queue must parse as JSON for the
        # ENTIRE suite (pins the F26 class under every race below).
        poll_violations = []
        poll_count = [0]
        poll_stop = threading.Event()

        def poller():
            while not poll_stop.is_set():
                for rid in list(run_ids):
                    try:
                        code, body = api._req("GET",
                                              "/v1/pipelines/status/" + rid)
                        if code == 200:
                            poll_count[0] += 1
                            json.loads(body)
                    except ValueError:
                        poll_violations.append(("status", rid,
                                                body[:200]))
                    except Exception:
                        pass  # server down/restarting is legal
                try:
                    code, body = api._req("GET", "/v1/queue")
                    if code == 200:
                        json.loads(body)
                except ValueError:
                    poll_violations.append(("queue", None, body[:200]))
                except Exception:
                    pass
                poll_stop.wait(0.06)

        threading.Thread(target=poller, daemon=True).start()

        # ================= C1: concurrent submission storm ==========
        print("\n-- C1 concurrent submission storm (8 parallel POSTs)")
        markers = ["storm-%d" % i for i in range(8)]
        ids = [None] * 8
        bar = threading.Barrier(8)
        results = {}

        def worker(i):
            bar.wait()
            code, body = api.submit_yaml("_queue_test", markers[i])
            results[i] = (code, body)

        ths = [threading.Thread(target=worker, args=(i,))
               for i in range(8)]
        for t in ths:
            t.start()
        for t in ths:
            t.join(30)
        ok_codes = all(results.get(i, (-1, ""))[0] in (200, 202)
                       for i in range(8))
        if not ok_codes:
            print("     C1 submit codes: %r" %
                  {i: results.get(i, ("missing",))[0] for i in range(8)})
            print("     C1 first error body: %r" %
                  next((results[i][1][:120] for i in range(8)
                        if results.get(i, (-1, ""))[0] not in (200, 202)),
                       ""))
        check(ok_codes, "C1: all 8 concurrent submissions accepted (2xx)")
        for i in range(8):
            try:
                run_ids.append(json.loads(results[i][1])["run_id"])
            except Exception:
                pass
        samples = []
        for _ in range(20):
            samples.append(api.queue())
            time.sleep(0.15)
        check(all(s.get("running", 0) <= 1 for s in samples),
              "C1: running never exceeds 1 under storm (%d samples)" %
              len(samples))
        for rid in list(run_ids):
            wait_for(lambda r=rid: terminal(api.status(r)), 90,
                     "storm run terminal")
        with PROMPTS_LOCK:
            bodies = [b for (_p, b) in PROMPTS]
        def marker_count(body):
            return sum(1 for m in markers if m in body)
        reached = [m for m in markers if any(m in b for b in bodies)]
        if len(reached) != 8:
            stats = {}
            for rid in list(run_ids):
                try:
                    stats[rid] = api.status(rid).get("status")
                except Exception as e:
                    stats[rid] = "ERR:%s" % e
            print("     C1 final statuses: %r" % list(stats.values()))
            print("     C1 first engine body: %r" %
                  (bodies[0][:200] if bodies else "<none>"))
        check(len(reached) == 8,
              "C1: all 8 prompts reached the engine (%d/8)" % len(reached))
        cross = [i for i, b in enumerate(bodies) if marker_count(b) > 1]
        check(not cross,
              "C1: zero cross-wired bodies (F2 isolation holds)")
        # queue fully drains after the storm
        wait_for(lambda: (lambda q: q.get("running") == 0 and
                          q.get("queued") == 0)(api.queue()), 30,
                 "storm drain")
        check(True, "C1: queue fully drained after storm")

        # ================= C2: stop storm on queued runs ============
        print("\n-- C2 stop storm (10 submit, 8 simultaneous stops)")
        HOLD_DELAY = 3.0
        h = json.loads(api.submit_yaml("_chaos_hold", "storm-holder")[1]
                       )["run_id"]
        run_ids.append(h)
        wait_for(lambda: api.queue().get("running") == 1, 15, "holder runs")
        queued = []
        for i in range(10):
            rid = json.loads(api.submit_yaml(
                "_queue_test", "stormq-%d" % i)[1])["run_id"]
            queued.append(rid)
            run_ids.append(rid)
        wait_for(lambda: api.queue().get("queued") == 10, 10, "10 queued")
        victims = queued[:8]
        stop_codes = {}
        bar2 = threading.Barrier(8)

        def stopper(rid):
            bar2.wait()
            code, body = api.stop(rid)
            stop_codes[rid] = (code, body)

        ths = [threading.Thread(target=stopper, args=(r,))
               for r in victims]
        for t in ths:
            t.start()
        for t in ths:
            t.join(15)
        if any(c != 200 for (c, _b) in stop_codes.values()):
            for rid, (c, b) in stop_codes.items():
                if c != 200:
                    print("     C2 stop %s -> %s %r" % (rid, c, b[:120]))
                    try:
                        print("     C2 its status now: %r" %
                              api.status(rid))
                    except Exception:
                        pass
        check(all(c == 200 for (c, _b) in stop_codes.values()),
              "C2: all 8 simultaneous stops returned 200")
        for rid in victims:
            wait_for(lambda r=rid: terminal(api.status(r)), 30,
                     "stopped run terminal")
        bad_exec = [r for r in victims
                    if api.status(r).get("status") != "stopped"]
        check(not bad_exec,
              "C2: every storm-stopped run is 'stopped' (not error)")
        with PROMPTS_LOCK:
            execd = [b for (_p, b) in PROMPTS]
        # victims are stormq-0..7 — none may appear in any engine POST
        vict_markers = ["stormq-%d" % i for i in range(8)]
        leaked = [m for m in vict_markers
                  if any(m in b for b in execd)]
        check(not leaked,
              "C2: no stopped-queued run ever reached the engine")
        code_unk, _ = api.stop("run-does-not-exist-xyz")
        check(code_unk in (400, 404),
              "C2: stop of unknown run is 4xx (%s)" % code_unk)
        code_again, _ = api.stop(victims[0])
        check(code_again in (400, 404),
              "C2: re-stop of terminal run refused 4xx (%s)" % code_again)
        # survivors + holder all finish; no slot leaked
        for rid in [h] + queued[8:]:
            wait_for(lambda r=rid: terminal(api.status(r)), 90,
                     "post-storm run terminal")
        wait_for(lambda: (lambda q: q.get("running") == 0 and
                          q.get("queued") == 0 and
                          q.get("active") == "")(api.queue()), 30,
                 "post-storm drain")
        check(True, "C2: queue empty after stop storm (no leaked slots)")

        # ================= C3: stop-vs-completion race ==============
        print("\n-- C3 stop-vs-completion race (6 staggered attempts)")
        race_results = []
        for attempt, offset in enumerate([0.3, 0.7, 1.1, 1.5, 2.1, 2.8]):
            marker = "race-%d" % attempt
            code, body = api.submit_yaml("_chaos_race", marker)
            rid = json.loads(body)["run_id"]
            run_ids.append(rid)
            wait_for(lambda: api.queue().get("running") == 1, 15,
                     "race run running")
            time.sleep(offset)
            api.stop(rid)
            st = wait_for(lambda r=rid: tstatus(api, r), 30,
                          "race run terminal")
            race_results.append((attempt, offset, st.get("status")))
            # after EVERY attempt the queue must still serve
            probe = json.loads(api.submit_yaml(
                "_queue_test", "race-probe-%d" % attempt)[1])["run_id"]
            run_ids.append(probe)
            wait_for(lambda r=probe: terminal(api.status(r)), 60,
                     "post-race probe terminal")
        statuses = [s for (_a, _o, s) in race_results]
        check(all(s in ("stopped", "completed", "success")
                  for s in statuses),
              "C3: race never produces error/failed (%r)" % statuses)
        mixed = len(set(statuses)) > 1
        print("     race outcomes: %r" % (race_results,))
        check(mixed or True,
              "C3: outcomes recorded (%d stopped, %d completed)" %
              (statuses.count("stopped"),
               len(statuses) - statuses.count("stopped")))
        check(all(_healthy(api) for _ in [0]),
              "C3: gateway healthy after all 6 races")

        # ================= C4: timeout interrupts (F4) ==============
        print("\n-- C4 timeout cancellation")
        with PROMPTS_LOCK:
            int_before = len(INTERRUPTS)
        t0 = time.time()
        code, body = api.submit_yaml("_chaos_slow", "slow-timeout-run")
        rid = json.loads(body)["run_id"]
        run_ids.append(rid)
        st = wait_for(lambda r=rid: tstatus(api, r), 30,
                      "slow run terminal")
        wall = time.time() - t0
        check(st.get("status") in ("error", "failed"),
              "C4: timed-out run fails (%s)" % st.get("status"))
        check(wall < 15,
              "C4: timeout is bounded (%.1fs wall, not 300s)" % wall)
        with PROMPTS_LOCK:
            int_after = len(INTERRUPTS)
        check(int_after > int_before,
              "C4: timeout POSTed /interrupt (%d -> %d)" %
              (int_before, int_after))
        nxt = json.loads(api.submit_yaml(
            "_queue_test", "after-timeout")[1])["run_id"]
        run_ids.append(nxt)
        wait_for(lambda r=nxt: terminal(api.status(r)), 60,
                 "post-timeout run terminal")
        check(True, "C4: queue continues after timeout (ticket released)")

        # ================= C5: malformed input barrage ==============
        print("-- C5 malformed input barrage")
        # LAW (operator, 2026-08-30): no legacy, no fallbacks, no
        # hardcodes.  Shapes that USED to fall into the legacy lane
        # (hardcoded production executor) must now be rejected 4xx
        # BEFORE any run is registered.
        banned = [
            ("null yaml", {"yaml": None, "prompt": "x"}),
            ("numeric yaml", {"yaml": 999, "prompt": "x"}),
            ("unknown yaml", {"yaml": "_no_such_pipeline_xyz", "prompt": "x"}),
            ("unknown model", {"model": "_no_such_model_xyz", "prompt": "x"}),
            ("no selection", {"prompt": "x"}),
        ]
        banned_ok = True
        for label, body in banned:
            code, _b = api._req("POST", "/v1/pipelines/start", body)
            print("     C5 banned %-16s -> %s" % (label, code))
            if code not in (400, 404):
                banned_ok = False
        check(banned_ok,
              "C5: every banned shape rejected 4xx (law: no legacy/no fallback)")
        check(api.queue().get("queued", 0) == 0,
              "C5: banned shapes registered ZERO runs")
        # the LEGAL {model} shape must still work: _queue_test resolves
        # to pipelines/_queue_test/pipeline.yaml on disk
        code, body = api._req("POST", "/v1/pipelines/start",
                              {"model": "_queue_test", "prompt": "model-shape-ok"})
        ok_model = code in (200, 202)
        if ok_model:
            run_ids.append(json.loads(body)["run_id"])
        check(ok_model,
              "C5: legal {model} shape still accepted (%s)" % code)
        # remaining barrage: badly-formed shapes that are NOT legacy
        barrage = [
            ("raw garbage", None, b"{this is not json"),
            ("empty object", {}, None),
            ("wrong-type prompt", {"yaml": "_queue_test",
                                   "prompt": ["x"]}, None),
            ("array yaml", {"yaml": ["_queue_test"]}, None),
            ("empty prompt", {"yaml": "_queue_test", "prompt": ""}, None),
            ("200KB prompt", {"yaml": "_queue_test",
                              "prompt": "z" * 200000}, None),
            ("missing all", {"nope": 1}, None),
        ]
        all_4xx = True
        for label, body, raw in barrage:
            code, _b = api._req("POST", "/v1/pipelines/start", body,
                                raw=raw)
            print("     C5 %-18s -> %s" % (label, code))
            if not (400 <= code < 500 or code in (200, 202)):
                all_4xx = False
            if code in (200, 202):
                try:
                    run_ids.append(json.loads(_b)["run_id"])
                except Exception:
                    pass
        check(all_4xx,
              "C5: barrage answers 4xx (or accepts sanely), never dies")
        check(_healthy(api), "C5: gateway healthy after barrage")
        surv = json.loads(api.submit_yaml(
            "_queue_test", "after-barrage")[1])["run_id"]
        run_ids.append(surv)
        try:
            wait_for(lambda r=surv: terminal(api.status(r)), 60,
                     "post-barrage run terminal")
        except Exception as ex:
            print("     C5 WEDGE (%s): queue=%r" % (ex, api.queue()))
            try:
                with open(srv_log) as f:
                    tail = f.read()[-1200:]
                print("     C5 server log tail:\n%s" % tail)
            except Exception:
                pass
            raise
        check(True, "C5: queue serves a real run right after the barrage")

# ================= C6: F26 deep error quoting ===============
        print("\n-- C6 deep error quoting")
        code, body = api.submit_yaml("_chaos_err2", "err2-run")
        rid = json.loads(body)["run_id"]
        run_ids.append(rid)
        st = wait_for(lambda r=rid: tstatus(api, r), 45,
                      "err2 run terminal")
        check(st is not None,
              "C6: status parses with hostile error document")
        err = st.get("error") or ""
        check("boom" in err and "quoted" in err,
              "C6: exact hostile error preserved (%r)" % err[:60])
        sc_path = os.path.join(build, "output", rid, "_pipeline.json")
        try:
            with open(sc_path) as f:
                sc = json.load(f)
            serr = sc.get("error") or ""
            check("boom" in serr and "newline" in serr,
                  "C6: sidecar parses and keeps quotes+newline text")
        except Exception as e:
            check(False, "C6: sidecar parses (%s)" % e)

        # ================= C9: churn drain, no starvation ===========
        print("\n-- C9 churn: holds+stops+submits interleaved")
        HOLD_DELAY = 1.0
        keep = []
        for round_i in range(3):
            hh = json.loads(api.submit_yaml(
                "_chaos_hold", "churn-h%d" % round_i)[1])["run_id"]
            run_ids.append(hh)
            keep.append(hh)
            wait_for(lambda: api.queue().get("running") == 1, 15,
                     "churn holder running")
            qs = []
            for j in range(3):
                rid = json.loads(api.submit_yaml(
                    "_queue_test", "churn-%d-%d" % (round_i, j))[1]
                    )["run_id"]
                qs.append(rid)
                run_ids.append(rid)
            api.stop(qs[0])
            api.stop(qs[1])
        q = api.queue()
        check(q.get("running") <= 1,
              "C9: serial law held through churn")
        for rid in keep + run_ids[-12:]:
            try:
                wait_for(lambda r=rid: terminal(api.status(r)), 90,
                         "churn run terminal")
            except AssertionError:
                pass
        wait_for(lambda: (lambda q: q.get("queued") == 0 and
                          q.get("running") == 0 and
                          q.get("active") == "")(api.queue()), 30,
                 "churn drain")
        check(True, "C9: churn drained, no ghosts")
        # FIFO must NOT be starved by the abandoned tickets: 3 in a row
        with PROMPTS_LOCK:
            base = len(PROMPTS)
        seq = []
        for k in range(3):
            rid = json.loads(api.submit_yaml(
                "_queue_test", "starve-%d" % k)[1])["run_id"]
            seq.append(rid)
            run_ids.append(rid)
        for rid in seq:
            wait_for(lambda r=rid: terminal(api.status(r)), 60,
                     "starve run terminal")
        with PROMPTS_LOCK:
            tail = [b for (_p, b) in PROMPTS[base:]]
        ix = []
        for k in range(3):
            for i, b in enumerate(tail):
                if ("starve-%d" % k) in b:
                    ix.append(i)
                    break
        check(len(ix) == 3 and ix == sorted(ix),
              "C9: no starvation — 3 runs execute in order %r" % ix)

        # ================= C7: kill -9 sidecar atomicity ============
        print("\n-- C7 kill -9 mid-run x5 (sidecar atomicity)")
        HOLD_DELAY = 2.5
        kill_delays = [0.15, 0.4, 0.9, 1.4, 2.0]
        random.seed(7)
        for kd in kill_delays:
            code, body = api.submit_yaml("_chaos_hold", "kill9-victim")
            run_ids.append(json.loads(body)["run_id"])
            wait_for(lambda: api.queue().get("running") == 1, 15,
                     "victim running")
            time.sleep(kd)
            kill_hard(srv)
            n, bad = parse_all_sidecars(build)
            check(not bad,
                  "C7: after kill@%.2fs all %d sidecars parse (%r)" %
                  (kd, n, bad[:2]))
            srv = boot()
            wait_for(lambda: _healthy(api), 15, "reboot after kill -9")
        check(_healthy(api), "C7: gateway alive after 5 kill/reboot cycles")
        post = json.loads(api.submit_yaml(
            "_queue_test", "after-kill9")[1])["run_id"]
        run_ids.append(post)
        wait_for(lambda r=post: terminal(api.status(r)), 60,
                 "post-kill9 run terminal")
        check(True, "C7: system fully serves after 5 hard kills")

        # ================= C8: SIGINT path ==========================
        print("\n-- C8 SIGINT mid-run")
        code, body = api.submit_yaml("_chaos_hold", "sigint-victim")
        g = json.loads(body)["run_id"]
        run_ids.append(g)
        wait_for(lambda: api.queue().get("running") == 1, 15, "G running")
        srv.send_signal(_sig.SIGINT)
        try:
            srv.wait(timeout=10)
            clean = True
        except subprocess.TimeoutExpired:
            clean = False
            kill_hard(srv)
        check(clean, "C8: SIGINT exits cleanly")
        sc_path = os.path.join(build, "output", g, "_pipeline.json")
        try:
            with open(sc_path) as f:
                sc = json.load(f)
            check(sc.get("status") == "stopped" and
                  "shutdown" in (sc.get("error") or ""),
                  "C8: SIGINT sidecar stopped+reason (%s|%r)" %
                  (sc.get("status"), (sc.get("error") or "")[:40]))
        except Exception as e:
            check(False, "C8: SIGINT sidecar readable (%s)" % e)
        srv = boot()
        wait_for(lambda: _healthy(api), 15, "reboot after SIGINT")

        # ================= C10: boot sweep matrix ===================
        print("\n-- C10 boot sweep matrix")
        st_top = "run-sweep-top-only"
        st_stage = "run-sweep-stage-only"
        st_both = "run-sweep-both"
        st_failed = "run-sweep-already-failed"
        st_bad = "run-sweep-malformed"
        cases = {
            st_top: '{"run_id":"%s","status":"running","stages":[]}' % st_top,
            st_stage: '{"run_id":"%s","status":"completed","stages":'
                      '[{"id":"x","status":"running"}]}' % st_stage,
            st_both: '{"run_id":"%s","status":"running","stages":'
                     '[{"id":"x","status":"running"}]}' % st_both,
            st_failed: '{"run_id":"%s","status":"failed","stages":'
                       '[{"id":"x","status":"failed"}]}' % st_failed,
            st_bad: '{"run_id":"%s","status":"running", NOT JSON' % st_bad,
        }
        for rid, doc in cases.items():
            d = os.path.join(build, "output", rid)
            os.makedirs(d, exist_ok=True)
            with open(os.path.join(d, "_pipeline.json"), "w") as f:
                f.write(doc)
        before = {r: swept_count(build, r)
                  for r in (st_top, st_stage, st_both, st_failed)}
        shutdown(srv)
        srv = boot()
        wait_for(lambda: _healthy(api), 15, "reboot for sweep")
        check(_healthy(api), "C10: boot survives a malformed sidecar")
        for rid in (st_top, st_both):
            with open(os.path.join(build, "output", rid,
                                   "_pipeline.json")) as f:
                sc = json.load(f)
            ok = (sc.get("status") == "failed" and
                  all(s.get("status") != "running"
                      for s in sc.get("stages", [])) and
                  "sweep" in sc)
            check(ok, "C10: %s swept at both levels (%s)" %
                  (rid, sc.get("status")))
        with open(os.path.join(build, "output", st_stage,
                               "_pipeline.json")) as f:
            sc = json.load(f)
        check(sc.get("stages", [{}])[0].get("status") == "failed" and
              "sweep" in sc,
              "C10: stage-only stale swept too")
        with open(os.path.join(build, "output", st_failed,
                               "_pipeline.json")) as f:
            sc = json.load(f)
        check(sc.get("status") == "failed" and "sweep" not in sc,
              "C10: already-failed sidecar untouched")
        for rid in (st_top, st_stage, st_both):
            check(swept_count(build, rid) - before[rid] == 1,
                  "C10: exactly 1 ledger sweep row for %s" % rid)
        check(swept_count(build, st_failed) == before[st_failed],
              "C10: no ledger churn for already-failed")
        # idempotence: one more restart changes nothing
        shutdown(srv)
        srv = boot()
        wait_for(lambda: _healthy(api), 15, "final reboot")
        stable = all(swept_count(build, r) == before[r] + 1
                     for r in (st_top, st_stage, st_both))
        check(stable, "C10: second restart re-sweeps NOTHING")

        # ================= C11: concurrent sidecar-restore race ==
        # After a restart the registry is empty: every status GET for a
        # run that only exists on disk goes through the SIDECAR-RESTORE
        # path. Hammer it from 8 threads on shared ids — if that path
        # uses shared/static buffers, two concurrent restores cross-wire
        # and the response stops being parseable JSON.
        print("\n-- C11 concurrent sidecar-restore race (8 threads)")
        disk_ids = []
        for rid in list(run_ids)[-6:]:
            if os.path.isfile(os.path.join(build, "output", rid,
                                           "_pipeline.json")):
                disk_ids.append(rid)
        if len(disk_ids) < 2:
            check(False, "C11: setup needs >=2 on-disk sidecars")
        else:
            bad = []
            n_gets = [0]

            def hammer(rids):
                for _ in range(30):
                    for rid in rids:
                        try:
                            code, body = api._req(
                                "GET", "/v1/pipelines/status/" + rid)
                            if code == 200:
                                n_gets[0] += 1
                                json.loads(body)
                        except ValueError:
                            bad.append((rid, body[:160]))
                        except Exception:
                            pass

            share = [disk_ids[:2]] * 6 + [disk_ids[2:]] * 2
            ths = [threading.Thread(target=hammer, args=(s,))
                   for s in share]
            for t in ths:
                t.start()
            for t in ths:
                t.join(30)
            check(not bad,
                  "C11: %d concurrent restores all parsed (%r)" %
                  (n_gets[0], bad[:2]))

        # ================= C12: concurrent read-endpoint storm ==
        # yaml/list + yaml/detail + status hammered together: the list
        # and detail handlers used STATIC buffers — concurrent GETs
        # cross-wired names and spec text. Every 200 must parse and the
        # pipeline list must stay IDENTICAL across the storm.
        print("\n-- C12 concurrent read storm (list+detail+status)")
        _, base_list = api._req("GET", "/v1/pipelines/yaml/list")
        base_names = sorted(p["name"] for p in
                            json.loads(base_list)["pipelines"])
        bad = []
        n_gets = [0]

        def storm():
            for _ in range(25):
                c, b = api._req("GET", "/v1/pipelines/yaml/list")
                if c == 200:
                    n_gets[0] += 1
                    try:
                        names = sorted(p["name"] for p in
                                       json.loads(b)["pipelines"])
                        if names != base_names:
                            bad.append(("list-mangled", b[:160]))
                    except ValueError:
                        bad.append(("list-unparseable", b[:160]))
                for nm in base_names[:2]:
                    c, b = api._req("GET", "/v1/pipelines/yaml/detail?yaml="
                                    + nm)
                    if c == 200:
                        n_gets[0] += 1
                        try:
                            json.loads(b)
                        except ValueError:
                            bad.append(("detail:" + nm, b[:160]))
                if disk_ids:
                    c, b = api._req("GET", "/v1/pipelines/status/"
                                    + disk_ids[0])
                    if c == 200:
                        n_gets[0] += 1
                        try:
                            json.loads(b)
                        except ValueError:
                            bad.append(("status", b[:160]))

        ths = [threading.Thread(target=storm) for _ in range(8)]
        for t in ths:
            t.start()
        for t in ths:
            t.join(40)
        check(not bad,
              "C12: %d concurrent reads parsed, list stable (%r)" %
              (n_gets[0], bad[:2]))

        # ---- the continuous monitor verdict (F26 class under all races)
        poll_stop.set()
        time.sleep(0.2)
        check(not poll_violations,
              "CX: all %d polled 200-responses parsed as JSON (%r)" %
              (poll_count[0], poll_violations[:3]))

        # ================= C14: dead-node door guard (2026-08-30) ==
        # A workflow naming a class missing from the live /object_info
        # (the extermination incident) must be rejected 4xx BEFORE any
        # run registers: no zombie slot, no sidecar, queue untouched.
        print("\n-- C14 dead-node door guard (pre-registration 4xx)")
        q_before = api.queue()
        code, body = api.submit_yaml("_chaos_deadnode", "dead-node-victim")
        q_after = api.queue()
        try:
            err = json.loads(body).get("error", "")
        except ValueError:
            err = body[:120]
        check(code == 400,
              "C14: dead-class submit rejected 4xx (got %d)" % code)
        check("MiniMaxH3SaveLatent" in err,
              "C14: 4xx names the missing class (%r)" % err[:120])
        check(len(q_after.get("runs", q_after.get("queue", []))) ==
              len(q_before.get("runs", q_before.get("queue", []))),
              "C14: no run registered for the rejected graph")
        check(not any("dead-node-victim" in str(r) for r in
                      q_after.get("runs", q_after.get("queue", []))),
              "C14: rejected prompt absent from the queue")
        # and the happy path still passes the same door (C1 fixtures run
        # through the same validation against the same fake manifest)

        # ============ C15: lane manifest arbitration (2026-08-30) ==
        # Two card dirs may legitimately declare the same pipeline model
        # (video-gen's video_card and video_timeline's h3_timeline_card
        # both say "h3-timeline"). The lane law needs EXACTLY ONE
        # manifest per lane: melite-tools refuses to mount a session
        # whose lane resolves N>1 (proven live: agent door spawn died
        # with 'resolved 2 manifests (must be exactly 1)'). The lane's
        # OWN tool — the dir whose tool.json name is "<lane>_card" —
        # must win; single-match lanes stay byte-identical.
        print("\n-- C15 lane manifest arbitration")
        code, body = api._req("GET", "/v1/card-tools?lane=h3_timeline")
        try:
            manifests = json.loads(body)
            names = [m.get("name") for m in manifests]
        except ValueError:
            manifests, names = None, [body[:80]]
        check(code == 200 and isinstance(manifests, list),
              "C15: lane card-tools 200 JSON (got %d %r)" % (code, body[:80]))
        check(names == ["h3_timeline_card"],
              "C15: h3_timeline resolves EXACTLY its own tool %r" % names)
        # a single-match lane (model z-image -> image_card) is unchanged
        code, body = api._req("GET", "/v1/card-tools?lane=z-image")
        try:
            names2 = [m.get("name") for m in json.loads(body)]
        except ValueError:
            names2 = [body[:80]]
        check(code == 200 and names2 == ["image_card"],
              "C15: single-match lane z-image still image_card %r" % names2)
        # laneless listing still serves every card (no filter regressions)
        code, body = api._req("GET", "/v1/card-tools")
        try:
            all_names = sorted(m.get("name") for m in json.loads(body))
        except ValueError:
            all_names = []
        check(code == 200 and "h3_timeline_card" in all_names and
              "image_card" in all_names,
              "C15: laneless card-tools serves all cards %r" % all_names)

        # ============ C16: 5-window draft registration (2026-08-30) ==
        # The auto-arm start shape ({"yaml":..,"draft_id":..,"prompt":
        # "lane-auto-arm"}) against a 5-call card document crashed the
        # gateway TWICE live (19:52, 20:12): fortify abort after
        # "[draft] run ... linked to card", before any window executed.
        # Same draft (verbatim params), fake backend, zero GPU: the
        # start must return 2xx, register the run, and the gateway must
        # SURVIVE (resilience law: no code path may abort the server).
        print("\n-- C16 five-window draft registration survives")
        crash_draft_src = None
        for cand in sorted(os.listdir(os.path.join(build, "drafts")),
                           reverse=True):
            if not cand.startswith("draft-"):
                continue
            try:
                dd = json.load(open(os.path.join(build, "drafts", cand)))
                calls = dd["stages"][0]["params"]["calls"]
            except Exception:
                continue
            if isinstance(calls, list) and len(calls) == 5:
                crash_draft_src = os.path.join(build, "drafts", cand)
                break
        check(crash_draft_src is not None,
              "C16: found a 5-call draft doc to replay (%s)" %
              (crash_draft_src or "none in build/drafts"))
        if crash_draft_src:
            dd = json.load(open(crash_draft_src))
            card = {
                "draft_id": "_chaos_tl_card",
                "intent": dd.get("intent", "chaos replay"),
                "stages": [{
                    "id": "compose", "title": "chaos replay",
                    "kind": "card", "service": "h3-timeline",
                    "params": dd["stages"][0]["params"],
                    "inputs": [], "provenance": "chaos-replay",
                }],
                "status": "ready",
            }
            with open(os.path.join(build, "drafts",
                                   "_chaos_tl_card.json"), "w") as f:
                json.dump(card, f)
            code, body = api.submit_yaml(
                "_chaos_tl", "lane-auto-arm",
                raw_body={"yaml": "_chaos_tl",
                          "draft_id": "_chaos_tl_card",
                          "prompt": "lane-auto-arm"})
            registered = None
            try:
                registered = json.loads(body).get("run_id")
            except ValueError:
                pass
            check(code in (200, 202) and registered,
                  "C16: 5-call auto-arm start 2xx + run_id (got %d %r)" %
                  (code, body[:120]))
            if registered:
                run_ids.append(registered)
                api.stop(registered)
                wait_for(lambda: api.status(registered).get("status") in
                         ("stopped", "error", "failed", "completed"),
                         30, "chaos tl run terminal")
            # the gateway process itself must still be alive
            check(srv.poll() is None,
                  "C16: gateway process survived registration "
                  "(exit=%r)" % srv.poll())
            code, body = api._req("GET", "/v1/queue")
            check(code == 200, "C16: queue still served after 5-window "
                  "registration (got %d)" % code)
            # registration evidence: the run's yaml carries resolved
            # ABSOLUTE tail paths (no $tailpath vars left behind)
            if registered:
                sc_path = os.path.join(build, "output", registered,
                                       "_pipeline.json")
                try:
                    y = json.load(open(sc_path)).get("yaml", "")
                except Exception:
                    y = ""
                check("$tailpath" not in y,
                      "C16: run yaml has literal tail paths")
                check(y.count("_tail.pt") >= 5,
                      "C16: five tail paths present (%d)" %
                      y.count("_tail.pt"))
            try:
                os.unlink(os.path.join(build, "drafts",
                                       "_chaos_tl_card.json"))
            except OSError:
                pass

        # ====== C17: container-boundary tail law (/view + /upload) ==
        # The executor is containerized: node writes to absolute repo
        # paths stay in its overlay. Tails must travel the artifact
        # doors: save node UI outputs -> plugin /view fetch -> canonical
        # out_dir/window<k>_tail.pt -> plugin /upload (input dir) ->
        # chain node reads. TLComfy fakes the doors and records every
        # upload; a seam prompt whose tail was never uploaded is a
        # VIOLATION. The stitch stage failing afterwards (no real
        # videos) is expected — C17 asserts the boundary facts.
        if crash_draft_src:
            print("\n-- C17 container-boundary tail law")
            tl_comfy = ThreadingHTTPServer(("127.0.0.1", 0), TLComfy)
            tl_port = tl_comfy.server_address[1]
            threading.Thread(target=tl_comfy.serve_forever,
                             daemon=True).start()
            tl2_yaml = tl_yaml.replace(
                "http://127.0.0.1:%d" % comfy_port,
                "http://127.0.0.1:%d" % tl_port).replace(
                "name: _chaos_tl", "name: _chaos_tl2")
            os.makedirs(os.path.join(repo, "pipelines", "_chaos_tl2"),
                        exist_ok=True)
            with open(os.path.join(repo, "pipelines", "_chaos_tl2",
                                   "pipeline.yaml"), "w") as f:
                f.write(tl2_yaml)
            made_fixtures.append("_chaos_tl2")
            dd = json.load(open(crash_draft_src))
            card2 = {
                "draft_id": "_chaos_tl_card2",
                "intent": "container boundary replay",
                "stages": [{"id": "compose", "title": "cb replay",
                            "kind": "card", "service": "h3-timeline",
                            "params": dd["stages"][0]["params"],
                            "inputs": [], "provenance": "chaos-replay"}],
                "status": "ready",
            }
            with open(os.path.join(build, "drafts",
                                   "_chaos_tl_card2.json"), "w") as f:
                json.dump(card2, f)
            UPLOADS.clear(); UPLOAD_ORDER.clear()
            UPLOAD_VIOLATIONS.clear(); TL_PROMPTS.clear()
            code, body = api.submit_yaml(
                "_chaos_tl2", "lane-auto-arm",
                raw_body={"yaml": "_chaos_tl2",
                          "draft_id": "_chaos_tl_card2",
                          "prompt": "lane-auto-arm"})
            tl_rid = None
            try:
                tl_rid = json.loads(body).get("run_id")
            except ValueError:
                pass
            check(code in (200, 202) and tl_rid,
                  "C17: boundary run registered (got %d %r)" %
                  (code, body[:100]))
            if tl_rid:
                run_ids.append(tl_rid)
                try:
                    wait_for(lambda: api.status(tl_rid).get("status") in
                             ("failed", "completed", "stopped", "error"),
                             240, "tl2 run terminal")
                except AssertionError:
                    api.stop(tl_rid)
                out2 = os.path.join(build, "output", tl_rid)
                # 1) tails fetched from the OUTPUT door under canonical
                #    names (window1..4 tails; w5's is fetched too but the
                #    stitch failure may cut the run before w5's stage —
                #    every COMPLETED window's tail must be on disk)
                n_tails = len([f for f in os.listdir(out2)
                               if re.match(r"window\d+_tail\.pt$", f)])
                n_metas = len([f for f in os.listdir(out2)
                               if re.match(r"window\d+_tail\.pt\.meta\.json$",
                                           f)])
                check(n_tails >= 2,
                      "C17: tails fetched via /view into run dir (%d)" %
                      n_tails)
                check(n_metas >= 2,
                      "C17: tail metas fetched via /view (%d)" % n_metas)
                if n_tails:
                    t0 = open(os.path.join(out2, "window1_tail.pt"),
                              "rb").read()
                    check(t0 == TL_TAIL_BYTES,
                          "C17: fetched tail bytes match the /view source")
                # 2) every seam prompt's tail went through /upload FIRST
                check(not UPLOAD_VIOLATIONS,
                      "C17: no seam rendered without its uploaded tail %r" %
                      (UPLOAD_VIOLATIONS[:2],))
                ups = [f for (_, f) in UPLOAD_ORDER
                       if re.match(r"window\d+_tail\.pt$", f)]
                check(len(ups) >= 2,
                      "C17: tails uploaded to the input door (%d)" %
                      len(ups))
                subs = {s for (s, _) in UPLOAD_ORDER}
                check(all(s and s.startswith("run-") for s in subs),
                      "C17: uploads carry the run-scoped subfolder %r" %
                      sorted(subs)[:3])
                api.stop(tl_rid)
            try:
                os.unlink(os.path.join(build, "drafts",
                                       "_chaos_tl_card2.json"))
            except OSError:
                pass
            tl_comfy.shutdown()

        # ====== C18: crash-law — N>16 inputs + >128 calls rejection ===
        # tensors[16] was a FIXED stack array smashed by any run whose
        # inputs exceeded 16 (31-window asset-queue card → gateway ABORT
        # via fortify, 2026-08-30). The heap fix (calloc n_inputs) must
        # survive beyond 16. Separately, compile_calls_windows silently
        # dropped calls past TL_MAX_WINDOWS (128) — a truncated card
        # would lie about its own length. Both must be LOUD before any
        # run registers.
        print("\n-- C18 crash-law: dynamic inputs + 128-call ceiling")
        # (a) 20-call body: registers (20 inputs fit the dynamic array)
        #     and the gateway stays alive — no fortify abort.
        #     Use the chaos fixture (server_url → fake comfy) so graph
        #     validation passes against the FakeComfy /object_info.
        calls20 = [{"text": "c%d" % i, "start_frame": i*30,
                    "end_frame": (i+1)*30} for i in range(20)]
        code, body = api._req("POST", "/v1/pipelines/start",
                              {"yaml": "_chaos_tl",
                               "calls": calls20,
                               "seed": 99, "fps": 24,
                               "prompt": "twenty-call test"})
        try:
            j20 = json.loads(body)
        except ValueError:
            j20 = {}
        r20 = j20.get("run_id")
        check(code in (200, 202) and r20,
              "C18a: 20-call card registered (got %d %s)" %
              (code, body[:80]))
        if r20:
            run_ids.append(r20)
            try:
                api.stop(r20)
            except Exception:
                pass
        # gateway still alive after 20-call registration (no abort)
        code2, _ = api._req("GET", "/v1/queue")
        check(code2 == 200,
              "C18b: gateway survived 20-call registration (queue %d)" %
              code2)
        # (b) 130-call body: 4xx BEFORE any run registers
        calls130 = [{"text": "x%d" % i, "start_frame": i*10,
                     "end_frame": (i+1)*10} for i in range(130)]
        code, body = api._req("POST", "/v1/pipelines/start",
                              {"yaml": "_chaos_tl",
                               "calls": calls130,
                               "seed": 99, "fps": 24,
                               "prompt": "ceiling test"})
        check(code == 400 and "TL_MAX_WINDOWS" in body,
              "C18c: 130-call card rejected 4xx (got %d %s)" %
              (code, body[:120]))
        # the 20-call run may still be settling through the fake
        # comfy's 500-response + plugin retries; poll until idle
        try:
            wait_for(lambda: json.loads(
                api._req("GET", "/v1/queue")[1]).get("running", 0) == 0,
                60, "C18d queue idle")
            q2 = json.loads(api._req("GET", "/v1/queue")[1])
            check(q2.get("running", 0) == 0,
                  "C18d: no run registered for the rejected card")
        except (AssertionError, OSError) as ex:
            check(False, "C18d: " + str(ex))

    except AssertionError as ex:
        failures.append(str(ex))
        print("  FAIL  " + str(ex))
    finally:
        try:
            shutdown(srv)
        except Exception:
            pass
        comfy.shutdown()
        for rid in run_ids:
            shutil.rmtree(os.path.join(build, "output", rid),
                          ignore_errors=True)
        for nm in made_fixtures:
            shutil.rmtree(os.path.join(repo, "pipelines", nm),
                          ignore_errors=True)
        for rid in ("run-sweep-top-only", "run-sweep-stage-only",
                    "run-sweep-both", "run-sweep-already-failed",
                    "run-sweep-malformed"):
            shutil.rmtree(os.path.join(build, "output", rid),
                          ignore_errors=True)

    total = n_pass[0] + len(failures)
    print("\n%d checks, %d failures" % (total, len(failures)))
    return 1 if failures else 0


def output_fix(build, rid):
    return os.path.join("output", rid)


if __name__ == "__main__":
    sys.exit(main())
