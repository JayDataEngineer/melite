// @melite/comfyui-cordis — the registry dumper (dump-registry.ts)
// as a subprocess battery (TEST-2 breadth, 2026-09-12). Same
// process-boundary reasoning as the cli spec: the module
// self-executes on load, so the battery spawns it for real — one
// node invocation, JSON on stdout, nonzero on failure.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const DUMP = "packages/engines/comfyui-cordis/src/dump-registry.ts";

describe("the registry dumper (process boundary)", () => {
  it("emits the card census as one JSON document", () => {
    const r = spawnSync("node", ["--experimental-strip-types", "--no-warnings", DUMP], {
      encoding: "utf8",
      timeout: 240000,
      maxBuffer: 64 * 1024 * 1024,
    });
    assert.equal(r.status, 0, `stderr was: ${(r.stderr as string).slice(0, 500)}`);
    const doc = JSON.parse(r.stdout as string) as {
      cards: Record<string, {
        skeleton: string; boarded: string[]; requires: string[];
        requiresByFamily: Record<string, string[]>; admits: string[];
        spells: string[]; knobs: { name: string; type: string; array: boolean; role: unknown }[];
      }>;
    };
    const ids = Object.keys(doc.cards).sort();
    assert.ok(ids.length > 10, "the census covers the card set");
    assert.ok(ids.includes("image-gen"), "a known card rides");
    const row = doc.cards["image-gen"]!;
    assert.equal(typeof row.skeleton, "string");
    assert.ok(row.skeleton.length > 0, "the stage-row skeleton rides");
    assert.ok(Array.isArray(row.boarded) && Array.isArray(row.requires) && Array.isArray(row.admits) && Array.isArray(row.spells));
    const prompt = row.knobs.find((k) => k.name === "prompt")!;
    assert.ok(prompt, "the prompt knob rides");
    assert.equal(typeof prompt.type, "string");
    assert.equal(typeof prompt.array, "boolean");
    // every knob row carries the full shape (the dumper never
    // emits a partial row — downstream census readers index these)
    for (const [id, card] of Object.entries(doc.cards)) {
      for (const k of card.knobs) {
        assert.equal(typeof k.name, "string", `${id}: knob name`);
        assert.equal(typeof k.type, "string", `${id}: knob type`);
        assert.equal(typeof k.array, "boolean", `${id}: knob array`);
        assert.ok("role" in k, `${id}: knob role`);
      }
    }
  }, 240000);
});
