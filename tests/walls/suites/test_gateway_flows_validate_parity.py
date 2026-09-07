#!/usr/bin/env python3
"""test_gateway_flows_validate_parity.py — POST /v1/flows/validate TS
parity wall (P4, validate-door stroke).

Proves the TypeScript validate door
(plugins/gateway/src/doors/flowsValidate.ts via the ctx.ts
_h_flows_validate arm) answers like the py gateway (py/gateway.py
_h_flows_validate, 2719-2890; resolve_request 279-336; strict body
248-277; R4.2 normalization; _adapt indent-2 serialization):

  BYTE legs (status + full response bytes identical): every routing
    arm ({model} / {flow} / {flow_inline} / bare), the strict-body
    refusals, flow_from_body construction refusals (extras, edges,
    kinds, branches, identifiers — including the pydantic-shape
    fakes for empty ids and the Stage _id_legal value_error), the
    batch rows, the comfyui pin sweep, the artifact-ref sweep, the
    cordis CLI compose arm (26 golden form-spec mids + the
    CLI-rim model_type refusal), and 200 compile views (including
    one per engine default_output, which pins ENGINE_TABLE
    behaviorally against py's scan_engines + DEFAULT_OUTPUT).
  CODE legs (status + code agree, text native by documented
    channel): the two non-cordis python compose arms
    (audio_cpp / anycreature return live graphs and
    python-schema texts the TS plane does not own in this stroke)
    and the interpreter-class 500s (TypeError texts differ).
    (autoremesher LEFT the code legs 2026-09-07 — the cpp→node
    cutover made it a cordis arm; its golden + bare bodies ride the
    byte legs now.)
  The 401 shape is asserted from the static literal (py in-process
    route() has no auth gate; the TS shape mirrors _adapt
    2607-2619, as the uploads wall does).

Dual-serve against the REAL repo tree (no hermetic REPO: the pin,
facts, model dirs, flows/ and the cordis CLI all live there): py
runs in-process through gateway.route (REPO source-anchored); the
TS server boots over HTTP with MELITE_REPO_ROOT scrubbed from
its env (parity needs it unset — py REPO knows no override) and
MELITE_STATE_ROOT pinned to scratch (the single-writer lock gate
refuses a wall boot on the estate root). DSH_GATEWAY_TOKEN is set
for the TS server
only; every TS call carries it (except the 401 leg).

DOCUMENTED non-goals (the door header + this wall say so, and the
wall EXCLUDES the inputs that would diverge):
  - non-cordis compose SUCCESS inputs (py 200s through the python
    schema arms, e.g. anycreature with a live spec; the TS stub
    400s — verdict differs by construction, unported half).
  - the card-requires gate (skipped; wall-pinned passing for every
    golden mid) and _route_stamp_overlay (stamp-equivalence: the
    overlay stamps family defaults the CLI merges anyway).
  - multi-token $params set order (hash-dependent in py);
    single-token legs only.

Run: python3 tests/walls/suites/test_gateway_flows_validate_parity.py
"""

import asyncio
import glob
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

from _anchor import REPO

sys.dont_write_bytecode = True
sys.path.insert(0, str(REPO / "py"))

import gateway as gwmod  # noqa: E402
from gateway import Gateway, route as py_route  # noqa: E402

PASS = FAIL = 0
BYTE_OK = CODE_OK = 0

TOKEN = "flows-validate-parity-token"
TS_SERVER = REPO / "plugins" / "gateway" / "src" / "server.ts"


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def py_wire(method: str, target: str, body: bytes) -> tuple[int, bytes]:
    """Fresh py expectation: live route() + R4.2 + _adapt serialization."""
    status, payload = asyncio.run(py_route(_GW, method, target, body))
    if 400 <= status < 500 and isinstance(payload, dict) \
            and "code" not in payload:
        payload["code"] = "invalid_request"
    return status, json.dumps(payload, indent=2, default=str).encode()


def ts_call(port: int, path: str, body: bytes = b"",
            content_type: str = "application/json",
            auth: str | None = TOKEN,
            method: str = "POST") -> tuple[int | None, bytes, str]:
    headers = {"Content-Type": content_type}
    if auth is not None:
        headers["Authorization"] = "Bearer " + auth
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path),
        data=body if method in ("POST", "PUT", "PATCH") else None,
        headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, r.read(), r.headers.get("content-type", "")
    except urllib.error.HTTPError as e:
        return e.code, e.read(), e.headers.get("content-type", "")
    except Exception as e:
        return None, b"", "transport: %s" % e


def boot_ts() -> tuple[int, "subprocess.Popen[str]"]:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("node not on PATH")
    env = dict(os.environ)
    # Parity needs these unset-or-equal (py REPO is
    # source-anchored and knows no override) — scrub, then prove.
    env.pop("MELITE_REPO_ROOT", None)
    # ...except STATE: the validate doors resolve artifact roots off
    # the source tree, but bootState still takes the single-writer
    # lock on the state root — a wall must never boot the estate
    # root (the live gateway holds its lock), so pin scratch.
    env["MELITE_STATE_ROOT"] = tempfile.mkdtemp(
        prefix="validate-parity-")
    env["DSH_GATEWAY_TOKEN"] = TOKEN
    proc = subprocess.Popen(
        [node, "--experimental-strip-types", str(TS_SERVER)],
        cwd=str(REPO), env=env,
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        text=True, start_new_session=True)
    assert proc.stdout is not None
    deadline = time.time() + 25
    while time.time() < deadline:
        line = proc.stdout.readline()
        if line.startswith("READY "):
            return int(line.split()[1]), proc
        if proc.poll() is not None:
            raise RuntimeError("ts server exited rc=%d" % proc.returncode)
    proc.terminate()
    raise RuntimeError("ts server did not print READY")


def doc_bytes(doc: object) -> bytes:
    return json.dumps(doc).encode()


# ── the corpus ───────────────────────────────────────────────────
# ("leg", kind, body) — kind "byte" (status + bytes) or "code"
# (status + code). Golden form-spec mids ride kind "byte", except
# the three python-arm mids (kind "code").
BYTE_BODIES: list[tuple[str, object]] = [
    ("nondict-list", [1, 2]),
    ("nondict-str", "x"),
    ("nodoor", {"hello": "world"}),
    ("ambiguous", {"model": "z-image", "flow": "x"}),
    ("ambig-model-inline", {"model": "z-image",
                            "flow_inline": {"id": "w", "stages": []}}),
    ("ambig-all", {"model": "z-image", "flow": "x",
                   "flow_inline": {"id": "w", "stages": []}}),
    ("flow-unknown", {"flow": "nope"}),
    ("flow-illegal", {"flow": "Bad!"}),
    ("flow-plus-stages", {"flow": "x", "stages": []}),
    ("model-nounit", {"model": "probe", "prompt": "x"}),
    ("model-illegal", {"model": "Bad!"}),
    ("model-null", {"model": None}),
    ("retired", {"model": "z-image", "pipe": "x"}),
    ("retired-runner", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui"}]}, "overrides": {}}),
    ("inline-noid", {"flow_inline": {"stages": [
        {"id": "a", "engine": "comfyui"}]}}),
    ("inline-nostages", {"flow_inline": {"id": "w"}}),
    ("inline-empty", {"flow_inline": {"id": "w", "stages": []}}),
    ("inline-unknown", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui"}], "zzz": 1}}),
    ("inline-extras", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui", "zzz": 1}]}}),
    ("inline-badedge", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui",
         "inputs": {"x": {"nope": 1}}}]}}),
    ("inline-badkind", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui", "outputs": {"o": "nope"}}]}}),
    ("inline-badwhen", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui",
         "skip_when": {"initial": "k", "when": "sometimes"}}]}}),
    ("inline-dup", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui"},
        {"id": "a", "engine": "comfyui"}]}}),
    ("inline-later", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui",
         "inputs": {"x": {"stage": "b", "output": "default"}},
         "expected": {"x": "image"}},
        {"id": "b", "engine": "comfyui"}]}}),
    ("inline-kindmm", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui", "outputs": {"o": "text"}},
        {"id": "b", "engine": "comfyui",
         "inputs": {"x": {"stage": "a", "output": "o"}},
         "expected": {"x": "image"}}]}}),
    ("inline-sym", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui",
         "inputs": {"x": {"initial": "k"}}}]}}),
    ("inline-unknowneng", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "nope"}]}}),
    ("inline-illegal-flow", {"flow_inline": {"id": "Bad!", "stages": [
        {"id": "a", "engine": "comfyui"}]}}),
    ("inline-illegal-stage", {"flow_inline": {"id": "w", "stages": [
        {"id": "Bad!", "engine": "comfyui"}]}}),
    ("inline-empty-stage", {"flow_inline": {"id": "w", "stages": [
        {"id": "", "engine": "comfyui"}]}}),
    ("inline-empty-id", {"flow_inline": {"id": "", "stages": [
        {"id": "a", "engine": "comfyui"}]}}),
    ("inline-empty-key", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui",
         "inputs": {"x": {"initial": ""}}}]}}),
    ("inline-card", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui", "card": "image-gen",
         "params": {"prompt": "x"}}]}}),
    ("inline-dollar", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui",
         "params": {"p": "$photo"}}]}}),
    ("inline-pin", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui",
         "params": {"workflow": {"X": {"class_type": "Nope"}}}}]}}),
    ("inline-branch", {"k": "v", "flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui",
         "skip_when": {"initial": "k", "when": "present"}},
        {"id": "b", "engine": "comfyui",
         "inputs": {"x": {"stage": "a", "output": "default"}},
         "expected": {"x": "image"}}]}}),
    ("inline-branch-absent", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui",
         "skip_when": {"initial": "k", "when": "present"}},
        {"id": "b", "engine": "comfyui",
         "inputs": {"x": {"stage": "a", "output": "default"}},
         "expected": {"x": "image"}}]}}),
    ("inline-allpruned", {"k": "v", "flow_inline": {"id": "w",
     "stages": [
        {"id": "a", "engine": "comfyui",
         "skip_when": {"initial": "k", "when": "present"}}]}}),
    ("inline-retries", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui", "retries": 3,
         "timeout_s": 30}]}}),
    ("inline-200", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui"}]}}),
    ("inline-200-wire", {"flow_inline": {"id": "w", "stages": [
        {"id": "gen", "engine": "comfyui", "outputs": {"pic": "image"}},
        {"id": "up", "engine": "sim",
         "inputs": {"t": {"stage": "gen", "output": "pic"}},
         "expected": {"t": "image"}}]}}),
    ("inline-defer", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui"},
        {"id": "b", "engine": "comfyui",
         "inputs": {"x": {"stage": "a", "output": "out"}},
         "expected": {"x": "image"}}]}}),
    ("params-int", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui", "params": 5}]}}),
    ("params-str", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui", "params": "xy"}]}}),
    ("params-pairs", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui", "params": [["a", "b"]]}]}}),
    ("inputs-int", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui", "inputs": 5}]}}),
    ("inputs-zero", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui", "inputs": 0}]}}),
    ("card-zero", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui", "card": 0}]}}),
    ("desc-null", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "comfyui", "description": None}]}}),
    ("id-null", {"flow_inline": {"id": "w", "stages": [
        {"id": None, "engine": "comfyui"}]}}),
    ("illegal-with-inputs", {"flow_inline": {"id": "w", "stages": [
        {"id": "Bad!", "engine": "comfyui",
         "inputs": {"x": {"initial": "k"}},
         "expected": {"x": "text"}}]}}),
    ("illegal-with-kind", {"flow_inline": {"id": "w", "stages": [
        {"id": "Bad!", "engine": "comfyui",
         "outputs": {"o": "image"}}]}}),
    ("stage-list-empty", {"flow_inline": {"id": "w", "stages": [[]]}}),
    ("dangle-missing", {"model": "z-image",
                        "input_image": "/v1/assets/runs/nope/x.png"}),
    ("dangle-traverse", {"model": "z-image",
                         "input_image": "/v1/assets/runs/../x.png"}),
    ("dangle-escape", {"model": "z-image",
                       "input_image": "/etc/hostname"}),
    ("rim", {"model": "z-image", "prompt": "x",
             "width": 1024.0, "height": 1024.0}),
    ("prompt-only", {"model": "z-image", "prompt": "x"}),
    ("krea-prompt", {"model": "krea-2", "prompt": "x"}),
    ("engine-anycreature", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "anycreature"}]}}),
    ("engine-audio-cpp", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "audio_cpp"}]}}),
    ("engine-autoremesher", {"flow_inline": {"id": "w", "stages": [
        # (2026-09-07: the engine retired with the cpp→node cutover
        # — this leg now pins the UNKNOWN-ENGINE refusal parity:
        # both sides 400 the retired type byte-identical.)
        {"id": "a", "engine": "autoremesher"}]}}),
    ("engine-sim", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "sim"}]}}),
    ("engine-skintokens", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "skintokens"}]}}),
    # (2026-09-07: the bare autoremesher model is a cordis arm now —
    # the missing-input refusal agrees byte-exact, so it rides here,
    # not in CODE_BODIES.)
    ("auto-bare", {"model": "autoremesher"}),
]

CODE_BODIES: list[tuple[str, object]] = [
    ("ace-bare", {"model": "ace-step-xl"}),
    ("any-bare", {"model": "anycreature"}),
    # (auto-bare MOVED to BYTE_BODIES 2026-09-07 — the autoremesher
    # model is a cordis arm now, refusal agrees byte-exact.)
]

STATUS_BODIES: list[tuple[str, object]] = [
    ("stage-list-extras",
     {"flow_inline": {"id": "w", "stages": [["zzz"]]}}),
    ("stage-list-int",
     {"flow_inline": {"id": "w", "stages": [[5]]}}),
]

# (autoremesher LEFT this tuple 2026-09-07 — the model is a cordis
# arm now, so its golden rides the byte legs like every other
# cordis mid.)
PYTHON_ARM_MIDS = ("ace-step-xl", "anycreature")

# One Gateway for the py side (200s read cost_preview off it; the
# fresh-gateway empty-queue shape is what both sides assert).
_GW = Gateway()


def main() -> int:
    try:
        port, proc = boot_ts()
    except RuntimeError as e:
        print("FATAL: %s" % e)
        return 1
    print("ts flows/validate on :%d (repo %s)" % (port, REPO))
    try:
        for name, body in BYTE_BODIES:
            exp_st, exp_b = py_wire("POST", "/v1/flows/validate",
                                    doc_bytes(body))
            got_st, got_b, ctype = ts_call(port, "/v1/flows/validate",
                                           doc_bytes(body))
            if got_st is None:
                check("byte %s transport" % name, False,
                      got_b.decode()[:120])
                continue
            ok = (got_st == exp_st and got_b == exp_b
                  and ctype.split(";")[0] == "application/json")
            check("byte %s" % name, ok,
                  "st %r/%r bytes %d/%d" % (got_st, exp_st,
                                            len(got_b), len(exp_b)))
            if ok:
                global BYTE_OK
                BYTE_OK += 1

        for pattern in sorted(glob.glob(str(
                REPO / "tests" / "golden_http" / "form-spec_model_*.json"))):
            spec = json.load(open(pattern))
            mid = spec["model"]
            body = {"model": mid}
            body.update(spec.get("defaults") or {})
            exp_st, exp_b = py_wire("POST", "/v1/flows/validate",
                                    doc_bytes(body))
            got_st, got_b, _ = ts_call(port, "/v1/flows/validate",
                                       doc_bytes(body))
            if got_st is None:
                check("golden %s transport" % mid, False,
                      got_b.decode()[:120])
                continue
            if mid in PYTHON_ARM_MIDS:
                try:
                    got_j = json.loads(got_b)
                    exp_j = json.loads(exp_b)
                except ValueError:
                    got_j = exp_j = {}
                ok = (got_st == exp_st == 400
                      and got_j.get("code") == exp_j.get("code")
                      == "card_compose")
                check("code golden:%s" % mid, ok,
                      "st %r/%r code %r/%r"
                      % (got_st, exp_st, (got_j or {}).get("code"),
                         (exp_j or {}).get("code")))
                continue
            ok = got_st == exp_st and got_b == exp_b
            check("byte golden:%s" % mid, ok,
                  "st %r/%r bytes %d/%d" % (got_st, exp_st,
                                            len(got_b), len(exp_b)))
            if ok:
                BYTE_OK += 1

        for name, body in CODE_BODIES:
            exp_st, exp_b = py_wire("POST", "/v1/flows/validate",
                                    doc_bytes(body))
            got_st, got_b, _ = ts_call(port, "/v1/flows/validate",
                                       doc_bytes(body))
            if got_st is None:
                check("code %s transport" % name, False,
                      got_b.decode()[:120])
                continue
            try:
                got_j = json.loads(got_b)
                exp_j = json.loads(exp_b)
            except ValueError:
                got_j = exp_j = {}
            ok = (got_st == exp_st == 400
                  and got_j.get("code") == exp_j.get("code")
                  == "card_compose")
            check("code %s" % name, ok,
                  "st %r/%r code %r/%r"
                  % (got_st, exp_st, (got_j or {}).get("code"),
                     (exp_j or {}).get("code")))

        for name, body in STATUS_BODIES:
            # Interpreter-class: py raises out of in-process route()
            # (production _adapt turns it into the 500); the TS
            # server's catch does the same over HTTP.
            try:
                exp_st, _ = py_wire("POST", "/v1/flows/validate",
                                    doc_bytes(body))
            except Exception:
                exp_st = 500
            got_st, _, _ = ts_call(port, "/v1/flows/validate",
                                   doc_bytes(body))
            check("status %s" % name, got_st == exp_st == 500,
                  "st %r/%r" % (got_st, exp_st))

        got_st, got_b, _ = ts_call(port, "/v1/flows/validate", b"{nope")
        try:
            got_j = json.loads(got_b)
        except ValueError:
            got_j = {}
        check("shape bad-json",
              got_st == 400 and got_j.get("code") == "bad_json"
              and str(got_j.get("error", "")).startswith("bad JSON: "),
              "st %r body %r" % (got_st, got_b[:100]))

        # The 401 shape, byte-compared against the _adapt literal
        # (py in-process route() has no auth gate; the uploads wall's
        # py_401_bytes convention — the body carries no code).
        want_401 = json.dumps({
            "error": "unauthorized: missing or invalid bearer token "
                     "(Authorization: Bearer <token>; set "
                     "DSH_GATEWAY_TOKEN to enable)"}, indent=2).encode()
        got_st, got_b, _ = ts_call(port, "/v1/flows/validate",
                                   doc_bytes({"model": "z-image"}),
                                   auth=None)
        try:
            got_j = json.loads(got_b)
        except ValueError:
            got_j = {}
        check("byte 401",
              got_st == 401 and got_b == want_401,
              "st %r body %r" % (got_st, got_b[:120]))

        print("summary: %d byte-equal, %d code-equal, %d pass %d fail"
              % (BYTE_OK, CODE_OK, PASS, FAIL))
        return 1 if FAIL else 0
    finally:
        proc.terminate()


if __name__ == "__main__":
    sys.exit(main())
