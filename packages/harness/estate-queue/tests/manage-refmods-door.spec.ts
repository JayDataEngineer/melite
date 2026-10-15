/**
 * manage-refmods-door.spec.ts — THE REFMODS LISTING DOOR (2026-11-05,
 * ROADMAP "OWED (2026-11-05 timeline completion)": the estate side of
 * the timeline card's mods square).
 *
 * `refmods_list` reads the H3 refmods loader's own mod_N combos off
 * the SAME cached /object_info doc `lora_list` rides (ManageCtx.
 * objectInfo — absent means the estate's `liveObjectInfo`), through
 * the ONE reader the package exports (refmodNamesFromObjectInfo). The
 * arms prove the door at its OWN path (LAW 4.3): the fed fact, the
 * empty-on-absent law, and the closed vocabulary that carries it.
 */
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx } from "../src/managePlane.ts";

const tempRoots: string[] = [];
const tempRoot = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
};
afterEach(() => {
  while (tempRoots.length > 0) {
    const dir = tempRoots.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

const CTX = (over: Record<string, unknown> = {}): ManageCtx =>
  ({
    repoRoot: tempRoot("refmods-ctx-"),
    endpoint: () => ({ provision: "managed", url: "http://engine.invalid:8188" }),
    models: { allDecls: () => [] } as unknown as ManageCtx["models"],
    timeout: (cb: () => void): (() => void) => {
      const t = setTimeout(cb, 0);
      return () => { clearTimeout(t); };
    },
    ...over,
  } as unknown as ManageCtx);

/** THE ENGINE ANSWER through the plane's own seam — the served
 *  declaration shape (the vendored loader's INPUT_TYPES: every mod_N
 *  slot a [names, {}] combo tuple, names headed by "(none)"). */
function engineAnswer(doc: unknown): () => Promise<unknown> {
  return async (): Promise<unknown> => doc;
}

const LOADER_DOC = {
  MiniMaxH3RefModsLoader: {
    input: {
      required: {
        show_info: [[], {}],
        mod_1: [["(none)", "pack_b", "pack_a"], {}],
        strength_1: [[], {}],
        mod_2: [["pack_a", "sub/dir/pack_c"], {}],
        copies_2: [[], {}],
      },
    },
  },
  // a sibling node the reader must not read
  LoraLoaderModelOnly: { input: { required: { lora_name: [["not_a_refmod"], {}] } } },
};

function run(doc: Record<string, unknown>, ctx: ManageCtx): Promise<[number, { ok: boolean, detail: string, action: string, data?: unknown }]> {
  return dispatchManage(doc, ctx) as unknown as Promise<
    [number, { ok: boolean, detail: string, action: string, data?: unknown }]
  >;
}

describe("the manage plane — the refmods listing door (the mods square's feed)", () => {
  it("refmods_list serves the loader's own stems — every mod_N slot unioned, deduped, sorted", async () => {
    const ctx = CTX({ objectInfo: engineAnswer(LOADER_DOC) });
    const [status, envelope] = await run({ action: "refmods_list" }, ctx);
    assert.equal(status, 200);
    assert.equal(envelope.ok, true);
    assert.equal(envelope.action, "refmods_list");
    const data = envelope.data as { stems?: string[] };
    // the (none) sentinel falls away; the lora node's combo is not a refmods stem
    assert.deepEqual(data.stems, ["pack_a", "pack_b", "sub/dir/pack_c"]);
    assert.match(envelope.detail, /3 refmods pack/);
  });

  it("THE EMPTY-ON-ABSENT LAW: an unreachable engine (null doc) answers ok with NO stems — never a synthetic list, never a throw", async () => {
    const ctx = CTX({ objectInfo: engineAnswer(null) });
    const [status, envelope] = await run({ action: "refmods_list" }, ctx);
    assert.equal(status, 200);
    assert.equal(envelope.ok, true);
    assert.deepEqual((envelope.data as { stems?: string[] }).stems, []);
  });

  it("THE EMPTY-ON-ABSENT LAW: an engine without the loader (pack absent) answers empty at the door", async () => {
    const ctx = CTX({ objectInfo: engineAnswer({ LoraLoaderModelOnly: { input: { required: { lora_name: [["a"], {}] } } } }) });
    const [, envelope] = await run({ action: "refmods_list" }, ctx);
    assert.equal(envelope.ok, true);
    assert.deepEqual((envelope.data as { stems?: string[] }).stems, []);
  });

  it("THE CLOSED VOCABULARY carries the door: the action answers, a typo refuses at 422 NAMING it (the census reds when the entry is toggled out)", async () => {
    const ctx = CTX({ objectInfo: engineAnswer(LOADER_DOC) });
    // the door itself: not a refusal — the vocabulary admits it
    const [, ok_] = await run({ action: "refmods_list" }, ctx);
    assert.equal(ok_.ok, true);
    // the neighbor: the closed set refuses loud and the refusal text
    // NAMES refmods_list — a membership probe over parseReq's own voice
    const [status, refused] = await run({ action: "refmods_list_typo" }, ctx);
    assert.equal(status, 422);
    assert.equal(refused.ok, false);
    assert.ok(
      (refused.detail ?? "").includes("refmods_list"),
      "the closed-vocabulary refusal must name refmods_list (got: " + refused.detail + ")",
    );
  });

  it("a BYO lane refuses the door in the estate's own voice (the estateOnly posture, lora_list's parity)", async () => {
    const ctx = CTX({
      objectInfo: engineAnswer(LOADER_DOC),
      endpoint: () => ({ provision: "byo", url: "http://user-owned:8188" }),
    });
    const [status, envelope] = await run({ action: "refmods_list" }, ctx);
    assert.equal(status, 409);
    assert.equal(envelope.ok, false);
    assert.match(envelope.detail, /byo endpoint: refmods_list orchestrates the estate engine/);
  });
});
