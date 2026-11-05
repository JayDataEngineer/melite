// connect-kind-vocabulary.spec.ts — THE CONNECT KIND VOCABULARY WALL
// (F48, the unkindable wire, operator sweep 2026-11-01).
//
// THE BURN: h3's ref_audios port declares kind `audio_list` (the
// naming law's bus: audio_list ← audio), but the connect door's Kind
// vocabulary carried the nine singulars only — every spelling of the
// tts→film conditioning wire refused:
//
//   stated `audio_list` →  `stage[1] expected "ref_audios":
//     "audio_list" is not a Kind — the closed vocabulary is
//     ["text","image","video","audio","mesh","num","lora","seg","data"]`
//     (runsValidateInline inlineKind, at every flow door's parse)
//   stated `audio`     →  the card-contradiction sweep: `expected kind
//     "audio" contradicts card "h3-timeline" (the card declares
//     "audio_list")` (runsValidateStages kindsOk)
//   no kind            →  the fold's hand-written voice enumerated the
//     singulars only (and had already dropped `data`) — the agent
//     could not even learn the list spellings existed.
//
// GAPS-20's landed soundtrack law was blocked at the wire door. THE
// CURE: the three contracted `_list` seats joined KIND_VOCAB (the
// naming law's edge set — contract-law's LAW 9 pin is the same closed
// set), the runsValidate facade exports the vocabulary, and the fold's
// teaching voice DERIVES from it (the hand copy is dead). The DECL
// stays a list: h3's ref_audios is an array seat (cap 3, per-producer
// window stamps ref_audio_i) — the seat accumulates producers, so
// growing the vocabulary, not singularizing the port, was the TRUE
// cure. The enforcer and every voice now enumerate one closed set.
//
// THE INVARIANTS, arms on their OWN paths:
//
//   THE DECL IS THE TRUTH — the real booted defs: h3-timeline's
//   ref_audios reads audio_list, tts's default output reads audio.
//   Flipping the DECL to singular reds this arm and forces the cure
//   decision to be re-made.
//
//   W-1 (2026-11-05): the ad-hoc fold face (foldConnects) is DELETED
//   with the hatch it served — the wall's stated-kind and derivation
//   arms ride the surviving BENCH face (flowFromBody over the real
//   defs): a stated audio_list composes (and a hand-written expected
//   audio_list — the h3-timeline tool doc teaches hand-written
//   expected kinds for wired rows, that teaching must not be a trap
//   on a declared list port); an unstated kind derives from the
//   card's own port declaration and the list law admits the singular
//   producer.
//
//   THE SINGULAR LIE REFUSES — `audio` stated against the declared
//   audio_list still refuses in the sweep's own voice: the cure grew
//   the vocabulary, it never weakened the DECL-contradiction guard.
//
//   THE ENFORCER'S VOICE DERIVES — inlineKind refuses a non-member
//   naming exactly the closed set (the deleted fold's no-kind voice
//   enumerated the same SSOT; the hatch is gone, the voice judge
//   stays). A reintroduced hand copy reds this arm; a vocabulary
//   leak ('audio_lists') reds it too.
//
//   THE BENCH LANE STAYS OPEN — rows WITHOUT expected compose through
//   kindsOk's card-ports derivation + the list law: the pre-existing
//   open lane, pinned so the cure cannot regress it.
//
//   THE VOICES HALF (F48's one-word cure, 2026-11-14): tts's `voices`
//   channel — the persisted .qvoice set a save-on run publishes —
//   declared kind `voice`, a spelling NO door carries (KIND_VOCAB
//   refuses it at the inline gate; the contradiction sweep refuses
//   every other spelling against the DECL). The cure is one word:
//   `voices: 'audio_list'` — the channel feeds a list seat, so it
//   declares the list kind. THE VOICES WIRE LANDS pins the full wire
//   (`voice.voices` → `film.ref_audios`) on both faces; THE
//   REGISTRATION JUDGE is the census the wire doors assume: every
//   real def's declared port kind (inputs, outputs, legacyAliases)
//   lives inside KIND_VOCAB — a def outside it is a port no door can
//   wire, caught at registration, never at the operator's wire.
//
// Red-proofs (§5, hands off the target files): revert the three
// `_list` rows in KIND_VOCAB (runsValidateShared.ts) → THE WIRE LANDS
// reds verbatim with the `is not a Kind — the closed vocabulary is
// [...nine singulars]` refusal (the stated-kind bench face and the
// enforcer's voice). THE SINGULAR LIE REFUSES and the two DECL/lane
// arms stay green — each guards a different invariant on its own
// path. For the voices half: flip tts's DECL back to
// `voices: 'voice'` (packages/audio/tts/src/card.ts) → THE DECL IS
// THE TRUTH reds on the voices pin, THE VOICES WIRE LANDS reds in
// the sweep's voice (`expected audio_list, got voice`), and THE
// REGISTRATION JUDGE reds naming tts.outputs.voices — one toggle,
// three arms, each on its own path. Restore → green.
//
// Run: npx vitest run tests/walls/ts/suites/connect-kind-vocabulary.spec.ts
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";

// THE HERMETIC ENGINE (the walls' boot-fixture idiom): the registry
// primes object_info from the boot fixture — the live engine on a dev
// box must never decide a wall's verdict.
const oiFixture = vi.hoisted(() => ({
  censusFn: vi.fn(async (): Promise<Record<string, unknown>> => {
    return JSON.parse(
      readFileSync(new URL("../../fixtures/object_info.boot.json", import.meta.url), "utf8"),
    ) as Record<string, unknown>;
  }),
}));
vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const real = await importOriginal<typeof import("@melite/comfyui-cordis")>();
  return { ...real, liveObjectInfo: oiFixture.censusFn };
});

import { flowFromBody } from "../../../../packages/harness/estate-queue/src/runsValidateStages.ts";
import { inlineKind } from "../../../../packages/harness/estate-queue/src/runsValidateInline.ts";
import { KIND_VOCAB } from "@melite/estate-queue";
import type { CardRegistryLike } from "../../../../packages/harness/estate-queue/src/runsValidateShared.ts";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";

let cards: CardRegistryLike;
let defs: Map<string, never>;

function midFor(card: string): string {
  const d = defs.get(card) as unknown as { boarded?: readonly string[] } | undefined;
  const boards = d?.boarded ?? [];
  expect(boards.length > 0, `the wall's ${card} boards a family`).toBe(true);
  return boards[0] as string;
}

/** The bench-shaped body: two card rows with the wire stated on the
 *  row (the rewire door's landing shape), expected as given.
 *  `fromOutput` selects the producer channel (`default` the preview
 *  flac, `voices` the persisted .qvoice set — F48's one-word cure
 *  rides the latter). W-1 deleted the ad-hoc fold face this wall's
 *  early arms rode; the bench face is the surviving connect door. */
function benchBody(expected: Record<string, string>, fromOutput = "default"): Record<string, unknown> {
  return {
    id: "unkindable-bench",
    stages: [
      {
        id: "voice", engine: "comfyui", card: "tts",
        params: { model: midFor("tts") },
        inputs: {}, expected: {}, outputs: {},
      },
      {
        id: "film", engine: "comfyui", card: "h3-timeline",
        params: { model: midFor("h3-timeline") },
        inputs: { ref_audios: { stage: "voice", output: fromOutput } },
        expected, outputs: {},
      },
    ],
  };
}

function refused(body: Record<string, unknown>): string {
  try {
    flowFromBody(body, cards, ["comfyui"]);
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  return "";
}

beforeAll(async () => {
  const ctx = new Context();
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "wall-connect-kind-")),
    stateRoots: [] as string[],
  };
  // The real card registry, primed from the DECL census (keyless —
  // the object_info read rides the fixture mock above).
  new CardRegistryService(ctx);
  await (ctx.cardRegistry as unknown as { prime(): Promise<void> }).prime();
  defs = (ctx.cardRegistry as unknown as { defsSync: () => Map<string, never> }).defsSync();
  cards = { defsSync: () => defs, objectInfo: () => null };
}, 120_000);

afterAll(async () => {
  // no fiber to dispose — the wall Context never started a timer
});

describe("the connect Kind vocabulary (F48: the unkindable wire)", () => {
  it("THE DECL IS THE TRUTH — the ports read the list shapes the wire must state", () => {
    const h3 = defs.get("h3-timeline") as unknown as { flowKinds: { inputs: Record<string, string> } };
    const tts = defs.get("tts") as unknown as { flowKinds: { outputs: Record<string, string> } };
    expect(h3.flowKinds.inputs["ref_audios"], "the film's soundtrack port declares the list kind").toBe("audio_list");
    expect(tts.flowKinds.outputs["default"], "the voice producer declares the singular kind").toBe("audio");
    expect(tts.flowKinds.outputs["voices"], "the voices channel declares the LIST kind (F48's one-word cure, 2026-11-14 — `voice` was a kind no wire door carries)").toBe("audio_list");
  });

  it("THE VOICES WIRE LANDS — the .qvoice set composes into the film's soundtrack seat (the derived bench face)", () => {
    // W-1 deleted the ad-hoc fold face; the voices wire rides the
    // surviving bench face with NO stated kind — the derivation takes
    // the card's own audio_list and the list law admits the singular
    // producer, the same admission the stated-kind arm pins.
    expect(() => flowFromBody(benchBody({}, "voices"), cards, ["comfyui"])).not.toThrow();
    const flow = flowFromBody(benchBody({ ref_audios: "audio_list" }, "voices"), cards, ["comfyui"]);
    const film = flow.stages[1] as unknown as {
      expected: Array<{ name: string; kind: string }>;
      inputs: Array<{ name: string; edge: unknown }>;
    };
    expect(film.expected).toContainEqual({ name: "ref_audios", kind: "audio_list" });
    expect(film.inputs).toContainEqual({
      name: "ref_audios",
      edge: { kind: "stage", stage: "voice", output: "voices" },
    });
  });

  it("THE VOICES WIRE LANDS ON THE BENCH FACE — the hand-written expected list kind composes off the voices channel", () => {
    expect(() => flowFromBody(benchBody({ ref_audios: "audio_list" }, "voices"), cards, ["comfyui"])).not.toThrow();
  });

  it("THE REGISTRATION JUDGE — every real def's declared port kinds live in the closed vocabulary", () => {
    // The census the wire doors assume: KIND_VOCAB is the closed set
    // every door (inlineKind, kindsOk's contradiction sweep, the
    // fold's teaching voice) enumerates, so a def declaring a kind
    // outside it is a port NO door can wire — the F48 shape itself
    // (`voices: 'voice'` was exactly this row before the cure).
    let judged = 0;
    for (const [id, def] of defs) {
      const fk = (def as unknown as {
        flowKinds?: {
          inputs?: Record<string, unknown>;
          outputs?: Record<string, unknown>;
          legacyAliases?: Record<string, unknown>;
        };
      }).flowKinds;
      if (fk === undefined) continue;
      const tables: Array<readonly [string, Record<string, unknown> | undefined]> = [
        ["inputs", fk.inputs],
        ["outputs", fk.outputs],
        ["legacyAliases", fk.legacyAliases],
      ];
      for (const [table, rows] of tables) {
        for (const [port, kind] of Object.entries(rows ?? {})) {
          if (typeof kind !== "string") continue;
          judged++;
          expect(
            KIND_VOCAB.includes(kind),
            id + "." + table + "." + port + " declares " + JSON.stringify(kind) + " — outside the closed Kind vocabulary every wire door enumerates (a port no door can wire)",
          ).toBe(true);
        }
      }
    }
    // floor: the census judged the real tree, not a vacuous empty walk
    expect(judged, "the judge swept the booted defs' port tables").toBeGreaterThan(20);
  });

  it("THE WIRE LANDS ON THE BENCH FACE — the hand-written expected list kind composes", () => {
    expect(() => flowFromBody(benchBody({ ref_audios: "audio_list" }), cards, ["comfyui"])).not.toThrow();
  });

  it("THE SINGULAR LIE REFUSES — the sweep keeps guarding the DECL's own voice", () => {
    const msg = refused(benchBody({ ref_audios: "audio" }));
    expect(msg).toContain("contradicts card");
    expect(msg).toContain("audio_list");
  });

  it("THE ENFORCER'S CLOSURE — a non-member refuses naming the same set", () => {
    let msg = "";
    try {
      inlineKind("closure-probe", "audio_lists");
    } catch (e) {
      msg = e instanceof Error ? e.message : String(e);
    }
    expect(msg).toContain("is not a Kind");
    expect(msg).toContain(JSON.stringify([...KIND_VOCAB]));
  });

  it("THE BENCH LANE STAYS OPEN — the derivation arm composes without any stated kind", () => {
    expect(() => flowFromBody(benchBody({}), cards, ["comfyui"])).not.toThrow();
  });

  it("THE DERIVATION IS IN FORCE — an unstated kind takes the CARD's declared kind (the singular producer lands on the list seat)", () => {
    // The bench face states the wire but no kind; the walk fills the
    // kind from the card's own port declaration (the derivation law's
    // effectiveExpected), and ONLY THEN does the list law admit a
    // singular `audio` producer into the declared `audio_list` seat.
    // Silence would refuse this row as "wired but untyped" — the
    // admission IS the derivation's proof.
    expect(() => flowFromBody(benchBody({}, "default"), cards, ["comfyui"])).not.toThrow();
  });

  it("THE DERIVATION IS NOT AMNESTY — an unstated kind on a port the card never declares refuses 'wired but untyped'", () => {
    const body = {
      id: "unkindable-undeclared",
      stages: [
        { id: "voice", engine: "comfyui", card: "tts", params: { model: midFor("tts") }, inputs: {}, expected: {}, outputs: {} },
        {
          id: "film", engine: "comfyui", card: "h3-timeline", params: { model: midFor("h3-timeline") },
          // ref_audiosXX is no declared film port — no card kind exists
          // to derive, so the row stays untyped and the mismatch is LOUD
          inputs: { ref_audiosXX: { stage: "voice", output: "voices" } },
          expected: {}, outputs: {},
        },
      ],
    };
    const msg = refused(body);
    expect(msg, "the undeclared port refuses in the walk's teaching voice").toContain("inputs/expected mismatch");
    expect(msg, "the voice names the untyped wire").toContain("wired but untyped");
    expect(msg, "the voice names the offending port").toContain("ref_audiosXX");
  });
});
