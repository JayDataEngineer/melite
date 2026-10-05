import { ComfyUiManagerProvider } from "@melite/estate-provisioning";
import type * as CATALOG from "../src/models/families/contract.js";
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
 * @param rows the declared provision rows (family + ProvisionRow)
 */
export declare function writeManagerLocalModelList(listPath: string, rows: ReadonlyArray<{
    family: string;
    row: Pick<ProvisionRow, "name" | "folder" | "url">;
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
export interface ProvisionRow {
    name: string;
    folder: string;
    url: string;
    sha256: string;
    size_bytes?: number;
}
export declare function catalogProvisions(): Promise<Array<{
    family: string;
    row: CATALOG.ProvisionRow;
}>>;
export declare function fetchVerified(_workspace: string, storeRoot: string, label: string, url: string, name: string, sub: string, want: string, manager?: Pick<ComfyUiManagerProvider, "installModel">, tags?: {
    type: string;
    base: string;
    sizeBytes?: number;
}): Promise<string>;
export declare function stepModels(): Promise<boolean>;
