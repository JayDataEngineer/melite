import type { Context } from "@deepseek-ai/cordis";
import Schema from "@deepseek-ai/schemastery";
export declare const name = "melite-estate";
/** The estate's config face (stroke 45c): repoRoot PINS the runs
 *  state tree — the queue seat refuses unpinned boots (a cwd-guessed
 *  root silently serves an empty runs tree; the profile patch names
 *  the repo). The engine gates (V6/J12 cure, 2026-10-18) are config
 *  fields the profile's cordis.yml row pins — every env seam that
 *  decided seating is gone. */
export interface Config {
    repoRoot?: string;
    /** The runs state root, named absolute (J12: the retired
     *  MELITE_STATE_ROOT env seam's config twin — wins over
     *  repoRoot's data/runs default; the queue boot gate refuses
     *  when neither root is named). */
    stateRoot?: string;
    /** §23 cross-roots manifest extras, in search order after the
     *  own root (J12: the retired MELITE_STATE_ROOTS env seam's
     *  config twin). A string is colon-split; a list passes
     *  through. */
    stateRoots?: string | string[];
    /**
     * Serve degraded when required bundles are absent instead of
     * refusing the boot (the bundle gate's explicit opt-out — the
     * profile's cordis.yml row pins it; no env seam).
     */
    allowGuttedLane?: boolean;
    /** MCP engine ids to seat (default none — optional/experimental).
     *  A string is comma-split; a list passes through. */
    mcpEngines?: string | string[];
    /** The craft critic's named route "provider/model" (unset: the
     *  auto-route's first image-capable enumeration). */
    criticRoute?: string;
    /** The agent engine's brain "provider/model" (unset: the engine
     *  stays unseated and refuses at the door — loud, never a silent
     *  default brain). */
    agentRoute?: string;
}
/** The validator twin of {@link Config}. */
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config?: Config): Promise<void>;
/** The cordis row shape: a plugin object (name + apply). */
declare const _default: {
    name: string;
    apply: typeof apply;
};
export default _default;
//# sourceMappingURL=index.d.ts.map