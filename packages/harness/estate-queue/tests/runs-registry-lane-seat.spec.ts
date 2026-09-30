// runs-registry-lane-seat.spec.ts — the LANE shape end to end
// (stroke 4): the estate serves the runs doors with the families
// provider mounted — the catalog service plus every family plugin
// in the door's own context — and a family flow composes from
// ctx.get("models"). The start/doors specs pin the door's logic
// against a three-DECL Service fake; this spec pins the WIRING the
// 3088 commission caught live (2026-10-10): the estate used to
// mount the bare catalog provider, the seat held zero families,
// and every family stage refused "registered: none".
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import modelsFamiliesProvider from "@melite/comfyui-cordis/catalog-registry";
import { modelsProvider } from "@melite/comfyui-cordis/models-service";
import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { QueueCore } from "../src/queue.ts";

let TMP = "";
afterEach(() => {
  if (TMP !== "") {
    rmSync(TMP, { recursive: true, force: true });
    TMP = "";
  }
});

const remote = async <T>(fn: () => Promise<T>): Promise<T | RemoteError> => {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof RemoteError) return e;
    throw e;
  }
};

/** The estate's seat wiring: the queue core, the door's remote
 *  stubs, and the models seat from the mounted provider — real
 *  families, no fake. */
const laneSeat = async (
  provider: typeof modelsFamiliesProvider,
): Promise<{ svc: RunsRuntimeService; ctx: Context }> => {
  TMP = mkdtempSync(join(tmpdir(), "lane-seat-"));
  const ctx = new Context();
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = { core, stateRoot: TMP };
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (id: string): Promise<unknown> => {
      if (id === "d1") return {};
      throw new RemoteError("draft/not-found", "no doc", { draftId: id });
    },
  };
  (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
    objectInfo: (): unknown => null,
    defsSync: (): unknown => new Map(),
    modelFacts: (): unknown => {
      throw new Error("no facts");
    },
    resolveCardFamily: (mid: unknown): unknown => mid,
    modelMids: (): unknown => new Set<string>(),
  };
  await ctx.plugin(provider);
  const svc = new RunsRuntimeService(ctx as unknown as Context);
  return { svc, ctx };
};

describe("the runs door through the lane's models seat", () => {
  it("the families provider populates the seat the door composes from", async () => {
    const { svc, ctx } = await laneSeat(modelsFamiliesProvider);
    const seat = ctx.get("models") as unknown as { allDecls(): { id: string }[] };
    assert.equal(seat.allDecls().length, 47, "the booted table, not a bare service");
    const err = await remote(() =>
      svc.start({ draft_id: "d1", test: false, flow: "character" }, new AbortController().signal),
    );
    // The same preview-scope voice the fake-seat pin holds: the
    // family stages composed past admission (anny body, skin coat,
    // fit seat) and the compiler answered with the skip_when scope.
    assert.ok(err instanceof RemoteError, "the preview scope refuses, never a crash");
    assert.equal((err as RemoteError).code, "runs/preview-scope");
    assert.match((err as RemoteError).message, /skip_when/);
    await ctx.fiber.dispose();
  });

  it("a bare catalog mount leaves the seat empty and every family stage refuses (the gap, pinned)", async () => {
    const { svc, ctx } = await laneSeat(modelsProvider as typeof modelsFamiliesProvider);
    const seat = ctx.get("models") as unknown as { allDecls(): { id: string }[] };
    assert.equal(seat.allDecls().length, 0);
    const err = await remote(() =>
      svc.start({ draft_id: "d1", test: false, flow: "character" }, new AbortController().signal),
    );
    assert.ok(err instanceof RemoteError);
    assert.equal((err as RemoteError).code, "runs/invalid-request");
    assert.match(
      (err as RemoteError).message,
      /no such family in the models seat \(registered: none\)/,
    );
    await ctx.fiber.dispose();
  });
});
