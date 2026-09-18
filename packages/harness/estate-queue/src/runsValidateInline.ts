// runsValidateInline.ts — inline edge/kind/branch validators split from
// runsValidate.ts (pure move, zero logic changes).
import { isRecord, isStringField } from "./runsGates.ts";
import { FlowError, KIND_VOCAB, SKIP_VOCAB } from "./runsValidateShared.ts";
import type { Edge, StageSkip } from "./runsValidateShared.ts";
import { pyReprJson, pyReprStr, pyReprStrList, pyStr } from "./runsValidatePyRepr.ts";

// ── inline edges / kinds / branches ─────────────────────────────

export function edgeRef(e: Edge): string {
  return e.kind === "initial" ? "__initial__." + e.key : e.stage + "." + e.output;
}

export function inlineKind(where: string, value: unknown): string {
  // Leaf-type structure rides the admission gate (schemastery); the
  // closed-vocab membership + FlowError prose stay here (py voice).
  if (!isStringField(value)) {
    throw new FlowError(where + ": kind " + pyReprJson(value) + " is not a string");
  }
  if (!(KIND_VOCAB as readonly string[]).includes(value)) {
    throw new FlowError(
      where +
        ": " +
        pyReprStr(value) +
        " is not a Kind — the closed vocabulary is " +
        pyReprJson([...KIND_VOCAB]),
    );
  }
  return value;
}

export function inlineEdge(where: string, value: unknown): Edge {
  if (!isRecord(value)) {
    throw new FlowError(
      where +
        ": edge " +
        pyReprJson(value) +
        ' is not an object — use {"initial": key} ' +
        'or {"stage": id, "output": name}',
    );
  }
  const keys: string[] = Object.keys(value);
  if (keys.length === 1 && keys[0] === "initial") {
    // str(value["initial"]) — mirrors FromInitial(key=str(...));
    // the empty-string min_length refusal is faked byte-exact below.
    return { kind: "initial", key: pyStr((value as Record<string, unknown>)["initial"]) };
  }
  if (keys.length === 2 && keys.includes("stage") && keys.includes("output")) {
    const rec: Record<string, unknown> = value as Record<string, unknown>;
    return { kind: "stage", stage: pyStr(rec["stage"]), output: pyStr(rec["output"]) };
  }
  throw new FlowError(
    where +
      ": edge keys " +
      pyReprStrList(keys) +
      ' are not an edge shape — exactly {"initial": key} ' +
      'or {"stage": id, "output": name}',
  );
}

export function inlineSkip(where: string, value: unknown): StageSkip | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) {
    throw new FlowError(
      where +
        ": skip_when " +
        pyReprJson(value) +
        ' is not an object — use {"initial": ' +
        "key, \"when\": present|absent}",
    );
  }
  const keys: string[] = Object.keys(value);
  if (keys.length !== 2 || !keys.includes("initial") || !keys.includes("when")) {
    throw new FlowError(
      where +
        ": skip_when keys " +
        pyReprStrList(keys) +
        ' are not a branch shape — exactly {"initial": key, ' +
        '"when": present|absent}',
    );
  }
  const rec: Record<string, unknown> = value;
  const when: unknown = rec["when"];
  if (!isStringField(when) || !(SKIP_VOCAB as readonly string[]).includes(when)) {
    throw new FlowError(
      where +
        ": " +
        pyReprJson(when) +
        " is not a branch condition — the closed vocabulary " +
        "is " +
        pyReprJson([...SKIP_VOCAB]),
    );
  }
  const initial: unknown = rec["initial"];
  if (!isStringField(initial) || initial === "") {
    throw new FlowError(
      where + ": skip initial " + pyReprJson(initial) + " is not a non-empty string",
    );
  }
  return { initial, when };
}
