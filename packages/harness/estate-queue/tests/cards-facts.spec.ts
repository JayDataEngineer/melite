// cards-facts.spec.ts — the decl projection's every arm (pure:
// crafted defs + facts in, rows out) + the frozen facts path.
import { describe, it, expect } from "vitest";
import { factsPath, deriveDecls } from "../src/cardsFacts.ts";
import type { CardDefinition } from "@melite/comfyui-cordis";
import type { ModelFactsRow } from "../src/cardsFacts.ts";

const def = (over: Partial<CardDefinition> = {}): CardDefinition => ({
  skeleton: "skel",
  boarded: ["fam-a", "fam-b"],
  admits: ["image_*", "dup", "dup", 7, null],
  spells: ["input_image"],
  schema: Object.assign(() => undefined, { dict: { width: 1, seed: 2 } }),
  ...over,
} as unknown as CardDefinition);

const facts = (over: Record<string, Partial<ModelFactsRow>> = {}): Record<string, ModelFactsRow> => ({
  "fam-a": { card: "c", defaults: {}, variants: [], studio: { writes: ["studio_w", "studio_w", 5] } },
  "fam-b": { card: "c", defaults: {}, variants: [], studio: { writes: "flat" } },
  ...over,
} as never as Record<string, ModelFactsRow>);

describe("factsPath (the frozen data path)", () => {
  it("points at the cordis package's model-facts.json under the repo root", () => {
    expect(factsPath()).toContain(joinSep(["packages", "engines", "comfyui-cordis", "data", "model-facts.json"]));
  });
});

const joinSep = (parts: string[]): string => parts.join("/");

describe("deriveDecls (defs + facts -> rows)", () => {
  it("projects skeleton, board, schema knob surface, admits, spells", () => {
    const rows = deriveDecls(new Map([["c", def()]]), facts());
    const r = rows["c"];
    expect(r).toBeDefined();
    expect(r?.skeleton).toBe("skel");
    expect(r?.boarded).toEqual(["fam-a", "fam-b"]);
    expect(r?.schemaNames).toEqual(["width", "seed"]);
    expect(r?.spells).toEqual(["input_image"]);
    // admits: def.admits (deduped, strings only) + fam-a's studio writes
    expect(r?.admits).toEqual(["image_*", "dup", "studio_w"]);
  });
  it("a wrapped card projects the schemaCarrier instead of schema", () => {
    const wrapped = def({
      schema: 7 as never,
      schemaCarrier: Object.assign(() => undefined, { dict: { ckpt: 1 } }),
    } as Partial<CardDefinition> as never);
    const rows = deriveDecls(new Map([["w", wrapped]]), facts());
    expect(rows["w"]?.schemaNames).toEqual(["ckpt"]);
  });
  it("a non-projecting carrier tolls to no knobs; absent rows toll their fallbacks", () => {
    const rows = deriveDecls(
      new Map([
        ["plain", def({ schema: "flat" as never })],
        ["nospells", def({ spells: undefined } as never)],
        ["noadmits", def({ admits: undefined, boarded: ["ghost-fam"] } as never)],
      ]),
      facts({ "ghost-fam": { card: "x", defaults: {}, variants: [] } }),
    );
    expect(rows["plain"]?.schemaNames).toEqual([]);
    expect(rows["nospells"]?.spells).toEqual([]);
    expect(rows["noadmits"]?.admits).toEqual([]);
    // fam-b's flat studio writes row and a boarded family with NO
    // facts row both contribute nothing (never a crash)
    expect(rows["noadmits"]?.admits).toEqual([]);
  });
});
