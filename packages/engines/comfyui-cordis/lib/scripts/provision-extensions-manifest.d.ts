export interface ExtRow {
    name: string;
    url: string;
    ref: string;
    required: boolean;
    desc: string;
    pip: string[];
    _source?: string;
}
export declare const EXT_KEYS: ReadonlySet<string>;
export declare function stripComment(line: string): string;
export declare function unquote(s: string, path: string, ln: number): string;
export declare function loadExtensionsYaml(path: string): ExtRow[];
export declare function pluginIdFor(rel: string): string;
export declare function findNodesYaml(repo: string): Array<[string, string]>;
export declare function mergeManifest(repo: string): ExtRow[];
/** The shipped manifest's read path: the MELITE_EXTENSION_MANIFEST
 *  override first (the COMFYUI_ENDPOINT_CONFIG idiom — the fixture
 *  seam and an operator's explicit re-point), else the package's
 *  shipped data file. Never a repo-root walk: the override and the
 *  package anchor both resolve on an installed profile.
 *  @returns absolute path to the manifest JSON. */
export declare function extensionManifestPath(): string;
/** Read the SHIPPED extension manifest — the declaration plane's one
 *  runtime source (declarationPort's install-shape read; the repo
 *  walk is the regenerator's source of truth, never a fallback).
 *  Absent or unparseable refuses LOUD naming the path: a silent
 *  empty manifest is the audit-019 F1 burn (every extension id
 *  refused on an installed profile), so this door refuses instead.
 *  @param path the manifest file to read; defaults to
 *  {@link extensionManifestPath}.
 *  @returns the merged extension rows, manifest order.
 *  @throws when the file is missing, unparseable, or a row is off
 *  the ExtRow contract. */
export declare function loadShippedExtensionManifest(path?: string): ExtRow[];
