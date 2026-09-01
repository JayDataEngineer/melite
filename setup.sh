#!/usr/bin/env bash
# setup.sh — thin POSIX wrapper around bootstrap.py (the real bootstrap).
#
# One path, one truth, every platform: all logic lives in bootstrap.py.
#   Linux/macOS: ./setup.sh [--server|--extensions|--models|--dry-run]
#   Windows:     py bootstrap.py <same flags>
# Flags pass through unchanged; PYTHON env overrides the interpreter.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"

PY="${PYTHON:-}"
if [ -z "$PY" ]; then
  for c in python3 python; do
    if command -v "$c" >/dev/null 2>&1; then PY="$c"; break; fi
  done
fi
if [ -z "$PY" ]; then
  echo "setup: no python3/python on PATH. On Windows run: py bootstrap.py $*" >&2
  exit 1
fi
exec "$PY" "$HERE/bootstrap.py" "$@"
