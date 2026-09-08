"""mergegraph — STROKE 5 (2026-09-06): single-graph compile for
pure-comfyui flows (design record docs/design/one-contract-compose.md
tier 1).

A flow whose non-skipped stages are ALL comfyui is not N submits —
it is ONE ComfyUI graph: the per-stage workflows merge under
namespaced node ids (``<stage>::<node>``) and every cross-stage wire
becomes a DIRECT node link, so artifacts pass INSIDE the engine —
no disk round-trip, no re-upload, one queue claim on the server.

The merge is DECLARED, not guessed:

  * cross-stage wiring rides the stage's OWN $-spells: a workflow
    field spelled exactly ``$<input_name>`` where the stage wires
    that input FromStage becomes a link to the upstream producer
    node's socket 0 (the save-node ABI).
  * the producer node per output channel: the stage's declared
    ``params.output_nodes = {channel: node_id}`` wins; otherwise a
    workflow with EXACTLY ONE Save* node binds that node to the
    declared channels; anything else refuses LOUD (an ambiguous
    graph is the author's to name, never the machine's to guess).
  * initials substitute from the request pool ($-spells resolving
    to non-FromStage names). Any $-string left over after the
    FromStage link pass and the initials pass refuses LOUD — a
    silent passthrough is a prompt-text bug class the estate
    already refuses (gateway _deep_expand's contract, enforced
    here at merge time because there is no later seam).

Mixed-engine flows never reach this module (the worker checks the
engine set first) and a refusal from plan_merge falls back to the
per-stage loop — the merged path is an optimization with a loud,
documented escape hatch, never a new failure mode (RESILIENCE LAW).
"""

from __future__ import annotations

import asyncio
import json
import time
import uuid
from collections.abc import Callable

# Wire values: workflow JSON subtrees (annotations only — never
# evaluated at runtime under `from __future__ import`).
type JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None
# An API-format workflow: {node_id: {class_type, inputs, ...}}.
type Workflow = dict[str, dict[str, JsonValue]]

from native import (ComfyError, _ACTIVE, _drain_relevant, _fetch_outputs,
                    _http, _interrupt, _server_url, _upload_referenced,
                    _ws_tap)

# ── the planner (pure, wall-pinned) ─────────────────────────────────


def _save_nodes(wf: Workflow) -> list[str]:
    """The workflow's Save* nodes — ComfyUI's artifact producers."""
    return sorted(
        nid for nid, node in wf.items()
        if isinstance(node, dict)
        and str(node.get("class_type", "")).startswith("Save"))


def _producers(row: dict[str, JsonValue]) -> dict[str, str]:
    """channel -> workflow node id (the artifact producer).

    Declared params.output_nodes wins (validated against the
    workflow); a single-Save workflow binds its one save node;
    anything else is a LOUD refusal naming every candidate."""
    wf = row["workflow"]
    outs = row.get("outputs") or {}
    declared = row.get("output_nodes") or {}
    if not isinstance(declared, dict):
        raise ComfyError("stage %r: output_nodes must be an object "
                         "{channel: node_id}" % row["stage_id"])
    producers: dict[str, str] = {}
    if declared:
        for channel, nid in declared.items():
            if nid not in wf:
                raise ComfyError(
                    "stage %r: output_nodes names node %r for channel "
                    "%r — the workflow carries no such node (nodes: %s)"
                    % (row["stage_id"], nid, channel, sorted(wf)))
            producers[str(channel)] = str(nid)
        return producers
    saves = _save_nodes(wf)
    if len(saves) == 1:
        return {str(ch): saves[0] for ch in outs}
    if len(saves) > 1:
        raise ComfyError(
            "stage %r: %d Save nodes (%s) but no params.output_nodes "
            "row — name the producer per channel, the merge never "
            "guesses" % (row["stage_id"], len(saves), saves))
    # zero save nodes: the stage produces no artifacts IN the engine
    # (e.g. a passthrough) — its channels have no producer; a
    # downstream wire to them refuses at the link pass below.
    return {}


def _rewrite_spells(value: JsonValue, links: dict[str, list[str | int]],
                    initials: dict[str, JsonValue],
                    where: str) -> JsonValue:
    """Walk a workflow value: a $spell wired FromStage becomes a
    link tuple; a $spell resolving in the initials pool substitutes;
    anything else that still starts with $ after both passes is a
    LOUD refusal (there is no later seam in the merged path)."""
    if isinstance(value, str) and value.startswith("$"):
        name = value[1:]
        if name in links:
            return links[name]
        if name in initials:
            return initials[name]
        raise ComfyError(
            "%s: workflow carries $%s — neither a FromStage-wired "
            "input name nor a request initial (the merged graph has "
            "no later substitution seam; name it or wire it)"
            % (where, name))
    if isinstance(value, list):
        return [_rewrite_spells(v, links, initials, where)
                for v in value]
    if isinstance(value, dict):
        return {k: _rewrite_spells(v, links, initials, where)
                for k, v in value.items()}
    return value


def _is_wire(value: JsonValue) -> bool:
    """A comfy link tuple: [node_id(str), slot(int)]."""
    return (isinstance(value, list) and len(value) == 2
            and isinstance(value[0], str)
            and isinstance(value[1], int)
            and not isinstance(value[1], bool))


def _namespace_wires(value: JsonValue, sid: str,
                     stage_ids: frozenset[str]) -> JsonValue:
    """2026-09-06 gap-fix (live-probed on krea-2/anima/z-image/
    ideogram): the merge namespaced the TOP-LEVEL node ids but left
    IN-STAGE link tuples bare — every merged submit posted
    `SaveImage.inputs.images = ["VAEDecode.0", 0]` against the node
    `generate::VAEDecode.0` and the live server refused the whole
    prompt (KeyError at validation). The planner walls never checked
    wire integrity, so the break rode a green wall. In-stage wires
    now rewrite to the namespaced id at copy time; the plan-time
    integrity gate below is the belt-and-braces."""
    if _is_wire(value) and value[0] in stage_ids:
        return ["%s::%s" % (sid, value[0]), value[1]]
    if isinstance(value, list):
        return [_namespace_wires(v, sid, stage_ids) for v in value]
    if isinstance(value, dict):
        return {k: _namespace_wires(v, sid, stage_ids)
                for k, v in value.items()}
    return value


def _assert_wires_resolve(merged: "Workflow", where: str) -> None:
    """Plan-time gate: every link tuple in the merged workflow must
    name a node the SAME workflow carries. A dangling wire is a
    construction refusal, never a server round-trip (construction
    IS the gate — PYTHON SHAPE LAW)."""
    def _walk(v: JsonValue, at: str) -> None:
        if _is_wire(v):
            if v[0] not in merged:
                raise ComfyError(
                    "%s: %s wires %r — the merged graph carries no "
                    "such node (dangling in-stage or cross-stage "
                    "link)" % (where, at, v[0]))
        elif isinstance(v, list):
            for i, x in enumerate(v):
                _walk(x, "%s[%d]" % (at, i))
        elif isinstance(v, dict):
            for k, x in v.items():
                _walk(x, "%s.%s" % (at, k))
    for nid, node in merged.items():
        _walk(node.get("inputs"), "node %r inputs" % nid)


def plan_merge(rows: list[dict[str, JsonValue]], initials: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """rows (flow order, earlier-only): each
    {stage_id, workflow, input_names {name: "<stage>.<channel>" |
    "__initial__.<key>"}, outputs {channel: kind}, output_nodes?}.

    Returns {"workflow": merged, "producers": {stage: {channel:
    namespaced_node}}, "stages": [stage_ids]}."""
    merged: Workflow = {}
    producers: dict[str, dict[str, str]] = {}
    for row in rows:
        sid = row["stage_id"]
        wf = row["workflow"]
        if not isinstance(wf, dict) or not wf:
            raise ComfyError(
                "stage %r: no workflow to merge (card stages must "
                "bridge first; engine-only stages need params."
                "workflow)" % sid)
        stage_prod = _producers(row)
        # namespaced copy — IN-STAGE wires rewrite to the namespaced
        # id at copy time (2026-09-06 gap-fix; see _namespace_wires)
        stage_ids = frozenset(wf)
        ns_wf = {}
        for nid, node in wf.items():
            key = "%s::%s" % (sid, nid)
            if key in merged:
                raise ComfyError(
                    "stage %r: duplicate namespaced node %r — stage "
                    "ids and node ids collided" % (sid, key))
            ns_wf[key] = node
            merged[key] = _namespace_wires(node, sid, stage_ids)
        producers[sid] = {"%s::%s" % (sid, n): ch
                          for ch, n in stage_prod.items()}
        # link map for THIS stage's FromStage-wired inputs
        links: dict[str, list[str | int]] = {}
        for name, ref in (row.get("input_names") or {}).items():
            ref = str(ref)
            if ref.startswith("__initial__."):
                continue
            upstream, _, channel = ref.partition(".")
            if upstream not in producers or not producers[upstream]:
                raise ComfyError(
                    "stage %r input %r wires %r — the upstream stage "
                    "declares no mergeable producer for it (zero Save "
                    "nodes and no output_nodes row)"
                    % (sid, name, ref))
            ups = [n for n, ch in producers[upstream].items()
                   if ch == channel]
            if not ups:
                raise ComfyError(
                    "stage %r input %r wires channel %r — upstream "
                    "stage %r produces no such channel (channels: %s)"
                    % (sid, name, channel, upstream,
                       sorted(set(producers[upstream].values()))))
            links[str(name)] = [ups[0], 0]
        # ROW 4 (2026-09-07, live-probed run-c97e67b10fb8): a
        # producer LINK may only land in a TENSOR slot. An arm that
        # renders its wired input through a file loader (upscale's
        # LoadImage) puts the $spell in a FILE slot — rewriting it
        # to a link tuple mangles a filename and the server refuses
        # at POST /prompt (too late to fall back). Refuse HERE at
        # plan time: the caller's per-stage path owns disk
        # handoffs. The in-graph tensor splice (drop the loader,
        # feed the upstream decode tensor) is the recorded
        # follow-up, gated with the socket-type canary work.
        for key, node in ns_wf.items():
            cls = str(node.get("class_type", ""))
            if not cls.startswith("Load"):
                continue
            ins = node.get("inputs")
            if not isinstance(ins, dict):
                continue
            for slot, val in ins.items():
                if (isinstance(val, str) and val.startswith("$")
                        and val[1:] in links):
                    raise ComfyError(
                        "stage %r node %r (%s): input %r carries the "
                        "$spell %r — a producer link cannot land in a "
                        "file slot. The merged path needs the arm's "
                        "tensor entry (drop the loader); the per-stage "
                        "path owns the disk handoff"
                        % (sid, key.split("::", 1)[1], cls, slot, val))
        # rewrite this stage's namespaced nodes in place
        for key in ns_wf:
            merged[key] = _rewrite_spells(
                merged[key], links, initials,
                "stage %r node %r" % (sid, key.split("::", 1)[1]))
    # construction IS the gate: a dangling wire refuses HERE, never
    # at the server (2026-09-06 gap-fix — this gate is what the
    # green planner wall was missing)
    _assert_wires_resolve(merged, "merged plan")
    return {"workflow": merged, "producers": producers,
            "stages": [r["stage_id"] for r in rows]}


# ── the executor (ONE submit, per-stage harvest) ────────────────────


async def execute_flow(rows: list[dict[str, JsonValue]], run_dir: str,
                       stop_event: asyncio.Event,
                       report: Callable[[dict[str, JsonValue]], None] | None = None,
                       initials: dict[str, JsonValue] | None = None) -> dict[str, JsonValue]:
    """The merged ABI: plan, submit ONCE, tap, poll, harvest PER
    STAGE (per-stage sub-dirs, per-stage channels published from
    that stage's namespaced nodes). Returns
    {"stages": {stage_id: {"outputs": {channel: path},
    "artifacts": [paths]}}}.

    Registered in _ACTIVE under run_dir so the stop door reaches the
    merged prompt exactly as it reaches a single-stage one."""
    def silent(updates: dict[str, JsonValue]) -> None:
        return report(updates) if report else None

    plan = plan_merge(rows, dict(initials or {}))
    merged = plan["workflow"]
    server = _server_url()
    silent({"activity": "merged submit (%d stages, %d nodes)"
            % (len(plan["stages"]), len(merged))})
    merged, _uploaded = await asyncio.to_thread(
        _upload_referenced, server, merged)

    prompt_id = str(uuid.uuid4())
    client_id = "melite-" + uuid.uuid4().hex[:16]
    status, out = await asyncio.to_thread(
        _http, "POST", server + "/prompt",
        json.dumps({"prompt": merged, "prompt_id": prompt_id,
                    "client_id": client_id}).encode())
    if status != 200:
        raise ComfyError("POST /prompt %s: %s" % (status, str(out)[:400]))
    node_errors = (out or {}).get("node_errors") \
        if isinstance(out, dict) else None
    if node_errors:
        raise ComfyError("ComfyUI validation refused the merged graph: %s"
                         % json.dumps(node_errors)[:400])

    _ACTIVE[str(run_dir)] = {"prompt_id": prompt_id,
                             "client_id": client_id, "server": server}
    events: asyncio.Queue = asyncio.Queue()
    tap = asyncio.create_task(
        _ws_tap(server, client_id, events, prompt_id))

    # the merged deadline: the SUM of the stages' own budgets (a
    # merged run does every stage's work; per-stage floors apply)
    budget = 0.0
    for r in rows:
        try:
            budget += float((r.get("params") or {}).get(
                "timeout_s", 2400) or 2400)
        except (TypeError, ValueError):
            budget += 2400.0
    deadline = time.monotonic() + max(budget, 2400.0)

    try:
        while True:
            await asyncio.sleep(0.25)
            err = _drain_relevant(events, prompt_id, silent) or None
            if stop_event.is_set():
                await _interrupt(server, prompt_id)
                raise ComfyError("stopped (interrupt delivered)")
            st, hist = await asyncio.to_thread(
                _http, "GET", server + "/history/" + prompt_id, None,
                "application/json", 30)
            entry = (hist or {}).get(prompt_id) \
                if isinstance(hist, dict) else None
            if entry is None:
                if time.monotonic() > deadline:
                    await _interrupt(server, prompt_id)
                    raise ComfyError(
                        "merged run exceeded %.0fs (interrupt "
                        "delivered)" % max(budget, 2400.0))
                continue
            if err:
                raise ComfyError("ComfyUI run failed: %s" % str(err)[:400])
            status_d = entry.get("status") or {}
            if status_d.get("status_str") == "error":
                msgs = [m for m in (status_d.get("messages") or [])
                        if isinstance(m, list) and len(m) > 1
                        and m[0] == "execution_error"]
                detail = json.dumps(msgs[0][1])[:400] if msgs else \
                    json.dumps(status_d)[:400]
                raise ComfyError("ComfyUI run failed: %s" % detail)
            if not status_d.get("completed", False):
                if time.monotonic() > deadline:
                    await _interrupt(server, prompt_id)
                    raise ComfyError(
                        "merged run exceeded %.0fs (interrupt "
                        "delivered)" % max(budget, 2400.0))
                continue
            # completed -> harvest PER STAGE from the namespaced
            # nodes (each stage's files land in its own sub-dir;
            # _fetch_outputs' shape handling is reused verbatim)
            from pathlib import Path
            out_root = Path(run_dir)
            results: Dict[str, dict] = {}
            all_outputs = entry.get("outputs") or {}
            for r in rows:
                sid = r["stage_id"]
                prefix = sid + "::"
                sub_entry = {"outputs": {
                    k[len(prefix):]: v for k, v in all_outputs.items()
                    if k.startswith(prefix)}}
                stage_dir = out_root / sid
                arts = await asyncio.to_thread(
                    _fetch_outputs, server, stage_dir, sub_entry)
                from native import publish_output_channels
                results[sid] = {
                    "outputs": publish_output_channels(
                        r.get("outputs") or {}, arts),
                    "artifacts": arts}
            return {"stages": results, "prompt_id": prompt_id}
    finally:
        tap.cancel()
        _ACTIVE.pop(str(run_dir), None)
