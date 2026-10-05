import type { Context } from "@deepseek-ai/cordis";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type { DraftsDomainSpec } from "./spec.js";
/** Env override for the unit-file root (an env seam, never a hardcode). */
export declare const STORAGE_ROOT_ENV: string;
/** The json backend's unit-file root: `<stateRoot>/storage`. */
export declare function resolveStorageRoot(): string;
/** Open (or reuse) the drafts domain for this process's storage
 *  root. Throws LOUD when the host provides no storage facility —
 *  misconfiguration fails at the earliest resolvable point. */
export declare function openDraftsDomain(ctx: Context): Promise<Domain<DraftsDomainSpec>>;
//# sourceMappingURL=store.d.ts.map
