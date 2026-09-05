"""co_script constructor core tests (script style — python3 tests/walls/suites/test_co_script.py).
No GPU, no network: the pin is the schema SSOT."""

import json
import sys
from pathlib import Path

from _anchor import REPO
sys.path.insert(0, str(REPO / "plugins" / "engines" / "comfyui" / "compose"))

from co_script import (  # noqa: E402
    CoScriptError, ensure_nodes, pin_meta, require_nodes,
    isomorphic, diff, reachable,
)
from co_script.blocks import core as B  # noqa: E402

PASS, FAIL = [], []


def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name if cond else "%s: %s" % (name, detail))


# 1. pin present + integrity
meta = pin_meta()
check("pin meta schema", meta["schema"] == "object_info_pin/1")
# Floor is the LIVE estate post-consolidation (2026-09-05: the managed
# ComfyUI at :18466 serves 1310 nodes — the >3000 era died with the
# fossil custom_nodes deletion, 2026-09-03). >1200 keeps the check's
# intent (a real full-estate snapshot, not a stub) at today's truth.
check("pin node count > 1200", meta["node_count"] > 1200, str(meta["node_count"]))

# 2. offline ensure_nodes
N = ensure_nodes()
check("offline load > 1200", len(N) > 1200, str(len(N)))
check("second call cached", ensure_nodes() is N)

# 3. names gate
check("require known", require_nodes("UNETLoader", "MiniMaxH3ReferenceToVideo",
                                     "LTX_lora_loader", "ComfyMathExpression"))
try:
    require_nodes("NotARealNodeClass")
    check("require missing LOUD", False, "no raise")
except CoScriptError as e:
    check("require missing LOUD", "NotARealNodeClass" in str(e))

# 4. blocks: golden chain fragment + api_format shape
unet = B.unet_loader()
sla = B.sla_patch(unet)
chunked = B.chunk_feed_forward(B.low_vram_attention(sla))
picked = B.switch(B.prim_bool(False), on_true=chunked, on_false=sla)
lora_model, _clip = B.lora_stack(picked)
previewed = B.preview_override(lora_model, preview_frames=B.math_expr(B.MATH_STEPS_GOLD, a=B.prim_float(4.0))[1])
fixed = B.adaln_fix(previewed)
shifted = B.sigma_shift(fixed)
g = shifted.api_format()
classes = sorted(n["class_type"] for n in g.values())
expect = sorted(["UNETLoader", "H3SLAAttention", "PrimitiveBoolean", "ComfySwitchNode",
                 "MiniMaxLowVRAMAttention", "MiniMaxChunkFeedForward", "LTX_lora_loader",
                 "ModelPreviewOverrideKJ", "ComfyMathExpression", "PrimitiveFloat",
                 "H3AdaLNLoRAFix", "MiniMaxH3SigmaShift"])
check("golden chain 12 nodes", len(g) == 12, str(len(g)) + " " + str(classes))
check("golden chain classes", classes == expect, str(classes))
sw = next(n for n in g.values() if n["class_type"] == "ComfySwitchNode")
check("switch on_false is link", isinstance(sw["inputs"]["on_false"], list))
ss = next(n for n in g.values() if n["class_type"] == "MiniMaxH3SigmaShift")
check("sigma 8/5 golden", (ss["inputs"]["shift_video"], ss["inputs"]["shift_audio"]) == (8.0, 5.0))
sla_n = next(n for n in g.values() if n["class_type"] == "H3SLAAttention")
check("sla golden", (sla_n["inputs"]["block_size"], sla_n["inputs"]["sparsity_ratio"],
      sla_n["inputs"]["min_seq_len"]) == ("32", 0.9, 8192), str(sla_n["inputs"]))
me = next(n for n in g.values() if n["class_type"] == "ComfyMathExpression")
link_keys = [k for k, v in me["inputs"].items() if isinstance(v, list)]
check("math values.a link", any("a" in k for k in link_keys), str(me["inputs"]))

# 5. parity: isomorphism + diff + reachable
ga = B.sigma_shift(B.unet_loader()).api_format()
check("self isomorphic", isomorphic(ga, ga))
gb = B.sigma_shift(B.unet_loader(), shift_video=9.0).api_format()
d = diff(ga, gb)
check("perturbed differs", not d["isomorphic"])
check("diff names class", any("MiniMaxH3SigmaShift" in s for s in d["a_only"] + d["b_only"]), str(d))
oi = json.loads((REPO / "plugins" / "engines" / "comfyui" / "data" / "object_info.json").read_text())
# The orphan probe rides a PIN-PRESENT OUTPUT node ('easy saveText'
# died with the easy-use pack in the 2026-09-05 refresh — 1310 nodes,
# no easy surface; the pin is live truth). SaveImage is an output node
# with a defaulted input set, exactly what reachable() walks back from.
seed = N["SaveImage"]().api_format()
g_orphan = dict(seed)
g_orphan["LoadImage.99"] = {"class_type": "LoadImage", "inputs": {"image": "x.png"}}
r = reachable(g_orphan, oi)
check("reachable drops orphan", "LoadImage.99" not in r and len(r) == len(seed))

print()
for n in PASS:
    print("  ok   %s" % n)
for n in FAIL:
    print("  FAIL %s" % n)
print("\n%d passed, %d failed" % (len(PASS), len(FAIL)))
sys.exit(1 if FAIL else 0)
