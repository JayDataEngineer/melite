/**
 * lora-section.tsx — THE LORA BLOCK for the ComfyUI Manager sidebar
 * (the operator's 2026-09-26 order: "custom LoRAs should be in the
 * ComfyUI manager sidebar").
 *
 * It speaks the manage plane's own two doors — `lora_list` and
 * `lora_install` — so this is the same vocabulary every other sidebar
 * action uses, and the same refusal envelope on a refusal. The block
 * states the two facts a user cannot see otherwise:
 *
 * - what the ENGINE will accept (its own `LoraLoaderModelOnly` combo —
 *   a name outside it is a 400 at /prompt, after the money is spent),
 *   with the rows the engine does NOT have named here;
 * - the user's own rows, and the honest boundary: a copied file only
 *   enters the combo after a RESTART (core enumerates folder_paths at
 *   import — the only refresh primitive this repo owns).
 *
 * The install is a COPY of a file the operator already has — never a
 * fetch ("THERE SHOULD NOT BE A LORAS REMOTE / IT'S ALL BUILT IN").
 */
import * as React from 'react';
import { postManage } from "./assets-tab.js";
/** The voice for a THROWN manage verb. postManage raises Error values
 *  only: a lane that throws anything else (a string, a number) is
 *  folded into {ok: false, detail} before it leaves the door
 *  (assets-tab.tsx:360-367), a missing lane raises its own Error
 *  (:329), and the one rethrow is the lane's AbortError — an Error
 *  instance. So the cast below reads a proven reachability fact, and
 *  every catch in this block speaks the same voice from it. */
function thrownVoice(e) {
    return e.message;
}
function LoraBlock() {
    const [data, setData] = React.useState(null);
    const [busy, setBusy] = React.useState(false);
    const [refusal, setRefusal] = React.useState(null);
    const [path, setPath] = React.useState('');
    const [families, setFamilies] = React.useState('z-image');
    // THE MOUNT LAW (the sidebar's own discipline, pinned by its walls:
    // mounting the tab asks for `status` and nothing else): this block
    // fetches when the operator OPENS it, never on mount — a panel that
    // asks the engine for its LoRA list before anyone looks at it is
    // noise, and the request sequence is a law here.
    const [open, setOpen] = React.useState(false);
    const refresh = React.useCallback(async () => {
        setBusy(true);
        setRefusal(null);
        try {
            const reply = await postManage('lora_list', {});
            // A REFUSED DOOR IS NOT A THROW: postManage folds the protocol's
            // failure face into { ok: false, detail } (assets-tab.tsx:346),
            // so reading only `.data` rendered an EMPTY panel over a refusal
            // and said nothing — the one thing this block must never do.
            if (reply.ok !== true) {
                /* v8 ignore next -- postManage folds a refusal through
                   * nonEmptyOr, so detail is NEVER empty (assets-tab.tsx:346);
                   * the default text is a belt for a lane that answers
                   * differently. */
                setRefusal(reply.detail ?? 'the engine refused the LoRA list');
                return;
            }
            setData((reply.data ?? {}));
        }
        catch (e) {
            setRefusal(thrownVoice(e));
        }
        finally {
            setBusy(false);
        }
    }, []);
    const openedRef = React.useRef(false);
    const openAndLoad = React.useCallback(() => {
        setOpen((was) => {
            const next = !was;
            /* v8 ignore next 3 -- the block has NO close affordance: the
             * open state renders Refresh as its only button (:151-153), so
             * openAndLoad's close half cannot be driven from the UI. */
            if (next && openedRef.current !== true) {
                openedRef.current = true;
                void refresh();
            }
            return next;
        });
    }, [refresh]);
    const install = React.useCallback(async () => {
        /* v8 ignore next 3 -- the Copy button is DISABLED while the path
         * is blank (:206), so install cannot run with one; the guard is a
         * belt for a keyboard/programmatic activation. */
        if (path.trim() === '')
            return;
        setBusy(true);
        setRefusal(null);
        try {
            const installed = await postManage('lora_install', {
                path: path.trim(),
                families: families.split(',').map((f) => f.trim()).filter((f) => f !== ''),
            });
            if (installed.ok !== true) {
                /* v8 ignore next -- postManage folds a refusal through
                   * nonEmptyOr, so detail is NEVER empty (assets-tab.tsx:346);
                   * the default text is a belt for a lane that answers
                   * differently. */
                setRefusal(installed.detail ?? 'the engine refused the install');
                return;
            }
            await refresh();
        }
        catch (e) {
            setRefusal(thrownVoice(e));
        }
        finally {
            setBusy(false);
        }
    }, [families, path, refresh]);
    const uploadChosen = React.useCallback(async (file) => {
        setBusy(true);
        setRefusal(null);
        try {
            // THE BINARY DOOR (2026-10-17, the transport cure): the bytes
            // stream straight through as octet-stream — no base64 data URL,
            // so a 200MB LoRA costs 200MB, never a ~267MB string inside a
            // JSON manage act (~2× peak memory). The door checks the
            // declared content-length against the cap BEFORE reading.
            const qs = new URLSearchParams({ filename: file.name });
            const fam = families.split(',').map((f) => f.trim()).filter((f) => f !== '');
            if (fam.length > 0)
                qs.set('families', fam.join(','));
            const res = await fetch('/v1/uploads/lora?' + qs.toString(), {
                method: 'POST',
                headers: { 'content-type': 'application/octet-stream' },
                body: file,
            });
            if (!res.ok) {
                const why = await res.json().then((r) => typeof r?.error === 'string' ? r.error : '').catch(() => '');
                throw new Error(why !== '' ? why : 'the lora door refused the upload (HTTP ' + String(res.status) + ')');
            }
            await refresh();
        }
        catch (e) {
            setRefusal(thrownVoice(e));
        }
        finally {
            setBusy(false);
        }
    }, [families, refresh]);
    const engine = data?.engine_loras ?? [];
    const rows = data?.user_rows ?? [];
    const unboarded = data?.unboarded ?? [];
    const problems = data?.user_row_problems ?? [];
    return React.createElement('div', { 'data-testid': 'manage-loras' }, React.createElement('div', { className: 'row' }, React.createElement('strong', null, 'LoRAs'), open
        ? React.createElement('button', { onClick: () => void refresh(), disabled: busy }, 'Refresh')
        : React.createElement('button', { onClick: openAndLoad, disabled: busy }, 'Show LoRAs')), open === false ? React.createElement('p', { className: 'hint' }, 'Add a LoRA you already have: the engine accepts only the names in its own list, so copy the file in, restart, then add a row.') : null, React.createElement('p', { className: 'hint' }, 'The engine accepts ' + String(engine.length) + ' LoRA name(s) — a name outside its list refuses at run time, so add the file first.'), data?.install_dir === undefined
        ? null
        : React.createElement('p', { className: 'hint mono' }, 'install dir: ' + data.install_dir), 
    // THE UNBOARDED ROWS: named here, not at /prompt
    unboarded.length === 0
        ? null
        : React.createElement('div', { className: 'warn' }, unboarded.length + ' of your row(s) are not in the engine list yet (install the file, then restart the engine):', ...unboarded.map((u) => React.createElement('div', { key: u, className: 'mono' }, '· ' + u))), 
    // THE USER'S OWN ROWS
    React.createElement('div', { className: 'hint' }, 'your rows: ' + (data?.user_rows_present === true ? String(rows.length) : 'none') +
        (data?.user_rows_path === undefined ? '' : ' — ' + data.user_rows_path)), ...rows.map((r) => React.createElement('div', { key: String(r.id), className: 'mono' }, '· ' + String(r.label ?? r.id) + '  (' + String(r.filename) + ')' +
        (r.default_strength === undefined ? '' : '  @' + String(r.default_strength)) +
        (r.families === undefined ? '' : '  [' + r.families.join(', ') + ']'))), problems.length === 0
        ? null
        : React.createElement('div', { className: 'warn' }, ...problems.map((p) => React.createElement('div', { key: p, className: 'mono' }, 'refused row — ' + p))), 
    // THE UPLOAD DOOR — THE CIVIT FLOW (civit.ai serves downloads
    // behind Cloudflare and a per-account key, and the standing law
    // forbids the estate fetching a LoRA at all): download it in YOUR
    // browser, then choose the file here. The bytes ride the manage
    // door as the uploads rail's own data-URL spelling; nothing is
    // fetched by the estate.
    React.createElement('div', { className: 'row' }, React.createElement('input', {
        type: 'file',
        accept: '.safetensors,.ckpt,.pt,.bin,.gguf',
        onChange: (e) => {
            const file = e.target.files?.[0];
            if (file === undefined)
                return;
            void uploadChosen(file);
        },
        disabled: busy,
    }), React.createElement('span', { className: 'hint' }, 'or drop a LoRA you downloaded from civit.ai here (your browser does the download)')), 
    // THE FILE DOOR — a copy from the machine, never a fetch
    React.createElement('div', { className: 'row' }, React.createElement('input', {
        placeholder: '/abs/path/to/my_lora.safetensors',
        value: path,
        onChange: (e) => setPath(e.target.value),
        style: { flex: 1 },
    }), React.createElement('input', {
        placeholder: 'families (comma)',
        value: families,
        onChange: (e) => setFamilies(e.target.value),
        style: { width: '12rem' },
    }), React.createElement('button', { onClick: () => void install(), disabled: busy || path.trim() === '' }, 'Copy LoRA in')), React.createElement('p', { className: 'hint' }, 'A copied file enters the engine list only after a restart — the button below asks for one.'), React.createElement('div', { className: 'row' }, React.createElement('button', {
        onClick: () => void postManage('restart', {}).then((reply) => {
            // same law as the list and the install: a refused restart is
            // a VALUE, and the button must not read as if it worked
            if (reply.ok !== true) {
                /* v8 ignore next -- postManage folds a refusal through
               * nonEmptyOr, so detail is NEVER empty (assets-tab.tsx:346);
               * the default text is a belt for a lane that answers
               * differently. */
                setRefusal(reply.detail ?? 'the engine refused the restart');
                return;
            }
            return refresh();
        }).catch((e) => {
            setRefusal(thrownVoice(e));
        }),
        disabled: busy,
    }, 'Restart engine')), refusal === null ? null : React.createElement('div', { className: 'warn' }, refusal));
}
export default LoraBlock;
//# sourceMappingURL=lora-section.js.map
