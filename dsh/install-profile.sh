#!/usr/bin/env bash
# install-profile.sh — install the inference.cpp DSH profile.
#
# Renders dsh/profile/*.tmpl into ~/.dsh/profiles/inference/ with the
# repo's absolute root baked in, installs dependencies, and reports the
# boot command. Idempotent: re-run any time (repo moved, port changed).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE_NAME="${DSH_PROFILE_NAME:-inference}"
GATEWAY_URL="${MELITE_GATEWAY:-http://localhost:33081}"
SRC_DIR="$REPO_ROOT/dsh/profile"
DST_DIR="${DSH_HOME:-$HOME/.dsh}/profiles/$PROFILE_NAME"

echo "repo root   : $REPO_ROOT"
echo "profile dir : $DST_DIR"
echo "gateway     : $GATEWAY_URL"
echo

# Sanity: the host artifacts this profile mounts must exist.
for art in \
  dsh/melite-tools/lib/index.mjs \
  dsh/melite-card-view/lib/index.js \
  dsh/infer-gallery/lib/index.js \
  dsh/melite-hello/lib/index.mjs
do
  if [ ! -f "$REPO_ROOT/$art" ]; then
    echo "ERROR: $art missing — build it first (cd dsh/<pkg> && npm run build)" >&2
    exit 1
  fi
done

mkdir -p "$DST_DIR"

# Render templates ({{REPO_ROOT}}, {{GATEWAY_URL}}).
render() {
  sed -e "s|{{REPO_ROOT}}|$REPO_ROOT|g" -e "s|{{GATEWAY_URL}}|$GATEWAY_URL|g" "$1" > "$2"
}
render "$SRC_DIR/package.json.tmpl"       "$DST_DIR/package.json"
render "$SRC_DIR/cordis.patch.yml.tmpl"   "$DST_DIR/cordis.patch.yml"
cp "$SRC_DIR/pnpm-workspace.yaml"         "$DST_DIR/pnpm-workspace.yaml"
# The root config the loader anchors on (rewritten by dsh itself on boot).
printf '# rendered by install-profile.sh\n[]\n' > "$DST_DIR/cordis.yml"

echo "rendered:"
echo "  $DST_DIR/package.json"
echo "  $DST_DIR/cordis.patch.yml"
echo

# Install the Inference Studio agent preset (the dropdown entry).
PRESET_DST="${DSH_HOME:-$HOME/.dsh}/.agent-presets/inference-studio"
mkdir -p "$PRESET_DST"
cp "$REPO_ROOT/dsh/inference-studio/preset.yml" \
   "$REPO_ROOT/dsh/inference-studio/agent.cordis.yml" "$PRESET_DST/"
echo "preset installed:"
echo "  $PRESET_DST/preset.yml"
echo "  $PRESET_DST/agent.cordis.yml"
echo

# Install profile dependencies (client packages link: into the repo).
if command -v pnpm >/dev/null 2>&1; then
  PM=pnpm
elif [ -x /home/user/.local/share/pnpm/pnpm ]; then
  PM=/home/user/.local/share/pnpm/pnpm
else
  echo "WARNING: pnpm not found — install it, then run: (cd $DST_DIR && pnpm install)" >&2
  PM=""
fi
if [ -n "$PM" ]; then
  echo "installing dependencies with $PM …"
  (cd "$DST_DIR" && "$PM" install)
fi

echo
echo "done. boot with:"
echo "  dsh web --profile $PROFILE_NAME --port 3081"
echo "pick \"Inference Studio\" in the new-session preset dropdown."
