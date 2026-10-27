// viggle-openjutsu-seated.spec.ts — THE OPENJUTSU SEAT WALL (the
// models-viggle-openjutsu registry row). Three invariants, one firing
// arm each: the served skill twin is byte-identical to the authored
// doc; the family's provisions are true rows (digest-shaped, sized,
// https, and every lane weight they cover — the no-ghost law read on
// this family alone); and the openjutsu card boards the family with
// the facts row to match. Toggling any leg reds its own arm.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "../../../helpers/boot-models.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const AUTHORED = join(ROOT, "packages/models/viggle-animate/src/agents/skills/openjutsu/SKILL.md");
const SERVED = join(ROOT, "packages/engines/comfyui-cordis/models/video/viggle-animate/agents/skills/openjutsu/SKILL.md");

async function registry() {
  const mod = await import("../../../../packages/engines/comfyui-cordis/src/models/models.ts");
  return mod;
}

describe("THE OPENJUTSU SEAT (models-viggle-openjutsu)", () => {
  it("the served skill twin is byte-identical to the authored doc", () => {
    const authored = readFileSync(AUTHORED, "utf8");
    const served = readFileSync(SERVED, "utf8");
    expect(served).toBe(authored);
    expect(served).toMatch(/^name: openjutsu$/m);
    expect(served).toMatch(/^model: viggle-animate$/m);
  });

  it("the family's provisions are true rows covering every lane weight (no ghost)", async () => {
    const { getModel } = await registry();
    const decl = getModel("viggle-animate") as {
      provisions?: Array<{ name: string; url: string; folder: string; sha256?: string; size_bytes?: number }>;
      lane_inputs?: Record<string, unknown>;
    };
    const rows = decl.provisions ?? [];
    expect(rows.length).toBeGreaterThanOrEqual(7);
    for (const row of rows) {
      expect(row.url).toMatch(/^https:\/\//);
      expect(row.sha256 ?? "").toMatch(/^[0-9a-f]{64}$/);
      expect(typeof row.size_bytes).toBe("number");
      expect(row.size_bytes as number).toBeGreaterThan(0);
      expect(row.folder).not.toMatch(/^\//);
    }
    // every lane weight filename finds its row (basename match)
    const declared = new Set(rows.map((r) => r.name));
    for (const weight of Object.values(decl.lane_inputs ?? {})) {
      if (typeof weight === "string" && /\.(safetensors|pth|pt|ckpt|gguf|onnx)$/.test(weight)) {
        expect(declared.has(weight), `lane weight ${weight} has no provision row`).toBe(true);
      }
    }
  });

  it("the openjutsu card boards the family, and the facts row maps them", async () => {
    const facts = JSON.parse(readFileSync(join(ROOT, "packages/engines/comfyui-cordis/data/model-facts.json"), "utf8")) as {
      rows: Record<string, { card: string }>;
      cards: Record<string, unknown>;
    };
    expect(facts.rows["viggle-animate"]?.card).toBe("openjutsu");
    expect(facts.cards["openjutsu"]).toBeDefined();
    // the registered definition (the served SSOT, same loader the
    // /v1/tools projection reads)
    const { loadCardDefs } = await import("../../../../packages/engines/comfyui-cordis/src/cardDefs.ts");
    const defs = await loadCardDefs();
    const def = defs.get("openjutsu");
    expect(def).toBeDefined();
    expect(def?.boarded ?? []).toContain("viggle-animate");
    expect(def?.requires ?? []).toContain("ComfyUI-Viggle-Animate-H3");
  });
});
