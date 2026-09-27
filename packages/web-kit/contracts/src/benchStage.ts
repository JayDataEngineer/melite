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

/** The RUN-MEMORY LIST every strip is drawn from, named once. */
export const RUN_MEMORY_STRIP_KEYS: readonly string[] = [
  "result",
  "runStatus",
  "resolved",
  "history",
  "resultParams",
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
export function normalizeBenchStage(row: unknown, index: number): Record<string, unknown> {
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
  if (typeof id !== "string") out["id"] = "s_" + String(index);
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
  const rowCard = out["card"];
  if (typeof rowCard === "string" && rowCard !== "" && healed["model"] === rowCard) {
    delete healed["model"];
  }
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
      if (
        (typeof normalized["params"] !== "object" || normalized["params"] === null) &&
        Object.keys(normalized["params"] as Record<string, unknown> ?? {}).length === 0
      ) {
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
