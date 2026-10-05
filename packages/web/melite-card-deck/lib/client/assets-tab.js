import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import css from './assets.module.css';
import { Button, Checkbox, Input } from '@deepseek-ai/dsh-client-ui-primitives';
const STATUS_STALE_MS = 30_000;
const MUTATING = new Set([
    'endpoint_set', 'install_extension', 'install_extension_url',
    'download_model', 'provision_model',
    'launch', 'restart', 'stop', 'update', 'switch_version', 'free',
    'snapshot_save', 'snapshot_restore',
]);
const ACTION_LABELS = {
    status: 'Refresh status',
    endpoint_set: 'Set endpoint',
    list_extensions: 'Review installed packs',
    install_extension: 'Install declared packs',
    install_extension_url: 'Open raw-URL pack install',
    search_models: 'Search models',
    provision_model: 'Provision declared model',
    download_model: 'Open raw-URL model download',
    // THE LORA DOORS (2026-09-26): the sidebar's own vocabulary now
    // carries the custom-LoRA block.
    lora_list: 'List LoRAs the engine accepts',
    lora_install: 'Copy a LoRA in',
    snapshot_list: 'Review snapshots',
    snapshot_save: 'Save snapshot',
    snapshot_restore: 'Restore snapshot',
    launch: 'Launch ComfyUI',
    restart: 'Restart ComfyUI',
    stop: 'Stop ComfyUI',
    free: 'Free VRAM',
    update: 'Update ComfyUI',
    switch_version: 'Switch ComfyUI version',
};
function recordOf(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : null;
}
function stringOr(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}
/** A refusal voice must carry words: an empty message names the wire's
 *  own refusal rather than rendering a blank line (the card-base
 *  manage lane's law). */
function nonEmptyOr(value, fallback) {
    return typeof value === 'string' && value !== '' ? value : fallback;
}
function modelCatalog(value) {
    if (!Array.isArray(value))
        return [];
    return value.flatMap((row) => {
        const record = recordOf(row);
        if (record === null || typeof record['id'] !== 'string' || record['id'] === '')
            return [];
        const variants = Array.isArray(record['variants']) ? record['variants'].flatMap((variantRow) => {
            const variant = recordOf(variantRow);
            if (variant === null || typeof variant['id'] !== 'string' || variant['id'] === '')
                return [];
            const quants = Array.isArray(variant['quants']) ? variant['quants'].flatMap((quantRow) => {
                const quant = recordOf(quantRow);
                if (quant === null || typeof quant['id'] !== 'string' || quant['id'] === '')
                    return [];
                return [{
                        id: quant['id'],
                        label: stringOr(quant['label'], quant['id']),
                        ...(typeof quant['description'] === 'string' ? { description: quant['description'] } : {}),
                    }];
            }) : [];
            return [{
                    id: variant['id'],
                    label: stringOr(variant['label'], variant['id']),
                    ...(typeof variant['description'] === 'string' ? { description: variant['description'] } : {}),
                    quants,
                }];
        }) : [];
        return [{
                id: record['id'],
                label: stringOr(record['label'], record['id']),
                ...(typeof record['description'] === 'string' ? { description: record['description'] } : {}),
                ...(typeof record['genre'] === 'string' ? { genre: record['genre'] } : {}),
                variants,
            }];
    });
}
function versionCatalog(value) {
    if (!Array.isArray(value))
        return [];
    return value.flatMap((row) => {
        if (typeof row === 'string' || typeof row === 'number') {
            const id = String(row);
            return id === '' ? [] : [{ id, label: id }];
        }
        const record = recordOf(row);
        if (record === null)
            return [];
        const version = typeof record['version'] === 'string' ? record['version'] : undefined;
        const tag = typeof record['tag'] === 'string' ? record['tag'] : undefined;
        const commit = typeof record['commit'] === 'string' ? record['commit'] : undefined;
        const id = version ?? tag ?? commit ?? stringOr(record['id']);
        if (id === '')
            return [];
        return [{
                id,
                label: version !== undefined && tag !== undefined && version !== tag ? version + ' — ' + tag : version ?? tag ?? commit ?? id,
                ...(version === undefined ? {} : { version }),
                ...(tag === undefined ? {} : { tag }),
                ...(commit === undefined ? {} : { commit }),
            }];
    });
}
function numberOr(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
function replyFields(envelope, data) {
    const nested = recordOf(data);
    const fields = {};
    const text = (key) => {
        const value = typeof envelope[key] === 'string' ? envelope[key] : nested?.[key];
        if (typeof value === 'string')
            fields[key] = value;
    };
    text('code');
    text('state');
    text('next_action');
    text('operation_id');
    const status = numberOr(envelope['status']) ?? numberOr(nested?.['status']);
    if (status !== undefined)
        fields.status = status;
    const partial = typeof envelope['partial'] === 'boolean' ? envelope['partial'] : nested?.['partial'];
    if (typeof partial === 'boolean')
        fields.partial = partial;
    const restart = typeof envelope['restart_required'] === 'boolean' ? envelope['restart_required'] : nested?.['restart_required'];
    if (typeof restart === 'boolean')
        fields.restart_required = restart;
    const misses = Array.isArray(envelope['misses']) ? envelope['misses'] : nested?.['misses'];
    if (Array.isArray(misses))
        fields.misses = misses.filter((item) => typeof item === 'string');
    return fields;
}
/** The seated manage namespace (the deck's apply seats it off its
 *  'remote.manage' inject — the loader guarantees the namespace
 *  exists when apply runs; a panel that renders without it refuses
 *  loud, never silent). */
let seatedManage;
/** Seat the manage namespace (called once by the deck's apply;
 *  `undefined` unseats — the loud-refusal arm a panel render without
 *  the contribution meets). */
export function seatManageNamespace(lane) {
    seatedManage = lane;
}
// THE LORA BLOCK (the operator's 2026-09-26 order: custom LoRAs belong
// in the ComfyUI Manager sidebar). The block is its own module and
// speaks the manage plane's own two doors (`lora_list`, `lora_install`).
import LoraBlock from "./lora-section.js";
export async function postManage(action, payload, signal) {
    const lane = seatedManage;
    if (lane === undefined) {
        throw new Error('manage remote not mounted — the manage contribution must mount before any call');
    }
    const doc = { action, ...payload };
    try {
        const settled = await lane.act(doc, signal);
        if (settled.ok === true) {
            const row = settled.value;
            const envelope = recordOf(row) ?? {};
            const data = row.data;
            return {
                action: row.action,
                ok: row.ok,
                detail: stringOr(row.detail),
                data,
                ...replyFields(envelope, data),
            };
        }
        // The protocol's ONE failure face: the thrown RemoteError folded
        // into the RemoteResult error branch — its message rides verbatim,
        // its details carry the refusal envelope (manage/refused's law).
        const failure = settled.error;
        const errorRecord = recordOf(failure) ?? {};
        const details = recordOf(errorRecord['details']) ?? {};
        const data = details['data'];
        return {
            action: stringOr(details['action'], action),
            ok: false,
            detail: nonEmptyOr(errorRecord['message'], 'manage wire: refused'),
            data,
            ...replyFields(details, data),
            code: stringOr(details['code'], stringOr(errorRecord['code'], 'manage/refused')),
        };
    }
    catch (e) {
        if (e instanceof Error && e.name === 'AbortError')
            throw e;
        return {
            action,
            ok: false,
            code: 'manage/transport',
            detail: e instanceof Error ? e.message : String(e),
        };
    }
}
function gb(bytes) {
    return typeof bytes === 'number' && bytes > 0 ? (bytes / 2 ** 30).toFixed(1) : '?';
}
function displayValue(value) {
    if (typeof value === 'string')
        return value;
    if (typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    if (value === null)
        return 'null';
    if (value === undefined)
        return '';
    try {
        return JSON.stringify(value) ?? String(value);
    }
    catch {
        return String(value);
    }
}
function managerVersion(value) {
    const record = recordOf(value);
    if (record !== null) {
        for (const key of ['version', 'v', 'tag', 'commit']) {
            if (typeof record[key] === 'string' && record[key] !== '')
                return record[key];
        }
    }
    return displayValue(value);
}
function queueSummary(value) {
    const queue = recordOf(value);
    if (queue === null)
        return displayValue(value);
    const active = numberOr(queue.in_progress_count) ?? 0;
    const total = numberOr(queue.total_count) ?? 0;
    const done = numberOr(queue.done_count) ?? 0;
    return (queue.is_processing === true ? 'working' : 'idle') + ' · ' + String(active) + ' active · ' + String(done) + '/' + String(total) + ' complete';
}
function statusView(data) {
    return recordOf(data);
}
function provisionData(data) {
    const value = recordOf(data);
    if (value === null || typeof value['state'] !== 'string' || !Array.isArray(value['items']))
        return null;
    return value;
}
function resultContract(reply) {
    const data = recordOf(reply.data) ?? {};
    const state = reply.state ?? stringOr(data['state']);
    return {
        state,
        operationId: reply.operation_id ?? stringOr(data['operation_id']),
        partial: state === 'partial' || (reply.partial ?? (typeof data['partial'] === 'boolean' ? data['partial'] : false)),
        restartRequired: state === 'restart_required' || (reply.restart_required ?? (typeof data['restart_required'] === 'boolean' ? data['restart_required'] : false)),
        nextAction: reply.next_action ?? stringOr(data['next_action']),
        code: reply.code ?? stringOr(data['code']),
        status: reply.status,
    };
}
function inferredNextAction(reply) {
    const contract = resultContract(reply);
    if (contract.nextAction !== '')
        return contract.nextAction;
    if (reply.action === 'list_extensions')
        return 'install_extension';
    if (reply.action === 'snapshot_list')
        return 'snapshot_save';
    if (contract.restartRequired)
        return 'restart';
    return '';
}
function freshness(at, now) {
    const age = Math.max(0, now - at);
    if (age >= STATUS_STALE_MS)
        return 'stale';
    if (age < 5_000)
        return 'fresh';
    return String(Math.floor(age / 1_000)) + 's old';
}
function receivedLabel(at) {
    return new Date(at).toISOString().slice(11, 19) + ' UTC';
}
function healthKind(status, receivedAt, loading, error, now) {
    if (status === null)
        return error === '' ? 'loading' : 'status-failure';
    if (loading || error !== '' || receivedAt === null || now - receivedAt >= STATUS_STALE_MS)
        return 'stale';
    if (status.endpoint?.reachable !== true)
        return 'engine-failure';
    if (status.manager?.reachable !== true)
        return 'manager-failure';
    return 'reachable';
}
function healthLabel(kind) {
    if (kind === 'loading')
        return 'Loading status';
    if (kind === 'stale')
        return 'Stale status';
    if (kind === 'reachable')
        return 'Engine + manager reachable';
    if (kind === 'manager-failure')
        return 'Manager failure';
    if (kind === 'engine-failure')
        return 'Engine failure';
    return 'Status unavailable';
}
function healthDotClass(kind) {
    if (kind === 'reachable')
        return css.dotOk;
    if (kind === 'loading' || kind === 'stale')
        return css.dotWarn;
    return css.dotBad;
}
function resourceLabel(resource) {
    const ref = resource.ref;
    if (ref === undefined)
        return 'resource';
    const kind = ref.kind === 'extension' ? 'extension' : 'model';
    const owner = ref.owner === undefined ? '' : ref.owner + '/';
    const variant = ref.variant === undefined ? '' : ':' + ref.variant;
    const quant = ref.quant === undefined ? '' : ':' + ref.quant;
    return kind + ' ' + owner + (ref.id ?? '?') + variant + quant;
}
function resourceStateClass(state) {
    if (state === 'active' || state === 'ready')
        return css.stateOk;
    if (state === 'failed' || state === 'blocked' || state === 'absent' || state === 'missing')
        return css.stateBad;
    if (state === 'partial' || state === 'restart_required' || state === 'installed' || state === 'pending')
        return css.stateWarn;
    return css.stateNeutral;
}
function rowLine(row) {
    if (typeof row === 'string')
        return row;
    const value = recordOf(row);
    if (value !== null) {
        const name = typeof value['name'] === 'string' ? value['name'] : undefined;
        const version = typeof value['version'] === 'string' ? value['version'] : undefined;
        if (name !== undefined && version !== undefined)
            return name + ' — ' + version;
        if (name !== undefined) {
            const traits = [value['type'], value['base']].filter((item) => typeof item === 'string' && item !== '');
            const file = typeof value['filename'] === 'string' ? value['filename'] : undefined;
            const head = traits.length > 0 ? name + ' (' + traits.join(', ') + ')' : name;
            return file === undefined ? head : head + ' — ' + file;
        }
    }
    return displayValue(row);
}
function DataBody({ data }) {
    if (Array.isArray(data)) {
        return _jsx("pre", { className: css.pre, tabIndex: 0, "aria-label": "Result output", children: data.map(rowLine).join('\n') });
    }
    return _jsx("pre", { className: css.pre, tabIndex: 0, "aria-label": "Result output", children: displayValue(data) });
}
function Field({ label, value, placeholder, mono, onChange }) {
    // The label row is this tab's layout; the control is the DSH atom
    // (Input passes native attributes through; mono rides className).
    return (_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: label }), _jsx(Input, { className: mono === true ? css.mono : undefined, value: value, placeholder: placeholder, onChange: (event) => { onChange(event.target.value); } })] }));
}
function SearchField({ label, value, options, placeholder, mono = false, onChange }) {
    const listId = useId();
    return (_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: label }), _jsx(Input, { className: mono === true ? css.mono : undefined, type: "search", list: listId, value: value, placeholder: placeholder, onChange: (event) => { onChange(event.target.value); } }), _jsx("datalist", { id: listId, children: options.map((option) => _jsx("option", { value: option.value, children: option.label }, option.value)) })] }));
}
function SelectField({ label, value, options, placeholder, disabled = false, onChange }) {
    return (_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: label }), _jsxs("select", { className: css.input, value: value, disabled: disabled, onChange: (event) => { onChange(event.target.value); }, children: [_jsx("option", { value: "", children: placeholder }), options.map((option) => _jsx("option", { value: option.value, children: option.label }, option.value))] })] }));
}
function resultLabel(reply, state) {
    if (state === 'partial')
        return 'PARTIAL';
    if (state === 'restart_required')
        return 'RESTART REQUIRED';
    if (reply.ok !== true)
        return 'REFUSED';
    if (state !== '')
        return state.toUpperCase();
    return 'OK';
}
function ResultRecordView({ record, kind, now, locked, onFollow }) {
    const reply = record.reply;
    const contract = resultContract(reply);
    const provision = provisionData(reply.data);
    const nextAction = inferredNextAction(reply);
    const label = resultLabel(reply, contract.state);
    const warn = contract.partial || contract.restartRequired;
    const good = reply.ok === true && !warn;
    const showFlags = kind === 'mutation' || contract.state !== '' || provision !== null;
    return (_jsxs("article", { className: css.resultRecord, "data-testid": kind === 'mutation' ? 'mutation-result' : 'read-result', "aria-label": kind === 'mutation' ? 'Last mutation result' : 'Latest read result', children: [_jsxs("div", { className: css.resultRecordHead, children: [_jsx("span", { className: good ? css.resultOk : warn ? css.resultWarn : css.resultBad, children: label }), _jsx("span", { className: css.resultAction, children: reply.action ?? 'unknown' }), _jsx("span", { className: css.resultKind, children: kind === 'mutation' ? 'last mutation' : 'latest read' })] }), _jsxs("div", { className: css.resultMeta, children: [contract.state !== '' && _jsxs("span", { children: [_jsx("strong", { children: "State:" }), " ", _jsx("span", { className: css.mono, children: contract.state })] }), contract.operationId !== '' && _jsxs("span", { children: [_jsx("strong", { children: "operation_id:" }), " ", _jsx("span", { className: css.mono, children: contract.operationId })] }), reply.ok !== true && _jsxs("span", { children: [_jsx("strong", { children: "Error code:" }), " ", _jsxs("span", { className: css.mono, children: [contract.code === '' ? 'manage/refused' : contract.code, contract.status === undefined ? '' : ' · HTTP ' + String(contract.status)] })] }), _jsxs("span", { children: [_jsx("strong", { children: "Received:" }), " ", _jsx("time", { dateTime: new Date(record.receivedAt).toISOString(), children: receivedLabel(record.receivedAt) }), " \u00B7 ", freshness(record.receivedAt, now)] })] }), _jsxs("p", { className: css.resultDetail, children: [_jsx("strong", { children: "Detail:" }), " ", reply.detail ?? ''] }), showFlags && (_jsxs("div", { className: css.resultFlags, children: [_jsxs("span", { children: ["Partial: ", contract.partial ? 'yes' : 'no'] }), _jsxs("span", { children: ["Restart required: ", contract.restartRequired ? 'yes' : 'no'] })] })), nextAction !== '' && (_jsx("div", { className: css.nextRow, children: _jsxs(Button, { disabled: locked, onClick: () => { onFollow(nextAction); }, children: ["Next: ", ACTION_LABELS[nextAction] ?? nextAction] }) })), provision !== null && (_jsxs("div", { "data-testid": "provision-state", children: [(provision.requested !== undefined || provision.succeeded !== undefined || provision.missed !== undefined) && (_jsxs("div", { className: css.resultFlags, children: [_jsxs("span", { children: ["Requested: ", (provision.requested ?? []).join(', ') || 'none'] }), _jsxs("span", { children: ["Succeeded: ", (provision.succeeded ?? []).join(', ') || 'none'] }), _jsxs("span", { children: ["Missed: ", (provision.missed ?? []).join(', ') || 'none'] }), (provision.misses ?? []).length > 0 && _jsxs("span", { children: ["Details: ", provision.misses?.join(' · ')] })] })), provision.items.map((item, index) => {
                        const itemState = stringOr(item['state'], 'unknown');
                        return (_jsxs("div", { className: css.resultItem, children: [_jsx("span", { className: resourceStateClass(itemState), children: itemState }), _jsx("span", { className: css.mono, children: stringOr(item['key'], 'item') }), typeof item['integrity'] === 'string' && _jsx("span", { className: css.sub, children: item['integrity'] }), typeof item['errorCode'] === 'string' && _jsx("span", { className: css.errorCode, children: item['errorCode'] }), typeof item['detail'] === 'string' && _jsx("span", { className: css.sub, children: item['detail'] })] }, stringOr(item['key'], String(index))));
                    }), (provision.errors ?? []).map((error, index) => (_jsxs("p", { className: css.errorCode, children: [error.file ?? 'error', ": ", error.error ?? 'failed'] }, String(error.file ?? index))))] })), reply.data !== undefined && reply.data !== null && provision === null && (_jsxs("div", { className: css.resultData, "data-testid": "result-data", children: [_jsx("span", { className: css.resultDataLabel, children: "Output" }), _jsx(DataBody, { data: reply.data })] }))] }));
}
export function ComfyManagerPanel() {
    const [epUrl, setEpUrl] = useState('');
    const [status, setStatus] = useState(null);
    const [statusDetail, setStatusDetail] = useState('Checking engine and manager…');
    const [statusError, setStatusError] = useState('');
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusReceivedAt, setStatusReceivedAt] = useState(null);
    const [now, setNow] = useState(Date.now());
    const [busy, setBusy] = useState(null);
    const [mutationResult, setMutationResult] = useState(null);
    const [readResult, setReadResult] = useState(null);
    const statusRequestRef = useRef(0);
    const dispatchingRef = useRef(false);
    const dispatchSequenceRef = useRef(0);
    const resultSequenceRef = useRef(0);
    const mountedRef = useRef(true);
    const statusControllerRef = useRef(null);
    const actionControllerRef = useRef(null);
    const [extRows, setExtRows] = useState(null);
    const [extFilter, setExtFilter] = useState('');
    const [snapRows, setSnapRows] = useState(null);
    const [logTail, setLogTail] = useState('200');
    const [extIds, setExtIds] = useState('');
    const [extUrl, setExtUrl] = useState('');
    const [modelQuery, setModelQuery] = useState('');
    const [dlUrl, setDlUrl] = useState('');
    const [dlPath, setDlPath] = useState('');
    const [dlName, setDlName] = useState('');
    const [provModel, setProvModel] = useState('');
    const [provVariant, setProvVariant] = useState('');
    const [provQuant, setProvQuant] = useState('');
    const [swVersion, setSwVersion] = useState('');
    const [lifecycleForce, setLifecycleForce] = useState(false);
    const [restoreForce, setRestoreForce] = useState(false);
    const modelOptions = useMemo(() => modelCatalog(status?.model_options), [status?.model_options]);
    const selectedModel = modelOptions.find((model) => model.id === provModel.trim());
    const selectedVariant = selectedModel?.variants.find((variant) => variant.id === provVariant);
    const quantOptions = selectedVariant?.quants ?? [];
    const comfyuiVersions = useMemo(() => versionCatalog(status?.comfyui_versions), [status?.comfyui_versions]);
    const modelCatalogRef = useRef(null);
    const fetchStatus = useCallback(async () => {
        const request = ++statusRequestRef.current;
        statusControllerRef.current?.abort();
        const controller = new AbortController();
        statusControllerRef.current = controller;
        setStatusLoading(true);
        try {
            const reply = await postManage('status', {}, controller.signal);
            if (!mountedRef.current || request !== statusRequestRef.current)
                return;
            if (reply.ok === true) {
                const view = statusView(reply.data);
                if (view === null) {
                    setStatusError('status reply carried no status data');
                    setStatusDetail('');
                    return;
                }
                const received = Date.now();
                setStatus(view);
                setStatusReceivedAt(received);
                setStatusError('');
                setStatusDetail(reply.detail ?? '');
                const live = view.endpoint?.url;
                if (typeof live === 'string' && live !== '')
                    setEpUrl((previous) => previous === '' ? live : previous);
            }
            else {
                setStatusError(reply.detail ?? 'status request failed');
                setStatusDetail('');
            }
        }
        catch (error) {
            if (mountedRef.current && !controller.signal.aborted && request === statusRequestRef.current)
                setStatusError('request failed: ' + String(error));
        }
        finally {
            if (statusControllerRef.current === controller)
                statusControllerRef.current = null;
            if (mountedRef.current && request === statusRequestRef.current)
                setStatusLoading(false);
        }
    }, []);
    useEffect(() => {
        mountedRef.current = true;
        void fetchStatus();
        return () => {
            mountedRef.current = false;
            statusControllerRef.current?.abort();
            actionControllerRef.current?.abort();
        };
    }, [fetchStatus]);
    useEffect(() => {
        const previous = modelCatalogRef.current;
        modelCatalogRef.current = modelOptions;
        if (previous === null || previous.length === 0)
            return;
        if (modelOptions.length === 0) {
            setProvVariant('');
            setProvQuant('');
            return;
        }
        const model = modelOptions.find((option) => option.id === provModel.trim());
        if (model === undefined) {
            setProvVariant('');
            setProvQuant('');
            return;
        }
        const variant = model.variants.find((option) => option.id === provVariant) ?? model.variants[0];
        const variantId = variant?.id ?? '';
        const quantId = variant?.quants.find((option) => option.id === provQuant)?.id ?? variant?.quants[0]?.id ?? '';
        if (provVariant !== variantId)
            setProvVariant(variantId);
        if (provQuant !== quantId)
            setProvQuant(quantId);
    }, [modelOptions, provModel, provQuant, provVariant]);
    useEffect(() => {
        const timer = window.setInterval(() => { setNow(Date.now()); }, 5_000);
        return () => { window.clearInterval(timer); };
    }, []);
    const run = useCallback(async (action, payload = {}, recordOutput = true) => {
        if (dispatchingRef.current)
            return null;
        dispatchingRef.current = true;
        const request = ++dispatchSequenceRef.current;
        const controller = new AbortController();
        actionControllerRef.current = controller;
        setBusy(action);
        try {
            const reply = await postManage(action, payload, controller.signal);
            if (mountedRef.current && request === dispatchSequenceRef.current) {
                const record = { id: ++resultSequenceRef.current, reply, receivedAt: Date.now() };
                if (MUTATING.has(action))
                    setMutationResult(record);
                else if (recordOutput)
                    setReadResult(record);
            }
            return reply;
        }
        catch (error) {
            if (controller.signal.aborted)
                return null;
            if (mountedRef.current && request === dispatchSequenceRef.current) {
                const reply = { action, ok: false, code: 'manage/transport', detail: 'request failed: ' + String(error) };
                const record = { id: ++resultSequenceRef.current, reply, receivedAt: Date.now() };
                if (MUTATING.has(action))
                    setMutationResult(record);
                else if (recordOutput)
                    setReadResult(record);
            }
            return null;
        }
        finally {
            if (actionControllerRef.current === controller)
                actionControllerRef.current = null;
            if (MUTATING.has(action) && mountedRef.current)
                await fetchStatus();
            if (mountedRef.current && request === dispatchSequenceRef.current) {
                dispatchingRef.current = false;
                setBusy(null);
            }
        }
    }, [fetchStatus]);
    const loadExtensions = useCallback(async (recordOutput = true) => {
        const reply = await run('list_extensions', {}, recordOutput);
        if (reply !== null && reply.ok === true && Array.isArray(reply.data)) {
            setExtRows(reply.data.map((row) => {
                if (typeof row === 'string')
                    return row;
                const value = recordOf(row);
                if (value !== null) {
                    const name = stringOr(value['name'], '?');
                    const version = typeof value['version'] === 'string' ? value['version'] : typeof value['ver'] === 'string' ? value['ver'] : '?';
                    return name + ' — ' + version;
                }
                return String(row);
            }));
        }
    }, [run]);
    const loadSnapshots = useCallback(async (recordOutput = true) => {
        const reply = await run('snapshot_list', {}, recordOutput);
        if (reply !== null && reply.ok === true && Array.isArray(reply.data))
            setSnapRows(reply.data.map(String));
    }, [run]);
    function confirmRun(action, sentence, options = {}) {
        if (!window.confirm(sentence))
            return;
        options.onUse?.();
        void run(action, options.payload ?? {}).then((reply) => {
            if (reply !== null && (reply.ok === true || resultContract(reply).partial))
                options.after?.();
        });
    }
    function forceSentence(value) {
        return ' Force override: ' + (value ? 'ON.' : 'OFF.');
    }
    function changeModel(value) {
        const modelId = value.trim();
        setProvModel(value);
        if (modelOptions.length === 0) {
            if (provModel.trim() !== modelId) {
                setProvVariant('');
                setProvQuant('');
            }
            return;
        }
        const model = modelOptions.find((option) => option.id === modelId);
        if (model === undefined) {
            setProvVariant('');
            setProvQuant('');
            return;
        }
        const variant = model.variants.find((option) => option.id === provVariant) ?? model.variants[0];
        setProvVariant(variant?.id ?? '');
        setProvQuant(variant?.quants[0]?.id ?? '');
    }
    function changeVariant(value) {
        setProvVariant(value);
        const variant = selectedModel?.variants.find((option) => option.id === value);
        setProvQuant(variant?.quants[0]?.id ?? '');
    }
    function focusAction(action) {
        const target = document.getElementById('manage-' + action);
        if (target instanceof HTMLDetailsElement)
            target.open = true;
        const focusable = target?.querySelector('input, select, button');
        focusable?.focus();
        if (typeof target?.scrollIntoView === 'function')
            target.scrollIntoView({ block: 'start' });
    }
    function followNext(action) {
        if (action === 'status') {
            void fetchStatus();
            return;
        }
        if (action === 'launch' && status?.endpoint?.reachable !== true) {
            confirmRun('launch', 'Launch the ComfyUI server?');
            return;
        }
        if (action === 'restart' && status?.endpoint?.reachable === true) {
            const force = lifecycleForce;
            confirmRun('restart', 'Restart the ComfyUI server?' + forceSentence(force), {
                payload: { force },
                onUse: () => { setLifecycleForce(false); },
            });
            return;
        }
        focusAction(action);
    }
    const ep = status?.endpoint;
    const manager = status?.manager;
    const up = ep?.reachable === true;
    const byo = status?.routing?.mode === 'byo';
    const activeRuns = status?.active_runs ?? [];
    const resources = status?.resources ?? [];
    const kind = healthKind(status, statusReceivedAt, statusLoading, statusError, now);
    const statusNextAction = status?.next_action ?? (up ? 'status' : 'launch');
    const locked = busy !== null;
    const visibleRead = readResult !== null && (mutationResult === null || readResult.id > mutationResult.id);
    return (_jsxs("div", { className: css.root, "data-comfy-manager": "", "aria-busy": statusLoading || locked, children: [_jsxs("div", { className: css.head, children: [_jsx("h2", { className: css.title, children: "ComfyUI Manager" }), statusDetail !== '' && _jsx("span", { className: css.sub, children: statusDetail })] }), _jsxs("section", { className: css.section + ' ' + css.healthPanel, "aria-live": "polite", "aria-busy": statusLoading, children: [_jsxs("div", { className: css.healthTop, children: [_jsx("span", { className: healthDotClass(kind), "aria-hidden": "true" }), _jsxs("div", { className: css.healthCopy, children: [_jsx("h3", { className: css.healthTitle, children: "Health" }), _jsx("strong", { className: css.healthLabel, "data-testid": "health-state", children: healthLabel(kind) })] }), _jsx(Button, { "aria-busy": statusLoading, disabled: locked || (statusLoading), variant: "primary", onClick: () => { void fetchStatus(); }, children: "Refresh" })] }), statusError !== '' && _jsxs("p", { className: status === null ? css.dangerNote : css.warningNote, children: ["Refresh failed: ", statusError, status === null ? '' : ' · showing the last confirmed status'] }), statusLoading && status !== null && _jsx("p", { className: css.sub, children: "Refreshing \u00B7 showing the last confirmed status" }), _jsxs("dl", { className: css.healthGrid, children: [_jsxs("div", { className: css.healthItem, children: [_jsx("dt", { children: "Endpoint" }), _jsx("dd", { className: css.wrapText, children: ep?.url ?? 'not reported' })] }), _jsxs("div", { className: css.healthItem, children: [_jsx("dt", { children: "Engine" }), _jsxs("dd", { children: [up ? 'reachable' : 'failure', ep?.reason === undefined ? '' : ' · ' + ep.reason] })] }), _jsxs("div", { className: css.healthItem, children: [_jsx("dt", { children: "ComfyUI" }), _jsx("dd", { className: css.mono, children: ep?.comfyui_version === undefined || ep.comfyui_version === null ? '?' : displayValue(ep.comfyui_version) })] }), _jsxs("div", { className: css.healthItem, children: [_jsx("dt", { children: "Manager" }), _jsxs("dd", { children: [manager?.reachable === true ? 'reachable' : 'failure', manager?.reason === undefined ? '' : ' · ' + manager.reason] })] }), _jsxs("div", { className: css.healthItem, children: [_jsx("dt", { children: "Manager version" }), _jsx("dd", { className: css.mono, children: manager?.version === undefined ? '?' : managerVersion(manager.version) })] }), _jsxs("div", { className: css.healthItem, children: [_jsx("dt", { children: "Manager queue" }), _jsx("dd", { children: manager?.queue === undefined ? '?' : queueSummary(manager.queue) })] }), _jsxs("div", { className: css.healthItem, children: [_jsx("dt", { children: "Security" }), _jsx("dd", { className: css.wrapText, children: manager?.security ?? 'not reported' })] }), _jsxs("div", { className: css.healthItem, children: [_jsx("dt", { children: "Manager unit" }), _jsx("dd", { className: css.wrapText, children: manager?.unit ?? '?' })] }), _jsxs("div", { className: css.healthItem, children: [_jsx("dt", { children: "Runs" }), _jsx("dd", { children: activeRuns.length === 0 ? 'idle' : activeRuns.length + ' active · ' + activeRuns.join(', ') })] }), _jsxs("div", { className: css.healthItem, children: [_jsx("dt", { children: "Routing" }), _jsx("dd", { children: displayValue(status?.routing) })] })] }), _jsxs("div", { className: css.nextRow, children: [_jsxs(Button, { disabled: locked, onClick: () => { followNext(statusNextAction); }, children: ["Next: ", ACTION_LABELS[statusNextAction] ?? statusNextAction] }), statusReceivedAt !== null && (_jsxs("span", { className: css.freshness, children: ["Updated ", _jsx("time", { dateTime: new Date(statusReceivedAt).toISOString(), children: receivedLabel(statusReceivedAt) }), " \u00B7 ", freshness(statusReceivedAt, now)] }))] }), (ep?.devices ?? []).length > 0 && (_jsx("div", { className: css.deviceList, children: (ep?.devices ?? []).map((device, index) => {
                            const total = typeof device.vram_total === 'number' ? device.vram_total : 0;
                            const free = typeof device.vram_free === 'number' ? device.vram_free : 0;
                            const percent = total > 0 ? Math.max(0, Math.min(100, Math.round((free / total) * 100))) : 0;
                            return (_jsxs("div", { className: css.device, children: [_jsx("span", { className: css.kvKey, children: device.name ?? 'gpu' }), _jsx("span", { className: css.bar, children: _jsx("span", { className: css.barFill, style: { width: percent + '%' } }) }), _jsxs("span", { className: css.mono, children: [gb(free), " / ", gb(total), " GB free"] })] }, String(device.name ?? index)));
                        }) })), _jsxs("details", { className: css.advanced, id: "manage-endpoint_set", children: [_jsx("summary", { children: "Endpoint settings" }), _jsxs("div", { className: css.row, children: [_jsx(Field, { label: "server url", value: epUrl, placeholder: "http://127.0.0.1:8188", mono: true, onChange: setEpUrl }), _jsx(Button, { "aria-busy": busy === 'endpoint_set', disabled: locked || epUrl.trim() === '' || busy === 'endpoint_set', onClick: () => { void run('endpoint_set', { url: epUrl.trim() }); }, children: "Set" })] })] })] }), (mutationResult !== null || visibleRead) && (_jsxs("section", { className: css.section + ' ' + css.resultDock, "data-testid": "manage-result", "aria-live": "polite", "aria-busy": locked, children: [_jsxs("div", { className: css.resultHead, children: [_jsx("h3", { className: css.sectionTitle, children: "Result dock" }), _jsx(Button, { onClick: () => { setMutationResult(null); setReadResult(null); }, children: "Clear result" })] }), mutationResult !== null && _jsx(ResultRecordView, { record: mutationResult, kind: "mutation", now: now, locked: locked, onFollow: followNext }), visibleRead && _jsx(ResultRecordView, { record: readResult, kind: "output", now: now, locked: locked, onFollow: followNext })] })), _jsx("section", { className: css.section, id: "manage-loras", children: _jsx(LoraBlock, {}) }), _jsxs("section", { className: css.section, id: "manage-resources", children: [_jsxs("h3", { className: css.sectionTitle, children: ["Declared resources ", _jsx("span", { className: css.count, children: resources.length })] }), resources.length === 0 ? (_jsx("p", { className: css.sub, children: "No declared resources reported." })) : (_jsx("ul", { className: css.resourceList, "data-testid": "resource-status", children: resources.map((resource, index) => {
                            const state = resource.state ?? 'unknown';
                            return (_jsxs("li", { className: css.resourceRow, children: [_jsxs("div", { className: css.resourceMain, children: [_jsx("span", { className: resourceStateClass(state), children: state }), _jsx("span", { className: css.resourceName, children: resourceLabel(resource) }), resource.operation_id !== undefined && _jsxs("span", { className: css.mono, children: ["operation_id: ", resource.operation_id] })] }), resource.detail !== undefined && _jsx("p", { className: css.sub, children: resource.detail }), (resource.items ?? []).length > 0 && (_jsx("ul", { className: css.resourceItems, children: (resource.items ?? []).map((item, itemIndex) => (_jsxs("li", { className: css.resourceItem, children: [_jsx("span", { className: resourceStateClass(item.state ?? 'unknown'), children: item.state ?? 'unknown' }), _jsx("span", { className: css.mono, children: item.key ?? item.kind ?? 'item' }), item.outcome !== undefined && item.outcome !== item.state && _jsx("span", { className: css.sub, children: item.outcome }), item.integrity !== undefined && _jsx("span", { className: css.sub, children: item.integrity }), item.errorCode !== undefined && _jsx("span", { className: css.errorCode, children: item.errorCode }), item.path !== undefined && _jsx("span", { className: css.wrapText, children: item.path }), item.sha256 !== undefined && _jsx("span", { className: css.hash, children: item.sha256 }), item.detail !== undefined && _jsx("span", { className: css.sub, children: item.detail })] }, item.key ?? String(itemIndex)))) }))] }, resourceLabel(resource) + ':' + index));
                        }) })), status?.resources_detail !== undefined && _jsxs("p", { className: css.warningNote, children: ["Resource scan: ", status.resources_detail] })] }), _jsxs("section", { className: css.section, id: "manage-list_extensions", children: [_jsx("h3", { className: css.sectionTitle, children: "Extensions" }), _jsxs("div", { className: css.row, children: [_jsx(Field, { label: "filter installed", value: extFilter, placeholder: "kj, moge\u2026", onChange: setExtFilter }), _jsx(Button, { "aria-busy": busy === 'list_extensions', disabled: locked || busy === 'list_extensions', onClick: () => { void loadExtensions(); }, children: "Installed packs" })] }), extRows !== null && (_jsxs("ul", { className: css.list, "data-testid": "ext-list", children: [extRows
                                .filter((row) => row.toLowerCase().includes(extFilter.trim().toLowerCase()))
                                .map((row) => _jsx("li", { className: css.listRow, children: _jsx("span", { className: css.wrapText, children: row }) }, row)), extRows.length === 0 && _jsx("li", { className: css.listRow, children: "no packs installed" })] })), _jsxs("div", { className: css.row, children: [_jsx(Field, { label: "declared registry ids", value: extIds, placeholder: "ComfyUI-KJNodes, ComfyUI-VideoHelperSuite", mono: true, onChange: setExtIds }), _jsx(Button, { "aria-busy": busy === 'install_extension', disabled: locked || extIds.trim() === '' || busy === 'install_extension', onClick: () => {
                                    const nodes = extIds.split(',').map((value) => value.trim()).filter((value) => value !== '');
                                    confirmRun('install_extension', 'Install declared extension pack(s) ' + nodes.join(', ') + ' through the manager rail?', {
                                        payload: { nodes },
                                        after: () => { if (extRows !== null)
                                            void loadExtensions(false); },
                                    });
                                }, children: "Install" })] }), _jsxs("details", { className: css.advanced, id: "manage-install_extension_url", children: [_jsxs("summary", { children: [_jsx("span", { className: css.operatorBadge, children: "Operator only \u00B7 raw URL" }), " Install extension from URL"] }), _jsx("p", { className: css.operatorNote, children: "This bypasses the declared registry ids. Use only for an operator-vetted source." }), _jsxs("div", { className: css.row, children: [_jsx(Field, { label: "git URL (ComfyUI-Manager)", value: extUrl, placeholder: "https://github.com/\u2026", mono: true, onChange: setExtUrl }), _jsx(Button, { "aria-busy": busy === 'install_extension_url', disabled: locked || extUrl.trim() === '' || busy === 'install_extension_url', onClick: () => {
                                            const url = extUrl.trim();
                                            confirmRun('install_extension_url', 'Install extension from operator-vetted URL ' + url + '?', {
                                                payload: { url },
                                                after: () => { if (extRows !== null)
                                                    void loadExtensions(false); },
                                            });
                                        }, children: "Install from URL" })] })] })] }), _jsxs("section", { className: css.section, id: "manage-search_models", children: [_jsx("h3", { className: css.sectionTitle, children: "Models" }), _jsxs("div", { className: css.row, children: [_jsx(Field, { label: "search Manager external index", value: modelQuery, placeholder: "sdxl, wan\u2026", onChange: setModelQuery }), _jsx(Button, { "aria-busy": busy === 'search_models', disabled: locked || modelQuery.trim() === '' || busy === 'search_models', onClick: () => { void run('search_models', { query: modelQuery.trim() }); }, children: "Search" })] }), _jsxs("details", { className: css.advanced, id: "manage-provision_model", children: [_jsx("summary", { children: "Provision a declared model" }), _jsxs("div", { className: css.row, children: [_jsx(SearchField, { label: "provision catalog id", value: provModel, options: modelOptions.map((model) => ({ value: model.id, label: model.label + (model.genre === undefined ? '' : ' · ' + model.genre) })), placeholder: "Search declared models\u2026", mono: true, onChange: changeModel }), modelOptions.length === 0 ? (_jsxs(_Fragment, { children: [_jsx(Field, { label: "variant", value: provVariant, onChange: setProvVariant }), _jsx(Field, { label: "quant", value: provQuant, onChange: setProvQuant })] })) : (_jsxs(_Fragment, { children: [_jsx(SelectField, { label: "variant", value: provVariant, options: (selectedModel?.variants ?? []).map((variant) => ({ value: variant.id, label: variant.label })), placeholder: "Default variant", disabled: selectedModel === undefined, onChange: changeVariant }), _jsx(SelectField, { label: "quant", value: provQuant, options: quantOptions.map((quant) => ({ value: quant.id, label: quant.label })), placeholder: "Default quant", disabled: selectedVariant === undefined || quantOptions.length === 0, onChange: setProvQuant })] })), _jsx(Button, { "aria-busy": busy === 'provision_model', disabled: busy === 'provision_model' || locked || provModel.trim() === '' || (modelOptions.length > 0 && selectedModel === undefined), onClick: () => {
                                            const payload = { model: provModel.trim() };
                                            if (provVariant.trim() !== '')
                                                payload.variant = provVariant.trim();
                                            if (provQuant.trim() !== '')
                                                payload.quant = provQuant.trim();
                                            confirmRun('provision_model', 'Provision declared model ' + provModel.trim() + ' from the catalog?', { payload });
                                        }, children: "Provision" })] }), status?.model_options_detail !== undefined && _jsxs("p", { className: css.warningNote, children: ["Model catalog: ", status.model_options_detail] })] }), _jsxs("details", { className: css.advanced, id: "manage-download_model", children: [_jsxs("summary", { children: [_jsx("span", { className: css.operatorBadge, children: "Operator only \u00B7 raw URL" }), " Download a model from URL"] }), _jsx("p", { className: css.operatorNote, children: "Prefer a declared catalog id. Raw downloads are outside the resource declaration." }), _jsxs("div", { className: css.row, children: [_jsx(Field, { label: "download URL (Manager)", value: dlUrl, placeholder: "https://\u2026/model.safetensors", mono: true, onChange: setDlUrl }), _jsx(Field, { label: "relative path", value: dlPath, placeholder: "models/checkpoints", mono: true, onChange: setDlPath }), _jsx(Field, { label: "filename", value: dlName, placeholder: "model.safetensors", mono: true, onChange: setDlName }), _jsx(Button, { "aria-busy": busy === 'download_model', disabled: locked || dlUrl.trim() === '' || busy === 'download_model', onClick: () => {
                                            const payload = { url: dlUrl.trim() };
                                            if (dlPath.trim() !== '')
                                                payload.relative_path = dlPath.trim();
                                            if (dlName.trim() !== '')
                                                payload.filename = dlName.trim();
                                            confirmRun('download_model', 'Queue operator-vetted download of ' + (dlName.trim() || dlUrl.trim()) + '?', { payload });
                                        }, children: "Download" })] })] })] }), _jsxs("section", { className: css.section, id: "manage-snapshot_list", children: [_jsx("h3", { className: css.sectionTitle, children: "Snapshots" }), _jsx("p", { className: css.sub, children: "Save before update or version switch. Restore needs restart and uses its own one-shot force control." }), _jsxs("div", { className: css.row, children: [_jsx(Button, { "aria-busy": busy === 'snapshot_list', disabled: locked || busy === 'snapshot_list', onClick: () => { void loadSnapshots(); }, children: "List snapshots" }), _jsx(Button, { "aria-busy": busy === 'snapshot_save', disabled: locked || busy === 'snapshot_save', variant: "primary", onClick: () => {
                                    confirmRun('snapshot_save', 'Save an environment snapshot (ComfyUI + packs + dependencies)?', {
                                        after: () => { void loadSnapshots(false); },
                                    });
                                }, children: "Save snapshot" })] }), snapRows !== null && (_jsxs("ul", { className: css.list, "data-testid": "snap-list", children: [snapRows.map((snapshot) => (_jsxs("li", { className: css.listRow + ' ' + css.snapshotRow, children: [_jsx("span", { className: css.wrapText, children: snapshot }), _jsx(Button, { className: css.btnDanger, "aria-busy": busy === 'snapshot_restore', disabled: locked || busy === 'snapshot_restore', onClick: () => {
                                            const force = restoreForce;
                                            confirmRun('snapshot_restore', 'Restore snapshot ' + snapshot + '? This rewrites extensions and dependencies.' + forceSentence(force), {
                                                payload: { snapshot, force },
                                                onUse: () => { setRestoreForce(false); },
                                                after: () => { void loadSnapshots(false); },
                                            });
                                        }, children: "Restore" })] }, snapshot))), snapRows.length === 0 && _jsx("li", { className: css.listRow, children: "no snapshots \u2014 save one before switch/update" })] })), _jsx(Checkbox, { className: css.checkRow, checked: restoreForce, label: "Force the next snapshot restore", disabled: locked, onChange: setRestoreForce })] }), _jsxs("section", { className: css.section, id: "manage-logs", children: [_jsx("h3", { className: css.sectionTitle, children: "Logs" }), _jsxs("div", { className: css.row, children: [_jsx(Field, { label: "tail lines", value: logTail, onChange: setLogTail, mono: true }), _jsx(Button, { "aria-busy": busy === 'logs', disabled: locked || busy === 'logs', onClick: () => {
                                    const tail = Math.max(1, Math.min(Number.parseInt(logTail, 10) || 200, 2_000));
                                    void run('logs', { tail });
                                }, children: "View logs" })] })] }), _jsxs("section", { className: css.section, id: "manage-lifecycle", children: [_jsx("h3", { className: css.sectionTitle, children: "Lifecycle" }), activeRuns.length > 0 && _jsxs("p", { className: css.dangerNote, children: [activeRuns.length, " active run(s). Guarded actions refuse unless their one-shot force control is ON."] }), up && !byo ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: css.lifecycleActions, children: [_jsx(Button, { "aria-busy": busy === 'restart', disabled: locked || busy === 'restart', className: css.btnDanger, onClick: () => {
                                            const force = lifecycleForce;
                                            confirmRun('restart', 'Restart the ComfyUI server?' + forceSentence(force), {
                                                payload: { force },
                                                onUse: () => { setLifecycleForce(false); },
                                            });
                                        }, children: "Restart" }), _jsx(Button, { "aria-busy": busy === 'stop', disabled: locked || busy === 'stop', className: css.btnDanger, onClick: () => {
                                            const force = lifecycleForce;
                                            confirmRun('stop', 'Stop the ComfyUI server?' + forceSentence(force), {
                                                payload: { force },
                                                onUse: () => { setLifecycleForce(false); },
                                            });
                                        }, children: "Stop" }), _jsx(Button, { "aria-busy": busy === 'free', disabled: locked || busy === 'free', onClick: () => {
                                            const force = lifecycleForce;
                                            confirmRun('free', 'Ask ComfyUI to free memory on its next worker iteration?' + forceSentence(force), {
                                                payload: { force },
                                                onUse: () => { setLifecycleForce(false); },
                                            });
                                        }, children: "Free VRAM" })] }), _jsx(Checkbox, { className: css.checkRow, checked: lifecycleForce, label: "Force the next guarded lifecycle action", disabled: locked, onChange: setLifecycleForce }), _jsxs("details", { className: css.advanced, id: "manage-update", children: [_jsx("summary", { children: "Advanced update" }), _jsx("div", { className: css.row, children: _jsx(Button, { "aria-busy": busy === 'update', disabled: locked || busy === 'update', className: css.btnDanger, onClick: () => {
                                                const force = lifecycleForce;
                                                confirmRun('update', 'Update ComfyUI through the built-in manager?' + forceSentence(force), {
                                                    payload: { target: 'comfy', force },
                                                    onUse: () => { setLifecycleForce(false); },
                                                });
                                            }, children: "Update ComfyUI" }) })] }), _jsxs("details", { className: css.advanced, id: "manage-switch_version", children: [_jsx("summary", { children: "Switch ComfyUI version" }), _jsxs("div", { className: css.row, children: [comfyuiVersions.length === 0 ? (_jsx(Field, { label: "switch to version", value: swVersion, placeholder: "commit / tag", mono: true, onChange: setSwVersion })) : (_jsx(SelectField, { label: "switch to version", value: swVersion, options: comfyuiVersions.map((version) => ({ value: version.id, label: version.label })), placeholder: "Select version / tag", onChange: setSwVersion })), status?.comfyui_versions_detail !== undefined && _jsxs("p", { className: css.warningNote, children: ["Version catalog: ", status.comfyui_versions_detail] }), _jsx(Button, { "aria-busy": busy === 'switch_version', disabled: locked || swVersion.trim() === '' || busy === 'switch_version', className: css.btnDanger, onClick: () => {
                                                    const force = lifecycleForce;
                                                    confirmRun('switch_version', 'Switch ComfyUI to ' + swVersion.trim() + '?' + forceSentence(force), {
                                                        payload: { version: swVersion.trim(), force },
                                                        onUse: () => { setLifecycleForce(false); },
                                                    });
                                                }, children: "Switch" })] })] })] })) : status === null ? (_jsx("p", { className: css.sub, children: "Lifecycle controls unlock after status loads." })) : byo ? (_jsx("p", { className: css.sub, children: "BYO endpoint selected. Estate lifecycle controls are unavailable; use Endpoint settings to choose the managed engine." })) : (_jsx("div", { className: css.lifecycleActions, children: _jsx(Button, { "aria-busy": busy === 'launch', disabled: locked || busy === 'launch', variant: "primary", onClick: () => { confirmRun('launch', 'Launch the ComfyUI server?'); }, children: "Launch" }) }))] })] }));
}
function ComfyIcon({ size }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: [_jsx("rect", { x: "2.5", y: "2.5", width: "11", height: "4.6", rx: "1.2", stroke: "currentColor", strokeWidth: "1.3" }), _jsx("rect", { x: "2.5", y: "8.9", width: "11", height: "4.6", rx: "1.2", stroke: "currentColor", strokeWidth: "1.3" }), _jsx("circle", { cx: "5.1", cy: "4.8", r: "0.9", fill: "currentColor" }), _jsx("circle", { cx: "5.1", cy: "11.2", r: "0.9", fill: "currentColor" }), _jsx("path", { d: "M8.2 4.8h3.2M8.2 11.2h3.2", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round" })] }));
}
function register(ctx, id, kind, title, guideOrder, guideDescription, icon, component) {
    ctx.effect(() => ctx.sidebarRightTabs.register({
        id,
        kind,
        title: () => title,
        guide: [{
                // SidebarRightGuideEntry.id is required (0.1.7): stable
                // identity within the provider; register() throws on dups and
                // a single undefined passed that check silently
                id: `${id}-guide`,
                order: guideOrder,
                title: () => title,
                description: () => guideDescription,
                icon: icon,
            }],
    }), 'melite-card-deck: ' + id + ' tab type');
    ctx.slots.inject('sidebar.right.pane.tab', () => {
        const dispose = ctx.slots.register({ name: 'sidebar.right.pane.tab', key: id }, component);
        return typeof dispose === 'function' ? dispose : () => { };
    });
}
export function registerAssetsTab(ctx) {
    register(ctx, 'melite-card-deck:comfy', 'comfy-manager', 'ComfyUI Manager', 61, 'The estate\'s ComfyUI manager — packs, snapshots, status.', ComfyIcon, ComfyManagerPanel);
}
//# sourceMappingURL=assets-tab.js.map
