// vocab.ts — the submit-body vocabulary (Vocab SSOT, ledger row 27
// 2026-09-10): the retired-knob / carry-key / door-key sets lived
// ONCE in gateway-core params.ts; that package is dead, and the
// queue core is their owner now (REBUILD-5 re-home, 2026-09-10).
import { WIRE_STAGE_KEYS } from "@melite/contracts/benchStage";
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
/** The card-envelope keys: SELECT the graph, never ride it — the ONE
 *  list both the compose door filters with and (D-11, 2026-11-18)
 *  the graph receipt's scope gate consumes.
 *
 *  THE ROW COORDINATES ARE THE CONTRACT'S (the operator's live
 *  refusal, 2026-09-28: "compose-door: unknown param(s) on the
 *  image-gen card: card" — the whole-bench run composes each stage
 *  with `{ ...params, card }` (runsRegistry.ts:516), and `card` was
 *  in NO list here, so the row's own coordinate rode the card's knob
 *  bag and the admission gate refused the operator's Run ALL with a
 *  key the door had just added itself. The envelope carries the
 *  contract's WIRE_STAGE_KEYS — the ONE list of what a stage row IS
 *  — instead of a hand-picked few, so a coordinate can never ride a
 *  card again, and a new stage key is filtered by derivation rather
 *  than by remembering to add it here.
 *
 *  DOOR_KEYS (yaml/flow/flow_inline/model) and the run/bench
 *  coordinates (draft_id/test/service) ride named: they are door
 *  vocabulary, not row vocabulary.
 *
 *  THE RECEIPT'S SHARE (D-11, the board's own words: "params that
 *  were never graph nodes"): an envelope key is never a knob, so its
 *  absence from the composed graph is not evidence of anything — the
 *  receipt NEVER judges these keys (bench_stage_id, draft_id, model
 *  reading as "dropped nodes" was the false-red the board burned).
 *  The list lives HERE — the vocabulary's own home — so the
 *  receipt's light sidecar module reads the same ONE list; the
 *  registry re-exports it unchanged (one door, one list). */
export const CARD_ENVELOPE_KEYS = [
    ...DOOR_KEYS,
    // …every wire coordinate EXCEPT `params` — and the exception is the
    // load-bearing one. `params` is the row's knob CONTAINER: the run
    // body's `{model, params:{…}}` stanza is what liftCardParams
    // unwraps (the stanza law, benchStage's own), and filtering the
    // container BEFORE that unwrap would drop every knob a caller sent
    // — the first cut of this list did exactly that and turned every
    // run into "this lane requires 'prompt'". A coordinate selects the
    // graph; the knobs ride inside `params`, never as a key of it.
    ...WIRE_STAGE_KEYS.filter((k) => k !== "params"),
    "draft_id",
    "test",
    "service",
    // press_key is the submit door's retry-dedup coordinate
    // (queueSubmit names ONE press across retries) — door
    // vocabulary, never a card knob. It rode unregistered and the
    // live Run press refused "unknown param(s) … press_key" while the
    // whole suite stayed green (the contract-depth red, 2026-10-24):
    // no wall drove a press_key-carrying body.
    "press_key",
    // bench_stage_id is the SINGLE-CARD press's bench identity (the
    // F21 burn, 2026-10-30): the draft row the press came from. Door
    // vocabulary — the card never sees it as a knob, and the composed
    // stage stamps it (runsRegistry's card arm) so the run sidecar's
    // digest names the row the operator pressed, which is what the
    // bench read's `last_run` binds to. Unregistered, it would land in
    // every card's params as an unknown knob and refuse the press.
    "bench_stage_id",
    // seeds is the submit door's seed-sweep coordinate (friction #9,
    // 2026-10-28): the door fans one press out to one run per seed —
    // door vocabulary consumed before any card composes, never a card
    // knob. The per-run body carries the SEAT's `seed` (a real knob,
    // deliberately NOT on this list — liftCardParams must carry it
    // into the card's params); the sweep key itself rides the envelope.
    "seeds",
    // the bench row's own non-wire coordinates (benchStage's stage row
    // carries these beside the wire keys; they select, they never ride)
    "author",
    "rev",
    "stage",
    "title",
    "inputOutputs",
    "result",
    "runStatus",
    "expect_rev",
    "provenance",
    "capability",
];
//# sourceMappingURL=vocab.js.map
