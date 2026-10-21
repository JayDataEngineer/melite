import { ComfyUiManagerProvider } from "@melite/estate-provisioning";
import type * as CATALOG from "@melite/comfyui-card-kit/model-contract";
/** The Manager whitelist key this estate's declared rows match on:
 *  check_whitelist_for_model compares save_path+base+filename between
 *  the install payload and the model list, so both sides mint the
 *  same tag. */
export declare const MELITE_MODEL_BASE = "melite";
export interface LocalModelListRow {
    name: string;
    type: string;
    base: string;
    save_path: string;
    filename: string;
    url: string;
}
/**
 * Writes Manager's LOCAL model-list (read by get_data_by_mode('local')
 * from <manager-install>/model-list.json) with one row per declared
 * provision — the file that admits estate rows into Manager's install
 * whitelist. Deterministic: rows are sorted by save_path+filename so
 * repeated runs byte-match.
 *
 * @param listPath absolute path of the manager-local model-list.json
 * @param rows the declared provision rows (family + CATALOG.ProvisionRow)
 */
export declare function writeManagerLocalModelList(listPath: string, rows: ReadonlyArray<{
    family: string;
    row: Pick<CATALOG.ProvisionRow, "name" | "folder" | "url">;
}>): void;
/**
 * Pins Manager's security_level to 'weak' — the tier whose install
 * gates accept the declared-row channel (non-.safetensors installs
 * are otherwise refused unless their url sits in the public catalog).
 * The estate's per-row sha256 gate is the actual download boundary:
 * every queued file is digest-verified after Manager lands it, so
 * 'weak' plus verification is tighter than the default level without
 * it. Idempotent: replaces only the security_level line; reports
 * whether a RUNNING engine would need a restart (Manager caches its
 * config at read).
 *
 * @param configPath absolute path of user/__manager/config.ini
 * @returns true when the on-disk line was already 'weak'
 */
export declare function ensureManagerSecurityWeak(configPath: string): boolean;
export declare function sha256Of(path: string): string;
export declare function catalogProvisions(): Promise<Array<{
    family: string;
    row: CATALOG.ProvisionRow;
}>>;
export declare function fetchVerified(_workspace: string, storeRoot: string, label: string, url: string, name: string, sub: string, want: string, manager?: Pick<ComfyUiManagerProvider, "installModel">, tags?: {
    type: string;
    base: string;
    sizeBytes?: number;
}): Promise<string>;
/** The snapshot dest derivation (the single-file twin strips
 *  slashes the same way in stepModels).
 *  @param folder the parent dir under the models root
 *  @param name the tree basename the lane loads
 *  @returns the models-relative dest dir (folder/name) */
export declare function snapshotDest(folder: string, name: string): string;
/** The files a snapshot row fetches (deterministic: sorted).
 *  An allow pattern is either an exact repo path (config.json) or
 *  a `dir/*` prefix for a whole subtree (speech_tokenizer/*).
 *  @param siblings the repo file list (HF API rfilenames)
 *  @param allowPatterns the row's allow_patterns
 *  @returns the matched files, deduped and sorted */
export declare function snapshotFilesForPatterns(siblings: readonly string[], allowPatterns: readonly string[]): string[];
/** The load-bearing files every TTS snapshot must land.
 *  The vendored node loads from_pretrained on the dir, which reads
 *  the config plus the weights plus the speech tokenizer.
 *  @param files the expanded snapshot file list
 *  @returns true when the list covers the load set */
export declare function snapshotCoversLoadSet(files: readonly string[]): boolean;
/** The repo file list behind a snapshot row, AT THE PIN (the seat's
 *  hfTreeEntries owns the same law — the unpinned model-info door
 *  was a drift seam: the file set could name paths the pin does not
 *  carry).
 *  @param repoId the upstream repo (owner/name)
 *  @param revision the immutable pin
 *  @param fetchFn the fetch implementation (injectable for tests)
 *  @returns the pinned tree's file paths */
export declare function hfRepoFiles(repoId: string, revision: string, fetchFn?: typeof globalThis.fetch): Promise<string[]>;
/** The snapshot presence probe (the fetchable-tree receipt).
 *  A tree counts present when its dir holds the load set's two
 *  anchor files (config + weights).
 *  @param storeRoot the models tree root
 *  @param folder the row's parent dir under the root
 *  @param name the tree basename
 *  @returns true when the landed tree loads */
export declare function snapshotDirPresent(storeRoot: string, folder: string, name: string): boolean;
/** The declared snapshot rows (family + row, all families).
 *  @returns the snapshot channel rows */
export declare function catalogSnapshotProvisions(): Promise<Array<{
    family: string;
    row: CATALOG.SnapshotProvisionRow;
}>>;
/**
 * Fetches one snapshot row (DRY-aware).
 * DRY is an existence probe (present/skipped, else planned).
 * A real pass downloads every pattern hit the tree lacks, then
 * verifies the load set landed.
 * @param storeRoot the models tree root
 * @param family the declaring family id
 * @param row the snapshot row
 * @param fetchFn the fetch implementation (injectable for tests)
 * @returns ok (landed), bad (fetch or verify failed), skipped
 * (already present), planned (DRY and absent) */
export declare function fetchSnapshotVerified(storeRoot: string, family: string, row: CATALOG.SnapshotProvisionRow, fetchFn?: typeof globalThis.fetch): Promise<string>;
/** One family's hand-placed trees plus the snapshot-covered names.
 *  @param family the declaring family id
 *  @param handPlaced the DECL hand_placed_weights entries
 *  @param fetched the snapshot row names covering this family */
export interface HandPlacedCheck {
    family: string;
    handPlaced: readonly string[];
    fetched: readonly string[];
}
/** The loud miss for a merged tree (no upstream repo exists, so no
 *  snapshot row can fetch it — the operator places the built tree).
 *  The folder sentence is the vendored node's own (its _ensure_variant
 *  miss names this folder when the tree is absent).
 *  @param family the declaring family id
 *  @param tree the absent tree entry
 *  @returns the miss sentence */
export declare function mergedTreeMiss(family: string, tree: string): string;
/** The hand-placed presence receipt (the merged-tree arm of fix 8).
 *  Every hand-placed tree must resolve under one of the TTS folder
 *  roots with a config.json (mirrors the vendored multi-root walk:
 *  audiocpp first, then the qwen3_tts folder).
 *  @param storeRoot the models tree root
 *  @param roots the TTS folder roots (models-relative, audiocpp then qwen3_tts)
 *  @param families the families to verify
 *  @returns the present trees plus the missing split (merged vs fetch-covered) */
export declare function verifyHandPlacedTrees(storeRoot: string, roots: readonly string[], families: readonly HandPlacedCheck[]): {
    present: string[];
    missingMerged: Array<{
        family: string;
        tree: string;
    }>;
    missingFetched: Array<{
        family: string;
        tree: string;
    }>;
};
export declare function stepModels(): Promise<boolean>;
