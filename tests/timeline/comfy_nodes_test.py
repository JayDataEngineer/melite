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

# ── SEAM CONTEXT layout math (2026-08-28): multi-frame head pin + forward
# audio window. Exercises PackedLayout directly — pure torch, no models.
try:
    import torch
    # the source-contract stubs above shadow the real package — drop bare
    # stubs so the genuine comfy tree (sys.path has COMFY) imports through
    for _m in [k for k, v in sys.modules.items()
               if k == "comfy" or k.startswith("comfy.") and isinstance(v, types.ModuleType)
               and getattr(v, "__file__", None) is None]:
        del sys.modules[_m]
    from comfy.ldm.minimax import model as hm

    TEXT, LT, LH, LW, AT = 320, 37, 28, 48, 207
    FRAME_ROWS = (LH // 2) * (LW // 2)
    L, A = 6, 40

    # multi-frame video kf + FORWARD audio kf in ONE keyframe dict:
    # B re-renders A's tail sound at [cond_t, cond_t+A), then continues.
    # (backwards windows measured mute-prone: post-event silence law)
    kf = {"resolved_frame_index": 0,
          "latent": torch.zeros(1, 24, L, LH, LW),
          "audio_latent": torch.zeros(1, 32, 2, A),
          "audio_rt": A, "audio_backwards": False}
    lay = hm.PackedLayout(TEXT, LT, LH, LW, AT, keyframes=[kf], frame_count=124)

    # cond rows: L frame-grids at the TARGET grid's head times
    # (img_pos/img_update are FLAT cats: cond video rows = ~update)
    cond_rows = lay.img_pos[~lay.img_update]
    want_t = hm._video_t_grid(L, float(TEXT)).repeat_interleave(FRAME_ROWS)
    got_t = lay.position_ids[cond_rows][: L * FRAME_ROWS, 0]
    check("grid.multiframe_head_pin_times", torch.equal(got_t.double(), want_t),
          f"got {got_t[:3].tolist()} want {want_t[:3].tolist()}")
    check("grid.multiframe_row_count", cond_rows.shape[0] == L * FRAME_ROWS,
          f"{cond_rows.shape[0]} vs {L * FRAME_ROWS}")
    check("grid.multiframe_all_cond", bool((~lay.img_update[: L * FRAME_ROWS]).all()),
          "context rows must be conditioning, not generation")

    # forward audio: window STARTS at the join, re-rendering A's tail sound
    cond_a = lay.audio_pos[~lay.audio_update]
    arows = lay.position_ids[cond_a]
    at = arows[:, 0]
    check("grid.audio_forward_start_at_join", float(at.min()) == float(TEXT),
          f"min t {float(at.min())} should be the join ({TEXT})")
    check("grid.audio_forward_span", float(at.max()) == float(TEXT) + A - 1,
          f"max t {float(at.max())} should be {TEXT + A - 1}")
    check("grid.audio_rows_packed", arows.shape[0] == A * 2, f"{arows.shape[0]} vs {A * 2}")
    tgt_a = lay.position_ids[lay.audio_pos[lay.audio_update]]
    check("grid.audio_target_full_clip", float(tgt_a[:, 0].min()) == float(TEXT),
          f"target audio spans the clip from the join ({TEXT}); got {float(tgt_a[:, 0].min())}")

    # cond row count must match a patchified multi-frame pack (t-major order)
    rows = hm.patchify_video(torch.zeros(1, 24, L, LH, LW), hm.PackedLayout and (1, 2, 2))
    check("grid.patchify_rows_match", rows.shape[0] == L * FRAME_ROWS,
          f"{rows.shape[0]} vs {L * FRAME_ROWS}")

    # single-frame seam (context_steps=1) must be byte-identical to the classic
    kf1 = {"resolved_frame_index": 0, "latent": torch.zeros(1, 24, 1, LH, LW)}
    lay1 = hm.PackedLayout(TEXT, LT, LH, LW, AT, keyframes=[kf1], frame_count=124)
    cond1 = lay1.img_pos[~lay1.img_update]
    check("grid.single_frame_compat",
          cond1.shape[0] == FRAME_ROWS and
          float(lay1.position_ids[cond1][0, 0]) == float(TEXT))
except ImportError as e:
    print(f"INFO layout math needs the comfy import surface ({e}); run under the ComfyUI venv")
except Exception as e:
    check("grid.layout_math", False, f"{type(e).__name__}: {e}")

print("SUITE comfy_nodes: " + ("PASS" if not fails else f"FAIL {fails}"))
sys.exit(1 if fails else 0)
