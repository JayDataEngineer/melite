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
import { bundleSeats } from "../../helpers/bundle-seats.ts";
const REPO = new URL("../../../../", import.meta.url).pathname.replace(/\/$/, "");
import "../../../helpers/boot-models.ts";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, type Plugin } from "@deepseek-ai/cordis";
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

// The stash existed and was never spent (2026-10-13, the flake audit):
// beforeAll copied DSH_HOME and MELITE_STATE_ROOT, and nothing ever
// wrote them back, so this wall's roots outlived it. afterAll is the
// only place a whole-file rig can honestly hand the env back.
afterAll(() => {
  for (const [key, value] of Object.entries(stashed)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
/** The seeded bench doc's path (the arm below reads it back after the
 *  boot — the walls audit's H7: a boot that DELETED the seed still
 *  settled every seat and the old arm passed). */
let seedPath = "";

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
  // THE SEED is a REAL-SHAPED bench doc, TRACKED beside the wall
  // (tests/walls/ts/fixtures/bench-wedge-seed.json): the wall was
  // authored against a /tmp copy of a live session, then against the
  // repo-local runtime home — both undeclared environmental
  // dependencies, and the home is gone (single-setup law 2026-10-18).
  // A seed the tree does not carry is a seed that silently vanishes;
  // the doc's filename rides its own draft_id.
  const seedId = "bench-wedge-seed";
  const saved = readFileSync(
    join(REPO, `tests/walls/ts/fixtures/bench-wedge-seed.json`),
    "utf8",
  );
  seedPath = join(docs, `${seedId}.json`);
  writeFileSync(seedPath, saved);
  process.env["DSH_HOME"] = home;
  ctx = new Context();
  // cross-copy plugin shapes ride the honest Plugin cast — never
  // poisons the ctx.plugin overload into a required Config.
  await ctx.plugin(timerPlugin as unknown as Plugin);
  await ctx.plugin(Storage as unknown as Plugin);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin, { root });
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin, { backend: "json" });
  await ctx.plugin(draftsPlugin as unknown as Plugin);
  await ctx.plugin(estateBundle as unknown as Plugin);
}, 60_000);

describe("the estate bundle boots with a live bench doc present", () => {
  it("every provider seat settles (the wedge repro)", async () => {
    // B-M8 (the wall audit, 2026-09-28): nine hand-typed names for a
    // bundle that mounts eighteen — the same rot as the composition
    // twin, and the wedge this arm exists to catch. The census is
    // DERIVED from the bundle's import closure and pinned exactly
    // (the composition wall holds the same derivation; the engine
    // executor seats are conditional per configured engine id, and
    // this rig configures none).
    const names = bundleSeats(REPO + "/packages/web/melite-estate/src/index.ts", REPO)
      .filter((n) => !n.startsWith("melite-engine-"));
    expect(names).toEqual([
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
      "meliteSkills",
      "provisioning",
      "queue",
      "runs",
      "runsRemote",
    ]);
    const deadline = Date.now() + 20_000;
    for (;;) {
      const missing = names.filter((n) => ctx.get(n, false) === undefined);
      if (missing.length === 0) break;
      if (Date.now() > deadline) {
        throw new Error("WEDGED — these seats never settled with a bench doc at boot: " + missing.join(", "));
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    // THE SEED SURVIVED THE BOOT (the walls audit's H7: the arm
    // polled the seats and asserted true — a boot that DELETED the
    // seeded bench doc still settled every seat and passed. The seed
    // is the subject of the repro, so it is verified after the boot.)
    // the bench row IS the file the repro seeds (bench.ts reads
    // $DSH_HOME/storages/drafts/docs) — read it back off disk, which
    // is where a boot-time wipe would show
    const { readFileSync: rf, existsSync: ex } = await import("node:fs");
    expect(ex(seedPath), "the seeded bench doc survived the boot (a boot that wiped it would still settle every seat)").toBe(true);
    const row = JSON.parse(rf(seedPath, "utf8")) as { record?: { doc?: { stages?: unknown[] } } };
    expect((row.record?.doc?.stages ?? []).length, "and it still carries its stage").toBe(1);
  }, 30_000);
});
