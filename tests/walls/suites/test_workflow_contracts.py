"""Workflow contract walls — emitted vs RECORDED object_info.

The replay walls pin what our renderers EMIT; this suite pins that the
emission satisfies what ComfyUI ACCEPTS. The gap was live (character
flow attempts 5-8, 2026-09-06): RemeshMesh went dynamic-combo
upstream, the replay walls stayed green, and the workflow was
unpostable — four GPU runs burned discovering the wire spelling that
BOTH validates and executes (dotted top-level keys "sign_mode.qef" +
the branch key as plain value; flat keys 400; nested dicts validate
but starve execute()).

The recording: infra/comfyui/contracts/object_info.json (tools/
contract_snapshot.py — refresh at every core pin bump; the wall FAILS
on an unrecorded class so drift is deliberate or nonexistent).

The dynamic-combo law, checked offline here exactly as the live
validator enforces it online:
  - the combo key's value must be one of the recorded option keys
  - the selected option's required sub-inputs must appear as DOTTED
    keys ("<combo>.<sub>")
  - a dotted key on a non-combo input is a spelling bug — refuse
"""
from __future__ import annotations

import json
import sys

import pytest

from _anchor import REPO

sys.path.insert(0, str(REPO / "infra" / "python"))

from flow import load_flow  # noqa: E402

CONTRACTS = (REPO / "infra" / "comfyui" / "contracts"
             / "object_info.json")

# Recorded object_info entries are JSON documents (annotations only).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None
FLOWS_DIR = REPO / "flows"
COMBO_TYPE = "COMFY_DYNAMICCOMBO_V3"


def _accepted(entry: dict[str, JsonValue]) -> dict[str, list[JsonValue]]:
    inp = entry.get("input", {}) or {}
    merged: dict[str, list[JsonValue]] = {}
    for section in ("required", "optional"):
        for k, spec in (inp.get(section) or {}).items():
            merged[k] = spec if isinstance(spec, list) else [spec, {}]
    return merged


def _is_combo(spec: list[JsonValue]) -> bool:
    return bool(spec) and spec[0] == COMBO_TYPE


def _combo_options(spec: list[JsonValue]) -> list[dict[str, JsonValue]]:
    opts = (spec[1] or {}).get("options", []) if len(spec) > 1 else []
    return opts if isinstance(opts, list) else []


def _option_inputs(option: dict[str, JsonValue]) -> set[str]:
    inputs = (option.get("inputs") or {})
    out: set[str] = set()
    for section in ("required", "optional"):
        out |= set(inputs.get(section) or {})
    return out


def _check(nodes: dict[str, dict[str, JsonValue]], problems: list[str], flow: str, stage: str,
           key: str, cls: str, inputs: dict[str, JsonValue]) -> None:
    entry = nodes.get(cls)
    if entry is None:
        problems.append(
            "%s/%s node %r: class %r NOT RECORDED — re-run "
            "tools/contract_snapshot.py (pin bump?)"
            % (flow, stage, key, cls))
        return
    accepted = _accepted(entry)
    for k in inputs:
        if "." in k:
            base, sub = k.split(".", 1)
            spec = accepted.get(base)
            if spec is None or not _is_combo(spec):
                problems.append(
                    "%s/%s node %r (%s): dotted key %r on a "
                    "non-combo input — spelling bug"
                    % (flow, stage, key, cls, k))
                continue
            selected = inputs.get(base)
            branch = next((o for o in _combo_options(spec)
                           if o.get("key") == selected), None)
            if branch is None or sub not in _option_inputs(branch):
                problems.append(
                    "%s/%s node %r (%s): %r is not an input of "
                    "combo %r branch %r"
                    % (flow, stage, key, cls, k, base, selected))
        elif k not in accepted:
            problems.append(
                "%s/%s node %r (%s): unknown input key %r "
                "(accepted: %s)"
                % (flow, stage, key, cls, k,
                   ", ".join(sorted(accepted)) or "none"))
    for k, spec in ((entry.get("input", {}) or {})
                    .get("required") or {}).items():
        spec_l = spec if isinstance(spec, list) else [spec, {}]
        if _is_combo(spec_l):
            value = inputs.get(k)
            branch = next((o for o in _combo_options(spec_l)
                           if o.get("key") == value), None)
            if branch is None:
                problems.append(
                    "%s/%s node %r (%s): combo %r value %r is "
                    "not a recorded branch"
                    % (flow, stage, key, cls, k, value))
                continue
            subs = ((branch.get("inputs") or {})
                    .get("required") or {})
            for sub in subs:
                if "%s.%s" % (k, sub) not in inputs:
                    problems.append(
                        "%s/%s node %r (%s): required combo "
                        "sub-input %r of branch %r MISSING as "
                        "dotted key — live POST would 400 "
                        "required_input_missing"
                        % (flow, stage, key, cls, sub, value))
        elif k not in inputs:
            problems.append(
                "%s/%s node %r (%s): required input %r missing"
                % (flow, stage, key, cls, k))


def _violations() -> list[str]:
    doc = json.loads(CONTRACTS.read_text())
    nodes = doc["nodes"]
    problems: list[str] = []
    for f in sorted(FLOWS_DIR.glob("*/flow.py")):
        flow = f.parent.name
        graph = load_flow(flow).to_graph()
        for node in graph.nodes:
            wf = (node.params or {}).get("workflow")
            if not isinstance(wf, dict):
                continue
            for key, entry in wf.items():
                if isinstance(entry, dict) and "class_type" in entry:
                    _check(nodes, problems, flow, node.node_id,
                           str(key), str(entry["class_type"]),
                           entry.get("inputs") or {})
    return problems


class TestContractRefusals:
    """The wall's own refusal paths — a wall that cannot fail is a
    suggestion. Fabricated recordings + inputs, each pinning one
    refusal message (the live incident shapes)."""

    COMBO_NODE = {"input": {"required": {
        "mesh": ["MESH", {}],
        "sign_mode": [COMBO_TYPE, {"options": [
            {"key": "udf", "inputs": {"required": {
                "qef": ["BOOLEAN", {"default": False}]}}},
            {"key": "sdf", "inputs": {"required": {
                "manifold": ["BOOLEAN", {"default": False}]}}},
        ]}]}}}

    def _problems(self, nodes: dict[str, dict[str, JsonValue]], cls: str,
                    inputs: dict[str, JsonValue]) -> str:
        out: list[str] = []
        _check(nodes, out, "f", "s", "n", cls, inputs)
        return " | ".join(out)

    def test_unrecorded_class(self) -> None:
        assert "NOT RECORDED" in self._problems({}, "Ghost", {})

    def test_flat_combo_missing_dotted_subs(self) -> None:
        # attempt 5's exact shape: sign_mode present, NO dotted keys —
        # the live POST 400 required_input_missing; this wall says it
        # offline.
        msg = self._problems({"M": self.COMBO_NODE}, "M",
                             {"mesh": ["x", 0], "sign_mode": "udf"})
        assert "required combo sub-input 'qef'" in msg
        assert "required_input_missing" in msg

    def test_wrong_branch_value(self) -> None:
        # 'sdf' IS a recorded branch and its required sub rides the
        # dotted key — the OTHER legal combo shape, clean.
        msg = self._problems({"M": self.COMBO_NODE}, "M",
                             {"mesh": ["x", 0], "sign_mode": "sdf",
                              "sign_mode.manifold": False})
        assert msg == ""

    def test_unrecorded_branch_value(self) -> None:
        msg = self._problems({"M": self.COMBO_NODE}, "M",
                             {"mesh": ["x", 0], "sign_mode": "qef",
                              "sign_mode.qef": False})
        assert "not a recorded branch" in msg

    def test_unknown_plain_key(self) -> None:
        msg = self._problems({"M": self.COMBO_NODE}, "M",
                             {"mesh": ["x", 0], "sign_mode": "udf",
                              "sign_mode.qef": False,
                              "bandana": 3})
        assert "unknown input key 'bandana'" in msg

    def test_dotted_key_on_non_combo(self) -> None:
        msg = self._problems({"M": self.COMBO_NODE}, "M",
                             {"mesh": ["x", 0], "sign_mode": "udf",
                              "sign_mode.qef": False,
                              "mesh.shine": 3})
        assert "non-combo input" in msg


def test_contracts_recording_exists() -> None:
    assert CONTRACTS.exists(), (
        "missing %s — run: uv run python tools/contract_snapshot.py"
        % CONTRACTS)


def test_every_emitted_workflow_satisfies_its_contract() -> None:
    problems = _violations()
    assert not problems, "\n" + "\n".join(problems)


def test_remesh_combo_pin() -> None:
    # THE incident pin: the garment remesh carries the ONE spelling
    # that both validates and executes — branch key as plain value +
    # every required sub as dotted keys.
    doc = json.loads(CONTRACTS.read_text())
    spec = doc["nodes"]["RemeshMesh"]["input"]["required"]["sign_mode"]
    assert _is_combo(spec if isinstance(spec, list) else [spec, {}])
    graph = load_flow("character").to_graph()
    emitted = None
    for node in graph.nodes:
        wf = (node.params or {}).get("workflow") or {}
        for entry in wf.values():
            if isinstance(entry, dict) and                     entry.get("class_type") == "RemeshMesh":
                emitted = entry["inputs"]
    assert emitted is not None, "character flow carries no RemeshMesh"
    assert emitted["sign_mode"] == "udf"
    for sub in ("sign_mode.qef", "sign_mode.drop_inverted_components",
                "sign_mode.drop_enclosed_components"):
        assert sub in emitted, sub
