/** One initial edge: {"initial": key} (the operator-supplied wire). */
export interface RegistryInitialEdge {
    readonly initial: string;
}
/** One stage edge: {"stage": id, "output": name} (an earlier stage). */
export interface RegistryStageEdge {
    readonly stage: string;
    readonly output: string;
}
export type RegistryEdge = RegistryInitialEdge | RegistryStageEdge;
/** A from_flow row (Stage.from_flow — the live reference): the
 *  stage is COPIED from the named flow's stage at expansion time
 *  (id overridden, inputs overridden), so the source stays the
 *  single truth — never a snapshot. */
export interface RegistryFromFlow {
    readonly flow: string;
    readonly stage: string;
}
/** One authoring-stage row (the Stage(...) fields, JSON-shaped).
 * A stage is composed by exactly one of three planes: a card
 * (card ≠ "" — the card plane's dispatch), a family action
 * (family + action ≠ "" — the family's DECL composes the nodes at
 * expansion; flowsFamilyCompose owns that interpreter), or an
 * engine verb (engine ≠ the card-plane engine — craft/agent
 * stages the runs door drives directly). A card-plane-engine
 * stage naming neither card nor family action is the retired
 * raw-workflow shape: expandRegistryFlow refuses it, named. */
export interface RegistryStage {
    readonly id: string;
    readonly engine: string;
    readonly card: string;
    readonly family: string;
    readonly action: string;
    readonly description: string;
    readonly inputs: Record<string, RegistryEdge>;
    readonly expected: Record<string, string>;
    readonly outputs: Record<string, string>;
    readonly cardIo: Record<string, string>;
    readonly params: Record<string, unknown>;
    readonly skipWhen: {
        readonly initial: string;
        readonly when: string;
    } | null;
    readonly fromFlow: RegistryFromFlow | null;
}
/** The compile-time initial kinds (flow.initial_validators). The
 * file kinds (photo/video/glb) ride checkFileInitial; text is a BARE
 * NAME (no path law violations); bake_params is the preset dialect;
 * the three F58 kinds (2026-11-02, the craft-loop binding): brief is
 * PROSE (a value no file door ever reads — no path law applies),
 * number is a finite JSON number (digit-strings refuse — the caller
 * sent JSON, a string where a number belongs is a caller bug, never
 * a fold), json is an object or its JSON-string spelling (the
 * consuming engine's own gate owns the inner shape — the initial
 * door judges parseability only). */
export type RegistryInitialKind = "photo" | "video" | "glb" | "bake_params" | "text" | "brief" | "number" | "json";
/** The extracted initial value (F58): strings for the name/file
 * kinds, NUMBERS for number, OBJECTS for json — the run row's
 * initials record is EngineJson-shaped, so the typed values ride to
 * the engine merge unchanged. */
export type ExtractedInitial = string | number | Record<string, unknown>;
/** One flow-tool overlay (FlowToolOverlay: the run door's param ->
 *  the stage doc path it stamps, with the value choices map). */
export interface RegistryToolOverlay {
    readonly param: string;
    readonly stage: string;
    readonly path: readonly string[];
    readonly choices: Record<string, string> | null;
}
/** One flow-tool property (FlowToolProperty). */
export interface RegistryToolProperty {
    readonly ptype: string;
    readonly description: string;
    readonly default: unknown;
    readonly hasDefault: boolean;
    readonly minimum: number | null;
    readonly maximum: number | null;
    readonly enum: readonly string[] | null;
}
/** The flow-tool surface (FlowTool: name + version + schema +
 *  required + overlays) — the run door's face for a registry flow.
 *  Absent (null) on flows with no tool=. */
export interface RegistryTool {
    readonly name: string;
    readonly version: number;
    readonly description: string;
    readonly properties: Record<string, RegistryToolProperty>;
    readonly required: readonly string[];
    readonly overlays: readonly RegistryToolOverlay[];
}
/** One named flow (the Flow(...) declaration, JSON-shaped). */
export interface RegistryFlow {
    readonly id: string;
    readonly description: string;
    readonly stages: readonly RegistryStage[];
    readonly initialValidators: Record<string, RegistryInitialKind>;
    /** Initial names this flow cannot run without. An OPTIONAL initial
     *  rides absent (the $channel/branch arms own it); a REQUIRED one
     *  refuses at the door, before a run registers, so a verb whose
     *  graph needs the value (the fit verb's bone — the vendor's row
     *  gate refuses an empty one) never reaches the engine to fail
     *  there. */
    readonly requiredInitials?: readonly string[];
    readonly tool: RegistryTool | null;
    readonly skillRefs: readonly string[];
}
/** A flow's initial KEYS as disclosure serves them (F57, operator
 *  2026-11-13: "single-stage flow initial keys are UNDOCUMENTED —
 *  natural keys fail with internal errors … the error text is the
 *  only teacher"). Derived from the row itself — requiredInitials
 *  first (the door's own refusal order), then any remaining
 *  validator keys — so the discovery/open faces can name the TRUE
 *  seats (the spell stems: $photo→photo, $params_json→params_json)
 *  before a natural-key press meets the seam. One truth, never a
 *  hand-maintained roster.
 * @param flow the registry row
 * @returns the initial keys, required first, registry order within */
export declare function flowInitialKeys(flow: RegistryFlow): readonly string[];
/** One initial kind's disclosure gloss — the anny-params typed-array
 * seat (F57's owed half, operator FAILURES.md triage 2026-11-02:
 * "the 139-float JSON-in-string transport stays fragile; this cure
 * documents the keys but does not build the seat"). The KEYS were
 * named; the SHAPE stayed untaught, so an agent re-instantiating an
 * estimated bake hand-typed a 139-float JSON string. The door has
 * blessed the OBJECT spelling since the belt first served (arrays
 * ride arrays on the wire; the string survives only as the
 * engine-merge ride onto AnnyParamsToGlb's own string input) — the
 * gloss names that transport and the dialect doc's own law, so the
 * open face teaches the shape BEFORE a press meets the seam, the
 * same leaf-naming law one level deeper. One derivation per kind,
 * rendered by every initial-seat face, never a hand-maintained
 * copy.
 * @param kind the declared validator kind
 * @returns the gloss the open line renders beside the kind */
export declare function initialKindGloss(kind: RegistryInitialKind): string;
/** A flow's initial keys → glosses, the same derivation order the
 * validators hold (the bundle's initials record rides both so the
 * open face renders kinds and shapes from one truth).
 * @param flow the registry row
 * @returns the gloss per declared initial key */
export declare function flowInitialGlosses(flow: RegistryFlow): Record<string, string>;
export declare function initial(key: string): RegistryInitialEdge;
export declare function fromStage(stage: string, output: string): RegistryStageEdge;
export declare function plainStage(row: {
    readonly id: string;
    readonly engine: string;
    readonly card?: string;
    readonly family?: string;
    readonly action?: string;
    readonly description: string;
    readonly inputs: Record<string, RegistryEdge>;
    readonly expected?: Record<string, string>;
    readonly outputs?: Record<string, string>;
    readonly cardIo?: Record<string, string>;
    readonly params: Record<string, unknown>;
    readonly skipWhen?: {
        readonly initial: string;
        readonly when: string;
    } | null;
}): RegistryStage;
export declare function linkedStage(flow: string, stage: string, id: string, inputs: Record<string, RegistryEdge>): RegistryStage;
import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
/** The read face pure registry code needs — the seat injected into
 *  the pure plane (link resolution + the known-flows voice). */
export interface FlowsSeat {
    /** The raw (unexpanded) declaration, or undefined for unknown names. */
    get(name: string): RegistryFlow | undefined;
    /** All registered flow names, sorted (the flow.scan_flow_ids order
     *  — the live seat, so a hot registration is visible at once). */
    names(): string[];
}
/** A pure read-only seat over the boot seed (REGISTRY verbatim, no
 *  registration surface): the door for callers with no host fiber —
 *  pure rigs and the walls. Service-owning callers read the live
 *  seat instead (ctx.get("meliteFlows")).
 * @returns the seeded FlowsSeat. */
export declare function seedFlowsSeat(): FlowsSeat;
/** The live flow registry seat (J4 cure: the table is instance
 *  state, never a module global). */
export declare class FlowsSeatService extends Service implements FlowsSeat {
    static readonly inject: readonly string[];
    private flows;
    constructor(ctx: Context);
    /** The raw (unexpanded) declaration, or undefined for unknown
     *  names. */
    get(name: string): RegistryFlow | undefined;
    /** All registered flow names, sorted. */
    names(): string[];
    /** Register one flow into the live seat. LOUD: a duplicate id
     *  refuses (one owner per flow id — the same interlock as cards
     *  and model families); the stage and validator interlocks ride
     *  verbatim. Returns the disposer; call it (or dispose the
     *  ctx.effect that owns it) and the flow is gone from every
     *  read.
     * @param flow - the declaration to seat.
     * @returns the disposer removing exactly this row. */
    register(flow: RegistryFlow): () => void;
}
/** Resolve every fromFlow row against its source flow (Stage.from_flow
 *  verbatim: the source row's engine/card/description/expected/
 *  outputs/card_io/params ride; the link's id + inputs win). Throws
 *  LOUD on a dangling link (authoring bug — never a silent row). */
/** THE RAW-WORKFLOW REFUSAL (the strictness audit's fix 8,
 *  corrected against the dispatch truth): a stage is composed by
 *  exactly one of three planes — the card plane (card), the family
 *  plane (family AND action), or an engine verb (any engine but the
 *  card-plane one — craft/agent stages ride the runs door
 *  directly). A card-plane-engine stage naming no card and no
 *  family action is the retired raw-workflow authoring shape: it
 *  used to ride params-only to the engine and die there ("carries
 *  no inline workflow"). ONE gate, two fires: register() dry-runs
 *  it (audit J-S1 — a mis-shaped row refuses at registration, not
 *  sixty seconds later at first compile) and expansion re-judges
 *  (drop-in rows enter through register too; the expansion arm
 *  keeps the compile-time verdict for rows seeded before this
 *  gate). */
export declare function refuseRawWorkflowShape(flowId: string, st: RegistryStage): void;
export declare function expandRegistryFlow(flow: RegistryFlow, seat: FlowsSeat): RegistryFlow;
/** Does a projected inline doc carry at least one CARD-bearing stage?
 *  (the 2026-10-04 admission for the card-flow cure: such a doc is
 *  the one shape the inline compiler refuses, so the start door
 *  composes its card stages through the card plane first). */
export declare function inlineStagesNameCards(doc: Record<string, unknown>): boolean;
/** The registry flow as a flow_from_body-shaped inline doc (the
 *  validate compile + start shim both ride the EXISTING inline
 *  pipelines — no second validator). Card rows ride card/card_io;
 *  skip_when rides verbatim. */
export declare function registryFlowToInline(flow: RegistryFlow): Record<string, unknown>;
export interface InitialsRoots {
    readonly repoRoot: string;
    readonly stateRoot: string;
}
/** The on-disk candidate paths one gate-blessed file initial may
 *  live at — the press gate's SAME trees, extracted so the
 *  claim-time re-probe (runsRegistry pump) judges by the identical
 *  set instead of re-spelling it. Contract: `raw` already passed
 *  checkFileInitial's shape gates (data:/blob:, extension vocab,
 *  traversal, malformed run-prefix URL) — this builds candidates
 *  only; a raw outside those gates gets a list that misses, which
 *  is the honest answer for a value the gate would have refused.
 *  @param raw the trimmed path reference ({path: …} unwrapped)
 *  @param roots the same roots manifest the press gate rode
 *  @returns the candidate paths, in the press gate's order */
export declare function initialFileCandidates(raw: string, roots: InitialsRoots): string[];
/** The compile-time gate over a registry flow's initial_validators:
 *  the first refusal text, or null when every PRESENT initial
 *  passes (absent initials ride — the $channel/branch arms own
 *  them). Runs BEFORE any run registers, on both doors. */
export declare function registryInitialsError(flow: RegistryFlow, body: Record<string, unknown>, roots: InitialsRoots): string | null;
/** The initial VALUE one gate-blessed body entry carries, in the
 *  form the engine merge links a $spell against: file
 *  initials give their path ({path: …} unwraps — the two spellings
 *  the gate blesses), bake_params gives its params_json string
 *  (objects stringify — the dialect the belt validates). Null
 *  refuses a shape the gate would have refused, so a mangled
 *  durable body fails loud at the door instead of shipping an
 *  "[object Object]" literal to the engine.
 *  THE F58 TYPED RIDE (2026-11-02): brief gives its string verbatim,
 *  number gives the NUMBER itself, json gives the OBJECT — the run
 *  row's initials record is EngineJson-shaped and the merge returns
 *  these values verbatim, so a numeric initial (craft's
 *  max_iterations) reaches the engine gate still a number, never a
 *  stringified stranger.
 *  @param key the initial's declared name, for the refusal voice
 *  @param kind the declared validator kind
 *  @param value the raw body entry
 *  @returns the normalized value, or null when the shape is neither */
export declare function normalizedInitialValue(key: string, kind: RegistryInitialKind, value: unknown): ExtractedInitial | null;
/** The request initials a body carries for a flow's declared
 *  validators, normalized per {@link normalizedInitialValue}:
 *  declared keys, present values only; absent stays absent (the
 *  $channel/branch arms own those). First refusal text, or null
 *  when every present value normalizes. Both start doors (the
 *  flow arm and the flow_inline replay arm, which recovers the
 *  declaration from the inline doc's registry id) call this —
 *  the replayed durable body re-extracts the same values the
 *  original start extracted, so a queued run that reboots mid-
 *  queue keeps its $spells linkable at the engine merge.
 *  @param flow the declaration whose initialValidators own the keys
 *  @param body the request body
 *  @returns the normalized initials record, or a refusal string */
export declare function extractRequestInitials(flow: RegistryFlow, body: Record<string, unknown>): {
    initials: Record<string, ExtractedInitial>;
} | {
    refusal: string;
};
/** Render one registry flow as its skill-body text. */
export declare function registrySkillBody(flow: RegistryFlow, seat: FlowsSeat): string;
//# sourceMappingURL=flowsData.d.ts.map
