#!/usr/bin/env bash
# Deploy game-kit lanes into the gateway runtime dir (data/pipelines/).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cp -v "$ROOT"/game-kit/{sfx,music,vo,icons-ui,ground-textures,sprites-2d}/*.yaml "$ROOT"/data/pipelines/
cp -v "$ROOT"/game-kit/props-3d/*.yaml "$ROOT"/data/pipelines/
cp -v "$ROOT"/game-kit/races/*.yaml "$ROOT"/data/pipelines/
# creatures-forge templates deploy on demand (agent copies+renames there)

# Sync skills into the DSH catalog (~/.dsh/skills) so subagents can load
# them by name (catalog name = gamekit-<folder>).
for d in "$ROOT"/game-kit/*/; do
  name="$(basename "$d")"
  [ -f "$d/SKILL.md" ] || continue
  mkdir -p "$HOME/.dsh/skills/gamekit-$name"
  cp -v "$d/SKILL.md" "$HOME/.dsh/skills/gamekit-$name/SKILL.md"
done
echo "deployed. validate with:"
echo "  curl -s -X POST localhost:33081/v1/pipelines/yaml/validate -d '{\"yaml\":\"audio_sfx_wave.yaml\"}'"
