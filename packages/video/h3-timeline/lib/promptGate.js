// promptGate.ts — the H3 prompt gate (the VID GEN handoff, operator
// 2026-11-12): fresh sessions wrote caption-grade calls, dialogue in
// prose, and the reference-audio rail armed for timing; the vendor
// guides and this card's own docs teach the opposite, but no door
// carried the law. This module IS the door's judge: `checkPress`
// ports the handoff's reference oracle (seven checks, eight
// acceptance cases — the oracle printed 8/8 before the port and the
// card's test runs the same cases) over the rules data at
// `src/agents/h3-prompt-dictionary.json`. ONE source, two
// consumers: the same rules file the skill documents in prose.
//
// The refusal message is the teaching — a refusal that only says
// "invalid prompt" teaches nothing, so every refusal names its rule
// id and carries the dictionary's message verbatim. Warnings never
// block; they and every NAMED WAIVER (params.prompt_waivers) ride
// the run record through the card's admissionWarns hook — a waiver
// is never silent.
import { ComposeRefusal } from '@melite/comfyui-card-kit/admission';
import dictionaryJson from './agents/h3-prompt-dictionary.json' with { type: 'json' };
/** The shipped rules — `src/agents/h3-prompt-dictionary.json`,
 * byte-verbatim from the handoff pack (the acceptance cases are the
 * oracle's contract; editing them here would fork the oracle). */
export const DICTIONARY = dictionaryJson;
/** The call texts off a press body. ABSENT text (undefined) is the
 * fresh-press admission — the one-window shape's text owner is
 * p.prompt itself, and absent means EMPTY conditioning, never a
 * refusal (the operator's 2026-09-17 fresh-press law, pinned in
 * card.spec M5). The gate judges AUTHORED text only: a written call
 * (even a blank string) is operator craft and rides every rule,
 * while a row nobody wrote text for is the admission, not a dodge —
 * its window conditions on p.prompt. Non-string rows also read as
 * not authored (the schema walk's own container refusals own
 * malformed docs; the gate judges text, never shape). */
const callTexts = (calls) => calls.map((c) => c !== null && typeof c === 'object' && typeof c.text === 'string'
    ? c.text
    : undefined);
/** Python str.split() semantics — whitespace runs collapse, no empty
 * tokens, so a padded or multi-spaced text counts its real words. */
const words = (t) => {
    const trimmed = t.trim();
    return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
};
/** The dictionary message with its {index}/{words} slots filled. */
const fill = (message, index, wordCount) => message.replace('{index}', String(index)).replace('{words}', String(wordCount ?? 0));
/** Match an inflected vendor verb: 'push in' also matches 'pushes
 * in' — each word takes an optional s/es, joined by whitespace
 * runs (the oracle's exact pattern). */
const verbHit = (low, verb) => new RegExp(`\\b${verb.split(' ').map((w) => `${w}(?:s|es)?`).join('\\s+')}\\b`).test(low);
/** CAMERA-VERB's own judgment: a vendor verb must appear, and every
 * verb outside rate_required_except must carry amplitude AND speed. */
const cameraRules = (text, rule) => {
    const low = text.toLowerCase();
    const hit = rule.verbs.find((v) => verbHit(low, v));
    if (hit === undefined)
        return { ok: false, why: 'no verb' };
    if ((rule.rate_required_except ?? []).includes(hit))
        return { ok: true, why: hit };
    const amp = /\b(small|large) amplitude\b/i.test(text);
    const spd = /\bat (slow|fast) speed\b/i.test(text);
    return amp && spd ? { ok: true, why: hit } : { ok: false, why: `${hit} without amplitude/speed` };
};
/** The gate: every rule judges the press body; waived rules ride as
 * waived findings (never silent, never blocking); the verdict is
 * refused when any refuse-severity finding stands, warned when any
 * warn-severity finding fired, else pass.
 * @param body the press body (calls, audio_clips, ref_audios, prompt_waivers)
 * @param dictionary the rules data (defaults to the shipped dictionary)
 * @returns the verdict and every finding, messages verbatim */
export function checkPress(body, dictionary = DICTIONARY) {
    const waivers = new Set(body.prompt_waivers?.filter((w) => typeof w === 'string') ?? []);
    const calls = body.calls ?? [];
    const texts = callTexts(calls);
    const rows = body.audio_clips ?? [];
    const armed = body.ref_audios ?? [];
    const rowCarriesText = rows.some((r) => r !== null && typeof r === 'object' && typeof r.text === 'string' && r.text !== '');
    const findings = [];
    for (const rule of dictionary.rules) {
        if (waivers.has(rule.id)) {
            findings.push({ rule: rule.id, severity: 'waived', waived: true });
            continue;
        }
        const messages = [];
        const kind = rule.check.kind;
        if (kind === 'min_words') {
            texts.forEach((t, i) => {
                if (t === undefined)
                    return; // fresh-press admission
                const n = words(t);
                if (n < rule.check.value)
                    messages.push(fill(rule.message, i, n));
            });
        }
        else if (kind === 'any_phrase') {
            texts.forEach((t, i) => {
                if (t === undefined)
                    return; // fresh-press admission
                const low = t.toLowerCase();
                if (!rule.check.values.some((p) => low.includes(p)))
                    messages.push(fill(rule.message, i));
            });
        }
        else if (kind === 'camera_verb') {
            texts.forEach((t, i) => {
                if (t === undefined)
                    return; // fresh-press admission
                const { ok, why } = cameraRules(t, rule.check);
                if (!ok)
                    messages.push(`${fill(rule.message, i)} (${why})`);
            });
        }
        else if (kind === 'forbid_phrase') {
            texts.forEach((t, i) => {
                if (t === undefined)
                    return; // fresh-press admission
                const low = t.toLowerCase();
                if (rule.check.values.some((p) => low.includes(p)))
                    messages.push(fill(rule.message, i));
            });
        }
        else if (kind === 'regex') {
            texts.forEach((t, i) => {
                if (t === undefined)
                    return; // fresh-press admission
                if (rule.check.values.some((p) => new RegExp(p, 'i').test(t)))
                    messages.push(fill(rule.message, i));
            });
        }
        else if (kind === 'spoken_form') {
            const { speaker, dialogue } = rule.check.require;
            texts.forEach((t, i) => {
                if (t === undefined)
                    return; // fresh-press admission
                if (/\bs(a|)ys\b|speaks\b|replie?s\b/.test(t) && !(new RegExp(speaker).test(t) && new RegExp(dialogue).test(t)))
                    messages.push(fill(rule.message, i));
            });
        }
        else if (kind === 'call_has_speech_without_rows') {
            const markers = rule.check.detect;
            texts.forEach((t, i) => {
                if (t === undefined)
                    return; // fresh-press admission
                const low = t.toLowerCase();
                if (markers.some((m) => low.includes(m)) && !rowCarriesText)
                    messages.push(fill(rule.message, i));
            });
        }
        else if (kind === 'armed_and_rows') {
            if (armed.length > 0 && rowCarriesText)
                messages.push(rule.message);
        }
        if (messages.length > 0)
            findings.push({ rule: rule.id, severity: rule.severity, messages });
    }
    const refused = findings.some((f) => f.severity === 'refuse');
    const warned = findings.some((f) => f.severity === 'warn');
    return {
        verdict: refused ? 'refused' : warned ? 'warned' : 'pass',
        findings,
    };
}
/** The admitted-doc entry: extracts the gate's own riders (each an
 * array or absent — the schema walk's container refusals own the
 * malformed shapes before the gate ever runs) and judges them.
 * @param p the admitted doc (calls, audio_clips, ref_audios, prompt_waivers)
 * @param dictionary the rules data (defaults to the shipped dictionary)
 * @returns the verdict and every finding, messages verbatim */
export function checkPressParams(p, dictionary = DICTIONARY) {
    return checkPress({
        calls: Array.isArray(p.calls) ? p.calls : [],
        audio_clips: Array.isArray(p.audio_clips) ? p.audio_clips : [],
        ref_audios: Array.isArray(p.ref_audios) ? p.ref_audios : [],
        prompt_waivers: Array.isArray(p.prompt_waivers) ? p.prompt_waivers : [],
    }, dictionary);
}
/** The compose door's half: a refused press throws with every
 * refusal's rule id and the dictionary's message verbatim — the
 * message is the teaching, never a bare 'invalid prompt'.
 * @param gate the verdict checkPress returned for this press */
export function refusePress(gate) {
    const refusals = gate.findings.filter((f) => f.severity === 'refuse');
    if (refusals.length === 0)
        return;
    const lines = refusals.flatMap((f) => f.messages.map((m) => `${f.rule}: ${m}`));
    throw new ComposeRefusal('prompt-gate', `h3-timeline prompt gate refused this press (${refusals.map((f) => f.rule).join(', ')}) — fix the call text or name a waiver in params.prompt_waivers:\n${lines.join('\n')}`);
}
/** The receipt's half: every warn finding and every named waiver as
 * one admission-warn line each — the start door stamps them on the
 * run record, so a waived rule or a craft miss is never silent.
 * @param p the admitted doc (the gate reads its own riders)
 * @returns the warn/waiver lines (empty when the press is clean) */
export function promptAdmissionWarns(p) {
    const gate = checkPressParams(p);
    const lines = [];
    for (const f of gate.findings) {
        if (f.severity === 'waived')
            lines.push(`prompt waiver: ${f.rule} — refused by default; waived by this press (params.prompt_waivers), recorded, never silent`);
        else if (f.severity === 'warn')
            for (const m of f.messages ?? [])
                lines.push(`prompt warn: ${f.rule}: ${m}`);
    }
    return lines;
}
//# sourceMappingURL=promptGate.js.map