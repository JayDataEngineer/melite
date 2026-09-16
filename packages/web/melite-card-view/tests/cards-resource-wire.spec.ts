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
import { unbindEstateRemote } from "@melite/card-base/estate-remote";
import { mountEstateFakes } from "./estate-harness.ts";
import {
  fetchBench,
  freshStageRow,
  readDraft,
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

/** The bench/add-stage docs the restore sent, in order. */
function addedDocs(calls: Array<{ method: string; args: Record<string, unknown> }>): unknown[] {
  return calls
    .filter((c) => c.method === "bench/add-stage")
    .map((c) => c.args["doc"]);
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

describe("restoreRunToBench — the refusal arms", () => {
  const DRAFT = [{ id: "s_0", card: "image-gen", engine: "comfyui", params: { steps: 1 } }];

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

  test("a revless bench chains from 0 (the birth row's own rev)", async () => {
    const fakes = mountEstateFakes({
      draftStages: DRAFT,
      benchDoc: { rev: "x", stages: [], log: [] },
    });
    try {
      await expect(restoreRunToBench(run(), "main")).resolves.toMatchObject({ added: 1 });
      expect(addedDocs(fakes.calls).map((d) => (d as Record<string, unknown>)["expect_rev"])).toEqual([0]);
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
      expect(addedDocs(fakes.calls)).toEqual([{ card: "c", author: "user", expect_rev: 0, id: "s_0" }]);
    } finally {
      fakes.unmount();
    }
  });

  test("a revless add answer keeps the chain (the next add reuses the rev)", async () => {
    const fakes = mountEstateFakes({
      draftStages: [
        { id: "s_0", card: "a" },
        { id: "s_1", card: "b" },
      ],
      benchDoc: { rev: 7, stages: [], log: [] },
    });
    try {
      // the live lane's add answer carries no rev — the chain holds
      // the bench/get rev for every write.
      await expect(restoreRunToBench(run(), "main")).resolves.toMatchObject({ added: 2 });
      expect(addedDocs(fakes.calls).map((d) => (d as Record<string, unknown>)["expect_rev"])).toEqual([7, 7]);
    } finally {
      fakes.unmount();
    }
  });

  test("a foreign add-stage throw stops the restore with its text", async () => {
    const fakes = mountEstateFakes({
      draftStages: DRAFT,
      benchDoc: { rev: 0, stages: [], log: [] },
      throws: [{ method: "bench/add-stage", value: "kablam" }],
    });
    try {
      await expect(restoreRunToBench(run(), "main")).rejects.toThrow(
        "restore stopped after 0 stage(s): kablam",
      );
    } finally {
      fakes.unmount();
    }
  });

  test("a twice-taken id stops the restore (the retry's own text rides)", async () => {
    const fakes = mountEstateFakes({
      draftStages: DRAFT,
      benchDoc: { rev: 0, stages: [], log: [] },
      // the door keeps refusing — the first write AND the id-less
      // retry both land on the taken id (one queue entry per call).
      refusals: [
        { method: "bench/add-stage", message: "already on the bench: s_0" },
        { method: "bench/add-stage", message: "already on the bench: s_0" },
      ],
    });
    try {
      await expect(restoreRunToBench(run(), "main")).rejects.toThrow(
        "restore stopped after 0 stage(s): already on the bench: s_0",
      );
    } finally {
      fakes.unmount();
    }
  });

  test("a foreign retry throw stops the restore with its text", async () => {
    const fakes = mountEstateFakes({
      draftStages: DRAFT,
      benchDoc: { rev: 0, stages: [], log: [] },
      refusals: [{ method: "bench/add-stage", message: "already on the bench: s_0" }],
      // the retry's own death (the 2nd add-stage call): the first
      // write refuses on the taken id, the id-less retry throws the
      // foreign value verbatim.
      throws: [{ method: "bench/add-stage", value: "kablam", onCall: 2 }],
    });
    try {
      await expect(restoreRunToBench(run(), "main")).rejects.toThrow(
        "restore stopped after 0 stage(s): kablam",
      );
      // the retry path ran: two writes, the second id-less.
      expect(addedDocs(fakes.calls)).toEqual([
        { card: "image-gen", author: "user", expect_rev: 0, engine: "comfyui", params: { steps: 1 }, id: "s_0" },
        { card: "image-gen", author: "user", expect_rev: 0, engine: "comfyui", params: { steps: 1 } },
      ]);
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
      expect(addedDocs(fakes.calls)).toEqual([{ card: "image-gen", author: "user", expect_rev: 0, params: {} }]);
    } finally {
      fakes.unmount();
    }
  });

  test("a revless retry answer keeps the chain (the next write reuses the rev)", async () => {
    const fakes = mountEstateFakes({
      draftStages: [
        { id: "s_0", card: "a" },
        { id: "s_1", card: "b" },
      ],
      benchDoc: { rev: 4, stages: [], log: [] },
      // the taken id burns one refusal; the id-less retry and the
      // next write land clean with no rev in their answers.
      refusals: [{ method: "bench/add-stage", message: "already on the bench: s_0" }],
    });
    try {
      await expect(restoreRunToBench(run(), "main")).resolves.toMatchObject({ added: 2 });
      expect(addedDocs(fakes.calls).map((d) => (d as Record<string, unknown>)["expect_rev"])).toEqual([4, 4, 4]);
    } finally {
      fakes.unmount();
    }
  });

  test("a rev-carrying retry answer moves the chain (the next write rides the fresh rev)", async () => {
    const fakes = mountEstateFakes({
      draftStages: [
        { id: "s_0", card: "a" },
        { id: "s_1", card: "b" },
      ],
      benchDoc: { rev: 4, stages: [], log: [] },
      // the retry's answer stamps rev 9 (the bench re-seated under
      // the restore) — the chain moves with it.
      addStageRevs: [9],
      refusals: [{ method: "bench/add-stage", message: "already on the bench: s_0" }],
    });
    try {
      const report = await restoreRunToBench(run(), "main");
      expect(report).toMatchObject({ added: 2, skipped: 0 });
      expect(report.notes).toEqual(["s_0 was already on the bench — added under a fresh id"]);
      expect(addedDocs(fakes.calls).map((d) => (d as Record<string, unknown>)["expect_rev"])).toEqual([4, 4, 9]);
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

  test("a missing row reads null (the caller composes its held row)", async () => {
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
});
