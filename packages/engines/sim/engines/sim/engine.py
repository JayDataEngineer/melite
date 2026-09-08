"""engine.py — the sim backend (row 6, 2026-09-07).

The per-stage execute ABI the worker loop calls, with zero inference:
stages declare EXPLICIT sim params and the engine writes text files.
Design record: docs/design/row6-sim-backend.md.
"""

import asyncio
import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    # annotation-only (this file is bare-exec'd; the
    # names below never resolve at runtime)
    from typing import Callable
    from flow_graph import NodeRow

ENGINE_TYPE = "sim"


def __getattr__(name: str) -> "str":
    # Lazy DEFAULT_OUTPUT: the scanner bare-exec()s this file
    # (no python/ on the path — a top-level `from flow import` would
    # die at discovery), while every real consumer (validate door,
    # worker loop) runs with python/ importable. Resolve on first
    # attribute access, never at module top.
    if name == "DEFAULT_OUTPUT":
        from flow import Kind
        return Kind.text
    raise AttributeError("module %r has no attribute %r"
                         % (__name__, name))


async def execute(node: "NodeRow", run_dir: "str",
                  inputs: "dict[str, object]",
                  stop_event: "asyncio.Event",
                  report: "Callable[..., None] | None" = None) -> "dict[str, object]":
    """Run one stage. Params: echo (required), fail / sleep_s
    (optional). Returns {"outputs", "artifacts"} or {"error"} —
    the same dict shapes every engine answers."""
    params = dict(getattr(node, "params", None) or {})
    fail = params.get("fail")
    if fail:
        return {"error": str(fail)}
    if "echo" not in params:
        return {"error": "sim stage %r: missing required param 'echo'"
                % getattr(node, "node_id", "?")}
    sleep_s = params.get("sleep_s")
    if sleep_s:
        try:
            budget = float(sleep_s)
        except (TypeError, ValueError):
            return {"error": "sim stage %r: sleep_s %r is not a number"
                    % (getattr(node, "node_id", "?"), sleep_s)}
        elapsed = 0.0
        while elapsed < budget:
            if stop_event is not None and stop_event.is_set():
                return {"error": "stopped"}
            await asyncio.sleep(0.05)
            elapsed += 0.05
    if report is not None:
        report({"activity": "sim %s" % getattr(node, "node_id", "?")})
    stage_id = str(getattr(node, "node_id", "stage"))
    sim_dir = os.path.join(str(run_dir), "sim")
    os.makedirs(sim_dir, exist_ok=True)
    artifact = os.path.join(sim_dir, stage_id + ".txt")
    lines = [str(params["echo"])]
    for _name, value in sorted((inputs or {}).items()):
        if isinstance(value, str) and os.path.isfile(value):
            with open(value, encoding="utf-8") as f:
                lines.append(f.read())
    with open(artifact, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    declared = dict(getattr(node, "outputs", None) or {})
    outputs = {channel: artifact for channel in declared}
    return {"outputs": outputs, "artifacts": [artifact]}
