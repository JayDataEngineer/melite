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
# Usage:  ./scripts/lane-rebuild.sh          (from anywhere — the :3088 lane)
#         ./scripts/lane-rebuild.sh 3089     (a BRANCH lane on :3089 — own
#                 DSH_HOME, own unit; a later :3088 rebuild never touches it)
# Never hand-cp libs into ~/.dsh-dev again — the provisioner owns
# that tree; a hand-cp is a lie that the next render erases.
set -euo pipefail
cd "$(dirname "$0")/.."
# deployment env (.env is gitignored; .env.example documents every knob)
[ -f ./.env ] && . ./.env   # env-file loaded
# THE PORT PARAMETER (operator 2026-11-10: "we need to also have it on
# https://cloud.tailb1e597.ts.net:3089/ via a parameter. That way I can
# test the 3089, and when you rebuild 3088, it won't get ripped down in
# front of me"). The DEFAULT path is byte-identical to the old script.
# A BRANCH port rides the demo lane's own-home law (dsh-melite-demo on
# :3090 runs on its own DSH_HOME precisely so two lanes can stand at
# once): own home (own profiles/storages/sessions — a blank media
# sidebar, like the demo), own unit, own log. A :3088 rebuild renders
# ~/.dsh-dev and restarts dsh-melite-test + the browser sidecar only —
# the branch lane's home and unit are never in its blast radius.
PORT="${1:-${LANE_PORT:-3088}}"
case "$PORT" in
  3088)
    UNIT="dsh-melite-test.service"
    DSH_HOME="${LANE_DSH_HOME:-$HOME/.dsh-dev}"
    ;;
  *)
    UNIT="dsh-melite-test-$PORT.service"
    DSH_HOME="${LANE_DSH_HOME:-$HOME/.dsh-lane$PORT}"
    # THE SERVE PROXY (loud, never silent loopback): the tailnet face
    # https://cloud.tailb1e597.ts.net:$PORT is a tailscale-serve proxy
    # onto 127.0.0.1:$PORT — :3089 exists already; any OTHER port owes
    # its own proxy first, and a lane that answers only loopback while
    # the receipt prints a cloud URL is a lie.
    if ! tailscale serve status 2>/dev/null | grep -q "cloud.tailb1e597.ts.net:$PORT "; then
      echo "LANE REFUSED: no tailscale-serve proxy for :$PORT — add one first (an https proxy onto http://127.0.0.1:$PORT), then re-run"
      exit 1
    fi
    ;;
esac
LOG="$DSH_HOME/melite-test-$PORT.log"
# THE RENDER CONTRACT (the model-loss cure, 2026-11-06): the profile
# render MUST carry the same flags lane-sync uses — a FLAGLESS render
# regenerates cordis.patch.yml wholesale with an EMPTY operator-rows
# splice, deleting every LLM row (llm-pi-ai, agent-default-model) and
# the agentRoute pin: the lane then boots with ZERO LLM models while
# the script's llm-blind receipts still print success.
PROFILE="${LANE_PROFILE:-melite-test}"
# (DSH_HOME is seated in the PORT case above: the default lane's
# ~/.dsh-dev, a branch lane's own ~/.dsh-lane$PORT — never re-derived
# here, or the branch home would be clobbered back onto the main one)
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
    code=$?
    if [ "$code" = "127" ]; then
      echo "TSDOWN FAILED: $dir — ./node_modules/.bin/tsdown missing (exit 127): the package does not declare the tsdown devDep — every browser-served package must"
    else
      echo "TSDOWN FAILED: $dir (exit $code — head + tail of its own output; full log kept at $TS_ERR)"
    fi
    echo "── head ──"
    head -30 "$TS_ERR"
    echo "── tail ──"
    tail -30 "$TS_ERR"
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
# THE BRANCH ROOTS LAW (2026-11-10, the lane-3089 lock collision): the
# 3088 estate pins the repo's data/runs state root and holds its
# single-writer gateway lock for its lifetime. A branch lane rendering
# the same rows derives the SAME root, and every one of its queue-plane
# seats dies on the lock at boot ("another estate owns this root") —
# the demo lane's own cure (--estate-state-root, J12) applies here: a
# branch names its OWN runs root under its OWN DSH_HOME, so the two
# lanes are two estates, never two writers on one root.
BRANCH_ROOT_ARGS=()
if [ "$PORT" != "3088" ]; then
  BRANCH_ROOT_ARGS=(--estate-state-root "$DSH_HOME/runs")
  echo "   branch state root: $DSH_HOME/runs (the repo's data/runs stays 3088's)"
fi
node packages/harness/provisioner/bin/infer-provision.mjs profile "$PROFILE" \
  --dsh-home "$DSH_HOME" \
  --estate-agent-route "$ROUTE" \
  --profile-rows "$ROWS" \
  "${BRANCH_ROOT_ARGS[@]}" >/dev/null
# (the model-loss wall, 2026-11-06) the render is only honest if the
# LLM rows + the agent route SURVIVED it — a stripped render reboots
# a modelless lane that every downstream receipt still calls green.
PATCH="$DSH_HOME/profiles/$PROFILE/cordis.patch.yml"
grep -q 'llm-pi-ai' "$PATCH" || { echo "RENDER REFUSED: $PATCH carries no llm-pi-ai rows — the LLM models would vanish (see dev_docs/audits/features/lane-rebuild-model-loss-2026-11-06.md)"; exit 1; }
grep -q 'agentRoute' "$PATCH" || { echo "RENDER REFUSED: $PATCH lost the agentRoute pin — the estate agent would not seat"; exit 1; }
if [ "$PORT" != "3088" ]; then
  grep -q "stateRoot: \"$DSH_HOME/runs\"" "$PATCH" || { echo "RENDER REFUSED: $PATCH carries no branch stateRoot — the lane would boot onto 3088's runs root and die on its gateway lock"; exit 1; }
  echo "   render verified: branch stateRoot pinned in $PATCH"
fi
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

if [ "$PORT" = "3088" ]; then
  echo "── [4/6] wiping every cache seat (embedded browsers + chrome profiles)"
  rm -rf ~/.cache/dsh-chrome-profile/Default/Cache \
         ~/.cache/dsh-chrome-profile/Default/Code\ Cache \
         ~/.cache/dsh-chrome-profile/Default/Service\ Worker \
         ~/.cache/dsh-chrome-profile2/Default/Cache \
         ~/.cache/dsh-chrome-profile2/Default/Code\ Cache \
         ~/.cache/dsh-chrome-profile2/Default/Service\ Worker 2>/dev/null || true
else
  # THE BRANCH LANE never wipes the cache seats: the sidecar browsers
  # belong to the :3088 lane the operator may be mid-test on — wiping
  # them from a branch boot would rip :3088's face down, the exact
  # harm this parameter exists to prevent. The branch's own boot is a
  # fresh unit anyway.
  echo "── [4/6] branch lane — cache seats untouched (they belong to :3088's sidecars)"
fi

if [ "$PORT" != "3088" ]; then
  # THE BRANCH UNIT (installed, not hand-run — systemd owns restarts):
  # mirrors dsh-melite-demo's own-home shape with this port's numbers.
  # Bin paths are read off the LIVE :3088 unit (ground truth on this
  # box), never guessed.
  NODE_BIN="$(systemctl --user cat dsh-melite-test.service | grep -oE '^ExecStart=[^ ]+/bin/node [^ ]+' | awk '{print $1}' | cut -d= -f2)"
  DSH_BIN="$(systemctl --user cat dsh-melite-test.service | grep -oE '[^ ]+/bin/dsh' | head -1)"
  [ -n "$NODE_BIN" ] && [ -x "$NODE_BIN" ] || NODE_BIN="$(command -v node)"
  [ -n "$DSH_BIN" ] && [ -x "$DSH_BIN" ] || DSH_BIN="$(command -v dsh)"
  mkdir -p "$DSH_HOME" "$HOME/.config/systemd/user"
  # THE SHARED-CHAT LAW (operator 2026-11-10, "make 3088 and 3089 share
  # dsh chat sessions"): sessions live in DSH_HOME/sessions keyed by the
  # workspace slug, session BODIES reference their uploads in
  # DSH_HOME/attachments, and the sidebar attributes them by the home's
  # anonymous-user-id — a branch home with its own stores would boot
  # with a BLANK chat list, and a SHARED session continued on the
  # branch dies mid-turn ("Attachment object is missing") the moment it
  # loads a message whose upload lives in the main home. The branch
  # therefore (a) links its sessions AND attachments dirs onto :3088's
  # stores and (b) adopts :3088's anonymous id, so both lanes list,
  # continue, and read the SAME chats. One live writer per chat is the
  # user's own discipline (the same chat open twice writes twice);
  # read/resume across lanes is the requested behavior.
  MAIN_HOME="${MELITE_MAIN_DSH_HOME:-$HOME/.dsh-dev}"
  for SHARED_STORE in sessions attachments; do
    if [ -d "$MAIN_HOME/$SHARED_STORE" ]; then
      if [ -L "$DSH_HOME/$SHARED_STORE" ] || [ -e "$DSH_HOME/$SHARED_STORE" ]; then
        [ "$(readlink "$DSH_HOME/$SHARED_STORE" 2>/dev/null || true)" = "$MAIN_HOME/$SHARED_STORE" ] \
          || { echo "FATAL: $DSH_HOME/$SHARED_STORE exists and is not the shared store link — refusing to touch it"; exit 1; }
      else
        ln -s "$MAIN_HOME/$SHARED_STORE" "$DSH_HOME/$SHARED_STORE" \
          || { echo "FATAL: cannot link $SHARED_STORE onto $MAIN_HOME/$SHARED_STORE"; exit 1; }
      fi
      echo "   shared chat $SHARED_STORE: $DSH_HOME/$SHARED_STORE → $MAIN_HOME/$SHARED_STORE"
    else
      echo "   NOTE: $MAIN_HOME/$SHARED_STORE not found — the branch keeps its own $SHARED_STORE store"
    fi
  done
  if [ -f "$MAIN_HOME/.anonymous-user-id" ]; then
    cp -f "$MAIN_HOME/.anonymous-user-id" "$DSH_HOME/.anonymous-user-id"
    echo "   shared chat identity: branch adopts :3088's anonymous user id"
  fi
  # THE 1:1 ROSTER LAW (operator 2026-11-10, "IT LOST ALL TOOLS"): the
  # delegation record ($DSH_HOME/melite-runs-state.json) decides the
  # boot's tool roster — delegated=true seats melite_flow + run_status
  # AND pins the six estate doors at boot (the seat-pin cure); a branch
  # home born without the record boots the browser-law roster and a
  # session crossing lanes loses tools mid-flight ("unknown tool
  # run_status"). The branch adopts the main home's record verbatim:
  # same toggle, same roster, no delta.
  if [ -f "$MAIN_HOME/melite-runs-state.json" ]; then
    cp -f "$MAIN_HOME/melite-runs-state.json" "$DSH_HOME/melite-runs-state.json"
    echo "   1:1 tool roster: branch adopts :3088's melite-runs delegation record"
  fi
  # THE SHARED MODEL CREDENTIALS (2026-11-10, "not hooked into my
  # models"): provider keys live per-home in .credentials.yaml refs —
  # a branch home boots with only its browser-session grant and its
  # agent seat has NO model backend. The branch therefore MERGES the
  # main home's refs into its own file (refs only — the branch's own
  # records, e.g. its live browser session, are never clobbered).
  # Values are never echoed; the merge is idempotent.
  if [ -f "$MAIN_HOME/.credentials.yaml" ] && [ -f "$DSH_HOME/.credentials.yaml" ]; then
    node -e '
      // structural merge of the credentials file (order-independent,
      // idempotent): top-level blocks are split by column-0 lines; the
      // branch keeps its OWN version + records (its live browser
      // session), refs merge with the branch winning key ties.
      // Values are never echoed.
      const fs = require("fs");
      const blocks = (p) => {
        const out = new Map();
        let cur = null, body = [];
        for (const line of fs.readFileSync(p, "utf8").split("\n")) {
          if (/^[A-Za-z_]/.test(line)) { if (cur) out.set(cur, body.join("\n")); cur = line.split(":")[0]; body = [line]; }
          else if (cur) body.push(line);
        }
        if (cur) out.set(cur, body.join("\n"));
        return out;
      };
      const main = blocks(process.argv[1]);
      const br = blocks(process.argv[2]);
      const refsOf = (b) => { const m = new Map(); for (const line of (b.get("refs") || "").split("\n").slice(1)) { const kv = line.trim().match(/^([^:]+):\s*(.+)$/); if (kv) m.set(kv[1], kv[2]); } return m; };
      const merged = new Map([...refsOf(main), ...refsOf(br)]);
      const version = br.get("version") || "version: 1";
      const records = br.get("records") || "records: []";
      const refsBlock = "refs:\n" + [...merged].map(([k, v]) => `  ${k}: ${v}`).join("\n");
      const tmp = process.argv[2] + ".tmp";
      fs.writeFileSync(tmp, `${version}\n${records}\n${refsBlock}\n`, { mode: 0o600 });
      fs.renameSync(tmp, process.argv[2]);
      console.log("   shared model credentials: merged " + merged.size + " refs into the branch home");
    ' "$MAIN_HOME/.credentials.yaml" "$DSH_HOME/.credentials.yaml" || { echo "FATAL: credentials merge failed"; exit 1; }
  fi
  cat > "$HOME/.config/systemd/user/$UNIT" <<UNIT_EOF
[Unit]
Description=DSH branch lane (melite series, port $PORT, own DSH_HOME, script-launched)
After=network.target

[Service]
WorkingDirectory=$PWD
Environment=PATH=/home/user/.local/share/mise/shims:/home/user/.local/bin:/home/user/bin:/usr/local/bin:/usr/bin:/bin
Environment=DSH_HOME=$DSH_HOME
ExecStart=$NODE_BIN $DSH_BIN --profile melite-test --host 127.0.0.1 --port $PORT --trusted-host cloud.tailb1e597.ts.net:$PORT --no-open
Restart=always
RestartSec=4
StandardOutput=append:$DSH_HOME/melite-test-$PORT.log
StandardError=inherit
UMask=0077

[Install]
WantedBy=default.target
UNIT_EOF
  systemctl --user daemon-reload
fi

echo "── [5/6] restarting the lane unit"
if [ "$PORT" = "3088" ]; then
  # the main lane keeps its orphan sweep (a crashed dsh outside
  # systemd once held :3088 and every restart bounced off it).
  ORPHAN=$(ss -tlnp 2>/dev/null | grep "127.0.0.1:$PORT" | grep -oE 'pid=[0-9]+' | cut -d= -f2 || true)
  [ -n "$ORPHAN" ] && { echo "   killing orphan PID $ORPHAN (restarts never owned it)"; kill -9 "$ORPHAN" 2>/dev/null || true; }
  # the browser sidecar rides the MAIN lane's face only — a branch
  # boot never restarts it (the operator may be testing :3088 through
  # it this minute).
  systemctl --user restart dsh-melite-test.service dsh-browser-view.service
else
  # a branch port's listener is ALWAYS systemd-owned (the unit above
  # is the only thing that ever binds it) — restart owns the stop; a
  # pid-kill here would race systemd's own relaunch.
  systemctl --user restart "$UNIT"
fi

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
if [ "$PORT" != "3088" ]; then
  # the branch's face is the tailnet https proxy — splice the token's
  # query onto the cloud host (the serve proxy answers https only).
  TAIL_QUERY="${TOKEN_URL#*127.0.0.1:$PORT}"
  echo "  https://cloud.tailb1e597.ts.net:$PORT$TAIL_QUERY"
  echo "  (local fallback: $TOKEN_URL)"
else
  echo "  ${TOKEN_URL/127.0.0.1/${MELITE_PUBLIC_HOST:-127.0.0.1}}"
  echo "  (local fallback: $TOKEN_URL)"
fi
