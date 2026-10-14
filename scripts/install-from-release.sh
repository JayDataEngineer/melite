#!/usr/bin/env bash
# install-from-release.sh — the NO-NPM-MELITE consumer install.
#
# Melite's packages resolve from the GitHub release's gated tarballs
# (release-manifest.json is the authority: sha256 + bytes per row),
# never from the npm registry — this is the same sequence
# tools/release-rehearsal.mjs proves on every release, recast as a
# consumer command for when the npm publish lane is still walking
# (its batched upload) or a registry pin is unwanted. The dsh CLI and
# its own member packages still come from dsh's published registry —
# they are dependencies of the install channel, not of melite.
#
# Requirements: gh (authenticated against the private repo), the dsh
# CLI on PATH, node, pnpm via corepack.
#
# Usage:
#   scripts/install-from-release.sh [--tag v0.1.5-pre-alpha] [--profile melite]
#                                   [--dir <scratch>] [--repo JayDataEngineer/melite]
#
# Receipts printed at the end: seat counts against the manifest, the
# zero-link: law, and the boot hint. EXIT 0 only when every gate
# passes.
set -euo pipefail

TAG=""
PROFILE="melite"
REPO="JayDataEngineer/melite"
SCRATCH_ROOT="${XDG_CACHE_HOME:-$HOME/.cache}/melite-release"
while [ $# -gt 0 ]; do
  case "$1" in
    --tag) TAG="${2:?--tag needs a value}"; shift 2 ;;
    --profile) PROFILE="${2:?--profile needs a value}"; shift 2 ;;
    --dir) SCRATCH_ROOT="${2:?--dir needs a value}"; shift 2 ;;
    --repo) REPO="${2:?--repo needs a value}"; shift 2 ;;
    *) echo "unknown flag: $1" >&2; exit 2 ;;
  esac
done

die() { echo "[install-from-release] $*" >&2; exit 1; }
log() { echo "[install-from-release] $*"; }

# ── preflight ─────────────────────────────────────────────────────
command -v gh >/dev/null 2>&1 || die "no gh on PATH — the release assets are private-repo"
gh auth status >/dev/null 2>&1 || die "gh is not authenticated"
command -v dsh >/dev/null 2>&1 || die "no dsh on PATH — npm install -g @deepseek-ai/dsh first"
command -v node >/dev/null 2>&1 || die "no node on PATH"
command -v pnpm >/dev/null 2>&1 || die "no pnpm — corepack enable && corepack prepare pnpm@10.33.2 --activate"

DSH_VERSION="$(dsh --version 2>/dev/null | head -1)"
[ -n "$DSH_VERSION" ] || die "dsh --version printed nothing"
if [ -z "$TAG" ]; then
  TAG="$(gh release list --repo "$REPO" --limit 1 --json tagName --jq '.[0].tagName')"
  [ -n "$TAG" ] || die "no releases on $REPO — pass --tag"
  log "no --tag given: latest release is $TAG"
fi

DIST_DIR="$SCRATCH_ROOT/$TAG"
mkdir -p "$DIST_DIR"

# ── 1. download the gated set ─────────────────────────────────────
log "[1/5] downloading release assets for $TAG into $DIST_DIR"
gh release download "$TAG" --repo "$REPO" --dir "$DIST_DIR" --clobber
MANIFEST="$DIST_DIR/release-manifest.json"
[ -f "$MANIFEST" ] || die "no release-manifest.json in the asset set"
log "      set: $(node -e '
const m = require(process.argv[1]);
console.log(`${m.tag} @ ${String(m.commit).slice(0, 12)} (${m.packages.length} packages, packed ${m.packedAt})`);
' "$MANIFEST")"

# ── 2. verify digests, derive the offline map ─────────────────────
# The manifest is the authority (publish-npm's byte-identity law):
# every row's sha256 + bytes must match the downloaded tarball, every
# inner package.json carries the same version string, and the map
# pins each seat to its local tarball — a pnpm override with a file:
# path never touches the registry.
node - "$DIST_DIR" <<'NODE' > "$DIST_DIR/overrides.json"
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { join } = require('node:path');
const dist = process.argv[2];
const manifest = JSON.parse(readFileSync(join(dist, 'release-manifest.json'), 'utf8'));
if (!manifest.commit) { console.error('manifest carries no commit'); process.exit(1); }
const overrides = {};
const versions = {};
const seenVersions = new Set();
for (const row of manifest.packages) {
  const tar = join(dist, row.file ?? '');
  const bytes = readFileSync(tar);
  if (row.bytes !== undefined && row.bytes !== bytes.length) {
    console.error(`${row.file}: ${bytes.length} bytes on disk, manifest says ${row.bytes}`); process.exit(1);
  }
  if (row.sha256) {
    const have = createHash('sha256').update(bytes).digest('hex');
    if (have !== row.sha256) {
      console.error(`${row.file}: sha256 mismatch (manifest ${row.sha256}, disk ${have})`); process.exit(1);
    }
  }
  const inner = JSON.parse(require('node:child_process')
    .execSync(`tar -xzOf "${tar}" package/package.json`, { encoding: 'utf8' }));
  if (!inner.name || !inner.version) {
    console.error(`${row.file} carries no name/version`); process.exit(1);
  }
  seenVersions.add(inner.version);
  overrides[inner.name] = `file:${tar}`;
  versions[inner.name] = inner.version;
}
if (seenVersions.size !== 1) {
  console.error(`version skew in the set: ${[...seenVersions].join(', ')}`); process.exit(1);
}
if (!versions['@melite/harness-tools']) {
  console.error('manifest has no @melite/harness-tools row'); process.exit(1);
}
process.stdout.write(JSON.stringify({ overrides, versions, version: [...seenVersions][0] }));
NODE
[ -s "$DIST_DIR/overrides.json" ] || die "digest verification failed"
log "[2/5] digests verified; $(node -e 'console.log(Object.keys(require(process.argv[1]).overrides).length)' "$DIST_DIR/overrides.json") seats pinned to local tarballs, one version string"

# ── 3. initialize the profile ─────────────────────────────────────
# dsh plugin add initializes the profile; its registry lookup for a
# not-yet-uploaded melite row answers the 404-class noise — tolerated
# exactly as the rehearsal tolerates it (the seed below owns the
# resolution). Any other failure dies.
log "[3/5] initializing profile $PROFILE"
set +e
ADD_OUT="$(dsh plugin --profile "$PROFILE" add "@melite/harness-tools@$(node -e 'console.log(require(process.argv[1]).version)' "$DIST_DIR/overrides.json")" 2>&1)"
ADD_RC=$?
set -e
if [ "$ADD_RC" -ne 0 ]; then
  echo "$ADD_OUT" | tail -2
  echo "$ADD_OUT" | grep -Eq '404|not published|ENEEDAUTH|E404|authorization|not in the npm registry' \
    || die "dsh plugin add failed unexpectedly"
fi

PROFILE_DIR="${DSH_HOME:-$HOME/.dsh}/profiles/$PROFILE"
[ -d "$PROFILE_DIR" ] || die "profile dir $PROFILE_DIR did not materialize"

# ── 4. seed package.json + the workspace's offline map ────────────
# The consumer bundle set is the rehearsal's proven eight (drops and
# additions are release-level changes, caught by the rehearsal's
# derived-bundle-set receipt before any release ships). The dsh
# members pin to the CLI's own version — the template's stale rc
# rows are the peer-skew wall the rehearsal proved dead.
log "[4/5] seeding the profile's dependency set and offline overrides"
node - "$DIST_DIR" "$PROFILE_DIR" "$DSH_VERSION" <<'NODE'
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const [distDir, profileDir, dshVersion] = process.argv.slice(2);
const { overrides, versions } = JSON.parse(readFileSync(join(distDir, 'overrides.json'), 'utf8'));
const BUNDLES = [
  '@melite/harness-tools',
  '@melite/harness-provisioner',
  '@melite-plugin/dsh-estate',
  '@melite-plugin/dsh-card-deck',
  '@melite-plugin/dsh-card-view',
  '@melite-plugin/dsh-gallery',
  '@melite/motion-motion',
  '@melite/video-h3-timeline',
];
const SKEW_PINNED = [
  'dsh-api-gateway',
  'dsh-storage-json',
  'dsh-storage-domain',
  'dsh-subprocess-local',
];
const dependencies = Object.fromEntries(
  Object.entries(versions).filter(([name]) =>
    name.startsWith('@melite/') || name.startsWith('@melite-plugin/')));
dependencies['@deepseek-ai/dsh-base'] = dshVersion;
dependencies['@deepseek-ai/dsh-web-app'] = dshVersion;
for (const m of SKEW_PINNED) dependencies['@deepseek-ai/' + m] = dshVersion;
const seed = {
  name: `dsh-profile-${profileDir.split('/').pop()}`,
  private: true,
  dependencies,
  dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', ...BUNDLES] } },
};
writeFileSync(join(profileDir, 'package.json'), JSON.stringify(seed, null, 2) + '\n');
const workspace = [
  'packages:', '  - .', '',
  'nodeLinker: hoisted', 'autoInstallPeers: false', '',
  '# every manifest row pins its tarball (self-contained-closure law)',
  'overrides:', ...Object.entries(overrides).map(([name, path]) =>
    `  ${JSON.stringify(name)}: ${JSON.stringify(path)}`),
  ...SKEW_PINNED.map((m) => `  '@deepseek-ai/${m}': ${dshVersion}`), '',
].join('\n');
writeFileSync(join(profileDir, 'pnpm-workspace.yaml'), workspace);
NODE

# ── 5. install over the offline map ───────────────────────────────
log "[5/5] dsh plugin install (resolves melite from the local tarballs)"
( cd "$PROFILE_DIR" && dsh plugin --profile "$PROFILE" install 2>&1 | tail -4 )

# ── receipts ──────────────────────────────────────────────────────
NODE_MODULES="$PROFILE_DIR/node_modules"
MELITE_SEATS="$(ls "$NODE_MODULES/@melite" 2>/dev/null | wc -l | tr -d ' ')"
PLUGIN_SEATS="$(ls "$NODE_MODULES/@melite-plugin" 2>/dev/null | wc -l | tr -d ' ')"
LIB_ROWS="$(node -e '
const { versions } = require(process.argv[1]);
const names = Object.keys(versions);
console.log(names.filter((n) => n.startsWith("@melite/") && !n.startsWith("@melite-plugin/")).length);' "$DIST_DIR/overrides.json")"
PLUGIN_ROWS="$(node -e '
const { versions } = require(process.argv[1]);
console.log(Object.keys(versions).filter((n) => n.startsWith("@melite-plugin/")).length);' "$DIST_DIR/overrides.json")"
LINK_ROWS="$(grep -c 'link:' "$PROFILE_DIR/pnpm-lock.yaml" 2>/dev/null || true)"

FAIL=0
[ "$MELITE_SEATS" = "$LIB_ROWS" ] || { log "FAIL: @melite seats $MELITE_SEATS != manifest rows $LIB_ROWS"; FAIL=1; }
[ "$PLUGIN_SEATS" = "$PLUGIN_ROWS" ] || { log "FAIL: @melite-plugin seats $PLUGIN_SEATS != manifest rows $PLUGIN_ROWS"; FAIL=1; }
[ "$LINK_ROWS" = "0" ] || { log "FAIL: $LINK_ROWS link: rows in the lockfile (dev shape)"; FAIL=1; }
if [ "$FAIL" -eq 0 ]; then
  log "receipts: @melite ${MELITE_SEATS}/${LIB_ROWS}, @melite-plugin ${PLUGIN_SEATS}/${PLUGIN_ROWS}, zero link: rows"
  log "installed. boot: dsh --profile $PROFILE --no-open --port <port> (the printed token URL is the entry point)"
fi
exit "$FAIL"
