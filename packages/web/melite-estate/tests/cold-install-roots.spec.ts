// cold-install-roots.spec.ts — THE SEAMLESS-INSTALL WALL (operator
// 2026-10-30: "keep going until the install is seamless… everything
// has to be AS EASY AS POSSIBLE TO SETUP"). The 0.2.0-alpha mint's
// cold-consumer rehearsal proved the failure this wall pins: a fresh
// `dsh plugin install` names NO roots on the estate row, the queue
// row rightly refuses an unpinned boot (its own stroke-45c law), and
// the whole estate dies half-up with "33 entries did not activate"
// — the settle gate naming seats nobody can cure without reading
// source. The cure is coldInstallRoots: the ESTATE ROW is the namer
// of last resort, pinning per-user defaults before the rows mount.
// The pin law keeps its teeth — the queue still receives a NAMED
// absolute root (never a cwd guess, never an empty pin), and the
// single-writer lock holds one estate per user exactly as one per
// repo. These arms judge the REAL exported function over the REAL
// config face; the mint's rehearsal (fresh container, official
// install, zero config) is the journey-depth proof above it.
import { describe, it, expect } from "vitest";
import { homedir } from "node:os";
import { join } from "node:path";
import { coldInstallRoots } from "../src/index.ts";

const DATA_HOME = join(homedir(), ".local", "share", "melite");

describe("coldInstallRoots — the cold profile boots with zero config", () => {
  it("an empty config (the fresh-install shape) pins the per-user runs tree and weights store", () => {
    const roots = coldInstallRoots({});
    expect(roots.stateRoot).toBe(join(DATA_HOME, "runs"));
    expect(roots.storeRoot).toBe(join(DATA_HOME, "store"));
  });

  it("config.stateRoot and config.storeRoot win verbatim (the operator's named roots are never rewritten)", () => {
    expect(coldInstallRoots({ stateRoot: "/srv/estate/runs", storeRoot: "/mnt/models" }))
      .toEqual({ stateRoot: "/srv/estate/runs", storeRoot: "/mnt/models" });
  });

  it("a named storeRoot overrides the cold default even when repoRoot is absent", () => {
    expect(coldInstallRoots({ storeRoot: "/mnt/models" }))
      .toEqual({ stateRoot: join(DATA_HOME, "runs"), storeRoot: "/mnt/models" });
  });

  it("a named repoRoot keeps the repo law: <repo>/data/runs, and NO store default (the checkout derives it — loadStoreRoot's own law)", () => {
    const roots = coldInstallRoots({ repoRoot: "/opt/checkout" });
    expect(roots.stateRoot).toBe(join("/opt/checkout", "data", "runs"));
    expect(roots.storeRoot).toBeUndefined();
  });

  it("config.stateRoot beats a named repoRoot (the explicit pin wins the precedence)", () => {
    expect(coldInstallRoots({ repoRoot: "/opt/checkout", stateRoot: "/srv/estate/runs" }).stateRoot)
      .toBe("/srv/estate/runs");
  });

  it("every resolved root is ABSOLUTE — an unpinned boot is never satisfied with a cwd-relative guess", () => {
    for (const config of [{}, { repoRoot: "/opt/checkout" }, { stateRoot: "/srv/runs" }] as const) {
      const roots = coldInstallRoots(config);
      expect(roots.stateRoot.startsWith("/"), JSON.stringify(config)).toBe(true);
      if (roots.storeRoot !== undefined) {
        expect(roots.storeRoot.startsWith("/"), JSON.stringify(config)).toBe(true);
      }
    }
  });
});
