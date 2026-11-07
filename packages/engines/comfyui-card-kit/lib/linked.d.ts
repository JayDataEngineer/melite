/** The asset-URL mount: the LIVE spelling, and the legacy one
 *  that every stored bench, archive and run row still carries (it
 *  died with the gateway app; the media route serves BOTH names
 *  forever — operator, 2026-10-10: "THERE IS NO FILTER, NO BREAKAGE
 *  FROM THIS. EVER."). A linked input may name either; both resolve
 *  to the same confined file under the runs root. */
export declare const ASSET_RUNS_PREFIX: string;
export declare const MEDIA_RUNS_PREFIX: string;
/** The run-media prefix a path names, or "" when it names none.
 *  The prefixes are the CONTRACT's (benchStage.ts) — the same two
 *  names the media route mounts and the bench heals, so a reader
 *  here cannot fall behind the writer there. */
export declare function runMediaPrefix(path: string): string;
/** The runs output root under the named state root (J12: the
 *  retired MELITE_STATE_ROOT env seam — the caller names the
 *  estate's configured state root; there is no cwd guess to fall
 *  back on). */
export declare function runsRoot(stateRoot: string): string;
/** Rewrite a root-relative asset URL to its estate mount path;
 *  every other spelling rides verbatim. A rewritten path that
 *  escapes the runs root refuses LOUD (never a smuggled read). */
export declare function resolveLinkedInput(ref: string, stateRoot: string): string;
//# sourceMappingURL=linked.d.ts.map