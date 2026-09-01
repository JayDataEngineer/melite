#!/bin/bash
# ═════════════════════════════════════════════════════════════════════════════
# apply.sh — melite-fork patches for heshengtao/comfyui_LLM_party
# ═════════════════════════════════════════════════════════════════════════════
# Neutralizes the four startup auto-installers that fire at import time
# (__init__.py lines 130-171). The extension is API-first; our LLM card
# INJECTS credentials from the keystore, so the extension's own install +
# fallback paths are dead weight that actively threatens the container:
#
#   install_llama  → pip-installs llama-cpp-python from an abetlen wheel
#                    index with cu121/cu122/cu124/metal/cpu only. Our image
#                    is cu130 (torch.version.cuda = 13.0) → no matching wheel
#                    → falls back to source build (nvcc, 20+ min, fragile).
#                    SKIPPED by writing config.ini [API_KEYS] fast_installed=True
#                    (the extension's OFFICIAL skip path, install.py:90-92).
#
#   check_and_uninstall_websocket → uninstalls BOTH `websocket` AND
#                    `websocket-client` when the impostor `websocket` package
#                    is present. We DEPEND on `websocket-client` for our WS
#                    listener (media/comfyui/client.py) — this call is a
#                    landmine. No-op'd.
#
#   install_portaudio → tries apt-get portaudio19-dev / brew. Harmless in
#                    Docker (the try/except prints the error) but noisy.
#                    No-op'd.
#
#   manage_discord_packages → uninstalls discord.py if present. No-op'd
#                    (defense-in-depth — no card uses it).
#
# Idempotent: a sentinel file under .patches-applied/ guards every edit.
# ═════════════════════════════════════════════════════════════════════════════
set -euo pipefail

NODES="${1:-/root/ComfyUI/custom_nodes/comfyui_LLM_party}"
NODES="$(cd "$NODES" 2>/dev/null && pwd)" || NODES="$(realpath "$NODES" 2>/dev/null || echo "$NODES")"
export NODES
echo "[comfyui-llm-party-patches] Applying to ${NODES}"

if [ ! -f "$NODES/__init__.py" ] || [ ! -f "$NODES/install.py" ]; then
    echo "[comfyui-llm-party-patches] FATAL: $NODES is not a comfyui_LLM_party checkout"
    exit 1
fi

SENTINEL_DIR="$NODES/.patches-applied"
mkdir -p "$SENTINEL_DIR"

# ─── Layer A: write config.ini (skip llama-cpp-python install) ───────────
# Written BEFORE the extension's copy_config() runs (it only copies when
# config.ini DOESN'T exist — our pre-written file wins). Keys never go
# here; the LLM card injects them per-node from the keystore. The
# fast_installed=True key is the extension's official skip path for the
# llama-cpp-python wheel install (install.py:90-92).
CONFIG_SENTINEL="$SENTINEL_DIR/config.ini"
if [ -f "$CONFIG_SENTINEL" ]; then
    echo "[comfyui-llm-party-patches] config.ini: already written (sentinel present)"
else
    cat > "$NODES/config.ini" << 'INIEOF'
# comfyui_LLM_party config.ini — melite-fork managed.
#
# fast_installed = True: the extension's OFFICIAL skip path for the
# llama-cpp-python wheel install (install.py:90-92). The abetlen wheel
# index has no cu130 build; source-build would need nvcc + 20+ min.
# In-process GGUF lands later with the Forge llama.cpp subprocess.
#
# NO API KEYS HERE. The LLM card (families/llm_text.py) resolves keys
# from the keystore and INJECTS them into LLM_api_loader's base_url /
# api_key inputs — the extension's fallback chain (node → config.ini)
# never fires (NO SILENT FALLBACK).
[API_KEYS]
fast_installed = True
openai_api_key =
base_url =
INIEOF
    touch "$CONFIG_SENTINEL"
    echo "[comfyui-llm-party-patches] config.ini: written (fast_installed=True)"
fi

# ─── Layer B: no-op the four startup installers ──────────────────────────
# Each function in install.py gets a melite-fork no-op body. A marker comment
# guards idempotency — the check runs BEFORE the edit; if the marker is
# already present, the edit is skipped.
python3 - << 'PYEOF'
import os, re

NODES = os.environ.get("NODES", "/root/ComfyUI/custom_nodes/comfyui_LLM_party")
install_py = os.path.join(NODES, "install.py")
changes = []

with open(install_py, "r", encoding="utf-8") as f:
    src = f.read()

MARKER = "# melite-fork-neutralized"

# The four functions to no-op. Each gets its body replaced with a single
# `return` + the marker comment. The function signature is preserved so
# __init__.py's imports and calls still resolve.
NEUTRALIZE = [
    "install_llama",
    "check_and_uninstall_websocket",
    "install_portaudio",
    "manage_discord_packages",
]

for func_name in NEUTRALIZE:
    if f"{MARKER}:{func_name}" in src:
        changes.append(f"{func_name}: already neutralized (marker present)")
        continue

    # Match `def func_name(...):` through the next `def ` or end-of-file.
    # The body is everything indented under the def until the next
    # top-level construct. We replace the BODY (not the signature) with
    # a single return + marker.
    pattern = rf"(def {func_name}\([^)]*\)[^\n]*:\n)"
    match = re.search(pattern, src)
    if match is None:
        changes.append(f"{func_name}: FATAL — def signature not found")
        continue

    # Find the end of this function: next `def ` at column 0, or
    # a top-level class/non-indented line, or EOF.
    def_start = match.end()
    rest = src[def_start:]
    # Next top-level def/class/assignment (column 0, not a comment).
    next_def = re.search(r"\n(?:def |class |[A-Za-z_])", rest)
    if next_def:
        body_end = def_start + next_def.start()
    else:
        body_end = len(src)

    # Replace the function body with a no-op.
    noop_body = f'    """melite-fork: neutralized — see infra/docker/patches/comfyui_LLM_party/apply.sh"""\n    {MARKER}:{func_name}\n    return\n\n'
    src = src[:def_start] + noop_body + src[body_end:]
    changes.append(f"{func_name}: neutralized")

with open(install_py, "w", encoding="utf-8") as f:
    f.write(src)

for c in changes:
    print(f"[comfyui-llm-party-patches] {c}")
PYEOF

touch "$SENTINEL_DIR/install-noop"
echo "[comfyui-llm-party-patches] Done."
