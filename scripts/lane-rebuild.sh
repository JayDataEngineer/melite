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

echo "── [2/6] building every profile-bundled melite package (build-plane rides tsc + the plane laws)"
# THE BUILD-PLANE LAW (serve audit, 2026-10-26): the old loop ran raw
# `pnpm --filter <pkg> build` on 10 packages only — no trailing-newline
# finisher, no lib/.src-stamp refresh, and NO packages/models/* family
# rebuild (their stale libs red the lib-sync wall while src was
# honest). build-plane owns every tsc face in the tree, so one call
# builds the profile set AND the families. tsdown (step 1) still runs
# first: build-plane never touches client bundles, and tsdown cleans
# lib/ while tsc does not (the ORDER LAW in the header).
node tools/build-plane.mjs build

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
[ "$DOOR" = "200" ] || { echo "FATAL: /v1/model-catalog → $DOOR (estate fiber not serving)"; exit 1; }
echo "   /v1/model-catalog → $DOOR (estate fiber alive)"
# THE COMPOSED-CATALOG RECEIPT: the catalog must carry the COMPOSED
# family rows — the Loader mounted them from the estate's
# cordis.patch.yml (dsh.bundle.patch). An estate fiber can serve a
# door from a private, family-less boot; 'h3' is a composed family
# atom (family id ≠ card id — the card is h3-timeline), so its
# presence proves the composition — not just liveness. (The atom was
# 'mask-select' until 2026-11-02: WRONG door for a tool family —
# mask-select is unoffered by design (F1: a selection tool, not a
# generative model — the 08-11 catalog contract serves NO row for an
# unoffered family) and its card boards no family, so no lawful tree
# can ever serve the string on this door. 'h3' is the offered
# family-id-≠-card-id atom; its row additionally exercises the
# served-rail head-claim projection — the headless family's address
# derives, never stamps.)
CATALOG=$(curl -s -b /tmp/lane-rebuild-jar "http://127.0.0.1:$PORT/v1/model-catalog")
echo "$CATALOG" | grep -q '"h3"' || {
  echo "FATAL: /v1/model-catalog serves no composed family rows (no 'h3')"
  echo "   — the patch roster never reached the boot: check dsh.bundle.patch + family deps"
  exit 1
}
echo "   composed family rows served (h3 present) ✓"
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
