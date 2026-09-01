#!/usr/bin/env bash
# entrypoint.sh — docker wrapping the self-bootstrap (ONE path).
#
# Same commands bare metal runs, in the same order; nothing docker-specific
# except where things live. Idempotent: second boot skips installed
# extensions and present models.
set -euo pipefail

REPO=/opt/inference-src          # bind-mounted repo (bootstrap.py + plugins + patches)
WORKSPACE="${COMFYUI_DIR:-/root/ComfyUI}"

echo "[entrypoint] self-bootstrap: extensions + models (${WORKSPACE})"
python3 "$REPO/bootstrap.py" --extensions --models --comfyui-dir "$WORKSPACE"

echo "[entrypoint] launching ComfyUI on :18465"
exec "$WORKSPACE/.venv/bin/python" "$WORKSPACE/main.py" \
    --listen 0.0.0.0 --port 18465
