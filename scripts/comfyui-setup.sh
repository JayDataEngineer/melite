#!/usr/bin/env bash
# ================================================================
# comfyui-setup.sh — Inference.cpp ComfyUI IaC
# Single source of truth for every custom node, model, and config
# the h3-timeline lane needs. Re-run safe (skips existing files).
#
# Source of truth: plugins/comfyui/models/video/h3-timeline/model.yaml
# Custom nodes:   git clone (deterministic, no interactive prompts)
# Model files:    comfy model download (resolves ComfyUI paths natively)
#                 or curl for models on shared volumes (MODEL_ROOT)
# ================================================================
set -euo pipefail

COMFYUI_DIR="${COMFYUI_DIR:-/opt/ComfyUI}"
VENV_PYTHON="$COMFYUI_DIR/.venv/bin/python"
COMFY="$COMFYUI_DIR/.venv/bin/comfy"
CUSTOM_NODES="$COMFYUI_DIR/custom_nodes"

# Shared model store (extra_model_paths.yaml maps this into ComfyUI)
MODEL_ROOT="${MODEL_ROOT:-/mnt/data/models/image-gen/comfyui}"

ok()   { echo "  [OK] $1"; }
skip() { echo "  [SKIP] $1 (exists)"; }
fail() { echo "  [FAIL] $1"; }

# Download a model via comfy-cli (resolves ComfyUI's own model paths).
# Usage: comfy_dl <url> <relative-path-under-models/>
comfy_dl() {
  local url=$1 rpath=$2
  local fname=$(basename "$url")
  local dest="$COMFYUI_DIR/models/$rpath/$fname"
  if [ -f "$dest" ]; then skip "$fname"; return; fi
  echo "  [DL] $fname -> models/$rpath/"
  $COMFY --workspace "$COMFYUI_DIR" --skip-prompt model download \
    --url "$url" --relative-path "models/$rpath" 2>&1 | grep -v '^$' | head -3
  [ -f "$dest" ] && ok "$fname" || fail "$fname"
}

# Download a model to a shared/external volume via curl.
# Usage: curl_dl <url> <absolute-dest-path>
curl_dl() {
  local url=$1 dest=$2
  if [ -f "$dest" ]; then skip "$(basename $dest)"; return; fi
  echo "  [DL] $(basename $dest) -> $dest"
  mkdir -p "$(dirname $dest)"
  curl -sL --retry 3 --retry-delay 5 "$url" -o "$dest" || { fail "$(basename $dest)"; return 1; }
  ok "$(basename $dest) ($(du -h $dest | cut -f1))"
}

clone() {
  local url=$1 dir=$2 ref=${3:-}
  if [ -d "$dir" ]; then skip "$(basename $dir)"; return; fi
  echo "  [CLONE] $(basename $dir) ..."
  local flags="--depth 1"
  [ -n "$ref" ] && flags="$flags --branch $ref"
  git clone $flags "$url" "$dir" 2>&1 | tail -2
  ok "$(basename $dir)"
}

echo "================================================================"
echo " ComfyUI IaC Setup — inference.cpp h3-timeline"
echo "================================================================"

# ─── 0. Custom Node Packs ────────────────────────────────────────
echo ""
echo "[0/6] Custom Node Packs"
# BOTH H3 motion-context packs run TOGETHER (coexistence, 2026-08-31):
# the MultiRef fork is a SUPERSET of the base pack (same four class
# names + ~37 uniquely-named additions). They are NOT either/or — the
# old "conflict resolution" that disabled the base pack was wrong.
# Load order (sorted dir names) makes the base pack register last and
# own the four shared names; the fork contributes its extra nodes.
clone https://github.com/NikoDemon80/ComfyUI-H3-Motion-Context.git \
      "$CUSTOM_NODES/h3_motion_context"
clone https://github.com/seitanism/ComfyUI-H3-Motion-Context-MultiRef.git \
      "$CUSTOM_NODES/ComfyUI-H3-Motion-Context-MultiRef"
clone https://github.com/PlagueKind/Comfyui-PlagueKind-Nodes.git \
      "$CUSTOM_NODES/Comfyui-PlagueKind-Nodes"
clone https://github.com/kijai/ComfyUI-KJNodes.git \
      "$CUSTOM_NODES/ComfyUI-KJNodes"
clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git \
      "$CUSTOM_NODES/ComfyUI-VideoHelperSuite"
clone https://github.com/kijai/ComfyUI-SolAttn_triton.git \
      "$CUSTOM_NODES/ComfyUI-SolAttn_triton"

# ─── 2. Node Dependencies (pip) ──────────────────────────────────
echo ""
echo "[2/6] Node Dependencies"
for req in \
  "$CUSTOM_NODES/ComfyUI-H3-Motion-Context-MultiRef/requirements.txt" \
  "$CUSTOM_NODES/ComfyUI-KJNodes/requirements.txt" \
  "$CUSTOM_NODES/Comfyui-PlagueKind-Nodes/requirements.txt" \
  "$CUSTOM_NODES/ComfyUI-SolAttn_triton/requirements.txt"; do
  if [ -f "$req" ]; then
    name=$(basename $(dirname "$req"))
    "$VENV_PYTHON" -m pip install -q -r "$req" 2>/dev/null && \
      ok "$name deps" || ok "$name deps (partial)"
  fi
done

# ─── 3. Diffusion Models ─────────────────────────────────────────
echo ""
echo "[3/6] Diffusion Models"
comfy_dl \
  "https://huggingface.co/smhfacct/Minimax-H3-fl2va-ref2va-hybrid-models/resolve/main/minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors" \
  "diffusion_models"
comfy_dl \
  "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors" \
  "diffusion_models"

# ─── 4. LoRAs ────────────────────────────────────────────────────
echo ""
echo "[4/6] LoRAs"
# SLA turbo LoRA — to shared store (loras/h3 subdir is scan-mapped)
curl_dl \
  "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors" \
  "$MODEL_ROOT/loras/h3/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors"
curl_dl \
  "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/minimax_h3_turbo_v4_step600_ema_pruned_comfyui.safetensors" \
  "$MODEL_ROOT/loras/h3/minimax_h3_turbo_v4_step600_ema_pruned_comfyui.safetensors"
curl_dl \
  "https://huggingface.co/deAPI-ai/minimax-h3-33b-int8/resolve/main/loras/h3_silu_temb_grid.safetensors" \
  "$MODEL_ROOT/loras/h3/h3_silu_temb_grid.safetensors"

# AdaLN dir
mkdir -p "$COMFYUI_DIR/models/h3_adaln"
[ -f "$MODEL_ROOT/loras/h3/h3_silu_temb_grid.safetensors" ] && \
  cp "$MODEL_ROOT/loras/h3/h3_silu_temb_grid.safetensors" "$COMFYUI_DIR/models/h3_adaln/" 2>/dev/null && \
  ok "h3_adaln copy"

# ─── 5. VAE / Encoders / Utilities ───────────────────────────────
echo ""
echo "[5/6] VAE, Text Encoder, Utilities"
curl_dl \
  "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/minimax_h3_video_vae_int8_convrot.safetensors" \
  "$MODEL_ROOT/vae/minimax_h3_video_vae_int8_convrot.safetensors"
curl_dl \
  "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_audio_vae_fp32.safetensors" \
  "$MODEL_ROOT/vae/minimax_h3_audio_vae_fp32.safetensors"
curl_dl \
  "https://huggingface.co/Kijai/MiniMax-H3-TAE/resolve/main/vae_approx/taeh3.safetensors" \
  "$MODEL_ROOT/vae_approx/taeh3.safetensors"
curl_dl \
  "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors" \
  "$MODEL_ROOT/text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors"
# FILM — to ComfyUI's own models dir
comfy_dl \
  "https://huggingface.co/Comfy-Org/frame_interpolation/resolve/main/frame_interpolation/film_net_fp16.safetensors" \
  "frame_interpolation"

# ─── 6. Config Patches ───────────────────────────────────────────
echo ""
echo "[6/6] Configuration & Verification"
if [ -f "$COMFYUI_DIR/comfy/ldm/minimax/model.py" ]; then
  if grep -q 'z\.dim() == 5' "$COMFYUI_DIR/comfy/ldm/minimax/model.py" && \
     ! grep -q 'len(z.shape) == 5' "$COMFYUI_DIR/comfy/ldm/minimax/model.py"; then
    sed -i 's/z\.dim() == 5/len(z.shape) == 5/' "$COMFYUI_DIR/comfy/ldm/minimax/model.py"
    ok "model.py PackedLayout stub fix"
  else
    ok "model.py already patched"
  fi
fi

echo ""
echo "── Verification ──"
FAIL=0
# Coexistence law (2026-08-31): BOTH motion-context packs must be
# ENABLED — the base pack owns the four shared class names, the
# MultiRef superset fork adds its uniquely-named nodes. Neither pack
# disabled, neither "supersedes" the other.
for d in h3_motion_context ComfyUI-H3-Motion-Context-MultiRef Comfyui-PlagueKind-Nodes ComfyUI-KJNodes ComfyUI-VideoHelperSuite ComfyUI-SolAttn_triton; do
  [ -d "$CUSTOM_NODES/$d" ] && [ -f "$CUSTOM_NODES/$d/__init__.py" ] && ok "$d" || { echo "  [MISSING] $d"; FAIL=1; }
done

for m in \
  "$MODEL_ROOT/diffusion_models/minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors" \
  "$MODEL_ROOT/loras/h3/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors" \
  "$COMFYUI_DIR/models/frame_interpolation/film_net_fp16.safetensors"; do
  [ -f "$m" ] && ok "$(basename $m)" || { echo "  [MISSING] $m"; FAIL=1; }
done

echo ""
echo "================================================================"
[ $FAIL -eq 0 ] && echo " COMPLETE — fully reproducible from git." || echo " INCOMPLETE — fix items above."
echo "================================================================"
