#!/usr/bin/env bash
# regen-profile-paths.sh — repin the profile ymls' absolute paths to
# THIS checkout. The cordis ymls name plugin files and run roots by
# absolute path (the dsh profile contract), so a fresh clone runs this
# once after pnpm install. package.json links are already relative and
# need nothing.
#
# usage: scripts/regen-profile-paths.sh   (from anywhere in the repo)
set -euo pipefail

REPO="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
OLD_PREFIX='${MELITE_PREV_REPO_ROOT:-}'   # optional: repin from a moved path

for f in "$REPO"/profile/cordis.base.yml "$REPO"/profile/cordis.patch.yml; do
  [ -f "$f" ] || continue
  if [ -n "$OLD_PREFIX" ]; then
    sed -i "s|$OLD_PREFIX|$REPO|g" "$f"
  fi
  # strip any prior absolute pin of this repo, then pin the current one
  sed -i -E "s|/[^\" ]*/inference\.cpp|$REPO|g" "$f"
  echo "repinned: $f"
done
