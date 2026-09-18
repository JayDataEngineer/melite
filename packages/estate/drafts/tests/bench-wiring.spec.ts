import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { ensureBench, getBench, patchBench, addStageBench, rewireBench } from "../src/bench.ts";
import { boot, codeOf } from "./bench-helpers.ts";

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
