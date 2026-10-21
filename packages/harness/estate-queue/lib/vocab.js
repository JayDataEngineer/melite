// vocab.ts — the submit-body vocabulary (Vocab SSOT, ledger row 27
// 2026-09-10): the retired-knob / carry-key / door-key sets lived
// ONCE in gateway-core params.ts; that package is dead, and the
// queue core is their owner now (REBUILD-5 re-home, 2026-09-10).
export const RETIRED_RUNNER_KNOBS = [
    "start_from",
    "stop_after",
    "reuse_run_id",
    "partial_run",
    "overrides",
    "since",
    "from_index",
];
/** 2026-08-10 pipe-carry stowaways _strict_body refuses. */
export const RETIRED_CARRY_KEYS = ["pipe", "stage_id"];
/** The door vocabulary _strict_body allows past the `_` gate. */
export const DOOR_KEYS = ["yaml", "flow", "flow_inline", "model"];
//# sourceMappingURL=vocab.js.map
