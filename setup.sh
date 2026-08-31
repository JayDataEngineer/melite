#!/usr/bin/env bash
# inference.cpp — Unified bootstrap. One path, one truth.
#
# Reads all plugin declarations (nodes.yaml + model.yaml + CMakeLists.txt)
# and installs everything. Docker and bare metal call the same script.
#
# Usage:
#   ./setup.sh                    # everything
#   ./setup.sh --server           # C++ server only
#   ./setup.sh --extensions       # ComfyUI extensions only
#   ./setup.sh --models           # model downloads only
#   ./setup.sh --server --extensions --models  # explicit all
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

RED="\033[0;31m"; GREEN="\033[0;32m"; YELLOW="\033[1;33m"; NC="\033[0m"
info()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[setup]${NC} $*"; }
error() { echo -e "${RED}[setup]${NC} $*" >&2; exit 1; }

# ── Flags ──────────────────────────────────────────────────────────
DO_SERVER=false; DO_EXT=false; DO_MODELS=false; DO_ALL=true
for arg in "$@"; do
  case "$arg" in
    --server)      DO_SERVER=true; DO_ALL=false ;;
    --extensions)  DO_EXT=true; DO_ALL=false ;;
    --models)      DO_MODELS=true; DO_ALL=false ;;
    --help|-h)     echo "Usage: $0 [--server] [--extensions] [--models]"; exit 0 ;;
    *) error "Unknown flag: $arg" ;;
  esac
done
if $DO_ALL; then
  DO_SERVER=true; DO_EXT=true; DO_MODELS=true
fi

# ── 1. Submodules ──────────────────────────────────────────────────
info "Ensuring git submodules..."
git submodule update --init --recursive 2>/dev/null || warn "Submodule update failed"

# ── 2. C++ server build ───────────────────────────────────────────
if $DO_SERVER; then
  info "Building inference.cpp server..."
  CUDA_FLAG=""
  if command -v nvcc &>/dev/null && [ "${INFERENCE_CUDA:-ON}" != "OFF" ]; then
    CUDA_FLAG="-DINFERENCE_CUDA=ON"
    info "  CUDA detected — GPU build"
  else
    info "  CPU-only (set INFERENCE_CUDA=ON for GPU)"
  fi
  cmake -B build -DCMAKE_BUILD_TYPE=Release -DINFERENCE_BUILD_TESTS=ON $CUDA_FLAG
  cmake --build build -j"$(nproc 2>/dev/null || echo 4)"
  info "Server binary: build/inference_cli"
fi

# ── 3. ComfyUI extensions ─────────────────────────────────────────
if $DO_EXT; then
  COMFYUI_DIR="${COMFYUI_DIR:-/opt/ComfyUI}"
  CUSTOM_NODES="$COMFYUI_DIR/custom_nodes"
  VENV_PYTHON="$COMFYUI_DIR/.venv/bin/python"

  if [ ! -d "$COMFYUI_DIR" ]; then
    warn "ComfyUI dir $COMFYUI_DIR not found — skipping extensions"
  else
    info "Merging plugin extensions..."
    MERGED=$(python3 "$HERE/infra/extension_lane.py" --repo "$HERE" 2>&1) \
      || error "extension_lane.py failed"

    # Parse merged YAML — extract required extensions
    EXTS=$(echo "$MERGED" | python3 -c "
import sys, yaml
data = yaml.safe_load(sys.stdin.read())
exts = data.get('extensions', [])
for e in exts:
    if e.get('required', False):
        name = e['name']
        url = e.get('url', '')
        ref = e.get('ref', '')
        pip_deps = e.get('pip', [])
        print(f'{name}|{url}|{ref}|{\";\".join(pip_deps)}')
" 2>/dev/null) || error "Failed to parse merged extensions"

    INSTALLED=0; SKIPPED=0; FAILED=0
    while IFS='|' read -r name url ref pip_deps; do
      [ -z "$name" ] && continue
      DEST="$CUSTOM_NODES/$name"

      # In-tree packs (no url) — skip clone, just verify
      if [ -z "$url" ]; then
        if [ -d "$DEST" ]; then
          info "  [OK] $name (in-tree)"
          ((SKIPPED++))
        else
          warn "  [MISSING] $name (in-tree, no url)"
          ((FAILED++))
        fi
        continue
      fi

      # Already present
      if [ -d "$DEST" ]; then
        info "  [SKIP] $name (exists)"
        ((SKIPPED++))
        continue
      fi

      # Clone
      info "  [CLONE] $name ..."
      flags="--depth 1"
      [ -n "$ref" ] && flags="$flags --branch $ref"
      if git clone $flags "$url" "$DEST" 2>&1 | tail -1; then
        info "  [OK] $name"
        ((INSTALLED++))
      else
        warn "  [FAIL] $name"
        ((FAILED++))
        continue
      fi

      # Pip deps
      if [ -n "$pip_deps" ] && [ -f "$DEST/requirements.txt" ]; then
        IFS=';' read -ra DEPS <<< "$pip_deps"
        for dep in "${DEPS[@]}"; do
          [ -z "$dep" ] && continue
          "$VENV_PYTHON" -m pip install -q "$dep" 2>/dev/null \
            && info "    pip: $dep" || warn "    pip: $dep (failed)"
        done
      fi
    done <<< "$EXTS"

    info "Extensions: $INSTALLED installed, $SKIPPED skipped, $FAILED failed"
  fi
fi

# ── 4. Model downloads ────────────────────────────────────────────
if $DO_MODELS; then
  info "Model provisioning..."
  # Walk all model.yaml provisions and download missing files
  python3 -c "
import glob, os, sys, yaml, subprocess, hashlib

repo = '$HERE'
comfyui_root = os.environ.get('COMFYUI_DIR', '/opt/ComfyUI')
pattern = os.path.join(repo, 'plugins', '*', 'models', '**', 'model.yaml')
downloaded = 0; skipped = 0; failed = 0

for path in sorted(glob.glob(pattern, recursive=True)):
    with open(path) as f:
        cfg = yaml.safe_load(f) or {}
    fam = cfg.get('family') or {}
    provisions = fam.get('provisions') or cfg.get('provisions') or []
    for p in provisions:
        name = p.get('name', '')
        url = p.get('url', '')
        sha = p.get('sha256', '')
        sub = (p.get('dest') or {}).get('sub', '')
        if not url or not name:
            continue
        dest = os.path.join(comfyui_root, 'models', sub, name) if sub else \
               os.path.join(comfyui_root, 'models', name)
        if os.path.exists(dest):
            skipped += 1
            continue
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        print(f'  [DL] {name} -> models/{sub}/', flush=True)
        try:
            subprocess.run(['curl', '-sL', '--retry', '3', '--retry-delay', '5',
                           '-o', dest, url], check=True, timeout=600)
            if sha:
                h = hashlib.sha256(open(dest, 'rb').read()).hexdigest()
                if h != sha:
                    print(f'  [FAIL] {name}: sha256 mismatch', file=sys.stderr)
                    os.remove(dest)
                    failed += 1
                    continue
            downloaded += 1
        except Exception as e:
            print(f'  [FAIL] {name}: {e}', file=sys.stderr)
            failed += 1

print(f'Models: {downloaded} downloaded, {skipped} skipped, {failed} failed')
" || warn "Model download encountered errors"
fi

# ── 5. Done ────────────────────────────────────────────────────────
info "=========================================="
info "Setup complete!"
info "=========================================="
info ""
info "Run (single machine):"
info "  ComfyUI:  cd /opt/ComfyUI && python3 main.py --listen --port 18465"
info "  Server:   cd build && ./inference_cli serve --port 18090 --plugin-dir . --catalog-dir .."
info ""
info "Run (Tailscale / LAN — bind to all interfaces):"
info "  Server:   cd build && ./inference_cli serve --port 18090 --bind 0.0.0.0 --plugin-dir . --catalog-dir .."
info "  Apps:     http://<tailscale-ip>:18090/apps"
info ""
info "Run (Docker):  docker compose up -d"
info "Health:  curl http://127.0.0.1:18090/v1/health"
