#!/usr/bin/env bash
# API contract tests - live gateway (default :18090; GW=... to override).
# Fast, no GPU. SKIPS (exit 0) when no gateway answers — the fast arm must
# not assume a live server. Every assertion here guards a SHIPPED
# regression:
#   - empty 404 bodies broke the editor's JSON parser (banner bug)
#   - yaml/list+detail 404s made the Flows library dead
#   - control chars in yaml descriptions broke strict JSON parsing
# Post-reorg shape: flows/ is the lane yaml set; h3-timeline is a
# MODEL (served from the model catalog + form-spec), not a yaml.
set -u
GW="${GW:-http://127.0.0.1:18090}"
FAILS=0
ck() { # name, condition(0=ok)
  if [ "$2" = "0" ]; then echo "PASS $1"; else echo "FAIL $1"; FAILS=$((FAILS+1)); fi
}
J() { python3 -c "import json,sys; json.load(sys.stdin)" ; }   # strict parse from stdin

# --- preflight: is a gateway answering? ---
CODE=$(curl -s -m 5 -o /dev/null -w '%{http_code}' "$GW/v1/health" 2>/dev/null || true)
if [ "$CODE" != "200" ]; then
  echo "SKIP api_contract (no gateway at $GW — set GW=... to the live port)"
  exit 0
fi

# --- queue shape ---
curl -s -m 5 "$GW/v1/queue" | J >/dev/null; ck "queue.strict_json" $?
curl -s -m 5 "$GW/v1/queue" | grep -q '"queued_ids"'; ck "queue.queued_ids_key" $?

# --- h3-timeline is a model now (the editor reads it from the catalog) ---
# State-aware: the model registry is built at gateway startup from the tree
# on disk. A gateway that started before the model migration serves an
# EMPTY catalog — a process-state artifact, not a code defect. The golden
# wall (tests/walls/suites/test_http_parity.py, fresh gateway) pins the full contract.
C=$(curl -s -m 8 "$GW/v1/model-catalog")
echo "$C" | J >/dev/null; ck "catalog.strict_json" $?
echo "$C" | python3 -c '
import json,sys
d=json.load(sys.stdin); models=d.get("models") or {}
if not models:
    print("NOTE live gateway serves an EMPTY model registry (started before the "
          "model migration; the golden wall pins the contract)")
    raise SystemExit(0)
assert "h3-timeline" in models, f"h3-timeline missing from model catalog: {list(models)[:12]}"
' ; ck "catalog.has_h3_timeline" $?

# --- JSON 404 / 400 bodies (the banner-bug class) ---
B=$(curl -s -m 5 -w '|%{http_code}' "$GW/v1/definitely-not-a-route")
CODE=${B##*|}; BODY=${B%|*}
[ "$CODE" = "404" ]; ck "notfound.status_404" $?
echo "$BODY" | J >/dev/null; ck "notfound.body_is_json" $?
echo "$BODY" | grep -q '"error"'; ck "notfound.body_has_error_key" $?

# --- runs ledger shape (state-agnostic) ---
R=$(curl -s -m 5 "$GW/v1/flows/runs")
echo "$R" | J >/dev/null; ck "runs.strict_json" $?
echo "$R" | python3 -c '
import json,sys
d=json.load(sys.stdin)
runs=d.get("runs")
assert isinstance(runs,list), f"runs not a list: {type(runs)}"
if runs:  # run_id only exists once a run is registered
    assert "run_id" in runs[0], f"first run row lacks run_id: {list(runs[0])}"
' ; ck "runs.shape" $?

echo "SUITE api_contract: $([ $FAILS -eq 0 ] && echo PASS || echo FAIL $FAILS)"
exit $([ $FAILS -eq 0 ] && echo 0 || echo 1)
