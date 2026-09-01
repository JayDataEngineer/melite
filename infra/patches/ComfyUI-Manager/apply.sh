#!/bin/bash
# ═════════════════════════════════════════════════════════════════════════════
# apply.sh — apply melite-fork patches to Comfy-Org/ComfyUI-Manager
# ═════════════════════════════════════════════════════════════════════════════
# Single layer (inline Python patch, idempotent via pattern absence):
#
#   M1. Remove the undocumented `file=` kwarg from logging.error calls
#       → Python 3.12 made Logger._log STRICT about unexpected keyword
#         arguments (previously silently ignored). The manager's error
#         paths call `logging.error(f"...", file=sys.stderr)` — a pattern
#         that only ever worked by accident. On 3.12 every one of those
#         paths raises `TypeError: Logger.error() got an unexpected
#         keyword argument 'file'` INSTEAD of logging the failure.
#       → CONCRETE DAMAGE (2026-08-15): /comfyui_manager/comfyui_switch_version
#         crashed mid-flight in the dev executor — AFTER its `git checkout
#         master` step had already run — silently reverting the production
#         pin 2f35f4a back to 5538f62 (reflog war; the executor lost
#         MiniMaxMusic3TextEncode / Ideogram4Scheduler / comfy.ldm.minimax
#         while ComfyUI kept serving). The TypeError also masquerades the
#         real error (Update, install, uninstall failures go unreported).
#       → fix: drop `, file=sys.stderr` — logging already emits to stderr
#         via the lastResort handler. Behavior-preserving; logging.error
#         and print(file=sys.stderr) calls (valid kwargs) are untouched.
#         Upstream still carries all 6 sites at HEAD (4f56cf3d, checked
#         2026-08-15) — this is a local patch until upstream fixes it.
#
# Apply to either:
#   1. Host's custom_nodes/ComfyUI-Manager/ (one-time setup, idempotent).
#   2. Fresh upstream clone at Docker build time (setup_comfyui.py invokes
#      this after refresh_clone via the `patches` field in the owning
#      plugin's nodes/extensions.yaml lane — plugins/melite-core/).
# ═════════════════════════════════════════════════════════════════════════════
set -euo pipefail

NODES="${1:-/root/ComfyUI/custom_nodes/ComfyUI-Manager}"
NODES="$(cd "$NODES" 2>/dev/null && pwd)" || NODES="$(realpath "$NODES" 2>/dev/null || echo "$NODES")"
export NODES
echo "[comfyui-manager-patches] Applying to ${NODES}"

if [ ! -f "$NODES/glob/manager_server.py" ]; then
    echo "[comfyui-manager-patches] FATAL: $NODES is not a ComfyUI-Manager checkout (glob/manager_server.py missing)"
    exit 1
fi

python3 - << 'PYEOF'
import os
import re

NODES = os.environ.get("NODES", "/root/ComfyUI/custom_nodes/ComfyUI-Manager")
path = os.path.join(NODES, "glob", "manager_server.py")
src = open(path).read()

# ── M1: py3.12-safe logging — drop the undocumented file= kwarg ─────────
# Anchor for "already applied": no logging.*(... file= ...) remains.
leftover = re.search(
    r"logging\.(?:error|warning|info|exception|critical)\([^)]*"
    r"file\s*=\s*sys\.stderr",
    src,
)
if leftover:
    # Every site must anchor EXACTLY — if upstream drift moves one, fail
    # loud (never silently skip a site; the remaining site would crash the
    # exact path this patch exists to fix).
    anchors = [
        'logging.error(f"Install(unzip) error: {url} / {e}", file=sys.stderr)',
        'logging.error(f"Install(copy) error: {url} / {e}", file=sys.stderr)',
        'logging.error(f"Uninstall(copy) error: {url} / {e}", file=sys.stderr)',
        'logging.error(f"{action_name}(copy) error: {url} / {e}", file=sys.stderr)',
        'logging.error(f"ComfyUI update fail: {e}", file=sys.stderr)',
    ]
    for anchor in anchors:
        if anchor not in src:
            print("[comfyui-manager-patches] M1 WARN: anchor not found — "
                  f"{anchor!r}\nRegenerate this patch against the new source.")
            raise SystemExit(1)
    for anchor in anchors:
        replacement = anchor[:-len(', file=sys.stderr)')] + (
            ')  # RAY-FORK: py3.12 removed the undocumented file= kwarg (Logger._log strict)'
        )
        src = src.replace(anchor, replacement)
    open(path, "w").write(src)
    print("[comfyui-manager-patches] M1: dropped file= kwarg from "
          f"{len(anchors)} logging.error site(s)")
else:
    print("[comfyui-manager-patches] M1: already applied (no logging.*(file=) remains)")
PYEOF

echo "[comfyui-manager-patches] done"
