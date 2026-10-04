// cards-registry-decl-corners.spec.ts — the model-less draft
// verdict's BOUNDS INTERSECTION and its primitive relation row,
// driven through the facts derivation seam: the real tree declares
// bounds on exactly one family (qwen-img-edit-21), so the tails of
// the intersection (field delete, inverted delete, infinite ends,
// the no-bounds break) never fire there. This suite overrides
// registryModel/getModel for the two qwen3 families ONLY — every
// other family, card, and fact stays the real tree's.
import { beforeAll, describe, it, expect, vi } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../src/cardsRegistry.ts";

const declState = vi.hoisted(() => ({
  ttsBounds: null as Record<string, { min?: number; max?: number }> | null,
  vdBounds: null as Record<string, { min?: number; max?: number }> | null,
  primitiveConflictsRow: false,
}));

vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const real =
    await importOriginal<typeof import("@melite/comfyui-cordis")>();
  return {
    ...real,
    getModel: (id: string) => {
      const base = real.getModel(id);
      if (id === "qwen3-tts") {
        return {
          ...base,
          ...(declState.ttsBounds !== null ? { bounds: declState.ttsBounds } : {}),
          ...(declState.primitiveConflictsRow
            ? {
              relations: {
                ...base.relations,
                conflicts: [...(base.relations?.conflicts ?? []), 7],
              },
            }
            : {}),
        };
      }
      if (id === "qwen3-tts-voicedesign" && declState.vdBounds !== null) {
        return { ...base, bounds: declState.vdBounds };
      }
      return base;
    },
  };
});

async function bootSvc(): Promise<CardRegistryService> {
  const ctx = new Context();
  const svc = new CardRegistryService(ctx);
  await svc.prime();
  return svc;
}

// The model-less draft verdict intersects the declaring families'
// spans per field. Two families board the tts card, so the seeded
// span (qwen3-tts) meets the intersecting one (voicedesign) with a
// field for every tail: kept (speed), one-sided (top_k), inverted
// (temperature), min-less (repetition_penalty), max-less (top_p).
describe("the bounds intersection (a model-less draft meets every family's span)", () => {
  let svc: CardRegistryService;
  beforeAll(async () => {
    declState.ttsBounds = {
      speed: { min: 0.5, max: 2 },
      top_k: { min: 1, max: 10 },
      temperature: { min: 0, max: 2 },
      repetition_penalty: { max: 1 },
      top_p: { min: 0 },
    };
    declState.vdBounds = {
      speed: { min: 1, max: 3 },
      temperature: { min: 3, max: 5 },
      repetition_penalty: { max: 3 },
      top_p: { min: 0.1 },
      seed: { min: 1, max: 100 },
    };
    declState.primitiveConflictsRow = true;
    svc = await bootSvc();
  });

  it("a value beyond the intersected span refuses, naming both ends", () => {
    const verdict = svc.admitStageRelations("tts", { speed: 99, text: "speak" });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("'speed': 99");
      expect(verdict.error).toContain("(1–2)");
    }
  });
  it("a value inside the intersected span admits", () => {
    const verdict = svc.admitStageRelations("tts", { speed: 1.5, text: "speak" });
    expect(verdict).toEqual({ ok: true });
  });
  it("a field only the seeding family bounds is deleted — no span judges it", () => {
    // boarded[0] (voicedesign) seeds the span table; a field the
    // intersecting family never bounds falls out of the table
    const verdict = svc.admitStageRelations("tts", { seed: 999, text: "speak" });
    expect(verdict).toEqual({ ok: true });
  });
  it("a field whose spans do not overlap is deleted — no span judges it", () => {
    const verdict = svc.admitStageRelations("tts", { temperature: 4, text: "speak" });
    expect(verdict).toEqual({ ok: true });
  });
  it("a span with no floor still names its ceiling", () => {
    const verdict = svc.admitStageRelations("tts", { repetition_penalty: 5, text: "speak" });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("'repetition_penalty': 5");
      expect(verdict.error).toContain("at most 1");
    }
  });
  it("a span with no ceiling still names its floor", () => {
    const verdict = svc.admitStageRelations("tts", { top_p: 0, text: "speak" });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("'top_p': 0");
      expect(verdict.error).toContain("at least 0.1");
    }
  });
  it("a primitive relation row rides the census without crashing the verdict", () => {
    // the JSON-authored shape: a conflicts row that is a bare
    // number keys by its serialized form and, stated by one family
    // only, never agrees — the words still judge the real rows
    const verdict = svc.admitStageRelations("tts", { text: "speak" });
    expect(verdict).toEqual({ ok: true });
  });
});

describe("the no-bounds break (one declaring family without spans stands the law down)", () => {
  let svc: CardRegistryService;
  beforeAll(async () => {
    declState.ttsBounds = { speed: { min: 0.5, max: 2 } };
    declState.vdBounds = null;
    declState.primitiveConflictsRow = false;
    svc = await bootSvc();
  });

  it("a family without bounds breaks the intersection — no span judges the draft", () => {
    const verdict = svc.admitStageRelations("tts", { speed: 999, text: "speak" });
    expect(verdict).toEqual({ ok: true });
  });
});
