"""_config.py — compose-side data config (input staging only).

The engine-side accessors (server_url/transport/cloud/cli) are EXTINCT:
comfyui-mcp IS the engine (operator order 2026-09-02) and owns where
workflows execute. What compose still needs from data/ is the ComfyUI
input directory — where stage.py drops guide audio and reference
images so the graph's LoadImage/LoadAudio nodes find them.

Candidate order: env COMFYUI_ENDPOINT_CONFIG > plugin data/.
TEST SANDBOX LEAK GATE (INFERENCE_TEST_SANDBOX without the env
refuses ALL on-disk fallbacks — a test gateway must never stage into
the real ComfyUI input dir). The old repo-root `data/` mirror
(BYO-era, stale port 18465) was deleted 2026-09-04 (root-config
era: `inference.config.json` is the SSOT, the plugin's endpoint is
the generated surface the gateway reads).
"""

from __future__ import annotations

import json
import os
from pathlib import Path

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
DATA_CONFIG = PLUGIN_ROOT / "data" / "comfyui_endpoint.json"

# Wire-JSON shape: decoded endpoint-config JSON (objects, arrays, scalars).
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]
JsonDict = dict[str, JsonValue]

_g = None


def load_global_config() -> JsonDict:
    """The endpoint config dict (cached, idempotent, '' when nothing
    resolves — callers fail LOUD; no hardcoded fallback by law)."""
    global _g
    if _g is not None:
        return _g
    cfg = {}
    env_path = os.environ.get("COMFYUI_ENDPOINT_CONFIG", "")
    sandbox = os.environ.get("INFERENCE_TEST_SANDBOX", "")
    if sandbox and not env_path:
        _g = cfg
        return _g
    cands = []
    if env_path:
        cands.append(env_path)
    if not sandbox:
        cands.append(str(DATA_CONFIG))
    for cand in cands:
        p = Path(cand)
        if not p.is_file():
            continue
        try:
            cfg = json.loads(p.read_text())
        except Exception as e:
            # LOUD (2026-09-07 review M2): a PRESENT-but-unreadable
            # config is corruption, not absence — the old silent
            # continue manufactured an empty config out of a typo
            raise RuntimeError(
                "endpoint config %s exists but will not parse (%s: %s)"
                " — fix the file; no silent fallback" % (cand, type(e).__name__, e))
        break
    _g = cfg
    return _g


def input_dir() -> str:
    """The configured ComfyUI input dir ('' when unset — caller fails
    loud; QUEUE LANE LAW: no default)."""
    return str(load_global_config().get("input_dir", "") or "")
