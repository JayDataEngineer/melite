import type { Context } from "@deepseek-ai/cordis";
export declare const name = "melite-estate";
/** The estate's config face (stroke 45c): repoRoot PINS the runs
 *  state tree — the queue seat refuses unpinned boots (a cwd-guessed
 *  root silently serves an empty runs tree; the profile patch names
 *  the repo). It was the only field: Config.blenderPath left with the
 *  blender stdio row (audit 008 M12). */
export interface Config {
    repoRoot?: string;
    /**
     * Serve degraded when required bundles are absent instead of
     * refusing the boot (the bundle gate's explicit opt-out; the
     * MELITE_ALLOW_GUTTED_LANE=1 environment wins over this field).
     */
    allowGuttedLane?: boolean;
}
export declare function apply(ctx: Context, config?: Config): Promise<void>;
/** The cordis row shape: a plugin object (name + apply). */
declare const _default: {
    name: string;
    apply: typeof apply;
};
export default _default;
//# sourceMappingURL=index.d.ts.map
