#!/usr/bin/env bash
# inference.cpp — One-shot bootstrap from a clean git clone.
# Usage: ./setup.sh [--server] [--comfyui] [--provision]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

RED="\033[0;31m"; GREEN="\033[0;32m"; YELLOW="\033[1;33m"; NC="\033[0m"
info()  { echo -e "${GREEN}[setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[setup]${NC} $*"; }
error() { echo -e "${RED}[setup]${NC} $*" >&2; exit 1; }

DO_SERVER=true; DO_COMFYUI=true; DO_PROVISION=false
for arg in "$@"; do
  case "$arg" in
    --server)    DO_COMFYUI=false ;;
    --comfyui)   DO_SERVER=false ;;
    --provision) DO_PROVISION=true ;;
    --help|-h)   echo "Usage: $0 [--server] [--comfyui] [--provision]"; exit 0 ;;
    *) error "Unknown flag: $arg" ;;
  esac
done

# --- 1. Submodules ---
info "Ensuring git submodules..."
git submodule update --init --recursive 2>/dev/null || warn "Submodule update failed"

# --- 2. Custom nodes check ---
if [ ! -d custom_nodes/melite-audio-nodes ]; then
  error "custom_nodes not found. Run: git clone --recursive <repo>"
fi
info "Custom nodes: $(ls -d custom_nodes/*/ | wc -l) packs present"

# --- 3. C++ server build ---
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

# --- 4. ComfyUI setup (delegates to infra/comfyui/bootstrap.sh) ---
if $DO_COMFYUI; then
  info "ComfyUI setup (core @pin + lane SSOT + models)..."
  bash "$HERE/infra/comfyui/bootstrap.sh" --core || error "bootstrap --core failed (see bootstrap output)"
  bash "$HERE/infra/comfyui/bootstrap.sh" --lane || error "bootstrap --lane failed (see bootstrap output)"
  bash "$HERE/infra/comfyui/bootstrap.sh" --models || error "bootstrap --models failed (see bootstrap output)"
  info "  ComfyUI lane ready (core + $(grep -c 'name:' plugins/comfyui/nodes/extensions.yaml) declared packs + lane models)"
fi

# --- 5. Model provisioning ---
if $DO_PROVISION; then
  info "Model provisioning: use POST /v1/models/provision after servers are running"
fi

# --- 6. Done ---
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