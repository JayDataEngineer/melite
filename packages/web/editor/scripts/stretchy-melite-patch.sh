#!/bin/bash
# Patch Stretchy Studio to use ComfyUI DWPose keypoints instead of browser ONNX.
#
# Injects a guard at the top of runDWPose() that:
#   1. If window.__MELITE_KEYPOINTS__ is set → use pre-computed ComfyUI keypoints
#   2. If not → throw (Stretchy catches this and falls back to bounding-box heuristic)
#
# This completely disables the browser onnxruntime-web / WASM path.  All DWPose
# inference runs through ComfyUI's TensorRT node with proper GPU lifecycle.
set -e

FILE="$1/src/io/armatureOrganizer.js"
if [ ! -f "$FILE" ]; then
  echo "WARNING: $FILE not found — skipping patch"
  exit 0
fi

# Use perl for reliable multi-line substitution (GNU sed -0pe also works,
# but perl is more predictable across container base images).
perl -i -0pe '
  s/export async function runDWPose\(layers, psdW, psdH, onnxSession, onStatus\) \{\n  const ort = await _ensureOrt\(\);/
  export async function runDWPose(layers, psdW, psdH, onnxSession, onStatus) {\n    \/\* RAY BRIDGE: ComfyUI DWPose keypoints injected by Melite editor iframe \*\/\n    if (window.__MELITE_KEYPOINTS__) { if (onStatus) onStatus("Using ComfyUI DWPose keypoints"); return applyDWPoseKeypoints(window.__MELITE_KEYPOINTS__, psdW, psdH); }\n    throw new Error("No ComfyUI DWPose keypoints. Run Stretchy Rig service first.");\n    const ort = await _ensureOrt();/
' "$FILE"

# Verify the patch landed
if grep -q '__MELITE_KEYPOINTS__' "$FILE"; then
  echo "✓ Patched armatureOrganizer.js — browser ONNX disabled, ComfyUI bridge active"
else
  echo "✗ Patch FAILED — __MELITE_KEYPOINTS__ not found in output"
  exit 1
fi
