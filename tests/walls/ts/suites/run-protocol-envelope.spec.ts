// run-protocol-envelope.spec.ts — THE RUN-PROTOCOL ENVELOPE CONTRACT
// (the contract-depth red, 2026-10-24: the live :3088 Run press
// refused "unknown param(s) on the image-edit card: press_key"
// while the ENTIRE suite was green).
//
// WHY THE SUITE WAS GREEN: every GUI press mints a press_key onto
// the start doc (card-base runs-policy, the N-E1 retry-dedup), but
// every card-arm wall stubbed phase1Card with a fake that bypasses
// the real admission — no wall drove a protocol-key-carrying body
// through prepareCardParams + admissionRefusal against a REAL card
// declaration. The green was the stub's, not the door's.
//
// THE CONTRACT, three arms:
//   1. LIFT — the run body's protocol keys (the submit door's own
//      vocabulary) NEVER reach a card's lifted params;
//   2. ADMISSION — the real image-edit card (the card the live red
//      named) admits a full protocol-bearing body clean, the exact
//      shape the GUI presses;
//   3. THE SWEEP — every top-level key the submit door READS off
//      the body is registered in CARD_ENVELOPE_KEYS, so the NEXT
//      protocol key added to the door without envelope registration
//      reds HERE, at the wall, not on the operator's lane.
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { liftCardParams } from "../../../../packages/harness/estate-queue/src/cardsVariant.ts";
import { CARD_ENVELOPE_KEYS } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { prepareCardParams } from "../../../../packages/harness/estate-queue/src/cardsCompose.ts";
import type { ComposeSeat } from "../../../../packages/harness/estate-queue/src/cardsCompose.ts";
import { deriveDecls } from "../../../../packages/harness/estate-queue/src/cardsFacts.ts";
import type { ModelFactsRow } from "../../../../packages/harness/estate-queue/src/cardsFacts.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";

const QUEUE_SUBMIT_SRC = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "harness", "estate-queue", "src", "queueSubmit.ts",
);
const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);

/** The submit door's protocol vocabulary, pinned by the sweep arm:
 * every key the door reads off the START BODY (its validated and
 * dispatched coordinates). These select the run and name the press;
 * they are door vocabulary, never card knobs. */
const SUBMIT_BODY_KEYS = [
  "test",
  "draft_id",
  "press_key",
] as const;

describe("the run-protocol envelope (the press_key live red's wall)", () => {
  it("the submit door's own body keys all lift OUT of a card's params", () => {
    // A body shaped like a real GUI press: the protocol coordinates
    // beside a genuine knob stanza.
    const body: Record<string, unknown> = {
      draft_id: "d1",
      test: false,
      press_key: "press-aaaa-bbbb-cccc",
      model: "image-edit",
      params: { input_image: "/v1/assets/probe.png" },
    };
    const lifted = liftCardParams(body);
    for (const k of SUBMIT_BODY_KEYS) {
      assert.ok(!(k in lifted), `protocol key '${k}' must never ride a card's params`);
    }
    // the knobs themselves ride — the lift strips ONLY the envelope
    assert.ok("input_image" in lifted, "the stanza's knobs still ride");
  });

  it("the real image-edit card admits a full protocol-bearing press body", async () => {
    // THE LIVE SHAPE (runs-policy presses exactly this against the
    // card arm): real declaration, real refusal gate, real knob.
    // Pre-fix this threw the live voice — "unknown param(s) on the
    // image-edit card: press_key" — the wall bites on the class.
    const defs = await loadCardDefs();
    assert.ok(defs.has("image-edit"), "the image-edit card is registered");
    const fam = [...defs.get("image-edit")!.boarded][0];
    const factsRows = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel }).models;
    const seat: ComposeSeat = {
      // the REAL projection — real defs x real facts rows, the same
      // deriveDecls the registry serves (the live admission surface)
      cardDecls: () => deriveDecls(defs, factsRows as unknown as Record<string, ModelFactsRow>),
      modelFacts: () => factsRows as unknown as Record<string, ModelFactsRow>,
      modelMids: () => new Set<string>([fam]),
      resolveCardFamily: (mid: string) => (getModel(mid) !== undefined ? mid : fam),
      objectInfo: () => ({}),
      stateRoots: () => [],
    } as ComposeSeat;
    const body: Record<string, unknown> = {
      draft_id: "d1",
      test: false,
      press_key: "press-aaaa-bbbb-cccc",
      model: fam,
      params: {},
    };
    // the refusal ladder runs to the admission gate; the envelope
    // keys are stripped before any card sees them. THE SHAPE IS THE
    // PROOF (the hunt's tautology cure, 2026-10-12): `prep.card !==
    // undefined || prep.card === undefined` could never fail — a
    // non-throwing refusal-object regression stayed green through
    // it. The success shape asserts POSITIVELY: a real card id, the
    // family resolved, and the envelope keys lifted off the params.
    const prep = prepareCardParams(seat, body, fam, "1");
    assert.ok(prep.card !== undefined && prep.card !== "", "prepare resolved a real card (never a silent refusal object)");
    assert.equal(prep.fam, fam, "the family resolved to the boarded atom");
    for (const k of SUBMIT_BODY_KEYS) {
      assert.ok(!(k in prep.params), `protocol key '${k}' never rides the prepared card's params`);
    }
  });

  it("THE SWEEP: every key the submit door reads off the body is envelope-registered", () => {
    // The class contract: the submit door is the one place protocol
    // keys are born onto the run body. Read ITS source, extract
    // every body["…"] access, and demand each sits in
    // CARD_ENVELOPE_KEYS — a new door key without envelope
    // registration reds here before it ever reds on the lane.
    const src = readFileSync(QUEUE_SUBMIT_SRC, "utf8");
    const reads = new Set<string>();
    for (const m of src.matchAll(/body\[["']([\w-]+)["']\]/g)) reads.add(m[1]);
    assert.ok(reads.size > 0, "the sweep found the door's body reads");
    const unregistered = [...reads].filter((k) => !CARD_ENVELOPE_KEYS.includes(k) && k !== "params");
    assert.deepEqual(
      unregistered,
      [],
      "submit-door body keys with no CARD_ENVELOPE_KEYS registration — they would ride a " +
      "card's admission as unknown params (register them beside draft_id/test/service): " +
      unregistered.join(", "),
    );
  });
});
