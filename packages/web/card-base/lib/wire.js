import { WTYPE_SET } from '@melite/contracts/extraKeys';
import { readAsDataURL } from '@melite/formats/readFile';
import { manageRemote } from "./estate-remote.js";
import { fetchCardCatalogRows } from '@melite-plugin/melite-run-wire';
/** The wire dials (audit X-E1): every fetch rides a socket with a
 *  bound — a caller signal ANDed with the dial, never a bare socket.
 *  Reads are small same-origin JSON; uploads carry a data-URL of a
 *  user file, so their bound is wider. */
const READ_DIAL_MS = 20_000;
const UPLOAD_DIAL_MS = 300_000;
/** The caller's signal ANDed with the dial — either side lifting the
 *  fetch aborts it (the provisioning seam's own shape). */
function dialed(signal, dialMs) {
    const dial = AbortSignal.timeout(dialMs);
    return signal === undefined ? dial : AbortSignal.any([signal, dial]);
}
/** Read a same-origin /v1 JSON door. Non-200 → named throw (the door's
 *  own error text when present). */
async function v1Get(path, signal) {
    const res = await fetch(path, { signal: dialed(signal, READ_DIAL_MS) });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
        const err = typeof body === 'object' && body !== null ? Reflect.get(body, 'error') : undefined;
        throw new Error(typeof err === 'string' ? err : path + ': HTTP ' + String(res.status));
    }
    return body;
}
/** POST one manage action through the MOUNTED `manage` remote —
 * ctx.remote's generated namespace (the typert contribution card-view
 * mounts; the api-gateway law reserves transport, RPC ids, response
 * envelopes, and cancellation to the Connection, and the zod codecs
 * on both ends own frame validation). The single argument is `doc`
 * (the action plus its JSON params — the dispatcher validates the
 * params per action). THE DOWNLOAD PROMPT's arm (no-silent-drop law,
 * stroke 18): a boarded-but-not-downloaded model is OFFERED — the
 * surfaces prompt the user, the click lands here as provision_model
 * (the manager queues the download; present files are skipped). A
 * refusal is a DOMAIN outcome: the seat throws manage/refused, the
 * Connection folds it into the RemoteResult error branch, and the
 * envelope carries it (ok:false + detail) — the caller renders the
 * truth, never a throw past the surface. Transport failures (an
 * unmounted lane, a dead connection) still throw LOUD — never a
 * silent ok:false.
 * @param action - the manage action name (the doc's action field).
 * @param payload - the action's JSON params (spread over the doc).
 * @param signal - caller cancellation, threaded to the Connection.
 * @returns the envelope reply: ok true with detail/data, or ok false
 * with the refusal's text. */
export async function postManageAction(action, payload, signal) {
    const doc = { action, ...payload };
    const settled = await manageRemote().act(doc, signal);
    if (settled.ok === true) {
        const row = settled.value;
        if (row.ok !== true)
            return { ok: false, detail: row.detail };
        return { ok: true, detail: row.detail, data: row.data };
    }
    const failure = settled.error;
    const message = typeof failure === 'object' && failure !== null
        && typeof failure.message === 'string'
        && failure.message !== ''
        ? failure.message : 'manage/' + action + ' refused';
    return { ok: false, detail: message };
}
/** /v1/model-catalog → the cards section (the picker's ONE surface —
 *  action cards, one tile per card package; models are NOT entries).
 *  THE ONE DOOR LAW (nativity audit 2026-11-05 D6): the GET + cache
 *  lives in melite-run-wire's fetchCardCatalogRows — this is its
 *  picker projection (label/description/genre walks, the label sort);
 *  there is no second read of the door. */
export async function fetchCardCatalog(signal) {
    const rows = await fetchCardCatalogRows(signal);
    const out = [];
    for (const [id, row] of Object.entries(rows)) {
        const famsRaw = row['families'];
        out.push({
            id,
            label: typeof row['label'] === 'string' ? row['label'] : id,
            description: typeof row['description'] === 'string' ? row['description'] : '',
            genre: typeof row['genre'] === 'string' ? row['genre'] : '',
            families: Array.isArray(famsRaw) ? famsRaw.filter((x) => typeof x === 'string') : [id],
        });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
}
/** The form-spec boundary judgment (one home — audit #48's cure):
 * refuses a doc without a schema envelope and walks every envelope's
 * refs for a wtype outside WTYPE_SET (strictness fix 5, 2026-10-01 —
 * LAW 8's missing side: the write-side bag guard refuses foreign
 * spellings at the declaration; THIS is the boundary the served doc
 * crosses, and a foreign wtype renders the silent plain-text
 * fallback, so here it refuses, naming the field and the set's home).
 * Exported so a test seating a fixture crosses the SAME judgment the
 * live fetch does — no `as unknown as` sidestep can outlive it.
 * @param doc the served doc (or a fixture standing in for one)
 * @param model names the doc in the refusal
 * @returns the doc, narrowed, when every judgment passes
 * @throws Error naming the first structural failure */
export function assertFormSpecDoc(doc, model) {
    const env = doc['schema'];
    if (env !== null && (typeof env !== 'object'
        || typeof env.uid !== 'number'
        || typeof env.refs !== 'object')) {
        throw new Error('form-spec: no schema envelope');
    }
    const wtypeErrors = [];
    const judgeEnvelope = (e, surface) => {
        if (e === null || e === undefined || typeof e !== 'object')
            return;
        const refs = e.refs;
        if (typeof refs !== 'object' || refs === null)
            return;
        for (const [id, node] of Object.entries(refs)) {
            if (typeof node !== 'object' || node === null)
                continue;
            const extra = node.meta?.['extra'];
            if (typeof extra !== 'object' || extra === null)
                continue;
            const w = extra['wtype'];
            if (w !== undefined && w !== '' && !WTYPE_SET.includes(w)) {
                wtypeErrors.push(`${surface} ref ${id}: wtype '${String(w)}' is not in WTYPE_SET (@melite/contracts/extraKeys)`);
            }
        }
    };
    judgeEnvelope(doc['schema'], 'schema');
    for (const [pack, env2] of Object.entries(doc['mod_schemas'] ?? {})) {
        judgeEnvelope(env2, `mod:${pack}`);
    }
    if (wtypeErrors.length > 0) {
        throw new Error(`form-spec ${model}: ${wtypeErrors.join('; ')}`);
    }
    return doc;
}
/** /v1/form-spec?model=<family> — the card family's emission (the
 *  serialized schema envelope + model defaults + the declared edges
 *  + the mod kinds and their envelopes). */
export async function fetchFormSpec(model, signal) {
    const doc = await v1Get('/v1/form-spec?model=' + encodeURIComponent(model), signal);
    return assertFormSpecDoc(doc, model);
}
/** /v1/forms — every card's meta row (the edge emission included). */
export async function fetchFormsTable(signal) {
    return v1Get('/v1/forms', signal);
}
/** OS-file drop → the /v1/uploads door (png/jpeg/webp data-URL; the
 *  mesh wire type boards .glb/.gltf — model/gltf-binary, or the
 *  browser's octet-stream with a GLB name) → the input-dir path the
 *  param accepts. The door's own gates (type whitelist, one clean
 *  segment) are the law — the client only voices its refusals, never
 *  invents its own. */
export async function uploadInputFile(file, signal) {
    const isImage = file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/webp';
    const isAudio = file.type.startsWith('audio/');
    // THE MESH ARM (primitive ③): .glb/.gltf rides the same door —
    // model/gltf-binary when the browser knows it, octet-stream with a
    // GLB extension when it does not (the door pairs the two the same
    // way, extension-gated).
    const glbName = /\.glb$/i.test(file.name) || /\.gltf$/i.test(file.name);
    const isMesh = file.type === 'model/gltf-binary' || file.type === 'model/gltf+json' || (file.type === 'application/octet-stream' && glbName);
    if (!isImage && !isAudio && !isMesh) {
        throw new Error('Input cards don\u2019t accept ' + (file.type !== '' ? file.type : 'that file') + ' \u2014 drop an image, audio, or .glb/.gltf file');
    }
    if (isAudio) {
        throw new Error('audio uploads have no door yet \u2014 the uploads door boards png / jpeg / webp / glb only');
    }
    const dataUrl = await readAsDataURL(file);
    const res = await fetch('/v1/uploads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: dialed(signal, UPLOAD_DIAL_MS),
        // THE REAL NAME, NOT A MANGLED ONE (the audit's GAP 4: the client
        // used to rewrite every name through a charset the contracts'
        // grammar never declared — `out 1.png` uploaded as `out_1.png`,
        // so the staged name lied about the local file and masked the
        // serve door's own decode gap). The rail judges the name with
        // the shared grammar; the client reports what the user dropped.
        body: JSON.stringify({ filename: file.name, data: dataUrl }),
    });
    if (!res.ok) {
        // the door's own voice rides (audit X-S2): a refusal body's
        // error field names the gate that refused — the bare status
        // number never told the operator which one
        const body = await res.json().catch(() => null);
        const err = typeof body === 'object' && body !== null ? Reflect.get(body, 'error') : undefined;
        throw new Error(typeof err === 'string'
            ? 'upload refused: ' + err
            : 'upload refused: HTTP ' + String(res.status));
    }
    const out = await res.json();
    const path = typeof out === 'object' && out !== null && typeof Reflect.get(out, 'path') === 'string'
        ? Reflect.get(out, 'path') : '';
    if (path === '')
        throw new Error('upload answered without a path');
    // The PARAM currency is the ESTATE PATH ('data/input/x.png'), not
    // the bare name: the composing door's uploadReferenced stages local
    // paths into ComfyUI's input dir (a bare name is not a file the
    // estate can read — the run dies on the engine with 'Invalid image
    // file'). The display face is the data-URL mirror, never this.
    // (pop() is total here: split yields >= 1 element for every input,
    //  so the basename is always a string — no fallback to invent.)
    return { name: path, file: path.split('/').pop() };
}
//# sourceMappingURL=wire.js.map