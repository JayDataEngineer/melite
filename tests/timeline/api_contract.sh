#!/usr/bin/env bash
# API contract tests - live gateway (:18090). Fast, no GPU.
# Every assertion here guards a SHIPPED regression:
#   - empty 404 bodies broke the editor's JSON parser (banner bug)
#   - yaml/list+detail 404s made the Pipelines library dead
#   - control chars in yaml descriptions broke strict JSON parsing
set -u
GW="${GW:-http://127.0.0.1:18090}"
FAILS=0
ck() { # name, condition(0=ok)
  if [ "$2" = "0" ]; then echo "PASS $1"; else echo "FAIL $1"; FAILS=$((FAILS+1)); fi
}
J() { python3 -c "import json,sys; json.load(sys.stdin)" ; }   # strict parse from stdin

# --- queue shape ---
curl -s -m 5 "$GW/v1/queue" | J >/dev/null; ck "queue.strict_json" $?
curl -s -m 5 "$GW/v1/queue" | grep -q '"queued_ids"'; ck "queue.queued_ids_key" $?

# --- pipelines yaml list (the editor library endpoint) ---
L=$(curl -s -m 8 "$GW/v1/pipelines/yaml/list")
echo "$L" | J >/dev/null; ck "yaml_list.strict_json" $?
echo "$L" | python3 -c '
import json,sys
d=json.load(sys.stdin); ps=d.get("pipelines",[])
assert len(ps)>=65, f"too few pipelines: {len(ps)}"
names=[p.get("name") or p.get("filename","").removesuffix(".yaml") for p in ps]
assert "h3-timeline" in names, "h3-timeline missing"
assert "mask-studio" in names, "mask-studio missing"
assert names==sorted(names), "list not sorted"
' ; ck "yaml_list.content_h3_timeline_sorted" $?

# --- yaml detail (nodes surface the editor imports) ---
D=$(curl -s -m 8 "$GW/v1/pipelines/yaml/detail?yaml=h3-timeline")
echo "$D" | J >/dev/null; ck "yaml_detail.strict_json" $?
echo "$D" | python3 -c '
import json,sys
d=json.load(sys.stdin)
assert d.get("name")=="h3-timeline", d.get("name")
ns=[n.get("id") for n in d.get("nodes",[])]
for want in ("window1","window2","window3","stitch"):
    assert want in ns, f"node {want} missing: {ns}"
' ; ck "yaml_detail.nodes_window123_stitch" $?

# --- JSON 404 / 400 bodies (the banner-bug class) ---
B=$(curl -s -m 5 -w '|%{http_code}' "$GW/v1/definitely-not-a-route")
CODE=${B##*|}; BODY=${B%|*}
[ "$CODE" = "404" ]; ck "notfound.status_404" $?
echo "$BODY" | J >/dev/null; ck "notfound.body_is_json" $?
echo "$BODY" | grep -q '"error"'; ck "notfound.body_has_error_key" $?

curl -s -m 5 -o /dev/null -w '%{http_code}' "$GW/v1/pipelines/yaml/detail" | grep -q 400
ck "yaml_detail.missing_param_400" $?
E=$(curl -s -m 5 "$GW/v1/pipelines/yaml/detail?yaml=zz-no-such")
echo "$E" | J >/dev/null; ck "yaml_detail.unknown_strict_json" $?
echo "$E" | grep -q '"error"'; ck "yaml_detail.unknown_error_body" $?

# --- drafts + runs contract ---
curl -s -m 5 "$GW/v1/pipelines/runs" | J >/dev/null; ck "runs.strict_json" $?
curl -s -m 5 "$GW/v1/pipelines/runs" | grep -q '"run_id"'; ck "runs.run_id_key" $?

echo "SUITE api_contract: $([ $FAILS -eq 0 ] && echo PASS || echo FAIL $FAILS)"
exit $([ $FAILS -eq 0 ] && echo 0 || echo 1)
