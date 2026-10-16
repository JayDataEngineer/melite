// runsValidateInline.ts — inline edge/kind/branch validators split from
// runsValidate.ts (pure move, zero logic changes).
import { isRecord, isStringField } from "./runsGates.js";
import { FlowError, KIND_VOCAB, SKIP_VOCAB } from "./runsValidateShared.js";
// ── inline edges / kinds / branches ─────────────────────────────
export function edgeRef(e) {
    return e.kind === "initial" ? "__initial__." + e.key : e.stage + "." + e.output;
}
export function inlineKind(where, value) {
    // Leaf-type structure rides the admission gate (schemastery); the
    // closed-vocab membership + FlowError prose stay here (voice).
    if (!isStringField(value)) {
        throw new FlowError(where + ": kind " + JSON.stringify(value) + " is not a string");
    }
    if (!KIND_VOCAB.includes(value)) {
        throw new FlowError(where +
            ": " +
            JSON.stringify(value) +
            " is not a Kind — the closed vocabulary is " +
            JSON.stringify([...KIND_VOCAB]));
    }
    return value;
}
export function inlineEdge(where, value) {
    if (!isRecord(value)) {
        throw new FlowError(where +
            ": edge " +
            JSON.stringify(value) +
            ' is not an object — use {"initial": key} ' +
            'or {"stage": id, "output": name}');
    }
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === "initial") {
        // str(value["initial"]) — mirrors FromInitial(key=str(...));
        // the empty-string min_length refusal is faked byte-exact below.
        return { kind: "initial", key: String(value["initial"] ?? "") };
    }
    if (keys.length === 2 && keys.includes("stage") && keys.includes("output")) {
        const rec = value;
        return { kind: "stage", stage: String(rec["stage"] ?? ""), output: String(rec["output"] ?? "") };
    }
    throw new FlowError(where +
        ": edge keys " +
        JSON.stringify(keys) +
        ' are not an edge shape — exactly {"initial": key} ' +
        'or {"stage": id, "output": name}');
}
export function inlineSkip(where, value) {
    if (value === null || value === undefined)
        return null;
    if (!isRecord(value)) {
        throw new FlowError(where +
            ": skip_when " +
            JSON.stringify(value) +
            ' is not an object — use {"initial": ' +
            "key, \"when\": present|absent}");
    }
    const keys = Object.keys(value);
    if (keys.length !== 2 || !keys.includes("initial") || !keys.includes("when")) {
        throw new FlowError(where +
            ": skip_when keys " +
            JSON.stringify(keys) +
            ' are not a branch shape — exactly {"initial": key, ' +
            '"when": present|absent}');
    }
    const rec = value;
    const when = rec["when"];
    if (!isStringField(when) || !SKIP_VOCAB.includes(when)) {
        throw new FlowError(where +
            ": " +
            JSON.stringify(when) +
            " is not a branch condition — the closed vocabulary " +
            "is " +
            JSON.stringify([...SKIP_VOCAB]));
    }
    const initial = rec["initial"];
    if (!isStringField(initial) || initial === "") {
        throw new FlowError(where + ": skip initial " + JSON.stringify(initial) + " is not a non-empty string");
    }
    return { initial, when };
}
//# sourceMappingURL=runsValidateInline.js.map
