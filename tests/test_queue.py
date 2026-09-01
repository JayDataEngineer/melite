#!/usr/bin/env python3
"""Black-box regression tests for the GPU FIFO ticket queue (src/server.cpp).

Covers the invariants documented in docs/queue-audit-fixes.md:

  1. FIFO serialization        - /v1/queue never reports running > 1
  2. stop-while-queued (H2)    - instant stop, queued run never executes
  3. slot-recycle integrity(H1)- a run recycling a stopped-while-queued
                                 slot executes with ITS OWN prompt only
  4. SSE telemetry (M3)        - /v1/events reports the real ticket depth
  5. drain invariant (M2)      - no ghost "queued" entries after activity

Boots the real inference_cli server plus a fake ComfyUI HTTP endpoint that
records every POSTed workflow body, so prompt-bleed across recycled slots
is directly observable. Stdlib only.

Usage: test_queue.py --repo-dir REPO --build-dir BUILD
"""

import argparse
import signal as _sig
import http.client
import json
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PROMPTS = []            # recorded /prompt bodies, in order
PROMPTS_LOCK = threading.Lock()
HOLD_DELAY = 1.2        # seconds the fake comfy holds each /prompt
INTERRUPTS = []         # recorded /hold/interrupt POSTs (stop-door proof)

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


class FakeComfy(BaseHTTPRequestHandler):
    def _reply(self, code, body=b"{}"):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("X-Melite-Test-Fake", "1")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0) or 0)
        body = self.rfile.read(n).decode("utf-8", "replace")
        if self.path == "/prompt":
            with PROMPTS_LOCK:
                PROMPTS.append(body)
            time.sleep(HOLD_DELAY)
            self.send_response(500)  # node fails fast after the hold
            self.end_headers()
        elif self.path == "/err/prompt":
            # F26 fixture: error text WITH double quotes, no prompt_id
            self._reply(200, b'{"error":"missing \\"context_steps\\" '
                             b'for H3 node (quoted text)"}')
        elif self.path == "/hold/prompt":
            # stop-door fixture: instant submit, poll never completes
            self._reply(200, b'{"prompt_id":"hold-fake-0001"}')
        elif self.path == "/hold/interrupt":
            INTERRUPTS.append(time.time())
            self._reply(200)
        else:                        # /free etc.
            self.send_response(200)
            self.end_headers()

    def do_GET(self):
        if self.path == "/object_info":
            # node-manifest fidelity: the gateway pre-validates every
            # workflow class_type against /object_info before a run
            # registers — the fake must speak it too.
            self._reply(200, json.dumps(OBJECT_INFO).encode())
            return
        if self.path.startswith("/hold/history"):
            self._reply(200, b"{}")   # never completes -> plugin polls
            return
        self.send_response(404)
        self.end_headers()

    def log_message(self, *a):
        pass


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


class Api:
    def __init__(self, base):
        self.base = base

    def _req(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data,
                                     method=method)
        if data:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                return r.status, r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode("utf-8", "replace")

    def queue(self):
        _, body = self._req("GET", "/v1/queue")
        return json.loads(body)

    def submit(self, prompt):
        _, body = self._req("POST", "/v1/pipelines/start",
                            {"yaml": "_queue_test", "prompt": prompt})
        return json.loads(body)["run_id"]

    def submit_yaml(self, yaml_name, prompt):
        _, body = self._req("POST", "/v1/pipelines/start",
                            {"yaml": yaml_name, "prompt": prompt})
        return json.loads(body)["run_id"]

    def status(self, rid):
        _, body = self._req("GET", "/v1/pipelines/status/" + rid)
        return json.loads(body)

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


def tstatus(api, rid):
    # terminal status as a dict (truthy only when terminal) for wait_for
    s = api.status(rid)
    return s if terminal(s) else None


def terminal(st):
    # wire vocabulary: success->completed, error->failed (server.cpp wire_state)
    return st.get("status") in ("success", "completed", "error", "failed",
                                "stopped")


def sse_first_status(host, port):
    """Read the start of /v1/events and return the buffered text."""
    conn = http.client.HTTPConnection(host, port, timeout=2.5)
    conn.request("GET", "/v1/events")
    resp = conn.getresponse()
    buf = b""
    try:
        while b"queue_remaining" not in buf and len(buf) < 8192:
            chunk = resp.read(256)
            if not chunk:
                break
            buf += chunk
    except (socket.timeout, TimeoutError):
        pass
    conn.close()
    return buf.decode("utf-8", "replace")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-dir", required=True)
    ap.add_argument("--build-dir", required=True)
    args = ap.parse_args()
    repo = os.path.abspath(args.repo_dir)
    build_object_info(repo)
    build = os.path.abspath(args.build_dir)
    fixture = os.path.join(repo, "pipelines", "_queue_test")
    binpath = os.path.join(build, "inference_cli")
    if not os.path.exists(binpath):
        print("FAIL: inference_cli not built - refusing to pass green on a skip (silent-drop audit F8)"); return 1

    comfy = ThreadingHTTPServer(("127.0.0.1", 0), FakeComfy)
    comfy_port = comfy.server_address[1]
    threading.Thread(target=comfy.serve_forever, daemon=True).start()

    os.makedirs(fixture, exist_ok=True)
    with open(os.path.join(fixture, "pipeline.yaml"), "w") as f:
        f.write(
            "name: _queue_test\n"
            "description: \"queue regression fixture - fake comfyui\"\n"
            "nodes:\n"
            "  - id: generate\n"
            "    type: comfyui\n"
            "    input_from:\n"
            "      - __initial__.$prompt\n"
            "    params: {\"server_url\":\"http://127.0.0.1:%d\","
            "\"workflow_file\":\"../pipelines/sprite-sheet/workflow.json\","
            "\"out_dir\":\"./output\",\"timeout_s\":30,"
            "\"inject\":{\"CLIPTextEncode.0.text\":\"$prompt\"}}\n"
            % comfy_port)

    # (audit round 2 fixtures) error-quoting + stop-door pipelines
    for nm, url_suffix, extra in (
            ("_queue_test_err", "/err", ""),
            ("_queue_test_hold", "/hold", "")):
        d = os.path.join(repo, "pipelines", nm)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "pipeline.yaml"), "w") as f:
            f.write(
                "name: %s\n" % nm +
                "description: \"queue regression fixture %s\"\n" % nm +
                "nodes:\n"
                "  - id: generate\n"
                "    type: comfyui\n"
                "    input_from:\n"
                "      - __initial__.$prompt\n"
                "    params: {\"server_url\":\"http://127.0.0.1:%d%s\","
                "\"workflow_file\":\"../pipelines/sprite-sheet/"
                "workflow.json\",\"out_dir\":\"./output\","
                "\"timeout_s\":30%s}\n"
                % (comfy_port, url_suffix, extra))

    port = free_port()
    # (leak gate) the gateway's ONLY endpoint is this suite's own fake
    # comfy — the on-disk default (real ComfyUI) is refused by the
    # sandbox flag. Runs below pass inline server_url anyway.
    qcfg = "/tmp/queue_endpoint_%d.json" % port
    with open(qcfg, "w") as f:
        json.dump({"url": "http://127.0.0.1:%d" % comfy_port}, f)
    qenv = dict(os.environ)
    qenv["COMFYUI_ENDPOINT_CONFIG"] = qcfg
    qenv["INFERENCE_TEST_SANDBOX"] = "1"
    srv = subprocess.Popen(
        [binpath, "serve", "--port", str(port), "--plugin-dir", build],
        cwd=build,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=qenv)
    api = Api("http://127.0.0.1:%d" % port)
    run_ids = []
    failures = []

    n_pass = [0]

    def check(cond, label):
        print(("  PASS  " if cond else "  FAIL  ") + label)
        if cond:
            n_pass[0] += 1
        else:
            failures.append(label)

    try:
        wait_for(lambda: _healthy(api), 15, "server boot")
        print("server up on :%d, fake comfy on :%d" % (port, comfy_port))

        # ---- 1+2: FIFO serialization + stop-while-queued ----------
        a = api.submit("hold-alpha"); run_ids.append(a)
        wait_for(lambda: api.queue().get("running") == 1, 15, "A running")
        b = api.submit("beta-stale"); run_ids.append(b)
        c = api.submit("gamma-stale"); run_ids.append(c)

        samples = []
        for _ in range(18):               # ~2.7s of the hold window
            samples.append(api.queue())
            time.sleep(0.15)
        check(all(s.get("running", 0) <= 1 for s in samples),
              "FIFO: running never exceeds 1 (%d samples)" % len(samples))
        check(any(s.get("queued") == 2 for s in samples),
              "FIFO: queued==2 observed while A holds the ticket")

        code, body = api.stop(b)
        check(code == 200 and "stopped" in body,
              "stop-while-queued: 200 stopped (%s)" % body.strip())
        q = api.queue()
        check(q.get("queued") == 1 and q.get("running") == 1,
              "queue after stop: queued==1 running==1 (%s)" % q)
        code2, _ = api.stop(b)
        check(code2 == 400, "second stop refused with 400")

        for rid in (a, c):
            wait_for(lambda r=rid: terminal(api.status(r)), 45,
                     "run %s terminal" % rid)
        bs = api.status(b)
        stage0 = (bs.get("stages") or [{}])[0]
        check(bs.get("status") == "stopped" and
              stage0.get("state") not in ("running", "completed", "failed"),
              "stopped run never executed (stage=%r)" % stage0.get("state"))
        with PROMPTS_LOCK:
            check(all("beta-stale" not in p for p in PROMPTS),
                  "stopped run never reached the engine (no POST carries it)")

        # ---- 3: SSE reports the real depth (M3) -------------------
        d = api.submit("hold-delta"); run_ids.append(d)
        wait_for(lambda: api.queue().get("running") == 1, 15, "D running")
        e = api.submit("echo-queued"); run_ids.append(e)
        wait_for(lambda: api.queue().get("queued") == 1, 10, "E queued")
        sse = sse_first_status("127.0.0.1", port)
        check('"queue_remaining":2' in sse,
              "SSE status carries real depth (got: %r)" %
              sse[sse.find("status"):sse.find("status") + 60])
        api.stop(e)
        wait_for(lambda: terminal(api.status(d)), 45, "D terminal")

        # ---- 4: slot-recycle prompt integrity (H1) ----------------
        # All slots drained now; the next submission recycles the
        # stopped-while-queued slot (or an errored one). Either way its
        # node POST must carry ONLY its own prompt.
        wait_for(lambda: (lambda q: q.get("queued") == 0 and
                          q.get("running") == 0 and
                          q.get("active") == "")(api.queue()),
                 20, "queue fully drained")
        time.sleep(0.6)                   # let the last thread mark th_done
        with PROMPTS_LOCK:
            before = len(PROMPTS)
        f = api.submit("fresh-bravo"); run_ids.append(f)
        wait_for(lambda: terminal(api.status(f)), 45, "F terminal")
        with PROMPTS_LOCK:
            # plugin retries the submit once -> up to 2 POSTs per run
            check(len(PROMPTS) >= before + 1,
                  "recycled-slot run reached the engine (new POST recorded)")
            last = PROMPTS[-1] if PROMPTS else ""
        check("fresh-bravo" in last,
              "recycled-slot run carries ITS OWN prompt")
        check("beta-stale" not in last and "gamma-stale" not in last,
              "no stale prompt bleeds into the recycled slot")

        # ---- 5: no ghost queued entries (M2) ----------------------
        time.sleep(1.0)
        q = api.queue()
        check(q.get("queued") == 0 and q.get("running") == 0 and
              q.get("active") == "" and q.get("queued_ids") == [],
              "drain invariant: queue empty and no ghosts (%s)" % q)

        # ---- 6: M4 strict submission order -------------------------
        # tickets are assigned AT REGISTRATION: three quick submissions
        # must reach the engine in exactly submission order.
        with PROMPTS_LOCK:
            base = len(PROMPTS)
        o1 = api.submit("order-one");   run_ids.append(o1)
        o2 = api.submit("order-two");   run_ids.append(o2)
        o3 = api.submit("order-three"); run_ids.append(o3)
        for rid in (o1, o2, o3):
            wait_for(lambda r=rid: terminal(api.status(r)), 45,
                     "order run %s terminal" % rid)
        time.sleep(0.5)
        with PROMPTS_LOCK:
            tail = [b for b in PROMPTS[base:]]
        def first_ix(name):
            for i, b in enumerate(tail):
                if name in b:
                    return i
            return -1
        i1, i2, i3 = first_ix("order-one"), first_ix("order-two"), \
            first_ix("order-three")
        order_ok = i1 >= 0 and i2 > i1 and i3 > i2
        check(order_ok,
              "M4: submissions reach the engine in submission order "
              "(tail=%d)" % len(tail))

        # ---- 7: F3/F5 stop door reaches INTO a render --------------
        h = api.submit_yaml("_queue_test_hold", "hold-stop-door")
        run_ids.append(h)
        wait_for(lambda: api.queue().get("running") == 1, 15,
                 "hold run running")
        time.sleep(0.8)                     # inside the poll loop
        t0 = time.time()
        code, _ = api._req("POST", "/v1/pipelines/stop/" + h)
        st = wait_for(lambda: tstatus(api, h), 20, "hold stopped")
        latency = time.time() - t0
        check(code == 200 and st and st.get("status") == "stopped",
              "stop door: run stopped mid-render (status=%s)" %
              (st or {}).get("status"))
        check(latency < 10.0,
              "stop door lands fast: %.1fs (<10s, was 300s timeout)" % latency)
        check(len(INTERRUPTS) >= 1,
              "stop door POSTed /interrupt to the executor (%d seen)" %
              len(INTERRUPTS))

        # ---- 8: F26 exact errors stay JSON-parseable ---------------
        q1 = api.submit_yaml("_queue_test_err", "quoted-error-run")
        run_ids.append(q1)
        st = wait_for(lambda: tstatus(api, q1), 45, "err run terminal")
        check(st is not None,
              "F26: status parses even with quoted error text")
        if st:
            check("quoted text" in (st.get("error") or ""),
                  "F26: exact quoted error preserved (%r)" %
                  (st.get("error") or "")[:60])
        sc_path = os.path.join(build, "output", q1, "_pipeline.json")
        try:
            with open(sc_path) as f:
                sc = json.load(f)
            check(sc.get("status") in ("error", "failed") and
                  "context_steps" in (sc.get("error") or ""),
                  "F26: sidecar parses and carries the exact quoted error "
                  "(status=%r error=%r)" % (sc.get("status"),
                                            (sc.get("error") or "")[:90]))
        except Exception as e:
            check(False, "F26: sidecar parses (%s)" % e)
        # queue continues after the failure (resilience law)
        q2 = api.submit("after-error-continues"); run_ids.append(q2)
        wait_for(lambda: tstatus(api, q2), 45, "post-error run")
        check(True, "queue continues after a failing run")

        # ---- 9: F13 SIGTERM marks active runs stopped ---------------
        global HOLD_DELAY
        HOLD_DELAY = 3.0
        g = api.submit_yaml("_queue_test_hold", "sigterm-mid-run")
        run_ids.append(g)
        wait_for(lambda: api.queue().get("running") == 1, 15, "G running")
        srv.send_signal(_sig.SIGTERM)
        try:
            srv.wait(timeout=10)
            exited_clean = True
        except subprocess.TimeoutExpired:
            exited_clean = False
        check(exited_clean, "F13: gateway exits cleanly on SIGTERM")
        sc_path = os.path.join(build, "output", g, "_pipeline.json")
        try:
            with open(sc_path) as f:
                sc = json.load(f)
            check(sc.get("status") == "stopped" and
                  "shutdown" in (sc.get("error") or ""),
                  "F13: mid-run sidecar says stopped+reason (%s|%r)" %
                  (sc.get("status"), (sc.get("error") or "")[:40]))
        except Exception as e:
            check(False, "F13: sidecar readable after SIGTERM (%s)" % e)

        # ---- 10: F7 boot sweep + idempotence ------------------------
        stale = "run-boot-sweep-fixture"
        stale_dir = os.path.join(build, "output", stale)
        os.makedirs(stale_dir, exist_ok=True)
        with open(os.path.join(stale_dir, "_pipeline.json"), "w") as f:
            f.write('{"run_id":"%s","status":"running","stages":'
                    '[{"id":"x","status":"running"}]}' % stale)

        def _swept_now():
            try:
                with open(os.path.join(build, "output",
                                       "_ledger.jsonl")) as f:
                    return sum(1 for line in f if '"run.swept"' in line
                               and stale in line)
            except FileNotFoundError:
                return 0

        swept_before = _swept_now()
        srv = subprocess.Popen(          # restart after SIGTERM above
            [binpath, "serve", "--port", str(port), "--plugin-dir", build],
            cwd=build, stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL, env=qenv)
        wait_for(lambda: _healthy(api), 15, "server reboot")
        try:
            with open(os.path.join(stale_dir, "_pipeline.json")) as f:
                sc = json.load(f)
            check(sc.get("status") == "failed" and
                  sc.get("stages", [{}])[0].get("status") == "failed" and
                  "sweep" in sc,
                  "F7: boot sweep patched top+stage to failed with note")
        except Exception as e:
            check(False, "F7: swept sidecar parses (%s)" % e)
        srv.terminate()
        try:
            srv.wait(timeout=5)
        except subprocess.TimeoutExpired:
            srv.kill()
        srv = subprocess.Popen(
            [binpath, "serve", "--port", str(port), "--plugin-dir", build],
            cwd=build, stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL, env=qenv)
        wait_for(lambda: _healthy(api), 15, "server reboot 2")
        ledger = os.path.join(build, "output", "_ledger.jsonl")

        def swept_entries():
            try:
                with open(ledger) as f:
                    return sum(1 for line in f if '"run.swept"' in line
                               and stale in line)
            except FileNotFoundError:
                return 0

        check(swept_entries() - swept_before == 1,
              "F7: sweep idempotent - exactly 1 new ledger entry (%d)" %
              (swept_entries() - swept_before))

    except AssertionError as ex:
        failures.append(str(ex))
        print("  FAIL  " + str(ex))
    finally:
        srv.terminate()
        try:
            srv.wait(timeout=5)
        except subprocess.TimeoutExpired:
            srv.kill()
        comfy.shutdown()
        shutil.rmtree(fixture, ignore_errors=True)
        for rid in run_ids:
            shutil.rmtree(os.path.join(build, "output", rid),
                          ignore_errors=True)
        shutil.rmtree(os.path.join(build, "output", "run-boot-sweep-fixture"),
                      ignore_errors=True)
        for nm in ("_queue_test_err", "_queue_test_hold"):
            shutil.rmtree(os.path.join(repo, "pipelines", nm),
                          ignore_errors=True)

    print("\n%d checks, %d failures" % (n_pass[0] + len(failures), len(failures)))
    return 1 if failures else 0


def _healthy(api):
    try:
        api.queue()
        return True
    except Exception:
        return False


if __name__ == "__main__":
    sys.exit(main())
