"""comfy harvest wall (skin-card stroke 2): JSON artifacts survive _http.

The skin proof run wrote kind.json on ComfyUI but the harvest dropped
it: _http json-parses any parseable body, so a JSON artifact arrives
as a dict — and _fetch_outputs kept bytes only, silently. No GPU, no
server: stub _http, prove dict/str/bytes blobs all land as files.
"""

import importlib.util
import json
import os
import sys
from pathlib import Path
from types import ModuleType

from _anchor import REPO

# Harvest blobs are decoded JSON, text, or raw bytes (no
# future-import in this module — old-style alias).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None


def _native() -> ModuleType:
    p = os.path.join(REPO, "packages", "engines", "comfyui", "compose")
    if p not in sys.path:
        sys.path.insert(0, p)
    spec = importlib.util.spec_from_file_location(
        "native_harvest_w", os.path.join(p, "native.py"))
    mod = importlib.util.module_from_spec(spec)
    sys.modules["native_harvest_w"] = mod
    spec.loader.exec_module(mod)
    return mod


def test_json_str_bytes_blobs_all_land(tmp_path: Path) -> None:
    native = _native()
    sidecar = {"kind": "keeper", "tint": [0.85, 0.7, 0.55]}
    calls = []

    def _fake_http(method: str, url: str, body: bytes | dict[str, JsonValue] | None = None,
                   content_type: str = "application/json",
                   timeout: float = 30) -> tuple[int, JsonValue | bytes]:
        calls.append(url)
        if "kind" in url:
            return 200, dict(sidecar)
        if "note" in url:
            return 200, "plain text artifact"
        return 200, b"\x89PNG-binary"

    native._http = _fake_http
    entry = {"outputs": {
        "11": {"files": [{"filename": "out_kind_00001.json",
                             "subfolder": "", "type": "output"}]},
        "12": {"files": [["note_00001.txt", "", "output"]]},
        "13": {"images": [{"filename": "view_00001.png",
                              "subfolder": "", "type": "output"}]},
    }}
    arts = native._fetch_outputs("http://x", str(tmp_path), entry)
    assert len(arts) == 3, arts
    assert json.loads((tmp_path / "out_kind_00001.json").read_text()) == sidecar
    assert (tmp_path / "note_00001.txt").read_text() == "plain text artifact"
    assert (tmp_path / "view_00001.png").read_bytes() == b"\x89PNG-binary"
