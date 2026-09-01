#!/bin/bash
# apply.sh - patch MrForExample/ComfyUI-3D-Pack for this host:
#  1. transformers >=5.x: CLIPFeatureExtractor -> CLIPImageProcessor
#  2. diso import guard (unbuildable on GCC15 + CUDA12.8)
#  3. color projection: force CUDA rasterizer (headless, GL SIGABRTs)
# Idempotent - marker-based.
set -euo pipefail
TARGET_DIR="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

FP1="$TARGET_DIR/Gen_3D_Modules/Era3D/mvdiffusion/pipelines/pipeline_mvdiffusion_unclip.py"
if [ -f "$FP1" ] && ! grep -q "RAY-FORK" "$FP1"; then
    sed -i 's/CLIPFeatureExtractor/CLIPImageProcessor/g' "$FP1"
    sed -i '/^from transformers import/a\# RAY-FORK: transformers-5 compat' "$FP1"
    echo "[patches] CLIPFeatureExtractor -> CLIPImageProcessor"
fi

python3 "$SCRIPT_DIR/patch_pack.py" "$TARGET_DIR"
