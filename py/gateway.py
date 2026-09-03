#!/usr/bin/env python3
"""The Python gateway — Phase 3 of the everything-is-ComfyUI consolidation.

One file, stdlib only. Replaces the C/C++ server (src/server.cpp and kin)
with the same queue contract the estate already speaks:

  POST /v1/pipelines/start
  GET  /v1/pipelines/status/RUN_ID
  POST /v1/pipelines/stop/RUN_ID
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
_pipeline.json (atomic tmp+rename), engine artifacts beside them.

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
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parent.parent
# SERVER-STATE ROOT LAW (operator order, 2026-09-03: "build was
# c++ and c era"): ALL runtime state lives under the data root's
# runs/ stream — run dirs, drafts, ledgers. build/ was the
# C++ CMake dir the C server happened to cwd into; it is GONE.
# (One hop runs/output: editor_runs' server_root contract appends
# "output"; flattening it waits for that file to leave flight.)
STATE_ROOT = REPO / "data" / "runs"
OUT_ROOT = STATE_ROOT / "output"
PIPELINES = REPO / "pipelines"

IDENT_RE = re.compile(r"^[a-z_][a-z0-9_-]*$")


class ValidationError(Exception):
    """Loud 4xx before any run is registered (QUEUE LANE LAW)."""


def parse_params_scalar(line_value):
    """params is a ONE-LINE JSON scalar (mirrors parse_kv: remainder of line)."""
    line_value = line_value.strip()
    if not line_value:
        return {}
    try:
        val = json.loads(line_value)
    except json.JSONDecodeError as e:
        raise ValidationError("node params is not valid JSON: %s" % e)
    if not isinstance(val, dict):
        raise ValidationError("node params must be a JSON object")
    return val


def parse_pipeline_text(text):
    """Parse the pipeline mini-YAML the estate uses (nodes/input_from/params).

    A constrained YAML subset — the dialect the estate's pipeline files
    speak (inherited from the C dag parser at C retirement, 2026-09-03;
    the parity goldens pin it). There is no other gateway.
    """
    nodes = []
    meta = {}
    current = None
    in_params = False
    pending_list = None
    pending_map = None
    for lineno, raw in enumerate(text.splitlines(), 1):
        line = raw.rstrip()
        if not line.strip() or line.strip().startswith("#"):
            continue
        if not line.startswith((" ", "\t")):
            current = None
            in_params = False
            top = line.rstrip(":").strip()
            if top == "nodes":
                continue
            if ":" in line:
                k, _, v = line.partition(":")
                meta[k.strip()] = v.strip()
            continue
        stripped = line.strip()
        if current is not None and stripped.startswith("- ") and pending_list:
            item = stripped[2:].strip()
            current[pending_list].append(item)
            continue
        if stripped.startswith("- id:") or stripped.startswith("-id:"):
            pending_list = None
            pending_map = None
            current = {"id": stripped.split(":", 1)[1].strip(), "type": "", "input_from": [], "params": {}}
            nodes.append(current)
            in_params = False
            continue
        if current is None:
            if ":" in stripped:
                k, _, v = stripped.partition(":")
                meta[k.strip()] = v.strip().strip('"').strip("'")
            continue
        key, _, rest = stripped.partition(":")
        key = key.strip()
        # a recognized key line ENDS any pending bullet list (else the
        # next node's "- id:" gets swallowed as a list item)
        if key in ("id", "type", "model", "description", "input_from", "params", "plugin", "optional"):
            pending_list = None
        if key == "params":
            inline = rest.strip()
            if inline:
                current["params"] = parse_params_scalar(inline)
            else:
                current["params"] = {}
                pending_map = "params"
            in_params = True
            continue
        NODE_KEYS = ("id", "type", "model", "description", "input_from", "params", "plugin", "optional")
        if pending_map == "params" and current is not None and not stripped.startswith("- ") and key not in NODE_KEYS and ":" in stripped:
            pk, _, pv = stripped.partition(":")
            if pk and pv.strip() and ":" in stripped:
                try:
                    current["params"][pk.strip()] = json.loads(pv.strip())
                except json.JSONDecodeError:
                    current["params"][pk.strip()] = pv.strip().strip('"').strip("'")
                continue
        if key in ("id", "type", "model", "description"):
            current[key] = rest.strip()
            in_params = False
            continue
        if key == "input_from":
            inline = rest.strip()
            if inline:
                refs = [r.strip() for r in inline.strip("[]").split(",") if r.strip()]
                current["input_from"] = refs
                pending_list = None
            else:
                pending_list = "input_from"
            in_params = False
            continue
        if pending_list and key not in ("",):
            pending_list = None
        if in_params:
            raise ValidationError(
                "line %d: params must be a one-line JSON value (got continuation %r)" % (lineno, stripped)
            )
    seen = set()
    for n in nodes:
        if not IDENT_RE.match(n["id"]):
            raise ValidationError("node id %r is not a legal identifier" % n["id"])
        if not n.get("type"):
            raise ValidationError("node %r has no type" % n["id"])
        if n["id"] in seen:
            raise ValidationError("duplicate node id %r" % n["id"])
        seen.add(n["id"])
    return {"meta": meta, "nodes": nodes}


def resolve_request(body):
    """Resolve the start request to a pipeline graph — loudly."""
    if not isinstance(body, dict):
        raise ValidationError("request body must be a JSON object")
    if "yaml" in body:
        name = str(body["yaml"])
        if not IDENT_RE.match(name):
            raise ValidationError("yaml pipeline name %r is not a legal identifier" % name)
        path = PIPELINES / name / "pipeline.yaml"
        if not path.is_file():
            raise ValidationError("no pipeline yaml at pipelines/%s/pipeline.yaml" % name)
        text = path.read_text()
        graph0 = parse_pipeline_text(text)
        types0 = [n["type"] for n in graph0["nodes"]]
        if card_hooks is not None:
            # PLUGIN ARCHITECTURE LAW: card semantics live in the plugin
            # hooks, not here. Phase 1 (dry run) validates + extra inputs;
            # dispatch by engine type, exactly like the C server.
            try:
                text, extra = card_hooks.compose(body, name, "", text, types0)
            except Exception as e:
                raise ValidationError("card_compose phase 1: %s" % e)
            body = dict(body, **extra)
            if extra:
                text = text  # extra inputs merge into the request, not the graph
            if text != path.read_text():
                return parse_pipeline_text(text)
        return graph0
    if "model" in body:
        mid = str(body["model"])
        path = PIPELINES / mid / "pipeline.yaml"
        if path.is_file():
            return parse_pipeline_text(path.read_text())
        # card-only model: the plugin hook composes the graph (phase 2)
        skeleton, etype, extra = resolve_card_model(body, mid)
        return {"__card__": True, "skeleton": skeleton,
                "etype": etype, "extra": extra, "name": mid}
    raise ValidationError("no pipeline selected: provide yaml or model")


# (_find_model_yaml/_engine_type_of retired 2026-09-02: the nondeterministic
# first-glob-hit model resolution moved to py/plugins.py — declarer-wins,
# sorted, LOUD refusals. The C glob-order bug dies here.)


def _find_card_requires(mid, plugins_dir=None):
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
        return list(getattr(cls, "requires", ()) or [])
    return []


def resolve_card_model(body, mid):
    """{model} arm for card-only models (no pipeline.yaml on disk).

    Mirrors the C card path: seed a minimal skeleton carrying the engine
    type, let the OWNING plugin's hook generate the real graph (phase 2
    at run registration; phase 1 here for validation + extra inputs).
    Model resolution is DETERMINISTIC (py/plugins.py): all copies of the
    model's model.yaml, engine-stanza declarers win, first in sorted
    plugin order owns it; no declarer = LOUD refusal.
    Returns (skeleton_text, etype, extra) or raises loudly.
    """
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
    skeleton = "name: %s\ntype: %s\ndescription: card-composed\n\nnodes:\n" % (mid, etype)
    try:
        _, extra = card_hooks.compose(body, mid, "", skeleton, [etype])
    except Exception as e:
        raise ValidationError("card_compose phase 1: %s" % e)
    return skeleton, etype, extra


def resolve_inputs(node, initial):
    """Explicit wiring only: input_from entries like __initial__.PROMPT."""
    out = {}
    for ref in node.get("input_from", []):
        if not ref.startswith("__initial__."):
            if ref in initial:
                out[ref] = initial[ref]
                continue
            raise ValidationError(
                "node %r: input_from ref %r unresolved (neither __initial__ nor a prior node output)"
                % (node["id"], ref),
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
            raise ValidationError("node %r: __initial__.%s not provided in request" % (node["id"], tensor))
        out[tensor] = initial[tensor]
    return out


def _deep_expand(value, inputs):
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


def expand_inject(params, inputs):
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
    def compose(body, name, run_id, text, types0):
        if _plugin_bus is None:
            return text, {}
        return _plugin_bus.compose(body, name, run_id, text, types0)


card_hooks = _ComposeBridge()

_engine_cache = {}


def _plugin_loud(fn, *a, **kw):
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


def load_engine(engine_type):
    """The owning plugin's engine module (plugins.py resolves the
    plugin dir from engine.yaml declarations) — LOUD when absent."""
    if _plugin_bus is None:
        raise ValidationError("plugin bus unavailable (py/plugins.py)")
    return _plugin_loud(_plugin_bus.load_engine, engine_type)


@dataclass
class Run:
    run_id: str
    graph: dict
    request: dict
    status: str = "queued"
    error: str = ""
    stages: list = field(default_factory=list)
    artifacts: list = field(default_factory=list)
    stop_event: asyncio.Event = field(default_factory=asyncio.Event)
    created_at: float = field(default_factory=time.time)

    @property
    def dir(self):
        return OUT_ROOT / self.run_id


class Gateway:
    def __init__(self):
        self.runs = {}
        self.order = []
        self.active = None
        # ── the events bus (2026-09-02, the streaming restoration) ──
        # run_id -> set of subscriber queues; the WS door
        # (/v1/pipelines/events/<run_id>) feeds here and the engine
        # report contract publishes here. The 700ms status poll stays
        # the terminal authority; the bus carries the intra-tick frames
        # (per-step progress, activity flips) the poll cannot.
        self.subscribers = {}

    def subscribe(self, run_id):
        q = asyncio.Queue()
        self.subscribers.setdefault(run_id, set()).add(q)
        return q

    def unsubscribe(self, run_id, q):
        subs = self.subscribers.get(run_id)
        if subs is not None:
            subs.discard(q)
            if not subs:
                self.subscribers.pop(run_id, None)

    def publish(self, run_id, event):
        for q in list(self.subscribers.get(run_id, ())):
            try:
                q.put_nowait(event)
            except Exception:
                pass

    async def submit(self, body):
        resolved = resolve_request(body)
        run_id = "run-%s-%08x" % (uuid.uuid4().hex[:12], int(time.time() * 1000) & 0xFFFFFFFF)
        if isinstance(resolved, dict) and resolved.get("__card__"):
            # card-only model: phase 2 composes the REAL graph now that
            # the run exists (the hook rewrites the skeleton in place).
            text, etype = resolved["skeleton"], resolved["etype"]
            # phase-1 extra are RUN INPUTS (tensor pool), never body
            # keys — strict card validation rejects a polluted surface.
            card_extra_inputs = dict(resolved.get("extra", {}))
            if card_hooks is not None:
                try:
                    text, extra2 = card_hooks.compose(
                        body, resolved["name"], run_id, text, [etype])
                    for k, v in (extra2 or {}).items():
                        card_extra_inputs.setdefault(k, v)
                except Exception as e:
                    raise ValidationError("card_compose phase 2: %s" % e)
            graph = parse_pipeline_text(text)
            if not graph["nodes"]:
                raise ValidationError(
                    "card_compose produced an empty graph for %s" % resolved["name"])
        else:
            graph = resolved
        run = Run(run_id=run_id, graph=graph, request=body)
        run.card_extra_inputs = card_extra_inputs if resolved.get("__card__") else {}
        run.dir.mkdir(parents=True, exist_ok=True)
        atomic_write(run.dir / "_request.json", body)
        run.stages = [
            {"id": n["id"], "name": n["id"], "index": i, "status": "pending"}
            for i, n in enumerate(graph["nodes"])
        ]
        self.runs[run_id] = run
        self.order.append(run_id)
        sidecar(run)
        return run

    async def worker(self):
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
                            "model": run.request.get("yaml")
                                     or run.request.get("model") or "",
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

    async def execute(self, run):
        initial = {k: v for k, v in run.request.items() if k not in ("yaml", "pipeline", "model")}
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
            node = run.graph["nodes"][stage["index"]]
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
            def _report(updates, _run=run, _stage=stage):
                _stage.update(updates)
                sidecar(_run)
                self.publish(_run.run_id, {"type": "stage",
                                           "stage": _stage["id"],
                                           "index": _stage["index"],
                                           **updates})
            try:
                inputs = resolve_inputs(node, dict(initial, **carry))
                params = expand_inject(node.get("params", {}), inputs)
                engine = load_engine(node["type"])
                result = await engine.execute(
                    {"id": node["id"], "type": node["type"], "params": params},
                    str(run.dir), inputs, run.stop_event, report=_report,
                )
                if result:
                    for k, v in result.get("outputs", {}).items():
                        carry[k] = v
                        carry["%s.%s" % (node["id"], k)] = v
                    run.artifacts.extend(result.get("artifacts", []))
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

    async def stop(self, run_id):
        run = self.runs.get(run_id)
        if run is None:
            raise ValidationError("unknown run_id %r" % run_id)
        if run.status not in ("queued", "running"):
            return {"error": "cannot stop run in state %s" % run.status}
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
        return {"run_id": run_id, "status": "stopping"}

    def graph_nodes(self, run):
        return run.graph["nodes"]

    async def shutdown(self):
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


def sidecar(run):
    atomic_write(run.dir / "_pipeline.json", {
        "run_id": run.run_id,
        "status": run.status,
        "error": json.dumps(run.error)[:20000] if run.error else "",
        "stages": run.stages,
        "artifacts": run.artifacts,
        "created_at": run.created_at,
    })


# ---------------------------------------------------------------------------
# RESILIENCE LAW (operator order 2026-08-29) — ported from the C server's
# post-audit hardening: a deliberate shutdown manufactures ZERO zombies,
# kill -9 leftovers are swept to failed at boot AND at first read, and the
# ledger journal records every sweep (parity with boot_sweep_stale_sidecars
# / read-time sweep / ledger_log in src/server.cpp, retired 2026-09-02).
# ---------------------------------------------------------------------------

LEDGER_PATH = OUT_ROOT / "_ledger.jsonl"


def ledger(event, data=None):
    """Append-only activity journal at output/_ledger.jsonl — one JSON
    object per line (close-per-line keeps every event durable)."""
    try:
        OUT_ROOT.mkdir(parents=True, exist_ok=True)
        with open(LEDGER_PATH, "a") as f:
            f.write('{"ts":%d,"event":"%s","data":%s}\n' % (
                int(time.time()), event, json.dumps(data or {}, default=str)))
    except OSError:
        pass   # the journal must never take the gateway down


def sweep_sidecar(path, why):
    """Patch a stale sidecar: every running/queued status (top-level AND
    per-stage) becomes failed, with the reason recorded in a "sweep" key.
    Idempotent — an already-swept file has no active statuses left."""
    try:
        obj = json.loads(Path(path).read_text())
    except (OSError, ValueError):
        return False
    touched = False

    def _patch(o):
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


def boot_sweep():
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
                d / "_pipeline.json",
                "gateway restarted (boot sweep): stale active sidecar "
                "from a dead process"):
            ledger("run.swept", {"run_id": d.name, "state": "failed",
                                 "error": "boot sweep"})
            swept += 1
    return swept


def sidecar_status(run_id):
    """Status for a run this process never owned: read the sidecar.
    A running/queued sidecar with no live registry entry is a stale
    leftover from a prior crash — self-heal at read time so zombies
    never accumulate, then report the failure."""
    path = OUT_ROOT / run_id / "_pipeline.json"
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


def atomic_write(path, obj):
    tmp = Path(str(path) + ".tmp")
    tmp.write_text(json.dumps(obj, indent=2, default=str))
    os.replace(str(tmp), str(path))


# ---------------------------------------------------------------------------
# http — stdlib asyncio, no framework
# ---------------------------------------------------------------------------

_WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


def _ws_accept(key: str) -> str:
    import hashlib
    return base64.b64encode(
        hashlib.sha1((key + _WS_GUID).encode()).digest()).decode()


def _ws_frame(payload: bytes) -> bytes:
    """One server->client TEXT frame (server frames are unmasked)."""
    b1 = 0x81
    n = len(payload)
    if n < 126:
        return bytes([b1, n]) + payload
    if n < 65536:
        return bytes([b1, 126]) + struct.pack(">H", n) + payload
    return bytes([b1, 127]) + struct.pack(">Q", n) + payload


async def ws_events_door(gw, reader, writer, headers, run_id):
    """GET /v1/pipelines/events/<run_id> with Upgrade: websocket.

    The streaming door (2026-09-02): subscribes to the run's event bus
    and pushes every frame live — stage flips, per-step progress,
    activity, the terminal run status. Late joiners hydrate from the
    current run/stage snapshot first. The 700ms status poll remains the
    recovery channel (a dropped socket must never lose a run).
    """
    import hashlib
    key = headers.get("sec-websocket-key", "")
    if not key:
        writer.close()
        return
    accept = base64.b64encode(
        hashlib.sha1((key + _WS_GUID).encode()).digest()).decode()
    writer.write((
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Accept: %s\r\n\r\n" % accept).encode())
    await writer.drain()

    q = gw.subscribe(run_id)

    def send(obj):
        writer.write(_ws_frame(json.dumps(obj, default=str).encode()))
        return writer.drain()

    try:
        # hydrate: the snapshot BEFORE the subscription would race;
        # subscribe() happened first, so anything between snapshot and
        # now also arrives on the queue (worst case: one dup frame,
        # which consumers treat as an idempotent patch).
        run = gw.runs.get(run_id)
        if run is None:
            await send({"type": "run", "status": "unknown"})
        else:
            await send({"type": "run", "status": run.status})
            for st in run.stages:
                patch = {"type": "stage", "stage": st["id"],
                         "status": st["status"]}
                if st.get("progress"):
                    patch["progress"] = st["progress"]
                if st.get("activity"):
                    patch["activity"] = st["activity"]
                if run.status in ("completed", "failed", "stopped"):
                    await send(patch)
        # the read side is ONE persistent task, re-armed only when the
        # client actually speaks (close/ping). Cancelling a readexactly
        # mid-frame and re-creating it each loop iteration proved
        # fragile on 3.14 — a cancelled StreamReader read can surface as
        # a spurious connection teardown. The q.get() waiter is the only
        # thing cancelled per round, and every cancellation is AWAITED
        # (a fire-and-forget cancel can smuggle the CancelledError into
        # the next await point of THIS coroutine).
        read_fr = asyncio.ensure_future(_ws_read_client(reader))
        try:
            while True:
                get_ev = asyncio.ensure_future(q.get())
                done, pending = await asyncio.wait(
                    {get_ev, read_fr},
                    return_when=asyncio.FIRST_COMPLETED)
                if read_fr in done:
                    opcode = read_fr.result()
                    if opcode == 0x8:      # client close
                        get_ev.cancel()
                        await _swallow(get_ev)
                        return
                    if opcode == 0x9:      # ping -> pong (server unmasked)
                        writer.write(bytes([0x8A, 0x00]))
                        await writer.drain()
                    read_fr = asyncio.ensure_future(_ws_read_client(reader))
                    if get_ev not in done:
                        get_ev.cancel()
                        await _swallow(get_ev)
                        continue
                elif get_ev in done:
                    pass                    # fall through to the event send
                else:                       # unreachable, kept honest
                    get_ev.cancel()
                    await _swallow(get_ev)
                    continue
                ev = get_ev.result()
                await send(ev)
                if ev.get("type") == "run" and ev.get("status") in (
                        "completed", "failed", "stopped", "unknown"):
                    read_fr.cancel()
                    await _swallow(read_fr)
                    return
        finally:
            read_fr.cancel()
    except (ConnectionError, OSError, asyncio.IncompleteReadError):
        pass  # client went away
    finally:
        gw.unsubscribe(run_id, q)
        try:
            writer.close()
        except Exception:
            pass


async def _swallow(task):
    """Await a cancelled/failed child cleanly so its exception can never
    leak into the next await of the caller (reaped, not propagated)."""
    try:
        await task
    except (asyncio.CancelledError, Exception):
        pass


async def _ws_read_client(reader):
    """Read ONE client frame -> opcode (0x8 close, 0x9 ping, ...).
    Client frames are masked; payload is discarded (we never need it)."""
    b1 = (await reader.readexactly(1))[0]
    b2 = (await reader.readexactly(1))[0]
    length = b2 & 0x7F
    if length == 126:
        length = struct.unpack(">H", await reader.readexactly(2))[0]
    elif length == 127:
        length = struct.unpack(">Q", await reader.readexactly(8))[0]
    if b2 & 0x80:
        await reader.readexactly(4)   # mask key
    if length:
        await reader.readexactly(length)
    return b1 & 0x0F


async def handle(gw, reader, writer):
    try:
        line = await asyncio.wait_for(reader.readline(), timeout=30)
        parts = line.decode().split()
        if len(parts) < 2:
            writer.close()
            return
        method, target = parts[0], parts[1]
        headers = {}
        while True:
            h = await reader.readline()
            if h in (b"\r\n", b"\n", b""):
                break
            hk, _, hv = h.decode().partition(":")
            headers[hk.strip().lower()] = hv.strip()
        length = int(headers.get("content-length", 0) or 0)
        body = await reader.readexactly(length) if length else b""
        # the WS door hijacks the connection BEFORE routing (an Upgrade
        # request must never fall through to a JSON response).
        if headers.get("upgrade", "").lower() == "websocket":
            wsm = re.match(r"^/v1/pipelines/events/(.+)$",
                           target.split("?")[0].rstrip("/"))
            if wsm and method == "GET":
                await ws_events_door(gw, reader, writer, headers,
                                     wsm.group(1))
                return
        status, payload = await route(gw, method, target, body)
    except Exception as e:
        status, payload = 500, {"error": "%s: %s" % (type(e).__name__, e)}
    try:
        # payload may be a 3-tuple (payload, headers_dict, raw_bytes)
        # for binary routes (asset serving)
        resp_headers = {}
        raw = None
        if isinstance(payload, tuple) and len(payload) == 3:
            payload, resp_headers, raw = payload
        if raw is not None:
            blob = raw
        else:
            blob = json.dumps(payload, indent=2, default=str).encode()
        ct = resp_headers.pop("content-type",
                              "application/json" if raw is None else "application/octet-stream")
        reason = {200: "OK", 202: "Accepted", 400: "Bad Request",
                  404: "Not Found", 409: "Conflict"}.get(status, "Error")
        hdrs = ("HTTP/1.1 %d %s\r\ncontent-type: %s\r\n"
                "content-length: %d\r\nconnection: close\r\n"
                % (status, reason, ct, len(blob)))
        for k, v in resp_headers.items():
            hdrs += "%s: %s\r\n" % (k, v)
        writer.write((hdrs + "\r\n").encode() + blob)
        await writer.drain()
    finally:
        writer.close()


async def route(gw, method, target, body):
    path = target.split("?")[0].rstrip("/") or "/"
    from urllib.parse import urlparse, parse_qs
    qs = parse_qs(urlparse(target).query)

    # ── QUEUE LANE LAW: start/status/stop (py gateway core) ──────────
    if method == "POST" and path == "/v1/pipelines/start":
        try:
            req = json.loads(body.decode() or "{}")
        except json.JSONDecodeError as e:
            return 400, {"error": "bad JSON: %s" % e}
        try:
            run = await gw.submit(req)
        except ValidationError as e:
            return 400, {"error": str(e)}
        return 202, {"run_id": run.run_id, "status": run.status}
    if method == "GET" and path == "/v1/queue":
        return 200, {
            "queued": len(gw.order),
            "running": 1 if gw.active else 0,
            "active": gw.active.run_id if gw.active else "",
            "queued_ids": list(gw.order),
        }
    m = re.match(r"^/v1/pipelines/status/(.+)$", path)
    if method == "GET" and m:
        run = gw.runs.get(m.group(1))
        if run is None:
            stored = sidecar_status(m.group(1))
            if stored is None:
                return 404, {"error": "unknown run_id"}
            return 200, stored
        return 200, {
            "run_id": run.run_id,
            "status": run.status,
            "stages": run.stages,
            "artifacts": run.artifacts,
            "error": run.error,
            "queue_position": gw.order.index(run.run_id) if run.run_id in gw.order else 0,
        }
    m = re.match(r"^/v1/pipelines/stop/(.+)$", path)
    if method == "POST" and m:
        try:
            return 200, await gw.stop(m.group(1))
        except ValidationError as e:
            return 400, {"error": str(e)}

    # ── CATALOG (editor surface — py/catalog.py) ─────────────────────
    if method == "GET" and path == "/v1/model-catalog":
        import catalog as _cat
        return 200, json.loads(_cat.to_json(_cat.scan_catalog(str(REPO))))
    m = re.match(r"^/v1/model/(.+)$", path)
    if method == "GET" and m:
        import catalog as _cat
        row = _cat.find_model(_cat.scan_catalog(str(REPO)), m.group(1))
        if row is None:
            return 404, {"error": "model not found"}
        return 200, row

    # ── FORMS / KINDS / FORM-SPEC (py/editor_forms.py) ──────────────
    if method == "GET" and path == "/v1/forms":
        import editor_forms as _ef
        return 200, _ef.forms(str(REPO))
    if method == "GET" and path == "/v1/kinds":
        import editor_forms as _ef
        return 200, _ef.kinds(str(REPO))
    if method == "GET" and path == "/v1/form-spec":
        import editor_forms as _ef
        model = qs.get("model", [""])[0]
        code, spec = _ef.form_spec(str(REPO), model)
        return code, spec

    # ── EDITOR DATA SURFACE (py/editor_runs.py) ──────────────────────
    if method == "GET" and path == "/v1/pipelines/runs":
        import editor_runs as _er
        return 200, _er.runs(str(STATE_ROOT))
    m = re.match(r"^/v1/pipelines/runs/(.+)$", path)
    if method == "GET" and m:
        import editor_runs as _er
        return _er.run_detail(str(STATE_ROOT), m.group(1))
    if method == "GET" and path == "/v1/pipelines/yaml/list":
        import editor_runs as _er
        return 200, _er.yaml_list(str(REPO / "pipelines"))
    if method == "GET" and path == "/v1/pipelines/yaml/detail":
        import editor_runs as _er
        yaml_name = qs.get("yaml", [""])[0]
        return _er.yaml_detail(str(REPO / "pipelines"), yaml_name or None)
    if method == "POST" and path == "/v1/pipelines/yaml/save":
        import editor_runs as _er
        try:
            body_json = json.loads(body.decode() or "{}")
        except json.JSONDecodeError as e:
            return 400, {"error": "bad JSON: %s" % e}
        return _er.yaml_save(str(REPO / "pipelines"), body_json)
    if method in ("DELETE", "POST") and path == "/v1/pipelines/yaml/delete":
        import editor_runs as _er
        fname = qs.get("filename", [None])[0]
        if fname is None and method == "POST":
            try:
                body_json = json.loads(body.decode() or "{}")
                fname = body_json.get("filename")
            except json.JSONDecodeError:
                pass
        return _er.yaml_delete(str(REPO / "pipelines"), fname)
    if method == "POST" and path == "/v1/pipelines/yaml/rename":
        import editor_runs as _er
        try:
            body_json = json.loads(body.decode() or "{}")
        except json.JSONDecodeError as e:
            return 400, {"error": "bad JSON: %s" % e}
        return _er.yaml_rename(str(REPO / "pipelines"), body_json)
    if method == "POST" and path == "/v1/pipelines/yaml/validate":
        import editor_runs as _er
        try:
            body_json = json.loads(body.decode() or "{}")
        except json.JSONDecodeError:
            body_json = {}
        return _er.yaml_validate(str(REPO / "pipelines"), body_json)
    if method == "POST" and path == "/v1/pipelines/yaml/validate-simple":
        import editor_runs as _er
        try:
            body_json = json.loads(body.decode() or "{}")
        except json.JSONDecodeError:
            body_json = {}
        return _er.yaml_validate_simple(str(REPO / "pipelines"), body_json)
    if method == "POST" and path.startswith("/v1/pipelines/resume/"):
        import editor_runs as _er
        rid = path.split("/")[-1]
        try:
            body_json = json.loads(body.decode() or "{}")
        except json.JSONDecodeError:
            body_json = {}
        return _er.resume(str(STATE_ROOT), rid, body_json,
                          pipelines_root=str(REPO / "pipelines"))
    if path == "/v1/pipelines/families/param-schemas":
        import editor_runs as _er
        return 200, _er.family_param_schemas(
            _er.catalog_family_ids(str(REPO / "plugins")))
    m = re.match(r"^/v1/pipelines/families/(.+)/param-schema$", path)
    if method == "GET" and m:
        import editor_runs as _er
        return _er.family_param_schema(
            _er.catalog_family_ids(str(REPO / "plugins")), m.group(1))
    if method == "GET" and path == "/v1/pipelines/drafts":
        import editor_runs as _er
        return 200, _er.drafts_list(str(STATE_ROOT / "drafts"))
    if method == "POST" and path == "/v1/pipelines/drafts":
        import editor_runs as _er
        try:
            body_json = json.loads(body.decode() or "{}")
        except json.JSONDecodeError as e:
            return 400, {"error": "bad JSON: %s" % e}
        return _er.drafts_save(str(STATE_ROOT / "drafts"), body_json)
    m = re.match(r"^/v1/pipelines/drafts/(.+)$", path)
    if method == "GET" and m:
        import editor_runs as _er
        return _er.drafts_get(str(STATE_ROOT / "drafts"), m.group(1))

    # ── BINARY ASSET SERVING (/editor/assets/runs/) ──────────────────
    if path.startswith("/editor/assets/runs/"):
        import editor_runs as _er
        rel = path[len("/editor/assets/runs/"):]
        code, data, ctype = _er.serve_asset(str(STATE_ROOT), rel)
        if code == 200:
            return code, ({}, {"content-type": ctype}, data)
        return code, {"error": "not found"} if code == 404 else data

    # ── LEDGER ───────────────────────────────────────────────────────
    if method == "GET" and path == "/v1/ledger":
        return 200, ledger_tail(target)
    if method == "GET" and path == "/v1/assets":
        # the cross-run asset index (asset_ledger rung, 2026-09-03):
        # derived from disk truth at read time — state is not contract.
        import asset_ledger as _al
        try:
            _lim = int(qs.get("limit", ["200"])[0] or 200)
        except ValueError:
            _lim = 200
        return 200, _al.assets_index(
            str(OUT_ROOT), run=qs.get("run", [None])[0],
            kind=qs.get("kind", [None])[0], limit=_lim)

    # ── LANE DISCLOSURE (py/lane_disclosure.py — progressive surface) ──
    # GET /v1/card-tools        every card manifest (lane list source)
    # GET /v1/cards/<lane>/bundle  one lane: tools + skills (all levels)
    # GET /v1/skills            the cheap index across card+model+guide
    # GET /v1/skills/<id>       one body (ledgered skill.read)
    if method == "GET" and path == "/v1/card-tools":
        import lane_disclosure as _ld
        return 200, _ld.card_tools()
    if method == "GET" and path == "/v1/skills":
        import lane_disclosure as _ld
        return 200, _ld.skill_index()
    # PEEK tier: the lane table (kind/genre filters via query — the
    # handler strips the query from path but parses it into qs)
    if method == "GET" and path == "/v1/lanes":
        import lane_disclosure as _ld
        return 200, _ld.peek(qs.get("kind", [None])[0],
                             qs.get("genre", [None])[0])
    m = re.match(r"^/v1/skills/([^/]+)$", path)
    if method == "GET" and m:
        import lane_disclosure as _ld
        from urllib.parse import unquote as _uq
        return _ld.skill_read(_uq(m.group(1)), ledger)
    m = re.match(r"^/v1/cards/([^/]+)/bundle$", path)
    if method == "GET" and m:
        import lane_disclosure as _ld
        from urllib.parse import unquote as _uq
        return _ld.lane_bundle(_uq(m.group(1)), qs.get("kind", [None])[0])

    # ── COMFYUI MANAGER (the ONE management SSOT — py/manage.py) ────
    # AI door for the comfy_manage DSH tool: wraps comfy-mcp +
    # comfyui-manager (security=medium) + comfy-cli. The manual door is
    # tools/provision.py manage <action>. The gateway's own interpreter
    # may not carry the management plane (portability law — same reason
    # /v1/models/provision shells to the comfy binary): dispatch
    # in-process when importable, else spawn the BASE-ENV python
    # (repo .venv) running the SAME SSOT module.
    if method == "POST" and path == "/v1/manage":
        try:
            body_json = json.loads(body.decode() or "{}")
        except json.JSONDecodeError as e:
            return 400, {"error": "bad JSON: %s" % e}
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

    # ── HEALTH + CHROME STUBS ────────────────────────────────────────
    if method == "GET" and path == "/v1/health":
        import editor_runs as _er
        return 200, _er.health()
    if method == "GET":
        _chrome = {
            "/v1/themes": "themes", "/v1/tags": "tags",
            "/v1/services": "services", "/v1/right-panes": "right_panes",
            "/v1/ui-slots": "ui_slots", "/v1/tools": "tools",
            "/v1/shell": "shell", "/v1/plugins": "plugins_registry",
            "/v1/models": "models",
        }
        if path in _chrome:
            import editor_runs as _er
            return 200, getattr(_er, _chrome[path])()

    return 404, {"error": "no such route %s %s" % (method, path)}


def ledger_tail(target):
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


async def main(port):
    gw = Gateway()
    swept = boot_sweep()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(
                sig, lambda s=sig: asyncio.ensure_future(gw.shutdown()))
        except NotImplementedError:
            pass
    loop.create_task(gw.worker())
    ledger("server.boot", {"port": port, "swept": swept,
                           "engine": "python-orchestrator"})
    server = await asyncio.start_server(lambda r, w: handle(gw, r, w), "127.0.0.1", port)
    print("python gateway on 127.0.0.1:%d (queue: serial FIFO, laws intact; boot sweep: %d)" % (port, swept), flush=True)
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 18201))
