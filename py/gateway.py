#!/usr/bin/env python3
"""The Python gateway — Phase 3 of the everything-is-ComfyUI consolidation.

One file. Starlette ASGI + uvicorn (no heavyweight deps; the base env
already carries both). Replaces the C/C++ server
with the same queue contract the estate already speaks:

  POST /v1/flows/start
  GET  /v1/flows/status/RUN_ID
  POST /v1/flows/stop/RUN_ID
  GET  /v1/queue

Laws carried over verbatim from AGENTS.md:
  INFERENCE LAW   — every run goes through this queue; one active run
                    (serial GPU); the stop door interrupts the engine,
                    never kills processes.
  QUEUE LANE LAW  — no fallbacks, no default models; unresolved requests
                    are rejected 4xx BEFORE any run is registered.
  RESILIENCE LAW  — a bad run documents its exact failure in the sidecar
                    and the queue continues; the gateway outlives every
                    run failure.

Run dirs are drop-in compatible: output/RUN_ID/_request.json,
_flow.json (atomic tmp+rename), engine artifacts beside them.

Engines + card composition live in the OWNING PLUGIN (PLUGIN
ARCHITECTURE LAW): packages/<id>/engines/<dir>/engine.yaml declares the
type; engine.py exports
    async def execute(node, run_dir, inputs, stop_event) -> dict
    async def stop(node, run_dir) -> None   (optional)
and compose.py (or a compose/ package) exports card_compose. py/plugins.py
mounts them; the server names no lane and no engine — it reads the type
from the graph.
"""

from __future__ import annotations

import asyncio
import base64
import importlib.util
import json
import os
import re
import signal
import struct
import sys
import threading
import time
import uuid
from collections import deque
from collections.abc import AsyncIterator, Awaitable, Callable, Iterable
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import TYPE_CHECKING, TypeVar

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import Response
from starlette.websockets import WebSocket
from starlette.routing import Route as StarRoute, WebSocketRoute as WSRoute

REPO = Path(__file__).resolve().parent.parent
# SERVER-STATE ROOT LAW (operator order, 2026-09-03: "build was
# c++ and c era"): ALL runtime state lives under the data root's
# runs/ stream — run dirs, drafts, ledgers. build/ was the
# C++ CMake dir the C server happened to cwd into; it is GONE.
# (One hop runs/output: editor_runs' server_root contract appends
# "output"; flattening it waits for that file to leave flight.)
# 2026-09-06 (single-writer lock seam): MELITE_STATE_ROOT moves the
# whole state tree — the R2 one-writer lock makes a SECOND gateway
# on the SAME root refuse loud, which is right for production but
# must not wedge the wall suites' hermetic scratch gateways: they
# boot with their own tmp root via this env (tests/_bootstrap.py
# boot_scratch_gateway owns the isolation — the ONE home for boots).
STATE_ROOT = Path(os.environ.get("MELITE_STATE_ROOT")
                  or (REPO / "data" / "runs"))
OUT_ROOT = STATE_ROOT / "output"
# L3 of the test/prod barrier: test runs are routed to a sibling
# root so the production output dir cannot contain them. /v1/assets
# reads ONLY OUT_ROOT; the test view reads TEST_OUT_ROOT via
# ?include_test=true. (L1+L2 are defense-in-depth: a test run that
# somehow lands in OUT_ROOT stays hidden because its sidecar test
# flag still excludes it.)
TEST_OUT_ROOT = STATE_ROOT / "test-output"

IDENT_RE = re.compile(r"^[a-z_][a-z0-9_-]*$")

# The artifact-serving URL prefix — owned by editor_runs (the asset
# door implementation); stamped here for stage url/gallery and the
# route row. One constant, no restated coordinates. (Phase 2
# consolidation, 2026-09-04: moved from /editor/assets/runs — outside
# /v1 — to the assets family.)
from editor_runs import ASSET_URL_PREFIX, draft_id_ok  # noqa: E402

if TYPE_CHECKING:
    from flow_graph import FlowGraph, FlowNode, NodeRow
    from melite_models import CharacterPreset, Model, Provision

# The request-body shape: decoded JSON (objects, arrays, scalars).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

# A raw-bytes handler payload: (unused, headers, body) — the asset /
# bridge doors bypass JSON serialization (see _adapt).
type RawTriple = tuple[dict[str, str], dict[str, str], bytes]

# Every _h_* handler answers (status, payload): a JSON body, or a raw
# triple for the byte doors.
type HandlerResult = tuple[int, dict[str, JsonValue] | RawTriple]

_T = TypeVar("_T")


class ValidationError(Exception):
    """Loud 4xx before any run is registered (QUEUE LANE LAW).

    R4.2 (2026-09-06): the refusal carries MACHINE keys beside the
    human text — code (stable taxonomy, ALWAYS set), loc (which
    field/stage, when the raiser knows), expected/got (when the
    raiser holds both sides). str(e) is the VERBATIM legacy text:
    refusal-parity goldens compare the message class, so the text
    never changes for structure's sake. The default code
    invalid_request means exactly what it says — the door refused
    the request, read error for why; raisers that know more set a
    precise code."""

    def __init__(self, message: str, *, code: str = "invalid_request",
                 loc: str | None = None,
                 expected: str | None = None,
                 got: str | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.loc = loc
        self.expected = expected
        self.got = got


def _refusal(e: ValidationError) -> dict[str, JsonValue]:
    """R4.2: a caught refusal → the wire envelope. error is the
    verbatim text (wire compatibility); code always rides; loc /
    expected / got ride only when the raiser set them (absent keys
    are honest — never null placeholders)."""
    body: dict[str, JsonValue] = {"error": str(e), "code": e.code}
    if e.loc is not None:
        body["loc"] = e.loc
    if e.expected is not None:
        body["expected"] = e.expected
    if e.got is not None:
        body["got"] = e.got
    return body


def _pydantic_first(e: BaseException) -> dict[str, JsonValue] | None:
    """R4.2: the first pydantic error row off e, its cause chain
    (depth 3), or its stringified text — whichever carries it.
    The card arms stringify the refusal at the package boundary
    (compose.py `card params refused: %s`), so the live object is
    usually gone and only the stable pydantic summary text remains
    (`1 validation error for MusicParams\\nprompt\\n  ...
    [type=string_type, input_value=...`). Best-effort throughout:
    anything unrecognized yields None and the refusal rides
    code-only (honest — never a guessed loc)."""
    seen = 0
    cur: BaseException | None = e
    while cur is not None and seen < 4:
        seen += 1
        fn = getattr(cur, "errors", None)
        if type(cur).__name__ == "ValidationError" and callable(fn):
            try:
                rows = fn()
            except Exception:
                rows = []
            if rows and isinstance(rows[0], dict):
                return rows[0]
        nxt = getattr(cur, "__cause__", None) \
            or getattr(cur, "__context__", None)
        cur = nxt if isinstance(nxt, BaseException) else None
    import re
    m = re.search(
        r"(\d+) validation errors? for \S+\n"
        r"([A-Za-z_][A-Za-z0-9_]*)\n  ([^\n\[]+)"
        r"\[type=([a-z_]+),", str(e))
    if m:
        return {"loc": (m.group(2),), "msg": m.group(3).strip(),
                "type": m.group(4),
                "input": (re.search(r"input_value=(.*?)(, input_type|\])",
                                      str(e)) or [None, ""])[1]}
    return None


def _compose_refusal(phase: str, e: Exception) -> ValidationError:
    """R4.2: a card_compose arm failure → a structured refusal.
    A pydantic ValidationError (parse_card_body's field-named
    refusal — the rc=-3 class) carries its OWN loc/input natively:
    the first error row maps to loc (params.<field>), expected (the
    pydantic error type), got (the offending input, stringified).
    Anything else is a phase failure with the verbatim text.
    Duck-typed — the gateway never imports pydantic for this."""
    first = _pydantic_first(e)
    if first is not None:
        raw_loc = first.get("loc", ())
        loc = "params." + ".".join(
            str(p) for p in raw_loc) if raw_loc else "params"
        return ValidationError(
            "card_compose phase %s: %s" % (phase, e),
            code="card_compose", loc=loc,
            expected=str(first.get("type", "")),
            got=str(first.get("input", ""))[:200])
    return ValidationError("card_compose phase %s: %s" % (phase, e),
                           code="card_compose")





# STRICT_BODY — the silent-drop class dies here.
# (QUEUE LANE LAW, 2026-09-05) A start body MUST be {door: ...} plus
# scalar run inputs. Body keys that the runner never reads are
# pollution (they ride _request.json, lie in the tensor pool as
# inert passengers, and teach callers the wrong shape). The C-era
# runner knob names are explicitly refused — they survived a
# deprecation cycle as silent drops; strict=True kills them at the
# door. The DOOR_KEYS set is the door vocab; everything else
# entering the run is a scalar input (the model's params).
#
# SSOT for the retired runner knob set. tests/walls/suites/
# test_strict_body.py imports this directly (no second list — drift
# would mean a knob name is allowed at one site and refused at the
# other; the wall must always reflect the implementation).
RETIRED_RUNNER_KNOBS = frozenset({
    "start_from", "stop_after", "reuse_run_id", "partial_run",
    "overrides", "since", "from_index",
})
# RETIRED CARRY KEYS (2026-09-05, the pipe-carry retirement): the
# 2026-08-10 wire stowed `pipe` + `stage_id` on every card run body on
# the claim "the server stashes both and get_run_status surfaces them
# as flow_doc + stage_id" — a contract NO gateway ever implemented
# (nothing in py/ reads pipe or emits flow_doc). The stowaways rode
# _request.json as inert passengers until the frozen card rows landed
# (validated-row sweep, 2026-09-05) and began refusing them at RUN
# time as extra_forbidden — the incident class this retirement closes.
# The revive rail is REAL state: the draft door (draft_id) + the run
# registry. Refused here, BEFORE the doors resolve, with the reason.
RETIRED_CARRY_KEYS = frozenset({"pipe", "stage_id"})
_INTERNAL_KEY_PREFIX = "_"  # C-era runner internal naming — refused


def _strict_body(body: JsonValue) -> None:
    """Loud 400 on any body key the runner never reads.

    Door keys are allowed (the door itself is one of them); model
    params ride through initial_pool as scalar inputs (params have
    open vocabulary — the model class declares them). The strict
    class is the retired runner knob names, the retired pipe-carry
    keys, and C-era internal naming."""
    if not isinstance(body, dict):
        return
    bad = [k for k in body
           if k in RETIRED_RUNNER_KNOBS
           or (k.startswith(_INTERNAL_KEY_PREFIX)
               and k not in DOOR_KEYS)]
    if bad:
        raise ValidationError(
            "request body carries retired runner knob(s) "
            + repr(sorted(bad))
            + " — the runner never reads these (silent-drop class); "
            "remove them")
    carry = [k for k in body if k in RETIRED_CARRY_KEYS]
    if carry:
        raise ValidationError(
            "request body carries retired pipe-carry key(s) "
            + repr(sorted(carry))
            + " — the 2026-08-10 stowaway wire: no gateway ever "
            "stashed it (flow_doc was never emitted). The revive "
            "rail is the draft (draft_id) + the run registry; card "
            "bodies carry params only")


def resolve_request(body: JsonValue) -> FlowGraph | dict[str, JsonValue]:
    """Resolve the start request to a flow graph — loudly.

    THREE doors (QUEUE LANE LAW, 2026-09-04 flows rework + the
    multi-step compose phase; design record docs/queue/flows.md,
    typed edges docs/queue/flow-typed-edges.md):
      {flow: name}  -> flows/<name>/flow.py declares FLOW = Flow(...)
                      (py/flow.py: frozen rows, validation AT
                      construction, edges structural; loaded on
                      demand, engines validated through the plugin
                      bus — a bad flow refuses HERE, never on the GPU)
      {flow_inline: {...}} -> the SAME rows as JSON (flow_from_body):
                      an agent-constructed multi-step flow, compiled
                      by the identical validators — iterate at
                      POST /v1/flows/validate, then start when it
                      compiles
      {model: mid}  -> card-only models: the OWNING plugin's compose
                      hook builds the graph (phase 1 here, phase 2 at
                      registration). Cards are the queue-native
                       interface (INFERENCE LAW).
    """
    if not isinstance(body, dict):
        raise ValidationError("request body must be a JSON object")
    _strict_body(body)
    doors = [k for k in ("flow", "flow_inline", "model") if k in body]
    if len(doors) > 1:
        raise ValidationError(
            "ambiguous request: names %s — provide exactly one of "
            "flow, flow_inline, model" % doors)
    if "flow" in body:
        import flow as flow_mod
        try:
            fl = flow_mod.load_flow(str(body["flow"]))
            # THE COMPILE-TIME INITIAL DOOR (2026-09-06): flow-declared
            # pydantic models validate present initial keys BEFORE any
            # run registers — a bad dialect 4xxes field-clean here,
            # never as a node traceback after a GPU claim. compile()
            # runs that door, then the BRANCH prune, then to_graph.
            graph, _skipped = fl.compile(dict(body))
            return graph
        except flow_mod.FlowError as e:
            raise ValidationError(str(e))
    if "flow_inline" in body:
        import flow as flow_mod
        try:
            fl = flow_mod.flow_from_body(body["flow_inline"])
            graph, _skipped = fl.compile(dict(body))
            return graph
        except flow_mod.FlowError as e:
            raise ValidationError(str(e))
    if "model" in body:
        mid = str(body["model"])
        # card-only model: the plugin hook composes the graph (phase 2)
        skeleton, etype, extra = resolve_card_model(body, mid)
        return {"__card__": True, "skeleton": skeleton,
                "etype": etype, "extra": extra, "name": mid}
    raise ValidationError("no flow selected: provide flow, flow_inline "
                          "or model")


# The start-body keys that SELECT a graph, never ride it: the initial
# tensor pool (execute) is built from everything else — prompt and
# friends are run INPUTS, but a door key's payload is the graph
# declaration itself. flow_inline joined the exclusion 2026-09-05:
# without it the whole typed body leaked into the pool as a passenger
# dict (inert for resolve_inputs, pollution in every _request.json
# downstream read). ONE list, no restated copies.
DOOR_KEYS = ("yaml", "flow", "flow_inline", "model")

# The card-envelope lift (2026-09-05, pipe-carry retirement): the arms'
# contract is `body == {"params": {...}}` — ONE shape, no per-arm
# envelope stripping (the "flat form: the body IS the params, minus
# model" fossil in 14 arms was the hole the pipe-carry stowaways fell
# through into the frozen rows). The GATEWAY owns the envelope: door
# keys + the run-door flags. The lifted body is what card_compose
# sees, BOTH phases; the arms read body["params"] and nothing else.
# service rides here too (2026-09-05 mod-audit follow-up): the
# editor's form controller bakes `{ service }` into generate payloads
# and NO backend reader consumes it — before this it fell through
# into params and every forbid row 400'd naming 'service' (proved on
# the image-edit door). Routing chrome is envelope, never params.
CARD_ENVELOPE_KEYS = DOOR_KEYS + ("draft_id", "test", "service")


def card_compose_body(body: dict[str, JsonValue]
                      ) -> dict[str, JsonValue]:
    """The body a card arm receives: the run body minus the gateway
    envelope, restaged as the ONE params stanza. Wall-pinned shape —
    the arms' flat-form branch is retired with it. The NESTED form
    (a body carrying its own `params` key) rides THROUGH as a
    params.params key — the wall pins it; the compose plane (cordis
    CLI) unwraps the stanza before the admission gate."""
    return {"params": {k: v for k, v in body.items()
                       if k not in CARD_ENVELOPE_KEYS}}


def initial_pool(request: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """The run's initial input pool: request body minus the door keys.

    Pure seam (wall-tested): the pool is scalar/stringly run inputs —
    prompt, seed, wired artifact URLs — never a graph declaration."""
    return {k: v for k, v in request.items() if k not in DOOR_KEYS}


# (_find_model_yaml/_engine_type_of retired 2026-09-02: the nondeterministic
# first-glob-hit model resolution moved to py/plugins.py — declarer-wins,
# sorted, LOUD refusals. The C glob-order bug dies here.)


# OUTPUT CONTRACT (operator order, 2026-09-07: "All the action cards
# have like... defaults, recipes, input + output gates") — the card
# declares what a completed run DELIVERS (typed OutputRow rows on the
# ActionCard); the gateway refuses a run that delivers none of a
# row's patterns. Inputs were already gated in types; outputs stop
# being merely recorded.

_CARD_GLOB_PATTERNS = (
    "engines/*/cards/*/card.py",
    "engines/*/action_cards/*/card.py",
    "engines/*/action_cards/*/*/card.py",
    "engines/*/action_cards/*/*/py/card.py",
)


def _card_class_paths(plugins_dir: Path) -> list[Path]:
    """Every card.py the discovery plane sees (sorted, deterministic)."""
    out: list = []
    for pat in _CARD_GLOB_PATTERNS:
        out.extend(plugins_dir.glob(pat))
    return sorted(out)


def _load_card_class(card_id: str) -> "type | None":
    """card id -> the ActionCard subclass (or None, LOUD on failure).

    Shared by the requires walk and the output-contract gate — one
    resolution plane, no per-caller glob drift.
    """
    import sys as _sys
    py_dir = str(REPO / "py")
    if py_dir not in _sys.path:
        _sys.path.insert(0, py_dir)
    try:
        from melite_cards import load_card_py
    except ImportError:
        print("[card-load] melite_cards unavailable", flush=True)
        return None
    for cpy in _card_class_paths(REPO / "packages"):
        try:
            pdir = cpy.parent
            if pdir.name == "py":
                engine = pdir.parent.parent.parent.parent.name
            else:
                engine = (pdir.parent.parent.name
                          if pdir.parent.name in ("cards", "action_cards")
                          else pdir.parent.parent.parent.name)
            cls = load_card_py(str(cpy), engine)
        except Exception as e:
            # LOUD but non-fatal: discovery must not die on one broken
            # file (the requires walk collects these; here a print is
            # the honest floor)
            print("[card-load] %s failed to load (%s: %s)" % (
                cpy.relative_to(REPO), type(e).__name__, e), flush=True)
            continue
        if getattr(cls, "id", "") == card_id:
            return cls
    return None


def _card_id_for_model(mid: str) -> "str | None":
    """model id -> the card id the model declares (or None).

    Mirrors the requires walk's first loop: the model class names its
    card; no card attr = the family fallback owns it (caller decides).
    """
    import sys as _sys
    py_dir = str(REPO / "py")
    if py_dir not in _sys.path:
        _sys.path.insert(0, py_dir)
    try:
        from melite_models import load_model_py
    except ImportError:
        return None
    plugins_dir = REPO / "packages"
    for engine_dir in sorted(plugins_dir.glob("engines/*")):
        for mpy in sorted(engine_dir.glob("models/*/*/model.py")):
            if mpy.parent.name != mid:
                continue
            try:
                cls = load_model_py(str(mpy), engine_dir.name)
            except Exception:
                continue
            if cls.card:
                return cls.card
    return None


def _output_violation(card_cls: type[object], artifacts: "list[str] | None") -> str | None:
    """The OUTPUT CONTRACT check: None = honored; str = the exact
    refusal (documented failure — RESILIENCE LAW shape, the queue
    continues). Suffix match, case-insensitive, any-of per row."""
    rows = getattr(card_cls, "card_outputs", ()) or ()
    if not rows:
        return None
    arts = [str(a).lower() for a in (artifacts or []) if a]
    for row in rows:
        if not any(a.endswith(tuple(row.patterns)) for a in arts):
            return ("output contract violation: card %r promises %s "
                    "(%s) but the run delivered none of them; "
                    "artifacts: %s" % (
                        getattr(card_cls, "id", "?"), row.label,
                        ", ".join(row.patterns),
                        ", ".join(sorted(set(arts))[:8]) or "(none)"))
    return None


def _find_card_requires(mid: str, plugins_dir: str | None = None) -> list[str]:
    """Resolve model id -> the owning CARD's requires list (or []).

    (2026-09-02, the identity rung) Fully class-driven: the model class
    names the card (`card` attr), the CARD class carries `requires`
    (tuple of engine extension ids, declared on the ActionCard).
    card.yaml is extinct; requires rides the class.
    """
    if plugins_dir is None:
        plugins_dir = REPO / "packages"
    import sys as _sys
    # Cards + models DSL now live in py/ (gateway infra, not packages/).
    py_dir = str(REPO / "py")
    if py_dir not in _sys.path:
        _sys.path.insert(0, py_dir)
    try:
        from melite_models import load_model_py
        from melite_cards import load_card_py
    except ImportError:
        return []
    card_id = None
    # LOUD DISCOVERY (2026-09-07 review M1): the old silent continues
    # let a broken model.py/card.py VANISH from requires resolution —
    # the extension gate silently resolved [] (a live 2026-09-06 bug
    # class). Failures are collected; a resolution that comes up empty
    # with swallowed failures REFUSES with all of them; a resolution
    # that succeeds still LOGS what it stepped over (never silent).
    _load_failures: list[str] = []
    for engine_dir in sorted(plugins_dir.glob("engines/*")):
        for mpy in sorted(engine_dir.glob("models/*/*/model.py")):
            if mpy.parent.name != mid:
                continue
            try:
                cls = load_model_py(str(mpy), engine_dir.name)
            except Exception as e:
                _load_failures.append("%s (%s: %s)" % (
                    mpy.relative_to(REPO), type(e).__name__, e))
                continue
            if cls.card:
                card_id = cls.card
                break
        if card_id:
            break
    # family fallback: models without a `card` attr resolve through the
    # card whose families include them (h3-timeline: the model declares
    # no card, the card declares the family)
    nmid = mid.replace("_", "-")
    for cpy in _card_class_paths(plugins_dir):
        try:
            # depth-1 card dir → engine 3 hops up; genre-grouped
            # (action_cards/<genre>/<card>/) → 4 (2026-09-02 reorg);
            # THE CARD PATTERN (2026-09-03): python lives in py/ → 5.
            # Without the py/ arm this loop finds NO modern card and
            # every requires resolves [] (gate silently dead — found
            # live 2026-09-06 when the img-to-mesh family gate proved
            # unwired end to end).
            pdir = cpy.parent
            if pdir.name == "py":
                engine = pdir.parent.parent.parent.parent.name
            else:
                engine = (pdir.parent.parent.name
                          if pdir.parent.name in ("cards", "action_cards")
                          else pdir.parent.parent.parent.name)
            cls = load_card_py(str(cpy), engine)
        except Exception as e:
            _load_failures.append("%s (%s: %s)" % (
                cpy.relative_to(REPO), type(e).__name__, e))
            continue
        if card_id:
            if cls.id != card_id:
                continue
        else:
            fams = [str(f).replace("_", "-")
                    for f in cls.families_of()]
            if nmid not in fams:
                continue
        reqs = list(getattr(cls, "requires", ()) or [])
        # Per-family capabilities (2026-09-06, img-to-mesh live-fire):
        # requires_by_family maps family/model id to extra extension
        # ids, merged here for the requesting model. Card-level
        # requires still applies to every family.
        fam_reqs = getattr(cls, "requires_by_family", {}) or {}
        if isinstance(fam_reqs, dict):
            for _key, _val in fam_reqs.items():
                if _key in (mid, nmid):
                    _more = (list(_val) if isinstance(_val, (tuple, list))
                             else [_val])
                    reqs.extend(_more)
                    break
        if _load_failures:
            print("[requires:%s] stepped over broken declarations while "
                  "resolving: %s" % (mid, "; ".join(_load_failures)),
                  flush=True)
        return reqs
    if _load_failures:
        raise RuntimeError(
            "requires resolution for %r found no card AND stepped over "
            "broken declarations — fix these (the extension gate "
            "refuses to resolve silently-empty): %s"
            % (mid, "; ".join(_load_failures)))
    return []


def resolve_card_model(body: dict[str, JsonValue], mid: str
                       ) -> tuple[FlowGraph, str, dict[str, JsonValue]]:
    """{model} arm for card-only models (no flow.yaml on disk).

    Mirrors the C card path: seed a minimal skeleton carrying the engine
    type, let the OWNING plugin's hook generate the real graph (phase 2
    at run registration; phase 1 here for validation + extra inputs).
    Model resolution is DETERMINISTIC (py/plugins.py): all copies of the
    model's model.yaml, engine-stanza declarers win, first in sorted
    plugin order owns it; no declarer = LOUD refusal.
    Returns (skeleton_text, etype, extra) or raises loudly.
    """
    # ARTIFACT-REF GATE (2026-09-05 image-edit incident): every
    # /v1/assets/... URL wired into the body must exist on the
    # served mounts BEFORE the card composes — a dangling upstream
    # output is a 4xx here, never a phase-2 compose failure, never
    # a GPU-cycle burn, never a zombie slot. Card-agnostic: asset
    # URLs are gateway vocabulary (this gateway serves them), not
    # lane knowledge — so this runs for EVERY card, including
    # future ones whose compose forgets its own existence check.
    # Runs BEFORE phase 1 (fail fast; a sloppy compose can never
    # admit a dangling ref into registration).
    try:
        from artifact_refs import find_dangling_refs
    except ImportError:
        find_dangling_refs = None
    if find_dangling_refs is not None:
        dangling = find_dangling_refs(body)
        if dangling:
            location, ref, why = dangling[0]
            raise ValidationError(
                "dangling artifact ref at %r: %s (%s)" %
                (location, ref, why))
    # CARD REQUIRES LAW: check declared extensions before compose.
    # EXTENSION LAW: our authored packs live as submodules under
    # vendor/comfyui_extensions — the on-disk fallback resolves there.
    requires = _find_card_requires(mid)
    if requires:
        try:
            from py.card_requires import check_card_requires
            custom_nodes_dir = str(REPO / "vendor" / "comfyui_extensions")
            # ESTATE ROUTING (2026-09-06 tagger audit): the gate reads the
            # ESTATE's ComfyUI (exactly-one-url, the poser-bridge shape) —
            # never a literal default port (18465 was a foreign instance).
            # Unresolvable config degrades to disk-only (None), which is
            # exactly the unreachable-server behavior (T7 refusal stands).
            _estate_url = None
            try:
                from estate_config import load as _load_ecfg
                _urls = [e.url for e in _load_ecfg().engines.values()
                         if getattr(e, "url", None)]
                if len(_urls) == 1:
                    _estate_url = _urls[0]
            except Exception:
                _estate_url = None
            ok, msg = check_card_requires(
                requires, server_url=_estate_url,
                custom_nodes_dir=custom_nodes_dir)
            if not ok:
                raise ValidationError("card requires: %s" % msg)
        except ImportError:
            pass  # card_requires module not available — skip check
    etype, _my = _plugin_loud(_plugin_bus.resolve_model, mid)
    import flow_graph
    # VARIANT ROUTE LENS (2026-09-05): a route id (variant cell, e.g.
    # qwen-img-edit-2511-lightning4) resolves to its OWNING family —
    # the graph/skeleton is addressed by the family; the ROUTE's
    # variant stamps (resolver_defaults: lightning's steps=4) apply
    # exactly as the form-spec route lens serves them. The editor
    # posts the stamps it was seeded with; a BARE body gets the same
    # stamps overlaid here (absent keys only) — the bare/API path
    # compiles the SAME recipe the picker promised (before this, no
    # arm applied the variant layer and krea-2-raw silently compiled
    # the turbo recipe — the mod-audit route wall caught it).
    fam = _route_family(mid, body)
    body = _route_stamp_overlay(body, mid)
    skeleton = flow_graph.FlowGraph(
        name=fam, engine_type=etype, description="card-composed",
        nodes=())
    try:
        _, extra = card_hooks.compose(
            card_compose_body(body), fam, "", skeleton, [etype])
    except Exception as e:
        raise _compose_refusal("1", e)
    return skeleton, etype, extra


def _route_family(mid: str, body: dict[str, JsonValue]) -> str:
    """The model id the card arm addresses: mid itself, or mid's
    owning family when mid names a variant route."""
    cls = _route_owner(mid)
    return cls.id if cls is not None else mid


def _route_owner(mid: str) -> str | None:
    """The Model class whose _routes owns mid, or None. Generic
    plugin data (melite_models scan) — no lane knowledge here."""
    from melite_models import scan_engine_models
    try:
        for _path, cls in scan_engine_models(str(REPO)).values():
            if mid in (getattr(cls, "_routes", None) or {}):
                return cls
    except Exception:
        pass
    return None


def _route_stamp_overlay(body: dict[str, JsonValue],
                         mid: str) -> dict[str, JsonValue]:
    """The served spec's defaults, overlaid onto a BARE body: the
    family defaults (+ the variant's resolver_defaults when mid names
    a route — the exact merge the served form-spec carries), filtered
    to the owning CARD's field surface (route chrome like a restated
    'model' key is not a card field and never rides), injected ONLY
    for keys the caller did NOT state — the editor path (which posts
    its seeded stamps) is byte-identical with or without this
    overlay. The model row is the defaults SSOT ("merged at serve
    time"); before this the bare/API path compiled schema-level
    pydantic defaults (krea-2-raw silently built the turbo recipe
    with cfg 4.5 — the mod-audit route wall caught the leak)."""
    from melite_models import scan_engine_models
    cls = None
    variant = None
    try:
        for _path, c in scan_engine_models(str(REPO)).values():
            routes = getattr(c, "_routes", None) or {}
            if mid in routes:
                cls, variant = c, routes[mid][0]
                break
            if c.id == mid:
                cls = c
                break
    except Exception:
        return body
    if cls is None:
        return body
    stamps: dict[str, JsonValue] = dict(cls.defaults or {})
    if variant is not None:
        stamps.update(variant.resolver_defaults or {})
    if not stamps:
        return body
    field_names = _card_field_names(cls)
    if field_names is None:
        return body
    out = dict(body)
    for k, v in stamps.items():
        # None/"" mean UNSET in a defaults row (z-image declares
        # negative_prompt=None) — never a stamp; riding them would
        # refuse the very str fields the row leaves open.
        if v is None or v == "":
            continue
        if k in field_names and k not in out and k not in CARD_ENVELOPE_KEYS:
            out[k] = v
    return out


def _card_field_names(model_cls: type[Model]) -> set[str] | None:
    """The owning card's field surface (generic plugin data: the
    model names the card, the card declares the fields), or None
    when resolution fails (the overlay then declines — LOUD beats
    wrong, but a stamp-less compile is the pre-overlay behavior)."""
    import sys as _sys
    py_dir = str(REPO / "py")
    if py_dir not in _sys.path:
        _sys.path.insert(0, py_dir)
    card_id = getattr(model_cls, "card", None)
    if not card_id:
        return None
    try:
        from melite_cards import load_card_py
    except ImportError:
        return None
    plugins_dir = REPO / "packages"
    for cpy in sorted(
        list(plugins_dir.glob("engines/*/action_cards/*/py/card.py"))
            + list(plugins_dir.glob("engines/*/action_cards/*/*/py/card.py"))
            + list(plugins_dir.glob("engines/*/action_cards/*/card.py"))
            + list(plugins_dir.glob("engines/*/action_cards/*/*/card.py"))):
        pdir = cpy.parent
        # TWO-LEVEL PARITY (2026-09-06 tagger audit): genre/card depth
        # (action_cards/image/tagger/py) resolves like _find_card_requires
        # — the old derivation read engine="action_cards" here, so the
        # family-defaults overlay silently declined for EVERY two-level
        # card (florence2's family model default never stamped).
        if pdir.name == "py":
            engine = pdir.parent.parent.parent.parent.name
        else:
            engine = (pdir.parent.parent.name
                      if pdir.parent.name in ("cards", "action_cards")
                      else pdir.parent.parent.parent.name)
        try:
            ccls = load_card_py(str(cpy), engine)
        except Exception:
            continue
        if ccls.id == card_id:
            return {f.name for f in getattr(ccls, "_fields_", ())}
    return None


def resolve_inputs(node: FlowNode,
                   initial: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """Explicit wiring only: input_from entries like __initial__.PROMPT."""
    out = {}
    # the receiving-name map (NodeRow.input_names, name -> ref): every
    # resolved value is ALSO published under the stage-input names
    # that reference it — $channels + `expected` speak NAMES ("body")
    # while FromStage refs key by producer ("rig.body"). Without this
    # a chained "$body" rode the workflow verbatim (2026-09-06).
    names = getattr(node, "input_names", None) or {}
    by_ref: dict[str, list[str]] = {}
    for _name, _ref in names.items():
        by_ref.setdefault(_ref, []).append(_name)
    for ref in node.input_from:
        if not ref.startswith("__initial__."):
            if ref in initial:
                out[ref] = initial[ref]
                for _name in by_ref.get(ref, ()):
                    out[_name] = initial[ref]
                continue
            raise ValidationError(
                "node %r: input_from ref %r unresolved (neither __initial__ nor a prior node output)"
                % (node.node_id, ref),
            )
        tensor = ref.split(".", 1)[1]
        if tensor not in initial:
            alt = tensor.lstrip("$")
            params = initial.get("params") or {}
            if isinstance(params, dict) and alt in params:
                value = params[alt]
            elif alt in initial:
                value = initial[alt]
            else:
                raise ValidationError("node %r: __initial__.%s not provided in request" % (node.node_id, tensor))
        else:
            value = initial[tensor]
        out[tensor] = value
        # receiving-name aliases apply to INITIAL refs too: a present-prune
        # rewrite (FromStage → FromInitial) must still feed the donor's
        # $channels under the receiving name ("photo"), exactly as a live
        # producer ref would (starter-branch incident 2026-09-06: "$photo"
        # rode the workflow verbatim into LoadImage).
        for _name in by_ref.get(ref, ()):
            out[_name] = value
    return out


# FILE-kind slots on the flow's typed-edge contract: values on these
# inputs may arrive as the WIRE's artifact spellings (the asset URL
# /v1/assets/runs/<run>/<file>, or the runs-relative <run>/<file>)
# and are rewritten to absolute disk paths at the runner seam — the
# engine ABI ($-substitution + the submit-time upload walk) resolves
# from DISK, never from the wire spellings (the body-to-somax bridge
# incident, 2026-09-06: a runs-relative glb rode a workflow verbatim
# and the node refused "source_glb not found").
_FILE_KINDS = frozenset(("image", "video", "audio", "mesh"))


def absolutize_artifact_refs(node: FlowNode,
                             inputs: dict[str, JsonValue]
                             ) -> dict[str, JsonValue]:
    """Rewrite artifact-ref values on FILE-kind inputs to absolute
    disk paths. Artifact refs are GATEWAY vocabulary (the same
    resolve_artifact_file find_dangling_refs admits at the door), so
    this is core-generic — no lane knowledge. A stated ref that
    resolves nowhere refuses LOUDLY here (QUEUE LANE LAW: the failure
    documents itself before the engine claims anything); absolute
    paths, data: URLs, $refs, and non-file slots ride untouched."""
    from artifact_refs import (ASSET_RUNS_PREFIX, ArtifactRefError,
                               resolve_artifact_file)
    exp = getattr(node, "expected", None) or {}
    out = dict(inputs)
    for slot, kind in exp.items():
        if str(kind) not in _FILE_KINDS:
            continue
        v = out.get(slot)
        if not isinstance(v, str):
            continue
        s = v.strip()
        if s.startswith(ASSET_RUNS_PREFIX):
            pass  # the wire's artifact URL — form 2 below resolves it
        elif not s or s.startswith(("/", "$", "data:")):
            # absolute path / tensor ref / inline bytes — already in
            # engine-ABI space
            continue
        elif "/" not in s:
            # a bare filename is the caller's staging concern (the
            # ComfyUI input dir), the same refusal artifact_refs makes
            continue
        try:
            out[slot] = resolve_artifact_file(s)
        except ArtifactRefError as e:
            raise ValidationError(
                "node %r: input %r artifact ref unresolved (%s)" % (
                    node.node_id, slot, e))
    return out


def _deep_expand(value: JsonValue, inputs: dict[str, JsonValue]) -> JsonValue:
    """Recursive $name substitution for inline workflows.

    Unlike the inject channel (pure ref channel, unresolved = LOUD),
    a workflow carries CONTENT: only names that RESOLVE against the
    node inputs are substituted — an unknown $-string is prompt text
    (e.g. "$100 bill"), passed through untouched. Link tuples like
    ["NodeId", 0] never start with $ and ride unchanged.
    """
    if isinstance(value, str) and value.startswith("$"):
        name = value[1:]
        if name in inputs:
            return inputs[name]
        if ("$" + name) in inputs:
            return inputs["$" + name]
        return value
    if isinstance(value, list):
        return [_deep_expand(v, inputs) for v in value]
    if isinstance(value, dict):
        return {k: _deep_expand(v, inputs) for k, v in value.items()}
    return value


def expand_inject(params: dict[str, JsonValue],
                  inputs: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """Expand $name refs in inject from node inputs; unresolved = LOUD.

    Inline workflows (params.workflow, the co_script-flipped lane) get
    the same tensor substitution via a deep walk. workflow + inject
    together is a compose bug — refuse BEFORE registration.
    """
    if params.get("workflow") is not None and params.get("inject"):
        raise ValidationError(
            "workflow and inject are mutually exclusive — inline workflow "
            "arrives pre-rendered, inject is the legacy channel")
    inject = params.get("inject", {})
    if not isinstance(inject, dict):
        raise ValidationError("inject must be an object")
    expanded = {}
    for slot, value in inject.items():
        if isinstance(value, str) and value.startswith("$"):
            name = value[1:]
            if name in inputs:
                expanded[slot] = inputs[name]
            elif ("$" + name) in inputs:
                expanded[slot] = inputs["$" + name]
            else:
                raise ValidationError("inject %s: tensor %r unresolved" % (slot, name))
        else:
            expanded[slot] = value
    out = dict(params)
    out["inject"] = expanded
    if params.get("workflow") is not None:
        if not isinstance(params["workflow"], dict):
            raise ValidationError("workflow must be an object")
        out["workflow"] = _deep_expand(params["workflow"], inputs)
    return out


try:
    import plugins as _plugin_bus
except Exception:
    _plugin_bus = None


class _ComposeBridge:
    """PLUGIN ARCHITECTURE LAW: compose dispatch lives in py/plugins.py —
    the core names no lane and no engine; it routes by the graph's
    engine type to the OWNING plugin (code + data in the plugin dir).
    No ctypes, no .so map, no engine names here."""

    @staticmethod
    def compose(body: dict[str, JsonValue], name: str, run_id: str,
                text: FlowGraph, types0: Iterable[str]
                ) -> tuple[FlowGraph, dict[str, JsonValue]]:
        if _plugin_bus is None:
            return text, {}
        return _plugin_bus.compose(body, name, run_id, text, types0)


card_hooks = _ComposeBridge()

_engine_cache = {}


def _plugin_loud(fn: Callable[..., _T], *a: str, **kw: str) -> _T:
    """Normalize a plugin-bus refusal into THIS module's ValidationError
    (when gateway.py runs as __main__, plugins.py's `from gateway import
    ValidationError` binds a second module copy's class — normalize at
    the boundary so the HTTP layer always sees one class → 4xx)."""
    try:
        return fn(*a, **kw)
    except ValidationError:
        raise
    except Exception as e:
        raise ValidationError(str(e))


def load_engine(engine_type: str) -> ModuleType:
    """The owning plugin's engine module (plugins.py resolves the
    plugin dir from engine.yaml declarations) — LOUD when absent."""
    if _plugin_bus is None:
        raise ValidationError("plugin bus unavailable (py/plugins.py)")
    return _plugin_loud(_plugin_bus.load_engine, engine_type)


async def _engine_boundary_unload(prev_type: str, node_type: str) -> str:
    """ENGINE TRANSITION (operator order, 2026-10-02: flows may
    switch engines — 'comfyui calls unload all models to be safe';
    2026-09-04 VRAM-release audit: the boundary is GATEWAY-level, so
    a switch between two queued RUNS fires exactly like a switch
    between two stages — comfyui's cached models must not stay
    resident while another engine's subprocess runs).

    When the resident engine differs from the incoming one, the
    outgoing engine unloads (if it exports the optional unload()
    ABI) — awaited, before the next engine's stage starts.
    Same-engine stages keep their cache (why trellis-after-image is
    fast); subprocess engines (anycreature, autoremesher) unload by
    process exit and simply do not export unload().

    Returns the outcome for the sidecar — fired / absent /
    no-transition / error:<msg>. An unload failure NEVER kills the
    run (RESILIENCE LAW: document the exact message, then continue).
    The core names no engine: it calls the ABI if present."""
    if prev_type is None or prev_type == node_type:
        return "no-transition"
    eng = load_engine(prev_type)
    u = getattr(eng, "unload", None)
    if u is None:
        return "absent"
    try:
        await u()
        return "fired"
    except Exception as e:
        return "error:%s" % e


@dataclass
class Run:
    run_id: str
    graph: FlowGraph
    request: dict[str, JsonValue]
    # CARD BIRTH LAW (operator order 2026-09-06): required at
    # CONSTRUCTION — a Run without a draft_id is an unbuildable
    # shape, not a tolerated one. The start door validated it
    # (non-empty, 96-char [A-Za-z0-9_-], doc exists at
    # STATE_ROOT/drafts) BEFORE registration; direct constructions
    # (unit-test harnesses) state their own id. The sidecar carries
    # it verbatim so /v1/flows/runs answers "what card produced
    # this" without round-tripping the drafts door.
    # docs/queue/run-registry.md / docs/queue/sidecar.md.
    draft_id: str
    status: str = "queued"
    error: str = ""
    stages: list[dict[str, JsonValue]] = field(default_factory=list)
    artifacts: list[str] = field(default_factory=list)
    stop_event: asyncio.Event = field(default_factory=asyncio.Event)
    created_at: float = field(default_factory=time.time)
    # L3: where the run dir actually lives. Set in submit() based on
    # the request's test flag; defaults to OUT_ROOT for runs created
    # before this field existed (and for any code path that builds a
    # Run without going through submit()).
    out_root: Path | None = field(default=None)
    # BRANCH SYSTEM (2026-09-06): ids of declared stages pruned at
    # build time (Flow.compile) — recorded here so the sidecar and
    # the status door report what didn't run. [] is today's behavior.
    skipped_stages: list[str] = field(default_factory=list)

    @property
    def dir(self) -> Path:
        return (self.out_root or OUT_ROOT) / self.run_id


class Gateway:
    def __init__(self) -> None:
        self.runs = {}
        self.order = []
        self.active = None
        # ── observability (R2, 2026-09-06): /v1/metrics reads these ──
        # boot_at anchors uptime; recent is the bounded ring of the
        # last settled runs (queue wait + total seconds per run — the
        # stage-duration histograms need per-stage timestamps first).
        self.boot_at = time.time()
        self.recent: deque[dict[str, JsonValue]] = deque(maxlen=50)
        # ── cost/preview history (R4.3, 2026-09-06): bounded RAM
        # rings feeding the validate door's cost block — per-engine
        # stage durations + whole-run totals. Bounded (64/128
        # samples), honest (None before samples exist — never a
        # invented ETA), and READ-ONLY for the door: the worker
        # records, validate reports.
        self._stage_hist: dict[str, list[float]] = {}
        self._run_totals: list[float] = []
        # off-loop I/O serializer (R2): one writer per gateway
        # process — atomic_write's tmp path is per-file, and the
        # per-run write ORDER is the sidecar contract.
        self._io_lock = asyncio.Lock()
        # ENGINE TRANSITION state (gateway-level, 2026-09-04 audit):
        # the engine of the last STARTED stage, across runs — the
        # boundary unload fires when the next stage (this run or the
        # NEXT queued run) lives on a different engine. None after
        # boot: the first run never unloads (nothing resident that we
        # know of). Single-writer under the serial worker loop.
        self.last_engine_type = None
        # ── the events bus (2026-09-02, the streaming restoration) ──
        # run_id -> set of subscriber queues; the WS door
        # (/v1/flows/events/<run_id>) feeds here and the engine
        # report contract publishes here. The 700ms status poll stays
        # the terminal authority; the bus carries the intra-tick frames
        # (per-step progress, activity flips) the poll cannot.
        self.subscribers = {}

    def subscribe(self, run_id: str) -> asyncio.Queue[dict[str, JsonValue]]:
        # R2 memory bound (2026-09-06): the bus is BOUNDED — a
        # stalled subscriber can no longer grow its queue without
        # end. 256 frames is seconds of progress ticks; publish()
        # drops-oldest when full so the newest (terminal) frame
        # always lands.
        q: asyncio.Queue[dict[str, JsonValue]] = asyncio.Queue(
            maxsize=SUBSCRIBER_Q_MAX)
        self.subscribers.setdefault(run_id, set()).add(q)
        return q

    def unsubscribe(self, run_id: str, q: asyncio.Queue[dict[str, JsonValue]]) -> None:
        subs = self.subscribers.get(run_id)
        if subs is not None:
            subs.discard(q)
            if not subs:
                self.subscribers.pop(run_id, None)

    async def _sidecar_offloop(self, run: Run) -> None:
        """R2 off-loop I/O: the sidecar's blocking JSON dump runs in
        a THREAD — the event loop keeps serving HTTP and the worker
        while the disk write happens. Serialized per gateway: the
        tmp+rename target is one path per run, so writes to the same
        file can never interleave (write ORDER per run is the
        contract). Sync callers (boot sweep, engine report callbacks
        that fire inside await execute) keep the sync sidecar())."""
        async with self._io_lock:
            await asyncio.to_thread(sidecar, run)

    def _evict_settled(self) -> None:
        """R2 memory bound: cap the in-memory registry's SETTLED rows
        at MAX_SETTLED_RUNS (oldest created_at leaves first). The
        sidecar on disk is the SSOT for settled runs — the runs
        list/detail doors read it; live_run_ids exists to mark LIVE
        ids, and a settled row is not live. queued/running/stopped-
        mid-shutdown rows are never evicted."""
        settled = [r for r in self.runs.values()
                   if r.status in ("completed", "failed")]
        excess = len(settled) - MAX_SETTLED_RUNS
        if excess <= 0:
            return
        for r in sorted(settled, key=lambda x: x.created_at)[:excess]:
            self.runs.pop(r.run_id, None)

    def publish(self, run_id: str, event: dict[str, JsonValue]) -> None:
        for q in list(self.subscribers.get(run_id, ())):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                # bounded bus: progress ticks are lossy-tolerant —
                # drop the OLDEST buffered frame, deliver the newest
                # (a terminal run frame rides the newest position,
                # so the subscriber is always released).
                try:
                    q.get_nowait()
                    q.put_nowait(event)
                except Exception:
                    pass
            except Exception:
                pass
        # R2 all-run fan-out: the "*" channel mirrors every run's
        # frames STAMPED with the run id (run-scoped subscribers
        # see the ORIGINAL dict — the run frames are the contract).
        for q in list(self.subscribers.get(ALL_RUNS, ())):
            try:
                q.put_nowait(dict(event, run=run_id))
            except asyncio.QueueFull:
                try:
                    q.get_nowait()
                    q.put_nowait(dict(event, run=run_id))
                except Exception:
                    pass
            except Exception:
                pass

    async def submit(self, body: dict[str, JsonValue]) -> Run:
        # body shape FIRST (RESILIENCE LAW + QUEUE LANE LAW): a
        # non-object body 4xxes here — resolve_request owns the same
        # guard for its own callers, but the test-flag read below
        # touches body before it runs. 4xx BEFORE any run registers.
        if not isinstance(body, dict):
            raise ValidationError(
                "request body must be a JSON object",
                code="bad_envelope", loc="body",
                expected="object", got=type(body).__name__)
        # the test flag routes the run dir (L3) and stamps the sidecar
        # (L1) — duck-typed truthiness here would let "false" (a
        # STRING) route a production run into the test root and lie
        # in the ledger. A flag is a BOOLEAN, refused 4xx BEFORE any
        # run registers (QUEUE LANE LAW).
        test_flag = body.get("test", False)
        if not isinstance(test_flag, bool):
            raise ValidationError(
                "test flag must be a boolean (got %s %r)"
                % (type(test_flag).__name__, test_flag),
                code="bad_envelope", loc="test",
                expected="boolean", got=type(test_flag).__name__)
        # CARD BIRTH LAW (operator order 2026-09-06, verbatim: "IF
        # THERE IS NO DRAFT_ID, THAT IS A HARD ERROR! THAT NEEDS TO
        # HAPPEN!"): EVERY run is born from an action card. A start
        # body without a valid draft_id — missing, empty, malformed,
        # or naming a card doc that does not exist — is refused 4xx
        # HERE, BEFORE any run registers (QUEUE LANE LAW: no zombie
        # slots, no cardless rows). The click error this kills:
        # "run has no action card (no draft_id in its run row)" — the
        # media sidebar's Cards wand; with the door refusing, that
        # row shape cannot be BORN. ENVELOPE-FIRST (2026-09-06): the
        # draft_id checks refuse BEFORE card compose — a malformed
        # envelope must name its own field, never surface a
        # downstream params refusal. Callers without a card compose
        # one first: POST /v1/flows/drafts (docs/cards/draft-door.md).
        # Wall: tests/walls/suites/test_py_gateway.py
        # TestStartDoorRequiresDraft (route-layer validation, 4xx
        # BEFORE registration).
        body_draft_id = body.get("draft_id")
        if not isinstance(body_draft_id, str) or body_draft_id == "":
            raise ValidationError(
                "draft_id is required — every run is born from an "
                "action card (CARD BIRTH LAW); compose the card first: "
                "POST /v1/flows/drafts, then start with its draft_id "
                "(docs/cards/draft-door.md)",
                code="draft_required", loc="draft_id",
                expected="doc-backed draft id", got="absent")
        if not draft_id_ok(body_draft_id):
            raise ValidationError(
                "draft_id malformed (96 char cap, [A-Za-z0-9_-] only): %r"
                % body_draft_id,
                code="draft_malformed", loc="draft_id",
                expected="[A-Za-z0-9_-]{1,96}",
                got=str(body_draft_id)[:60])
        # EXISTENCE (the second half of the law): a draft_id pointing
        # at nothing reproduces the EXACT click error the law kills —
        # the click-contract (py/editor_runs.py) strips a draft_id
        # whose doc is gone and the row degrades to draftless. An
        # unresolved request refuses BEFORE registration, same as an
        # unknown flow name (QUEUE LANE LAW).
        if not (STATE_ROOT / "drafts" / (body_draft_id + ".json")).is_file():
            raise ValidationError(
                "unknown draft_id %r — no card doc at drafts/%s.json; "
                "compose the card first: POST /v1/flows/drafts"
                % (body_draft_id, body_draft_id),
                code="draft_unknown", loc="draft_id",
                expected="existing card doc",
                got=str(body_draft_id)[:60])
        # HEADLESS-TOOL DEFAULTS (2026-09-06, design record
        # docs/design/flow-single-tool.md): a named flow with tool=... stamps
        # its knob defaults into the body (absent-keys-only) BEFORE resolve,
        # so _request.json shows exactly what ran and initial_pool carries
        # the $key scalars the stages substitute. ONLY when the request
        # names exactly the {flow} door (the resolver's own exclusivity
        # predicate): an ambiguous body must reach resolve_request's
        # ambiguity refusal VERBATIM (QUEUE LANE LAW — the merge never
        # jumps the gate). Flows without a tool return the body untouched
        # (zero behavior change).
        _doors = [k for k in ("flow", "flow_inline", "model")
                  if k in body]
        if _doors == ["flow"] and isinstance(body.get("flow"), str):
            import flow as _flow_mod
            try:
                body = _flow_mod.load_flow(
                    str(body["flow"])).apply_tool_defaults(body)
            except _flow_mod.FlowError as e:
                raise ValidationError(str(e), code="flow_compile",
                                        loc="flow")
        resolved = resolve_request(body)
        run_id = "run-%s-%08x" % (uuid.uuid4().hex[:12], int(time.time() * 1000) & 0xFFFFFFFF)
        is_card = isinstance(resolved, dict) and resolved.get("__card__")
        if is_card:
            # card-only model: phase 2 composes the REAL graph now that
            # the run exists (the hook rewrites the skeleton in place).
            graph, etype = resolved["skeleton"], resolved["etype"]
            # phase-1 extra are RUN INPUTS (tensor pool), never body
            # keys — strict card validation rejects a polluted surface.
            card_extra_inputs = dict(resolved.get("extra", {}))
            if card_hooks is not None:
                try:
                    # phase 2 hands back the composed graph as a DICT —
                    # python hands python structures; nothing here
                    # serializes for an in-process hop. The body the arm
                    # receives is the LIFTED one (params stanza only —
                    # the envelope never reaches a card arm).
                    # STAMPED (2026-09-06 tagger audit): phase 2 composes
                    # the SAME overlaid body phase 1 validated — the raw
                    # body drops family defaults (florence2 compiled WD14's
                    # checkpoint knob and ComfyUI refused it). Idempotent
                    # (absent-keys-only); the editor's seeded stamps pass
                    # through byte-identical.
                    graph, extra2 = card_hooks.compose(
                        card_compose_body(_route_stamp_overlay(
                            body, resolved["name"])), resolved["name"],
                        run_id, graph, [etype])
                    for k, v in (extra2 or {}).items():
                        card_extra_inputs.setdefault(k, v)
                except Exception as e:
                    raise _compose_refusal("2", e)
            import flow_graph as _pg
            if not (isinstance(graph, _pg.FlowGraph) and graph.nodes):
                raise ValidationError(
                    "card_compose produced an empty graph for %s" % resolved["name"])
        else:
            graph = resolved
        run = Run(run_id=run_id, graph=graph, request=body,
                  # CARD BIRTH LAW (validated at the top of submit()):
                  # non-empty, doc-backed — the door refused every
                  # other shape 4xx BEFORE registration, so the row
                  # can never be born cardless.
                  draft_id=body_draft_id)
        run.card_extra_inputs = card_extra_inputs if is_card else {}
        # L3: route the run dir to the test root when the caller
        # declared test:true. The sidecar test flag is the SAME data
        # (L1) -- this is the directory-level enforcement.
        run.out_root = TEST_OUT_ROOT if test_flag else OUT_ROOT
        run.dir.mkdir(parents=True, exist_ok=True)
        # off-loop (R2): unique path per run — no lock needed, the
        # thread write just leaves the event loop
        await asyncio.to_thread(atomic_write, run.dir / "_request.json", body)
        run.stages = [
            {"id": n.node_id, "name": n.node_id, "index": i,
             "status": "pending",
             # the flow-typed-edges contract (docs/queue/flow-typed-edges.md):
             # stamp the typed outputs into the sidecar so MCP
             # introspection and editor graph views see the chain past
             # construction. Empty when the stage omitted outputs and
             # its engine's DEFAULT_OUTPUT was unknown at load.
             "outputs": dict(n.outputs or {}),
             # the receiving half — what each input expects. The runner
             # reads it to absolutize artifact refs (see
             # absolutize_artifact_refs); the sidecar carries it for
             # the same introspection parity.
             "expected": dict(n.expected or {})}
            for i, n in enumerate(graph.nodes)
        ]
        # BRANCH RECORD: the graph carries the build-time prune (its
        # `skipped` record, stamped by Flow.compile) into the run so
        # the sidecar + status report it; the card arm is a bare dict
        # (no branches — single-stage compose), hence getattr.
        run.skipped_stages = list(getattr(resolved, "skipped", ()) or [])
        self.runs[run_id] = run
        self.order.append(run_id)
        # R3 durable queue (2026-09-06): the queue order is a RECORD —
        # run.queued in the ledger is what a restart reconciles
        # against (boot_resurrect re-queues from the sidecar +
        # request; docs/queue/gpu-fifo.md). One append-per-line, the
        # journal never gates registration.
        ledger("run.queued", {"run_id": run_id, "draft_id": run.draft_id,
                              "pipeline": _pipeline_of(run)})
        await self._sidecar_offloop(run)
        return run

    async def worker(self) -> None:
        while True:
            await asyncio.sleep(0.05)
            if self.active is not None or not self.order:
                continue
            run_id = self.order.pop(0)
            run = self.runs[run_id]
            self.active = run
            run.status = "running"
            # observability stamp (in-memory only — the sidecar shape
            # is the wall-pinned contract; /v1/metrics reads this)
            run._started_at = time.time()
            await self._sidecar_offloop(run)
            try:
                await self.execute(run)
                run.status = "stopped" if run.stop_event.is_set() else "completed"
            except Exception as e:
                run.status = "stopped" if run.stop_event.is_set() else "failed"
                run.error = "%s: %s" % (type(e).__name__, e)
            finally:
                await self._sidecar_offloop(run)
                # OUTPUT CONTRACT, run-level arm ({model} card runs):
                # a completed run must have delivered what its card
                # promises. Honored by the per-stage arm inside flows;
                # this is the card-door close-out. A violation flips
                # the run to failed with the exact refusal (documented
                # failure — the gateway survives, the queue continues).
                if run.status == "completed":
                    _mid = run.request.get("model") or ""
                    if _mid:
                        try:
                            _cid = _card_id_for_model(str(_mid))
                            _cc = _load_card_class(_cid) if _cid else None
                            if _cc is not None:
                                _v = _output_violation(_cc, run.artifacts)
                                if _v:
                                    run.status = "failed"
                                    run.error = _v
                                    await self._sidecar_offloop(run)
                        except Exception as _e:  # gate must not sink the queue
                            print("[output-contract] gate error for %s: "
                                  "%s: %s" % (run.run_id,
                                              type(_e).__name__, _e),
                                  flush=True)
                if run.status == "completed":
                    # the asset-ledger rung (2026-09-03): the delivery
                    # lands in the journal as typed rows — indexing
                    # failure must never take the queue loop down.
                    try:
                        import asset_ledger as _al
                        ev = _al.completed_payload(str(run.dir), {
                            "model": run.request.get("model") or "",
                            "status": run.status,
                            "created_at": int(run.created_at)})
                        if ev:
                            ledger("run.completed", ev)
                    except Exception:
                        pass
                # terminal broadcast: every subscriber gets the final
                # status exactly once, then the door closes the socket.
                self.publish(run.run_id, {"type": "run",
                                          "status": run.status})
                run._finished_at = time.time()
                self.recent.append(_recent_row(run))
                # R4.3: the run total feeds the queue ETA (median of
                # the last N settled totals × current depth)
                started = getattr(run, "_started_at", None)
                if started is not None:
                    self._run_totals.append(run._finished_at - started)
                    del self._run_totals[:-128]
                # R2 memory bound: the registry keeps the last N
                # settled runs (hydration + metrics); older completed
                # rows leave — the sidecar stays the SSOT and
                # live_run_ids only needs LIVE ids. Never touches a
                # queued/running row.
                self._evict_settled()
                self.active = None

    async def _try_merged(self, run: Run, initial: dict[str, JsonValue]) -> bool:
        """STROKE 5: the merged single-graph path for PURE-comfyui
        flows. Returns True when the run was executed (or failed) on
        the merged path; False means "not mergeable — run the
        per-stage loop" (structural reasons only, decided BEFORE any
        stage is marked running, so the fallback is clean).

        Rows are built exactly as the per-stage loop would: the card
        bridge composes card= docs, the engine's stage_workflow()
        resolves the inline workflow + inject. The engine's execute_flow
        submits once; per-stage outputs/artifacts publish here with
        the SAME carry/url/gallery shape the loop stamps."""
        nodes = run.graph.nodes
        # PLUGIN ARCHITECTURE LAW: the core names NO engine. The merge
        # ABI is a CAPABILITY (execute_flow + stage_workflow on the
        # engine module) — any single-engine flow whose engine declares
        # it merges; mixed-engine flows never do (one graph per engine
        # submission is the merge's own invariant). Wall: C19
        # (test_py_gateway.py test_core_names_no_engine).
        engine_types = {n.node_type for n in nodes}
        if not nodes or len(engine_types) != 1:
            return False
        engine_type = engine_types.pop()
        try:
            eng = load_engine(engine_type)
        except Exception:
            return False
        if not hasattr(eng, "execute_flow") \
                or not hasattr(eng, "stage_workflow"):
            return False
        rows = []
        # the initials pool (name-keyed, artifact-absolutized) is
        # built BEFORE the bridge loop: a card doc's $spells expand
        # against it (the merged path's own substitution seam runs
        # AFTER the bridge — an arm with a file-existence gate would
        # see the raw spell and refuse)
        pool = dict(initial)
        for node in nodes:
            names = getattr(node, "input_names", None) or {}
            ins = {}
            for name, ref in names.items():
                if str(ref).startswith("__initial__."):
                    key = str(ref).split(".", 1)[1]
                    if key in pool:
                        ins[str(name)] = pool[key]
                    elif str(name) in pool:
                        ins[str(name)] = pool[str(name)]
            try:
                ins = absolutize_artifact_refs(node, ins)
            except Exception:
                pass   # the per-stage seam owns artifact refusals
            pool.update(ins)
        for stage in run.stages:
            node = nodes[stage["index"]]
            try:
                params = dict(node.params or {})
                if getattr(node, "card", ""):
                    params = _card_bridge(node, params, run.run_id,
                                          inputs=pool)
                wf = eng.stage_workflow(params)
                if not isinstance(wf, dict) or not wf:
                    return False
                rows.append({
                    "stage_id": node.node_id,
                    "workflow": wf,
                    "input_names": dict(
                        getattr(node, "input_names", None) or {}),
                    "outputs": dict(node.outputs or {}),
                    "output_nodes": (params.get("output_nodes") or {}),
                    "params": params,
                })
            except Exception:
                # the card bridge / workflow seam refused — the
                # per-stage loop re-runs it inside the stage's own
                # try, where the refusal lands in the sidecar
                return False
        # ROW 4 (2026-09-07, live-probed run-c97e67b10fb8): DRY-RUN
        # the plan here. A plan-time refusal (a producer link that
        # would land in a file slot — the upscale arm's LoadImage)
        # must fall back to the per-stage path BEFORE any stage is
        # marked running; before this seam the refusal surfaced at
        # execute_flow's POST /prompt, past the fallback point, and
        # failed the whole run. Capability-gated like the merge ABI
        # itself (an engine without plan_merge keeps the old shape).
        _plan = getattr(eng, "plan_merge", None)
        if _plan is not None:
            try:
                _plan(rows, dict(pool))
            except Exception:
                return False
        # initials, name-keyed + absolutized per the nodes' FILE-kind
        # expected (artifact-ref spellings resolve from disk — the
        # same seam the loop applies per stage) — already built
        # above (pool), before the bridge loop

        def _mreport(updates: dict[str, JsonValue]) -> None:
            # flow-level progress folds onto the first stage still
            # running (merged attribution is approximate; per-node
            # granularity is the follow-up)
            for st in run.stages:
                if st["status"] == "running":
                    st.update(updates)
                    sidecar(run)
                    self.publish(run.run_id, {
                        "type": "stage", "stage": st["id"],
                        "index": st["index"], **updates})
                    return

        # ENGINE TRANSITION (2026-09-06 gap-fix, live-probed by GPU
        # test_11): the merged path skipped the boundary bookkeeping
        # the per-stage loop owns — a merged comfyui run left
        # last_engine_type stale, so the NEXT engine's run never saw
        # a transition and the outgoing engine never unloaded (the
        # VRAM-release audit's exact class). The boundary state is
        # gateway-level; both paths maintain it identically.
        prev_type = self.last_engine_type
        if prev_type is not None and prev_type != engine_type:
            outcome = await _engine_boundary_unload(prev_type, engine_type)
            if outcome != "no-transition":
                run.stages[0]["boundary_unload"] = outcome
        self.last_engine_type = engine_type

        for stage in run.stages:
            stage["status"] = "running"
            stage["merged"] = True   # the sidecar shows the path
            await self._sidecar_offloop(run)
            self.publish(run.run_id, {"type": "stage",
                                      "stage": stage["id"],
                                      "index": stage["index"],
                                      "status": "running"})
        try:
            result = await eng.execute_flow(
                rows, str(run.dir), run.stop_event, report=_mreport,
                initials=pool)
        except Exception as e:
            err = "%s: %s" % (type(e).__name__, e)
            stopped = run.stop_event.is_set() and "stop" in err.lower()
            for stage in run.stages:
                if stage["status"] == "running":
                    stage["status"] = "stopped" if stopped else "failed"
                    stage["error"] = err
                    self.publish(run.run_id, {
                        "type": "stage", "stage": stage["id"],
                        "index": stage["index"],
                        "status": stage["status"], "error": err})
            await self._sidecar_offloop(run)
            if stopped:
                run.status = "stopped"
                return True
            raise
        # publish per-stage outputs into the run's channel pool /
        # sidecar exactly as the loop would (name + "stage.channel")
        stages_out = (result or {}).get("stages") or {}
        carry: dict[str, JsonValue] = {}
        for stage in run.stages:
            row = stages_out.get(stage["id"]) or {}
            sid = stage["id"]
            for k, v in (row.get("outputs") or {}).items():
                carry[k] = v
                carry["%s.%s" % (sid, k)] = v
            arts = [a for a in (row.get("artifacts") or []) if a]
            run.artifacts.extend(arts)
            if arts:
                base = ASSET_URL_PREFIX + "/%s/" % run.run_id
                names_ = [_artifact_rel(run, str(a)) for a in arts]
                stage["url"] = base + names_[0]
                stage["gallery"] = [
                    {"url": base + n, "name": n} for n in names_]
            # R3.2 RESUME RECORD (merged path harvest): same stamp
            # as the per-stage loop — merged runs restart whole, but
            # the record stays consistent for every completed stage.
            stage["result_outputs"] = dict(row.get("outputs") or {})
            stage["status"] = "completed"
            stage.pop("progress", None)
            stage.pop("activity", None)
            await self._sidecar_offloop(run)
            self.publish(run.run_id, {"type": "stage",
                                      "stage": sid,
                                      "index": stage["index"],
                                      "status": "completed"})
        return True

    async def execute(self, run: Run) -> None:
        initial = initial_pool(run.request)
        # phase-1 card inputs ("inputs": {...}) land in the tensor pool
        ci = getattr(run, "card_extra_inputs", {}) or {}
        nested = ci.get("inputs") if isinstance(ci.get("inputs"), dict) else ci
        for k, v in (nested or {}).items():
            initial.setdefault(k, v)
        initial.setdefault("prompt", "")
        # ── STROKE 5 (2026-09-06): the single-graph fast path ──────
        # A pure-comfyui flow submits ONCE (the merged graph) instead
        # of N per-stage submits — artifacts pass inside the engine.
        # Any structural refusal falls back to the per-stage loop
        # BELOW before anything is marked running (the loop surfaces
        # the error in its own turn); once the merged graph is
        # submitted, failures are run failures (no silent replay).
        # R3.2: a RESUMED run (any stage already completed) never
        # takes the merged path — one merged submit cannot honor a
        # completed prefix; the per-stage loop's skip seam does.
        if not any(st.get("status") == "completed"
                   for st in run.stages) and \
                await self._try_merged(run, dict(initial)):
            return
        carry = {}
        for stage in run.stages:
            if run.stop_event.is_set():
                stage["status"] = "stopped"
                await self._sidecar_offloop(run)
                return
            if stage["status"] == "completed":
                # R3.2 RESUME PREFIX: a completed stage (from the
                # resume door) neither re-runs nor fires an engine
                # transition; its recorded output channels re-enter
                # the carry pool exactly as the fresh run's would —
                # same names, same $channel spellings downstream.
                for k, v in (stage.get("result_outputs") or {}).items():
                    carry[k] = v
                    carry["%s.%s" % (stage["id"], k)] = v
                continue
            node = run.graph.nodes[stage["index"]]
            stage_t0 = time.time()   # R4.3: duration feeds the
            # validate door's cost preview (median per engine)
            # ENGINE TRANSITION: the outgoing engine unloads before the
            # next engine's stage starts. The boundary state is
            # GATEWAY-level (self.last_engine_type) — a switch between
            # two queued RUNS fires exactly like a switch between two
            # stages of one run (2026-09-04 VRAM-release audit).
            # Every attempted transition is documented in the sidecar:
            # fired / absent / error:<msg> ("absent" = subprocess
            # engines that release VRAM by process exit).
            prev_type = self.last_engine_type
            if prev_type is not None and prev_type != node.node_type:
                outcome = await _engine_boundary_unload(
                    prev_type, node.node_type)
                if outcome != "no-transition":
                    stage["boundary_unload"] = outcome
                    await self._sidecar_offloop(run)
            self.last_engine_type = node.node_type
            stage["status"] = "running"
            await self._sidecar_offloop(run)
            self.publish(run.run_id, {"type": "stage",
                                      "stage": stage["id"],
                                      "index": stage["index"],
                                      "status": "running"})
            # the REPORT CONTRACT (generic — no lane knowledge): the
            # engine may call report({progress|activity}) during
            # execution; the gateway folds it into the stage dict (the
            # status poll serves it), the sidecar (survives restarts),
            # and the events bus (the WS door streams it live).
            def _report(updates: dict[str, JsonValue], _run: Run = run,
                        _stage: dict[str, JsonValue] = stage) -> None:
                _stage.update(updates)
                sidecar(_run)
                self.publish(_run.run_id, {"type": "stage",
                                           "stage": _stage["id"],
                                           "index": _stage["index"],
                                           **updates})
            try:
                inputs = resolve_inputs(node, dict(initial, **carry))
                # artifact refs on FILE-kind inputs become absolute
                # disk paths BEFORE the $-substitution deep-walk —
                # engines resolve from disk, never wire spellings
                inputs = absolutize_artifact_refs(node, inputs)
                # WHAT WAS POSTED (2026-09-06 rework): the resolved
                # input pool per stage rides the sidecar — a failed
                # run shows EXACTLY what each stage received. The
                # 11-attempt character proof ran blind here (three
                # failures were unresolvable $channels the sidecar
                # could have named in one look).
                stage["inputs"] = inputs
                await self._sidecar_offloop(run)
                params = expand_inject(node.params, inputs)
                # STROKE 4 (2026-09-06): the CARD BRIDGE — a card=
                # stage's params are the CARD DOC, not the engine
                # surface. The owning arm composes the doc into
                # engine params (workflow) through the plugin bus;
                # the core names no card (PLUGIN ARCHITECTURE
                # LAW). Wall: tests/unit/runtime/test_stage_card_
                # lane.py.
                if getattr(node, "card", ""):
                    params = _card_bridge(node, params, run.run_id,
                                          inputs=inputs)
                engine = load_engine(node.node_type)
                # the engine ABI row: a VALIDATED NodeRow carrying the
                # inject-expanded params (construction refuses a bad row)
                import flow_graph as _pg
                abi = _pg.NodeRow(node_id=node.node_id,
                                  node_type=node.node_type, params=params,
                                  card=node.card,
                                  # ENGINE-OUTPUTS (§3, 2026-09-06): the
                                  # stage's DECLARED output channels ride
                                  # the ABI row so the engine can publish
                                  # harvested files per channel (mesh wires
                                  # chain FromStage without lane knowledge).
                                  outputs=dict(node.outputs or {}))
                # ── R3.3 RETRY ROWS (2026-09-06): policy as data ──
                # retries/timeout_s ride the node row. An attempt
                # that fails (exception OR engine error dict) re-runs
                # while attempts remain; every retry is LEDGERED and
                # stamped stage["retries_used"] — documented, then
                # continued (RESILIENCE LAW). A deliberate STOP never
                # retries. timeout_s is the RUNNER's budget
                # (asyncio.wait_for) — params.timeout_s stays the
                # engine's own door.
                max_extra = int(getattr(node, "retries", 0) or 0)
                budget = float(getattr(node, "timeout_s", 0.0) or 0.0)
                attempt = 0
                stopped_now = False
                err_text = ""
                while True:
                    try:
                        if budget > 0:
                            result = await asyncio.wait_for(
                                engine.execute(
                                    abi, str(run.dir), inputs,
                                    run.stop_event, report=_report),
                                timeout=budget)
                        else:
                            result = await engine.execute(
                                abi, str(run.dir), inputs,
                                run.stop_event, report=_report)
                    except Exception:
                        if attempt < max_extra and not run.stop_event.is_set():
                            attempt += 1
                            self._note_stage_retry(
                                run, stage, attempt,
                                "attempt %d failed (exception)" % attempt)
                            continue
                        raise
                    if result and result.get("error"):
                        # ENGINE ABI: compose-first engines return their
                        # refusal as an error DICT (never raise). The rim
                        # honors it — a documented failure, never a
                        # silent empty completion (RESILIENCE LAW).
                        err_text = str(result["error"])
                        # a deliberate STOP is its own class: the engine
                        # answers {"error": "stopped"} when the stop
                        # door fired, never a failure (RESILIENCE LAW:
                        # a stop lands in <6s and reports 'stopped' —
                        # never 'error'). Gate on the stop_event being
                        # set so a spurious "stopped" in a normal
                        # failure still raises. A stop NEVER retries.
                        if run.stop_event.is_set() and "stop" in \
                                err_text.lower():
                            stopped_now = True
                            break
                        if attempt < max_extra and \
                                not run.stop_event.is_set():
                            attempt += 1
                            self._note_stage_retry(
                                run, stage, attempt,
                                "attempt %d: %s" % (attempt, err_text))
                            continue
                        raise ValidationError(
                            "engine %s: %s" % (
                                node.node_type, err_text))
                    break
                if stopped_now:
                    stage["status"] = "stopped"
                    stage["error"] = err_text
                    self.publish(run.run_id, {
                        "type": "stage",
                        "stage": stage["id"],
                        "index": stage["index"],
                        "status": "stopped",
                        "error": err_text})
                    break
                if result:
                    for k, v in result.get("outputs", {}).items():
                        carry[k] = v
                        carry["%s.%s" % (node.node_id, k)] = v
                    run.artifacts.extend(result.get("artifacts", []))
                    # WIRE EXTRAS (RunStageWire's open keys — live bug
                    # 2026-09-04: the py gateway served only the strict
                    # core {id,name,index,status}, so the editor's
                    # collectStageUrls(status.stages) got [] and the
                    # finished card rendered NO artifact. Stamp this
                    # stage's own engine artifacts as url (primary) +
                    # gallery (every) in the SAME /v1/assets/runs/
                    # form the runs list serves. Generic: basename only,
                    # no lane knowledge; per-stage attribution is exact
                    # because it happens HERE, inside this stage's turn.
                    stage_arts = [_artifact_rel(run, str(a))
                                  for a in result.get("artifacts", []) if a]
                    if stage_arts:
                        base = ASSET_URL_PREFIX + "/%s/" % run.run_id
                        stage["url"] = base + stage_arts[0]
                        stage["gallery"] = [
                            {"url": base + n, "name": n} for n in stage_arts]
                    # OUTPUT CONTRACT, per-stage arm: a card= stage
                    # ran a CARD — its own result must deliver what
                    # the card promises. A stage that completes while
                    # delivering nothing it promises is a documented
                    # failure, never a silent empty completion.
                    if node.card:
                        _cc = _load_card_class(str(node.card))
                        if _cc is not None:
                            _v = _output_violation(
                                _cc, result.get("artifacts"))
                            if _v:
                                raise ValidationError(_v)
                # R3.2 RESUME RECORD: the stage's resolved OUTPUT
                # CHANNEL VALUES ride the sidecar — the durable half
                # of the carry pool. Without it a resume could rebuild
                # the graph but not the wires (a downstream stage's
                # $channels would resolve nothing). Key name says
                # exactly what it is; the declared spec stays under
                # "outputs" (sidecar.md).
                stage["result_outputs"] = dict(
                    result.get("outputs") or {}) if result else {}
                # R4.3: the stage's wall-clock duration rides the row
                # AND the per-engine history ring (validate's cost
                # preview reads the ring; merged-path runs report the
                # run-level total in /v1/metrics recent instead).
                stage["duration_s"] = round(time.time() - stage_t0, 3)
                self._record_stage_duration(
                    node.node_type, stage["duration_s"])
                stage["status"] = "completed"
                stage.pop("progress", None)
                stage.pop("activity", None)
            except Exception as e:
                stage["status"] = "failed"
                stage["error"] = "%s: %s" % (type(e).__name__, e)
                self.publish(run.run_id, {"type": "stage",
                                          "stage": stage["id"],
                                          "index": stage["index"],
                                          "status": "failed",
                                          "error": stage["error"]})
                raise
            await self._sidecar_offloop(run)

    def _record_stage_duration(self, engine_type: str,
                               seconds: float) -> None:
        """R4.3: one completed stage duration into the bounded
        per-engine ring (64 samples — enough for a stable median,
        small enough to forget a stale regime)."""
        ring = self._stage_hist.setdefault(engine_type, [])
        ring.append(seconds)
        del ring[:-64]

    def cost_preview(self, engine_types: "list[str] | None" = None,
                     ) -> dict[str, JsonValue]:
        """R4.3 (2026-09-06): what a validate-time agent needs to
        CHOOSE — queue depth ahead, a rough whole-queue ETA (median
        of the last settled run totals × depth), and per-engine
        stage medians with their sample counts. Every unknown is
        None/0, never a guess: no history yet means median_s null +
        samples 0 and eta_queue_s null (an agent sees "no data",
        not a fabricated minute)."""
        import statistics
        depth = len(self.order)
        totals = self._run_totals
        eta: float | None = None
        if totals and depth:
            eta = round(statistics.median(totals) * depth, 1)
        stages_out: list[dict[str, JsonValue]] = []
        for et in engine_types or []:
            ring = self._stage_hist.get(et) or []
            stages_out.append({
                "engine": et,
                "median_s": round(statistics.median(ring), 3)
                if ring else None,
                "samples": len(ring)})
        return {"queue_depth": depth,
                "eta_queue_s": eta,
                "stages": stages_out}

    def _note_stage_retry(self, run: Run, stage: dict[str, JsonValue],
                          attempt: int, why: str) -> None:
        """R3.3: one retry attempt, documented in all three places
        a failure lives — the sidecar row (retries_used), the events
        bus (live), the ledger (durable). Never a silent re-run."""
        stage["retries_used"] = attempt
        stage["retry_last_error"] = why
        ledger("run.stage_retry", {
            "run_id": run.run_id, "stage": str(stage.get("id")),
            "attempt": attempt, "error": why})
        self.publish(run.run_id, {
            "type": "stage", "stage": str(stage.get("id")),
            "index": stage.get("index"), "retry": attempt})

    async def resume(self, run_id: str) -> dict[str, JsonValue]:
        """R3.2 resume-from-stage (2026-09-06): a FAILED or STOPPED
        run re-enters the queue under the SAME run id — its completed
        stages stay completed (the per-stage loop's resume prefix
        skips them and re-seeds the carry pool from the durable
        result_outputs record), the first non-green stage is where
        execution resumes. A merged single-graph run cannot honor a
        prefix (one submit) — it restarts from stage 0 under the
        same id, ledgered merged_restart. Refusals (4xx, before any
        re-register): unknown run, live queued/running, completed,
        unusable record. Design record docs/queue/run-registry.md;
        wall tests/unit/runtime/test_resume_door.py."""
        live = self.runs.get(run_id)
        if live is not None and live.status in ("queued", "running"):
            raise ValidationError(
                "run %s is still %s — stop it before resuming"
                % (run_id, live.status),
                code="run_live", loc="run_id",
                expected="failed|stopped", got=live.status)
        try:
            doc = json.loads(
                (OUT_ROOT / run_id / "_flow.json").read_text())
        except (OSError, ValueError):
            raise ValidationError("no durable record for run %r" % run_id,
                                    code="run_unknown", loc="run_id")
        status = str(doc.get("status") or "")
        if live is not None and live.status in ("failed", "stopped"):
            status = live.status   # the registry row is fresher truth
        if status == "completed":
            raise ValidationError(
                "run %s completed — nothing to resume" % run_id,
                code="run_completed", loc="run_id",
                expected="failed|stopped", got="completed")
        if status not in ("failed", "stopped"):
            raise ValidationError(
                "run %s is %r — resume needs failed or stopped"
                % (run_id, status or "unknown"),
                code="run_not_resumable", loc="run_id",
                expected="failed|stopped",
                got=status or "unknown")
        run = _rebuild_run_from_record(run_id)
        if run is None:
            raise ValidationError(
                "run %s record is unusable (draft doc gone or "
                "half-written) — resubmit instead" % run_id,
                code="run_record_unusable", loc="run_id")
        merged = any(bool(st.get("merged")) for st in run.stages)
        done = [i for i, st in enumerate(run.stages)
                if st.get("status") == "completed"]
        from_stage = 0 if merged else (done[-1] + 1 if done else 0)
        for i, st in enumerate(run.stages):
            if merged or i < from_stage:
                if merged:
                    st["status"] = "pending"   # restart whole
            elif st.get("status") != "completed":
                st["status"] = "pending"
            if st.get("status") != "completed":
                st.pop("error", None)
            st.pop("progress", None)
            st.pop("activity", None)
        run.status = "queued"
        run.error = ""
        self.runs[run_id] = run
        self.order.append(run_id)
        kept = sum(1 for st in run.stages
                   if st.get("status") == "completed")
        ledger("run.resume", {"run_id": run_id,
                               "from_stage": from_stage,
                               "completed_stages": kept,
                               "merged_restart": merged})
        await self._sidecar_offloop(run)
        return {"run_id": run_id, "status": "queued",
                "resumed_from_stage": from_stage,
                "completed_stages": kept,
                "merged_restart": merged}

    async def reproduce(self, run_id: str) -> dict[str, JsonValue]:
        """R4.5 (2026-09-06): one call = "run that again, exactly".
        The durable record IS the replay source: _request.json holds
        the EXACT body that produced the run (sha-identical replay
        was proven possible by hand on the image-upscale record);
        this door re-submits it through the SAME submit() the start
        door rides — draft law, door resolution, registration, all
        one code path, zero restatement. The replay is a NEW run id
        (the original record stays untouched); the original draft
        doc must still exist (CARD BIRTH LAW — no door-side
        auto-mint; submit re-validates). Refusals: unknown record,
        still-live run, cardless legacy row.
        Wall: tests/unit/runtime/test_reproduce_door.py."""
        live = self.runs.get(run_id)
        if live is not None and live.status in ("queued", "running"):
            raise ValidationError(
                "run %s is still %s — wait for it to settle or stop "
                "it first" % (run_id, live.status),
                code="run_live", loc="run_id",
                expected="completed|failed|stopped", got=live.status)
        try:
            doc = json.loads(
                (OUT_ROOT / run_id / "_flow.json").read_text())
        except (OSError, ValueError):
            raise ValidationError("no durable record for run %r" % run_id,
                                    code="run_unknown", loc="run_id")
        if not str(doc.get("draft_id") or ""):
            raise ValidationError(
                "run %s is a cardless legacy row (no draft_id) — "
                "compose a fresh card to replay it" % run_id,
                code="run_cardless", loc="draft_id",
                expected="doc-backed draft id", got="absent")
        try:
            request = json.loads(
                (OUT_ROOT / run_id / "_request.json").read_text())
        except (OSError, ValueError):
            raise ValidationError(
                "run %s has no recorded request body — cannot "
                "replay" % run_id,
                code="run_record_unusable", loc="run_id")
        if not isinstance(request, dict):
            raise ValidationError(
                "run %s recorded a non-object request body" % run_id,
                code="run_record_unusable", loc="run_id",
                expected="object", got=type(request).__name__)
        replay = await self.submit(dict(request))   # the SAME door
        ledger("run.reproduce", {"run_id": replay.run_id,
                                  "replay_of": run_id})
        return {"run_id": replay.run_id, "status": replay.status,
                "replay_of": run_id}

    async def stop(self, run_id: str) -> dict[str, str]:
        run = self.runs.get(run_id)
        if run is None:
            raise ValidationError("unknown run_id %r" % run_id,
                                    code="run_unknown", loc="run_id")
        if run.status not in ("queued", "running"):
            return {"error": "cannot stop run in state %s" % run.status}
        run.stop_event.set()
        for stage in run.stages:
            if stage["status"] == "running":
                n = self.graph_nodes(run)[stage["index"]]
                engine = load_engine(n.node_type)
                if hasattr(engine, "stop"):
                    try:
                        await engine.stop(n.params, str(run.dir))
                    except Exception:
                        pass
        return {"run_id": run_id, "status": "stopping"}

    def graph_nodes(self, run: Run) -> tuple[FlowNode, ...]:
        return run.graph.nodes

    async def shutdown(self) -> None:
        """SIGTERM/SIGINT path: mark the active run stopped (engine stop
        hooks land), flush sidecars, exit cleanly. A deliberate shutdown
        manufactures ZERO zombies — RESILIENCE LAW."""
        run = self.active
        if run is not None:
            run.stop_event.set()
            for stage in run.stages:
                if stage["status"] == "running":
                    n = self.graph_nodes(run)[stage["index"]]
                    # FlowNode is a frozen pydantic row: attribute access,
                    # never dict indexing (n["type"] raised TypeError
                    # OUTSIDE the try below, killing shutdown() before the
                    # sidecar flush and os._exit — a deliberate SIGTERM
                    # manufactured the exact zombie the docstring forbids.
                    # Mirrors stop() (~1195), wall: test_shutdown_stop_path.
                    engine = load_engine(n.node_type)
                    if hasattr(engine, "stop"):
                        try:
                            await engine.stop(n.params, str(run.dir))
                        except Exception:
                            pass
            # give the worker one loop turn to observe the stop event and
            # write the terminal sidecar (run.status -> stopped)
            for _ in range(200):
                if self.active is None:
                    break
                await asyncio.sleep(0.05)
            if self.active is not None:   # engine ignored the stop event
                run.status = "stopped"
                await self._sidecar_offloop(run)
                self.active = None
        ledger("server.stop", {"reason": "signal"})
        os._exit(0)


def _pipeline_of(run: Run) -> str:
    """The door name the run was started with (QUEUE LANE LAW:
    exactly one of flow | flow_inline | model). The sidecar's
    `pipeline` and /v1/metrics' recent rows share this — one truth."""
    inline = run.request.get("flow_inline")
    return (run.request.get("flow")
            or run.request.get("model")
            or (inline.get("id", "")
                if isinstance(inline, dict) else ""))


def _recent_row(run: Run) -> dict[str, JsonValue]:
    """One settled-run metrics row: queue wait + wall total, both
    from the worker's stamps (absent stamps read as None — a run
    settled outside the worker, e.g. a unit harness, reports no
    timings rather than a lie)."""
    started = getattr(run, "_started_at", None)
    finished = getattr(run, "_finished_at", None)
    wait = round(started - run.created_at, 3) \
        if started is not None else None
    total = round(finished - started, 3) \
        if (started is not None and finished is not None) else None
    return {"run_id": run.run_id, "pipeline": _pipeline_of(run),
            "status": run.status, "wait_s": wait, "total_s": total}


def sidecar(run: Run) -> None:
    # L1 of the test/prod barrier: the test flag rides from the start
    # body into the run's request dict and onto the sidecar. scan_run
    # reads it from here; assets_index (L2) uses it to keep test runs
    # out of the production view.
    # CARD BIRTH LAW (operator order 2026-09-06): the sidecar ALWAYS
    # persists a doc-backed draft_id (required at submit() and at Run
    # construction) so /v1/flows/runs answers "what card produced
    # this" without round-tripping the drafts door — a cardless row
    # can no longer be born. The reader's click-contract
    # (py/editor_runs.py) survives only as read-time defense for
    # pre-law rows and user-deleted drafts. docs/queue/sidecar.md.
    # the door name (QUEUE LANE LAW: exactly one of flow | flow_inline |
    # model — resolved BEFORE registration, so exactly one of these is
    # ever truthy). The runs-list scan (py/editor_runs.py) lifts it
    # into the row's name/flow; the editor's run-title fallback reads
    # r.name. The C-era sidecar carried "model" — a key the py writer
    # NEVER wrote, so every py run served blank names until 2026-09-05
    # (0 of 550 on-disk sidecars carry "model"; nothing reads it).
    pipeline = _pipeline_of(run)
    # WHAT WAS POSTED (2026-09-06 rework): the compiled graph rides
    # the sidecar verbatim (id/type/input_from/input_names/outputs/
    # params, the params including every inline workflow) — post-
    # mortem reads see exactly what the executor consumed, never an
    # inference. Large by design; _flow.json is cheap next to glbs.
    graph_rows = [{
        "id": n.node_id,
        "type": n.node_type,
        "input_from": list(n.input_from),
        "input_names": dict(n.input_names),
        "outputs": dict(n.outputs or {}),
        "params": dict(n.params or {}),
    } for n in run.graph.nodes]
    atomic_write(run.dir / "_flow.json", {
        "run_id": run.run_id,
        "status": run.status,
        "error": json.dumps(run.error)[:20000] if run.error else "",
        "stages": run.stages,
        "skipped_stages": list(run.skipped_stages),
        "artifacts": run.artifacts,
        "created_at": run.created_at,
        "test": run.request.get("test", False),
        "draft_id": run.draft_id,
        "pipeline": pipeline,
        "graph": graph_rows,
    })


# ---------------------------------------------------------------------------
# RESILIENCE LAW (operator order 2026-08-29) — ported from the C server's
# post-audit hardening: a deliberate shutdown manufactures ZERO zombies,
# kill -9 leftovers are swept to failed at boot AND at first read, and the
# ledger journal records every sweep (parity with boot_sweep_stale_sidecars
# / read-time sweep / ledger_log in src/server.cpp, retired 2026-09-02).
# ---------------------------------------------------------------------------

LEDGER_PATH = OUT_ROOT / "_ledger.jsonl"

# R2 memory bounds (2026-09-06): the WS bus queues are capped per
# subscriber (drop-oldest under pressure — see Gateway.publish) and
# the in-memory registry caps its SETTLED rows (the sidecar is the
# SSOT; live ids are what live_run_ids needs).
SUBSCRIBER_Q_MAX = 256
MAX_SETTLED_RUNS = 500

# R2 token auth (2026-09-06): the OPTIONAL bearer door. Unset env →
# auth is OFF (the dev default — the editor talks to localhost
# bare). Set → every HTTP/WS door except the exempt paths demands
# `Authorization: Bearer <token>`; WS accepts `?token=<t>` too
# (browsers cannot set WS headers). The token is read per request
# so the door is testable without rebooting the process. Design
# record docs/gateway/auth.md; wall tests/unit/runtime/test_auth_door.py.
AUTH_TOKEN_ENV = "DSH_GATEWAY_TOKEN"
AUTH_EXEMPT_PATHS = ("/v1/health",)

# the all-run fan-out channel (R2, 2026-09-06): subscribing "*"
# mirrors EVERY run's frames, each stamped with its run id. The
# run-scoped frames stay byte-identical — the stamp lives only on
# the mirror. Design record docs/gateway/ws-mcp.md; wall
# tests/unit/runtime/test_all_runs_feed.py.
ALL_RUNS = "*"


def _artifact_rel(run: "Run", art: str) -> str:
    """The URL-shape seam for stamped artifact links (2026-09-06,
    exposed LIVE by the run-lifecycle wall): merged-path engines land
    artifacts in STAGE SUBDIRS (<run>/<stage>/<file>) but the stamp
    used basename — the door (/v1/assets/runs/<run>/<file>, joined
    under output/) then 404'd its own gallery URL. The honest link is
    the run-RELATIVE path. A path outside run.dir (odd engine
    shapes) falls back to basename — never a traversal."""
    try:
        rel = os.path.relpath(str(art), str(run.dir))
    except Exception:
        return os.path.basename(str(art))
    if rel.startswith("..") or rel == ".":
        return os.path.basename(str(art))
    return rel


def _auth_token() -> str:
    return os.environ.get(AUTH_TOKEN_ENV, "")


def _auth_ok(path: str, authorization: str, query_token: str) -> bool:
    """True when the request may pass. Auth OFF (empty token)
    passes everything — the default deployment stays bare."""
    tok = _auth_token()
    if not tok:
        return True
    if path in AUTH_EXEMPT_PATHS:
        return True
    if authorization == "Bearer " + tok:
        return True
    return bool(query_token) and query_token == tok


def ledger(event: str, data: dict[str, JsonValue] | None = None) -> None:
    """Append-only activity journal at output/_ledger.jsonl — one JSON
    object per line (close-per-line keeps every event durable)."""
    try:
        OUT_ROOT.mkdir(parents=True, exist_ok=True)
        with open(LEDGER_PATH, "a") as f:
            f.write('{"ts":%d,"event":"%s","data":%s}\n' % (
                int(time.time()), event, json.dumps(data or {}, default=str)))
    except OSError:
        pass   # the journal must never take the gateway down


def sweep_sidecar(path: Path, why: str, queued_why: str = "") -> bool:
    """Patch a stale sidecar: every running/queued status (top-level AND
    per-stage) becomes failed, with the reason recorded in a "sweep" key.
    Idempotent — an already-swept file has no active statuses left.
    A run that was still QUEUED top-level when the process died never
    executed any work: its sweep note and error say so (queued_why)
    instead of implying a crash mid-run — "gateway restarted before
    the run started, resubmit" is the honest failure."""
    try:
        obj = json.loads(Path(path).read_text())
    except (OSError, ValueError):
        return False
    was_queued = obj.get("status") == "queued"
    touched = False

    def _patch(o: JsonValue) -> None:
        nonlocal touched
        if isinstance(o, dict):
            if o.get("status") in ("running", "queued"):
                o["status"] = "failed"
                touched = True
            for v in o.values():
                _patch(v)
        elif isinstance(o, list):
            for v in o:
                _patch(v)

    _patch(obj)
    if not touched:
        return False
    note = queued_why if (was_queued and queued_why) else why
    obj["sweep"] = note
    if was_queued and queued_why:
        obj["error"] = queued_why
    atomic_write(Path(path), obj)
    return True


def _rebuild_run_from_record(run_id: str) -> "Run | None":
    """R3.2 (2026-09-06): rebuild a Run from its DURABLE record —
    the sidecar's graph rows + _request.json + the draft doc (CARD
    BIRTH LAW: the doc is the birth certificate; a record without
    one is an orphan, never a run). Returns None when any piece is
    missing or half-written — callers refuse loudly, they never
    guess. Shared by boot_resurrect (queued work at boot) and the
    resume door (failed/stopped work)."""
    try:
        doc = json.loads((OUT_ROOT / run_id / "_flow.json").read_text())
    except (OSError, ValueError):
        return None
    draft_id = str(doc.get("draft_id") or "")
    if not draft_id or not (
            STATE_ROOT / "drafts" / (draft_id + ".json")).is_file():
        return None
    try:
        request = json.loads(
            (OUT_ROOT / run_id / "_request.json").read_text())
    except (OSError, ValueError):
        return None
    # runtime import (TYPE_CHECKING owns the annotation names)
    from flow_graph import FlowGraph
    from flow_graph import NodeRow as _NR
    try:
        graph = FlowGraph(
            name=str(doc.get("pipeline") or run_id),
            nodes=tuple(_NR(**{
                "id": r.get("id"), "type": r.get("type"),
                "input_from": tuple(r.get("input_from") or ()),
                "input_names": dict(r.get("input_names") or {}),
                "outputs": dict(r.get("outputs") or {}),
                "params": dict(r.get("params") or {}),
            }) for r in (doc.get("graph") or [])))
    except Exception:
        return None
    run = Run(run_id=run_id, graph=graph, request=request,
              draft_id=draft_id)
    created = float(doc.get("created_at") or 0.0)
    if created:
        run.created_at = created
    run.stages = list(doc.get("stages") or [])
    run.skipped_stages = list(doc.get("skipped_stages") or [])
    run.artifacts = [str(a) for a in (doc.get("artifacts") or []) if a]
    return run


def boot_resurrect(gw: Gateway) -> int:
    """R3 durable queue (2026-09-06): a QUEUED sidecar at boot is WORK
    WAITING, not a failure — the previous gateway died before the
    worker reached it. Each is rebuilt from its durable record (the
    sidecar's graph rows + _request.json, both written at
    registration) and re-queued in created_at order (FIFO survives
    the restart). A queued run whose draft doc is GONE does not
    resurrect (CARD BIRTH LAW: the doc is the run's birth
    certificate) — it sweeps below like any orphan. Design record:
    docs/queue/gpu-fifo.md; wall: tests/unit/runtime/test_durable_queue.py."""
    resurrected = 0
    if not OUT_ROOT.is_dir():
        return 0
    candidates: list[tuple[float, str]] = []
    for d in sorted(OUT_ROOT.iterdir()):
        if not d.is_dir() or not d.name.startswith("run-"):
            continue
        try:
            doc = json.loads((d / "_flow.json").read_text())
        except (OSError, ValueError):
            continue
        if doc.get("status") != "queued":
            continue
        candidates.append(
            (float(doc.get("created_at") or 0.0), d.name))
    for created, run_id in sorted(candidates, key=lambda c: c[0]):
        try:
            run = _rebuild_run_from_record(run_id)
            if run is None:
                continue  # orphan / half-written — sweep it below
            gw.runs[run_id] = run
            gw.order.append(run_id)
            ledger("run.resurrected", {"run_id": run_id,
                                       "draft_id": run.draft_id})
            resurrected += 1
        except Exception:
            continue  # a half-written record sweeps below — LOUD there
    return resurrected


def boot_sweep(live_run_ids: tuple[str, ...] = ()) -> int:
    """Boot-time zombie sweep: every sidecar still claiming running/queued
    belongs to a DEAD process — EXCEPT the runs boot_resurrect just
    re-queued (live_run_ids; their queued sidecar is the resurrected
    work, not a zombie). Sweep BEFORE the gateway accepts traffic, so
    the ledger never shows phantom active runs after a crash/restart."""
    swept = 0
    if not OUT_ROOT.is_dir():
        return 0
    for d in sorted(OUT_ROOT.iterdir()):
        if not d.is_dir() or not d.name.startswith("run-"):
            continue
        if d.name in live_run_ids:
            continue
        try:
            pre = json.loads((d / "_flow.json").read_text())
        except (OSError, ValueError):
            pre = {}
        was_queued = pre.get("status") == "queued"
        if sweep_sidecar(
                d / "_flow.json",
                "gateway restarted (boot sweep): stale active sidecar "
                "from a dead process",
                queued_why=("gateway restarted before the run started "
                            "(never executed) — resubmit") if was_queued
                else ""):
            ledger("run.swept", {"run_id": d.name,
                                 "state": "queued_lost" if was_queued
                                 else "failed",
                                 "error": "boot sweep"})
            swept += 1
    return swept


def sidecar_status(run_id: str) -> dict[str, JsonValue] | None:
    """Status for a run this process never owned: read the sidecar.
    A running/queued sidecar with no live registry entry is a stale
    leftover from a prior crash — self-heal at read time so zombies
    never accumulate, then report the failure."""
    path = OUT_ROOT / run_id / "_flow.json"
    if not path.is_file():
        return None
    try:
        obj = json.loads(path.read_text())
    except ValueError:
        return {"run_id": run_id, "status": "failed",
                "error": "unparseable sidecar", "stages": [],
                "artifacts": [], "queue_position": 0}
    if obj.get("status") in ("running", "queued"):
        queued = obj.get("status") == "queued"
        sweep_sidecar(
            path, "read-time sweep: stale running sidecar, "
            "no live registry entry",
            queued_why=("run was still queued when the gateway vanished "
                        "(never executed) — resubmit") if queued else "")
        ledger("run.swept", {"run_id": run_id, "state": "failed",
                             "error": "zombie swept at read time"})
        obj["status"] = "failed"
        obj["error"] = ("run was still queued when the gateway vanished "
                        "(never executed) — resubmit" if queued else
                        "zombie swept at read time")
    obj.setdefault("run_id", run_id)
    obj.setdefault("stages", [])
    obj.setdefault("artifacts", [])
    obj.setdefault("error", "")
    obj["queue_position"] = 0
    return obj


def atomic_write(path: Path, obj: JsonValue) -> None:
    tmp = Path(str(path) + ".tmp")
    tmp.write_text(json.dumps(obj, indent=2, default=str))
    os.replace(str(tmp), str(path))


# ---------------------------------------------------------------------------
# ASGI transport — starlette + uvicorn
#
# The ROUTES table (below) remains the wire SSOT: the catch-all HTTP
# adapter calls route() to match + dispatch, then converts the
# (status, payload) tuple into a starlette Response.  WebSocket doors
# are native starlette WebSocketRoutes — no more hand-rolled RFC 6455.
# ---------------------------------------------------------------------------

async def _swallow(task: asyncio.Task[JsonValue | None]) -> None:
    """Await a cancelled/failed child cleanly so its exception can never
    leak into the next await of the caller (reaped, not propagated)."""
    try:
        await task
    except (asyncio.CancelledError, Exception):
        pass


async def _ws_starlette(websocket: WebSocket) -> None:
    """Native starlette WebSocket for /v1/flows/events/<run_id>.

    The streaming door (2026-09-02, now transport-agnostic):
    subscribes to the run's event bus and pushes every frame live —
    stage flips, per-step progress, activity, the terminal run status.
    Late joiners hydrate from the current run/stage snapshot first.
    The 700ms status poll remains the recovery channel.

    Starlette/uvicorn handles RFC 6455 framing, ping/pong, and close
    handshakes — the ~150 lines of hand-rolled WS helpers are gone.
    """
    from urllib.parse import parse_qs as _pqs, urlparse as _purl
    _q = _pqs(_purl(str(websocket.url)).query)
    if not _auth_ok(websocket.url.path,
                    websocket.headers.get("authorization", ""),
                    (_q.get("token") or [""])[0]):
        # auth ON and no token: refuse the HANDSHAKE (close before
        # accept → HTTP 403 at upgrade). The browser WS API cannot
        # set headers — ?token= is the door for it.
        await websocket.close(code=4401, reason="unauthorized")
        return
    await websocket.accept()
    gw = websocket.app.state.gw

    # Parse run_id: path form (/events/<id>) or query form (?run_id=<id>)
    run_id = websocket.path_params.get("run_id", "")
    if not run_id:
        from urllib.parse import parse_qs as _pq, urlparse as _up
        qs = _pq(_up(str(websocket.url)).query)
        run_id = (qs.get("run_id") or qs.get("id") or [""])[0]
        path = websocket.url.path.rstrip("/")
        if not run_id:
            if path == "/v1/flows/events":
                # R2 all-run fan-out: the BARE door is the estate
                # feed — every run's frames, stamped. It has NO
                # terminal frame (the client closes); the hello
                # snapshot below hydrates queue state.
                run_id = ALL_RUNS
            else:
                await websocket.close()
                return

    q = gw.subscribe(run_id)

    async def _send(obj: JsonValue) -> None:
        await websocket.send_json(obj)

    async def _monitor_client() -> None:
        """Block on client reads; returns (raises) on disconnect."""
        try:
            while True:
                msg = await websocket.receive()
                if msg.get("type") == "websocket.disconnect":
                    return
        except Exception:
            return

    try:
        if run_id == ALL_RUNS:
            # hydrate the estate feed: queue + active. No terminal
            # frame — the client closes; frames arrive stamped.
            await _send({"type": "hello", "channel": ALL_RUNS,
                         "queue_depth": len(gw.order),
                         "queued": list(gw.order),
                         "active": (gw.active.run_id
                                    if gw.active else None)})
        else:
            # hydrate: the snapshot BEFORE the subscription races
            run = gw.runs.get(run_id)
            if run is None:
                await _send({"type": "run", "status": "unknown"})
            else:
                await _send({"type": "run", "status": run.status})
                for st in run.stages:
                    patch = {"type": "stage", "stage": st["id"],
                             "status": st["status"]}
                    if st.get("progress"):
                        patch["progress"] = st["progress"]
                    if st.get("activity"):
                        patch["activity"] = st["activity"]
                    if run.status in ("completed", "failed", "stopped"):
                        await _send(patch)

        # event loop: multiplex queue events and client reads
        read_mon = asyncio.ensure_future(_monitor_client())
        try:
            while True:
                get_ev = asyncio.ensure_future(q.get())
                done, pending = await asyncio.wait(
                    {get_ev, read_mon},
                    return_when=asyncio.FIRST_COMPLETED)
                if read_mon in done:
                    get_ev.cancel()
                    await _swallow(get_ev)
                    return
                if get_ev not in done:
                    get_ev.cancel()
                    await _swallow(get_ev)
                    continue
                ev = get_ev.result()
                await _send(ev)
                if ev.get("type") == "run" and ev.get("status") in (
                        "completed", "failed", "stopped", "unknown"):
                    read_mon.cancel()
                    await _swallow(read_mon)
                    return
        finally:
            read_mon.cancel()
            await _swallow(read_mon)
    except Exception:
        pass  # client went away
    finally:
        gw.unsubscribe(run_id, q)


async def _adapt(request: Request) -> Response:
    """Starlette→legacy bridge: match the request against the ROUTES
    table, call the handler, convert (status, payload) → Response.

    This is the ONLY new dispatch code; the ROUTES table, _Ctx, and
    every _h_* handler are unchanged.  The goldens own response bodies;
    this adapter serializes them identically (indent=2, default=str).

    Uncaught exceptions in the handler (anything that escapes route()
    as a raised exception rather than a (status, {"error": ...})
    tuple) are surfaced as JSON 500s with the real exception text —
    a bare "Internal Server Error" hides the cause from the wall
    and the user (the dev DSH 500 on /v1/form-spec?model=anny hid
    the anny-card loader error until the wall fetched the real
    message). RESILIENCE LAW: the failure documents the exact
    failure message — the HTTP layer must too."""
    gw = request.app.state.gw
    body = await request.body()
    target = request.url.path + ("?" + request.url.query
                                 if request.url.query else "")
    if not _auth_ok(request.url.path,
                    request.headers.get("authorization", ""), ""):
        # auth ON: no exempt, no bearer — 401 BEFORE dispatch (the
        # token never gates the health probe; heads-up orbit checks
        # keep working)
        return Response(
            content=json.dumps({
                "error": "unauthorized: missing or invalid bearer token "
                         "(Authorization: Bearer <token>; set %s to "
                         "enable)" % AUTH_TOKEN_ENV},
                indent=2).encode(),
            status_code=401, media_type="application/json",
            headers={"WWW-Authenticate": "Bearer"})
    try:
        status, payload = await route(
            gw, request.method, target, body,
            headers={k.lower(): v for k, v in request.headers.items()})
    except Exception as exc:
        try:
            from traceback import format_exc
            tb = format_exc()
        except Exception:
            tb = "(traceback unavailable)"
        try:
            sys.stderr.write(
                "[gateway] uncaught in route(%s %s): %s\n%s\n"
                % (request.method, target, exc, tb))
        except Exception:
            pass
        return Response(
            content=json.dumps(
                {"error": str(exc), "type": type(exc).__name__,
                 "traceback": tb,
                 "route": "%s %s" % (request.method, target)},
                indent=2, default=str).encode(),
            status_code=500, media_type="application/json")
    if isinstance(payload, tuple) and len(payload) == 3:
        _, resp_headers, raw = payload
        ct = resp_headers.pop("content-type",
                              "application/octet-stream")
        return Response(content=raw, status_code=status,
                        headers=resp_headers, media_type=ct)
    return Response(
        content=json.dumps(payload, indent=2, default=str).encode(),
        status_code=status, media_type="application/json")


# ---------------------------------------------------------------------------
# the route table — the wire SSOT (dispatch as DATA)
#
# Every HTTP door is a row. tools/gen_api_docs.py generates
# docs/gateway/endpoints.md + docs/gateway/openapi.yaml FROM these rows,
# and tests/walls/suites/test_api_doc_parity.py refuses drift between
# table, doc, and spec. The goldens (tests/golden_http/) stay the byte
# authority for response BODIES; this table is the authority for the
# PATH LIST. WS rows are marked ws=True — handle() hijacks the
# connection before dispatch, so their handler is the non-upgrade
# fallback (the historical unmatched-route 404, byte-identical).
# ---------------------------------------------------------------------------


class _Ctx:
    """One matched request: everything a handler may read."""
    __slots__ = ("gw", "method", "path", "target", "qs", "body", "json",
                 "m", "row", "headers")

    def __init__(self, gw: Gateway, method: str, path: str, target: str,
                 qs: dict[str, list[str]], body: bytes,
                 headers: dict[str, str] | None = None) -> None:
        self.gw = gw
        self.method = method
        self.path = path
        self.target = target
        self.qs = qs
        self.body = body
        self.json = None
        self.m = None
        self.row = None
        # R2 media (2026-09-06): request headers, LOWER-CASED keys —
        # the asset door reads "range" for partial content (video
        # scrubbing in the media sidebar needs 206s; a full-file
        # stall per seek is not a video player). Default {} keeps
        # route() callers without headers working (tests, WS paths).
        self.headers = headers or {}

    def q(self, name: str, default: str | None = None) -> str | None:
        return self.qs.get(name, [default])[0]


@dataclass(frozen=True)
class Route:
    method: str = "*"          # "GET" | "POST" | "DELETE" | "A|B" | "*"
    path: str = ""             # literal path; regex when regex=True
    template: str = ""         # doc/openapi form ("/v1/flows/status/{run_id}")
    group: str = ""            # doc group heading
    summary: str = ""          # one line for generated docs
    query: tuple = ()          # documented query parameter names
    body: str = "none"         # none | strict | lenient | raw
    regex: bool = False
    ws: bool = False           # websocket door (hijacked in handle())
    attr: str = ""             # chrome stubs: editor_runs attribute
    handler: Callable[[_Ctx], Awaitable[HandlerResult]] | None = None


async def _h_flows_start(ctx: _Ctx) -> HandlerResult:
    try:
        run = await ctx.gw.submit(ctx.json)
    except ValidationError as e:
        return 400, _refusal(e)
    return 202, {"run_id": run.run_id, "status": run.status}


async def _h_flows_validate(ctx: _Ctx) -> HandlerResult:
    """The COMPILE door (operator order 2026-09-05: "THESE ERRORS
    NEED BE CAUGHT COMPILE TIME, NOT INFERENCE TIME"). Two arms,
    both the EXACT phase-1 chain a start would run — every refusal
    is verbatim compile-time error text. No queue slot, no GPU
    claim, no sidecar, no registration. Callers: the AI compose
    loop AND the editor's pre-Run check (a refusal paints the card
    before any run is attempted).

      {flow_inline: {...}} -> typed flow compile (stage/edge/Kinds);
        200 carries the typed stage view (resolved output kinds
        included) so the agent sees the graph it just built.
      {flow: name, ...initials} -> the named flow's initial door
        (initial_validators over the body's extra keys — a ghost
        photo 400s HERE with the same text a start would return,
        minus the registration); 200 carries the same stage view.
      {model: mid, ...params} -> card phase 1: strict body, artifact
        sweep, card requires, the frozen card row — the same
        refusals a start hits, returned HERE for iteration.
    """
    body = ctx.json
    if isinstance(body, dict) and "model" in body:
        try:
            _strict_body(body)
            resolve_request(body)   # {model} arm: phase 1 inside
        except ValidationError as e:
            return 400, _refusal(e)
        return 200, {"ok": True, "model": str(body["model"]),
                     "card": True,
                     # R4.3: queue truth now (engine medians unknown
                     # until the card compose builds the graph)
                     "cost": ctx.gw.cost_preview([])}
    import flow as flow_mod
    # A body carrying BOTH a flow name and inline shape (stages) is an
    # inline body with an extra top key — NOT a named-flow request.
    # It falls through to flow_from_body, whose unknown-keys refusal
    # names the offender (QUEUE LANE LAW: ambiguous requests refuse).
    if isinstance(body, dict) and "flow" in body \
            and "flow_inline" not in body and "model" not in body \
            and "stages" not in body:
        try:
            fl = flow_mod.load_flow(str(body["flow"]))
            graph, skipped = fl.compile(dict(body))
        except flow_mod.FlowError as e:
            return 400, {"error": str(e), "code": "flow_compile",
                           "loc": "flow"}
        return 200, {
            "ok": True,
            "flow": fl.id,
            "skipped": list(skipped),
            "cost": ctx.gw.cost_preview(
                [n.node_type for n in graph.nodes]),
            "stages": [
                {"id": n.node_id, "engine": n.node_type,
                 "description": n.description,
                 "inputs": list(n.input_from),
                 "outputs": dict(n.outputs)}
                for n in graph.nodes],
        }
    # INLINE ENVELOPE parity with resolve_request (2026-09-06, branch
    # system): {"flow_inline": {...}, ...initials} compiles the nested
    # shape with the FULL body as the initial pool — a starter_image
    # riding alongside an inline branch must reach pruned_for. A bare
    # flow shape (no flow_inline key) compiles as itself, as before.
    envelope = ctx.json.get("flow_inline") \
        if isinstance(ctx.json, dict) else None
    try:
        fl = flow_mod.flow_from_body(
            envelope if envelope is not None else ctx.json)
        graph, skipped = fl.compile(dict(ctx.json))
    except flow_mod.FlowError as e:
        # STROKE 3 (2026-09-06): BATCH refusals — "error" stays the
        # verbatim first refusal (wire compatibility); "errors" rows
        # add every OTHER stage-local problem the door can name, so
        # N mistakes cost ONE round-trip instead of N. Rows are
        # ordered: the first refusal, then per-stage locals, then
        # engine workflow checks (validate_workflow ABI — the comfyui
        # pin sweep). Wall: test_validate_batch.py.
        return 400, {"error": str(e), "code": "flow_compile",
                     "loc": "flow",
                     "errors": _validate_batch_rows(
                         envelope if envelope is not None else ctx.json,
                         str(e))}
    # A flow-compiles-clean body can still carry workflow garbage (the
    # flow layer never opens params) — the pin sweep runs on SUCCESS
    # too: garbage graphs die at the door, not on GPU money.
    wf_rows = _workflow_sweep(
        (envelope if envelope is not None else ctx.json))
    if wf_rows:
        return 400, {"error": wf_rows[0]["error"],
                       "code": "workflow_pin",
                       "loc": wf_rows[0].get("stage", "flow"),
                       "errors": wf_rows}
    return 200, {
        "ok": True,
        "skipped": list(skipped),
        "flow": fl.id,
        "cost": ctx.gw.cost_preview(
            [n.node_type for n in graph.nodes]),
        "stages": [
            {"id": n.node_id, "engine": n.node_type,
             "description": n.description,
             "inputs": list(n.input_from),
             "outputs": dict(n.outputs)}
            for n in graph.nodes],
    }


def _workflow_sweep(body: JsonValue) -> list[dict[str, str]]:
    """The offline pin sweep, isolated: every stage whose engine
    exports validate_workflow (comfyui today) gets its params row
    checked. Runs on BOTH validate paths — a flow that compiles can
    still carry a graph the estate pin refuses."""
    stages = body.get("stages") if isinstance(body, dict) else None
    if not isinstance(stages, list):
        return []
    rows: list[dict[str, str]] = []
    for i, st in enumerate(stages):
        if not isinstance(st, dict):
            continue
        engine = st.get("engine")
        label = str(st.get("id", "stage[%d]" % i))
        if not isinstance(engine, str):
            continue
        try:
            vw = getattr(load_engine(engine), "validate_workflow", None)
        except Exception:
            vw = None
        if vw is not None and isinstance(st.get("params"), dict):
            for wrow in vw(st["params"]):
                # R4.2: pin rows carry their own code + loc — the
                # agent loop routes on code, reads error for why.
                rows.append({"stage": label, "error": wrow,
                             "code": "workflow_pin"})
    return rows


def _validate_batch_rows(body: JsonValue, first_error: str) -> list[dict[str, str]]:
    """Every refusal the door can name, as structured rows.

    Per-stage LOCAL probes strip inputs/expected (cross-stage wiring
    is only checkable whole-flow — the first_error row carries it),
    so a probe refusal is always about the stage row itself: unknown
    fields, a dead engine, a kind typo in outputs, a card-schema
    miss. Engines may export validate_workflow(params) (the offline
    pin sweep) — called for every stage whose engine loads."""
    import flow as flow_mod
    # R4.2: every row carries code + loc (the batch is the agent
    # loop's cheapest iteration — N mistakes, ONE round-trip, each
    # row routable).
    rows: list[dict[str, str]] = [{"scope": "flow", "error": first_error,
                                    "code": "flow_compile",
                                    "loc": "flow"}]
    stages = body.get("stages") if isinstance(body, dict) else None
    if not isinstance(stages, list):
        return rows
    for i, st in enumerate(stages):
        label = st.get("id", "stage[%d]" % i) if isinstance(st, dict) \
            else "stage[%d]" % i
        if isinstance(st, dict):
            probe = {"id": "probe", "stages": [
                {k: v for k, v in st.items()
                 if k not in ("inputs", "expected")}]}
            try:
                flow_mod.flow_from_body(probe)
            except flow_mod.FlowError as e:
                rows.append({"stage": str(label), "error": str(e),
                             "code": "flow_compile"})
    # engine workflow sweep (offline, pin-driven) — shared with the
    # success path
    rows.extend(_workflow_sweep(body))
    return rows


async def _h_queue(ctx: _Ctx) -> HandlerResult:
    gw = ctx.gw
    return 200, {
        "queued": len(gw.order),
        "running": 1 if gw.active else 0,
        "active": gw.active.run_id if gw.active else "",
        "queued_ids": list(gw.order),
    }


def _run_log_tail(obj: dict[str, JsonValue]) -> str:
    """The run's log tail for the console drilldown (include_log) —
    SYNTHESIZED from real state, never fabricated: the run's status
    row + queue position, one line per stage (name: status, with the
    LIVE progress/activity the report contract stamps mid-run), stage
    errors verbatim, artifacts on completion. The gateway keeps no
    retained event history (publish fans out to live subscribers
    only) and no persisted stdout — this IS the honest tail: every
    line derives from a field the runner/sidecar actually wrote.
    Capped (the tail stays a tail: last 80 lines)."""
    lines: list[str] = []
    status = str(obj.get("status") or "?")
    qp = obj.get("queue_position")
    head = "run: " + status
    if status == "queued" and isinstance(qp, int) and qp > 0:
        head += " (queue position %d)" % qp
    if obj.get("error"):
        head += " — " + str(obj["error"])[:300]
    lines.append(head)
    for st in (obj.get("stages") or []):
        if not isinstance(st, dict):
            continue
        name = str(st.get("name") or st.get("id") or "stage")
        line = "%s: %s" % (name, st.get("status") or "?")
        p = st.get("progress")
        if isinstance(p, dict) and p.get("max"):
            line += " — %s/%s" % (p.get("value"), p.get("max"))
        a = st.get("activity")
        if isinstance(a, dict):
            ph = str(a.get("phase") or "")
            msg = a.get("message")
            nc = a.get("node_class")
            line += " [%s%s]" % (ph, ": " + str(msg or nc)
                                 if (msg or nc) else "")
        if st.get("error"):
            line += "\n  error: " + str(st["error"])[:300]
        lines.append(line)
    arts = obj.get("artifacts")
    if arts:
        names = []
        for a in arts[:6]:
            v = (a.get("url") if isinstance(a, dict) else a) or \
                (a.get("name") if isinstance(a, dict) else a)
            s = str(v or "").rsplit("/", 1)[-1]
            if s:
                names.append(s)
        if names:
            lines.append("artifacts: " + ", ".join(names))
    return "\n".join(lines[-80:])


async def _h_flows_status(ctx: _Ctx) -> HandlerResult:
    rid = ctx.m.group(1)
    include_log = str(ctx.q("include_log", "")).lower() in \
        ("1", "true", "yes")
    run = ctx.gw.runs.get(rid)
    if run is None:
        stored = sidecar_status(rid)
        if stored is None:
            return 404, {"error": "unknown run_id"}
        if include_log:
            stored["log_tail"] = _run_log_tail(stored)
        return 200, stored
    body = {
        "run_id": run.run_id,
        "status": run.status,
        "stages": run.stages,
        "skipped_stages": list(run.skipped_stages),
        "artifacts": run.artifacts,
        "error": run.error,
        "queue_position": (ctx.gw.order.index(run.run_id)
                           if run.run_id in ctx.gw.order else 0),
    }
    # include_log (2026-09-06, the studio console drilldown): the
    # client RPC always documented this enrichment; the door now
    # honors it — every wide surface can render the run's real tail.
    if include_log:
        body["log_tail"] = _run_log_tail(body)
    return 200, body


async def _h_flows_stop(ctx: _Ctx) -> HandlerResult:
    try:
        return 200, await ctx.gw.stop(ctx.m.group(1))
    except ValidationError as e:
        return 400, _refusal(e)


async def _h_flows_resume(ctx: _Ctx) -> HandlerResult:
    try:
        return 200, await ctx.gw.resume(ctx.m.group(1))
    except ValidationError as e:
        return 400, _refusal(e)


async def _h_flows_reproduce(ctx: _Ctx) -> HandlerResult:
    try:
        return 200, await ctx.gw.reproduce(ctx.m.group(1))
    except ValidationError as e:
        return 400, _refusal(e)


async def _h_ws_fallback(ctx: _Ctx) -> HandlerResult:
    """Non-upgrade reach of a WS door: the unmatched-route 404 the
    if-chain era served (wire parity)."""
    return 404, {"error": "no such route %s %s" % (ctx.method, ctx.path)}


async def _h_runs_list(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    # limit is honored (1..500 per editor_runs.runs clamp, ~6612).
    # The default of 200 silently buries fresh generations under hundreds
    # of older rows; the operator hit this on 2026-09-04 and the wall
    # suite test_run_lifecycle calls ?limit=500 to surface its row
    # regardless of archive size. Garbage refuses 4xx — a silent
    # default here is the no-silent-drops sin in miniature.
    _raw = ctx.q("limit", "") or "200"
    try:
        limit = int(_raw)
    except ValueError:
        return 400, {"error": "limit must be an integer (got %r)" % _raw}
    # live_run_ids: the gateway's registry keys (run ids == run dir
    # names). Without them editor_runs.runs misreads a LIVE running
    # run as a zombie and serves "failed" for work that is still
    # executing (the 2026-09-06 stroke-1 fix; wall:
    # test_runs_list_passes_live_ids). Harness ctxs may carry no
    # gateway (gw=None): no registry, no live ids — the sweep then
    # behaves exactly as before the fix.
    live = tuple(ctx.gw.runs) if getattr(ctx.gw, "runs", None) else ()
    return 200, _er.runs(str(STATE_ROOT), limit=limit,
                         live_run_ids=live)


async def _h_run_detail(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    return _er.run_detail(str(STATE_ROOT), ctx.m.group(1))


async def _h_model_catalog(ctx: _Ctx) -> HandlerResult:
    import catalog as _cat
    return 200, json.loads(_cat.to_json(_cat.scan_catalog(str(REPO))))


async def _h_model_one(ctx: _Ctx) -> HandlerResult:
    import catalog as _cat
    row = _cat.find_model(_cat.scan_catalog(str(REPO)), ctx.m.group(1))
    if row is None:
        return 404, {"error": "model not found"}
    return 200, row


async def _h_forms(ctx: _Ctx) -> HandlerResult:
    import editor_forms as _ef
    return 200, _ef.forms(str(REPO))


async def _h_kinds(ctx: _Ctx) -> HandlerResult:
    import editor_forms as _ef
    return 200, _ef.kinds(str(REPO))


async def _h_form_spec(ctx: _Ctx) -> HandlerResult:
    import editor_forms as _ef
    code, spec = _ef.form_spec(str(REPO), ctx.q("model", ""))
    return code, spec


async def _h_loras(ctx: _Ctx) -> HandlerResult:
    """GET /v1/loras?model=<id> — a model's DECLARED LoRA pack (the
    LorasMod rows on the class; python rows, never a disk scrape).
    The picker's options ARE the rows — 'lora detection' migrated to
    the class system 2026-09-05 (the door the mods flip forgot)."""
    import catalog as _cat
    mid = ctx.q("model", "")
    if not mid:
        return 400, {"error": "missing model param"}
    body = _cat.model_loras(str(REPO), mid)
    if body is None:
        return 404, {"error": "model not found"}
    return 200, body


async def _h_family_schemas(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    return 200, _er.family_param_schemas(
        _er.catalog_family_ids(str(REPO / "packages")))


async def _h_schema(ctx: _Ctx) -> HandlerResult:
    # STROKE 2 (2026-09-06): the whole authoring vocabulary in ONE
    # payload — kinds, engines (+default outputs), the flow_inline
    # stage shape, the doors, every declared flow with stage rows.
    # Derived from the same rows the validators enforce (flow.py
    # schema_snapshot); the AI stops reading plugin source to
    # compose. Wall: tests/unit/runtime/test_schema_door.py.
    import flow as _flow_mod
    return 200, _flow_mod.schema_snapshot()


async def _h_family_schema_one(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    return _er.family_param_schema(
        _er.catalog_family_ids(str(REPO / "packages")), ctx.m.group(1))


async def _h_drafts_list(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    return 200, _er.drafts_list(str(STATE_ROOT / "drafts"))


async def _h_drafts_save(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    return _er.drafts_save(str(STATE_ROOT / "drafts"), ctx.json)


async def _h_drafts_get(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    code, body = _er.drafts_get(str(STATE_ROOT / "drafts"), ctx.m.group(1))
    if code != 200:
        return code, body
    # drafts_get serves VERBATIM disk bytes (str) — the wire contract is
    # a JSON OBJECT. Parse once here: a str payload would ride _adapt's
    # json.dumps a second time (wire body "\"{...}\"") and every
    # Media->Cards open would hydrate zero stages (res.json() hands
    # hydrateDraft a string — the "flows aren't recreated" break).
    try:
        doc = json.loads(body) if isinstance(body, str) else body
    except (ValueError, TypeError) as exc:
        return 500, {"error": "draft corrupt on disk: %s" % exc}
    if not isinstance(doc, dict):
        return 500, {"error": "draft corrupt on disk: not an object"}
    return code, doc


async def _h_draft_stage_patch(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    code, body = _er.draft_stage_patch(
        str(STATE_ROOT / "drafts"), ctx.m.group(1), ctx.m.group(2),
        ctx.json)
    return code, body


async def _h_draft_stage_result(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    code, body = _er.draft_stage_result(
        str(STATE_ROOT / "drafts"), ctx.m.group(1), ctx.m.group(2))
    return code, body


def _parse_range(spec: str,
                 size: int) -> "tuple[int, int] | None":
    """R2 media (2026-09-06): parse one HTTP Range spec against a
    body of size N. Returns (lo, hi) inclusive, or None = serve the
    FULL body 200 (the documented honest fallback — a malformed,
    multi-range, or unsatisfiable spec never strands the client;
    browsers retry full). Forms honored: bytes=a-b, bytes=a-,
    bytes=-suffix (last N)."""
    spec = (spec or "").strip()
    if not spec.lower().startswith("bytes=") or "," in spec:
        return None
    rng = spec.split("=", 1)[1].strip()
    if "-" not in rng:
        return None
    lo_s, _, hi_s = rng.partition("-")
    lo_s = lo_s.strip()
    hi_s = hi_s.strip()
    try:
        if lo_s == "":
            n = int(hi_s)
            if n <= 0:
                return None
            return max(0, size - n), size - 1
        lo = int(lo_s)
        hi = int(hi_s) if hi_s else size - 1
    except ValueError:
        return None
    if lo < 0 or hi < lo:
        return None
    if lo >= size:
        return None   # unsatisfiable — honest full 200
    return lo, min(hi, size - 1)


async def _h_asset(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    rel = ctx.path[len(ASSET_URL_PREFIX + "/"):]
    code, data, ctype = _er.serve_asset(str(STATE_ROOT), rel)
    if code == 200:
        # R2 media: Range requests get true 206 partial content
        # (Content-Range + inclusive slice); 200s still announce
        # Accept-Ranges so players probe once. Malformed specs fall
        # back to the full body — never a stranded seek.
        span = _parse_range(ctx.headers.get("range", ""), len(data))
        if span is not None:
            lo, hi = span
            return 206, ({}, {"content-type": ctype,
                              "content-range": "bytes %d-%d/%d"
                                              % (lo, hi, len(data)),
                              "accept-ranges": "bytes"},
                         data[lo:hi + 1])
        return code, ({}, {"content-type": ctype,
                           "accept-ranges": "bytes"}, data)
    return code, {"error": "not found"} if code == 404 else data


async def _h_asset_input(ctx: _Ctx) -> HandlerResult:
    # THE INPUT PREVIEW DOOR (2026-09-06, operator order: "We need
    # to have an image preview when the card is drilled out for ANNY
    # and IMAGE->3d"): the uploads door returns repo-relative
    # data/input/<name> paths — composable, but no <img> can load
    # them, so a drilled-out card showed no preview of its own
    # source photo. This streams those bytes back (images only —
    # the uploads door's own allowlist; flat names; traversal
    # refused).
    import editor_runs as _er
    from urllib.parse import unquote as _uq
    name = _uq(ctx.path[len("/v1/assets/inputs/"):])
    code, data, ctype = _er.serve_input_asset(str(REPO), name)
    if code == 200:
        return code, ({}, {"content-type": ctype}, data)
    if code == 404:
        return code, {"error": "input not found"}
    return code, {"error": data.decode("utf-8", "replace")}


async def _h_ledger(ctx: _Ctx) -> HandlerResult:
    return 200, ledger_tail(ctx.target)


# ── observability (R2, 2026-09-06): the metrics door ──────────────────
#
# One GET answers "how is the queue" without scraping sidecars:
# depth, the active run, registry counts, subscriber fan-out,
# uptime, and the bounded recent ring (queue wait + wall total per
# settled run). Stage-duration histograms wait for per-stage
# timestamps (the sidecar shape is contract — additive-only the day
# they land). Design record: docs/design/production-architecture-
# review.md R2; wall: tests/unit/runtime/test_metrics_door.py.
async def _h_metrics(ctx: _Ctx) -> HandlerResult:
    gw = ctx.gw
    counts: dict[str, int] = {}
    for r in gw.runs.values():
        counts[r.status] = counts.get(r.status, 0) + 1
    active = gw.active
    active_row: dict[str, JsonValue] | None = None
    if active is not None:
        started = getattr(active, "_started_at", None)
        active_row = {
            "run_id": active.run_id, "pipeline": _pipeline_of(active),
            "status": active.status, "started_at": started,
            "queue_wait_s": round(started - active.created_at, 3)
            if started is not None else None}
    return 200, {
        "boot_at": gw.boot_at,
        "uptime_s": round(time.time() - gw.boot_at, 3),
        "queue_depth": len(gw.order),
        "queued": list(gw.order),
        "active": active_row,
        "runs_registered": len(gw.runs),
        "runs_by_status": counts,
        "subscribers": {rid: len(qs)
                        for rid, qs in sorted(gw.subscribers.items())},
        "recent": list(gw.recent),
    }


async def _h_agent_boot(ctx: _Ctx) -> HandlerResult:
    """R4.1 (2026-09-06): the ONE boot call for a headless agent
    session — gateway runtime truth + health + the whole discovery
    spread (lanes, card tools, skills, model catalog, authoring
    schema) in a single payload. Today the same picture costs five
    round-trips before the first compose; an agent that must
    discover its tools per-session pays it every boot.

    FAULT-ISOLATED SECTIONS (RESILIENCE LAW): a broken lane wire or
    catalog must not take the manifest down — the failing section
    answers {"error": ...} and the rest ships. Every payload is the
    SAME builder its dedicated door serves (no restatement drift:
    lane_disclosure/catalog/flow.schema_snapshot are the SSOTs).
    Ledgered agent.boot (the headless session's first row).
    Wall: tests/unit/runtime/test_agent_boot.py."""
    import catalog as _cat
    import editor_runs as _er
    import flow as _flow_mod
    import lane_disclosure as _ld
    gw = ctx.gw

    def _section(build: "Callable[[], JsonValue]") -> JsonValue:
        try:
            return build()
        except Exception as e:   # document, then continue
            return {"error": "%s: %s" % (type(e).__name__, e)}

    counts: dict[str, int] = {}
    for r in gw.runs.values():
        counts[r.status] = counts.get(r.status, 0) + 1
    manifest: dict[str, JsonValue] = {
        "gateway": {
            "version": "0.1.0", "routes": len(ROUTES),
            "boot_at": gw.boot_at,
            "uptime_s": round(time.time() - gw.boot_at, 3)},
        "health": _section(lambda: _er.health()),
        "queue": {
            "depth": len(gw.order), "queued": list(gw.order),
            "active": (gw.active.run_id if gw.active else None),
            "runs_by_status": counts},
        "lanes": _section(lambda: _ld.peek(None, None)),
        "card_tools": _section(lambda: _ld.card_tools(None)),
        "skills": _section(lambda: _ld.skill_index()),
        "model_catalog": _section(lambda: json.loads(
            _cat.to_json(_cat.scan_catalog(str(REPO))))),
        "schema": _section(lambda: _flow_mod.schema_snapshot()),
    }
    ledger("agent.boot", {"routes": len(ROUTES),
                           "uptime_s": manifest["gateway"]["uptime_s"]})
    return 200, manifest


# ── studio presets (stroke 3, 2026-09-06) ───────────────────────────
#
# The tenant preset ledger: estate CharacterPreset rows (the Model
# classes' character_presets) + user rows (data/tenants/<tenant>/
# presets.json — machine state, never committed). GENERIC machinery
# (PLUGIN ARCHITECTURE LAW — the core names no tenant): the tenant
# resolves through the model scan (the studio.tenant some family
# claims); unknown tenants 404. Saved refs resolve through the
# artifact door (resolve_artifact_file — a save naming a pruned run
# refuses BEFORE the row appends, never a dangling preset).

def _studio_family(tenant: str) -> type[Model] | None:
    """The Model class claiming a studio tenant, or None (unknown).
    THE tenant lookup (PLUGIN ARCHITECTURE LAW — the core names no
    tenant): the studio.tenant some family declares."""
    from melite_models import scan_engine_models
    for _path, cls in scan_engine_models(str(REPO)).values():
        studio = getattr(cls, "studio", None)
        if studio is not None \
                and getattr(studio, "tenant", "") == tenant:
            return cls
    return None


def _preset_estate_rows(tenant: str) -> tuple[CharacterPreset, ...] | None:
    """Estate CharacterPreset rows for a tenant, or None (unknown)."""
    cls = _studio_family(tenant)
    if cls is None:
        return None
    return tuple(getattr(cls, "character_presets", ()))


def _provision_mount(cls: type[Model], prov: Provision) -> tuple[str, Path] | None:
    """Resolve a declared Provision to (disk_path, store_root) — the
    ONE resolution both provision doors share (the base-body door
    streams it; the model-provision door streams it or ON-DEMAND
    fetches through the rail into the same store). The mount path
    derives the same way compose resolves lane inputs: the engine
    endpoint file's extra_model_folders map + model_paths read_root;
    the store root is the endpoint's declared download place (the
    rail lands at store_root/<folder>/<name>). None = the family
    declares no engine (a loud caller-side refusal, never a core
    fallback)."""
    engine = getattr(cls, "engine", "") or ""
    if not engine:  # QUEUE LANE LAW: no default engine names — the
        # family declares its engine (anny: engine = 'comfyui' in the
        # plugin, where lane knowledge belongs); without one we
        # refuse, never guess.
        return None
    ep_path = REPO / "packages" / "engines" / engine / "data" / (
        engine + "_endpoint.json")
    try:
        ep = json.loads(ep_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        ep = {}
    folders = ep.get("extra_model_folders") or {}
    sub = str(folders.get(prov.folder, prov.folder)
              or prov.folder).strip().strip("/")
    if isinstance(ep.get("model_base_path"), str) \
            and ep["model_base_path"].strip():
        overrides = {"model_base_path": ep["model_base_path"].strip()}
    else:
        overrides = {}
    from estate_config import model_paths as _model_paths
    roots = _model_paths(engine,
                         endpoint_overrides=overrides)
    disk = os.path.join(roots["read_root"], sub, prov.name)
    store_root = Path(str(ep.get("model_download_path")
                          or ep.get("model_base_path")
                          or roots["read_root"]).strip())
    return disk, store_root


async def _h_base_body(ctx: _Ctx) -> HandlerResult:
    """Stream the family's declared neutral mannequin (2026-09-06):
    the studio viewport shows it while the body slot is empty
    (display-only — it never writes params). GENERIC: the Model's
    base_body names the provision; the mount path derives the same
    way compose resolves it (endpoint file + model_paths read_root
    + the provision's folder — _provision_mount, the ONE resolution
    the provision doors share). Loud 404s: unknown tenant, no
    declared base body, or not provisioned on disk (the phase-1
    door refuses the same way at run time — card-open stays
    honest)."""
    import editor_runs as _er
    tenant = ctx.m.group(1)
    cls = _studio_family(tenant)
    if cls is None:
        return 404, {"error": "unknown studio tenant %r" % (tenant,)}
    base_name = getattr(cls, "base_body", "") or ""
    if not base_name:
        return 404, {"error": "family %r declares no base body"
                     % (getattr(cls, "id", tenant),)}
    prov = None
    for p in (getattr(cls, "provisions", None) or ()):
        if p.name == base_name:
            prov = p
            break
    if prov is None:  # the metaclass refuses this at import; double-guard
        return 500, {"error": "base body %r is not a declared "
                     "provision" % (base_name,)}
    resolved = _provision_mount(cls, prov)
    if resolved is None:
        return 500, {"error": "family %r declares no engine"
                     % (getattr(cls, "id", tenant),)}
    disk, _store = resolved
    if not os.path.isfile(disk):
        return 404, {"error": "base body %r is not provisioned "
                     "(missing %s — provision it: models lane)"
                     % (prov.name, disk)}
    try:
        with open(disk, "rb") as f:
            data = f.read()
    except OSError as e:
        return 500, {"error": "base body unreadable: %s" % e}
    return 200, ({}, {"content-type": _er.content_type_of(disk)},
                 data)


# ── the provision door (2026-09-06) ─────────────────────────────────
#
# GET /v1/models/<family>/provisions/<name> — a model-DECLARED viewer
# asset (melite_models Provision row) streamed on demand; when the
# mount misses, the door ACQUIRES it through the ONE rail
# (py/provision_rail — comfy-mcp download_model, sha256-verified,
# landed in the weights store) and streams it. Studio viewer assets
# point HERE, never at vite-public blobs: a declared row is
# auto-provisioned (the tools/provision.py walk), on-demand fetched
# (this door), sha-pinned, and mount-resolved — the
# /editor/soma-skin-standard.npz 404 class (2026-09-06) dies at the
# root.
#
# Laws kept:
#   PLUGIN ARCHITECTURE LAW — the core names no lane: the family and
#   the provision row resolve through the model scan; the door is a
#   GENERIC stream-or-fetch.
#   PROVISIONING LAW — acquisition rides comfy-mcp in-process (the
#   base env; the service unit runs the base env python), never a
#   second rail, never a shell script.
#   RESILIENCE LAW — rail failures are loud 502s naming the exact
#   reason + the manual fallback; concurrent demands serialize on a
#   per-provision lock; the loop never blocks (thread offload).

_PROVISION_LOCKS: dict[str, "threading.Lock"] = {}
_PROVISION_LOCKS_GUARD = threading.Lock()


def _provision_lock(key: str) -> "threading.Lock":
    with _PROVISION_LOCKS_GUARD:
        lk = _PROVISION_LOCKS.get(key)
        if lk is None:
            lk = threading.Lock()
            _PROVISION_LOCKS[key] = lk
        return lk


def _family_by_id(fid: str) -> "type | None":
    """The Model class for a family id — the model-scan lookup (the
    provision door's resolution; the studios door resolves by tenant
    the same way)."""
    from melite_models import scan_engine_models
    for _path, cls in scan_engine_models(str(REPO)).values():
        if getattr(cls, "id", "") == fid:
            return cls
    return None


def _fetch_provision_locked(cls: type[Model], prov: Provision) -> str:
    """Worker-thread body for the on-demand path (provision_rail
    drives async comfy-mcp tools via asyncio.run — it must never run
    on the serving loop). The per-provision lock serializes
    concurrent demands; the lock holder re-checks the mount (the
    previous holder may have landed the bytes)."""
    import provision_rail
    with _provision_lock("%s/%s" % (getattr(cls, "id", "?"), prov.name)):
        resolved = _provision_mount(cls, prov)
        if resolved is None:
            raise provision_rail.ProvisionRailError(
                "family %r declares no engine" % getattr(cls, "id", "?"))
        disk, store_root = resolved
        if os.path.isfile(disk):
            return disk
        return str(provision_rail.fetch_provision(
            url=str(prov.url), name=prov.name,
            sub=(getattr(prov, "folder", "") or "").strip("/"),
            sha256=(prov.sha256 or ""), store_root=store_root))


async def _h_model_provision(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    fid, pname = ctx.m.group(1), ctx.m.group(2)
    cls = _family_by_id(fid)
    if cls is None:
        return 404, {"error": "unknown model family %r — provisions "
                     "resolve through the model scan (see "
                     "/v1/model-catalog)" % fid}
    declared = tuple(getattr(cls, "provisions", None) or ())
    prov = next((p for p in declared if p.name == pname), None)
    if prov is None:
        return 404, {"error": "family %r declares no provision %r "
                     "(declared: %s)"
                     % (fid, pname,
                        ", ".join(p.name for p in declared) or "none")}
    resolved = _provision_mount(cls, prov)
    if resolved is None:
        return 500, {"error": "family %r declares no engine" % (fid,)}
    disk, _store = resolved
    if not os.path.isfile(disk):
        # ON DEMAND: acquire through the ONE rail, off the loop
        import provision_rail
        try:
            disk = await asyncio.to_thread(
                _fetch_provision_locked, cls, prov)
        except provision_rail.ProvisionRailError as e:
            return 502, {"error": "provision fetch (%s/%s): %s"
                         % (fid, pname, e)}
        except Exception as e:  # noqa: BLE001 — the door 502s, never blind-500s
            return 502, {"error": "provision fetch (%s/%s) failed: "
                         "%s: %s" % (fid, pname,
                                     e.__class__.__name__, e)}
    try:
        with open(disk, "rb") as f:
            data = f.read()
    except OSError as e:
        return 500, {"error": "provision unreadable: %s" % e}
    return 200, ({}, {"content-type": _er.content_type_of(disk)},
                 data)


def _preset_check_refs(row: CharacterPreset) -> str | None:
    """Every URL the row names must resolve on disk (existence-verified).
    Returns the refusal text, or None when clean."""
    from artifact_refs import (resolve_artifact_file, ArtifactRefError)
    refs = []
    if row.params_ref:
        refs.append(("params_ref", row.params_ref))
    if row.body_ref:
        refs.append(("body_ref", row.body_ref))
    if row.parts.hair:
        refs.append(("parts.hair", row.parts.hair))
    if row.parts.outfit:
        refs.append(("parts.outfit", row.parts.outfit))
    for where, ref in refs:
        try:
            resolve_artifact_file(ref)
        except ArtifactRefError as e:
            return "%s: %s" % (where, e)
    return None


def _preset_try_promote(row: CharacterPreset) -> CharacterPreset | None:
    """File→estimated promotion (None = stays file). Reads NOTHING
    the studio sent: the params artifact must sit beside the
    body_ref's run artifact on disk, parse as JSON, and validate as
    EstimatedParams. A corrupt/foreign anny_preset.json refuses the
    WHOLE save (a half-promoted row is worse than a file row)."""
    from artifact_refs import resolve_artifact_file, ArtifactRefError
    from melite_models import (EstimatedParams, PresetOrigin,
                               PRESET_PARAMS_FILENAME)
    from pathlib import Path as _Path
    from pydantic import ValidationError as _PydanticRefusal
    prefix, sep, _tail = row.body_ref.partition("/runs/")
    if not sep or "/" not in _tail:
        return None  # a mounts file, not a run artifact — no run dir
    run_dir = prefix + "/runs/" + _tail.rsplit("/", 1)[0]
    params_ref = run_dir + "/" + PRESET_PARAMS_FILENAME
    try:
        params_path = _Path(resolve_artifact_file(params_ref))
    except ArtifactRefError:
        return None  # the run delivered no params (regress) — file
    try:
        doc = json.loads(params_path.read_text(encoding="utf-8"))
        params = EstimatedParams(
            phenotype=tuple(doc["phenotype"]),
            scale=tuple(doc["scale"]))
    except (OSError, ValueError, KeyError, TypeError,
            _PydanticRefusal) as e:
        raise _PresetPromoteRefusal(
            "run delivered %s but it does not parse as estimated "
            "params (%s) — fix the run or save mesh-only" % (
                PRESET_PARAMS_FILENAME, e))
    if doc.get("dialect") != "estimated":
        raise _PresetPromoteRefusal(
            "run delivered %s with dialect %r (want estimated)" % (
                PRESET_PARAMS_FILENAME, doc.get("dialect")))
    return row.model_copy(update={
        "origin": PresetOrigin.estimated,
        "params": params, "params_ref": params_ref})


class _PresetPromoteRefusal(Exception):
    """A corrupt params artifact refuses the save (never half-saved)."""


async def _h_presets_list(ctx: _Ctx) -> HandlerResult:
    from melite_models import (all_presets, read_user_presets,
                               PresetLedgerError)
    tenant = ctx.m.group(1)
    estate = _preset_estate_rows(tenant)
    if estate is None:
        return 404, {"error": "unknown studio tenant %r" % (tenant,)}
    try:
        user = read_user_presets(str(REPO / "data"), tenant)
        rows = all_presets(estate, user)
    except PresetLedgerError as e:
        return 500, {"error": "preset ledger: %s" % e}
    # Each row rides its params_json — the CANONICAL bake dialect
    # (canonical_json: local_changes as the node's OBJECT, not the
    # row tuple; estimated rows carry scale). The studio posts this
    # VERBATIM; client-side dialect translation is dead (the child
    # preset's list-shaped local_changes sailed through JS
    # `[] || {}` straight to a GPU traceback — 2026-09-06). File rows
    # carry None (their mesh applies via the attach door, no bake).
    # SERVE-SIDE BELT: every served string validates through
    # AnnyBakeParams — a malformed declaration row refuses the DOOR,
    # never the studio's run.
    from melite_models import AnnyBakeParams
    from pydantic import ValidationError as _RowRefusal
    served = []
    for p in rows:
        d = p.model_dump(mode="json")
        try:
            d["params_json"] = p.canonical_json() if p.params else None
        except ValueError:
            d["params_json"] = None
        if d["params_json"] is not None:
            try:
                AnnyBakeParams.model_validate(d["params_json"])
            except _RowRefusal as e:
                return 500, {"error": "preset %r serves an invalid bake "
                                     "dialect: %s" % (p.id, e)}
        served.append(d)
    return 200, {"tenant": tenant, "presets": served}


async def _h_presets_save(ctx: _Ctx) -> HandlerResult:
    from melite_models import (CharacterPreset, append_user_preset,
                               PresetLedgerError)
    from pydantic import ValidationError as _PydanticRefusal
    tenant = ctx.m.group(1)
    estate = _preset_estate_rows(tenant)
    if estate is None:
        return 404, {"error": "unknown studio tenant %r" % (tenant,)}
    body = ctx.json if isinstance(ctx.json, dict) else {}
    try:
        row = CharacterPreset(id="user-pending", **{
            k: v for k, v in body.items() if k != "id"})
    except _PydanticRefusal as e:
        return 400, {"error": "bad preset row: %s" % e}
    problem = _preset_check_refs(row)
    if problem is not None:
        return 400, {"error": "dangling preset ref — %s" % problem}
    # save promotion (stroke 3, 2026-09-06): the studio always posts
    # FILE intent (it knows the mesh, never the params). When the
    # body_ref is a run artifact and that run's dir ALSO delivered
    # the preset params artifact (the commercial worker writes
    # PRESET_PARAMS_FILENAME beside its npz), the row promotes to
    # estimated — params parsed + validated server-side, never
    # studio-guessed. Regress runs (no params artifact) stay file.
    if row.origin.value == "file" and row.body_ref:
        try:
            promoted = _preset_try_promote(row)
        except _PresetPromoteRefusal as e:
            return 400, {"error": "preset ledger: %s" % e}
        if promoted is not None:
            row = promoted
    try:
        saved = append_user_preset(str(REPO / "data"), tenant, row,
                                   estate)
    except PresetLedgerError as e:
        return 400, {"error": "preset ledger: %s" % e}
    return 201, {"tenant": tenant,
                 "preset": saved.model_dump(mode="json")}


async def _h_presets_delete(ctx: _Ctx) -> HandlerResult:
    from melite_models import delete_user_preset, PresetLedgerError
    tenant = ctx.m.group(1)
    preset_id = ctx.m.group(2)
    estate = _preset_estate_rows(tenant)
    if estate is None:
        return 404, {"error": "unknown studio tenant %r" % (tenant,)}
    try:
        removed = delete_user_preset(str(REPO / "data"), tenant,
                                     preset_id, estate)
    except PresetLedgerError as e:
        return 400, {"error": "preset ledger: %s" % e}
    if not removed:
        return 404, {"error": "no user preset %r on tenant %r"
                     % (preset_id, tenant)}
    return 200, {"tenant": tenant, "deleted": preset_id}


# ── Uploads (browser → estate input stream) ──────────────────────────
#
# Operator order, 2026-09-06 (verbatim): "AND THERE IS NO WAY FOR ME
# TO PUT AN IMAGE IN, LET ALONE TEST IT". The estate had NO
# server-side upload — images rode FileReader data: URLs (the
# SubcardModal precedent), which the anny estimate verb must refuse
# (the lane composes mount files; a data: URL stages nothing to the
# engine). THIS door is how a browser photo becomes a composable
# path: strict JSON {filename, data} (data = the FileReader data:
# URL, passed through verbatim), validated and written to
# data/input/ (the estate input stream). The returned repo-relative
# path stages to the engine like any other file initial. Refusals
# are 4xx with the reason — never a stored partial, never an
# overwrite (unique suffix per upload).
_UPLOAD_IMAGE_TYPES = {"image/png": ".png", "image/jpeg": ".jpg",
                       "image/webp": ".webp"}
# the estate's ControlNet precedent (SubcardModal upload well)
_UPLOAD_MAX_BYTES = 20 * 1024 * 1024


async def _h_uploads(ctx: _Ctx) -> HandlerResult:
    doc = ctx.json if isinstance(ctx.json, dict) else None
    if doc is None:
        return 400, {"error": "uploads: body must be a JSON object "
                              "{filename, data}"}
    raw_name = doc.get("filename")
    data_url = doc.get("data")
    if not isinstance(raw_name, str) or not raw_name.strip():
        return 400, {"error": "uploads: filename is required"}
    if not isinstance(data_url, str) or not data_url.startswith("data:"):
        return 400, {"error": "uploads: data must be a FileReader "
                              "data: URL"}
    try:
        header, b64 = data_url.split(",", 1)
    except ValueError:
        return 400, {"error": "uploads: malformed data: URL (no comma)"}
    mime = header.split(";", 1)[0][5:]
    ext = _UPLOAD_IMAGE_TYPES.get(mime)
    if ext is None:
        return 400, {"error": "uploads: image type %r refused (want "
                              "png/jpeg/webp)" % (mime,)}
    try:
        raw = base64.b64decode(b64, validate=True)
    except (ValueError, base64.binascii.Error):
        return 400, {"error": "uploads: base64 body does not decode"}
    if len(raw) > _UPLOAD_MAX_BYTES:
        return 400, {"error": "uploads: image too large (%d bytes, "
                              "max %d)" % (len(raw), _UPLOAD_MAX_BYTES)}
    stem = re.sub(r"[^A-Za-z0-9_-]+", "-",
                  Path(raw_name).stem).strip("-")[:48] or "upload"
    target = REPO / "data" / "input"
    target.mkdir(parents=True, exist_ok=True)
    name = "%s-%s%s" % (stem, uuid.uuid4().hex[:8], ext)
    (target / name).write_bytes(raw)
    return 200, {"path": "data/input/%s" % name, "bytes": len(raw)}


# ── the studio bridge (rebuilt 2026-09-05) ───────────────────────────
#
# The /poser surface (bind meshes, identity morphs, joint reads,
# raster passes) lives INSIDE ComfyUI: the melite-poser-nodes pack
# registers its aiohttp routes on PromptServer (EXTENSION LAW — the
# pack owns its lane's routes). The editor's vite proxy sends the
# /poser prefix here; the gateway is the bridge. The documented
# architecture (vite.config.ts) always said so — the retired Bun-era
# server carried the forward and the py rewrite never rebuilt it, so
# every studio mesh read 404'd ("no such route GET /poser/skin/mesh"
# — the 2026-09-05 viewer audit).
#
# Laws this shape keeps:
#   • QUEUE LANE LAW — the target is an engines.<name>.url from
#     inference.config.json, never a hardcoded endpoint. Zero or
#     ambiguous targets refuse loudly (502) — no fallback, no default.
#   • INFERENCE LAW — the poser pack is studio-plane skin math (its
#     own header: bind meshes + identity metadata "WITHOUT a separate
#     poser-skin container", CPU-side SkinEngine threads). Queued
#     generation still rides /v1/flows/start with poser NODES inside
#     prompts; this bridge never reaches a generation door.
#   • PLUGIN ARCHITECTURE LAW — the mechanics are a GENERIC forward
#     (method + path + query + body → engines.<name>.url); the core
#     names no poser route. The pack stays the SSOT of its surface.
#   • RESILIENCE LAW — upstream refusals pass through VERBATIM (the
#     studio sees the pack's own 404/400, never a masked 500);
#     connection failures return 502 with the exact reason; the
#     asyncio loop never blocks (urllib in a thread — the stdlib-only
#     law).

async def _h_poser_bridge(ctx: _Ctx) -> HandlerResult:
    import urllib.error
    import urllib.request
    from estate_config import load as _load_config

    # Target resolution stays GENERIC (PLUGIN ARCHITECTURE LAW — the
    # core names no engine): the poser packs ride the one configured
    # engine endpoint. Zero or many url-bearing engines refuse LOUDLY
    # (no-silent-drops); if a second endpoint ever exists, the right
    # shape is pinning the target on the bridge row by deliberate
    # order — never a hardcoded default.
    entries = {n: e for n, e in _load_config().engines.items() if e.url}
    if len(entries) != 1:
        return 502, {
            "error": "poser bridge: exactly one engine endpoint with a "
                     "url must be configured to forward to (got %d: %s) "
                     "— inference.config.json engines, no hardcoded "
                     "fallback"
                     % (len(entries), sorted(entries) or ["none"]),
        }
    base = next(iter(entries.values())).url
    url = base.rstrip("/") + ctx.target

    def _fwd() -> tuple[int, str, bytes]:
        req = urllib.request.Request(
            url, method=ctx.method,
            data=ctx.body if ctx.body else None,
            headers=({"content-type": "application/json"}
                     if ctx.body else {}))
        with urllib.request.urlopen(req, timeout=60) as r:
            return (r.status,
                    r.headers.get("content-type", "application/json"),
                    r.read())

    try:
        status, ctype, raw = await asyncio.to_thread(_fwd)
        return status, ({}, {"content-type": ctype}, raw)
    except urllib.error.HTTPError as e:
        # the pack's own refusals (unknown identity model, bad
        # coeffs) pass through with THEIR status and body
        try:
            raw = e.read()
        except Exception:
            raw = b""
        ctype = e.headers.get("content-type", "application/json")
        return e.code, ({}, {"content-type": ctype}, raw)
    except urllib.error.URLError as e:
        return 502, {"error": "poser bridge: comfyui unreachable at %s "
                              "(%s)" % (base, e.reason)}
    except Exception as e:
        return 502, {"error": "poser bridge: %s: %s"
                             % (type(e).__name__, e)}


async def _h_assets_index(ctx: _Ctx) -> HandlerResult:
    import asset_ledger as _al
    _raw = ctx.q("limit", "200") or "200"
    try:
        _lim = int(_raw)
    except ValueError:
        return 400, {"error": "limit must be an integer (got %r)" % _raw}
    _include_test = (ctx.q("include_test", "false") or "").lower() \
        in ("1", "true", "yes")
    _root = TEST_OUT_ROOT if _include_test else OUT_ROOT
    # reading TEST_OUT_ROOT, the directory IS the test filter; bypass
    # L2's sidecar filter (everything there is test-tagged). For
    # OUT_ROOT, keep L2 as defense-in-depth (test/prod barrier).
    _idx_include_test = True if _include_test else False
    if _include_test:
        ledger("assets.include_test", {"limit": _lim})
    return 200, _al.assets_index(
        str(_root), run=ctx.q("run"), kind=ctx.q("kind"), limit=_lim,
        include_test=_idx_include_test)


async def _h_card_tools(ctx: _Ctx) -> HandlerResult:
    import lane_disclosure as _ld
    try:
        return 200, _ld.card_tools(ctx.q("lane"))
    except _ld.LaneWireError as e:
        return 500, {"error": "lane wire refusal (card-tools): %s" % e}
    except LookupError as e:
        # the lane-scoped door: an unknown lane is a NAMED 404, never
        # the unfiltered list (the DSH lane registrar demands exactly
        # the lane's manifest — the 2026-09-06 kimodo 502 was 15
        # manifests served where 1 was demanded)
        return 404, {"error": str(e)}


async def _h_skills(ctx: _Ctx) -> HandlerResult:
    import lane_disclosure as _ld
    try:
        return 200, _ld.skill_index()
    except _ld.LaneWireError as e:
        return 500, {"error": "lane wire refusal (skills): %s" % e}


async def _h_lanes(ctx: _Ctx) -> HandlerResult:
    import lane_disclosure as _ld
    try:
        return 200, _ld.peek(ctx.q("kind"), ctx.q("genre"))
    except _ld.LaneWireError as e:
        return 500, {"error": "lane wire refusal (lanes): %s" % e}


async def _h_skill_read(ctx: _Ctx) -> HandlerResult:
    import lane_disclosure as _ld
    from urllib.parse import unquote as _uq
    try:
        return _ld.skill_read(_uq(ctx.m.group(1)), ledger)
    except _ld.LaneWireError as e:
        return 500, {"error": "lane wire refusal (skill): %s" % e}


async def _h_lane_bundle(ctx: _Ctx) -> HandlerResult:
    import lane_disclosure as _ld
    from urllib.parse import unquote as _uq
    try:
        return _ld.lane_bundle(_uq(ctx.m.group(1)), ctx.q("kind"))
    except _ld.LaneWireError as e:
        return 500, {"error": "lane wire refusal (bundle): %s" % e}


async def _h_manage(ctx: _Ctx) -> HandlerResult:
    body_json = ctx.json
    import sys as _sys
    if str(REPO / "py") not in _sys.path:
        _sys.path.insert(0, str(REPO / "py"))
    try:
        import comfy_mcp                           # noqa: F401 — the plane
        import manage as _mg                       # in-process (fast)
        return _mg.dispatch(body_json)
    except ImportError:
        pass                                       # base env below
    import subprocess as _sp
    _runner = (
        "import sys, json;"
        "sys.path.insert(0, %r);"
        "import manage;"
        "c, r = manage.dispatch(json.loads(sys.stdin.read()));"
        "print(json.dumps([c, r]))"
    ) % str(REPO / "py")
    _py = REPO / ".venv" / "bin" / "python"
    if not _py.is_file():
        return 503, {"action": body_json.get("action", "?"),
                     "ok": False,
                     "detail": "management plane unavailable: no "
                               "base-env python at %s (uv sync)" % _py}
    try:
        r = _sp.run([str(_py), "-c", _runner],
                    input=json.dumps(body_json), capture_output=True,
                    text=True, timeout=900)
        if r.returncode == 0 and r.stdout.strip():
            code, rep = json.loads(r.stdout.strip().splitlines()[-1])
            return int(code), rep
        return 502, {"action": body_json.get("action", "?"),
                     "ok": False,
                     "detail": "manage runner failed",
                     "data": {"stderr": r.stderr[-500:]}}
    except _sp.TimeoutExpired:
        return 504, {"action": body_json.get("action", "?"),
                     "ok": False,
                     "detail": "manage action timed out (900s)"}


def _expand_doc_spells(params: dict[str, JsonValue],
                       inputs: dict[str, JsonValue]
                       ) -> dict[str, JsonValue]:
    """The CARD-STAGE doc spell seam (row 4, 2026-09-07): a card=
    stage's params ARE the card doc, and a doc value may be a
    $spell naming one of the stage's WIRED INPUTS ("$prompt",
    "$image"). The arm composes the doc into a workflow — an arm
    that validates file existence (upscale's phase-1) must see the
    RESOLVED value, never the spell. Core-generic and lane-blind:
    spell → input name, resolved against the stage's input pool
    (the same names resolve_inputs publishes). Unknown $-strings
    ride untouched (prompt text is a legitimate "$100 bill" — the
    same law as _deep_expand); the arm's own guards refuse what
    stays unresolved."""
    out = dict(params)
    for k, v in params.items():
        if isinstance(v, str) and v.startswith("$"):
            name = v[1:]
            if name in inputs:
                out[k] = inputs[name]
            elif ("$" + name) in inputs:
                out[k] = inputs["$" + name]
    return out


def _card_bridge(node: NodeRow, params: dict[str, JsonValue], run_id: str,
                 inputs: dict[str, JsonValue] | None = None
                 ) -> dict[str, JsonValue]:
    """STROKE 4 (2026-09-06): compose a card= stage's DOC into engine
    params via the owning arm — the {model:} door's compose, run at
    the flow stage's turn. The bus dispatches by engine type; the
    model row rides params.model (gated non-empty at construction by
    the registry's requires_model row). A refused compose is a LOUD
    run failure with the arm's verbatim text (the construction gate
    already caught shape errors; this catches row-level ones, e.g. an
    unknown model id)."""
    import plugins as _plugins
    # ROW 4 (2026-09-06): the consensus body shape — model rides the
    # ENVELOPE (the compose arg), never inside params (the shared
    # parse_card_body leak gate refuses it there; the {model:} door
    # already speaks this shape). Arms that read the doc fallback
    # (music) still resolve — the arg wins, the doc is fallback.
    # ROW 4 (2026-09-07): doc $spells expand against the stage's
    # resolved inputs FIRST (arms with file-existence phase-1 gates
    # must see the resolved value; the two-card flow's artifact
    # handoff depends on it).
    if inputs:
        params = _expand_doc_spells(params, inputs)
    doc = dict(params)
    # expand_inject unconditionally stamps an `inject` key (the
    # legacy engine channel); a card doc never carries one — every
    # card schema forbids extras — so strip it when the NODE did
    # not declare it (run-66387f5a5e18: the empty stamp refused the
    # whole compose with a misleading extra_forbidden)
    if "inject" in doc and "inject" not in (node.params or {}):
        del doc["inject"]
    model = str(doc.pop("model", "") or "")
    graph2, _extra = _plugins.compose(
        {"params": doc}, model, run_id, None,
        [node.node_type])
    nodes = getattr(graph2, "nodes", None) or ()
    if not nodes:
        raise RuntimeError(
            "card %r (engine %r): the arm returned no graph — a card "
            "stage needs the composed workflow, never a raw doc"
            % (getattr(node, "card", ""), node.node_type))
    composed = dict(nodes[0].params or {})
    # the model row id stays visible to the engine surface (stop
    # doors + sidecar provenance) without polluting the workflow
    composed.setdefault("model", model)
    return composed


async def _h_health(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    return 200, _er.health()


async def _h_chrome(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    return 200, getattr(_er, ctx.row.attr)()


ROUTES: tuple = (
    # ── Queue & runs (INFERENCE LAW: everything through the queue) ──
    Route(method="POST", path="/v1/flows/start", group="Queue & runs",
          summary="Submit: {flow:name} or {model:id,...} + REQUIRED "
                  "draft_id (CARD BIRTH LAW: compose the card at "
                  "POST /v1/flows/drafts first) — explicit, "
                  "4xx BEFORE registration (QUEUE LANE LAW)",
          body="strict", handler=_h_flows_start),
    Route(method="POST", path="/v1/flows/validate", group="Queue & runs",
          summary="Compile an inline flow body ({flow_inline shape}) — "
                  "verbatim refusals in BATCH (error = first, errors[] "
                  "= every stage-local + workflow-pin problem, one "
                  "round-trip), no queue slot, no GPU, no sidecar",
          body="strict", handler=_h_flows_validate),
    Route(method="GET", path="/v1/queue", group="Queue & runs",
          summary="Queue snapshot (queued/running/active)", handler=_h_queue),
    Route(method="GET", path=r"^/v1/flows/status/(.+)$", regex=True,
          template="/v1/flows/status/{run_id}", group="Queue & runs",
          summary="Status + stages + artifacts + queue position "
                  "(?include_log=true adds log_tail — the run's "
                  "real-state console lines for the drilldown)",
          query=("include_log",),
          handler=_h_flows_status),
    Route(method="POST", path=r"^/v1/flows/stop/(.+)$", regex=True,
          template="/v1/flows/stop/{run_id}", group="Queue & runs",
          summary="The stop door (<6s, /interrupt, reports stopped)",
          handler=_h_flows_stop),
    Route(method="POST", path=r"^/v1/flows/resume/(.+)$", regex=True,
          template="/v1/flows/resume/{run_id}", group="Queue & runs",
          summary="Resume a failed/stopped run from its last "
                  "completed stage (R3.2; same run id, durable "
                  "result_outputs record re-seeds the carry pool)",
          handler=_h_flows_resume),
    Route(method="GET", path=r"^/v1/flows/events/(.+)$", regex=True, ws=True,
          template="/v1/flows/events/{run_id}", group="Queue & runs",
          summary="WS streaming door (path form; hijacked on Upgrade)",
          handler=_h_ws_fallback),
    Route(method="GET", path="/v1/flows/events", ws=True,
          template="/v1/flows/events?run_id={run_id}", group="Queue & runs",
          summary="WS streaming door (query form for exact-path proxies)",
          handler=_h_ws_fallback),
    Route(method="GET", path="/v1/flows/runs", group="Queue & runs",
          summary="Run history (sidecar-derived rows, click-contract)",
          handler=_h_runs_list),
    Route(method="GET", path=r"^/v1/flows/runs/(.+)$", regex=True,
          template="/v1/flows/runs/{run_id}", group="Queue & runs",
          summary="One run", handler=_h_run_detail),

    # ── Assets & ledger ──────────────────────────────────────────────
    Route(method="GET", path="/v1/assets", group="Assets & ledger",
          summary="Cross-run asset index (typed rows from disk at read "
                  "time; ?run= ?kind= ?limit= ?include_test=)",
          query=("run", "kind", "limit", "include_test"),
          handler=_h_assets_index),
    Route(method="GET", path="/v1/ledger", group="Assets & ledger",
          summary="Tail the append-only journal (?limit= ?event= prefix)",
          query=("limit", "event"), handler=_h_ledger),
    Route(method="GET", path="/v1/metrics", group="Observability",
          summary="Queue + registry observability (depth, active run, "
                  "status counts, recent wait/total timings)",
          handler=_h_metrics),
    Route(method="GET", path=r"^/v1/assets/runs/", regex=True,
          template="/v1/assets/runs/{run_id}/{file}",
          group="Assets & ledger",
          summary="Stream one artifact (the only tree the gallery "
                  "proxy may touch)", handler=_h_asset),
    Route(method="GET", path=r"^/v1/assets/inputs/", regex=True,
          template="/v1/assets/inputs/{file}",
          group="Assets & ledger",
          summary="Stream one uploaded input image (the data/input "
                  "preview door — png/jpeg/webp only, flat names; "
                  "the drilled-out card pins its source photo "
                  "through this)", handler=_h_asset_input),
    Route(method="POST", path="/v1/uploads", group="Assets & ledger",
          summary="Browser file → data/input (strict JSON {filename, "
                  "data:} — the data: URL a FileReader produces; "
                  "png/jpeg/webp ≤ 20 MB; returns the composable "
                  "repo-relative path)",
          body="strict", handler=_h_uploads),

    # ── Studios (tenant preset ledgers — stroke 3) ─────────────────
    Route(method="GET",
          path=r"^/v1/studios/([^/]+/[^/]+)/presets$", regex=True,
          template="/v1/studios/{tenant}/presets", group="Studios",
          summary="Estate + user character presets for a studio "
                  "tenant", handler=_h_presets_list),
    Route(method="POST",
          path=r"^/v1/studios/([^/]+/[^/]+)/presets$", regex=True,
          template="/v1/studios/{tenant}/presets", group="Studios",
          summary="Save a user character preset (refs verified on "
                  "disk BEFORE the row appends)",
          body="strict", handler=_h_presets_save),
    Route(method="DELETE",
          path=r"^/v1/studios/([^/]+/[^/]+)/presets/([^/]+)$",
          regex=True,
          template="/v1/studios/{tenant}/presets/{preset_id}",
          group="Studios",
          summary="Delete a USER preset (estate rows refuse — "
                  "they are code)", handler=_h_presets_delete),
    Route(method="GET",
          path=r"^/v1/studios/([^/]+/[^/]+)/base-body$", regex=True,
          template="/v1/studios/{tenant}/base-body", group="Studios",
          summary="Stream the family's declared neutral mannequin "
                  "(the studio viewport shows it while the body "
                  "slot is empty)", handler=_h_base_body),
    Route(method="GET",
          path=r"^/v1/models/([^/]+)/provisions/([^/]+)$", regex=True,
          template="/v1/models/{family}/provisions/{name}",
          group="Models & forms",
          summary="Stream a model-DECLARED provision (viewer asset): "
                  "served from the mount, or ACQUIRED on demand "
                  "through the comfy-mcp rail (sha256-verified, "
                  "landed in the weights store) when missing — "
                  "studio assets point here, never at vite-public "
                  "blobs", handler=_h_model_provision),

    # ── Lane discovery (progressive disclosure) ──────────────────────
    Route(method="GET", path="/v1/lanes", group="Lane discovery",
          summary="The lane table (peek tier; ?kind= ?genre=)",
          query=("kind", "genre"), handler=_h_lanes),
    Route(method="GET", path="/v1/kinds", group="Lane discovery",
          summary="The kind vocabulary", handler=_h_kinds),
    Route(method="GET", path="/v1/card-tools", group="Lane discovery",
          summary="Every card manifest (the lane list source); "
                  "?lane=<id> serves exactly that lane's manifest(s) "
                  "— the DSH lane-session contract (unknown lane: 404)",
          handler=_h_card_tools),
    Route(method="GET", path=r"^/v1/cards/([^/]+)/bundle$", regex=True,
          template="/v1/cards/{lane}/bundle", group="Lane discovery",
          summary="One lane bundle: tools + skills + agent doc (?kind=)",
          query=("kind",), handler=_h_lane_bundle),
    Route(method="GET", path="/v1/skills", group="Lane discovery",
          summary="The cheap skill index", handler=_h_skills),
    Route(method="GET", path=r"^/v1/skills/([^/]+)$", regex=True,
          template="/v1/skills/{id}", group="Lane discovery",
          summary="One skill body (ledgered skill.read)",
          handler=_h_skill_read),

    # ── Models & forms ───────────────────────────────────────────────
    Route(method="GET", path="/v1/model-catalog", group="Models & forms",
          summary="The catalog (families, variants, cells)",
          handler=_h_model_catalog),
    Route(method="GET", path=r"^/v1/model-catalog/(.+)$", regex=True,
          template="/v1/model-catalog/{id}", group="Models & forms",
          summary="One model's card row", handler=_h_model_one),
    Route(method="GET", path="/v1/forms", group="Models & forms",
          summary="Editor forms", handler=_h_forms),
    Route(method="GET", path="/v1/form-spec", group="Models & forms",
          summary="Form spec (?model=)", query=("model",),
          handler=_h_form_spec),
    Route(method="GET", path="/v1/loras", group="Models & forms",
          summary="A model's declared LoRA pack (?model=) — the "
                  "LorasMod rows on the class, in declaration order",
          query=("model",), handler=_h_loras),
    Route(method="*", path="/v1/flows/families/param-schemas",
          template="/v1/flows/families/param-schemas",
          group="Models & forms",
          summary="Family param schemas (all families)",
          handler=_h_family_schemas),
    Route(method="GET", path="/v1/schema", template="/v1/schema",
          group="Flows & schema",
          summary="The flow-authoring vocabulary (stroke 2): kinds, "
                  "engines, the flow_inline stage shape, doors, and "
                  "every declared flow — one payload so agents stop "
                  "reading plugin source",
          handler=_h_schema),
    Route(method="GET", path=r"^/v1/flows/families/(.+)/param-schema$",
          regex=True, template="/v1/flows/families/{family}/param-schema",
          group="Models & forms", summary="One family's param schema",
          handler=_h_family_schema_one),

    # ── Templates & drafts (the draft library the editor edits;
    # the flow.yaml template family retired 2026-09-05 — the yaml
    # format died with the parser, NO LEGACY) ──
    Route(method="GET", path="/v1/flows/drafts", group="Templates & drafts",
          summary="Draft rows (params docs; click-contract)",
          handler=_h_drafts_list),
    Route(method="POST", path="/v1/flows/drafts", group="Templates & drafts",
          summary="Save a draft", body="strict", handler=_h_drafts_save),
    # Stage-result loop (specific BEFORE the greedy :id GET — first
    # match wins; the greedy arm would swallow these paths and 400
    # "bad id", the silent-400 class the browser misfire monitor
    # caught live). PATCH persists the result outbox; GET serves the
    # run-truth verify loop. Both reconcile 200 (delivered/found
    # flags), never 404.
    Route(method="PATCH", path=r"^/v1/flows/drafts/([^/]+)/stages/([^/]+)$",
          regex=True, template="/v1/flows/drafts/{draft_id}/stages/{stage_id}",
          group="Templates & drafts", summary="Persist a stage result patch",
          body="strict", handler=_h_draft_stage_patch),
    Route(method="GET",
          path=r"^/v1/flows/drafts/([^/]+)/stages/([^/]+)/result$",
          regex=True,
          template="/v1/flows/drafts/{draft_id}/stages/{stage_id}/result",
          group="Templates & drafts", summary="One stage's persisted result",
          handler=_h_draft_stage_result),
    Route(method="GET", path=r"^/v1/flows/drafts/(.+)$", regex=True,
          template="/v1/flows/drafts/{draft_id}",
          group="Templates & drafts", summary="One draft",
          handler=_h_drafts_get),

    # ── Management (ONE door) ────────────────────────────────────────
    Route(method="POST", path="/v1/manage", group="Management",
          summary="comfy_manage actions: provision_model, install_node, "
                  "download_model, ... (comfy-mcp in-process; falls back "
                  "to base-env runner)",
          body="strict", handler=_h_manage),

    # ── Studio bridge (the /poser forward) ───────────────────────────
    Route(method="GET|POST", path=r"^/poser/", regex=True,
          template="/poser/{route}", group="Studio bridge",
          summary="Forward to the engine endpoint's poser pack (bind "
                  "mesh, identity morphs, joint reads, raster passes — "
                  "studio-plane skin math; target is the configured "
                  "engine url, never hardcoded)",
          handler=_h_poser_bridge),

    # ── Health & chrome ──────────────────────────────────────────────
    Route(method="POST", path=r"^/v1/flows/reproduce/(.+)$", regex=True,
          template="/v1/flows/reproduce/{run_id}", group="Agent plane",
          summary="R4.5: re-submit a settled run's EXACT recorded "
                  "request as a NEW run (one call; the original "
                  "record stays untouched)",
          handler=_h_flows_reproduce),
    Route(method="GET", path="/v1/agent/boot", group="Agent plane",
          summary="R4.1 boot manifest: gateway truth + health + all "
                  "discovery (lanes, card tools, skills, models, "
                  "schema) in ONE fault-isolated payload",
          handler=_h_agent_boot),
    Route(method="GET", path="/v1/health", group="Health & chrome",
          summary="Liveness", handler=_h_health),
    Route(method="GET", path="/v1/themes", group="Health & chrome",
          attr="themes",
          summary="Chrome stub (the deck expects the shape)",
          handler=_h_chrome),
    Route(method="GET", path="/v1/tags", group="Health & chrome",
          attr="tags", summary="Chrome stub (the deck expects the shape)",
          handler=_h_chrome),
    Route(method="GET", path="/v1/services", group="Health & chrome",
          attr="services",
          summary="Chrome stub (the deck expects the shape)",
          handler=_h_chrome),
    Route(method="GET", path="/v1/right-panes", group="Health & chrome",
          attr="right_panes",
          summary="Chrome stub (the deck expects the shape)",
          handler=_h_chrome),
    Route(method="GET", path="/v1/ui-slots", group="Health & chrome",
          attr="ui_slots",
          summary="DERIVED from plugin ui.yaml claims",
          handler=_h_chrome),
    Route(method="GET", path="/v1/tools", group="Health & chrome",
          attr="tools", summary="DERIVED from card classes",
          handler=_h_chrome),
    Route(method="GET", path="/v1/shell", group="Health & chrome",
          attr="shell",
          summary="Chrome stub (the deck expects the shape)",
          handler=_h_chrome),
    Route(method="GET", path="/v1/plugins", group="Health & chrome",
          attr="plugins_registry",
          summary="Chrome stub (the deck expects the shape)",
          handler=_h_chrome),
    Route(method="GET", path="/v1/models", group="Health & chrome",
          attr="models",
          summary="OpenAI-compat model list (custom format + empty "
                  "list — docs/gateway/openai-compat.md)",
          handler=_h_chrome),
)


async def route(gw: Gateway, method: str, target: str,
                body: bytes,
                headers: dict[str, str] | None = None) -> HandlerResult:
    from urllib.parse import urlparse, parse_qs
    path = target.split("?")[0].rstrip("/") or "/"
    qs = parse_qs(urlparse(target).query)
    ctx = _Ctx(gw, method, path, target, qs, body, headers=headers)
    for row in ROUTES:
        if row.method != "*" and method not in row.method.split("|"):
            continue
        if row.regex:
            m = re.match(row.path, path)
            if not m:
                continue
            ctx.m = m
        elif path != row.path:
            continue
        ctx.row = row
        if row.body == "strict":
            try:
                ctx.json = json.loads(body.decode() or "{}")
            except json.JSONDecodeError as e:
                return 400, {"error": "bad JSON: %s" % e,
                               "code": "bad_json"}
        elif row.body == "lenient":
            try:
                ctx.json = json.loads(body.decode() or "{}")
            except json.JSONDecodeError:
                ctx.json = {}
        status, payload = await row.handler(ctx)
        # R4.2 DISPATCHER NORMALIZATION (the long tail, one edit):
        # EVERY 4xx object body leaves with a code. Doors that know
        # their refusal set it explicitly (draft_required,
        # flow_compile, card_compose, run_live, ...); the rest ride
        # invalid_request — documented, honest, machine-readable.
        # error TEXT is never touched here (refusal parity).
        if 400 <= status < 500 and isinstance(payload, dict) \
                and "code" not in payload:
            payload["code"] = "invalid_request"
        return status, payload
    return 404, {"error": "no such route %s %s" % (method, path),
                   "code": "no_such_route"}


def ledger_tail(target: str) -> dict[str, list[JsonValue] | int]:
    """GET /v1/ledger?limit=N&event=prefix — tail of the append-only
    journal, oldest -> newest within the tail (C parity)."""
    from urllib.parse import urlparse, parse_qs
    q = parse_qs(urlparse(target).query)
    try:
        limit = max(1, min(500, int(q.get("limit", ["50"])[0])))
    except ValueError:
        limit = 50
    ev = (q.get("event", [""])[0] or "")[:64]
    entries, matched = [], 0
    try:
        with open(LEDGER_PATH) as f:
            for line in f:
                if ev and ('"event":"%s' % ev) not in line:
                    continue
                matched += 1
                entries.append(line.rstrip("\n"))
                if len(entries) > limit:
                    entries.pop(0)
    except OSError:
        pass
    out = []
    for e in entries:
        try:
            out.append(json.loads(e))
        except ValueError:
            continue
    return {"entries": out, "shown": len(out), "matched": matched}


def _pid_alive(pid: int) -> bool:
    """Signal-0 probe: True when the pid exists (PermissionError
    means it exists but belongs to another user — still ALIVE, the
    whole point of the guard)."""
    try:
        os.kill(pid, 0)
        return True
    except PermissionError:
        return True
    except OSError:
        return False


def acquire_lock(pid: int | None = None) -> "tuple[bool, str]":
    """R2 single-writer (2026-09-06): ONE state root, ONE gateway
    writing it. Two writers mean interleaved sidecar writes, double
    FIFO workers claiming one GPU, and ledger rows from both — the
    corruption class this lock makes unbornable. O_CREAT|O_EXCL;
    on collision the holder pid is read: alive → REFUSE loud (the
    caller exits before any boot side effect); dead or garbage →
    steal (unlink + re-acquire, ledgered server.lock_stolen — a
    crashed gateway must not wedge the estate). Design record
    docs/queue/gpu-fifo.md; wall tests/unit/runtime/test_lockfile.py."""
    pid = os.getpid() if pid is None else pid
    lock = STATE_ROOT / "gateway.lock"
    STATE_ROOT.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
        with os.fdopen(fd, "w") as f:
            f.write(str(pid))
        return True, "acquired"
    except FileExistsError:
        pass
    holder = ""
    try:
        holder = lock.read_text().strip()
    except OSError:
        pass
    try:
        hpid = int(holder)
    except ValueError:
        hpid = -1
    if hpid > 0 and _pid_alive(hpid):
        return False, "gateway.lock held by live pid %d" % hpid
    try:
        lock.unlink()
    except OSError:
        pass
    ledger("server.lock_stolen", {"stale_pid": hpid})
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
        with os.fdopen(fd, "w") as f:
            f.write(str(pid))
        return True, "stolen from dead pid %d" % hpid
    except OSError as e:
        return False, "lock steal failed: %s" % e


def release_lock(pid: int | None = None) -> None:
    """Clean shutdown releases the single-writer lock — the next
    boot acquires first-try instead of stealing (SIGKILL still
    leaves the dead-pid steal path, documented above). PID-CHECKED:
    a bind-failed boot (port already owned) must release only ITS
    OWN lock, never the live daemon's — the watcher-spawn storm on
    a taken port taught this the hard way (a blind unlink freed
    the next spawn to steal + boot-sweep live runs)."""
    pid = os.getpid() if pid is None else pid
    lock = STATE_ROOT / "gateway.lock"
    try:
        if lock.read_text().strip() != str(pid):
            return   # not ours — leave the real holder alone
    except OSError:
        return
    try:
        lock.unlink()
    except OSError:
        pass


async def main(port: int) -> None:
    # R2 single-writer: acquire BEFORE any boot side effect (no
    # resurrection, no sweep, no worker) — a second gateway exits
    # here, loud, having touched nothing.
    locked, note = acquire_lock()
    if not locked:
        sys.stderr.write(
            "[gateway] REFUSING TO START: %s — one writer per state "
            "root\n" % note)
        raise SystemExit(1)
    gw = Gateway()
    # R3 durable queue: queued work RESURRECTS first (same run ids,
    # FIFO order); the sweep then settles what is genuinely dead —
    # crashed-mid-run sidecars and queued orphans (no draft doc).
    resurrected = boot_resurrect(gw)
    swept = boot_sweep(live_run_ids=tuple(gw.runs.keys()))
    ledger("server.boot", {"port": port, "swept": swept,
                           "resurrected": resurrected,
                           "engine": "python-orchestrator"})

    # Starlette lifespan: startup boots the worker, shutdown marks
    # active runs stopped and exits (RESILIENCE LAW).
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def _lifespan(application: Starlette) -> AsyncIterator[None]:
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            try:
                loop.add_signal_handler(
                    sig, lambda s=sig: asyncio.ensure_future(gw.shutdown()))
            except NotImplementedError:
                pass
        asyncio.create_task(gw.worker())
        yield
        release_lock()   # clean shutdown: the lock dies with the server

    # Build starlette routes:
    # - one catch-all HTTP route → _adapt (matches against ROUTES table)
    # - two WebSocketRoutes for the events door (path + query forms)
    app = Starlette(
        lifespan=_lifespan,
        routes=[
            WSRoute("/v1/flows/events/{run_id:path}", _ws_starlette),
            WSRoute("/v1/flows/events", _ws_starlette),
            StarRoute("/{path:path}", _adapt,
                      methods=["GET", "POST", "DELETE", "PUT",
                               "PATCH", "OPTIONS", "HEAD"]),
        ],
    )
    app.state.gw = gw

    import uvicorn
    config = uvicorn.Config(app, host="127.0.0.1", port=port,
                            log_level="info")
    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 18201))
