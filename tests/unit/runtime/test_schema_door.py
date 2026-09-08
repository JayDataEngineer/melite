"""SCHEMA DOOR WALL (stroke 2, 2026-09-06) — GET /v1/schema.

The door serves the ENTIRE flow-authoring vocabulary so an agent
composes without reading plugin source (the review's #1 authoring
friction). This wall pins that the payload ANSWERS THE LOADERS —
it can never drift from the rows the validators enforce:

  * kinds == the closed Kind enum, verbatim
  * engines == plugins.scan_engines(), with default outputs that
    match each engine module's DEFAULT_OUTPUT
  * flows == scan_flow_ids(), every row construct-clean (no error
    rows), every stage's kinds inside the vocabulary and its engine
    inside the engine list
  * stage_shape.fields == STAGE_KEYS (the flow_inline gate refuses
    unknown fields against exactly this set)
  * the ROUTES table carries the door
"""

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "python"))

import flow  # noqa: E402
import gateway  # noqa: E402
import plugins  # noqa: E402

# The snapshot serves as JSON on /v1/schema (no future-import — old-style).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None


def _snap() -> dict[str, JsonValue]:
    return flow.schema_snapshot()


def test_kinds_are_the_enum_verbatim() -> None:
    snap = _snap()
    assert snap["kinds"] == [k.value for k in flow.Kind]


def test_engines_answer_the_scan_with_defaults() -> None:
    snap = _snap()
    scanned = sorted(plugins.scan_engines())
    assert sorted(snap["engines"]) == scanned
    for eid, served in snap["engines"].items():
        assert not isinstance(served, dict), (
            "engine %r lists an error: %s" % (eid, served))
        mod = plugins.load_engine(eid)
        expect = getattr(mod, "DEFAULT_OUTPUT", None)
        assert served == (expect.value if expect is not None else None)


def test_flows_answer_the_registry_clean() -> None:
    snap = _snap()
    assert sorted(snap["flows"]) == flow.scan_flow_ids()
    for fid, row in snap["flows"].items():
        assert "error" not in row, "flow %r serves an error row" % fid
        for st in row["stages"]:
            assert st["engine"] in snap["engines"], (
                "flow %r stage %r names engine %r the door does not "
                "list" % (fid, st["id"], st["engine"]))
            for kind in list(st["outputs"].values()) + \
                    list(st["expected"].values()):
                assert kind in snap["kinds"], (
                    "flow %r stage %r names kind %r outside the "
                    "vocabulary" % (fid, st["id"], kind))


def test_stage_shape_matches_the_gate() -> None:
    snap = _snap()
    assert snap["stage_shape"]["fields"] == sorted(flow.STAGE_KEYS)
    # the wire the gate actually accepts — the example must construct
    import copy
    body = copy.deepcopy(snap["flow_body"]["example"])
    compiled = flow.flow_from_body(body)
    assert [st.id for st in compiled.stages] == ["gen", "remesh"]


def test_route_table_carries_the_door() -> None:
    row = [r for r in gateway.ROUTES if r.path == "/v1/schema"]
    assert row and row[0].method == "GET"
