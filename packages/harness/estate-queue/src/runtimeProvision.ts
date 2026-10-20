// runtimeProvision.ts — THE RUNTIME PROVISION DECISION CORE (E2-2
// Piece B, operator 2026-10-20): the pure judgment behind the
// `provision_runtime` manage verb AND the press-time gate's G3
// lanes.env leg — ONE module so gate and verb can never disagree.
//
// The operator's law (the stuck-download burn): a fresh provision of
// the estimator is broken — the chain files are placed by hand — so
// this core never re-provisions and never copies bytes. The ONLY
// materialize arm is a SYMLINK from the engine tree's
// data/runtime/<name> to the repo's healthy seed (instant, nothing
// to wedge; the seed stays the source of truth). Everything else is
// already-present or a named refusal.
//
// The module is pure over injected fs deps: the walls run it on tmp
// fixtures (fixture seed + fixture sentinel files, never the real
// 7.4G tree; symlink creation against tmp dirs is fine).
import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadEndpointConfig } from "@melite/comfyui-cordis";
import type { DeclaredRuntime } from "@melite/comfyui-card-kit/model-contract";

export type RuntimeSentinels = Pick<DeclaredRuntime, "name" | "env" | "rel" | "sentinel" | "command">;

/** One sentinel's safe join: a sentinel escaping its home (.. or
 *  empty) is a declaration bug — false, never a filesystem escape. */
export function sentinelHit(home: string, sentinel: string): boolean {
  const clean: string = sentinel.trim().replace(/^\/+|\/+$/gu, "");
  if (clean === "" || clean.split("/").some((part) => part === "..")) return false;
  return existsSync(join(home, clean));
}

/** Every sentinel stands under `home` (through a symlink when the
 *  home is one — existsSync follows links). */
export function runtimeHealthy(home: string, sentinels: readonly string[]): boolean {
  return sentinels.every((s) => sentinelHit(home, s));
}

/** The engine's own walk-up, mirrored (nodes_anny.py:885-935): the
 *  first ancestor of the output dir holding the rel dir decides — a
 *  chipped first hit is the miss, never a cue to walk on. Walk-up
 *  only: the caller owns the env leg, so this never re-checks it. */
export function resolveRuntimeHome(
  outputDir: string,
  rt: Pick<DeclaredRuntime, "rel" | "sentinel">,
): string | null {
  let dir: string = resolve(outputDir);
  for (;;) {
    const home: string = join(dir, ...rt.rel);
    if (existsSync(home)) {
      return runtimeHealthy(home, rt.sentinel) ? home : null;
    }
    const parent: string = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** THE DECLARED ENGINE ROOT (E2-2 Piece A): where the live engine
 *  lives on this box, stated in the endpoint machine statement
 *  (`engine_root`). Additive key, unknown to every other reader. */
export function engineRootOf(): string | null {
  let cfg: Record<string, unknown>;
  try {
    cfg = loadEndpointConfig() as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
  const raw: unknown = cfg["engine_root"];
  if (typeof raw !== "string" || raw.trim() === "") return null;
  return raw.trim();
}

/** The engine's output dir: the endpoint's output_dir when stated
 *  (absolute as-is, relative resolved under the declared engine
 *  root — the managed "data/temp" spelling), else the ComfyUI
 *  default (<root>/output). The walk-up only moves UP, so
 *  starting deep is safe. */
export function engineOutputDir(root: string): string {
  let cfg: Record<string, unknown>;
  try {
    cfg = loadEndpointConfig() as unknown as Record<string, unknown>;
  } catch {
    return join(root, "output");
  }
  const raw: unknown = cfg["output_dir"];
  if (typeof raw !== "string" || raw.trim() === "") return join(root, "output");
  const v: string = raw.trim();
  return v.startsWith("/") ? v : join(root, v);
}

/** THE G3 LANES.ENV LEG (runtime-leg-cure audit G3): the endpoint's
 *  additive `lanes_env_file` key names the env file the lane unit is
 *  started with (systemd EnvironmentFile=%h/Documents/mcp/env/
 *  lanes.env on this deployment). Reading it lets an override the
 *  ENGINE sees but the lane process cannot (the process predates the
 *  edit) count as present — with the file's own value named. No
 *  machine-path default in code: the key absent = no lanes.env leg
 *  (current behavior). Fail-open stands (G2 trust extended to the
 *  file): a stated-valid path in the file is trusted, not proven
 *  against the engine's live process env — the verb's answer names
 *  the file the value came from and states the restart clause. */
export function lanesEnvFileOf(): string | null {
  let cfg: Record<string, unknown>;
  try {
    cfg = loadEndpointConfig() as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
  const raw: unknown = cfg["lanes_env_file"];
  if (typeof raw !== "string" || raw.trim() === "") return null;
  return raw.trim();
}

export interface LanesEnvValue {
  readonly value: string;
  readonly present: boolean;
}

/** Parse ONE key out of a systemd EnvironmentFile spelling: KEY=VALUE
 *  lines; blank lines and `#`/`;` comments (indented or not) are
 *  skipped; inline `#` text stays part of the value (systemd does not
 *  strip trailing comments in this mode, so neither do we — a quoted
 *  or commented value surfaces verbatim in the named-source answer
 *  and fails its sentinels loudly, never silently). ORDER: LAST-WINS —
 *  a later assignment overrides an earlier one, matching systemd's
 *  EnvironmentFile read order (later settings override earlier
 *  settings) and shell source semantics. The walls pin this with a
 *  first-dead/last-healthy fixture. */
export function lanesEnvValue(file: string, key: string, read: (path: string) => string): LanesEnvValue {
  let text: string;
  try {
    text = read(file);
  } catch {
    return { value: "", present: false };
  }
  let found: string | null = null;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith(";")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq).trim() !== key) continue;
    found = trimmed.slice(eq + 1).trim();
  }
  return found === null ? { value: "", present: false } : { value: found, present: true };
}

/** The ONE env view both consumers read: the lanes.env value
 *  overlays the process env for exactly rt.env (the file is what the
 *  next lane start arms, so a fresh edit wins over a stale process
 *  copy). `source` says which side spoke, so the verb's answer can
 *  name it. */
export type RuntimeEnvSource = "process" | "lanes.env" | "absent";

export function runtimeEnvView(
  envKey: string,
  env: Record<string, string | undefined> = process.env,
): { value: string, source: RuntimeEnvSource } {
  const file = lanesEnvFileOf();
  if (file !== null) {
    const lane = lanesEnvValue(file, envKey, (p) => readFileSync(p, "utf8"));
    if (lane.present && lane.value !== "") return { value: lane.value, source: "lanes.env" };
  }
  const value = (env[envKey] ?? "").trim();
  return { value, source: value === "" ? "absent" : "process" };
}

// ── THE DECISION ────────────────────────────────────────────────────

/** The fs-ish seam the decision runs over — the real node half rides
 *  {@link nodeRuntimeFs}; the walls inject tmp-fixture halves. */
export interface RuntimeFs {
  exists(path: string): boolean;
  isSymlink(path: string): boolean;
  readlink(path: string): string | null;
  mkdir(path: string): void;
  symlink(target: string, path: string): void;
}

export const nodeRuntimeFs: RuntimeFs = {
  exists: (p) => existsSync(p),
  isSymlink: (p) => {
    try {
      return lstatSync(p).isSymbolicLink();
    } catch {
      return false;
    }
  },
  readlink: (p) => {
    try {
      return readlinkSync(p);
    } catch {
      return null;
    }
  },
  mkdir: (p) => {
    mkdirSync(p, { recursive: true });
  },
  symlink: (target, path) => {
    symlinkSync(target, path, "dir");
  },
};

/** How the runtime was answered present — the verb's receipt names
 *  it, and the managed-engine arm (walk-up) proves the verb never
 *  double-seats. */
export type RuntimePresentSource = "env" | "lanes.env" | "walk-up" | "target";

export type RuntimeProvisionDecision =
  | { kind: "already-present", home: string, source: RuntimePresentSource }
  | { kind: "linkable", seed: string, target: string }
  | {
    kind: "refused",
    reason: "no-engine-root" | "broken-seed" | "target-blocked" | "env-invalid",
    detail: string,
  };

export interface RuntimeProvisionDeps {
  /** The endpoint's declared engine root (null = the estate cannot
   *  see that tree). */
  engineRoot: string | null;
  /** The walk-up start (the engine's own output dir) — only read
   *  when engineRoot is non-null. */
  walkStart: string;
  /** The ONE env view (runtimeEnvView) — the value AND the side it
   *  came from, so an invalid override is named with its origin. */
  env: { value: string, source: RuntimeEnvSource };
  /** The repo's healthy seed home: join(repoRoot, "data", "runtime",
   *  rt.name). */
  repoSeedHome: string;
  fs: RuntimeFs;
}

/** THE DECISION CORE (pure). Order is the law:
 *  1. a stated env override (process or lanes.env) — valid counts as
 *     present (source env / lanes.env), invalid refuses naming it
 *     (the press gate refuses the same run: gate+verb agreement);
 *  2. no engine root refuses (the estate cannot see that tree);
 *  3. the walk-up from the engine's output — a hit is present
 *     (the managed-engine arm: the verb never double-seats);
 *  4. an existing healthy target (real dir or live symlink) is
 *     present; a real CHIPPED or foreign one refuses target-blocked
 *     — never clobbered;
 *  5. a healthy seed with an absent target is linkable; a chipped
 *     seed refuses broken-seed voicing the DECL's provision command. */
export function resolveRuntimeProvision(
  rt: RuntimeSentinels,
  deps: RuntimeProvisionDeps,
): RuntimeProvisionDecision {
  if (deps.env.value !== "") {
    if (runtimeHealthy(deps.env.value, rt.sentinel)) {
      return {
        kind: "already-present",
        home: deps.env.value,
        source: deps.env.source === "lanes.env" ? "lanes.env" : "env",
      };
    }
    return {
      kind: "refused",
      reason: "env-invalid",
      detail: "provision_runtime: the " + rt.env + " override ('" + deps.env.value + "' from " +
        deps.env.source + ") does not hold every sentinel (" + rt.sentinel.join(", ") +
        ") — fix the path or clear the override; the press gate refuses this run until then",
    };
  }
  if (deps.engineRoot === null) {
    return {
      kind: "refused",
      reason: "no-engine-root",
      detail: "provision_runtime: the endpoint states no engine_root — the estate cannot see the engine tree, " +
        "so it refuses to guess where " + rt.name + " should link. Declare engine_root in the endpoint config first.",
    };
  }
  const walked = resolveRuntimeHome(deps.walkStart, rt);
  if (walked !== null) return { kind: "already-present", home: walked, source: "walk-up" };
  const target: string = join(deps.engineRoot, "data", "runtime", rt.name);
  if (deps.fs.exists(target)) {
    if (runtimeHealthy(target, rt.sentinel)) {
      return { kind: "already-present", home: target, source: "target" };
    }
    const linked: string | null = deps.fs.isSymlink(target) ? deps.fs.readlink(target) : null;
    return {
      kind: "refused",
      reason: "target-blocked",
      detail: "provision_runtime: " + target + " already exists" +
        (linked !== null ? " (a symlink to " + linked + ")" : " as a real dir") +
        " but does not hold every sentinel (" + rt.sentinel.join(", ") +
        ") — the verb never clobbers it; remove the chipped copy by hand and press again",
    };
  }
  const seed: string = deps.repoSeedHome;
  if (!runtimeHealthy(seed, rt.sentinel)) {
    return {
      kind: "refused",
      reason: "broken-seed",
      detail: "provision_runtime: the repo seed " + seed + " does not hold every sentinel (" +
        rt.sentinel.join(", ") + ") — the fresh provision script is not a cure here (the chain files are " +
        "placed by hand); repair the seed with " + rt.command + " and its documented hand steps first",
    };
  }
  return { kind: "linkable", seed, target };
}
