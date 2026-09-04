#!/usr/bin/env python3
"""H3 seam pack node-contract tests (CPU-only, no models loaded).

SSOT: the repo's custom-node pack —
  plugins/engines/comfyui/custom_nodes/melite-h3-motion-nodes/h3_seam_nodes.py
NOT a deployed ComfyUI copy (/opt/ComfyUI is a vanilla upstream clone; the
fork's seam features live in the pack and are bound into the running core
at load time). Guards the latent-seam lane regressions at the node layer:
  - first_frame_latent must exist AND be optional (raw keyframe injection)
  - SaveLatent must be marked as an output node (seam persistence)
  - AddGuide must expose the audio input (external soundtrack anchoring)
  - the seam must take the LAST latent frame (last-frame-as-first bug)
  - LoadLatent must read .h3latent packs (lossless cross-run seams)
  - the pack's model-layer port (its _PACKED_LAYOUT_INIT_SRC — the grid
    math SSOT this repo ships) must reproduce the measured seam layout:
    multi-frame head pin, forward audio window at the join, single-frame
    compat

Run with the ComfyUI venv python (COMFYUI_ROOT overrides the source root):
  /opt/ComfyUI/.venv/bin/python tests/timeline/comfy_nodes_test.py
The import arm loads the pack against the core found on COMFYUI_ROOT
(exactly as the live server does on load). The grid arm execs the pack's
OWN ported PackedLayout.__init__ in the running core's module namespace
— the same thing the pack's legacy branch does for cores that lack the
seam layout natively — and runs the measured regression values against
it. That keeps the arm honest on any core generation (vanilla v0.33,
fork, upstream master): it tests the code THIS REPO SHIPS, not whichever
happens to be running. Without a ComfyUI runtime (torch/comfy not
importable) the suite degrades to the source contracts only.
"""
import sys, os, importlib.util

COMFY = os.environ.get("COMFYUI_ROOT", "/opt/ComfyUI")
sys.path.insert(0, COMFY)

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PACK = os.path.join(REPO, "plugins", "engines", "comfyui",
                    "custom_nodes", "melite-h3-motion-nodes", "h3_seam_nodes.py")

# The h3 seam pack was deleted with the custom_nodes fossil (EXTENSION
# LAW, 2026-09-03) and has not been re-vendored under
# vendor/comfyui_extensions/ — this suite's SSOT is gone. Skip LOUDLY
# instead of erroring at collection; if the pack returns (vendored),
# update PACK above and this guard revives the suite automatically.
if not os.path.isfile(PACK):
    try:
        import pytest
        pytest.skip(
            "h3 seam pack deleted (custom_nodes fossil removal, not "
            "re-vendored) — awaiting the h3 lane's disposition",
            allow_module_level=True)
    except ImportError:                      # standalone run, no pytest
        raise SystemExit(
            "SKIP: h3 seam pack deleted (custom_nodes fossil removal, "
            "not re-vendored) — awaiting the h3 lane's disposition")

fails = []
def check(name, cond, detail=""):
    print(("PASS " if cond else "FAIL ") + name + ((" | " + str(detail)) if detail and not cond else ""))
    if not cond: fails.append(name)

src = open(PACK).read()

# ── source contracts (grep-level, honest about scope) ──
check("src.first_frame_latent_input", 'Input("first_frame_latent"' in src)
check("src.first_frame_latent_optional",
      'Input("first_frame_latent", optional=True' in src,
      "first_frame_latent must stay an optional input")
check("src.seam_takes_last_latent_frame", "video[:, :, -1:, :, :]" in src,
      "seam latent must slice the LAST latent frame, not the first")
check("src.save_is_output_node", "is_output_node=True" in src or "is_output_node = True" in src)
check("src.addguide_has_audio", "MiniMaxH3AddGuide" in src and 'Audio.Input("audio"' in src)
check("src.loadlatent_reads_h3latent", ".h3latent" in src and "MiniMaxH3LoadLatent" in src)

# ── torch-level unit: the [B,T,H,W,C] first-frame guard semantics ──
have_torch = False
try:
    import torch
    have_torch = True
    B, T, H, W, C = 1, 5, 8, 8, 3
    vid = torch.arange(B*T*H*W*C, dtype=torch.float32).reshape(B, T, H, W, C)
    check("torch.first_frame_slice", torch.equal(vid[:, 0], vid[:, 0].contiguous())
          and vid[:, 0].shape == (B, H, W, C))
except ImportError:
    print("INFO torch not on this python; run under the ComfyUI venv for the import+grid arms")

# ── import the pack against the REAL core (as the live server does) ──
have_pack = False
if have_torch:
    try:
        spec = importlib.util.spec_from_file_location("melite_h3_seam_nodes", PACK)
        pack = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(pack)
        have_pack = True
        check("pack.imports_against_core", True)
    except Exception as e:
        check("pack.imports_against_core", False, f"{type(e).__name__}: {e}")

# ── SEAM CONTEXT layout math (2026-08-28): multi-frame head pin + forward
# audio window. The SSOT for the seam grid is the pack's own ported
# PackedLayout.__init__ (_PACKED_LAYOUT_INIT_SRC) — we exec it in the
# running core's module namespace (exactly what the pack's legacy branch
# does at load for cores that lack the seam layout) and run the measured
# regression values against the result. Pure torch, no GPU, no
# monkeypatching of the imported core.
if have_pack and hasattr(pack, "_PACKED_LAYOUT_INIT_SRC"):
    try:
        import torch
        import comfy.ldm.minimax.model as hm

        ns = dict(vars(hm))
        exec(compile(pack._PACKED_LAYOUT_INIT_SRC, "test:(PackedLayout port)", "exec"), ns)

        class SeamLayout:            # bare container; the port sets every field
            __init__ = ns["_seam_packed_layout_init"]

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
        lay = SeamLayout(TEXT, LT, LH, LW, AT, keyframes=[kf], frame_count=124)

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
        rows = hm.patchify_video(torch.zeros(1, 24, L, LH, LW), (1, 2, 2))
        check("grid.patchify_rows_match", rows.shape[0] == L * FRAME_ROWS,
              f"{rows.shape[0]} vs {L * FRAME_ROWS}")

        # single-frame seam (context_steps=1) must be byte-identical to the classic
        kf1 = {"resolved_frame_index": 0, "latent": torch.zeros(1, 24, 1, LH, LW)}
        lay1 = SeamLayout(TEXT, LT, LH, LW, AT, keyframes=[kf1], frame_count=124)
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
