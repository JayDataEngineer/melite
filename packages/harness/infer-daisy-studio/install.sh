#!/usr/bin/env bash
# install.sh - wire the Daisy Studio into THIS machine DSH profiles.
# 1) uv tool install registers infer-daisy-studio on PATH.
# 2) cordis.patch.yml drop-in mounts the sidebar button into profiles.
# Usage: ./install.sh [profile] [--studio-only] [--dsh-only]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
STUDIO_ONLY=0
DSH_ONLY=0
PROFILE=""
for ARG in "$@"; do
  case "$ARG" in
    --studio-only) STUDIO_ONLY=1 ;;
    --dsh-only) DSH_ONLY=1 ;;
    --*) ;;
    *) PROFILE="$ARG" ;;
  esac
done
if [ "$DSH_ONLY" -eq 0 ]; then
  if ! command -v uv >/dev/null 2>&1; then
    echo "infer-daisy-studio: uv not on PATH - install astral-sh/uv first." >&2
    exit 1
  fi
  echo "infer-daisy-studio: uv tool install $HERE"
  uv tool install "$HERE" --force
  echo "  -> try: MELITE_GATEWAY=http://localhost:33081 infer-daisy-studio"
fi
if [ "$STUDIO_ONLY" -eq 0 ]; then
  DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
  if [ -n "$PROFILE" ]; then PROFILES=("$DSH_HOME_DIR/profiles/$PROFILE"); else
    PROFILES=()
    for D in "$DSH_HOME_DIR"/profiles/*/; do [ -d "$D" ] || continue; PROFILES+=("$D"); done
  fi
  if [ "${#PROFILES[@]}" -eq 0 ]; then
    echo "infer-daisy-studio: no DSH profiles under $DSH_HOME_DIR/profiles/ - skipping cordis drop"
  else
    for PROF in "${PROFILES[@]}"; do
      cp "$HERE/cordis.patch.yml" "$PROF/studio.patch.yml"
      echo "infer-daisy-studio: cordis patch -> $PROF/studio.patch.yml"
    done
  fi
fi
echo
echo "infer-daisy-studio: installed."
echo "  run:    infer-daisy-studio --gateway http://localhost:33081"
echo "  browse: http://127.0.0.1:33092"
