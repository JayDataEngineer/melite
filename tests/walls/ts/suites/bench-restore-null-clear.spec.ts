// bench-restore-null-clear.spec.ts — THE RESTORE-MEMORY NULL-CLEAR
// wall (D1, the restore-preview recurrence audit 2026-10-31,
// dev_docs/audits/journey/2026-10-31-restore-preview-recurrence.md,
// finding F1 "the reservoir").
//
// THE INVARIANT: a reload-from-history over a bench doc that once
// held a cross-stamp (one run's media on rows that did not produce
// it — the fifteenth report's fossil) can never resurrect that
// fossil. Two half-laws close it, one per plane, and this wall
// judges BOTH plus their join:
//
//   (a) ESTATE — the ensure door's stage-memory carry treats an
//       EXPLICIT `result: null` in a posted row as a CLEAR (the key
//       is deleted; the doc never stores a null — the patch door's
//       RFC 7386 merge law, one null law both transports), while an
//       ABSENT key keeps the fill-never-clobber memory carry (the
//       stage memory law, 2026-09-20 — the 108-test carry set in
//       packages/estate/drafts is that law's own wall; arm (b) here
//       is its firing arm beside the cure).
//   (b) CLIENT — the restore (bench-load.ts's bench_snapshot arm)
//       posts `result: null` on every row whose truth restore leaves
//       preview-less (the unmatched set and the skipped set), never
//       a stripped absence. The client half of the posted SHAPE is
//       pinned by bench-load.spec.ts's re-pinned arms (2026-10-31);
//       this wall rides the REAL client module so a client toggle
//       fires here too.
//   (c) THE JOIN, END TO END — the real `loadRunOntoBench` walks a
//       once-cross-stamped doc through the REAL BenchRemoteService
//       doors (the client's fetch is answered by the real service on
//       the real storage stack, fakes-not-mocks at the transport
//       seam only), TWICE: the first reload clears the fossil, and a
//       second reload over the same doc cannot re-fill it — the
//       reservoir is dead, not drained.
//
// The audit proved this shape live (its recipe R1: red on the stock
// tree, green with both toggles in). Red-proof: toggle the estate
// null-clear out → arms (a)+(c) red (the null stores verbatim);
// toggle the client null-post out → arm (c) red on the reload (the
// stripped-absent post re-fills from the doc's own fossil).
import { afterEach, describe, expect, it, vi } from "vitest";
import { BenchRemoteService } from "@melite/estate-drafts";
import { bootCtx, sig } from "../../../../packages/estate/drafts/tests/bench-helpers.ts";
import { loadRunOntoBench, type BenchLoadDeps } from "../../../../packages/web/infer-gallery/src/client/bench-load.ts";

// THE DOC AS TONIGHT (the audit's live evidence): run
// run-d618b3323465-8f0f5d31's pre-cure restore stamped its film on
// every row the per-stage join left unmatched; only the pressed row
// (s_17) produced it.
const SESSION = "reservoir";
const FOSSIL_RUN = "run-d618b3323465-8f0f5d31";
const FILM_TAIL = "h3-film/SaveVideo.2_h3_t4_film_00001_.mp4";
const route = (tail: string): string =>
  "/infer-gallery/artifact?path=" + encodeURIComponent(tail);
const FILM_HERO = route(FOSSIL_RUN + "/" + FILM_TAIL);

/** The stage's OWN per-stage result — what the cured client builds
 *  for the row the sidecar's stage row names (hero-first, the
 *  gallery-route spelling). */
const perStageFilm = (): {
  run_id: string;
  url: string;
  artifacts: Record<string, string>;
  assetUrls: string[];
} => ({
  run_id: FOSSIL_RUN,
  url: FILM_HERO,
  artifacts: { [FOSSIL_RUN + "/" + FILM_TAIL]: FILM_HERO },
  assetUrls: [FILM_HERO],
});

interface Rig {
  bench: BenchRemoteService;
  revOf: () => Promise<number>;
}

/** A once-cross-stamped bench doc, seeded through the REAL ensure
 *  door in the burn's own two steps: the bench BORN CLEAN (the birth
 *  arm strips archives by law), then the pre-cure restore's wholesale
 *  load posting the cross-stamped rows verbatim — the writer that
 *  made tonight's doc. R1 seeded the fossil through the drafts patch
 *  door instead; the ensure seeding is the burn's own shape and keeps
 *  this suite on one door seam. */
async function crossStampedDoc(): Promise<Rig> {
  const { ctx } = await bootCtx();
  ctx.provide("cardRegistry", {
    resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
    admitStageModel: (): { ok: true } => ({ ok: true }),
  });
  const bench = new BenchRemoteService(ctx);
  await bench.ensure({
    session: SESSION,
    author: "user",
    stages: [
      { id: "s_1", card: "h3-timeline" },
      { id: "s_6", card: "tagger" },
      { id: "s_9", card: "tagger" },
      { id: "s_17", card: "h3-timeline" },
    ],
  }, sig);
  const fossilRow = (id: string, card: string) => ({
    id,
    card,
    provenance: "restored",
    result: perStageFilm(),
    runStatus: "done",
  });
  const revOf = async (): Promise<number> => (await bench.get(SESSION, sig)).rev;
  await bench.ensure({
    session: SESSION,
    author: "user",
    overwrite: true,
    expect_rev: await revOf(),
    stages: [
      fossilRow("s_1", "h3-timeline"),
      fossilRow("s_6", "tagger"),
      fossilRow("s_9", "tagger"),
      // s_17 is the producing row — the same film, lawfully its own.
      fossilRow("s_17", "h3-timeline"),
    ],
  }, sig);
  return { bench, revOf };
}

const rowOf = (
  served: { stages: unknown },
  id: string,
): Record<string, unknown> =>
  (served.stages as Array<Record<string, unknown>>).find((r) => r["id"] === id)!;

/** THE CURED RELOAD BODY (what bench-load.ts's bench_snapshot arm
 *  posts for this doc: the snapshot rows stripped by
 *  RESTORE_STRIP_KEYS, provenance stamped, s_17's own per-stage
 *  truth, and an EXPLICIT result: null on every truthless row — the
 *  unmatched set AND the skipped set). Arm (c) rides the real client
 *  instead; the hand-built copy here is arm (a)'s door-level spelling
 *  and must move with the client's arms if they ever diverge. */
const curedReloadStages = () => [
  { id: "s_1", card: "h3-timeline", provenance: "restored", result: null },
  { id: "s_6", card: "tagger", provenance: "restored", result: null },
  { id: "s_9", card: "tagger", provenance: "restored", result: null },
  { id: "s_17", card: "h3-timeline", provenance: "restored", result: perStageFilm() },
];

describe("the restore-memory null-clear (D1, the reservoir audit F1)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("(a) THE EXPLICIT-NULL CLEAR: a posted result:null deletes the fossil — the doc never stores the null and the fill never fires", async () => {
    const { bench, revOf } = await crossStampedDoc();
    await bench.ensure({
      session: SESSION,
      author: "user",
      overwrite: true,
      expect_rev: await revOf(),
      stages: curedReloadStages(),
    }, sig);
    const served = await bench.get(SESSION, sig);
    // CLEARED means ABSENT — not the fossil, and not a stored null
    // (the RFC 7386 shape law: a null never persists into the doc).
    expect(rowOf(served, "s_6")["result"]).toBeUndefined();
    expect(rowOf(served, "s_1")["result"]).toBeUndefined();
    expect(rowOf(served, "s_9")["result"]).toBeUndefined();
    // the producing row's own landing rides verbatim
    expect((rowOf(served, "s_17")["result"] as Record<string, unknown>)["run_id"]).toBe(FOSSIL_RUN);
  });

  it("(b) THE GOOD LAW SURVIVES: an ABSENT result still carries the stage's own memory, a stated result is never clobbered, a new id starts clean", async () => {
    const { bench, revOf } = await crossStampedDoc();
    await bench.ensure({
      session: SESSION,
      author: "user",
      overwrite: true,
      expect_rev: await revOf(),
      stages: [
        // ABSENT — the poster is silent: the fill-never-clobber carry
        // keeps the stage's own landed memory (the stage memory law,
        // 2026-09-20; the chat agent re-loading the card mid-iteration).
        { id: "s_17", card: "h3-timeline", provenance: "restored" },
        // STATED — the post wins over the fossil prev (fill, never clobber).
        {
          id: "s_6", card: "tagger", provenance: "restored",
          result: { run_id: "run-fresh-press", url: route("run-fresh-press/s_6/out.png") },
        },
        // NEW ID — starts clean, fossil or no fossil.
        { id: "s_new", card: "tagger", provenance: "agent" },
      ],
    }, sig);
    const served = await bench.get(SESSION, sig);
    const carried = rowOf(served, "s_17")["result"] as Record<string, unknown>;
    expect(carried["run_id"]).toBe(FOSSIL_RUN);
    expect(rowOf(served, "s_17")["runStatus"]).toBe("done");
    expect((rowOf(served, "s_6")["result"] as Record<string, unknown>)["run_id"]).toBe("run-fresh-press");
    expect(rowOf(served, "s_new")["result"]).toBeUndefined();
  });

  it("(c) THE RELOAD STAYS CLEAN TWICE: the real client over the real doors clears the fossil on the first reload and a second reload cannot re-fill it", async () => {
    const { bench } = await crossStampedDoc();
    // THE SIDECAR (the audit's live shape): one stage row — s_17's
    // film, joined by bench_stage_id — the run hero otherwise, and
    // s_9 in the skipped set.
    const side = {
      run_id: FOSSIL_RUN,
      skipped_stages: ["s_9"],
      flow: {
        artifacts: ["/data/" + FOSSIL_RUN + "/" + FILM_TAIL],
        bench_snapshot: {
          stages: [
            { id: "s_1", card: "h3-timeline" },
            { id: "s_6", card: "tagger" },
            { id: "s_9", card: "tagger" },
            { id: "s_17", card: "h3-timeline" },
          ],
          intent: "the ninja film bench",
        },
        stages: [
          {
            id: "h3-film", bench_stage_id: "s_17", name: "h3-film", index: 0,
            status: "completed",
            url: FILM_TAIL,
            gallery: [{ name: FILM_TAIL }],
            outputs: {}, expected: {},
          },
        ],
      },
    };
    // fakes-not-mocks at the TRANSPORT seam only: the client's fetch
    // is answered by the REAL BenchRemoteService on the real storage
    // stack — the posted body is the client's own, the carry is the
    // door's own.
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: unknown, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      calls.push({ url, init });
      const json = (body: unknown, status = 200): Response =>
        new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
      if (url.startsWith("/infer-gallery/flow")) return json(side);
      if (url.startsWith("/v1/bench/ensure")) {
        try {
          return json(await bench.ensure(JSON.parse(String(init?.body ?? "{}")), sig));
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : String(e) }, 400);
        }
      }
      if (url.startsWith("/v1/bench/")) {
        try {
          return json(await bench.get(decodeURIComponent(url.slice("/v1/bench/".length)), sig));
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : String(e) }, 404);
        }
      }
      throw new Error("unstubbed door " + url);
    }));
    const deps = (opened: string[], errors: string[]): BenchLoadDeps => ({
      sessionId: SESSION,
      openResource: (address: string) => opened.push(address),
      onError: (message: string) => errors.push(message),
    });
    const assertClean = async (hop: string): Promise<void> => {
      const served = await bench.get(SESSION, sig);
      for (const id of ["s_1", "s_6", "s_9"]) {
        expect(rowOf(served, id)["result"], hop + ": row " + id + " must stay preview-less").toBeUndefined();
      }
      const own = rowOf(served, "s_17")["result"] as Record<string, unknown>;
      expect(own["run_id"], hop + ": the producing row keeps its own film").toBe(FOSSIL_RUN);
    };
    // RELOAD ONE — the fossil is on every non-producing row; the
    // reload must land the workflow preview-less there, not re-paint
    // the fifteenth report.
    const opened1: string[] = [];
    const errors1: string[] = [];
    await loadRunOntoBench(FOSSIL_RUN, deps(opened1, errors1));
    expect(errors1, "the first reload must load, not refuse").toEqual([]);
    expect(opened1).toHaveLength(1);
    await assertClean("after reload one");
    // RELOAD TWO — the reservoir arm: the doc's truthless rows now
    // hold NO memory at all, and the reload must not re-fill them
    // from anything (the client posts the explicit null; the carry
    // honors it; the doc cannot re-mint what it no longer holds).
    const opened2: string[] = [];
    const errors2: string[] = [];
    await loadRunOntoBench(FOSSIL_RUN, deps(opened2, errors2));
    expect(errors2, "the second reload must load, not refuse").toEqual([]);
    expect(opened2).toHaveLength(1);
    await assertClean("after reload two");
    // and the client really rode the door twice (two ensures)
    expect(calls.filter((c) => c.url.startsWith("/v1/bench/ensure"))).toHaveLength(2);
  });
});
