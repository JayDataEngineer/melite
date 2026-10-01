#!/usr/bin/env bash
# install-comfy-extensions.sh — REAL ComfyUI EXTENSION INSTALL.
#
# THE LAW (operator, 2026-10-13): a symlink is a DEV convenience. A
# ComfyUI that must stand on its own carries real extensions — real
# directories in custom_nodes, loadable with no path back into a
# working tree that may move, change branch, or be deleted.
#
# WHAT THIS OWNS. `vendor/comfyui_extensions/` is the vendored tier
# (Layer C: the tooling the engines use, extending engine source
# without modifying it). Every directory in it is a REAL ComfyUI
# custom-node extension — a `NODE_CLASS_MAPPINGS` module ComfyUI
# imports by path. Installing one is a copy into the engine's
# `custom_nodes/`; that is ComfyUI's own extension mechanism, and
# nothing about it is ours beyond choosing the copy.
#
# MODES.
#   --mode real   (default) copy each vendored extension into
#                 custom_nodes, replacing any symlink of that name.
#                 The result survives the repo's deletion.
#   --mode dev    symlink instead — the fast path: edit a node in the
#                 tree, restart ComfyUI, see it. DEV ONLY.
#   --mode check  report the current shape and refuse nothing.
#
# Usage: scripts/install-comfy-extensions.sh [--mode real|dev|check]
#                                          [--custom-nodes <dir>]
set -euo pipefail

REPO="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$REPO/vendor/comfyui_extensions"
CUSTOM_NODES="$REPO/data/runtime/comfyui/custom_nodes"
MODE="real"

while [ $# -gt 0 ]; do
  case "$1" in
    --mode) MODE="$2"; shift 2 ;;
    --custom-nodes) CUSTOM_NODES="$2"; shift 2 ;;
    *) echo "unknown argument $1" >&2; exit 2 ;;
  esac
done

[ -d "$SOURCE" ] || { echo "no vendored extension tier at $SOURCE" >&2; exit 1; }
mkdir -p "$CUSTOM_NODES"

# The extensions are REAL ComfyUI extensions: each must publish node
# mappings, or it is a directory ComfyUI would ignore and this script
# would happily "install" as a lie.
nodes_in() { grep -rlE "NODE_CLASS_MAPPINGS" "$1" --include="*.py" 2>/dev/null | head -1; }

installed=0; symlinked=0; skipped=0; refused=0
for src in "$SOURCE"/*/; do
  [ -d "$src" ] || continue
  name="$(basename "$src")"
  if [ -z "$(nodes_in "$src")" ]; then
    printf '  skip    %s (no NODE_CLASS_MAPPINGS — not a ComfyUI extension)\n' "$name"
    skipped=$((skipped+1)); continue
  fi
  dest="$CUSTOM_NODES/$name"
  case "$MODE" in
    real)
      # A symlink of this name is the dev shape; a real install replaces it.
      if [ -L "$dest" ] || [ -e "$dest" ]; then rm -rf "$dest"; fi
      cp -R "$src" "$dest"
      printf '  real    %s\n' "$name"; installed=$((installed+1))
      ;;
    dev)
      if [ -e "$dest" ] && [ ! -L "$dest" ]; then
        printf '  refuse  %s (a real install is present; --mode dev would replace it — say so deliberately)\n' "$name"
        refused=$((refused+1)); continue
      fi
      rm -rf "$dest"; ln -s "$src" "$dest"
      printf '  dev     %s -> %s\n' "$name" "$src"; symlinked=$((symlinked+1))
      ;;
    check)
      if [ -L "$dest" ]; then printf '  dev     %s (symlink)\n' "$name"; symlinked=$((symlinked+1))
      elif [ -d "$dest" ]; then printf '  real    %s\n' "$name"; installed=$((installed+1))
      else printf '  absent  %s\n' "$name"; skipped=$((skipped+1)); fi
      ;;
    *) echo "unknown mode $MODE" >&2; exit 2 ;;
  esac
done

echo "comfy-extensions: mode=$MODE real=$installed dev=$symlinked absent=$skipped refused=$refused (custom_nodes: $CUSTOM_NODES)"
if [ "$MODE" = "real" ] && [ "$installed" -gt 0 ]; then
  echo "  ComfyUI must restart to load a new extension directory (its import is boot-time)."
fi
