/**
 * userLoras — THE USER-LORA PLANE (2026-09-26, the operator's
 * question: "is there a way to add custom loras to models from the
 * user perspective?" → "Do it all go").
 *
 * WHAT ALREADY EXISTED (so nothing is rebuilt): the studio's modifier
 * UI is fully built (card-base/src/mods.tsx — kind picker, drag
 * reorder, a leaf editor with an option select + strength + steps),
 * the bag is `params.loras[]` (the wire IS the storage), compose
 * stacks picks with `LoraLoaderModelOnly` in array order, and the
 * server already MERGES hot-loaded runtime flavors with the family's
 * own rows (`ComfyUIService.modCatalog` — the flavor merge, #39).
 *
 * WHAT WAS MISSING: the catalog was family-owned source files, and
 * the leaf REFUSES a hand-spelled name on purpose ("pick from the
 * catalog, never hand-spell"). So a user's own LoRA had exactly two
 * doors, both developer-grade: write a TS drop-in, or edit a family
 * package. This module is the user-grade door, and it keeps the law
 * rather than breaking it:
 *
 * - A LOCAL rows file (JSON) registers as a runtime flavor, so a
 *   user's LoRA arrives as a real PICKER ROW — with a label, a
 *   category, a strength default — not a typed name.
 * - Every row is VALIDATED: a row naming a family that does not board
 *   the loras pack is refused with the reason, and a row whose file is
 *   not in the engine's own LoRA combo is refused too, because
 *   ComfyUI validates the combo at /prompt and a missing name is a 400
 *   after the money is spent.
 * - NOTHING is ever fetched. The operator's law stands ("THERE SHOULD
 *   NOT BE A LORAS REMOTE / IT'S ALL BUILT IN"): rows may carry a
 *   `source_url` as documentation, and `installUserLora` COPIES a file
 *   the operator already has — it never downloads.
 *
 * The combo allowlist is read from the engine's own node declaration
 * (`LoraLoaderModelOnly.input.required.lora_name`), so "the engine
 * will accept this name" is a FACT, never a guess.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
const LORA_EXTENSIONS = ['.safetensors', '.ckpt', '.pt', '.bin', '.gguf'];
/** The rows file's default home (the shipped state is ABSENT — the
 *  door is opt-in; `lora_list` reports the path it would read). */
export const DEFAULT_USER_LORAS_PATH = './data/loras/user-loras.json';
/** ONE spelling of the rows-file location: the declared
 *  MELITE_USER_LORAS override wins, the repo default otherwise.
 *  Every reader (the manage door, the composed flavor, the hot
 *  drop-in) resolves through here — a second literal is a second
 *  truth about the same file. */
export function userLorasPath() {
    const declared = process.env['MELITE_USER_LORAS'];
    return declared !== undefined && declared !== '' ? declared : DEFAULT_USER_LORAS_PATH;
}
/** ONE row's validation — the refusals name the field, never the file. */
export function validateUserLoraRow(raw, at) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
        return { problem: `row ${at}: not an object` };
    }
    const r = raw;
    const id = typeof r['id'] === 'string' ? r['id'].trim() : '';
    if (id === '')
        return { problem: `row ${at}: id is required (the bag stores it)` };
    const filename = typeof r['filename'] === 'string' ? r['filename'].trim() : '';
    if (filename === '')
        return { problem: `row ${at} (${id}): filename is required (the name the engine's combo knows)` };
    if (!LORA_EXTENSIONS.includes(extname(filename).toLowerCase())) {
        return {
            problem: `row ${at} (${id}): filename must be a LoRA file (${LORA_EXTENSIONS.join(', ')}) — got ` +
                `"${extname(filename) === '' ? filename : extname(filename)}"`,
        };
    }
    const families = Array.isArray(r['families'])
        ? r['families'].filter((f) => typeof f === 'string' && f !== '')
        : [];
    if (families.length === 0)
        return { problem: `row ${at} (${id}): families is required (a row rides a model)` };
    const row = { id, filename, families: [...families] };
    if (typeof r['label'] === 'string' && r['label'] !== '')
        row.label = r['label'];
    if (typeof r['category'] === 'string' && r['category'] !== '')
        row.category = r['category'];
    if (typeof r['default_strength'] === 'number' && Number.isFinite(r['default_strength'])) {
        row.default_strength = r['default_strength'];
    }
    if (typeof r['source_url'] === 'string' && r['source_url'] !== '')
        row.source_url = r['source_url'];
    return { row };
}
/**
 * Read a user rows file. NEVER throws: a malformed file answers its
 * per-row problems, an absent file answers `absent` (the door is
 * opt-in — no file, no user rows, no noise), and a non-JSON file
 * answers one problem naming the file.
 */
export function readUserLoraRows(path) {
    if (!existsSync(path))
        return { path, rows: [], problems: [], absent: true };
    let text;
    try {
        text = readFileSync(path, 'utf8');
    }
    catch (e) {
        // node:fs throws Error subclasses only (ErrnoException extends
        // Error; an argument-type failure is an ERR_INVALID_ARG_TYPE
        // TypeError) — no non-Error spelling is reachable here (the
        // re-audit, 2026-10-16).
        return {
            path,
            rows: [],
            problems: [`the rows file could not be read: ${e.message}`],
            absent: false,
        };
    }
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch (e) {
        // JSON.parse on a string raises SyntaxError (an Error subclass)
        // and nothing else — no non-Error spelling is reachable here (the
        // re-audit, 2026-10-16).
        return {
            path,
            rows: [],
            problems: [`the rows file is not JSON: ${e.message}`],
            absent: false,
        };
    }
    // both shapes are served: a bare array of rows, or {rows: [...]}
    const list = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.rows)
            ? (parsed.rows)
            : undefined;
    if (list === undefined) {
        return { path, rows: [], problems: ['the rows file must be an array of rows, or {"rows": [...]}'], absent: false };
    }
    const rows = [];
    const problems = [];
    for (let i = 0; i < list.length; i++) {
        const { row, problem } = validateUserLoraRow(list[i], i);
        if (row !== undefined)
            rows.push(row);
        if (problem !== undefined)
            problems.push(problem);
    }
    return { path, rows, problems, absent: false };
}
/**
 * THE COMBO FACT (never a guess): the names ComfyUI will accept for
 * `LoraLoaderModelOnly`, read out of the engine's own node
 * declaration. Bounds-checked at every step — a hostile or truncated
 * object_info answers an empty list, never a throw.
 */
export function loraNamesFromObjectInfo(info) {
    if (info === null || typeof info !== 'object' || Array.isArray(info))
        return [];
    const node = info['LoraLoaderModelOnly'];
    if (node === null || typeof node !== 'object' || Array.isArray(node))
        return [];
    const input = node['input'];
    if (input === null || typeof input !== 'object' || Array.isArray(input))
        return [];
    const required = input['required'];
    if (required === null || typeof required !== 'object' || Array.isArray(required))
        return [];
    const field = required['lora_name'];
    if (!Array.isArray(field))
        return [];
    const names = field[0];
    if (!Array.isArray(names))
        return [];
    return names.filter((n) => typeof n === 'string' && n !== '');
}
/**
 * CROSS-CHECK a served row against the engine: a row whose file is not
 * in the combo would refuse at /prompt (a 400 AFTER the run is
 * composed), so the door says so at the moment the user adds it.
 * A missing combo (engine down) proves nothing and refuses nothing.
 */
export function unboardedRows(rows, combo) {
    if (combo.length === 0)
        return [];
    const known = new Set(combo);
    return rows.filter((r) => !known.has(r.filename)).map((r) => `${r.id}: the engine has no "${r.filename}" in its LoRA list`);
}
/**
 * THE FILE DOOR: copy an operator's OWN LoRA into the engine's loras
 * directory so its name joins the combo. A copy — never a fetch (the
 * no-remote law), and the refusals are loud: a missing source, a
 * non-LoRA extension, or a source that is not a file.
 */
export function installUserLora(sourcePath, engineLorasDir) {
    if (!existsSync(sourcePath))
        return { ok: false, reason: `no such file: ${sourcePath}` };
    let st;
    try {
        st = statSync(sourcePath);
    }
    catch (e) {
        // node:fs throws Error subclasses only (the re-audit, 2026-10-16).
        return { ok: false, reason: `cannot read ${sourcePath}: ${e.message}` };
    }
    if (!st.isFile())
        return { ok: false, reason: `${sourcePath} is not a file` };
    if (!LORA_EXTENSIONS.includes(extname(sourcePath).toLowerCase())) {
        return {
            ok: false,
            reason: `${basename(sourcePath)} is not a LoRA file (${LORA_EXTENSIONS.join(', ')}) — the engine's loader will not take it`,
        };
    }
    try {
        mkdirSync(engineLorasDir, { recursive: true });
        const target = join(engineLorasDir, basename(sourcePath));
        copyFileSync(sourcePath, target);
        return { ok: true, filename: basename(sourcePath), bytes: st.size };
    }
    catch (e) {
        // mkdirSync and copyFileSync throw Error subclasses only (the
        // re-audit, 2026-10-16).
        return {
            ok: false,
            reason: `copy into ${dirname(engineLorasDir)} failed: ${e.message}`,
        };
    }
}
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
export const LORA_BYTES_CAP = 512 * 1024 * 1024;
/** THE DIR, one spelling: the env override wins, else the endpoint
 *  machine statement's model base + /loras; null means UNDECLARED and
 *  every caller refuses loud (never a guessed path — the portability
 *  law, 2026-10-12). Shared by the manage plane's two lora arms and
 *  the uploads door's binary arm so they can never disagree.
 *  @param cfg the endpoint config record (readEndpointConfig's value)
 *  @returns the declared loras dir, or null when undeclared */
export function resolveEngineLorasDir(cfg) {
    const declared = process.env['MELITE_COMFYUI_LORAS_DIR'];
    if (declared !== undefined && declared !== '')
        return declared;
    const root = typeof cfg['model_base_path'] === 'string' ? cfg['model_base_path'] : '';
    if (root !== '')
        return join(root, 'loras');
    return null;
}
/** THE BINARY ARM (the transport cure, 2026-10-17): the uploads door
 *  takes raw octet-stream bytes, so a 200MB LoRA costs 200MB — never
 *  a ~267MB base64 string riding JSON (~2× peak memory). The cap is
 *  the door's declared-length check (content-length, PRE-buffer);
 *  here the already-buffered bytes are judged once more so this
 *  entry point is safe on its own. */
export function installUserLoraBuffer(filename, bytes, engineLorasDir) {
    const name = basename(filename.trim());
    if (name === '' || name === '.' || name === '..') {
        return { ok: false, reason: 'filename is required (the name the engine\'s LoRA list will know)' };
    }
    if (!LORA_EXTENSIONS.includes(extname(name).toLowerCase())) {
        return {
            ok: false,
            reason: `${name} is not a LoRA file (${LORA_EXTENSIONS.join(', ')}) — the engine's loader will not take it`,
        };
    }
    if (bytes.byteLength === 0)
        return { ok: false, reason: 'the upload carried no bytes' };
    if (bytes.byteLength > LORA_BYTES_CAP) {
        return {
            ok: false,
            reason: `the LoRA is over the ${Math.round(LORA_BYTES_CAP / (1024 * 1024))}MB door cap — copy it in from the machine instead (lora_install with a path)`,
        };
    }
    try {
        mkdirSync(engineLorasDir, { recursive: true });
        const target = join(engineLorasDir, name);
        // WRITE-THROUGH, never a merge: a partial LoRA in the engine's
        // list is worse than none, so the bytes land in one write
        writeFileSync(target, bytes);
        return { ok: true, filename: name, bytes: bytes.byteLength };
    }
    catch (e) {
        // mkdirSync and writeFileSync throw Error subclasses only (the
        // re-audit, 2026-10-16).
        return { ok: false, reason: `writing into ${engineLorasDir} failed: ${e.message}` };
    }
}
export function installUserLoraBytes(filename, dataUrl, engineLorasDir, 
/** the payload's declared base64 length, when the transport knows
 *  it without copying the string (the cap is then checked BEFORE
 *  any decode — an oversize upload must never become an OOM here) */
declaredPayloadLength) {
    const name = basename(filename.trim());
    if (name === '' || name === '.' || name === '..') {
        return { ok: false, reason: 'filename is required (the name the engine\'s LoRA list will know)' };
    }
    if (!LORA_EXTENSIONS.includes(extname(name).toLowerCase())) {
        return {
            ok: false,
            reason: `${name} is not a LoRA file (${LORA_EXTENSIONS.join(', ')}) — the engine's loader will not take it`,
        };
    }
    const comma = dataUrl.indexOf(',');
    if (comma === -1) {
        return { ok: false, reason: 'the bytes did not arrive as a data URL (the uploads rail\'s own spelling)' };
    }
    const meta = dataUrl.slice(0, comma);
    if (!/;base64$/i.test(meta)) {
        return { ok: false, reason: 'only base64 data URLs are accepted (the uploads rail\'s own spelling)' };
    }
    const payload = dataUrl.slice(comma + 1);
    if (payload.length === 0)
        return { ok: false, reason: 'the upload carried no bytes' };
    const budget = Math.ceil((LORA_BYTES_CAP * 4) / 3);
    // the cap refuses BEFORE decoding (a base64 string is 4/3 of its
    // bytes, and an unbounded decode is an OOM in the door)
    if ((declaredPayloadLength ?? payload.length) > budget) {
        return {
            ok: false,
            reason: `the LoRA is over the ${Math.round(LORA_BYTES_CAP / (1024 * 1024))}MB door cap — copy it in from the machine instead (lora_install with a path)`,
        };
    }
    // (Buffer.from never throws on base64 input — it skips the
    // characters it does not know; an all-junk payload decodes to
    // zero bytes and the refusal below names that)
    const bytes = Buffer.from(payload, 'base64');
    if (bytes.byteLength === 0)
        return { ok: false, reason: 'the upload decoded to zero bytes' };
    // THE BUDGET ABOVE IS THE ONLY SIZE DOOR: decoded ≤
    // floor(budget·3/4) = LORA_BYTES_CAP for every input, because the
    // caller declares `req.data.length` (managePlane.ts) and
    // `req.data.length ≥ payload.length`, while the budget bounds that
    // same length. A second check on the decoded length could never
    // refuse (the re-audit, 2026-10-16).
    try {
        mkdirSync(engineLorasDir, { recursive: true });
        const target = join(engineLorasDir, name);
        // WRITE-THROUGH, never a merge: a partial LoRA in the engine's
        // list is worse than none, so the bytes land in one write
        writeFileSync(target, bytes);
        return { ok: true, filename: name, bytes: bytes.byteLength };
    }
    catch (e) {
        // mkdirSync and writeFileSync throw Error subclasses only (the
        // re-audit, 2026-10-16).
        return { ok: false, reason: `writing into ${engineLorasDir} failed: ${e.message}` };
    }
}
export function userLoraFlavor(file) {
    if (file.rows.length === 0)
        return null;
    const families = [...new Set(file.rows.flatMap((r) => r.families))].sort();
    return {
        pack: 'loras',
        families,
        runtimeCatalog: true,
        rows: file.rows.map(({ families: _families, ...row }) => row),
    };
}
//# sourceMappingURL=userLoras.js.map
