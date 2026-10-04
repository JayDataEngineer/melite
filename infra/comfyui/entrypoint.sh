#!/usr/bin/env bash
# entrypoint.sh — docker wrapping the ONE provisioning orchestrator.
#
# Same commands bare metal runs, in the same order; nothing docker-specific
# except where things live. Idempotent: a second boot re-verifies each
# declared row's landed HEAD and skips the ones already at their ref.
#
# THE ORCHESTRATOR IS THE TYPESCRIPT PROVISIONER (pnpm run provision).
# This entrypoint used to run a python orchestrator (tools/provision.py)
# that the no-estate-Python cut deleted — the call outlived its target,
# so the lane could not boot — and it pip-installed comfy-mcp on the way
# in, a second extension installer outside ComfyUI-Manager. Both are
# gone: the provisioner owns install, and Manager is the only vendor.
set -euo pipefail

REPO="${MELITE_REPO:-/opt/inference-src}"   # bind-mounted repo (provisioner + declarations)
WORKSPACE="${COMFYUI_DIR:-/root/ComfyUI}"
export COMFYUI_PATH="$WORKSPACE"           # comfy-cli workspace routing

echo "[entrypoint] provisioning: extensions + models (${WORKSPACE})"
# The provisioner resolves its own paths, syncs the managed venv, and
# installs extensions through Manager's git-url door with the landed
# HEAD verified against each declared ref.
cd "$REPO"
pnpm run provision -- all

echo "[entrypoint] launching ComfyUI on :18465"
exec "$WORKSPACE/.venv/bin/python" "$WORKSPACE/main.py" \
    --listen 0.0.0.0 --port 18465
