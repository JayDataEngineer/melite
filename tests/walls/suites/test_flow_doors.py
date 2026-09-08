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
from collections.abc import Iterator

import pytest


def _post(
    port: int,
    path: str,
    body: dict[str, str | list[dict[str, str]] | dict[str, str | list[dict[str, str]]]],
) -> tuple[int, dict[str, str | int | float | bool | list[str] | dict[str, str] | None]]:
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


def _compose(
    port: int,
    body: dict[str, str | list[dict[str, str]] | dict[str, str | list[dict[str, str]]]],
) -> str:
    """CARD BIRTH LAW (operator order 2026-09-06): the start door
    4xxes a start without a doc-backed draft_id. Walls whose subject
    is a LATER gate (ambiguity, semantics) compose their card first
    so the tested variable stays isolated."""
    code, doc = _post(port, "v1/flows/drafts", body)
    assert code == 200, "card compose refused: %s %s" % (code, doc)
    draft_id = doc.get("draftId")
    assert isinstance(draft_id, str) and draft_id, \
        "card compose returned no draftId: %s" % (doc,)
    return draft_id


@pytest.fixture(scope="module")
def scratch_gateway() -> Iterator[int]:
    from _anchor import boot_scratch_gateway, reap_gateway
    import sys as _sys
    port, proc = boot_scratch_gateway(
        wait_path="/v1/queue",         tries=150, sleep=0.2, env=None)
    yield port
    reap_gateway(proc)


# ── 1. Start-door ambiguity (QUEUE LANE LAW) ────────────────────────
@pytest.mark.parametrize("body", [
    {"flow": "x", "model": "y"},
    {"flow": "x", "flow_inline": {"id": "z", "stages": []}},
    {"model": "y", "flow_inline": {"id": "z", "stages": []}},
    {"flow": "x", "model": "y", "flow_inline": {"id": "z", "stages": []}},
])
def test_http_flows_start_ambiguous_doors_refuse_4xx(
    scratch_gateway: int,
    body: dict[str, str | list[dict[str, str]] | dict[str, str | list[dict[str, str]]]],
) -> None:
    """Naming more than one of {flow, flow_inline, model} is
    ambiguous — the resolver must refuse 4xx and register NO run.
    The literal "ambiguous request" string pins the contract so a
    silent fallback to a default model (the QUEUE LANE LAW's
    banned-class) can't sneak back in.
    CARD BIRTH LAW (operator order 2026-09-06): the envelope carries
    a valid draft_id so the tested gate is ambiguity, not card
    birth (a cardless two-door body refuses on the envelope first —
    ENVELOPE-FIRST)."""
    code, body_out = _post(scratch_gateway, "v1/flows/start",
                           {**body, "draft_id": _compose(scratch_gateway, body)})
    assert code == 400, (code, body_out)
    assert "ambiguous" in str(body_out).lower(), body_out


def test_http_flows_start_unknown_keys_refuse_4xx(scratch_gateway: int) -> None:
    """A request that names NO door at all (just an arbitrary key)
    also refuses — the resolver only accepts the three declared
    doors."""
    code, body_out = _post(scratch_gateway, "v1/flows/start",
                           {"bogus": "x"})
    assert code == 400, (code, body_out)


# ── 2. Validate-door compile-time refusal ──────────────────────────
def test_http_flows_validate_inline_body_with_extra_top_keys_refuses_400(
    scratch_gateway: int,
) -> None:
    """The validate door accepts an INLINE flow body (id + stages);
    any top-level key outside the inline set is a refusal — the
    agent iterates without a queue slot."""
    code, body_out = _post(
        scratch_gateway, "v1/flows/validate",
        {"id": "x", "stages": [], "flow": "anything"},
    )
    assert code == 400, (code, body_out)
    assert "unknown keys" in str(body_out).lower(), body_out


def test_http_flows_validate_inline_body_no_stages_refuses_400(
    scratch_gateway: int,
) -> None:
    """An inline body without stages is structurally incomplete —
    the validate door returns a FlowError."""
    code, body_out = _post(
        scratch_gateway, "v1/flows/validate",
        {"id": "x"},
    )
    assert code == 400, (code, body_out)


# ── 3. Start-door semantic refusal (the "required param" class) ───
def test_http_flows_start_empty_prompt_refuses_400(scratch_gateway: int) -> None:
    """The krea-2 image card declares 'prompt' as a required
    parameter (form surface). The start door's semantic validator
    must refuse an empty/missing prompt with a 400 — the AI loop
    gets the verbatim message. The "Image complete" run on the
    user's path only succeeded BECAUSE this gate held the empty
    prompt at the client first; the server holds it the same way.
    CARD BIRTH LAW (operator order 2026-09-06): the envelope
    carries a valid draft_id so the tested gate is the semantic
    one, not card birth."""
    start = {"model": "krea-2", "prompt": ""}
    code, body_out = _post(
        scratch_gateway, "v1/flows/start",
        {**start, "draft_id": _compose(scratch_gateway, start)},
    )
    assert code == 400, (code, body_out)
    msg = str(body_out).lower()
    assert "prompt" in msg, body_out


# ── 4. Named-flow validate on TS (the unported half) ──
# docs/design/flow-single-tool.md (landed MVP 2026-09-06): the
# headless {flow:} tool rail (tool-param enum/required/defaults,
# Flow.compile) executes the py flow registry. The TS plane does NOT
# port that half yet — doors/flowsValidate.ts refuses named-flow
# compile NATIVE (400 flow_compile naming the flow, "unported half
# in this stroke"). ORACLE DEATH 2026-09-08: the three success legs
# below died with the py registry oracle (they asserted py compile
# results no TS serves); what the wall pins now is the lawful
# residue — the refusal is LOUD (never a silent accept) and names
# the flow. The flows-port lane re-adds success legs when the half
# ports (the headless-tool contract is unchanged).
def test_http_flows_validate_named_flow_refuses_unported_half_400(
    scratch_gateway: int,
) -> None:
    """A named {flow:} validate on TS refuses 400 flow_compile naming
    the flow — the unported half, loud, never silent."""
    for body in (
        {"flow": "image-upscale", "prompt": "a fox",
         "image_model": "flux"},
        {"flow": "image-upscale", "prompt": "a fox"},
        {"flow": "image-upscale", "prompt": "a fox",
         "image_model": "z-image"},
    ):
        code, body_out = _post(
            scratch_gateway, "v1/flows/validate", body,
        )
        assert code == 400, (body, code, body_out)
        assert body_out.get("code") == "flow_compile", body_out
        assert "image-upscale" in str(body_out.get("error", "")), body_out
