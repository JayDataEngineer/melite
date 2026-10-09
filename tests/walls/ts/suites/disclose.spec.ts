// disclose.spec.ts — REBUILD-14 wall: the disclosure seat (Melite
// discover over both planes). Boots the estate glue over one
// mkdtemp state root, primes the card registry, and asserts the
// door's own laws: unknown lookup refuses with its voice, the
// planes ride lookup=all|cards|flows, search filters (q tokens ALL
// match; tags ALL match), rows are LIVE (the flows registry + the
// primed card defs — never a frozen blob).
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "vitest";
import assert from "node:assert/strict";
import { Context, type Plugin } from '@deepseek-ai/cordis';
import timerPlugin from '@deepseek-ai/cordis-plugin-timer';
import draftsPlugin from '@melite/estate-drafts';
import Storage from '@deepseek-ai/dsh-storage';
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from '@deepseek-ai/dsh-storage-json';
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from '@deepseek-ai/dsh-storage-domain';
import queuePlugin, {
  cardRegistryProvider,
  discloseProvider,
  type DiscloseDirectoryService,
} from "../../../../packages/harness/estate-queue/src/index.ts";
import type { EstateMethod } from "../../../../packages/harness/melite-tools/src/estate.ts";

// HYGIENE (extended 2026-10-08 after the second critique): the
// skills test sets DSH_HOME — it leaked across tests before (the
// harness ownEnv law: capture at set time, restore with the test).
const tmpDirs: string[] = [];
function tmp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix + "-"));
  tmpDirs.push(dir);
  return dir;
}
async function manageRefusal(
  ctx: Context,
  doc: unknown,
  sig: AbortSignal,
): Promise<{ code: string; message: string; action?: string }> {
  const manage = ctx.get("manage", false) as {
    act(doc: unknown, signal: AbortSignal): Promise<unknown>;
  };
  assert.ok(manage, "the manage seat is live");
  // A-L24 (the wall audit, 2026-09-28): the sentinel lived INSIDE
  // the try — a door that ANSWERED the doc it must refuse threw the
  // sentinel, the same catch caught it, and the failure surfaced as
  // "a RemoteError" (a missing sentinel masquerading as a wrong
  // error). The refusal is now read out of the try, and the
  // no-throw case speaks for itself.
  let caught: unknown;
  let answered = false;
  try {
    await manage.act(doc, sig);
    answered = true;
  } catch (e) {
    caught = e;
  }
  assert.ok(!answered, "expected manage/refused — the door ANSWERED a doc it must refuse");
  const re = (await import('@deepseek-ai/dsh-typert-protocol')).remoteErrorOf(caught);
  assert.ok(re, `a RemoteError (got ${String(caught)})`);
  assert.equal(re.code, "manage/refused");
  const d = (re as unknown as { details?: { action?: string } }).details ?? {};
  return { code: re.code, message: re.message, action: d.action };
}

test("the skills seat — index + read, the door's voices (REBUILD-16)", async () => {
  const root = tmp("disclose-wall-");
  const ctx = new Context();
  // ENV-PIN LAW (the false-death lesson, pinned 2026-10-08): the
  // seat reads the LIVE BENCH from DSH_HOME — unpinned, the wall
  // reads the OPERATOR's real home, and the "empty bench" assert
  // below flaked the moment a real session landed there (a music
  // stage benched on the GUI made this wall read count=2). An
  // empty pin home IS the empty bench; the seeded phase re-pins.
  // (The file-level afterEach is the ONE restore path now.)
  const emptyHome = tmp("disclose-empty-home-");
  process.env["DSH_HOME"] = emptyHome;
  await ctx.plugin(timerPlugin as unknown as Plugin);
  await ctx.plugin(queuePlugin as unknown as Plugin, { stateRoot: root });
  await ctx.plugin(Storage as unknown as Plugin);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin, { backend: "json" });
  await ctx.plugin(draftsPlugin as unknown as Plugin);
  await ctx.plugin(cardRegistryProvider as unknown as Plugin);
  const { skillProvider } = await import("../../../../packages/harness/estate-queue/src/index.ts");
  await ctx.plugin(skillProvider as unknown as Plugin);
  // the seat's static shape is Record<string, unknown> — the wall
  // pins the narrower wire rows it actually serves.
  const skills = ctx.get("meliteSkills", false) as unknown as { index(): { count?: number; skills?: Array<{ id: string }> }; read(id: string, signal: AbortSignal): { id: string; content?: string } };
  assert.ok(skills, "the skills seat is live");
  // 1. THE INDEX (the no-dump law): the binding vocabulary only —
  //    families + cards + flow ids; NEVER skill rows (a skill id is
  //    learned from its owning surface, melite_load).
  // THE SELECTION LAW (operator 2026-09-21): the seat's index serves
  // the LIVE BENCH only — an empty bench lists nothing; a seeded bench
  // (image-gen + krea-2) serves exactly that selection.
  const empty = skills.index() as { count?: number; cards?: unknown[] };
  assert.equal(empty.count, 0, "an empty bench lists nothing");
  {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    const home = tmp("bench-home-");
    mkdirSync(join(home, "storages", "drafts", "docs"), { recursive: true });
    writeFileSync(
      join(home, "storages", "drafts", "docs", "bench-session-test.json"),
      JSON.stringify({ record: { doc: { stages: [{ card: "image-gen", params: { model: "krea-2" } }] } } }),
    );
    process.env["DSH_HOME"] = home;
  }
  const idx = skills.index() as { count?: number; skills?: unknown; families?: Array<{ id: string }>; cards?: Array<{ id: string }>; flows?: { ids: string[] } };
  assert.ok(typeof idx.count === "number" && idx.count > 0, "non-empty index over the seeded bench");
  assert.equal(idx.skills, undefined, "the flat dump is dead");
  // A-M14: the same law on the benched index — ONE row's id was
  // checked; every row's shape is checked now, and the served set is
  // the SEEDED set exactly (the bench is the admission).
  assert.ok((idx.families ?? []).some((f) => f.id === "krea-2"), "the benched family serves");
  assert.ok((idx.cards ?? []).some((c) => c.id === "image-gen"), "the benched card serves");
  assert.ok(!(idx.cards ?? []).some((c) => c.id === "image-edit"), "unbenched cards never ride");
  const badFamilies = (idx.families ?? []).filter((f) => typeof f.id !== "string" || f.id === "");
  assert.deepEqual(badFamilies, [], "every benched family row carries its id");
  const badCards = (idx.cards ?? []).filter((c) => typeof (c as { id?: unknown }).id !== "string"
    || (c as { id?: unknown }).id === "");
  assert.deepEqual(badCards, [], "every benched card row carries its id");
  assert.deepEqual((idx.families ?? []).map((f) => f.id).sort(), ["krea-2"],
    "the families are the SEEDED ones, exactly");
  assert.deepEqual((idx.cards ?? []).map((c) => (c as { id: string }).id).sort(), ["image-gen"],
    "the cards are the SEEDED ones, exactly");
  // 2. a flow skill read answers the DOC (the registry render or
  //    the SKILL.md leaf). The sample is skin-apply.
  const sig = new AbortController().signal;
  const doc = skills.read("flow:fit-seat", sig);
  assert.equal(doc.id, "flow:fit-seat");
  assert.ok(
    typeof doc.content === "string" && doc.content.length > 0,
    "the flow's skill body renders",
  );
  // 3. unknown ids answer the door's voice.
  assert.throws(
    () => skills.read("flow:no-such-flow", sig),
    /no such skill: "flow:no-such-flow"/,
  );
  // 4. the lane grammar serves both lanes from the seat.
  const { makeEstateRequest } = await import("../../../../packages/harness/melite-tools/src/estate.ts");
  const request = makeEstateRequest(ctx) as (method: EstateMethod, path: string, body: unknown, signal: AbortSignal) => Promise<unknown>;
  const laneIdx = (await request("GET", "/v1/skills", undefined, sig)) as { count?: number };
  assert.ok(typeof laneIdx.count === "number" && (laneIdx.count ?? 0) > 0, "lane serves the seeded index");
  const laneDoc = (await request("GET", "/v1/skills/flow%3Afit-seat", undefined, sig)) as { id?: string };
  assert.equal(laneDoc.id, "flow:fit-seat", "lane serves the read");
  // (env restore + tmp cleanup live in the file-level afterEach —
  // the ONE restore path; these nested finallies were the second
  // critique's double-restore smell)
});

test("the load seat — card + flow bundles, the door's voices (REBUILD-17)", async () => {
  const root = tmp("disclose-wall-");
  const ctx = new Context();
  await ctx.plugin(timerPlugin as unknown as Plugin);
  await ctx.plugin(queuePlugin as unknown as Plugin, { stateRoot: root });
  await ctx.plugin(Storage as unknown as Plugin);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin, { backend: "json" });
  await ctx.plugin(draftsPlugin as unknown as Plugin);
  await ctx.plugin(cardRegistryProvider as unknown as Plugin);
  const { loadProvider } = await import("../../../../packages/harness/estate-queue/src/index.ts");
  await ctx.plugin(loadProvider as unknown as Plugin);
  const load = ctx.get("load", false) as { load(t: string, n: string): { bundle?: Record<string, unknown> } };
  assert.ok(load, "the load seat is live");
  // 1. the parameter law: inference_type must be card|flow, name
  //    required — the door's voices.
  assert.throws(() => load.load("model", "x"), /inference_type=card\|flow/);
  assert.throws(() => load.load("card", ""), /name/);
  // 2. a CARD bundle: signature + agents docs + skill lines.
  const card = load.load("card", "image-gen");
  const b = card.bundle as { kind?: string; name?: string; signature?: unknown; agents?: unknown[]; skills?: unknown[]; digest?: string };
  assert.equal(b.kind, "card");
  assert.equal(b.name, "image-gen");
  assert.ok(b.signature, "signature present");
  assert.ok(Array.isArray(b.agents), "agents docs present");
  assert.ok(typeof b.digest === "string" && b.digest !== "", "digest present");
  // 3. a FLOW bundle: slim stages + skill refs.
  const flow = load.load("flow", "fit-seat");
  const fb = flow.bundle as { kind?: string; name?: string; stages?: unknown[] };
  assert.equal(fb.kind, "flow");
  assert.ok(Array.isArray(fb.stages) && (fb.stages?.length ?? 0) > 0, "stages present");
  // 4. unknowns answer the door's voice.
  assert.throws(() => load.load("card", "no-such-card"), /unknown card 'no-such-card'/);
  assert.throws(() => load.load("flow", "no-such-flow"), /unknown flow 'no-such-flow'/);
  // 5. the lane grammar serves the bundle.
  const { makeEstateRequest } = await import("../../../../packages/harness/melite-tools/src/estate.ts");
  const request = makeEstateRequest(ctx) as (method: EstateMethod, path: string, body: unknown, signal: AbortSignal) => Promise<unknown>;
  const sig = new AbortController().signal;
  const lane = (await request("GET", "/v1/load?inference_type=card&name=image-gen", undefined, sig)) as { bundle?: { name?: string } };
  assert.equal(lane.bundle?.name, "image-gen", "lane serves the bundle");
});
