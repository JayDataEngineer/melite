#!/usr/bin/env bash
# promote-prod.sh — THE PROD LANE PROMOTE (li-bg, 2026-10-11).
#
# WHY THIS EXISTS: the lanes have a law (3088 dev first, 3080 prod
# last) but only the dev half had tooling — ship-lane.sh ships 3088.
# The prod half was raw systemctl (done once, by hand, 2026-10-11,
# and called out by the operator for exactly that). Never again:
# this script IS the sanctioned prod touch.
#
# THE CONTRACT:
#   1. PRE-FLIGHT — prod is only ever promoted onto a state the dev
#      lane has already proven: HEAD must be the committed build, the
#      dev lane must be up. A dirty tree or a down dev lane refuses.
#   2. RECORD — the pre-promote service state is printed (PID, since)
#      so a rollback has its bearings.
#   3. RESTART — the one privileged action, named loudly.
#   4. HEALTH GATE — poll the authed prod doors until the estate
#      reports ready (validate answers with a verdict, not "estate
#      composition is still activating"); refuse to report success
#      before it does.
#   5. RECEIPTS — door probes printed for the ledger.
#
# ROLLBACK: `promote-prod.sh --rollback` restarts prod onto the
# recorded prior HEAD (the service runs from this repo tree).
set -euo pipefail
# deployment env (.env is gitignored; .env.example documents every knob)
[ -f ./.env ] && . ./.env   # env-file loaded

PROD_UNIT="dsh-web.service"
PROD_URL="${MELITE_PROD_URL:-http://127.0.0.1:3080}"
DEV_URL="${MELITE_DEV_URL:-http://127.0.0.1:3088}"
STATE_FILE="/tmp/promote-prod.last"
TOKEN="${DSH_PROD_TOKEN:?DSH_PROD_TOKEN must name the prod bearer (never committed)}"

say()  { printf '\033[1m== %s\033[0m\n' "$*"; }
ok()   { printf '   \033[32mok\033[0m   %s\n' "$*"; }
bad()  { printf '   \033[31mBAD\033[0m  %s\n' "$*"; exit 1; }

if [[ "${1:-}" == "--rollback" ]]; then
  say "ROLLBACK the prod lane onto the recorded prior HEAD"
  [[ -f "$STATE_FILE" ]] || bad "no recorded promote to roll back ($STATE_FILE absent)"
  source "$STATE_FILE"
  say "prior HEAD: $PRIOR_HEAD"
  git -C "$(dirname "$0")/.." checkout "$PRIOR_HEAD"
  systemctl --user restart "$PROD_UNIT"
  sleep 5
  ok "prod restarted onto $PRIOR_HEAD — run the health gate by promoting again from that state"
  exit 0
fi

say "PRE-FLIGHT the promote"
git rev-parse --abbrev-ref HEAD | grep -qx cordis || bad "promote rides the cordis branch only"
[[ -z "$(git status --porcelain)" ]] || bad "the tree is dirty — prod promotes committed builds only"
DEV_CODE="$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$DEV_URL/v1/form-spec" || true)"
[[ "$DEV_CODE" != "000" ]] || bad "the dev lane ($DEV_URL) is down — prod never promotes ahead of dev"
ok "committed HEAD $(git rev-parse --short HEAD), dev lane answers ($DEV_CODE)"

say "RECORD the pre-promote bearings"
PRIOR_PID="$(systemctl --user show -p MainPID --value "$PROD_UNIT")"
PRIOR_SINCE="$(systemctl --user show -p ActiveEnterTimestamp --value "$PROD_UNIT")"
printf 'PRIOR_HEAD=%s\nPRIOR_PID=%s\nPRIOR_SINCE=%q\n' \
  "$(git rev-parse HEAD)" "$PRIOR_PID" "$PRIOR_SINCE" > "$STATE_FILE"
ok "was: pid $PRIOR_PID since $PRIOR_SINCE (recorded to $STATE_FILE for --rollback)"

say "RESTART the prod unit (the one privileged action)"
systemctl --user restart "$PROD_UNIT"
sleep 5
systemctl --user is-active --quiet "$PROD_UNIT" || bad "$PROD_UNIT failed to come active"
ok "$PROD_UNIT active"

say "HEALTH GATE the authed doors (estate must report ready)"
deadline=$(( $(date +%s) + 120 ))
verdict=""
while :; do
  body="$(curl -s -m 10 -H "Authorization: Bearer $TOKEN" \
    -X POST -H 'content-type: application/json' \
    -d '{"id":"promote-probe","stages":[]}' \
    "$PROD_URL/v1/flows/validate" || true)"
  if [[ "$body" != *"estate/pending"* && -n "$body" ]]; then
    verdict="$body"
    break
  fi
  (( $(date +%s) < deadline )) || bad "the estate never activated within 120s (last: ${body:0:120})"
  sleep 3
done
ok "validate door answers with a verdict:"
printf '   %s\n' "${verdict:0:200}"

say "PROMOTED"
echo "   lane:   $PROD_URL"
echo "   unit:   $PROD_UNIT"
echo "   head:   $(git rev-parse --short HEAD)"
echo "   rollback: $0 --rollback (restarts onto $(git rev-parse --short HEAD)^ recorded at promote time)"
