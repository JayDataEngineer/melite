"""CARD UI WALL (stroke 7, 2026-09-06) — the card lattice served
as generated machine UI (GET /v1/schema "cards": every card's
engine, kind contract, requires_model, and param JSON Schema
derived from its schema row).

Pinned:

  COVERAGE — every REGISTRY card appears; null params ONLY for
  the explicit schemaless set (the registry's _CARDS_WITHOUT_SCHEMA
  SSOT — all 19 cards since the mono-engine retirement; the
  declarations-plane stroke landed 2026-09-08); zero resolve errors
  (the mask-studio H3Params fossil + the fit/skin missing
  __init__.py holes died for this wall; the audio-cpp / anycreature
  / skintokens ghost targets retired mono-engine 2026-09-08).

  VERBATIM — engine/kinds/requires_model equal the registry row
  (served, never retyped); the payload json-serializes (the wire).

  SUFFICIENCY — params composed SOLELY from the served schema
  (defaults + recursive required-fill) pass validate_stage_params
  for every card with a served schema. MONO-ENGINE 2026-09-08: no
  live card serves a schema (all schemaless — the loop below skips
  them), and the last semantic gate (forge, "creature spec is
  missing") retired with its engine. The test stays as the regrowth
  guard: a card that regrows schema.py MUST round-trip here, or pin
  its content gate in SEMANTIC below (any other refusal is red).
"""

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "infra" / "python"))

# Schema documents are JSON (no future-import here — old-style alias).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None

import flow  # noqa: E402
import stage_params as sp  # noqa: E402

sp._mount_cards_for_wall()
SNAP = flow.schema_snapshot()
CARDS = SNAP["cards"]
ROWS = {r.card_id: r for r in sp.REGISTRY.rows}

# DECLARATIONS-PLANE STROKE (2026-09-07): the schemaless class is
# the REGISTRY's frozenset (python/stage_params._CARDS_WITHOUT_SCHEMA —
# STAGE 4 dropped the 16 comfyui schema.py rows, P32 added quad as
# the 17th). The wall cross-checks the SERVED /v1/forms view against
# the registry SSOT — serve and registry can never drift apart.
from stage_params import _CARDS_WITHOUT_SCHEMA as SCHEMALESS
# Content gates, not shapes — a regrown schema whose CONTENT no
# shape can satisfy pins its exact refusal here (the schema got us
# all the way to the content gate). MONO-ENGINE 2026-09-08: empty —
# forge ("creature spec is missing") retired with anycreature;
# h3-timeline / input-prep moved planes with the schema.py
# retirement (see below). An empty set is the honest state: every
# card with a served schema round-trips, and there are none.
SEMANTIC: dict[str, str] = {
    # h3-timeline ("no calls in card body") and input-prep ("could
    # not detect the source media type") gates MOVED PLANES with the
    # schema.py retirement: the Cordis compose door owns them now
    # (cli.ts — the h3 derivation law; the input-prep media sniff),
    # walled by the cordis goldens + validate parity. The py
    # stage-params plane no longer sees them (both cards schemaless).
}


def test_every_card_serves() -> None:
    assert set(CARDS) == set(ROWS), \
        set(ROWS) ^ set(CARDS)


def test_null_params_only_when_schemaless() -> None:
    nulls = {c for c, e in CARDS.items()
             if not isinstance(e, dict) or e.get("params") is None}
    assert nulls == SCHEMALESS, nulls ^ SCHEMALESS


def test_no_resolve_errors() -> None:
    errs = {c: e["params"]["error"] for c, e in CARDS.items()
            if isinstance(e.get("params"), dict)
            and "error" in e["params"]}
    assert not errs, errs


def test_served_verbatim_from_rows() -> None:
    for cid, entry in CARDS.items():
        row = ROWS[cid]
        assert entry["engine"] == row.engine, cid
        assert entry["kind_inputs"] == dict(row.kind_inputs), cid
        assert entry["kind_outputs"] == dict(row.kind_outputs), cid
        assert entry["requires_model"] == bool(row.requires_model), cid


def test_payload_is_wire() -> None:
    json.dumps(SNAP)


def _resolve(ref: str, defs: dict[str, JsonValue]) -> dict[str, JsonValue]:
    assert ref.startswith("#/$defs/"), ref
    return defs[ref.split("/")[-1]]


def _fill(js: dict[str, JsonValue], defs: dict[str, JsonValue]) -> JsonValue:
    """Params from the schema alone: defaults win, required
    recurses, everything else gets a type dummy."""
    if "$ref" in js:
        return _fill(_resolve(js["$ref"], defs), defs)
    if "default" in js:
        return js["default"]
    t = js.get("type")
    if t == "object" or "properties" in js:
        return {k: _fill(js["properties"][k], defs)
                for k in (js.get("required") or [])}
    if t == "array":
        return []
    if t == "boolean":
        return False
    if t in ("integer", "number"):
        return 0
    if t == "string":
        if js.get("enum"):
            return js["enum"][0]
        if js.get("format") == "uri":
            return "https://example.invalid/x"
        return "x"
    for branch in js.get("anyOf", []):
        if branch.get("type") != "null":
            return _fill(branch, defs)
    return None


def test_schema_sufficiency_round_trip() -> None:
    failures = []
    for cid in sorted(CARDS):
        entry = CARDS[cid]
        if not isinstance(entry.get("params"), dict) \
                or "properties" not in entry["params"]:
            continue
        js = entry["params"]
        params = _fill({"type": "object",
                        "properties": js["properties"],
                        "required": js.get("required", [])},
                       js.get("$defs", {}))
        if ROWS[cid].requires_model:
            params["model"] = "x"
        try:
            sp.validate_stage_params(cid, params, where="wall")
        except Exception as e:
            failures.append((cid, str(e)))
    others = [(c, m) for c, m in failures if c not in SEMANTIC]
    assert not others, others
    for cid, needle in SEMANTIC.items():
        hit = [m for c, m in failures if c == cid]
        assert hit and needle in hit[0], \
            (cid, "semantic gate moved or drifted", hit)
