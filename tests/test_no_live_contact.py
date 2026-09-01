#!/usr/bin/env python3
"""LEAK GATE PROOF (operator order, 2026-09-01: "no leaks, via proof
and gates").

Three independent proofs that no test may ever reach the REAL ComfyUI:

  G1 (runtime refusal)  a gateway booted with INFERENCE_TEST_SANDBOX=1
                        but NO COMFYUI_ENDPOINT_CONFIG refuses to load
                        ANY endpoint: its log carries the LEAK GATE
                        line, and a card run FAILS LOUDLY with a named
                        error (no default fallback, no real contact).

  G2 (static spawn gate) every gateway spawn in every test file must
                        pass env= carrying INFERENCE_TEST_SANDBOX=1
                        (mandatory: the runtime proof-of-fake gate then
                        refuses every non-fake endpoint) — the chaos
                        boot() leak AND the card_recovery config leak
                        class (bare-env rebooted gateways) can never
                        come back silently.

  G3 (real-port scan)   the string :18465 (the live ComfyUI port) may
                        appear in NO test file outside comments.

Exit code 0 = all gates green. Any FAIL is a hard error.
"""
import os
import re
import subprocess
import sys
import tempfile
import time
import urllib.request
import json

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(REPO, "build")
BIN = os.path.join(BUILD, "inference_cli")
TESTS = os.path.join(REPO, "tests")
# The forbidden endpoint is DERIVED from the production config — the
# single source of truth. If the operator moves the real server, this
# gate follows it; no port literals anywhere in test code.
def _real_port_from_config():
    try:
        cfg = open(os.path.join(
            REPO, "plugins/comfyui/data/comfyui_endpoint.json"),
            errors="replace").read()
        m = re.search(r'"url"\s*:\s*"http://[^:]+:(\d+)', cfg)
        return ":" + m.group(1) if m else None
    except OSError:
        return None

REAL_PORT = _real_port_from_config()

n_pass = 0
failures = []


def check(cond, label):
    global n_pass
    print(("  PASS  " if cond else "  FAIL  ") + label)
    if cond:
        n_pass += 1
    else:
        failures.append(label)


def free_port():
    import socket
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


print("== G1: sandbox gateway refuses on-disk endpoint fallback")
port = free_port()
log = tempfile.NamedTemporaryFile(
    prefix="leakgate_g1_", suffix=".log", delete=False).name
env = dict(os.environ)
env["INFERENCE_TEST_SANDBOX"] = "1"
env.pop("COMFYUI_ENDPOINT_CONFIG", None)          # the leak scenario
srv = subprocess.Popen(
    [BIN, "serve", "--port", str(port), "--plugin-dir", BUILD],
    cwd=BUILD, stdout=subprocess.DEVNULL,
    stderr=open(log, "ab"), env=env)
try:
    up = False
    for _ in range(60):
        try:
            urllib.request.urlopen(
                "http://127.0.0.1:%d/v1/queue" % port, timeout=2)
            up = True
            break
        except Exception:
            time.sleep(0.5)
    check(up, "G1: sandbox gateway boots (the gate must not crash it)")
    # (the config loader is lazy — it runs at first compose/node load,
    # so the LEAK GATE line is asserted AFTER the probe below)
    # a COMFY run must fail LOUDLY, not render on a default endpoint:
    # explicit one-node pipeline (queue lane law: {pipeline:{steps}}),
    # no inline server_url — exactly the shape that used to silently
    # resolve the real ComfyUI from the on-disk default config.
    # a minimal CARD (the exact lane that splices the global endpoint
    # into its graph — the historical leak vector)
    with open(os.path.join(BUILD, "drafts", "_leakgate_card.json"),
              "w") as f:
        json.dump({"draft_id": "_leakgate_card",
                   "intent": "leak gate probe",
                   "stages": [{"id": "compose", "title": "leakgate",
                               "kind": "card", "service": "h3-timeline",
                               "params": {"calls": [
                                   {"text": "w0", "start_frame": 0,
                                    "end_frame": 56}],
                                   "fps": 24, "seed": 5},
                               "inputs": [],
                               "provenance": "leak-gate"}],
                   "status": "ready"}, f)
    req = urllib.request.Request(
        "http://127.0.0.1:%d/v1/pipelines/start" % port,
        data=json.dumps({"model": "h3-timeline",
                         "draft_id": "_leakgate_card",
                         "prompt": "leak gate probe"}).encode(),
        headers={"Content-Type": "application/json"})
    code, body = 0, ""
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            code, body = r.status, r.read().decode(errors="replace")
    except urllib.error.HTTPError as e:
        code, body = e.code, e.read().decode(errors="replace")
    except Exception:
        pass
    logtxt = open(log, errors="replace").read()
    check("LEAK GATE" in logtxt,
          "G1: log carries the LEAK GATE refusal line (after node load)")
    # PROOF: the card was REFUSED before registration (no run_id, no
    # submit) by one of the lane's loud compose laws — the empty
    # endpoint/input_dir is the direct consequence of the gate
    # refusing the on-disk fallback. A 2xx here would mean a render
    # escaped toward the real server.
    refused = (code in (400, 422, 500, 503)
               and "run_id" not in body)
    check(refused,
          "G1: card refused loudly, NO run registered (got %d %.90s)"
          % (code, body))
    check(not REAL_PORT or (REAL_PORT not in logtxt
                            and REAL_PORT not in body),
          "G1: real port appears in neither log nor error")
finally:
    srv.terminate()
    try:
        srv.wait(timeout=10)
    except Exception:
        srv.kill()

print("== G2: every test gateway spawn carries an endpoint environment")
spawn_re = re.compile(r'subprocess\.(?:Popen|run)\s*\(', re.S)


def call_body(src, start):
    """balanced-paren argument body of the call opening at `start`."""
    depth, i = 0, start
    while i < len(src):
        c = src[i]
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return src[start:i]
        i += 1
    return src[start:start + 400]


ok_all, bad = True, []
for fn in sorted(os.listdir(TESTS)):
    if not fn.endswith(".py"):
        continue
    src = open(os.path.join(TESTS, fn), errors="replace").read()
    # names of env dicts this file BUILDS with the SANDBOX key —
    # mandatory since 2026-09-01: a bare COMFYUI_ENDPOINT_CONFIG env
    # could still NAME the real endpoint (card_recovery leaked exactly
    # that way for 18 renders). With INFERENCE_TEST_SANDBOX=1 the
    # engine's proof-of-fake gate refuses every endpoint that does not
    # answer /object_info with X-Melite-Test-Fake — real ComfyUI can
    # never pass it, so a sandboxed test gateway cannot render on the
    # GPU even by explicitly naming it.
    builders = set(re.findall(
        r'(\w+)\s*\[[^\]]*["\']INFERENCE_TEST_SANDBOX["\']\]', src))
    builders |= set(re.findall(
        r'(\w+)\s*=\s*\{[^}]*["\']INFERENCE_TEST_SANDBOX["\']', src))
    for m in spawn_re.finditer(src):
        seg = call_body(src, m.start())
        if '"serve"' not in seg and "'serve'" not in seg:
            continue                    # not a gateway spawn
        em = re.search(r'env\s*=\s*(\w+)', seg)
        inline = "INFERENCE_TEST_SANDBOX" in seg
        if not ((em and (inline or em.group(1) in builders)) or inline):
            ok_all = False
            bad.append("%s:%d" % (fn, src[:m.start()].count("\n") + 1))
check(ok_all, "G2: all gateway spawns isolate the endpoint (%r)" % bad[:4])

print("== G3: the real ComfyUI port never appears in test code")
g3, bad3 = True, []
for fn in sorted(os.listdir(TESTS)):
    if not fn.endswith(".py") or fn == os.path.basename(__file__):
        continue
    for i, ln in enumerate(open(os.path.join(TESTS, fn),
                                errors="replace"), 1):
        code_ln = ln.split("#")[0]
        if REAL_PORT and REAL_PORT in code_ln:
            g3 = False
            bad3.append("%s:%d" % (fn, i))
check(g3, "G3: real port absent from executable test code (%r)" % bad3[:3])

print("\n%d checks, %d failures" % (n_pass, len(failures)))
sys.exit(1 if failures else 0)
