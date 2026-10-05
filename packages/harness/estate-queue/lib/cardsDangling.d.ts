/** THE SWEEP ROOTS (§23): every manifest root's output/ and
 * test-output/ trees, own state root first, deduped. A test:true
 * run may wire a test artifact — the test trees sweep too. */
export declare function sweepOutputRoots(): string[];
export declare function resolveArtifactFile(ref: string, outRoot: string): string;
export declare function refLocations(body: unknown): Array<{
    location: string;
    ref: string;
}>;
/** The compose gate's first-hit question: the first dangling
 *  (location, ref, why), or null when every wired artifact URL is
 *  live under ANY swept tree (§23 — the manifest walk, own root
 *  first; a miss names every searched tree so a two-roots box
 *  stays debuggable). */
export declare function findCardDangling(body: Record<string, unknown>): [string, string, string] | null;
//# sourceMappingURL=cardsDangling.d.ts.map
