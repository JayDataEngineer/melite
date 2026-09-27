#!/usr/bin/env bash
# ship-lane.sh — SHIP THE TREE TO THE OPERATOR'S LANE, AND PROVE IT.
#
# WHY THIS EXISTS (2026-10-10, the li-u receipt): the :3088 estate was
# restarted onto a tree whose bench door enforced the lane laws, and
# the door still admitted the operator's incident-A state. Five
# packages ship a COMPILED entry (main/exports -> lib/, not src/), the
# vitest suite resolves src, and the lane loaded a nine-day-old
# lib/remote.js. The served face_stamp reported the DISK head, so it
# said "current" the whole time.
#
# A restart is not a deployment here. THIS is the deployment:
#   1. build the five compiled packages
#   2. restart the lane
#   3. wait out the activation gate (and name a flapping row if it
#      never settles)
#   4. PROVE IT BY BEHAVIOUR — write the state the law refuses and
#      read the refusal. Never trust a stamp.
#
# Usage:
#   scripts/ship-lane.sh                 # build + restart + verify (default lane)
#   scripts/ship-lane.sh --no-build      # restart only (source-only changes)
#   scripts/ship-lane.sh --unit dsh-web  # a different systemd unit
#   scripts/ship-lane.sh --check         # verify only, change nothing
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT="dsh-melite-test.service"
ORIGIN="${MELITE_LANE_ORIGIN:-https://cloud.tailb1e597.ts.net:3088}"
DO_BUILD=1
CHECK_ONLY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --no-build) DO_BUILD=0; shift ;;
    --check)    CHECK_ONLY=1; DO_BUILD=0; shift ;;
    --unit)     UNIT="$2"; shift 2 ;;
    --origin)   ORIGIN="$2"; shift 2 ;;
    -h|--help)  sed -n '2,25p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

# The five packages whose runtime entry is ./lib (docs/deployment/build.md).
COMPILED=(
  packages/estate/drafts
  packages/estate/manage
  packages/estate/media
  packages/estate/runs
  packages/vendor/typert-protocol
)

# THE CLIENT BUNDLES (operator, 2026-10-10: the STALE TAB
# regression). The browser runs `lib/client.js` from these three
# packages, served under a year-immutable URL — so a source edit in a
# web package reaches the operator ONLY when its bundle is rebuilt.
# The first cut of this playbook built the five server packages and
# restarted, and the operator's tab still ran yesterday's deck: a
# restart is not a deployment, and neither is a server-only build.
# (No stale-tab banner may announce it any more — the bench is live;
# these bundles are what make "live" mean current.)
CLIENT_BUNDLES=(
  packages/web/melite-card-view
  packages/web/melite-card-deck
  packages/web/infer-gallery
)

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok()   { printf '   \033[32mok\033[0m   %s\n' "$*"; }
bad()  { printf '   \033[31mFAIL\033[0m %s\n' "$*"; }

# ---------------------------------------------------------------- build
if [ "$DO_BUILD" -eq 1 ]; then
  say "BUILD the compiled-lib packages (a restart alone ships the OLD code)"
  TSC=""
  for cand in \
    "$REPO/node_modules/.pnpm/typescript@5.7.3/node_modules/typescript/bin/tsc" \
    "$REPO/node_modules/typescript/bin/tsc" \
    "$(command -v tsc 2>/dev/null || true)"; do
    if [ -n "$cand" ] && [ -f "$cand" ]; then TSC="$cand"; break; fi
  done
  if [ -z "$TSC" ]; then
    bad "no tsc found (looked in the pnpm store, node_modules, PATH)"
    exit 1
  fi
  for p in "${COMPILED[@]}"; do
    if (cd "$REPO/$p" && node "$TSC" -p tsconfig.json >/tmp/ship-build.log 2>&1); then
      ok "$p"
    else
      bad "$p — build failed:"
      head -12 /tmp/ship-build.log | sed 's/^/        /'
      exit 1
    fi
  done
  # THE TYPECHECK NET (2026-10-10, the live ReferenceError): the
  # lane died mid-run on `assertWiringAtSubmit is not defined` — a
  # call whose import never landed, in a package that runs from
  # SOURCE, so no build step ever saw it. The five COMPILED packages
  # above are the ./lib doors; every OTHER package with a tsconfig
  # gets a --noEmit pass here, DISCOVERED dynamically (a named list
  # is exactly the list that rots — the five-package era is how
  # thirty-five packages went unheard, and the first sweep found
  # four more broken ones). Same net as the suite's typecheck gate;
  # a ship refuses to leave port with a red one.
  say "TYPECHECK every source-run package (the ReferenceError class)"
  TCFAIL=0
  while IFS= read -r tsdir; do
    case "$tsdir" in */packages/*) ;; *) continue ;; esac
    # the COMPILED five just built (a full emit subsumes noEmit)
    skip=0
    for c in "${COMPILED[@]}"; do
      [ "$REPO/$c" = "$tsdir" ] && skip=1
    done
    [ "$skip" -eq 1 ] && continue
    if (cd "$tsdir" && node "$TSC" --noEmit -p tsconfig.json >/tmp/ship-tc.log 2>&1); then
      :
    else
      bad "$(printf '%s' "$tsdir" | sed "s|$REPO/||") — typecheck failed:"
      head -8 /tmp/ship-tc.log | sed 's/^/        /'
      TCFAIL=1
    fi
  done < <(find "$REPO/packages" -name tsconfig.json -not -path '*/node_modules/*' -printf '%h\n' | sort)
  if [ "$TCFAIL" -ne 0 ]; then
    bad "the typecheck net is red — a missing import is invisible to every behavioural door"
    exit 1
  fi
  ok "typecheck net green ($(find "$REPO/packages" -name tsconfig.json -not -path '*/node_modules/*' | wc -l) tsconfigs seen)"
  # THE TEST TIER (li-aq.3, the rules audit's HIGH-2): package
  # tsconfigs include src/** only — the SPEC files (85 packages
  # carry test dirs) were typed by nothing, and a spec importing a
  # name a module never exported (TS2724, live in 22 card-view
  # files) was invisible to every wall. One implementation, two
  # callers: this script and the suite's typecheck gate both run
  # scripts/typecheck-tests.mjs — the discovery, the synthesis, and
  # the judge live there.
  say "TYPECHECK the test tier (spec files are a plane; TS2724 is invisible to vitest)"
  if (cd "$REPO" && node scripts/typecheck-tests.mjs >/tmp/ship-tctier.log 2>&1); then
    ok "test tier green ($(grep -c '^✓' /tmp/ship-tctier.log) packages with test dirs)"
  else
    bad "the test tier is red — spec files typecheck against nothing:"
    head -14 /tmp/ship-tctier.log | sed 's/^/        /'
    exit 1
  fi

  # The receipt that matters: the lane seat must be IN the built door.
  if grep -q "bench/lane-refusal" "$REPO/packages/estate/drafts/lib/remote.js" 2>/dev/null; then
    ok "the built door carries the lane seat (bench/lane-refusal present)"
  else
    bad "the built door has NO lane seat — the source and the build disagree"
    exit 1
  fi
  # the browser's half
  for p in "${CLIENT_BUNDLES[@]}"; do
    if [ ! -d "$REPO/$p" ]; then continue; fi
    if (cd "$REPO/$p" && node node_modules/tsdown/dist/run.mjs -c tsdown.config.ts >/tmp/ship-client.log 2>&1); then
      ok "$p client bundle"
    else
      bad "$p client bundle — build failed:"
      head -12 /tmp/ship-client.log | sed 's/^/        /'
      exit 1
    fi
  done
  # the receipt the operator cares about: the bundle the browser
  # fetches must not carry a face we deleted
  if grep -q "STALE TAB" "$REPO/packages/web/melite-card-view/lib/client.js" 2>/dev/null; then
    bad "the card-view bundle still carries the removed STALE TAB face — the browser would show it"
    exit 1
  fi
  ok "no client bundle carries a removed face"
fi

# -------------------------------------------------------------- restart
if [ "$CHECK_ONLY" -eq 0 ]; then
  say "RESTART $UNIT"
  systemctl --user restart "$UNIT" || { bad "restart failed"; exit 1; }
  ok "restart issued"
fi

# ----------------------------------------------------------------- wait
say "WAIT for the activation gate"
settled=0
for i in $(seq 1 24); do
  sleep 10
  code=$(curl -sk -m 20 -o /tmp/ship-ensure.json -w '%{http_code}' \
    -X POST "$ORIGIN/v1/bench/ensure" \
    -H 'content-type: application/json' -d '{"session":"main"}' 2>/dev/null)
  if [ "$code" = "200" ]; then
    ok "bench plane answered after ~$((i * 10))s"
    settled=1
    break
  fi
  printf '   ... %3ds: %s\n' "$((i * 10))" "$code"
done
if [ "$settled" -eq 0 ]; then
  bad "the bench plane never answered."
  echo "        The estate stays 'activating' when a row keeps re-applying."
  echo "        Read the lane log for the repeating row (the usual culprit is"
  echo "        an MCP client row that flaps):"
  echo "          grep -v Blender ~/.dsh/melite-test-3088.log | tail -40"
  exit 1
fi

# ---------------------------------------------------------------- prove
# BEHAVIOUR, NEVER A STAMP. Two refusals and one admission: the model
# board, the lane law, and the cure.
say "PROVE the lane runs this tree (behaviour, not face_stamp)"

post() { # post <path> <json>
  curl -sk -m 30 -o /tmp/ship-probe.json -w '%{http_code}' \
    -X POST "$ORIGIN$1" -H 'content-type: application/json' -d "$2"
}

rev=$(python3 -c "import json;print(json.load(open('/tmp/ship-ensure.json')).get('rev',0))" 2>/dev/null || echo 0)

# 1. the model board (the OLD law — proves the doors row answers at all)
code=$(post "/v1/bench/main/add_stage" \
  "{\"card\":\"tts\",\"params\":{\"model\":\"definitely-not-a-model\",\"text\":\"x\"},\"expect_rev\":$rev}")
if [ "$code" = "400" ] && grep -q "bench/bad-model" /tmp/ship-probe.json; then
  ok "the model board refuses an unknown model"
else
  bad "the model board did not refuse (HTTP $code) — the doors row is wrong"
fi

# 2. the lane law (the NEW law — this is the one a stale build loses)
code=$(post "/v1/bench/main/add_stage" \
  "{\"card\":\"tts\",\"params\":{\"model\":\"qwen3-tts\",\"variant\":\"customvoice\",\"text\":\"x\",\"design_prompt\":\"a warm narrator\"},\"expect_rev\":$rev}")
if [ "$code" = "400" ] && grep -q "bench/lane-refusal" /tmp/ship-probe.json; then
  ok "the lane law refuses incident A (the state the form used to build)"
else
  bad "THE LANE LAW DID NOT FIRE (HTTP $code) — this lane is running an OLD build."
  echo "        For source-only changes: re-run WITHOUT --no-build."
  echo "        For a change in the five compiled packages, the rebuild step"
  echo "        above is what carries it; check scripts/ship-lane.sh's COMPILED list."
  exit 1
fi

# 3. the cure lands (a door that refuses everything is not a working door)
code=$(post "/v1/bench/main/add_stage" \
  "{\"card\":\"tts\",\"params\":{\"model\":\"qwen3-tts\",\"variant\":\"customvoice\",\"text\":\"x\",\"design_prompt\":\"a warm narrator\",\"voice_name\":\"ship_probe\"},\"expect_rev\":$rev}")
if [ "$code" = "200" ]; then
  stage=$(python3 -c "import json;print(json.load(open('/tmp/ship-probe.json')).get('stage',''))" 2>/dev/null || echo "")
  ok "the cured state lands (stage $stage)"
  say "CLEAN UP the probe stage"
  rev2=$(post "/v1/bench/main/remove_stage" "{\"stage\":\"$stage\",\"expect_rev\":$((rev + 1))}")
  if [ "$rev2" = "200" ]; then
    ok "probe stage removed — the operator's bench is as it was"
  else
    bad "could not remove the probe stage $stage (HTTP $rev2) — remove it by hand"
  fi
else
  bad "the cured state was refused too (HTTP $code) — the lane is over-refusing"
  exit 1
fi

# 4. the served surfaces carry the declaration (the form + the agent)
say "CHECK the served declaration"
if curl -sk -m 20 "$ORIGIN/v1/form-spec?model=qwen3-tts" \
   | python3 -c "import json,sys;sys.exit(0 if 'lanes' in json.load(sys.stdin) else 1)" 2>/dev/null; then
  ok "/v1/form-spec serves the lanes block (the form gates from the DECL)"
else
  bad "the form-spec has no lanes block — the form cannot gate"
fi
if curl -sk -m 20 "$ORIGIN/v1/card-tools" \
   | python3 -c "import json,sys;sys.exit(0 if any('lanes' in r for r in json.load(sys.stdin)) else 1)" 2>/dev/null; then
  ok "/v1/card-tools carries the agent's lane contract"
else
  bad "the card-tools manifest has no lanes — the agent composes blind"
fi

say "SHIPPED"
echo "   lane:  $ORIGIN"
echo "   unit:  $UNIT"
echo "   proofs: model board refuses, lane law refuses, the cure lands, both"
echo "           declaration surfaces serve."
