#!/usr/bin/env bash
# run_dev_dsh_tests.sh — single entrypoint for the dev DSH gate ladder.
#
# Two files, two python interpreters (the project venv doesn't carry
# playwright — it's a heavy dep only relevant for the editor package):
#
#   1. tests/dev_dsh/test_dev_dsh.py        — structural + host-side boot
#                                             gates (pytest on .venv)
#   2. tests/dev_dsh/test_dev_dsh_boot_e2e.py — browser-side boot gate
#                                             (/usr/bin/python3.14 + playwright)
#
# The split exists because:
#   * pytest on the project venv is the canonical python test runner
#   * playwright is python3.14-only on this host; importing it on 3.13
#     fails immediately with a clear error rather than a missing module
#
# Exit codes:
#   0 — all gates pass (dev DSH is healthy)
#   1 — a structural/host gate failed
#   2 — a browser-side gate failed (dev DSH boot UI shows plugin failure)
#
# Usage:
#   ./tests/dev_dsh/run_dev_dsh_tests.sh

set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"     # tests/dev_dsh
REPO="$(cd "$HERE/../.." && pwd)"
cd "$REPO" || exit 1

PYTEST="$REPO/.venv/bin/python -m pytest"
E2E="/usr/bin/python3.14 $HERE/test_dev_dsh_boot_e2e.py"

echo "=== dev DSH gate ladder ==="
echo

echo "[1/2] structural + host-side boot gates..."
if ! $PYTEST "$HERE/test_dev_dsh.py" -v --tb=short; then
  echo "FAILED: structural/host gates"
  exit 1
fi
echo "PASSED"
echo

echo "[2/2] browser-side boot gate..."
if ! $E2E; then
  echo "FAILED: browser-side boot gate"
  exit 2
fi
echo "PASSED"
echo

echo "=== all dev DSH gates green ==="
exit 0
