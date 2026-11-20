/** Underscore card dirs bridge to their registry ids here
 *  (dead doors/toolProjection.ts:27-31, verbatim — a future dir
 *  rename deletes the row). */
export declare const DIR_ID_ALIASES: Readonly<Record<string, string>>;
/** Path.stem: strip the last-dot suffix; dotfiles keep theirs. */
export declare function stem(name: string): string;
/** Disclosure root (the REPO the doors read): the ONE root
 *  resolution, {@link resolveRepoRoot} in comfyui-cordis
 *  (MELITE_REPO_ROOT else file-anchored — design/repo-root-anchor-
 *  2026-10-18.md). This alias keeps the doors' vocabulary; the
 *  plugin-law N3 cure (2026-10-20) deleted the second copy — both
 *  packages sit at equal tree depth, so the shared anchor serves
 *  every plane.
 *  Exported — the catalogs door anchors the same root (one root
 *  function, never duplicated). */
export declare function disclosureRoot(): string;
export declare function isDir(p: string): boolean;
export declare function isFile(p: string): boolean;
/** Sorted subdir names, NO dot filter (the disclosure walks —
 *  _model_rows/_card_rows/_model_ids — never filter dots; only
 *  catalog._dirs_under does). D4 over non-ASCII. */
export declare function subdirs(parent: string): string[];
export declare function readText(p: string): string | null;
//# sourceMappingURL=skillFs.d.ts.map