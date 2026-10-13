import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { ensureBench, getBench, patchBench, addStageBench, rewireBench, removeStageBench, normalizeStages } from "../src/bench.ts";
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
    b = (doc.stages as Array<{ id: string; inputs: Record<string, unknown> }>).find((x) => x.id === "b")!; // the same seeded-row read as the binding check above
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

// ── THE CONTAINER FAILS CLOSED (2026-10-11, the wire audit) ─────
// The wire audit's one fail-open: a malformed `inputs` CONTAINER was
// indistinguishable from an absent one. `isRecord(x) ? x : {}` made
// `inputs: []` succeed, store no wire, and answer the caller "added" —
// so the loss surfaced much later as a missing required param at run
// time. A malformed BINDING already refused (bench/bad-wire) and
// rewire's malformed `from` already refused (bench/bad-body): the
// container was the single shape that failed open, which is the one
// shape the operator would never think to check.
describe("a malformed inputs CONTAINER refuses, like every other malformed wire shape", () => {
  /** `getBench(...).stages` is a JsonValue, so the no-leak arms
   *  below narrow it once here rather than casting at each site. */
  const stages = (drafts: Parameters<typeof getBench>[0], session: string): unknown[] => {
    const s: unknown = getBench(drafts, session)["stages"];
    assert.ok(Array.isArray(s), "the bench serves an array of stages");
    return s as unknown[];
  };

  test("add_stage with a non-record inputs refuses and names the shape", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    const refusal = await codeOf(addStageBench(drafts, "s", {
      card: "image-edit",
      expect_rev: 1,
      params: { prompt: "zoom out" },
      inputs: [] as never,
    }));
    assert.match(refusal, /bench\/bad-body/);
    assert.match(refusal, /inputs must be an object/);
    // AND the refused write mutated nothing — no stage, no half-wire.
    assert.equal(stages(drafts, "s").length, 1);
  });

  test("add_stage with a string inputs refuses too (any non-record)", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    const refusal = await codeOf(addStageBench(drafts, "s", {
      card: "image-gen",
      expect_rev: 0,
      inputs: "s_0.image" as never,
    }));
    assert.match(refusal, /bench\/bad-body/);
    assert.equal(stages(drafts, "s").length, 0);
  });

  test("an ABSENT inputs is still legal (the one-stage bench, which is most of them)", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    const row = await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    assert.equal(row.stage, "s_0");
    const first = stages(drafts, "s")[0] as { inputs?: unknown };
    assert.deepEqual(first.inputs, {});
  });

  test("patch cannot carry `inputs` at all — the wire has ONE door", async () => {
    // The audit found a merge-with-null-delete branch on the patch
    // path and I nearly walled it. `PATCH_KEYS` does not admit
    // `inputs`, so `refuseUnknown` answers first and that branch is
    // unreachable for a bench. The law is the better one: an edge is
    // added by add_stage/rewire and removed by rewire/remove, never
    // smuggled in through a params-shaped door. Pinned so the key is
    // not "helpfully" added later.
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    const refusal = await codeOf(patchBench(drafts, "s", {
      stage: "s_0", expect_rev: 1,
      inputs: { image: { stage: "s_0", output: "image" } } as never,
    }));
    assert.match(refusal, /bench\/bad-body/);
    assert.match(refusal, /unknown bench key\(s\): inputs/);
  });

  test("a patch with an ABSENT inputs still merges nothing and succeeds", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    await addStageBench(drafts, "s", { card: "image-gen", expect_rev: 0 });
    const row = await patchBench(drafts, "s", {
      stage: "s_0", expect_rev: 1, params: { prompt: "a lighthouse" },
    });
    assert.equal(row.stage, "s_0");
  });
});

// ── A LOAD MUST NOT LAND TWO ROWS UNDER ONE ID (2026-10-11) ─────
// The identity audit's A3, proved through the real functions: the
// write door mints `s_2` over `[s_1]`, but the LOAD path fills an
// id-less row from its POSITION, so `[{id:"s_1"}, {…no id…}]` landed
// as `["s_1","s_1"]`. Only add_stage carries the duplicate gate, so
// nothing caught it — and two rows under one id is not cosmetic:
// `stageRow()` finds the first, a rewire writes the first, and the
// second row's wiring becomes a wire naming a stage the bench answers
// with someone else's body.
describe("a load never lands two rows under one stage id", () => {
  test("an id-less row beside an id'd row is re-minted, not duplicated", () => {
    const rows = normalizeStages(
      [
        { id: "s_1", card: "image-gen", params: { prompt: "first" } },
        { card: "image-gen", params: { prompt: "second" } },
      ],
      "agent",
    );
    const ids = rows.map((r) => String(r["id"]));
    assert.equal(new Set(ids).size, ids.length, `ids collided: ${JSON.stringify(ids)}`);
    assert.ok(ids.includes("s_1"), "the row that HAD an id keeps it");
  });

  test("a row's OWN id is never rewritten (a re-mint that steals an id is worse)", () => {
    const rows = normalizeStages(
      [
        { id: "s_0", card: "image-gen" },
        { id: "s_7", card: "image-gen" },
        { card: "image-gen" },
      ],
      "agent",
    );
    assert.deepEqual(rows.map((r) => String(r["id"])), ["s_0", "s_7", "s_2"]);
  });

  test("several id-less rows each get a DISTINCT id", () => {
    const rows = normalizeStages(
      [{ card: "image-gen" }, { card: "image-gen" }, { card: "image-gen" }],
      "agent",
    );
    const ids = rows.map((r) => String(r["id"]));
    assert.equal(new Set(ids).size, 3, `ids collided: ${JSON.stringify(ids)}`);
  });

  test("an id already ahead of the filled one is still reserved (no steal-forward)", () => {
    // the filled row sits at index 0 and would take s_0; a later row
    // already holds s_0 by name, so the fill must move past it
    const rows = normalizeStages(
      [{ card: "image-gen" }, { id: "s_0", card: "image-gen" }],
      "agent",
    );
    const ids = rows.map((r) => String(r["id"]));
    assert.equal(new Set(ids).size, ids.length, `ids collided: ${JSON.stringify(ids)}`);
    assert.equal(ids[1], "s_0", "the named row keeps its id");
  });

  test("THE DOOR: a load carrying a duplicate lands two distinct rows", async () => {
    const drafts = await boot();
    await ensureBench(drafts, {
      session: "dup",
      stages: [
        { id: "s_0", card: "image-gen", params: { prompt: "first" } },
        { card: "image-gen", params: { prompt: "second" } },
      ],
    });
    const stages = getBench(drafts, "dup").stages as unknown as Array<Record<string, unknown>>;
    const ids = stages.map((r) => String(r["id"]));
    assert.equal(new Set(ids).size, ids.length, `the store now holds a duplicate id: ${JSON.stringify(ids)}`);
  });
});

// ── THE WIRING WALK'S OWN TOLERANCES (a doc is data): the schema
//    promises record rows with string ids, but a doc that predates
//    the promise (or one seeded behind the domain's back) still
//    reads back as it was written — the walks judge what is there,
//    skip the junk, and never crash the door on a row that carries
//    nothing to judge. ─────────────────────────────────────────────

describe("the wiring walk's own tolerances (a doc is data)", () => {
  // rows carry 'agent' provenance (the sanctity law: an unmarked
  // row refuses the agent's remove; the junk this doc proves is the
  // NON-RECORD tolerance, not unmarked records)
  const junkDoc = (): Array<unknown> => [
    null,
    "a bare string row",
    { params: { seed: 2 }, provenance: "agent" },
    {
      id: "g_1",
      card: "group",
      children: [
        null,
        "a bare string member",
        { card: "card-c", params: { seed: 3 }, provenance: "agent" },
        { id: "s_1", card: "card-b", params: { seed: 4 }, provenance: "agent" },
      ],
    },
    { id: "s_0", card: "card-a", params: { seed: 1 }, provenance: "agent" },
  ];

  test("patch judges the live ids of a junk-carrying doc without crashing", async () => {
    const drafts = await boot();
    await seed(drafts, "walk-patch", { stages: junkDoc() as never });
    const out = await patchBench(drafts, "walk-patch", { stage: "s_0", params: { seed: 9 }, expect_rev: 0 });
    assert.ok(out.rev >= 1, "the patch landed over the junk-carrying doc");
    // and the walk stayed honest: the row's params hold the patch
    // (the read-back still carries the junk rows the doc was seeded
    // with — the assertion walks past them, as the door now does)
    const after = getBench(drafts, "walk-patch").stages as unknown as Array<Record<string, unknown>>;
    const row = after.find((r): boolean => typeof r === "object" && r !== null && r["id"] === "s_0");
    assert.equal((row?.["params"] as Record<string, unknown>)["seed"], 9);
  });

  test("remove judges the survivors of a junk-carrying doc — junk skipped, members walked", async () => {
    const drafts = await boot();
    await seed(drafts, "walk-remove", { stages: junkDoc() as never });
    const out = await removeStageBench(drafts, "walk-remove", { stage: "s_0", expect_rev: 0 });
    assert.ok(out.rev >= 1, "the removal landed over the junk-carrying doc");
    const after = getBench(drafts, "walk-remove").stages as unknown as Array<Record<string, unknown>>;
    const recs = after.filter((r): boolean => typeof r === "object" && r !== null);
    assert.ok(!recs.some((r): boolean => r["id"] === "s_0"), "the row is gone");
    assert.ok(recs.some((r): boolean => r["card"] === "group"), "the compound survived the walk");
  });

  test("a row carrying TWO pre-dead refs patches through the tolerance — both named, neither newly created", async () => {
    const drafts = await boot();
    await seed(drafts, "walk-two-dead", {
      stages: [
        {
          id: "s_0",
          card: "card-a",
          params: { a: "$a", b: "$b" },
          inputs: {
            a: { stage: "ghost-1", output: "image" },
            b: { stage: "ghost-2", output: "image" },
          },
        },
        { id: "s_1", card: "card-b", params: {} },
      ] as never,
    });
    // patch the row: both refs pre-date the verb, so the tolerance
    // set carries BOTH and the patch lands (the un-wedge law)
    const out = await patchBench(drafts, "walk-two-dead", { stage: "s_0", params: { seed: 7 }, expect_rev: 0 });
    assert.ok(out.rev >= 1, "the patch landed with both pre-dead refs tolerated");
  });
});
