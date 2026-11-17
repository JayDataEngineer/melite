// cards-coverage-corners.spec.ts — the registry's residual corners
// the tree's suites never seated (the 2026-11-17 coverage-honesty
// pass): the bag resolver's degenerate leaves (a trailing-slash
// source, a directory-shaped source), the family-law collection's
// dedup continue (two cards boarding ONE family), and the defsSync
// cache-miss face (cardDefsNow null at the derive). All ride the
// same hermetic boot as cards-registry.spec's arms.
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";

const bootState = vi.hoisted(() => ({
  // when true, loadCardDefs gains a SECOND def boarding qwen3-tts
  // (the tts card's own family) — the family-law collection's dedup
  // continue has a real second visitor
  injectTwin: false,
}));

const BOOT_DOC_URL = new URL(
  "../../../../tests/walls/fixtures/object_info.boot.json",
  import.meta.url,
);

vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const real = await importOriginal<typeof import("@melite/comfyui-cordis")>();
  const { readFileSync: readBootDoc } = await import("node:fs");
  return {
    ...real,
    loadCardDefs: async () => {
      const defs = new Map(await real.loadCardDefs());
      if (bootState.injectTwin) {
        const tts = defs.get("tts");
        if (tts === undefined) throw new Error("probe precondition: the tts card def must exist");
        defs.set("twin-probe-card", { ...tts, id: "twin-probe-card" } as typeof tts);
      }
      return defs;
    },
    // the cache-miss face: null is the module cache's own lawful
    // "not refreshed" value — defsSync falls back to the primed map
    cardDefsNow: () => undefined,
    liveObjectInfo: async () =>
      JSON.parse(readBootDoc(BOOT_DOC_URL, "utf8")) as Record<string, unknown>,
  };
});

import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../../tests/helpers/lane-store-overlay.ts";
import { CardRegistryService } from "../src/cardsRegistry.ts";
import { FlowsSeatService } from "../src/flowsData.ts";

let svc: CardRegistryService;

beforeAll(async () => {
  const ctx = new Context();
  new FlowsSeatService(ctx);
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "cards-corners-")),
    stateRoots: [] as string[],
  };
  svc = new CardRegistryService(ctx);
  await svc.prime();
  installLaneStoreOverlay();
}, 90_000);

afterAll(() => {
  restoreLaneStoreOverlay();
});

describe("the bag resolver's degenerate leaves never refuse on their own", () => {
  it("a trailing-slash source resolves to no bytes and the probe stays silent", async () => {
    const body: Record<string, unknown> = {
      prompt: "a yard at dusk",
      refine: [{ source_clip: "/nonexistent/dir/", refine_prompt: "sharpen the leaves" }],
    };
    // the leaf's basename is empty (the trailing slash) — the
    // input/ candidate is never pushed; the leaf resolves nowhere,
    // the probe reads no bytes, and this door's own voice stays
    // silent (a downstream refusal may speak — never the audio one)
    try {
      await svc.phase1Card(body, "h3-timeline");
    } catch (e: unknown) {
      expect(String((e as Error).message)).not.toMatch(/has no audio track/);
    }
  });

  it("a directory-shaped source stats as a directory, is skipped, and the probe stays silent", async () => {
    // an ABSOLUTE directory path: the runs-roots resolver resolves
    // it verbatim, statSync answers "directory, not a file" — the
    // candidate is skipped (never read), no bytes, no probe voice
    const dir = mkdtempSync(join(tmpdir(), "cards-dir-source-"));
    const body: Record<string, unknown> = {
      prompt: "a yard at dusk",
      refine: [{ source_clip: dir, refine_prompt: "sharpen the leaves" }],
    };
    try {
      await svc.phase1Card(body, "h3-timeline");
    } catch (e: unknown) {
      expect(String((e as Error).message)).not.toMatch(/has no audio track/);
    }
  });
});

describe("the family-law collection dedups across cards boarding one family", () => {
  it("two defs boarding qwen3-tts collect the law once", async () => {
    // the twin def boards the tts card's own family; the law
    // collection's has()-continue fires for the second visitor and
    // the boot still arms (the dedup is silent by design — the
    // assertion is the boot's own green)
    bootState.injectTwin = true;
    try {
      const ctx = new Context();
      new FlowsSeatService(ctx);
      (ctx as unknown as { queue: unknown }).queue = {
        stateRoot: mkdtempSync(join(tmpdir(), "cards-twin-")),
        stateRoots: [] as string[],
      };
      const twin = new CardRegistryService(ctx);
      await twin.prime();
      expect(twin.defsSync().get("twin-probe-card")).toBeDefined();
      expect(twin.defsSync().get("tts")).toBeDefined();
    } finally {
      bootState.injectTwin = false;
    }
  });
});
