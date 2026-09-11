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
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {describe, it, beforeAll} from "vitest";
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
import estateBundle from "../../../../packages/web/melite-estate/src/index.ts";
import type { DiscloseService } from "../../../../packages/harness/estate-queue/src/index.ts";
import type { ManageService } from "../../../../packages/harness/estate-queue/src/manageRegistry.ts";

let ctx: Context;

beforeAll(async () => {
  const root = mkdtempSync(join(tmpdir(), "estate-composition-wall-"));
  process.env["MELITE_STATE_ROOT"] = root;
  ctx = new Context();
  await ctx.plugin(timerPlugin as never);
  await ctx.plugin(Storage as never);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: "json" });
  // THE BUNDLE — the whole engine tier in load order.
  await ctx.plugin(estateBundle as never);
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
    await new Promise((r): void => setTimeout(r, 50));
  }
}

describe("the estate bundle composes", () => {
  it("every provider seat settles (no order break, no dropped row)", async () => {
    await settle([
      "queue",
      "draftsRemote",
      "benchRemote",
      "cardRegistry",
      "disclose",
      "manage",
      "skills",
      "load",
      "runs",
      "comfyui",
    ]);
  });

  it("the disclose plane answers through the bundle (cards + flows ride)", () => {
    const disclose = seat<DiscloseService>("disclose");
    const all = disclose.discover("all", "", "");
    assert.ok(Array.isArray(all.flows) && all.flows.length >= 11, "flows ride");
    assert.ok(Array.isArray(all.cards) && all.cards.length >= 1, "cards ride");
  });

  it("the drafts plane round-trips through the bundle (bench ensure/get)", async () => {
    const bench = seat<{ ensure(doc: unknown, signal: AbortSignal): Promise<unknown>; get(session: string, signal: AbortSignal): Promise<{ rev: number }> }>("benchRemote");
    const sig = new AbortController().signal;
    await bench.ensure({ session: "main" }, sig);
    const row = await bench.get("main", sig);
    assert.equal(typeof row.rev, "number");
  });

  it("the manage plane answers through the bundle (status, no engine dialed)", async () => {
    const manage = seat<ManageService>("manage");
    const sig = new AbortController().signal;
    const env = await manage.act({ action: "status", test: true }, sig);
    assert.equal(env.ok, true, "status answers test-flagged with no engine");
  });
});
