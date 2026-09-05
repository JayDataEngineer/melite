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
ARCHITECTURE LAW): plugins/<id>/engines/<dir>/engine.yaml declares the
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
import time
import uuid
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
STATE_ROOT = REPO / "data" / "runs"
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
    from flow_graph import FlowGraph, FlowNode
    from melite_models import CharacterPreset, Model

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
    """Loud 4xx before any run is registered (QUEUE LANE LAW)."""





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
            # never as a node traceback after a GPU claim.
            fl.validate_initial(body)
            return fl.to_graph()
        except flow_mod.FlowError as e:
            raise ValidationError(str(e))
    if "flow_inline" in body:
        import flow as flow_mod
        try:
            fl = flow_mod.flow_from_body(body["flow_inline"])
            fl.validate_initial(body)
            return fl.to_graph()
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
    the arms' flat-form branch is retired with it."""
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


def _find_card_requires(mid: str, plugins_dir: str | None = None) -> list[str]:
    """Resolve model id -> the owning CARD's requires list (or []).

    (2026-09-02, the identity rung) Fully class-driven: the model class
    names the card (`card` attr), the CARD class carries `requires`
    (tuple of engine extension ids, declared on the ActionCard).
    card.yaml is extinct; requires rides the class.
    """
    if plugins_dir is None:
        plugins_dir = REPO / "plugins"
    import sys as _sys
    # Cards + models DSL now live in py/ (gateway infra, not plugins/).
    py_dir = str(REPO / "py")
    if py_dir not in _sys.path:
        _sys.path.insert(0, py_dir)
    try:
        from melite_models import load_model_py
        from melite_cards import load_card_py
    except ImportError:
        return []
    card_id = None
    for engine_dir in sorted(plugins_dir.glob("engines/*")):
        for mpy in sorted(engine_dir.glob("models/*/*/model.py")):
            if mpy.parent.name != mid:
                continue
            try:
                cls = load_model_py(str(mpy), engine_dir.name)
            except Exception:
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
    for cpy in sorted(
        list(plugins_dir.glob("engines/*/cards/*/card.py"))
        + list(plugins_dir.glob("engines/*/action_cards/*/card.py"))
        + list(plugins_dir.glob("engines/*/action_cards/*/*/card.py"))):
        try:
            # depth-1 card dir → engine 3 hops up; genre-grouped
            # (action_cards/<genre>/<card>/) → 4 (2026-09-02 reorg)
            pdir = cpy.parent
            engine = (pdir.parent.parent.name
                      if pdir.parent.name in ("cards", "action_cards")
                      else pdir.parent.parent.parent.name)
            cls = load_card_py(str(cpy), engine)
        except Exception:
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
        return reqs
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
            ok, msg = check_card_requires(requires, custom_nodes_dir=custom_nodes_dir)
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
        raise ValidationError("card_compose phase 1: %s" % e)
    return skeleton, etype, extra


def _route_family(mid: str, body: dict[str, JsonValue]) -> str:
    """The model id the card arm addresses: mid itself, or mid's
    owning family when mid names a variant route."""
    cls = _route_owner(mid)
    return cls.id if cls is not None else mid


def _route_owner(mid: str):
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


def _card_field_names(model_cls) -> set[str] | None:
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
    plugins_dir = REPO / "plugins"
    for cpy in sorted(
        list(plugins_dir.glob("engines/*/action_cards/*/py/card.py"))
            + list(plugins_dir.glob("engines/*/action_cards/*/*/py/card.py"))
            + list(plugins_dir.glob("engines/*/action_cards/*/card.py"))
            + list(plugins_dir.glob("engines/*/action_cards/*/*/card.py"))):
        pdir = cpy.parent
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
    for ref in node.input_from:
        if not ref.startswith("__initial__."):
            if ref in initial:
                out[ref] = initial[ref]
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
                out[tensor] = params[alt]
                continue
            if alt in initial:
                out[tensor] = initial[alt]
                continue
            raise ValidationError("node %r: __initial__.%s not provided in request" % (node.node_id, tensor))
        out[tensor] = initial[tensor]
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
    fast); subprocess engines (anycreature, autoremesher, kimodo)
    unload by process exit and simply do not export unload().

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
    # CARD LINKAGE (the run→card wire, 2026-09-04 audit): the sidecar
    # MUST carry the draft_id the start body declared so /v1/flows/runs
    # can answer "what card produced this" without round-tripping the
    # drafts door. None for runs started bare (cardless test fixtures,
    # direct API hits). Validated by draft_id_ok() at submit() — 96
    # char cap, [A-Za-z0-9_-] — the same SSOT the drafts door uses.
    # docs/queue/run-registry.md:41 / docs/queue/sidecar.md:36.
    draft_id: str | None = None

    @property
    def dir(self) -> Path:
        return (self.out_root or OUT_ROOT) / self.run_id


class Gateway:
    def __init__(self) -> None:
        self.runs = {}
        self.order = []
        self.active = None
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
        q = asyncio.Queue()
        self.subscribers.setdefault(run_id, set()).add(q)
        return q

    def unsubscribe(self, run_id: str, q: asyncio.Queue[dict[str, JsonValue]]) -> None:
        subs = self.subscribers.get(run_id)
        if subs is not None:
            subs.discard(q)
            if not subs:
                self.subscribers.pop(run_id, None)

    def publish(self, run_id: str, event: dict[str, JsonValue]) -> None:
        for q in list(self.subscribers.get(run_id, ())):
            try:
                q.put_nowait(event)
            except Exception:
                pass

    async def submit(self, body: dict[str, JsonValue]) -> Run:
        # body shape FIRST (RESILIENCE LAW + QUEUE LANE LAW): a
        # non-object body 4xxes here — resolve_request owns the same
        # guard for its own callers, but the test-flag read below
        # touches body before it runs. 4xx BEFORE any run registers.
        if not isinstance(body, dict):
            raise ValidationError("request body must be a JSON object")
        # the test flag routes the run dir (L3) and stamps the sidecar
        # (L1) — duck-typed truthiness here would let "false" (a
        # STRING) route a production run into the test root and lie
        # in the ledger. A flag is a BOOLEAN, refused 4xx BEFORE any
        # run registers (QUEUE LANE LAW).
        test_flag = body.get("test", False)
        if not isinstance(test_flag, bool):
            raise ValidationError(
                "test flag must be a boolean (got %s %r)"
                % (type(test_flag).__name__, test_flag))
        resolved = resolve_request(body)
        run_id = "run-%s-%08x" % (uuid.uuid4().hex[:12], int(time.time() * 1000) & 0xFFFFFFFF)
        # CARD LINKAGE (the run→card wire, 2026-09-04 audit): validate
        # the body's draft_id at the registration door — the same
        # draft_id_ok() the drafts door uses, so a bad wire never
        # registers. None for runs that didn't come from a card.
        # docs/queue/run-registry.md:41 / docs/cards/draft-door.md.
        body_draft_id = body.get("draft_id")
        if body_draft_id is not None:
            if not isinstance(body_draft_id, str):
                raise ValidationError("draft_id must be a string")
            if body_draft_id != "" and not draft_id_ok(body_draft_id):
                raise ValidationError(
                    "draft_id malformed (96 char cap, [A-Za-z0-9_-] only): %r"
                    % body_draft_id)
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
                    graph, extra2 = card_hooks.compose(
                        card_compose_body(body), resolved["name"],
                        run_id, graph, [etype])
                    for k, v in (extra2 or {}).items():
                        card_extra_inputs.setdefault(k, v)
                except Exception as e:
                    raise ValidationError("card_compose phase 2: %s" % e)
            import flow_graph as _pg
            if not (isinstance(graph, _pg.FlowGraph) and graph.nodes):
                raise ValidationError(
                    "card_compose produced an empty graph for %s" % resolved["name"])
        else:
            graph = resolved
        run = Run(run_id=run_id, graph=graph, request=body,
                  # normalize "" → None for the sidecar: a declared-but-
                  # empty draft_id is indistinguishable from "not given"
                  # and the click-contract gate would strip it anyway
                  # (py/editor_runs.py:480, 2026-09-02 law).
                  draft_id=body_draft_id if body_draft_id else None)
        run.card_extra_inputs = card_extra_inputs if is_card else {}
        # L3: route the run dir to the test root when the caller
        # declared test:true. The sidecar test flag is the SAME data
        # (L1) -- this is the directory-level enforcement.
        run.out_root = TEST_OUT_ROOT if test_flag else OUT_ROOT
        run.dir.mkdir(parents=True, exist_ok=True)
        atomic_write(run.dir / "_request.json", body)
        run.stages = [
            {"id": n.node_id, "name": n.node_id, "index": i,
             "status": "pending",
             # the flow-typed-edges contract (docs/queue/flow-typed-edges.md):
             # stamp the typed outputs into the sidecar so MCP
             # introspection and editor graph views see the chain past
             # construction. Empty when the stage omitted outputs and
             # its engine's DEFAULT_OUTPUT was unknown at load.
             "outputs": dict(n.outputs or {})}
            for i, n in enumerate(graph.nodes)
        ]
        self.runs[run_id] = run
        self.order.append(run_id)
        sidecar(run)
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
            sidecar(run)
            try:
                await self.execute(run)
                run.status = "stopped" if run.stop_event.is_set() else "completed"
            except Exception as e:
                run.status = "stopped" if run.stop_event.is_set() else "failed"
                run.error = "%s: %s" % (type(e).__name__, e)
            finally:
                sidecar(run)
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
                self.active = None

    async def execute(self, run: Run) -> None:
        initial = initial_pool(run.request)
        # phase-1 card inputs ("inputs": {...}) land in the tensor pool
        ci = getattr(run, "card_extra_inputs", {}) or {}
        nested = ci.get("inputs") if isinstance(ci.get("inputs"), dict) else ci
        for k, v in (nested or {}).items():
            initial.setdefault(k, v)
        initial.setdefault("prompt", "")
        carry = {}
        for stage in run.stages:
            if run.stop_event.is_set():
                stage["status"] = "stopped"
                sidecar(run)
                return
            node = run.graph.nodes[stage["index"]]
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
                    sidecar(run)
            self.last_engine_type = node.node_type
            stage["status"] = "running"
            sidecar(run)
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
                params = expand_inject(node.params, inputs)
                engine = load_engine(node.node_type)
                # the engine ABI row: a VALIDATED NodeRow carrying the
                # inject-expanded params (construction refuses a bad row)
                import flow_graph as _pg
                result = await engine.execute(
                    _pg.NodeRow(node_id=node.node_id,
                                node_type=node.node_type, params=params),
                    str(run.dir), inputs, run.stop_event, report=_report,
                )
                if result and result.get("error"):
                    # ENGINE ABI: compose-first engines return their
                    # refusal as an error DICT (never raise). The rim
                    # honors it — a documented failure, never a silent
                    # empty completion (RESILIENCE LAW).
                    err_text = str(result["error"])
                    # a deliberate STOP is its own class: the engine
                    # answers {"error": "stopped"} when the stop door
                    # fired, never a failure (RESILIENCE LAW: a stop
                    # lands in <6s and reports 'stopped' — never
                    # 'error'). Gate on the stop_event being set so a
                    # spurious "stopped" in a normal failure still
                    # raises.
                    if run.stop_event.is_set() and "stop" in \
                            err_text.lower():
                        stage["status"] = "stopped"
                        stage["error"] = err_text
                        self.publish(run.run_id, {
                            "type": "stage",
                            "stage": stage["id"],
                            "index": stage["index"],
                            "status": "stopped",
                            "error": err_text})
                        break
                    raise ValidationError(
                        "engine %s: %s" % (
                            node.node_type, err_text))
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
                    stage_arts = [os.path.basename(str(a))
                                  for a in result.get("artifacts", []) if a]
                    if stage_arts:
                        base = ASSET_URL_PREFIX + "/%s/" % run.run_id
                        stage["url"] = base + stage_arts[0]
                        stage["gallery"] = [
                            {"url": base + n, "name": n} for n in stage_arts]
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
            sidecar(run)

    async def stop(self, run_id: str) -> dict[str, str]:
        run = self.runs.get(run_id)
        if run is None:
            raise ValidationError("unknown run_id %r" % run_id)
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
                    engine = load_engine(n["type"])
                    if hasattr(engine, "stop"):
                        try:
                            await engine.stop({"params": n.get("params", {})}, str(run.dir))
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
                sidecar(run)
                self.active = None
        ledger("server.stop", {"reason": "signal"})
        os._exit(0)


def sidecar(run: Run) -> None:
    # L1 of the test/prod barrier: the test flag rides from the start
    # body into the run's request dict and onto the sidecar. scan_run
    # reads it from here; assets_index (L2) uses it to keep test runs
    # out of the production view.
    # CARD LINKAGE (the run→card wire, 2026-09-04 audit): the sidecar
    # MUST persist draft_id (validated at submit()) so /v1/flows/runs
    # can answer "what card produced this" without round-tripping the
    # drafts door. None for cardless test runs and bare API hits —
    # py/editor_runs.py:480 strips empty/missing anyway (click-
    # contract law, 2026-09-02). docs/queue/sidecar.md:36.
    # the door name (QUEUE LANE LAW: exactly one of flow | flow_inline |
    # model — resolved BEFORE registration, so exactly one of these is
    # ever truthy). The runs-list scan (py/editor_runs.py) lifts it
    # into the row's name/flow; the editor's run-title fallback reads
    # r.name. The C-era sidecar carried "model" — a key the py writer
    # NEVER wrote, so every py run served blank names until 2026-09-05
    # (0 of 550 on-disk sidecars carry "model"; nothing reads it).
    inline = run.request.get("flow_inline")
    pipeline = (run.request.get("flow")
                or run.request.get("model")
                or (inline.get("id", "")
                    if isinstance(inline, dict) else ""))
    atomic_write(run.dir / "_flow.json", {
        "run_id": run.run_id,
        "status": run.status,
        "error": json.dumps(run.error)[:20000] if run.error else "",
        "stages": run.stages,
        "artifacts": run.artifacts,
        "created_at": run.created_at,
        "test": run.request.get("test", False),
        "draft_id": run.draft_id,
        "pipeline": pipeline,
    })


# ---------------------------------------------------------------------------
# RESILIENCE LAW (operator order 2026-08-29) — ported from the C server's
# post-audit hardening: a deliberate shutdown manufactures ZERO zombies,
# kill -9 leftovers are swept to failed at boot AND at first read, and the
# ledger journal records every sweep (parity with boot_sweep_stale_sidecars
# / read-time sweep / ledger_log in src/server.cpp, retired 2026-09-02).
# ---------------------------------------------------------------------------

LEDGER_PATH = OUT_ROOT / "_ledger.jsonl"


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


def sweep_sidecar(path: Path, why: str) -> bool:
    """Patch a stale sidecar: every running/queued status (top-level AND
    per-stage) becomes failed, with the reason recorded in a "sweep" key.
    Idempotent — an already-swept file has no active statuses left."""
    try:
        obj = json.loads(Path(path).read_text())
    except (OSError, ValueError):
        return False
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
    obj["sweep"] = why
    atomic_write(Path(path), obj)
    return True


def boot_sweep() -> int:
    """Boot-time zombie sweep: every sidecar still claiming running/queued
    belongs to a DEAD process (we just started — nothing is live yet).
    Sweep BEFORE the gateway accepts traffic, so the ledger never shows
    phantom active runs after a crash/restart."""
    swept = 0
    if not OUT_ROOT.is_dir():
        return 0
    for d in sorted(OUT_ROOT.iterdir()):
        if not d.is_dir() or not d.name.startswith("run-"):
            continue
        if sweep_sidecar(
                d / "_flow.json",
                "gateway restarted (boot sweep): stale active sidecar "
                "from a dead process"):
            ledger("run.swept", {"run_id": d.name, "state": "failed",
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
        sweep_sidecar(
            path, "read-time sweep: stale running sidecar, "
            "no live registry entry")
        ledger("run.swept", {"run_id": run_id, "state": "failed",
                             "error": "zombie swept at read time"})
        obj["status"] = "failed"
        obj["error"] = "zombie swept at read time"
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
    await websocket.accept()
    gw = websocket.app.state.gw

    # Parse run_id: path form (/events/<id>) or query form (?run_id=<id>)
    run_id = websocket.path_params.get("run_id", "")
    if not run_id:
        from urllib.parse import parse_qs as _pq, urlparse as _up
        qs = _pq(_up(str(websocket.url)).query)
        run_id = (qs.get("run_id") or qs.get("id") or [""])[0]
        path = websocket.url.path.rstrip("/")
        if not run_id or path != "/v1/flows/events":
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
        # hydrate: the snapshot BEFORE the subscription would race
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
    try:
        status, payload = await route(gw, request.method, target, body)
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
                 "m", "row")

    def __init__(self, gw: Gateway, method: str, path: str, target: str,
                 qs: dict[str, list[str]], body: bytes) -> None:
        self.gw = gw
        self.method = method
        self.path = path
        self.target = target
        self.qs = qs
        self.body = body
        self.json = None
        self.m = None
        self.row = None

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
        return 400, {"error": str(e)}
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
            return 400, {"error": str(e)}
        return 200, {"ok": True, "model": str(body["model"]),
                     "card": True}
    import flow as flow_mod
    try:
        fl = flow_mod.flow_from_body(ctx.json)
    except flow_mod.FlowError as e:
        return 400, {"error": str(e)}
    graph = fl.to_graph()
    return 200, {
        "ok": True,
        "flow": fl.id,
        "stages": [
            {"id": n.node_id, "engine": n.node_type,
             "description": n.description,
             "inputs": list(n.input_from),
             "outputs": dict(n.outputs)}
            for n in graph.nodes],
    }


async def _h_queue(ctx: _Ctx) -> HandlerResult:
    gw = ctx.gw
    return 200, {
        "queued": len(gw.order),
        "running": 1 if gw.active else 0,
        "active": gw.active.run_id if gw.active else "",
        "queued_ids": list(gw.order),
    }


async def _h_flows_status(ctx: _Ctx) -> HandlerResult:
    rid = ctx.m.group(1)
    run = ctx.gw.runs.get(rid)
    if run is None:
        stored = sidecar_status(rid)
        if stored is None:
            return 404, {"error": "unknown run_id"}
        return 200, stored
    return 200, {
        "run_id": run.run_id,
        "status": run.status,
        "stages": run.stages,
        "artifacts": run.artifacts,
        "error": run.error,
        "queue_position": (ctx.gw.order.index(run.run_id)
                           if run.run_id in ctx.gw.order else 0),
    }


async def _h_flows_stop(ctx: _Ctx) -> HandlerResult:
    try:
        return 200, await ctx.gw.stop(ctx.m.group(1))
    except ValidationError as e:
        return 400, {"error": str(e)}


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
    return 200, _er.runs(str(STATE_ROOT), limit=limit)


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
        _er.catalog_family_ids(str(REPO / "plugins")))


async def _h_family_schema_one(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    return _er.family_param_schema(
        _er.catalog_family_ids(str(REPO / "plugins")), ctx.m.group(1))


async def _h_drafts_list(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    return 200, _er.drafts_list(str(STATE_ROOT / "drafts"))


async def _h_drafts_save(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    return _er.drafts_save(str(STATE_ROOT / "drafts"), ctx.json)


async def _h_drafts_get(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    return _er.drafts_get(str(STATE_ROOT / "drafts"), ctx.m.group(1))


async def _h_asset(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    rel = ctx.path[len(ASSET_URL_PREFIX + "/"):]
    code, data, ctype = _er.serve_asset(str(STATE_ROOT), rel)
    if code == 200:
        return code, ({}, {"content-type": ctype}, data)
    return code, {"error": "not found"} if code == 404 else data


async def _h_ledger(ctx: _Ctx) -> HandlerResult:
    return 200, ledger_tail(ctx.target)


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


async def _h_base_body(ctx: _Ctx) -> HandlerResult:
    """Stream the family's declared neutral mannequin (2026-09-06):
    the studio viewport shows it while the body slot is empty
    (display-only — it never writes params). GENERIC: the Model's
    base_body names the provision; the mount path derives the same
    way compose resolves it (endpoint file + model_paths read_root
    + the provision's folder). Loud 404s: unknown tenant, no
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
    engine = getattr(cls, "engine", "") or ""
    if not engine:  # QUEUE LANE LAW: no default engine names — the
        # family declares its engine (anny: engine = 'comfyui' in the
        # plugin, where lane knowledge belongs); a family without one
        # refuses here, never a hardcoded core fallback.
        return 500, {"error": "family %r declares no engine"
                     % (getattr(cls, "id", tenant),)}
    ep_path = REPO / "plugins" / "engines" / engine / "data" / (
        engine + "_endpoint.json") if engine else None
    try:
        ep = json.loads(ep_path.read_text(encoding="utf-8")) \
            if ep_path is not None else {}
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
        return 200, _ld.card_tools()
    except _ld.LaneWireError as e:
        return 500, {"error": "lane wire refusal (card-tools): %s" % e}


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


async def _h_health(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    return 200, _er.health()


async def _h_chrome(ctx: _Ctx) -> HandlerResult:
    import editor_runs as _er
    return 200, getattr(_er, ctx.row.attr)()


ROUTES: tuple = (
    # ── Queue & runs (INFERENCE LAW: everything through the queue) ──
    Route(method="POST", path="/v1/flows/start", group="Queue & runs",
          summary="Submit: {flow:name} or {model:id,...} — explicit, "
                  "4xx BEFORE registration (QUEUE LANE LAW)",
          body="strict", handler=_h_flows_start),
    Route(method="POST", path="/v1/flows/validate", group="Queue & runs",
          summary="Compile an inline flow body ({flow_inline shape}) — "
                  "verbatim refusals, no queue slot, no GPU, no "
                  "sidecar (the AI feedback loop)",
          body="strict", handler=_h_flows_validate),
    Route(method="GET", path="/v1/queue", group="Queue & runs",
          summary="Queue snapshot (queued/running/active)", handler=_h_queue),
    Route(method="GET", path=r"^/v1/flows/status/(.+)$", regex=True,
          template="/v1/flows/status/{run_id}", group="Queue & runs",
          summary="Status + stages + artifacts + queue position",
          handler=_h_flows_status),
    Route(method="POST", path=r"^/v1/flows/stop/(.+)$", regex=True,
          template="/v1/flows/stop/{run_id}", group="Queue & runs",
          summary="The stop door (<6s, /interrupt, reports stopped)",
          handler=_h_flows_stop),
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
    Route(method="GET", path=r"^/v1/assets/runs/", regex=True,
          template="/v1/assets/runs/{run_id}/{file}",
          group="Assets & ledger",
          summary="Stream one artifact (the only tree the gallery "
                  "proxy may touch)", handler=_h_asset),
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

    # ── Lane discovery (progressive disclosure) ──────────────────────
    Route(method="GET", path="/v1/lanes", group="Lane discovery",
          summary="The lane table (peek tier; ?kind= ?genre=)",
          query=("kind", "genre"), handler=_h_lanes),
    Route(method="GET", path="/v1/kinds", group="Lane discovery",
          summary="The kind vocabulary", handler=_h_kinds),
    Route(method="GET", path="/v1/card-tools", group="Lane discovery",
          summary="Every card manifest (the lane list source)",
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
                body: bytes) -> HandlerResult:
    from urllib.parse import urlparse, parse_qs
    path = target.split("?")[0].rstrip("/") or "/"
    qs = parse_qs(urlparse(target).query)
    ctx = _Ctx(gw, method, path, target, qs, body)
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
                return 400, {"error": "bad JSON: %s" % e}
        elif row.body == "lenient":
            try:
                ctx.json = json.loads(body.decode() or "{}")
            except json.JSONDecodeError:
                ctx.json = {}
        return await row.handler(ctx)
    return 404, {"error": "no such route %s %s" % (method, path)}


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


async def main(port: int) -> None:
    gw = Gateway()
    swept = boot_sweep()
    ledger("server.boot", {"port": port, "swept": swept,
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
