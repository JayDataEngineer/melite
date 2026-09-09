// discover-load.test.ts — the rework's doors (2026-09-09): ONE
// disclosure system. discover grants clamped lines over both
// planes; load opens one card or flow (agents md + signature +
// tier-1 skill lines; bodies stay behind skill_read).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO: string = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

describe("discover lines (both planes, clamped)", () => {
  it("flow + card summaries stay summary-only", async () => {
    const mod = await import("../../../../packages/gateway/doors/src/doors/disclose.ts") as {
      skillLinesForCard: (repo: string, id: string) => Array<Record<string, unknown>>;
    };
    void mod;
    const cat = await import("../../../../packages/gateway/doors/src/doors/catalogs.ts") as {
      searchFlows: (rows: unknown[], q: string) => Array<Record<string, unknown>>;
      flowRows: (repo: string) => Array<Record<string, unknown>>;
      searchCards: (defs: unknown, q: string, tags: string) => Array<Record<string, unknown>>;
    };
    const flows = cat.searchFlows(cat.flowRows(REPO) as never, "image upscale");
    assert.ok(flows.some((f): boolean => f["name"] === "image-upscale"));
    for (const f of flows) {
      assert.deepEqual(Object.keys(f).sort(), ["description", "name", "skillRefs", "stages", "title"]);
    }
  });
});

describe("skill lines (the skill_index truth, tier-1)", () => {
  it("image-gen lines its card skills, AGENT.md never a line", async () => {
    const mod = await import("../../../../packages/gateway/doors/src/doors/disclose.ts") as {
      skillLinesForCard: (repo: string, id: string) => Array<Record<string, unknown>>;
      skillLineForRef: (repo: string, ref: string) => Record<string, unknown>;
    };
    const lines: Array<Record<string, unknown>> = mod.skillLinesForCard(REPO, "image-gen");
    assert.ok(lines.length > 0, "image-gen ships skills/ docs");
    for (const l of lines) {
      assert.equal(l["scope"], "card-skill");
      assert.match(String(l["id"]), /^card:image-gen:/);
    }
    assert.ok(lines.some((l): boolean => String(l["id"]) === "card:image-gen:image-craft"));
    assert.deepEqual(mod.skillLinesForCard(REPO, "no-such-card"), []);
    const dangling = mod.skillLineForRef(REPO, "card:nope:missing");
    assert.deepEqual(dangling, { ref: "card:nope:missing", line: null });
  });
});

describe("load(flow) — the prebuilt signature + stages + lines", () => {
  it("image-upscale opens whole (signature verbatim from the row)", async () => {
    const mod = await import("../../../../packages/gateway/doors/src/doors/disclose.ts") as {
      loadFlow: (repo: string, name: string) => Record<string, unknown>;
      flowLeafDocs: (repo: string, name: string) => Array<{ path: string; text: string }>;
    };
    const b: Record<string, unknown> = mod.loadFlow(REPO, "image-upscale");
    assert.deepEqual(Object.keys(b).sort(), ["agents", "digest", "kind", "name", "refs", "signature", "skills", "stages"]);
    assert.equal(b["kind"], "flow");
    const sig = b["signature"] as { name: string; required: string[]; properties: Record<string, { enum: string[] | null }> };
    assert.equal(sig.name, "image_upscale");
    assert.deepEqual(sig.required, ["image_model", "prompt"]);
    assert.deepEqual(sig.properties["image_model"].enum, ["krea-2", "z-image"]);
    const stages = b["stages"] as Array<Record<string, unknown>>;
    assert.deepEqual(stages.map((s): unknown => s["card"]), ["image-gen", "upscale-tools"]);
    assert.deepEqual(b["refs"], ["card:image-gen", "card:upscale-tools", "model:krea-2", "model:krea-2:prompt-enhance", "model:z-image:prompt-enhance"]);
    const ids = (b["skills"] as Array<Record<string, unknown>>).map((l): unknown => l["id"]);
    assert.ok(ids.includes("card:image-gen:image-craft"), "per-stage card lines ride");
    assert.ok(ids.includes("model:krea-2:prompt-enhance"), "the author's model refs resolve");
    assert.match(String(b["digest"]), /^[0-9a-f]{16}$/);
    const docs = mod.flowLeafDocs(REPO, "image-upscale");
    assert.ok(docs.some((d): boolean => d.path === "flows/image-upscale/SKILL.md"));
    assert.deepEqual(mod.flowLeafDocs(REPO, "no-such-flow"), []);
    assert.throws(() => mod.loadFlow(REPO, "no-such-flow"), /unknown flow/);
  });
});

describe("load(card) — agents md + signature + lines + hints", () => {
  it("image-gen opens whole over fakes (shape, not the emitter)", async () => {
    const mod = await import("../../../../packages/gateway/doors/src/doors/disclose.ts") as {
      loadCard: (repo: string, dataRoot: string, cards: unknown, models: unknown, id: string) => Record<string, unknown>;
    };
    const { GENERIC_ENHANCE_RECIPE } = await import("../../../../packages/gateway/core/src/schema/promptGuide.ts") as { GENERIC_ENHANCE_RECIPE: string };
    const fakeCards = {
      defsSync: () => new Map([
        ["image-gen", {
          boarded: ["krea-2"],
          schema: (v: unknown) => v as Record<string, unknown>,
          identity: { label: "Image Gen", description: "generate", genre: "image" },
          tags: ["image", "generate"],
        }],
      ]),
    };
    const fakeModels = { allDecls: () => [{ id: "krea-2", label: "Krea 2", description: "image model" }] };
    const b: Record<string, unknown> = mod.loadCard(REPO, "/data", fakeCards, fakeModels, "image-gen");
    assert.deepEqual(Object.keys(b).sort(), ["agents", "digest", "kind", "model_hints", "name", "signature", "skills"]);
    assert.equal(b["kind"], "card");
    const hints = b["model_hints"] as Array<Record<string, unknown>>;
    assert.equal(hints.length, 1);
    assert.deepEqual(hints[0]["enhance"], { prompt: GENERIC_ENHANCE_RECIPE });
    const lines = b["skills"] as Array<Record<string, unknown>>;
    assert.ok(lines.every((l): boolean => l["scope"] === "card-skill"));
    assert.throws(() => mod.loadCard(REPO, "/data", fakeCards, fakeModels, "nope"), /unknown card/);
  });
});
