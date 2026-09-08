#!/usr/bin/env bash
# install.sh — export the Inference Studio profile into THIS machine's DSH.
# Others: clone inference.cpp, run this, then pick "Inference Studio" when
# starting a session. Requires a running inference.cpp gateway (default
# http://127.0.0.1:33081 — the persona honors $MELITE_GATEWAY).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

dst_preset="$HOME/.dsh/.agent-presets/inference-studio"
mkdir -p "$dst_preset"
cp "$here/preset.yml" "$here/agent.cordis.yml" "$dst_preset/"

# NOTE (2026-09-03): no session skill is installed anymore. Craft lives
# in the GATEWAY's progressive-disclosure surface (lane_bundle_load +
# skill_read serve card:h3-timeline:video-timeline and friends) — a
# static ~/.dsh/skills copy would ride every request's system prompt
# and drift from the repo SSOT.

echo "installed:"
echo "  preset → $dst_preset"
echo "gateway: ${MELITE_GATEWAY:-http://127.0.0.1:33081} (set MELITE_GATEWAY to override)"
