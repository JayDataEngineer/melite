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
import { Context } from '@deepseek-ai/cordis';
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
  type DiscloseService,
} from "../../../../packages/harness/estate-queue/src/index.ts";

// HYGIENE (extended 2026-10-08 after the second critique): every
// boot in this wall sets MELITE_STATE_ROOT and the skills test sets
// DSH_HOME — both leaked across tests before (the MELITE_STATE_ROOT
// leak is the same vector that poisoned the repro wall's worker).
// ONE restore path: capture both in beforeEach, restore both in
// afterEach, and remove every tracked tmp home (the battery's
// pre-run tmp-sweep only reclaims BETWEEN runs).
const tmpDirs: string[] = [];
function tmp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
}
let savedRoot: string | undefined;
let savedHome: string | undefined;

beforeEach(() => {
  savedRoot = process.env["MELITE_STATE_ROOT"];
  savedHome = process.env["DSH_HOME"];
});

afterEach(() => {
  if (savedRoot === undefined) delete process.env["MELITE_STATE_ROOT"];
  else process.env["MELITE_STATE_ROOT"] = savedRoot;
  if (savedHome === undefined) delete process.env["DSH_HOME"];
  else process.env["DSH_HOME"] = savedHome;
  for (const dir of tmpDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

async function boot(): Promise<{ ctx: Context; disclose: DiscloseService }> {
  const root = tmp("disclose-wall-");
  const ctx = new Context();
  process.env["MELITE_STATE_ROOT"] = root;
  await ctx.plugin(timerPlugin as never);
  await ctx.plugin(queuePlugin as never);
  await ctx.plugin(Storage as never);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: "json" });
  await ctx.plugin(draftsPlugin as never);
  await ctx.plugin(cardRegistryProvider as never);
  await ctx.plugin(discloseProvider as never);
  const disclose = ctx.get("disclose", false) as DiscloseService | undefined;
  assert.ok(disclose, "the disclose seat is live");
  return { ctx, disclose };
}

test("discover — both planes, live rows, the door's voices", async () => {
  const { ctx, disclose } = await boot();
  // 1. unknown lookup refuses with the door's exact voice.
  assert.throws(
    () => disclose.discover("models", "", ""),
    /unknown lookup 'models' \(all \| cards \| flows\)/,
  );
  // 2. the flows plane: the registry's eleven, live-derived
  //    (fit-seat carries its tool.json stage_title leaf).
  const all = disclose.discover("all", "", "");
  assert.ok(Array.isArray(all.flows) && all.flows.length >= 11, "the registry flows ride");
  assert.ok(Array.isArray(all.cards) && all.cards.length >= 1, "the card defs ride");
  const fit = all.flows?.find((f) => f.name === "fit-seat");
  assert.ok(fit, "fit-seat present");
  assert.equal(typeof fit.stages, "number");
  // 3. lookup=cards carries ONLY cards.
  const cardsOnly = disclose.discover("cards", "", "");
  assert.equal(cardsOnly.flows, undefined);
  assert.ok((cardsOnly.cards?.length ?? 0) >= 1);
  // 4. lookup=flows carries ONLY flows.
  const flowsOnly = disclose.discover("flows", "", "");
  assert.equal(flowsOnly.cards, undefined);
  assert.ok((flowsOnly.flows?.length ?? 0) >= 11);
  // 5. q tokens ALL match (case-folded): 'fit seat' hits fit-seat;
  //    a token absent from every row empties the plane.
  const q1 = disclose.discover("flows", "fit seat", "");
  assert.ok(q1.flows?.some((f) => f.name === "fit-seat"), "q matches");
  const q2 = disclose.discover("flows", "zzz-no-such-token", "");
  assert.equal(q2.flows?.length, 0, "no match empties");
  // 6. cards search: id/label/description/tags all in the haystack.
  const c1 = disclose.discover("cards", "image", "");
  assert.ok((c1.cards?.length ?? 0) >= 1, "card q matches");
});

test("the tools' lane grammar serves /v1/discover from the seat", async () => {
  const { ctx } = await boot();
  // The tools' request builder (seats only, in-process) — the lane
  // the melite_discover tool speaks.
  const { makeEstateRequest } = await import(
    "../../../../packages/harness/melite-tools/src/estate.ts"
  );
  const request = makeEstateRequest(ctx);
  const res = (await request("GET", "/v1/discover?lookup=all", undefined, new AbortController().signal)) as {
    flows?: unknown[]; cards?: unknown[];
  };
  assert.ok(Array.isArray(res.flows) && res.flows.length >= 11, "lane serves flows");
  assert.ok(Array.isArray(res.cards) && res.cards.length >= 1, "lane serves cards");
  // the seatless estate answers the LOUD no-remote voice (a context
  // with no disclose row — the lane grammar's own law).
  const bare = new Context();
  const bareRequest = makeEstateRequest(bare);
  await assert.rejects(
    bareRequest("GET", "/v1/discover", undefined, new AbortController().signal),
    /no remote serves GET \/v1\/discover/,
  );
});

test("the manage seat — the door's vocabulary + refusal envelope (REBUILD-15)", async () => {
  const root = tmp("disclose-wall-");
  const ctx = new Context();
  process.env["MELITE_STATE_ROOT"] = root;
  await ctx.plugin(timerPlugin as never);
  await ctx.plugin(queuePlugin as never);
  await ctx.plugin(Storage as never);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: "json" });
  await ctx.plugin(draftsPlugin as never);
  await ctx.plugin(cardRegistryProvider as never);
  await ctx.plugin(discloseProvider as never);
  const { manageProvider } = await import("../../../../packages/harness/estate-queue/src/index.ts");
  await ctx.plugin(manageProvider as never);
  const sig = new AbortController().signal;
  // 1. the closed vocabulary: a typo is a 422 envelope, not a miss.
  const typo = await manageRefusal(ctx, { action: "nope" }, sig);
  assert.equal(typo.code, "manage/refused");
  assert.equal(typo.action, "nope");
  // 3. status is a VIEW (never a throw): the envelope answers
  //    ok:true with either voice — "server up" when the estate
  //    engine is live (this machine's real ComfyUI), "server not
  //    reachable" otherwise. The data carries the truth either way.
  const manage = ctx.get("manage", false) as { act(doc: unknown, signal: AbortSignal): Promise<{ ok: boolean; detail: string; data?: { endpoint?: { reachable?: boolean } } }> };
  const st = await manage.act({ action: "status" }, sig);
  assert.equal(st.ok, true);
  const reachable = st.data?.endpoint?.reachable === true;
  if (reachable) assert.match(st.detail, /server up/);
  else assert.match(st.detail, /server not reachable/);
  // 4. the lifecycle guard, HERMETIC: INFERENCE_TEST_SANDBOX pins
  //    the endpoint config to {} (the leak gate) so the restart arm
  //    can never reach the live engine (provision≠managed → the BYO
  //    estateOnly refusal fires before any rail call). Forge an
  //    active sidecar in the repo data tree the scan reads.
  const { resolveRepoRoot } = await import("../../../../packages/engines/comfyui-cordis/src/index.ts");
  const { mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  const outDir = join(resolveRepoRoot(), "data", "runs", "output", "run-manage-guard-test");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "_flow.json"), '{"status": "running"}');
  const hadSandbox = process.env["INFERENCE_TEST_SANDBOX"];
  process.env["INFERENCE_TEST_SANDBOX"] = "1";
  try {
    const guard = await manageRefusal(ctx, { action: "restart" }, sig);
    assert.match(guard.message, /active run\(s\).*force=true/);
    // force=true bypasses the guard and reaches the BYO estateOnly
    // refusal (the sandbox endpoint has no provision=managed).
    const forced = await manageRefusal(ctx, { action: "restart", force: true }, sig);
    assert.match(forced.message, /estate never touches a user-owned ComfyUI/);
  } finally {
    rmSync(outDir, { recursive: true, force: true });
    if (hadSandbox === undefined) delete process.env["INFERENCE_TEST_SANDBOX"];
    else process.env["INFERENCE_TEST_SANDBOX"] = hadSandbox;
  }
});

/** Run act() expecting the manage/refused RemoteError; return its shape. */
async function manageRefusal(
  ctx: Context,
  doc: unknown,
  sig: AbortSignal,
): Promise<{ code: string; message: string; action?: string }> {
  const manage = ctx.get("manage", false) as {
    act(doc: unknown, signal: AbortSignal): Promise<unknown>;
  };
  assert.ok(manage, "the manage seat is live");
  try {
    await manage.act(doc, sig);
    throw new Error("expected manage/refused");
  } catch (e) {
    const re = (await import('@deepseek-ai/dsh-typert-protocol')).remoteErrorOf(e);
    assert.ok(re, "a RemoteError");
    assert.equal(re.code, "manage/refused");
    const d = (re as unknown as { details?: { action?: string } }).details ?? {};
    return { code: re.code, message: re.message, action: d.action };
  }
}

test("the skills seat — index + read, the door's voices (REBUILD-16)", async () => {
  const root = tmp("disclose-wall-");
  const ctx = new Context();
  process.env["MELITE_STATE_ROOT"] = root;
  // ENV-PIN LAW (the false-death lesson, pinned 2026-10-08): the
  // seat reads the LIVE BENCH from DSH_HOME — unpinned, the wall
  // reads the OPERATOR's real home, and the "empty bench" assert
  // below flaked the moment a real session landed there (a music
  // stage benched on the GUI made this wall read count=2). An
  // empty pin home IS the empty bench; the seeded phase re-pins.
  // (The file-level afterEach is the ONE restore path now.)
  const emptyHome = tmp("disclose-empty-home-");
  process.env["DSH_HOME"] = emptyHome;
  await ctx.plugin(timerPlugin as never);
  await ctx.plugin(queuePlugin as never);
  await ctx.plugin(Storage as never);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: "json" });
  await ctx.plugin(draftsPlugin as never);
  await ctx.plugin(cardRegistryProvider as never);
  const { skillProvider } = await import("../../../../packages/harness/estate-queue/src/index.ts");
  await ctx.plugin(skillProvider as never);
  const skills = ctx.get("meliteSkills", false) as { index(): { count?: number; skills?: Array<{ id: string }> }; read(id: string, signal: AbortSignal): { id: string; content?: string } };
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
  assert.ok((idx.families ?? []).some((f) => f.id === "krea-2"), "the benched family serves");
  assert.ok((idx.cards ?? []).some((c) => c.id === "image-gen"), "the benched card serves");
  assert.ok(!(idx.cards ?? []).some((c) => c.id === "image-edit"), "unbenched cards never ride");
  // 2. a flow skill read answers the DOC (the registry render or
  //    the SKILL.md leaf).
  const sig = new AbortController().signal;
  const doc = skills.read("flow:fit-seat", sig);
  assert.equal(doc.id, "flow:fit-seat");
  assert.ok(typeof doc.content === "string" && doc.content.includes("fit-seat"), "body renders");
  // 3. unknown ids answer the door's voice.
  assert.throws(
    () => skills.read("flow:no-such-flow", sig),
    /no such skill: "flow:no-such-flow"/,
  );
  // 4. the lane grammar serves both lanes from the seat.
  const { makeEstateRequest } = await import("../../../../packages/harness/melite-tools/src/estate.ts");
  const request = makeEstateRequest(ctx);
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
  process.env["MELITE_STATE_ROOT"] = root;
  await ctx.plugin(timerPlugin as never);
  await ctx.plugin(queuePlugin as never);
  await ctx.plugin(Storage as never);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: "json" });
  await ctx.plugin(draftsPlugin as never);
  await ctx.plugin(cardRegistryProvider as never);
  const { loadProvider } = await import("../../../../packages/harness/estate-queue/src/index.ts");
  await ctx.plugin(loadProvider as never);
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
  const request = makeEstateRequest(ctx);
  const sig = new AbortController().signal;
  const lane = (await request("GET", "/v1/load?inference_type=card&name=image-gen", undefined, sig)) as { bundle?: { name?: string } };
  assert.equal(lane.bundle?.name, "image-gen", "lane serves the bundle");
});
