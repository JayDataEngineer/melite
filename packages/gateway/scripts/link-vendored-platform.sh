#!/usr/bin/env bash
# link-vendored-platform.sh — build + verify the vendored platform tier.
#
# METHOD (arbitrated 2026-09-08, harness-mirror): vendor/cordis_plugins/*
# are pnpm WORKSPACE MEMBERS (pnpm-workspace.yaml) consumed via
# workspace:* (packages/gateway/package.json). pnpm materializes every
# link on each root install — no hand-rolled node_modules links exist
# anywhere (workspace law). This script therefore OWNS only what pnpm
# cannot: the vendor lib/ build (gitignored, harness lib/ layout —
# the harness sources are not strip-types-erasable, so the runtime
# loads emitted JS while tsc consumes the declarations via tsconfig
# paths). `--check` is the hygiene gate (mirrors harness
# verify-vendored-links, scoped to the gateway): every platform name
# must resolve under vendor/cordis_plugins with cordis version
# parity, the lockfile must show link: for the gateway importer,
# and lib/ must be present.
set -u
CHECK=0
if [ "${1:-}" = "--check" ]; then CHECK=1; fi

REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
GW="$REPO/packages/gateway"
VP="$REPO/vendor/cordis_plugins"
FAIL=0

say()  { printf '%s\n' "$*"; }
fail() { printf 'VIOLATION: %s\n' "$*"; FAIL=1; }

for pkg in loader timer logger-console webserver include group; do
  [ -d "$VP/$pkg" ] || { say "missing $VP/$pkg"; exit 1; }
done

if [ "$CHECK" = "1" ]; then
  # 1. manifests harness-pristine except O1/O2 (lib/ entry points,
  #    private:true, workspace:^ refloored — see vendor README).
  for pkg in loader timer logger-console webserver include group; do
    main="$(node -p "require('$VP/$pkg/package.json').main")"
    priv="$(node -p "require('$VP/$pkg/package.json').private === true ? 'yes' : 'no'")"
    [ "$main" = "lib/index.js" ] || fail "$pkg main is $main (expected lib/index.js)"
    [ "$priv" = "yes" ] || fail "$pkg missing private:true"
    [ -f "$VP/$pkg/lib/index.js" ] || fail "$pkg lib/index.js missing (re-run without --check to build)"
    [ -f "$VP/$pkg/lib/types/index.d.ts" ] || fail "$pkg lib/types/index.d.ts missing (re-run without --check to build)"
  done
  # 2. node resolution lands in vendor/ (never a registry copy).
  #    Resolve from the boot owner (gateway-core) first, then the rim
  #    (gateway): the tier split post-reorg, and names live on either.
  for name in cordis-plugin-loader cordis-plugin-timer cordis-plugin-logger-console dsh-host-webserver cordis-plugin-include cordis-plugin-group; do
    real="$(node -p "require.resolve('@deepseek-ai/$name/package.json', { paths: ['$GW/../gateway-core/src', '$GW/src'] })" 2>/dev/null || true)"
    case "$real" in
      "$VP"/*) : ;;
      *) fail "@deepseek-ai/$name resolves to $real (expected under $VP)" ;;
    esac
  done
  # 3. framework VERSION parity across the graph (DIVERGENCE D1 —
  #    vendor README: two 4.0.2 store paths can coexist when the
  #    pre-existing dsh-family registry graph splits pnpm peer
  #    contexts; proven inert — the fork/loader sources perform zero
  #    cross-copy identity checks (only Error/Generator globals),
  #    every seam is string-keyed, and the fork-boundary probes are
  #    green (services attach, cross-copy interval fires+disposes,
  #    fibers resolve ACTIVE). Versions differing is a VIOLATION;
  #    paths differing is a NOTE (detector, not gate).
  a="$(node -p "require.resolve('@deepseek-ai/cordis/package.json', { paths: ['$GW/src'] })" 2>/dev/null || true)"
  b="$(node -p "require.resolve('@deepseek-ai/cordis/package.json', { paths: ['$VP/loader/lib'] })" 2>/dev/null || true)"
  va="$(node -p "require('$a').version" 2>/dev/null || true)"
  vb="$(node -p "require('$b').version" 2>/dev/null || true)"
  if [ -z "$va" ] || [ "$va" != "$vb" ]; then
    fail "cordis version fork: gateway sees $va ($a), vendored loader sees $vb ($b)"
  elif [ "$a" != "$b" ]; then
    say "NOTE (D1): two cordis@$va store paths coexist (gateway vs vendored-loader peer context) — proven inert, see vendor README."
  fi
  # 4. lockfile shows link: for the gateway importers (workspace:*
  #    by construction; this catches a registry-pin regression).
  #    Importers post-reorg: packages/gateway (transport rim) +
  #    packages/gateway-core (context boot). The pre-reorg
  #    `plugins/gateway:` block reference died with the reorg.
  gwblock="$(sed -n '/^  packages\/gateway:/,/^  packages\//p;/^  packages\/gateway-core:/,/^  packages\//p' "$REPO/pnpm-lock.yaml")"
  for pkg in loader timer logger-console webserver include group; do
    if ! printf '%s' "$gwblock" | grep -q "link:.*vendor/cordis_plugins/$pkg"; then
      fail "pnpm-lock.yaml gateway importers lack link: for $pkg"
    fi
  done
  if [ "$FAIL" = "0" ]; then say "vendored-links: platform tier resolves to vendor/cordis_plugins, cordis version parity, lockfile link:."; fi
  exit "$FAIL"
fi

TSC="$GW/node_modules/.bin/tsc"
[ -x "$TSC" ] || { say "missing $TSC (run root pnpm install first)"; exit 1; }
for pkg in loader timer logger-console webserver include group; do
  "$TSC" -p "$VP/$pkg" || exit 1
done
say "vendored-links: vendor lib/ built (loader + timer + logger-console + host-webserver + include + group)."
