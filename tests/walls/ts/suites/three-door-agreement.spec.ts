// three-door-agreement.spec.ts — THE THREE-DOOR VERDICT ACCORD,
// RE-AIMED AT THE RETIREMENT (2026-11-15).
//
// THE BURN: the operator's t4r inject-keys doc — a guided single-call
// film row carrying the post masters (interpolate_enabled,
// second_pass_enabled, sharpen_enabled, sr_switch) — was refused by
// the UI's compose mirror while the estate 200'd it: one doc, two
// verdicts, the mirror's own promise a lie on the estate's side.
//
// THE FIRST CURE (2026-11-14) made all four doors refuse the doc in
// the same voice. THE REAL CURE (2026-11-15) deleted the law those
// refusals spoke: renderH3Window's t4r arm now mounts the image-space
// post chain, so the doc the four doors used to refuse is the doc the
// engine FIRES. The accord is therefore inverted and pinned as such:
// the burn admits at ALL FOUR DOORS and composes at the run press.
// A future court that reintroduces a lane dead letter reds here.
//
// THE SURVIVING DIVISION OF LABOR (the single-window film-only
// letter, duck_depth_db): the walk-bearing estate doors — the
// lattice (flowFromBody), the validate door (composeValidateCard) and
// the run press (phase1Card) — refuse it on a t4r/t4_open doc; the
// write doors' family admission is a LANE-family seat with no field
// whitelist (h3 declares no admitFamily face any more), and the
// client mirror has no family clause left to speak, so the catch is
// the run door's walk. That asymmetry is pinned arm by arm, never
// narrated.
//
// THE INVARIANTS, each arm on its OWN path:
//   THE FOUR DOORS ADMIT THE BURN — mirror, lattice, validate, write
//   seat, and the run press composes.
//   THE THREE GREENS still admit everywhere.
//   THE VERDICTS AGREE — per body, all four refusal bits are false.
//   THE FILM-ONLY LETTER REFUSES at the walk-bearing doors, naming
//   the key; the write seat admits it BY DESIGN (a lane seat, never a
//   whitelist) and the run door is the catch.
//   THE WRITE DOORS' REAL-REGISTRY HOP — the binding over the real
//   service is present, admits the burn, and its verdict bit equals
//   the seat's per body.
//
// Run: npx vitest run tests/walls/ts/suites/three-door-agreement.spec.ts
import { describe, expect, it, beforeAll, vi } from "vitest";
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
import type { CardRegistryLike } from "../../../../packages/harness/estate-queue/src/runsValidateShared.ts";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { composeValidate } from "../../../../packages/web/card-base/src/spec.ts";
import { FAMILY_LAW, deriveWindowFamily } from "@melite/models-h3/timelineContract";
import { familyAdmissionOf } from "../../../../packages/estate/drafts/src/remote.ts";

let svc: CardRegistryService;
let cards: CardRegistryLike;

// THE VERBATIM BURN (audit repro (A), the operator's seq-77799
// voice): a keyframe-pinned single-call doc carrying the studio's
// own post stamps. The keyframes channel derives t4r through the
// DECL's own law; since the chain hoist (2026-11-15) the quartet is
// LAW on that lane and the engine fires it.
const BURN_QUARTET: Record<string, unknown> = {
  model: "h3", variant: "timeline", quant: "int8",
  keyframes: [{ image: "webp/run1/pin-0.png", frame: 0 }],
  calls: [{ text: "one shot", start_frame: 0, end_frame: 90 }],
  interpolate_enabled: true, second_pass_enabled: true,
  sharpen_enabled: true, sr_switch: true,
};
// THE SURVIVING LETTER: the film-only knob on a non-chain lane.
const FILM_ONLY_DOC: Record<string, unknown> = {
  model: "h3", variant: "timeline", quant: "int8",
  keyframes: [{ image: "webp/run1/pin-0.png", frame: 0 }],
  calls: [{ text: "one shot", start_frame: 0, end_frame: 90 }],
  duck_depth_db: -14,
};

// THE THREE LAWFUL SHAPES (each legal on its own derived lane).
const CLEAN_T4R: Record<string, unknown> = {
  model: "h3", variant: "timeline", quant: "int8",
  keyframes: [{ image: "webp/run1/pin-0.png", frame: 0 }],
  calls: [{ text: "one shot", start_frame: 0, end_frame: 90 }],
};
const CLEAN_T4_OPEN: Record<string, unknown> = {
  model: "h3", variant: "timeline", quant: "int8",
  calls: [{ text: "one shot", start_frame: 0, end_frame: 90 }],
  sr_switch: true,
};
// (the spans ride the door's own grid law — first window 22+17·4,
// carried window 17·5; an off-grid pair refuses at the grid gate,
// never at the family walk)
const CLEAN_FILM: Record<string, unknown> = {
  model: "h3", variant: "timeline", quant: "int8",
  calls: [
    { text: "one", start_frame: 0, end_frame: 90 },
    { text: "two", start_frame: 90, end_frame: 175 },
  ],
  sr_switch: true,
};
const GREENS: Array<readonly [string, Record<string, unknown>]> = [
  ["guided clean (t4r)", CLEAN_T4R],
  ["text + switch (t4_open)", CLEAN_T4_OPEN],
  ["two-call film + switch (t4_chain)", CLEAN_FILM],
];

function stageRow(params: Record<string, unknown>): Record<string, unknown> {
  return {
    id: "s_11", engine: "comfyui", card: "h3-timeline",
    params, inputs: {}, expected: {}, outputs: {},
  };
}

/** The UI mirror's family-clause verdicts (the violations that carry
 *  a field — the matrix's unknown-variant voice carries none and is
 *  this wall's rig artifact, never the judged seam). */
function mirrorFields(doc: Record<string, unknown>): Array<{ message: string; field?: string }> {
  const spec = { model: "h3", variants: [], familyLaw: FAMILY_LAW } as never;
  const out = composeValidate(spec, doc as never) as Array<{ message: string; field?: string }>;
  return out.filter((v) => v.field !== undefined);
}

function latticeRefusal(params: Record<string, unknown>): string {
  try {
    flowFromBody({ id: "three-door", stages: [stageRow(params)] }, cards, ["comfyui"]);
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  return "";
}

beforeAll(async () => {
  const ctx = new Context();
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "wall-three-door-")),
    stateRoots: [] as string[],
  };
  // The real card registry, primed from the DECL census (keyless —
  // the object_info read rides the fixture mock above).
  svc = new CardRegistryService(ctx);
  await svc.prime();
  const defs = svc.defsSync();
  cards = { defsSync: () => defs, objectInfo: () => null };
}, 120_000);

describe("the three-door verdict accord (the retired inject-keys law)", () => {
  it("THE MIRROR ADMITS THE BURN — the client gate has no lane dead letter left to speak", () => {
    // THE MIRROR'S JUDGE IS DATA: composeValidate reads the spec's
    // familyLaw deadKeys. After the retirement that map is empty, so
    // the mirror can no longer refuse a post key on ANY lane — the
    // doc the burn names is lawful, and the mirror is silent on it.
    expect(FAMILY_LAW.deadKeys, "the h3 law carries no lane dead letters").toEqual({});
    expect(mirrorFields(BURN_QUARTET), "the mirror admits the burn doc (no family refusal exists)").toEqual([]);
  });

  it("THE LATTICE ADMITS THE BURN — the estate door's walk passes the quartet on the derived t4r lane", () => {
    expect(deriveWindowFamily(BURN_QUARTET), "the burn doc derives t4r").toBe("t4r");
    expect(latticeRefusal(BURN_QUARTET), "the lattice admits the burn doc").toBe("");
  });

  it("THE VALIDATE DOOR ADMITS THE BURN — the seat behind /v1/flows/validate answers null", async () => {
    const verdict = await svc.composeValidateCard("h3-timeline", "h3", BURN_QUARTET);
    expect(verdict === null ? "admitted" : verdict.message, "the validate door admits the burn doc").toBe("admitted");
  });

  it("THE WRITE JUDGE ADMITS THE BURN — the family admission answers ok:true", () => {
    expect(svc.admitStageFamily("h3-timeline", BURN_QUARTET), "the write judge admits the burn doc").toEqual({ ok: true });
  });

  it("THE RUN PRESS FIRES THE BURN — the fourth door composes the doc and the chain lands", async () => {
    // The old wall cited the liveness rig instead of driving the run
    // press (compose needs weights). The matrix wall now drives
    // phase1Card on this exact shape; this arm is the accord's own
    // receipt that the fourth door AGREES with the other three: the
    // burn's quartet is not merely admitted, it fires.
    await expect(
      svc.phase1Card({ ...BURN_QUARTET, card: "h3-timeline" }, "h3"),
      "the run press composes the burn doc",
    ).resolves.toBeDefined();
  });

  it("THE VALIDATE DOOR ADMITS THE LAWFUL — every green shape answers null", async () => {
    for (const [name, body] of GREENS) {
      const verdict = await svc.composeValidateCard("h3-timeline", "h3", body);
      expect(verdict === null ? "admitted" : verdict.message, "the validate door admits " + name).toBe(
        "admitted",
      );
    }
  });

  it("THE MIRROR ADMITS THE LAWFUL — no field-carrying refusal on any green shape", () => {
    for (const [name, body] of GREENS) {
      expect(mirrorFields(body), "the mirror admits " + name).toEqual([]);
    }
  });

  it("THE LATTICE ADMITS THE LAWFUL — the estate door composes every green shape", () => {
    for (const [name, body] of GREENS) {
      const msg = latticeRefusal(body);
      expect(msg === "" ? "admitted" : msg, "the lattice admits " + name).toBe("admitted");
    }
  });

  it("THE WRITE JUDGE ADMITS THE LAWFUL — the family admission answers ok:true on every green shape", () => {
    for (const [name, body] of GREENS) {
      expect(svc.admitStageFamily("h3-timeline", body), "the write judge admits " + name).toEqual({
        ok: true,
      });
    }
  });

  it("THE FILM-ONLY LETTER REFUSES AT THE WALK-BEARING DOORS (the surviving division of labor)", async () => {
    expect(deriveWindowFamily(FILM_ONLY_DOC), "the letter's doc derives t4r").toBe("t4r");
    // THE LATTICE + THE VALIDATE DOOR ride the walk: both refuse BY
    // NAME. (The client mirror has no clause for it — its judge is
    // the lane dead letter, which is empty; the write seat is a
    // LANE-family seat and admits it BY DESIGN; the run press is the
    // catch, judged below.)
    expect(latticeRefusal(FILM_ONLY_DOC), "the lattice refuses the film-only letter").toContain("duck_depth_db");
    const verdict = await svc.composeValidateCard("h3-timeline", "h3", FILM_ONLY_DOC);
    expect(verdict === null ? "admitted" : verdict.message, "the validate door refuses the film-only letter")
      .toContain("duck_depth_db");
    // THE RUN PRESS IS THE CATCH (the write seat admitted it — the
    // walk owns the field, and the walk runs here).
    await expect(svc.phase1Card({ ...FILM_ONLY_DOC, card: "h3-timeline" }, "h3"),
      "the run press refuses the film-only letter").rejects.toThrow(/duck_depth_db/);
  });

  it("THE VERDICTS AGREE — per body, the four refusal bits are identical (burn and greens all admit)", async () => {
    const bits = async (body: Record<string, unknown>): Promise<readonly [boolean, boolean, boolean, boolean]> => [
      mirrorFields(body).length > 0,
      latticeRefusal(body) !== "",
      (await svc.composeValidateCard("h3-timeline", "h3", body)) !== null,
      svc.admitStageFamily("h3-timeline", body).ok === false,
    ];
    // THE RETIREMENT'S ACCORD: the burn is a LAWFUL doc — every door
    // says so. A court that re-invents a lane dead letter splits the
    // verdict here, named.
    expect(await bits(BURN_QUARTET), "the burn admits at all four doors").toEqual([false, false, false, false]);
    for (const [name, body] of GREENS) {
      expect(await bits(body), "the four doors agree on " + name).toEqual([false, false, false, false]);
    }
  });
});

// ── THE WRITE DOORS' REAL-REGISTRY HOP (round-6 LOW debt) ──────────
// remote.ts familyAdmissionOf is the bench write doors' judge, and
// its absent-seat law ADMITS SILENTLY: a registry that stops
// offering the seam un-judges add/patch/load with no red anywhere
// (the stub-side wall cannot see it — its resolver always has the
// seam). These arms bind the REAL service through the REAL binding.
describe("the write doors' real-registry hop (familyAdmissionOf over the real CardRegistryService)", () => {
  // resolverOf's contract (remote.ts:337): ctx.get("cardRegistry",
  // false) → a seat whose resolveStageParams is a function. The REAL
  // service is the seat the production context serves.
  const realCtx = { get: (name: string): unknown => (name === "cardRegistry" ? svc : undefined) } as never;

  it("THE REAL SEAT IS PRESENT — the binding over the real registry is defined (its absence is the silent admit)", () => {
    const admit = familyAdmissionOf(realCtx);
    expect(admit, "the real registry offers the family seam through the real binding — a wiring drift here un-judges every write door silently").toBeDefined();
  });

  it("THE BOUND ADMISSION ADMITS THE BURN — the hop lands the retired law's doc with no refusal", () => {
    const admit = familyAdmissionOf(realCtx);
    expect(admit).toBeDefined();
    expect(() => admit!("h3-timeline", { ...BURN_QUARTET }, undefined),
      "the write door admits the burn doc (its lane face carries no dead letters)").not.toThrow();
    // AND THE HOP'S CODE LANE IS STILL WIRED for a REAL refusal: a
    // seat that DOES refuse must ride bench/family-refusal — judged
    // against a synthetic seat, so the courier's throwing path keeps
    // its firing arm even though h3 no longer triggers it.
    const refusingCtx = {
      get: (name: string): unknown =>
        name === "cardRegistry"
          ? {
              // the binding's resolver requires the params seat; the
              // refusing arm only exercises the courier's throw path
              resolveStageParams: () => ({ ok: true }),
              admitStageFamily: () => ({ ok: false, error: "mock refusal" }),
            }
          : undefined,
    } as never;
    const refusing = familyAdmissionOf(refusingCtx);
    expect(refusing, "a refusing seat still resolves through the binding").toBeDefined();
    let thrown: (Error & { code?: unknown }) | undefined;
    try {
      refusing!("h3-timeline", { ...BURN_QUARTET }, undefined);
    } catch (e) {
      thrown = e as Error & { code?: unknown };
    }
    expect(thrown, "a refusing seat throws through the binding").toBeDefined();
    expect(thrown?.code, "the refusal rides the write door's code lane").toBe("bench/family-refusal");
    expect(thrown?.message).toContain("mock refusal");
  });

  it("THE BOUND ADMISSION ADMITS THE LAWFUL — every green shape lands without a refusal", () => {
    const admit = familyAdmissionOf(realCtx);
    expect(admit).toBeDefined();
    for (const [name, body] of GREENS) {
      expect(() => admit!("h3-timeline", { ...body }, undefined), "the write door admits " + name).not.toThrow();
    }
  });

  it("THE HOP AGREES WITH THE SEAT — the bound admission's verdict equals admitStageFamily's on burn and greens", () => {
    // The binding is a courier, never a second judge: its refusal bit
    // must equal the registry seat's own verdict bit per body (a
    // binding that filtered, reordered, or re-spelled the verdict
    // would fork the accord at the write door).
    const seatRefuses = (body: Record<string, unknown>): boolean => svc.admitStageFamily("h3-timeline", body).ok === false;
    const boundRefuses = (body: Record<string, unknown>): boolean => {
      try {
        familyAdmissionOf(realCtx)!("h3-timeline", { ...body }, undefined);
        return false;
      } catch {
        return true;
      }
    };
    expect(boundRefuses(BURN_QUARTET), "burn: seat and binding agree").toBe(seatRefuses(BURN_QUARTET));
    expect(seatRefuses(BURN_QUARTET), "the burn is admitted by the seat itself").toBe(false);
    for (const [name, body] of GREENS) {
      expect(boundRefuses(body), "green " + name + ": seat and binding agree").toBe(seatRefuses(body));
    }
  });
});
