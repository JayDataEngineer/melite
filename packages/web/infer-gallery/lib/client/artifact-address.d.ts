/**
 * artifact-address — the estate-artifact address codec, the one home of
 * the format (2026-09-10's cross-plugin contract, in-tree since the
 * mesh tab landed): `dsh-resource://estate-artifact/<b64url of the
 * same-origin artifact URL>`. Run artifacts live outside the DSH
 * workspace, so no document owner can read them; the native seam for
 * addressable non-workspace content is a resource address claimed by
 * this package's own tab type (the mesh seat). Both directions live
 * here because both seats ride this package — minting in MediaPanel,
 * decoding in the tab body.
 */
/** The address kind this package claims (see client index.ts). */
export declare const ARTIFACT_PREFIX = "dsh-resource://estate-artifact/";
/** Mint one estate-artifact address from an artifact URL. */
export declare function estateArtifactAddress(url: string): string;
/** The artifact URL behind one estate-artifact address — null when the
 *  address is not ours or its segment is malformed (a foreign or
 *  corrupt address never renders a tab body; the caller voices the
 *  refusal honestly). A valid non-empty segment cannot decode to an
 *  empty string (atob rejects padding-only inputs), so no length
 *  re-check follows the decode. */
export declare function artifactUrlOfAddress(address: string): string | null;
//# sourceMappingURL=artifact-address.d.ts.map
