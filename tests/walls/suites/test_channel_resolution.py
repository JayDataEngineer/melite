"""$channel resolution — the compile-time twin of the runtime pool.

Incident class (character flow, 2026-09-06, three queued GPU runs):
  a stage's params reference "$name"; nothing resolves it; the
  runtime substitution passes unknown $-strings through SILENTLY
  ("$100 bill" is legitimate prompt text), so the bug surfaced
  only as a downstream engine refusal — "Invalid image file:
  $photo" / "invalid literal for int(): '$seed'".

The door: the static unresolved-channels check judges every
whole-string $name in a node's params against the pool the
executor would publish for that node; compilation refuses (4xx at
BOTH doors) before any queue slot or GPU claim.

ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not need
parity, we need to migrate, not keep the old machinery"): the
py-mirror leg (static pool == py resolve_inputs keys) died with
the py serving oracle — there is no py executor to agree with.
The static check lives in the TS door now
(packages/gateway-doors/src/doors/flowsValidate.ts compileFlow: pool =
inputNames + __initial__ tails + producer refs); the mirror is
re-pinned as TS-HTTP legs below (a dangling body 400s naming
stage + token + pool; a resolved body 200s), so the check and
the executor cannot drift apart without failing here.

Walls here:
  - a dangling token is reported with its stage and the true pool
  - the incident shape resolves: receiving name AND tensor key
  - THE TS PIN — a dangling inline body 400s at the TS validate
    door naming stage + token; the resolved shape 200s
  - Flow.compile raises FlowError (the keeper compile unit)
  - every flow on disk compiles with zero unresolved channels

Date: 2026-09-08. Status: landed (oracle-death re-derivation).
"""

from __future__ import annotations

import copy
import json
import sys
import urllib.error
import urllib.request

import pytest

from _anchor import REPO, boot_scratch_gateway, reap_gateway

# Node params are JSON values (annotations only).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

sys.path.insert(0, str(REPO / "python"))

import flow as flow_mod
import flow_graph

FLOWS_DIR = REPO / "flows"

WF = {"1": {"class_type": "EmptyLatentImage",
            "inputs": {"width": 64, "height": 64, "batch_size": 1}}}

DANGLING_INLINE = {
    "id": "w-dangle-door",
    "stages": [
        {"id": "gen", "engine": "comfyui",
         "params": {"workflow": {"n": {
             "class_type": "LoadImage",
             "inputs": {"image": "$nope"}}}}},
    ],
}

RESOLVED_INLINE = {
    "id": "w-resolved-door",
    "stages": [
        {"id": "gen", "engine": "comfyui",
         "inputs": {"photo": {"initial": "starter_image"}},
         "expected": {"photo": "image"},
         "params": {"workflow": {"n": {
             "class_type": "LoadImage",
             "inputs": {"image": "$photo"}}}}},
    ],
}


def _row(**kw: str | tuple[str, ...] | dict[str, JsonValue]) -> flow_graph.NodeRow:
    base = dict(id="use", type="comfyui", params={
        "workflow": {"n": {"class_type": "LoadImage",
                           "inputs": {"image": "$photo"}}}})
    base.update(kw)
    return flow_graph.NodeRow(**base)


class TestUnresolvedChannels:
    def test_dangling_token_reported_with_stage_and_pool(self) -> None:
        g = flow_graph.FlowGraph(
            name="w", nodes=(_row(input_from=("__initial__.other",),),))
        bad = g.unresolved_channels()
        assert bad == (("use", "photo", ("other",)),)

    def test_incident_shape_resolves_both_spellings(self) -> None:
        row = _row(
            params={"workflow": {"n": {"class_type": "LoadImage",
                                  "inputs": {"image": "$photo",
                                             "backup": "$starter_image"}}}},
            input_from=("__initial__.starter_image",),
            input_names={"photo": "__initial__.starter_image"},
        )
        g = flow_graph.FlowGraph(name="w", nodes=(row,))
        assert g.unresolved_channels() == ()

    def test_prompt_prose_is_not_a_channel(self) -> None:
        # embedded $ ("x$seed y") is prose at runtime — only whole
        # strings starting with $ are tokens; the tokenizer mirrors
        # the runtime expansion exactly.
        row = _row(params={"prompt": "a $100 bill and x$seed y"})
        g = flow_graph.FlowGraph(name="w", nodes=(row,))
        assert g.unresolved_channels() == ()

    def test_compile_refuses_with_stage_and_token(self) -> None:
        body = {
            "id": "w-dangle",
            "stages": [
                {"id": "gen", "engine": "comfyui",
                 "params": {"workflow": {"n": {
                     "class_type": "LoadImage",
                     "inputs": {"image": "$photo"}}}}},
            ],
        }
        fl = flow_mod.flow_from_body(body)
        with pytest.raises(flow_mod.FlowError) as ei:
            fl.compile({})
        msg = str(ei.value)
        assert "unresolved $channel" in msg
        assert "'gen'" in msg and "$photo" in msg


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


@pytest.fixture(scope="module")
def ts_port():
    port, proc = boot_scratch_gateway()
    try:
        yield port
    finally:
        reap_gateway(proc)


class TestTsChannelPin:
    """THE TS PIN (oracle-death re-derivation): the static check
    and the executor agree behind the TS validate door — a
    dangling body 400s naming stage + token, the resolved shape
    200s. Probed live 2026-09-08: dangling ->
    "unresolved $channel(s): stage 'gen' references $nope
    (available: nothing)", code flow_compile."""

    def test_ts_door_refuses_inline_dangle(self, ts_port: int) -> None:
        status, body = _post(
            ts_port, "/v1/flows/validate",
            {"flow_inline": copy.deepcopy(DANGLING_INLINE)})
        assert status == 400, (status, body)
        assert "unresolved $channel" in body["error"], body
        assert "'gen'" in body["error"] and "$nope" in body["error"], body

    def test_ts_door_accepts_resolved_shape(self, ts_port: int) -> None:
        status, body = _post(
            ts_port, "/v1/flows/validate",
            {"flow_inline": copy.deepcopy(RESOLVED_INLINE),
             "starter_image": "estate/starter.png"})
        assert status == 200, (status, body)
        assert body["ok"] is True


class TestEstateSweep:
    # RETIRED ENGINE FLOWS (mono-engine 2026-09-08, quarantine
    # 47e1c583): flows/music-native names the retired music-native
    # card on the dead audio_cpp engine — it cannot ship and leaves
    # the sweep; the living surface is the comfyui music card. Dir
    # removal belongs to the flow lane (residue). The debt-pin leg
    # keeps this set honest (KNOWN_DRIFT discipline: the day a
    # listed flow loads, it rejoins the sweep).
    RETIRED = frozenset({"music-native"})

    def test_retired_engine_flows_stay_unloadable(self) -> None:
        for name in sorted(self.RETIRED):
            try:
                flow_mod.load_flow(name)
            except Exception:
                continue
            raise AssertionError(
                "retired flow %s loads again — it rejoins the sweep "
                "and leaves RETIRED" % name)

    def test_every_flow_on_disk_resolves_clean(self) -> None:
        names = sorted(p.parent.name for p in
                       FLOWS_DIR.glob("*/flow.py"))
        assert names, "no flows found — the sweep went blind"
        for name in names:
            if name in self.RETIRED:
                continue  # pinned above — not shippable stock
            g = flow_mod.load_flow(name).to_graph()
            bad = g.unresolved_channels()
            assert bad == (), "%s: %s" % (name, bad)
