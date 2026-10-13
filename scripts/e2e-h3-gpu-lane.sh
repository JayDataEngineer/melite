#!/usr/bin/env bash
# e2e-h3-gpu-lane.sh — THE H3 ADVANCED GPU SEAT (the operator's
# 2026-10-27 order: "an advanced playwrite suite, and the scripts/
# way to provision… test the H3, advanced ways, on the gpu").
#
# The e2e-gpu-lane recipe VERBATIM (skip laws, REQUIRE mode, the
# engine cuda gate, the throwaway depth-anchored home, the tracked
# seed, the keyless settings law, the workspace pre-state, the
# runs-root pin, the post-verdicts) PLUS the H3's own gates:
#
#   - THE H3 PACK GATE: the engine must serve the h3 graph's own
#     node classes (/object_info/H3SLAAttention — a class only the
#     MiniMax H3 packs carry). A lane that boots against an engine
#     without the packs reds every run with a node-resolution
#     death; this gate refuses BEFORE the host boot, naming the
#     missing pack.
#   - THE H3 WEIGHTS GATE: every provision row in the h3 family
#     DECL (the EMITTED lib truth, never a re-parse of src) must
#     sit under the engine's weights tree at its DECLARED folder,
#     size-exact. THE FOLDER COMES FROM THE DECL ROW VERBATIM —
#     never a hardcoded folder list: the first cut of this gate's
#     census walked four hardcoded folders, ruled the
#     frame_interpolation film net MISSING, and fired a 151 GB
#     acquire for a file that was on disk, sha-exact, all along
#     (the e2e-h3-gpu-lane.spec.ts census arm walls that exact
#     bug shape). A miss prints the estate's OWN provision door —
#     the acquire_weight call, model h3 + the missing file — the
#     script never curls a weights URL itself: the DECL owns the
#     source, the gateway owns the fetch. MELITE_H3_PROVISION=1
#     refuses LOUD with the door command (the REQUIRE-mode shape)
#     instead of skipping, for the provision workflow.
#
# The specs own their own benches (the tour's history law,
# verbatim); this launcher seeds nothing.
#
# Skip laws (never a fake red — unless E2E_H3_REQUIRE=1): port
# busy, no dsh, engine down, no cuda, h3 packs absent, h3 weights
# missing (or, with MELITE_H3_PROVISION=1, LOUD with the door).
set -euo pipefail

# ── the skip laws (never a fake red — unless REQUIRED) ───────────
# E2E_H3_PORT lets a co-running seat take another port (the studio
# lane owns 3907, the gpu seat 3917; the H3 seat's default 3927).
PORT="${E2E_H3_PORT:-3927}"
HOME_DIR=data/runtime/e2e-h3-home
RUNS_ROOT=/tmp/e2e-h3-runs
COOKIES=/tmp/e2e-h3-cookies.txt
LOG=/tmp/e2e-h3-lane.log
ENGINE_URL="${E2E_H3_ENGINE:-${E2E_GPU_ENGINE:-http://127.0.0.1:8188}}"
# The engine's weights tree — the operator's real tree. The lane
# READS it (the weights gate); it never provisions or mutates it.
WEIGHTS_ROOT="${MELITE_H3_WEIGHTS_ROOT:-/home/user/tools/comfyui/models}"
REPO_ROOT="$(cd -- "${BASH_SOURCE[0]%/*}/.." && pwd)"
cd "$REPO_ROOT"
DSH_BIN="${DSH_BIN:-dsh}"
CARD_VIEW_FILTER="${CARD_VIEW_FILTER:-@melite-plugin/dsh-card-view}"

# THE TRACKED SEED IS THE SEAT'S ONLY SEED (the moss-404 law, the
# gpu seat's own): the seed serves the h3 card
# (@melite/video-h3-timeline + @melite/models-h3 ride the seed's
# deps and bundles — the same seat the h3 suite drills).
TRACKED_SEED="packages/web/melite-card-view/e2e/profile-seed"
SEED_DIR="$TRACKED_SEED"

skip_or_fail() {
  if [ -n "${E2E_H3_REQUIRE:-}" ] || [ -n "${MELITE_H3_PROVISION:-}" ]; then
    echo "[e2e-h3-gpu-lane] REQUIRED prerequisite missing: $1 (E2E_H3_REQUIRE=1 refuses the skip)" >&2
    exit 1
  fi
  echo "[e2e-h3-gpu-lane] $1; SKIP (exit 0)"
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
    sys.exit("e2e-h3-gpu-lane: cannot read a version from '$DSH_BIN' — boot only through the provision (dsh-provision apply.sh launch)")
maj, min_, pat, rc = (int(m.group(i)) if m.group(i) else None for i in (1, 2, 3, 4))
cur = (maj, min_, pat, rc if rc is not None else 10**6)
floor = (0, 2, 0, 1)
if cur < floor:
    sys.exit(f"e2e-h3-gpu-lane: $DSH_BIN is {'.'.join(m.groups())}, below the 0.2.0-rc.1 floor — boot only through the provision (dsh-provision apply.sh launch)")
GATE
if [ -d "$TRACKED_SEED" ]; then
  SEED_DIR="$TRACKED_SEED"
else
  skip_or_fail "no profile seed ($TRACKED_SEED)"
fi

# ── THE ENGINE GATE (the GPU tier's own prerequisite) ─────────────
ENGINE_STATS="$(curl -s -m 5 "$ENGINE_URL/system_stats" 2>/dev/null || true)"
if [ -z "$ENGINE_STATS" ]; then
  skip_or_fail "engine at $ENGINE_URL unreachable (the H3 tier needs a live engine)"
fi
python3 - "$ENGINE_STATS" "$ENGINE_URL" <<'EGATE' || skip_or_fail "engine at $ENGINE_URL holds no cuda device (the H3 tier needs real inference — check nvidia-smi)"
import json, sys
try:
    d = json.loads(sys.argv[1])
except Exception:
    sys.exit(1)
devices = d.get("devices") or []
if not any(dev.get("type") == "cuda" for dev in devices):
    sys.exit(1)
EGATE

# ── THE H3 PACK GATE (this seat's own) ────────────────────────────
# The h3 graph composes H3SLAAttention and its kin — node classes
# only the MiniMax H3 packs serve. A 404 here means every H3 run
# would die at node resolution; refuse before the boot.
H3_NODE_PROBE="$(curl -s -m 5 -o /dev/null -w '%{http_code}' "$ENGINE_URL/object_info/H3SLAAttention" 2>/dev/null || true)"
if [ "$H3_NODE_PROBE" != "200" ]; then
  skip_or_fail "engine at $ENGINE_URL does not serve H3SLAAttention (probe HTTP $H3_NODE_PROBE — the MiniMax H3 custom node packs are absent; install them into the engine's custom_nodes)"
fi

# ── THE H3 WEIGHTS GATE (this seat's own; the provision door) ─────
# Every provision row of the h3 family DECL — read from the
# EMITTED lib truth (the built module the estate itself boards),
# never a re-parse of src. Each row's folder is used VERBATIM (the
# every-folder law above). A miss names the file and the estate's
# own acquire door; MELITE_H3_PROVISION=1 turns the miss LOUD.
H3_DECL_LIB="$REPO_ROOT/packages/models/h3/lib/index.js"
if [ ! -f "$H3_DECL_LIB" ]; then
  skip_or_fail "no emitted h3 DECL at $H3_DECL_LIB (build @melite/models-h3 first)"
fi
if [ ! -d "$WEIGHTS_ROOT" ]; then
  skip_or_fail "no engine weights tree at $WEIGHTS_ROOT (set MELITE_H3_WEIGHTS_ROOT)"
fi
PROVISION_REPORT="$(mktemp)"
# THE GATE ITSELF (exit 1 + the report names every miss) — a
# function so the heredoc body stays clean of the fallback compound.
h3_weights_gate() {
  node --input-type=module - "$H3_DECL_LIB" "$WEIGHTS_ROOT" "$PROVISION_REPORT" <<'WGATE'
import { stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const [libPath, weightsRoot, reportPath] = process.argv.slice(2)
// file URL, never a bare relative specifier: a stdin module has no
// resolution base (ERR_MODULE_NOT_FOUND — the gate's own first cut).
const mod = await import(pathToFileURL(libPath).href)
const decl = mod.DECL ?? mod.default?.DECL
if (!decl || !Array.isArray(decl.provisions)) {
  await writeFile(reportPath, `e2e-h3-gpu-lane: the emitted DECL at ${libPath} carries no provisions table\n`)
  process.exit(1)
}
const missing = []
for (const row of decl.provisions) {
  // THE EVERY-FOLDER LAW: the folder comes from the DECL row
  // verbatim — never a hardcoded list. The gate's first cut
  // walked four hardcoded folders and misruled the
  // frame_interpolation film net; the census arm in
  // e2e-h3-gpu-lane.spec.ts walls this exact shape.
  const at = join(weightsRoot, row.folder, row.name)
  let actual = -1
  try { actual = (await stat(at)).size } catch { /* absent */ }
  if (actual !== row.size_bytes) {
    missing.push(`${row.name}  (${(row.size_bytes / 1e9).toFixed(1)} GB, folder ${row.folder}) — ${actual < 0 ? 'absent' : `size ${actual} ≠ DECL ${row.size_bytes}`}`)
  }
}
if (missing.length > 0) {
  await writeFile(reportPath, missing.map((m) => `  MISSING ${m}`).join('\n') + '\n')
  process.exit(1)
}
await writeFile(reportPath, `  h3 weights COMPLETE: ${decl.provisions.length} provision rows verified size-exact under ${weightsRoot}\n`)
WGATE
}
# THE REFUSAL/SKIP (the provision door) — never inline after a
# heredoc: the compound would swallow the terminator (the parse
# death this block's first cut carried).
h3_provision_refuse() {
  cat "$PROVISION_REPORT" >&2
  if [ -n "${MELITE_H3_PROVISION:-}" ]; then
    echo "[e2e-h3-gpu-lane] MELITE_H3_PROVISION=1 — the estate's own door for the missing weights:" >&2
    echo "  comfy_manage acquire_weight  model h3  file <each missing name above>" >&2
    echo "  (the DECL owns the fetch source; the gateway owns the fetch — this script never curls a weights URL)" >&2
  else
    echo "[e2e-h3-gpu-lane] h3 weights missing under $WEIGHTS_ROOT (the report above names each file + GB); MELITE_H3_PROVISION=1 prints the provision door, E2E_H3_REQUIRE=1 refuses the skip" >&2
  fi
  skip_or_fail "h3 family weights incomplete under $WEIGHTS_ROOT"
}
h3_weights_gate || h3_provision_refuse
cat "$PROVISION_REPORT"
rm -f "$PROVISION_REPORT"

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
  # E2E_H3_KEEP=1 — the debug door (the gpu seat's own): keep the
  # throwaway home, runs root and cookies for post-mortem.
  if [ "${E2E_H3_KEEP:-0}" = "1" ]; then
    echo "[e2e-h3-gpu-lane] E2E_H3_KEEP=1 — keeping $HOME_DIR and $RUNS_ROOT for post-mortem"
    return 0
  fi
  rm -rf "$HOME_DIR" "$RUNS_ROOT" "$COOKIES"
}
trap cleanup EXIT

# ── the throwaway home (the gpu recipe verbatim) ──────────────────
rm -rf "$HOME_DIR" "$RUNS_ROOT"
mkdir -p "$HOME_DIR/profiles" "$HOME_DIR/storages"
cp -a "$SEED_DIR" "$HOME_DIR/profiles/e2e-h3"
if [ ! -d "$HOME_DIR/profiles/e2e-h3/node_modules" ]; then
  echo "[e2e-h3-gpu-lane] materializing the tracked seed's deps (rewrite + pnpm install)"
  HOME_COPY="$HOME_DIR/profiles/e2e-h3" SEED_AT="$REPO_ROOT/$TRACKED_SEED" python3 - <<'PYSEED' || exit 1
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
    print(f"[e2e-h3-gpu-lane] seed rewrite left dead links {dead}", file=sys.stderr); sys.exit(1)
PYSEED
  (cd "$HOME_DIR/profiles/e2e-h3" && PATH="$HOME/.local/share/mise/installs/node/24.21.0/bin:$HOME/.local/bin:$PATH" pnpm install --no-frozen-lockfile >/tmp/e2e-h3-seed-install.log 2>&1) || {
    echo "[e2e-h3-gpu-lane] seed pnpm install failed:"; tail -8 /tmp/e2e-h3-seed-install.log; exit 1
  }
fi
# settings.yaml — the KEYLESS law verbatim (D6 row-name wall): the
# H3 door-tier lane carries no LLM subject.
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
        "e2e-h3-gpu-lane: refusing to copy settings.yaml into the KEYLESS lane — "
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
}, open("data/runtime/e2e-h3-home/storages/workspace.json", "w"))
import pathlib
_ws = pathlib.Path("data/runtime/e2e-h3-home/storages/workspace.json")
_ws.write_text(_ws.read_text().replace("__REPO_ROOT__", pathlib.Path.cwd().as_posix()))
PY

# ── THE RUNS ROOT PIN (J12 law: the estate row's config) ──────────
ESTATE_PATCH="$HOME_DIR/estate-state.patch.yml"
cat >"$ESTATE_PATCH" <<EPATCH
# minted by e2e-h3-gpu-lane (J12): the estate row's config names the
# lane's runs root — never an env seam. H3 GPU runs land on the
# THROWAWAY root, never the operator's tree.
- id: melite-estate
  config:
    stateRoot: "$RUNS_ROOT"
EPATCH
: > "$LOG"
DSH_HOME="$HOME_DIR" \
  setsid "$DSH_BIN" --profile e2e-h3 --patch "$ESTATE_PATCH" --host 127.0.0.1 --port "$PORT" --no-open \
  >> "$LOG" 2>&1 &
HOST_PID=$!
HOST_PGID="$(ps -o pgid= -p "$HOST_PID" | tr -d ' ')"

# ── wait for the token ────────────────────────────────────────────
TOKEN=""
for _ in $(seq 1 120); do
  TOKEN="$(grep -o "dsh web: http://127.0.0.1:$PORT/?token=[A-Za-z0-9_-]*" "$LOG" 2>/dev/null | tail -1 | sed "s/.*token=//" || true)"
  [ -n "$TOKEN" ] && break
  kill -0 "$HOST_PID" 2>/dev/null || { echo "[e2e-h3-gpu-lane] host died at boot:"; tail -5 "$LOG"; exit 1; }
  sleep 1
done
[ -n "$TOKEN" ] || { echo "[e2e-h3-gpu-lane] no token after 120s:"; tail -5 "$LOG"; exit 1; }
export E2E_STUDIO_URL="http://127.0.0.1:$PORT/?token=$TOKEN"
echo "[e2e-h3-gpu-lane] host up: $E2E_STUDIO_URL"

# ── the wall ──────────────────────────────────────────────────────
# E2E_H3=1 is the H3 tier's own gate (the specs skip without it);
# E2E_RUNS_ROOT names the throwaway root (the ghost-wall contract).
# The h3 config runs ONLY the h3 specs (playwright.h3.config.ts —
# testMatch h3-*.spec.ts): the z-image/automotive tiers stay the
# gpu seat's own, never re-run here.
PLAYWRIGHT_EXIT=0
PATH="$HOME/.local/share/mise/installs/node/24.21.0/bin:$HOME/.local/bin:$PATH" \
  E2E_RUNS_ROOT="$RUNS_ROOT" \
  E2E_GPU=1 \
  E2E_H3=1 \
  pnpm --filter "$CARD_VIEW_FILTER" exec playwright test -c playwright.h3.config.ts "$@" || PLAYWRIGHT_EXIT=$?

# ── the host's own word (the gpu seat's post-verdicts) ────────────
if grep -q "Cannot find module" "$LOG" 2>/dev/null; then
  echo "[e2e-h3-gpu-lane] host log carries a module-resolution failure:" >&2
  grep -n "Cannot find module" "$LOG" >&2
  exit 1
fi
if grep -q "did not activate" "$LOG" 2>/dev/null; then
  echo "[e2e-h3-gpu-lane] host boot carried activation failures (never benign):" >&2
  grep -nE "did not activate|failed to import" "$LOG" >&2
  exit 1
fi
for SIG in "client bundle not found" "startup failed"; do
  if grep -q "$SIG" "$LOG" 2>/dev/null; then
    echo "[e2e-h3-gpu-lane] host log carries '$SIG' (a serve-class boot death):" >&2
    grep -n "$SIG" "$LOG" >&2
    exit 1
  fi
done
exit $PLAYWRIGHT_EXIT
