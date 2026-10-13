// estate-composition.spec.ts — the melite-estate bundle composes
// (2026-09-11: @melite-plugin/dsh-estate mounts the full engine
// tier — models, host, drafts, queue, cards, disclose, manage,
// skills, load, runs, media — and NOTHING booted it whole. The
// disclose/manage/runs walls mount their own slices; an order break
// or a dropped row in the bundle would pass every slice wall and
// fail only at boot).
//
// The wall mounts the bundle over the disclose wall's storage rig
// and asserts the seat plane (every provider's seat resolves) plus
// one behavior per plane proving the wiring is live, not merely
// present: disclose rows, drafts bench round-trip, manage status
// (test-flagged: no engine dialed).
//
// Run: npx vitest run tests/walls/ts/suites/estate-composition.spec.ts
// (or the whole gate: pnpm run test)
import "../../../helpers/boot-models.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {afterAll, beforeAll, describe, it} from "vitest";
import { expect } from "vitest";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { bundleSeats } from "../../helpers/bundle-seats.ts";
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
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
import estateBundle from "../../../../packages/web/melite-estate/src/index.ts";
import { mountFamilyRoster } from "../lib/family-roster.ts";
import type { DiscloseDirectoryService } from "../../../../packages/harness/estate-queue/src/index.ts";
import type { ManageGatewayService } from "../../../../packages/harness/estate-queue/src/manageRegistry.ts";
import { seedFlowsSeat } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { theService } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";

let ctx: Context;
/** The boot's state root (J12: config call data — never an env read). */
let bootRoot = "";

/** THE BUNDLE MOUNT (shared by this wall's boot and the re-boot arm
 *  below): the whole engine tier in load order over one root. */
const mountBundle = async (c: Context, root: string): Promise<void> => {
  // cross-copy plugin shapes ride the honest Plugin cast — never
  // poisons the ctx.plugin overload into a required Config.
  await c.plugin(timerPlugin as unknown as Plugin);
  await c.plugin(Storage as unknown as Plugin);
  await c.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin, { root });
  await c.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin, { backend: "json" });
  // THE FAMILY ROWS — the composition the bundle censuses (the
  // patch roster, read from the estate's own truth; a wall that
  // mounts the bundle with no Loader must seat them itself)
  await mountFamilyRoster(c);
  // THE BUNDLE — the whole engine tier in load order. J12: the
  // state root rides the estate config (the retired env seam).
  await c.plugin(estateBundle as unknown as Plugin, { stateRoot: root });
};

beforeAll(async () => {
  const root = mkdtempSync(join(tmpdir(), "estate-composition-wall-"));
  ctx = new Context();
  bootRoot = root;
  await mountBundle(ctx, root);
});

function seat<T>(name: string): T {
  const svc = ctx.get(name, false) as T | undefined;
  assert.ok(svc, `the ${name} seat is live after the bundle mount`);
  return svc;
}

/** The bundle fans its rows out un-awaited (apply fires ctx.plugin
 *  per row and returns — the host fiber settles them). The wall
 *  waits the same way the host does: poll until every claimed seat
 *  resolves, LOUD on timeout (a row that never settles is a
 *  composition break, not a slow machine). */
async function settle(names: string[]): Promise<void> {
  const deadline = Date.now() + 15_000;
  for (;;) {
    const missing: string[] = names.filter((n) => ctx.get(n, false) === undefined);
    if (missing.length === 0) return;
    if (Date.now() > deadline) {
      assert.fail(`the bundle never settled these seats: ${missing.join(", ")}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

describe("the estate bundle composes", () => {
  it("every provider seat settles (no order break, no dropped row)", async () => {
    // B-M8 (the wall audit, 2026-09-28): the ten hand-typed names
    // were a list that rots — the bundle mounts NINETEEN seats, so
    // nine were never waited for (the wedge this wall exists to
    // catch). The census is DERIVED from the bundle's own import
    // closure (every `super(ctx, "seat")` it reaches), and pinned
    // EXACTLY below so a new seat is a conscious edit.
    const seats = bundleSeats(join(REPO_ROOT, "packages/web/melite-estate/src/index.ts"), REPO_ROOT);
    expect(seats, "the bundle's seat census, derived from its import closure").toEqual([
      "benchRemote",
      "cardRegistry",
      "comfyui",
      "disclose",
      "draftsRemote",
      "engines",
      "load",
      "manage",
      "manageRemote",
      "mediaRemote",
      "melite-engine-agent",
      "melite-engine-craft",
      "melite-engine-mcp",
      "meliteDraftsDomain",
      "meliteFlows",
      "meliteSkills",
      "provisioning",
      "queue",
      "runs",
      "runsRemote",
    ]);
    // THE ENGINE-EXECUTOR SEATS ARE CONDITIONAL BY CONTRACT: the
    // engine packages seat one executor per CONFIGURED engine id
    // (this rig configures none), and the contract NAMES them —
    // `melite-engine-<id>` — so the carve is the naming law, not a
    // hand list of the ones that happen to be absent today.
    const engineSeats = seats.filter((n) => n.startsWith("melite-engine-"));
    const unconditional = seats.filter((n) => !n.startsWith("melite-engine-"));
    expect(unconditional.length, "the unconditional census is the bulk of the bundle").toBeGreaterThan(10);
    await settle(unconditional);
  }, 30000);

  it("the disclose plane answers through the bundle (cards + flows ride — EXACT, derived)", async () => {
    // B-C5 (the wall audit): `>= 11` while the registry held 13, and
    // `cards.length >= 1`, were floors over an SSOT that already
    // existed — registryFlowNames() and the card registry. Exact
    // two-way equality now: the bundle's disclose plane serves
    // EXACTLY the registered flows and cards, and the counts derive
    // from the owning declarations, never from this file.
    const disclose = seat<DiscloseDirectoryService>("disclose");
    const all = disclose.discover("all", "", "");
    assert.ok(Array.isArray(all.flows), "flows ride");
    const servedFlows = (all.flows as Array<{ name?: string }>).map((f) => f.name ?? String(f)).sort();
    const wantFlows = seedFlowsSeat().names();
    assert.ok(wantFlows.length > 0, "census floor: the flow registry declares flows (the import rotted)");
    assert.deepEqual(servedFlows, wantFlows,
      "the disclose plane serves exactly the flow registry's names");
    assert.ok(Array.isArray(all.cards), "cards ride");
    const servedCards = (all.cards as Array<{ name?: string; id?: string }>).map((c) => c.name ?? c.id ?? String(c)).sort();
    const wantCards = theService().cardIds();
    assert.ok(wantCards.length > 0, "census floor: the card registry declares cards (the import rotted)");
    assert.deepEqual(servedCards, wantCards,
      "the disclose plane serves exactly the card registry's ids");
  }, 30000);

  it("the drafts plane round-trips through the bundle (bench ensure/get — the birth row, exactly)", async () => {
    // B-C5: `typeof rev === "number"` accepted any rev on what is a
    // FRESH bundle (mkdtemp) — the birth row's law is exact: rev 0
    // (no writes happened), and the row exists after ensure.
    const bench = seat<{ ensure(doc: unknown, signal: AbortSignal): Promise<unknown>; get(session: string, signal: AbortSignal): Promise<{ rev: number; created?: string }> }>("benchRemote");
    const sig = new AbortController().signal;
    await bench.ensure({ session: "main" }, sig);
    const row = await bench.get("main", sig);
    assert.notEqual(row, undefined, "the bench row exists after ensure");
    assert.equal(row.rev, 0, "a fresh bundle's birth bench carries rev 0 (ensure wrote nothing)");
  }, 30000);

  it("the manage plane answers through the bundle (status, no engine dialed)", async () => {
    const manage = seat<ManageGatewayService>("manage");
    const sig = new AbortController().signal;
    const env = await manage.act({ action: "status", test: true }, sig);
    assert.equal(env.ok, true, "status answers test-flagged with no engine");
  });

  it("the SHIPPED composition re-mounts on its own durable state (dispose + fresh boot, same root)", async () => {
    // THE RE-BOOT LAW (the durability trio audit, T5): this wall
    // booted the shipped bundle once and never disposed it — nothing
    // proved the estate a user runs re-mounts on the durable state
    // it wrote (the e2e smoke disposes but never re-boots; the
    // drafts-remote wall re-boots the drafts plugin alone). Here the
    // first boot's bench is patched ABOVE its birth rev, the context
    // is disposed, and a fresh bundle mounts on the SAME root: the
    // row and the advanced counter can only come back off disk — a
    // re-born bench would read rev 0.
    type Bench = {
      ensure(doc: { session: string; stages: Array<{ id: string }> }, signal: AbortSignal): Promise<unknown>;
      patch(session: string, op: { stage: string; params: Record<string, number>; expect_rev: number }, signal: AbortSignal): Promise<{ rev: number }>;
      get(session: string, signal: AbortSignal): Promise<{ rev: number }>;
    };
    const sig = new AbortController().signal;
    const bench0 = seat<Bench>("benchRemote");
    await bench0.ensure({ session: "reboot", stages: [{ id: "s_0" }] }, sig);
    const patched = await bench0.patch("reboot", { stage: "s_0", params: { steps: 5 }, expect_rev: 0 }, sig);
    assert.equal(patched.rev, 1, "the first boot advanced the counter past its birth value");
    await ctx.fiber.dispose();

    const root = bootRoot;
    const fresh = new Context();
    await mountBundle(fresh, root);
    const bench1 = fresh.get("benchRemote", false) as Bench | undefined;
    assert.ok(bench1, "the fresh bundle's bench seat is live");
    const back = await bench1.get("reboot", sig);
    assert.equal(back.rev, 1, "the counter the FIRST boot advanced — read off disk, not a re-birth");
    // THE LOCK RE-TAKE (the trio audit's T5 tail): the dispose
    // released the boot lock (service.ts's PID-checked effect) and
    // the fresh boot's gate re-took it from disk — the estate's
    // other durable state, proven here in-process for the first
    // time (the e2e smoke proves it only across two live services).
    const queue1 = fresh.get("queue", false) as { lockNote: string } | undefined;
    assert.ok(queue1, "the fresh bundle's queue seat is live");
    assert.equal(queue1.lockNote, "acquired", "the second boot re-took the boot lock the dispose released");
    await fresh.fiber.dispose();
  }, 30000);
}, 30000);
