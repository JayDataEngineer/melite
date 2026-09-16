// cards-resource-wire.spec.ts — fetchBench's missing-bench law and
// restoreRunToBench's refusal arms (2026-09-16 burn-down). fetch is
// stubbed whole per test (the row-law pattern); the estate's answers
// ride the typert server-response envelope, refusals are ok:false
// (never status codes), foreign throws propagate verbatim.
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  fetchBench,
  freshStageRow,
  readDraft,
  restoreRunToBench,
} from "../src/client/cards-resource.ts";
import type { CardsRunValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

interface Answer { refuse?: string; value?: unknown; boom?: unknown }

function stubDoors(route: (method: string, args: Record<string, unknown>) => Answer): void {
  vi.stubGlobal("fetch", async (_url: unknown, init?: RequestInit) => {
    const frame = JSON.parse(String(init?.body)) as {
      rpcId: string; payload: { args: Record<string, unknown> };
    };
    const url = String(_url);
    const method = url.slice(url.indexOf("/api/") + "/api/".length);
    const answer = route(method, frame.payload.args);
    if (answer.boom !== undefined) throw answer.boom;
    const result = answer.refuse === undefined
      ? { ok: true, value: answer.value ?? {} }
      : { ok: false, error: { message: answer.refuse } };
    return new Response(JSON.stringify({ type: "server-response", rpcId: frame.rpcId, result }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  });
}

function run(over: Partial<CardsRunValue> = {}): CardsRunValue {
  return {
    kind: "run", runId: "r_1", status: "completed", draftId: "d_1",
    stages: [], lastFrame: undefined, ...over,
  };
}

describe("fetchBench — a missing bench is a zero state, not a failure", () => {
  test("a served bench reads through", async () => {
    stubDoors((method) => method === "bench/get"
      ? { value: { draft_id: "bench-main", rev: 4, stages: [{ id: "s_0" }], log: [] } }
      : { value: {} });
    await expect(fetchBench()).resolves.toMatchObject({ draftId: "bench-main", rev: 4 });
  });

  test("a not-yet-born bench serves empty (rev 0 — the birth lands fresh)", async () => {
    stubDoors((method) => method === "bench/get" ? { refuse: "no such bench" } : { value: {} });
    await expect(fetchBench()).resolves.toEqual({
      kind: "bench", draftId: "bench-main", rev: 0, stages: [], log: [], sessionKey: "main",
    });
  });

  test("any other refusal rethrows with the door's own text", async () => {
    stubDoors((method) => method === "bench/get" ? { refuse: "admission: nope" } : { value: {} });
    await expect(fetchBench()).rejects.toThrow("admission: nope");
  });

  test("a foreign throw propagates verbatim (never paraphrased)", async () => {
    stubDoors((method) => method === "bench/get" ? { boom: "kablam" } : { value: {} });
    await expect(fetchBench()).rejects.toBe("kablam");
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
  const DRAFT = { stages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: { steps: 1 } }] };

  test("an unreadable draft throws with the door's own text (Error and foreign)", async () => {
    stubDoors((method) => method === "drafts/get" ? { refuse: "admission: nope" } : { value: {} });
    await expect(restoreRunToBench(run())).rejects.toThrow(
      "the producing draft is unreadable: admission: nope",
    );
    stubDoors((method) => method === "drafts/get" ? { boom: "kablam" } : { value: {} });
    await expect(restoreRunToBench(run())).rejects.toThrow(
      "the producing draft is unreadable: kablam",
    );
  });

  test("a draft with no stage list holds nothing to restore", async () => {
    stubDoors((method) => method === "drafts/get" ? { value: { stages: "nope" } } : { value: {} });
    await expect(restoreRunToBench(run())).rejects.toThrow(
      "the producing draft holds no stages — nothing to restore",
    );
  });

  test("an unreadable bench throws (Error and foreign voices)", async () => {
    stubDoors((method) => {
      if (method === "drafts/get") return { value: DRAFT };
      if (method === "bench/get") return { refuse: "admission: nope" };
      return { value: {} };
    });
    await expect(restoreRunToBench(run())).rejects.toThrow("the bench is unreadable: admission: nope");
    stubDoors((method) => {
      if (method === "drafts/get") return { value: DRAFT };
      if (method === "bench/get") return { boom: "kablam" };
      return { value: {} };
    });
    await expect(restoreRunToBench(run())).rejects.toThrow("the bench is unreadable: kablam");
  });

  test("a revless bench chains from 0 (the birth row's own rev)", async () => {
    const adds: unknown[] = [];
    stubDoors((method, args) => {
      if (method === "drafts/get") return { value: DRAFT };
      if (method === "bench/get") return { value: { rev: "x", stages: [] } };
      if (method === "bench/add-stage") {
        adds.push((args["doc"] as Record<string, unknown>)["expect_rev"]);
        return { value: { rev: 1 } };
      }
      return { value: {} };
    });
    await expect(restoreRunToBench(run())).resolves.toMatchObject({ added: 1 });
    expect(adds).toEqual([0]);
  });

  test("an empty-string engine is omitted (never a lying empty engine)", async () => {
    const docs: unknown[] = [];
    stubDoors((method, args) => {
      if (method === "drafts/get") return { value: { stages: [{ id: "s_0", card: "c", engine: "" }] } };
      if (method === "bench/get") return { value: { rev: 0 } };
      if (method === "bench/add-stage") {
        docs.push(args["doc"]);
        return { value: { rev: 1 } };
      }
      return { value: {} };
    });
    await restoreRunToBench(run());
    expect(docs).toEqual([{ card: "c", author: "user", expect_rev: 0, id: "s_0" }]);
  });

  test("a revless add answer keeps the chain (the next add reuses the rev)", async () => {
    const adds: unknown[] = [];
    stubDoors((method, args) => {
      if (method === "drafts/get") {
        return { value: { stages: [
          { id: "s_0", card: "a" },
          { id: "s_1", card: "b" },
        ] } };
      }
      if (method === "bench/get") return { value: { rev: 7 } };
      if (method === "bench/add-stage") {
        adds.push((args["doc"] as Record<string, unknown>)["expect_rev"]);
        return { value: {} };
      }
      return { value: {} };
    });
    await expect(restoreRunToBench(run())).resolves.toMatchObject({ added: 2 });
    expect(adds).toEqual([7, 7]);
  });

  test("a foreign add-stage throw stops the restore with its text", async () => {
    stubDoors((method) => {
      if (method === "drafts/get") return { value: DRAFT };
      if (method === "bench/get") return { value: { rev: 0 } };
      if (method === "bench/add-stage") return { boom: "kablam" };
      return { value: {} };
    });
    await expect(restoreRunToBench(run())).rejects.toThrow(
      "restore stopped after 0 stage(s): kablam",
    );
  });

  test("a twice-taken id stops the restore (the retry's own text rides)", async () => {
    stubDoors((method) => method === "drafts/get" ? { value: DRAFT }
      : method === "bench/get" ? { value: { rev: 0 } }
      : method === "bench/add-stage" ? { refuse: "already on the bench: s_0" }
      : { value: {} });
    await expect(restoreRunToBench(run())).rejects.toThrow(
      "restore stopped after 0 stage(s): already on the bench: s_0",
    );
  });

  test("a foreign retry throw stops the restore with its text", async () => {
    let calls = 0;
    stubDoors((method) => {
      if (method === "drafts/get") return { value: DRAFT };
      if (method === "bench/get") return { value: { rev: 0 } };
      if (method === "bench/add-stage") {
        calls++;
        return calls === 1 ? { refuse: "already on the bench: s_0" } : { boom: "kablam" };
      }
      return { value: {} };
    });
    await expect(restoreRunToBench(run())).rejects.toThrow(
      "restore stopped after 0 stage(s): kablam",
    );
  });

  test("an id-less stage restores without the id (the bench auto-ids)", async () => {
    const docs: unknown[] = [];
    stubDoors((method, args) => {
      if (method === "drafts/get") return { value: { stages: [{ card: "image-gen", params: {} }] } };
      if (method === "bench/get") return { value: { rev: 0 } };
      if (method === "bench/add-stage") {
        docs.push(args["doc"]);
        return { value: { rev: 1 } };
      }
      return { value: {} };
    });
    await expect(restoreRunToBench(run())).resolves.toMatchObject({ added: 1 });
    expect(docs).toEqual([{ card: "image-gen", author: "user", expect_rev: 0, params: {} }]);
  });

  test("a revless retry answer keeps the chain (the next write reuses the rev)", async () => {
    const adds: unknown[] = [];
    stubDoors((method, args) => {
      if (method === "drafts/get") {
        return { value: { stages: [
          { id: "s_0", card: "a" },
          { id: "s_1", card: "b" },
        ] } };
      }
      if (method === "bench/get") return { value: { rev: 4 } };
      if (method === "bench/add-stage") {
        adds.push((args["doc"] as Record<string, unknown>)["expect_rev"]);
        // the taken id retries clean but answers no rev
        if (adds.length === 1) return { refuse: "already on the bench: s_0" };
        if (adds.length === 2) return { value: {} };
        return { value: { rev: 5 } };
      }
      return { value: {} };
    });
    await expect(restoreRunToBench(run())).resolves.toMatchObject({ added: 2 });
    expect(adds).toEqual([4, 4, 4]);
  });
});

describe("freshStageRow — the drill's fresh read (null when gone, never a throw)", () => {
  test("a held row reads through", async () => {
    stubDoors((method) => method === "drafts/get"
      ? { value: { stages: [{ id: "s_0", runStatus: "running" }] } }
      : { value: {} });
    await expect(freshStageRow("d_1", "s_0")).resolves.toMatchObject({ id: "s_0" });
  });

  test("malformed rows filter out (a string, a null, an id-less row — then the match)", async () => {
    stubDoors((method) => method === "drafts/get"
      ? { value: { stages: ["x", null, { noid: 1 }, { id: "s_0" }] } }
      : { value: {} });
    await expect(freshStageRow("d_1", "s_0")).resolves.toMatchObject({ id: "s_0" });
  });

  test("a missing row reads null (the caller composes its held row)", async () => {
    stubDoors((method) => method === "drafts/get"
      ? { value: { stages: [{ id: "s_0" }] } }
      : { value: {} });
    await expect(freshStageRow("d_1", "s_9")).resolves.toBeNull();
  });

  test("a stageless doc reads null (never undefined)", async () => {
    stubDoors((method) => method === "drafts/get" ? { value: {} } : { value: {} });
    await expect(freshStageRow("d_1", "s_0")).resolves.toBeNull();
  });

  test("a dead door reads null (the refusal stays honest upstream)", async () => {
    stubDoors((method) => method === "drafts/get" ? { refuse: "admission: nope" } : { value: {} });
    await expect(freshStageRow("d_1", "s_0")).resolves.toBeNull();
  });
});
