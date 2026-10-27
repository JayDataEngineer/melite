import type { BoundLayout, EndpointConfig } from "./provision-config.js";
export declare function probe(url: string, path: string, timeoutMs?: number): {
    status: number;
    text: string;
};
/** The generated yaml's exact body — ONE owner shared by the writer
 *  (cmdPaths) and the wiring-roots wall, which recomputes it from
 *  the config and refuses a stale file (the wiring-roots audit,
 *  2026-10-13: nothing reconciled the generated roots with the
 *  config that should have produced them).
 *  @param bound the bound layout (base, download, folder map).
 *  @returns the full file body, trailing newline included. */
export declare function wiringYamlBody(bound: BoundLayout): string;
/**
 * Creates the model store the dead-root refusal names (fresh-clone
 * gate, 2026-10-17): `paths`/`sync` refuse a store that does not
 * exist — loud by law, catching typoed roots — but a fresh clone
 * has no store at all, and "create the store" was a hand-carried
 * mkdir with no door. This verb IS the named action: it lays the
 * two bound roots plus every category directory under the download
 * root, idempotently. It never runs inside `paths` (that would
 * create a typoed root silently — the exact bug the refusal
 * cures); a plain FILE in place of either root still refuses.
 *
 * @param cfg the endpoint config (storage overrides resolve like `paths`)
 */
export declare function cmdInitStore(cfg: EndpointConfig): void;
export declare function cmdPaths(cfg: EndpointConfig): void;
export declare function layDownloadPointers(downloadBase: string, folders: Record<string, string>, modelsDir?: string): void;
/**
 * Removes every symlink directly under the runtime's models dir —
 * the pointer layer `layDownloadPointers` owns. THE BUMP COLLISION
 * (audit 005/E5, 2026-10-22): a pin hop onto a provisioned tree
 * meets the pointers as symlinks over tracked placeholder dirs;
 * `git checkout` of a target that changes those placeholders aborts
 * on the local deletion, and one that recreates their parent dirs
 * writes THROUGH the link into the model store. Detaching the
 * pointers first gives the checkout a clean tracked surface; the
 * layout re-lays them right after (checkout precedes `paths` — the
 * ORDER LAW, now on every hop, not only the first provision).
 * Content never moves: pointers are links, the store keeps
 * everything.
 *
 * @param modelsDir the runtime's models dir (default: the
 *        provisioned runtime's own)
 * @returns the detached pointer names (empty when none were laid)
 */
export declare function detachModelPointers(modelsDir?: string): string[];
export declare const ENDPOINT_DERIVED: readonly string[];
/**
 * The writable form of a derived path for the TRACKED endpoint file:
 * repo-relative stays relative, an absolute path under the repository
 * is stored relative to the repo root, and a machine absolute outside
 * the repository returns null — that value belongs to the untracked
 * machine overlay (data/inference.local.json), never to a file a
 * fresh clone shares (ledger li-portability).
 *
 * @param value the derived machine-resolved path
 * @returns the tracked-file-safe form, or null when the overlay owns it
 */
export declare function endpointWritable(value: string, root?: string): string | null;
export declare function syncEndpointFromRoot(cfg: EndpointConfig): void;
/** Begin marker of melite's owned block in a BYO engine's
 *  extra_model_paths.yaml. Everything between this and
 *  {@link BYO_BLOCK_END} is melite's; every byte outside is the
 *  user's, never read for meaning and never rewritten. */
export declare const BYO_BLOCK_BEGIN: string;
/** End marker of melite's owned block. */
export declare const BYO_BLOCK_END: string;
/**
 * The engine-root file the door writes: the single extra-path config
 * ComfyUI reads automatically at boot.
 * @param engineRoot the ComfyUI checkout dir (the dir holding main.py)
 * @returns absolute path of <engineRoot>/extra_model_paths.yaml
 */
export declare function byoExtraPathsFile(engineRoot: string): string;
/**
 * The folder map the block binds: stock categories map to themselves,
 * pack-declared categories ride the endpoint statement's
 * extra_model_folders (the same mapping the managed wiring binds —
 * one store schema, two attach planes).
 * @param extras the endpoint statement's extra_model_folders (optional)
 * @returns {folder: store subdir} with stock folders first
 */
export declare function byoFolderMap(extras?: Record<string, string>): Record<string, string>;
/**
 * Melite's marked block body — the yaml ComfyUI's loader consumes:
 * a top-level `melite_weights` key (base_path + every folder) plus
 * the `download_model_base` registration so Manager downloads land
 * in the store (same key semantics as the managed wiringYamlBody).
 * The base_path is written ABSOLUTE: a relative one would resolve
 * against the yaml's own dir, and the store is the estate's own
 * statement, not the engine tree's tenant.
 * @param storeRoot the model store root the estate acquires into
 * @param extras the endpoint statement's extra_model_folders (optional)
 * @returns the full block body, markers included, trailing newline
 */
export declare function byoExtraPathsBlock(storeRoot: string, extras?: Record<string, string>): string;
/** Result of {@link writeByoExtraPaths}. */
export interface ByoWriteResult {
    /** The file the block lives in. */
    path: string;
    /** Whether bytes changed this call (false = already exact). */
    wrote: boolean;
    /** Whether the file did not exist before this call. */
    created: boolean;
}
/**
 * Link melite's model store into a LOCAL BYO engine's extra-path
 * mechanism: create the engine's extra_model_paths.yaml, or append
 * melite's marked block after the user's content, or replace the
 * existing marked block in place. IDEMPOTENT: a call whose block is
 * already byte-exact writes nothing. LOUD refusals (never silently
 * skip): an engine root that is not a ComfyUI tree, a torn block
 * (begin marker without its end), a store root that does not exist
 * (ComfyUI serves empty enums for dead roots — the wiring re-audit
 * F7 law).
 *
 * @param engineRoot the ComfyUI checkout dir (the dir holding main.py)
 * @param storeRoot the model store root the estate acquires into
 * @param extras the endpoint statement's extra_model_folders (optional)
 * @returns what was written (wrote=false when already exact)
 */
export declare function writeByoExtraPaths(engineRoot: string, storeRoot: string, extras?: Record<string, string>): ByoWriteResult;
/**
 * Derive the BYO attach pair from the machine's own statements: the
 * engine root from the explicit argument, else the endpoint
 * statement's `engine_root`, else the machine overlay's
 * engines.comfyui.live_root; the store from the bound layout's
 * download root (the store the estate acquires into — the same base
 * the managed wiring binds). Refuses LOUD with the remedy when no
 * statement names an engine root — never a silent skip.
 *
 * @param cfg the endpoint config (the tracked file's parsed shape)
 * @param engineRootOpt explicit engine root (wins over every statement)
 * @param liveRoot explicit overlay value — the wall seam; omitted
 *   reads the machine's engines.comfyui.live_root (engineLiveRoot)
 * @returns {engineRoot, storeRoot} for {@link writeByoExtraPaths}
 */
export declare function resolveByoAttach(cfg: EndpointConfig, engineRootOpt?: string, liveRoot?: string): {
    engineRoot: string;
    storeRoot: string;
};
/** One folder's visibility verdict from the running engine. */
export interface StoreFolderProbe {
    /** The registered folder name (the yaml key). */
    folder: string;
    /** The engine answered GET /models/<folder> with a listing. */
    registered: boolean;
    /** The engine's filename list for the folder (all search paths). */
    files: string[];
    /** Filenames sampled from the store's own subdir (empty when the
     *  store dir is absent or empty — the visibility then rests on
     *  registration alone). */
    storeFiles: string[];
    /** Registered AND at least one store file appears in the engine's
     *  listing (vacuously true when the store subdir carries no files).
     *  This is the unlink verdict: an unlinked store never shows its
     *  files in the engine's listing. */
    visible: boolean;
}
/**
 * Ask the RUNNING engine whether the store's folders are visible —
 * read-only GET /models/<folder> per mapped folder, the estate's own
 * in-process engine transport (fetch + abort timeout; never a POST,
 * never a restart). A folder the engine does not register answers
 * 404; a registered folder answers its filename union, and the
 * store's own files must appear there for the link to count. A
 * transport failure (engine unreachable) THROWS — an unreachable
 * engine is not an unlinked store, and the two verdicts must not
 * merge.
 *
 * @param url the engine base URL
 * @param folders the {folder: store subdir} map (byoFolderMap shape)
 * @param opts storeRoot to sample store files from; timeoutMs per probe
 * @returns one verdict per folder, sorted by folder name
 */
export declare function probeStoreFolders(url: string, folders: Record<string, string>, opts?: {
    storeRoot?: string;
    timeoutMs?: number;
}): Promise<StoreFolderProbe[]>;
