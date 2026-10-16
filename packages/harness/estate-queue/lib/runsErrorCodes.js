// runsErrorCodes.ts — the refusal-code -> HTTP answer-code table
// (the one mapping; an unnamed code is a LOUD bug, never generic).
//
// THE ADDITION CHECKLIST (the wire-chain audit cure, 2026-10-18): a
// NEW envelope code must touch every seat below in the same change,
// or it compiles and then bites later —
//   1. a row HERE (the envelope spelling -> the runs/* wire value);
//   2. a `RemoteErrorDetailsMap` merge entry in runsRegistry.ts
//      (the compiler enforces table <-> details sync at
//      toRemoteError — details must satisfy the map's row);
//   3. the CLIENT's refusedCode discrimination (melite-card-view:
//      cards-tab-body's heal-vs-carry split reads the wire value;
//      an untabled class silently takes the default fail-carry —
//      the replay-poison shape this table exists to prevent);
//   4. the validate-arm guards in runsValidateArms.ts (the two LOUD
//      throw sites that refuse untabled codes at the door);
//   5. phaseRefusalCode (cardsArmError.ts) — its param is narrowed
//      to this table's keys, so a new throw-site code fails
//      TYPECHECK here first, never at the client.
// The two spellings are law: the ENVELOPE key (card_compose) rides
// the throw; the WIRE value (runs/card-compose) is what the client
// compares. Both live in this table's one row.
//
// THE DIRECT-THROW EXEMPTION (wire-chain F2/F3, 2026-10-20): three
// wire codes never ride the envelope and are NOT tabled here, by
// design — `runs/unknown-run` and `runs/run-unknown` are thrown
// direct with the wire spelling at their own sites (status/stop
// misses; their details rows live in the RemoteErrorDetailsMap at
// runsRegistry.ts, not in this envelope table), and `bad_json` is
// the strict-wire gate's 400 payload (runsGates.ts; its door path
// has zero production consumers — its deletion call sits with the
// dead-exports census row, not here). A new code must still take
// the five seats above; the exemption is closed.
export const RUNS_ERROR_CODES = {
    bad_envelope: "runs/bad-envelope",
    draft_required: "runs/draft-required",
    draft_malformed: "runs/draft-malformed",
    draft_unknown: "runs/draft-unknown",
    invalid_request: "runs/invalid-request",
    preview_scope: "runs/preview-scope",
    flow_compile: "runs/flow-compile",
    workflow_pin: "runs/workflow-pin",
    card_compose: "runs/card-compose",
    card_compose_incomplete: "runs/card-compose-incomplete",
    lane_input_missing: "runs/lane-input-missing",
    lifecycle_inflight: "runs/lifecycle-inflight",
};
//# sourceMappingURL=runsErrorCodes.js.map
