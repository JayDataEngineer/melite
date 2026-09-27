import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { ensureBench, getBench, patchBench, addStageBench, rewireBench, removeStageBench } from "../src/bench.ts";
import { boot, codeOf, seed } from "./bench-helpers.ts";

// ── the wiring admission (2026-09-15, the phantom-wire cure) ─────
// The burn: an agent wired inputs:{image:{stage:"stage-1"}} on an
// image-edit row — 'stage-1' never existed (the mint mints s_N),
// no param spelled $image, and every gate passed. The error surfaced
// at card-open, three cards deep: 'required param image1 missing'.
// Construction-invalid wiring now refuses AT WRITE TIME, named.

describe("the wiring admission (phantom wires refuse at write time)", () => {
  test("the exact burn: a wire to a nonexistent stage with no spell refuses named", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    const refusal = await codeOf(addStageBench(drafts, "s", {
      card: "image-edit", expect_rev: 1,
      params: { prompt: "zoom out" },
      inputs: { image: { stage: "stage-1", output: "image" } },
    }));
    // stage-1 is checked FIRST (wire-stage-not-found) — the channel
    // is also dead, but one named refusal is the door's voice.
    assert.match(refusal, /bench\/wire-stage-not-found/);
    assert.match(refusal, /no such stage on the bench/);
    assert.match(refusal, /s_0/);
  });

  test("a dead channel (wire without a $spell) refuses with the fix hint", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    const refusal = await codeOf(addStageBench(drafts, "s", {
      card: "image-edit", expect_rev: 1,
      params: { prompt: "zoom out" },
      inputs: { image1: { stage: "s_0", output: "image" } },
    }));
    assert.match(refusal, /bench\/dead-wire/);
    assert.match(refusal, /bound by no '\$image1' spell/);
  });

  test("a stray spell (param wires $chan with no channel yet) is a legal intermediate — the run owns its refusal", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    // spell first, wire second — the two-step construction must not
    // deadlock at the door (rewriteSpells refuses strays at merge).
    const row = await addStageBench(drafts, "s", {
      card: "image-edit", expect_rev: 0,
      params: { prompt: "zoom out", image1: "$image" },
    });
    assert.equal(row.stage, "s_0");
  });

  test("the LEGIT shape lands: channel spelled, upstream live", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    const row = await addStageBench(drafts, "s", {
      card: "image-edit", expect_rev: 1,
      params: { prompt: "zoom out", image1: "$image" },
      inputs: { image: { stage: "s_0", output: "image" } },
    });
    assert.equal(row.stage, "s_1");
  });

  test("self-wiring refuses (a cycle composes nothing)", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    const refusal = await codeOf(addStageBench(drafts, "s", {
      card: "image-edit", id: "self", expect_rev: 1,
      params: { image1: "$image" },
      inputs: { image: { stage: "self", output: "image" } },
    }));
    assert.match(refusal, /bench\/self-wire/);
  });

  test("rewire admits the MERGED wiring (a phantom rewires in, it refuses)", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    await addStageBench(drafts, "s", {
      card: "image-edit", expect_rev: 1,
      params: { prompt: "zoom out", image1: "$image" },
    });
    const refusal = await codeOf(rewireBench(drafts, "s", {
      stage: "s_1", input: "image", expect_rev: 2,
      from: { stage: "stage-9", output: "image" },
    }));
    assert.match(refusal, /bench\/wire-stage-not-found/);
    // and the good rewire lands
    const ok = await rewireBench(drafts, "s", {
      stage: "s_1", input: "image", expect_rev: 2,
      from: { stage: "s_0", output: "image" },
    });
    assert.equal(ok.input, "image");
  });

  test("patch cannot orphan a spell (drop the $binding, the wire refuses)", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    await addStageBench(drafts, "s", {
      card: "image-edit", expect_rev: 1,
      params: { prompt: "zoom out", image1: "$image" },
      inputs: { image: { stage: "s_0", output: "image" } },
    });
    const refusal = await codeOf(patchBench(drafts, "s", {
      stage: "s_1", params: { image1: "/tmp/photo.png" }, expect_rev: 2,
    }));
    assert.match(refusal, /bench\/dead-wire/);
  });

  test("a wholesale load admits every row against the list it lands in", async () => {
    const drafts = await boot();
    const refusal = await codeOf(ensureBench(drafts, {
      session: "s", stages: [
        { id: "a", card: "image-gen" },
        { id: "b", card: "image-edit", params: { image1: "$image" },
          inputs: { image: { stage: "zzz", output: "image" } } },
      ],
    }));
    assert.match(refusal, /bench\/wire-stage-not-found/);
    // the registry-flow shape (initial-bound prompt channel) passes
    await ensureBench(drafts, {
      session: "ok", stages: [
        { id: "make", card: "image-gen", params: { prompt: "$prompt" },
          inputs: { prompt: { initial: "prompt" } } },
      ],
    });
    const got = getBench(drafts, "ok");
    assert.equal((got.stages as Array<{ id: string }>).length, 1);
  });

  test("garbage binding shapes refuse (neither stage nor initial)", async () => {
    const drafts = await boot();
    const refusal = await codeOf(ensureBench(drafts, {
      session: "s", stages: [
        { id: "a", card: "image-edit", params: { image1: "$weird" },
          inputs: { weird: "just-a-string" } },
      ],
    }));
    assert.match(refusal, /bench\/bad-wire/);
  });
});

  test("THE NO-LEAK LAW: a refused add_stage leaves the bench untouched (no phantom rows persist)", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    // two refused adds (phantom upstream, dead wire)
    await codeOf(addStageBench(drafts, "s", {
      card: "image-edit", expect_rev: 1,
      params: { prompt: "a" },
      inputs: { image: { stage: "stage-1", output: "image" } },
    }));
    await codeOf(addStageBench(drafts, "s", {
      card: "image-edit", expect_rev: 1,
      params: { prompt: "b" },
      inputs: { image1: { stage: "s_0", output: "image" } },
    }));
    let doc = getBench(drafts, "s");
    assert.equal((doc.stages as unknown[]).length, 1, "no refused row leaked");
    // the good write lands clean — and drags NO leaked rows with it
    const ok = await addStageBench(drafts, "s", {
      card: "image-edit", expect_rev: 1,
      params: { prompt: "c", image1: "$image" },
      inputs: { image: { stage: "s_0", output: "image" } },
    });
    assert.equal(ok.stage, "s_1", "minted fresh against the clean bench");
    doc = getBench(drafts, "s");
    assert.equal((doc.stages as unknown[]).length, 2);
  });

  test("THE NO-LEAK LAW: a refused rewire and a refused patch leave the row untouched", async () => {
    const drafts = await boot();
    await ensureBench(drafts, {
      session: "s",
      stages: [
        { id: "a", card: "image-gen" },
        { id: "b", card: "image-edit", params: { prompt: "p", image1: "$image" } },
      ],
    });
    await rewireBench(drafts, "s", {
      stage: "b", input: "image", expect_rev: 0,
      from: { stage: "a", output: "image" },
    });
    // refused rewire (phantom upstream) — the binding must NOT move
    await codeOf(rewireBench(drafts, "s", {
      stage: "b", input: "image", expect_rev: 1,
      from: { stage: "zzz", output: "image" },
    }));
    let doc = getBench(drafts, "s");
    let b = (doc.stages as Array<{ id: string; inputs: Record<string, unknown> }>).find((x) => x.id === "b")!;
    assert.deepEqual(b.inputs.image, { stage: "a", output: "image" }, "binding unchanged");
    // refused patch (orphans the spell) — params must NOT move
    await codeOf(patchBench(drafts, "s", {
      stage: "b", params: { image1: "/tmp/x.png" }, expect_rev: 1,
    }));
    doc = getBench(drafts, "s");
    b = doc.stages.find((x) => x.id === "b")!;
    const params = (b as unknown as { params: Record<string, unknown> }).params;
    assert.equal(params.image1, "$image", "spell unchanged");
  });

// ── the intent heuristic's three shapes (2026-09-26) ────────────
// syncIntent keeps the bench's INTENT pointing at a card the bench
// still holds: a remove that takes the intent card re-points it at a
// card that remains, and a remove that does not leaves it alone. A
// bench that never declared an intent ("bench") is not sync'd at all.
describe("the intent heuristic (a removed intent re-points, a kept one stands)", () => {
  test("remove the intent card and the intent walks back to a card that remains", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    await addStageBench(drafts, "s", { card: "image-edit", expect_rev: 1 });
    // the LOAD arm is the door that re-points a live bench's intent
    const cur = getBench(drafts, "s");
    await ensureBench(drafts, { session: "s", stages: cur.stages, intent: "image-gen", overwrite: true, expect_rev: cur.rev });
    assert.equal(getBench(drafts, "s").intent, "image-gen");
    await removeStageBench(drafts, "s", { stage: "s_0", expect_rev: getBench(drafts, "s").rev });
    assert.equal(
      getBench(drafts, "s").intent,
      "image-edit",
      "the intent card is gone — it names a card the bench still holds",
    );
  });

  test("removing a card the intent does not name leaves the intent alone", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    await addStageBench(drafts, "s", { card: "image-edit", expect_rev: 1 });
    const cur = getBench(drafts, "s");
    await ensureBench(drafts, { session: "s", stages: cur.stages, intent: "image-edit", overwrite: true, expect_rev: cur.rev });
    await removeStageBench(drafts, "s", { stage: "s_0", expect_rev: getBench(drafts, "s").rev });
    assert.equal(getBench(drafts, "s").intent, "image-edit");
  });

  test("a bench that never declared an intent is left as it was", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    assert.equal(getBench(drafts, "s").intent, "bench");
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    assert.equal(getBench(drafts, "s").intent, "bench");
  });

  // THE SERVE-TIME RE-ADMISSION (2026-10-10, the operator's live
  // report: a doc born before the self-wire law served silently
  // until a run tripped a generic wall). The write doors guard
  // WRITES; the store is guarded at READ — a criminal doc refuses
  // at serve, in its own name, whatever wrote it (an older door, a
  // hand edit, a corrupted write).
  test("a persisted self-wire refuses AT SERVE — named, before any run", async () => {
    const drafts = await boot();
    await seed(drafts, "old", {
      stages: [
        { id: "s_0", card: "image-edit", params: { prompt: "x" },
          inputs: { input_images: { stage: "s_0", output: "default" } } },
      ],
    });
    const refusal = await codeOf((async () => { getBench(drafts, "old") })());
    assert.match(refusal, /bench\/self-wire/);
  });

  test("a phantom-wire (source stage gone) still SERVES — the write and run doors own that voice (crafted-undo docs hold one between mutations)", async () => {
    const drafts = await boot();
    await seed(drafts, "ghost", {
      stages: [
        { id: "s_1", card: "image-edit", params: { prompt: "x" },
          inputs: { input_images: { stage: "s_9", output: "default" } } },
      ],
    });
    // serve does NOT brick the bench a fix needs to open
    const row = getBench(drafts, "ghost");
    assert.equal(row.session, "ghost");
  });
})
