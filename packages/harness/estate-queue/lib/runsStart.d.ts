import type { EngineJson } from "@melite/comfyui-cordis";
import type { QueueRefusal } from "./queue.js";
import type { RunId } from "./queueCore.js";
import type { RunRecord } from "./runsTypes.js";
/** The door's refusal shape (status carries the HTTP class; the
 *  remote folds it into RemoteError details). */
export type StartRefusal = QueueRefusal;
/** One compiled stage (the rim the worker splices). */
export interface CompiledStage {
    readonly id: string;
    /** The stage's engine id (stroke 53): the card plane's engine or 'mcp:<server>'
     *  — the door's engine gate admits exactly these; carried through
     *  to the run rows so the worker dispatches by it. */
    readonly engine: string;
    readonly params: Record<string, EngineJson>;
    readonly outputs: Record<string, EngineJson>;
    readonly expected: Record<string, EngineJson>;
    readonly outputNodes: Record<string, EngineJson>;
    readonly inputNames: Record<string, string>;
}
/** flow_inline structural compile — door-verbatim (structure via
 *  the admission verdicts, voice here; the engine policy +
 *  default-fills below are value-domain, not type structure).
 *
 *  THE ENGINE GATE (stroke 53, the engine-generics seam): the
 *  engine id must be GRAMMATICAL (the card plane's engine or 'mcp:<server>',
 *  engine-contract's engineIdOk) AND known to the caller. The
 *  caller passes the live registry ids (the 'engines' seat when
 *  mounted); the default (CARD_PLANE_ENGINE) keeps every seat-less boot
 *  (fixtures, walls) on the pre-seam voice. */
export declare function compileFlowInline(inline: unknown, knownEngines?: readonly string[]): {
    stages: CompiledStage[];
} | StartRefusal;
/** The door-selection gate: exactly one of flow / flow_inline /
 *  model, in DOOR order for the ambiguity text (resolve_request
 *  302). Returns the selected door key, or the refusal. */
export declare function selectSubmitDoor(body: Record<string, unknown>): {
    door: "flow" | "flow_inline" | "model";
} | StartRefusal;
/** The envelope refusal texts (door-verbatim, for the remote's
 *  envelope walk). Kept as a table — one voice each, like the
 *  admission gate's static tables. */
export declare function envelopeRefusal(kind: "not-object" | "bad-test" | "missing-draft" | "malformed-draft", doc: unknown, detail?: {
    testFlag?: unknown;
    draftId?: string;
}): StartRefusal;
/** The unknown-draft refusal (door-verbatim; the probe rides the
 *  caller's drafts domain — the remote hops the ctx seat). */
export declare function unknownDraftRefusal(draftId: string): StartRefusal;
/** The registration tail (door-verbatim): mint the id, route the
 *  out root on the test flag, build the rich run row. The caller
 *  (the remote) enqueues it on the queue core + kicks the pump.
 *  Returns the row and its queue position. */
export declare function registerCompiledRun(args: {
    compiled: {
        stages: CompiledStage[];
    };
    testFlag: boolean;
    draftId: string;
    stateRoot: string;
    enqueue: (row: {
        runId: RunId;
        status: string;
        error: string;
        createdAt: number;
        draftId: string;
        testFlag: boolean;
        stopFlag: boolean;
    }) => number;
    /** F-6(b) admission warnings (computed pre-registration by the
     *  start door — the film lane's VRAM-pressure warn): stamped on
     *  the record and the queued sidecar. Absent means none. */
    warnings?: string[];
    /** The {model:} card door carries its own run identity (minted
     *  BEFORE phase-2 compose — a refusal names its field, never a
     *  zombie slot) + the pipeline/cardId/request body for the
     *  registration writes. */
    /** THE DOOR IS REQUIRED, AND ITS RUN ID WITH IT (the operator's
     *  live refusal, 2026-09-28: "run sources resolve nowhere (1 dead:
     *  run-65dc3ee505ef-…/gen)").
     *
     *  This used to be `door?:` with `door?.runId ?? newRunId()`
     *  below — a SECOND PRODUCER of the run id, living in the start
     *  chain. Every composed graph carries its own `${runId}/gen`
     *  output prefix, so the id is not a label on a run, it is an
     *  INPUT to every stage's composition: two producers means the
     *  graph and the run can name different runs, and the forward
     *  references become dead sources.
     *
     *  THE CONTRACT NOW FORBIDS THE SECOND PRODUCER: `door` and its
     *  `runId` are required, and there is no fallback mint anywhere in
     *  this function. A caller that forgets the id does not get a
     *  second one — it does not COMPILE. That is the difference
     *  between a wall (which can be forgotten, and was) and a type
     *  (which cannot be forgotten at all). */
    door: {
        runId: RunId;
        pipeline: string;
        /** The card arm's identity (card snapshot law). The inline
         *  REPLAY arm (stroke 83 boot resurrect) reuses a run id with
         *  NO card identity — cardId undefined means no snapshot is
         *  stamped and pipeline still rides the door. */
        cardId?: string;
        requestBody: Record<string, unknown>;
        /** The flow arms' request initials (the start body's values for
         *  the flow's declared initial validators, extracted after the
         *  compile-time gate passed): threaded to the engine merge so
         *  `$spell` params resolve. Absent when the flow declares no
         *  initials, on the card arm, and on a hand-authored or
         *  bench-composed inline doc. */
        initials?: Record<string, EngineJson>;
        /** The bench doc read at submit (stroke 45d) — the FULL workflow
         *  the run was born from (all stages + intent), stamped verbatim
         *  so the wand restores the whole flow, not just the ran card. */
        benchDoc?: Record<string, unknown>;
    };
}): Promise<{
    run: RunRecord;
    queuePosition: number;
} | StartRefusal>;
//# sourceMappingURL=runsStart.d.ts.map
