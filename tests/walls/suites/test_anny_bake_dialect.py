"""AnnyBakeParams — the compile-time dialect door (2026-09-06).

Operator order, verbatim: "Where is MY GOD DAMNED COMPILE TIME
VALIDATION? YOU THINK USERS WANT TO SEE THIS [REDACTED 2026-11-05]?" — the child
preset's list-shaped local_changes sailed through the studio's
hand-rolled dialect rebuild (JS `[] || {}` keeps the list) into a
REGISTERED RUN and died on the GPU as a ComfyUI traceback in the
user's face.

THE DOOR: flow-declared pydantic models (Flow.initial_validators)
validated at the gateway's start/validate doors BEFORE any run
registers; the presets door serves the CANONICAL dialect string
(validated through the same model) and the studio posts it VERBATIM.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _anchor import REPO  # noqa: E402

import pytest
from pydantic import ValidationError

from flow import FlowError
from melite_models import AnnyBakeParams

FLOW_PY = REPO / "flows" / "anny-params" / "flow.py"
COMPONENT = (REPO / "plugins" / "engines" / "comfyui" / "action_cards"
             / "3d" / "anny" / "ui" / "studio" / "component.tsx")
GATEWAY_PY = REPO / "py" / "gateway.py"

GOOD_AUTHORED = json.dumps({
    "dialect": "authored",
    "phenotype": [0.5] * 11,
    "local_changes": {"upperarm-fat-incr": 0.3},
})
GOOD_ESTIMATED = json.dumps({
    "dialect": "estimated",
    "phenotype": [0.5] * 6,
    "scale": [0.0] * 139,
})
# THE KILLER (the exact request that burned a GPU slot, verbatim from
# data/runs/output/run-53a2b0e10813-73640e13/_request.json).
KILLER = json.dumps({
    "dialect": "authored",
    "phenotype": [0.5, 0.08, 0.15, 0.35, 0.2, 0.25, 0, 0.5, 0.5, 0.5, 0.5],
    "local_changes": [],
})


class TestTheModel:
    def test_wire_string_and_parsed_doc_both_validate(self):
        for raw in (GOOD_AUTHORED, json.loads(GOOD_AUTHORED)):
            m = AnnyBakeParams.model_validate(raw)
            assert m.dialect == "authored"
            assert m.local_changes == {"upperarm-fat-incr": 0.3}

    def test_the_killer_list_local_changes_refuses(self):
        with pytest.raises(ValidationError):
            AnnyBakeParams.model_validate(KILLER)

    def test_estimated_takes_raw_identity_coefficients(self):
        """No 0..1 check on the estimated phenotype (deliberate):
        the identity coefficients are MHR measurements, not slider
        positions — EstimatedParams and the node take them raw, so
        the door must too (a range refusal here would 4xx every
        real estimator preset)."""
        m = AnnyBakeParams.model_validate(json.dumps({
            "dialect": "estimated",
            "phenotype": [2.5, -1.2, 0.3, 0.9, 1.7, 0.1],
            "scale": [0.0] * 139,
        }))
        assert m.dialect == "estimated"

    @pytest.mark.parametrize("bad,needle", [
        ("not json", "not JSON"),
        ('[1,2,3]', "JSON object"),
        (json.dumps({"dialect": "authored", "phenotype": [0.5],
                     "local_changes": {}}), "11 dims"),
        (json.dumps({"dialect": "authored",
                     "phenotype": [2.0] + [0.5] * 10,
                     "local_changes": {}}), "outside 0.0..1.0"),
        (json.dumps({"dialect": "authored", "phenotype": [0.5] * 11,
                     "local_changes": {"x": 9.0}}), "outside -1.0..2.0"),
        (json.dumps({"dialect": "estimated", "phenotype": [0.5] * 6}),
         "wants scale"),
        (json.dumps({"dialect": "estimated", "phenotype": [0.5] * 6,
                     "scale": [0.0] * 100}),
         "wants 139 entries"),
        (json.dumps({"dialect": "estimated", "phenotype": [0.5] * 11,
                     "scale": [0.0] * 139}),
         "wants 6 dims"),
        (json.dumps({"dialect": "estimated", "phenotype": [0.5] * 6,
                     "scale": [0.0] * 139,
                     "local_changes": {"upperarm-fat-incr": 0.2}}),
         "silently ignored"),
        (json.dumps({"dialect": "authored", "phenotype": [0.5] * 11,
                     "local_changes": {}, "scale": [1.0]}),
         "not scale"),
    ])
    def test_field_clean_refusals(self, bad, needle):
        with pytest.raises(ValidationError) as e:
            AnnyBakeParams.model_validate(bad)
        assert needle in str(e.value)


class TestTheFlowDoor:
    def test_flow_declares_the_validator(self):
        sys.path.insert(0, str(REPO))
        import flow as flow_mod
        fl = flow_mod.load_flow("anny-params")
        assert fl.initial_validators == {"params_json": AnnyBakeParams}

    def test_killer_4xxes_before_registration(self):
        import flow as flow_mod
        fl = flow_mod.load_flow("anny-params")
        with pytest.raises(FlowError):
            fl.validate_initial({"params_json": KILLER})

    def test_good_dialects_pass(self):
        import flow as flow_mod
        fl = flow_mod.load_flow("anny-params")
        fl.validate_initial({"params_json": GOOD_AUTHORED})
        fl.validate_initial({"params_json": GOOD_ESTIMATED})

    def test_validator_must_be_a_model(self):
        from flow import Flow, Stage, FromInitial, Kind
        with pytest.raises(Exception):
            Flow(id="bad-validators",
                 stages=(Stage(id="s", engine="comfyui",
                               inputs={"x": FromInitial(key="x")},
                               expected={"x": Kind.text}),),
                 initial_validators={"x": "not-a-model"})

    def test_gateway_resolves_through_the_door(self):
        from gateway import resolve_request, ValidationError as VErr
        with pytest.raises(VErr):
            resolve_request({"flow": "anny-params",
                             "params_json": KILLER})


class TestServeSide:
    def test_every_estate_row_serves_a_valid_canonical(self):
        """The door serves params_json VALIDATED — a malformed
        declaration row refuses the door, never the studio's run."""
        from melite_models import load_model_py
        anny = load_model_py(REPO / "plugins/engines/comfyui/models/3d"
                             "/anny/model.py", "comfyui")
        rows = [c for c in anny.character_presets if c.params]
        assert rows, "estate archetypes vanished"
        for p in rows:
            AnnyBakeParams.model_validate(p.canonical_json())

    def test_canonical_json_is_object_dialect(self):
        """local_changes serializes as the node's OBJECT, never the
        row tuple (the killer shape)."""
        from melite_models import load_model_py
        anny = load_model_py(REPO / "plugins/engines/comfyui/models/3d"
                             "/anny/model.py", "comfyui")
        for p in anny.character_presets:
            if not p.params:
                continue
            doc = json.loads(p.canonical_json())
            assert isinstance(doc["local_changes"], dict)


class TestStudioSeam:
    def test_posts_served_params_json_verbatim(self):
        src = COMPONENT.read_text()
        assert "selected.params_json" in src, \
            "the studio must post the door-served canonical string"
        assert "const paramsJson = selected.params_json" in src
        # the hand-rolled rebuild is DEAD — the drift class dies with it
        assert 'JSON.stringify({\n      dialect:' not in src

    def test_door_serves_the_canonical_field(self):
        src = GATEWAY_PY.read_text()
        assert 'p.canonical_json() if p.params else None' in src
        assert "AnnyBakeParams.model_validate" in src, \
            "serve-side belt: what the door serves must validate"

    def test_notes_never_eat_the_card(self):
        """Operator order 2026-09-06: 'The ERROR MESSAGE takes up room
        on the [REDACTED 2026-11-05] card' — tenant notes clamp to two lines (full
        text on hover via title)."""
        src = COMPONENT.read_text()
        assert src.count("line-clamp-2") >= 2
        shape = (REPO / "plugins/engines/comfyui/action_cards/3d/anny"
                 / "ui/studio/shape.tsx").read_text()
        assert "line-clamp-3" in shape
