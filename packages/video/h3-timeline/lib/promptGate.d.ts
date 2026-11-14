/** One call row as the gate reads it (text is the judged field; the
 * film coordinates ride for the receipt's sake). */
export interface GateCall {
    readonly text?: unknown;
}
/** The press body the gate judges — the admitted doc's own riders. */
export interface PressBody {
    readonly calls?: readonly unknown[];
    readonly audio_clips?: readonly unknown[];
    readonly ref_audios?: readonly unknown[];
    readonly prompt_waivers?: readonly unknown[];
}
type RuleCheck = {
    kind: 'min_words';
    value: number;
} | {
    kind: 'any_phrase';
    values: string[];
} | {
    kind: 'camera_verb';
    verbs: string[];
    rate_required_except?: string[];
} | {
    kind: 'forbid_phrase';
    values: string[];
} | {
    kind: 'regex';
    values: string[];
} | {
    kind: 'spoken_form';
    require: {
        speaker: string;
        dialogue: string;
    };
} | {
    kind: 'call_has_speech_without_rows';
    detect: string[];
} | {
    kind: 'armed_and_rows';
};
interface GateRule {
    readonly id: string;
    readonly severity: 'refuse' | 'warn';
    readonly scope: 'call' | 'film';
    readonly check: RuleCheck;
    readonly message: string;
}
export interface AcceptanceCase {
    readonly name: string;
    readonly input: Record<string, unknown>;
    readonly expect: Record<string, unknown>;
}
export interface PromptDictionary {
    readonly version: number;
    readonly name: string;
    readonly rules: readonly GateRule[];
    readonly acceptance_cases: readonly AcceptanceCase[];
}
/** The shipped rules — `src/agents/h3-prompt-dictionary.json`,
 * byte-verbatim from the handoff pack (the acceptance cases are the
 * oracle's contract; editing them here would fork the oracle). */
export declare const DICTIONARY: PromptDictionary;
/** One rule's verdict for one press. `waived` findings never block —
 * they are the receipt's record that a refused-by-default rule was
 * named in params.prompt_waivers. */
export interface GateFinding {
    readonly rule: string;
    readonly severity: 'refuse' | 'warn' | 'waived';
    readonly waived?: boolean;
    readonly messages?: readonly string[];
}
export interface PressVerdict {
    readonly verdict: 'refused' | 'warned' | 'pass';
    readonly findings: readonly GateFinding[];
}
/** The gate: every rule judges the press body; waived rules ride as
 * waived findings (never silent, never blocking); the verdict is
 * refused when any refuse-severity finding stands, warned when any
 * warn-severity finding fired, else pass.
 * @param body the press body (calls, audio_clips, ref_audios, prompt_waivers)
 * @param dictionary the rules data (defaults to the shipped dictionary)
 * @returns the verdict and every finding, messages verbatim */
export declare function checkPress(body: PressBody, dictionary?: PromptDictionary): PressVerdict;
/** The admitted-doc entry: extracts the gate's own riders (each an
 * array or absent — the schema walk's container refusals own the
 * malformed shapes before the gate ever runs) and judges them.
 * @param p the admitted doc (calls, audio_clips, ref_audios, prompt_waivers)
 * @param dictionary the rules data (defaults to the shipped dictionary)
 * @returns the verdict and every finding, messages verbatim */
export declare function checkPressParams(p: Record<string, unknown>, dictionary?: PromptDictionary): PressVerdict;
/** The compose door's half: a refused press throws with every
 * refusal's rule id and the dictionary's message verbatim — the
 * message is the teaching, never a bare 'invalid prompt'.
 * @param gate the verdict checkPress returned for this press */
export declare function refusePress(gate: PressVerdict): void;
/** The receipt's half: every warn finding and every named waiver as
 * one admission-warn line each — the start door stamps them on the
 * run record, so a waived rule or a craft miss is never silent.
 * @param p the admitted doc (the gate reads its own riders)
 * @returns the warn/waiver lines (empty when the press is clean) */
export declare function promptAdmissionWarns(p: Record<string, unknown>): readonly string[];
export {};
//# sourceMappingURL=promptGate.d.ts.map
