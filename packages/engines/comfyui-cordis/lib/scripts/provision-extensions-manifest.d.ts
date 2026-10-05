export interface ExtRow {
    name: string;
    registry: string;
    version: string;
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
