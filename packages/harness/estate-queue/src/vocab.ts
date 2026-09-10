// vocab.ts — the submit-body vocabulary (Vocab SSOT, ledger row 27
// 2026-09-10): the retired-knob / carry-key / door-key sets lived
// ONCE in gateway-core params.ts; that package is dead, and the
// queue core is their owner now (REBUILD-5 re-home, 2026-09-10).

export const RETIRED_RUNNER_KNOBS: readonly string[] = [
  "start_from",
  "stop_after",
  "reuse_run_id",
  "partial_run",
  "overrides",
  "since",
  "from_index",
];

/** 2026-08-10 pipe-carry stowaways py _strict_body refuses (gateway.py:242). */
export const RETIRED_CARRY_KEYS: readonly string[] = ["pipe", "stage_id"];

/** The door vocabulary py _strict_body allows past the `_` gate (gateway.py:346). */
export const DOOR_KEYS: readonly string[] = ["yaml", "flow", "flow_inline", "model"];
