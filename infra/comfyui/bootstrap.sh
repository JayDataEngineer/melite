#!/usr/bin/env bash
# inference.cpp ComfyUI bootstrap — git IaC for custom nodes + H3 model estate.
# Idempotent: safe to re-run; every step skips what is already correct.
#
# Usage:
#   infra/comfyui/bootstrap.sh                 # everything (nodes + models + pip)
#   infra/comfyui/bootstrap.sh --nodes         # node packs only
#   infra/comfyui/bootstrap.sh --models        # H3 models only (skip-if-size-matches)
#   infra/comfyui/bootstrap.sh --node <name>   # one node pack (test-friendly)
#   infra/comfyui/bootstrap.sh --checksums     # print sha256 of present models
# Env: COMFYUI_ROOT (default /opt/ComfyUI), COMFYUI_VENV (default $COMFYUI_ROOT/.venv)
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
COMFYUI_ROOT="${COMFYUI_ROOT:-/opt/ComfyUI}"
COMFYUI_VENV="${COMFYUI_VENV:-$COMFYUI_ROOT/.venv}"
NODES_DIR="$HERE/nodes"
CN_DIR="$COMFYUI_ROOT/custom_nodes"
MODELS_DIR="$COMFYUI_ROOT/models"

log() { printf '[bootstrap] %s\n' "$*"; }

install_nodes() {
  local filter="${1:-}"
  mkdir -p "$NODES_DIR" "$CN_DIR"
  while IFS=$'\t' read -r name url; do
    case "$name" in ''|'#'*) continue ;; esac
    [ -n "$filter" ] && [ "$name" != "$filter" ] && continue
    if [ -e "$CN_DIR/$name" ] && [ ! -L "$CN_DIR/$name" ]; then
      log "node $name: present (non-symlink) — skip"
      continue
    fi
    if [ ! -d "$NODES_DIR/$name/.git" ]; then
      log "node $name: cloning $url"
      git clone --depth 1 "$url" "$NODES_DIR/$name" || { log "node $name: CLONE FAILED"; continue; }
    else
      log "node $name: git clone already at $NODES_DIR/$name"
    fi
    if [ -L "$CN_DIR/$name" ]; then
      log "node $name: symlink already present"
    else
      ln -s "$NODES_DIR/$name" "$CN_DIR/$name"
      log "node $name: symlinked into custom_nodes"
    fi
    if [ -f "$NODES_DIR/$name/requirements.txt" ]; then
      log "node $name: pip requirements"
      "$COMFYUI_VENV/bin/pip" install -q -r "$NODES_DIR/$name/requirements.txt" || log "node $name: pip FAILED (continuing)"
    fi
  done < "$HERE/nodes.manifest"
}

install_models() {
  while IFS=$'\t' read -r dest url bytes; do
    case "$dest" in ''|'#'*) continue ;; esac
    local target="$MODELS_DIR/$dest"
    mkdir -p "$(dirname "$target")"
    if [ -f "$target" ]; then
      local have
      have=$(stat -c %s "$target")
      if [ "$have" = "$bytes" ]; then
        log "model $dest: present ($bytes B) — skip"
        continue
      fi
      log "model $dest: SIZE MISMATCH (have $have want $bytes) — re-downloading"
    fi
    case "$url" in
      UNVERIFIED_URL)
        log "model $dest: MISSING and URL unverified — fill models.manifest first"
        continue ;;
    esac
    log "model $dest: downloading $url"
    curl -L -C - --fail -o "$target.part" "$url" && mv "$target.part" "$target" \
      || { log "model $dest: DOWNLOAD FAILED"; rm -f "$target.part"; continue; }
  done < "$HERE/models.manifest"
}

install_pip() {
  log "pip: comfy-kitchen"
  "$COMFYUI_VENV/bin/pip" install -q 'comfy-kitchen==0.2.31' || log "pip: kitchen FAILED"
}

checksums() {
  while IFS=$'\t' read -r dest _url _bytes; do
    case "$dest" in ''|'#'*) continue ;; esac
    [ -f "$MODELS_DIR/$dest" ] && (cd "$MODELS_DIR" && sha256sum "$dest")
  done < "$HERE/models.manifest"
}

case "${1:-all}" in
  --nodes)  install_nodes ;;
  --models) install_models ;;
  --node)   install_nodes "${2:?--node needs a name}" ;;
  --checksums) checksums ;;
  --pip)    install_pip ;;
  all)      install_nodes; install_models; install_pip ;;
  *) echo "unknown flag: $1" >&2; exit 2 ;;
esac
log "done"