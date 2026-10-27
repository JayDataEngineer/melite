// operator-copy-estate.spec.ts — THE ESTATE-WIDE OPERATOR-COPY WALL
// (audit h3-frames-anima-2026-10-20, findings B1-2 + B1-3).
//
// THE LAW: no architecture vocabulary paints on the operator's
// face. schemastery's meta.description IS the card's field LABEL
// (card-base spec.ts fieldsOf: `label: meta['description']`), and
// extra.tooltip rides the hover (i) — both are OPERATOR copy. The
// estate's architecture vocabulary (Layer A/B/C, DECL, compose,
// lane, plane, the walk, manage seat, estate) never renders there;
// code comments may speak it, the served face may not.
//
// B1-2 (the h3-only wall's coverage gap): the previous judge walked
// ONLY h3's paramSchema while every sibling card schema and every
// other family carrier carried live dev-speak with no judge — the
// family→sibling edge shape of the 2026-10-23 family-coverage
// lesson. THIS wall derives the roster, never a hand-list:
//
//   - every registered CARD (loadCardDefs over the SSOT composition
//     list cardPackages — the same boot the serve plane mounts),
//     walking each card's served schema dict (schemaCarrier ??
//     schema — the family paramSchemas RIDE here as carriers: h3's
//     paramSchema is the h3-timeline card's carrier) AND each
//     card's DECLARED MOD KINDS (def.mods — the features.modifiers
//     channel: kind label, section caption, every field's label +
//     tooltip, every option label — all served verbatim);
//   - the roster arm pins the judged set to the composed set
//     (defs.size === cardPackages.length), so a card that hides its
//     dict or a silent roster shrink reds (a wall judging a copy of
//     the truth passes while the truth burns).
//
// B1-3 (the vocabulary/accuracy cure): the banned list carries the
// BARE idioms — "compose" (not only "compose door"), "lane",
// "plane" — and the walk SKIPS rows whose extra.hidden === true
// (hidden rows never paint — walking them is wall noise that
// trains literal-bumping, and a future hidden internal row's
// internal wording would red without any operator exposure).
//
// Labels and tooltips judge in SEPARATE arms (canon axis 3: each
// invariant fires on its own path — one arm greening cannot mask
// the other reding). Toggle: restore any cured string (e.g.
// image-edit double_reference's "on this plane (agent-debt F-4…)")
// → the red names the card, field, string class, and the verbatim
// leak.

import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  cardPackages,
  loadCardDefs,
} from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";

/** Architecture vocabulary that never renders to the operator.
 *  Each entry is a settled estate idiom with an operator-language
 *  replacement; grow the list when a new leak class fires. */
const BANNED: ReadonlyArray<{ re: RegExp; word: string }> = [
  { re: /Layer [ABC]\b/, word: "Layer A/B/C" },
  { re: /\bDECL\b/, word: "DECL" },
  { re: /\bcompose\b/i, word: "compose" },
  { re: /\blanes?\b/i, word: "lane(s)" },
  { re: /\bplanes?\b/i, word: "plane(s)" },
  { re: /\bthe walk\b/i, word: "the walk" },
  { re: /\bmanage seat\b/i, word: "manage seat" },
  { re: /\bestate\b/i, word: "estate" },
];

interface SchemaNode {
  readonly type?: string;
  readonly dict?: Record<string, unknown>;
  readonly inner?: SchemaNode;
  readonly meta?: { readonly description?: unknown; readonly extra?: Record<string, unknown> };
  readonly extra?: Record<string, unknown>;
}

interface Seat {
  readonly face: string;
  readonly field: string;
  readonly kind: "label" | "tooltip" | "option";
  readonly text: string;
}

/** One served row's copy seats. extra.hidden === true rows are
 *  SKIPPED (B1-3: hidden rows never paint — walking them is wall
 *  noise). THE SHAPE TRAP the first cut died on: a live schemastery
 *  node IS a function and INHERITS `.extra` — the builder METHOD —
 *  from its prototype, so `node.extra` is truthy-but-not-a-bag and
 *  `?? meta.extra` never falls through (JSON.stringify hides the
 *  function as `undefined`). Only a PLAIN-OBJECT extra counts: the
 *  serialized envelope's sibling, else the live bag under meta. */
function bagOf(node: SchemaNode): Record<string, unknown> {
  const own = node.extra as unknown;
  if (own !== null && typeof own === "object") return own;
  const meta = node.meta as { extra?: unknown } | undefined;
  if (meta !== undefined && meta.extra !== null && typeof meta.extra === "object") {
    return meta.extra as Record<string, unknown>;
  }
  return {};
}

function seatsOfNode(name: string, node: SchemaNode, face: string, out: Seat[], seen: Set<SchemaNode>): void {
  if (seen.has(node)) return;
  seen.add(node);
  const meta = node.meta ?? {};
  const extra = bagOf(node);
  if (extra["hidden"] !== true) {
    const label = typeof meta.description === "string" ? meta.description : "";
    if (label !== "") out.push({ face, field: name, kind: "label", text: label });
    const tooltip = typeof extra["tooltip"] === "string" ? extra["tooltip"] : "";
    if (tooltip !== "") out.push({ face, field: name, kind: "tooltip", text: tooltip });
  }
  // nested object fields and array-of-object items carry copy too
  const nested: SchemaNode[] = [];
  if (node.dict !== undefined) nested.push(node as SchemaNode);
  if (node.inner !== undefined && node.inner.dict !== undefined) nested.push(node.inner);
  for (const n of nested) {
    for (const [childName, child] of Object.entries(n.dict ?? {})) {
      seatsOfNode(`${name}.${childName}`, child as SchemaNode, face, out, seen);
    }
  }
}

/** The declared mod kinds (def.mods — the features.modifiers
 *  channel): kind label, section caption, every declared field's
 *  label + tooltip, every option label. All served verbatim. */
function seatsOfMods(face: string, mods: unknown, out: Seat[]): void {
  if (!Array.isArray(mods)) return;
  for (const kind of mods as Array<Record<string, unknown>>) {
    const kindId = String(kind["kind"] ?? "?");
    if (typeof kind["label"] === "string" && kind["label"] !== "") {
      out.push({ face: `${face} mods:${kindId}`, field: "label", kind: "label", text: kind["label"] });
    }
    if (typeof kind["section"] === "string" && kind["section"] !== "") {
      out.push({ face: `${face} mods:${kindId}`, field: "section", kind: "tooltip", text: kind["section"] });
    }
    for (const rowKey of ["fields", "kindFields"] as const) {
      const rows = kind[rowKey];
      if (!Array.isArray(rows)) continue;
      for (const row of rows as Array<Record<string, unknown>>) {
        const fieldName = String(row["name"] ?? "?");
        if (typeof row["label"] === "string" && row["label"] !== "") {
          out.push({ face: `${face} mods:${kindId}`, field: fieldName, kind: "label", text: row["label"] });
        }
        if (typeof row["tooltip"] === "string" && row["tooltip"] !== "") {
          out.push({ face: `${face} mods:${kindId}`, field: fieldName, kind: "tooltip", text: row["tooltip"] });
        }
      }
    }
    const options = kind["options"];
    if (Array.isArray(options)) {
      for (const opt of options as Array<Record<string, unknown>>) {
        if (typeof opt["label"] === "string" && opt["label"] !== "") {
          out.push({ face: `${face} mods:${kindId}`, field: "option", kind: "option", text: opt["label"] });
        }
      }
    }
  }
}

/** THE DERIVED ROSTER: every composed card's served copy seats —
 *  the schema dict (schemaCarrier ?? schema: the family carriers
 *  ride here) + each card's declared mod kinds + every ABSORBED
 *  PACK CONTRACT (the mod_schemas envelopes: the entry rows derive
 *  client-side off the pack's own toJSON — discovery.ts; the union
 *  of cardModFields over the composed set, keyed by pack so one
 *  contract judges once). No hand-maintained list. */
async function estateSeats(): Promise<{ seats: Seat[]; dictless: string[]; cards: number; packs: string[] }> {
  const defs = await loadCardDefs();
  const { theService } = await import("../../../../packages/engines/comfyui-cordis/src/cardDefs.ts");
  const svc = theService();
  const seats: Seat[] = [];
  const dictless: string[] = [];
  const packFields = new Map<string, unknown>();
  for (const [id, def] of defs) {
    const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ??
      (def as { schema?: unknown }).schema;
    const dict = (carrier as { dict?: Record<string, unknown> } | undefined)?.dict;
    if (dict === undefined) {
      dictless.push(id);
      continue;
    }
    const seen = new Set<SchemaNode>();
    for (const [name, node] of Object.entries(dict)) {
      seatsOfNode(name, node as SchemaNode, id, seats, seen);
    }
    seatsOfMods(id, (def as { mods?: unknown }).mods, seats);
    for (const absorbed of svc.cardModFields(id) as Array<{ pack: string; fields: unknown }>) {
      if (!packFields.has(absorbed.pack)) packFields.set(absorbed.pack, absorbed.fields);
    }
  }
  // the pack contracts' own copy (mod entry rows on every card
  // that boards them — the absorbed envelope's toJSON)
  for (const [pack, fields] of packFields) {
    const dict = (fields as { dict?: Record<string, unknown> } | undefined)?.dict;
    if (dict === undefined) continue;
    const seen = new Set<SchemaNode>();
    for (const [name, node] of Object.entries(dict)) {
      seatsOfNode(name, node as SchemaNode, `mods:${pack}`, seats, seen);
    }
  }
  return { seats, dictless, cards: defs.size, packs: [...packFields.keys()].sort() };
}

function leaksOf(seats: readonly Seat[]): string[] {
  return seats.flatMap((seat) =>
    BANNED
      .filter((b) => b.re.test(seat.text))
      .map((b) => `[${seat.face}] field '${seat.field}' ${seat.kind}: "${seat.text}" — carries '${b.word}'`),
  );
}

describe("the estate-wide operator-copy law (no architecture vocabulary on any served face)", () => {
  // THE FLOORS (canon axis 3: a walk that judges zero seats greens
  // over nothing). Derived from the live tree at landing; a move is
  // argued here, never silent.
  // 2026-11-10 (B1-2 landing): 492 labels / 454 tooltips across the
  // 14 composed cards (the mod-kind walk included; the mask sam3
  // kinds are the mods plane's whole live census today).
  // 2026-11-10 (the pack-envelope arm): the mod-contracts walk
  // judges the absorbed pack envelopes over the same walker — the
  // 7 registered pack contracts (controlnet, ip_adapter, lanpaint,
  // loras, mask, qvoice, qvoice_save) each judged once.
  // 2026-10-22 (THE MOD-PRESENCE LAW): the qvoice_save pack shrank
  // to its one boolean stamp — voice_name + the five sampling knobs
  // died with the duped-pane burn (the card's lane surface owns the
  // sampling; the build mints the export name); the stamp's label +
  // tooltip stay operator language. 538 labels / 475 tooltips (476
  // before 2026-11-12: use_stock_nodes's tooltip left the served set
  // with the one-seat register's first retirement — hidden rows serve
  // no face, so no tooltip seat).
  const LABEL_FLOOR = 538;
  const TOOLTIP_FLOOR = 475;
  const PACK_FLOOR = 7;

  it("the judged set IS the served set: every composed card serves its schema dict, and every pack contract is walked", async () => {
    const { dictless, cards, packs } = await estateSeats();
    assert.equal(cards, cardPackages.length, `the boot serves ${cards} cards for ${cardPackages.length} composed packages — the judged set must BE the served set`);
    assert.deepEqual(dictless, [], "cards hiding their schema dict (read off schemaCarrier ?? schema, the serve plane's own door — a wall judging a copy of the truth passes while the truth burns)");
    assert.ok(packs.length >= PACK_FLOOR, `the pack walk judged ${packs.length} contracts (floor ${PACK_FLOOR}) — a rotted derivation greens over an empty walk`);
  });

  it("every served field label on every card and family carrier speaks operator language", async () => {
    const { seats } = await estateSeats();
    const labels = seats.filter((s) => s.kind === "label");
    assert.ok(labels.length >= LABEL_FLOOR, `the label walk judged ${labels.length} seats (floor ${LABEL_FLOOR}) — a rotted derivation greens over an empty walk`);
    const leaks = leaksOf(labels);
    assert.deepEqual(leaks, [], `architecture vocabulary leaked onto the operator's labels:\n${leaks.join("\n")}`);
  });

  it("every served tooltip and option label on every card and family carrier speaks operator language", async () => {
    const { seats } = await estateSeats();
    const tips = seats.filter((s) => s.kind === "tooltip" || s.kind === "option");
    assert.ok(tips.length >= TOOLTIP_FLOOR, `the tooltip walk judged ${tips.length} seats (floor ${TOOLTIP_FLOOR}) — a rotted derivation greens over an empty walk`);
    const leaks = leaksOf(tips);
    assert.deepEqual(leaks, [], `architecture vocabulary leaked into a hover tip:\n${leaks.join("\n")}`);
  });
});
