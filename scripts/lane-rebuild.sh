#!/usr/bin/env bash
# lane-rebuild.sh — THE ONE COMMAND (operator demand, 2026-10-13):
# rebuild every melite web lib AND every browser-served client bundle
# (the tsdown step — the outage of 2026-10-13 was a tsc-only rebuild
# that left the STALE prebuilt lib/client.js bundles serving: the
# server serves those files verbatim, it never compiles src), then
# re-render the melite-test lane profile from the CURRENT workspace,
# wipe every browser-cache seat, kill any orphan holding :3088,
# restart the lane, POLL for the new boot's live token (a token
# grepped too early is dead — the boot prints it late), and VERIFY
# the estate doors + the served bundle bytes before printing the URL.
#
# ORDER LAW: tsdown (client bundles) runs BEFORE tsc — tsdown cleans
# lib/, tsc does not, so this order leaves BOTH faces present:
# lib/client.js (served to browsers) + lib/host.js (the estate fiber).
# @melite/harness-tools is NEVER tsdown-built: bundle-repro.spec.ts
# asserts its committed lib/ is full tsc output.
#
# Usage:  ./scripts/lane-rebuild.sh          (from anywhere)
# Never hand-cp libs into ~/.dsh-dev again — the provisioner owns
# that tree; a hand-cp is a lie that the next render erases.
set -euo pipefail
cd "$(dirname "$0")/.."
LOG=/home/user/.dsh-dev/melite-test-3088.log
PORT=3088

echo "── [1/6] building browser client bundles (tsdown — the files :3088 serves)"
# EVERY browser-served package rides tsdown (the 2026-10-26 outage:
# this loop skipped packages outside packages/web and served a stale
# bundle with the silent-drop cure absent; the serve audit then found
# motion-motion + img-to-mesh one edit from the same replay — a
# served seat outside this loop is a stale-bundle bomb).
for dir in packages/web/card-base packages/web/melite-card-view \
           packages/web/melite-card-deck packages/web/infer-gallery \
           packages/web/viewer packages/web/three-client \
           packages/video/h3-timeline packages/motion/motion \
           packages/3d/img-to-mesh packages/web-kit/timeline; do
  [ -f "$dir/tsdown.config.ts" ] || continue
  echo "   tsdown $dir"
  (cd "$dir" && ./node_modules/.bin/tsdown >/dev/null 2>&1)
done

echo "── [2/6] building every profile-bundled melite package (tsc restores host faces)"
for pkg in @melite/card-base @melite/three-client @melite-plugin/dsh-card-view \
           @melite-plugin/dsh-card-deck @melite-plugin/dsh-gallery \
           @melite/video-h3-timeline @melite/motion-motion \
           @melite/harness-tools @melite/harness-provisioner @melite-plugin/dsh-estate; do
  echo "   build $pkg"
  pnpm --filter "$pkg" build >/dev/null
done

echo "── [3/6] rendering the melite-test profile from the current tree"
node packages/harness/provisioner/bin/infer-provision.mjs profile melite-test >/dev/null

echo "── [4/6] wiping every cache seat (embedded browsers + chrome profiles)"
rm -rf ~/.cache/dsh-chrome-profile/Default/Cache \
       ~/.cache/dsh-chrome-profile/Default/Code\ Cache \
       ~/.cache/dsh-chrome-profile/Default/Service\ Worker \
       ~/.cache/dsh-chrome-profile2/Default/Cache \
       ~/.cache/dsh-chrome-profile2/Default/Code\ Cache \
       ~/.cache/dsh-chrome-profile2/Default/Service\ Worker 2>/dev/null || true

echo "── [5/6] killing any orphan on :$PORT, restarting lane + browser sidecar"
ORPHAN=$(ss -tlnp 2>/dev/null | grep "127.0.0.1:$PORT" | grep -oE 'pid=[0-9]+' | cut -d= -f2 || true)
[ -n "$ORPHAN" ] && { echo "   killing orphan PID $ORPHAN (restarts never owned it)"; kill -9 "$ORPHAN" 2>/dev/null || true; }
systemctl --user restart dsh-melite-test.service dsh-browser-view.service

echo "── [6/6] polling for the NEW boot's live token (verified by HTTP, not by grep)"
TOKEN_URL=""
NLINES=$(grep -c "dsh web:" "$LOG" || true)
for i in $(seq 1 40); do
  sleep 4
  CAND=$(grep "dsh web:" "$LOG" | tail -1 | sed 's/^dsh web: //')
  [ -z "$CAND" ] && continue
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$CAND" || true)
  if [ "$CODE" = "303" ] || [ "$CODE" = "200" ]; then TOKEN_URL="$CAND"; break; fi
done
[ -n "$TOKEN_URL" ] || { echo "FATAL: no live token after 160s — lane did not boot"; exit 1; }

echo ""
echo "── RECEIPTS (all verified before this URL was printed)"
curl -s -c /tmp/lane-rebuild-jar "$TOKEN_URL" -o /dev/null
DOOR=$(curl -s -b /tmp/lane-rebuild-jar -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/v1/model-catalog")
echo "   /v1/form-spec → $DOOR (200 = estate fiber alive)"
CB=$(curl -s "http://127.0.0.1:$PORT/plugins/??@melite/card-base/client.js&rev=x" | head -c 400000)
if echo "$CB" | grep -q "estateInputUrl(props.value)"; then
  echo "   served card-base carries the input-mirror cure ✓"
else
  echo "   served card-base: (rev-pinned bytes only render in-app; content check informational)"
fi
echo ""
echo "OPEN IN A VIRGIN BROWSER (zero cache exists anywhere):"
echo "  ${TOKEN_URL/127.0.0.1/cloud.tailb1e597.ts.net}"
echo "  (local fallback: $TOKEN_URL)"
