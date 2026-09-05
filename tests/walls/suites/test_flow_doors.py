"""test_flow_doors — the run door's compile-time + semantic gates.

The QUEUE LANE LAW: ambiguous requests refuse 4xx BEFORE any run
is registered (no zombie slots, no sidecars); semantic laws
(prompt is required, etc.) refuse the same way. The AI feedback
loop lives at POST /v1/flows/validate — every refusal is verbatim
compile-time text naming flow/stage/input and both Kinds, so the
agent iterates without a queue slot, a GPU claim, or a sidecar.

These pins refuse a silent relaxation of any of the three classes:
  1. Ambiguity on the start door (two of {flow, flow_inline, model})
  2. Compile-time refusal on the validate door (typed-edge,
     ambiguity, missing required)
  3. Semantic refusal on the start door (required param missing)
A run that slips through any of these is the exact silent-class
the laws exist to prevent.
"""
import json as _json
import urllib.request
import urllib.error

import pytest


def _post(port, path, body):
    """POST a JSON body to the scratch gateway; return (status, body)."""
    req = urllib.request.Request(
        "http://127.0.0.1:%d/%s" % (port, path),
        data=_json.dumps(body).encode("utf-8"),
        headers={"content-type": "application/json"},
        method="POST",
    )
    try:
        r = urllib.request.urlopen(req, timeout=15)
        return r.status, _json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return e.code, _json.loads(e.read().decode("utf-8"))
        except Exception:
            return e.code, {}


@pytest.fixture(scope="module")
def scratch_gateway():
    from _anchor import boot_scratch_gateway, reap_gateway
    import sys as _sys
    port, proc = boot_scratch_gateway(
        wait_path="/v1/queue", python=_sys.executable,
        tries=150, sleep=0.2, env=None)
    yield port
    reap_gateway(proc)


# ── 1. Start-door ambiguity (QUEUE LANE LAW) ────────────────────────
@pytest.mark.parametrize("body", [
    {"flow": "x", "model": "y"},
    {"flow": "x", "flow_inline": {"id": "z", "stages": []}},
    {"model": "y", "flow_inline": {"id": "z", "stages": []}},
    {"flow": "x", "model": "y", "flow_inline": {"id": "z", "stages": []}},
])
def test_http_flows_start_ambiguous_doors_refuse_4xx(scratch_gateway, body):
    """Naming more than one of {flow, flow_inline, model} is
    ambiguous — the resolver must refuse 4xx and register NO run.
    The literal "ambiguous request" string pins the contract so a
    silent fallback to a default model (the QUEUE LANE LAW's
    banned-class) can't sneak back in."""
    code, body_out = _post(scratch_gateway, "v1/flows/start", body)
    assert code == 400, (code, body_out)
    assert "ambiguous" in str(body_out).lower(), body_out


def test_http_flows_start_unknown_keys_refuse_4xx(scratch_gateway):
    """A request that names NO door at all (just an arbitrary key)
    also refuses — the resolver only accepts the three declared
    doors."""
    code, body_out = _post(scratch_gateway, "v1/flows/start",
                           {"bogus": "x"})
    assert code == 400, (code, body_out)


# ── 2. Validate-door compile-time refusal ──────────────────────────
def test_http_flows_validate_inline_body_with_extra_top_keys_refuses_400(scratch_gateway):
    """The validate door accepts an INLINE flow body (id + stages);
    any top-level key outside the inline set is a refusal — the
    agent iterates without a queue slot."""
    code, body_out = _post(
        scratch_gateway, "v1/flows/validate",
        {"id": "x", "stages": [], "flow": "anything"},
    )
    assert code == 400, (code, body_out)
    assert "unknown keys" in str(body_out).lower(), body_out


def test_http_flows_validate_inline_body_no_stages_refuses_400(scratch_gateway):
    """An inline body without stages is structurally incomplete —
    the validate door returns a FlowError."""
    code, body_out = _post(
        scratch_gateway, "v1/flows/validate",
        {"id": "x"},
    )
    assert code == 400, (code, body_out)


# ── 3. Start-door semantic refusal (the "required param" class) ───
def test_http_flows_start_empty_prompt_refuses_400(scratch_gateway):
    """The krea-2 image card declares 'prompt' as a required
    parameter (form surface). The start door's semantic validator
    must refuse an empty/missing prompt with a 400 — the AI loop
    gets the verbatim message. The "Image complete" run on the
    user's path only succeeded BECAUSE this gate held the empty
    prompt at the client first; the server holds it the same way."""
    code, body_out = _post(
        scratch_gateway, "v1/flows/start",
        {"model": "krea-2", "prompt": ""},
    )
    assert code == 400, (code, body_out)
    msg = str(body_out).lower()
    assert "prompt" in msg, body_out
