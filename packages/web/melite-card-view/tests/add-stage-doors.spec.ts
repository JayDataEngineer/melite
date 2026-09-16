// add-stage-doors.spec.ts — add-stage.ts's three unwired verbs
// (reorder/group/ungroup) + the rebase-law arms rebase-law.spec.ts
// leaves uncovered (the no-expect_rev throw, the non-numeric-rev
// re-read, the non-Error throw voice). Same REAL wire law as the
// rebase wall: POST /api/<method>, client-request frame, typert
// server-response envelopes; the verb's doc rides expect_rev (the
// CAS law), bench/get re-reads the CURRENT rev on conflict.
import { describe, expect, test, afterEach } from "vitest";
import {
  addStageWire, groupStagesWire, removeStageWire, reorderStageWire, ungroupStageWire,
} from "../src/client/add-stage.ts";

interface Call { method: string; sessionKey: unknown; doc: Record<string, unknown> }
type Answer = { refuse?: string; value?: unknown; thrown?: unknown };

function stubWire(route: (call: Call) => Answer): Call[] {
  const seen: Call[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = url.startsWith("/api/") ? url.slice("/api/".length) : url;
    let frame: Record<string, unknown> = {};
    if (typeof init?.body === "string") frame = JSON.parse(init.body) as Record<string, unknown>;
    const rpcId = frame["rpcId"];
    const args = ((frame["payload"] as { args?: Record<string, unknown> } | undefined)?.args ?? {}) as Record<string, unknown>;
    const call: Call = {
      method,
      sessionKey: args["sessionKey"],
      doc: (args["doc"] as Record<string, unknown> | undefined) ?? {},
    };
    seen.push(call);
    const answer = route(call);
    if (answer.thrown !== undefined) throw answer.thrown;
    const result = answer.refuse === undefined
      ? { ok: true, value: answer.value ?? {} }
      : { ok: false, error: { message: answer.refuse } };
    return new Response(JSON.stringify({ type: "server-response", rpcId, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  afterEach(() => { globalThis.fetch = realFetch; });
  return seen;
}

describe("the unwired verbs — reorder / group / ungroup", () => {
  test("reorderStageWire posts stage/to/expect_rev to bench/reorder", async () => {
    const seen = stubWire(() => ({ value: { rev: 8 } }));
    const row = await reorderStageWire({ stage: "s_1", to: 0, expect_rev: 7 });
    expect(row).toEqual({ rev: 8 });
    expect(seen).toHaveLength(1);
    expect(seen[0]?.method).toBe("bench/reorder");
    expect(seen[0]?.sessionKey).toBe("main");
    expect(seen[0]?.doc).toEqual({ stage: "s_1", to: 0, expect_rev: 7 });
  });

  test("groupStagesWire posts stages to bench/group", async () => {
    const seen = stubWire(() => ({ value: { rev: 9, group: "g_1" } }));
    const row = await groupStagesWire({ stages: ["s_0", "s_1"], expect_rev: 8 });
    expect(row).toEqual({ rev: 9, group: "g_1" });
    expect(seen[0]?.method).toBe("bench/group");
    expect(seen[0]?.doc).toEqual({ stages: ["s_0", "s_1"], expect_rev: 8 });
  });

  test("ungroupStageWire posts stage to bench/ungroup", async () => {
    const seen = stubWire(() => ({ value: { rev: 10 } }));
    await ungroupStageWire({ stage: "g_1", expect_rev: 9 });
    expect(seen[0]?.method).toBe("bench/ungroup");
    expect(seen[0]?.doc).toEqual({ stage: "g_1", expect_rev: 9 });
  });

  test("removeStageWire rides the default session key (the drill's Remove path)", async () => {
    const seen = stubWire(() => ({ value: { rev: 11 } }));
    await removeStageWire({ stage: "s_2", expect_rev: 10 });
    expect(seen[0]?.method).toBe("bench/remove-stage");
    expect(seen[0]?.sessionKey).toBe("main");
  });

  test("addStageWire rides the caller's session key (per-conversation benches)", async () => {
    const seen = stubWire(() => ({ value: { rev: 2 } }));
    await addStageWire({ card: "tts", expect_rev: 1 }, "conv-9");
    expect(seen[0]?.method).toBe("bench/add-stage");
    expect(seen[0]?.sessionKey).toBe("conv-9");
  });

  test("every verb rebases once on a CAS refusal (the stuck cure is per-verb)", async () => {
    const seen = stubWire((c) => {
      if (c.method === "bench/get") return { value: { rev: 100 } };
      return c.doc["expect_rev"] === 3
        ? { refuse: "bench main moved: rev is 100, caller held 3" }
        : { value: { rev: 101 } };
    });
    await reorderStageWire({ stage: "s_0", to: 1, expect_rev: 3 });
    expect(seen.map((c) => [c.method, c.doc["expect_rev"]])).toEqual([
      ["bench/reorder", 3],
      ["bench/get", undefined],
      ["bench/reorder", 100],
    ]);
  });
});

describe("the rebase arms — no rev, bad rev, foreign throws", () => {
  test("a doc with no expect_rev throws the verb's own name (never a blind write)", async () => {
    const seen = stubWire(() => ({ value: { rev: 1 } }));
    await expect(groupStagesWire({ stages: ["s_0", "s_1"] }))
      .rejects.toThrow(/bench\/group: no expect_rev to write against/);
    expect(seen).toHaveLength(0);
  });

  test("a non-numeric re-read rev leaves the original refusal standing", async () => {
    const seen = stubWire((c) => {
      if (c.method === "bench/get") return { value: { rev: "not-a-number" } };
      return { refuse: "bench main moved: rev is 429, caller held 35" };
    });
    await expect(ungroupStageWire({ stage: "g_1", expect_rev: 35 }))
      .rejects.toThrow(/rev is 429, caller held 35/);
    expect(seen.map((c) => c.method)).toEqual(["bench/ungroup", "bench/get"]);
  });

  test("a non-Error throw is never a conflict (propagates verbatim)", async () => {
    stubWire((c) => {
      if (c.method === "bench/get") return { value: { rev: 1 } };
      return { thrown: "kablam" };
    });
    await expect(addStageWire({ card: "image-gen", expect_rev: 1 }, "main"))
      .rejects.toBe("kablam");
  });

  test("a dead re-read (fetch throws) leaves the original refusal standing", async () => {
    stubWire((c) => {
      if (c.method === "bench/get") return { thrown: new Error("network gone") };
      return { refuse: "bench cas-conflict: stale" };
    });
    await expect(removeStageWire({ stage: "s_1", expect_rev: 5 }))
      .rejects.toThrow(/cas-conflict/);
  });
});
