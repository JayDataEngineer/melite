"""card_compose hook loader — the PLUGIN ARCHITECTURE LAW port.

The C server dlopen()s build/*_plugin.so and calls each plugin's
optional card_compose symbol at run registration (phase 1: run_id=''
validates and returns extra run inputs; phase 2: real run_id rewrites
the graph in place). This module does the same from Python via ctypes,
so card-bearing lanes (h3 timeline, music/sfx) survive the gateway
rewrite unchanged. The core still names no lane: knowledge lives in
the plugin .so, exactly as before.
"""

from __future__ import annotations

import ctypes
import json
from pathlib import Path

BUILD_DIR = Path(__file__).resolve().parent.parent / "build"
YAML_CAP = 262144      # graph buffer (256 KiB — estate graphs are KBs)
EXTRA_CAP = 65536      # extra-inputs buffer


class HookError(Exception):
    """Loud composition failure — the caller rejects the run."""


_hooks = None


def load_card_hooks():
    """Scan built plugin libs; keep those exporting card_compose."""
    global _hooks
    if _hooks is not None:
        return _hooks
    _hooks = []
    if not BUILD_DIR.is_dir():
        return _hooks
    for so in sorted(BUILD_DIR.glob("*_plugin.so")):
        try:
            lib = ctypes.CDLL(str(so))
            fn = lib.card_compose
        except AttributeError:
            continue
        except OSError:
            continue
        fn.restype = ctypes.c_int
        fn.argtypes = [
            ctypes.c_char_p, ctypes.c_char_p, ctypes.c_char_p,
            ctypes.c_char_p, ctypes.c_size_t,
            ctypes.c_char_p, ctypes.c_char_p, ctypes.c_size_t,
        ]
        _hooks.append((so.name, fn))
    return _hooks


# engine type -> owning .so (from plugins/*/plugin.yaml engines: lists;
# the C server dispatches card_compose by the graph's engine type —
# same law here. Only these libs export card_compose today.)
SO_ENGINE_OWNERS = {
    "audio_plugin.so": ("audio_cpp", "audio"),
    "comfyui_plugin.so": ("comfyui",),
    "anny_plugin.so": ("anny",),
    "echo_plugin.so": ("echo",),
    "ffmpeg_concat_plugin.so": ("concat",),
    "kimodo_engine.so": ("kimodo_engine",),
    "trellis_native_plugin.so": ("trellis2",),
    "crop_stitch_plugin.so": ("crop_stitch", "sam3"),
}


def compose(body: dict, model: str, run_id: str, yaml_text: str,
            engine_types):
    """Run the OWNING plugin's card_compose over the graph.

    Dispatch mirrors the C server: the hook is selected by the graph's
    engine type, never broadcast. A -1 return is a LOUD refusal
    (HookError) — never a silent drop. Returns (yaml_text, extra).
    """
    hooks = load_card_hooks()
    if not hooks or not engine_types:
        return yaml_text, {}
    body_b = json.dumps(body).encode()
    model_b = model.encode()
    rid_b = run_id.encode()
    extra = {}
    for name, fn in hooks:
        owns = SO_ENGINE_OWNERS.get(name, ())
        if not any(t in owns for t in engine_types):
            continue
        buf = ctypes.create_string_buffer(yaml_text.encode(), YAML_CAP)
        extra_buf = ctypes.create_string_buffer(EXTRA_CAP)
        rc = fn(body_b, model_b, rid_b, buf, YAML_CAP, b"", extra_buf, EXTRA_CAP)
        if rc != 0:
            # -1 seam 500, -2 carry range 400, -3 carry/tile 400,
            # -4 window cap 400, -5 buffer 500 — every code is LOUD
            detail = extra_buf.value.decode(errors="replace")[:500]
            raise HookError("card_compose rc=%d (%s): %s" % (rc, name, detail or "no detail"))
        if rc == 0:
            new_text = buf.value.decode(errors="replace")
            if new_text != yaml_text:
                yaml_text = new_text   # rewritten in place by the owner
            tail = extra_buf.value.decode(errors="replace").strip()
            if tail:
                try:
                    extra.update(json.loads(tail))
                except json.JSONDecodeError:
                    pass
    return yaml_text, extra
