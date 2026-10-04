// benchStage.ts — THE BENCH STAGE CONTRACT (operator, 2026-10-10,
// in the operator's own words: "The bench media flow is always the
// same, no matter if the AI agent OR the human edits it. There is no
// distinction in the bench." and "THERE IS NO FILTER, NO BREAKAGE
// FROM THIS. EVER.").
//
// WHY THIS MODULE EXISTS. Four writers used to default a bench stage
// row — the bench normalizer, the add-card door, the gallery's
// restore, and the run door — and each invented its own values. A
// stage the GUI wrote, a stage the agent wrote, a stage the restore
// wrote and a stage a hand-written body carried therefore reached the
// compiler as DIFFERENT documents, and the differences surfaced as
// operator-facing breakage:
//
//   engine        — "stage \"s_0\": no engine named" at the run door,
//                   for a perfectly ordinary card stage the GUI wrote.
//   run media     — "/v1/assets/runs/…" died with the gateway app;
//                   stored benches kept naming it, so a reloaded
//                   historical flow pointed every image and audio
//                   input at a route that answered nothing.
//   run memory    — result/runStatus/history/resultParams leaked
//                   across benches on a restore.
//   self-naming   — params.model naming the row's own card (the era's
//                   family-less compose voice) refused admission.
//
// THE LAW: a stage row has ONE shape, one normalization, one spelling
// per concept, and every writer — the bench doors, the client, the
// gallery restore, the run door — goes through THIS module. A field
// that can be DERIVED is derived here and never authored by a
// writer; a field that is RUN MEMORY is stripped here and never
// persisted; a path that names run media is rewritten here and never
// written dead.
//
// This module is the shared FLOOR (contracts): the browser client,
// the estate server, and the run door all import it, so there is one
// answer to "what is a bench stage" on both sides of the wire.

/** The card plane's engine (the estate composes cards on ComfyUI by
 *  construction — the card arm's own law). Derived, never authored:
 *  a stage that names a CARD and no engine is a card stage. A stage
 *  that names no card and no engine is an mcp/flow stage and must say
 *  where it runs — never guessed. */
export const CARD_PLANE_ENGINE = "comfyui";

/** The LIVE run-media spelling. */
export const RUN_MEDIA_PREFIX = "/melite-media/runs";

/** The spelling that died with the gateway app. Still SERVED forever
 *  (the media route mounts both names) and healed on every write
 *  here — nothing new is ever written dead, and nothing stored ever
 *  breaks. */
export const LEGACY_RUN_MEDIA_PREFIX = "/v1/assets/runs";

/** The run-media prefix a path addresses, or null when it addresses
 *  none (the caller leaves such a value verbatim — this is a rewrite,
 *  never a filter). */
export function runMediaPrefixOf(value: string): string | null {
  if (value === RUN_MEDIA_PREFIX || value.startsWith(RUN_MEDIA_PREFIX + "/")) {
    return RUN_MEDIA_PREFIX;
  }
  if (value === LEGACY_RUN_MEDIA_PREFIX || value.startsWith(LEGACY_RUN_MEDIA_PREFIX + "/")) {
    return LEGACY_RUN_MEDIA_PREFIX;
  }
  return null;
}

/** THE ONE SPELLING: a run-media path in any spelling becomes the
 *  live one. Everything else — a local file, an https URL, a $spell,
 *  a run-relative name — rides verbatim. */
export function canonicalRunMediaUrl(value: string): string {
  const prefix = runMediaPrefixOf(value);
  if (prefix === null || prefix === RUN_MEDIA_PREFIX) return value;
  return RUN_MEDIA_PREFIX + value.slice(prefix.length);
}

/** Rewrite every legacy run-media path inside a value (deep,
 *  value-preserving, total). */
export function healRunMediaPaths(value: unknown): unknown {
  if (typeof value === "string") return canonicalRunMediaUrl(value);
  if (Array.isArray(value)) return value.map((x) => healRunMediaPaths(x));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = healRunMediaPaths(v);
    }
    return out;
  }
  return value;
}

/** THE BIRTH STRIP (the cross-bench history leak, 2026-09-23,
 *  live proof bench-session-2bd2a61f): the wand restores onto fresh
 *  sessions carrying rows from a FOREIGN bench's run snapshot, and
 *  archives — history tiles, the run's result params, its live
 *  status, its resolved view — are the observe state THIS bench's
 *  own runs earn. They never survive a BIRTH.
 *
 *  THE ARM DECIDES, THE CONTRACT NAMES THE KEYS: this list belongs
 *  to the birth arm, not to row normalization — the LOAD arm keeps
 *  the stage memory law whole (same-id carry, fill-never-clobber),
 *  which is how a restore's history tiles are the restore's own
 *  point. Stripping at the wrong altitude is how a restore lost its
 *  tiles once already.
 *
 *  `result` is never in it: the wand's preview stamp is the one
 *  lawful birth memory. */
export const BIRTH_STRIP_KEYS: readonly string[] = [
  "history",
  "resultParams",
  "runStatus",
  "resolved",
];

/** What a RESTORE strips before re-stamping the stage that actually
 *  ran (the gallery's law — a bench never shows another run's
 *  outputs). */
export const RESTORE_STRIP_KEYS: readonly string[] = [
  "result",
  "resultParams",
  "runStatus",
  "resolved",
  "history",
];

/** What a LOAD onto the same stage ids CARRIES FORWARD (the load
 *  arm's complement to the birth strip): the memory THIS bench
 *  earned for that stage — its result, its live status, its history
 *  tiles, its result params. A genuinely new stage id starts clean.
 *  Named here so the two arms cannot be edited apart. */
export const LOAD_CARRY_KEYS: readonly string[] = [
  "result",
  "runStatus",
  "history",
  "resultParams",
];

/** Strip a list of keys off a row (in place — the arm owns the row). */
export function stripKeys(row: Record<string, unknown>, keys: readonly string[]): void {
  for (const k of keys) delete row[k];
}

/** The engine a BENCH stage row declares — DERIVED when it does
 *  not say, because the bench IS the card bench: every row in it
 *  composes a card on the card plane, and a row that names another
 *  engine says so out loud (the blender/mcp rows the bench carries
 *  for previews). The run door's stricter rule — an mcp/flow stage
 *  must NAME its engine — belongs to the flow document, which is a
 *  different shape with its own gate; a bench row is not that.
 *
 *  This is the derivation that used to be written out by hand in
 *  three writers (the bench normalizer, the add-card door, the run
 *  door), which is how a GUI row and an agent row became different
 *  documents. */
export function stageEngineOf(row: Record<string, unknown>): string {
  const own = row["engine"];
  if (typeof own === "string" && own !== "") return own;
  return CARD_PLANE_ENGINE;
}

/** The one normalization every writer runs. Idempotent
 *  (normalize(normalize(x)) === normalize(x)) and total (never
 *  throws): a row in, a stage row out, with every derived field
 *  derived, every run-memory field stripped, every run-media path
 *  healed, and the era's self-naming model removed.
 *
 *  `index` is the row's position — the id fallback names it, so an
 *  unaddressable row becomes addressable rather than vanishing.
 *  Run memory is NOT stripped here: that is the birth/restore arms'
 *  law (BIRTH_STRIP_KEYS), and the contract names the keys rather
 *  than guessing which arm is running.
 */
export function normalizeBenchStage(
  row: unknown,
  // the id a row with NO id of its own gets: a number mints the
  // positional `s_<n>`, a STRING is the caller's own id (the drafts
  // arm mints `s_<max+1>` itself and must not be re-minted)
  index: number | string,
): Record<string, unknown> {
  const out: Record<string, unknown> =
    row !== null && typeof row === "object" && !Array.isArray(row)
      ? { ...(row as Record<string, unknown>) }
      : {};
  // THE ID LAW: a CALLER-STATED id is the caller's, verbatim —
  // including the empty string, which the wire admission reads as
  // "this row addresses no stage" (its live-set voice depends on
  // it). Only a MISSING or non-string id is filled, so an
  // unaddressable row still becomes addressable.
  const id = out["id"];
  if (typeof id !== "string") {
    out["id"] = typeof index === "number" ? "s_" + String(index) : index;
  }
  out["engine"] = stageEngineOf(out);
  const ins = out["inputs"];
  out["inputs"] = ins !== null && typeof ins === "object" && !Array.isArray(ins)
    ? healRunMediaPaths({ ...(ins as Record<string, unknown>) }) as Record<string, unknown>
    : {};
  const params = out["params"];
  const healed = healRunMediaPaths(
    params !== null && typeof params === "object" && !Array.isArray(params) ? params : {},
  ) as Record<string, unknown>;
  // THE SELF-NAMING MODEL STRIP (run-ffbabb558cb8): params.model
  // naming the row's own card is the era's family-less compose
  // residue; today's admission refuses it as a board request. A
  // model naming a REAL family rides untouched.
  //
  // "UNTOUCHED" IS NOT VACUOUS (2026-10-10, the work audit's R5): the
  // `anny` card BOARDS the `anny` family, so a row stating
  // `model: 'anny'` was stripped — and the strip made the row
  // model-LESS, which is why the undeclared-key gate (a seat that
  // needs no family) had to be lifted out of the model-less tolerance.
  // The strip now asks the only question that matters: does the model
  // name a REAL family? If the card's own id is also a family, the
  // model rides — the operator stated it, and the read-back shows it.
  // (No card names a family equal to its own id other than anny today;
  // the wall pins that list.)
  const rowCard = out["card"];
  // THE ONE STRIP — the decision is a named export below so every
  // restore arm asks the same question. The two hand-copied versions
  // in the browser restore path drifted from this one (a missing
  // `card !== ""` guard, and a raw-vs-healed comparison), and every
  // wall stayed green because they pinned the contract and the SET
  // and never drove those two sites.
  stripSelfNamedModel(rowCard, healed);
  out["params"] = healed;
  // THE OUTPUTS LAW IS THE CARD-PORTS LAW (2026-10-10, the audit's
  // Rule 1: two writers, two laws — and the agent's projection was
  // the right one). A stage that names a CARD derives its output
  // channels from that card's own ports at compose: fabricating an
  // image default here mis-kinded every video/tts/film stage on the
  // wire (a film read as an image producer). Absent on a card stage
  // stays ABSENT (compose fills from the ports). The engine's
  // DEFAULT_OUTPUT shape is for CARD-LESS stages only.
  const outputs = out["outputs"];
  out["outputs"] = outputs !== null && typeof outputs === "object" && !Array.isArray(outputs)
    ? { ...(outputs as Record<string, unknown>) }
    : (typeof rowCard === "string" && rowCard !== "" ? {} : { default: "image" });
  return out;
}

/** Normalize a bench's whole stage list — the writers' array arm.
 *  Group rows (a row with `children`) ride as they are beyond the
 *  derived fields: they carry no engine or params of their own. */
export function normalizeBenchStages(stages: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(stages)) return [];
  const out: Array<Record<string, unknown>> = [];
  for (const [i, row] of stages.entries()) {
    const normalized = normalizeBenchStage(row, i);
    const children = normalized["children"];
    if (Array.isArray(children)) {
      delete normalized["engine"];
      // normalizeBenchStage already healed params to a Record (a
      // non-object or null input became {}), so the only honest
      // question left is emptiness: a group row with NO param keys
      // of its own carries no params at all (the row's own law —
      // the shape checks were dead post-heal, 2026-10-14)
      const healedParams = normalized["params"] as Record<string, unknown>;
      if (Object.keys(healedParams).length === 0) {
        delete normalized["params"];
      }
    }
    out.push(normalized);
  }
  return out;
}

/**
 * THE WIRE STAGE KEYS (2026-10-10, the audit's Rule 1 — the second
 * writer). A flow_inline stage carries exactly these keys and the door
 * forbids the rest (extra=forbid); the list lived in the flow gate and
 * the agent's bench projection each wanted it, so a reader and a
 * writer of the same wire shape could drift. It is the contract's
 * now, and both import it.
 */
/** THE STAGE-PATCH KEY SET (B-M9, the wall audit, 2026-09-28): the
 *  old door's fixed list lived in TWO production modules — the drafts
 *  door that admits the patch and the runs gate that judges it — with
 *  the SAME members in a DIFFERENT order, and each door composed its
 *  own refusal voice from its own copy. A key added to one door left
 *  the other refusing it; the two voices disagreed about what the
 *  door wanted. One list, in the contract, in the voice's order.
 *  `health` (LOW-23, 2026-10-12): the stage row's transport-health
 *  channel — the card plane's resource signal rides its own field,
 *  never runStatus; a null value is the merge-patch DELETE (the
 *  recovery clear), the same semantics params carries. */
export const STAGE_PATCH_KEYS = [
  "params",
  "result",
  "runStatus",
  "health",
  "inputs",
  "inputOutputs",
] as const;
export type StagePatchKey = (typeof STAGE_PATCH_KEYS)[number];

export const WIRE_STAGE_KEYS: readonly string[] = [
  "card",
  "card_io",
  "description",
  "engine",
  "expected",
  "id",
  "inputs",
  "outputs",
  "params",
  "retries",
  "skip_when",
  "timeout_s",
];

/**
 * THE RUN ID GRAMMAR (2026-10-10, the bypass audit's MEDIUM-2: it was
 * spelled in five modules — the media route, the source echo, the
 * gallery, and two agent tools — with no pin, so a change to the mint
 * would have some readers accept and some refuse, silently).
 * A run id is `run-<hex>-<token>`; the media route's parse and every
 * reader that keys a path by it use this one.
 */
/** THE SESSION GRAMMAR — the bench key (the identity law, 2026-09-28).
 *
 *  This grammar was spelled in FOUR places: the drafts owner, two
 *  inline copies in melite-construct (the agent's bench key), and
 *  the browser's own. The grammar wall pinned the server and two
 *  clients, so tightening ONE copy left the whole suite green — a
 *  copy the wall does not name is a copy the wall does not hold.
 *
 *  The contract floor owns it now, and both sides import it: the
 *  drafts package re-exports it for its own callers, the agent tool
 *  reads it, and the wall bans the inline spelling everywhere else.
 *  A bench key is an ADDRESS (it names a stored document), and an
 *  address has one grammar. */
/** THE RESTORED-PROVENANCE SPELLING (the identity law, 2026-09-28).
 *
 *  "restored" is the coordinate the model-repair law reads: a row
 *  that came off an archive is exempt from the live admission, and a
 *  live composer's typo of it is refused. It was WRITTEN as a bare
 *  literal in five places (the drafts reader, the snapshot restore,
 *  and three client restore arms) while the estate's door already
 *  carried a named spelling — a door and its callers reading the same
 *  coordinate from two sources. The contract floor owns it now, and
 *  the door re-exports it, so every reader and every writer agree by
 *  construction. */
export const RESTORED_PROVENANCE_SPELLING = "restored";

export const SESSION_RE: RegExp = /^[A-Za-z0-9_-]{1,64}$/;

/** The bench DRAFT id: the session key under the bench- prefix (the
 *  stored document's own name, minted from the key by one door). */
export const BENCH_DRAFT_RE: RegExp = /^bench-([A-Za-z0-9_-]{1,64})$/;

export const RUN_ID_RE: RegExp = /^run-[0-9a-f]+-[A-Za-z0-9_-]+$/;

/** Sanitize one candidate id onto a legal bench session key —
 * 'main' for anything the grammar refuses. THE ONE SPELLING of the
 * routing decision (the li-ay stroke, 2026-10-11): the decision
 * `SESSION_RE.test(id) ? id : 'main'` was spelled FOUR times — the
 * gallery client (bench-load.benchSessionOf), the cards tab
 * (cards-resource.benchSessionKey), and TWICE inline in the agent
 * tool — and the walls pinned each copy's grammar import while a
 * gutted routing body ('main' for everything) stayed green behind
 * the codec arms. The grammar moved to this floor for exactly this
 * reason; the DECISION over it moves beside it, and every seat
 * imports the same function. An address has one grammar and one
 * sanitize — not four. */
export function benchSessionOf(id: string | undefined): string {
  return typeof id === "string" && SESSION_RE.test(id) ? id : "main";
}

/** The prefix the mint writes and the strip removes — the one
 *  spelling of "bench-", beside the grammar that validates it. */
export const BENCH_DRAFT_PREFIX_RE = /^bench-/;

/** The MINT — the inverse of benchSessionOf (2026-10-13, the card-UI
 *  duplication audit). The grammar moved to this floor and the DECISION
 *  beside it, but the mint stayed behind in six seats spelling
 *  `"bench-" + session` — one of which stripped the prefix and added
 *  it straight back. An address has one grammar, one sanitize, and now
 *  one mint. */
export function benchDraftIdOf(session: string): string {
  return "bench-" + session;
}

/** The run-relative tail of an absolute artifact path, or undefined
 * when the path carries no run directory — e.g.
 * "/data/runs/output/run-4f2a1c-ab12/tts/line.flac" →
 * "run-4f2a1c-ab12/tts/line.flac". THE TAIL GRAMMAR IS RUN_ID_RE
 * (the li-ay stroke): the restore stamp's private tailOf accepted
 * ANY "run-…" segment ("run-ZZZ/x.png" previewed; run ids are minted
 * run-<hex>-<base62> and never look like that), so a path a run
 * directory could not own still minted a served artifact address.
 * One grammar for minting and one for taking the tail: the LAST
 * run-shaped segment wins (the estate nests nothing under a run
 * today; the last-wins order is the old behavior, kept). */
export function runTailOf(path: string): string | undefined {
  const segments = path.split("/");
  let found: string | undefined;
  for (let i = 0; i < segments.length - 1; i++) {
    // a tail needs a LEAF: a path ending in the run directory
    // itself ("…/run-x/") names no artifact
    if ((segments[i + 1] as string) === "") continue;
    if (RUN_ID_RE.test(segments[i] as string)) {
      found = segments.slice(i).join("/");
    }
  }
  return found;
}

/**
 * THE CARDS WHOSE OWN ID IS ALSO A FAMILY (2026-10-10, the work
 * audit's R5). `anny` is the original: the card boards the `anny`
 * family, and its compose declares `requiresModel: false` (its
 * weights ride provisions, not a model choice). A row stating
 * `model: 'anny'` is a real boarding, not the era's family-less
 * compose residue — so the self-naming strip leaves it alone, the row
 * is judged with its model present, and the read-back shows what the
 * operator wrote.
 *
 * `h3-timeline` joined 2026-09-28 (the closure gate's A-C1 fix): the
 * film card's id collides with its own DEFAULT LANE id, and the
 * h3_timeline tool writes `model: "h3-timeline"` on every explicit
 * call — the strip was silently eating the operator's lane choice
 * from both the judged view and the stored row (the one-spelling
 * law: what the operator wrote is what is judged and read back).
 *
 * A new card whose id is also a family id must be ADDED here, and the
 * self-naming-strip wall (closure-gate RULE 4c, live-registry derived
 * with floors and two-way equality) fails when a card's own id is a
 * family but is missing from this list.
 */
export const SELF_NAMED_FAMILIES: ReadonlySet<string> = new Set(["anny", "h3-timeline"]);

/** THE SELF-NAMING STRIP, AS A DECISION (2026-10-11, the client-plane
 *  audit's F1). `normalizeBenchStage` applies this inline; the RESTORE
 *  arms in `packages/web/infer-gallery/src/client/bench-load.ts` used
 *  to re-implement it, and both copies drifted from the contract:
 *
 *  - one copy guarded `card !== ""` and the other did not, so a row
 *    with `card: ""` and `params: {model: ""}` kept its model under
 *    the contract and lost it under the client;
 *  - one copy compared the RAW `params.model` and the other the
 *    HEALED one;
 *  - the multi-stage arm did not call `normalizeBenchStage` at all,
 *    so it skipped the run-media path heal and the engine derivation
 *    the single-card arm got.
 *
 *  All three were invisible: making both copies strip unconditionally
 *  — the exact historical anny/h3-timeline defect — left
 *  bench-stage-contract, closure-gate and media-sidebar GREEN, because
 *  those walls pin the CONTRACT and the SET, and never drove the two
 *  client use-sites.
 *
 *  One spelling now: every site asks this, which takes the row's card
 *  and the params bag and strips in place. It is the contract's law,
 *  stated once, with the `card !== ""` guard included. */
export function stripSelfNamedModel(card: unknown, params: unknown): void {
  if (typeof card !== "string" || card === "") return;
  if (typeof params !== "object" || params === null || Array.isArray(params)) return;
  const bag = params as Record<string, unknown>;
  if (bag["model"] !== card) return;
  if (SELF_NAMED_FAMILIES.has(card)) return;
  delete bag["model"];
}
