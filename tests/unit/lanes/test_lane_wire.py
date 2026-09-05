"""LANE WIRE UNIT WALL — the lane-disclosure family's frozen contract.

The run_wire/form_wire precedent applied to the last unvalidated
serving family (2026-09-05): every row /v1/lanes, /v1/card-tools,
/v1/skills, /v1/skills/<id>, and /v1/cards/<lane>/bundle serves is a
frozen py/lane_wire.py row. This suite pins:

  * shape refusals happen AT CONSTRUCTION (PYTHON SHAPE LAW): an
    empty name, a zero version, a dead rider key, a skill row scoped
    to both card AND model, a bundle that mixes lane classes — all
    unbuildable, so unservable;
  * the wire() projections keep the served key discipline (hidden
    rides only when declared, skill rows carry only their source's
    keys, the lanes envelope carries `error` only on refusal);
  * the disclosure engine degrades LOUDLY on source drift: a
    malformed tool.json manifest skips with a logged field-named
    reason, and a card whose manifests ALL refused leaves the
    disclosure surface entirely (peek must not advertise an
    uncallable lane);
  * the REAL estate sweep round-trips: every manifest on disk
    validates, and every served peek/skills/card-tools payload
    re-validates through the same models (producer and consumer
    share one contract — no drift between them).

No GPU, no network. Fixture trees under tmp_path."""

import json
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

import lane_wire
import lane_disclosure as ld

REPO = Path(__file__).resolve().parents[3]


# ── A. shape refusals happen AT CONSTRUCTION ───────────────────────

def _manifest_row(**over):
    base = dict(
        name="image_gen_card", version=1, kind="card-compose",
        card="image-gen", model="krea-2", stage_title="Image",
        description="Text-to-image",
        params_schema={"type": "object",
                       "properties": {"prompt": {"type": "string"}},
                       "required": ["prompt"]})
    base.update(over)
    return base


class TestManifestConstruction:
    def test_minimal_manifest_builds(self):
        row = lane_wire.ToolManifestRow.model_validate(_manifest_row())
        assert row.name == "image_gen_card"
        assert row.params_schema.type == "object"

    def test_empty_name_refuses(self):
        with pytest.raises(ValidationError):
            lane_wire.ToolManifestRow.model_validate(
                _manifest_row(name=""))

    def test_zero_version_refuses(self):
        with pytest.raises(ValidationError):
            lane_wire.ToolManifestRow.model_validate(
                _manifest_row(version=0))

    def test_garbage_version_refuses(self):
        with pytest.raises(ValidationError):
            lane_wire.ToolManifestRow.model_validate(
                _manifest_row(version="next"))

    def test_missing_params_schema_refuses(self):
        raw = _manifest_row()
        del raw["params_schema"]
        with pytest.raises(ValidationError):
            lane_wire.ToolManifestRow.model_validate(raw)

    def test_params_schema_without_type_refuses(self):
        raw = _manifest_row(params_schema={"properties": {},
                                           "required": []})
        with pytest.raises(ValidationError):
            lane_wire.ToolManifestRow.model_validate(raw)

    def test_dead_rider_refuses(self):
        with pytest.raises(ValidationError):
            lane_wire.ToolManifestRow.model_validate(
                _manifest_row(__dead_rider__="x"))

    def test_hidden_is_optional_bool(self):
        row = lane_wire.ToolManifestRow.model_validate(
            _manifest_row(hidden=True))
        assert row.hidden is True
        assert lane_wire.ToolManifestRow.model_validate(
            _manifest_row()).hidden is None


class TestSkillRowConstruction:
    def _row(self, **over):
        base = dict(id="card:image-gen", name="Image", scope="card",
                    genre="image", card="image-gen")
        base.update(over)
        return base

    def test_card_scoped_builds(self):
        assert lane_wire.SkillRow.model_validate(self._row()).card == \
            "image-gen"

    def test_card_and_model_scoping_refuses(self):
        with pytest.raises(ValidationError, match="never both"):
            lane_wire.SkillRow.model_validate(
                self._row(model="krea-2"))

    def test_steps_without_step_count_refuses(self):
        with pytest.raises(ValidationError, match="travel together"):
            lane_wire.SkillRow.model_validate(self._row(
                steps=[{"id": "s", "type": "comfyui", "plugin": "comfyui"}]))

    def test_step_count_mismatch_refuses(self):
        with pytest.raises(ValidationError, match="step_count"):
            lane_wire.SkillRow.model_validate(self._row(
                steps=[{"id": "s", "type": "comfyui", "plugin": "comfyui"}],
                step_count=3))

    def test_flow_row_steps_are_typed(self):
        row = lane_wire.SkillRow.model_validate(dict(
            id="flow:demo", name="demo", scope="flow",
            steps=[{"id": "s1", "type": "comfyui", "plugin": "comfyui"}],
            step_count=1))
        assert isinstance(row.steps[0], lane_wire.FlowStepRow)


class TestBundleConstruction:
    def _agent(self):
        return {"source": "card:x", "name": "X", "content": "body"}

    def test_card_bundle_builds(self):
        row = lane_wire.BundleRow.model_validate(dict(
            lane="x", card="x", kind="action_card", agent=self._agent(),
            tools=[_manifest_row()], flows=[], skills=[], read_first=[]))
        assert row.kind is lane_wire.PeekKind.ACTION_CARD

    def test_card_bundle_without_card_refuses(self):
        with pytest.raises(ValidationError, match="card"):
            lane_wire.BundleRow.model_validate(dict(
                lane="x", card=None, kind="action_card",
                tools=[], skills=[], read_first=[]))

    def test_card_bundle_with_flow_rows_refuses(self):
        with pytest.raises(ValidationError, match="flow rows"):
            lane_wire.BundleRow.model_validate(dict(
                lane="x", card="x", kind="action_card",
                flows=[dict(id="flow:d", name="d", scope="flow")],
                tools=[], skills=[], read_first=[]))

    def test_template_bundle_with_tools_refuses(self):
        with pytest.raises(ValidationError, match="tool manifests"):
            lane_wire.BundleRow.model_validate(dict(
                lane="x", card=None, kind="template",
                tools=[_manifest_row()], skills=[], read_first=[]))

    def test_template_bundle_with_card_refuses(self):
        with pytest.raises(ValidationError, match="no card"):
            lane_wire.BundleRow.model_validate(dict(
                lane="x", card="x", kind="template",
                tools=[], skills=[], read_first=[]))


# ── B. wire() keeps the served key discipline ──────────────────────

class TestWireProjections:
    def test_manifest_hidden_rides_only_when_declared(self):
        plain = lane_wire.ToolManifestRow.model_validate(
            _manifest_row()).wire()
        assert "hidden" not in plain
        hid = lane_wire.ToolManifestRow.model_validate(
            _manifest_row(hidden=True)).wire()
        assert hid["hidden"] is True

    def test_skill_row_carries_only_its_sources_keys(self):
        card_row = lane_wire.SkillRow.model_validate(dict(
            id="card:x", name="X", scope="card", genre="image",
            card="x")).wire()
        assert set(card_row) == {"id", "name", "description", "scope",
                                 "genre", "card"}
        flow_row = lane_wire.SkillRow.model_validate(dict(
            id="flow:d", name="d", scope="flow", steps=[], step_count=0)
        ).wire()
        assert set(flow_row) == {"id", "name", "description", "scope",
                                 "steps", "step_count"}

    def test_card_lane_row_serves_null_genre(self):
        row = lane_wire.CardLaneRow(
            lane="x", genre=None, title="X").model_dump()
        assert row["kind"] == "action_card"
        assert row["genre"] is None

    def test_flow_lane_row_shape(self):
        row = lane_wire.FlowLaneRow(
            lane="d", title="d", steps=3).model_dump()
        assert row == {"kind": "template", "lane": "d", "genre": None,
                       "title": "d", "description": "", "steps": 3}

    def test_lanes_envelope_error_only_on_refusal(self):
        ok = lane_wire.LanesEnvelope(count=0, lanes=[]).wire()
        assert "error" not in ok
        refuse = lane_wire.LanesEnvelope(
            count=0, lanes=[], error="unknown kind").wire()
        assert refuse["error"] == "unknown kind"

    def test_bundle_wire_keeps_nested_key_discipline(self):
        bundle = lane_wire.BundleRow(
            lane="x", card="x", kind=lane_wire.PeekKind.ACTION_CARD,
            agent=None, tools=[lane_wire.ToolManifestRow.model_validate(
                _manifest_row())],
            flows=[], skills=[], read_first=["card:x"]).wire()
        # agent None is contractual (the key rides, null)
        assert bundle["agent"] is None
        # nested manifest kept ITS discipline (no hidden: null rider)
        assert "hidden" not in bundle["tools"][0]
        assert bundle["kind"] == "action_card"


# ── C. source drift degrades LOUDLY (fixture tree) ─────────────────

GOOD_MANIFEST = {
    "name": "good_card", "version": 1, "kind": "card-compose",
    "card": "good-card", "model": "krea-2", "stage_title": "Good",
    "description": "a good card",
    "params_schema": {"type": "object",
                      "properties": {"prompt": {"type": "string"}},
                      "required": ["prompt"]},
}


@pytest.fixture()
def fixture_tree(tmp_path, monkeypatch):
    """A scratch plugins/engines tree: one good card, one card whose
    manifest is malformed, one card whose docs carry an empty-scope
    row the gate must refuse."""
    root = tmp_path
    cards = root / "plugins" / "engines" / "comfyui" / "action_cards" \
        / "image"
    (cards / "good-card" / "agents").mkdir(parents=True)
    (cards / "good-card" / "tool.json").write_text(
        json.dumps([GOOD_MANIFEST]), encoding="utf-8")
    (cards / "good-card" / "agents" / "AGENT.md").write_text(
        "---\nname: Good Agent\ndescription: the good card's agent\n---\n"
        "# Good Agent\n", encoding="utf-8")
    (cards / "bad-manifest").mkdir()
    (cards / "bad-manifest" / "tool.json").write_text(json.dumps([
        {"name": "", "version": 1, "kind": "card-compose",
         "card": "bad-manifest",
         "params_schema": {"type": "object", "properties": {},
                           "required": []}}]), encoding="utf-8")
    monkeypatch.setattr(ld, "ENGINES_ROOT",
                        root / "plugins" / "engines")
    monkeypatch.setattr(ld, "REPO", root)
    monkeypatch.setattr(ld, "_flow_rows", lambda: [])
    return root


class TestLoudSkip:
    def test_malformed_manifest_skips_loudly(self, fixture_tree,
                                             capsys):
        tools = ld.card_tools()
        assert [t["name"] for t in tools] == ["good_card"]
        err = capsys.readouterr().err
        assert "manifest refused" in err
        assert "name" in err            # field-named reason

    def test_dead_card_leaves_the_surface(self, fixture_tree):
        peek = ld.peek()
        lanes = [r["lane"] for r in peek["lanes"]]
        assert "good-card" in lanes
        assert "bad-manifest" not in lanes   # never advertised

    def test_dead_card_bundle_404s(self, fixture_tree):
        assert ld.lane_bundle("bad-manifest")[0] == 404

    def test_good_card_bundle_serves_validated_tools(self,
                                                     fixture_tree):
        code, bundle = ld.lane_bundle("good-card")
        assert code == 200
        # the served bundle re-validates through the wire model
        row = lane_wire.BundleRow.model_validate(bundle)
        assert row.tools[0].name == "good_card"
        assert row.agent is not None and row.agent.source == \
            "card:good-card"

    def test_unreadable_manifest_json_skips_loudly(self, tmp_path,
                                                   monkeypatch, capsys):
        root = tmp_path
        cards = root / "plugins" / "engines" / "e" / "action_cards" \
            / "image"
        (cards / "card").mkdir(parents=True)
        (cards / "card" / "tool.json").write_text("{not json",
                                                  encoding="utf-8")
        monkeypatch.setattr(ld, "ENGINES_ROOT",
                            root / "plugins" / "engines")
        monkeypatch.setattr(ld, "_flow_rows", lambda: [])
        assert ld.card_tools() == []
        assert "unreadable" in capsys.readouterr().err


# ── D. the real estate sweep round-trips ───────────────────────────

class TestEstateSweep:
    """Producer and consumer share one contract: what the disclosure
    engine serves re-validates through the same frozen rows."""

    def test_every_disk_manifest_validates(self):
        count = 0
        for tj in REPO.rglob("plugins/engines/*/action_cards/*/*/tool.json"):
            data = json.loads(tj.read_text(encoding="utf-8"))
            for m in (data if isinstance(data, list) else [data]):
                lane_wire.ToolManifestRow.model_validate(m)
                count += 1
        assert count >= 10, "the manifest sweep collapsed"

    def test_peek_round_trips(self):
        for kwargs in ({}, {"kind": "action_card"},
                       {"kind": "template"}):
            served = ld.peek(**kwargs)
            lane_wire.LanesEnvelope.model_validate(
                {**served, "lanes": served["lanes"]})

    def test_peek_unknown_kind_serves_named_refusal(self):
        served = ld.peek(kind="model")
        assert served["count"] == 0
        assert "unknown kind" in served["error"]

    def test_card_tools_round_trip(self):
        for m in ld.card_tools():
            lane_wire.ToolManifestRow.model_validate(m)

    def test_skills_round_trip(self):
        served = ld.skill_index()
        for s in served["skills"]:
            lane_wire.SkillRow.model_validate(s)

    def test_skill_read_round_trip(self):
        # one flow skill + one card doc, both re-validate
        code, doc = ld.skill_read("flow:audio-native-tts")
        assert code == 200
        lane_wire.SkillDocRow.model_validate(doc)

    def test_flow_bundle_round_trip(self):
        for r in ld.flow_lanes():
            code, bundle = ld.lane_bundle(r["lane"], kind="template")
            assert code == 200
            lane_wire.BundleRow.model_validate(bundle)

    def test_card_bundles_round_trip(self):
        served = ld.peek(kind="action_card")
        assert served["count"] >= 5
        for row in served["lanes"][:5]:
            code, bundle = ld.lane_bundle(row["lane"])
            assert code == 200, bundle
            lane_wire.BundleRow.model_validate(bundle)
