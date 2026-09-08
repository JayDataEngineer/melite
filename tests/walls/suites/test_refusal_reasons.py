"""REFUSAL REASONS WALL — the LOUD half of skip-and-continue
(2026-09-06 gap plug, operator order verbatim: "look for testing
gaps all over the library, and then plug them in").

RESILIENCE LAW: "A failing run marks itself error with the EXACT
failure message … Never a bare 'failed'". The reconstruction paths
(editor_runs drafts/runs, editor_forms specs, lane_disclosure)
skip-and-continue on wire drift — the skip line must still NAME the
field and the reason, or the skip is silent data loss. Both
formatters (`run_wire.refusal_reason`, `lane_wire.refusal_reason`)
had ZERO direct tests; every caller was covered, the formatter
itself was not. If either drifts into a bare str(error) or drops
field names, a skip becomes a mystery — this wall keeps the skip
quotable.

No GPU, no network. In-process row construction for real
ValidationErrors."""

import pathlib
import sys
import unittest

from pydantic import ValidationError

REPO = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "python"))

import lane_wire  # noqa: E402
import run_wire  # noqa: E402


def _run_error() -> ValidationError:
    try:
        run_wire.DraftBirthStage(id="", inputs=[], provenance="x")
    except ValidationError as e:
        return e
    raise AssertionError("empty id must refuse")


def _lane_error() -> ValidationError:
    try:
        lane_wire.ParamsSchemaRow(type="", properties={}, required=[])
    except ValidationError as e:
        return e
    raise AssertionError("empty type must refuse")


class TestRefusalReasons(unittest.TestCase):
    def test_run_wire_names_the_field_and_reason(self) -> None:
        line = run_wire.refusal_reason(_run_error())
        # one line, field-named: "id: String should have at least 1
        # character" — never a bare pydantic dump
        self.assertIn("id:", line)
        self.assertNotIn("\n", line)
        self.assertTrue(len(line) > len("id: "))

    def test_lane_wire_names_the_field_and_reason(self) -> None:
        line = lane_wire.refusal_reason(_lane_error())
        self.assertIn("type:", line)
        self.assertNotIn("\n", line)

    def test_both_join_multiple_errors_field_first(self) -> None:
        # a row with TWO bad fields formats both, '; '-joined, each
        # field-named — the reader can quote the line verbatim
        try:
            lane_wire.ParamsSchemaRow.model_validate(
                {"type": "", "properties": {}, "required": [1, "ok"]})
        except ValidationError as e:
            line = lane_wire.refusal_reason(e)
            self.assertIn("; ", line)
            self.assertIn("required", line)
        else:
            self.fail("must refuse")

    def test_nested_loc_flattens_dotted(self) -> None:
        # errors() loc can be a path (stages.0.id) — the formatter
        # flattens it dotted so one line stays one line
        try:
            run_wire.DraftBirthDoc(draft_id="d", intent="", status="ok",
                                   stages=[{"id": "", "inputs": [],
                                            "provenance": "p"}],
                                   createdAt=0, completedAt=None)
        except ValidationError as e:
            line = run_wire.refusal_reason(e)
            self.assertIn("stages.0.id:", line)
        else:
            self.fail("must refuse")


if __name__ == "__main__":
    unittest.main()
