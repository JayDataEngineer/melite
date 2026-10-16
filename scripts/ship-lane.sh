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
#   scripts/ship-lane.sh --no-build      # skip the builds, KEEP every gate
#                                       # (the audit's hole: --no-build used to
#                                       # skip the typecheck net AND the test tier
#                                       # with it — a "restart only" ship could
#                                       # leave port with red source. The gates
#                                       # are noEmit; they cost the same either
#                                       # way, and 35+ packages run from source
#                                       # the restart serves.)
#   scripts/ship-lane.sh --unit dsh-web  # a different systemd unit
#   scripts/ship-lane.sh --check         # verify only, change nothing
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT="dsh-melite-test.service"
ORIGIN="${MELITE_LANE_ORIGIN:-https://cloud.tailb1e597.ts.net:3088}"
DO_BUILD=1
CHECK_ONLY=0

# the print helpers live ABOVE every use (the wall audit's M9
# behavioural fixture caught this live: the --unit refusal at the
# arg gate called bad() before its definition — bash printed
# "bad: command not found" where the FAIL line belonged, and the
# client-bundle discovery said say() the same way).
say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
ok()   { printf '   \033[32mok\033[0m   %s\n' "$*"; }
bad()  { printf '   \033[31mFAIL\033[0m %s\n' "$*"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --no-build) DO_BUILD=0; shift ;;
    --check)    CHECK_ONLY=1; DO_BUILD=0; shift ;;
    --unit)     UNIT="$2"; UNIT_OVERRIDE=1; shift 2 ;;
    --origin)   ORIGIN="$2"; ORIGIN_OVERRIDE=1; shift 2 ;;
    -h|--help)  sed -n '2,25p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

# THE UNIT AND THE ORIGIN ARE ONE LANE (the ship audit's hole 3,
# 2026-10-10): --unit restarts whatever it names and --origin probes
# whatever it names, with nothing binding them — so a green ship
# could restart unit A, prove origin B, and certify the wrong lane.
# When EITHER is overridden, the script refuses the combination
# unless BOTH name the sanctioned lane. (A second lane gets its own
# playbook entry, not a flag soup.)
if [ "${UNIT_OVERRIDE:-0}" = "1" ] || [ "${ORIGIN_OVERRIDE:-0}" = "1" ]; then
  if [ "$UNIT" != "dsh-melite-test.service" ] || [ "$ORIGIN" != "https://cloud.tailb1e597.ts.net:3088" ]; then
    bad "--unit/--origin must name the sanctioned lane together (unit $UNIT, origin $ORIGIN)"
    echo "        A ship that restarts one lane and proves another certifies nothing."
    echo "        Edit the defaults at the top of this script to move the lane."
    exit 2
  fi
fi

# THE NODE-HALF ROSTER IS DERIVED, NEVER HAND-LISTED (2026-10-13, the
# DSH-ship audit: "A hand list is exactly the list that rots"). A
# package belongs here iff the host imports it FROM lib/ — the rule is
# its own manifest: `main`, else `exports['.'].default`/`types`, must
# resolve into `./lib/`. Adding a compiled estate package is a manifest
# edit; the roster follows. (It reproduces the old four by hand.)
derive_compiled() {
  node -e '
    const { readdirSync, readFileSync, existsSync } = require("node:fs");
    const { join } = require("node:path");
    const out = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (!e.isDirectory() || e.name === "node_modules" || e.name === "lib" || e.name.startsWith(".")) continue;
        const p = join(dir, e.name);
        if (existsSync(join(p, "package.json"))) {
          let m = {};
          try { m = JSON.parse(readFileSync(join(p, "package.json"), "utf8")); } catch {}
          let entry = m.main;
          const dot = m.exports && m.exports["."];
          if (!entry && dot && typeof dot === "object") entry = dot.default || dot.types;
          if (!entry && typeof dot === "string") entry = dot;
          if (entry && entry.startsWith("./lib/")) out.push(p);
        }
        walk(p);
      }
    };
    walk("packages");
    console.log(out.sort().join(" "));
  '
}
COMPILED=($(derive_compiled))
[ "${#COMPILED[@]}" -gt 0 ] || { bad "no lib-entry package found — the node-half roster derivation returned nothing"; exit 1; }

# THE CLIENT BUNDLES (operator, 2026-10-10: the STALE TAB
# regression). The browser runs `lib/client.js` from these packages,
# served under a year-immutable URL — so a source edit in a web
# package reaches the operator ONLY when its bundle is rebuilt.
# The first cut of this playbook built the five server packages and
# restarted, and the operator's tab still ran yesterday's deck: a
# restart is not a deployment, and neither is a server-only build.
# (No stale-tab banner may announce it any more — the bench is live;
# these bundles are what make "live" mean current.)
# THE LIST IS DISCOVERED, NEVER ENUMERATED (the ship audit's hole 1,
# 2026-10-10): motion, h3-timeline and img-to-mesh each export
# "./client" → "./lib/client.js" and the browser fetches them exactly
# like the three web packages — but they were missing here, so a film
# UI edit shipped "green" while the operator ran yesterday's bytes.
# A hand list is exactly the list that rots: every package that
# declares a ./client export is built and stamped, and a package
# whose bundle DISAPPEARS fails the ship rather than skipping.
CLIENT_BUNDLES=(
  # (2026-11-06) input-prep's crop-studio client face joined the
  # estate (the ANNY-style crop card, operator defect 3).
  packages/image/input-prep
  packages/web/melite-card-view
  packages/web/melite-card-deck
  packages/web/infer-gallery
  # THE ONE-ROW LAW (operator order 2026-10-01): the card-base graph
  # row — the studio atoms compile ONCE here; every card client
  # requires it through the loader's module table.
  packages/web/card-base
  # THE ONE-ROW LAW FOR 3D (the multiple-copies cure, 2026-10-13):
  # the three graph row — three and its six addon modules compile
  # ONCE here; every 3D-touching client requires it through the
  # loader's module table.
  packages/web/three-client
)
CLILIST=$(mktemp /tmp/ship-cli.XXXXXX)
# Guard class of the typecheck nets (verifier b9cf8fc1 finding 1, 2026-10-12):
# a python3 that dies on an unreadable packages/ tree would hand the loop
# nothing and the hard-coded list would stand silently as if discovered.
# Zero DISCOVERIES is a valid state (the list is additive); a dead
# discovery is not — it exits loud. No count assertion here on purpose.
if ! python3 - "$REPO" > "$CLILIST" <<'PYEOF'
# THE DISCOVERY IS THE EXPORT MAP, NOT A NAME LIST: a package whose
# ./client export resolves to ./lib/client.js is a BUILT bundle the
# browser fetches — it must be built and stamped. A ./client export
# pointing at src (viewer) is hot-loaded and needs no build. Reading
# the export map is what keeps the list honest when a package is
# added, renamed, or retired.
import json, os, sys
root = sys.argv[1]
for genre in sorted(os.listdir(os.path.join(root, "packages"))):
    gdir = os.path.join(root, "packages", genre)
    if not os.path.isdir(gdir):
        continue
    for pkg in sorted(os.listdir(gdir)):
        pdir = os.path.join(gdir, pkg)
        manifest = os.path.join(pdir, "package.json")
        if not os.path.isfile(manifest):
            continue
        try:
            with open(manifest) as fh:
                data = json.load(fh)
        except Exception:
            continue
        client = (data.get("exports") or {}).get("./client")
        target = client.get("default") if isinstance(client, dict) else client
        if isinstance(target, str) and (
            target.replace("./", "") == "lib/client.js"
            or target.replace("./", "") == "lib/client/index.js"
        ):
            print(os.path.relpath(pdir, root))
PYEOF
then
  rm -f "$CLILIST"
  bad "the client-bundle discovery died (unreadable packages/ tree) — refusing to ship a silent fallback list"
  exit 1
fi
while IFS= read -r cand; do
  case " ${CLIENT_BUNDLES[*]} " in
    *" $cand "*) ;;
    *) CLIENT_BUNDLES+=("$cand") ;;
  esac
done < "$CLILIST"
rm -f "$CLILIST"
say "the client bundles (discovered from the ./client exports): ${CLIENT_BUNDLES[*]}"

# ------------------------------------------------------- the gates
# (THE AUDIT'S TWO HOLES, closed 2026-10-10: the builds used to run
# FIRST, so a compiled package emitted its lib before any --noEmit
# pass judged the tree — and with no noEmitOnError a red build still
# emitted; and --no-build skipped the gates entirely, so a "restart
# only" ship could leave port with red source. The gates now run
# BEFORE the first emit, on EVERY ship, --no-build included.)
# THE COMPILER IS DERIVED (tools/tsc-path.mjs) — the same helper the
# repo tier (scripts/typecheck-tests.mjs) uses, so both seats judge
# with ONE compiler. A literal store path dangles on the next
# typescript bump; the helper follows the workspace's own resolution.
TSC="$(node "$REPO/tools/tsc-path.mjs" 2>/dev/null || true)"
if [ -z "$TSC" ]; then
  bad "no tsc found (tools/tsc-path.mjs: no workspace link, no pnpm store copy, no PATH tsc)"
  exit 1
fi

# THE TYPECHECK NET (2026-10-10, the live ReferenceError): the lane
# died mid-run on `assertWiringAtSubmit is not defined` — a call
# whose import never landed, in a package that runs from SOURCE, so
# no build step ever saw it. Every package with a tsconfig gets a
# --noEmit pass, DISCOVERED dynamically (a named list is exactly the
# list that rots — the five-package era is how thirty-five packages
# went unheard). The COMPILED five are included too now (a full emit
# subsumes noEmit, but the net runs before the builds and the build
# order no longer carries the judgment).
say "TYPECHECK every package (the ReferenceError class)"
# The net runs at width 8 (cruft row 8, 2026-10-12): one xargs pool
# over the same dynamic discovery, one tsc --noEmit per package —
# the serial loop paid the full serial CPU (minutes; the walls'
# equivalent arm measured 30,578ms for 90 packages at this width).
# Per-package logs land in a tmpdir; the reporting pass below stays
# serial so failure output is byte-identical to the old loop's.
# The list lives INSIDE TCDIR so the EXIT trap owns it too (the
# verifier 3113ef3c caught three leaked /tmp/ship-tc.*.list files
# from the first pool landing). The pipeline's status is GUARDED:
# pipefail without set -e discards it, so a find that fails on an
# unreadable packages/ or a grep that matches nothing would hand
# xargs an empty list and the net would print green over nothing.
TCDIR=$(mktemp -d /tmp/ship-tc.XXXXXX)
trap 'rm -rf "$TCDIR"' EXIT
if ! find "$REPO/packages" -name tsconfig.json -not -path '*/node_modules/*' -printf '%h\n' \
  | grep '/packages/' | sort > "$TCDIR/list"; then
  bad "the typecheck discovery pipeline failed (unreadable packages/ tree or no tsconfig matched) — refusing to typecheck nothing"
  exit 1
fi
xargs -r -P 8 -I '{}' bash -c '
  tsdir="$1"; stem="$2/$(printf "%s" "$tsdir" | tr "/" "_")"
  # DUAL-FACE (the DSH layout law): a solution-only root compiles
  # nothing — a dual-face package is judged through its leaves.
  faces="tsconfig.json"
  if [ -f "$tsdir/tsconfig.host.json" ]; then faces="tsconfig.host.json tsconfig.client.json"; fi
  pass=1
  for face in $faces; do
    if ! (cd "$tsdir" && node "$3" --noEmit -p "$face" >"$stem.$face.log" 2>&1); then pass=0; fi
  done
  if [ "$pass" -eq 1 ]; then : > "$stem.log.ok"; fi
' _ '{}' "$TCDIR" "$TSC" < "$TCDIR/list"
TCFAIL=0
TCCOUNT=0
while IFS= read -r tsdir; do
  TCCOUNT=$((TCCOUNT + 1))
  stem="$TCDIR/$(printf '%s' "$tsdir" | tr '/' '_')"
  if [ ! -f "$stem.log.ok" ]; then
    bad "$(printf '%s' "$tsdir" | sed "s|$REPO/||") — typecheck failed:"
    for log in "$stem".tsconfig.*.log; do
      [ -s "$log" ] || continue
      echo "        --- $(basename "$log"):"
      head -8 "$log" | sed 's/^/        /'
    done
    TCFAIL=1
  fi
done < "$TCDIR/list"
rm -rf "$TCDIR"
if [ "$TCCOUNT" -eq 0 ]; then
  bad "the typecheck net saw ZERO tsconfigs — the discovery fed it nothing; refusing to call that green"
  exit 1
fi
if [ "$TCFAIL" -ne 0 ]; then
  bad "the typecheck net is red — a missing import is invisible to every behavioural door"
  exit 1
fi
ok "typecheck net green ($TCCOUNT tsconfigs seen)"

# THE TEST TIER (li-aq.3, the rules audit's HIGH-2): package
# tsconfigs include src/** only — the SPEC files were typed by
# nothing, and a spec importing a name a module never exported
# (TS2724, live in 22 card-view files) was invisible to every wall.
# One implementation, two callers: this script and the suite's
# typecheck gate both run scripts/typecheck-tests.mjs (which now
# carries the REPO TIER arm too — tools/ and the repo-level tests/).
say "TYPECHECK the test tier + the repo tier (spec files are a plane; TS2724 is invisible to vitest)"
if (cd "$REPO" && node scripts/typecheck-tests.mjs >/tmp/ship-tctier.log 2>&1); then
  ok "test tier green ($(grep -c '^✓' /tmp/ship-tctier.log) arms green)"
else
  bad "the test tier is red — spec files typecheck against nothing:"
  head -14 /tmp/ship-tctier.log | sed 's/^/        /'
  exit 1
fi

# THE BUNDLE REPRO (cruft row 7, 2026-10-12): the committed lib/ of
# melite-tools must rebuild byte-identical from a PRISTINE HEAD
# worktree — the arm builds in its own git worktree (never this
# live tree; the parallel-session law), so it certifies the COMMIT
# the lane restarts onto, not the working tree's state. Before this
# step the property had no automated caller: BUNDLE_REPRO was set
# by nothing and the suite's single skipped test (the +1 in every
# battery) was reachable only by a human typing the file's comment.
# Cost: a hot store links in seconds; a cold one pays minutes once.
# pnpm resolution mirrors the gate's own order (BUNDLE_REPRO_PNPM,
# then npm_execpath, then PATH); this lane's pnpm lives outside PATH,
# so the step names it explicitly the way TSC is named above.
PNPM_BIN="$(command -v pnpm 2>/dev/null || true)"
if [ -z "$PNPM_BIN" ] && [ -f "$HOME/.local/share/pnpm/pnpm" ]; then
  PNPM_BIN="$HOME/.local/share/pnpm/pnpm"
fi
if [ -z "$PNPM_BIN" ]; then
  bad "no pnpm resolvable for the bundle repro (looked on PATH and at ~/.local/share/pnpm/pnpm)"
  exit 1
fi
say "BUNDLE REPRO (the committed bundle rebuilds byte-identical from pristine HEAD)"
if (cd "$REPO" && \
    BUNDLE_REPRO=1 BUNDLE_REPRO_PNPM="$PNPM_BIN" \
    "$PNPM_BIN" exec vitest run packages/harness/melite-tools/test/bundle-repro.spec.ts >/tmp/ship-bundle-repro.log 2>&1); then
  ok "bundle repro green (committed lib/ == pristine HEAD rebuild)"
else
  bad "the committed bundle does not rebuild from pristine HEAD:"
  head -14 /tmp/ship-bundle-repro.log | sed 's/^/        /'
  exit 1
fi

# ---------------------------------------------------------------- build
# THE CONTENT STAMP (2026-10-10, the lane audit's P0-3): a string
# receipt (grep a marker in the built lib) passes on ANY lib built
# since that string first existed — a --no-build ship went fully
# green while this tree's fixes sat unshipped on the lane. The stamp
# records the src hash each lib was BUILT FROM; every ship
# (--no-build included) recomputes and compares, and a mismatch
# refuses: the lane would run a stale build of this tree.
stamp_src() { # $1 = package dir with a src/ tree
  (cd "$REPO/$1" && find src \( -name '*.ts' -o -name '*.tsx' \) | sort | xargs sha256sum 2>/dev/null | sha256sum | cut -c1-16)
}
write_stamp() { # $1 = package dir
  stamp_src "$1" > "$REPO/$1/lib/.src-stamp" 2>/dev/null || true
}
verify_stamps() {
  local failed=0 p want have
  for p in "${COMPILED[@]}" "${CLIENT_BUNDLES[@]}"; do
    # A MISSING lib IS A FAILURE, NOT A SKIP (the ship audit's hole
    # E: `[ -d lib ] || continue` let a never-built or git-cleaned
    # package walk past the very gate that proves the lane runs this
    # tree). A package with no lib has no receipt to verify, and the
    # lane would resolve an absent build.
    if [ ! -d "$REPO/$p/lib" ]; then
      bad "$p — no lib/ to verify; the lane would resolve an absent build — build it (re-run WITHOUT --no-build)"
      failed=1
      continue
    fi
    want="$(stamp_src "$p")"
    have="$(cat "$REPO/$p/lib/.src-stamp" 2>/dev/null || echo none)"
    if [ "$want" != "$have" ]; then
      bad "$p — lib is STALE (built from src $have, this tree is src $want); the lane would run the old code — re-run WITHOUT --no-build"
      failed=1
    fi
  done
  if [ "$failed" -eq 0 ]; then ok "content stamps green (every lib matches the src it was built from)"; fi
  return "$failed"
}
if [ "$DO_BUILD" -eq 1 ]; then
  say "BUILD the compiled-lib packages (a restart alone ships the OLD code)"
  for p in "${COMPILED[@]}"; do
    if (cd "$REPO/$p" && node "$TSC" -p tsconfig.json >/tmp/ship-build.log 2>&1); then
      # THE D.TS REWRITE PASS (wave 21's repeat wedge, wired
      # 2026-11-06): tsc's declaration emit still writes
      # `from "./x.ts"` while the JS emit writes .js — a bare-tsc
      # rebuild flips every d.ts back and the gate wall reds three
      # weeks later. The pass runs after EVERY emit, before the
      # stamp; a refusal fails the ship (never walk past a red).
      if ! node "$REPO/scripts/rewrite-dts-specifiers.mjs" "$p" >/tmp/ship-dts.log 2>&1; then
        bad "$p — the d.ts rewrite pass refused (no lib/ under it?):"
        head -4 /tmp/ship-dts.log | sed 's/^/        /'
        exit 1
      fi
      write_stamp "$p"
      ok "$p"
    else
      bad "$p — build failed (noEmitOnError: no lib was emitted):"
      head -12 /tmp/ship-build.log | sed 's/^/        /'
      exit 1
    fi
  done
  # The receipt that matters: the lane seat must be IN the built door.
  if grep -q "bench/lane-refusal" "$REPO/packages/estate/drafts/lib/remote.js" 2>/dev/null; then
    ok "the built door carries the lane seat (bench/lane-refusal present)"
  else
    bad "the built door has NO lane seat — the source and the build disagree"
    exit 1
  fi
  # the browser's half — a MISSING package is a FAILURE, not a
  # skip (the ship audit's hole 1: `[ ! -d ] && continue` let a
  # renamed web package ship green with the browser 404ing)
  for p in "${CLIENT_BUNDLES[@]}"; do
    if [ ! -d "$REPO/$p" ]; then
      bad "$p — the declared client bundle does not exist; the browser would 404"
      exit 1
    fi
    if (cd "$REPO/$p" && node node_modules/tsdown/dist/run.mjs -c tsdown.config.ts >/tmp/ship-client.log 2>&1); then
      write_stamp "$p"
      ok "$p client bundle"
    else
      bad "$p client bundle — build failed:"
      head -12 /tmp/ship-client.log | sed 's/^/        /'
      exit 1
    fi
    # THE BUNDLE MUST EXIST AFTER THE BUILD (the audit's hole B:
    # a build that emits nothing still "succeeds" — the browser
    # would then fetch a stale or missing file under a new stamp)
    if [ ! -f "$REPO/$p/lib/client.js" ]; then
      bad "$p — the build emitted no lib/client.js; the browser has no bundle to fetch"
      exit 1
    fi
  done
  # the receipt the operator cares about: NO bundle the browser
  # fetches may carry a face we deleted. THE VOCABULARY IS DERIVED
  # (the li-ba stroke, 2026-10-11): the gate used to grep ONE
  # literal ("STALE TAB") on ONE bundle while the walls' own helper
  # spells the full five-pattern ban — four faces (cards-stale-build,
  # staleBuild, buildVerdict, the case-folded spelling) could ride
  # any OTHER bundle green. The helper is the ONE owner (a wall
  # tool, node-only — it never rides into a browser bundle); the
  # gate extracts its regex bodies and judges EVERY client bundle.
  STALE_RE="$(sed -n 's#^  /\(.*\)/i\?,$#\1#p' "$REPO/tests/walls/helpers/stale-tab-vocabulary.ts" | paste -sd'|' -)"
  if [ "$(printf '%s' "$STALE_RE" | tr -cd '|' | wc -c)" -lt 4 ]; then
    bad "the stale-face extraction rotted (got '${STALE_RE:-<empty>}' from tests/walls/helpers/stale-tab-vocabulary.ts) — the gate would judge nothing"
    exit 1
  fi
  for p in "${CLIENT_BUNDLES[@]}"; do
    if grep -Eiq "$STALE_RE" "$REPO/$p/lib/client.js" 2>/dev/null; then
      bad "$p/lib/client.js still carries a removed stale-tab face (vocabulary: tests/walls/helpers/stale-tab-vocabulary.ts) — the browser would show it"
      exit 1
    fi
  done
  ok "no client bundle carries a removed face"
  # THE POST-EMIT NET (the ship audit's stale-.d.ts hole, 2026-10-10):
  # the typecheck above ran BEFORE the build, so every src-run
  # package judged its imports against the compiled packages' OLD
  # lib/*.d.ts — a renamed export in drafts went green, the build
  # emitted the rename, and the lane crashed at boot on a missing
  # import. The net re-runs AFTER the emit: now the .d.ts files are
  # this tree's, and a stale-shaped consumer is red.
  say "TYPECHECK AGAINST THE EMITTED LIBS (the pre-build net judged stale .d.ts files)"
  POSTFAIL=0
  # Same guard class as the pre-build net above: a find that fails on an
  # unreadable packages/ would hand the loop nothing and print green over
  # no typechecks (verifier b9cf8fc1 finding 1, 2026-10-12).
  POSTDIR=$(mktemp -d /tmp/ship-posttc.XXXXXX)
  trap 'rm -rf "$TCDIR" "$POSTDIR"' EXIT
  if ! find "$REPO/packages" -name tsconfig.json -not -path '*/node_modules/*' -printf '%h\n' \
    | grep '/packages/' | sort > "$POSTDIR/list"; then
    bad "the post-emit discovery pipeline failed (unreadable packages/ tree or no tsconfig matched) — refusing to typecheck nothing"
    exit 1
  fi
  # The pipeline guard above owns the empty case (grep's no-match rc
  # under pipefail), and its grep '/packages/' means every list line
  # is a packages dir — no case filter, no zero-count tripwire (the
  # old POSTCOUNT=0 arm was unreachable for exactly that reason;
  # verifier 30f43307 finding 2, 2026-10-12).
  while IFS= read -r tsdir; do
    # DUAL-FACE (the DSH layout law): the post-emit net judges leaves too.
    faces="tsconfig.json"
    if [ -f "$tsdir/tsconfig.host.json" ]; then faces="tsconfig.host.json tsconfig.client.json"; fi
    for face in $faces; do
      if ! (cd "$tsdir" && node "$TSC" --noEmit -p "$face" >"$POSTDIR/post.log" 2>&1); then
        bad "$(printf '%s' "$tsdir" | sed "s|$REPO/||") [$face] — red against the JUST-BUILT libs:"
        head -8 "$POSTDIR/post.log" | sed 's/^/        /'
        POSTFAIL=1
      fi
    done
  done < "$POSTDIR/list"
  rm -rf "$POSTDIR"
  if [ "$POSTFAIL" -ne 0 ]; then
    bad "the post-emit net is red — the build produced types the tree does not consume"
    exit 1
  fi
  ok "post-emit net green (every package typechecks against this build)"
fi
# THE STAMP VERIFICATION RIDES EVERY SHIP (--no-build keeps every
# gate — this one included): a green ship must prove the lane runs
# THIS tree, behavior-only fixes and all.
verify_stamps || exit 1

# -------------------------------------------------------------- restart
# THE RESTART IS FOR THE NODE HALF ONLY (2026-10-13, the DSH-ship
# audit). DSH mounts `@deepseek-ai/dsh-client-hmr` on the lane: it
# stat-polls every graph row's client bundle every 500ms and pushes
# `rebuilt` frames over the /plugins/events SSE channel, so a rebuilt
# client bundle reaches the operator's open tab with NO restart (proved
# on the live lane: a `tsdown` run on infer-gallery emitted
# `{"type":"rebuilt","id":"@melite-plugin/dsh-gallery"}`). Node half is
# different — the running host imported and cached its modules at boot,
# so a changed node-half package still needs the restart.
#
# A ship therefore restarts when the node-half EMITTED libs changed
# since the last shipped marker — src alone is not the signal (the
# 2026-10-10 incident: image-gen's committed lib predated its src —
# `boarded` lacked flux-klein — while the committed .src-stamp claimed
# current; a src-only hash saw "no change" and the ship polled the
# stale lane for its whole activation window). tsc emits
# deterministically, so a no-op rebuild is byte-identical and a
# UI-only ship still skips the restart; any real lib drift trips it.
node_lib_hash() { # <pkg> — content hash over the emitted lib
  find "$REPO/$1/lib" -type f \( -name '*.js' -o -name '*.d.ts' \) -print0 2>/dev/null \
    | sort -z | xargs -0 -r sha256sum | awk '{print $1}' | sha256sum | cut -c1-16
}
node_src_hash() {
  for p in "${COMPILED[@]}"; do printf '%s %s %s\n' "$p" "$(stamp_src "$p")" "$(node_lib_hash "$p")"; done | sha256sum | cut -c1-16
}
SHIPPED_MARKER="$REPO/.scratch/ship-node-half.stamp"
shipped_before="$(cat "$SHIPPED_MARKER" 2>/dev/null || echo none)"
node_now="$(node_src_hash)"
node_changed=1
if [ "$shipped_before" = "$node_now" ]; then node_changed=0; fi
if [ "$CHECK_ONLY" -eq 0 ]; then
  if [ "$node_changed" -eq 1 ]; then
    say "RESTART $UNIT (the node half changed since the last ship)"
    systemctl --user restart "$UNIT" || { bad "restart failed"; exit 1; }
    ok "restart issued"
  else
    ok "node half unchanged — no restart; dsh-client-hmr carries the rebuilt bundles to the browser (SSE rebuilt frames)"
  fi
  mkdir -p "$(dirname "$SHIPPED_MARKER")"
  printf '%s' "$node_now" > "$SHIPPED_MARKER"
fi

# ------------------------------------------------------- operator session
# THE /v1 FENCE (li-eo, 2026-10-16): the run plane is fenced with
# DSH's own connection.requestRejection — the anonymous curl the
# earlier ship relied on now answers 401 connection/unauthenticated.
# The sanctioned non-browser path is the lane's own launch token
# (connection/src/browser-auth.ts:241-258): GET /?token=<launch>
# mints the authority-bound session cookie, and that cookie speaks
# for the operator on every later request. The token is the lane's
# own authentication input, printed to the operator's lane log at
# boot — no second auth surface is invented here. The mint rides
# INSIDE the activation wait: while the estate composes, even the
# index answers with the not-yet voice, so an early one-shot mint
# races the boot and fails 401. The lane log is DISCOVERED, never
# assumed: $DSH_HOME names the caller's dsh home (a GUI-launched
# ship inherits the GUI's), which may hold a STALE lane log whose
# tokens died with an old process — so every candidate is tried by
# MINTING, and only a 303 pins the session.
lane_logs() {
  systemctl --user show "$UNIT" -p Environment --value 2>/dev/null \
    | grep -o 'DSH_HOME=[^ ]*' | cut -d= -f2 | sed 's|\$|/melite-test-3088.log|'
  printf '%s\n' "$HOME/.dsh-dev/melite-test-3088.log" "$HOME/.dsh/melite-test-3088.log"
  [ -n "${DSH_HOME:-}" ] && printf '%s\n' "${DSH_HOME%/}/melite-test-3088.log"
  true
}
COOKIE_JAR=$(mktemp)
trap 'rm -f "$COOKIE_JAR"' EXIT

# ----------------------------------------------------------------- wait
say "WAIT for the activation gate (minting the operator session as it settles)"
settled=0
for i in $(seq 1 24); do
  sleep 10
  for log in $(lane_logs | awk '!seen[$0]++' ); do
    [ -f "$log" ] || continue
    token=$(grep -o 'dsh web: http://[^ ]*[?]token=[^ ]*' "$log" 2>/dev/null | tail -1 | sed 's/.*[?]token=//')
    [ -n "$token" ] || continue
    mint=$(curl -sk -m 20 -c "$COOKIE_JAR" -o /dev/null -w '%{http_code}' "$ORIGIN/?token=$token" 2>/dev/null)
    if [ "$mint" != "303" ] && [ "$mint" != "200" ]; then
      continue
    fi
    code=$(curl -sk -m 20 -b "$COOKIE_JAR" -o /tmp/ship-ensure.json -w '%{http_code}' \
      -X POST "$ORIGIN/v1/bench/ensure" \
      -H 'content-type: application/json' -d '{"session":"main"}' 2>/dev/null)
    if [ "$code" = "200" ]; then
      ok "operator session minted (from $log); bench plane answered after ~$((i * 10))s"
      settled=1
      break
    fi
    printf '   ... %3ds: mint %s, ensure %s (from %s)\n' "$((i * 10))" "$mint" "$code" "$log"
    break
  done
  [ "$settled" -eq 1 ] && break
done
if [ "$settled" -eq 0 ]; then
  bad "the bench plane never answered."
  echo "        The estate stays 'activating' when a row keeps re-applying."
  echo "        Read the lane log for the repeating row (the usual culprit is"
  echo "        an MCP client row that flaps) — candidates, unit home first:"
  lane_logs | sed 's/^/          grep -vE "^\$|Blender" /'
  exit 1
fi

# ---------------------------------------------------------------- prove
# BEHAVIOUR, NEVER A STAMP. Two refusals and one admission: the model
# board, the lane law, and the cure.
say "PROVE the lane runs this tree (behaviour, not face_stamp)"

post() { # post <path> <json>
  curl -sk -m 30 -b "$COOKIE_JAR" -o /tmp/ship-probe.json -w '%{http_code}' \
    -X POST "$ORIGIN$1" -H 'content-type: application/json' -d "$2"
}

rev=$(python3 -c "import json;print(json.load(open('/tmp/ship-ensure.json')).get('rev',0))" 2>/dev/null || echo 0)

# 1. the model board (the OLD law — proves the doors row answers at all)
# FATAL (the ship audit's hole 2: this probe printed FAIL and the
# script still printed SHIPPED — a fail-open model board shipped
# green. A gate that cannot fail is a log line.)
code=$(post "/v1/bench/main/add_stage" \
  "{\"card\":\"tts\",\"params\":{\"model\":\"definitely-not-a-model\",\"text\":\"x\"},\"expect_rev\":$rev}")
if [ "$code" = "400" ] && grep -q "bench/bad-model" /tmp/ship-probe.json; then
  ok "the model board refuses an unknown model"
else
  bad "the model board did not refuse (HTTP $code) — the doors row is wrong"
  exit 1
fi

# 1b. THE DECLARED LANE LAW RIDES THE LANE (the DECL audit's gap 1
# closing in production). NOTE THE LAW MOVED (li-bs, the authoring
# contract): the WRITE door now ADMITS an unstated required word —
# an unfinished card is addable; the RUN seat is the strict door
# (pinned in estate-queue's cards-lane-law.spec: a prompt-less edit
# admits at admitStageRelations and refuses at phase1Card). The
# write-time refusal that still proves the DECL rows are LIVE is
# the RANGE rule (the width burn law): a stated width below the
# family's declared floor refuses HERE, through the same door the
# agent crosses — a lane whose relation rows did not reach it would
# admit the burn and ship green.
code=$(post "/v1/bench/main/add_stage" \
  "{\"card\":\"image-edit\",\"params\":{\"model\":\"qwen-img-edit-21\",\"prompt\":\"make it night\",\"image1\":\"x.png\",\"width\":-50,\"height\":1024},\"expect_rev\":$rev}")
if [ "$code" = "400" ] && grep -q "outside this lane's range" /tmp/ship-probe.json; then
  ok "the declared edit lane refuses an out-of-range width at write time (the DECL rows are live)"
else
  bad "the edit lane's DECL rows did not fire (HTTP $code) — the lane is running an OLD build or the rows never reached it"
  exit 1
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
# FATAL for the same reason as probe 1: a gateless form or a blind
# agent face printed FAIL and the script still said SHIPPED. The
# agent's PRIMARY face (the melite_load bundle) is checked here too —
# that is the face the DECL audit found carrying no lanes at all.
say "CHECK the served declaration"
if curl -sk -b "$COOKIE_JAR" -m 20 "$ORIGIN/v1/form-spec?model=qwen3-tts" \
   | python3 -c "import json,sys;sys.exit(0 if 'lanes' in json.load(sys.stdin) else 1)" 2>/dev/null; then
  ok "/v1/form-spec serves the lanes block (the form gates from the DECL)"
else
  bad "the form-spec has no lanes block — the form cannot gate"
  exit 1
fi
if curl -sk -b "$COOKIE_JAR" -m 20 "$ORIGIN/v1/card-tools" \
   | python3 -c "import json,sys;sys.exit(0 if any('lanes' in r for r in json.load(sys.stdin)) else 1)" 2>/dev/null; then
  ok "/v1/card-tools carries the agent's lane contract"
else
  bad "the card-tools manifest has no lanes — the agent composes blind"
  exit 1
fi
if curl -sk -b "$COOKIE_JAR" -m 30 "$ORIGIN/v1/load?name=tts&inference_type=card" \
   | python3 -c "import json,sys;sys.exit(0 if 'lanes' in json.load(sys.stdin).get('bundle',{}).get('signature',{}) else 1)" 2>/dev/null; then
  ok "/v1/load carries the lane contract (melite_load's primary face)"
else
  bad "the load bundle signature has no lanes — the agent's main contract face says nothing"
  exit 1
fi

say "SHIPPED"
echo "   lane:  $ORIGIN"
echo "   unit:  $UNIT"
echo "   proofs: model board refuses, the declared edit lane refuses, the lane"
echo "           law refuses, the cure lands, all three declaration surfaces serve."
