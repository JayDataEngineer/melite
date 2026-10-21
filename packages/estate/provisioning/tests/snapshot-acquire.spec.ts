// THE SNAPSHOT CHANNEL WALL (2026-11-10, the lying-Download cure):
// directory-shaped weights (repo + revision + allow patterns) land
// through the SAME acquire door every single-file download rides —
// one fetcher, one writer, one stall clock. The burns this wall
// guards: a Download button that refused "declares no downloadable
// provisions" while the DECL pinned whole HF trees nobody could
// fetch; and hand-merged trees cured with links on one machine
// (banned: other people install this on Windows). The law: a
// snapshot row FETCHES its bytes on a fresh store, filters to its
// patterns, resumes per-file, and refuses honestly when the tree
// cannot complete.
import { afterEach, describe, test } from "vitest";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ProvisioningService } from "../src/index.ts";
import { hfTreeEntries, snapshotDest, snapshotFilesForPatterns, snapshotTotalForEntries, snapshotTreePresent, snapshotTreeUrl, type SnapshotFetch, type SnapshotTreeEntry } from "../src/snapshot.ts";
import type {
  ProvisionPlan,
  ProvisionPlanItem,
  ProvisioningConfig,
  ResourceRef,
} from "../src/index.ts";

const contexts: Context[] = [];
const roots: string[] = [];

afterEach(async () => {
  for (const context of contexts.splice(0)) await context.fiber.dispose();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "provisioning-snapshot-"));
  roots.push(root);
  return root;
}

const REPO = "example/tts-tree";
const REVISION = "a".repeat(40);
const CONFIG = Buffer.from("{ \"kind\": \"tree\" }", "utf8");
const WEIGHTS = Buffer.from("weights-bytes", "utf8");
const README = Buffer.from("docs the patterns exclude", "utf8");

function snapRef(): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id: "snap-fam" };
}

function snapItem(allowPatterns: readonly string[] = ["config.json", "model.safetensors"]): Extract<ProvisionPlanItem, { kind: "snapshot" }> {
  return {
    kind: "snapshot",
    key: "model:snap-fam:snapshot:tts-tree",
    owner: "family",
    id: "snap-fam",
    name: "tts-tree",
    folder: "qwen3-tts/hf",
    repoId: REPO,
    revision: REVISION,
    allowPatterns: [...allowPatterns],
    required: true,
    provider: "hf-snapshot",
  };
}

/** The repo wire: the listing at the API door, per-file bytes at
 *  the resolve door. `failFile` names a file whose fetch must
 *  refuse (the fetch-refused arm); `hide` drops files from the
 *  listing (the patterns-empty arm). */
function snapshotConfig(
  root: string,
  opts: { failFile?: string; hide?: string[]; onFile?: (file: string) => void } = {},
): ProvisioningConfig {
  const plan: ProvisionPlan = { ref: snapRef(), items: [snapItem()] };
  const siblings = ["config.json", "model.safetensors", "README.md"].filter((f) => !(opts.hide ?? []).includes(f));
  const files: Record<string, Buffer> = {
    "config.json": CONFIG,
    "model.safetensors": WEIGHTS,
    "README.md": README,
  };
  return {
    declaration: { resolve: async (): Promise<ProvisionPlan> => plan },
    storeRoot: root,
    fetcher: async (url: string) => {
      if (url === "https://huggingface.co/api/models/" + REPO + "/tree/" + REVISION + "?recursive=true") {
        const body = JSON.stringify(siblings.map((path) => ({
          type: "file", path, size: files[path]?.byteLength ?? 0,
        })));
        async function* generate(): AsyncGenerator<Uint8Array> {
          yield Uint8Array.from(Buffer.from(body, "utf8"));
        }
        return { status: 200, body: generate() };
      }
      const prefix = "https://huggingface.co/" + REPO + "/resolve/" + REVISION + "/";
      if (!url.startsWith(prefix)) throw new Error("unexpected fetch url: " + url);
      const file = url.slice(prefix.length).split("?")[0];
      opts.onFile?.(file);
      if (file === opts.failFile) return { status: 503, body: null };
      async function* generate(): AsyncGenerator<Uint8Array> {
        yield Uint8Array.from(files[file] ?? Buffer.from("missing", "utf8"));
      }
      return { status: 200, body: generate() };
    },
  };
}

function serviceFor(config: ProvisioningConfig): ProvisioningService {
  const ctx = new Context();
  contexts.push(ctx);
  return new ProvisioningService(ctx, config);
}

/** Await a snapshot acquire to a terminal ledger state. */
async function awaitSettled(service: ProvisioningService, id: string): Promise<string> {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const current = service.progressOf(id);
    if (current !== null && ["active", "installed", "failed", "blocked"].includes(current.state)) {
      return current.state;
    }
    await new Promise((resolve) => { setTimeout(resolve, 10); });
  }
  throw new Error("snapshot acquire never settled: " + id);
}

describe("the snapshot pure helpers (one spelling, both faces)", () => {
  test("snapshotDest trims to folder/name and tolerates slash noise", () => {
    assert.equal(snapshotDest("qwen3-tts/hf", "tree"), "qwen3-tts/hf/tree");
    assert.equal(snapshotDest("/qwen3-tts/hf/", "tree"), "qwen3-tts/hf/tree");
    assert.equal(snapshotDest("", "tree"), "tree");
  });

  test("snapshotFilesForPatterns matches exact paths and dir/* subtrees, deduped and sorted", () => {
    assert.deepEqual(
      snapshotFilesForPatterns(
        ["README.md", "config.json", "speech_tokenizer/sp.model", "speech_tokenizer/n.model", "z-last.bin"],
        ["config.json", "speech_tokenizer/*"],
      ),
      ["config.json", "speech_tokenizer/n.model", "speech_tokenizer/sp.model"],
    );
    // a bare dir/* pattern never matches the dir itself
    assert.deepEqual(snapshotFilesForPatterns(["speech_tokenizer"], ["speech_tokenizer/*"]), []);
  });

  test("snapshotTreePresent demands the row's own exact files and a weights anchor (single-file or sharded)", () => {
    // unshaped repo: model.safetensors is the anchor
    const unsharded = new Set(["a/config.json", "a/model.safetensors"]);
    assert.deepEqual(
      snapshotTreePresent((p) => unsharded.has(p), "a", ["config.json", "model.safetensors"]),
      { present: true, missing: [] },
    );
    // THE JOYCAPTION LAW (2026-10-21): a sharded tree carries
    // model.safetensors.index.json + shards, NEVER a single
    // model.safetensors — the row's own files are the anchors, or a
    // complete 16GB tree reads absent and re-fetches onto itself
    const sharded = new Set([
      "b/config.json",
      "b/model.safetensors.index.json",
      "b/model-00001-of-00004.safetensors",
      "b/model-00002-of-00004.safetensors",
    ]);
    assert.equal(
      snapshotTreePresent((p) => sharded.has(p), "b", [
        "config.json", "model.safetensors.index.json",
        "model-00001-of-00004.safetensors", "model-00002-of-00004.safetensors",
      ]).present,
      true,
    );
    // partial tree: the missing exact files are the refusal's voice
    const partial = snapshotTreePresent((p) => sharded.has(p), "b", [
      "config.json", "model.safetensors.index.json",
      "model-00001-of-00004.safetensors", "model-00002-of-00004.safetensors",
      "preprocessor_config.json",
    ]);
    assert.equal(partial.present, false);
    assert.deepEqual(partial.missing, ["preprocessor_config.json"]);
    // configs only, no weights anchor: absent
    const configOnly = snapshotTreePresent((p) => sharded.has(p), "b", ["config.json", "README.md"]);
    assert.equal(configOnly.present, false);
  });

  test("hfTreeEntries rides the REVISION-PINNED tree door (the unpinned listing was a drift seam) and parses file rows with sizes from a ReadableStream body and an async-iterable body alike", async () => {
    const REV = "b".repeat(40);
    const listing = JSON.stringify([
      { type: "file", path: "config.json", size: 17 },
      { type: "file", path: "model.safetensors", size: 4096 },
      { type: "directory", path: "sub", size: 0 },
      { type: "file", path: "no-size-row.json" },
    ]);
    const seen: string[] = [];
    const streamFetch: SnapshotFetch = async (url) => {
      seen.push(url);
      return {
        status: 200,
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(Uint8Array.from(Buffer.from(listing.slice(0, 10), "utf8")));
            controller.enqueue(Uint8Array.from(Buffer.from(listing.slice(10), "utf8")));
            controller.close();
          },
        }),
      };
    };
    assert.deepEqual(await hfTreeEntries("o/m", REV, streamFetch), [
      { path: "config.json", size: 17 },
      { path: "model.safetensors", size: 4096 },
      { path: "no-size-row.json", size: 0 },
    ]);
    assert.deepEqual(seen, [snapshotTreeUrl("o/m", REV)]);
    assert.equal(snapshotTreeUrl("o/m", REV), "https://huggingface.co/api/models/o/m/tree/" + REV + "?recursive=true");

    const iterableFetch: SnapshotFetch = async () => ({
      status: 200,
      body: (async function* generate(): AsyncGenerator<Uint8Array> {
        yield Uint8Array.from(Buffer.from(listing, "utf8"));
      })(),
    });
    assert.deepEqual(await hfTreeEntries("o/m", REV, iterableFetch), [
      { path: "config.json", size: 17 },
      { path: "model.safetensors", size: 4096 },
      { path: "no-size-row.json", size: 0 },
    ]);
  });

  test("hfTreeEntries refuses a non-200 listing by status, never by throw shape", async () => {
    const refused: SnapshotFetch = async () => ({ status: 503, body: null });
    await assert.rejects(
      () => hfTreeEntries("o/m", "b".repeat(40), refused),
      /answered HTTP 503/,
    );
  });

  test("THE DENOMINATOR (pure): snapshotTotalForEntries sums the matched set's sizes — absent size counts 0, unmatched rows count nothing", () => {
    const entries: readonly SnapshotTreeEntry[] = [
      { path: "config.json", size: 17 },
      { path: "model.safetensors", size: 4096 },
      { path: "sub/x.bin", size: 100 },
    ];
    assert.equal(snapshotTotalForEntries(entries, ["config.json", "model.safetensors"]), 4113);
    assert.equal(snapshotTotalForEntries(entries, ["sub/*"]), 100);
    assert.equal(snapshotTotalForEntries(entries, ["nothing/*"]), 0);
    assert.equal(snapshotTotalForEntries([{ path: "a.json", size: 0 }], ["a.json"]), 0);
  });
});

describe("the snapshot acquire channel (the lying-Download cure)", () => {
  test("THE DENOMINATOR (the no-percent burn): a snapshot acquire's live progress answers the listing-derived total — bytes/total both real", async () => {
    const root = tempRoot();
    const config = snapshotConfig(root);
    const service = serviceFor(config);
    const opId = await service.startWeightAcquire(snapRef());
    const settled = await awaitSettled(service, opId);
    assert.ok(settled === "active" || settled === "installed", "the tree completed, state " + settled);
    const progress = service.progressOf(opId);
    assert.equal(progress?.total, CONFIG.byteLength + WEIGHTS.byteLength);
    assert.equal(progress?.bytes, CONFIG.byteLength + WEIGHTS.byteLength);
    assert.equal(service.operationOf(snapRef())?.operationId, opId);
  });

  test("a snapshot row fetches its pinned tree file-by-file through the same acquire door", async () => {
    const root = tempRoot();
    const fetched: string[] = [];
    const service = serviceFor(snapshotConfig(root, { onFile: (f) => { fetched.push(f); } }));

    const id = await service.startWeightAcquire(snapRef());
    const state = await awaitSettled(service, id);

    assert.ok(state === "active" || state === "installed", "the tree landed, state " + state);
    const dest = join(root, "qwen3-tts", "hf", "tts-tree");
    assert.deepEqual(readFileSync(join(dest, "config.json")), CONFIG);
    assert.deepEqual(readFileSync(join(dest, "model.safetensors")), WEIGHTS);
    // the pattern filter bounded the fetch: the README the patterns
    // exclude never left the wire
    assert.ok(!existsSync(join(dest, "README.md")));
    assert.deepEqual(fetched.sort(), ["config.json", "model.safetensors"]);
  });

  test("a landed sibling is kept, never re-fetched (per-file resume)", async () => {
    const root = tempRoot();
    const fetched: string[] = [];
    const dest = join(root, "qwen3-tts", "hf", "tts-tree");
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, "config.json"), CONFIG);
    const service = serviceFor(snapshotConfig(root, { onFile: (f) => { fetched.push(f); } }));

    const id = await service.startWeightAcquire(snapRef());
    const state = await awaitSettled(service, id);

    assert.ok(state === "active" || state === "installed", "the tree completed, state " + state);
    assert.deepEqual(fetched, ["model.safetensors"], "the landed config.json is skipped, not re-downloaded");
    assert.deepEqual(readFileSync(join(dest, "model.safetensors")), WEIGHTS);
  });

  test("a fully landed tree acquires as already-active with zero wire bytes", async () => {
    const root = tempRoot();
    const fetched: string[] = [];
    const dest = join(root, "qwen3-tts", "hf", "tts-tree");
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, "config.json"), CONFIG);
    writeFileSync(join(dest, "model.safetensors"), WEIGHTS);
    const service = serviceFor(snapshotConfig(root, { onFile: (f) => { fetched.push(f); } }));

    const id = await service.startWeightAcquire(snapRef());
    const state = await awaitSettled(service, id);

    assert.ok(state === "active" || state === "installed", "the present tree is active, state " + state);
    assert.deepEqual(fetched, [], "no listing, no file — the anchors answer before the wire arms");
    assert.equal(service.progressOf(id)?.bytes, 0);
  });

  test("a refused file fetch fails the acquire honestly (no partial tree claimed active)", async () => {
    const root = tempRoot();
    const service = serviceFor(snapshotConfig(root, { failFile: "model.safetensors" }));

    const id = await service.startWeightAcquire(snapRef());
    const state = await awaitSettled(service, id);

    assert.equal(state, "failed");
    const progress = service.progressOf(id);
    assert.match(progress?.detail ?? "", /model\.safetensors.*HTTP 503|HTTP 503.*model\.safetensors/,
      "the refusal names the file and the status: " + String(progress?.detail));
    // the anchor half landed but the tree is NOT claimed: no
    // active face for a partial fetch
    assert.ok(existsSync(join(root, "qwen3-tts", "hf", "tts-tree", "config.json")));
  });

  test("patterns that match nothing refuse at the plan door, never fetch a whole repo", async () => {
    const root = tempRoot();
    const service = serviceFor(snapshotConfig(root, { hide: ["config.json", "model.safetensors", "README.md"] }));

    const id = await service.startWeightAcquire(snapRef());
    const state = await awaitSettled(service, id);

    assert.equal(state, "blocked");
    assert.match(service.progressOf(id)?.detail ?? "", /matches none of the declared allow patterns/);
  });

  test("an all-files landing that misses the anchors refuses snapshot/incomplete (a tree is its anchors)", async () => {
    const root = tempRoot();
    // README-only patterns: files land, the config+weights anchors
    // the presence probe rides never do — the acquire must refuse,
    // never wear the active face
    const plan: ProvisionPlan = { ref: snapRef(), items: [snapItem(["README.md"])] };
    const ctx = new Context();
    contexts.push(ctx);
    const service = new ProvisioningService(ctx, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan },
      storeRoot: root,
      fetcher: snapshotConfig(root).fetcher,
    });

    const id = await service.startWeightAcquire(snapRef());
    const state = await awaitSettled(service, id);

    assert.equal(state, "failed");
    assert.match(service.progressOf(id)?.detail ?? "", /name no weights anchor/);
  });

  test("a seat without a fetcher or without a writer refuses by name, never silently", async () => {
    const root = tempRoot();
    const plan: ProvisionPlan = { ref: snapRef(), items: [snapItem()] };
    const bare = { declaration: { resolve: async (): Promise<ProvisionPlan> => plan }, storeRoot: root };

    const ctxA = new Context();
    contexts.push(ctxA);
    const noFetcher = new ProvisioningService(ctxA, bare);
    const idA = await noFetcher.startWeightAcquire(snapRef());
    assert.equal(await awaitSettled(noFetcher, idA), "blocked");
    assert.match(noFetcher.progressOf(idA)?.detail ?? "", /requires a configured artifact fetcher/);

    const ctxB = new Context();
    contexts.push(ctxB);
    const noWriter = new ProvisioningService(ctxB, {
      ...bare,
      fetcher: snapshotConfig(root).fetcher,
      storeRoot: undefined,
    });
    const idB = await noWriter.startWeightAcquire(snapRef());
    assert.equal(await awaitSettled(noWriter, idB), "blocked");
    assert.match(noWriter.progressOf(idB)?.detail ?? "", /requires the configured model store writer/);
  });

  test("a malformed snapshot row (empty patterns, empty pin) refuses at the plan door", async () => {
    const root = tempRoot();
    const ctx = new Context();
    contexts.push(ctx);
    const service = new ProvisioningService(ctx, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan },
      storeRoot: root,
      fetcher: snapshotConfig(root).fetcher,
    });
    const planOf = (patch: Record<string, unknown>): ProvisionPlan =>
      ({ ref: snapRef(), items: [{ ...snapItem(), ...patch }] });
    const driveMalformed = async (patch: Record<string, unknown>, needle: RegExp): Promise<void> => {
      plan = planOf(patch);
      const service2 = new ProvisioningService(new Context(), {
        declaration: { resolve: async (): Promise<ProvisionPlan> => plan },
        storeRoot: root,
        fetcher: snapshotConfig(root).fetcher,
      });
      const id = await service2.startWeightAcquire(snapRef());
      const state = await awaitSettled(service2, id);
      assert.ok(state === "blocked" || state === "failed", "the malformed row refuses, state " + state);
      assert.match(service2.progressOf(id)?.detail ?? "", needle);
    };
    let plan: ProvisionPlan = { ref: snapRef(), items: [snapItem()] };
    await driveMalformed({ allowPatterns: [] }, /snapshot with no allow patterns/);
    await driveMalformed({ revision: "" }, /invalid snapshot destination or source/);
    await driveMalformed({ name: "" }, /invalid snapshot destination or source/);
  });

  test("the inspect arm voices an absent tree as blocked and a landed tree as active operator-unverified", async () => {
    const root = tempRoot();
    const service = serviceFor(snapshotConfig(root));

    const before = await service.inspect(snapRef());
    const absentRow = before.items.find((row) => row.kind === "snapshot");
    assert.notEqual(absentRow, undefined, "the snapshot row is on the roster");
    assert.equal(absentRow?.state, "absent");
    assert.equal(absentRow?.errorCode, "snapshot/missing");
    assert.match(absentRow?.detail ?? "", /has not landed/);

    const id = await service.startWeightAcquire(snapRef());
    await awaitSettled(service, id);

    const after = await service.inspect(snapRef());
    const landedRow = after.items.find((row) => row.kind === "snapshot");
    assert.equal(landedRow?.state, "active");
    // the revision pin is the integrity word — no digest exists to
    // claim, and the row says so
    assert.equal(landedRow?.integrity, "operator-unverified");
    assert.match(landedRow?.detail ?? "", new RegExp(REPO + "@"));
  });
});
