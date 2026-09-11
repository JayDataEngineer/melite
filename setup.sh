#!/usr/bin/env bash
# setup.sh — thin POSIX wrapper around the ONE provisioning orchestrator.
#
# One path, one truth, every platform: all logic lives in
# packages/engines/comfyui-cordis/scripts/provision.ts, run on node
# --experimental-strip-types (NO-ESTATE-PYTHON cut, 2026-09-08: the
# management plane is reached through APIs — ComfyUI HTTP + the
# comfy-mcp MCP server over stdio — never through in-process
# python packages).
#   Linux/macOS/Windows: ./setup.sh <command>   (verify | extensions | models | all | …)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

command -v node >/dev/null 2>&1 || {
  echo "setup: node is required (the provisioner runs on node --experimental-strip-types)." >&2
  exit 1
}

exec node --experimental-strip-types --no-warnings \
  "$HERE/packages/engines/comfyui-cordis/scripts/provision.ts" "$@"
