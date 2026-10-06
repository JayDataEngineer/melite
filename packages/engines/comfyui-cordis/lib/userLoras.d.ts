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
/** The rows file's default home (the shipped state is ABSENT — the
 *  door is opt-in; `lora_list` reports the path it would read). */
export declare const DEFAULT_USER_LORAS_PATH = "./data/loras/user-loras.json";
/** ONE spelling of the rows-file location: the declared
 *  MELITE_USER_LORAS override wins, the repo default otherwise.
 *  Every reader (the manage door, the composed flavor, the hot
 *  drop-in) resolves through here — a second literal is a second
 *  truth about the same file. */
export declare function userLorasPath(): string;
/** ONE row's validation — the refusals name the field, never the file. */
export declare function validateUserLoraRow(raw: unknown, at: number): {
    row?: UserLoraRow;
    problem?: string;
};
/**
 * Read a user rows file. NEVER throws: a malformed file answers its
 * per-row problems, an absent file answers `absent` (the door is
 * opt-in — no file, no user rows, no noise), and a non-JSON file
 * answers one problem naming the file.
 */
export declare function readUserLoraRows(path: string): UserLoraFile;
/**
 * THE COMBO FACT (never a guess): the names ComfyUI will accept for
 * `LoraLoaderModelOnly`, read out of the engine's own node
 * declaration. Bounds-checked at every step — a hostile or truncated
 * object_info answers an empty list, never a throw.
 */
export declare function loraNamesFromObjectInfo(info: unknown): string[];
/**
 * CROSS-CHECK a served row against the engine: a row whose file is not
 * in the combo would refuse at /prompt (a 400 AFTER the run is
 * composed), so the door says so at the moment the user adds it.
 * A missing combo (engine down) proves nothing and refuses nothing.
 */
export declare function unboardedRows(rows: readonly UserLoraRow[], combo: readonly string[]): string[];
/**
 * THE FILE DOOR: copy an operator's OWN LoRA into the engine's loras
 * directory so its name joins the combo. A copy — never a fetch (the
 * no-remote law), and the refusals are loud: a missing source, a
 * non-LoRA extension, or a source that is not a file.
 */
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
 *  machine statement's model base + /loras; null means UNDECLARED and
 *  every caller refuses loud (never a guessed path — the portability
 *  law, 2026-10-12). Shared by the manage plane's two lora arms and
 *  the uploads door's binary arm so they can never disagree.
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
