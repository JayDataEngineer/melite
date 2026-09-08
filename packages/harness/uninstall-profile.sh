#!/usr/bin/env bash
# uninstall-profile.sh — remove the inference.cpp DSH profile.
set -euo pipefail

PROFILE_NAME="${DSH_PROFILE_NAME:-inference}"
DST_DIR="${DSH_HOME:-$HOME/.dsh}/profiles/$PROFILE_NAME"

if [ -d "$DST_DIR" ]; then
  rm -rf "$DST_DIR"
  echo "removed $DST_DIR"
else
  echo "nothing to remove ($DST_DIR not found)"
fi

PRESET_DIR="${DSH_HOME:-$HOME/.dsh}/.agent-presets/inference-studio"
if [ -d "$PRESET_DIR" ]; then
  rm -rf "$PRESET_DIR"
  echo "removed $PRESET_DIR"
fi
