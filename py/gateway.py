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
import importlib.util
import json
import os
import re
import signal
import sys
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parent.parent
OUT_ROOT = REPO / "output"
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

    The C dag parser reads a constrained YAML subset; this does the same so
    pipelines/NAME/pipeline.yaml stays byte-identical for both gateways
    during the transition.
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
    """Resolve model id -> card.yaml requires list (or [] if none).

    Walks plugins/*/cards/*/card.yaml, matches via ability.default_family
    or families list against the model's family id.
    """
    import yaml as _yaml
    if plugins_dir is None:
        plugins_dir = REPO / "plugins"
    for plugin_dir in sorted(plugins_dir.iterdir()):
        models_root = plugin_dir / "models"
        if not models_root.is_dir():
            continue
        for my in models_root.glob("*/%s/model.yaml" % mid):
            try:
                cfg = _yaml.safe_load(my.read_text()) or {}
                fam = cfg.get("family", {})
                if isinstance(fam, dict) and fam.get("id"):
                    family_id = fam["id"]
                    for pdir in sorted(plugins_dir.iterdir()):
                        cards_root = pdir / "cards"
                        if not cards_root.is_dir():
                            continue
                        for cy in cards_root.glob("*/card.yaml"):
                            try:
                                ccfg = _yaml.safe_load(cy.read_text()) or {}
                                card_sec = ccfg.get("card", ccfg)
                                af = card_sec.get("ability", {})
                                if isinstance(af, dict) and af.get("default_family") == family_id:
                                    return ccfg.get("requires", [])
                                fams = ccfg.get("families", [])
                                for f in fams:
                                    fid = f.get("id") if isinstance(f, dict) else f
                                    if fid == family_id:
                                        return ccfg.get("requires", [])
                            except Exception:
                                continue
            except Exception:
                continue
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
    requires = _find_card_requires(mid)
    if requires:
        try:
            from py.card_requires import check_card_requires
            custom_nodes_dir = str(plugins_dir.parent / "custom_nodes")
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


def expand_inject(params, inputs):
    """Expand $name refs in inject from node inputs; unresolved = LOUD."""
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
            try:
                inputs = resolve_inputs(node, dict(initial, **carry))
                params = expand_inject(node.get("params", {}), inputs)
                engine = load_engine(node["type"])
                result = await engine.execute(
                    {"id": node["id"], "type": node["type"], "params": params},
                    str(run.dir), inputs, run.stop_event,
                )
                if result:
                    for k, v in result.get("outputs", {}).items():
                        carry[k] = v
                        carry["%s.%s" % (node["id"], k)] = v
                    run.artifacts.extend(result.get("artifacts", []))
                stage["status"] = "completed"
            except Exception as e:
                stage["status"] = "failed"
                stage["error"] = "%s: %s" % (type(e).__name__, e)
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
        return 200, _er.runs(str(REPO / "build"))
    m = re.match(r"^/v1/pipelines/runs/(.+)$", path)
    if method == "GET" and m:
        import editor_runs as _er
        return _er.run_detail(str(REPO / "build"), m.group(1))
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
        return _er.resume(str(REPO / "build"), rid, body_json,
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
        return 200, _er.drafts_list(str(REPO / "build" / "drafts"))
    if method == "POST" and path == "/v1/pipelines/drafts":
        import editor_runs as _er
        try:
            body_json = json.loads(body.decode() or "{}")
        except json.JSONDecodeError as e:
            return 400, {"error": "bad JSON: %s" % e}
        return _er.drafts_save(str(REPO / "build" / "drafts"), body_json)
    m = re.match(r"^/v1/pipelines/drafts/(.+)$", path)
    if method == "GET" and m:
        import editor_runs as _er
        return _er.drafts_get(str(REPO / "build" / "drafts"), m.group(1))

    # ── BINARY ASSET SERVING (/editor/assets/runs/) ──────────────────
    if path.startswith("/editor/assets/runs/"):
        import editor_runs as _er
        rel = path[len("/editor/assets/runs/"):]
        code, data, ctype = _er.serve_asset(str(REPO / "build"), rel)
        if code == 200:
            return code, ({}, {"content-type": ctype}, data)
        return code, {"error": "not found"} if code == 404 else data

    # ── LEDGER ───────────────────────────────────────────────────────
    if method == "GET" and path == "/v1/ledger":
        return 200, ledger_tail(target)

    # ── MODEL PROVISION ────────────────────────────────────────────
    if method == "POST" and path == "/v1/models/provision":
        import editor_runs as _er
        try:
            body_json = json.loads(body.decode() or "{}")
        except json.JSONDecodeError as e:
            return 400, {"error": "bad JSON: %s" % e}
        code, data = _er.provision(body_json, str(REPO / "plugins"))
        return code, data

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
