#!/usr/bin/env python3
"""test_gateway_flows_validate_parity.py — POST /v1/flows/validate TS
wall (P4, validate-door stroke), TS-ONLY.

Pins the TypeScript validate door
(packages/gateway-doors/src/doors/flowsValidate.ts via the ctx.ts
_h_flows_validate arm):

  BYTE legs (status + full response bytes pin the frozen goldens in
    golden_ts/test_gateway_flows_validate_parity/): every routing
    arm ({model} / {flow} / {flow_inline} / bare), the strict-body
    refusals, flow_from_body construction refusals (extras, edges,
    kinds, branches, identifiers — including the pydantic-shape
    fakes for empty ids and the Stage _id_legal value_error), the
    comfyui pin sweep, the artifact-ref sweep, the cordis CLI
    compose arm (31 golden form-spec mids), and 200 compile views
    (including one per engine default_output, which pins
    ENGINE_TABLE behaviorally).
  SHAPE legs (status + shape literals, never bytes): the two
    interpreter-class 500s (the 500 body's traceback embeds the
    host checkout path — status + error text only) and the bad-JSON
    refusal (V8 parser text — status + code + prefix only).
  The 401 shape is asserted from the static literal.

The TS server boots over HTTP with MELITE_REPO_ROOT scrubbed from
its env and MELITE_STATE_ROOT pinned to scratch (the single-writer
lock gate refuses a wall boot on the estate root). DSH_GATEWAY_TOKEN
is set for the TS server only; every TS call carries it (except the
401 leg).

DOCUMENTED non-goals (the door header + this wall say so, and the
wall EXCLUDES the inputs that would diverge):
  - non-cordis compose SUCCESS inputs (py 200s through retired
    schema arms, e.g. anycreature with a live spec; the TS stub
    400s — verdict differs by construction, unported half).
  - the card-requires gate (skipped; wall-pinned passing for every
    golden mid) and _route_stamp_overlay (stamp-equivalence: the
    overlay stamps family defaults the CLI merges anyway).
  - multi-token $params set order (hash-dependent); single-token
    legs only.

ORACLE DEATH 2026-09-08: re-derived TS-ONLY — the py-mirror legs
(live py dispatcher expectations served in-process) are deleted per
the operator order "we do not need parity, we need to migrate, not
keep the old machinery"; the TS-SSOT golden + shape legs below are
the wall now. (autoremesher LEFT the code legs 2026-09-07 — the
cpp→node cutover made it a cordis arm; its golden + bare bodies
ride the byte legs now.)

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Run: python3 tests/walls/suites/test_gateway_flows_validate_parity.py
"""

import glob
import json
import os
import sys
import urllib.error
import urllib.request

from _anchor import REPO, boot_scratch_gateway, reap_gateway

sys.dont_write_bytecode = True

PASS = FAIL = 0
BYTE_OK = 0

TOKEN = "flows-validate-parity-token"
TS_SERVER = REPO / "apps" / "gateway" / "src" / "main.ts"
GOLDEN_DIR = (REPO / "tests" / "walls" / "suites" / "golden_ts" /
              "test_gateway_flows_validate_parity")


def check(name: str, ok: bool, note: str = "") -> None:
    global PASS, FAIL
    print("  %-4s %s%s" % ("ok" if ok else "FAIL", name,
                           (" — " + note) if (note and not ok) else ""))
    PASS, FAIL = PASS + (1 if ok else 0), FAIL + (0 if ok else 1)


def golden(name: str) -> bytes:
    return (GOLDEN_DIR / name).read_bytes()


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


def doc_bytes(doc: object) -> bytes:
    return json.dumps(doc).encode()


# ── the corpus ───────────────────────────────────────────────────
# ("leg", body) — every leg pins status + full response bytes
# against the frozen goldens. Golden form-spec mids ride the byte
# legs too (no model keeps a non-TS schema arm anymore).
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
        # — this leg pins the UNKNOWN-ENGINE refusal: the door 400s
        # the retired type, golden bytes.)
        {"id": "a", "engine": "autoremesher"}]}}),
    ("engine-sim", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "sim"}]}}),
    ("engine-skintokens", {"flow_inline": {"id": "w", "stages": [
        {"id": "a", "engine": "skintokens"}]}}),
    # (2026-09-07: the bare autoremesher model is a cordis arm now —
    # the missing-input refusal rides here, golden bytes.)
    ("auto-bare", {"model": "autoremesher"}),
    # (RE-DERIVED 2026-09-08: ace-step-xl + anycreature MOVED HERE —
    # their engines are QUARANTINED to vendor/retired-engines
    # (mono-engine law, operator order 2026-09-08); the TS door
    # refuses byte-exact, like auto-bare before them.)
    ("ace-bare", {"model": "ace-step-xl"}),
    ("any-bare", {"model": "anycreature"}),
]

STATUS_BODIES: list[tuple[str, object]] = [
    ("stage-list-extras",
     {"flow_inline": {"id": "w", "stages": [["zzz"]]}}),
    ("stage-list-int",
     {"flow_inline": {"id": "w", "stages": [[5]]}}),
]


def main() -> int:
    import os as _os
    env = dict(_os.environ)
    env.pop("MELITE_REPO_ROOT", None)
    env["DSH_GATEWAY_TOKEN"] = TOKEN
    try:
        port, proc = boot_scratch_gateway(env=env)
    except RuntimeError as e:
        print("FATAL: %s" % e)
        return 1
    print("ts flows/validate on :%d (repo %s)" % (port, REPO))
    try:
        for name, body in BYTE_BODIES:
            exp_b = golden(name + ".json")
            got_st, got_b, ctype = ts_call(port, "/v1/flows/validate",
                                           doc_bytes(body))
            if got_st is None:
                check("byte %s transport" % name, False,
                      got_b.decode()[:120])
                continue
            ok = (got_b == exp_b
                  and ctype.split(";")[0] == "application/json")
            check("byte %s" % name, ok,
                  "st %r bytes %d/%d" % (got_st,
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
            exp_b = golden("golden_" + mid + ".json")
            got_st, got_b, _ = ts_call(port, "/v1/flows/validate",
                                       doc_bytes(body))
            if got_st is None:
                check("golden %s transport" % mid, False,
                      got_b.decode()[:120])
                continue
            ok = got_b == exp_b
            check("byte golden:%s" % mid, ok,
                  "st %r bytes %d/%d" % (got_st,
                                         len(got_b), len(exp_b)))
            if ok:
                BYTE_OK += 1

        for name, body in STATUS_BODIES:
            # Interpreter-class 500s: the 500 body's traceback embeds
            # the host checkout path, so the pin is shape (status +
            # error text), never bytes.
            got_st, got_b, _ = ts_call(port, "/v1/flows/validate",
                                       doc_bytes(body))
            try:
                got_j = json.loads(got_b)
            except ValueError:
                got_j = {}
            check("status %s" % name,
                  got_st == 500
                  and "has no attribute 'get'" in str(got_j.get("error", "")),
                  "st %r body %r" % (got_st, got_b[:100]))

        got_st, got_b, _ = ts_call(port, "/v1/flows/validate", b"{nope")
        try:
            got_j = json.loads(got_b)
        except ValueError:
            got_j = {}
        check("shape bad-json",
              got_st == 400 and got_j.get("code") == "bad_json"
              and str(got_j.get("error", "")).startswith("bad JSON: "),
              "st %r body %r" % (got_st, got_b[:100]))

        # The 401 shape, byte-compared against the static literal.
        want_401 = json.dumps({
            "error": "unauthorized: missing or invalid bearer token "
                     "(Authorization: Bearer <token>; set "
                     "DSH_GATEWAY_TOKEN to enable)"}, indent=2).encode()
        got_st, got_b, _ = ts_call(port, "/v1/flows/validate",
                                   doc_bytes({"model": "z-image"}),
                                   auth=None)
        check("byte 401",
              got_st == 401 and got_b == want_401,
              "st %r body %r" % (got_st, got_b[:120]))

        print("summary: %d byte-equal, %d pass %d fail"
              % (BYTE_OK, PASS, FAIL))
        return 1 if FAIL else 0
    finally:
        reap_gateway(proc)


if __name__ == "__main__":
    sys.exit(main())
