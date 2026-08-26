#!/usr/bin/env bash
# Stage in-tree extension packs into ./custom_nodes/ before a docker build.
# Source of truth for WHICH packs: plugins/gens/nodes/extensions.yaml.
# Source of the pack CODE: the ray checkout (until ray retires; flip
# RAY_ROOT when the packs move in-tree here).
set -eo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
INF="$(cd "$HERE/../.." && pwd)"
export INF
RAY_ROOT="$HOME/Documents/programs/ray"
if [ -n "$PACKS_SOURCE" ]; then RAY_ROOT="$PACKS_SOURCE"; fi

NAMES=$(python3 - <<EOF
import yaml, os
d = yaml.safe_load(open(os.path.join(os.environ["INF"], "plugins/gens/nodes/extensions.yaml")))
for e in d["extensions"]:
    if not e.get("url"):
        print(e["name"])
EOF
)
mkdir -p "$INF/custom_nodes"
for name in $NAMES; do
  src="$RAY_ROOT/custom_nodes/$name"
  if [ -d "$src" ]; then
    rm -rf "$INF/custom_nodes/$name"
    cp -a "$src" "$INF/custom_nodes/$name"
    echo "staged $name"
  else
    echo "MISSING source pack: $src" >&2
    exit 1
  fi
done
echo "in-tree packs staged: $(echo "$NAMES" | wc -l)"
