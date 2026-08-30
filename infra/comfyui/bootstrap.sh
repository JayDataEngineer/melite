#!/usr/bin/env bash
# inference.cpp ComfyUI bootstrap — git IaC for the production lane.
#
# ONE PATTERN (operator order, 2026-08-30): there are NO hand-maintained
# manifests. Exactly two documents own every link, and every consumer
# PROJECTS from them:
#   extensions → plugins/comfyui/nodes/extensions.yaml (pinned refs, pip,
#                patches; merged by extension_lane.py — same law as the
#                Docker build and the gateway preflight)
#   models     → the owning family's model.yaml provisions: block
#                (name+url+bytes+sha256; projected by model_manifest.py)
# bootstrap.sh only clones/applies/verifies. Idempotent; drift it cannot
# resolve FAILS LOUDLY (no silent fallbacks).
#
# Usage:
#   infra/comfyui/bootstrap.sh              # core + lane + models
#   infra/comfyui/bootstrap.sh --core       # ComfyUI core @pin + patches
#   infra/comfyui/bootstrap.sh --lane       # required lane packs (SSOT)
#   infra/comfyui/bootstrap.sh --lane-all   # + wider estate (unpinned)
#   infra/comfyui/bootstrap.sh --models     # required models from catalog
#                                          #   (INF_INSTALL_OPTIONAL=1 adds optional)
#   infra/comfyui/bootstrap.sh --checksums  # print sha256 of present models
# Env: COMFYUI_ROOT (default /opt/ComfyUI), COMFYUI_VENV (default
#      $COMFYUI_ROOT/.venv), INF_VERIFY_PRESENT=1 to sha-verify present
#      models too (off by default — hashing 20 GB files on every run is
#      not free; downloads are ALWAYS verified).
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
COMFYUI_ROOT="${COMFYUI_ROOT:-/opt/ComfyUI}"
COMFYUI_VENV="${COMFYUI_VENV:-$COMFYUI_ROOT/.venv}"
NODES_DIR="$HERE/nodes"
CN_DIR="$COMFYUI_ROOT/custom_nodes"
MODELS_DIR="$COMFYUI_ROOT/models"
CORE_PATCHES="$HERE/patches/comfyui-core"
CORE_BASE="2f35f4a08176d993cded35dac3332be4f7287f41"
# the realized pin on the production host (base + 0001..0003 as commits)
CORE_REALIZED="b518a9009fa2abf43d857a9f64f9d18aacaf8738"

log() { printf '[bootstrap] %s\n' "$*"; }
die() { printf '[bootstrap] FATAL: %s\n' "$*" >&2; exit 1; }

# ─────────────────────────────────────────────────────────────────────
# Core: ComfyUI @pin + seam patches (see patches/comfyui-core/PIN.md)
# ─────────────────────────────────────────────────────────────────────
install_core() {
  if [ -d "$COMFYUI_ROOT/.git" ]; then
    local head
    head=$(git -C "$COMFYUI_ROOT" rev-parse HEAD 2>/dev/null || echo none)
    case "$head" in
      "$CORE_REALIZED"|"$CORE_BASE")
        log "core: present @${head:0:12} — skip (PIN.md documents patch layers)"
        return ;;
      *)
        die "core: $COMFYUI_ROOT is @${head:0:12}, expected $CORE_REALIZED (or clean base $CORE_BASE). Refusing to touch a diverged tree — resolve manually." ;;
    esac
  fi
  log "core: cloning ComfyUI @${CORE_BASE:0:12} (v0.33.0 io-schema release)"
  mkdir -p "$COMFYUI_ROOT"
  git -C "$COMFYUI_ROOT" init -q || die "core: git init failed"
  git -C "$COMFYUI_ROOT" remote add origin https://github.com/comfyanonymous/ComfyUI.git
  git -C "$COMFYUI_ROOT" fetch -q --depth 1 origin "$CORE_BASE" \
    || die "core: fetch of $CORE_BASE failed (public upstream — check network)"
  git -C "$COMFYUI_ROOT" checkout -q FETCH_HEAD || die "core: checkout failed"

  local patch n=0
  for patch in "$CORE_PATCHES"/[0-9]*.patch; do
    [ -e "$patch" ] || die "core: no patches found in $CORE_PATCHES"
    log "core: applying $(basename "$patch")"
    git -C "$COMFYUI_ROOT" apply --check "$patch" 2>/dev/null \
      || die "core: $(basename "$patch") does not apply on top of ${CORE_BASE:0:12} — pin drift"
    git -C "$COMFYUI_ROOT" apply "$patch" \
      || die "core: failed applying $(basename "$patch")"
    n=$((n+1))
  done

  if [ ! -x "$COMFYUI_VENV/bin/pip" ]; then
    log "core: creating venv at $COMFYUI_VENV"
    python3 -m venv "$COMFYUI_VENV" || die "core: venv creation failed"
  fi
  "$COMFYUI_VENV/bin/pip" install -q -r "$COMFYUI_ROOT/requirements.txt" \
    || die "core: pip requirements failed"
  # comfy-angle: EGL/ANGLE bindings for comfy_extras/nodes_glsl.py (same
  # as the Docker image — without it GLSL nodes are unavailable).
  "$COMFYUI_VENV/bin/pip" install -q comfy-angle \
    || log "core: comfy-angle FAILED (GLSL nodes unavailable — continuing)"
  log "core: done (base ${CORE_BASE:0:12} + $n patches)"
}

# ─────────────────────────────────────────────────────────────────────
# Lane: extension SSOT (plugins/comfyui/nodes/extensions.yaml) merged
# through extension_lane.py — the SAME merge law as the Docker build
# (setup_comfyui.py) and the gateway preflight. $1: "required" | "all"
# ─────────────────────────────────────────────────────────────────────
lane_tsv() {
  python3 - "$REPO_ROOT/plugins" "$HERE" "${1:-required}" <<'PY'
import sys
sys.path.insert(0, sys.argv[2])  # infra/comfyui — where extension_lane.py lives
import extension_lane
scope = sys.argv[3]
exts = extension_lane.merge_plugin_extensions(sys.argv[1])
rows = [e for e in exts if scope == "all" or e.get("required", True)]
for e in rows:
    # '|' separator: NOT an IFS-whitespace char, so EMPTY fields survive
    # the bash read (tab would collapse them and shift columns).
    print('|'.join([
        e.get('name', ''),
        e.get('url') or '',
        e.get('ref') or '',
        e.get('patches') or '',
        ';'.join(e.get('pip', []) or []),
    ]))
PY
}

install_lane() {
  local tsv name url ref patches pip
  tsv=$(lane_tsv "${1:-required}") || die "lane: extensions.yaml merge failed (see error above)"
  [ -n "$tsv" ] || die "lane: SSOT is EMPTY — plugins/comfyui/nodes/extensions.yaml is missing or declares nothing"
  mkdir -p "$NODES_DIR" "$CN_DIR"
  while IFS='|' read -r name url ref patches pip; do
    [ -n "$url" ] || { log "lane $name: in-tree pack (no url) — lives in the repo, nothing to clone"; continue; }
    local clone="$NODES_DIR/$name" want="$ref" have=missing
    if [ -z "$want" ]; then
      # estate entry, unpinned: floating --depth 1 clone of HEAD
      if [ -d "$clone/.git" ]; then
        log "lane $name: estate clone present (unpinned) — skip"
      else
        log "lane $name: cloning $url (unpinned estate)"
        git clone -q --depth 1 "$url" "$clone" || die "lane $name: clone failed"
      fi
    else
      if [ -d "$clone/.git" ]; then
        have=$(git -C "$clone" rev-parse HEAD 2>/dev/null || echo broken)
      fi
      if [ "$have" = "$want" ]; then
        log "lane $name: clone present @$ref"
      elif [ "$have" != "missing" ]; then
        die "lane $name: clone at $NODES_DIR/$name is @${have:0:12}, SSOT pins $ref — resolve the drift (git fetch + checkout, or delete the clone)"
      else
        log "lane $name: fetching $url@${ref:0:12}"
        git init -q "$clone" || die "lane $name: git init failed"
        git -C "$clone" remote add origin "$url"
        git -C "$clone" fetch -q --depth 1 origin "$ref" \
          || die "lane $name: fetch of $ref failed"
        git -C "$clone" checkout -q FETCH_HEAD || die "lane $name: checkout failed"
      fi
    fi
    # custom_nodes wiring: symlink preferred; a REAL dir is accepted only
    # if it is a git checkout at the exact pin (legacy direct clones).
    if [ -L "$CN_DIR/$name" ]; then
      if [ -n "$want" ]; then
        local tgt
        tgt=$(readlink -f "$CN_DIR/$name")
        if [ -d "$tgt/.git" ]; then
          local sym_sha
          sym_sha=$(git -C "$tgt" rev-parse HEAD 2>/dev/null || echo broken)
          [ "$sym_sha" = "$want" ] \
            && log "lane $name: symlink present, target @$ref — verified" \
            || die "lane $name: symlink target $tgt is @${sym_sha:0:12}, SSOT pins $ref — DRIFT, resolve manually"
        else
          log "lane $name: symlink present (target has no .git — cannot verify pin)"
        fi
      else
        log "lane $name: symlink present (unpinned estate)"
      fi
    elif [ -d "$CN_DIR/$name/.git" ]; then
      local cn_sha
      cn_sha=$(git -C "$CN_DIR/$name" rev-parse HEAD 2>/dev/null || echo broken)
      if [ -n "$want" ]; then
        [ "$cn_sha" = "$want" ] \
          && log "lane $name: real-dir clone @$ref in custom_nodes (accepted)" \
          || die "lane $name: $CN_DIR/$name is @${cn_sha:0:12}, SSOT pins $ref — DRIFT, resolve manually"
      else
        log "lane $name: real-dir clone in custom_nodes (unpinned estate — accepted)"
      fi
    elif [ -e "$CN_DIR/$name" ]; then
      die "lane $name: $CN_DIR/$name exists but is neither symlink nor git clone — refusing to clobber"
    else
      ln -s "$clone" "$CN_DIR/$name"
      log "lane $name: symlinked into custom_nodes"
    fi
    if [ -n "$patches" ]; then
      local script="$HERE/patches/$patches"
      [ -f "$script" ] || die "lane $name: patch script $script not found"
      log "lane $name: applying patch $patches"
      # apply.sh contract: target checkout as $1 (its default is the
      # Docker path /root/ComfyUI/... — wrong on the host).
      ( cd "$CN_DIR/$name" && bash "$script" "$(pwd)" ) \
        || die "lane $name: patch script $patches FAILED"
    fi
    if [ -f "$clone/requirements.txt" ]; then
      log "lane $name: pip requirements"
      "$COMFYUI_VENV/bin/pip" install -q -r "$clone/requirements.txt" \
        || die "lane $name: pip requirements FAILED"
    fi
    if [ -n "$pip" ] && [ "$pip" != ";" ]; then
      local p
      IFS=';' read -ra _ps <<< "$pip"
      for p in "${_ps[@]}"; do
        [ -n "$p" ] || continue
        log "lane $name: pip $p"
        "$COMFYUI_VENV/bin/pip" install -q "$p" \
          || die "lane $name: pip install $p FAILED"
      done
    fi
  done <<< "$tsv"
  log "lane: done ($(printf '%s\n' "$tsv" | wc -l) packs installed)"
}

# ─────────────────────────────────────────────────────────────────────
# Models: PROJECTED from the catalog (model_manifest.py walks every
# model.yaml provisions block). TSV: dest<TAB>url<TAB>bytes<TAB>sha256
# <TAB>optional?. sha256 is VERIFIED on every fresh download; present
# files are trusted on size match unless INF_VERIFY_PRESENT=1.
# ─────────────────────────────────────────────────────────────────────
sha_of() { sha256sum "$1" 2>/dev/null | cut -d' ' -f1; }

models_tsv() {
  python3 "$HERE/model_manifest.py" "$REPO_ROOT" \
    || die "models: catalog projection failed — fix the model.yaml named above"
}

install_models() {
  local dest url bytes want_sha optional
  while IFS=$'\t' read -r dest url bytes want_sha optional; do
    case "$dest" in ''|'#'*) continue ;; esac
    if [ "$optional" = "optional" ] && [ "${INF_INSTALL_OPTIONAL:-0}" != "1" ]; then
      log "model $dest: optional — skipped (INF_INSTALL_OPTIONAL=1 to install)"
      continue
    fi
    local target="$MODELS_DIR/$dest"
    mkdir -p "$(dirname "$target")"
    if [ -f "$target" ]; then
      local have
      have=$(stat -c %s "$target")
      if [ "$have" = "$bytes" ]; then
        if [ -n "$want_sha" ] && [ "${INF_VERIFY_PRESENT:-0}" = "1" ]; then
          local got
          got=$(sha_of "$target")
          [ "$got" = "$want_sha" ] \
            && log "model $dest: present + sha OK — skip" \
            || { log "model $dest: SHA MISMATCH (have $got want $want_sha) — re-downloading"; rm -f "$target"; }
        else
          log "model $dest: present ($bytes B) — skip"
        fi
      else
        log "model $dest: SIZE MISMATCH (have $have want $bytes) — re-downloading"
        rm -f "$target"
      fi
    fi
    [ -f "$target" ] && continue
    log "model $dest: downloading $url"
    curl -L -C - --fail -o "$target.part" "$url" && mv "$target.part" "$target" \
      || { log "model $dest: DOWNLOAD FAILED"; rm -f "$target.part"; continue; }
    if [ -n "$want_sha" ]; then
      local got
      got=$(sha_of "$target")
      [ "$got" = "$want_sha" ] \
        && log "model $dest: sha256 verified" \
        || die "model $dest: DOWNLOADED FILE FAILED sha256 (have $got want $want_sha) — catalog entry is stale or the URL serves different bytes"
    fi
  done < <(models_tsv)
}

checksums() {
  local dest _url _bytes _sha _opt
  while IFS=$'\t' read -r dest _url _bytes _sha _opt; do
    case "$dest" in ''|'#'*) continue ;; esac
    [ -f "$MODELS_DIR/$dest" ] && (cd "$MODELS_DIR" && sha256sum "$dest")
  done < <(models_tsv)
}

case "${1:-all}" in
  --core)       install_core ;;
  --lane)       install_lane required ;;
  --lane-all)   install_lane all ;;
  --models)     install_models ;;
  --checksums)  checksums ;;
  all)          install_core; install_lane required; install_models ;;
  *) echo "unknown flag: $1" >&2; exit 2 ;;
esac
log "done"
