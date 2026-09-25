#!/usr/bin/env bash
# e2e-studio-lane.sh — THE BROWSER-WALL CI SEAT (roadmap §9).
#
# The cookbook audit (ledger #49) proved the browser-plane wall
# unrunnable from a fresh checkout: the lane recipe (throwaway home,
# workspace seed, MELITE_STATE_ROOT pin) lived only in
# packages/web/melite-card-view/e2e/README.md. THIS script owns the
# recipe verbatim — one source of truth; the README points here.
#
# Law (the spec's own keyless gate): self-skips when it cannot own
# the lane — port busy or E2E_STUDIO_URL already exported (a host
# is up; the caller reuses it) — exit 0, never a fake red.
set -euo pipefail

PORT=3907
HOME_DIR=data/runtime/e2e-studio-home
RUNS_ROOT=/tmp/e2e-studio-runs
COOKIES=/tmp/e2e-studio-cookies.txt
LOG=/tmp/e2e-studio-lane.log
PROFILE_SRC="${E2E_STUDIO_PROFILE_SRC:-data/runtime/dsh-harness-home/profiles/melite-test}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
DSH_BIN="${DSH_BIN:-dsh}"
CARD_VIEW_FILTER="${CARD_VIEW_FILTER:-@melite-plugin/dsh-card-view}"

# THE TRACKED SEED (2026-09-25, the fresh-checkout repair): the
# profile the lane boots is a COMMITTED, PORTABLE seed — relative
# link: deps (no machine paths), dead links from retired packages
# dropped, node_modules materialized at boot by pnpm. The untracked
# runtime seed stays the PREFERENCE when present (it may carry
# operator pins); the tracked seed is the floor that makes a fresh
# checkout run the lane at all.
TRACKED_SEED="packages/web/melite-card-view/e2e/profile-seed"

# THE REQUIRE MODE (the CI prerequisite law): E2E_STUDIO_REQUIRE=1
# flips every skip law from exit-0 to a LOUD failure naming the
# missing prerequisite — a self-skip can never green a CI seat
# again. Local boots keep the skip laws (never a fake red).
skip_or_fail() {
  if [ -n "${E2E_STUDIO_REQUIRE:-}" ]; then
    echo "[e2e-studio-lane] REQUIRED prerequisite missing: $1 (E2E_STUDIO_REQUIRE=1 refuses the skip)" >&2
    exit 1
  fi
  echo "[e2e-studio-lane] $1; SKIP (exit 0)"
  exit 0
}

# ── the skip laws (never a fake red — unless REQUIRED) ───────────
if [ -n "${E2E_STUDIO_URL:-}" ]; then
  echo "[e2e-studio-lane] E2E_STUDIO_URL set — reusing the standing host"
  exec env PATH="$HOME/.local/share/mise/installs/node/24.21.0/bin:$HOME/.local/bin:$PATH" \
    pnpm --filter "$CARD_VIEW_FILTER" exec playwright test "$@"
fi
if curl -s -m 2 -o /dev/null "http://127.0.0.1:$PORT/"; then
  skip_or_fail "port $PORT busy — another host owns the lane"
fi
command -v "$DSH_BIN" >/dev/null 2>&1 || skip_or_fail "no dsh binary on PATH (set DSH_BIN)"
SEED_DIR=""
if [ -d "$PROFILE_SRC" ]; then
  SEED_DIR="$PROFILE_SRC"
elif [ -d "$TRACKED_SEED" ]; then
  SEED_DIR="$TRACKED_SEED"
  echo "[e2e-studio-lane] runtime seed absent — booting the TRACKED seed ($TRACKED_SEED)"
else
  skip_or_fail "no profile seed (neither $PROFILE_SRC nor $TRACKED_SEED)"
fi

# ── teardown: host kill (process group) + home removal, ALWAYS ───
HOST_PGID=""
cleanup() {
  if [ -n "$HOST_PGID" ]; then
    kill -- "-$HOST_PGID" 2>/dev/null || true
    for _ in $(seq 1 20); do
      curl -s -m 1 -o /dev/null "http://127.0.0.1:$PORT/" || break
      sleep 1
    done
  fi
  rm -rf "$HOME_DIR" "$RUNS_ROOT" "$COOKIES"
}
trap cleanup EXIT

# ── the throwaway home (README recipe verbatim) ──────────────────
# Depth-anchored beside the real one: the profile's node_modules
# symlinks are RELATIVE to the repo layout.
rm -rf "$HOME_DIR" "$RUNS_ROOT"
mkdir -p "$HOME_DIR/profiles" "$HOME_DIR/storages"
cp -a "$SEED_DIR" "$HOME_DIR/profiles/e2e-studio"
# THE SEED'S MATERIAL DEPS: the tracked seed ships NO node_modules
# and PORTABLE relative link: paths — correct at the seed's depth,
# WRONG at the throwaway home's depth (the runtime profile's links
# are absolute for exactly this reason). The boot rewrites the copy's
# links to machine-absolute (repo-rooted) BEFORE installing: the seed
# on disk stays portable, the throwaway home is machine-local, and
# pnpm materializes the node_modules the bundles resolve through.
if [ ! -d "$HOME_DIR/profiles/e2e-studio/node_modules" ]; then
  echo "[e2e-studio-lane] materializing the tracked seed's deps (rewrite + pnpm install)"
  HOME_COPY="$HOME_DIR/profiles/e2e-studio" SEED_AT="$REPO_ROOT/$TRACKED_SEED" python3 - <<'PYSEED' || exit 1
import json, os, sys
home = os.environ["HOME_COPY"]; seed = os.environ["SEED_AT"]
pkg = os.path.join(home, "package.json")
doc = json.load(open(pkg))
deps = {}
for name, ref in doc.get("dependencies", {}).items():
    if isinstance(ref, str) and ref.startswith("link:") and not os.path.isabs(ref[5:]):
        # the relative path is SEED-DEPTH-correct: resolve it where
        # the seed lives, then stamp the absolute target into the copy
        target = os.path.normpath(os.path.join(seed, ref[5:]))
        deps[name] = "link:" + target
    else:
        deps[name] = ref
doc["dependencies"] = deps
json.dump(doc, open(pkg, "w"), indent=2)
dead = [n for n, r in deps.items() if isinstance(r, str) and r.startswith("link:") and not os.path.exists(r[5:])]
if dead:
    print(f"[e2e-studio-lane] seed rewrite left dead links {dead}", file=sys.stderr); sys.exit(1)
PYSEED
  # pnpm lives under the mise install on this class of box (the same
  # PATH pin the supervisor carries) — pinned HERE, not globally: a
  # global pin would resolve dsh/pnpm even when the caller's PATH
  # lacks them and defeat the skip laws below-fraction.
  (cd "$HOME_DIR/profiles/e2e-studio" && PATH="$HOME/.local/share/mise/installs/node/24.21.0/bin:$HOME/.local/bin:$PATH" pnpm install --no-frozen-lockfile >/tmp/e2e-studio-seed-install.log 2>&1) || {
    echo "[e2e-studio-lane] seed pnpm install failed:"; tail -8 /tmp/e2e-studio-seed-install.log; exit 1
  }
fi
# settings.yaml is the OPERATOR's per-machine provider plane —
# untracked by law (secrets never cross homes). The lane is KEYLESS
# (browser-plane walls, no LLM subject); copy when present, boot
# without it otherwise.
[ -f data/runtime/dsh-harness-home/settings.yaml ] && cp data/runtime/dsh-harness-home/settings.yaml "$HOME_DIR/" || true

# THE WORKSPACE PRE-STATE (seeded BEFORE boot — a host with no
# workspace serves only the chooser hero). Schema-valid row naming
# THIS repo; ISO stamps because the domain schema refuses the rest.
python3 - <<'PY'
import json, uuid
row = str(uuid.uuid4()); ts = "2026-09-21T00:00:00.000Z"
json.dump({
  "unit": {"name": "workspace", "version": 2},
  "global": {"initialized": True, "workspaceIds": [row], "archivedSessionIds": []},
  "tables": {"workspaces": {row: {
    "path": "__REPO_ROOT__",
    "title": "inference.cpp", "sessionIds": [],
    "createdAt": ts, "updatedAt": ts}}},
}, open("data/runtime/e2e-studio-home/storages/workspace.json", "w"))
import pathlib
_ws = pathlib.Path("data/runtime/e2e-studio-home/storages/workspace.json")
_ws.write_text(_ws.read_text().replace("__REPO_ROOT__", pathlib.Path.cwd().as_posix()))
PY

# MELITE_STATE_ROOT is not optional: QueueService refuses to boot
# without a named runs root (the cwd-guess ban, stroke 45c).
: > "$LOG"
DSH_HOME="$HOME_DIR" MELITE_STATE_ROOT="$RUNS_ROOT" \
  setsid "$DSH_BIN" --profile e2e-studio --host 127.0.0.1 --port "$PORT" --no-open \
  >> "$LOG" 2>&1 &
HOST_PID=$!
HOST_PGID="$(ps -o pgid= -p "$HOST_PID" | tr -d ' ')"

# ── wait for the token (the shell URL the spec drives) ───────────
TOKEN=""
for _ in $(seq 1 120); do
  TOKEN="$(grep -o "dsh web: http://127.0.0.1:$PORT/?token=[A-Za-z0-9_-]*" "$LOG" 2>/dev/null | tail -1 | sed "s/.*token=//" || true)"
  [ -n "$TOKEN" ] && break
  kill -0 "$HOST_PID" 2>/dev/null || { echo "[e2e-studio-lane] host died at boot:"; tail -5 "$LOG"; exit 1; }
  sleep 1
done
[ -n "$TOKEN" ] || { echo "[e2e-studio-lane] no token after 120s:"; tail -5 "$LOG"; exit 1; }
export E2E_STUDIO_URL="http://127.0.0.1:$PORT/?token=$TOKEN"
echo "[e2e-studio-lane] host up: $E2E_STUDIO_URL"

# ── seed the bench over the host's own /api wire ──────────────────
curl -sL -c "$COOKIES" "$E2E_STUDIO_URL" -o /dev/null
curl -s -b "$COOKIES" -X POST "http://127.0.0.1:$PORT/api/bench/ensure" \
  -H 'content-type: application/json' \
  -d '{"type":"client-request","rpcId":"seed","method":"bench/ensure","payload":{"args":{"doc":{"session":"main"}}}}' -o /dev/null
curl -s -b "$COOKIES" -X POST "http://127.0.0.1:$PORT/api/bench/add-stage" \
  -H 'content-type: application/json' \
  -d '{"type":"client-request","rpcId":"seed","method":"bench/add-stage","payload":{"args":{"sessionKey":"main","doc":{"card":"h3-timeline","author":"user","expect_rev":0}}}}' -o /dev/null

# ── the wall ──────────────────────────────────────────────────────
PATH="$HOME/.local/share/mise/installs/node/24.21.0/bin:$HOME/.local/bin:$PATH" \
  pnpm --filter "$CARD_VIEW_FILTER" exec playwright test "$@"
