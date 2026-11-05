// @vitest-environment happy-dom
// stage-drill-singularity-census.spec.tsx — THE SINGULARITY CENSUS
// (2026-11-15 plan: dev_docs/audits/journey/
// dupe-error-singularity-stress-plan-2026-11-15.md). The strip wall
// pins the TWO-ghost shape (stage-drill-strip-singularity.spec.tsx:
// the press strip owns the whole gate set, one row per violation,
// the banner stands down for every carried message, one dismiss
// retires the strip). This census pins the CLASS: every message
// shape the compose mirror can emit must round-trip through the
// mute (voiced face → gateRefusalMessage → muted message), at every
// cardinality, in every mixture, with no key collapse and no
// cross-card or cross-face leakage.
//
// WHAT EACH ARM JUDGES (seat queries only — [data-compose-gate] /
// [data-testid="stage-error-strip"] / [data-testid="stage-write-face"]
// / [data-lane-warn], never by singular text — the FLAKE 1 law):
//   P0-A producer (6) — per gate kind the mirror emits
//     (undeclared-key ghost, envelope-outside, unknown variant,
//     unknown quant, deliverable-size, family-lane dead key): the
//     REAL producer output composes with the REAL voice literals
//     into a face that slices back to the exact muted string.
//   P0-A seat (8) — ghost / envelope / size / family-dead through
//     the drill: the press voices the derived message on the strip
//     AND the banner stands down (direct mute); the typed write's
//     pending face voices it AND the banner stands down (mute
//     SOLELY through the extractor — gateSet is empty there, so a
//     reworded template unmutes and reds).
//   P0-A pre-empt (2) — unknown variant / quant never reach a gate
//     seat: the seed's ghost drop heals the coordinate at open, so
//     the banner is silent, the press proceeds to runs/start, the
//     typed write lands with no face. The producer voice EXISTS
//     (the P0-A producer arms) — the seat never lets it judge.
//   P0-B tripwire (1) — the two voice literals byte-match the
//     extractor's head/tail slices (source parity, no frozen
//     copy); the strip row key names BOTH field and message.
//   P0-C sweep (5) — 0/1/2/3/5 ghost keys: banner 0, strip rows ==
//     violation count, one unstamp per named field.
//   P0-D mixed (1) — ghost + envelope on the strip, the
//     requires word on the lane-warn seat, banner 0. The plan
//     letter's split (strip owns the requires word too) is
//     REFUTED both ways: relations never join the gate set.
//   P0-E collisions (2) — one field with two messages (ghost +
//     family-dead on g2): distinct keys, two rows, two unstamps, ×
//     retires all with the banner returning the set. Live
//     identical-message/different-fields pairs are UNPRODUCIBLE
//     (every clause namespaces by field or is a singleton).
//   P1-F shrink (1) — N=3 press, one row's unstamp retires ONLY its
//     field's rows: 2 survivors stay voiced, the banner stays down,
//     the row's bench key nulls. The strip's own × still retires
//     the whole set (P0-E).
//   P1-F drain (1) — the retire heals the bench key by key: each
//     re-press re-voices only the survivors, the cleared keys never
//     return, the final clean press starts the run with no faces.
//   P1-I isolation (1) — ghost on card A, clean card B in the same
//     test: B shows no strip, no write face, no banner.
//   P1-J coexistence (2) — refused typed write (unlanded voice) +
//     refused press (gate strip): BOTH rows visible, each with its
//     own ×; dismissing one leaves the other.
//
// TOGGLE RECIPES (revert the cure line → the named arm reds):
//   P0-A producer + seat + P0-B — the full-set press
//     (stage-drill.tsx:1479-1483 gateViolations → setGateSet whole
//     set): take violations[0] only and the strip carries one row
//     while the banner returns the rest. A voice template
//     (stage-drill.tsx:172-175 refusal / 189-192 pending) or an
//     extractor slice (stage-drill.tsx:199-209): reword ONE side
//     and the pending arms unmute on the banner while P0-B reds.
//   P0-A pre-empt — the ghost drop (card-base/src/spec.ts:1799-1824
//     seedUser): stop dropping unknown axis values and the variant/
//     quant arms red at "banner silent at open" while the seat arms
//     start round-tripping the voices.
//   P0-C/E — the mutedViolations whole-set mute
//     (stage-drill.tsx:1874-1878 → form.tsx:340-342): drop one
//     message and the banner returns it beside the strip.
//   P0-D — route relations into the gate set
//     (stage-drill.tsx:1486 setGateSet(gateViolations)) and the
//     strip voices the requires word while the lane-warn seat keeps
//     its own: the arm's "never joins the strip" line reds.
//   P1-F shrink — the whole-set retire in onUnstamp
//     (stage-drill.tsx:1135 setGateSet(survivors) +
//     setError(survivors ...)): put back setGateSet([]) /
//     setError(null) and the strip unmounts under the survivors —
//     "the strip survives" reds in the shrink arm, and the drain
//     loop reds at round 1 (a survivor's word still voiced after
//     its retire is fine, but the seat is gone before the next
//     press can re-voice it).
//   P1-I — per-drill gate state (stage-drill.tsx:341 useState per
//     mount): hoist gateSet to module scope and B inherits A's
//     mute.
//   P1-J — the write-face stand-down guards
//     (stage-drill.tsx:1951-1952, gate voices only): mute ANY
//     write face while the strip is up and the unlanded row
//     vanishes (the over-mute failure).
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { repoRoot } from "./repo-root.ts";
import { LOADED_WAIT } from "../../../../tests/helpers/loaded-wait.ts";
import { unbindEstateRemote, schemaEnvelope, composeValidate } from '@melite/card-base/client';
import type { ComposeViolation, FormSpecDoc } from '@melite/card-base/client';
import { resetStageWrites, stageWriteState } from "../src/client/draft.ts";
import { CardsTab } from "../src/client/CardsTab.tsx";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import { draftIdOf } from '@melite/contracts/benchStage';

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  resetStageWrites();
  vi.unstubAllGlobals();
});

let fakes: EstateFakes | null = null;

type EstateOpts = { patchFailures?: Array<Record<string, unknown>> };

function textLeaf(description: string): Record<string, unknown> {
  return { type: 'string', meta: { description, extra: { wtype: 'textarea' } } };
}

/** The family base: the served doc declares ONLY the text param —
 *  every other stated key is a ghost the mirror refuses field-named
 *  (the message IS the admission-field-named face: it names the
 *  estate admission gate's field-named refusal at the write door). */
function ghostSpecDoc(): FormSpecDoc {
  return {
    form: 'form_tts', genre: 'audio', engine: 'comfyui', model: 'm',
    schema: schemaEnvelope({ text: textLeaf('Text') }),
    variants: [],
    params: ['text'],
  };
}

/** The envelope spec: turbo composes clean, raw carries a closed
 *  [1,2] cfg envelope — a stated cfg:99 against raw is the
 *  envelope-outside clause (field-less: its strip row rides an
 *  inert "Unstamp ''" — the guard skips a null field). */
function envelopeSpecDoc(): FormSpecDoc {
  return {
    form: 'form_tts', genre: 'audio', engine: 'comfyui', model: 'm',
    schema: schemaEnvelope({ text: textLeaf('Text') }),
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: {}, route: 'turbo', sampler_envelope: { steps: [1, 50], cfg: [1, 2] } },
      { id: 'raw', label: 'Raw', group: 'Variant', defaults: {}, route: 'raw', sampler_envelope: { steps: [1, 50], cfg: [1, 2] } },
    ],
    params: ['text', 'variant', 'cfg'],
  };
}

/** The unknown-variant spec: any stated variant outside the served
 *  matrix is the mirror's missing-status voice (field-less). The
 *  drill seat never lets it judge (the ghost drop heals it first —
 *  see the P0-A pre-empt arms). */
function variantSpecDoc(): FormSpecDoc {
  return envelopeSpecDoc();
}

/** The quant spec: turbo offers exactly the int8 cell — a stated
 *  quant outside the resolved variant's cells is the unknown-quant
 *  clause (field-less, same pre-emption as the variant). */
function quantSpecDoc(): FormSpecDoc {
  return {
    form: 'form_tts', genre: 'audio', engine: 'comfyui', model: 'm',
    schema: schemaEnvelope({ text: textLeaf('Text') }),
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: {}, route: 'turbo' },
      { id: 'q8', label: 'Int8', group: 'Quant', owner: 'turbo', quant: 'int8', defaults: {}, route: 'turbo/int8' },
    ],
    params: ['text', 'variant', 'quant'],
  };
}

/** The deliverable spec: the schema serves the match toggle beside
 *  the pair, so the shared size law judges values (width stated
 *  under match-absent refuses field-named on 'width'). */
function deliverableSpecDoc(): FormSpecDoc {
  return {
    form: 'form_tts', genre: 'audio', engine: 'comfyui', model: 'm',
    schema: schemaEnvelope({
      text: textLeaf('Text'),
      match_input_resolution: { type: 'boolean', meta: { description: 'Match input resolution' } },
      width: { type: 'number', meta: { description: 'Width' } },
      height: { type: 'number', meta: { description: 'Height' } },
    }),
    variants: [],
    params: ['text', 'match_input_resolution', 'width', 'height'],
  };
}

/** The family spec: the solo lane refuses the stale key — the
 *  family clause voices it field-named in the lane's own words (a
 *  second voice on the SAME field as the mirror ghost). */
function familySpecDoc(): FormSpecDoc {
  return {
    form: 'form_tts', genre: 'audio', engine: 'comfyui', model: 'm',
    schema: schemaEnvelope({ text: textLeaf('Text') }),
    variants: [],
    params: ['text', 'stale_k'],
    familyLaw: { lanes: [{ lane: 'solo' }], deadKeys: { solo: ['stale_k'] } },
  };
}

/** The mixed spec (P0-D): ghost surfacing beside a lane block whose
 *  relation word (text requires voice_name) fires on the lane-warn
 *  seat — a DIFFERENT crime with its own cure line — plus the raw
 *  envelope variant for the outside clause. */
function mixedSpecDoc(): FormSpecDoc {
  return {
    form: 'form_tts', genre: 'audio', engine: 'comfyui', model: 'm',
    schema: schemaEnvelope({ text: textLeaf('Text') }),
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: {}, route: 'turbo', sampler_envelope: { steps: [1, 50], cfg: [1, 2] } },
      { id: 'raw', label: 'Raw', group: 'Variant', defaults: {}, route: 'raw', sampler_envelope: { steps: [1, 50], cfg: [1, 2] } },
    ],
    params: ['text', 'variant', 'cfg'],
    lanes: {
      base: ['text', 'variant', 'cfg'],
      relations: { requires: [{ field: 'text', needs: ['voice_name'] }] },
    },
  };
}

/** The double spec (P0-E): the lanes declare everything EXCEPT g2
 *  while the family law dead-letters it — one field, TWO messages
 *  (mirror ghost + family-dead), the closest a live doc gets to a
 *  collision. */
function doubleSpecDoc(): FormSpecDoc {
  return {
    form: 'form_tts', genre: 'audio', engine: 'comfyui', model: 'm',
    schema: schemaEnvelope({ text: textLeaf('Text') }),
    variants: [],
    params: ['text'],
    familyLaw: { lanes: [{ lane: 'solo' }], deadKeys: { solo: ['g2'] } },
  };
}

/** The richest live set (P0-E drill): two ghosts, g2 ALSO
 *  family-dead (same field, two messages), plus the envelope and
 *  deliverable clauses — five gate violations, four named fields. */
function richSpecDoc(): FormSpecDoc {
  return {
    form: 'form_tts', genre: 'audio', engine: 'comfyui', model: 'm',
    schema: schemaEnvelope({
      text: textLeaf('Text'),
      match_input_resolution: { type: 'boolean', meta: { description: 'Match input resolution' } },
      width: { type: 'number', meta: { description: 'Width' } },
    }),
    variants: [
      { id: 'turbo', label: 'Turbo', group: 'Variant', defaults: {}, route: 'turbo', sampler_envelope: { steps: [1, 50], cfg: [1, 2] } },
      { id: 'raw', label: 'Raw', group: 'Variant', defaults: {}, route: 'raw', sampler_envelope: { steps: [1, 50], cfg: [1, 2] } },
    ],
    params: ['text', 'match_input_resolution', 'width', 'cfg', 'variant'],
    familyLaw: { lanes: [{ lane: 'solo' }], deadKeys: { solo: ['g2'] } },
  };
}

function stageWith(id: string, params: Record<string, unknown>): BenchStageView {
  return { id, card: "tts", engine: "comfyui", params };
}

function ghostParams(n: number): Record<string, unknown> {
  const ghosts: Record<string, unknown> = {};
  for (let i = 1; i <= n; i++) ghosts['g' + i] = 'stated carry ' + i;
  return { model: 'm', text: 'the operator speaks again', ...ghosts };
}

/** Re-stubbed PER MOUNT (the afterEach unstub law): the /v1
 *  discovery doors are the only fetches a spec stubs — the drill's
 *  served truth rides here. */
function stubFetchSpec(specDoc: FormSpecDoc): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify(specDoc), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({ tts: { outputs: { default: "audio" } } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  });
}

function mountBench(stages: BenchStageView[], specDoc: FormSpecDoc, estate?: EstateOpts): void {
  stubFetchSpec(specDoc);
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: {
      draft_id: "bench-p", rev: 1, log: [],
      stages: stages.map((s) => ({ ...s, run_status: (s as { runStatus?: string }).runStatus })),
    },
    draftStages: stages as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    ...(estate?.patchFailures !== undefined ? { patchFailures: estate.patchFailures } : {}),
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as unknown as CardsBenchValue }),
  }));
}

async function openTile(index: number): Promise<void> {
  const tiles = document.querySelectorAll('[role="button"][class*="tileInner"]');
  if (tiles.length === 0) throw new Error("no tiles rendered");
  const tile = tiles[index] as HTMLElement | undefined;
  if (tile === undefined) throw new Error("tile " + index + " missing of " + tiles.length);
  const user = userEvent.setup();
  await user.click(tile);
  await screen.findByTestId("stage-preview-seat", {}, { timeout: LOADED_WAIT() * 2 / 15 });
  await screen.findByLabelText("Text", {}, { timeout: LOADED_WAIT() * 2 / 15 });
}

async function openDrill(): Promise<void> {
  await openTile(0);
}

async function typeText(text: string): Promise<void> {
  const field = await screen.findByLabelText("Text", {}, { timeout: LOADED_WAIT() * 2 / 15 });
  const user = userEvent.setup();
  await user.clear(field);
  await user.type(field, text);
}

async function pressRun(): Promise<void> {
  const zoom = document.querySelector('div[class*="zoomCard"]') as HTMLElement;
  const user = userEvent.setup();
  await user.click(within(zoom).getByRole("button", { name: "Run stage" }));
}

/** Every seat query names a SEAT, never text (the FLAKE 1 law). */
const gateBanners = (): HTMLElement[] =>
  Array.from(document.querySelectorAll('[data-compose-gate]')) as HTMLElement[];
const gateStrip = (): HTMLElement | null =>
  document.querySelector('[data-testid="stage-error-strip"]');
const stripUnstamps = (): HTMLElement[] => {
  const strip = gateStrip();
  if (strip === null) return [];
  return Array.from(strip.querySelectorAll('button[aria-label^="Unstamp"]')) as HTMLElement[];
};
/** Named unstamps only — field-less rows ride the inert "Unstamp ''"
 *  (the guard at stage-drill.tsx:1929 skips a null field). */
const namedUnstamps = (): HTMLElement[] =>
  stripUnstamps().filter((b) => b.getAttribute("aria-label") !== "Unstamp ''");
const unstampFor = (field: string): HTMLElement => {
  const found = stripUnstamps().find((b) => b.getAttribute("aria-label") === "Unstamp '" + field + "'");
  if (found === undefined) throw new Error("no unstamp for field '" + field + "'");
  return found;
};
const stripDismiss = (): HTMLElement => {
  const strip = gateStrip();
  if (strip === null) throw new Error("no strip to dismiss");
  const btn = strip.querySelector('button[aria-label="Dismiss error"]') as HTMLElement | null;
  if (btn === null) throw new Error("strip carries no dismiss");
  return btn;
};
const writeFaceEl = (): HTMLElement | null =>
  document.querySelector('[data-testid="stage-write-face"]');
const faceDismiss = (): HTMLElement => {
  const face = writeFaceEl();
  if (face === null) throw new Error("no write face to dismiss");
  const btn = face.querySelector('button[aria-label="Dismiss error"]') as HTMLElement | null;
  if (btn === null) throw new Error("write face carries no dismiss");
  return btn;
};
const laneWarns = (): HTMLElement[] =>
  Array.from(document.querySelectorAll('[data-lane-warn]')) as HTMLElement[];

async function awaitStrip(): Promise<HTMLElement> {
  await waitFor(() => { if (gateStrip() === null) throw new Error("strip not voiced yet"); }, { timeout: LOADED_WAIT() * 4 / 15 });
  return gateStrip() as HTMLElement;
}

async function awaitWriteFace(fragment: string): Promise<HTMLElement> {
  await waitFor(() => {
    const face = writeFaceEl();
    if (face === null || !((face.textContent ?? "").includes(fragment))) throw new Error("write face not voiced yet");
  }, { timeout: LOADED_WAIT() * 4 / 15 });
  return writeFaceEl() as HTMLElement;
}

function patchParams(): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const c of fakes?.calls ?? []) {
    if (c.method !== "drafts/patch") continue;
    const patch = c.args["patch"] as Record<string, unknown> | undefined;
    const params = patch?.["params"] as Record<string, unknown> | undefined;
    if (params !== undefined) out.push(params);
  }
  return out;
}

async function awaitNullPatch(field: string): Promise<void> {
  await waitFor(() => {
    if (!patchParams().some((p) => p[field] === null)) throw new Error("null delete for '" + field + "' not issued yet");
  }, { timeout: LOADED_WAIT() * 4 / 15 });
}

async function awaitRunsStart(): Promise<void> {
  await waitFor(() => {
    if (!(fakes?.calls ?? []).some((c) => c.method === "runs/start")) throw new Error("run never started");
  }, { timeout: LOADED_WAIT() * 4 / 15 });
}

/** Single-quoted literals, backslash-aware, in source order. */
function literalsOf(body: string): string[] {
  const out: string[] = [];
  const re = /'((?:[^'\\]|\\.)*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out.push(m[1] as string);
  return out;
}
function fnBody(src: string, name: string): string {
  const start = src.indexOf("function " + name);
  if (start === -1) throw new Error(name + " not found in stage-drill.tsx");
  const open = src.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error(name + ": unbalanced braces");
}
function voiceParity(): { refusal: [string, string]; pending: [string, string] } {
  const src = readFileSync(join(repoRoot(), "packages/web/melite-card-view/src/client/stage-drill.tsx"), "utf8");
  const refusalLits = literalsOf(fnBody(src, "gateRefusalVoice"));
  const pendingLits = literalsOf(fnBody(src, "gatePendingVoice"));
  const extractorLits = literalsOf(fnBody(src, "gateRefusalMessage"));
  expect(refusalLits.length, "gateRefusalVoice must carry exactly head + tail").toBe(2);
  expect(pendingLits.length, "gatePendingVoice must carry exactly head + tail").toBe(2);
  expect(extractorLits.length, "gateRefusalMessage must carry exactly two head/tail pairs").toBe(4);
  expect([extractorLits[0], extractorLits[1]], "refusal voice vs extractor pair 1").toEqual([refusalLits[0], refusalLits[1]]);
  expect([extractorLits[2], extractorLits[3]], "pending voice vs extractor pair 2").toEqual([pendingLits[0], pendingLits[1]]);
  return { refusal: [refusalLits[0] as string, refusalLits[1] as string], pending: [pendingLits[0] as string, pendingLits[1] as string] };
}

/** The census roster: one single-violation doc per gate kind the
 *  client mirror emits, derived from the REAL producer (never a
 *  frozen message list — a new producer clause without a passing
 *  arm reds the length pin by construction). */
function censusKinds(): Array<{ kind: string; spec: FormSpecDoc; params: Record<string, unknown> }> {
  return [
    { kind: "undeclared-key ghost", spec: ghostSpecDoc(), params: { model: 'm', text: 'seed text', g1: 'stated carry one' } },
    { kind: "envelope-outside", spec: envelopeSpecDoc(), params: { model: 'm', text: 'seed text', variant: 'raw', cfg: 99 } },
    { kind: "unknown variant", spec: variantSpecDoc(), params: { model: 'm', text: 'seed text', variant: 'nope' } },
    { kind: "unknown quant", spec: quantSpecDoc(), params: { model: 'm', text: 'seed text', variant: 'turbo', quant: 'q9' } },
    { kind: "deliverable-size", spec: deliverableSpecDoc(), params: { model: 'm', text: 'seed text', width: 64 } },
    { kind: "family-lane dead key", spec: familySpecDoc(), params: { model: 'm', text: 'seed text', stale_k: 'stated carry' } },
  ];
}

/** The seat-stageable roster: the ghost drop pre-empts unknown
 *  axis coordinates before any gate judges them, so only the four
 *  value kinds round-trip through the drill seats. */
function seatKinds(): Array<{ kind: string; spec: FormSpecDoc; params: Record<string, unknown> }> {
  return [
    { kind: "undeclared-key ghost", spec: ghostSpecDoc(), params: { model: 'm', text: 'seed text', g1: 'stated carry one' } },
    { kind: "envelope-outside", spec: envelopeSpecDoc(), params: { model: 'm', text: 'seed text', variant: 'raw', cfg: 99 } },
    { kind: "deliverable-size", spec: deliverableSpecDoc(), params: { model: 'm', text: 'seed text', width: 64 } },
    { kind: "family-lane dead key", spec: familySpecDoc(), params: { model: 'm', text: 'seed text', stale_k: 'stated carry' } },
  ];
}

describe("P0-A producer census — every mirror kind composes an extractable voice", () => {
  for (const { kind, spec, params } of censusKinds()) {
    test(kind + ": the derived voice slices back to the exact muted string", () => {
      // THE DERIVED PIN (canon DEPTH): the voice is the producer's
      // own output for this doc — exactly one violation, or the
      // fixture (not the law) drifted. The voice composes from the
      // REAL literals (voiceParity byte-pins them against the
      // extractor) around the REAL message — then slices back.
      const produced: ComposeViolation[] = composeValidate(spec, params);
      expect(produced.length, kind + " fixture must carry exactly one gate violation, got " + JSON.stringify(produced)).toBe(1);
      const voice = produced[0] as ComposeViolation;
      const parity = voiceParity();
      for (const [name, pair] of [["refusal", parity.refusal], ["pending", parity.pending]] as const) {
        const faced = pair[0] + voice.message + pair[1];
        expect(faced.slice(pair[0].length, faced.length - pair[1].length), kind + " " + name + " voice must extract to the muted string").toBe(voice.message);
      }
    });
  }
});

describe("P0-A seat census — every stageable kind round-trips through the mute", () => {
  for (const { kind, spec, params } of seatKinds()) {
    test("press voices the " + kind + " on the strip; the banner stands down", async () => {
      const produced: ComposeViolation[] = composeValidate(spec, params);
      expect(produced.length, kind + " fixture must carry exactly one gate violation, got " + JSON.stringify(produced)).toBe(1);
      const voice = produced[0] as ComposeViolation;
      mountBench([stageWith("s_0", params)], spec);
      await openDrill();
      await typeText("an edit so the flush has a key");
      await pressRun();
      const strip = await awaitStrip();
      expect(strip.textContent ?? "", kind + ": the strip must voice the derived message").toContain(voice.message);
      if (voice.field === undefined) {
        // THE INERT SEAT (quirk pin): a field-less row renders one
        // "Unstamp ''" whose guard skips a null field — the plan's
        // "one unstamp per named field" holds for the NAMED count
        // (zero here), and the button clears nothing.
        expect(namedUnstamps().length, kind + ": no named unstamp for a field-less violation").toBe(0);
        expect(stripUnstamps().length, kind + ": the field-less row rides one inert unstamp").toBe(1);
        fireEvent.click(unstampFor(""));
        expect(gateStrip(), kind + ": the inert unstamp leaves the strip up").not.toBeNull();
      } else {
        expect(stripUnstamps().length, kind + ": one unstamp per named field").toBe(1);
      }
      expect(gateBanners().length, kind + ": the banner stands down for the carried message:\n  " + gateBanners().map((b) => b.textContent).join("\n  ")).toBe(0);
    });

    test("pending write voices the " + kind + "; the banner stands down through the extractor alone", async () => {
      // THE EXTRACTOR'S OWN ARM: gateSet is EMPTY here — the banner
      // mutes solely through gateRefusalMessage(writeFace). A
      // reworded template on either side unmutes and reds.
      const produced: ComposeViolation[] = composeValidate(spec, params);
      expect(produced.length, kind + " fixture must carry exactly one gate violation").toBe(1);
      const voice = produced[0] as ComposeViolation;
      mountBench([stageWith("s_0", params)], spec);
      await openDrill();
      await typeText("an edit so the flush has a key");
      const face = await awaitWriteFace(voice.message);
      expect(face.textContent ?? "", kind + ": the pending face must voice the derived message").toContain(voice.message);
      expect(gateStrip(), kind + ": the pending face is not the strip").toBeNull();
      expect(gateBanners().length, kind + ": the banner stands down through the extractor alone:\n  " + gateBanners().map((b) => b.textContent).join("\n  ")).toBe(0);
    });
  }
});

describe("P0-A pre-emption — unknown axis coordinates heal at the seed, never judge", () => {
  for (const { kind, spec, params } of [
    { kind: "unknown variant", spec: variantSpecDoc(), params: { model: 'm', text: 'seed text', variant: 'nope' } },
    { kind: "unknown quant", spec: quantSpecDoc(), params: { model: 'm', text: 'seed text', variant: 'turbo', quant: 'q9' } },
  ]) {
    test(kind + ": the seat heals the coordinate — silent banner, clean press, landing write", async () => {
      // THE PRODUCER EXISTS (the P0-A producer arm): composeValidate
      // emits the voice for this doc. The drill seat never lets it
      // judge — seedUser's ghost drop consumes the unknown axis
      // value at open, so the candidate composes clean.
      expect(composeValidate(spec, params).length, kind + " producer must emit the voice").toBe(1);
      mountBench([stageWith("s_0", params)], spec);
      await openDrill();
      expect(gateBanners().length, kind + ": the healed doc voices no banner at open").toBe(0);
      await pressRun();
      // THE CLEAN PRESS: the gate passes and the run starts — no
      // refusal face anywhere.
      await awaitRunsStart();
      expect(gateStrip(), kind + ": no strip on the healed press").toBeNull();
      expect(gateBanners().length, kind + ": no banner on the healed press").toBe(0);
      await typeText("an edit so the flush has a key");
      await waitFor(() => {
        if (!patchParams().some((p) => p["text"] === "an edit so the flush has a key")) throw new Error("typed write not landed yet");
      }, { timeout: LOADED_WAIT() * 4 / 15 });
      expect(writeFaceEl(), kind + ": the typed write lands with no face").toBeNull();
      expect(gateBanners().length, kind + ": no banner after the landing write").toBe(0);
    });
  }
});

describe("P0-B template-mutation tripwire — the voices byte-match the extractor slices", () => {
  test("refusal + pending literals equal the extractor head/tail pairs; row keys name field AND message", () => {
    voiceParity();
    const src = readFileSync(join(repoRoot(), "packages/web/melite-card-view/src/client/stage-drill.tsx"), "utf8");
    // THE KEY LAW (P0-E's static half): the strip row key must name
    // BOTH the field and the message — a field-only key collapses
    // one field's two messages into one row.
    expect(src.includes("(v.field ?? '') + ':' + v.message"), "strip row keys must be field + ':' + message, or same-field collisions collapse").toBe(true);
  });
});

describe("P0-C cardinality sweep — 0/1/2/3/5 ghosts, one row each, banner 0", () => {
  for (const n of [0, 1, 2, 3, 5]) {
    test("N=" + n + ": after a refused press the strip owns every ghost and the banner is silent", async () => {
      const params = ghostParams(n);
      const spec = ghostSpecDoc();
      const produced: ComposeViolation[] = composeValidate(spec, params);
      expect(produced.length, "the mirror must emit one violation per ghost key").toBe(n);
      mountBench([stageWith("s_0", params)], spec);
      await openDrill();
      await typeText("an edit so the flush has a key");
      await pressRun();
      if (n === 0) {
        // THE CLEAN PRESS: the flush lands, the fence passes, the
        // host runs — no gate face anywhere.
        await waitFor(() => {
          const patched = (fakes?.calls ?? []).some((c) => c.method === "drafts/patch");
          if (!patched) throw new Error("flush patch not fired yet");
          if (stageWriteState(draftIdOf("bench-p"), "s_0").pending !== 0) throw new Error("write still in flight");
        }, { timeout: LOADED_WAIT() * 4 / 15 });
        expect(gateStrip(), "clean doc: no strip").toBeNull();
        expect(writeFaceEl(), "clean doc: no write face").toBeNull();
        expect(gateBanners().length, "clean doc: no banner").toBe(0);
        return;
      }
      const strip = await awaitStrip();
      expect(gateBanners().length, "the banner stands down for every carried message:\n  " + gateBanners().map((b) => b.textContent).join("\n  ")).toBe(0);
      const stripText = strip.textContent ?? "";
      for (const v of produced) expect(stripText, "the strip voices every violation").toContain(v.message);
      const stamps = stripUnstamps();
      expect(stamps.length, "one unstamp per named field, got " + JSON.stringify(stamps.map((b) => b.getAttribute("aria-label")))).toBe(n);
      for (let i = 1; i <= n; i++) {
        expect(stamps.map((b) => b.getAttribute("aria-label")).join("|"), "field g" + i + " owns an unstamp").toContain("g" + i);
      }
    });
  }
});

describe("P0-D mixed-kind — ghost + envelope on the strip, requires on the lane-warn seat", () => {
  test("the split seats hold: the strip carries the gate set, the lane-warn seat keeps the relation (the plan letter is refuted both ways)", async () => {
    const spec = mixedSpecDoc();
    const params = { model: 'm', text: 'the operator speaks again', variant: 'raw', cfg: 99, g1: 'stated carry one' };
    // DERIVED (canon DEPTH): the gate set holds exactly the ghost
    // and the envelope clause — the requires word is the lane
    // seat's own voice, judged below by its own seat.
    const produced: ComposeViolation[] = composeValidate(spec, params);
    expect(produced.length, "gate set must hold ghost + envelope, got " + JSON.stringify(produced)).toBe(2);
    const ghost = produced.find((v) => v.field === "g1") as ComposeViolation;
    const envelope = produced.find((v) => v.field === undefined) as ComposeViolation;
    mountBench([stageWith("s_0", params)], spec);
    await openDrill();
    // PRE-PRESS SEATS: the banner voices the gate set (attr 2), the
    // lane-warn seat voices the requires word (its own law — one
    // crime, one row).
    expect(gateBanners().length, "pre-press: the banner is the one gate face").toBe(1);
    expect(gateBanners()[0]?.getAttribute("data-compose-gate"), "pre-press: banner carries ghost + envelope").toBe("2");
    expect(laneWarns().length, "pre-press: the requires word voices on the lane-warn seat").toBe(1);
    expect(laneWarns()[0]?.textContent ?? "", "pre-press: the lane-warn seat names the requires word").toContain("requires");
    await typeText("an edit so the flush has a key");
    await pressRun();
    const strip = await awaitStrip();
    expect(gateBanners().length, "the banner stands down for every carried message").toBe(0);
    expect(laneWarns().length, "the lane-warn seat keeps its own voice beside the strip").toBe(1);
    const stripText = strip.textContent ?? "";
    expect(stripText, "the strip voices the ghost").toContain(ghost.message);
    expect(stripText, "the strip voices the envelope clause").toContain(envelope.message);
    expect(namedUnstamps().length, "one named unstamp (g1); the envelope row is inert").toBe(1);
    expect(stripText, "relations never join the gate set (one-voice law)").not.toContain("requires");
    // THE ONE-VOICE LAW HOLDS (the plan letter's refutation, asserted
    // BOTH ways): the requires word never joins the strip — its seat
    // is the lane-warn row beside it (form.tsx:305-315: a relation is
    // not a gate, and routing it into the gate set would break the
    // lane seat that already owns it).
    expect(stripText, "relations never join the strip (one-voice law)").not.toContain("voice_name");
    expect(laneWarns()[0]?.textContent ?? "", "the lane-warn seat keeps the requires word").toContain("voice_name");
  });
});

describe("P0-E same-field collisions — one field, two messages; keys never collapse", () => {
  test("key law: the g2 double voices twice under distinct field:message keys", () => {
    // DERIVED: g2 is BOTH undeclared AND family-dead — same field,
    // two messages. Live identical-message/different-fields pairs
    // are unproducible (every producer clause namespaces its
    // message by field, or is a singleton), and the key format
    // (field:message, pinned by P0-B) holds no-collapse regardless.
    const spec = doubleSpecDoc();
    const params = { model: 'm', text: 'seed text', g1: 'carry one', g2: 'carry two' };
    const produced: ComposeViolation[] = composeValidate(spec, params);
    expect(produced.length, "the double doc must carry ghost g1 + ghost g2 + dead g2, got " + JSON.stringify(produced)).toBe(3);
    const g2 = produced.filter((v) => v.field === "g2");
    expect(g2.length, "g2 voices twice").toBe(2);
    expect(g2[0]?.message === g2[1]?.message, "the two g2 messages differ").toBe(false);
    const keys = produced.map((v) => (v.field ?? "") + ":" + v.message);
    expect(new Set(keys).size, "strip keys pairwise unique, got " + JSON.stringify(keys)).toBe(3);
  });

  test("rich drill: five violations, four named fields — one row each, × retires all", async () => {
    const spec = richSpecDoc();
    const params = { model: 'm', text: 'seed text', variant: 'raw', cfg: 99, width: 64, g1: 'carry one', g2: 'carry two' };
    // DERIVED: g1 ghost, g2 ghost + family-dead (SAME field, two
    // messages), envelope-outside (field-less), deliverable width.
    const produced: ComposeViolation[] = composeValidate(spec, params);
    expect(produced.length, "the rich doc must carry five gate violations, got " + JSON.stringify(produced)).toBe(5);
    const keys = produced.map((v) => (v.field ?? "") + ":" + v.message);
    expect(new Set(keys).size, "strip keys must be pairwise unique, got " + JSON.stringify(keys)).toBe(5);
    expect(new Set(produced.map((v) => v.message)).size, "no two live violations share a message").toBe(5);
    mountBench([stageWith("s_0", params)], spec);
    await openDrill();
    await typeText("an edit so the flush has a key");
    await pressRun();
    const strip = await awaitStrip();
    expect(gateBanners().length, "the banner stands down for the whole set").toBe(0);
    const stripText = strip.textContent ?? "";
    for (const v of produced) expect(stripText, "the strip voices every violation").toContain(v.message);
    // NO COLLAPSE: g2's two messages render TWO unstamps under one
    // field label (a field-only key would fold them into one row);
    // the envelope row rides the inert fifth.
    expect(namedUnstamps().length, "one named unstamp per named violation").toBe(4);
    expect(stripUnstamps().length, "four named plus the envelope inert").toBe(5);
    expect(stripUnstamps().filter((b) => b.getAttribute("aria-label") === "Unstamp 'g2'").length, "g2 voices twice, unstamps twice").toBe(2);
    // × retires the whole set; the surviving pending face keeps
    // muting its own message on the banner (the J interplay: the
    // typed write landed but the doc is still dirty, so its pending
    // row stands) — dismissing it too returns the whole set.
    fireEvent.click(stripDismiss());
    await waitFor(() => {
      if (gateStrip() !== null) throw new Error("strip still voiced");
      if (gateBanners()[0]?.getAttribute("data-compose-gate") !== "4") throw new Error("banner not settled on the four unmuted");
    }, { timeout: LOADED_WAIT() * 2 / 15 });
    expect(writeFaceEl()?.textContent ?? "", "the pending face survives the strip dismiss").toContain("g1");
    fireEvent.click(faceDismiss());
    await waitFor(() => { if (writeFaceEl() !== null) throw new Error("write face still voiced"); }, { timeout: LOADED_WAIT() * 2 / 15 });
    expect(gateBanners().length, "the banner returns after both dismisses").toBe(1);
    expect(gateBanners()[0]?.getAttribute("data-compose-gate"), "the banner carries all five again").toBe("5");
  });
});

describe("P1-F unstamp retires the whole set — shrink reds, drain heals key by key", () => {
  test("shrink law: one unstamp retires ITS field's row and leaves the survivors (2 rows), banner stays 0", async () => {
    const spec = ghostSpecDoc();
    const params = ghostParams(3);
    mountBench([stageWith("s_0", params)], spec);
    await openDrill();
    await typeText("an edit so the flush has a key");
    await pressRun();
    await awaitStrip();
    expect(stripUnstamps().length, "three ghosts, three unstamps").toBe(3);
    expect(gateBanners().length, "banner silent under the strip").toBe(0);
    fireEvent.click(unstampFor("g2"));
    // THE SHRINK LAW (the cure lands here): one row's unstamp retires
    // only its field's rows — the survivors stay voiced, so the drain
    // takes one click per ghost instead of one press per ghost. The
    // row's own bench key is nulled through the door; the WHOLE-set
    // dismiss stays the strip header's ×.
    await waitFor(() => {
      const strip = gateStrip();
      if (strip !== null && (strip.textContent ?? "").includes("'g2'")) throw new Error("g2 still voiced after its unstamp");
    }, { timeout: LOADED_WAIT() * 2 / 15 });
    await awaitNullPatch("g2");
    expect(gateStrip(), "the strip survives with its survivors").not.toBeNull();
    expect(stripUnstamps().length, "two rows remain after one unstamp").toBe(2);
    expect(gateBanners().length, "the banner stays down for the survivors").toBe(0);
  });

  test("drain: each re-press re-voices only the survivors; the cleared keys never return", async () => {
    const spec = ghostSpecDoc();
    mountBench([stageWith("s_0", ghostParams(3))], spec);
    await openDrill();
    // ONE TYPED EDIT (the press gate judges the flush — a touchless
    // press skips the gate on an empty patch and starts the run).
    // NO settle-wait: waiting lets the flush match held (sameAsHeld
    // skips the write AND the gate). The press rides in flight, as
    // the shrink arm does. A stale pending face may survive the
    // drain (its unstamp already fired) — dismissed below, never
    // asserted mid-drain.
    await typeText("an edit so the flush has a key");
    const survivors: string[][] = [["g1", "g2", "g3"], ["g2", "g3"], ["g3"]];
    for (let round = 0; round < 3; round++) {
      const fields = survivors[round] as string[];
      const cleared = ["g1", "g2", "g3"].filter((f) => !fields.includes(f));
      await pressRun();
      const strip = await awaitStrip();
      const stripText = strip.textContent ?? "";
      for (const f of fields) expect(stripText, "round " + round + ": survivor " + f + " re-voices").toContain("'" + f + "'");
      for (const f of cleared) expect(stripText, "round " + round + ": cleared " + f + " never returns").not.toContain("'" + f + "'");
      expect(stripUnstamps().length, "round " + round + ": one unstamp per survivor").toBe(fields.length);
      expect(gateBanners().length, "round " + round + ": banner silent under the strip").toBe(0);
      const clearedField = fields[0] as string;
      fireEvent.click(unstampFor(clearedField));
      // THE SHRINK LAW: only the clicked field's rows retire
      await waitFor(() => {
        const strip = gateStrip();
        if (strip !== null && (strip.textContent ?? "").includes("'" + clearedField + "'")) throw new Error("round " + round + ": " + clearedField + " still voiced");
      }, { timeout: LOADED_WAIT() * 2 / 15 });
      await awaitNullPatch(clearedField);
    }
    // THE DOC IS HEALED (every ghost nulled out of the bench): no
    // strip — and the final clean press STARTS the run with no
    // resurrection of the cleared set. A stale pending face from
    // the opening typed write may outlive its unstamp (its field
    // already fired); it is dismissed, not voiced — the faces must
    // be gone, not merely hidden.
    expect(gateStrip(), "no strip after drain-all").toBeNull();
    if (writeFaceEl() !== null) {
      fireEvent.click(faceDismiss());
      await waitFor(() => { if (writeFaceEl() !== null) throw new Error("stale face survives its dismiss"); }, { timeout: LOADED_WAIT() * 2 / 15 });
    }
    await pressRun();
    await awaitRunsStart();
    await waitFor(() => {
      if (stageWriteState(draftIdOf("bench-p"), "s_0").pending !== 0) throw new Error("press still in flight");
    }, { timeout: LOADED_WAIT() * 4 / 15 });
    if (writeFaceEl() !== null) {
      fireEvent.click(faceDismiss());
      await waitFor(() => { if (writeFaceEl() !== null) throw new Error("face re-voiced after the clean press"); }, { timeout: LOADED_WAIT() * 2 / 15 });
    }
    expect(gateStrip(), "no resurrection on re-press").toBeNull();
    expect(gateBanners().length, "no banner on re-press").toBe(0);
    expect(writeFaceEl(), "no write face on re-press").toBeNull();
  });
});

describe("P1-I cross-card isolation — ghost on A, clean B in the same test", () => {
  test("B shows no strip, no write face, no banner — no mute leakage", async () => {
    const spec = ghostSpecDoc();
    mountBench([stageWith("s_0", ghostParams(2)), stageWith("s_1", { model: 'm', text: 'clean card' })], spec);
    const tiles = document.querySelectorAll('[role="button"][class*="tileInner"]');
    expect(tiles.length, "two cards board two tiles").toBe(2);
    await openTile(0);
    await typeText("an edit so the flush has a key");
    await pressRun();
    await awaitStrip();
    expect(gateBanners().length, "A: banner silent under A's strip").toBe(0);
    // CARD B (the isolation arm): A's gateSet is per-drill state —
    // B renders with no faces at all.
    await openTile(1);
    await waitFor(() => { if (gateStrip() !== null) throw new Error("A's strip leaked onto B"); }, { timeout: LOADED_WAIT() * 2 / 15 });
    expect(gateStrip(), "B: no strip").toBeNull();
    expect(writeFaceEl(), "B: no write face").toBeNull();
    expect(gateBanners().length, "B: no banner").toBe(0);
    expect(laneWarns().length, "B: no lane warns").toBe(0);
  });
});

describe("P1-J coexistence — unlanded write voice beside the gate strip (the over-mute guard)", () => {
  async function bothFacesUp(): Promise<void> {
    const spec = ghostSpecDoc();
    mountBench([stageWith("s_0", ghostParams(2))], spec, { patchFailures: [{ reason: "typed busy" }] });
    await openDrill();
    expect(gateBanners().length, "pre-press: the banner voices the ghosts").toBe(1);
    await typeText("an edit so the flush has a key");
    // THE REFUSED TYPED WRITE: the door refuses the trailing write
    // and the ledger row voices it on the write face.
    await awaitWriteFace("THE WRITE DID NOT LAND");
    await pressRun();
    const strip = await awaitStrip();
    // THE GATE STRIP (not the fence's voice): the press judges the
    // dirty doc and refuses the ghosts — the unlanded voice would
    // read 'THE WRITE DID NOT LAND'.
    expect(strip.textContent ?? "", "the strip voices the gate refusals").toContain("THE COMPOSE GATE REFUSED");
    expect(strip.textContent ?? "", "the strip voices the ghosts").toContain("g1");
    expect(strip.textContent ?? "", "the strip is not the fence voice").not.toContain("THE WRITE DID NOT LAND");
    expect(writeFaceEl()?.textContent ?? "", "the unlanded write keeps its own row").toContain("THE WRITE DID NOT LAND");
    expect(gateBanners().length, "the banner stands down for the carried gate set").toBe(0);
  }
  test("dismissing the strip leaves the write face", async () => {
    await bothFacesUp();
    fireEvent.click(stripDismiss());
    await waitFor(() => { if (gateStrip() !== null) throw new Error("strip still voiced"); }, { timeout: LOADED_WAIT() * 2 / 15 });
    expect(writeFaceEl()?.textContent ?? "", "the write face survives the strip dismiss").toContain("THE WRITE DID NOT LAND");
  });
  test("dismissing the write face leaves the strip", async () => {
    await bothFacesUp();
    fireEvent.click(faceDismiss());
    await waitFor(() => { if (writeFaceEl() !== null) throw new Error("write face still voiced"); }, { timeout: LOADED_WAIT() * 2 / 15 });
    const strip = gateStrip();
    expect(strip, "the strip survives the write-face dismiss").not.toBeNull();
    expect(strip?.textContent ?? "", "the strip still voices the ghosts").toContain("g1");
    expect(gateBanners().length, "the banner still stands down").toBe(0);
  });
});
