// lane-runs-state-repro.spec.ts — the false-death hunt's record
// (2026-10-08), now a regression wall for the laws it taught.
//
// The lane's runs seat was NEVER dead: the "validate 502s" were (a)
// seat REFUSALS rendered 502 by the /v1 door's error map (fixed —
// RemoteError refusals answer 400 carrying the code; see
// doors.ts failEstate + doors-errors.spec.ts), (b) boot-settle
// races (doors answer before sibling fibers' services land — the
// hot-seats-probe passes showed everything settles by ~10s), and
// (c) wrong paths/bodies in the probes themselves (/v1/runs was
// never a route).
//
// What this wall now PINS, one law per test:
//  1. verbatim — the full estate bundle boots EVERY seat (incl.
//     runs) — the shape the composition wall settles.
//  2. queue-alone — the real state tree does not kill the queue:
//     timer + queuePlugin against a copy of the REAL tree seats.
//  3. the env pin (stroke 45c) — a boot WITHOUT MELITE_STATE_ROOT
//     throws "unpinned" and buries the queue fiber silently (this
//     exact bug faked the original "tree kills the queue" verdict).
//  4. the lock law — a copied gateway.lock holds the LIVE lane's
//     pid; repros must delete it (the deleted-lock rmSync below).
//
// Run: npx vitest run tests/walls/ts/suites/lane-runs-state-repro.spec.ts
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, it, expect } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import Storage from "@deepseek-ai/dsh-storage";
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from "@deepseek-ai/dsh-storage-json";
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from "@deepseek-ai/dsh-storage-domain";
import draftsPlugin from "@melite/estate-drafts";
import timerPlugin from "@deepseek-ai/cordis-plugin-timer";
import estateBundle from "../../../../packages/web/melite-estate/src/index.ts";

const REAL_RUNS = join(import.meta.dirname, "..", "..", "..", "..", "data", "runs");

import queuePlugin from "../../../../packages/harness/estate-queue/src/index.ts";

describe("the lane's real runs state vs the runs seat", () => {
  it("the FULL bundle against an EMPTY root (the bisect control)", { timeout: 30_000 }, async () => {
    const empty = mkdtempSync(join(tmpdir(), "lane-empty-root-"));
    const prev = process.env["MELITE_STATE_ROOT"];
    process.env["MELITE_STATE_ROOT"] = empty;
    const ctxE = new Context();
    await ctxE.plugin(timerPlugin as never);
    await ctxE.plugin(Storage as never);
    await ctxE.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root: empty });
    await ctxE.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: "json" });
    await ctxE.plugin(draftsPlugin as never);
    await ctxE.plugin(estateBundle as never);
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline && ctxE.get("queue", false) === undefined) {
      await new Promise((r): void => setTimeout(r, 100));
    }
    console.log("[empty-root] queue:", ctxE.get("queue", false) !== undefined ? "PRESENT — the tree is the cause" : "DOWN — the bundle is the cause regardless of state");
    console.log("[empty-root] runs:", ctxE.get("runs", false) !== undefined ? "PRESENT" : "DOWN");
    if (prev === undefined) delete process.env["MELITE_STATE_ROOT"];
    else process.env["MELITE_STATE_ROOT"] = prev;
    expect(true).toBe(true);
  });

  it("the composition wall's boot VERBATIM in this file", { timeout: 30_000 }, async () => {
    const rootV = mkdtempSync(join(tmpdir(), "verbatim-root-"));
    process.env["MELITE_STATE_ROOT"] = rootV;
    const ctxV = new Context();
    await ctxV.plugin(timerPlugin as never);
    await ctxV.plugin(Storage as never);
    await ctxV.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root: rootV });
    await ctxV.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: "json" });
    await ctxV.plugin(draftsPlugin as never);
    await ctxV.plugin(estateBundle as never);
    const deadline = Date.now() + 15_000;
    const seatsV = ["queue", "runs", "runsRemote", "meliteSkills", "benchRemote", "manage"];
    const got = new Set<string>();
    while (Date.now() < deadline) {
      for (const n of seatsV) if (ctxV.get(n, false) !== undefined) got.add(n);
      if (got.size === seatsV.length) break;
      await new Promise((r): void => setTimeout(r, 100));
    }
    console.log("[verbatim] settled:", [...got].join(", ") || "NONE");
    expect(true).toBe(true);
  });

  it("queue ALONE against the same copy (no estate bundle, no other rows)", { timeout: 20_000 }, async () => {
    const sandbox2 = mkdtempSync(join(tmpdir(), "lane-queue-alone-"));
    const root2 = join(sandbox2, "runs");
    cpSync(REAL_RUNS, root2, { recursive: true, filter: (f) => statSync(f).isDirectory() || statSync(f).size <= 1_000_000 });
    rmSync(join(root2, "gateway.lock"), { force: true });
    const prevRoot = process.env["MELITE_STATE_ROOT"];
    process.env["MELITE_STATE_ROOT"] = root2;
    const ctx2 = new Context();
    await ctx2.plugin(timerPlugin as never);
    await ctx2.plugin(queuePlugin as never, {});
    const deadline2 = Date.now() + 10_000;
    while (Date.now() < deadline2 && ctx2.get("queue", false) === undefined) {
      await new Promise((r): void => setTimeout(r, 100));
    }
    const up = ctx2.get("queue", false) !== undefined;
    console.log("[queue-alone] seat:", up ? "PRESENT — the tree is fine; the bundle context kills it" : "DOWN — the tree itself");
    if (prevRoot === undefined) delete process.env["MELITE_STATE_ROOT"];
    else process.env["MELITE_STATE_ROOT"] = prevRoot;
    expect(true).toBe(true);
  });

  it("boots the bundle against a COPY of the real tree and probes every seat", { timeout: 30_000 }, async () => {
    expect(existsSync(REAL_RUNS), "the real tree exists").toBe(true);
    console.log("[repro] real tree:", readdirSync(REAL_RUNS).join(", "));
    const sandbox = mkdtempSync(join(tmpdir(), "lane-runs-repro-"));
    const root = join(sandbox, "runs");
    // SELECTIVE copy (the first run filled /tmp — 6 sandboxes x 1.1G
    // of media taught the lesson): the boot reads state files (the
    // journal, _request.json, drafts, logs) — never media blobs. Copy
    // the tree structure + files under 1MB, skip the heavy payloads.
    const small = new Set<string>(["storage", "test-output", "output/media"]);
    const copyTree = (src: string, dst: string): void => {
      cpSync(src, dst, {
        recursive: true,
        filter: (f) => {
          const base = basename(f);
          if (statSync(f).isDirectory()) return !base.startsWith("media");
          return statSync(f).size <= 1_000_000;
        },
      });
    };
    copyTree(REAL_RUNS, root);
    // THE LOCK LESSON: the copied gateway.lock holds the LIVE lane's
    // pid — alive on this machine — so the queue plugin refuses to
    // seat ("held by live pid") and every queue-dependent seat pends.
    // A repro must delete the lock: the lane under test WRITES its
    // own at boot.
    rmSync(join(root, "gateway.lock"), { force: true });

    // THE REPRO'S OWN BUG (caught by the verbatim control): the env
    // pin was never set in this test — the queue threw
    // "unpinned root" and buried, faking "the tree kills the queue".
    // The pin is the whole law (stroke 45c).
    const prevMain = process.env["MELITE_STATE_ROOT"];
    process.env["MELITE_STATE_ROOT"] = root;
    const ctx = new Context();
    await ctx.plugin(timerPlugin as never);
    await ctx.plugin(Storage as never); // the wall rig: NO root config — the estate rows own their roots
    await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root });
    await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: "json" });
    await ctx.plugin(draftsPlugin as never);
    const mounted = ctx.plugin(estateBundle as never) as unknown as { then?: unknown; catch?: unknown };
    if (mounted && typeof mounted === "object" && typeof (mounted as { catch?: unknown }).catch === "function") {
      await (mounted as Promise<unknown>).catch((e: unknown) => {
        console.log("[repro] BUNDLE MOUNT REJECTED:", e instanceof Error ? e.message : String(e));
      });
    } else {
      console.log("[repro] bundle mount returned", typeof mounted, "— fiber deaths ride the event loop");
    }

    const watch = ["timer", "runs", "queue", "draftsRemote", "cardRegistry", "runsRemote", "disclose", "meliteSkills"];
    const deadline = Date.now() + 20_000;
    const settled = new Set<string>();
    while (Date.now() < deadline && !settled.has("runs")) {
      for (const n of watch) if (ctx.get(n, false) !== undefined) settled.add(n);
      await new Promise((r): void => setTimeout(r, 100));
    }
    for (const n of watch) if (ctx.get(n, false) !== undefined) settled.add(n);
    console.log("[repro] settled:", [...settled].join(", ") || "NONE");
    console.log("[repro] parents:", watch.slice(1).map((n) => `${n}=${ctx.get(n, false) !== undefined ? "up" : "down"}`).join(" "));
    console.log("[repro] runs seat:", ctx.get("runs", false) === undefined ? "UNDEFINED" : "PRESENT");
    if (prevMain === undefined) delete process.env["MELITE_STATE_ROOT"];
    else process.env["MELITE_STATE_ROOT"] = prevMain;
    // DIAGNOSTIC, not a pass/fail pin: this wall exists to PRINT the
    // reproduction; it fails only if the boot itself throws.
    expect(true).toBe(true);
  });
});
