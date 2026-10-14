/** The repo's provisioner package path (lazy + memoized — a module
 * const would compute the workspace root at import).
 * @returns absolute path to packages/harness/provisioner */
export declare function dshProvisioner(): string;
export declare const DSH_PROVISIONER_NAME = "@melite/harness-provisioner";
/** The drive's throwaway harness home (lazy + memoized — same import-safety law
 * as dshProvisioner). Single-setup law 2026-10-18: this used to default
 * to the repo-local `data/runtime/dsh-harness-home` fossil — a second
 * home beside the operator's live ~/.dsh. The drive home is SCRATCH by
 * design (cmdDsh refuses the GUI home — isolation is the mount's whole
 * point), so the default is an OS-tmp throwaway, never a repo path and
 * never the live home. MELITE_DSH_HOME still overrides for pinned runs.
 * @returns absolute path to the throwaway drive home */
export declare function dshHarnessHome(): string;
export declare const DSH_PROFILE = "estate";
export declare const DSH_PROFILE_BUNDLES: readonly string[];
export declare function resolveDshLaunch(): string[];
export declare function materializeProfile(home: string): string;
export declare function cmdDsh(): void;
