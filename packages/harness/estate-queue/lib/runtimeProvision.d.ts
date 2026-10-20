import type { DeclaredRuntime } from "@melite/comfyui-card-kit/model-contract";
export type RuntimeSentinels = Pick<DeclaredRuntime, "name" | "env" | "rel" | "sentinel" | "command">;
/** One sentinel's safe join: a sentinel escaping its home (.. or
 *  empty) is a declaration bug — false, never a filesystem escape. */
export declare function sentinelHit(home: string, sentinel: string): boolean;
/** Every sentinel stands under `home` (through a symlink when the
 *  home is one — existsSync follows links). */
export declare function runtimeHealthy(home: string, sentinels: readonly string[]): boolean;
/** The engine's own walk-up, mirrored (nodes_anny.py:885-935): the
 *  first ancestor of the output dir holding the rel dir decides — a
 *  chipped first hit is the miss, never a cue to walk on. Walk-up
 *  only: the caller owns the env leg, so this never re-checks it. */
export declare function resolveRuntimeHome(outputDir: string, rt: Pick<DeclaredRuntime, "rel" | "sentinel">): string | null;
/** THE DECLARED ENGINE ROOT (E2-2 Piece A): where the live engine
 *  lives on this box, stated in the endpoint machine statement
 *  (`engine_root`). Additive key, unknown to every other reader. */
export declare function engineRootOf(): string | null;
/** The engine's output dir: the endpoint's output_dir when stated
 *  (absolute as-is, relative resolved under the declared engine
 *  root — the managed "data/temp" spelling), else the ComfyUI
 *  default (<root>/output). The walk-up only moves UP, so
 *  starting deep is safe. */
export declare function engineOutputDir(root: string): string;
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
export declare function lanesEnvFileOf(): string | null;
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
export declare function lanesEnvValue(file: string, key: string, read: (path: string) => string): LanesEnvValue;
/** The ONE env view both consumers read: the lanes.env value
 *  overlays the process env for exactly rt.env (the file is what the
 *  next lane start arms, so a fresh edit wins over a stale process
 *  copy). `source` says which side spoke, so the verb's answer can
 *  name it. */
export type RuntimeEnvSource = "process" | "lanes.env" | "absent";
export declare function runtimeEnvView(envKey: string, env?: Record<string, string | undefined>): {
    value: string;
    source: RuntimeEnvSource;
};
/** The fs-ish seam the decision runs over — the real node half rides
 *  {@link nodeRuntimeFs}; the walls inject tmp-fixture halves. */
export interface RuntimeFs {
    exists(path: string): boolean;
    isSymlink(path: string): boolean;
    readlink(path: string): string | null;
    mkdir(path: string): void;
    symlink(target: string, path: string): void;
}
export declare const nodeRuntimeFs: RuntimeFs;
/** How the runtime was answered present — the verb's receipt names
 *  it, and the managed-engine arm (walk-up) proves the verb never
 *  double-seats. */
export type RuntimePresentSource = "env" | "lanes.env" | "walk-up" | "target";
export type RuntimeProvisionDecision = {
    kind: "already-present";
    home: string;
    source: RuntimePresentSource;
} | {
    kind: "linkable";
    seed: string;
    target: string;
} | {
    kind: "refused";
    reason: "no-engine-root" | "broken-seed" | "target-blocked" | "env-invalid";
    detail: string;
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
    env: {
        value: string;
        source: RuntimeEnvSource;
    };
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
export declare function resolveRuntimeProvision(rt: RuntimeSentinels, deps: RuntimeProvisionDeps): RuntimeProvisionDecision;
//# sourceMappingURL=runtimeProvision.d.ts.map