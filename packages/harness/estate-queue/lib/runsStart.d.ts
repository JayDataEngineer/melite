import type { EngineJson } from "@melite/comfyui-cordis";
import type { FlowStageRow } from "./runsValidateShared.ts";
import type { QueueRefusal } from "./queue.ts";
export { envelopeRefusal, unknownDraftRefusal } from "./queueSubmit.ts";
import type { RunId } from "./queueCore.ts";
import type { RunRecord } from "./runsTypes.ts";
/** The door's refusal shape (status carries the HTTP class; the
 *  remote folds it into RemoteError details). */
export type StartRefusal = QueueRefusal;
export declare function compiledStageRow(st: CompiledStage): FlowStageRow;
/** THE DOC-LOCAL DERIVATION (audits F-S4/S5): validate derives a
 *  row's expected kinds from the card ports BEFORE the lattice runs;
 *  a durable doc carries no cards, so the replay judge derives from
 *  the doc's own declared upstream outputs — an absent expected
 *  takes the upstream kind, and a wire to an upstream output the doc
 *  never declares refuses here with the lattice's link voice
 *  (kindsOk's mismatch arm would fire first and name the wrong
 *  fact). Declared expected rows re-judge exactly as validate did.
 *  An edge to a stage OUTSIDE the doc (the bench lane's cross-wire —
 *  the worker injects those stages at compose) is not doc-derivable
 *  and drops out of the judged rows: the judge runs only where the
 *  kinds were derivable, never a false refusal on the legal wire.
 *  A doc with ANY filled-outputs row skips the judge wholesale: its
 *  real channels live in the card plane (validate + the compose own
 *  those verdicts), and the doc is not self-describing. */
export declare function replayJudgeRows(compiled: {
    stages: CompiledStage[];
}): FlowStageRow[];
export interface CompiledStage {
    readonly id: string;
    /** The DRAFT stage that declared this compiled stage (2026-10-22,
     *  the stuck-row cure's identity seam): the card arm composes the
     *  card SKELETON's id as `id` — the draft row is a different
     *  namespace (the client's own admission: run stage ids never
     *  equal draft stage ids) — so the settle mirror addresses the
     *  draft row by this, never by `id`. Absent when the compiler
     *  cannot know one (inline bodies with no bench doc). */
    readonly benchStageId?: string;
    /** The stage's engine id (stroke 53): the card plane's engine or 'mcp:<server>'
     *  — the door's engine gate admits exactly these; carried through
     *  to the run rows so the worker dispatches by it. */
    readonly engine: string;
    readonly params: Record<string, EngineJson>;
    readonly outputs: Record<string, EngineJson>;
    readonly expected: Record<string, EngineJson>;
    readonly outputNodes: Record<string, EngineJson>;
    readonly inputNames: Record<string, string>;
    /** The stage DECLARED its outputs map (false = the engine-table
     *  fill supplied {default: ...}). The replay judge judges only
     *  fully-declared docs — a filled row's real channels live in the
     *  card plane (validate + the compose own those verdicts). */
    readonly outputsDeclared: boolean;
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
 *  302). Returns the selected door key, or the refusal. The
 *  `draftBench` option admits the DRAFT DOOR: a body with no door
 *  key over a live bench draft (the tool's familyless bench walk
 *  presses {test, draft_id} alone — a model key would select the
 *  card arm and hit the board check), which the caller restages
 *  onto the wired-bench compose. */
export declare function selectSubmitDoor(body: Record<string, unknown>, opts?: {
    draftBench?: boolean;
}): {
    door: "flow" | "flow_inline" | "model" | "draft";
} | StartRefusal;
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
        /** The FILE-kind subset of initials' keys (photo | glb) — the
         *  claim-time re-probe's contract (the row stamps it beside
         *  initials so the pump knows which entries to re-judge on
         *  disk). Absent when no file initials ride. */
        initialFileKeys?: string[];
        /** The bench doc read at submit (stroke 45d) — the FULL workflow
         *  the run was born from (all stages + intent), stamped verbatim
         *  so the wand restores the whole flow, not just the ran card. */
        benchDoc?: Record<string, unknown>;
        /** The card arm's family (audit 2026-10-22): stamped on the run
         *  row so the pump's claim-time presence re-probe can re-run the
         *  lane gate — weights can leave between press and claim. */
        fam?: string;
        /** The flow arm's {stageId: fam} ledger for the same probe (the
         *  stage rows stay schema-clean). */
        stageFams?: Record<string, string>;
    };
}): Promise<{
    run: RunRecord;
    queuePosition: number;
} | StartRefusal>;
//# sourceMappingURL=runsStart.d.ts.map