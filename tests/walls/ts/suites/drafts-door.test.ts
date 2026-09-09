// drafts-door.test.ts — THE DRAFTS DOMAIN WALL (the ALL stroke,
// 2026-09-09): the draft CRUD doors ride the DSH storage tier
// (@deepseek-ai/dsh-storage{,-domain,-json}) — the drafts DOMAIN is
// the truth, the handrolled per-file JSON CRUD is DEAD, and this is
// the door's FIRST gate ever (the py-port era left it unwalled).
//
// Pinned shapes:
//   1. LEGACY IMPORT — a pre-seeded STATE_ROOT/drafts tree (the py
//      file era) imports once on first domain open: good docs ride,
//      poison bytes and non-objects skip, the legacy files stay
//      untouched on disk (evidence, never truth).
//   2. CRUD ROUND TRIP — save composes + 200s, get serves the doc,
//      stage patch delivers (result/params merge), stage result
//      reads back; the record materializes as a per-record doc in
//      the domain unit (storage/drafts/docs/<id>.json).
//   3. REFUSAL VOICES — empty body 400, bad id 400, missing 404,
//      stage-not-found delivers false, composer drift 500 prefix.
//   4. DURABILITY + MARKER — a second boot on the SAME root serves
//      the saved draft (the domain persists) and never re-imports
//      the legacy tree (the global importedAt marker law: a frozen
//      ghosts tree must not resurrect).
//   5. PARALLEL SAVES — 8 concurrent creates all 200 with distinct
//      ids (minted-id disjointness, the create-arm concurrency
//      contract).
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/drafts-door.test.ts
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { accessSync, constants, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bootSandbox, http, parsed, reap } from "../helpers/boot.ts";
import type { HttpOut, Sandbox } from "../helpers/boot.ts";

const TOKEN = "wall-ts-drafts-2026-09-09";
const STUB_BIN = resolve(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "mcp-stub.mjs");

const GOOD_LEGACY = {
  draft_id: "d_legacygood0000000000000000000",
  status: "draft",
  createdAt: 1757000000000,
  completedAt: null,
  intent: "legacy seeded draft",
  stages: [{ id: "s_0", inputs: [""], provenance: "agent" }],
  model: "wall-model",
  name: "Legacy Wall Draft",
};

function saveDraft(port: number, body: unknown): Promise<HttpOut> {
  return http(port, "POST", "/v1/flows/drafts", {
    body: JSON.stringify(body),
    token: TOKEN,
    contentType: "application/json",
  });
}

function listDrafts(port: number): Promise<HttpOut> {
  return http(port, "GET", "/v1/flows/drafts", { token: TOKEN });
}

function getDraft(port: number, id: string): Promise<HttpOut> {
  return http(port, "GET", "/v1/flows/drafts/" + id, { token: TOKEN });
}

describe("drafts ride the storage domain (sandbox boot)", () => {
  let sandbox: Sandbox | null = null;
  let stateRoot = "";

  before(async (): Promise<void> => {
    try {
      accessSync(STUB_BIN, constants.X_OK);
    } catch {
      assert.fail("mcp stub is not executable: " + STUB_BIN + " (chmod +x fixtures/mcp-stub.mjs)");
    }
    stateRoot = mkdtempSync(join(tmpdir(), "wall-ts-drafts-"));
    const legacyDir = join(stateRoot, "drafts");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(join(legacyDir, "d_legacygood0000000000000000000.json"), JSON.stringify(GOOD_LEGACY));
    // Poison: unparseable bytes (the corrupt-on-disk class — skips import).
    writeFileSync(join(legacyDir, "d_poison00000000000000000000000.json"), "{not json at all");
    // Non-object: a JSON array (skips import — not a draft doc).
    writeFileSync(join(legacyDir, "d_arr0000000000000000000000000.json"), "[1,2,3]");
    // Nested-only model (stage params): the py byte-scan found it at
    // ANY depth — the parsed index must walk the doc, not the top level.
    writeFileSync(
      join(legacyDir, "d_nested0000000000000000000000000.json"),
      JSON.stringify({
        draft_id: "d_nested0000000000000000000000000",
        status: "draft",
        createdAt: 1757000002000,
        completedAt: null,
        intent: "nested model row",
        stages: [{ id: "s_0", inputs: [""], provenance: "agent", service: "deep-model", params: { model: "nested-model" } }],
      }),
    );
    sandbox = await bootSandbox({ mcpBin: STUB_BIN, token: TOKEN, stateRoot });
  });

  after((): void => {
    if (sandbox !== null) reap(sandbox.proc);
  });

  it("imports the legacy tree once (good rides, poison skips, files stay)", async (): Promise<void> => {
    assert.ok(sandbox !== null);
    const out = await listDrafts(sandbox.port);
    assert.equal(out.status, 200, "list status");
    const doc = parsed(out.bytes) as { count: number; drafts: Record<string, string>[] };
    assert.equal(doc.count, 2, "the two good legacy rows import: " + JSON.stringify(doc));
    const byId = new Map(doc.drafts.map((r): [string, Record<string, string>] => [r["draft_id"], r]));
    const row = byId.get("d_legacygood0000000000000000000");
    assert.ok(row !== undefined, "good legacy row present");
    assert.equal(row["model"], "wall-model", "index model field");
    assert.equal(row["name"], "Legacy Wall Draft", "index name field");
    const nested = byId.get("d_nested0000000000000000000000000");
    assert.ok(nested !== undefined, "nested row present");
    assert.equal(nested["model"], "nested-model", "nested params.model wins (document order)");
    assert.equal(nested["name"], "nested model row", "top-level intent serves the display name");
    // The legacy files remain on disk, untouched (evidence, never truth).
    const bytes = readFileSync(join(stateRoot, "drafts", "d_legacygood0000000000000000000.json"), "utf8");
    assert.equal(JSON.parse(bytes)["intent"], "legacy seeded draft");
    const poison = readFileSync(join(stateRoot, "drafts", "d_poison00000000000000000000000.json"), "utf8");
    assert.ok(poison.startsWith("{not json"), "poison file untouched");
  });

  it("serves the imported draft by id", async (): Promise<void> => {
    assert.ok(sandbox !== null);
    const out = await getDraft(sandbox.port, "d_legacygood0000000000000000000");
    assert.equal(out.status, 200);
    const doc = parsed(out.bytes) as Record<string, unknown>;
    assert.equal(doc["intent"], "legacy seeded draft");
    assert.deepEqual(doc["stages"], GOOD_LEGACY.stages);
  });

  it("save → get → patch → result round trip on the domain", async (): Promise<void> => {
    assert.ok(sandbox !== null);
    const saved = await saveDraft(sandbox.port, {
      intent: "round trip",
      stages: [{ id: "st_a", inputs: [""], provenance: "agent" }],
      model: "rt-model",
      name: "RT Draft",
    });
    assert.equal(saved.status, 200, "save status: " + saved.bytes.subarray(0, 200));
    const born = parsed(saved.bytes) as { draftId: string; stages: unknown[] };
    assert.equal(born.stages.length, 1);
    const id = born.draftId;

    const got = await getDraft(sandbox.port, id);
    assert.equal(got.status, 200);
    const doc = parsed(got.bytes) as Record<string, unknown>;
    assert.equal(doc["draft_id"], id);
    assert.equal(doc["intent"], "round trip");

    // The record materializes in the domain unit (per-record doc).
    const recPath = join(stateRoot, "storage", "drafts", "docs", id + ".json");
    const rec = JSON.parse(readFileSync(recPath, "utf8")) as {
      version: number;
      record: { updated_at: number; doc: Record<string, unknown> };
    };
    assert.equal(rec["version"], 1, "unit version column");
    assert.ok(typeof rec["record"]["updated_at"] === "number", "recency column present");
    assert.equal(rec["record"]["doc"]["draft_id"], id);

    const patched = await http(sandbox.port, "PATCH", "/v1/flows/drafts/" + id + "/stages/st_a", {
      body: JSON.stringify({ result: { kind: "text", text: "done" } }),
      token: TOKEN,
      contentType: "application/json",
    });
    assert.equal(patched.status, 200, "patch status");
    const [REDACTED 2026-11-05] = parsed(patched.bytes) as Record<string, unknown>;
    assert.equal([REDACTED 2026-11-05]["delivered"], true, "patch delivered: " + patched.bytes.subarray(0, 300));
    assert.deepEqual([REDACTED 2026-11-05]["patched"], ["result"]);

    const res = await http(sandbox.port, "GET", "/v1/flows/drafts/" + id + "/stages/st_a/result", { token: TOKEN });
    assert.equal(res.status, 200);
    const rd = parsed(res.bytes) as Record<string, unknown>;
    assert.equal(rd["found"], true);
    assert.deepEqual(rd["result"], { kind: "text", text: "done" });
  });

  it("refusal voices survive the migration", async (): Promise<void> => {
    assert.ok(sandbox !== null);
    const empty = await saveDraft(sandbox.port, {});
    assert.equal(empty.status, 400);
    assert.equal((parsed(empty.bytes) as Record<string, unknown>)["error"], "empty body");

    const badId = await getDraft(sandbox.port, "bad.id");
    assert.equal(badId.status, 400);
    assert.equal((parsed(badId.bytes) as Record<string, unknown>)["error"], "bad id");

    const missing = await getDraft(sandbox.port, "d_missing0000000000000000000000");
    assert.equal(missing.status, 404);
    assert.equal((parsed(missing.bytes) as Record<string, unknown>)["error"], "draft not found");

    const noStage = await http(sandbox.port, "PATCH", "/v1/flows/drafts/" + "d_legacygood0000000000000000000" + "/stages/nope", {
      body: JSON.stringify({ result: { v: 1 } }),
      token: TOKEN,
      contentType: "application/json",
    });
    assert.equal(noStage.status, 200);
    const nd = parsed(noStage.bytes) as Record<string, unknown>;
    assert.equal(nd["delivered"], false);
    assert.equal(nd["reason"], "stage not found");

    const drift = await saveDraft(sandbox.port, { stages: [{ id: 7, inputs: [""], provenance: "agent" }] });
    assert.equal(drift.status, 500);
    assert.ok(
      String((parsed(drift.bytes) as Record<string, unknown>)["error"]).startsWith("draft composer drift:"),
      "drift prefix: " + drift.bytes.subarray(0, 200),
    );
  });

  it("8 parallel saves all 200 with distinct ids", async (): Promise<void> => {
    assert.ok(sandbox !== null);
    const outs = await Promise.all(
      Array.from({ length: 8 }, (_, i): Promise<HttpOut> =>
        saveDraft(sandbox.port, { intent: "parallel " + i, stages: [] }),
      ),
    );
    const ids = new Set<string>();
    for (const out of outs) {
      assert.equal(out.status, 200, "parallel save status");
      ids.add((parsed(out.bytes) as { draftId: string }).draftId);
    }
    assert.equal(ids.size, 8, "ids disjoint");
    const listed = await listDrafts(sandbox.port);
    const doc = parsed(listed.bytes) as { count: number };
    // 2 legacy + 1 round trip + 8 parallel (the drift save never persisted).
    assert.equal(doc.count, 11, "count is the total pre-cap: " + doc.count);
  });
});

describe("drafts durability + the import marker (reboot the same root)", () => {
  let first: Sandbox | null = null;
  let second: Sandbox | null = null;
  let stateRoot = "";

  before(async (): Promise<void> => {
    stateRoot = mkdtempSync(join(tmpdir(), "wall-ts-drafts-rb-"));
    const legacyDir = join(stateRoot, "drafts");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(join(legacyDir, "d_rbgood0000000000000000000000.json"), JSON.stringify({
      draft_id: "d_rbgood0000000000000000000000",
      status: "draft",
      createdAt: 1757000001000,
      completedAt: null,
      intent: "reboot legacy",
      stages: [],
    }));
    first = await bootSandbox({ mcpBin: STUB_BIN, token: TOKEN, stateRoot });
    const saved = await http(first.port, "POST", "/v1/flows/drafts", {
      body: JSON.stringify({ intent: "survives reboot", stages: [{ id: "s_0", inputs: [""], provenance: "agent" }] }),
      token: TOKEN,
      contentType: "application/json",
    });
    assert.equal(saved.status, 200, "boot-1 save");
    reap((first as Sandbox).proc);
    first = null;
    second = await bootSandbox({ mcpBin: STUB_BIN, token: TOKEN, stateRoot });
  });

  after((): void => {
    if (first !== null) reap(first.proc);
    if (second !== null) reap(second.proc);
  });

  it("the saved draft survives; the legacy tree never re-imports", async (): Promise<void> => {
    assert.ok(second !== null);
    const out = await listDrafts(second.port);
    assert.equal(out.status, 200);
    const doc = parsed(out.bytes) as { count: number; drafts: Record<string, string>[] };
    assert.equal(doc.count, 2, "1 legacy (imported once) + 1 saved — no ghost resurrection: " + JSON.stringify(doc));
    const got = await getDraft(second.port, "d_rbgood0000000000000000000000");
    assert.equal(got.status, 200, "legacy draft still served from the domain");
    const doc2 = parsed(got.bytes) as Record<string, unknown>;
    assert.equal(doc2["intent"], "reboot legacy");
  });
});
