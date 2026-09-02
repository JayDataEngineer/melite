"""test_co_script_parity_cards.py — card arms vs the old splice path.

The generate/edit/music card arms render through the GENERIC co_script
constructor + each model's co_script_renderer.py (params.workflow,
values baked). Acceptance: the rendered graph is ISOMORPHIC to the OLD
workflow_file+inject channel's delivered graph — template + splice with
the same string-form values the composers bake (the run-inputs SSOT
forms the old $-resolution produced).

Offline: pinned object_info.json, no GPU, no network.
"""

import copy
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
PLUGIN = REPO / "plugins" / "engines" / "comfyui"
sys.path.insert(0, str(REPO / "py"))
sys.path.insert(0, str(REPO / "plugins" / "engines" / "comfyui" / "compose"))
sys.path.insert(0, str(PLUGIN))

from co_script.parity import diff, reachable  # noqa: E402

OI = json.loads((PLUGIN / "data" / "object_info.json").read_text())

PASS, FAIL = [], []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name if cond else "%s: %s" % (name, detail))


def apply_inject(template, inject):
    """The old-path splice (what engine._splice did)."""
    wf = copy.deepcopy(template)
    for slot, value in inject.items():
        parts = slot.split(".")
        node_id = None
        for i in range(1, len(parts)):
            cand = ".".join(parts[:i])
            if cand in wf:
                node_id = cand
                field = ".".join(parts[i:])
        if node_id is None:
            raise AssertionError("old-path: inject %s hits no node" % slot)
        inputs = wf[node_id].get("inputs", {})
        if field not in inputs:
            raise AssertionError("old-path: inject %s hits no input" % slot)
        inputs[field] = value
    return wf


def composed_workflow(body, model, run_id):
    """The REAL composer output: phase-2 through the plugin bus."""
    import plugins  # noqa: F401  (bus loads the owning plugin)
    mod = plugins.load_compose("comfyui")
    rc, yml, extra, err = mod.card_compose(body, model, run_id, "x")
    assert rc == 0, "compose refused: %s" % err
    node = json.loads(yml)["nodes"][0]
    assert "workflow" in node["params"], "no baked workflow in params"
    assert "workflow_file" not in node["params"], "legacy channel leaked"
    return node["params"]["workflow"]


def parity(name, tpl_rel, body, model, run_id, inject):
    tpl = json.loads((PLUGIN / tpl_rel).read_text())
    old = reachable(apply_inject(tpl, inject), OI)
    new = reachable(composed_workflow(body, model, run_id), OI)
    d = diff(old, new)
    print("  %-24s %s (old %d / new %d nodes)" % (
        name, "ISOMORPHIC" if d["isomorphic"] else "DIFF", len(old), len(new)))
    if not d["isomorphic"]:
        print("      a_only:", d["a_only"][:8])
        print("      b_only:", d["b_only"][:8])
    check(name, d["isomorphic"],
          "a_only=%s b_only=%s" % (d["a_only"][:6], d["b_only"][:6]))


# 1. krea-2 t2i, defaults + seed
parity("krea-2 t2i basic", "models/image/krea-2/generate_t2i.json",
       {"model": "krea-2", "params": {"prompt": "a red fox in snow",
                                        "seed": 7}},
       "krea-2", "run-P1", {
           "CLIPTextEncode.0.text": "a red fox in snow",
           "EmptySD3LatentImage.0.width": "1024",
           "EmptySD3LatentImage.0.height": "1024",
           "KSampler.0.seed": "7", "KSampler.0.steps": "8",
           "KSampler.0.cfg": "4.5",
           "KSampler.0.sampler_name": "res_multistep",
           "KSampler.0.scheduler": "simple",
           "SaveImage.0.filename_prefix": "run-P1/gen",
       })

# 2. krea-2 with negative + all knobs turned
parity("krea-2 t2i negative", "models/image/krea-2/generate_t2i.json",
       {"model": "krea-2", "params": {"prompt": "p", "negative_prompt": "blurry",
                                        "width": 1536, "height": 640,
                                        "steps": 12, "cfg": 7,
                                        "sampler": "euler", "scheduler": "sgm_uniform",
                                        "seed": 99}},
       "krea-2", "run-P2", {
           "CLIPTextEncode.0.text": "p",
           "CLIPTextEncode.1.text": "blurry",
           "EmptySD3LatentImage.0.width": "1536",
           "EmptySD3LatentImage.0.height": "640",
           "KSampler.0.seed": "99", "KSampler.0.steps": "12",
           "KSampler.0.cfg": "7",
           "KSampler.0.sampler_name": "euler",
           "KSampler.0.scheduler": "sgm_uniform",
           "SaveImage.0.filename_prefix": "run-P2/gen",
       })

# 3. img-edit i2i (staged filename): pre-stage under the input dir so
# the staged name is the given name (the staging law verbatim)
import plugins  # noqa: E402
_bus = plugins.load_compose("comfyui")
_idir = Path("/tmp/parity_input_dir")
_idir.mkdir(exist_ok=True)
(_idir / "edit_parity_fox.png").write_bytes(b"fakepng")
import importlib
import _config as _cfg
_cfg._g = {"input_dir": str(_idir)}
_ed_body = {"model": "img-edit", "params": {"prompt": "make it winter",
                                              "input_image": "edit_parity_fox.png",
                                              "shift": 2.5, "seed": 5}}
parity("img-edit i2i", "models/image/img-edit/edit_i2i.json",
       _ed_body, "img-edit", "run-P3", {
           "TextEncodeQwenImageEditPlus.0.prompt": "make it winter",
           "LoadImage.0.image": "edit_parity_fox.png",
           "ModelSamplingAuraFlow.0.shift": "2.5",
           "KSampler.0.seed": "5", "KSampler.0.steps": "4",
           "KSampler.0.cfg": "1",
           "KSampler.0.sampler_name": "euler",
           "KSampler.0.scheduler": "simple",
           "SaveImage.0.filename_prefix": "run-P3/edit",
       })

# 4. music3 with lyrics
parity("music3 t1 lyrics", "models/audio/music3/music_t1.json",
       {"model": "music3", "params": {"prompt": "Genre: cyberpunk ballad",
                                        "lyrics": "la la la", "duration": 45,
                                        "seed": 12}},
       "music3", "run-P4", {
           "TextEncode.0.caption": "Genre: cyberpunk ballad",
           "TextEncode.0.lyrics": "la la la",
           "TextEncode.0.seed": "12", "TextEncode.0.max_duration": "45",
           "EmptyLatent.0.seconds": "45", "KSampler.0.seed": "12",
           "SaveAudio.0.filename_prefix": "run-P4/music",
       })

# 5. music3 instrumental: lyrics baked EMPTY (the old channel left an
# unresolved literal ref there — the flip's documented correction)
parity("music3 t1 instrumental", "models/audio/music3/music_t1.json",
       {"model": "music3", "params": {"prompt": "Genre: ambient drone",
                                        "duration": 45, "seed": 12}},
       "music3", "run-P5", {
           "TextEncode.0.caption": "Genre: ambient drone",
           "TextEncode.0.lyrics": "",
           "TextEncode.0.seed": "12", "TextEncode.0.max_duration": "45",
           "EmptyLatent.0.seconds": "45", "KSampler.0.seed": "12",
           "SaveAudio.0.filename_prefix": "run-P5/music",
       })

# 6. LOUD gates: unsanctioned inject key refuses BY NAME
from co_script.errors import CoScriptError  # noqa: E402
import importlib as _imp
_cs = _imp.import_module("plugin_engines.comfyui.compose._coscript")
render_model = _cs.render_model  # noqa: E402
try:
    render_model(PLUGIN / "models" / "image" / "krea-2", "image_t2i",
                 {"inject": {"SongContext.0.clip_start_seconds": 0.0}})
    check("unsanctioned inject LOUD", False, "accepted")
except CoScriptError as e:
    check("unsanctioned inject LOUD", "SongContext.0" in str(e), str(e))

# 7. LOUD gate: model without a renderer refuses (no silent fallback)
try:
    render_model(PLUGIN / "models" / "image" / "ideogram", "image_t2i",
                 {"inject": {}})
    check("renderer-missing LOUD", False, "accepted")
except RuntimeError as e:
    check("renderer-missing LOUD", "co_script_renderer.py" in str(e), str(e))

print("\n%d passed, %d failed" % (len(PASS), len(FAIL)))
for f in FAIL:
    print("  FAIL", f)
sys.exit(1 if FAIL else 0)
