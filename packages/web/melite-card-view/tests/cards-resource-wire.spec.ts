// cards-resource-wire.spec.ts — fetchBench's missing-bench law and
// restoreRunToBench's refusal arms (2026-09-16 burn-down).
//
// THE ONE-LANE LAW (stroke 81): the doors ride the mounted
// namespaces through mountEstateFakes — no fetch stub answers an
// estate verb. Refusals queue in `refusals` (one entry per refused
// call, served as the error-branch RemoteError carrying the door's
// own text); transport deaths queue in `throws` (the promise itself
// rejects). Call records are fakes.calls entries {method, args}
// with the namespace positional params.
import { afterEach, describe, expect, test, vi } from "vitest";
import { unbindEstateRemote } from '@melite/card-base/client';
import { mountEstateFakes } from "./estate-harness.ts";
import {
  fetchBench,
  freshStageRow,
  readDraft,
  readStageRow,
  restoreRunToBench,
} from "../src/client/cards-resource.ts";
import type { CardsRunValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

function run(over: Partial<CardsRunValue> = {}): CardsRunValue {
  return {
    kind: "run", runId: "r_1", status: "completed", draftId: "d_1",
    stages: [], lastFrame: undefined, ...over,
  };
}

describe("fetchBench — a missing bench is a zero state, not a failure", () => {
  test("a served bench reads through", async () => {
    const fakes = mountEstateFakes({
      benchDoc: { draft_id: "bench-main", rev: 4, stages: [{ id: "s_0" }], log: [] },
    });
    try {
      await expect(fetchBench("main")).resolves.toMatchObject({ draftId: "bench-main", rev: 4 });
    } finally {
      fakes.unmount();
    }
  });

  test("a not-yet-born bench serves empty (rev 0 — the birth lands fresh)", async () => {
    const fakes = mountEstateFakes({
      refusals: [{ method: "bench/get", message: "no such bench" }],
    });
    try {
      await expect(fetchBench("main")).resolves.toEqual({
        kind: "bench", draftId: "bench-main", rev: 0, stages: [], log: [], sessionKey: "main",
      });
    } finally {
      fakes.unmount();
    }
  });

  test("any other refusal rethrows with the door's own text", async () => {
    const fakes = mountEstateFakes({
      refusals: [{ method: "bench/get", message: "admission: nope" }],
    });
    try {
      await expect(fetchBench("main")).rejects.toThrow("admission: nope");
    } finally {
      fakes.unmount();
    }
  });

  test("a foreign throw propagates verbatim (never paraphrased)", async () => {
    const fakes = mountEstateFakes({
      throws: [{ method: "bench/get", value: "kablam" }],
    });
    try {
      await expect(fetchBench("main")).rejects.toBe("kablam");
    } finally {
      fakes.unmount();
    }
  });
});

describe("readDraft — the bench rev rides when it is a number", () => {
  const doc = { intent: "the film", stages: [{ id: "s_0" }] };
  test("a numeric bench rev rides", () => {
    expect(readDraft("d", "s_0", { ...doc, bench: { rev: 5 } }).rev).toBe(5);
  });
  test("a missing bench reads rev 0", () => {
    expect(readDraft("d", "s_0", doc).rev).toBe(0);
  });
  test("a null bench reads rev 0", () => {
    expect(readDraft("d", "s_0", { ...doc, bench: null }).rev).toBe(0);
  });
  test("a non-numeric bench rev reads rev 0", () => {
    expect(readDraft("d", "s_0", { ...doc, bench: { rev: "x" } }).rev).toBe(0);
  });
});

describe("restoreRunToBench — the refusal arms (ONE batch write, operator 2026-10-21)", () => {
  const DRAFT = [{ id: "s_0", card: "image-gen", engine: "comfyui", params: { steps: 1 } }];

  /** The bench/add-stages docs the restore sent (the ONE batch door —
   *  any bench/add-stage call on this plane is the retired N-write
   *  path crawling back). */
  function batchDocs(calls: Array<{ method: string; args: Record<string, unknown> }>): unknown[] {
    return calls
      .filter((c) => c.method === "bench/add-stages")
      .map((c) => c.args["doc"]);
  }
  function legacyAdds(calls: Array<{ method: string; args: Record<string, unknown> }>): number {
    return calls.filter((c) => c.method === "bench/add-stage").length;
  }

  test("an unreadable draft throws with the door's own text (Error and foreign)", async () => {
    const refused = mountEstateFakes({
      refusals: [{ method: "drafts/get", message: "admission: nope" }],
    });
    try {
      await expect(restoreRunToBench(run(), "main")).rejects.toThrow(
        "the producing draft is unreadable: admission: nope",
      );
    } finally {
      refused.unmount();
    }
    const dead = mountEstateFakes({
      throws: [{ method: "drafts/get", value: "kablam" }],
    });
    try {
      await expect(restoreRunToBench(run(), "main")).rejects.toThrow(
        "the producing draft is unreadable: kablam",
      );
    } finally {
      dead.unmount();
    }
  });

  test("a draft with no stage list holds nothing to restore", async () => {
    const fakes = mountEstateFakes({
      draftStages: "nope" as unknown as Array<Record<string, unknown>>,
    });
    try {
      await expect(restoreRunToBench(run(), "main")).rejects.toThrow(
        "the producing draft holds no stages — nothing to restore",
      );
    } finally {
      fakes.unmount();
    }
  });

  test("an unreadable bench throws (Error and foreign voices)", async () => {
    const refused = mountEstateFakes({
      draftStages: DRAFT,
      refusals: [{ method: "bench/get", message: "admission: nope" }],
    });
    try {
      await expect(restoreRunToBench(run(), "main")).rejects.toThrow("the bench is unreadable: admission: nope");
    } finally {
      refused.unmount();
    }
    const dead = mountEstateFakes({
      draftStages: DRAFT,
      throws: [{ method: "bench/get", value: "kablam" }],
    });
    try {
      await expect(restoreRunToBench(run(), "main")).rejects.toThrow("the bench is unreadable: kablam");
    } finally {
      dead.unmount();
    }
  });

  test("a revless bench rides ONE batch write at expect_rev 0 (the birth row's own rev)", async () => {
    const fakes = mountEstateFakes({
      draftStages: DRAFT,
      benchDoc: { rev: "x", stages: [], log: [] },
    });
    try {
      await expect(restoreRunToBench(run(), "main")).resolves.toMatchObject({ added: 1 });
      expect(batchDocs(fakes.calls).map((d) => (d as Record<string, unknown>)["expect_rev"])).toEqual([0]);
      expect(batchDocs(fakes.calls).length, "exactly ONE batch write").toBe(1);
      expect(legacyAdds(fakes.calls), "no per-stage writes — the retired N-write path").toBe(0);
    } finally {
      fakes.unmount();
    }
  });

  test("an empty-string engine is omitted (never a lying empty engine)", async () => {
    const fakes = mountEstateFakes({
      draftStages: [{ id: "s_0", card: "c", engine: "" }],
      benchDoc: { rev: 0, stages: [], log: [] },
    });
    try {
      await restoreRunToBench(run(), "main");
      expect(batchDocs(fakes.calls)).toEqual([{ stages: [{ card: "c", id: "s_0" }], author: "user", expect_rev: 0 }]);
    } finally {
      fakes.unmount();
    }
  });

  test("the batch rides the bench/get rev (the door chains the CAS server-side)", async () => {
    const fakes = mountEstateFakes({
      draftStages: [
        { id: "s_0", card: "a" },
        { id: "s_1", card: "b" },
      ],
      benchDoc: { rev: 7, stages: [], log: [] },
    });
    try {
      await expect(restoreRunToBench(run(), "main")).resolves.toMatchObject({ added: 2 });
      // ONE write names the rev once — there is no per-write chain
      expect(batchDocs(fakes.calls).map((d) => (d as Record<string, unknown>)["expect_rev"])).toEqual([7]);
    } finally {
      fakes.unmount();
    }
  });

  test("a foreign add-stages throw stops the restore with its text", async () => {
    const fakes = mountEstateFakes({
      draftStages: DRAFT,
      benchDoc: { rev: 0, stages: [], log: [] },
      throws: [{ method: "bench/add-stages", value: "kablam" }],
    });
    try {
      await expect(restoreRunToBench(run(), "main")).rejects.toThrow(
        "restore stopped after 0 stage(s): kablam",
      );
    } finally {
      fakes.unmount();
    }
  });

  test("a door refusal stops the restore whole (the batch refuses atomically)", async () => {
    const fakes = mountEstateFakes({
      draftStages: DRAFT,
      benchDoc: { rev: 0, stages: [], log: [] },
      refusals: [{ method: "bench/add-stages", message: "stage 0 of the batch: card is required" }],
    });
    try {
      await expect(restoreRunToBench(run(), "main")).rejects.toThrow(
        "restore stopped after 0 stage(s): stage 0 of the batch: card is required",
      );
    } finally {
      fakes.unmount();
    }
  });

  test("an id the bench already holds rides id-less and noted (the whole-batch pre-shape, never a retry round trip)", async () => {
    const fakes = mountEstateFakes({
      draftStages: [{ id: "s_0", card: "image-gen", params: { steps: 1 } }],
      benchDoc: { rev: 0, stages: [{ id: "s_0", card: "x" }], log: [] },
    });
    try {
      const report = await restoreRunToBench(run(), "main");
      expect(report).toMatchObject({ added: 1, skipped: 0 });
      expect(report.notes).toEqual(["s_0 was already on the bench — added under a fresh id"]);
      // the collision is pre-computed client-side: the row carries NO
      // id, the door mints fresh — one call, no retry
      expect(batchDocs(fakes.calls)).toEqual([{ stages: [{ card: "image-gen", params: { steps: 1 } }], author: "user", expect_rev: 0 }]);
      expect(legacyAdds(fakes.calls)).toBe(0);
    } finally {
      fakes.unmount();
    }
  });

  test("an id-less stage restores without the id (the bench auto-ids)", async () => {
    const fakes = mountEstateFakes({
      draftStages: [{ card: "image-gen", params: {} }],
      benchDoc: { rev: 0, stages: [], log: [] },
    });
    try {
      await expect(restoreRunToBench(run(), "main")).resolves.toMatchObject({ added: 1 });
      expect(batchDocs(fakes.calls)).toEqual([{ stages: [{ card: "image-gen", params: {} }], author: "user", expect_rev: 0 }]);
    } finally {
      fakes.unmount();
    }
  });
});

describe("restoreRunToBench — the outcome carry (the run view previews after a restore)", () => {
  /** A completed run whose stage row holds the terminal outcome. */
  const doneRun = (): CardsRunValue => run({
    runId: "run-a1",
    stages: [{ id: "s_0", status: "completed", url: "out.png", gallery: [{ name: "out.png" }] }],
  });

  /** The drafts/patch calls the restore sent (the outcome door). */
  const patches = (calls: Array<{ method: string; args: Record<string, unknown> }>) =>
    calls.filter((c) => c.method === "drafts/patch").map((c) => c.args);

  test("a completed stage's outcome rides the restored row through the drafts patch door", async () => {
    const fakes = mountEstateFakes({
      draftStages: [{ id: "s_0", card: "image-gen" }],
      benchDoc: { rev: 0, stages: [], log: [] },
    });
    try {
      const report = await restoreRunToBench(doneRun(), "main");
      expect(report).toMatchObject({ added: 1, skipped: 0, carried: 1 });
      // The patch is terminalOutcomeOf's exact stamp — the SAME
      // builder the live observer writes (parity is the law): url
      // rides verbatim (bare run-relative), the rewrite lives in
      // artifacts/assetUrls where the tile's gallery face reads it.
      const [patch] = patches(fakes.calls);
      expect(patch?.["draftId"]).toBe("main");
      // a non-colliding draft id seats AS SENT (the door honors a
      // provided id) — the carry rides the answer's id, here s_0
      expect(patch?.["stageId"]).toBe("s_0");
      expect(patch?.["patch"]).toEqual({
        runStatus: "done",
        result: {
          run_id: "run-a1",
          url: "out.png",
          artifacts: { "out.png": "/melite-media/runs/run-a1/out.png" },
          assetUrls: ["out.png", "/melite-media/runs/run-a1/out.png"],
        },
      });
    } finally {
      fakes.unmount();
    }
  });

  test("a collision pre-shape carries onto the SEATED id (the answer's, never the draft's)", async () => {
    const fakes = mountEstateFakes({
      draftStages: [{ id: "s_0", card: "image-gen" }],
      // the bench already holds s_0 — the client drops the id and
      // the door mints fresh (the whole-batch pre-shape law)
      benchDoc: { rev: 0, stages: [{ id: "s_0", card: "x" }], log: [] },
    });
    try {
      const report = await restoreRunToBench(doneRun(), "main");
      expect(report).toMatchObject({ added: 1, carried: 1 });
      // the id-less row seats fresh_1, and the carry rides the
      // ANSWER's seated id, never the draft's taken one
      expect(patches(fakes.calls).map((p) => p["stageId"])).toEqual(["fresh_1"]);
    } finally {
      fakes.unmount();
    }
  });

  test("a stage the run never completed carries nothing (no patch fires)", async () => {
    const fakes = mountEstateFakes({
      draftStages: [{ id: "s_0", card: "image-gen" }],
      benchDoc: { rev: 0, stages: [], log: [] },
    });
    try {
      const report = await restoreRunToBench(
        run({ stages: [{ id: "s_0", status: "queued" }] }), "main",
      );
      expect(report).toMatchObject({ added: 1, carried: 0 });
      expect(patches(fakes.calls)).toEqual([]);
    } finally {
      fakes.unmount();
    }
  });

  test("a failed stage carries the failure (the silent-failure law rides the restore)", async () => {
    const fakes = mountEstateFakes({
      draftStages: [{ id: "s_0", card: "image-gen" }],
      benchDoc: { rev: 0, stages: [], log: [] },
    });
    try {
      const report = await restoreRunToBench(
        run({ stages: [{ id: "s_0", status: "error", error: "engine refused the graph" }] }), "main",
      );
      expect(report).toMatchObject({ added: 1, carried: 1 });
      expect(patches(fakes.calls)[0]?.["patch"]).toEqual({
        runStatus: "failed",
        result: { run_id: "r_1", error: "engine refused the graph" },
      });
    } finally {
      fakes.unmount();
    }
  });

  test("a refused carry is a note, never a stop — the workflow stands on the bench (Error and foreign voices)", async () => {
    const refused = mountEstateFakes({
      draftStages: [{ id: "s_0", card: "image-gen" }],
      benchDoc: { rev: 0, stages: [], log: [] },
      refusals: [{ method: "drafts/patch", message: "admission: nope" }],
    });
    try {
      const report = await restoreRunToBench(doneRun(), "main");
      expect(report).toMatchObject({ added: 1, carried: 0 });
      expect(report.notes[0]).toContain("could not carry s_0's outcome: admission: nope");
    } finally {
      refused.unmount();
    }
    const dead = mountEstateFakes({
      draftStages: [{ id: "s_0", card: "image-gen" }],
      benchDoc: { rev: 0, stages: [], log: [] },
      throws: [{ method: "drafts/patch", value: "kablam" }],
    });
    try {
      const report = await restoreRunToBench(doneRun(), "main");
      expect(report).toMatchObject({ added: 1, carried: 0 });
      expect(report.notes[0]).toContain("could not carry s_0's outcome: kablam");
    } finally {
      dead.unmount();
    }
  });

  test("an answer naming no stage id falls back to the draft id (estate drift, never a lost carry)", async () => {
    const fakes = mountEstateFakes({
      draftStages: [{ id: "s_0", card: "image-gen" }],
      benchDoc: { rev: 0, stages: [], log: [] },
      addStageNoIds: true,
    });
    try {
      const report = await restoreRunToBench(doneRun(), "main");
      expect(report).toMatchObject({ added: 1, carried: 1 });
      // the door answered without the seated id — the carry rides the
      // id the restore itself sent
      expect(patches(fakes.calls).map((p) => p["stageId"])).toEqual(["s_0"]);
    } finally {
      fakes.unmount();
    }
  });
});

describe("freshStageRow — the drill's fresh read (null when gone, never a throw)", () => {
  test("a held row reads through", async () => {
    const fakes = mountEstateFakes({
      draftStages: [{ id: "s_0", runStatus: "running" }],
    });
    try {
      await expect(freshStageRow("d_1", "s_0")).resolves.toMatchObject({ id: "s_0" });
    } finally {
      fakes.unmount();
    }
  });

  test("malformed rows filter out (a string, a null, an id-less row — then the match)", async () => {
    const fakes = mountEstateFakes({
      draftStages: ["x", null, { noid: 1 }, { id: "s_0" }] as unknown as Array<Record<string, unknown>>,
    });
    try {
      await expect(freshStageRow("d_1", "s_0")).resolves.toMatchObject({ id: "s_0" });
    } finally {
      fakes.unmount();
    }
  });

  test("a non-string intent degrades to empty — the row still reads (the estate misbehaving)", async () => {
    const fakes = mountEstateFakes({
      draftStages: [{ id: "s_0" }],
      draftIntent: 42,
    });
    try {
      await expect(freshStageRow("d_1", "s_0")).resolves.toMatchObject({ id: "s_0" });
    } finally {
      fakes.unmount();
    }
  });

  test("a missing row reads null (the drill composes its held row — the fresh-drop law; the RUN door instead refuses on unreadable, cards-tab.spec.ts P7-C1)", async () => {
    const fakes = mountEstateFakes({
      draftStages: [{ id: "s_0" }],
    });
    try {
      await expect(freshStageRow("d_1", "s_9")).resolves.toBeNull();
    } finally {
      fakes.unmount();
    }
  });

  test("a stageless doc reads null (never undefined)", async () => {
    const fakes = mountEstateFakes({ draftStages: [] });
    try {
      await expect(freshStageRow("d_1", "s_0")).resolves.toBeNull();
    } finally {
      fakes.unmount();
    }
  });

  test("a dead door reads null (the refusal stays honest upstream)", async () => {
    const fakes = mountEstateFakes({
      refusals: [{ method: "drafts/get", message: "admission: nope" }],
    });
    try {
      await expect(freshStageRow("d_1", "s_0")).resolves.toBeNull();
    } finally {
      fakes.unmount();
    }
  });

  test("a non-array stage list reads null (estate drift — never a throw on the drill's fresh read)", async () => {
    const fakes = mountEstateFakes({
      draftStages: "nope" as unknown as Array<Record<string, unknown>>,
    });
    try {
      await expect(freshStageRow("d_1", "s_0")).resolves.toBeNull();
    } finally {
      fakes.unmount();
    }
  });

  // P7-C2 — the null contract's two halves ride distinct statuses on
  // readStageRow (the RUN door's refused reason); freshStageRow keeps
  // the bare null for the drill's call sites. Cross-links:
  // cards-tab.spec.ts P7-C1 (failed read refuses / absent composes).
  test("readStageRow names the unreadable half (a dead door is not a gone row)", async () => {
    const fakes = mountEstateFakes({
      refusals: [{ method: "drafts/get", message: "admission: nope" }],
    });
    try {
      await expect(readStageRow("d_1", "s_0")).resolves.toEqual({ status: "unreadable" });
    } finally {
      fakes.unmount();
    }
  });

  test("readStageRow names the gone half (a missing row is not an unreadable bench)", async () => {
    const fakes = mountEstateFakes({
      draftStages: [{ id: "s_0" }],
    });
    try {
      await expect(readStageRow("d_1", "s_9")).resolves.toEqual({ status: "gone" });
    } finally {
      fakes.unmount();
    }
  });

  test("readStageRow carries the estate row on the ready half", async () => {
    const fakes = mountEstateFakes({
      draftStages: [{ id: "s_0", runStatus: "running" }],
    });
    try {
      await expect(readStageRow("d_1", "s_0")).resolves.toMatchObject({ status: "ready", row: { id: "s_0" } });
    } finally {
      fakes.unmount();
    }
  });
});
