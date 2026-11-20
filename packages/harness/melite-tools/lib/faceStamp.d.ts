/** The git runner seam (walls inject fakes; live runs git). */
export type GitRun = (args: string[], cwd: string) => string;
/** Pure: short hash + dirty flag -> the stamp. */
export declare function formatStamp(hash: string, dirty: boolean): string;
/** Read the stamp through an injectable runner — any git failure
 *  (not a checkout, git absent, status unreadable) stamps `unknown`. */
export declare function readStamp(run: GitRun, root: string): string;
/** The serving process's stamp (resolved once, then the value). */
export declare function faceStamp(root?: string, run?: GitRun): string;
//# sourceMappingURL=faceStamp.d.ts.map
