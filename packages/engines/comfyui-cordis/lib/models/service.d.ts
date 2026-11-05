import { Context, Service } from "@deepseek-ai/cordis";
import type { Plugin } from "@deepseek-ai/cordis";
import { type CatalogArtifactRow, type CatalogModel } from "../catalog.ts";
import { ModelRow, type CellRow, type ModelDecl, type DeclVariantRow } from '@melite/comfyui-card-kit/model-contract';
export declare const MODELS_SERVICE = "models";
export declare class ModelsService extends Service {
    private readonly table;
    /** The derived route index: flat id → owning model + variant (the
     *  hierarchy's derived realization — built at registration,
     *  read at serving; dispose retracts). */
    private readonly routes;
    /** registry rows by repo root (the artifact-reader half merged
     *  from catalog.ts 2026-09-08 — root-independent values,
     *  fiber-owned; fixture roots under MELITE_REPO_ROOT resolve at
     *  request time, never at boot). */
    private rows;
    constructor(ctx: Context);
    /** Register one family. LOUD: duplicate ids refuse (the
     *  scan's one-owner-per-id law), invalid rows refuse at the gate
     *  (the metaclass's import-time validation, at registration).
     *  REVERTIBLE (the discharge stroke): returns the disposer —
     *  ctx.effect-wrapped at the plugin seam, the fiber owns the
     *  row's lifetime; dispose and the family is gone from the
     *  table (a dynamic re-port can retire a family mid-flight). */
    registerFamily(decl: ModelDecl): () => void;
    /** Every registered declaration, id-sorted (the table read that
     *  replaced registry.generated iteration). */
    allDecls(): ModelDecl[];
    /** The table size (census + the transaction wall). */
    familyCount(): number;
    /** The SERVED enumeration (derived realization, paper §3.3):
     *  model ids ∪ their variant/cell routes — the flat ids every
     *  downstream address (catalog, doors, facts, flows, specs)
     *  already knows. One component, many addressed cells. */
    modelIds(): string[];
    /** The MODEL registry ids (the declaration count — one per class
     *  class; the hierarchy's registry plane, vs the served view). */
    registryIds(): string[];
    /** The RAW model declaration (the atom as authored — no variant
     *  deltas composed). Registry-plane readers use this. */
    registryModel(id: string): ModelDecl;
    /** The OWNING ATOM of an address (the fold read, operator
     *  2026-09-23 — qvoice across ALL qwen3-tts): a route composes
     *  through its owner, an atom owns itself. Mods board at the
     *  ATOM (the interlock: families name atoms), so every envelope
     *  plane folds an address through this read — a variant route
     *  (qwen3-tts-base) carries its family's packs exactly like the
     *  head. Unknown ids return the name as given (the callers' own
     *  filters refuse). */
    owningAtom(id: string): string;
    /** The declaration for an address — EVERY served id composes
     *  through the cascade (the model id itself carries a route
     *  row: its resolving variant + cell; paper §3.2.3: base ←
     *  variant ← cell, the monoid merge — label/description
     *  resolved cell→variant→model, defaults and lane_inputs
     *  unioned through the intercepts). Derived, never stored:
     *  recovery discards it wholesale. The raw atom is
     *  registryModel. */
    getModel(id: string): ModelDecl;
    /** The variant coordinate (first declared = the family default,
     *  the matrix law) — THE ONE RESOLVER's declared face (D6
     *  2026-10-17): the coordinate walk is shared with the estate door
     *  and the client mirror; this seat keeps only its ModelError
     *  prose. Null is the unstated mark (first declared); any stated
     *  id — the empty string included — must match or refuse loud. */
    variantOf(decl: ModelDecl, variant: string | null): DeclVariantRow;
    /** The quant coordinate (first declared = the variant default) —
     *  the resolver's declared face over the DECL's own cells, the
     *  stated match by quant VALUE. */
    cellOf(variantRow: DeclVariantRow, quant: string | null): CellRow | null;
    /** THE CASCADE on the inherency primitive: family = base, the
     *  resolving variant = the INTERCEPT (its resolver_defaults dict
     *  is the intercept entry — cordis merges root-closer-first, so
     *  the variant's keys win over the family's), the resolving cell
     *  = head. Service[symbols.resolveConfig] (cordis service.ts:86)
     *  merges base → intercepts → head per-KEY — no hand-rolled
     *  Object.assign chain, no whole-dict replacement. */
    mergedDefaults(id: string, variant?: string | null, quant?: string | null): Record<string, unknown>;
    /** base → intercept → head through the framework's own chain
     *  (the wall pins the precedence, isolation, and the shipped
     *  symbol identity). */
    cascade(base: Record<string, unknown>, intercept: Record<string, unknown> | null, head: Record<string, unknown> | null): Record<string, unknown>;
    /** Matrix coordinates → { route, engine, cell } (the R1
     *  contract). The ENGINE_TRUTH triple ("mode", "variant",
     *  "model") is validate.ts's export — the compose's own
     *  declaration; the cascade never touches it. (The comment
     *  drifted from the SSOT it described until the schema audit
     *  named it: two words where the export carries three.) */
    resolve(id: string, variant?: string | null, quant?: string | null): {
        route: string;
        engine: string;
        cell: CellRow | null;
        variant: DeclVariantRow;
    };
    /** The served catalog rows (OFFERING LAW + LAW 0 engine gate —
     *  one place: catalogEmission's buildCatalog over the SAME
     *  registration set). */
    servedModels(): Record<string, ModelRow>;
    /** Test seam: drop catalog state (walls boot fresh processes). */
    resetForTests(): void;
    /** The catalog rows for one repo root (the compiled-in registry —
     *  never a silent empty catalog; malformed rows died at the
     *  registration gate above, the only place a refusal belongs). */
    catalogModels(repoRoot?: string): CatalogModel[];
    /** The downloadable rows for (model, variant, quant) — the
     *  manage door's rail. Throws CatalogMiss with the legacy texts
     *  (the door maps them to 404). */
    resolveCatalogArtifact(mid: string, variant?: string, quant?: string, repoRoot?: string): CatalogArtifactRow[];
    /** The on-disk hit for (relativePath, name), else null (mount
     *  bindings are deploy truth, loaded live per call). */
    checkModelPresent(relativePath: string, name: string, repoRoot?: string): string | null;
    checkModelPathPresent(modelPath: string, repoRoot?: string): string | null;
}
/** The provider plugin (fiber-owned): owns the ModelsService
 *  lifetime. No prime step (rows load lazily per repo root).
 *  Mounts the catalog SERVICE alone — zero family plugins, zero
 *  registered families. Lanes that serve family flows mount
 *  modelsFamiliesProvider instead (the estate does); this bare
 *  form suits seats that only read the registry tables.
 *  Loadable entry:
 *  packages/engines/comfyui-cordis/src/entries/catalog-registry.ts. */
export declare const modelsProvider: Plugin;
/** The LANES' provider: the catalog service plus every family
 *  plugin applied into the SAME context — the bootModels recipe
 *  in-process, so a lane serving the runs doors reads its seat
 *  populated: ctx.get("models").allDecls() IS the booted table
 *  (stroke 4's compose-at-expansion reads that seat; a bare
 *  modelsProvider mount registers zero families and every family
 *  stage refuses "registered: none"). Transactional like the
 *  singleton boot: any family refusing or the contracts
 *  cross-validation refusing fails the provider mount — a lane
 *  never half-serves a table. */
export declare const modelsFamiliesProvider: Plugin;
/** Resolve the service for request-path helpers that take it as an
 *  optional trailing param: an explicit arg wins. Null = the caller
 *  forgot to thread ctx.models — a bug, so reads throw LOUD. */
export declare function needModels(models: ModelsService | null | undefined, where: string): ModelsService;
/** Arm the composed seat: the census gate (census.ts) calls this
 * once a Loader composition's family fibers settled, censused, and
 * passed the boot contracts. Context-less readers
 * (`theService`/`bootModels`) serve this table from the call on,
 * and every settle waiter (whenModelsArmed) resolves.
 *
 * @param svc — the composition's models service.
 * @param from — the arming copy's url (drift observability). */
export declare function armModelsSeat(svc: ModelsService, from: string): void;
/** Fail the composition settle — the census gate calls this when a
 * composition refuses (a family fiber failed, the census count
 * mismatched, the boot contracts threw). Waiters reject with the
 * refusal: an estate awaiting the settle fails its own fiber
 * before any door mounts (the all-or-nothing law).
 *
 * @param reason — the census refusal. */
export declare function failModelsSeat(reason: unknown): void;
/** The composition settle: resolves once a Loader composition armed
 * the seat, rejects if that composition's census refused. The
 * caller-side answer to cordis's deferred inject-fiber activation —
 * awaiting the gate's fiber can resolve before its apply begins, so
 * the settle is the composition's own contract, never a race.
 *
 * @returns a promise for the armed state. */
export declare function whenModelsArmed(): Promise<void>;
/** Disarm a composed seat — only the arming holder succeeds (a
 * stale gate's disposer must not unseat a newer arm).
 *
 * @param svc — the service the disposer armed; a mismatch is a no-op.
 */
export declare function disarmModelsSeat(svc: ModelsService): void;
/** Subscribe to models-seat changes (arm + disarm). Readers that
 * derive caches from the table (the registry's prime, the doors'
 * pack hints) re-derive on every fire.
 *
 * @param listener — called on each seat change.
 * @returns an unsubscribe function. */
export declare function onModelsSeat(listener: () => void): () => void;
/** The facade's cascade memo, stored on the process-global boot
 * cell so every copy of this package shares one cascadeInit truth
 * (models.ts rides these; its own module scope is per-copy). */
export declare function cascadeMemo(): Promise<void> | null;
/** @param promise the memoized cascade boot promise, or null to
 * clear it (the retry law: a rejected boot clears the memo). */
export declare function setCascadeMemo(promise: Promise<void> | null): void;
/** Test seam: drop the process-global boot cell entirely.
 * Production code never calls this — the cell is one-per-process
 * by design. Specs that pin a cold first caller (a refused boot's
 * retry, the pre-boot refusal) reset it because vitest resets the
 * per-file module registry but not globalThis, and the cell is
 * the storage the registry reset no longer clears. */
export declare function resetModelsBootForTests(): void;
/** THE MOD INTERLOCK (the correction stroke 2026-09-08): the
 *  flavor↔DECL.mods satisfaction gate — the paper's §3.2.2 law, a
 *  component ACTIVATES ONLY AT A SATISFYING STATE. Pure over the
 *  registration sets (extracted 2026-09-12 for unit teeth — the
 *  boot feeds it the live sets below). Both directions refuse:
 *    (a) DECL.mods entry naming neither a registered pack nor a
 *        registered verb = a DEAD BOARDING (drift, the amnesty is
 *        over);
 *    (b) a flavor/verb registration whose family does not board
 *        that pack = an UNDECLARED MUTATION (the flavor claims a
 *        model that never declared it).
 *  Plus the satisfaction law's third edge (a declared pack
 *  boarding with no flavor for THIS family) and fourth edge (gate
 *  (d), the pack fate — verbs skip: their fate is the
 *  family-scoped mount). */
export declare function assertModInterlock(decls: readonly ModelDecl[], packs: ReadonlySet<string>, verbs: ReadonlySet<string>, flavorsOf: readonly {
    pack: string;
    families: readonly string[];
}[], verbRegs: readonly {
    id: string;
    families: readonly string[];
}[], packFate: Record<string, string> | null): void;
/** §3.2.2 SATISFACTION (pure half): every registered atom serves
 *  an address. The only trigger is a routeless row (variants: []
 *  claims nothing) — the live registry never carries one, so the
 *  boot's call above only ever passes silent; the refusal arm is
 *  unit-pinned here, never wall-reachable. */
export declare function assertAddressesServe(modelIds: readonly string[], registryIds: readonly string[]): void;
/** THE FACTS-CALLER CHECK (the compose contract: facts.models[id]
 *  .card must be one of the model's caller cards — the card
 *  selects atoms; the facts may not name a caller the cards do
 *  not). Pure over the boot's assembled maps (extracted
 *  2026-09-12 for unit teeth). */
export declare function assertFactsCallers(decls: readonly ModelDecl[], factsModels: Record<string, {
    card?: string;
}>, boardings: ReadonlyMap<string, readonly string[]>): void;
export declare function validateBootContracts(svc: ModelsService): Promise<void>;
export declare function bootModels(): Promise<ModelsService>;
/** The booted service (throws if neither a composition armed the
 * seat nor bootModels settled). The composed seat wins over a
 * private boot. */
export declare function modelsService(): ModelsService;
/** The boot-state probe (the form-spec census-arm split, 2026-10-13):
 * true once bootModels has settled in this process. Callers that
 * CATCH a getModel throw ask this before swallowing it — an
 * unbooted table's throw is the TABLE's own refusal and must ride,
 * never flatten into a not-found answer.
 *
 * @returns whether the models table is booted. */
export declare function modelsBooted(): boolean;
/** The cascade through the booted service (the wall's entry). */
export declare function resolveCascade(base: Record<string, unknown>, intercept: Record<string, unknown> | null, head: Record<string, unknown> | null): Record<string, unknown>;
//# sourceMappingURL=service.d.ts.map