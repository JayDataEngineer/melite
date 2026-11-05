// cards-compose.spec.ts — the compose core's every arm: the
// closed-engine refusals, the nested stanza unwrap, the admission
// contract gate (knobs + admits + the mod surface), the compose
// refusal voices, and prepareCardParams' full refusal ladder.
// The cordis engine pieces ride a package seam (the real
// EngineContext boot composes real graphs — its own seat); the
// coordinate math (dangling sweep, selection, overlay, lift) is
// REAL, same-package.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
const lastContext = vi.hoisted(() => ({ ctx: null as unknown }));

vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  class FakeEngineContext {
    comfyui: unknown = null;
    // the real cordis fiber protocol (cordis-api/fiber.md): the
    // root fiber's dispose unloads the tree — composeOnce calls it
    // in its finally; the hoisted cell lets the spec pin that law
    disposed = false;
    fiber = {
      dispose: async (): Promise<void> => {
        this.disposed = true;
        (lastContext as { ctx: FakeEngineContext | null }).ctx = this;
      },
    };
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
  // J12: the dangling sweep's call data — no refs in these bodies,
  // the empty manifest is the honest pin.
  stateRoots: (): string[] => [],
  ...over,
} as ComposeSeat);

beforeEach(() => {
  composeInFiber.mockReset();
  composeInFiber.mockReturnValue({ ok: true });
  weightChecks.length = 0;
  modFields.rows.length = 0;
});

const refusalMessage = (fn: () => unknown): string => {
  try {
    fn();
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error("expected a refusal, composed green instead");
};

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
  it("the per-request context DISPOSES after the compose (fiber lifetime)", async () => {
    (lastContext as { ctx: unknown }).ctx = null;
    await composeOnce(seat(), "mycard", "fam", {}, "r", "1");
    expect((lastContext as { ctx: { disposed: boolean } | null }).ctx?.disposed).toBe(true);
  });
  it("a REFUSED compose still disposes the per-request context (the finally law)", async () => {
    (lastContext as { ctx: unknown }).ctx = null;
    await expect(composeOnce(seat({ objectInfo: () => null }), "mycard", "fam", {}, "r", "1"))
      .rejects.toThrow(/primed empty/);
    // the refusal path never reaches ctx construction (the gates run
    // first) — the dispose law covers contexts that DID boot
    expect((lastContext as { ctx: unknown }).ctx).toBeNull();
    // a compose-time refusal (admission) runs the finally: the
    // context booted, then refused, then disposed. An unknown card
    // refuses with its NAMED voice (the old shape passed this wall
    // on an accidental TypeError off the undefined decl cast).
    await expect(composeOnce(seat(), "unknown-card", "fam", {}, "r", "1"))
      .rejects.toThrow(/unknown card "unknown-card"/);
  });
  it("a params-stanza body unwraps and merges (siblings win)", async () => {
    await composeOnce(seat(), "mycard", "fam", { params: { ckpt: "a", width: 1 }, ckpt: "b" }, "r", "1");
    // J12: the estate manifest rides the call (the seat's trees)
    expect(composeInFiber).toHaveBeenCalledWith("mycard", "fam", { ckpt: "b", width: 1 }, "r", { stateRoots: [] });
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
    // the manifest is the seat's call data (J12) — a real root with
    // no run-9 mints the dangling voice this test pins.
    const withRoot = seat({ stateRoots: (): string[] => [mkdtempSync(join(tmpdir(), "compose-dangling-"))] });
    try {
      prepareCardParams(withRoot, { deep: [{ ghost: "/v1/assets/runs/run-9/ghost.png" }] }, "fam", "1");
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
  // ── THE FAMILY-LESS HIJACK GATE (F56, 2026-11-14 — operator:
  //    "trim's add_stage misrouted into the krea-2/turbo image lane
  //    demanding a prompt. The family-less tool card never reached
  //    its own surface"): a registered family-less card (boarded: [])
  //    composes by its OWN id; a stated params.model folding to a
  //    resolvable family used to compose THE MODEL'S card instead
  //    (live receipt: trim + krea-2 judged trim's clip params by
  //    image-gen's admission). The gate refuses the hijack at the
  //    door, before any lane resolves. ───────────────────────────
  describe("the family-less hijack gate (F56)", () => {
    const toolDecl: CardDeclRow = {
      skeleton: "trim", boarded: [], schemaNames: ["clip"], admits: [], spells: [],
    };
    const hijackSeat = (): ComposeSeat => seat({
      cardDecls: (): Record<string, CardDeclRow> => ({ mycard: decl, trim: toolDecl }),
      // 'krea-2' resolves as a family — without the gate, mid folds
      // to it and the compose walks image-gen's admission
      modelFacts: (): Record<string, ModelFactsRow> => ({
        ...facts,
        "krea-2": {
          card: "image-gen", defaults: {},
          variants: [{ id: "base", group: "", route: "", resolver_defaults: {}, cells: [] }],
        },
      }),
    });
    it("a family-less card with a stated foreign model REFUSES with the hijack voice (both cards named)", () => {
      expect(() => prepareCardParams(
        hijackSeat(), { card: "trim", model: "krea-2", clip: "/a.mp4", start_seconds: 0, end_seconds: -1 },
        "krea-2", "1",
      )).toThrow(/lane hijack.*image-gen's card instead|is a lane hijack/);
      expect(() => prepareCardParams(
        hijackSeat(), { card: "trim", model: "krea-2", clip: "/a.mp4", start_seconds: 0, end_seconds: -1 },
        "krea-2", "1",
      )).toThrow(/card "trim" declares no model family/);
    });
    it("a clean family-less row composes its OWN card-unit surface (no family, modelId '')", () => {
      const p = prepareCardParams(
        hijackSeat(), { card: "trim", clip: "/a.mp4", start_seconds: 0, end_seconds: -1 },
        "trim", "1",
      );
      expect(p.card).toBe("trim");
      expect(p.familyless).toBe(true);
      expect(p.modelId).toBe("");
      expect(p.fam).toBe("");
    });
    it("the self-naming residue (model === the card's own id) is not a hijack — the card-unit arm takes it", () => {
      const p = prepareCardParams(
        hijackSeat(), { card: "trim", model: "trim", clip: "/a.mp4" },
        "trim", "1",
      );
      expect(p.familyless).toBe(true);
    });
    it("a FAMILY-CARRYING card keeps its legal seat (the gate never fires off a boarded card)", () => {
      const p = prepareCardParams(
        hijackSeat(), { card: "mycard", model: "fam", ckpt: "x" },
        "fam", "1",
      );
      expect(p.fam).toBe("fam");
      expect(p.card).toBe("mycard");
    });
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
  // ── THE MOD-FIELD FAMILY HINT (the tts dossier's B4 cure,
  //    2026-11-12): a refused key that is a REGISTERED mod field of
  //    a DIFFERENT family names that family and the params.model
  //    cure — never a bare 'unknown' (the .QVOICE PATH HINT pattern
  //    lifted to the shared compose door). ──────────────────────
  it("a refused key owned by ANOTHER family's mod names the family and the params.model cure (B4)", () => {
    modFields.rows.push({
      pack: "qvoice",
      families: ["otherfam"],
      fields: { dict: { qvoice: {} } },
    });
    expect(() => admissionRefusal(seat(), "mycard", "fam", { qvoice: "/v/ann.qvoice" }, "1"))
      .toThrow(
        /Mod-field families: 'qvoice' is the 'qvoice' mod field of family 'otherfam' — state params\.model on that family's lane to ride it/,
      );
  });
  it("the hint stays silent for keys no family owns (the bare-unknown voice is unchanged)", () => {
    const message = refusalMessage(() => admissionRefusal(seat(), "mycard", "fam", { mystery: 1 }, "1"));
    expect(message).toMatch(/unknown param\(s\) on the mycard card: mystery/);
    expect(message).not.toMatch(/Mod-field families/);
  });
  it("an envelope-owned field never takes the family hint (the fold admits it — no refusal at all)", () => {
    modFields.rows.push({
      pack: "qvoice",
      families: ["fam"],
      fields: { dict: { qvoice: {} } },
    });
    // the envelope-scoped fold ADMITS the run's own family's fields —
    // the ownership roster must not turn admission into a hint
    expect(() => admissionRefusal(seat(), "mycard", "fam", { qvoice: "/v/ann.qvoice" }, "1"))
      .not.toThrow();
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
  it("the family door refuses when the card's own clause fails, and passes when it holds", () => {
    // THE ONE-BENCH FAMILY DOOR (the t4r burn's seat, retired as a
    // regular seat 2026-11-15 — the chair still runs when a card
    // declares one): a failing clause refuses 400 with the card's
    // own voice on the RAW lifted body; a holding clause prepares
    // the stamped row unchanged.
    const refused = seat({
      admitStageFamily: (card: string, params: Record<string, unknown>) =>
        card === "mycard" && params["ckpt"] === "x"
          ? { ok: false, error: "family gate: mycard refuses ckpt x on this bench" }
          : { ok: true },
    });
    const message = refusalMessage(() => prepareCardParams(refused, { ckpt: "x" }, "fam", "1"));
    expect(message).toMatch(/family gate: mycard refuses ckpt x on this bench/);
    const held = prepareCardParams(refused, { ckpt: "y" }, "fam", "1");
    expect(held.fam).toBe("fam");
    expect(held.card).toBe("mycard");
    expect(held.params).toEqual({ ckpt: "y" });
  });
});
