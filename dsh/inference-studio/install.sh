#!/usr/bin/env bash
# install.sh — export the Inference Studio profile into THIS machine's DSH.
# Others: clone inference.cpp, run this, then pick "Inference Studio" when
# starting a session. Requires a running inference.cpp gateway (default
# http://127.0.0.1:18090 — the persona honors $MELITE_GATEWAY).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

dst_preset="$HOME/.dsh/.agent-presets/inference-studio"
mkdir -p "$dst_preset"
cp "$here/preset.yml" "$here/agent.cordis.yml" "$dst_preset/"

dst_skill="$HOME/.dsh/skills/video-timeline"
mkdir -p "$dst_skill"
cp "$here/SKILL.md" "$dst_skill/"

echo "installed:"
echo "  preset → $dst_preset"
echo "  skill  → $dst_skill"
echo "gateway: ${MELITE_GATEWAY:-http://127.0.0.1:18090} (set MELITE_GATEWAY to override)"
