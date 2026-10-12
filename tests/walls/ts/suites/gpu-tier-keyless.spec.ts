import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import net from "node:net";

// THE GPU TIER'S KEYLESS CONTRACT (dev_docs/plans/gpu-playwright-tier-
// 2026-10-12.md) — the tier that does REAL inference (engine + cuda
// + the operator's 37 GB weights tree) must NEVER fire inside the
// default battery, and its own door must collect exactly it.
//
// The judge is Playwright's own collector and the launcher's own
// gate — never a grep over the config file (the DEPTH law: a wall
// judging a copy of the truth passes while the truth burns):
//   1. the DEFAULT studio config collects no GPU spec (testIgnore);
//   2. the GPU config collects them (its testDir is the only door);
//   3. the GPU spec SELF-SKIPS without the launcher's gates — no
//      lane, no GPU, exit 0, "1 skipped";
//   4. the launcher's ENGINE GATE: a dead engine skips keyless
//      (exit 0) and FAILS LOUD under E2E_GPU_REQUIRE=1 (exit 1).
// Arm 4 is the never-a-fake-red law's own seat: the tier refuses to
// run on a GPUless host and refuses to SKIP silently when told the
// prerequisites are required.

const CARD_VIEW = join(import.meta.dirname, "..", "..", "..", "..", "packages", "web", "melite-card-view");
const REPO = join(import.meta.dirname, "..", "..", "..", "..");
const LANE = join(REPO, "scripts", "e2e-gpu-lane.sh");

/** Run playwright's collector in a seat and return { code, out }.
 * @param config the playwright config file name to collect through.
 * @param env extra env for the child. */
function collect(config: string, env: Record<string, string> = {}): { code: number | null; out: string } {
  const r = spawnSync("pnpm", ["exec", "playwright", "test", "--list", "-c", config], {
    cwd: CARD_VIEW,
    encoding: "utf8",
    env: { ...process.env, ...env },
    timeout: 120_000,
  });
  return { code: r.status, out: (r.stdout ?? "") + (r.stderr ?? "") };
}

/** A port this wall can name for the lane's port check (the script
 * probes its port BEFORE the engine gate this wall judges — a live
 * GPU lane on the default 3917 would masquerade as the gate's own
 * skip). Bind-and-release asks the kernel for a free port; the
 * release-to-run window is the race this wall accepts and names. */
async function aFreePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

describe("THE GPU TIER'S KEYLESS CONTRACT (the both-angles tier)", () => {
  it("the DEFAULT studio config collects no GPU spec — the battery stays GPUless", () => {
    // Arm 1: playwright's own collector over the default config must
    // not list the GPU pilot. If this reds, a GPU spec slipped into
    // the CI seat — every CI box without a 4090 would hang or fake
    // a verdict.
    const { code, out } = collect("playwright.config.ts");
    expect(code, `the default collector ran (${out.slice(0, 200)})`).toBe(0);
    expect(out, "no e2e/gpu/ spec in the default seat's collection").not.toContain("z-image-human-run");
    expect(out, "no e2e/gpu/ path in the default seat's collection").not.toContain("e2e/gpu/");
  });

  it("the GPU config collects the tier — its testDir is the only door", () => {
    // Arm 2: the gpu config's OWN collection must include every
    // tier spec (a door that collects nothing judges nothing — the
    // wall-that-cried-green lesson): the pilot, the door layer, and
    // the on-demand sweep.
    const { code, out } = collect("playwright.gpu.config.ts");
    expect(code, `the gpu collector ran (${out.slice(0, 200)})`).toBe(0);
    expect(out, "the GPU pilot is collected by the gpu config").toContain("z-image-human-run");
    expect(out, "the door-layer spec is collected by the gpu config").toContain("automotive-doors");
    expect(out, "the all-cards sweep is collected by the gpu config").toContain("all-cards-sweep");
  });

  it("the GPU spec SELF-SKIPS without the launcher's gates — exit 0, never a fake red", () => {
    // Arm 3: no E2E_STUDIO_URL, no E2E_GPU — the spec's own test.skip
    // fires. Skipped tests never launch a browser, so the run needs
    // no lane, no engine, no GPU: keyless by construction.
    const stripped: Record<string, string> = { ...process.env } as Record<string, string>;
    delete stripped.E2E_STUDIO_URL;
    delete stripped.E2E_GPU;
    const r = spawnSync("pnpm", ["exec", "playwright", "test", "-c", "playwright.gpu.config.ts"], {
      cwd: CARD_VIEW,
      encoding: "utf8",
      env: stripped,
      timeout: 180_000,
    });
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    expect(r.status, `the gateless run exited 0 with a skip (${out.slice(0, 300)})`).toBe(0);
    expect(out, "the spec skipped, never ran").toMatch(/1 skipped|skipped/);
    expect(out).not.toContain("failed");
  });

  it("the all-cards sweep SELF-SKIPS without its own census gate — the routine lane never pays for it", () => {
    // Arm 5: the sweep is a 90-minute GPU census, on-demand by
    // design (E2E_GPU_SWEEP=1). With the OTHER two gates armed
    // (E2E_GPU=1, a studio URL — even a dead one) but the census
    // gate absent, the sweep spec must SKIP, never run, never fake
    // a red: the routine lane (pilot + doors) stays minutes-scale.
    // Judged by playwright's own runner on the sweep spec alone —
    // the skip fires before any browser launch, so a dead URL never
    // matters. The census gate is STRIPPED explicitly: a host that
    // carries E2E_GPU_SWEEP in its env would run the 90-minute
    // census inside the wall.
    const sweepEnv: Record<string, string> = { ...(process.env as Record<string, string>), E2E_GPU: "1", E2E_STUDIO_URL: "http://127.0.0.1:9" };
    delete sweepEnv.E2E_GPU_SWEEP;
    const r = spawnSync("pnpm", ["exec", "playwright", "test", "-c", "playwright.gpu.config.ts", "e2e/gpu/all-cards-sweep.spec.ts"], {
      cwd: CARD_VIEW,
      encoding: "utf8",
      env: sweepEnv,
      timeout: 180_000,
    });
    const out = (r.stdout ?? "") + (r.stderr ?? "");
    expect(r.status, `the gateless-of-census sweep exited 0 with a skip (${out.slice(0, 300)})`).toBe(0);
    expect(out, "the sweep skipped on its own gate, never ran").toMatch(/1 skipped/);
    expect(out).not.toMatch(/failed|passed/);
  });

  it("the STATUS SEAT contract: the sweep polls data-stage-status on the element that CARRIES it", () => {
    // Arm 6, both sides of the run-18 seam: the sweep's terminal
    // poll read `data-stage-status` off the tileInner BUTTON — an
    // element that carries only `data-status` (sortable-tile.tsx
    // seats data-stage-status on the OUTER stage tile, line 93) —
    // so getAttribute answered null forever and EVERY card timed
    // out its full budget on runs that finished in seconds (anny's
    // cached replay completed engine-side in 16s; the estate wrote
    // the bench row done one second later; the sweep still threw
    // at 12 minutes). The contract judges the PAIR: the producer
    // (sortable-tile renders data-stage-status beside data-stage-id
    // on the same element) and the consumer (the sweep's poll
    // locator is scoped to that same attribute-owning element).
    // Either side regressing reds here — and the GPU census itself
    // would burn its full budget per card again.
    const sweep = readFileSync(join(CARD_VIEW, "e2e", "gpu", "all-cards-sweep.spec.ts"), "utf8");
    expect(
      sweep,
      "the sweep polls the status through the attribute-owning stage tile (the assignment itself, never a stray literal)",
    ).toMatch(/statusTile = page\.locator\('\[data-stage-id\]\[data-stage-status\]'\)/);
    // the poll's read must ask for the attribute that element owns —
    // a getAttribute('data-stage-status') on ANY element NOT scoped
    // by the data-stage-id selector is the run-18 defect reborn.
    const bareRead = /getAttribute\('data-stage-status'\)/g;
    const reads = sweep.match(bareRead) ?? [];
    expect(reads.length, "the sweep reads data-stage-status at least once").toBeGreaterThan(0);
    for (const line of sweep.split("\n")) {
      if (line.includes("getAttribute('data-stage-status')")) {
        expect(
          line.includes("statusTile") || line.includes("[data-stage-id]"),
          `the status read rides the scoped seat: ${line.trim()}`,
        ).toBe(true);
      }
    }
    const tile = readFileSync(join(CARD_VIEW, "src", "client", "sortable-tile.tsx"), "utf8");
    expect(
      tile,
      "the stage tile still renders the data-stage-status seat (sortable-tile)",
    ).toMatch(/'data-stage-id':\s*row\.id/);
    expect(tile).toMatch(/'data-stage-status':\s*row\.status/);
  });

  it("the launcher's ENGINE GATE: dead engine skips keyless, FAILS LOUD under REQUIRE", async () => {
    // Arm 4, both edges: the gate probes the engine before any home
    // is built or host booted (fast, side-effect-free — the script
    // exits at the gate). E2E_GPU_PORT names a port this wall chose
    // free (a live GPU lane on the default port would masquerade as
    // the gate's own skip); E2E_GPU_ENGINE points at a port nothing
    // owns.
    const port = String(await aFreePort());
    const dead = { E2E_GPU_ENGINE: "http://127.0.0.1:9", E2E_GPU_PORT: port };
    const skip = spawnSync("bash", [LANE], {
      cwd: REPO,
      encoding: "utf8",
      env: { ...process.env, ...dead },
      timeout: 120_000,
    });
    const skipOut = (skip.stdout ?? "") + (skip.stderr ?? "");
    expect(skip.status, `the keyless dead-engine lane skips (exit 0): ${skipOut.slice(0, 300)}`).toBe(0);
    expect(skipOut, "the skip names the engine as the reason").toContain("engine at http://127.0.0.1:9 unreachable");

    const loud = spawnSync("bash", [LANE], {
      cwd: REPO,
      encoding: "utf8",
      env: { ...process.env, ...dead, E2E_GPU_REQUIRE: "1" },
      timeout: 120_000,
    });
    const loudOut = (loud.stdout ?? "") + (loud.stderr ?? "");
    expect(loud.status, `the REQUIRED dead-engine lane FAILS (exit 1): ${loudOut.slice(0, 300)}`).toBe(1);
    expect(loudOut, "the refusal names the required prerequisite").toContain("REQUIRED prerequisite missing");
  });
});
