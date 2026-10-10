// characters.spec.ts — the second table (audit 004/C2): the character
// bundle round-trips through the drafts domain on the REAL json
// backend (the remote spec's boot rig shape), ids reuse DRAFT_ID_RE
// (one address class), and the ordered references are path strings of
// exactly the class the submit walk stages — pinned here by feeding a
// stored reference to the same walk the run door runs
// (uploadReferenced, engine-side) in the walls tier.
import { onTestFinished, test } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import Storage from "@deepseek-ai/dsh-storage";
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from "@deepseek-ai/dsh-storage-json";
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from "@deepseek-ai/dsh-storage-domain";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import { openDraftsDomain, draftIdOk } from "../src/index.ts";
import { DraftsDomainSeatService } from "../src/store.ts";
import { draftsDomainSpec } from "../src/spec.js";
import type { CharacterRecord, DraftsDomainSpec } from "../src/spec.js";

function mintRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "drafts-characters-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

async function boot(): Promise<{ root: string; domain: Domain<DraftsDomainSpec> }> {
  const root = mintRoot();
  mkdirSync(join(root, "storage"), { recursive: true });
  const ctx = new Context();
  await ctx.plugin(Storage as never, undefined as never);
  await ctx.plugin(
    { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never,
    { root: join(root, "storage") } as never,
  );
  await ctx.plugin(
    { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never,
    { backend: "json" } as never,
  );
  new DraftsDomainSeatService(ctx, { storageRoot: join(root, "storage") });
  return { root, domain: await openDraftsDomain(ctx) };
}

const SHEET = {
  name: "Mara",
  references: ["data:image/png;base64,aGVsbG8", "assets/registry/mara-front.png", "https://cdn/mara-side.png"],
  description: "IDENTITY — Mara, surveyor… (the ten-section locked block, audit 004/C7)",
  updated_at: 1_700_000_000,
} satisfies CharacterRecord;

test("a character row round-trips through the domain (order preserved, byte-equal references)", async () => {
  const { domain } = await boot();
  const characters = domain.table("characters");
  await characters.put("mara-surveyor", SHEET);
  assert.deepEqual(characters.get("mara-surveyor"), SHEET,
    "the stored bundle reads back identical — reference order is position-coded, never re-sorted");
});

test("the two tables coexist: a draft doc beside a character row", async () => {
  const { domain } = await boot();
  await domain.table("characters").put("mara-surveyor", SHEET);
  await domain.table("docs").put("draft-1", {
    updated_at: 1_700_000_001,
    doc: { draft_id: "draft-1", status: "draft", createdAt: 1, completedAt: null, intent: "i", stages: [] },
  });
  assert.ok(domain.table("docs").get("draft-1") !== undefined, "the docs table keeps its rows");
  assert.ok(domain.table("characters").get("mara-surveyor") !== undefined, "the characters table keeps its rows");
});

test("character ids reuse the draft-id grammar — one address class, path-safe", () => {
  assert.ok(draftIdOk("mara-surveyor_2"), "the same grammar admits a character id");
  assert.ok(!draftIdOk("mara surveyor"), "spaces refuse (the per-record key is a path segment)");
  assert.ok(!draftIdOk("марa"), "non-ASCII refuses");
});

test("a path-unsafe character key rejects at write (the layout's own door)", async () => {
  const { domain } = await boot();
  await assert.rejects(
    () => domain.table("characters").put("bad/key", SHEET),
    /key|path/i,
  );
});

test("a schema-failing character row writes, then the reopen skips it (invalidRecords: backup-and-skip)", async () => {
  const root = mintRoot();
  mkdirSync(join(root, "storage"), { recursive: true });
  {
    const ctx = new Context();
    await ctx.plugin(Storage as never, undefined as never);
    await ctx.plugin(
      { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never,
      { root: join(root, "storage") } as never,
    );
    await ctx.plugin(
      { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never,
      { backend: "json" } as never,
    );
    new DraftsDomainSeatService(ctx, { storageRoot: join(root, "storage") });
    const domain = await openDraftsDomain(ctx);
    // the domain put does not zod-validate (the remote write doors
    // own strictness) — the invalid-record contract fires at open
    await domain.table("characters").put("bad-row", { name: "" } as unknown as CharacterRecord);
    assert.ok((domain.table("characters").get("bad-row") as unknown) !== undefined,
      "the live handle keeps its own write (the reopen owns the judgment)");
  }
  const ctx2 = new Context();
  await ctx2.plugin(Storage as never, undefined as never);
  await ctx2.plugin(
    { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never,
    { root: join(root, "storage") } as never,
  );
  await ctx2.plugin(
    { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never,
    { backend: "json" } as never,
  );
  new DraftsDomainSeatService(ctx2, { storageRoot: join(root, "storage") });
  const reopened = await openDraftsDomain(ctx2);
  assert.equal(reopened.table("characters").get("bad-row"), undefined,
    "the schema-failing row reads as absent after reopen (backup-and-skip — never a brick)");
});

test("the stored references are the staged classes (uploadReferenced's walk input)", async () => {
  const { domain } = await boot();
  await domain.table("characters").put("mara-surveyor", SHEET);
  const rec = domain.table("characters").get("mara-surveyor")!;
  // the three classes the walk stages: data URLs, http(s) links, and
  // resolvable file paths (runs/cwd-relative and asset URLs). The
  // round-trip must NOT mutate them — the walk reads them verbatim.
  assert.match(rec.references[0]!, /^data:image\//);
  assert.match(rec.references[1]!, /\.png$/);
  assert.match(rec.references[2]!, /^https?:\/\//);
});

test("a v1-stamped record document still reads (compatibleVersions: the join keeps old stores green)", async () => {
  const root = mintRoot();
  mkdirSync(join(root, "storage", "drafts", "docs"), { recursive: true });
  // a pre-characters (version 1) store: one stamped record doc
  // (the per-record format: { version, record } per file)
  writeFileSync(
    join(root, "storage", "drafts", "docs", "old-draft.json"),
    JSON.stringify({ version: 1, record: { updated_at: 1, doc: { draft_id: "old-draft", status: "draft", createdAt: 1, completedAt: null, intent: "legacy", stages: [] } } }),
  );
  const ctx = new Context();
  await ctx.plugin(Storage as never, undefined as never);
  await ctx.plugin(
    { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never,
    { root: join(root, "storage") } as never,
  );
  await ctx.plugin(
    { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never,
    { backend: "json" } as never,
  );
  new DraftsDomainSeatService(ctx, { storageRoot: join(root, "storage") });
  const domain = await openDraftsDomain(ctx);
  assert.ok(domain.table("docs").get("old-draft") !== undefined,
    "the v1-stamped record reads through compatibleVersions — no migration, no brick");
  // and the new table materializes beside it
  await domain.table("characters").put("mara-surveyor", SHEET);
  assert.ok(domain.table("characters").get("mara-surveyor") !== undefined);
});

test("the spec pins the compatibility set (deliberate: v1 stores open green)", () => {
  assert.equal(draftsDomainSpec.version, 2);
  assert.deepEqual(draftsDomainSpec.compatibleVersions, [1]);
});
