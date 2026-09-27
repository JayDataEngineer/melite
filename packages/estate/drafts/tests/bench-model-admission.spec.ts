import { test } from "vitest";
import assert from "node:assert/strict";
import { ensureBench, getBench, patchBench, addStageBench, undoBench } from "../src/bench.ts";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { boot, codeOf, seed } from "./bench-helpers.ts";

function entry(
  rev: number,
  kind: string,
  author: string,
  inverse?: Record<string, unknown>,
): Record<string, unknown> {
  return { rev, at: rev, author, kind, ...(inverse !== undefined ? { inverse } : {}) };
}

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

// ── the 2026-10-10 audit's declaration-plane pins (GAP 3/4/5/6) ──
// The restored carve is LOAD-TIME grace; the audit found it sticky
// (patch and undo forwarded the row's provenance, so a pre-law row
// never met today's law again), the undo arms unjudged (a poison row
// re-entered the doc through remove_stage/load with no seat
// looking), and the patch arm aliasing the live record (a refusal
// leaked the merge into the cached doc).

test("the restored carve is LOAD-TIME grace: a patch judges with no provenance (the grace never sticks)", async () => {
  const drafts = await boot();
  await seed(drafts, "sticky", {
    stages: [{ id: "s_0", card: "tts", provenance: "restored", params: { model: "x", text: "hi" } }],
  });
  const seen: unknown[] = [];
  const admit = (card: string, params: Record<string, unknown>, provenance: unknown): void => {
    seen.push(provenance);
  };
  await patchBench(drafts, "sticky", {
    stage: "s_0", params: { text: "hello again" }, expect_rev: 0,
  }, admit);
  assert.equal(seen.length, 1);
  assert.equal(seen[0], undefined, "the patch door must not forward the row's restored provenance");
});

test("undo's patch arm judges with no provenance AND a refusal leaves the doc untouched (the copy law)", async () => {
  const drafts = await boot();
  await seed(drafts, "copylaw", {
    stages: [{ id: "s_0", card: "tts", provenance: "restored", params: { text: "clean" } }],
    bench: {
      rev: 1,
      log: [entry(1, "patch", "agent", { stage: "s_0", params_before: { text: "poison", frobnicate: 1 } })],
    },
  });
  const admit = (card: string, params: Record<string, unknown>): void => {
    if (params["frobnicate"] !== undefined) throw new Error("admission refuses frobnicate");
  };
  await assert.rejects(
    () => undoBench(drafts, "copylaw", { n: 1 }, admit),
    /frobnicate/,
  );
  const doc = getBench(drafts, "copylaw");
  const row = (doc.stages as Array<Record<string, unknown>>)[0]!;
  assert.deepEqual(row["params"], { text: "clean" }, "a refused undo must not leak the inverse merge into the cached record");
});

test("undo's remove_stage arm judges the reinserted row before it lands (no laundering one verb over)", async () => {
  const drafts = await boot();
  await seed(drafts, "reinsert", {
    stages: [{ id: "keep", card: "tts", params: {} }],
    bench: {
      rev: 1,
      log: [entry(1, "remove_stage", "agent", {
        stage: "old", index: 0,
        row: { id: "old", card: "tts", params: { frobnicate: 1 } },
      })],
    },
  });
  const admit = (card: string, params: Record<string, unknown>): void => {
    if (params["frobnicate"] !== undefined) throw new Error("admission refuses frobnicate");
  };
  await assert.rejects(
    () => undoBench(drafts, "reinsert", { n: 1 }, admit),
    /frobnicate/,
  );
  const ids = (getBench(drafts, "reinsert").stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["keep"], "a refused reinsertion must leave the doc without the row");
});

test("undo's load fallback judges the snapshot before it lands", async () => {
  const drafts = await boot();
  await seed(drafts, "snapback", {
    stages: [{ id: "keep", card: "tts", params: {} }],
    bench: {
      rev: 1,
      log: [entry(1, "load", "agent", {
        stages_before: [
          { id: "a", card: "tts", params: {} },
          { id: "b", card: "tts", params: { frobnicate: 1 } },
        ],
      })],
    },
  });
  const admit = (card: string, params: Record<string, unknown>): void => {
    if (params["frobnicate"] !== undefined) throw new Error("admission refuses frobnicate");
  };
  await assert.rejects(
    () => undoBench(drafts, "snapback", { n: 1 }, admit),
    /frobnicate/,
  );
  const ids = (getBench(drafts, "snapback").stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["keep"], "a refused snapshot restore must leave the live stages untouched");
});
