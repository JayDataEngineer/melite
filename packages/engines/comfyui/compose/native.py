"""native.py — the comfyui engine's OWN transport (2026-09-02, the
progress restoration). Replaces mcp.py (comfy-mcp) as THE execution path.

EVIDENCE CHAIN (why native, why the comfy-mcp path had to go):
1. ComfyUI 0.33.0 (execution.py:736) reads extra_data["client_id"] into
   server.client_id for the executing prompt; add_message (:683-684)
   then targets EVERY progress/executing/executed event at that one
   client_id's socket (server.py:1392 self.sockets[sid] — ONE socket
   per id). A passive third-party tap with its own id sees NOTHING.
2. comfy-mcp run_workflow (src/comfy_mcp/server.py:3654) takes NO
   client_id and its own docstring concedes: "comfy-cli's stream
   carries no per-step events for this verb, so in practice a run is
   silent until it finishes."
3. comfy-mcp was not installed on this machine — the mcp path could
   not execute at all, let alone stream.

So the engine owns the transport again (C++ parity, comfyui_plugin.c
:1146 /prompt, :1178 /history, :673 /upload/image, /interrupt) PLUS the
websocket tap the C++ never had: the tap and the submit share ONE
per-run client_id, so ComfyUI targets us with the full event stream —
per-KSampler-step progress included — which rides the `report` callback
into the gateway's stage dicts (poll) and event bus (WS door).

Laws kept:
- QUEUE LANE LAW: no default endpoint — the endpoint config (data/
  comfyui_endpoint.json) names the server; absent = LOUD refusal.
- RESILIENCE LAW: every failure is a named exception string, never a
  bare "failed"; a dropped WS tap never kills the run (/history poll
  is the terminal authority).
- PLUGIN ARCHITECTURE LAW: this module is engine-owned; the gateway
  knows nothing about ComfyUI. `report` is a GENERIC contract.

Gateway ABI (what python/plugins.py executes):
    async execute(node, run_dir, inputs, stop_event, report=None) -> dict
    async stop(params, run_dir)

Test seams: COMFYUI_URL env overrides the endpoint config server (the
offline suite runs a loopback fixture); everything else is stdlib.
"""

from __future__ import annotations

import asyncio
import base64
import json
import mimetypes
import os
import struct
import time
import urllib.request
import urllib.error
import uuid
from collections.abc import Callable
from pathlib import Path

_PLUGIN_ROOT = Path(__file__).resolve().parents[3]
# import mechanics belong to the LOADER (shape law rung 5): it puts the
# engine (compose) dir on sys.path when it loads this module, so the
# sibling `_config` import below resolves without any ritual here.


# Wire-JSON shape: ComfyUI API payloads (prompt graphs, history, events).
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
JsonDict = dict[str, JsonValue]


class ComfyError(Exception):
    """LOUD transport failure (never a silent fallback)."""


# ── config ────────────────────────────────────────────────────────────

def _server_url() -> str:
    """The endpoint SSOT: env seam (tests) > endpoint config. NO default."""
    env = os.environ.get("COMFYUI_URL", "")
    if env:
        return env.rstrip("/")
    import _config
    cfg = _config.load_global_config()
    url = str(cfg.get("url", "") or "").rstrip("/")
    if not url:
        raise ComfyError(
            "no ComfyUI endpoint: the endpoint config carries no 'url' "
            "and COMFYUI_URL is unset (no defaults — QUEUE LANE LAW)")
    return url


# ── blocking HTTP (thread executor; urllib is stdlib) ────────────────

def _http(method: str, url: str, body: bytes | None = None,
          content_type: str = "application/json", timeout: float = 30) -> tuple[int, JsonValue | bytes]:
    """One HTTP request -> (status, parsed_json_or_bytes)."""
    req = urllib.request.Request(url, data=body, method=method)
    if body is not None:
        req.add_header("content-type", content_type)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            status = r.status
    except urllib.error.HTTPError as e:
        raw = e.read()
        status = e.code
    try:
        return status, json.loads(raw.decode() or "null")
    except (ValueError, UnicodeDecodeError):
        return status, raw


def _upload(server: str, path: str) -> dict[str, str]:
    """POST /upload/image (ComfyUI's generic input-file store).
    Returns the server's {name, subfolder, type} placement."""
    data = Path(path).read_bytes()
    ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
    boundary = "----melite" + uuid.uuid4().hex[:12]
    parts = b"--" + boundary.encode() + b"\r\n" \
        b"content-disposition: form-data; name=\"image\"; " \
        b"filename=\"" + os.path.basename(path).encode() + b"\"\r\n" \
        b"content-type: " + ctype.encode() + b"\r\n\r\n" + data + \
        b"\r\n--" + boundary.encode() + b"--\r\n"
    status, out = _http(
        "POST", server + "/upload/image", parts,
        "multipart/form-data; boundary=" + boundary, timeout=180)
    if status != 200 or not isinstance(out, dict) or not out.get("name"):
        raise ComfyError("upload failed (%s %s): %s"
                         % (path, status, str(out)[:200]))
    return out


# ── the websocket tap (RFC 6455 client, stdlib asyncio) ──────────────

async def _ws_tap(server: str, client_id: str,
                  events: "asyncio.Queue[dict[str, JsonValue]]", prompt_id: str) -> None:
    """Connect /ws?clientId=<ours> and queue every JSON event targeted at
    our client_id (progress/executing/executed/...). Read-only: the only
    frames we ever SEND are pong/close (protocol hygiene)."""
    ws_url = server.replace("http://", "ws://", 1) + "/ws?clientId=" + client_id
    host = server.split("//", 1)[1]
    hostname, _, port = host.partition(":")
    port = port or "80"
    key = base64.b64encode(os.urandom(16)).decode()
    reader, writer = await asyncio.open_connection(hostname, int(port))
    writer.write((
        "GET /ws?clientId=%s HTTP/1.1\r\n"
        "Host: %s\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Key: %s\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n"
        % (client_id, host, key)).encode())
    await writer.drain()
    # handshake response (101)
    while True:
        line = await reader.readline()
        if line in (b"\r\n", b"\n", b""):
            break
        if line.startswith(b"HTTP/1.1 ") and not line.startswith(b"HTTP/1.1 101"):
            writer.close()
            raise ComfyError("ws tap handshake refused: %s"
                             % line.decode().strip())
    # read frames until cancelled
    try:
        while True:
            b1 = (await reader.readexactly(1))[0]
            b2 = (await reader.readexactly(1))[0]
            opcode = b1 & 0x0F
            masked = bool(b2 & 0x80)
            length = b2 & 0x7F
            if length == 126:
                length = struct.unpack(">H", await reader.readexactly(2))[0]
            elif length == 127:
                length = struct.unpack(">Q", await reader.readexactly(8))[0]
            mask = await reader.readexactly(4) if masked else None
            payload = await reader.readexactly(length) if length else b""
            if mask:
                payload = bytes(b ^ mask[i % 4]
                                for i, b in enumerate(payload))
            if opcode == 0x9:  # ping -> pong (client frames MUST mask)
                pong_mask = os.urandom(4)
                body = bytes(b ^ pong_mask[i % 4]
                             for i, b in enumerate(payload))
                frame = bytes([0x8A, 0x80 | len(body)]) + pong_mask + body
                writer.write(frame)
                await writer.drain()
                continue
            if opcode == 0x8:  # server close
                break
            if opcode != 0x1:  # text only (binary previews skipped)
                continue
            try:
                ev = json.loads(payload.decode())
            except ValueError:
                continue
            if isinstance(ev, dict) and ev.get("type"):
                await events.put(ev)
    except (asyncio.IncompleteReadError, ConnectionError, OSError):
        return  # tap dropped: /history poll stays authoritative
    finally:
        try:
            writer.close()
        except Exception:
            pass


def _drain_relevant(events: "asyncio.Queue[dict[str, JsonValue]]", prompt_id: str,
                    report: Callable[[dict[str, JsonValue]], None]) -> str | None:
    """Fold queued events into report() calls. Returns an error string if
    the executor signalled one for OUR prompt."""
    err = None
    while not events.empty():
        ev = events.get_nowait()
        t, d = ev.get("type", ""), ev.get("data") or {}
        if d.get("prompt_id") not in (None, prompt_id):
            continue  # another run's prompt (queue concurrency)
        if t == "progress" and isinstance(d.get("value"), (int, float)):
            mx = d.get("max") or 0
            report({
                "progress": {"value": d["value"], "max": mx,
                             "node": str(d.get("node") or "")},
                "activity": "sampling %s/%s" % (int(d["value"]),
                                                int(mx) if mx else "?"),
            })
        elif t == "executing" and d.get("node") is not None:
            report({"activity": "node %s" % d["node"]})
        elif t == "execution_error":
            err = "ComfyUI execution_error: %s" % json.dumps(d)[:400]
    return err


# ── workflow finalization ─────────────────────────────────────────────

# THE ARTIFACT-REF LAW: the upload table is the artifact primitive's
# SSOT (image/video/audio/qvoice extensions; latent NEVER uploads —
# server-local state). No local extension blobs.
from artifact import upload_extensions as _upload_extensions

_MEDIA_EXTS = _upload_extensions()


def _splice_workflow(node_params: dict[str, JsonValue]) -> dict[str, JsonValue]:
    """The final graph: params['workflow'] (the inline dict — compose
    emits the graph) with params['inject'] spliced in. The
    workflow_file path (a file path to JSON) retired 2026-09-07: no
    live card, flow, or overlay emits it (verified: zero emitters in
    tree; kimodo-native flipped to inline, image-gen documents the
    channel retired). A node carrying one refuses LOUD — a stale
    path silently rendering nothing is the silent-wrong-render
    class. Loud refusal when the workflow is absent, or when an
    inject slot targets nothing — a prompt that silently never
    reaches the graph is a silent wrong render (found live
    2026-09-03: the gate lane rendered the template default, not
    the request)."""
    wf = node_params.get("workflow")
    if not isinstance(wf, dict):
        raise ComfyError(
            "node carries no inline workflow — compose must emit the "
            "graph (workflow_file retired 2026-09-07; no silent empty "
            "render)")
    inject = node_params.get("inject") or {}
    if not isinstance(inject, dict):
        raise ComfyError("inject must be an object")
    for slot, value in inject.items():
        node_id, dot, key = str(slot).rpartition(".")
        target = wf.get(node_id)
        if (not dot or not isinstance(target, dict)
                or not isinstance(target.get("inputs"), dict)
                or key not in target["inputs"]):
            raise ComfyError(
                "inject %r targets nothing in the workflow "
                "(node %r has no input %r)" % (slot, node_id, key))
        target["inputs"][key] = value
    return wf


def _upload_referenced(server: str, wf: dict[str, JsonValue]) -> tuple[dict[str, JsonValue], dict[str, str]]:
    """Walk the FINAL graph; every local-media path gets uploaded to
    ComfyUI's input store and rewritten to its server-side name (the
    node-input shape for LoadImage/VHS LoadVideo IS a filename string).
    Absolute paths AND cwd-relative estate paths (data/input/<file>
    — the repo root is the gateway cwd) stage; anything else rides
    through untouched. Returns (rewritten_graph, {abs_path:
    server_name}) — the walk rebuilds containers, so the CALLER must
    use the returned graph (the input dict is left untouched).

    A relative path that resolves to NO file is left alone (the
    start/validate doors own that refusal — EstatePhotoRef; this walk
    never invents errors, it only stages what exists).

    SERVER-PATH READERS ARE EXEMPT: VHS_LoadVideoPath (and the batch
    twin VHS_LoadVideo) validate their `video` value with os.path.isfile
    ON THE SERVER and read the mount directly — an input-store NAME is
    not a path there ("Invalid file path: <basename>", caught live at
    the scail2 canary 2026-09-04). Those inputs keep the absolute mount
    path (same estate — the server sees the same filesystem)."""
    seen = {}

    def walk(v: JsonValue) -> JsonValue:
        if isinstance(v, dict):
            return {k: walk(x) for k, x in v.items()}
        if isinstance(v, list):
            return [walk(x) for x in v]
        if isinstance(v, str):
            p = v.strip()
            if p.lower().endswith(_MEDIA_EXTS):
                # absolute OR cwd-relative (the estate's repo-relative
                # refs — data/input/<file>); keyed by the absolute
                # path so two spellings of one file upload once.
                cand = p if os.path.isabs(p) else os.path.join(
                    os.getcwd(), p)
                if os.path.isfile(cand):
                    if cand not in seen:
                        seen[cand] = _upload(server, cand)["name"]
                    return seen[cand]
        return v

    def walk_node(node: JsonValue) -> JsonValue:
        if not isinstance(node, dict):
            return node
        if str(node.get("class_type", "")) in (
                "VHS_LoadVideoPath", "VHS_LoadVideo"):
            ins = node.get("inputs")
            if isinstance(ins, dict):
                return {**node, "inputs": {
                    k: (x if k == "video" else walk(x))
                    for k, x in ins.items()}}
        return {k: walk(x) for k, x in node.items()}

    return {k: walk_node(v) for k, v in wf.items()}, seen


# ── the engine ABI ────────────────────────────────────────────────────

# run_dir -> {"prompt_id", "client_id", "server"} for the stop door.
_ACTIVE: dict = {}


async def execute(node: NodeRow, run_dir: str | Path, inputs: dict[str, JsonValue],
                  stop_event: asyncio.Event,
                  report: Callable[[dict[str, JsonValue]], None] | None = None
                  ) -> dict[str, JsonValue]:
    """Submit + tap + poll + fetch. The C++ parity flow with the WS tap."""
    def silent(updates: dict[str, JsonValue]) -> None:
        return report(updates) if report else None

    server = _server_url()
    params = dict(node.params or {})
    wf = _splice_workflow(params)
    silent({"activity": "uploading inputs"})
    wf, uploaded = await asyncio.to_thread(_upload_referenced, server, wf)
    if uploaded:
        silent({"activity": "uploaded %d file(s)"
                % len(uploaded)})

    prompt_id = str(uuid.uuid4())
    client_id = "melite-" + uuid.uuid4().hex[:16]
    status, out = await asyncio.to_thread(
        _http, "POST", server + "/prompt",
        json.dumps({"prompt": wf, "prompt_id": prompt_id,
                    "client_id": client_id}).encode())
    if status != 200:
        raise ComfyError("POST /prompt %s: %s" % (status, str(out)[:400]))
    node_errors = (out or {}).get("node_errors") if isinstance(out, dict) else None
    if node_errors:
        raise ComfyError("ComfyUI validation refused the graph: %s"
                         % json.dumps(node_errors)[:400])

    _ACTIVE[str(run_dir)] = {"prompt_id": prompt_id,
                             "client_id": client_id, "server": server}

    events: asyncio.Queue = asyncio.Queue()
    tap = asyncio.create_task(_ws_tap(server, client_id, events, prompt_id))
    silent({"activity": "queued on ComfyUI"})

    timeout_s = float(params.get("timeout_s", 2400) or 2400)
    deadline = time.monotonic() + timeout_s
    err = None
    try:
        while True:
            await asyncio.sleep(0.25)
            err = _drain_relevant(events, prompt_id, silent) or err
            if stop_event.is_set():
                await _interrupt(server, prompt_id)
                raise ComfyError("stopped (interrupt delivered)")
            st, hist = await asyncio.to_thread(
                _http, "GET", server + "/history/" + prompt_id, None,
                "application/json", 30)
            entry = (hist or {}).get(prompt_id) if isinstance(hist, dict) else None
            if entry is None:
                if time.monotonic() > deadline:
                    await _interrupt(server, prompt_id)
                    raise ComfyError(
                        "ComfyUI run exceeded %.0fs (interrupt delivered)"
                        % timeout_s)
                continue
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
                        "ComfyUI run exceeded %.0fs (interrupt delivered)"
                        % timeout_s)
                continue
            # completed -> fetch outputs
            arts = await asyncio.to_thread(_fetch_outputs, server,
                                           run_dir, entry)
            outs = {"prompt_id": prompt_id}
            outs.update(publish_output_channels(
                getattr(node, "outputs", None) or {}, arts))
            return {"outputs": outs,
                    "artifacts": arts, "prompt_id": prompt_id}
    finally:
        tap.cancel()
        _ACTIVE.pop(str(run_dir), None)




# FILE-kind → artifact extensions (engine-outputs mapping, 2026-09-06,
# docs/design/character-pipeline.md §3). The runner hands the stage\u2019s
# DECLARED output channels to the engine ABI NodeRow; after the harvest
# the engine publishes the first UNMATCHED artifact per channel, in
# declaration order. Generic file knowledge — no lane, no node names.
# text/num/lora/seg publish nothing (no file surface on the wire).
_CHANNEL_EXTS = {
    "mesh": (".glb", ".gltf", ".obj", ".fbx", ".usd", ".usdz"),
    "image": (".png", ".jpg", ".jpeg", ".webp"),
    "video": (".mp4", ".webm", ".mov", ".avi", ".mkv"),
    "audio": (".wav", ".mp3", ".ogg", ".flac"),
}


def publish_output_channels(outputs: dict[str, JsonValue], artifacts: list[str]
                            ) -> dict[str, JsonValue]:
    """Harvested artifact paths -> {channel: path} for the FILE-kind
    channels the stage DECLARED (node.outputs: channel -> Kind value).
    First unmatched artifact wins per channel, declaration order — a
    channel with no matching file stays unpublished (the downstream
    resolve_inputs refuses loudly, never a silent empty)."""
    published = {}
    claimed: set = set()
    for channel, kind in (outputs or {}).items():
        exts = _CHANNEL_EXTS.get(kind)
        if not exts:
            continue
        for art in artifacts or []:
            if art in claimed:
                continue
            if str(art).lower().endswith(exts):
                published[channel] = art
                claimed.add(art)
                break
    return published
def _fetch_outputs(server: str, run_dir: str | Path, entry: dict[str, JsonValue]) -> list[str]:
    """history.outputs -> downloaded artifacts under run_dir/."""
    out_dir = Path(run_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    arts = []
    outputs = entry.get("outputs") or {}
    for node_id, node_out in outputs.items():
        if not isinstance(node_out, dict):
            continue
        # images/gifs/audio/video are ComfyUI's UI-facing kinds; "3d"
        # is core's 3D save kind (nodes_save_3d.py: IO.NodeOutput(ui=
        # {"3d": ...})); "three_model" is the ray-era pack convention
        # (kimodo's NPZ / poser GLB surfaces); "result" is
        # Save3DAdvanced's own surface — ONE (filename, subfolder,
        # type) tuple turned a flat JSON list, not a list of rows
        # (caught live at the trellis canary: the .glb existed, the
        # harvest iterated the tuple's elements and skipped them all).
        # "files" is core's text-save surface (nodes_text.py SaveText:
        # ui={"files": [SavedResult(file, subfolder, output)]}) —
        # dict rows (filename/subfolder/type), caught live at the
        # tagger canary (tags_00001.txt existed, harvest skipped it).
        # One harvest, all shapes.
        for kind in ("images", "gifs", "audio", "video",
                     "3d", "three_model", "result", "files"):
            raw = node_out.get(kind) or []
            if kind == "result" and raw and isinstance(raw[0], str):
                raw = [raw]      # flat tuple-row: the whole list IS the row
            for f in raw:
                if isinstance(f, dict):
                    if not f.get("filename"):
                        continue
                    sub = f.get("subfolder") or ""
                    ftype = f.get("type") or "output"
                elif isinstance(f, (list, tuple)) and f and isinstance(
                        f[0], str) and f[0]:
                    sub = f[1] if len(f) > 1 and isinstance(f[1], str) else ""
                    ftype = (f[2] if len(f) > 2 and isinstance(f[2], str)
                             and f[2] else "output")
                else:
                    continue
                name = os.path.basename(f[0] if not isinstance(f, dict)
                                        else f["filename"])
                dest = out_dir / ("%s_%s" % (node_id, name)
                                  if sub else name)
                st, blob = _http(
                    "GET",
                    "%s/view?filename=%s&subfolder=%s&type=%s"
                    % (server, urllib.request.quote(
                           f[0] if not isinstance(f, dict) else f["filename"]),
                       urllib.request.quote(sub), ftype),
                    None, "application/json", 180)
                if st == 200 and isinstance(blob, (dict, list)):
                    # _http json-parses the body when it can — a JSON
                    # artifact (SaveText sidecars) arrives parsed, not as
                    # bytes. Re-serialize (the core pretty-prints
                    # indent=2) instead of silently dropping the file.
                    blob = json.dumps(blob, indent=2,
                                      ensure_ascii=False).encode()
                elif st == 200 and isinstance(blob, str):
                    blob = blob.encode()
                if st == 200 and isinstance(blob, (bytes, bytearray)):
                    dest.write_bytes(blob)
                    arts.append(str(dest))
    return arts


async def _interrupt(server: str, prompt_id: str) -> None:
    """delete-from-queue + interrupt (a queued prompt is not interruptible
    by /interrupt alone)."""
    try:
        await asyncio.to_thread(
            _http, "POST", server + "/queue",
            json.dumps({"delete": [prompt_id]}).encode())
        await asyncio.to_thread(_http, "POST", server + "/interrupt", b"{}")
    except Exception:
        pass  # best-effort; the stop door's /interrupt is audited <6s


async def stop(params: dict[str, JsonValue], run_dir: str | Path) -> None:
    """The stop door: cancel the active prompt for this run dir."""
    slot = _ACTIVE.get(str(run_dir))
    if not slot:
        return
    await _interrupt(slot["server"], slot["prompt_id"])


async def unload() -> None:
    """ENGINE TRANSITION (operator order, 2026-10-02: flows may
    switch engines — 'comfyui calls unload all models to be safe').

    Drops every cached model + the execution cache from VRAM:
    POST /free {"unload_models": true, "free_memory": true}.

    The gateway calls this when the next flow stage lives on a
    DIFFERENT engine; same-engine stages keep the cache (why
    trellis-after-image is fast). Raises ComfyError on a non-2xx so
    the gateway can DOCUMENT a failed unload (RESILIENCE LAW) and
    continue — never silently resident."""
    server = _server_url()
    status, _body = await asyncio.to_thread(
        _http, "POST", server + "/free",
        json.dumps({"unload_models": True,
                    "free_memory": True}).encode())
    if status >= 300:
        raise ComfyError(
            "ComfyUI /free status %d (models may still be resident)"
            % status)
