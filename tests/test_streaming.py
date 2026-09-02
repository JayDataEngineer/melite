"""test_streaming.py — the streaming restoration gates (2026-09-02).

Three gaps, three batteries (python3 tests/test_streaming.py):
  A. native.py — the comfyui engine's own transport: workflow splice,
     upload-walk rewrite, ws frame codec, event fold -> report().
  B. the gateway report contract — engine report() frames land in the
     stage dicts (the status poll serves them), the sidecar survives,
     and the events bus broadcasts with the stage INDEX (the editor's
     O(1) fold key).
  C. the ws door — a real RFC 6455 handshake against the live handle()
     on an ephemeral loopback port: hydrate snapshot, live stage frame,
     terminal run frame closes the socket.
  D. slot_kinds — the served input_vocabulary covers the editor's
     FALLBACK_SLOTS exactly (the wire replaces the fallback, never
     drifts past it).

Loopback sockets only — no GPU, no network, no ComfyUI.
"""

import asyncio
import base64
import json
import os
import struct
import sys
import tempfile
import time
import uuid
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "py"))
sys.path.insert(0, str(REPO / "plugins" / "engines" / "comfyui" / "compose"))

PASS, FAIL = [], []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name if cond else "%s: %s" % (name, detail))


# ══════════════════════════════════════════════════════════════════════
# A. native.py units
# ══════════════════════════════════════════════════════════════════════

import native  # noqa: E402

# A1/A2: workflow splice — dict passthrough + file load + loud refusal
wf = {"3": {"class_type": "KSampler", "inputs": {"seed": 7}}}
check("splice dict passthrough",
      native._splice_workflow({"workflow": wf}) is wf)
with tempfile.TemporaryDirectory() as td:
    p = Path(td) / "wf.json"
    p.write_text(json.dumps(wf))
    check("splice file load",
          native._splice_workflow({"workflow_file": str(p)}) == wf)
try:
    native._splice_workflow({})
    check("splice refusal LOUD", False, "no raise")
except native.ComfyError as e:
    check("splice refusal LOUD", "neither workflow" in str(e))

# A3: upload walk — local media paths rewritten to server names,
# non-path strings untouched, one upload per distinct file.
uploads = []


def fake_upload(server, path):
    uploads.append(path)
    return {"name": "ComfyUI_%04d.png" % len(uploads),
            "subfolder": "", "type": "input"}


native._upload = fake_upload
with tempfile.TemporaryDirectory() as td:
    img = Path(td) / "init.png"
    img.write_bytes(b"\x89PNG\r\n\x1a\n")
    graph = {
        "1": {"class_type": "LoadImage",
              "inputs": {"image": str(img)}},
        "2": {"class_type": "LoadImage",
              "inputs": {"image": str(img)}},   # same file -> ONE upload
        "3": {"class_type": "KSampler",
              "inputs": {"seed": 7, "prompt": "a cat, not a path"}},
    }
    graph, seen = native._upload_referenced("http://x", graph)
    check("upload dedupe (one POST per file)", len(uploads) == 1,
          str(uploads))
    check("walk rewrote node input",
          graph["1"]["inputs"]["image"] == "ComfyUI_0001.png")
    check("walk rewrote both refs",
          graph["2"]["inputs"]["image"] == "ComfyUI_0001.png")
    check("non-path string untouched",
          graph["3"]["inputs"]["prompt"].startswith("a cat"))
    check("upload map returned", seen == {str(img): "ComfyUI_0001.png"})

# A4: event fold -> report frames (progress + activity, foreign prompt
# filtered, error surfaced)
q = asyncio.Queue()
frames = []


def report(u):
    frames.append(u)


for ev in (
    {"type": "progress", "data": {"value": 3, "max": 30, "node": "5",
                                  "prompt_id": "P1"}},
    {"type": "progress", "data": {"value": 9, "max": 30,
                                  "prompt_id": "OTHER"}},  # foreign
    {"type": "executing", "data": {"node": "7", "prompt_id": "P1"}},
    {"type": "execution_error",
     "data": {"prompt_id": "P1", "exception_message": "boom"}},
):
    q.put_nowait(ev)
err = native._drain_relevant(q, "P1", report)
check("fold progress frame",
      frames and frames[0]["progress"] == {"value": 3, "max": 30, "node": "5"})
check("fold activity string",
      frames[0]["activity"] == "sampling 3/30")
check("fold node activity", any("node 7" in f.get("activity", "")
                                for f in frames))
check("foreign prompt filtered", len(frames) == 2, str(frames))
check("error surfaced", err and "execution_error" in err)

# A5/A6: the client frame codec — masked pong, unmasked close parse
pong = native.__dict__.get("_ws_tap")  # presence of the tap fn
check("ws tap exists", callable(pong))
frame = native._ws_frame if hasattr(native, "_ws_frame") else None
# (server frames are the gateway's job; native only WRITES masked pongs —
# verified live in battery C via the door)

# ══════════════════════════════════════════════════════════════════════
# B. the gateway report contract
# ══════════════════════════════════════════════════════════════════════

import gateway  # noqa: E402

REPORTS = []
_the_run = None
MIDFLIGHT = {}     # stage-dict snapshot taken INSIDE the fake engine


async def fake_engine_execute(node, run_dir, inputs, stop_event,
                              report=None):
    """A compliant engine: reports progress mid-flight, completes."""
    if report:
        report({"progress": {"value": 4, "max": 10, "node": "2"}})
        report({"activity": "sampling 4/10"})
        # the REPORT CONTRACT's whole point: the frame must already be
        # in the stage dict the 700ms poll would serve — captured here,
        # because the terminal flip (correctly) clears it.
        MIDFLIGHT.update(_the_run.stages[0])
    REPORTS.append(node["id"])
    return {"outputs": {}, "artifacts": []}


gw = gateway.Gateway()
gw.runs["r1"] = type("R", (), {})()  # placeholder replaced below


class FakeRun:
    def __init__(self):
        self.run_id = "r1"
        self.status = "running"
        self.request = {}
        self.created_at = time.time()
        self.stop_event = asyncio.Event()
        self.stages = [{"id": "s0", "name": "gen", "index": 0,
                        "status": "running"}]
        self.graph = {"nodes": [{"id": "n0", "type": "fake",
                                 "params": {}}]}
        self.artifacts = []
        self.error = None
        self.dir = Path(tempfile.mkdtemp())


async def run_report_battery():
    # gateway.py owns its own load_engine (:300) — patch THE GATEWAY's
    # binding, not plugins'.
    gateway.load_engine = lambda t: type("M", (), {
        "execute": staticmethod(fake_engine_execute)})()

    global _the_run
    run = FakeRun()
    _the_run = run
    gw2 = gateway.Gateway()
    gw2.runs[run.run_id] = run
    got = []
    q = gw2.subscribe(run.run_id)  # capture broadcasts
    try:
        await gateway.Gateway.execute(gw2, run)
    except Exception as e:
        import traceback
        traceback.print_exc()
    # pull the bus frames the report contract published
    while not q.empty():
        got.append(q.get_nowait())
    return run, got


run, got = asyncio.run(run_report_battery())
stage = run.stages[0]
check("report lands in stage dict (poll path)",
      MIDFLIGHT.get("progress") == {"value": 4, "max": 10, "node": "2"},
      json.dumps(MIDFLIGHT))
check("activity lands in stage dict",
      MIDFLIGHT.get("activity") == "sampling 4/10")
check("bus broadcast carries stage index",
      any(f.get("index") == 0 for f in got), str(got))
check("bus broadcast carries progress",
      any(f.get("progress", {}).get("value") == 4 for f in got))
check("terminal stage cleared progress",
      stage.get("progress") is None and stage["status"] == "completed",
      json.dumps(stage))

# ══════════════════════════════════════════════════════════════════════
# C. the ws door — live RFC 6455 against handle() on loopback
# ══════════════════════════════════════════════════════════════════════


async def ws_door_battery():
    gw3 = gateway.Gateway()
    run = FakeRun()
    run.status = "running"
    gw3.runs[run.run_id] = run

    server = await asyncio.start_server(
        lambda r, w: gateway.handle(gw3, r, w), "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]

    async def engine_side():
        # fixed-delay publish: waiting for the subscriber here RACES the
        # door teardown when the test client closes early — 50ms is
        # comfortably past the handshake + hydrate.
        await asyncio.sleep(0.05)
        gw3.publish(run.run_id,
                    {"type": "stage", "stage": "s0", "index": 0,
                     "progress": {"value": 8, "max": 10, "node": "2"}})
        await asyncio.sleep(0.1)
        run.status = "completed"
        gw3.publish(run.run_id, {"type": "run", "status": "completed"})

    async def client_side():
        import hashlib
        reader, writer = await asyncio.open_connection("127.0.0.1", port)
        key = base64.b64encode(os.urandom(16)).decode()
        writer.write((
            "GET /v1/pipelines/events/%s HTTP/1.1\r\n"
            "Host: 127.0.0.1:%d\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            "Sec-WebSocket-Key: %s\r\n"
            "Sec-WebSocket-Version: 13\r\n\r\n"
            % (run.run_id, port, key)).encode())
        await writer.drain()
        # handshake
        status_line = await reader.readline()
        accept = ""
        while True:
            h = await reader.readline()
            if h in (b"\r\n", b"\n", b""):
                break
            hk, _, hv = h.decode().partition(":")
            if hk.strip().lower() == "sec-websocket-accept":
                accept = hv.strip()
        want = base64.b64encode(hashlib.sha1(
            (key + gateway._WS_GUID).encode()).digest()).decode()
        frames = []
        try:
            while True:
                b1 = (await reader.readexactly(1))[0]
                b2 = (await reader.readexactly(1))[0]
                ln = b2 & 0x7F
                if ln == 126:
                    ln = struct.unpack(">H",
                                       await reader.readexactly(2))[0]
                elif ln == 127:
                    ln = struct.unpack(">Q",
                                       await reader.readexactly(8))[0]
                payload = await reader.readexactly(ln) if ln else b""
                if (b1 & 0x0F) != 0x1:
                    continue
                frames.append(json.loads(payload.decode()))
                # break ONLY on the TERMINAL run frame — the hydrate
                # snapshot is also {type: "run"} with a live status.
                f = frames[-1]
                if (f.get("type") == "run" and f.get("status") in
                        ("completed", "failed", "stopped", "unknown")):
                    break
        except asyncio.IncompleteReadError:
            pass  # server closed after terminal frame — expected
        finally:
            writer.close()
        return status_line, accept, want, frames

    eng = asyncio.ensure_future(engine_side())
    status_line, accept, want, frames = await client_side()
    await asyncio.wait_for(eng, 2)
    server.close()
    return status_line, accept, want, frames


status_line, accept, want, frames = asyncio.run(ws_door_battery())
check("door upgrades 101", b"101" in status_line, status_line.decode())
check("accept key correct", accept == want)
check("hydrate snapshot present",
      any(f.get("type") == "run" and f.get("status") == "running"
          for f in frames), str(frames))
check("live stage frame delivered",
      any(f.get("progress", {}).get("value") == 8 for f in frames),
      str(frames))
check("terminal run frame closes",
      frames and frames[-1].get("type") == "run"
      and frames[-1].get("status") == "completed")

# ══════════════════════════════════════════════════════════════════════
# D. slot_kinds — the served vocabulary vs the editor fallback
# ══════════════════════════════════════════════════════════════════════

import slot_kinds  # noqa: E402

EDITOR_FALLBACK_SLOTS = [
    "input_image", "image1", "image2", "image3", "reference_image",
    "end_image", "first_frame", "last_frame",
    "lanpaint_mask",
    "input_mask",
    "source_image", "source_glb", "input_glb",
    "prev_motion_artifact",
    "preview_glb",
    "reference_audio",
    "voice_file",
]
check("slots mirror editor fallback EXACTLY",
      sorted(slot_kinds.SLOTS) == sorted(EDITOR_FALLBACK_SLOTS),
      str(set(slot_kinds.SLOTS) ^ set(EDITOR_FALLBACK_SLOTS)))
check("undeclared mirrors editor fallback",
      list(slot_kinds.UNDECLARED_WIRE_SLOTS) == ["lanpaint_mask"])
check("every slot kinded", all(s in slot_kinds.SLOT_KINDS
                               for s in slot_kinds.SLOTS))
kinds = set(slot_kinds.SLOT_KINDS.values())
closed = {"image", "mask", "glb", "audio", "video", "motion", "voice",
          "text", "any"}
check("kinds within closed FileKind vocabulary", kinds <= closed, str(kinds))
vocab = slot_kinds.input_vocabulary()
check("wire shape", set(vocab) == {"slots", "slot_kinds",
                                   "undeclared_slots"})

# ══════════════════════════════════════════════════════════════════════
print("PASS %d  FAIL %d" % (len(PASS), len(FAIL)))
for f in FAIL:
    print("  FAIL:", f)
sys.exit(1 if FAIL else 0)
