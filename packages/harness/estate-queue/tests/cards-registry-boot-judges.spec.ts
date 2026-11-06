// cards-registry-boot-judges.spec.ts — THE BOOT-TIME JUDGES OF
// prime() (the coverage probe's REAL GAPs, 2026-11-06: the carve
// throw and the family-law declaration throw had NO arm anywhere —
// lines the seated battery never reached either). The judges run
// inside prime() BEFORE any compose or write door, so their only
// honest seat is the boot itself: this suite drives the REAL
// CardRegistryService.prime() with the barrel's loadCardDefs and
// getModel overridden for exactly the probe rows (the decl-corners
// idiom — every other family, card, and fact stays the real
// tree's), and judges each refusal verbatim.
//
// THE ARMS:
//   carve — a def declaring the DEAD reseatFamily face refuses the
//     boot verbatim (the one-seat migration's carve: the id is
//     named, the face is named DEAD).
//   orphan — a familyLaw whose deadKeys name a lane the lanes
//     array never declares refuses (a drop keyed to a lane nobody
//     derives never fires — a law the estate refuses to serve).
//   no-lanes — an empty lanes array refuses ("no lanes declared").
//   dead-letter — a deadKeys row ON a declared lane refuses (no
//     lane dead letter may ship — deadKeys is the CROSS-family
//     carry drop, never a same-lane kill list).
//   control — the real tree, no overrides, primes green through
//     the same door (the judges are not vacuous: the tree carries
//     neither face).
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import type { FamilyLaw } from "@melite/contracts/familyLane";

const bootState = vi.hoisted(() => ({
  // the carve probe: when set, loadCardDefs gains one def carrying
  // the DEAD per-card face.
  injectReseat: false,
  // the admission probe: when set, loadCardDefs gains one def
  // declaring an admitFamily clause (the face no live card carries
  // since the lane dead-letter retirement — the seam stays lawful,
  // so its verdict passthrough stays pinned).
  injectAdmit: false,
  // the decl probe: when set, the qwen3-tts family's familyLaw is
  // replaced wholesale (the tts card boards exactly this family).
  ttsLaw: null as FamilyLaw | null,
  // the hermetic engine (the decl-corners integrity note): the boot
  // double rides the same seam, counted to prove no live dial.
  hermeticFetches: 0,
}));

const BOOT_DOC_URL = new URL(
  "../../../../tests/walls/fixtures/object_info.boot.json",
  import.meta.url,
);

vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const real = await importOriginal<typeof import("@melite/comfyui-cordis")>();
  const { readFileSync: readBootDoc } = await import("node:fs");
  return {
    ...real,
    loadCardDefs: async () => {
      // CLONE the real cache: loadCardDefs returns its module-cached
      // map, so an in-place set would poison every later boot in
      // this file (the control arm's tree must stay the real one).
      const defs = new Map(await real.loadCardDefs());
      if (bootState.injectReseat) {
        const tts = defs.get("tts");
        if (tts === undefined) throw new Error("probe precondition: the tts card def must exist");
        defs.set("carve-probe-card", {
          ...tts,
          id: "carve-probe-card",
          reseatFamily: "h3",
        } as CardDefinition);
      }
      if (bootState.injectAdmit) {
        const tts = defs.get("tts");
        if (tts === undefined) throw new Error("probe precondition: the tts card def must exist");
        defs.set("admit-probe-card", {
          ...tts,
          id: "admit-probe-card",
          admitFamily: (params: Record<string, unknown>) =>
            params["evil"] === true
              ? { ok: false, error: "probe: the evil key is family-refused" }
              : { ok: true },
        } as CardDefinition);
      }
      return defs;
    },
    // defsSync() prefers the barrel's module cache (cardDefsNow)
    // over the service's primed map, so the probe defs stay visible
    // only while this override seats the PRIMED face — null is the
    // cache's own lawful "not refreshed" value.
    cardDefsNow: () => undefined,
    getModel: (id: string) => {
      const base = real.getModel(id);
      if (id === "qwen3-tts" && bootState.ttsLaw !== null) {
        return { ...base, familyLaw: bootState.ttsLaw };
      }
      return base;
    },
    liveObjectInfo: async () => {
      bootState.hermeticFetches += 1;
      return JSON.parse(readBootDoc(BOOT_DOC_URL, "utf8")) as Record<string, unknown>;
    },
  };
});

import { CardRegistryService } from "../src/cardsRegistry.ts";
import { FlowsSeatService } from "../src/flowsData.ts";

async function bootSvc(): Promise<CardRegistryService> {
  const ctx = new Context();
  new FlowsSeatService(ctx);
  const svc = new CardRegistryService(ctx);
  await svc.prime();
  return svc;
}

/** A law whose lanes array declares one qualified lane and one
 *  fallthrough — the probe arms vary only deadKeys. */
const lawWith = (
  deadKeys: FamilyLaw["deadKeys"],
  lanes: FamilyLaw["lanes"] = [
    { lane: "single", minCalls: 2 },
    { lane: "chain" },
  ],
): FamilyLaw => ({ lanes, deadKeys });

describe("the boot-time judges (prime refuses the dead faces before any door opens)", () => {
  beforeAll(() => {
    expect(bootState.hermeticFetches).toBe(0);
  });

  it("the carve: a def declaring reseatFamily refuses the boot, naming the card and the dead face", async () => {
    bootState.injectReseat = true;
    try {
      await expect(bootSvc()).rejects.toThrow(
        /family-reseat carve violated: cards declaring reseatFamily \["carve-probe-card"\]/,
      );
      await expect(bootSvc()).rejects.toThrow(/The per-card reseat face is DEAD/);
    } finally {
      bootState.injectReseat = false;
    }
  });

  it("the decl judge: deadKeys naming an undeclared lane refuses — a drop keyed to a lane nobody derives never fires", async () => {
    bootState.ttsLaw = lawWith({ t4_chain: ["ref_images"] });
    try {
      await expect(bootSvc()).rejects.toThrow(
        /family-law declaration violated: qwen3-tts: deadKeys names undeclared lanes \["t4_chain"\]/,
      );
    } finally {
      bootState.ttsLaw = null;
    }
  });

  it("the decl judge: an empty lanes array refuses (no lanes declared)", async () => {
    bootState.ttsLaw = lawWith({}, []);
    try {
      await expect(bootSvc()).rejects.toThrow(/qwen3-tts: no lanes declared/);
    } finally {
      bootState.ttsLaw = null;
    }
  });

  it("the decl judge: a deadKeys row on a DECLARED lane refuses (no lane dead letter may ship)", async () => {
    bootState.ttsLaw = lawWith({ single: ["guide_images"] });
    try {
      await expect(bootSvc()).rejects.toThrow(
        /lane single declares dead keys \["guide_images"\] — no lane dead letter may ship/,
      );
    } finally {
      bootState.ttsLaw = null;
    }
  });

  it("the control: the real tree, no probe rows, primes green through the same door", async () => {
    const svc = await bootSvc();
    expect(svc.defsSync().size).toBeGreaterThan(0);
    // the boot's object-info prime rode the hermetic double (the
    // decl-corners integrity law): the fetches counted, never dialed.
    expect(bootState.hermeticFetches).toBeGreaterThan(0);
  });
});

describe("the family admission seat (admitStageFamily's verdict passthrough)", () => {
  // No live card declares the admitFamily face (the lane dead-letter
  // retirement retired h3's, the last declarer) — the seam stays
  // lawful for the next declarer, so its contract stays pinned here:
  // the clause's verdict rides VERBATIM (never re-voiced), and a
  // def without the face is an honest no-op on the same seat.
  let svc: CardRegistryService;
  beforeAll(async () => {
    bootState.injectAdmit = true;
    try {
      svc = await bootSvc();
    } finally {
      bootState.injectAdmit = false;
    }
  });

  it("a def declaring the face returns its refusing verdict verbatim", () => {
    expect(svc.admitStageFamily("admit-probe-card", { evil: true, text: "speak" })).toEqual({
      ok: false,
      error: "probe: the evil key is family-refused",
    });
  });

  it("the same face's admitting verdict rides the seat untouched", () => {
    expect(svc.admitStageFamily("admit-probe-card", { text: "speak" })).toEqual({ ok: true });
  });

  it("a def without the face is an honest no-op — every real card today", () => {
    expect(svc.admitStageFamily("tts", { whatever: "unjudged" })).toEqual({ ok: true });
  });

  it("a card the registry never seated is a no-op, never a throw", () => {
    expect(svc.admitStageFamily("no-such-card", { evil: true })).toEqual({ ok: true });
  });
});
