"""REFUSAL REASONS WALL — the LOUD half of skip-and-continue
(2026-09-06 gap plug, operator order verbatim: "look for testing
gaps all over the library, and then plug them in").

RESILIENCE LAW: "A failing run marks itself error with the EXACT
failure message … Never a bare 'failed'". The reconstruction paths
(editor_runs drafts/runs, editor_forms specs) skip-and-continue on
wire drift — the skip line must still NAME the field and the
reason, or the skip is silent data loss.

(PURGE S-oracle 2026-09-08: the lane_disclosure reconstruction path
is deleted with its module — the disclosure doors are TS-native
now. Its formatter legs retired below; the quotable-skip contract
rides the TS refusalReason twin, pinned field-by-field by
test_formwire_parity.py (refusal taxonomy incl. the "loc: msg; …"
shape) and byte-by-byte by the planes fixture's 404/400 goldens.)

No GPU, no network. In-process row construction for real
ValidationErrors."""

import pathlib
import sys
import unittest

from pydantic import ValidationError

REPO = pathlib.Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "infra" / "python"))

import run_wire  # noqa: E402


def _run_error() -> ValidationError:
    try:
        run_wire.DraftBirthStage(id="", inputs=[], provenance="x")
    except ValidationError as e:
        return e
    raise AssertionError("empty id must refuse")


# RETIRED with lane_wire.py (S-oracle): the lane formatter's three
# legs (field-named single line; '; '-joined multi-error; the twin
# pointer above names their homes). History at the parent commit.
class TestRefusalReasons(unittest.TestCase):
    def test_run_wire_names_the_field_and_reason(self) -> None:
        line = run_wire.refusal_reason(_run_error())
        # one line, field-named: "id: String should have at least 1
        # character" — never a bare pydantic dump
        self.assertIn("id:", line)
        self.assertNotIn("\n", line)
        self.assertTrue(len(line) > len("id: "))

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
