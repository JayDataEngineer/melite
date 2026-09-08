"""test_flow_templates — ROW-4 TEMPLATE LIBRARY (2026-09-06).

The headless single-tool shape (FlowTool on the flow, emitted as
ONE tool manifest into the template bundle) is the library — but a
template nobody proves rots into a stale starter that 400s at the
door. This wall sweeps the registry and proves EVERY tool-bearing
flow: missing-required refuses, wrong-type refuses, overlays stamp
their paths, the stamped flow compile()s (the full start/validate
chain short of a queue slot), and the manifest emits. Pure
in-process proof — no gateway, no GPU, no sidecar.
"""
import os
import sys
from collections.abc import Iterator

import pytest

REPO = os.path.normpath(os.path.join(os.path.dirname(
    os.path.abspath(__file__)), "..", "..", ".."))


@pytest.fixture(scope="module", autouse=True)
def _estate_paths() -> Iterator[None]:
    for p in (os.path.join(REPO, "infra", "python"),):
        if p not in sys.path:
            sys.path.insert(0, p)
    import flow
    globals()["flow"] = flow
    yield


def _tooled() -> "dict[str, object]":
    out = {}
    for fid in flow.scan_flow_ids():
        if fid in RETIRED_FLOWS:
            continue  # pinned unshippable below — not library stock
        fl = flow.load_flow(fid)
        if fl.tool is not None:
            out[fid] = fl
    return out


# RETIRED ENGINE FLOWS (mono-engine 2026-09-08, quarantine
# 47e1c583): on-disk flows whose card/engine died and cannot ship —
# the library proves the LIVING surface only. flows/music-native
# names card music-native on engine audio_cpp (both retired; the
# living surface is the comfyui music card, served as music_card).
# Removing the dead flow dir belongs to the flow lane (residue);
# the debt-pin leg below keeps this set honest — the day a listed
# flow loads again, it rejoins the sweep and leaves this set.
RETIRED_FLOWS = frozenset({"music-native"})


def test_retired_engine_flows_stay_unloadable() -> None:
    for fid in sorted(RETIRED_FLOWS):
        try:
            flow.load_flow(fid)
        except Exception:
            continue
        raise AssertionError(
            "retired flow %s loads again — it rejoins the library "
            "sweep and leaves RETIRED_FLOWS" % fid)


# the curated set — the library grows by declaring tool=, never by
# editing this wall (the sweep covers newcomers automatically).
# music-native LEFT 2026-09-08 (RETIRED_FLOWS above — its engine
# died; the living music template is the comfyui music card).
CURATED = frozenset({"image-upscale", "audio-native-tts"})


def test_library_holds_the_curated_set() -> None:
    tooled = _tooled()
    assert CURATED <= set(tooled), (
        "template library lost a template: have %s, want at least %s"
        % (sorted(tooled), sorted(CURATED)))


def _example(prop: "flow.FlowToolProperty") -> "str | int | float | bool":
    if getattr(prop, "enum", ()):
        return prop.enum[0]
    if prop.ptype is flow.ToolParamType.string:
        return "wall template probe"
    if prop.ptype is flow.ToolParamType.integer:
        return prop.default if prop.default is not None else 1
    if prop.ptype is flow.ToolParamType.number:
        return prop.default if prop.default is not None else 1.0
    return True


def _full_body(fl: "flow.Flow") -> "dict[str, object]":
    body: dict[str, object] = {"prompt": "wall template probe"}
    for name, prop in fl.tool.properties.items():
        if name not in body:
            body[name] = _example(prop)
    return body


def test_missing_required_refuses() -> None:
    for fid, fl in sorted(_tooled().items()):
        if not fl.tool.required:
            continue
        with pytest.raises(flow.FlowError):
            fl.validate_tool_params({})
        gone = dict(_full_body(fl))
        del gone[fl.tool.required[0]]
        with pytest.raises(flow.FlowError):
            fl.validate_tool_params(gone)


def test_wrong_type_refuses() -> None:
    for fid, fl in sorted(_tooled().items()):
        bad = dict(_full_body(fl))
        bad["prompt"] = {"not": "a scalar"}
        with pytest.raises(flow.FlowError):
            fl.validate_tool_params(bad)


def test_overlays_stamp_their_paths() -> None:
    for fid, fl in sorted(_tooled().items()):
        stamped = fl.with_tool_params(_full_body(fl))
        by_id = {st.id: st for st in stamped.stages}
        assert len(fl.tool.overlays) >= 1 or all(
            not isinstance(e, flow.FromInitial)
            for st in fl.stages for e in st.inputs.values()
        ), "flow %s tool params reach no stage (overlay them or " \
            "consume them via FromInitial)" % fid
        for ov in fl.tool.overlays:
            cur = by_id[ov.stage].params
            for part in ov.path:
                assert isinstance(cur, dict) and part in cur, (
                    "flow %s overlay %s path %s hits nothing "
                    "(stage params keys %s)"
                    % (fid, ov.param, list(ov.path),
                       sorted(cur) if isinstance(cur, dict) else cur))
                cur = cur[part]


def test_stamped_flow_compiles() -> None:
    for fid, fl in sorted(_tooled().items()):
        _graph, _skipped = fl.compile(_full_body(fl))


def test_manifest_emits() -> None:
    # (PURGE S-oracle 2026-09-08: the manifest builder rode the
    # retired lane_disclosure module — it lives on Flow now
    # (tool_manifest, plain wire dicts, no pydantic rows).)
    for fid, fl in sorted(_tooled().items()):
        wire = fl.tool_manifest()
        assert wire is not None, (
            "flow %s declares tool= but emits no manifest" % fid)
        assert wire.get("kind") == "flow-tool" \
            and wire.get("flow") == fid \
            and wire.get("name") \
            and (wire.get("params_schema") or {}).get("properties"), (
            "flow %s manifest wires empty" % fid)
