import { test, describe } from "vitest";
import assert from "node:assert/strict";
import { ensureBench, getBench, patchBench, addStageBench, undoBench, groupBench, ungroupBench, removeStageBench, rewireBench } from "../src/bench.ts";
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

// ── the 2026-10-10 write-seat audit: the compound doors and the
// strip. A compound row hides its children from every patch door,
// so group/ungroup and their undos were the one place a pre-law row
// could park or re-enter judged by nothing — and every write door
// judged the RAW params while the doc stores the STRIPPED row, so a
// self-naming model was refused by the door and composed by the run.

test("group judges the rows it parks inside the compound (the compound is not a blind spot)", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "g" });
  await addStageBench(drafts, "g", { card: "tts", params: { text: "a" }, expect_rev: 0 });
  await addStageBench(drafts, "g", { card: "tts", params: { text: "b", frobnicate: 1 }, expect_rev: 1 });
  const admit = (card: string, params: Record<string, unknown>): void => {
    if (params["frobnicate"] !== undefined) throw new Error("admission refuses frobnicate");
  };
  await assert.rejects(
    () => groupBench(drafts, "g", { stages: ["s_0", "s_1"], expect_rev: 2 }, admit),
    /frobnicate/,
  );
  const ids = (getBench(drafts, "g").stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["s_0", "s_1"], "a refused group leaves the rows flat");
});

test("ungroup judges the rows it spills back onto the bench", async () => {
  const drafts = await boot();
  await seed(drafts, "spill", {
    stages: [{ id: "g_0", card: "group", children: [
      { id: "a", card: "tts", params: { text: "a" } },
      { id: "b", card: "tts", params: { text: "b", frobnicate: 1 } },
    ] }],
  });
  const admit = (card: string, params: Record<string, unknown>): void => {
    if (params["frobnicate"] !== undefined) throw new Error("admission refuses frobnicate");
  };
  await assert.rejects(
    () => ungroupBench(drafts, "spill", { stage: "g_0", expect_rev: 0 }, admit),
    /frobnicate/,
  );
  const rows = getBench(drafts, "spill").stages as Array<{ id: string }>;
  assert.deepEqual(rows.map((x) => x.id), ["g_0"], "a refused spill keeps the compound intact");
});

test("undo-of-group judges the children the inverse spills (the log is not a trusted caller)", async () => {
  const drafts = await boot();
  await seed(drafts, "uspill", {
    stages: [{ id: "g_r0c2_0", card: "group", children: [
      { id: "clean", card: "tts", params: { text: "a" } },
    ] }],
    bench: {
      rev: 1,
      log: [entry(1, "group", "agent", {
        stage: "g_r0c2_0", index: 0,
        children: [
          { id: "clean", card: "tts", params: { text: "a" } },
          { id: "poison", card: "tts", params: { text: "b", frobnicate: 1 } },
        ],
      })],
    },
  });
  const admit = (card: string, params: Record<string, unknown>): void => {
    if (params["frobnicate"] !== undefined) throw new Error("admission refuses frobnicate");
  };
  await assert.rejects(
    () => undoBench(drafts, "uspill", { n: 1 }, admit),
    /frobnicate/,
  );
  const rows = getBench(drafts, "uspill").stages as Array<{ id: string }>;
  assert.deepEqual(rows.map((x) => x.id), ["g_r0c2_0"], "a refused undo-of-group keeps the compound standing");
});

test("undo-of-ungroup judges the children before re-parking them in the compound", async () => {
  const drafts = await boot();
  await seed(drafts, "upark", {
    stages: [{ id: "a", card: "tts", params: { text: "a" } }],
    bench: {
      rev: 1,
      log: [entry(1, "ungroup", "agent", {
        index: 0,
        row: { id: "g_x", card: "group", children: [
          { id: "a", card: "tts", params: { text: "a" } },
          { id: "poison", card: "tts", params: { frobnicate: 1 } },
        ] },
      })],
    },
  });
  const admit = (card: string, params: Record<string, unknown>): void => {
    if (params["frobnicate"] !== undefined) throw new Error("admission refuses frobnicate");
  };
  await assert.rejects(
    () => undoBench(drafts, "upark", { n: 1 }, admit),
    /frobnicate/,
  );
  const rows = getBench(drafts, "upark").stages as Array<{ id: string }>;
  assert.deepEqual(rows.map((x) => x.id), ["a"], "a refused re-park leaves the flat bench untouched");
});

test("remove_stage re-judges the survivors' wiring (a removal may not orphan a wire)", async () => {
  const drafts = await boot();
  await seed(drafts, "orphan", {
    stages: [
      { id: "s_0", card: "tts", params: { text: "a" } },
      { id: "s_1", card: "tts", params: { image: "$image", text: "b" }, inputs: { image: { stage: "s_0", output: "default" } } },
    ],
  });
  await assert.rejects(
    () => removeStageBench(drafts, "orphan", { stage: "s_0", expect_rev: 0 }),
    /no such stage on the bench/,
  );
  const ids = (getBench(drafts, "orphan").stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["s_0", "s_1"], "a refused removal leaves both rows standing");
});

test("the STORED row is the JUDGED row — read back off disk, on every write door (the audit, 2026-09-28)", async () => {
  // The arm above proved the JUDGED half (what the door saw). It
  // never read the bench back, so the STORE half was unpinned: the
  // audit stored the RAW merge on the patch door and 50/50 stayed
  // green, and stored the raw pendingParams in the drafts door with
  // 103/103 green. Worse, the birth arm turned out to JUDGE THE RAW
  // BODY and store the normalized rows — two different objects in
  // play, which is this law broken in the one direction that hides
  // itself (the comment above the birth arm claimed "shaped first,
  // then judged" and it was false there).
  //
  // The law, driven: after each write, the row ON DISK carries
  // exactly what the door judged.
  const drafts = await boot();
  const seen: Array<Record<string, unknown>> = [];
  const admit = (card: string, params: Record<string, unknown>): void => { seen.push({ card, params }); };
  // 1. BIRTH (the arm that was judging the raw body)
  await ensureBench(drafts, { session: "stored", stages: [{ id: "s_0", card: "tts", params: { model: "tts", text: "hi" } }] }, admit);
  const born = (getBench(drafts, "stored").stages as Array<Record<string, unknown>>)[0]!;
  assert.equal(((born["params"] as Record<string, unknown>)["model"]), undefined,
    "BIRTH stores the stripped row — the same object the door judged");
  assert.equal(seen.length, 1, "the birth arm judged its stored row (one judgment, one write)");
  // 2. ADD
  await addStageBench(drafts, "stored", { card: "tts", params: { model: "tts", text: "again" }, expect_rev: 0 }, admit);
  const added = (getBench(drafts, "stored").stages as Array<Record<string, unknown>>)[1]!;
  assert.equal(((added["params"] as Record<string, unknown>)["model"]), undefined,
    "ADD stores the stripped row — the same object the door judged");
  // 3. PATCH — and the patch CARRIES a self-naming model, or the store
  //    half is unobservable: a patch that only edits `text` merges onto
  //    an already-stripped row, so storing the raw merge looks
  //    identical to storing the stripped one. (The audit's mutation
  //    was invisible for exactly this reason.)
  await patchBench(drafts, "stored", { stage: "s_0", params: { model: "tts", text: "patched" }, expect_rev: 1 }, admit);
  const patched = (getBench(drafts, "stored").stages as Array<Record<string, unknown>>)[0]!;
  assert.equal(((patched["params"] as Record<string, unknown>)["model"]), undefined,
    "PATCH stores the STRIPPED merge — a self-naming model never reaches disk (the run composes what the bench holds)");
  assert.equal(((patched["params"] as Record<string, unknown>)["text"]), "patched",
    "…and the patch's own key landed");
  assert.equal(seen[seen.length - 1]!["params"] && (seen[seen.length - 1]!["params"] as Record<string, unknown>)["model"], undefined,
    "the door judged the stripped merge — the judged and stored rows are one object");
});

test("the write doors judge the STRIPPED row — a self-naming model never meets the door's refusal", async () => {
  // normalizeBenchStage strips params.model naming the row's own
  // card at store, so the row the run composes is model-less; the
  // door used to judge the raw view and refuse a key the doc never
  // keeps (the parity law's other half: a write refusing what the
  // run admits).
  const drafts = await boot();
  await ensureBench(drafts, { session: "strip" });
  const seen: Array<Record<string, unknown>> = [];
  const admit = (card: string, params: Record<string, unknown>): void => {
    seen.push({ card, params });
  };
  await addStageBench(drafts, "strip", { card: "tts", params: { model: "tts", text: "hi" }, expect_rev: 0 }, admit);
  assert.equal(seen.length, 1);
  assert.equal((seen[0]!["params"] as Record<string, unknown>)["model"], undefined, "the judged view carries no self-naming model");
  // a REAL foreign model still meets the door's refusal
  const admit2 = (card: string, params: Record<string, unknown>): void => {
    if (params["model"] === "gibberish-net") throw new Error("bench/bad-model");
  };
  await assert.rejects(
    () => addStageBench(drafts, "strip", { card: "tts", params: { model: "gibberish-net" }, expect_rev: 1 }, admit2),
    /bad-model/,
  );
});

describe("the RESTORE arm judges the stored (stripped) row", () => {
  test("a RESTORED row is judged exactly as it would be written (the strip is one admission's law, not add/patch's — the bench audit's gap 3)", async () => {
    // 2026-10-10: admitRestored passed the RAW row to the
    // admission, so grouping (or any restore) of a row carrying
    // {model: <own card>} refused it as an unknown model — while
    // add and patch admitted the identical body, because they judge
    // the stripped view. One admission, one view.
    const drafts = await boot();
    const seen: Array<Record<string, unknown>> = [];
    // a seat that REFUSES the unstripped view: any judged row still
    // carrying the self-naming model throws (the old restore law)
    const admit = (card: string, params: Record<string, unknown>): void => {
      if (params["model"] === card) throw new Error("bench/bad-model (unstripped view)");
      seen.push({ card, params: { ...params } });
    };
    await ensureBench(drafts, { session: "restore-strip" });
    await addStageBench(drafts, "restore-strip", { card: "tts", params: { text: "one" }, expect_rev: 0 }, admit);
    await addStageBench(drafts, "restore-strip", { card: "tts", params: { model: "tts", text: "two" }, expect_rev: 1 }, admit);
    seen.length = 0;
    // the GROUP restore judges BOTH rows — with the strip, the row
    // that stores the self-naming key is judged without it and the
    // restore lands; before the kill this threw bench/bad-model
    const grouped = await groupBench(
      drafts,
      "restore-strip",
      { stages: ["s_0", "s_1"], expect_rev: 2 },
      admit,
    );
    assert.ok(grouped !== undefined);
    assert.equal(seen.length, 2, "the restore judged both rows");
    for (const row of seen) {
      assert.notEqual((row["params"] as Record<string, unknown>)["model"], "tts",
        "no restored row was judged in the unstripped view");
    }
  });
});

describe("the compound row is judged by its members (the bench audit's gap 9)", () => {
  test("a grouped bench loads back: the read-back is unloadable no more", async () => {
    // 2026-10-10: load judged every row through the model board, and
    // a compound row's card is the literal "group" — so the bench's
    // OWN read-back refused with "no registered card definition",
    // and an undo of such a load bricked on the bench's prior state.
    const drafts = await boot();
    const judged: string[] = [];
    const admit = (card: string): void => { judged.push(card); };
    await ensureBench(drafts, { session: "grp-load" });
    await addStageBench(drafts, "grp-load", { card: "card-a", params: { seed: 1 }, expect_rev: 0 }, admit);
    await addStageBench(drafts, "grp-load", { card: "card-b", params: { seed: 2 }, expect_rev: 1 }, admit);
    await groupBench(drafts, "grp-load", { stages: ["s_0", "s_1"], expect_rev: 2 }, admit);
    // read the bench back, and load exactly what it holds
    const row = getBench(drafts, "grp-load");
    const stages = (row as unknown as { stages: Array<Record<string, unknown>> }).stages;
    assert.equal(stages.length, 1, "the bench holds the compound");
    assert.equal(stages[0]!["card"], "group", "whose card literal is the compound's own");
    judged.length = 0;
    // the load of the bench's own state must land
    const reloaded = await codeOf(
      ensureBench(drafts, { session: "grp-load", stages, overwrite: true }, admit),
    );
    assert.ok(!String(reloaded).startsWith("bench/bad-model"),
      "the grouped bench loads back (was: no registered card definition) — " + String(reloaded));
  });
});

describe("THE WIRING HALVES (the bench audit's gaps 6 + 7)", () => {
  test("group refuses a WIRED member (the run wires only the flat bench — parking a wire starves it)", async () => {
    // 2026-10-10: group judged the picked rows' models only, so a
    // member carrying a wire was parked where the run cannot see it
    // (benchWiring reads the flat stages), and the bench held a wire
    // that fed nothing.
    const drafts = await boot();
    await ensureBench(drafts, { session: "wire-grp" });
    await addStageBench(drafts, "wire-grp", { card: "card-a", expect_rev: 0 });
    await addStageBench(drafts, "wire-grp", { card: "card-b", expect_rev: 1 });
    await patchBench(drafts, "wire-grp", { stage: "s_1", params: { image: "$image" }, expect_rev: 2 });
    await rewireBench(drafts, "wire-grp", {
      stage: "s_1", input: "image", from: { stage: "s_0", output: "image" }, expect_rev: 3,
    });
    await addStageBench(drafts, "wire-grp", { card: "card-c", expect_rev: 4 });
    const refused = await codeOf(groupBench(drafts, "wire-grp", { stages: ["s_1", "s_2"], expect_rev: 5 }));
    assert.match(String(refused), /grouped-row-wired/,
      "group refuses the wired member: " + String(refused));
    // the honest order lands: clear the wire, group, ungroup, re-wire
    await rewireBench(drafts, "wire-grp", { stage: "s_1", input: "image", expect_rev: 5 });
    const grouped = await groupBench(drafts, "wire-grp", { stages: ["s_1", "s_2"], expect_rev: 6 });
    const spilled = await ungroupBench(drafts, "wire-grp", { stage: grouped.stage, expect_rev: 7 });
    assert.ok(spilled.rev >= 8, "the honest sequence lands");
  });

  test("remove judges the wires hidden INSIDE a compound (a phantom cannot ride out of a group)", async () => {
    // 2026-10-10: a compound row's own inputs are {} by shape, so
    // remove's survivor walk passed over it — a wire parked inside a
    // group (by the doors' own past, or by a doc written before the
    // group law) survived the removal of the stage it pointed at, and
    // ungroup then spilled the phantom onto the flat bench. The doc
    // here is seeded in that shape: the walk must descend.
    const drafts = await boot();
    await seed(drafts, "hidden", {
      stages: [
        { id: "s_0", card: "card-a", params: {} },
        {
          id: "g_r0c2_1",
          card: "group",
          children: [
            { id: "s_1", card: "card-b", params: { image: "$image" }, inputs: { image: { stage: "s_0", output: "image" } } },
            { id: "s_2", card: "card-c", params: {} },
          ],
        },
      ],
    });
    // removing s_0 strands the compound's hidden wire — the walk
    // descends, so the removal refuses and the bench is unchanged
    const refused = await codeOf(removeStageBench(drafts, "hidden", { stage: "s_0", expect_rev: 0 }));
    assert.match(String(refused), /wire-stage-not-found|no such stage/,
      "remove judges the hidden wire: " + String(refused));
    assert.equal((getBench(drafts, "hidden").stages as unknown[]).length, 2,
      "the refused removal changed nothing");
    // and a bystander removal of a stage nothing wires to still lands
    const ok = await codeOf(removeStageBench(drafts, "hidden", { stage: "s_2", expect_rev: 0 }));
    assert.ok(String(ok).length > 0);
  });
});

// ── THE GROUP IS JUDGED BY ITS MEMBERS (the audit, 2026-09-28) ─────
// groupBench writes a row whose card is the LITERAL "group" — a
// card no model board knows — and whose members ride in `children`.
// The compound is judged by its MEMBERS, each through the same door
// it crossed at pick time. The audit deleted BOTH member-dispatch
// branches and the whole drafts suite stayed green (213/213): the
// gap-9 test's fake admission accepted ANY card name, including the
// literal "group", so member-vs-whole-row was indistinguishable.
// These arms use an admission that REFUSES the literal.
describe("a compound is judged by its MEMBERS, never as a row of its own", () => {
  const memberJudge = (seen: Array<{ card: string; params: Record<string, unknown> }>) =>
    (card: string, params: Record<string, unknown>): void => {
      // the model board has no card named "group" — a whole-row
      // judgment is exactly this refusal
      if (card === "group") throw new Error("no registered card definition: group (the compound must be judged by its members)");
      seen.push({ card, params: { ...params } });
    };

  test("the GROUP restore judges each member (and never asks the board about \"group\")", async () => {
    const drafts = await boot();
    const seen: Array<{ card: string; params: Record<string, unknown> }> = [];
    const admit = memberJudge(seen);
    await ensureBench(drafts, { session: "grp-restore" });
    await addStageBench(drafts, "grp-restore", { card: "tts", params: { text: "a" }, expect_rev: 0 }, admit);
    await addStageBench(drafts, "grp-restore", { card: "sfx", params: { text: "b" }, expect_rev: 1 }, admit);
    seen.length = 0;
    const grouped = await groupBench(drafts, "grp-restore", { stages: ["s_0", "s_1"], expect_rev: 2 }, admit);
    assert.ok(grouped !== undefined, "the group write lands — its members are what the door judges");
    assert.deepEqual(seen.map((r) => r.card).sort(), ["sfx", "tts"],
      "each MEMBER crossed the door, and the literal 'group' never did");
  });

  test("LOADING a bench that already holds a group row judges its MEMBERS (the load path, not the group write)", async () => {
    // The arm above drives groupBench's OWN dispatch (the group
    // write). The bench's LOAD path — ensureBench reading a stored
    // doc that already carries a compound — walks a DIFFERENT
    // member-dispatch (admitStages), and the audit found BOTH were
    // unpinned. This arm is the load half: a doc seeded with a group
    // row, read back through the door that must judge members.
    const drafts = await boot();
    await seed(drafts, "grp-load", {
      draft_id: "bench-grp-load",
      intent: "restored compound",
      stages: [
        { id: "g_0", card: "group", children: [
          { id: "s_0", card: "tts", params: { text: "a" } },
          { id: "s_1", card: "sfx", params: { text: "b" } },
        ] },
      ],
      status: "ready",
      createdAt: 0,
      completedAt: null,
      bench: { rev: 1, log: [] },
    });
    const seen: Array<{ card: string; params: Record<string, unknown> }> = [];
    const admit = memberJudge(seen);
    // a patch on the stored compound forces the load path to judge it
    await patchBench(drafts, "grp-load", { stage: "g_0", params: { note: "kept" }, expect_rev: 1 }, admit);
    assert.ok(seen.length >= 2,
      `the load judged the compound's MEMBERS (saw ${String(seen.length)} judgments) — ` +
      "the literal 'group' is not a card and must never be asked about");
    assert.ok(!seen.some((r) => r.card === "group"),
      "the literal 'group' never reached the board on the load path either");
  });

  test("an UNDO that reinserts a group row judges its members (an undo bricked on the bench's own state)", async () => {
    const drafts = await boot();
    const seen: Array<{ card: string; params: Record<string, unknown> }> = [];
    const admit = memberJudge(seen);
    await ensureBench(drafts, { session: "grp-undo" });
    await addStageBench(drafts, "grp-undo", { card: "tts", params: { text: "a" }, expect_rev: 0 }, admit);
    await addStageBench(drafts, "grp-undo", { card: "sfx", params: { text: "b" }, expect_rev: 1 }, admit);
    await groupBench(drafts, "grp-undo", { stages: ["s_0", "s_1"], expect_rev: 2 }, admit);
    seen.length = 0;
    // undo the grouping: the group row comes back and must be judged
    // by its members, or the bench refuses its own prior state
    await undoBench(drafts, "grp-undo", { n: 1 }, admit);
    assert.ok(seen.length >= 2,
      `the undo's group row was judged by its members (saw ${String(seen.length)} judgments) — ` +
      "a whole-row judgment asks the board about the literal 'group' and bricks the undo");
    assert.ok(!seen.some((r) => r.card === "group"),
      "the literal 'group' never reached the board");
  });
});
