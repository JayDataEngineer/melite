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
# deployment env (.env is gitignored; .env.example documents every knob)
[ -f ./.env ] && . ./.env   # env-file loaded
LOG="$HOME/.dsh-dev/melite-test-3088.log"
PORT=3088
# THE RENDER CONTRACT (the model-loss cure, 2026-11-06): the profile
# render MUST carry the same flags lane-sync uses — a FLAGLESS render
# regenerates cordis.patch.yml wholesale with an EMPTY operator-rows
# splice, deleting every LLM row (llm-pi-ai, agent-default-model) and
# the agentRoute pin: the lane then boots with ZERO LLM models while
# the script's llm-blind receipts still print success.
PROFILE="${LANE_PROFILE:-melite-test}"
DSH_HOME="${LANE_DSH_HOME:-$HOME/.dsh-dev}"
# The seat is the PRIMARY brain (zai/glm-5.3-flash, same as :3080's
# MELITE_AGENT_ROUTE). It sat on the muse FALLBACK until 2026-10-20 —
# every lane-sync re-pin stuck the lane on muse and the rate-limit
# "switch back" never reached it (owner report 2026-10-20). LANE_ROUTE
# still overrides for a deliberate muse seat.
ROUTE="${LANE_ROUTE:-zai/glm-5.3-flash}"
ROWS="dev_docs/deployment/studio-lane-rows.yml"

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
  # FAIL LOUD (the 2026-10-30 outage: this line discarded the voice and
  # set -e killed the script after a bare "tsdown <dir>" echo — card-base
  # had never DECLARED tsdown; its bin had only ever resolved through the
  # long-dead tracked node_modules symlink, so the honest per-package
  # install exited 127 into /dev/null and :3088 never came up). The
  # output still rides the null device while the build is green; a red
  # build prints its own tail, naming the package and the cure door.
  TS_ERR="$(mktemp)"
  if ! (cd "$dir" && ./node_modules/.bin/tsdown >"$TS_ERR" 2>&1); then
    echo "TSDOWN FAILED: $dir (tail of its own output; a missing ./node_modules/.bin/tsdown means the package does not declare the tsdown devDep — every browser-served package must)"
    tail -12 "$TS_ERR"
    rm -f "$TS_ERR"
    exit 1
  fi
  rm -f "$TS_ERR"
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

echo "── [3/6] rendering the $PROFILE profile from the current tree (lane-sync's render contract)"
node packages/harness/provisioner/bin/infer-provision.mjs profile "$PROFILE" \
  --dsh-home "$DSH_HOME" \
  --estate-agent-route "$ROUTE" \
  --profile-rows "$ROWS" >/dev/null
# (the model-loss wall, 2026-11-06) the render is only honest if the
# LLM rows + the agent route SURVIVED it — a stripped render reboots
# a modelless lane that every downstream receipt still calls green.
PATCH="$DSH_HOME/profiles/$PROFILE/cordis.patch.yml"
grep -q 'llm-pi-ai' "$PATCH" || { echo "RENDER REFUSED: $PATCH carries no llm-pi-ai rows — the LLM models would vanish (see dev_docs/audits/features/lane-rebuild-model-loss-2026-11-06.md)"; exit 1; }
grep -q 'agentRoute' "$PATCH" || { echo "RENDER REFUSED: $PATCH lost the agentRoute pin — the estate agent would not seat"; exit 1; }
echo "   render verified: llm-pi-ai rows + agentRoute present in $PATCH"
# THE RENDER-PROVENANCE FRESHNESS GATE (HMR audit 009 F5, 2026-10-24):
# the receipts at [6/6] prove the BOOT — this gate proves the RENDER.
# The provisioner stamps render-provenance.json (who/what/when) beside
# the profile; a render that silently failed (or a profile tree a hand
# `pnpm add` mutated after the fact) leaves a stale stamp naming a
# DIFFERENT tree than HEAD, and every downstream receipt would still
# go green over the stale bytes. The stamp must name THIS commit and
# carry a fresh renderedAt (the render ran seconds ago in step 3).
PROV="$DSH_HOME/profiles/$PROFILE/render-provenance.json"
PROV_FILE="$PROV" PROV_HEAD="$(git rev-parse HEAD)" node -e '
 const fs = require("fs");
 const file = process.env.PROV_FILE, head = process.env.PROV_HEAD;
 let p;
 try { p = JSON.parse(fs.readFileSync(file, "utf8")); }
 catch { console.error("RENDER REFUSED: " + file + " is unreadable — the provisioner never stamped this render"); process.exit(1); }
 if (p.source?.commit !== head) {
   console.error("RENDER REFUSED: render-provenance names commit " + p.source?.commit + " but HEAD is " + head + " — the profile renders a different tree; re-run the render (never hand-cp into ~/.dsh-dev)");
   process.exit(1);
 }
 const ageMin = (Date.now() - Date.parse(p.renderedAt)) / 60000;
 if (!(ageMin >= 0 && ageMin < 10)) {
   console.error("RENDER REFUSED: render-provenance renderedAt " + p.renderedAt + " is not fresh (" + ageMin.toFixed(1) + " min old) — a stale render serves stale bytes under green receipts");
   process.exit(1);
 }
 console.log("   render provenance fresh: " + p.source.commit.slice(0, 9) + " rendered " + ageMin.toFixed(1) + " min ago" + (p.source.dirty ? " (dirty tree — uncommitted bytes ride the render)" : "") + " \u2713");
'

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
# THE QUEUE-DOOR RECEIPTS (2026-10-24 debt, the silent-green class):
# catalog-200 proves only the catalog row. Five boots (2026-10-23)
# passed every check above while drafts/runs answered seatless 502s —
# a dead required row settles green under cordis, the estate serves
# the catalog from a half-up composition. The settle gate now refuses
# such boots at apply time; these receipts are the door-side proof on
# the SAME boot. The pending gate stamps at FIRST REQUEST (permanent
# agentPresets/tools/pluginMarket waiters keep estateStillActivating
# true), so the first probe may 503 — poll through the 120s grace and
# demand a seated 200 within the budget. A seatless boot fails here.
door_poll () { # $1 = path, $2 = label
	local code waited=0
	# first request starts the pending stamp
	code=$(curl -s -b /tmp/lane-rebuild-jar -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT$1")
	for i in $(seq 1 42); do
		[ "$code" = "200" ] && break
		sleep 4; waited=$((waited + 4))
		code=$(curl -s -b /tmp/lane-rebuild-jar -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT$1")
	done
	if [ "$code" != "200" ]; then
		echo "FATAL: $2 → $code after ${waited}s — the queue plane never seated"
		echo "   — the silent-green class: check the boot log for the settle gate's refusal"
		exit 1
	fi
	echo "   $2 → 200 (${waited}s past first request) ✓"
}
door_poll "/v1/flows/drafts" "GET /v1/flows/drafts (drafts seat)"
door_poll "/v1/flows/runs?limit=1" "GET /v1/flows/runs  (runs seat)"
CB=$(curl -s "http://127.0.0.1:$PORT/plugins/??@melite/card-base/client.js&rev=x" | head -c 400000)
if echo "$CB" | grep -q "estateInputUrl(props.value)"; then
  echo "   served card-base carries the input-mirror cure ✓"
else
  echo "   served card-base: (rev-pinned bytes only render in-app; content check informational)"
fi
echo ""
echo "OPEN IN A VIRGIN BROWSER (zero cache exists anywhere):"
echo "  ${TOKEN_URL/127.0.0.1/${MELITE_PUBLIC_HOST:-127.0.0.1}}"
echo "  (local fallback: $TOKEN_URL)"
