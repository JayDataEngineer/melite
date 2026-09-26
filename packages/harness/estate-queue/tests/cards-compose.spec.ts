// cards-compose.spec.ts — the compose core's every arm: the
// closed-engine refusals, the nested stanza unwrap, the admission
// contract gate (knobs + admits + the mod surface), the compose
// refusal voices, and prepareCardParams' full refusal ladder.
// The cordis engine pieces ride a package seam (the real
// EngineContext boot composes real graphs — its own seat); the
// coordinate math (dangling sweep, selection, overlay, lift) is
// REAL, same-package.
import { describe, it, expect, vi, beforeEach } from "vitest";

const composeInFiber = vi.hoisted(() => vi.fn());
const weightChecks = vi.hoisted(() => [] as string[]);
const modFields = vi.hoisted(() => ({
  rows: [] as Array<{
    pack: string;
    families: string[];
    fields: { dict: Record<string, unknown> };
  }>,
}));
const lastComfyService = vi.hoisted(() => ({ svc: null as unknown }));

vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  class FakeEngineContext {
    comfyui: unknown = null;
    // the real cordis plugin protocol: apply receives the context
    plugin = async (p: { apply: (c: FakeEngineContext) => void }): Promise<void> => {
      p.apply(this);
    };
  }
  const FakeService = class {
    compose = composeInFiber;
    setFacts = () => undefined;
     setObjectInfo = () => undefined;
     setWeightPresent = (reader: (relativePath: string, name: string) => boolean): void => {
       weightChecks.push("models/missing", "missing");
       reader("models/missing", "missing");
     };
  };
  return {
    ...real,
    EngineContext: FakeEngineContext,
    ComfyUIService: FakeService,
    composeCards: async (ctx: { comfyui: unknown }) => {
      const svc = new FakeService();
      ctx.comfyui = svc;
      (lastComfyService as { svc: unknown }).svc = svc;
    },
    composeModPlane: async () => undefined,
    loadFacts: () => ({ models: {} }),
    liveObjectInfo: async () => ({ Node: {} }),
     theService: () => {
       if (modFields.rows.length === 0) throw new Error("not booted in this fiber");
       return { cardModFields: () => modFields.rows };
     },
     checkModelPresent: () => null,
  };
});

import { admissionRefusal, composeOnce, prepareCardParams } from "../src/cardsCompose.ts";
import { ComposeRefusal } from "@melite/comfyui-cordis";
import type { ComposeSeat } from "../src/cardsCompose.ts";
import type { CardDeclRow, ModelFactsRow } from "../src/cardsFacts.ts";

const decl: CardDeclRow = {
  skeleton: "skel",
  boarded: ["fam"],
  schemaNames: ["ckpt", "width"],
  admits: ["image_*"],
  spells: [],
};
const facts: Record<string, ModelFactsRow> = {
  fam: {
    card: "mycard",
    defaults: {},
    variants: [{ id: "base", group: "", route: "", resolver_defaults: {}, cells: [{ quant: "fp16", route: "" }] }],
  },
};
const seat = (over: Partial<ComposeSeat> = {}): ComposeSeat => ({
  cardDecls: (f?: Record<string, ModelFactsRow>) => ({ mycard: decl }),
  modelFacts: () => facts,
  modelMids: () => new Set(["fam"]),
  objectInfo: () => ({ Node: {} }),
  primeObjectInfo: async () => true,
  readsSync: () => ({ getModel: () => undefined, registryIds: () => [], registryModel: () => undefined }),
  resolveCardFamily: (mid: string) => mid,
  ...over,
} as ComposeSeat);

beforeEach(() => {
  composeInFiber.mockReset();
  composeInFiber.mockReturnValue({ ok: true });
  weightChecks.length = 0;
  modFields.rows.length = 0;
});

describe("composeOnce (the closed-engine laws)", () => {
  it("an unreachable engine refuses CLOSED (never composes blind)", async () => {
    await expect(composeOnce(seat({ primeObjectInfo: async () => false }), "mycard", "fam", {}, "r", "1"))
      .rejects.toThrow(/refusing closed/);
    expect(composeInFiber).not.toHaveBeenCalled();
  });
  it("a primed-empty object info refuses CLOSED too", async () => {
    await expect(composeOnce(seat({ objectInfo: () => null }), "mycard", "fam", {}, "r", "1"))
      .rejects.toThrow(/primed empty/);
  });
  it("arms the weight reader before the compose call", async () => {
    await composeOnce(seat(), "mycard", "fam", {}, "r", "1");
    expect(weightChecks).toEqual(["models/missing", "missing"]);
  });
  it("a params-stanza body unwraps and merges (siblings win)", async () => {
    await composeOnce(seat(), "mycard", "fam", { params: { ckpt: "a", width: 1 }, ckpt: "b" }, "r", "1");
    expect(composeInFiber).toHaveBeenCalledWith("mycard", "fam", { ckpt: "b", width: 1 }, "r");
  });
  it("a non-object params key is NOT unwrapped and NOT admitted (the surface gate refuses)", async () => {
    await expect(composeOnce(seat(), "mycard", "fam", { params: "flat", ckpt: "a" }, "r", "1"))
      .rejects.toThrow(/unknown param\(s\) on the mycard card: params/);
  });
  it("admission: knobs, exact admits, and trailing-* admits pass; unknowns refuse with the surface voice", async () => {
    await composeOnce(seat(), "mycard", "fam", { ckpt: "a", image_extra: 1 }, "r", "1");
    expect(composeInFiber).toHaveBeenCalled();
    await expect(composeOnce(seat(), "mycard", "fam", { mystery_knob: 1 }, "r", "1"))
      .rejects.toThrow(/unknown param\(s\) on the mycard card: mystery_knob/);
  });
  it("a ComposeRefusal maps through the phase voice; a plain error maps its message", async () => {
    composeInFiber.mockImplementation(() => {
      throw new ComposeRefusal("bad_skeleton", "the skeleton is bad");
    });
    await expect(composeOnce(seat(), "mycard", "fam", {}, "r", "2"))
      .rejects.toThrow(/phase 2: bad_skeleton: the skeleton is bad/);
    composeInFiber.mockImplementation(() => {
      throw new Error("plain wire error");
    });
    await expect(composeOnce(seat(), "mycard", "fam", {}, "r", "2"))
      .rejects.toThrow(/plain wire error/);
    composeInFiber.mockImplementation(() => {
      throw "raw wire failure";
    });
    await expect(composeOnce(seat(), "mycard", "fam", {}, "r", "2"))
      .rejects.toThrow(/raw wire failure/);
  });
});

describe("prepareCardParams (steps 2-6, the refusal ladder)", () => {
  it("a dangling artifact ref refuses first (fail fast)", () => {
    try {
      prepareCardParams(seat(), { deep: [{ ghost: "/v1/assets/runs/run-9/ghost.png" }] }, "fam", "1");
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/dangling artifact ref/);
    }
  });
  it("an illegal model id refuses with the identifier voice", () => {
    expect(() => prepareCardParams(seat(), {}, "NOT LEGAL", "1"))
      .toThrow(/is not a legal identifier/);
  });
  it("an unresolvable model refuses with the routes-map voice", () => {
    expect(() => prepareCardParams(seat(), {}, "ghost", "1"))
      .toThrow(/no model unit for model: ghost/);
  });
  it("a resolvable model prepares: family, card, skeleton, lifted params", () => {
    const p = prepareCardParams(seat(), { ckpt: "x", variant: "base", quant: "fp16" }, "fam", "1");
    expect(p.fam).toBe("fam");
    expect(p.card).toBe("mycard");
    expect(p.skeleton).toBe("skel");
    expect(p.params).toEqual({ ckpt: "x" });
  });
  it("a mod-pack key gets a pointed admission hint", () => {
    modFields.rows.push({
      pack: "voice",
      families: ["fam"],
      fields: { dict: { speaker: {}, style: {} } },
    });
    expect(() => admissionRefusal(seat(), "mycard", "fam", { voice: 1 }, "1"))
      .toThrow(/Mod-pack keys: 'voice'.*speaker, style/);
  });
  it("a registered card without a family row prepares family-less", () => {
    const cardless = { ...decl, skeleton: "" };
    const s = seat({
      cardDecls: () => ({ cardless }),
      modelFacts: () => ({}),
      resolveCardFamily: () => "missing",
      modelMids: () => new Set<string>(),
    });
    const p = prepareCardParams(s, { seed: 4 }, "cardless", "1");
    expect(p).toMatchObject({ mid: "cardless", fam: "", card: "cardless", skeleton: "cardless", familyless: true });
    expect(p.params).toEqual({ seed: 4 });
    const withSkeleton = { ...cardless, skeleton: "frame" };
    const s2 = seat({
      cardDecls: () => ({ cardless: withSkeleton }),
      modelFacts: () => ({}),
      resolveCardFamily: () => "missing",
      modelMids: () => new Set<string>(),
    });
    expect(prepareCardParams(s2, { seed: 5 }, "cardless", "1").skeleton).toBe("frame");
  });
  it("a mid that resolves through the mids set still prepares", () => {
    const p = prepareCardParams(seat({ resolveCardFamily: () => "fam" }), {}, "fam", "1");
    expect(p.fam).toBe("fam");
  });
});
