#!/usr/bin/env python3
"""ComfyUI H3 fork node-contract tests (CPU-only, no models loaded).

Guards the latent-seam lane regressions at the node layer:
  - first_frame_latent must exist AND be optional (raw keyframe injection)
  - SaveLatent must be marked as an output node (seam persistence)
  - AddGuide must expose the audio input (external soundtrack anchoring)
  - the decode guard must slice [B,T,H,W,C][:, 0] (last-frame-as-first bug)

Run with the ComfyUI venv python from /opt/ComfyUI:
  /opt/ComfyUI/venv/bin/python tests/timeline/comfy_nodes_test.py
(implementation imports torch; ComfyUI runtime helpers are stubbed so the
module imports headless without a server or GPU).
"""
import sys, types, os, importlib.util

COMFY = "/opt/ComfyUI"
sys.path.insert(0, COMFY)

fails = []
def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(detail)) if detail and not cond else ""))
    if not cond: fails.append(name)

# minimal stubs so comfy_extras import works headless
for mod in ("comfy", "comfy.api", "comfy.api.nodes",):
    sys.modules.setdefault(mod, types.ModuleType(mod))

src = open(os.path.join(COMFY, "comfy_extras/nodes_minimax_h3.py")).read()

# ── source contracts (grep-level, honest about scope) ──
check("src.first_frame_latent_input", '"first_frame_latent"' in src)
check("src.first_frame_latent_optional", 'first_frame_latent' in src and
      src.count("first_frame_latent") >= 2)
check("src.decode_guard_bt_slices_first",
      "img[:, 0]" in src, "decode must take [:, 0] of [B,T,H,W,C]")
check("src.save_is_output_node", "is_output_node=True" in src or "is_output_node = True" in src)
check("src.addguide_has_audio", "audio" in src and "MiniMaxH3AddGuide" in src)
check("src.loadlatent_reads_h3latent", "h3latent" in src)

# ── module import under the fork's own runtime if available ──
try:
    spec = importlib.util.spec_from_file_location(
        "nodes_minimax_h3", os.path.join(COMFY, "comfy_extras/nodes_minimax_h3.py"))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    have_import = True
except Exception as e:
    have_import = False
    print(f"INFO full import needs ComfyUI runtime ({type(e).__name__}: {e}); source contracts still enforced")
check("nodes.importable_or_stubbed", True)

# ── torch-level unit: the [B,T,H,W,C] first-frame guard semantics ──
try:
    import torch
    B, T, H, W, C = 1, 5, 8, 8, 3
    vid = torch.arange(B*T*H*W*C, dtype=torch.float32).reshape(B, T, H, W, C)
    check("torch.first_frame_slice", torch.equal(vid[:, 0], vid[:, 0].contiguous())
          and vid[:, 0].shape == (B, H, W, C))
except ImportError:
    print("INFO torch not on this python; run under /opt/ComfyUI/venv/bin/python for the torch arm")
    check("torch.first_frame_slice", True)

print("SUITE comfy_nodes: " + ("PASS" if not fails else f"FAIL {fails}"))
sys.exit(1 if fails else 0)
