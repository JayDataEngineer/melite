/**
 * THE H3 CHAIN REQUEUE DRIVER WALL (the swap-chain burn, 2026-10-28:
 * top_level_requeue prompts end terminal-success with a durable
 * handoff row and NOBODY queued scene N+1 — the operator re-posted
 * by hand, which re-rendered scene 1 because bare re-POSTs keep
 * LoopStart.start_clip at its default).
 *
 * The wall pins the choreography the driver owes the pack's routes:
 *   claim → patch LoopStart to the owed scene → transition queued →
 *   submit the patched graph → transition consumed (with the
 * accepted prompt id) → wait → report the scene row → repeat until
 * `h3_chain_top_level_complete` → return the FINAL entry (the film
 * assembles only there).
 *
 * Arms (each its own firing arm — the split-brain lesson):
 *   1. ROW PARSE — the ui row of a terminal entry parses; a
 *      complete entry and a plain non-chain entry both read null
 *      (the additive law: non-chain graphs skip the driver).
 *   2. PATCH — LoopStart gets start_clip/scene_range from the
 *      claimed view; the staged graph object is never mutated; no
 *      LoopStart in the graph refuses loud.
 *   3. THE LOOP — two owed scenes: exact route order, exact
 *      accepted_prompt_id, the progress row, the final entry back.
 *   4. THE STOP ARM — a stop between scenes releases the handoff
 *      and refuses loud (checkpoints survive).
 *   5. THE FAILURE ARM — a scene prompt that throws transitions the
 *      handoff to failed and rethrows the scene's own voice.
 *   6. THE CAP — a graph that keeps owing scenes past the ceiling
 *      refuses loud, never spins.
 */
import { describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import {
  driveH3ChainRequeue,
  h3ChainCompleteOf,
  h3RequeueRowOf,
  patchChainLoopStart,
} from "../src/comfyui-execute.ts";
import type { EngineJson } from "../src/comfyui-types.ts";

// ── fixtures ────────────────────────────────────────────────────────────────

type Json = Record<string, EngineJson>;

const requeueEntry = (scene: number, endClip: number): Json => ({
  outputs: {
    "h3-film::MiniMaxH3ChainLoopEnd.0": {
      h3_chain_top_level_requeue: [{
        run_name: "swap_test", handoff_id: `next_scene_${String(scene).padStart(4, "0")}_abc`,
        predecessor_scene: scene - 1, scene, end_clip: endClip,
        workflow_fingerprint: "fp", transition_key: "tk",
      }],
    },
  },
});

const completeEntry: Json = {
  outputs: {
    "h3-film::MiniMaxH3ChainLoopEnd.0": {
      h3_chain_top_level_complete: [{
        run_name: "swap_test", scene: 3, end_clip: 3,
        workflow_fingerprint: "fp", working_branch_id: "main",
      }],
    },
  },
};

const chainGraph: Json = {
  "h3-film::MiniMaxH3ChainLoopStart.0": {
    class_type: "MiniMaxH3ChainLoopStart",
    inputs: { start_clip: 1, scene_range: "", verify_resume_history: true },
  },
  "h3-film::Sampler": { class_type: "OtherNode", inputs: {} },
};

/** The fake client: records every handoff-route call, answers the
 * claim with the owed view. fetchApi is the only face the driver
 * touches on the client for routes. */
type RouteCall = { path: string; body?: Json };

function fakeClient(claimView: Json): { client: unknown; calls: RouteCall[] } {
  const calls: RouteCall[] = [];
  const client = {
    fetchApi: async (path: string, init?: { method?: string; body?: string }): Promise<{ json(): Promise<unknown> }> => {
      const body = init?.body === undefined ? undefined : JSON.parse(init.body) as Json;
      calls.push({ path, body });
      if (path.endsWith("/handoffs/claim")) return { json: async () => ({ handoff: claimView }) };
      if (path.endsWith("/handoffs/transition") || path.endsWith("/handoffs/release")) {
        return { json: async () => ({ handoff: { ...claimView, status: body?.["status"] ?? "released" } }) };
      }
      return { json: async () => ({ error: `no route fixture for ${path}` }) };
    },
  };
  return { client, calls };
}

function ride(
  client: unknown,
  submits: Array<(graph: Json) => Promise<{ promptId: string }>>,
  waits: Array<(promptId: string) => Promise<Json>>,
): {
  ride: Parameters<typeof driveH3ChainRequeue>[3];
  reported: string[];
  retapped: string[];
} {
  const reported: string[] = [];
  const retapped: string[] = [];
  let submitIdx = 0;
  let waitIdx = 0;
  return {
    ride: {
      report: (u): void => { reported.push(String(u["activity"] ?? "")); },
      deadline: (): number => Date.now() + 1000,
      activeKey: "run/dir",
      active: new Map(),
      retap: (id): void => { retapped.push(id); },
      submit: (graph): Promise<{ promptId: string }> => submits[submitIdx++]!(graph),
      wait: (id): Promise<Json> => waits[waitIdx++]!(id),
    },
    reported,
    retapped,
  };
}

// ── arm 1: the row parse ────────────────────────────────────────────────────

describe("h3 chain requeue — the row parse", () => {
  it("an owed-scene entry parses into the driver's row", () => {
    const row = h3RequeueRowOf(requeueEntry(2, 3));
    assert.ok(row !== null);
    expect(row.run_name).toBe("swap_test");
    expect(row.scene).toBe(2);
    expect(row.end_clip).toBe(3);
  });

  it("a complete entry carries no owed scene and reads complete", () => {
    expect(h3RequeueRowOf(completeEntry)).toBeNull();
    expect(h3ChainCompleteOf(completeEntry)).toBe(true);
  });

  it("a plain non-chain entry is neither owed nor complete (the additive law)", () => {
    const plain: Json = { outputs: { saver: { images: [{ filename: "a.png" }] } } };
    expect(h3RequeueRowOf(plain)).toBeNull();
    expect(h3ChainCompleteOf(plain)).toBe(false);
  });
});

// ── arm 2: the patch ────────────────────────────────────────────────────────

describe("h3 chain requeue — patching LoopStart", () => {
  it("start_clip and scene_range land from the claimed view; the staged graph is untouched", () => {
    const next = patchChainLoopStart(chainGraph, { start_clip: 2, scene_range: "2-3" });
    const node = next["h3-film::MiniMaxH3ChainLoopStart.0"] as { inputs: Json };
    expect(node.inputs["start_clip"]).toBe(2);
    expect(node.inputs["scene_range"]).toBe("2-3");
    const stagedNode = chainGraph["h3-film::MiniMaxH3ChainLoopStart.0"] as { inputs: Json };
    expect(stagedNode.inputs["start_clip"]).toBe(1);
    expect(stagedNode.inputs["scene_range"]).toBe("");
  });

  it("a graph with no ChainLoopStart refuses loud", () => {
    expect(() => patchChainLoopStart({ x: { class_type: "Other", inputs: {} } }, { start_clip: 2 }))
      .toThrow(/no MiniMaxH3ChainLoopStart/i);
  });
});

// ── arm 3: the loop ─────────────────────────────────────────────────────────

describe("h3 chain requeue — the choreography", () => {
  it("two owed scenes: claim→queued→submit→consumed per scene, the final entry returns, the progress rows land", async () => {
    const { client, calls } = fakeClient({ handoff_id: "h2", start_clip: 2, scene_range: "2-3" });
    const submittedGraphs: Json[] = [];
    const r = ride(
      client,
      [async (g): Promise<{ promptId: string }> => { submittedGraphs.push(g); return { promptId: "p2" }; },
       async (g): Promise<{ promptId: string }> => { submittedGraphs.push(g); return { promptId: "p3" }; }],
      [async (): Promise<Json> => requeueEntry(3, 3),
       async (): Promise<Json> => completeEntry],
    );
    const final = await driveH3ChainRequeue(client as never, requeueEntry(2, 3), chainGraph, r.ride);
    // the film harvests from the FINAL entry
    expect(h3ChainCompleteOf(final)).toBe(true);
    // route order per scene: claim, transition queued, transition consumed
    const paths = calls.map((c) => c.path);
    expect(paths).toEqual([
      "/minimax_h3_context_loop/handoffs/claim",
      "/minimax_h3_context_loop/handoffs/transition",
      "/minimax_h3_context_loop/handoffs/transition",
      "/minimax_h3_context_loop/handoffs/claim",
      "/minimax_h3_context_loop/handoffs/transition",
      "/minimax_h3_context_loop/handoffs/transition",
    ]);
    const statuses = calls.filter((c) => c.path.endsWith("/transition")).map((c) => c.body?.["status"]);
    expect(statuses).toEqual(["queued", "consumed", "queued", "consumed"]);
    // consumed carries the accepted prompt id
    const consumed = calls.filter((c) => c.body?.["status"] === "consumed").map((c) => c.body?.["accepted_prompt_id"]);
    expect(consumed).toEqual(["p2", "p3"]);
    // each submission rode the PATCHED graph (start_clip advanced)
    const startClips = submittedGraphs.map((g) =>
      (g["h3-film::MiniMaxH3ChainLoopStart.0"] as { inputs: Json }).inputs["start_clip"]);
    expect(startClips).toEqual([2, 2]);
    // the retap follows each new prompt; the scene rows land on the report
    expect(r.retapped).toEqual(["p2", "p3"]);
    expect(r.reported.join(" | ")).toContain("scene 2/3");
    expect(r.reported.join(" | ")).toContain("scene 3/3");
  });
});

// ── arm 4: the stop ─────────────────────────────────────────────────────────

describe("h3 chain requeue — the stop arm", () => {
  it("a stop between scenes releases the handoff and refuses loud", async () => {
    const { client, calls } = fakeClient({ handoff_id: "h2", start_clip: 2 });
    const r = ride(client, [async (): Promise<{ promptId: string }> => ({ promptId: "p2" })],
      [async (): Promise<Json> => requeueEntry(3, 3)]);
    const stopped = { ...r.ride, shouldStop: (): boolean => true };
    await expect(driveH3ChainRequeue(client as never, requeueEntry(2, 3), chainGraph, stopped))
      .rejects.toThrow(/stopped between scenes.*handoff released.*checkpoints survive/s);
    const release = calls.find((c) => c.path.endsWith("/release"));
    assert.ok(release !== undefined, "the handoff is released before the refusal");
    expect(release.body?.["handoff_id"]).toBe("next_scene_0002_abc");
  });
});

// ── arm 5: the failure ──────────────────────────────────────────────────────

describe("h3 chain requeue — the failure arm", () => {
  it("a scene prompt that throws transitions the handoff to failed and rethrows the scene's voice", async () => {
    const { client, calls } = fakeClient({ handoff_id: "h2", start_clip: 2 });
    const r = ride(client,
      [async (): Promise<{ promptId: string }> => ({ promptId: "p2" })],
      [async (): Promise<Json> => { throw new Error("ComfyUI run failed: sampler exploded"); }]);
    await expect(driveH3ChainRequeue(client as never, requeueEntry(2, 3), chainGraph, r.ride))
      .rejects.toThrow(/sampler exploded/);
    const failed = calls.find((c) => c.body?.["status"] === "failed");
    assert.ok(failed !== undefined, "the handoff transitions to failed on a scene loss");
  });
});

// ── arm 6: the cap ──────────────────────────────────────────────────────────

describe("h3 chain requeue — the cap", () => {
  it("a graph that keeps owing scenes past the ceiling refuses loud, never spins", async () => {
    const { client } = fakeClient({ handoff_id: "hx", start_clip: 2 });
    const r = ride(client,
      [async (): Promise<{ promptId: string }> => ({ promptId: "p" })],
      [async (): Promise<Json> => requeueEntry(2, 3)]);
    // the hostile graph never completes: the same submit and the same
    // owed row answer every scene — the ceiling is the only exit.
    const hostile = {
      ...r.ride,
      submit: async (): Promise<{ promptId: string }> => ({ promptId: "p" }),
      wait: async (): Promise<Json> => requeueEntry(2, 3),
    };
    await expect(driveH3ChainRequeue(client as never, requeueEntry(2, 3), chainGraph, hostile))
      .rejects.toThrow(/mis-authored/i);
  });
});

// ── arms 7-9: the headless resume bridge (fix 5) ────────────────────────────
// A crashed chain (scenes 1-2 checkpointed, scene 3 owed, no handoff
// ever emitted) resumes headlessly: the checkpoint listing derives the
// first owed scene, the stored graph is patched to resume there AS A
// REQUEUE CHAIN, and the driver loop finishes the film.

import {
  nextOwedH3Scene,
  patchChainLoopEndRequeue,
  resumeH3ChainFromCheckpoints,
} from "../src/comfyui-execute.ts";
import type { H3CheckpointRow } from "../src/comfyui-execute.ts";

const chainGraphWithEnd: Json = {
  ...chainGraph,
  "h3-film::MiniMaxH3ChainLoopEnd.0": {
    class_type: "MiniMaxH3ChainLoopEnd",
    inputs: { execution_mode: "recursive", between_scene_cleanup: "off" },
  },
};

// ── arm 7: the derive ───────────────────────────────────────────────────────

describe("h3 resume — the owed-scene derive", () => {
  it("one past the contiguous active prefix; an inactive take is not resumable through", () => {
    const rows: H3CheckpointRow[] = [
      { scene: 1, revision: "r1" },
      { scene: 2, revision: "r2" },
      { scene: 3, revision: "r3", inactive_reason: "This take belongs to a different predecessor revision." },
    ];
    expect(nextOwedH3Scene(rows)).toBe(3);
  });

  it("a stale scene mid-prefix stops the prefix (the chain re-renders from it)", () => {
    const rows: H3CheckpointRow[] = [
      { scene: 1, revision: "r1" },
      { scene: 2, revision: "r2", inactive_reason: "branch" },
    ];
    expect(nextOwedH3Scene(rows)).toBe(2);
  });

  it("a gap in the scene numbers stops the prefix at the hole", () => {
    const rows: H3CheckpointRow[] = [
      { scene: 1, revision: "r1" },
      { scene: 3, revision: "r3" },
    ];
    expect(nextOwedH3Scene(rows)).toBe(2);
  });

  it("nothing saved answers null (the caller refuses, not a fresh start)", () => {
    expect(nextOwedH3Scene([])).toBeNull();
  });
});

// ── arm 8: the LoopEnd mode patch ───────────────────────────────────────────

describe("h3 resume — patching LoopEnd into requeue mode", () => {
  it("execution_mode lands as top_level_requeue; the staged graph is untouched", () => {
    const next = patchChainLoopEndRequeue(chainGraphWithEnd);
    const node = next["h3-film::MiniMaxH3ChainLoopEnd.0"] as { inputs: Json };
    expect(node.inputs["execution_mode"]).toBe("top_level_requeue");
    const stagedNode = chainGraphWithEnd["h3-film::MiniMaxH3ChainLoopEnd.0"] as { inputs: Json };
    expect(stagedNode.inputs["execution_mode"]).toBe("recursive");
  });

  it("a graph with no ChainLoopEnd refuses loud", () => {
    expect(() => patchChainLoopEndRequeue({ x: { class_type: "Other", inputs: {} } }))
      .toThrow(/no MiniMaxH3ChainLoopEnd/i);
  });
});

// ── arm 9: the resume choreography ──────────────────────────────────────────

describe("h3 resume — the bridge", () => {
  it("derives scene 3 from the listing, patches the graph (start_clip 3, requeue mode, cleared range), submits, and the driver completes the chain", async () => {
    const { client, calls } = fakeClient({ handoff_id: "next_scene_0004_abc", start_clip: 4 });
    const submittedGraphs: Json[] = [];
    const reported: string[] = [];
    const retapped: string[] = [];
    let submitIdx = 0;
    let waitIdx = 0;
    const submits: Array<(graph: Json) => Promise<{ promptId: string }>> = [
      async (g): Promise<{ promptId: string }> => { submittedGraphs.push(g); return { promptId: "p3" }; },
      async (g): Promise<{ promptId: string }> => { submittedGraphs.push(g); return { promptId: "p4" }; },
    ];
    const waits: Array<(promptId: string) => Promise<Json>> = [
      async (): Promise<Json> => requeueEntry(4, 4),
      async (): Promise<Json> => completeEntry,
    ];
    const final = await resumeH3ChainFromCheckpoints(client as never, chainGraphWithEnd, {
      runName: "swap_test",
      deadline: (): number => Date.now() + 1000,
      report: (u): void => { reported.push(String(u["activity"] ?? "")); },
      retap: (id): void => { retapped.push(id); },
      submit: (g): Promise<{ promptId: string }> => submits[submitIdx++]!(g as Json),
      wait: (id): Promise<Json> => waits[waitIdx++]!(id),
      fetchListing: async (): Promise<H3CheckpointRow[]> => [
        { scene: 1, revision: "r1" },
        { scene: 2, revision: "r2" },
        { scene: 3, revision: "r3", inactive_reason: "different predecessor revision" },
      ],
    });
    expect(h3ChainCompleteOf(final)).toBe(true);
    // the FIRST submit is the resume press itself: scene 3, cleared
    // range (the chain owes through the end), requeue mode (recursive
    // cannot expand past clip 2 — the burn's own ceiling)
    const first = submittedGraphs[0]!;
    const start = first["h3-film::MiniMaxH3ChainLoopStart.0"] as { inputs: Json };
    expect(start.inputs["start_clip"]).toBe(3);
    expect(start.inputs["scene_range"]).toBe("");
    const end = first["h3-film::MiniMaxH3ChainLoopEnd.0"] as { inputs: Json };
    expect(end.inputs["execution_mode"]).toBe("top_level_requeue");
    // the second submit is the DRIVER's scene-4 press (claim view's
    // start_clip), and the routes rode the pack's exactly-once
    // choreography for it
    const secondStart = (submittedGraphs[1]!["h3-film::MiniMaxH3ChainLoopStart.0"] as { inputs: Json }).inputs["start_clip"];
    expect(secondStart).toBe(4);
    expect(calls.map((c) => c.path)).toEqual([
      "/minimax_h3_context_loop/handoffs/claim",
      "/minimax_h3_context_loop/handoffs/transition",
      "/minimax_h3_context_loop/handoffs/transition",
    ]);
    const consumed = calls.find((c) => c.body?.["status"] === "consumed");
    expect(consumed?.body?.["accepted_prompt_id"]).toBe("p4");
    // the resume's own report row names the derived scene
    expect(reported.join(" | ")).toContain("resuming at scene 3");
    expect(retapped).toEqual(["p3", "p4"]);
  });

  it("a run with no saved checkpoints refuses loud — never a silent fresh start", async () => {
    const { client } = fakeClient({ handoff_id: "h", start_clip: 1 });
    await expect(resumeH3ChainFromCheckpoints(client as never, chainGraphWithEnd, {
      runName: "swap_empty",
      deadline: (): number => Date.now() + 1000,
      fetchListing: async (): Promise<H3CheckpointRow[]> => [],
    })).rejects.toThrow(/no active checkpoints/i);
  });
});
