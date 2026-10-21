#!/usr/bin/env bash
# lane-sync — the ONE command for the melite-test lane (:3088).
#
#   bash scripts/lane-sync.sh
#
# Mirror the operator's live web-profile rows into the lane's rows file,
# render the profile with estate-provision, restart the seat, wait for the
# fresh boot token, and run the GUI gates (test/gui-model-picker.mjs,
# test/gui-media-restore.mjs).
# Idempotent: if the mirrored rows are unchanged the render still runs but
# the mirror step prints "unchanged".
#
# Env overrides: LANE_PROFILE (default melite-test), LANE_DSH_HOME
# (default /home/user/.dsh-dev), LANE_ROUTE (default
# opencode-go/muse-spark-1.3-contributor), LANE_WEB_PROFILE (default
# ~/.dsh/profiles/web/cordis.patch.yml), LANE_SKIP_GATE=1 to skip the GUI gate.
#
# CWD LAW: every child spawn below resolves relative paths from the repo
# root (the cold-start drive resolves tools/ from process.cwd() — firing it
# from anywhere else is how drive A6 died).
set -euo pipefail
REPO="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
cd "$REPO"
# deployment env (.env is gitignored; .env.example documents every knob)
[ -f ./.env ] && . ./.env   # env-file loaded

PROFILE="${LANE_PROFILE:-melite-test}"
DSH_HOME="${LANE_DSH_HOME:-$HOME/.dsh-dev}"
# The seat is the PRIMARY brain (zai/glm-5.3-flash, same as :3080's
# MELITE_AGENT_ROUTE). It sat on the muse FALLBACK until 2026-10-20 —
# every lane-sync re-pin stuck the lane on muse and the rate-limit
# "switch back" never reached it (owner report 2026-10-20). LANE_ROUTE
# still overrides for a deliberate muse seat.
ROUTE="${LANE_ROUTE:-zai/glm-5.3-flash}"
WEB_PROFILE="${LANE_WEB_PROFILE:-$HOME/.dsh/profiles/web/cordis.patch.yml}"
ROWS="dev_docs/deployment/studio-lane-rows.yml"
BOOT_LOG="$DSH_HOME/$PROFILE-3088.log"
URL="http://127.0.0.1:3088"

[ -f "$WEB_PROFILE" ] || { echo "lane-sync: web profile missing: $WEB_PROFILE" >&2; exit 1; }
[ -f "$ROWS" ] || { echo "lane-sync: rows file missing: $ROWS" >&2; exit 1; }

# 0) STALE-LIB GATE (2026-10-11): the lane loads workspace packages by
#    symlink, so the RENDER carries whatever lib/ sits next to src/ — a
#    committed src that never got rebuilt ships as old law (the wall-less
#    managePlane served 34.8GB family totals for narrowed asks for two
#    days because estate-queue/lib predated the file→items wall and its
#    build had been silently failing on a stale comfyui-cordis .d.ts).
#    Any bundled package whose newest src file outruns its newest lib
#    file refuses the sync HERE, before the seat restarts onto old code.
stale=""
for d in packages/*/ packages/*/*/; do
  [ -d "$d/src" ] && [ -d "$d/lib" ] || continue
  s=$(find "$d/src" -name '*.ts' -printf '%T@\n' 2>/dev/null | sort -n | tail -1)
  l=$(find "$d/lib" -name '*.js' -printf '%T@\n' 2>/dev/null | sort -n | tail -1)
  [ -n "$s" ] && [ -n "$l" ] || continue
  awk -v s="$s" -v l="$l" 'BEGIN{exit !(s > l + 2)}' || continue
  stale="$stale $d"
done
[ -z "$stale" ] || {
  echo "lane-sync: FAIL — src newer than lib (rebuild before serving):$stale" >&2
  exit 1
}
echo "lane-sync: stale-lib gate clean"

old_token="$(grep -o 'token=[A-Za-z0-9_-]*' "$BOOT_LOG" 2>/dev/null | tail -1 | cut -d= -f2 || true)"

# 1) MIRROR — keep the file's existing header, splice the web profile's
#    rows verbatim from its first top-level row. A row whose block binds
#    `!!js ctx.` stays web-owned (ctx rows cannot resolve on this lane);
#    env-`!!js` rows ride fine.
header_lines=$(awk 'NR==1{exit} {n=NR} END{print n+0}' "$ROWS" | head -1)
head_n=$(awk '/^- id: /{print NR-1; exit}' "$ROWS")
head -n "$head_n" "$ROWS" > /tmp/lane-sync-rows.yml
awk '
  BEGIN { buf = ""; skip = 0 }
  /^- id: / {
    if (buf != "" && !skip) printf "%s", buf
    buf = $0 "\n"; skip = 0; next
  }
  { buf = buf $0 "\n"; if ($0 ~ /!!js/ && $0 ~ /ctx\./) skip = 1 }
  END { if (buf != "" && !skip) printf "%s", buf }
' "$WEB_PROFILE" >> /tmp/lane-sync-rows.yml
if cmp -s "$ROWS" /tmp/lane-sync-rows.yml; then
  echo "lane-sync: mirror unchanged ($(grep -c '^- id: ' "$ROWS") rows)"
else
  mv /tmp/lane-sync-rows.yml "$ROWS"
  echo "lane-sync: mirror updated ($(grep -c '^- id: ' "$ROWS") rows)"
fi

# 2) RENDER — estate-provision is the only sanctioned writer of $DSH_HOME.
node packages/harness/provisioner/bin/infer-provision.mjs profile "$PROFILE" \
  --dsh-home "$DSH_HOME" \
  --estate-agent-route "$ROUTE" \
  --profile-rows "$ROWS" >/dev/null
echo "lane-sync: rendered $PROFILE into $DSH_HOME (route $ROUTE)"

# 3) RESTART + 4) WAIT for the fresh boot token (the boot rotates it).
systemctl --user restart "dsh-$PROFILE.service"
echo -n "lane-sync: waiting for fresh boot"
fresh=""
for _ in $(seq 1 45); do
  sleep 3
  echo -n "."
  fresh="$(grep -o 'token=[A-Za-z0-9_-]*' "$BOOT_LOG" 2>/dev/null | tail -1 | cut -d= -f2 || true)"
  [ -n "$fresh" ] && [ "$fresh" != "$old_token" ] && break
done
echo
[ -n "$fresh" ] && [ "$fresh" != "$old_token" ] \
  || { echo "lane-sync: FAIL — no fresh token appeared in $BOOT_LOG" >&2; exit 1; }
# Shell must actually answer the token handshake.
for _ in $(seq 1 20); do
  code=$(curl -sk -o /dev/null -w '%{http_code}' "$URL/?token=$fresh" || true)
  [ "$code" = "303" ] || [ "$code" = "200" ] && break
  sleep 2
done
echo "lane-sync: seat up — $URL/?token=$fresh"

# 5a) ESTATE WARM WAIT — the DSH remote proxy answers 503 on every /v1/bench
# read until the estate queue seats (observed 2026-10-11: the media gate ran
# cold, ensure 503'd, and the restore chain read as dead). Warmth is NOT
# traffic-driven — it lands 3-5 min after boot on its own clock, so the wait
# must outlast it. A probe against a bench key that cannot exist returns 404
# once the queue is seated, 503 while it is not — that is the discriminator.
# Reuse one cookie jar for the token handshake the probe needs.
curl -sk -c /tmp/lane-sync-jar -o /dev/null "$URL/?token=$fresh" || true
wcode=503
for _ in $(seq 1 180); do
  wcode=$(curl -sk -b /tmp/lane-sync-jar -o /dev/null -w '%{http_code}' "$URL/v1/bench/lane-sync-warmup-probe" || true)
  { [ "$wcode" = "404" ] || [ "$wcode" = "200" ]; } && break
  sleep 2
done
echo "lane-sync: estate warm (bench probe: $wcode)"
[ "$wcode" = "404" ] || [ "$wcode" = "200" ] \
  || { echo "lane-sync: WARN — estate bench door still cold ($wcode); gates may race" >&2; }

# 5) GATE — the operator's law: if it shows in the GUI, it gets tested.
if [ "${LANE_SKIP_GATE:-0}" != "1" ]; then
  GUI_TOKEN="$fresh" node test/gui-model-picker.mjs
  GUI_TOKEN="$fresh" node test/gui-media-restore.mjs
fi
echo "lane-sync: DONE — $URL/?token=$fresh"
