#!/usr/bin/env bash
# setup.sh — thin POSIX wrapper around the TypeScript provisioning CLI.
# The implementation lives in packages/engines/comfyui-cordis/scripts/provision.ts.
# It provisions the configured ComfyUI instance and declared resources; the
# estate host itself is DSH/Cordis and is started with a rendered profile.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

command -v node >/dev/null 2>&1 || {
  echo "setup: node is required (the provisioner runs on node --experimental-strip-types)." >&2
  exit 1
}

exec node --experimental-strip-types --no-warnings \
  "$HERE/packages/engines/comfyui-cordis/scripts/provision.ts" "$@"
