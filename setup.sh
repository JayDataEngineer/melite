#!/usr/bin/env bash
# setup.sh — thin POSIX wrapper around the ONE provisioning orchestrator.
#
# One path, one truth, every platform: all logic lives in
# tools/provision.py, driven through the ONE base environment
# (operator order 2026-09-03: the base env IS the comfyui management
# plane — comfy-mcp, comfyui-manager, comfy-cli, comfy-script,
# fastmcp, starlette, pyyaml — the packages, in-process, never
# shell-scripted; there is no opt-in group).
#   Linux/macOS: ./setup.sh <command>   (verify | extensions | models | all | …)
#   Windows:     uv run --project infra/python tools\provision.py <command>
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

command -v uv >/dev/null 2>&1 || {
  echo "setup: uv is required (the env manager). Install: https://docs.astral.sh/uv/" >&2
  exit 1
}

exec uv run --project "$HERE/infra/python" \
  python "$HERE/tools/provision.py" "$@"
