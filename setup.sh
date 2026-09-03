#!/usr/bin/env bash
# setup.sh — thin POSIX wrapper around the ONE provisioning orchestrator.
#
# One path, one truth, every platform: all logic lives in
# tools/provision.py, driven through the MANAGEMENT environment
# (dependency group: comfy-mcp — the packages, in-process, never
# shell-scripted).
#   Linux/macOS: ./setup.sh <command>   (verify | extensions | models | all | …)
#   Windows:     uv run --group management py tools\provision.py <command>
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

command -v uv >/dev/null 2>&1 || {
  echo "setup: uv is required (the env manager). Install: https://docs.astral.sh/uv/" >&2
  exit 1
}

exec uv run --group management --project "$HERE" \
  python "$HERE/tools/provision.py" "$@"
