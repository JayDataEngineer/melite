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

async function boot(): Promise<{ ctx: Context; disclose: DiscloseDirectoryService; root: string }> {
  const root = tmp("disclose-wall-");
  const ctx = new Context();
  process.env["MELITE_STATE_ROOT"] = root;
  // cross-copy plugin shapes ride the honest Plugin cast (never
  // poisons the ctx.plugin overload into a required Config) —
  // the same idiom at every boot below.
  await ctx.plugin(timerPlugin as unknown as Plugin);
  await ctx.plugin(queuePlugin as unknown as Plugin);
  await ctx.plugin(Storage as unknown as Plugin);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin, { backend: "json" });
  await ctx.plugin(draftsPlugin as unknown as Plugin);
  await ctx.plugin(cardRegistryProvider as unknown as Plugin);
  await ctx.plugin(discloseProvider as unknown as Plugin);
  const disclose = ctx.get("disclose", false) as DiscloseDirectoryService | undefined;
  assert.ok(disclose, "the disclose seat is live");
  return { ctx, disclose, root };
}

// THE LOAD-SIZED TIMEOUT (2026-10-10): this arm boots BOTH planes
// over a real Context (cards, models, flows, skills, drafts) and
// drives the discovery door through them — the spec default of 5s
// cannot hold that under a full-fleet run, and a wall that dies of
// its own boot time is a wall that lies (it reports a red the code
// never produced). 60s is far above the arm's real cost and far
// below "hung".
test("discover — both planes, live rows, the door's voices", { timeout: 60_000 }, async () => {
  const { ctx, disclose } = await boot();
  // 1. unknown lookup refuses with the door's exact voice.
  assert.throws(
    () => disclose.discover("models", "", ""),
    /unknown lookup 'models' \(all \| cards \| flows\)/,
  );
  // 2. the flows plane: the registry's own census, exact
  //    (fit-seat carries its tool.json stage_title leaf).
  //    A-M8 (the wall audit, 2026-09-28): `>= 11` and `>= 1`
  //    floors let the roster shrink silently; the door now serves
  //    the REGISTRIES' censuses, exactly.
  //    THE HAND-PINNED ROSTER (the li-az stroke, 2026-10-11):
  //    door↔registry equality is DERIVED from the live read — but a
  //    registry that LOSES a row shrinks both sides of that
  //    comparison and the wall stays green. The flows/ DIRECTORY is
  //    no oracle either (8 leaves, not 1:1 — five leaves ride no
  //    registry row; the registry is the truth, the dir is a
  //    residue). The absolute roster is pinned HERE, by hand, and
  //    the equality is two-way: a flow added to the registry reds
  //    until this pin grows WITH intent; a flow dropped reds by
  //    name. Deliberate is the point — a roster change is an API
  //    change, and the wall is where it gets said out loud.
  const THE_FLOW_ROSTER = [
    "agent-spawn", "anny-hmr", "anny-hmr-commercial", "anny-params",
    "audio-native-tts", "body-to-somax", "character", "craft-loop",
    "fit-seat", "image-upscale", "kimodo-native", "music-native",
    "skin-apply",
  ];
  const { registryFlowNames } = await import("../../../../packages/harness/estate-queue/src/flowsData.ts");
  const { loadCardDefs } = await import("../../../../packages/engines/comfyui-cordis/src/cardDefs.ts");
  const PINNED = [...THE_FLOW_ROSTER].sort();
  const registered = [...registryFlowNames()].sort();
  const dropped = PINNED.filter((n) => !registered.includes(n));
  const invented = registered.filter((n) => !PINNED.includes(n));
  assert.deepEqual({ dropped, invented }, { dropped: [], invented: [] },
    "the registry roster equals the HAND-PINNED roster, two-way (dropped: in the pin, not the registry; invented: in the registry, not the pin)");
  const flowCensus = registryFlowNames().length;
  const cardCensus = (await loadCardDefs()).size;
  const all = disclose.discover("all", "", "");
  assert.ok(Array.isArray(all.flows) && all.flows.length === flowCensus,
    `the registry flows ride, exactly (got ${String(all.flows?.length)} vs ${String(flowCensus)} registered)`);
  assert.ok(Array.isArray(all.cards) && all.cards.length === cardCensus,
    `the card defs ride, exactly (got ${String(all.cards?.length)} vs ${String(cardCensus)} registered)`);
  // A-M14 (the wall audit, 2026-09-28): one row's shape was checked
  // (fit-seat) — a malformed SECOND row rode. Every row is now
  // checked, and every served name is a REGISTERED name (two-way:
  // the door may not invent a flow, nor drop one).
  const rows = all.flows ?? [];
  const malformed = rows.filter((f) => typeof (f as { name?: unknown }).name !== "string"
    || (f as { name?: unknown }).name === ""
    || typeof (f as { stages?: unknown }).stages !== "number");
  assert.deepEqual(malformed.map((f) => JSON.stringify(f)), [],
    `every served flow row is shaped (name:string non-empty, stages:number) — ${String(rows.length)} rows`);
  const servedNames = rows.map((f) => (f as { name: string }).name).sort();
  assert.deepEqual(servedNames, PINNED,
    "the served flow names ARE the pinned roster, exactly (neither invented nor dropped)");
  const fit = rows.find((f) => (f as { name: string }).name === "fit-seat");
  assert.ok(fit, "fit-seat present");
  assert.equal(typeof (fit as { stages?: unknown }).stages, "number");
  // 3. lookup=cards carries ONLY cards.
  const cardsOnly = disclose.discover("cards", "", "");
  assert.equal(cardsOnly.flows, undefined);
  assert.ok((cardsOnly.cards?.length ?? 0) >= 1);
  // 4. lookup=flows carries ONLY flows.
  const flowsOnly = disclose.discover("flows", "", "");
  assert.equal(flowsOnly.cards, undefined);
  assert.equal(flowsOnly.flows?.length ?? 0, PINNED.length,
    `lookup=flows serves the full pinned roster (${String(PINNED.length)}), exactly — a floor here let the roster shrink silently`);
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
  // makeEstateRequest's runtime truth is (method, path, body,
  // signal) — EstateRequest's trailing timeoutMs never reaches the
  // seats; narrow the callable instead of inventing a value.
  const request = makeEstateRequest(ctx) as (method: EstateMethod, path: string, body: unknown, signal: AbortSignal) => Promise<unknown>;
  const res = (await request("GET", "/v1/discover?lookup=all", undefined, new AbortController().signal)) as {
    flows?: unknown[]; cards?: unknown[];
  };
  const { registryFlowNames } = await import("../../../../packages/harness/estate-queue/src/flowsData.ts");
  assert.ok(Array.isArray(res.flows) && res.flows.length === registryFlowNames().length, "lane serves flows, exactly");
  assert.ok(Array.isArray(res.cards) && res.cards.length > 0, "lane serves cards");
  // the seatless estate answers the LOUD no-remote voice (a context
  // with no disclose row — the lane grammar's own law).
  const bare = new Context();
  const bareRequest = makeEstateRequest(bare) as (method: EstateMethod, path: string, body: unknown, signal: AbortSignal) => Promise<unknown>;
  await assert.rejects(
    bareRequest("GET", "/v1/discover", undefined, new AbortController().signal),
    /no seat on this lane serves GET \/v1\/discover/,
  );
});

test("the manage seat — the door's vocabulary + refusal envelope (REBUILD-15)", async () => {
  const root = tmp("disclose-wall-");
  const ctx = new Context();
  process.env["MELITE_STATE_ROOT"] = root;
  await ctx.plugin(timerPlugin as unknown as Plugin);
  await ctx.plugin(queuePlugin as unknown as Plugin);
  await ctx.plugin(Storage as unknown as Plugin);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin, { backend: "json" });
  await ctx.plugin(draftsPlugin as unknown as Plugin);
  await ctx.plugin(cardRegistryProvider as unknown as Plugin);
  await ctx.plugin(discloseProvider as unknown as Plugin);
  const { manageProvider } = await import("../../../../packages/harness/estate-queue/src/index.ts");
  await ctx.plugin(manageProvider as unknown as Plugin);
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
  // HERMETIC, ONE-DIRECTED (the walls audit's row 10, 2026-10-10):
  // the old arm branched on the response's OWN reachable flag and
  // then asserted the detail matched the branch — a door that lied
  // in both fields passed its own oracle. The sandbox pins the
  // endpoint config to {} (the same guard arm 4 uses), so the truth
  // is FIXED before the call: not reachable, and the voice says so.
  const hadStatusSandbox = process.env["INFERENCE_TEST_SANDBOX"];
  process.env["INFERENCE_TEST_SANDBOX"] = "1";
  let st: { ok: boolean; detail: string; data?: { endpoint?: { reachable?: boolean } } };
  try {
    st = await manage.act({ action: "status" }, sig);
  } finally {
    if (hadStatusSandbox === undefined) delete process.env["INFERENCE_TEST_SANDBOX"];
    else process.env["INFERENCE_TEST_SANDBOX"] = hadStatusSandbox;
  }
  assert.equal(st.ok, true);
  // A-M11 (the wall audit, 2026-09-28): notEqual(reachable, true)
  // passed for reachable === undefined too — an absent field is not
  // an honest "not reachable". The truth is strict: false.
  assert.equal(st.data?.endpoint?.reachable, false,
    "the sandboxed status says NOT reachable, strictly (undefined is not an honest verdict — the oracle is fixed, not self-referential)");
  assert.match(st.detail, /server not reachable/);
  // 4. the lifecycle guard, HERMETIC: INFERENCE_TEST_SANDBOX pins
  //    the endpoint config to {} (the leak gate) so the restart arm
  //    can never reach the live engine (provision≠managed → the BYO
  //    estateOnly refusal fires before any rail call). Forge an
  //    active sidecar in the repo data tree the scan reads.
  const { mkdirSync, writeFileSync, rmSync } = await import("node:fs");
  // THE ROOTS UNIFICATION (2026-09-25): the restart guard reads the
  // roots manifest (this test's OWN pinned state root), never the
  // repo tree — forge the live sidecar where the estate's execution
  // also lives.
  const outDir = join(root, "output", "run-manage-guard-test");
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
  await ctx.plugin(timerPlugin as unknown as Plugin);
  await ctx.plugin(queuePlugin as unknown as Plugin);
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
  //    the SKILL.md leaf). The sample is skin-apply: fit-seat
  //    refuses at compose (the bone seam, ROADMAP 44e), so its body
  //    has nothing to render and the index skips it.
  const sig = new AbortController().signal;
  const doc = skills.read("flow:skin-apply", sig);
  assert.equal(doc.id, "flow:skin-apply");
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
  const laneDoc = (await request("GET", "/v1/skills/flow%3Askin-apply", undefined, sig)) as { id?: string };
  assert.equal(laneDoc.id, "flow:skin-apply", "lane serves the read");
  // (env restore + tmp cleanup live in the file-level afterEach —
  // the ONE restore path; these nested finallies were the second
  // critique's double-restore smell)
});

test("the load seat — card + flow bundles, the door's voices (REBUILD-17)", async () => {
  const root = tmp("disclose-wall-");
  const ctx = new Context();
  process.env["MELITE_STATE_ROOT"] = root;
  await ctx.plugin(timerPlugin as unknown as Plugin);
  await ctx.plugin(queuePlugin as unknown as Plugin);
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
