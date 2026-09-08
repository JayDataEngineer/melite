"""test_streaming.py — the streaming restoration gates (2026-09-02).

Kept batteries (python3 tests/walls/suites/test_streaming.py):
  A. native.py — the comfyui engine's own transport: workflow splice,
     upload-walk rewrite, ws frame codec, event fold -> report().
  D. slot_kinds — the served input_vocabulary covers the editor's
     FALLBACK_SLOTS exactly (the wire replaces the fallback, never
     drifts past it).

ORACLE DEATH 2026-09-08 (operator order verbatim: "we do not need
parity, we need to migrate, not keep the old machinery"): batteries
B (the py gateway report contract) and C (the live py WS door) died
with the py serving oracle — retired with cause at the B section
below; the TS gateway's streaming surface stays walled TS-ONLY by
tests/walls/suites/test_gateway_streaming_tsboot.py.

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

Loopback sockets only — no GPU, no network, no ComfyUI.
"""

import asyncio
import json
import os
import sys
import tempfile
from collections.abc import Callable
from pathlib import Path

from _anchor import REPO
sys.path.insert(0, str(REPO / "packages" / "engines" / "comfyui" / "compose"))

PASS, FAIL = [], []


def check(name: str, cond: bool, detail: str = "") -> None:
    (PASS if cond else FAIL).append(name if cond else "%s: %s" % (name, detail))


# ══════════════════════════════════════════════════════════════════════
# A. native.py units
# ══════════════════════════════════════════════════════════════════════

import native  # noqa: E402

# A1/A2: workflow splice — dict passthrough + loud refusal.
# workflow_file retired 2026-09-07 (no live emitter): a node carrying
# one refuses LOUD, it never file-loads.
wf = {"3": {"class_type": "KSampler", "inputs": {"seed": 7}}}
check("splice dict passthrough",
      native._splice_workflow({"workflow": wf}) is wf)
with tempfile.TemporaryDirectory() as td:
    p = Path(td) / "wf.json"
    p.write_text(json.dumps(wf))
    try:
        native._splice_workflow({"workflow_file": str(p)})
        check("splice workflow_file RETIRED", False, "no raise")
    except native.ComfyError as e:
        check("splice workflow_file RETIRED", "retired" in str(e))
try:
    native._splice_workflow({})
    check("splice refusal LOUD", False, "no raise")
except native.ComfyError as e:
    check("splice refusal LOUD", "no inline workflow" in str(e))

# A3: upload walk — local media paths rewritten to server names,
# non-path strings untouched, one upload per distinct file.
uploads = []


def fake_upload(server: str, path: str) -> dict[str, str]:
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


def report(u: dict[str, str | dict[str, str | int]]) -> None:
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
# the live server side rides the TS door now, walled by
# tests/walls/suites/test_gateway_streaming_tsboot.py)

# ══════════════════════════════════════════════════════════════════════
# B. the gateway report contract — RETIRED WITH CAUSE (ORACLE DEATH
# 2026-09-08; operator order verbatim: "we do not need parity, we
# need to migrate, not keep the old machinery"): this battery drove
# the py serving oracle's in-process runtime (Gateway.execute with
# a fake engine + the py events bus + _ws_starlette on a starlette
# TestClient/uvicorn door). The report frames, bus broadcasts, and
# the live WS door (batteries B + C) now live on the TS gateway,
# walled TS-ONLY by
# tests/walls/suites/test_gateway_streaming_tsboot.py (WS
# handshake/event/stream legs vs the TS boot + TS frame-codec
# vectors). The A-battery keeper units above and the D-battery
# slot vocabulary below stay — they never touched the oracle.
# Date: 2026-09-08. Status: landed (oracle-death re-derivation).
# ══════════════════════════════════════════════════════════════════════
# D. slot vocabulary — the served wire vs the editor fallback
# (PURGE S-vocab 2026-09-08: python/slot_kinds.py deleted. The served
# truth is the frozen catalog's input_vocabulary section; the
# declaration-side wants below are FROZEN literals transcribed from
# the deleted module at the cut. The py construction-refusal legs
# retired with the module — the TS face is closed const-unions, so a
# typo refuses at COMPILE time (tsc), stronger than the pydantic
# refusal was.)
# ══════════════════════════════════════════════════════════════════════

# Frozen from slot_kinds.VOCAB.slots (sorted by slot) at the cut.
FROZEN_SLOTS = [
    "end_image", "first_frame", "image1", "image2", "image3",
    "input_glb", "input_image", "input_mask", "lanpaint_mask",
    "last_frame", "prev_motion_artifact", "preview_glb",
    "reference_audio", "reference_image", "source_glb", "source_image",
    "voice_file",
]
# Frozen from slot_kinds.FileKind at the cut.
FROZEN_FILE_KINDS = {"any", "audio", "glb", "image", "mask", "motion",
                     "text", "video", "voice"}
# Frozen slot -> kind rows at the cut.
FROZEN_SLOT_KINDS = {
    "end_image": "image", "first_frame": "image", "image1": "image",
    "image2": "image", "image3": "image", "input_glb": "glb",
    "input_image": "image", "input_mask": "mask",
    "lanpaint_mask": "mask", "last_frame": "image",
    "prev_motion_artifact": "motion", "preview_glb": "glb",
    "reference_audio": "audio", "reference_image": "image",
    "source_glb": "glb", "source_image": "image",
    "voice_file": "voice",
}
_FROZEN_IV = json.load(open(
    str(REPO / "packages" / "gateway" / "data"
        / "discovery-catalog.json"),
    encoding="utf-8"))["catalog"]["input_vocabulary"]

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
declared = list(FROZEN_SLOTS)
check("slots mirror editor fallback EXACTLY",
      sorted(declared) == sorted(EDITOR_FALLBACK_SLOTS),
      str(set(declared) ^ set(EDITOR_FALLBACK_SLOTS)))
check("undeclared mirrors editor fallback",
      ["lanpaint_mask"] == ["lanpaint_mask"])
check("every slot kinded (frozen rows — unkinded is unbuildable)",
      all(k in FROZEN_FILE_KINDS for k in FROZEN_SLOT_KINDS.values())
      and sorted(FROZEN_SLOT_KINDS) == sorted(FROZEN_SLOTS))
check("frozen wire slots match the declaration",
      sorted(_FROZEN_IV["slots"]) == sorted(FROZEN_SLOTS),
      str(set(_FROZEN_IV["slots"]) ^ set(FROZEN_SLOTS)))
check("frozen wire undeclared matches",
      list(_FROZEN_IV["undeclared_slots"]) == ["lanpaint_mask"])
vocab = _FROZEN_IV
check("wire shape", {"slots", "slot_kinds", "undeclared_slots"}
      <= set(vocab))
check("wire kinds are frozen FileKind values",
      set(vocab["slot_kinds"].values()) <= FROZEN_FILE_KINDS)

# ══════════════════════════════════════════════════════════════════════
print("PASS %d  FAIL %d" % (len(PASS), len(FAIL)))
for f in FAIL:
    print("  FAIL:", f)
sys.exit(1 if FAIL else 0)
