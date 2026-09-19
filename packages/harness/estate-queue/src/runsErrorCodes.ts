// runsErrorCodes.ts — the refusal-code -> HTTP answer-code table
// (the one mapping; an unnamed code is a LOUD bug, never generic).
export const RUNS_ERROR_CODES: Readonly<
  Record<string, "runs/bad-envelope" | "runs/draft-required" | "runs/draft-malformed" | "runs/draft-unknown" | "runs/invalid-request" | "runs/preview-scope" | "runs/flow-compile" | "runs/workflow-pin" | "runs/card-compose" | "runs/lane-input-missing">
> = {
  bad_envelope: "runs/bad-envelope",
  draft_required: "runs/draft-required",
  draft_malformed: "runs/draft-malformed",
  draft_unknown: "runs/draft-unknown",
  invalid_request: "runs/invalid-request",
  preview_scope: "runs/preview-scope",
  flow_compile: "runs/flow-compile",
  workflow_pin: "runs/workflow-pin",
  card_compose: "runs/card-compose",
  lane_input_missing: "runs/lane-input-missing",
};
