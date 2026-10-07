/** The repo's provisioner package path (lazy + memoized — a module
 * const would compute the workspace root at import).
 * @returns absolute path to packages/harness/provisioner */
export declare function dshProvisioner(): string;
export declare const DSH_PROVISIONER_NAME = "@melite/harness-provisioner";
/** The agent harness home (lazy + memoized — same import-safety law
 * as dshProvisioner).
 * @returns absolute path to data/runtime/dsh-harness-home */
export declare function dshHarnessHome(): string;
export declare const DSH_PROFILE = "estate";
export declare const DSH_PROFILE_BUNDLES: readonly string[];
export declare function resolveDshLaunch(): string[];
export declare function materializeProfile(home: string): string;
export declare function cmdDsh(): void;
