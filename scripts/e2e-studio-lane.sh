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

# THE LANE IDENTITY KNOBS (GOAL-2, 2026-10-24): a second lane can
# boot BESIDE a standing host (the operator's GUI can own :3907 —
# booting over it is never allowed, and its home/runs root are LIVE
# state). Every path is per-lane: the port-suffixed /tmp artifacts
# can never collide across lanes. Defaults are the historical single
# lane, byte-identical when the knobs are unset.
PORT="${E2E_STUDIO_PORT:-3907}"
HOME_DIR="${E2E_STUDIO_HOME:-data/runtime/e2e-studio-home}"
RUNS_ROOT="${E2E_STUDIO_RUNS_ROOT:-/tmp/e2e-studio-runs}"
COOKIES="/tmp/e2e-studio-cookies-$PORT.txt"
LOG="/tmp/e2e-studio-lane-$PORT.log"
# Bash-only REPO_ROOT (parameter expansion is a builtin): the spec's
# stub-PATH seat runs this script with NOTHING resolvable — dirname
# must never stand between the prereq gates and their verdict.
REPO_ROOT="$(cd -- "${BASH_SOURCE[0]%/*}/.." && pwd)"
cd "$REPO_ROOT"
# THE F1 FRESHNESS GATE (HMR audit 009, 2026-10-24): a lane serves
# lib/ from the repo tree, so a package whose src drifted past its
# built lib would have every lane receipt attest a product that is
# not the tree (two receipted outages taught this class). The gate
# rides the stamp's own recipe; the named cure is the rebuild.
# Refusal happens BEFORE any boot — a stale lane never starts.
source "$REPO_ROOT/scripts/lib/lane-freshness.sh"
check_lane_freshness "$REPO_ROOT" || {
  echo "[e2e-studio-lane] refusing to boot on stale lib planes (the F1 gate)" >&2
  exit 1
}

# deployment env (.env is gitignored; .env.example documents every knob)
[ -f ./.env ] && . ./.env   # env-file loaded
DSH_BIN="${DSH_BIN:-dsh}"
CARD_VIEW_FILTER="${CARD_VIEW_FILTER:-@melite-plugin/dsh-card-view}"

# THE TRACKED SEED IS THE SEAT'S ONLY SEED (2026-10-12, the moss-404
# lesson): a live dev profile arms the G2 hot door through
# cordis.patch.yml — its patch watcher can mount→dispose→remount that
# row MID-RUN, and the every-card wall boards a card the estate then
# un-serves under it (form-spec 404s land as page errors; the defs
# refresh blanks neighbor axes). A wall seat asserts STABLE serving:
# it boots the committed, seed-only profile — deterministic,
# fresh-checkout-true. Operator pins ride settings.yaml (copied
# separately below), never the profile.
TRACKED_SEED="packages/web/melite-card-view/e2e/profile-seed"
SEED_DIR="$TRACKED_SEED"

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

# LANE LAW (li-bu class, the audit's F-8): whatever binary resolved
# above MUST be the provisioned runtime — >=0.2.0-rc.1, the repo's own
# pin (packages/harness/provisioner/package.json). A bare PATH dsh
# below the floor is the banned class (the mise 0.1.5-rc.2 burn: a
# shell whose typert registry refuses our codec shape, the bench
# namespace never mounts, and every symptom lands far from the cause).
# The sanctioned door for a lane is the sibling provisioner:
#   ~/Documents/programs/active/dsh-provision/apply.sh launch --lane X
dsh_version="$("$DSH_BIN" --version 2>/dev/null | head -1 || true)"
python3 - "$dsh_version" <<'GATE' || exit 1
import re, sys
m = re.search(r"(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?", sys.argv[1] or "")
if not m:
    sys.exit("e2e-studio-lane: cannot read a version from '$DSH_BIN' — boot only through the provision (dsh-provision apply.sh launch)")
maj, min_, pat, rc = (int(m.group(i)) if m.group(i) else None for i in (1, 2, 3, 4))
cur = (maj, min_, pat, rc if rc is not None else 10**6)
floor = (0, 2, 0, 1)
if cur < floor:
    sys.exit(f"e2e-studio-lane: $DSH_BIN is {'.'.join(m.groups())}, below the 0.2.0-rc.1 floor — boot only through the provision (dsh-provision apply.sh launch)")
GATE
SEED_DIR=""
if [ -d "$TRACKED_SEED" ]; then
  SEED_DIR="$TRACKED_SEED"
else
  skip_or_fail "no profile seed ($TRACKED_SEED)"
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
  (cd "$HOME_DIR/profiles/e2e-studio" && PATH="$HOME/.local/share/mise/installs/node/24.21.0/bin:$HOME/.local/bin:$PATH" pnpm install --no-frozen-lockfile >"/tmp/e2e-studio-seed-install-$PORT.log" 2>&1) || {
    echo "[e2e-studio-lane] seed pnpm install failed:"; tail -8 "/tmp/e2e-studio-seed-install-$PORT.log"; exit 1
  }
fi
# settings.yaml is the OPERATOR's per-machine provider plane —
# untracked by law (secrets never cross homes). The lane is KEYLESS
# (browser-plane walls, no LLM subject); copy the live home's file
# when present, boot without it otherwise. (Single-setup law
# 2026-10-18: the repo-local fossil home this copied from is gone —
# the only source is the operator's live home.)
# D6 KEYLESS ROW-NAME WALL (deploy-path audit, 2026-10-20): a
# settings row carrying a provider table (`providers:` subtree —
# the shape `llm-pi-ai` rode in the Sep-30 fossil) would silently
# hand this KEYLESS lane an LLM subject. Refuse the copy naming the
# row (names only — the guard reads keys, never values); the
# operator strips the provider table or pins a keyless file.
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
        "e2e-studio-lane: refusing to copy settings.yaml into the KEYLESS lane — "
        "provider table row(s): " + ", ".join(keyed) + "\n"
        "(strip the row or pin a keyless settings file; deploy-path audit D6)\n"
    )
    sys.exit(1)
PY
  cp "$HOME/.dsh/settings.yaml" "$HOME_DIR/"
fi

# THE AI KEY SEAT (GOAL-2, 2026-10-24): the keyless law above holds
# UNLESS the operator names a brain (MELITE_E2E_AGENT_ROUTE=provider/
# model — the route shape the melite-test lane's estate row seats).
# Then the machine's credential refs — the same store ~/.dsh-dev
# symlinks at $HOME/.dsh/.credentials.yaml — merge into the
# throwaway home so the brain's apiKeyEnv resolves. Machine-local
# only: values never enter the repo, any log, or CI (the gate is
# the operator's own env; unset = the keyless default untouched).
if [ -n "${MELITE_E2E_AGENT_ROUTE:-}" ]; then
  CRED_SRC="${MELITE_E2E_CREDENTIALS:-$HOME/.dsh/.credentials.yaml}"
  CRED_DST="$HOME_DIR/.credentials.yaml"
  python3 - "$CRED_SRC" "$CRED_DST" <<'PYCRED' || exit 1
import os, re, sys
src, dst = sys.argv[1], sys.argv[2]

def read_refs(text):
    refs, in_refs = {}, False
    for line in text.splitlines():
        if re.match(r"^refs:\s*$", line):
            in_refs = True
            continue
        if in_refs:
            m = re.match(r"^  ([A-Za-z0-9_]+): (.+)$", line)
            if m:
                refs[m.group(1)] = m.group(2)
            elif line and not line.startswith("  "):
                in_refs = False
    return refs

try:
    src_refs = read_refs(open(src, encoding="utf-8").read())
except OSError as e:
    sys.stderr.write(f"e2e-studio-lane: credential source unreadable: {e}\n")
    sys.exit(1)
if not src_refs:
    sys.stderr.write(
        "e2e-studio-lane: no refs: block in the credential source — "
        "refusing to seat a brain with no key\n"
    )
    sys.exit(1)
dst_text = open(dst, encoding="utf-8").read() if os.path.exists(dst) else ""
merged = {**read_refs(dst_text), **src_refs}
lines = ["version: 1", "refs:"] + [f"  {k}: {v}" for k, v in merged.items()]
m = re.search(r"(?ms)^records:.*", dst_text)
if m:
    lines.append(m.group(0).rstrip())
open(dst, "w", encoding="utf-8").write("\n".join(lines) + "\n")
# owner-only mode or the credentials loader refuses the store at
# boot (assertOwnerOnly: "readable beyond its owner")
os.chmod(dst, 0o600)
print(f"[e2e-studio-lane] AI key seat: {len(src_refs)} credential ref(s) merged (values never logged)")
PYCRED
fi

# THE WORKSPACE PRE-STATE (seeded BEFORE boot — a host with no
# workspace serves only the chooser hero). Schema-valid row naming
# THIS repo; ISO stamps because the domain schema refuses the rest.
HOME_DIR="$HOME_DIR" python3 - <<'PY'
import json, uuid, os
home = os.environ["HOME_DIR"]
row = str(uuid.uuid4()); ts = "2026-09-21T00:00:00.000Z"
ws_path = os.path.join(home, "storages", "workspace.json")
json.dump({
  "unit": {"name": "workspace", "version": 2},
  "global": {"initialized": True, "workspaceIds": [row], "archivedSessionIds": []},
  "tables": {"workspaces": {row: {
    "path": "__REPO_ROOT__",
    "title": "inference.cpp", "sessionIds": [],
    "createdAt": ts, "updatedAt": ts}}},
}, open(ws_path, "w"))
import pathlib
_ws = pathlib.Path(ws_path)
_ws.write_text(_ws.read_text().replace("__REPO_ROOT__", pathlib.Path.cwd().as_posix()))
PY

# THE RUNS ROOT PIN is not optional: QueueService refuses to boot
# without a named root (the cwd-guess ban, stroke 45c). J12 retired
# the MELITE_STATE_ROOT env seam — the pin rides the estate row's
# config through a minted --patch overlay.
ESTATE_PATCH="$HOME_DIR/estate-state.patch.yml"
cat >"$ESTATE_PATCH" <<EPATCH
# minted by e2e-studio-lane (J12): the estate row's config names the
# lane's runs root — never an env seam.
- id: melite-estate
  config:
    stateRoot: "$RUNS_ROOT"
EPATCH
# THE AI ROUTE SEAT (GOAL-2, 2026-10-24): when the operator names a
# brain, the estate row's config carries agentRoute (the same field
# the melite-test lane seats — packages/web/melite-estate/src/
# index.ts melite-engine-agent-row) AND the llm provider table rides
# the SAME patch: the llm-pi-ai row spliced VERBATIM from the
# operator's rows file (one copy, !!js tags untouched — the same
# splice law as infer-provision --profile-rows; never re-serialize).
# Unset = the minted patch stays keyless and brainless: CI law.
AGENT_ROUTE="${MELITE_E2E_AGENT_ROUTE:-}"
if [ -n "$AGENT_ROUTE" ]; then
  printf '    agentRoute: "%s"\n' "$AGENT_ROUTE" >>"$ESTATE_PATCH"
  LLM_ROWS="${MELITE_E2E_LLM_ROWS:-$REPO_ROOT/dev_docs/deployment/studio-lane-rows.yml}"
  [ -f "$LLM_ROWS" ] || { echo "[e2e-studio-lane] MELITE_E2E_AGENT_ROUTE set but llm rows file missing: $LLM_ROWS"; exit 1; }
  # TWO rows: the provider table (llm-pi-ai) AND the shell's default
  # chat route (agent-default-model → zai/glm-5.3-flash). Without the
  # default-route row the mint's own model turn falls back to
  # deepseek-official and dies keyless ("This turn failed") — the
  # e2e wall: bench tour mint arms proved it, 2026-10-24.
  for ROW_ID in llm-pi-ai agent-default-model; do
    awk -v row="^- id: $ROW_ID\$" '$0 ~ row {f=1} f && /^- id:/ && $0 !~ row {exit} f{print}' "$LLM_ROWS" >>"$ESTATE_PATCH" \
      || { echo "[e2e-studio-lane] row extraction failed for $ROW_ID from $LLM_ROWS"; exit 1; }
    grep -q "^- id: $ROW_ID\$" "$ESTATE_PATCH" \
      || { echo "[e2e-studio-lane] no $ROW_ID row found in $LLM_ROWS — the brain would seat starved"; exit 1; }
  done
  # THE MINT'S EFFORT SEAT (2026-10-24, the exploration race): the
  # mint turn's CONTENT is irrelevant (it births the conversation and
  # names the bench key — adjudicated across drives 6-11), but a
  # high-effort commission-brain answers the mint with minutes of
  # repo exploration whose rerenders race every downstream spec
  # (and, before the read-only seat, edited the worktree). Low
  # effort answers the mint in seconds; the walls judge faces the
  # mint never touches. The operator's own lanes keep their row.
  python3 - "$ESTATE_PATCH" <<'PYEFFORT' || exit 1
import re, sys
patch = sys.argv[1]
text = open(patch).read()
new, n = re.subn(
    r'(- id: agent-default-model\n(?:  .*\n)*?    reasoningEffort:) high',
    r'\1 low',
    text,
)
if n != 1:
    print('[e2e-studio-lane] agent-default-model effort rewrite failed (matches: %d)' % n)
    sys.exit(1)
open(patch, 'w').write(new)
PYEFFORT
  echo "[e2e-studio-lane] AI route seat: agentRoute=$AGENT_ROUTE + llm-pi-ai provider table + agent-default-model @ low effort (operator-sanctioned AI drive; the mint births, it never explores)"
fi
: > "$LOG"
# --patch rides BEFORE the app passthrough flags (--host/--port/
# --no-open): after the first unknown option, commander hands the
# rest to the app, whose parser rejects the launcher's --patch.
DSH_HOME="$HOME_DIR" \
  setsid "$DSH_BIN" --profile e2e-studio --patch "$ESTATE_PATCH" --host 127.0.0.1 --port "$PORT" --no-open \
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

# ── the AI seat assert (never let the specs hang on a dead brain) ─
# The estate row seats the agent engine during boot; by token time
# the verdict is in the lane log. A brain that never seats is a
# FAIL-LOUD here — a 7-minute per-spec timeout rack is not a drive.
if [ -n "$AGENT_ROUTE" ]; then
  BRAIN_OK=""
  for _ in $(seq 1 30); do
    if grep -q "engine 'agent' seated: brain" "$LOG" 2>/dev/null; then BRAIN_OK=1; break; fi
    kill -0 "$HOST_PID" 2>/dev/null || break
    sleep 1
  done
  if [ -z "$BRAIN_OK" ]; then
    echo "[e2e-studio-lane] AI seat FAILED — no brain seat line in the lane log:"
    tail -8 "$LOG"
    if [ -n "$HOST_PGID" ]; then kill -- -"$HOST_PGID" 2>/dev/null || true; fi
    exit 1
  fi
  echo "[e2e-studio-lane] AI seat verified: $(grep -o "engine 'agent' seated: brain [^ ]*" "$LOG" | tail -1)"
fi

# ── seed the bench over the host's own /api wire ──────────────────
curl -sL -c "$COOKIES" "$E2E_STUDIO_URL" -o /dev/null
curl -s -b "$COOKIES" -X POST "http://127.0.0.1:$PORT/api/bench/ensure" \
  -H 'content-type: application/json' \
  -d '{"type":"client-request","rpcId":"seed","method":"bench/ensure","payload":{"args":{"doc":{"session":"main"}}}}' -o /dev/null
curl -s -b "$COOKIES" -X POST "http://127.0.0.1:$PORT/api/bench/add-stage" \
  -H 'content-type: application/json' \
  -d '{"type":"client-request","rpcId":"seed","method":"bench/add-stage","payload":{"args":{"sessionKey":"main","doc":{"card":"h3-timeline","author":"user","expect_rev":0}}}}' -o /dev/null

# ── seed the runs library: one image run ───────────────────────────
# The media walls (restore-preview, from-media's pick branch) drive
# the gallery's real gestures and need a run whose tile paints an
# <img> preview — the runs seat lists the state root's output/ tree
# on demand, so the seed is a plain run dir: run-<hex>-<word> (the
# RUN_ID_RE grammar — a loose name 400s on the artifact route), a
# servable media leaf, and the _flow.json sidecar the row builder
# byte-scans (pipeline must not start with _ — the user-surface law).
SEED_RUN="$RUNS_ROOT/output/run-3ca7-laneseed"
mkdir -p "$SEED_RUN"
cp "$REPO_ROOT/packages/web/melite-card-view/e2e/rail-overflow.png" "$SEED_RUN/preview.png"
printf '{"pipeline":"image-gen","status":"success","created_at":%s,"prompt":"the lane seed image run","seed":7}\n' \
  "$(date +%s000)" > "$SEED_RUN/_flow.json"

# ── the wall ──────────────────────────────────────────────────────
# E2E_RUNS_ROOT names the scratch runs root for the lane THIS script
# booted (the ghost wall plants + removes run dirs to prove no
# phantom tiles — it refuses to guess the root, and a manual run
# against any other lane leaves the variable unset so the plant
# tests skip instead of touching a real tree).
PLAYWRIGHT_EXIT=0
PATH="$HOME/.local/share/mise/installs/node/24.21.0/bin:$HOME/.local/bin:$PATH" \
  E2E_RUNS_ROOT="$RUNS_ROOT" \
  pnpm --filter "$CARD_VIEW_FILTER" exec playwright test "$@" || PLAYWRIGHT_EXIT=$?

# ── the host's own word (2026-10-13, the stale-lib wedge): a green
# playwright run can ride a host that silently skipped a capability
# — the lane booted green while card-plane cross-validation died at
# a "Cannot find module" skip in the host log (a stale committed lib
# whose emitted JS carried a .ts specifier). A module-resolution
# failure in the host log is never benign; the lane refuses it.
if grep -q "Cannot find module" "$LOG" 2>/dev/null; then
  echo "[e2e-studio-lane] host log carries a module-resolution failure:" >&2
  grep -n "Cannot find module" "$LOG" >&2
  exit 1
fi
# THE BOOT-DIAGNOSTIC CLASS (2026-10-13, the 3-entry boot): a boot
# can half-fail on OPTIONAL entries — dsh-app-boot warns "N entries
# did not activate" / "<id> (<name>): failed to import" and still
# serves. The run that taught this: three host entries dead (estate,
# tools, tools-doors) → the catalog API answered empty → thirteen
# specs starved into 5.5-minute timeouts for 1.1h of noise. A host
# whose boot carried ANY activation failure never owns the lane; the
# refusal names the dead entries and stops before playwright.
if grep -q "did not activate" "$LOG" 2>/dev/null; then
  echo "[e2e-studio-lane] host boot carried activation failures (never benign — the wall starves on a half-dead host):" >&2
  grep -nE "did not activate|failed to import" "$LOG" >&2
  exit 1
fi
# THE SERVE-CLASS REFUSALS (the render-vs-boot audit, 2026-10-18):
# both signatures below are boot deaths the host can still SERVE
# behind — `client bundle not found` (a row the loader cannot
# satisfy) and `startup failed` (dsh's own exit-1 verdict on
# required plugins that never activated). A host carrying either
# never owns the lane.
for SIG in "client bundle not found" "startup failed"; do
  if grep -q "$SIG" "$LOG" 2>/dev/null; then
    echo "[e2e-studio-lane] host log carries '$SIG' (a serve-class boot death):" >&2
    grep -n "$SIG" "$LOG" >&2
    exit 1
  fi
done
exit $PLAYWRIGHT_EXIT
