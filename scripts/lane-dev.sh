#!/usr/bin/env bash
# lane-dev.sh — THE DEV BUILD for the lane's plugins (documented path:
# references/deepseek-harness/docs/development.md `dev:web` contract +
# packages/client/hmr/README.md — "any watch process using the shared
# Client tsdown preset" attaches to a host started elsewhere).
#
# What this does: one `tsdown --watch` per client-bundle package. On
# every save it rewrites lib/client.js; the lane on :3088 (already
# running) polls bundle stats, calls rebuilt(), and swaps the plugin
# into the open page over HMR — no restart, no refresh.
#
# Why nothing can go stale: every bundle URL is rev-pinned from the
# file's mtime/size and served immutable; a changed bundle gets a NEW
# rev and the old URL 404s (client-modules.md). Old bytes are
# un-serveable by construction. F5 always boots the live composition.
#
# Server-side (harness/engine src) changes still need lane-rebuild.sh
# — that script restarts the lane; this one hot-swaps browser plugins.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT=3088
LOG="$HOME/.dsh-dev/melite-test-3088.log"

if ! ss -tln 2>/dev/null | grep -q "127.0.0.1:$PORT"; then
  echo "lane on :$PORT is DOWN — start it first (systemctl --user start dsh-melite-test or ./scripts/lane-rebuild.sh)"
  exit 1
fi

# Same discovery as lane-rebuild.sh: every tsdown client package,
# except harness-tools (wall-mandated full-tsc output, never tsdown).
mapfile -t DIRS < <(find packages -name tsdown.config.ts -not -path '*/node_modules/*' -printf '%h\n' \
  | grep -v '^packages/harness/melite-tools$' | sort)

pids=()
cleanup() { kill "${pids[@]}" 2>/dev/null || true; }
trap cleanup INT TERM EXIT

for d in "${DIRS[@]}"; do
  ( cd "$d" && exec ./node_modules/.bin/tsdown --watch ) > "/tmp/lane-dev-$(basename "$d").log" 2>&1 &
  pids+=($!)
  echo "  watch  $d"
done

echo ""
echo "WATCHING ${#DIRS[@]} plugin bundles → :$PORT swaps live on save."
TOK=$(grep "dsh web:" "$LOG" 2>/dev/null | tail -1 | sed 's/^dsh web: //')
[ -n "$TOK" ] && echo "open: $TOK"
echo "stop with Ctrl-C (server-side src changes: ./scripts/lane-rebuild.sh)"
wait
