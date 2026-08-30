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

# --- 4. ComfyUI setup ---
if $DO_COMFYUI; then
  COMFYUI_DIR="${COMFYUI_DIR:-/opt/ComfyUI}"
  info "ComfyUI setup..."
  if [ ! -d "$COMFYUI_DIR" ]; then
    info "  Cloning ComfyUI to $COMFYUI_DIR..."
    git clone https://github.com/comfyanonymous/ComfyUI.git "$COMFYUI_DIR"
  fi
  cd "$COMFYUI_DIR"
  pip install -r requirements.txt 2>/dev/null || pip3 install -r requirements.txt
  MANAGER="$COMFYUI_DIR/custom_nodes/ComfyUI-Manager"
  if [ ! -d "$MANAGER" ]; then
    info "  Installing ComfyUI-Manager..."
    git clone https://github.com/ltdrdata/ComfyUI-Manager.git "$MANAGER"
  fi
  cd "$HERE"

  # Install custom node packs from extensions.yaml
  info "  Installing custom node packs into ComfyUI..."
  python3 - "$COMFYUI_DIR" "$HERE" << 'INSTPY'
import yaml, subprocess, sys, os
comfyui_dir = sys.argv[1]
project_dir = sys.argv[2]
custom_nodes = os.path.join(comfyui_dir, "custom_nodes")
ext_yaml = os.path.join(project_dir, "plugins/gens/nodes/extensions.yaml")
if not os.path.exists(ext_yaml):
    print(f"WARN: {ext_yaml} not found"); sys.exit(0)
data = yaml.safe_load(open(ext_yaml))
for ext in data.get("extensions", []):
    name = ext["name"]
    target = os.path.join(custom_nodes, name)
    url = ext.get("url")
    ref = ext.get("ref")
    if url:
        if not os.path.isdir(target):
            print(f"  Cloning {name}")
            subprocess.run(["git", "clone", url, target], check=True)
            if ref:
                subprocess.run(["git", "-C", target, "checkout", ref], check=True)
    else:
        source = os.path.join(project_dir, "custom_nodes", name)
        if os.path.isdir(source) and not os.path.isdir(target):
            print(f"  Symlinking {name}")
            os.symlink(source, target)
        elif os.path.isdir(target):
            print(f"  {name} already present")
        else:
            print(f"  WARN: {name} source not found at {source}")
    for pip_req in ext.get("pip", []):
        print(f"  pip install {pip_req}")
        subprocess.run([sys.executable, "-m", "pip", "install", pip_req], check=False)
print("Custom node setup complete.")
INSTPY
  info "  ComfyUI ready at $COMFYUI_DIR"
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