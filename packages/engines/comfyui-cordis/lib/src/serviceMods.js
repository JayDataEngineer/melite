// serviceMods.ts — the mod/verb system (extracted from service.ts, the god-file cut): the TS mod/verb system owns this plane (ported from the RETIRED dsl.py).
// Mod-field validation, verb validation, and the ControlNet entry resolution live here.
// No Service state; the seat calls these.
import { ComposeRefusal } from "./service.js";
import { assertControlNetSchedule } from "@melite/comfyui-card-kit/guard";
/** The field gates (dsl._validate_field), on the
 *  Schemastery meta — loud at registration, never a silent drop. */
export function validateFields(where, fields) {
    const dict = fields.dict;
    if (dict === undefined) {
        throw new ComposeRefusal('bad-field', `${where}: fields must be a z.object contract (no .dict to walk)`);
    }
    for (const [name, node] of Object.entries(dict)) {
        if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
            throw new ComposeRefusal('bad-field', `${where}: field name '${name}' is not a legal identifier`);
        }
        const meta = node.meta ?? {};
        if (meta.min !== undefined && meta.max !== undefined && meta.min > meta.max) {
            throw new ComposeRefusal('bad-field', `${where}.${name}: min ${String(meta.min)} > max ${String(meta.max)}`);
        }
        if (meta.step !== undefined && meta.step <= 0) {
            throw new ComposeRefusal('bad-field', `${where}.${name}: step ${String(meta.step)} <= 0`);
        }
        const dv = meta.default;
        if (typeof dv === 'number' &&
            ((meta.min !== undefined && dv < meta.min) || (meta.max !== undefined && dv > meta.max))) {
            throw new ComposeRefusal('bad-field', `${where}.${name}: default ${String(dv)} outside [${String(meta.min ?? '-∞')}, ${String(meta.max ?? '∞')}]`);
        }
    }
}
/** The verb plane law (dsl._validate_verbs): every engine row
 *  carries EXACTLY one arm. */
export function validateVerb(v) {
    if (!v.id || !v.label)
        throw new ComposeRefusal('bad-verb', `verb needs id + label`);
    for (const e of v.engines) {
        const arms = [e.flow, e.local, e.refusal].filter((x) => x !== undefined && x !== null && x !== '');
        if (arms.length !== 1) {
            throw new ComposeRefusal('bad-verb', `verb '${v.id}' engine '${e.id}': exactly one of flow/local/refusal (got ${arms.length})`);
        }
    }
    validateFields(`verb ${v.id}`, v.fields);
}
/**
 * Normalize one ControlNet bag row to the lane's resolved shape
 * (the compose-side half of the type/model split — the kit fires,
 * the service resolves, the LoRA law verbatim). Every malformed
 * row refuses LOUD with its entry named: unknown catalog types,
 * a model naming a different file than the catalog row, a
 * preprocessor disagreeing with the row's upstream-map note, an
 * off-bounds strength, a malformed step range, a map-less entry.
 * The step EXECUTABILITY refuses in the kit's schedule law (one
 * spelling — assertControlNetSchedule, shared); the range SHAPE
 * refuses here.
 */
export function resolveControlNetEntry(raw, rows, cardId, modelId) {
    const e = (typeof raw === "object" && raw !== null ? raw : {});
    const type = typeof e.type === "string" && e.type !== "" ? e.type : "";
    const row = rows.find((r) => r.id === type);
    if (row === undefined) {
        throw new ComposeRefusal('unknown-controlnet', `card '${cardId}' names controlnet type '${type}' with no '${modelId}' flavor row ` +
            `(registered: ${rows.map((r) => r.id).join(', ') || 'none'}) — pick from the served catalog, never hand-spell`);
    }
    const named = typeof e.model === "string" && e.model !== "" ? e.model : null;
    if (named !== null && named !== row.filename) {
        throw new ComposeRefusal('controlnet-drift', `card '${cardId}' controlnet '${type}' names model '${named}' but the catalog row serves '${row.filename}' — the union file is the row's, never hand-spelled`);
    }
    const noted = typeof e.preprocessor === "string" && e.preprocessor !== "" ? e.preprocessor : null;
    if (noted !== null && row.preprocessor !== undefined && noted !== row.preprocessor) {
        throw new ComposeRefusal('controlnet-drift', `card '${cardId}' controlnet '${type}' notes preprocessor '${noted}' but the catalog row notes '${row.preprocessor}' — the upstream-map note is the row's`);
    }
    // strength: the row's own default seeds an unstated entry (the
    // retired leaf's seed law); a stated off-bounds strength refuses
    // (never a silent clamp — the floor below is the only clamp, and
    // it logs).
    const seed = row.default_strength ?? 0.7;
    const strength = e.strength === undefined ? seed : e.strength;
    if (typeof strength !== "number" || !Number.isFinite(strength) || strength < 0 || strength > 2) {
        throw new ComposeRefusal('bad-controlnet', `card '${cardId}' controlnet '${type}' strength = ${String(e.strength)}: a number in [0, 2] is required`);
    }
    const start = e.start_percent === undefined ? 0 : e.start_percent;
    const end = e.end_percent === undefined ? 1 : e.end_percent;
    if (typeof start !== "number" || !Number.isFinite(start) || start < 0 || start > 1
        || typeof end !== "number" || !Number.isFinite(end) || end < 0 || end > 1 || start > end) {
        throw new ComposeRefusal('bad-controlnet', `card '${cardId}' controlnet '${type}' step range = ${String(e.start_percent)}–${String(e.end_percent)}: numbers in [0, 1] with start <= end are required`);
    }
    try {
        assertControlNetSchedule(type, start, end);
    }
    catch (err) {
        throw new ComposeRefusal('controlnet-schedule', err.message);
    }
    const artifact = typeof e.artifact === "string" ? e.artifact : "";
    const image_b64 = typeof e.image_b64 === "string" ? e.image_b64 : "";
    const image = artifact !== "" ? artifact : image_b64;
    if (image === "") {
        throw new ComposeRefusal('bad-controlnet', `card '${cardId}' controlnet '${type}' carries no conditioning image (neither artifact nor image_b64) — a structure lock with no map is drift, not a skip`);
    }
    const enabled = e.enabled === undefined ? true : e.enabled;
    if (typeof enabled !== "boolean") {
        throw new ComposeRefusal('bad-controlnet', `card '${cardId}' controlnet '${type}' enabled = ${String(e.enabled)}: a boolean is required`);
    }
    return {
        type, model: row.filename, preprocessor: row.preprocessor ?? noted ?? "",
        image_b64, artifact, image, strength, start_percent: start, end_percent: end, enabled,
    };
}
//# sourceMappingURL=serviceMods.js.map
