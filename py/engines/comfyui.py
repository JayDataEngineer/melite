"""comfyui engine — submits a workflow json to the serving ComfyUI,
splices inject values, polls to completion, stages artifacts into the run
dir. Mirrors the C plugin's contract (server_url/workflow_file/inject/
out_dir/timeout_s) with LOUD refusals instead of defaults (QUEUE LANE LAW).
"""

from __future__ import annotations

import asyncio
import json
import time
import urllib.request
import uuid
from pathlib import Path


class EngineError(Exception):
    pass


def _post(url, payload, timeout=15):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"content-type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode() or "{}")


def _get(url, timeout=10):
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return json.loads(r.read().decode() or "{}")


def _splice(workflow, inject):
    for slot, value in inject.items():
        # node ids may contain dots ("CLIPTextEncode.0") — the input key
        # is always the segment AFTER the last dot.
        key, _, _rev = slot.rpartition(".")
        node_id, _, key2 = None, None, None
        parts = slot.split(".")
        for i in range(1, len(parts)):
            cand = ".".join(parts[:i])
            if cand in workflow:
                node_id = cand
                key = ".".join(parts[i:])
        if node_id is None:
            node_id = ".".join(parts[:-1])
            key = parts[-1]
        if node_id not in workflow or not isinstance(workflow[node_id], dict):
            raise EngineError("inject %s: no workflow node %r" % (slot, node_id))
        if key not in workflow[node_id].get("inputs", {}):
            raise EngineError("inject %s: node %r has no input %r" % (slot, node_id, key))
        workflow[node_id]["inputs"][key] = value
    return workflow


async def execute(node, run_dir, inputs, stop_event):
    p = node.get("params", {})
    server_url = p.get("server_url")
    workflow_file = p.get("workflow_file")
    if not server_url:
        raise EngineError("comfyui: server_url is required (no hardcoded default)")
    if not workflow_file:
        raise EngineError("comfyui: workflow_file is required")
    wf_path = Path(workflow_file)
    if not wf_path.is_file():
        raise EngineError("comfyui: workflow_file %s not found" % workflow_file)
    workflow = json.loads(wf_path.read_text())
    inject = p.get("inject", {})
    workflow = _splice(workflow, inject)
    persisted = Path(run_dir) / ("_comfyui_%s.json" % node["id"])
    persisted.write_text(json.dumps(workflow, indent=2))

    timeout_s = float(p.get("timeout_s", 1800))
    prompt_id = str(uuid.uuid4())
    t0 = time.time()
    try:
        sub = _post(server_url.rstrip("/") + "/prompt", {"prompt": workflow, "client_id": "py-gateway"})
    except Exception as e:
        raise EngineError("comfyui submit failed: %s" % e)
    if "error" in sub or sub.get("node_errors"):
        raise EngineError("comfyui REFUSED: %s" % json.dumps(sub)[:2000])
    prompt_id = sub.get("prompt_id", prompt_id)

    def poll():
        return _get(server_url.rstrip("/") + "/history/" + prompt_id, timeout=10)

    outputs = {}
    artifacts = []
    while True:
        if stop_event.is_set():
            try:
                _post(server_url.rstrip("/") + "/interrupt", {})
            except Exception:
                pass
            raise EngineError("stopped by stop door")
        if time.time() - t0 > timeout_s:
            try:
                _post(server_url.rstrip("/") + "/interrupt", {})
            except Exception:
                pass
            raise EngineError("comfyui timeout after %ss" % timeout_s)
        hist = await asyncio.get_event_loop().run_in_executor(None, poll)
        entry = hist.get(prompt_id)
        if entry:
            status = entry.get("status", {})
            if status.get("status_str") == "error":
                msgs = []
                for nid, nd in entry.get("status", {}).get("messages", []):
                    pass
                raise EngineError("comfyui EXECUTION ERROR: %s" % json.dumps(status)[:2000])
            outputs = entry.get("outputs", {})
            break
        await asyncio.sleep(1.0)

    # stage artifacts: scan the WHOLE history json for filename triples
    # (the C plugin's contract — island OUTPUT_NODEs surface npz under
    # custom UI keys, so known-key lists miss them) and fetch via /view.
    hist_text = json.dumps(entry)
    triples = []
    idx = 0
    while True:
        fn = hist_text.find('"filename"', idx)
        if fn < 0:
            break
        window = hist_text[fn:fn + 800]
        def near(key, default):
            k = window.find('"%s"' % key)
            if k < 0:
                return default
            s = window.find('"', k + len(key) + 3)
            e = window.find('"', s + 1)
            return window[s + 1:e] if s >= 0 and e > s else default
        triples.append((near('filename', ''), near('subfolder', ''), near('type', 'output')))
        idx = fn + 10
    for count, (fname, subf, t) in enumerate(triples):
        if not fname:
            continue
        url = ("%s/view?filename=%s&subfolder=%s&type=%s"
               % (server_url.rstrip('/'), fname, subf, t))
        try:
            with urllib.request.urlopen(url, timeout=300) as resp:
                data = resp.read()
            base = fname.rsplit('/', 1)[-1]
            dest = Path(run_dir) / ("%s_%d_%s" % (prompt_id, count, base))
            dest.write_bytes(data)
            artifacts.append({"path": str(dest), "bytes": len(data)})
        except Exception:
            continue
    outputs = {}
    for a in artifacts:
        base = a["path"].rsplit("/", 1)[-1].lower()
        fam = ""
        if base.endswith((".mp4", ".webm", ".mkv")):
            fam = "video"
        elif base.endswith((".png", ".jpg", ".jpeg", ".webp")):
            fam = "image"
        elif base.endswith((".flac", ".wav", ".mp3", ".ogg")):
            fam = "audio"
        if fam:
            outputs.setdefault("%s_0" % fam, a["path"])
    return {"outputs": outputs, "artifacts": artifacts}


async def stop(node, run_dir):
    server_url = node.get("params", {}).get("server_url")
    if server_url:
        try:
            _post(server_url.rstrip("/") + "/interrupt", {})
        except Exception:
            pass
