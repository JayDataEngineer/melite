"""STRICT BODY WALL — the silent-drop class dies at the door.

(QUEUE LANE LAW, 2026-09-05) A start body MUST be {door: ...} plus
scalar run inputs. Body keys that the runner never reads are
pollution (they ride _request.json, lie in the tensor pool as inert
passengers, and teach callers the wrong shape). The C-era runner knob
names are explicitly refused — they survived a deprecation cycle as
silent drops; strict kills them at the door. The body-vocab is:

  - DOOR_KEYS  — the four door forms (yaml, flow, flow_inline, model).
                 yaml is the retired-spelling exclusion (loud 4xx).
  - the rest   — scalar run inputs (the model's params, open
                 vocabulary — the model class declares them).

This wall pins the retired-knob refusal + the C-era internal-key
refusal over TS HTTP. Anything else that the runner doesn't read
stays the run's problem (not the gateway's); the model class is
the door for knob-shape validation.

ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not need
parity, we need to migrate, not keep the old machinery"): the wall
used to import the retired-knob SSOT from the py serving oracle
and unit-called py resolve_request in-process. Both died with the oracle. The knob
list is FROZEN here as a literal (the TS door owns its own copy:
packages/gateway/src/core/params.ts RETIRED_RUNNER_KNOBS); every
leg POSTs to the TS gateway (apps/gateway/src/main.ts via the
shared boot_scratch_gateway helper) and asserts 400 + the knob
text. To ADD a knob to the refusal set, edit the TS constant AND
this literal in the same stroke — a drift between them fails here.

TS door order (probed live 2026-09-08, pinned below):
  - start: draft gate -> strict -> doors. A knob body needs a
    REAL draft doc (seeded drafts/d-<id>.json under the scratch
    root) or the draft refusal masks the knob refusal.
  - validate {model:} arm: strict first (model+knob 400s the knob).
  - validate flow_inline arm: strict does NOT run (unknown-keys /
    unresolved checks own those bodies) — knob legs ride start.
  - start {flow} named flows ride the py flow registry in the TS
    preview (400 preview_scope) — happy-path legs ride flow_inline.

No GPU, no network.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).
"""

from __future__ import annotations

import copy
import json
import urllib.error
import urllib.request
from pathlib import Path

import pytest

from _anchor import REPO, boot_scratch_gateway, reap_gateway

# A. the retired runner knob set, FROZEN as a literal (oracle-death:
# the py SSOT import died with the oracle). A body carrying any of
# these is a silent-drop attempt; the door must refuse loud (400,
# not 200 with a dropped key). Mirrors the TS door's copy
# (packages/gateway/src/core/params.ts RETIRED_RUNNER_KNOBS) —
# edit both in the same stroke.
RETIRED_RUNNER_KNOBS = frozenset({
    "start_from", "stop_after", "reuse_run_id", "partial_run",
    "overrides", "since", "from_index",
})

WF = {"1": {"class_type": "EmptyLatentImage",
            "inputs": {"width": 64, "height": 64, "batch_size": 1}}}

GOOD_INLINE = {
    "id": "w-strict",
    "stages": [{"id": "gen", "engine": "comfyui",
                "params": {"workflow": WF}}],
}

DRAFT_ID = "d-strict"


@pytest.fixture(scope="module")
def ts_gate(tmp_path_factory):
    """TS gateway on a scratch root with one seeded draft doc."""
    root = Path(tmp_path_factory.mktemp("strict-body-"))
    (root / "drafts").mkdir(parents=True)
    (root / "drafts" / (DRAFT_ID + ".json")).write_text("{}")
    import os
    port, proc = boot_scratch_gateway(
        env=dict(os.environ, MELITE_STATE_ROOT=str(root)))
    try:
        yield port
    finally:
        reap_gateway(proc)


def _post(port: int, path: str, body: object) -> tuple[int, dict]:
    req = urllib.request.Request(
        "http://127.0.0.1:%d%s" % (port, path),
        data=json.dumps(body).encode(), method="POST",
        headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


def _start_body(**extra: object) -> dict:
    body: dict = {"draft_id": DRAFT_ID,
                  "flow_inline": copy.deepcopy(GOOD_INLINE)}
    body.update(extra)
    return body


@pytest.mark.parametrize("knob", sorted(RETIRED_RUNNER_KNOBS))
def test_retired_runner_knob_refused(ts_gate: int, knob: str) -> None:
    """The C-era runner knobs are silent-drop attempts. Loud 400."""
    status, body = _post(ts_gate, "/v1/flows/start",
                         _start_body(**{knob: 2}))
    assert status == 400, (status, body)
    assert knob in body["error"], (knob, body)
    assert "silent-drop" in body["error"], body


def test_multiple_retired_knobs_refused_at_once(ts_gate: int) -> None:
    status, body = _post(
        ts_gate, "/v1/flows/start",
        _start_body(start_from=2, overrides={"seed": 1}))
    assert status == 400, (status, body)
    assert "start_from" in body["error"] and "overrides" in body["error"], body


def test_retired_knobs_literal_is_nonempty_and_frozen(ts_gate: int) -> None:
    """The frozen literal must be non-empty (a silent-drop attempt
    is the reason the wall exists) AND match the TS door's copy
    (drift between the two fails here, not silently at one door)."""
    assert len(RETIRED_RUNNER_KNOBS) >= 1
    text = (REPO / "packages" / "gateway" / "src" / "core"
            / "params.ts").read_text(encoding="utf-8")
    for knob in sorted(RETIRED_RUNNER_KNOBS):
        assert '"%s"' % knob in text, \
            "knob %r in the frozen literal but missing from the TS door" % knob


# B. C-era internal naming (the "_" prefix) — the runner never read
# these; they leaked into the sidecar as pollution. Loud 400.
def test_internal_underscore_key_refused(ts_gate: int) -> None:
    status, body = _post(ts_gate, "/v1/flows/start",
                         _start_body(_internal=1))
    assert status == 400, (status, body)
    assert "_internal" in body["error"], body


# C. model params are OPEN vocabulary — they ride through as scalar
# inputs. A body carrying a model param MUST pass (202 accepted).
def test_model_params_pass_through(ts_gate: int) -> None:
    """The model class declares its params; the body carries them as
    scalar inputs (open vocabulary). They ride the run, NOT the
    door — strict does not constrain them."""
    status, body = _post(
        ts_gate, "/v1/flows/start",
        _start_body(prompt="a serene mountain stream",
                    negative_prompt="harsh, distorted", seed=42))
    assert status == 202, (status, body)
    assert body["status"] == "queued", body


# D. the ambiguity check stays (multiple doors refused) — orthogonal
# to strict body keys, but adjacent (one door + nothing else).
def test_two_doors_still_refused(ts_gate: int) -> None:
    status, body = _post(
        ts_gate, "/v1/flows/start",
        _start_body(model="krea-2"))
    assert status == 400, (status, body)
    assert "ambiguous" in body["error"].lower(), body


# E. the retired-spelling door (yaml) still 400s — the TS validate
# door answers unknown-keys (the door vocab is flow/flow_inline/
# model + inline shape); the strict-before-door order means a yaml
# body never compiles.
def test_yaml_door_still_refused(ts_gate: int) -> None:
    status, body = _post(ts_gate, "/v1/flows/validate",
                         {"yaml": "audio-native-tts"})
    assert status == 400, (status, body)


# F. the strict check happens BEFORE door selection on start — a
# body with a retired knob AND no door is refused on the knob
# class first (so the door shape doesn't mask a silent-drop
# attempt).
def test_strict_before_door_selection(ts_gate: int) -> None:
    status, body = _post(ts_gate, "/v1/flows/start",
                         {"draft_id": DRAFT_ID,
                          "start_from": 2, "prompt": "x"})
    assert status == 400, (status, body)
    assert "start_from" in body["error"], body


# G. happy path: door + scalar input — rides through to a queued run.
def test_full_happy_body_passes(ts_gate: int) -> None:
    status, body = _post(
        ts_gate, "/v1/flows/start",
        _start_body(prompt="wind chimes", seed=7))
    assert status == 202, (status, body)
    assert body["status"] == "queued", body
