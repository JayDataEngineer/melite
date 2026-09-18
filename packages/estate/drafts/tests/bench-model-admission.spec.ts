import { test } from "vitest";
import assert from "node:assert/strict";
import { ensureBench, getBench, patchBench, addStageBench } from "../src/bench.ts";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { boot, codeOf } from "./bench-helpers.ts";

// ── THE MODEL ADMISSION (no-silent-drop law, strokes 17-18) ──
// The lane proof: the LLM wrote a model the card never offered; the
// bench swallowed it; the form painted another family. Now the WRITE
// refuses first. (Stroke 18 narrowed the refusal to NOT-BOARDED
// models — a boarded-but-not-downloaded model is OFFERED: the write
// lands and the surfaces prompt the download.)

test("add_stage REFUSES a model the admission rejects — bench/bad-model, the row never lands", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s" });
  const admit = (card: string, params: Record<string, unknown>): void => {
    if (params["model"] === "gibberish-net") {
      throw new RemoteError(
        "bench/bad-model",
        "model 'gibberish-net' is not offered by card 'image-gen' (boards: krea-2, z-image, anima)",
        { card, offered: ["krea-2", "z-image", "anima"] },
      );
    }
  };
  assert.match(
    await codeOf(addStageBench(drafts, "s", {
      card: "image-gen", params: { model: "gibberish-net" }, expect_rev: 0,
    }, admit)),
    /^bench\/bad-model\|.*not offered by card/,
  );
  // the row never landed
  assert.equal((getBench(drafts, "s").stages as unknown[]).length, 0);
});

test("patch admission reads the MERGED params — landing poison via patch is as refused as via add", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s" });
  const row = await addStageBench(drafts, "s", { card: "image-gen", params: { prompt: "x" }, expect_rev: 0 });
  const admit = (card: string, params: Record<string, unknown>): void => {
    if (params["model"] === "gibberish-net") {
      throw new RemoteError("bench/bad-model", "model 'gibberish-net' is not offered by card 'image-gen'", { card, offered: ["krea-2"] });
    }
  };
  assert.match(
    await codeOf(patchBench(drafts, "s", {
      stage: row.stage, params: { model: "gibberish-net" }, expect_rev: 1,
    }, admit)),
    /^bench\/bad-model/,
  );
});

test("a model-less stage passes admission untouched (model-less cards compose on the default family)", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s" });
  const seen: string[] = [];
  const admit = (card: string, params: Record<string, unknown>): void => {
    seen.push(card + ":" + String(params["model"] ?? ""));
  };
  const row = await addStageBench(drafts, "s", { card: "mask-studio", params: {}, expect_rev: 0 }, admit);
  assert.equal(row.stage, "s_0");
  assert.deepEqual(seen, ["mask-studio:"]);
});

test("a param-less row still reaches admission (the card check runs on {} — no silent sail-through)", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s" });
  const seen: Array<{ card: string; params: Record<string, unknown> }> = [];
  const admit = (card: string, params: Record<string, unknown>): void => {
    seen.push({ card, params });
  };
  // add_stage with no params key at all.
  await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 }, admit);
  // a wholesale load whose row carries no params.
  await ensureBench(drafts, {
    session: "empty", stages: [{ id: "a", card: "hero" }],
  }, admit);
  assert.deepEqual(seen, [
    { card: "image-gen", params: {} },
    { card: "hero", params: {} },
  ]);
});
