#!/usr/bin/env bash
# install.sh — wire the Flow Tavern into THIS machine's DSH.
#
# Two halves, independent:
#   1) `uv tool install .` registers the `infer-flow-tavern` console
#      script on $PATH so `infer-flow-tavern` runs from any shell.
#   2) `dsh plugin --profile <name> add` (or the cordis.patch.yml
#      drop-in below) mounts the sidebar button into the DSH web
#      app. Profiles that don't want the button stay clean.
#
# Usage:
#   ./install.sh                     # install into all DSH profiles
#   ./install.sh inference           # install into one profile
#   ./install.sh --tavern-only       # only step 1 (skip the DSH button)
#   ./install.sh --dsh-only          # only step 2 (skip the uv install)
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

tavern_only=0
dsh_only=0
profile=""
for arg in "$@"; do
  case "$arg" in
    --tavern-only) tavern_only=1 ;;
    --dsh-only) dsh_only=1 ;;
    --*) ;;  # ignore
    *) profile="$arg" ;;
  esac
done

# ── 1) install the Python package ────────────────────────────────────
if [ "$dsh_only" -eq 0 ]; then
  if ! command -v uv >/dev/null 2>&1; then
    echo "infer-flow-tavern: 'uv' not on PATH. Install astral-sh/uv first." >&2
    exit 1
  fi
  echo "infer-flow-tavern: uv tool install $here"
  uv tool install "$here" --force
  echo "  → 'infer-flow-tavern' is now on PATH"
  echo "  → try:  MELITE_GATEWAY=http://localhost:33081 infer-flow-tavern"
fi

# ── 2) drop the cordis button into DSH profiles ──────────────────────
if [ "$tavern_only" -eq 0 ]; then
  dsh_home="${DSH_HOME:-$HOME/.dsh}"
  if [ -n "$profile" ]; then
    profiles=("$dsh_home/profiles/$profile")
  else
    profiles=()
    for d in "$dsh_home"/profiles/*/; do
      [ -d "$d" ] || continue
      profiles+=("$d")
    done
  fi
  if [ "${#profiles[@]}" -eq 0 ]; then
    echo "infer-flow-tavern: no DSH profiles under $dsh_home/profiles/ — skipping cordis drop"
    echo "  → use 'infer-provision all' (from packages/harness/dsh/provisioner) to render one"
  else
    for prof in "${profiles[@]}"; do
      cp "$here/cordis.patch.yml" "$prof/tavern.patch.yml"
      echo "infer-flow-tavern: cordis patch → $prof/tavern.patch.yml"
      echo "  → the profile must include 'tavern.patch.yml' in its cordis.include"
      echo "    list; dsh plugin add does this automatically, manual profiles"
      echo "    need a one-line edit (see README.md §DSH sidebar)."
    done
  fi
fi

echo
echo "infer-flow-tavern: installed."
echo "  run:    infer-flow-tavern  --gateway http://localhost:33081"
echo "  browse: http://127.0.0.1:33091"
