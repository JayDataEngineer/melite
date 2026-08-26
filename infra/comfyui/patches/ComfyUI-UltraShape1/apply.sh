#!/bin/bash
# ═════════════════════════════════════════════════════════════════════════════
# apply.sh — apply melite-fork patches to jtydhr88/ComfyUI-UltraShape1
# ═════════════════════════════════════════════════════════════════════════════
# Single layer (inline Python patch, idempotent via a source marker):
#
#   U1. UltraShapeSaveGLB: emit the three_model UI entry
#       → UltraShapeSaveGLB is the terminal OUTPUT_NODE; its bare STRING
#         return never reaches ComfyUI's /history outputs (only ui-type
#         results do). Without this patch the workflow RUNS but the
#         mesh_refine brick's submit_and_fetch_file sees an empty outputs
#         dict → "no matching output entry" (the same failure class the
#         TRELLIS2 export patch fixed — upstreamed as
#         PozzettiAndrea/ComfyUI-TRELLIS2#144; the in-tree equivalent is
#         KimodoExportFBX's ui dict in melite-autorig-nodes).
#       → adds {"ui": {"three_model": [{filename, subfolder, type}]}}
#         alongside the existing (rel_path,) result. subfolder is the
#         node's own output_dir param (the file lands under
#         COMFY_OUTPUT_DIR/output_dir/).
#
# Apply to either:
#   1. Host's custom_nodes/ComfyUI-UltraShape1/ (one-time setup, idempotent).
#   2. Fresh upstream clone at Docker build time (setup_comfyui.py invokes
#      this after refresh_clone via the `patches` field in the owning
#      plugin's nodes/extensions.yaml lane — plugins/melite-3d/).
# ═════════════════════════════════════════════════════════════════════════════
set -euo pipefail

NODES="${1:-/root/ComfyUI/custom_nodes/ComfyUI-UltraShape1}"
NODES="$(cd "$NODES" 2>/dev/null && pwd)" || NODES="$(realpath "$NODES" 2>/dev/null || echo "$NODES")"
export NODES
echo "[comfyui-ultrashape1-patches] Applying to ${NODES}"

if [ ! -f "$NODES/nodes.py" ]; then
    echo "[comfyui-ultrashape1-patches] FATAL: $NODES is not a ComfyUI-UltraShape1 checkout (nodes.py missing)"
    exit 1
fi

python3 - << 'PYEOF'
import os

NODES = os.environ.get("NODES", "/root/ComfyUI/custom_nodes/ComfyUI-UltraShape1")
nodes_path = os.path.join(NODES, "nodes.py")
changes = []

src = open(nodes_path).read()

# ── U1: UltraShapeSaveGLB emits the three_model UI entry ────────────────
if "RAY-FORK: three_model UI entry" not in src:
    old = (
        '        # Return relative path\n'
        '        rel_path = os.path.relpath(save_path, COMFY_OUTPUT_DIR)\n'
        '        return (rel_path,)\n'
    )
    new = (
        '        # Return relative path\n'
        '        rel_path = os.path.relpath(save_path, COMFY_OUTPUT_DIR)\n'
        '        # RAY-FORK: three_model UI entry — an OUTPUT_NODE\'s bare STRING\n'
        '        # return never reaches /history outputs, so pipeline bricks\n'
        '        # (submit_and_fetch_file) cannot locate the refined mesh.\n'
        '        # Same pattern as KimodoExportFBX (melite-autorig-nodes) and the\n'
        '        # TRELLIS2 export patch (PozzettiAndrea/ComfyUI-TRELLIS2#144).\n'
        '        return {\n'
        '            "result": (rel_path,),\n'
        '            "ui": {\n'
        '                "three_model": [\n'
        '                    {\n'
        '                        "filename": filename,\n'
        '                        "subfolder": output_dir,\n'
        '                        "type": "output",\n'
        '                    }\n'
        '                ]\n'
        '            },\n'
        '        }\n'
    )
    if old in src:
        src = src.replace(old, new)
        changes.append("U1: UltraShapeSaveGLB emits three_model UI entry")
    else:
        print("[comfyui-ultrashape1-patches] U1 WARN: anchor not found — "
              "UltraShapeSaveGLB.save() layout changed upstream? "
              "Regenerate this patch against the new source.")
        raise SystemExit(1)

if changes:
    open(nodes_path, "w").write(src)
    print("[comfyui-ultrashape1-patches] inline: " + "; ".join(changes))
else:
    print("[comfyui-ultrashape1-patches] inline: all already applied")
PYEOF

echo "[comfyui-ultrashape1-patches] done"
