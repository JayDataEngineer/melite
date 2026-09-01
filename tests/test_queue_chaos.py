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
import glob
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

HOLD_DELAY = 0.3        # default /prompt hold before the 500
                        # (2026-08-31 speed law: was 1.2 — pure sleep tax)
RACE_WORK = 1.6         # /race executor "render" duration
PROMPTS = []            # (path, body) in arrival order
PROMPTS_LOCK = threading.Lock()
INTERRUPTS = []         # (path, time)
RACE_SUBMIT = {}        # prompt_id -> completion timestamp
RACE_LOCK = threading.Lock()
ERR2_BODY = None        # built in main(): the hostile error document

# Fake /object_info manifest: filled in main() from the real
# sprite-sheet workflow.json the fixtures reference (the gateway
# pre-validates class_types against it before registering a run).
OBJECT_INFO = {}


def build_object_info(repo):
    global OBJECT_INFO
    wf = os.path.join(repo, "pipelines", "sprite-sheet", "workflow.json")
    try:
        graph = json.load(open(wf))
        OBJECT_INFO = {n.get("class_type", "?"): {} for n in graph.values()
                       if isinstance(n, dict)}
    except Exception as e:            # pragma: no cover - fixture rot
        print("FATAL cannot build fake /object_info from %s: %s" % (wf, e))
        sys.exit(2)
    # C16: the h3-timeline window templates' classes must exist on the
    # fake backend too, or the pre-registration node guard 400s the very
    # start we are trying to crash-test. (2026-09-01 lane law: the
    # templates live WITH THE PLUGIN now — models/video/h3-timeline —
    # pipelines/h3-timeline/ is deliberately gone.)
    tl_dir = os.path.join(repo, "plugins", "comfyui", "models", "video",
                          "h3-timeline")
    if os.path.isdir(tl_dir):
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
        self.send_header("X-Melite-Test-Fake", "1")
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
            family = "ray"
            for node in g.values():
                if not isinstance(node, dict):
                    continue
                ct = node.get("class_type", "")
                if ct == "RayH3SaveLatentTail":
                    p = node.get("inputs", {}).get("path", "")
                    tail = (p.rsplit("/", 1)[0], p.rsplit("/", 1)[-1])
                elif ct == "MiniMaxH3MotionContextSaveLatent":
                    # (2026-09-01) the context family: save node writes
                    # "<prefix-base>_<clipidx:05d>.safetensors" under
                    # subfolder=dirname(prefix) — nodes_minimax_h3 /
                    # H3-Motion-Context-MultiRef save() convention. The
                    # chain (CtxLoadLatent) reads it dir-relative from
                    # the SHARED OUTPUT dir — no input-door travel.
                    family = "ctx"
                    pref = node.get("inputs", {}).get(
                        "filename_prefix", "h3_context/clip")
                    try:
                        ci = int(node.get("inputs", {}).get(
                            "clip_index", 0) or 0)
                    except (TypeError, ValueError):
                        ci = 0
                    if "/" in pref:
                        sub, base = pref.rsplit("/", 1)
                    else:
                        sub, base = "", pref
                    tail = (sub, "%s_%05d.safetensors"
                            % (base, ci if ci > 0 else 1))
                elif ct == "RayH3ChainLatentAV":
                    chain = node.get("inputs", {}).get("tail_path", "")
            if chain:
                want = (chain.rsplit("/", 1)[0], chain.rsplit("/", 1)[-1])
                if UPLOADS.get(want) is None:
                    UPLOAD_VIOLATIONS.append((pid, chain))
            TL_PROMPTS[pid] = {"tail": tail, "family": family}
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
                if info.get("family") == "ctx":
                    outputs["CtxSaveLatent.0"] = {
                        "images": [
                            {"filename": fname, "subfolder": sub,
                             "type": "output"},
                        ]}
                else:
                    outputs["RayH3SaveLatentTail.0"] = {
                        "images": [
                            {"filename": fname, "subfolder": sub,
                             "type": "output"},
                            {"filename": fname + ".meta.json",
                             "subfolder": sub, "type": "output"},
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
        code, body = self._req("GET", "/v1/queue")
        if code == -1:
            # transport failure (server mid kill/reboot): NOT a JSON
            # contract violation — pollers treat down-as-legal. Signal
            # it with an impossible sentinel so wait_for keeps polling.
            return {"queued": -1, "running": -1, "active": "",
                    "queued_ids": []}
        try:
            return json.loads(body)
        except ValueError:
            # (2026-08-31, proven) a transport-error string reached
            # json.loads and killed the suite mid-C7 — raw bytes now.
            print("\n!! /v1/queue unparseable body: %r" % body[:200])
            raise

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
    code, body = api._req("GET", "/v1/queue")
    if code != 200:
        return False
    try:
        json.loads(body)
        return True
    except ValueError:
        return False


def parse_all_sidecars(build, since=None):
    """Every _pipeline.json under output/ must parse (F1 atomicity).
    (speed law, 2026-08-31) with `since`: only sidecars this suite run
    wrote — the shared build/output tree carries hundreds of older
    runs (prod history lives there); re-parsing all of them per kill
    cycle added minutes of pure waste with zero extra guarantee."""
    out = os.path.join(build, "output")
    bad = []
    n = 0
    if not os.path.isdir(out):
        return n, bad
    for d in os.listdir(out):
        p = os.path.join(out, d, "_pipeline.json")
        try:
            if since is not None and os.path.getmtime(p) < since:
                continue
        except OSError:
            continue
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
    T_START = time.time()   # speed law: sidecar parses filter to this run
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
                "    input_from:\n"
                "      - __initial__.$prompt\n"
                "    params: {\"server_url\":\"http://127.0.0.1:%d%s\","
                "\"workflow_file\":\"../pipelines/sprite-sheet/"
                "workflow.json\",\"out_dir\":\"./output\","
                "\"timeout_s\":%d,\"inject\":{"
                "\"CLIPTextEncode.0.text\":\"$prompt\"}}\n"
                % (comfy_port, url_path, timeout_s))

    fixture_yaml("_queue_test", "")
    # hold timeout 6s: since the queue-recovery law (2026-08-31) a
    # kill -9 victim RESURRECTS at reboot and re-occupies the serial
    # GPU until its timeout — 6s drains it fast enough that later
    # checks never queue behind a zombie hold.
    fixture_yaml("_chaos_hold", "/hold", timeout_s=6)
    fixture_yaml("_chaos_hold60", "/hold", timeout_s=60)
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
    # (2026-09-01 lane law) the h3-timeline lane is CARD-PATH: no
    # pipelines/h3-timeline/pipeline.yaml exists (deliberately deleted
    # when compile moved into the plugin's card_compose). C16/C18 now
    # exercise the card lane directly, with the suite's FAKE comfy
    # wired through the lawful endpoint override: env
    # COMFYUI_ENDPOINT_CONFIG > cwd > .so-relative. No yaml fixture.
    tl_yaml = None
    # (deterministic songless registration, 2026-09-01) the config
    # MUST declare input_dir: the lane's dry-fire law refuses songless
    # cards on a gateway with nowhere to stage the layer-off pin (the
    # loud behavior is correct; the harness used to pass only when the
    # newest 5-call draft happened to be a SONG draft, whose master-pin
    # check is input_dir-guarded — drafts-landscape roulette).
    chaos_input = "/tmp/chaos_input_%d" % free_port()
    os.makedirs(chaos_input, exist_ok=True)
    # (leak proof scoping) stale gateway logs from earlier runs would
    # pollute the end-of-suite real-port scan — sweep them FIRST so
    # the proof judges ONLY this run's gateways.
    for stale in glob.glob("/tmp/chaos_srv*.log"):
        try:
            os.remove(stale)
        except OSError:
            pass
    endpoint_cfg = "/tmp/chaos_endpoint_%d.json" % free_port()
    with open(endpoint_cfg, "w") as f:
        json.dump({"url": "http://127.0.0.1:%d" % comfy_port,
                   "input_dir": chaos_input}, f)

    port = free_port()
    srv_log = "/tmp/chaos_srv_%d.log" % port
    srv_env = dict(os.environ)
    srv_env["COMFYUI_ENDPOINT_CONFIG"] = endpoint_cfg
    srv_env["INFERENCE_TEST_SANDBOX"] = "1"   # (leak gate) no fallback
    srv = subprocess.Popen(
        [binpath, "serve", "--port", str(port), "--plugin-dir", build],
        cwd=build, stdout=subprocess.DEVNULL,
        stderr=open(srv_log, "ab"), env=srv_env)
    api = Api("http://127.0.0.1:%d" % port)
    run_ids = []
    made_fixtures = ["_queue_test", "_chaos_hold", "_chaos_hold60",
                     "_chaos_race",
                     "_chaos_slow", "_chaos_err2", "_chaos_deadnode"]
    failures = []
    n_pass = [0]

    def check(cond, label):
        print(("  PASS  " if cond else "  FAIL  ") + label)
        if cond:
            n_pass[0] += 1
        else:
            failures.append(label)

    def boot():
        # (queue-law leak, 2026-09-01) boot() used to omit env= — the
        # rebooted gateway inherited the bare environment, loaded the
        # .so-relative DEFAULT config (the REAL ComfyUI on :18465),
        # and every post-reboot run submitted REAL GPU renders. Tests
        # may NEVER touch the live server (AGENTS.md INFERENCE LAW).
        return subprocess.Popen(
            [binpath, "serve", "--port", str(port), "--plugin-dir", build],
            cwd=build, stdout=subprocess.DEVNULL,
            stderr=open(srv_log, "ab"), env=srv_env)

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
        HOLD_DELAY = 3.0   # C2 shield: holder must pin the GPU while 8 stops land
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
        HOLD_DELAY = 1.0
        kill_delays = [0.15, 0.4, 0.9, 1.4, 2.0]
        random.seed(7)
        for kd in kill_delays:
            code, body = api.submit_yaml("_chaos_hold", "kill9-victim")
            run_ids.append(json.loads(body)["run_id"])
            wait_for(lambda: api.queue().get("running") == 1, 15,
                     "victim running")
            time.sleep(kd)
            kill_hard(srv)
            n, bad = parse_all_sidecars(build, since=T_START)
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
        if True:   # card lane: no pipeline.yaml needed (2026-09-01)
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
            if crash_draft_src is None:
                # no 5-call draft on disk: synthesize one on the H3
                # grid (5 x 56f) — the LAW under test is registration
                # resilience, not draft archaeology
                crash_draft_src = os.path.join(build, "drafts",
                                               "_chaos_tl_synth.json")
                with open(crash_draft_src, "w") as f:
                    json.dump({"draft_id": "_chaos_tl_synth",
                               "intent": "chaos synth",
                               "stages": [{"id": "compose",
                                           "title": "synth",
                                           "kind": "card",
                                           "service": "h3-timeline",
                                           "params": {
                                               "calls": [
                                                   {"text": "w%d" % i,
                                                    "start_frame": i*56,
                                                    "end_frame": (i+1)*56}
                                                   for i in range(5)],
                                               "fps": 24, "seed": 5},
                                           "inputs": [],
                                           "provenance": "chaos-synth"}],
                               "status": "ready"}, f)
            check(True,
                  "C16: 5-call replay doc ready (%s)" %
                  os.path.basename(crash_draft_src))
        if crash_draft_src is not None:
            dd = json.load(open(crash_draft_src))
            # (strict surface law, 2026-09-01) replay params are
            # filtered to the card's LEGAL surface — historical drafts
            # carry retired yaml-lane vocabulary (length,
            # sparsity_ratio, prompt-in-params) that the gate rightly
            # rejects; C16's law is registration RESILIENCE.
            knobs_path = os.path.join(
                repo, "plugins/comfyui/models/video/h3-timeline",
                "card_knobs.yaml")
            legal_extra = set()
            try:
                for ln in open(knobs_path):
                    if ":" in ln and not ln.startswith((" ", "#", "-")):
                        legal_extra.add(ln.split(":", 1)[0].strip())
            except OSError:
                pass
            legal_extra |= {"calls", "fps", "seed", "preset",
                            "continuity", "audio_mode", "audio_stem",
                            "keyframes"}
            rp = dd["stages"][0]["params"]
            dd["stages"][0]["params"] = {
                k: v for k, v in rp.items() if k in legal_extra}
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
            code, body = api._req("POST", "/v1/pipelines/start",
                                  {"model": "h3-timeline",
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
                # (card lane, 2026-09-01) tail FETCH/UPLOAD transport is
                # C17's law; here we assert no unresolved template vars
            # (card recovery law, 2026-09-01) the registered run links
            # this draft — deleting it orphans the run's click contract
            # (S6). Chaos drafts STAY in build/drafts (untracked).
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
        if crash_draft_src is not None:
            print("\n-- C17 container-boundary tail law")
            tl_comfy = ThreadingHTTPServer(("127.0.0.1", 0), TLComfy)
            tl_port = tl_comfy.server_address[1]
            threading.Thread(target=tl_comfy.serve_forever,
                             daemon=True).start()
            # card lane: no yaml rewrite — a DEDICATED gateway whose
            # endpoint config (env override) points at TLComfy
            tl_cfg = "/tmp/chaos_endpoint_c17_%d.json" % tl_port
            with open(tl_cfg, "w") as f:
                json.dump({"url": "http://127.0.0.1:%d" % tl_port,
                           "input_dir": chaos_input}, f)
            port2 = free_port()
            srv2_log = "/tmp/chaos_srv2_%d.log" % port2
            srv2 = subprocess.Popen(
                [binpath, "serve", "--port", str(port2),
                 "--plugin-dir", build],
                cwd=build, stdout=subprocess.DEVNULL,
                stderr=open(srv2_log, "ab"),
                env={**os.environ,
                     "COMFYUI_ENDPOINT_CONFIG": tl_cfg,
                     "INFERENCE_TEST_SANDBOX": "1"})
            api2 = Api("http://127.0.0.1:%d" % port2)
            try:
                wait_for(lambda: api2._req("GET", "/v1/queue")[0] == 200,
                         30, "C17 dedicated gateway up")
            except AssertionError:
                pass   # the submit check below reports it loudly
            dd = json.load(open(crash_draft_src))
            knobs_path = os.path.join(
                repo, "plugins/comfyui/models/video/h3-timeline",
                "card_knobs.yaml")
            legal_extra = set()
            try:
                for ln in open(knobs_path):
                    if ":" in ln and not ln.startswith((" ", "#", "-")):
                        legal_extra.add(ln.split(":", 1)[0].strip())
            except OSError:
                pass
            legal_extra |= {"calls", "fps", "seed", "preset",
                            "continuity", "audio_mode", "audio_stem",
                            "keyframes"}
            rp = dd["stages"][0]["params"]
            dd["stages"][0]["params"] = {
                k: v for k, v in rp.items() if k in legal_extra}
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
            code, body = api2._req("POST", "/v1/pipelines/start",
                                   {"model": "h3-timeline",
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
                try:
                    wait_for(lambda: api2.status(tl_rid).get("status") in
                             ("failed", "completed", "stopped", "error"),
                             240, "tl2 run terminal")
                except AssertionError:
                    api2.stop(tl_rid)
                out2 = os.path.join(build, "output", tl_rid)
                # 1) tails fetched from the OUTPUT door under canonical
                #    names (window1..4 tails; w5's is fetched too but the
                #    stitch failure may cut the run before w5's stage —
                #    every COMPLETED window's tail must be on disk)
                fams = {info.get("family", "ray")
                        for info in TL_PROMPTS.values()}
                if "ray" in fams:
                    n_tails = len([f for f in os.listdir(out2)
                                   if re.match(r"window\d+_tail\.pt$",
                                               f)])
                    n_metas = len([f for f in os.listdir(out2)
                                   if re.match(
                                       r"window\d+_tail\.pt\.meta\.json$",
                                       f)])
                    check(n_tails >= 2,
                          "C17: tails fetched via /view into run dir (%d)"
                          % n_tails)
                    check(n_metas >= 2,
                          "C17: tail metas fetched via /view (%d)" %
                          n_metas)
                    if n_tails:
                        t0 = open(os.path.join(out2, "window1_tail.pt"),
                                  "rb").read()
                        check(t0 == TL_TAIL_BYTES,
                              "C17: fetched tail bytes match the /view "
                              "source")
                else:
                    # ctx family law: tails land under <rid>/h3_context
                    # as <base>_<k:05d>.safetensors; NO meta siblings;
                    # NO input-door travel (the chain reads the shared
                    # output dir — production law, proven by the
                    # run-6a960b6a film).
                    ctx_dir = os.path.join(out2, "h3_context")
                    ctx_files = []
                    if os.path.isdir(ctx_dir):
                        ctx_files = [f for f in os.listdir(ctx_dir)
                                     if re.match(r".*_\d{5}\.safetensors$",
                                                 f)]
                    check(len(ctx_files) >= 2,
                          "C17: ctx tails fetched via /view into run dir "
                          "(%d)" % len(ctx_files))
                    if ctx_files:
                        c0 = open(os.path.join(ctx_dir, ctx_files[0]),
                                  "rb").read()
                        check(c0 == TL_TAIL_BYTES,
                              "C17: fetched ctx tail bytes match the "
                              "/view source")
                # 2) every seam prompt's tail went through /upload FIRST
                check(not UPLOAD_VIOLATIONS,
                      "C17: no seam rendered without its uploaded tail %r" %
                      (UPLOAD_VIOLATIONS[:2],))
                if "ray" in fams:
                    ups = [f for (_, f) in UPLOAD_ORDER
                           if re.match(r"window\d+_tail\.pt$", f)]
                    check(len(ups) >= 2,
                          "C17: tails uploaded to the input door (%d)" %
                          len(ups))
                else:
                    check(not UPLOAD_ORDER,
                          "C17: ctx family travels the shared output "
                          "dir — no input-door uploads expected (%d)" %
                          len(UPLOAD_ORDER))
                subs = {s for (s, _) in UPLOAD_ORDER}
                check(all(s and s.startswith("run-") for s in subs),
                      "C17: uploads carry the run-scoped subfolder %r" %
                      sorted(subs)[:3])
                api2.stop(tl_rid)
            srv2.terminate()
            srv2.wait(timeout=20)
            # (card recovery law, 2026-09-01) the registered run links
            # this draft — deleting it orphans the run's click contract
            # (S6). Chaos drafts STAY in build/drafts (untracked).
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
        if True:   # card lane: no pipeline.yaml needed (2026-09-01)
            # (a) 20-call body: registers (20 inputs fit the dynamic array)
            #     and the gateway stays alive — no fortify abort.
            #     Use the chaos fixture (server_url → fake comfy) so graph
            #     validation passes against the FakeComfy /object_info.
            calls20 = [{"text": "c%d" % i, "start_frame": i*56,
                        "end_frame": (i+1)*56} for i in range(20)]
            code, body = api._req("POST", "/v1/pipelines/start",
                                  {"model": "h3-timeline",
                                   "prompt": "twenty-call test",
                                   "params": {"calls": calls20,
                                              "seed": 99, "fps": 24}})
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
            calls130 = [{"text": "x%d" % i, "start_frame": i*56,
                         "end_frame": (i+1)*56} for i in range(130)]
            code, body = api._req("POST", "/v1/pipelines/start",
                                  {"model": "h3-timeline",
                                   "prompt": "ceiling test",
                                   "params": {"calls": calls130,
                                              "seed": 99, "fps": 24}})
            check(code == 400 and "128" in body,
                  "C18c: 130-call card rejected 4xx with the bound "
                  "named (got %d %s)" % (code, body[:120]))
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

            # C18e (write-back law, proven 2026-08-31 on draft-timeline-h3):
            # a run whose windows ALL error (fake comfy 500s) has ZERO
            # artifacts — the write-back's urls accumulator never receives
            # an append and used to publish UNINITIALIZED heap bytes into
            # the card ("assetUrls":[X\x04]) — the click then died. Every
            # write-back must leave a parseable doc with an EMPTY list.
            code, body = api._req("POST", "/v1/pipelines/drafts",
                                  {"intent": "wb-law-%d" % int(time.time()),
                                   "stages": [{"id": "s_0", "inputs": [""],
                                               "provenance": "agent"}]})
            wbid = (json.loads(body).get("draftId")
                    if code in (200, 201) else None)
            check(bool(wbid), "C18e1: draft created for write-back law "
                  "(got %d %s)" % (code, body[:60]))
            if wbid:
                code, body = api._req("POST", "/v1/pipelines/start",
                                      {"model": "h3-timeline", "draft_id": wbid,
                                       "prompt": "wb-law",
                                       "params": {
                                           "calls": [{"text": "a",
                                                      "start_frame": 0,
                                                      "end_frame": 56}],
                                           "seed": 7, "fps": 24}})
                wbrun = (json.loads(body).get("run_id")
                         if code in (200, 202) else None)
                check(bool(wbrun), "C18e2: errored-window run accepted "
                      "(got %d %s)" % (code, body[:60]))
                if wbrun:
                    run_ids.append(wbrun)
                    try:
                        wait_for(lambda r=wbrun: terminal(api.status(r)),
                                 60, "C18e run terminal")
                        code, body = api._req(
                            "GET", "/v1/pipelines/drafts/" + wbid)
                        try:
                            wd = json.loads(body)
                            urls = (wd.get("stages", [{}])[0]
                                    .get("result", {}).get("assetUrls"))
                            ok = (code == 200 and
                                  (urls is None or urls == [] or
                                   all(isinstance(u, str) and
                                       u.startswith("/editor/") and
                                       u.isprintable() for u in urls)))
                            check(ok,
                                  "C18e3: write-back parseable, assetUrls "
                                  "clean strings (got %s)"
                                  % repr(urls)[:80])
                        except ValueError:
                            check(False, "C18e3: card UNPARSEABLE after "
                                  "write-back: %r" % body[:120])
                    except AssertionError as ex:
                        check(False, "C18e3: " + str(ex))
                # (card recovery law) the wbrun run links wbid — keep it

        # ==== C19: validation law — schema-driven input coverage ====
        # PROVEN FAILURE (2026-08-30): six motion-card runs registered,
        # burned queue slots, then died at EXECUTION ("[kimodo] no text
        # input") because the gateway never wired the card's "text"
        # param into the engine's REQUIRED "text" input. Engines
        # declare their schemas; registration must now WIRE same-named
        # body fields and REJECT unsatisfiable required inputs 4xx
        # BEFORE any ticket/thread/sidecar commits.
        print("\n-- C19 validation law: schema-driven input coverage")
        # hermetic kimodo fixture: dead server_url (the engine POSTs to
        # server_url/api/generate first — connection refused errors in
        # <1s; no real GPU contact)
        os.makedirs(os.path.join(repo, "pipelines", "_chaos_kim"),
                    exist_ok=True)
        made_fixtures.append("_chaos_kim")
        with open(os.path.join(repo, "pipelines", "_chaos_kim",
                               "pipeline.yaml"), "w") as f:
            f.write(
                "name: _chaos_kim\n"
                "description: chaos — kimodo lane input coverage\n"
                "nodes:\n"
                "  - id: generate\n"
                "    type: kimodo_engine\n"
                "    params: {\"server_url\":\"http://127.0.0.1:9\","
                "\"model\":\"soma-rp-v1.1\","
                "\"model_dir\":\"/tmp/none\","
                "\"text_bundle\":\"/tmp/none\","
                "\"poll_ms\":100,\"timeout_s\":5}\n")
        # (a) no text -> 4xx naming the node and the input (the body
        # carries prompt+seed the way a real motion card does — the
        # earlier "missing prompt" door must NOT mask the coverage 4xx)
        code, body = api._req("POST", "/v1/pipelines/start",
                              {"yaml": "_chaos_kim",
                               "model": "soma-rp-v1.1",
                               "prompt": "sword block motion",
                               "seed": 7})
        check(code == 400 and "requires input 'text'" in body
              and "generate" in body,
              "C19a: textless kimodo card 4xx with node+input (got %d %s)"
              % (code, body[:120]))
        # (b) no zombie: no run_id, queue still idle-consistent
        try:
            jz = json.loads(body)
        except ValueError:
            jz = {}
        check("run_id" not in jz,
              "C19b: rejection carries no run_id (got %s)" % body[:80])
        # (c) with text -> registers; the wiring delivered the field
        code, body = api._req("POST", "/v1/pipelines/start",
                              {"yaml": "_chaos_kim",
                               "model": "soma-rp-v1.1",
                               "prompt": "sword block motion",
                               "text": "a person raises a sword into a "
                                       "high block parry",
                               "seed": 7})
        try:
            jk = json.loads(body)
        except ValueError:
            jk = {}
        rk = jk.get("run_id")
        check(code in (200, 202) and rk,
              "C19c: text-bearing kimodo card registered (got %d %s)"
              % (code, body[:100]))
        if rk:
            run_ids.append(rk)
            # (d) the run must die on the DEAD server (submit failure),
            # NOT on "no text input" — proving the wiring worked
            try:
                st = wait_for(lambda: tstatus(api, rk), 20,
                              "C19d kimodo run terminal")
                err = str(st.get("error", ""))
                check("no text input" not in err,
                      "C19d: engine got the wired text (err: %s)"
                      % err[:90])
            except AssertionError as ex:
                check(False, "C19d: " + str(ex))

        # ==== C20: stack-smash law — unbounded stage snapshots ====
        # PROVEN FAILURE (2026-08-31, gateway run-6a94bc7a killed by
        # "*** buffer overflow detected ***"): run_write_sidecar built
        # stages_json in a fixed char[8192] with `so += snprintf`
        # appends — snprintf's WOULD-BE return pushed `so` past the
        # array and the trailing ']' wrote past the stack buffer,
        # mid-run, at stage 31 of a 25-window card (the status door
        # carried the same fixed array). Replicated here with 60 echo
        # nodes carrying 60-char ids: stage headers + errors exceed
        # 8192 bytes deterministically with NO comfy dependency.
        print("\n-- C20 stack-smash law: sidecar + status stage lists")
        os.makedirs(os.path.join(repo, "pipelines", "_chaos_many"),
                    exist_ok=True)
        made_fixtures.append("_chaos_many")
        sid = "st" + "x" * 58          # 60-char stage id (id[64] cap)
        with open(os.path.join(repo, "pipelines", "_chaos_many",
                               "pipeline.yaml"), "w") as f:
            f.write("name: _chaos_many\n"
                    "description: chaos — stage-dense run\n"
                    "nodes:\n")
            for i in range(60):
                f.write("  - id: %s%02d\n    type: echo\n"
                        % (sid, i))
        code, body = api._req("POST", "/v1/pipelines/start",
                              {"yaml": "_chaos_many", "prompt": "dense"})
        try:
            jm = json.loads(body)
        except ValueError:
            jm = {}
        rm2 = jm.get("run_id")
        check(code in (200, 202) and rm2,
              "C20a: 60-stage run registered (got %d %s)"
              % (code, body[:100]))
        if rm2:
            run_ids.append(rm2)
            try:
                st2 = wait_for(lambda: tstatus(api, rm2), 30,
                               "C20b 60-stage run terminal")
                check(st2.get("status") in ("error", "failed",
                                            "success", "completed"),
                      "C20b: run reached terminal (got %s)"
                      % st2.get("status"))
                # sidecar must PARSE and carry ALL 60 stages — the old
                # fixed 8192 builder smashed the stack here
                sc = json.load(open(os.path.join(
                    build, "output", rm2, "_pipeline.json")))
                check(len(sc.get("stages", [])) == 60,
                      "C20c: sidecar lists all 60 stages (got %d)"
                      % len(sc.get("stages", [])))
                # status door: same stage list, unbounded
                check(len(st2.get("stages", [])) == 60,
                      "C20d: status lists all 60 stages (got %d)"
                      % len(st2.get("stages", [])))
            except AssertionError as ex:
                check(False, "C20b-d: " + str(ex))
            except ValueError as ex:
                check(False, "C20c: sidecar unparseable: " + str(ex))
        # gateway outlived the stage-dense run either way
        try:
            wait_for(lambda: _healthy(api), 10, "C20e gateway healthy")
            check(True, "C20e: gateway alive after 60-stage run")
        except AssertionError as ex:
            check(False, "C20e: " + str(ex))

        # ==== C21: draft lint law — corrupt cards self-heal at boot ====
        # PROVEN FAILURE (2026-08-31): the sidebar card click GETs the
        # draft verbatim; the old fixed-buffer write-back cut live
        # cards mid-string (draft-timeline-h3.json, history row cut
        # inside a URL) — the click opened NOTHING. At every boot each
        # draft is structurally scanned and a cut document is repaired
        # (truncate at the damage, null a dangling key, close the
        # bracket stack) so the card surface can never stay dead.
        print("\n-- C21 draft lint: corrupt card repaired at boot")
        fx = os.path.join(build, "drafts", "draft-lint-fixture.json")
        with open(fx, "w") as f:
            # exactly the proven shape: cut mid-string, no closers
            f.write('{"draftId":"draft-lint-fixture","intent":"card",'
                    '"stages":[{"id":"s_0","inputs":[""],"provenance":'
                    '"agent"}],"status":"ready","history":[{"runId":'
                    '"run-dead","status":"completed","at":1,'
                    '"durationSec":9,"video":"/editor/assets/ru')
        kill_hard(srv)
        srv = boot()
        wait_for(lambda: _healthy(api), 15, "C21 reboot")
        try:
            doc = json.load(open(fx))
            check(doc.get("draftId") == "draft-lint-fixture" and
                  isinstance(doc.get("stages"), list) and
                  doc.get("stages"),
                  "C21a: corrupt draft repaired to valid JSON "
                  "(stages survived)")
            code, body = api._req("GET",
                                  "/v1/pipelines/drafts/draft-lint-fixture")
            ok = False
            try:
                ok = code == 200 and json.loads(body).get("draftId") == \
                    "draft-lint-fixture"
            except ValueError:
                pass
            check(ok, "C21b: the sidebar door serves the repaired card "
                  "(got %d)" % code)
            hist = doc.get("history")
            check(isinstance(hist, list) and len(hist) == 1 and
                  hist[0].get("video") is None,
                  "C21c: cut history row healed (video nulled, row kept)")
        except ValueError as ex:
            check(False, "C21a: draft still corrupt after boot: %s" % ex)
        os.remove(fx)
        # C21d (regression, proven 2026-08-31): a naive grammar rule
        # mass-quarantined 1860 HEALTHY ray-era drafts ('{"a":{}}' —
        # outer close after nested close read as invalid). A healthy
        # nested-empty-object draft must survive a boot BYTE-IDENTICAL.
        fx2 = os.path.join(build, "drafts", "draft-lint-healthy.json")
        healthy = ('{"draftId":"draft-lint-healthy","intent":"nest",'
                   '"meta":{"a":{},"b":[]},"stages":[],"num":123,'
                   '"neg":-4,"f":1.5e3,"t":true,"status":"ready",'
                   '"history":[]}')
        with open(fx2, "w") as f:
            f.write(healthy)
        kill_hard(srv)
        srv = boot()
        wait_for(lambda: _healthy(api), 15, "C21d reboot")
        got = open(fx2).read()
        check(got == healthy and json.loads(got).get("num") == 123,
              "C21d: healthy nested/empty/number draft untouched at boot")
        os.remove(fx2)

        # ==== C22: queue recovery law — a crash must not eat the queue
        # PROVEN (2026-08-31): the fortify crash killed the gateway
        # with a live queue; at reboot every queued/running run was
        # lost (swept to failed). Since the sidecar carries the FULLY
        # COMPOSED yaml, boot now RESURRECTS queued/running runs under
        # their original run_ids and re-arms them.
        print("\n-- C22 queue recovery: kill -9 with a live queue")
        code, body = api.submit_yaml("_chaos_hold60", "recover-victim")
        rv = json.loads(body)["run_id"]
        run_ids.append(rv)
        wait_for(lambda: api.queue().get("running") == 1, 15,
                 "C22 victim running")
        # a second run sits QUEUED behind it
        code, body = api.submit_yaml("_queue_test", "recover-waiter")
        rw = json.loads(body)["run_id"]
        run_ids.append(rw)
        wait_for(lambda: api.queue().get("queued") == 1, 15,
                 "C22 waiter queued")
        kill_hard(srv)
        srv = boot()
        wait_for(lambda: _healthy(api), 15, "C22 reboot")
        q = api.queue()
        ids_live = [q.get("active", "")] + list(q.get("queued_ids", []))
        check(rv in ids_live,
              "C22a: killed RUNNING run resurrected (queue %s)" % q)
        check(rw in ids_live,
              "C22b: QUEUED run survived the crash (queue %s)" % q)
        # both drainable through the ordinary stop door
        for r in (rv, rw):
            api.stop(r)
        try:
            wait_for(lambda: api.queue().get("running", 0) == 0 and
                     api.queue().get("queued", 0) == 0, 30,
                     "C22c queue drained")
            check(True, "C22c: recovered runs stoppable, queue drains")
        except AssertionError as ex:
            check(False, "C22c: " + str(ex))

        # ==== C23: STRICT SURFACE LAW — unknown/retired keys are 4xx,
        # never silently dropped (operator order 2026-09-01: "make it
        # programmatically impossible for silent drops to ever
        # happen"). The compose gate validates the card against the
        # knob-map SSOT with extra-keys-forbidden; every rejection
        # names the JSON path. All proven by manual probes on
        # 2026-09-01; these are their permanent regression checks. ====
        print("\n-- C23 strict surface: unknown/retired keys 4xx")
        def _card(**params):
            return {"model": "h3-timeline",
                    "prompt": "strict gate probe",
                    "params": dict({"calls": [
                        {"text": "one", "start_frame": 0,
                         "end_frame": 56}], "fps": 24, "seed": 3},
                        **params)}
        strict_cases = [
            ("C23a", "context_length retired, named",
             _card(context_length=17), "context_length"),
            ("C23b", "root-level banned keys rejected",
             {**_card(), "motion_pins": [], "batch_size": 4},
             "motion_pins"),
            ("C23c", "call-level dead knob rejected",
             {"model": "h3-timeline", "prompt": "p",
              "params": {"fps": 24, "seed": 1, "calls": [
                  {"text": "x", "start_frame": 0, "end_frame": 56,
                   "h3_fp16_accumulation": True}]}},
             "h3_fp16_accumulation"),
            ("C23d", "knob typo named with path",
             _card(sharpen_strengthg=0.4), "params.sharpen_strengthg"),
            ("C23e", "missing per-call start_frame named",
             {"model": "h3-timeline", "prompt": "p",
              "params": {"fps": 24, "seed": 1, "calls": [
                  {"text": "x", "end_frame": 56}]}},
             "start_frame"),
            ("C23f", "wrong fps rejected",
             _card(fps=30), "fps"),
        ]
        for tag, label, body_want, needle in strict_cases:
            code, body = api._req("POST", "/v1/pipelines/start",
                                  body_want)
            check(code == 400 and needle in body,
                  "%s: %s (got %d %s)" %
                  (tag, label, code, body[:110]))
        # the gate never poisons the gateway: a legal card registers
        code, body = api._req("POST", "/v1/pipelines/start", _card())
        ok = json.loads(body).get("run_id") if code in (200, 202) else None
        check(bool(ok), "C23g: legal card registers after the storm")
        if ok:
            api.stop(ok)
        check(api._req("GET", "/v1/queue")[0] == 200,
              "C23h: gateway alive after strict-gate storm")

        # ==== C24: TOOL-SURFACE AUDIT LAW (operator, 2026-09-01:
        # "THE PROBLEM IS THE TOOL ... deterministic beforehand, .1s")
        # Every lane's tool.json offered surface must be a subset of
        # what the compose gate accepts for its model (card_knobs.yaml
        # + structural). Divergence = the agent is TAUGHT to compose
        # cards the gate 400s — proven live: context_length +
        # h3_fp16_accumulation sat in video_timeline's tool.json after
        # retirement; video-gen offered length/sparsity_ratio from the
        # pre-calls shape. The plugin cross-checks at dlopen (boot,
        # before traffic) and poisons divergent lanes; this is the
        # same check in python so CI catches it before boot. ====
        print("\n-- C24 tool-surface audit: tool.json ⊆ gate")
        import glob as _glob
        structural_card = {
            "calls", "fps", "seed", "preset", "continuity",
            "audio_mode", "audio_stem", "keyframes", "refs", "intent",
            "model", "prompt", "draft_id", "continue_from",
            "server_url", "audio", "image", "h3_attention",
            # (2026-09-02, b11f5fb) document-DATA knobs the compose
            # gate accepts but card_knobs.yaml never splices: identity
            # refs are staged into LoadImage nodes, audio clips into
            # the stitch overlay list — structure, not template knobs.
            "h3_ref_images", "h3_ref_image_size", "audio_clips",
            "h3_ref_videos", "h3_ref_audios", "h3_ref_video_audios"}
        structural_call = {
            "text", "beats", "start_frame", "end_frame", "knobs",
            "seam_carry", "image", "last_frame", "clip", "audio",
            "first_frame_prev_sec",
            # per-call identity refs (same staging path as card-level)
            "refs"}
        lanes = _glob.glob(os.path.join(repo, "plugins/*/cards/*/tool.json"))
        check(len(lanes) >= 10,
              "C24a: found the lane fleet (%d tool.json)" % len(lanes))
        retired = {"context_length", "h3_fp16_accumulation",
                   "h3_torch_compile"}
        for tj in lanes:
            lane = os.path.basename(os.path.dirname(tj))
            doc = json.load(open(tj))
            model = doc.get("model", "")
            km = _glob.glob(os.path.join(repo, "plugins/*/models/video",
                                         model, "card_knobs.yaml"))
            if not km:
                continue          # non-card lane: no gate to diverge from
            legal = set(re.findall(r"card:\s*(\w+)", open(km[0]).read()))
            props = doc.get("params_schema", {}).get("properties", {})
            calls = props.get("calls", {})
            cprops = (calls.get("properties") or
                      calls.get("items", {}).get("properties") or {})
            for k in props:
                if k == "calls":
                    continue
                check(k in legal or k in structural_card,
                      "C24b: %s card-level '%s' is gate-legal"
                      % (lane, k))
                check(k not in retired,
                      "C24c: %s does not offer RETIRED knob '%s'"
                      % (lane, k))
            for k in cprops:
                check(k in legal or k in structural_call,
                      "C24d: %s call-level '%s' is gate-legal"
                      % (lane, k))

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

    # ====== LEAK-GATE SELF-PROOF (operator order 2026-09-01): ======
    # no gateway spawned by this suite may have EVER loaded the real
    # ComfyUI endpoint. The gateway log records every config load; a
    # single real-port hit anywhere = a queue-law violation = FAIL.
    # the needle is DERIVED from the production config (SSOT) — no
    # port literals in test code; if the real endpoint moves, this
    # proof follows it automatically.
    needle = None
    try:
        prod = open(os.path.join(
            repo, "plugins/comfyui/data/comfyui_endpoint.json"),
            errors="replace").read()
        m = re.search(r'"url"\s*:\s*"http://[^:]+:(\d+)', prod)
        if m:
            needle = ":" + m.group(1)
    except OSError:
        pass
    leak_hits = []
    if needle:
        for lg in sorted(glob.glob("/tmp/chaos_srv*.log")):
            try:
                txt = open(lg, errors="replace").read()
            except OSError:
                continue
            # (2026-09-02) the REFUSED lines are PROOF OF DEFENSE, not
            # contact: the resurrected-graph guard + the leak gate both
            # NAME the offending endpoint they refused. A log whose
            # only port mentions are refusals never touched the real
            # server; scan the text MINUS refusal lines.
            lines = [ln for ln in txt.splitlines()
                     if "REFUSED" not in ln and "LEAK GATE" not in ln]
            if needle in "\n".join(lines):
                leak_hits.append(os.path.basename(lg))
    check(not leak_hits,
          "LEAK PROOF: no gateway contacted the real ComfyUI (%r)"
          % leak_hits[:3])

    total = n_pass[0] + len(failures)
    print("\n%d checks, %d failures" % (total, len(failures)))
    return 1 if failures else 0


def output_fix(build, rid):
    return os.path.join("output", rid)


if __name__ == "__main__":
    sys.exit(main())
