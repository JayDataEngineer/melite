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

  // ── the empty-string law (cold-boot audit F1/F2, 2026-11-30) ──
  // A profile row templated from the retired MELITE_STATE_ROOT env
  // renders "" exactly where the var is unset. resolveStateRoot
  // already treats "" as unnamed; the cold derivation must not read
  // it as a NAMED root one layer up — the split-brain death (runs
  // tree in the process cwd via "data/runs", store in ~).

  it("stateRoot: \"\" is ABSENT — the cold pair fires, never the relative cwd tree", () => {
    expect(coldInstallRoots({ stateRoot: "" }))
      .toEqual({ stateRoot: join(DATA_HOME, "runs"), storeRoot: join(DATA_HOME, "store") });
  });

  it("repoRoot: \"\" is ABSENT — the repo law does NOT fire on the empty string (the store arm stays on)", () => {
    expect(coldInstallRoots({ repoRoot: "" }))
      .toEqual({ stateRoot: join(DATA_HOME, "runs"), storeRoot: join(DATA_HOME, "store") });
  });

  it("storeRoot: \"\" is ABSENT — the per-user store default fires", () => {
    expect(coldInstallRoots({ storeRoot: "" }).storeRoot)
      .toBe(join(DATA_HOME, "store"));
  });

  it("a RELATIVE named root refuses LOUD — the cwd-tree death class is dead at the naming door", () => {
    for (const field of ["stateRoot", "repoRoot", "storeRoot"] as const) {
      expect(() => coldInstallRoots({ [field]: "data/runs" } as Record<string, string>), field)
        .toThrow(new RegExp(`config\\.${field} must be an absolute path`));
    }
  });

  it("a relative HOME refuses LOUD rather than pinning a relative cold root (cold-boot audit F3)", () => {
    const saved = process.env["HOME"];
    try {
      process.env["HOME"] = "";
      expect(() => coldInstallRoots({}))
        .toThrow(/per-user data home is not an absolute path.*name config\.stateRoot and config\.storeRoot/);
      process.env["HOME"] = "relative/home";
      expect(() => coldInstallRoots({}))
        .toThrow(/per-user data home is not an absolute path/);
      // the escape hatch the message names, honored exactly: fully
      // named roots never derive from the home — no refusal fires
      // (a named stateRoot alone still leaves the COLD store to the
      // home, so the refusal holds until both are named)
      expect(() => coldInstallRoots({ stateRoot: "/srv/runs" }))
        .toThrow(/per-user data home is not an absolute path/);
      expect(coldInstallRoots({ stateRoot: "/srv/runs", storeRoot: "/mnt/models" }))
        .toEqual({ stateRoot: "/srv/runs", storeRoot: "/mnt/models" });
      expect(coldInstallRoots({ repoRoot: "/opt/checkout" }))
        .toEqual({ stateRoot: "/opt/checkout/data/runs", storeRoot: undefined });
    } finally {
      if (saved === undefined) delete process.env["HOME"];
      else process.env["HOME"] = saved;
    }
  });
});
