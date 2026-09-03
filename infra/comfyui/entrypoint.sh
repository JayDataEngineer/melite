#!/usr/bin/env bash
# entrypoint.sh — docker wrapping the ONE provisioning orchestrator.
#
# Same commands bare metal runs, in the same order; nothing docker-specific
# except where things live. Idempotent: second boot skips installed
# extensions and present models.
set -euo pipefail

REPO=/opt/inference-src          # bind-mounted repo (orchestrator + declarations + patches)
WORKSPACE="${COMFYUI_DIR:-/root/ComfyUI}"
export COMFYUI_PATH="$WORKSPACE"  # comfy-cli workspace routing (provision.py resolves it via comfy-mcp)

echo "[entrypoint] provisioning: extensions + models (${WORKSPACE})"
# management plane in-process: comfy-mcp imported by the orchestrator
# (idempotent pip install; the executor image may not carry it)
python3 -m pip install -q comfy-mcp
python3 "$REPO/tools/provision.py" all

echo "[entrypoint] launching ComfyUI on :18465"
exec "$WORKSPACE/.venv/bin/python" "$WORKSPACE/main.py" \
    --listen 0.0.0.0 --port 18465
