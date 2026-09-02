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

Engines live in py/engines/ENGINE_TYPE.py, each exporting:
    async def execute(node, run_dir, inputs, stop_event) -> dict
    async def stop(node, run_dir) -> None   (optional)
The server names no lane and no engine — it reads the type from the graph.
"""

from __future__ import annotations

import asyncio
import importlib.util
import json
import os
import re
import sys
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parent.parent
OUT_ROOT = REPO / "output"
PIPELINES = REPO / "pipelines"
ENGINES_DIR = Path(__file__).resolve().parent / "engines"

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
        return parse_pipeline_text(path.read_text())
    if "model" in body:
        mid = str(body["model"])
        path = PIPELINES / mid / "pipeline.yaml"
        if not path.is_file():
            raise ValidationError("no pipeline at pipelines/%s/pipeline.yaml for model %r" % (mid, mid))
        return parse_pipeline_text(path.read_text())
    raise ValidationError("no pipeline selected: provide yaml or model")


def resolve_inputs(node, initial):
    """Explicit wiring only: input_from entries like __initial__.PROMPT."""
    out = {}
    for ref in node.get("input_from", []):
        if not ref.startswith("__initial__."):
            raise ValidationError(
                "node %r: input_from ref %r unsupported (only __initial__ wiring; no name-match fallback)"
                % (node["id"], ref),
            )
        tensor = ref.split(".", 1)[1]
        if tensor not in initial:
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
            if name not in inputs:
                raise ValidationError("inject %s: tensor %r unresolved" % (slot, name))
            expanded[slot] = inputs[name]
        else:
            expanded[slot] = value
    out = dict(params)
    out["inject"] = expanded
    return out


_engine_cache = {}


def load_engine(engine_type):
    if engine_type in _engine_cache:
        return _engine_cache[engine_type]
    path = ENGINES_DIR / ("%s.py" % engine_type)
    if not path.is_file():
        raise ValidationError("no engine plugin for type %r (expected %s)" % (engine_type, path))
    spec = importlib.util.spec_from_file_location("engines.%s" % engine_type, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    _engine_cache[engine_type] = mod
    return mod


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
        graph = resolve_request(body)
        run_id = "run-%s-%08x" % (uuid.uuid4().hex[:12], int(time.time() * 1000) & 0xFFFFFFFF)
        run = Run(run_id=run_id, graph=graph, request=body)
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
                    carry.update(result.get("outputs", {}))
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
                n = run.graph["nodes"][stage["index"]]
                engine = load_engine(n["type"])
                if hasattr(engine, "stop"):
                    try:
                        await engine.stop({"params": n.get("params", {})}, str(run.dir))
                    except Exception:
                        pass
        return {"run_id": run_id, "status": "stopping"}


def sidecar(run):
    atomic_write(run.dir / "_pipeline.json", {
        "run_id": run.run_id,
        "status": run.status,
        "error": json.dumps(run.error)[:20000] if run.error else "",
        "stages": run.stages,
        "artifacts": run.artifacts,
        "created_at": run.created_at,
    })


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
        blob = json.dumps(payload, indent=2, default=str).encode()
        reason = {200: "OK", 202: "Accepted", 400: "Bad Request", 404: "Not Found"}.get(status, "Error")
        head = ("HTTP/1.1 %d %s\r\ncontent-type: application/json\r\ncontent-length: %d\r\nconnection: close\r\n\r\n" % (status, reason, len(blob))).encode()
        writer.write(head + blob)
        await writer.drain()
    finally:
        writer.close()


async def route(gw, method, target, body):
    path = target.split("?")[0].rstrip("/") or "/"
    if method == "POST" and path == "/v1/pipelines/start":
        try:
            req = json.loads(body.decode() or "{}")
        except json.JSONDecodeError as e:
            return 400, {"error": "bad JSON: %s" % e}
        try:
            run = await gw.submit(req)   # 4xx-loud BEFORE registration
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
            return 404, {"error": "unknown run_id"}
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
    return 404, {"error": "no such route %s %s" % (method, path)}


async def main(port):
    gw = Gateway()
    asyncio.get_event_loop().create_task(gw.worker())
    server = await asyncio.start_server(lambda r, w: handle(gw, r, w), "127.0.0.1", port)
    print("python gateway on 127.0.0.1:%d (queue: serial FIFO, laws intact)" % port, flush=True)
    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main(int(sys.argv[1]) if len(sys.argv) > 1 else 18201))
