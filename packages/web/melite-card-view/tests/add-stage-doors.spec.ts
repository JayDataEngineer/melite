// add-stage-doors.spec.ts — add-stage.ts's three unwired verbs
// (reorder/group/ungroup) + the rebase-law arms rebase-law.spec.ts
// leaves uncovered (the no-expect_rev throw, the non-numeric-rev
// re-read, the non-Error throw voice).
//
// THE ONE-LANE LAW (stroke 81): the verbs ride the mounted bench
// namespace through mountEstateFakes — no fetch stub answers an
// estate verb. The verb's doc rides expect_rev (the CAS law);
// bench/get re-reads the CURRENT rev on conflict. Call records are
// {method, args} with the namespace positional params ({sessionKey,
// doc}); the bench/get entry carries no doc.
import { describe, expect, test, afterEach, vi } from "vitest";
import { unbindEstateRemote } from "@melite/card-base/estate-remote";
import { mountEstateFakes } from "./estate-harness.ts";
import {
  addStageWire, groupStagesWire, removeStageWire, reorderStageWire, ungroupStageWire,
} from "../src/client/add-stage.ts";

afterEach(() => { unbindEstateRemote(); vi.unstubAllGlobals(); });

interface Seen { method: string; sessionKey: unknown; doc: Record<string, unknown> }
function seenCalls(calls: Array<{ method: string; args: Record<string, unknown> }>): Seen[] {
  return calls.map((c) => ({
    method: c.method,
    sessionKey: c.args["sessionKey"],
    doc: (c.args["doc"] as Record<string, unknown> | undefined) ?? {},
  }));
}

describe("the unwired verbs — reorder / group / ungroup", () => {
  test("reorderStageWire posts stage/to/expect_rev to bench/reorder", async () => {
    const fakes = mountEstateFakes();
    try {
      // MEANING ADAPTED (dead-transport shape): the old envelope
      // stub answered a scripted {rev: 8}; the live lane echoes the
      // verb doc back ({ok: true} + the doc) — the pinned law is the
      // door address + the doc shape.
      const row = await reorderStageWire({ stage: "s_1", to: 0, expect_rev: 7 }, "main");
      expect(row).toMatchObject({ stage: "s_1", to: 0, expect_rev: 7 });
      const seen = seenCalls(fakes.calls);
      expect(seen).toHaveLength(1);
      expect(seen[0]?.method).toBe("bench/reorder");
      expect(seen[0]?.sessionKey).toBe("main");
      expect(seen[0]?.doc).toEqual({ stage: "s_1", to: 0, expect_rev: 7 });
    } finally {
      fakes.unmount();
    }
  });

  test("groupStagesWire posts stages to bench/group", async () => {
    const fakes = mountEstateFakes();
    try {
      // MEANING ADAPTED (dead-transport shape): {rev: 9, group:
      // 'g_1'} was the scripted envelope answer; the live lane
      // echoes the doc.
      const row = await groupStagesWire({ stages: ["s_0", "s_1"], expect_rev: 8 }, "main");
      expect(row).toMatchObject({ stages: ["s_0", "s_1"], expect_rev: 8 });
      const seen = seenCalls(fakes.calls);
      expect(seen[0]?.method).toBe("bench/group");
      expect(seen[0]?.doc).toEqual({ stages: ["s_0", "s_1"], expect_rev: 8 });
    } finally {
      fakes.unmount();
    }
  });

  test("ungroupStageWire posts stage to bench/ungroup", async () => {
    const fakes = mountEstateFakes();
    try {
      await ungroupStageWire({ stage: "g_1", expect_rev: 9 }, "main");
      const seen = seenCalls(fakes.calls);
      expect(seen[0]?.method).toBe("bench/ungroup");
      expect(seen[0]?.doc).toEqual({ stage: "g_1", expect_rev: 9 });
    } finally {
      fakes.unmount();
    }
  });

  test("removeStageWire rides the caller's session key (the drill's Remove path)", async () => {
    const fakes = mountEstateFakes();
    try {
      await removeStageWire({ stage: "s_2", expect_rev: 10 }, "main");
      const seen = seenCalls(fakes.calls);
      expect(seen[0]?.method).toBe("bench/remove-stage");
      expect(seen[0]?.sessionKey).toBe("main");
    } finally {
      fakes.unmount();
    }
  });

  test("addStageWire rides the caller's session key (per-conversation benches)", async () => {
    const fakes = mountEstateFakes();
    try {
      await addStageWire({ card: "tts", expect_rev: 1 }, "conv-9");
      const seen = seenCalls(fakes.calls);
      expect(seen[0]?.method).toBe("bench/add-stage");
      expect(seen[0]?.sessionKey).toBe("conv-9");
    } finally {
      fakes.unmount();
    }
  });

  test("every verb rebases once on a CAS refusal (the stuck cure is per-verb)", async () => {
    const fakes = mountEstateFakes({
      refusals: [{ method: "bench/reorder", message: "bench main moved: rev is 100, caller held 3" }],
      benchDoc: { rev: 100, stages: [{ id: "s_0" }], log: [] },
    });
    try {
      await reorderStageWire({ stage: "s_0", to: 1, expect_rev: 3 }, "main");
      expect(seenCalls(fakes.calls).map((c) => [c.method, c.doc["expect_rev"]])).toEqual([
        ["bench/reorder", 3],
        ["bench/get", undefined],
        ["bench/reorder", 100],
      ]);
    } finally {
      fakes.unmount();
    }
  });
});

describe("the rebase arms — no rev, bad rev, foreign throws", () => {
  test("a doc with no expect_rev throws the verb's own name (never a blind write)", async () => {
    const fakes = mountEstateFakes();
    try {
      await expect(groupStagesWire({ stages: ["s_0", "s_1"] }, "main"))
        .rejects.toThrow(/bench\/group: no expect_rev to write against/);
      expect(fakes.calls).toHaveLength(0);
    } finally {
      fakes.unmount();
    }
  });

  test("a non-numeric re-read rev leaves the original refusal standing", async () => {
    const fakes = mountEstateFakes({
      refusals: [{ method: "bench/ungroup", message: "bench main moved: rev is 429, caller held 35" }],
      benchDoc: { rev: "not-a-number", stages: [{ id: "g_1" }], log: [] },
    });
    try {
      await expect(ungroupStageWire({ stage: "g_1", expect_rev: 35 }, "main"))
        .rejects.toThrow(/rev is 429, caller held 35/);
      expect(fakes.calls.map((c) => c.method)).toEqual(["bench/ungroup", "bench/get"]);
    } finally {
      fakes.unmount();
    }
  });

  test("a foreign throw propagates verbatim (never a conflict)", async () => {
    const fakes = mountEstateFakes({
      throws: [{ method: "bench/add-stage", value: "kablam" }],
      benchDoc: { rev: 1, stages: [], log: [] },
    });
    try {
      await expect(addStageWire({ card: "image-gen", expect_rev: 1 }, "main"))
        .rejects.toBe("kablam");
    } finally {
      fakes.unmount();
    }
  });

  test("a dead re-read (transport down) leaves the original refusal standing", async () => {
    const fakes = mountEstateFakes({
      refusals: [{ method: "bench/remove-stage", message: "bench cas-conflict: stale" }],
      throws: [{ method: "bench/get", message: "network gone" }],
    });
    try {
      await expect(removeStageWire({ stage: "s_1", expect_rev: 5 }, "main"))
        .rejects.toThrow(/cas-conflict/);
    } finally {
      fakes.unmount();
    }
  });
});
