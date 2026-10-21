#!/usr/bin/env bash
# e2e-gpu-lane.sh — THE GPU BROWSER-WALL SEAT (the both-angles tier,
# dev_docs/plans/gpu-playwright-tier-2026-10-12.md).
#
# Operator order (2026-10-12): playwright tests that actually USE
# the GPU — (a) the automotive (the LLM run doors, /melite-runs on)
# and (b) the human path (every card, configuration changes, Run
# press). This script owns the lane recipe: the studio-lane recipe
# verbatim (throwaway depth-anchored home, tracked seed, keyless
# settings law, workspace pre-state, stateRoot patch) PLUS the GPU
# prerequisite the keyless wall does not carry:
#   - ENGINE GATE: the estate's engine row (comfyui host) must
#     answer /system_stats with a cuda device — the run the specs
#     press must do REAL inference, never a mocked door.
# The specs own their own benches (mint + seed through the estate's
# doors — the tour's history law); the launcher seeds nothing.
#
# Skip laws (never a fake red — unless E2E_GPU_REQUIRE=1, the
# studio seat's own REQUIRED-prerequisite law): port busy, no dsh,
# engine down, no cuda device.
set -euo pipefail

# ── the skip laws (never a fake red — unless REQUIRED) ───────────
# E2E_GPU_PORT lets a co-running seat (the studio lane owns 3907, a
# live operator lane 3088) take another port; the GPU tier's own
# default is 3917.
PORT="${E2E_GPU_PORT:-3917}"
HOME_DIR=data/runtime/e2e-gpu-home
RUNS_ROOT=/tmp/e2e-gpu-runs
COOKIES=/tmp/e2e-gpu-cookies.txt
LOG=/tmp/e2e-gpu-lane.log
ENGINE_URL="${E2E_GPU_ENGINE:-http://127.0.0.1:8188}"
REPO_ROOT="$(cd -- "${BASH_SOURCE[0]%/*}/.." && pwd)"
cd "$REPO_ROOT"
# deployment env (.env is gitignored; .env.example documents every knob)
[ -f ./.env ] && . ./.env   # env-file loaded
DSH_BIN="${DSH_BIN:-dsh}"
CARD_VIEW_FILTER="${CARD_VIEW_FILTER:-@melite-plugin/dsh-card-view}"

# THE TRACKED SEED IS THE SEAT'S ONLY SEED (the moss-404 law, the
# studio seat's own): a live dev profile's patch watcher can
# un-serve rows MID-RUN; a wall seat boots the committed seed-only
# profile. The GPU lane reuses the SAME tracked seed (same bundles,
# same depth anchoring) — the GPU tier differs in prerequisites and
# bench seed, never in the host recipe.
TRACKED_SEED="packages/web/melite-card-view/e2e/profile-seed"
SEED_DIR="$TRACKED_SEED"

skip_or_fail() {
  if [ -n "${E2E_GPU_REQUIRE:-}" ]; then
    echo "[e2e-gpu-lane] REQUIRED prerequisite missing: $1 (E2E_GPU_REQUIRE=1 refuses the skip)" >&2
    exit 1
  fi
  echo "[e2e-gpu-lane] $1; SKIP (exit 0)"
  exit 0
}

# ── the skip laws (never a fake red — unless REQUIRED) ───────────
if curl -s -m 2 -o /dev/null "http://127.0.0.1:$PORT/"; then
  skip_or_fail "port $PORT busy — another host owns the lane"
fi
command -v "$DSH_BIN" >/dev/null 2>&1 || skip_or_fail "no dsh binary on PATH (set DSH_BIN)"

# LANE LAW (li-bu class): the binary must be the provisioned
# runtime — >=0.2.0-rc.1, the repo's own pin.
dsh_version="$("$DSH_BIN" --version 2>/dev/null | head -1 || true)"
python3 - "$dsh_version" <<'GATE' || exit 1
import re, sys
m = re.search(r"(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?", sys.argv[1] or "")
if not m:
    sys.exit("e2e-gpu-lane: cannot read a version from '$DSH_BIN' — boot only through the provision (dsh-provision apply.sh launch)")
maj, min_, pat, rc = (int(m.group(i)) if m.group(i) else None for i in (1, 2, 3, 4))
cur = (maj, min_, pat, rc if rc is not None else 10**6)
floor = (0, 2, 0, 1)
if cur < floor:
    sys.exit(f"e2e-gpu-lane: $DSH_BIN is {'.'.join(m.groups())}, below the 0.2.0-rc.1 floor — boot only through the provision (dsh-provision apply.sh launch)")
GATE
if [ -d "$TRACKED_SEED" ]; then
  SEED_DIR="$TRACKED_SEED"
else
  skip_or_fail "no profile seed ($TRACKED_SEED)"
fi

# ── THE ENGINE GATE (the GPU tier's own prerequisite) ─────────────
# The estate's engine row composes against the comfyui host default
# (127.0.0.1:8188 — E2E_GPU_ENGINE overrides the GATE's probe; the
# lane's own engine wiring rides the estate row's config, same
# default). A run the specs press must do REAL inference: the gate
# refuses (or skips, locally) when the engine is down or holds no
# cuda device. The engine's weights tree is the OPERATOR's real
# tree (/home/user/tools/comfyui on this machine — 37 GB) — the
# lane never provisions or mutates it.
ENGINE_STATS="$(curl -s -m 5 "$ENGINE_URL/system_stats" 2>/dev/null || true)"
if [ -z "$ENGINE_STATS" ]; then
  skip_or_fail "engine at $ENGINE_URL unreachable (the GPU tier needs a live engine)"
fi
python3 - "$ENGINE_STATS" "$ENGINE_URL" <<'EGATE' || skip_or_fail "engine at $ENGINE_URL holds no cuda device (the GPU tier needs real inference — check nvidia-smi)"
import json, sys
try:
    d = json.loads(sys.argv[1])
except Exception:
    sys.exit(1)
devices = d.get("devices") or []
if not any(dev.get("type") == "cuda" for dev in devices):
    sys.exit(1)
EGATE

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
  # E2E_GPU_KEEP=1 — the debug door: keep the throwaway home, runs
  # root and cookies for post-mortem (a hung-run hunt reads the run
  # records the teardown would wipe). The KEEP flag never touches
  # the kill: the host dies either way.
  if [ "${E2E_GPU_KEEP:-0}" = "1" ]; then
    echo "[e2e-gpu-lane] E2E_GPU_KEEP=1 — keeping $HOME_DIR and $RUNS_ROOT for post-mortem"
    return 0
  fi
  rm -rf "$HOME_DIR" "$RUNS_ROOT" "$COOKIES"
}
trap cleanup EXIT

# ── the throwaway home (the studio recipe verbatim) ───────────────
rm -rf "$HOME_DIR" "$RUNS_ROOT"
mkdir -p "$HOME_DIR/profiles" "$HOME_DIR/storages"
cp -a "$SEED_DIR" "$HOME_DIR/profiles/e2e-gpu"
if [ ! -d "$HOME_DIR/profiles/e2e-gpu/node_modules" ]; then
  echo "[e2e-gpu-lane] materializing the tracked seed's deps (rewrite + pnpm install)"
  HOME_COPY="$HOME_DIR/profiles/e2e-gpu" SEED_AT="$REPO_ROOT/$TRACKED_SEED" python3 - <<'PYSEED' || exit 1
import json, os, sys
home = os.environ["HOME_COPY"]; seed = os.environ["SEED_AT"]
pkg = os.path.join(home, "package.json")
doc = json.load(open(pkg))
deps = {}
for name, ref in doc.get("dependencies", {}).items():
    if isinstance(ref, str) and ref.startswith("link:") and not os.path.isabs(ref[5:]):
        target = os.path.normpath(os.path.join(seed, ref[5:]))
        deps[name] = "link:" + target
    else:
        deps[name] = ref
doc["dependencies"] = deps
json.dump(doc, open(pkg, "w"), indent=2)
dead = [n for n, r in deps.items() if isinstance(r, str) and r.startswith("link:") and not os.path.exists(r[5:])]
if dead:
    print(f"[e2e-gpu-lane] seed rewrite left dead links {dead}", file=sys.stderr); sys.exit(1)
PYSEED
  (cd "$HOME_DIR/profiles/e2e-gpu" && PATH="$HOME/.local/share/mise/installs/node/24.21.0/bin:$HOME/.local/bin:$PATH" pnpm install --no-frozen-lockfile >/tmp/e2e-gpu-seed-install.log 2>&1) || {
    echo "[e2e-gpu-lane] seed pnpm install failed:"; tail -8 /tmp/e2e-gpu-seed-install.log; exit 1
  }
fi
# settings.yaml — the KEYLESS law verbatim (D6 row-name wall): the
# GPU door-tier lane carries no LLM subject. (The LIVE automotive
# spec — a keyed lane — is a later round's own seat, gated on
# DEEPSEEK_API_KEY, never this file.)
if [ -f "$HOME/.dsh/settings.yaml" ]; then
  python3 - "$HOME/.dsh/settings.yaml" <<'PY' || exit 1
import sys, re
path = sys.argv[1]
keyed = []
with open(path, "r", encoding="utf-8") as fh:
    for m in re.finditer(r"(?m)^([A-Za-z0-9_-]+):\n(?:  .*\n)*?  providers:", fh.read()):
        if m.group(1) not in keyed:
            keyed.append(m.group(1))
if keyed:
    sys.stderr.write(
        "e2e-gpu-lane: refusing to copy settings.yaml into the KEYLESS lane — "
        "provider table row(s): " + ", ".join(keyed) + "\n"
        "(strip the row or pin a keyless settings file; deploy-path audit D6)\n"
    )
    sys.exit(1)
PY
  cp "$HOME/.dsh/settings.yaml" "$HOME_DIR/"
fi

# ── THE WORKSPACE PRE-STATE (seeded BEFORE boot) ──────────────────
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
}, open("data/runtime/e2e-gpu-home/storages/workspace.json", "w"))
import pathlib
_ws = pathlib.Path("data/runtime/e2e-gpu-home/storages/workspace.json")
_ws.write_text(_ws.read_text().replace("__REPO_ROOT__", pathlib.Path.cwd().as_posix()))
PY

# ── THE RUNS ROOT PIN (J12 law: the estate row's config) ──────────
ESTATE_PATCH="$HOME_DIR/estate-state.patch.yml"
cat >"$ESTATE_PATCH" <<EPATCH
# minted by e2e-gpu-lane (J12): the estate row's config names the
# lane's runs root — never an env seam. GPU runs land on the
# THROWAWAY root, never the operator's tree.
- id: melite-estate
  config:
    stateRoot: "$RUNS_ROOT"
EPATCH
: > "$LOG"
DSH_HOME="$HOME_DIR" \
  setsid "$DSH_BIN" --profile e2e-gpu --patch "$ESTATE_PATCH" --host 127.0.0.1 --port "$PORT" --no-open \
  >> "$LOG" 2>&1 &
HOST_PID=$!
HOST_PGID="$(ps -o pgid= -p "$HOST_PID" | tr -d ' ')"

# ── wait for the token ────────────────────────────────────────────
TOKEN=""
for _ in $(seq 1 120); do
  TOKEN="$(grep -o "dsh web: http://127.0.0.1:$PORT/?token=[A-Za-z0-9_-]*" "$LOG" 2>/dev/null | tail -1 | sed "s/.*token=//" || true)"
  [ -n "$TOKEN" ] && break
  kill -0 "$HOST_PID" 2>/dev/null || { echo "[e2e-gpu-lane] host died at boot:"; tail -5 "$LOG"; exit 1; }
  sleep 1
done
[ -n "$TOKEN" ] || { echo "[e2e-gpu-lane] no token after 120s:"; tail -5 "$LOG"; exit 1; }
export E2E_STUDIO_URL="http://127.0.0.1:$PORT/?token=$TOKEN"
echo "[e2e-gpu-lane] host up: $E2E_STUDIO_URL"

# ── seed the bench over the host's own /api wire ──────────────────
# THE SPEC OWNS ITS BENCH (the tour's history law): every spec mints
# its OWN conversation and seeds ITS bench through the estate's own
# doors (seedBenchImageGen in the spec — bench/ensure + add-stage,
# idempotent, CAS'd). The launcher seeds NOTHING: a pre-seeded
# 'main' bench would make the specs pass or fail on lane history,
# exactly the host-history wall the studio tour rejects.

# ── the wall ──────────────────────────────────────────────────────
# E2E_GPU=1 is the GPU tier's own gate (the specs skip without it —
# the default studio run ignores e2e/gpu/ entirely, the keyless
# law); E2E_RUNS_ROOT names the throwaway root (the ghost-wall
# contract, verbatim).
PLAYWRIGHT_EXIT=0
PATH="$HOME/.local/share/mise/installs/node/24.21.0/bin:$HOME/.local/bin:$PATH" \
  E2E_RUNS_ROOT="$RUNS_ROOT" \
  E2E_GPU=1 \
  pnpm --filter "$CARD_VIEW_FILTER" exec playwright test -c playwright.gpu.config.ts "$@" || PLAYWRIGHT_EXIT=$?

# ── the host's own word (the studio seat's post-verdicts) ─────────
if grep -q "Cannot find module" "$LOG" 2>/dev/null; then
  echo "[e2e-gpu-lane] host log carries a module-resolution failure:" >&2
  grep -n "Cannot find module" "$LOG" >&2
  exit 1
fi
if grep -q "did not activate" "$LOG" 2>/dev/null; then
  echo "[e2e-gpu-lane] host boot carried activation failures (never benign):" >&2
  grep -nE "did not activate|failed to import" "$LOG" >&2
  exit 1
fi
for SIG in "client bundle not found" "startup failed"; do
  if grep -q "$SIG" "$LOG" 2>/dev/null; then
    echo "[e2e-gpu-lane] host log carries '$SIG' (a serve-class boot death):" >&2
    grep -n "$SIG" "$LOG" >&2
    exit 1
  fi
done
exit $PLAYWRIGHT_EXIT
