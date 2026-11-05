/** What a user row must carry to be served as a picker row. */
export interface UserLoraRow {
    /** the stable id the bag stores (`loras[].id`) */
    id: string;
    /** the path under the engine's loras dir — the name the combo knows */
    filename: string;
    /** the families this row is offered for (must board the loras pack) */
    families: string[];
    label?: string;
    category?: string;
    default_strength?: number;
    /** documentary only — nothing here ever fetches it */
    source_url?: string;
    /** Steps (007 L5, cured 2026-10-21): a DISTILL adapter's married
     *  step count and its valid domain — the same contract the
     *  declared rows carry (serviceMods' ModRow). A user row's step
     *  facts now SURVIVE the read instead of dropping silently;
     *  compose honors them exactly as a declared row's. */
    steps?: number;
    steps_min?: number;
    steps_max?: number;
    /** the picker row's tooltip — served verbatim (was dropped) */
    tooltip?: string;
}
export interface UserLoraFile {
    /** the file the rows came from (the receipt) */
    path: string;
    rows: UserLoraRow[];
    /** per-row refusals, in file order — a bad row never takes the good ones down */
    problems: string[];
    /** true when the file was absent (absent is not an error: the door is opt-in) */
    absent: boolean;
}
/** ONE spelling of the rows-file location: the declared
 *  MELITE_USER_LORAS override wins, the repo default otherwise.
 *  Every reader (the manage door, the composed flavor, the hot
 *  drop-in) resolves through here — a second literal is a second
 *  truth about the same file. */
export declare function userLorasPath(): string;
/** ONE row's validation — the refusals name the field, never the file. */
export declare function validateUserLoraRow(raw: unknown, at: number): {
    row: UserLoraRow;
    problem?: undefined;
} | {
    row?: undefined;
    problem: string;
};
/**
 * Read a user rows file. NEVER throws: a malformed file answers its
 * per-row problems, an absent file answers `absent` (the door is
 * opt-in — no file, no user rows, no noise), and a non-JSON file
 * answers one problem naming the file.
 */
export declare function readUserLoraRows(path: string): UserLoraFile;
/**
 * THE BOARDING GUARD (the poison cure, 2026-11-15): a user row may
 * name ANY family id shape-wise, but a flavor registering a family
 * that does not board the loras pack is DRIFT the boot interlock
 * refuses — a junk row in the rows file (test debris, a typo'd
 * family) took EVERY boot down ("no registered model 'qwen'").
 * The tray carries its own guard; the user rows carry the same law
 * here: a row whose families do not ALL board the pack DROPS (with
 * its name in the report), never registers — the boot survives
 * operator junk, the row's problem is named, the good rows serve.
 * @param rows the rows file's rows
 * @param boarding the families carrying a loras flavor (the service's own read)
 */
export declare function boardUserLoraRows(rows: readonly UserLoraRow[], boarding: ReadonlySet<string>): {
    rows: UserLoraRow[];
    dropped: string[];
};
/**
 * SEAT ONE ROW (the pixel-anim cure, 2026-11-15): every acquisition
 * door used to land the BYTES and hand the operator a
 * `row_suggestion` "ready to paste" — a paste no chat agent can
 * make (no bash under the lane sandbox) and no operator should have
 * to. THE LAW IS NOW LAND = SEATED: the install verbs call this
 * with the row they just made real, and the rows file itself is
 * written — validated by the same `validateUserLoraRow` every
 * reader serves, atomic (part + rename), one row per filename (a
 * re-install replaces, never duplicates). The file stays the one
 * truth; this is its one writer.
 *
 * @param row the row to seat (validated here — a bad row refuses by name)
 * @param path the rows file (default: the one spelling, `userLorasPath()`)
 * @returns ok with the path and whether an existing row was replaced,
 *  or the refusal naming the row or the file
 */
export declare function seatUserLoraRow(row: UserLoraRow, path?: string): {
    ok: true;
    path: string;
    replaced: boolean;
} | {
    ok: false;
    reason: string;
};
/**
 * THE COMBO FACT (never a guess): the names ComfyUI will accept for
 * `LoraLoaderModelOnly`, read out of the engine's own node
 * declaration. Bounds-checked at every step — a hostile or truncated
 * object_info answers an empty list, never a throw.
 */
export declare function loraNamesFromObjectInfo(info: unknown): string[];
/**
 * THE REFMODS COMBO FACT (2026-11-05, the timeline card's mods
 * square): the stems ComfyUI will accept for the H3 refmods loader's
 * `mod_N` combo inputs, read out of the same node-definitions doc the
 * LoRA reader above consumes — one grammar family, one bounds-check
 * law. Every `mod_N` key present is enumerated (the loader slots 1-8;
 * a pack shipping a different slot count stays honest), the members
 * dedupe across slots and sort (the loader's own listing is sorted;
 * the union of equal combos sorts to the same row), and the loader's
 * `(none)` sentinel (nodes.py MiniMaxH3RefModsLoader.NONE) falls away
 * — it is a slot placeholder, never a pack stem.
 *
 * THE EMPTY-ON-ABSENT LAW (2026-11-05): an absent node, an absent
 * `mod_N` field, or a whole absent doc (engine down, pack not
 * installed) answers EMPTY — that is the honest answer, the client's
 * manual fallback stays live. Never a synthetic or guessed list.
 */
export declare function refmodNamesFromObjectInfo(info: unknown): string[];
/**
 * CROSS-CHECK a served row against the engine: a row whose file is not
 * in the combo would refuse at /prompt (a 400 AFTER the run is
 * composed), so the door says so at the moment the user adds it.
 * A missing combo (engine down) proves nothing and refuses nothing.
 */
export declare function unboardedRows(rows: readonly UserLoraRow[], combo: readonly string[]): string[];
export declare function installUserLora(sourcePath: string, engineLorasDir: string): {
    ok: true;
    filename: string;
    bytes: number;
} | {
    ok: false;
    reason: string;
};
/** THE BYTES DOOR (the operator's question, 2026-09-26: "civit.ai
 *  doesn't let you download them headlessly" → right, and it shouldn't:
 *  civit serves downloads behind Cloudflare and a per-account API key,
 *  AND the standing law forbids a loras remote. So the USER'S BROWSER
 *  does the download — they are already signed in and cleared — and the
 *  file reaches the estate as BYTES through the manage door, which
 *  writes it into the engine's loras dir. Nothing is ever fetched by
 *  the estate; the bytes arrive because the operator handed them over.
 *
 *  The data-URL spelling is the one the uploads rail already uses
 *  (`{filename, data: "data:...;base64,..."}`), so the transport is
 *  the estate's existing shape, not a new protocol. */
export declare const LORA_BYTES_CAP: number;
/** THE DIR, one spelling: the env override wins, else the endpoint
 *  machine statement's model base + /loras, else the runtime tree's
 *  own loras dir when it exists on disk; null means UNDECLARED and
 *  every caller refuses loud (never a guessed path — the portability
 *  law, 2026-10-12). Shared by the manage plane's two lora arms and
 *  the uploads door's binary arm so they can never disagree.
 *  THE THIRD LEG (operator 2026-11-03, "we have to deal with
 *  environment variables? That seems bad, comfyui pathing should be
 *  default" — the design debt paid): the engine's own pathing is
 *  the default. The existence check is the guess-guard — a box with
 *  no runtime tree answers null exactly as before, and the resolved
 *  dir is one the engine itself serves through its loras mount.
 *  @param cfg the endpoint config record (readEndpointConfig's value)
 *  @returns the declared loras dir, or null when undeclared */
export declare function resolveEngineLorasDir(cfg: Record<string, unknown>): string | null;
/** THE BINARY ARM (the transport cure, 2026-10-17): the uploads door
 *  takes raw octet-stream bytes, so a 200MB LoRA costs 200MB — never
 *  a ~267MB base64 string riding JSON (~2× peak memory). The cap is
 *  the door's declared-length check (content-length, PRE-buffer);
 *  here the already-buffered bytes are judged once more so this
 *  entry point is safe on its own. */
export declare function installUserLoraBuffer(filename: string, bytes: Uint8Array, engineLorasDir: string): {
    ok: true;
    filename: string;
    bytes: number;
} | {
    ok: false;
    reason: string;
};
export declare function installUserLoraBytes(filename: string, dataUrl: string, engineLorasDir: string, 
/** the payload's declared base64 length, when the transport knows
 *  it without copying the string (the cap is then checked BEFORE
 *  any decode — an oversize upload must never become an OOM here) */
declaredPayloadLength?: number): {
    ok: true;
    filename: string;
    bytes: number;
} | {
    ok: false;
    reason: string;
};
/** The flavor a user rows file registers (the same shape the family
 *  files and hot drop-ins use — one spelling of the registration).
 *  Per-row `families` fold into the registration's own families:
 *  FlavorRegistration carries them once, so the projected rows
 *  drop the key and typecheck as plain catalog rows. */
export interface UserLoraFlavor {
    readonly pack: 'loras';
    readonly families: string[];
    readonly rows: Array<Omit<UserLoraRow, 'families'>>;
    readonly runtimeCatalog: true;
}
export declare function userLoraFlavor(file: UserLoraFile): UserLoraFlavor | null;
//# sourceMappingURL=userLoras.d.ts.map
