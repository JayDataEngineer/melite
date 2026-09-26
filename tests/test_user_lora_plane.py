"""THE USER-LORA PLANE — the operator's question ("add custom loras
from the user perspective", 2026-09-26) answered with a door.

Function-grain over the pure seams: a user rows file is VALIDATED (a
bad row never takes the good ones down), the engine's LoRA combo is
read as a FACT from the node declaration (never guessed), a row whose
file the engine does not have is named before it costs a run, and the
file door COPIES a LoRA the operator already has — nothing here ever
fetches, which is the operator's standing law.

The TS module under proof is packages/engines/comfyui-cordis/src/userLoras.ts
(importlib load; the module imports only node builtins, so no engine,
no torch, no ComfyUI is needed to run these walls).
"""

import importlib.util
import json
import sys
from pathlib import Path

import pytest


REPO = Path(__file__).resolve().parents[1]
MODULE_PATH = REPO / "packages" / "engines" / "comfyui-cordis" / "src" / "userLoras.ts"


def _ts():
    """Load the TS module. Node's strip-types loader is the door's own
    runtime, so the walls go through it (the same seam the lane harness
    walls pin) rather than a second parser."""
    return None  # replaced below by the node bridge


def _node_eval(expression: str, tmp: Path) -> str:
    """Evaluate a TS expression in the module through node."""
    import subprocess

    script = tmp / "eval.mts"
    script.write_text(
        "import * as m from 'file://" + str(MODULE_PATH) + "'\n"
        "const out = await (async () => { return (" + expression + ") })()\n"
        "process.stdout.write(typeof out === 'string' ? out : JSON.stringify(out))\n",
        encoding="utf-8",
    )
    done = subprocess.run(
        ["node", "--experimental-strip-types", str(script)],
        capture_output=True,
        text=True,
        cwd=str(REPO),
        timeout=120,
    )
    assert done.returncode == 0, done.stderr[-2000:]
    return done.stdout


def test_the_module_loads_through_the_doors_own_loader(tmp_path):
    out = _node_eval("Object.keys(m).sort()", tmp_path)
    names = json.loads(out)
    for fn in (
        "readUserLoraRows",
        "loraNamesFromObjectInfo",
        "unboardedRows",
        "installUserLora",
        "userLoraFlavor",
        "validateUserLoraRow",
    ):
        assert fn in names, f"{fn} must be exported (the door names it)"


def test_a_user_rows_file_becomes_a_picker_row(tmp_path):
    rows = tmp_path / "loras.json"
    rows.write_text(
        json.dumps(
            [
                {
                    "id": "my_style",
                    "filename": "mine/my_style.safetensors",
                    "families": ["z-image"],
                    "label": "My Style",
                    "category": "style",
                    "default_strength": 0.85,
                }
            ]
        ),
        encoding="utf-8",
    )
    out = _node_eval(
        f"m.readUserLoraRows({json.dumps(str(rows))})", tmp_path
    )
    parsed = json.loads(out)
    assert parsed["absent"] is False
    assert parsed["problems"] == []
    assert parsed["rows"][0]["id"] == "my_style"
    assert parsed["rows"][0]["default_strength"] == 0.85

    flavor = _node_eval(
        f"m.userLoraFlavor(m.readUserLoraRows({json.dumps(str(rows))}))", tmp_path
    )
    f = json.loads(flavor)
    assert f["pack"] == "loras"
    assert f["runtimeCatalog"] is True
    assert f["families"] == ["z-image"]
    assert f["rows"][0]["filename"] == "mine/my_style.safetensors"


def test_a_bad_row_is_named_and_the_good_rows_still_serve(tmp_path):
    rows = tmp_path / "loras.json"
    rows.write_text(
        json.dumps(
            [
                {"id": "good", "filename": "a/good.safetensors", "families": ["z-image"]},
                {"id": "no-families", "filename": "b/x.safetensors"},
                {"id": "not-a-lora", "filename": "b/y.png", "families": ["z-image"]},
                {"filename": "b/z.safetensors", "families": ["z-image"]},
                {"id": "ok2", "filename": "c/ok2.ckpt", "families": ["krea-2", "h3"]},
            ]
        ),
        encoding="utf-8",
    )
    parsed = json.loads(
        _node_eval(f"m.readUserLoraRows({json.dumps(str(rows))})", tmp_path)
    )
    assert [r["id"] for r in parsed["rows"]] == ["good", "ok2"]
    joined = " | ".join(parsed["problems"])
    assert "families is required" in joined
    assert "must be a LoRA file" in joined
    assert "id is required" in joined
    # both families ride one row
    assert parsed["rows"][1]["families"] == ["krea-2", "h3"]


def test_an_absent_or_malformed_file_is_not_an_error(tmp_path):
    parsed = json.loads(
        _node_eval(
            f"m.readUserLoraRows({json.dumps(str(tmp_path / 'nope.json'))})", tmp_path
        )
    )
    assert parsed["absent"] is True
    assert parsed["rows"] == []
    assert parsed["problems"] == []

    junk = tmp_path / "junk.json"
    junk.write_text("{not json", encoding="utf-8")
    parsed = json.loads(_node_eval(f"m.readUserLoraRows({json.dumps(str(junk))})", tmp_path))
    assert parsed["absent"] is False
    assert "not JSON" in " ".join(parsed["problems"])

    wrong = tmp_path / "wrong.json"
    wrong.write_text(json.dumps({"nope": True}), encoding="utf-8")
    parsed = json.loads(_node_eval(f"m.readUserLoraRows({json.dumps(str(wrong))})", tmp_path))
    assert "must be an array of rows" in " ".join(parsed["problems"])

    # the wrapped shape serves too
    wrapped = tmp_path / "wrapped.json"
    wrapped.write_text(
        json.dumps({"rows": [{"id": "w", "filename": "w/w.safetensors", "families": ["h3"]}]}),
        encoding="utf-8",
    )
    parsed = json.loads(_node_eval(f"m.readUserLoraRows({json.dumps(str(wrapped))})", tmp_path))
    assert [r["id"] for r in parsed["rows"]] == ["w"]


def test_the_combo_is_a_fact_read_from_the_node_declaration():
    info = {
        "LoraLoaderModelOnly": {
            "input": {
                "required": {
                    "lora_name": [["h3/one.safetensors", "z-image/two.safetensors"], {}],
                    "strength_model": [1.0, {}],
                }
            }
        }
    }
    out = _node_eval(f"m.loraNamesFromObjectInfo({json.dumps(info)})", REPO)
    assert json.loads(out) == ["h3/one.safetensors", "z-image/two.safetensors"]


def test_a_hostile_object_info_answers_empty_never_throws():
    for junk in [None, [], "x", 7, {}, {"LoraLoaderModelOnly": None},
                 {"LoraLoaderModelOnly": {"input": []}},
                 {"LoraLoaderModelOnly": {"input": {"required": {"lora_name": "nope"}}}},
                 {"LoraLoaderModelOnly": {"input": {"required": {"lora_name": [[{"a": 1}], {}]}}}}]:
        out = _node_eval(f"m.loraNamesFromObjectInfo({json.dumps(junk)})", REPO)
        assert json.loads(out) == [], junk


def test_a_row_the_engine_lacks_is_named_before_it_costs_a_run():
    rows = [
        {"id": "known", "filename": "h3/one.safetensors", "families": ["h3"]},
        {"id": "unknown", "filename": "mine/new.safetensors", "families": ["h3"]},
    ]
    combo = ["h3/one.safetensors"]
    out = _node_eval(
        f"m.unboardedRows({json.dumps(rows)}, {json.dumps(combo)})", REPO
    )
    problems = json.loads(out)
    assert len(problems) == 1
    assert "unknown" in problems[0]
    assert "mine/new.safetensors" in problems[0]
    # an empty combo (engine down) proves nothing and refuses nothing
    out = _node_eval(f"m.unboardedRows({json.dumps(rows)}, {json.dumps([])})", REPO)
    assert json.loads(out) == []


def test_the_file_door_COPIES_a_lora_and_never_fetches(tmp_path):
    import subprocess

    src = tmp_path / "my_lora.safetensors"
    src.write_bytes(b"fake-weights" * 100)
    engine_dir = tmp_path / "engine" / "loras"
    out = _node_eval(
        f"m.installUserLora({json.dumps(str(src))}, {json.dumps(str(engine_dir))})",
        tmp_path,
    )
    result = json.loads(out)
    assert result["ok"] is True
    assert result["filename"] == "my_lora.safetensors"
    assert (engine_dir / "my_lora.safetensors").exists()
    assert (engine_dir / "my_lora.safetensors").read_bytes() == src.read_bytes()

    # the refusals are loud: missing source, a directory, a non-LoRA
    missing = json.loads(
        _node_eval(
            f"m.installUserLora({json.dumps(str(tmp_path / 'nope.safetensors'))}, {json.dumps(str(engine_dir))})",
            tmp_path,
        )
    )
    assert missing["ok"] is False and "no such file" in missing["reason"]
    a_dir = json.loads(
        _node_eval(
            f"m.installUserLora({json.dumps(str(tmp_path))}, {json.dumps(str(engine_dir))})",
            tmp_path,
        )
    )
    assert a_dir["ok"] is False and "not a file" in a_dir["reason"]
    png = tmp_path / "not.png"
    png.write_bytes(b"x")
    wrong = json.loads(
        _node_eval(
            f"m.installUserLora({json.dumps(str(png))}, {json.dumps(str(engine_dir))})",
            tmp_path,
        )
    )
    assert wrong["ok"] is False and "not a LoRA file" in wrong["reason"]


def test_an_empty_rows_file_registers_no_flavor():
    out = _node_eval("m.userLoraFlavor({rows: [], problems: [], absent: true, path: 'x'})", REPO)
    assert json.loads(out) is None

def test_the_BYTES_door_writes_a_browser_upload_into_the_loras_dir(tmp_path):
    """THE CIVIT FLOW: civit.ai serves downloads behind Cloudflare +
    a per-account key, and the standing law forbids the estate
    fetching a LoRA — so the USER'S BROWSER downloads it and the
    bytes arrive as the uploads rail's own data-URL spelling."""
    import base64

    payload = base64.b64encode(b"fake-lora-weights" * 500).decode("ascii")
    engine_dir = tmp_path / "loras"
    out = _node_eval(
        "m.installUserLoraBytes("
        + json.dumps("my_lora.safetensors")
        + ", "
        + json.dumps("data:application/octet-stream;base64," + payload)
        + ", "
        + json.dumps(str(engine_dir))
        + ")",
        tmp_path,
    )
    result = json.loads(out)
    assert result["ok"] is True
    assert result["filename"] == "my_lora.safetensors"
    landed = engine_dir / "my_lora.safetensors"
    assert landed.exists()
    assert landed.read_bytes() == b"fake-lora-weights" * 500


def test_the_bytes_door_refuses_loudly_never_a_partial_write(tmp_path):
    engine_dir = tmp_path / "loras"
    cases = [
        ("", "data:application/octet-stream;base64,QUJD", "filename is required"),
        ("x.png", "data:application/octet-stream;base64,QUJD", "not a LoRA file"),
        ("ok.safetensors", "no-comma-here", "did not arrive as a data URL"),
        ("ok.safetensors", "data:application/octet-stream,QUJD", "base64 data URLs"),
        ("ok.safetensors", "data:x;base64,", "no bytes"),
    ]
    for name, data, expect in cases:
        out = _node_eval(
            f"m.installUserLoraBytes({json.dumps(name)}, {json.dumps(data)}, {json.dumps(str(engine_dir))})",
            tmp_path,
        )
        result = json.loads(out)
        assert result["ok"] is False, name
        assert expect in result["reason"], (name, result["reason"])
    # nothing half-written by any of the refusals
    assert not engine_dir.exists() or list(engine_dir.iterdir()) == []


def test_the_bytes_door_refuses_over_the_cap_before_decoding(tmp_path):
    """The cap is checked on the base64 LENGTH, before any decode —
    an oversize upload must not become an OOM in the door."""
    engine_dir = tmp_path / "loras"
    cap = json.loads(_node_eval("m.LORA_BYTES_CAP", REPO))
    assert cap == 512 * 1024 * 1024
    # one character past the cap's base64 budget: refused on the cap,
    # with nothing written
    payload_len = int((cap * 4) / 3) + 16
    out = _node_eval(
        "m.installUserLoraBytes("
        + json.dumps("big.safetensors")
        + ", "
        + json.dumps("data:application/octet-stream;base64," + "A" * 16)
        + ", "
        + json.dumps(str(engine_dir))
        + ", " + str(payload_len) + ")",
        REPO,
    )
    result = json.loads(out)
    assert result["ok"] is False
    assert "cap" in result["reason"]
    assert not engine_dir.exists() or list(engine_dir.iterdir()) == []
