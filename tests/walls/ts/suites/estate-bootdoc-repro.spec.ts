// estate-bootdoc-repro.spec.ts — THE BOOT-DOC WEDGE repro (2026-09-21).
//
// The lane died whenever a live bench doc sat on disk at boot: half
// the estate's seats (meliteSkills, runs, provisions) never came up
// and the boot logged NOTHING (the operator's instant-fail — skill
// reads 502'd mid-session while discover/load answered). Every wall
// boots a CLEAN tmp state root, so the wedge was invisible to the
// battery. This spec seeds the real bench doc BEFORE the bundle
// mounts, exactly like a lane restart after any composed session.
//
// It is a REPRO first: run it and read the failure's own voice.
import "../../../helpers/boot-models.ts";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import timerPlugin from "@deepseek-ai/cordis-plugin-timer";
import draftsPlugin from "@melite/estate-drafts";
import Storage from "@deepseek-ai/dsh-storage";
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from "@deepseek-ai/dsh-storage-json";
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from "@deepseek-ai/dsh-storage-domain";
import estateBundle from "../../../../packages/web/melite-estate/src/index.ts";

let ctx: Context;
// ENV HYGIENE (the battery's own lesson): this spec points DSH_HOME at
// a tmp tree; a leaked env var redirects benchDir() for every suite
// that shares the worker after us. Stash, set, RESTORE.
const stashed: Record<string, string | undefined> = {};

beforeAll(async () => {
  for (const k of ["DSH_HOME", "MELITE_STATE_ROOT"]) stashed[k] = process.env[k];
  const root = mkdtempSync(join(tmpdir(), "estate-bootdoc-repro-"));
  process.env["MELITE_STATE_ROOT"] = root;
  // THE SEED, AT THE PATH THE CODE ACTUALLY READS: benchDir() is
  // $DSH_HOME/storages/drafts/docs (bench.ts:45) — NOT the storage
  // plugin's root. The first repro seeded the storage root and
  // proved nothing; this one points DSH_HOME itself.
  const home = mkdtempSync(join(tmpdir(), "estate-bootdoc-home-"));
  const docs = join(home, "storages", "drafts", "docs");
  mkdirSync(docs, { recursive: true });
  const saved = readFileSync("/tmp/bench-doc-saved.json", "utf8");
  writeFileSync(join(docs, "bench-session-6d8ed483-16d3-4ec7-b08e-5c2ccbf09928.json"), saved);
  process.env["DSH_HOME"] = home;
  ctx = new Context();
  await ctx.plugin(timerPlugin as never);
  await ctx.plugin(Storage as never);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: "json" });
  await ctx.plugin(draftsPlugin as never);
  await ctx.plugin(estateBundle as never);
}, 60_000);

describe("the estate bundle boots with a live bench doc present", () => {
  it("every provider seat settles (the wedge repro)", async () => {
    const names = ["queue", "draftsRemote", "benchRemote", "cardRegistry", "disclose", "manage", "meliteSkills", "load", "runs"];
    const deadline = Date.now() + 20_000;
    for (;;) {
      const missing = names.filter((n) => ctx.get(n, false) === undefined);
      if (missing.length === 0) break;
      if (Date.now() > deadline) {
        throw new Error("WEDGED — these seats never settled with a bench doc at boot: " + missing.join(", "));
      }
      await new Promise((r): void => setTimeout(r, 50));
    }
    expect(true).toBe(true);
  }, 30_000);
});
