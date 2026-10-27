// bench-trail.spec.ts — THE OUTPUT-TRAIL CONTRACTS (2026-10-22, the
// operator's "adds to history BEFORE the card finishes / hitting run
// re-adds the current preview / WHERE ARE MY TESTS"). The served
// bench-session doc carried all three wounds on disk: a stage whose
// run settled while its row read "running" forever, the current
// run's preview inside history mid-run, and one generation listed
// twice under two url spellings. Each wall names one; RED means the
// wound is live.
import { describe, expect, test } from "vitest";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type { DraftsDomainSpec } from "../src/spec.js";
import { ensureBench } from "../src/bench.ts";
import { DraftsRemoteService } from "../src/remote.ts";
import { sig, bootCtx } from "./bench-helpers.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

describe("THE OUTPUT-TRAIL CONTRACTS (history before finish / the re-add / the stuck row)", () => {
  async function bootRemote(): Promise<{ svc: DraftsRemoteService; drafts: Domain<DraftsDomainSpec> }> {
    const { ctx, domain } = await bootCtx();
    const svc = new DraftsRemoteService(ctx);
    return { svc, drafts: domain };
  }

  async function rowOf(svc: DraftsRemoteService, stageId = "s_0"): Promise<Record<string, unknown>> {
    const doc = await svc.get(draftIdOf("bench-main"), sig);
    return (doc["stages"] as Array<Record<string, unknown>>).find((s) => s["id"] === stageId)!;
  }

  async function historyOf(svc: DraftsRemoteService, stageId = "s_0"): Promise<Array<Record<string, unknown>>> {
    const stage = await rowOf(svc, stageId);
    return Array.isArray(stage["history"]) ? (stage["history"] as Array<Record<string, unknown>>) : [];
  }

  test("W1 THE SETTLED-LANDING LAW: a result carrying outputs archives ONLY on a terminal arm — mid-run urls never enter history", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0" }] });
    // the exact on-disk wound: the poller's url-carrying patch rides
    // while the run is still going (runStatus running) — the current
    // preview must NOT appear in history before the card finishes
    await svc.patch(draftIdOf("bench-main"), "s_0", { runStatus: "running", result: { run_id: "live", url: "/melite-media/runs/r-live/edit/SaveImage.0_edit_00001_.png" } }, 0, sig);
    expect(await historyOf(svc)).toEqual([]);
    // the terminal landing archives
    await svc.patch(draftIdOf("bench-main"), "s_0", { runStatus: "completed", result: { run_id: "live", url: "/melite-media/runs/r-live/edit/SaveImage.0_edit_00001_.png" } }, 0, sig);
    const hist = await historyOf(svc);
    expect(hist.length).toBe(1);
    expect(hist[0]!["run_id"]).toBe("live");
  });

  test("W2 THE ONE-ROW-PER-RUN LAW: one run is one history row, whatever url spelling each writer used", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0" }] });
    // the exact on-disk wound: run-d39638a1b0d6 sat TWICE — the
    // media-route spelling and the infer-gallery proxy spelling of
    // the SAME file are the SAME generation
    await svc.patch(draftIdOf("bench-main"), "s_0", { runStatus: "completed", result: { run_id: "r1", url: "/melite-media/runs/r1/generate/SaveImage.0_gen_00001_.png" } }, 0, sig);
    await svc.patch(draftIdOf("bench-main"), "s_0", { runStatus: "completed", result: { run_id: "r1", url: "/infer-gallery/artifact?path=r1%2Fgenerate%2FSaveImage.0_gen_00001_.png" } }, 0, sig);
    const hist = await historyOf(svc);
    const runIds = hist.map((e) => e["run_id"]);
    expect(new Set(runIds).size).toBe(runIds.length); // no run twice
    expect(hist.length).toBe(1);
  });

  test("W3 THE TERMINAL-HOLDS LAW: after a run settles its row, a stale non-terminal pass for the SAME run never un-settles it — the tile's stuck face", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0" }] });
    await svc.patch(draftIdOf("bench-main"), "s_0", { runStatus: "completed", result: { run_id: "r1", url: "/runs/r1/out.png" } }, 0, sig);
    // the stale pass (a late poll/tail frame) re-stamps running for
    // the SAME run — the row must hold its terminal word
    await svc.patch(draftIdOf("bench-main"), "s_0", { runStatus: "running", result: { run_id: "r1", progress: { value: 9, max: 10 } } }, 0, sig);
    const stage = await rowOf(svc);
    expect(stage["runStatus"]).toBe("completed");
    // a NEW run (a different run_id) legitimately runs again
    await svc.patch(draftIdOf("bench-main"), "s_0", { runStatus: "running", result: { run_id: "r2", progress: { value: 1, max: 10 } } }, 0, sig);
    expect(await rowOf(svc)).toMatchObject({ runStatus: "running" });
  });

  test("W3b THE CLIENT WORD: 'done' is a terminal word — its landing archives and a stale pass cannot un-settle it", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0" }] });
    // the client's patcher stamps 'done' (cards-resource :310), never
    // 'completed' — the trail must treat it as settled
    await svc.patch(draftIdOf("bench-main"), "s_0", { runStatus: "done", result: { run_id: "r1", url: "/runs/r1/out.png" } }, 0, sig);
    const hist = await historyOf(svc);
    expect(hist.length).toBe(1);
    // the stale tail/poll pass for the same run cannot un-settle
    await svc.patch(draftIdOf("bench-main"), "s_0", { runStatus: "running", result: { run_id: "r1", progress: { value: 8, max: 10 } } }, 0, sig);
    expect(await rowOf(svc)).toMatchObject({ runStatus: "done" });
  });

  test("W5 THE HUSK-DOWNGRADE LAW: the seat's own url-less bookkeeping face never blanks a hero the row can name (defect-hunt §2)", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0" }] });
    // the client's url-rich terminal patch lands first (the race the
    // mirror was built to back up)…
    await svc.patch(draftIdOf("bench-main"), "s_0", { runStatus: "done", result: { run_id: "r1", url: "/melite-media/runs/r1/edit/SaveImage.0_edit_00001_.png" } }, 0, sig);
    // …then the seat's husk {run_id} lands AFTER it (terminal word,
    // same run, no urls) — the hero slot must survive its own
    // bookkeeping
    await svc.patch(draftIdOf("bench-main"), "s_0", { runStatus: "done", result: { run_id: "r1" } }, 0, sig);
    const result = (await rowOf(svc))["result"] as Record<string, unknown>;
    expect(result["url"]).toBe("/melite-media/runs/r1/edit/SaveImage.0_edit_00001_.png");
  });

  test("W6 THE MIRROR VOICE: the settle mirror's rich face lands — run_id, media url, error voice — and the door takes the error arm (defect-hunt §3)", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0" }] });
    // the exact shape settleMirrorPatches emits for a failed stage
    // with a media output: identity + url + the error text
    await svc.patch(draftIdOf("bench-main"), "s_0", {
      runStatus: "failed",
      result: {
        run_id: "r1",
        url: "/melite-media/runs/r1/edit/SaveImage.0_edit_00001_.png",
        error: "_prompt_census: no image-output node admitted (queue full)",
      },
    }, 0, sig);
    const stage = await rowOf(svc);
    expect(stage["runStatus"]).toBe("failed");
    expect((stage["result"] as Record<string, unknown>)["error"]).toContain("no image-output node");
    expect((stage["result"] as Record<string, unknown>)["url"]).toContain("/melite-media/runs/r1/");
    // ...and a fresh press over it (different run) clears the voice
    await svc.patch(draftIdOf("bench-main"), "s_0", { runStatus: "running", result: { run_id: "r2", progress: { value: 1, max: 10 } } }, 0, sig);
    expect(await rowOf(svc)).toMatchObject({ runStatus: "running" });
  });

  test("W7 THE CARRY HEAL: a wholesale load carrying a pre-law duplicated trail lands it deduped — load is not a fossiliser (defect-hunt §6)", async () => {
    const { svc, drafts } = await bootRemote();
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0" }] });
    // the wounded outgoing row: one run, two spellings (the pre-law
    // shape still on operator disks)
    const dup = [
      { run_id: "r1", url: "/melite-media/runs/r1/edit/SaveImage.0_edit_00001_.png" },
      { run_id: "r1", url: "/infer-gallery/artifact?path=r1%2Fedit%2FSaveImage.0_edit_00001_.png" },
      { run_id: "r2", url: "/melite-media/runs/r2/edit/SaveImage.0_edit_00002_.png" },
    ];
    await svc.patch(draftIdOf("bench-main"), "s_0", { runStatus: "done", result: dup[0] }, 0, sig);
    // force the wounded history onto the row (the door's archive
    // would have deduped — this simulates the disk that predates it)
    const rec = drafts.table("docs").get("bench-main")!;
    const stages = (rec.doc["stages"] ?? []) as Array<Record<string, unknown>>;
    stages.find((s) => s["id"] === "s_0")!["history"] = dup;
    await drafts.table("docs").put("bench-main", rec);
    // wholesale load, SAME stage id — the memory carry rides (the
    // CAS law names the rev it may overwrite; a fresh harness bench
    // holds rev 0)
    await ensureBench(drafts, { session: "main", stages: [{ id: "s_0" }], overwrite: true, expect_rev: 0 });
    expect(await historyOf(svc)).toHaveLength(2); // r1 once, r2 once
  });
});
