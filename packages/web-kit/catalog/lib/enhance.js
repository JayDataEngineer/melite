import { apiFetch, externalUrl } from "./api.js";
/**
 * The card's model picker source (2026-09-06): the LIVE route list
 * off the proof route — never a restated copy. Null when this
 * editor is NOT under a DSH host (no picker renders).
 */
export async function fetchEnhanceRoutes(signal) {
    let res;
    try {
        res = await apiFetch(externalUrl("/melite-tools/catalog"), { method: "GET", signal });
    }
    catch (e) {
        // R-S8 (2026-10-22): a null here HIDES the model picker — the
        // operator sees "no picker" with no trace of why. Logged, not silent.
        console.error("[enhance] fetchEnhanceRoutes fetch failed (picker hidden):", e);
        return null;
    }
    if (!res.ok) {
        console.error(`[enhance] fetchEnhanceRoutes non-ok ${res.status} (picker hidden)`);
        return null;
    }
    try {
        const data = (await res.json());
        if (!Array.isArray(data.llmRoutes)) {
            console.error("[enhance] fetchEnhanceRoutes body carried no llmRoutes array (picker hidden)");
            return null;
        }
        const routes = data.llmRoutes.filter((r) => typeof r === "string" && r.length > 0);
        return routes.length > 0 ? routes : null;
    }
    catch (e) {
        console.error("[enhance] fetchEnhanceRoutes body parse failed (picker hidden):", e);
        return null;
    }
}
/** Normalize a display/model name for matching: lowercase, keep
 * alphanumerics and dots ("GLM 4.7" / "glm-4.7" → "glm4.7"). */
function normName(s) {
    return s.toLowerCase().replace(/[^a-z0-9.]/g, "");
}
/** Is this editor embedded under the DSH GUI (same-origin parent)?
 * Standalone → false (no picker exists; the host default serves). */
export function isEmbedded() {
    try {
        return window.parent !== window;
    }
    catch {
        return false;
    }
}
/**
 * Parse the picker trigger's aria-label (the LIVE-PROBED contract,
 * 2026-09-06: `Select model, current <NAME>, reasoning effort <E>`).
 * Returns the model display name, or null when the label doesn't
 * carry a current selection.
 */
export function parsePickerAria(label) {
    const m = /select model,\s*current\s+(.+?)(?:,\s*reasoning|$)/i.exec(label);
    if (!m)
        return null;
    // Group 1 always participates when the overall match succeeds (a required
    // capture), so m[1] is a string here — no `?.` (which would be dead).
    const name = m[1].trim();
    return name.length > 0 ? name : null;
}
/**
 * Read the GUI picker's CURRENT selection from the parent page
 * (2026-09-06, operator order: the button auto-follows the model I
 * have selected). The card iframe is same-origin with the DSH GUI.
 * Anchor (live-probed on the deployed build): the trigger button's
 * aria-label "Select model, current <NAME>, reasoning effort …" —
 * an accessible contract, not a CSS-module hash (the `*modelName*`
 * class probe found ZERO elements on the real page). Fallback: the
 * trigger's `*triggerLabel*` span text. Standalone/cross-origin →
 * null (host default serves).
 */
export function readPickerModel() {
    try {
        const parent = window.parent;
        if (!parent || parent === window)
            return null;
        const doc = parent.document;
        if (!doc)
            return null;
        for (const btn of Array.from(doc.querySelectorAll("button[aria-label]"))) {
            const name = parsePickerAria(btn.getAttribute("aria-label") ?? "");
            if (name)
                return name;
        }
        const labels = Array.from(doc.querySelectorAll('[class*="triggerLabel"]'))
            .filter((el) => (el.textContent ?? "").trim().length > 0 && el.getClientRects().length > 0);
        const last = labels[labels.length - 1];
        // PROOF the `?? ""` is dead here (dropped, not ignored): the filter
        // above keeps only elements whose textContent trims to a non-empty
        // string — null/blank textContent trims to "" and is dropped — so
        // last.textContent is a string when last exists.
        return last ? last.textContent.trim() : null;
    }
    catch {
        return null; // cross-origin or no parent — host default serves
    }
}
/**
 * Map the picker's display name onto one LIVE route
 * ("provider/model"). Exact normalized model equality first, then a
 * unique prefix ("Muse Spark" → muse-spark-1.3-contributor).
 * Ambiguous or unmatched → null (never a guess).
 */
export function resolvePickerRoute(routes, pick) {
    const want = normName(pick);
    if (want.length === 0)
        return null;
    const models = routes.map((r) => {
        const i = r.indexOf("/");
        return { route: r, model: normName(i >= 0 ? r.slice(i + 1) : r) };
    });
    const exact = models.filter((m) => m.model === want);
    if (exact.length === 1)
        return exact[0].route;
    if (exact.length > 1)
        return null;
    const prefix = models.filter((m) => m.model.startsWith(want));
    if (prefix.length === 1)
        return prefix[0].route;
    return null;
}
/**
 * THE DeepSeek-harness door (2026-08-22): POST /melite-tools/enhance on the DSH
 * host — same origin from the chat embed — completes the enhancement with the
 * harness's OWN model (ctx.llm). NO keystore key involved, so inside the GUI
 * the Enhance button can never answer "no model". Returns null when this
 * editor is NOT running under the DSH host (standalone dev :5173 — the
 * route isn't there; Vite SPA-fallbacks answer HTML), letting the caller use
 * the keystore flow.
 */
async function enhanceViaHarness(systemPrompt, prompt, llm, signal) {
    let res;
    try {
        // NOTE: no temperature spread — the sole caller (enhancePrompt) has no
        // temperature to send (proven 2026-09-12: the only call passes
        // (systemPrompt, prompt, llm)); a conditional spread here would carry a
        // dead arm. agentEnhance below keeps its own temperature spread.
        res = await apiFetch(externalUrl("/melite-tools/enhance"), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal,
            body: JSON.stringify({
                system_prompt: systemPrompt,
                prompt: prompt,
                ...(llm !== undefined && llm.length > 0 ? { llm } : {}),
            }),
        });
    }
    catch (e) {
        // Host unreachable — not a harness answer. R-S8 (2026-10-22): every
        // null-fold logs now; the fold fed a MISDIAGNOSIS downstream.
        console.error("[enhance] enhance fetch failed (folding to the no-door verdict):", e);
        return null;
    }
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    }
    catch {
        // Non-JSON body: an HTML/SPA fallback (no harness route here) — or a
        // transient gateway 502 page under the GUI. R-S8: WHICH one it is
        // depends on context, and enhancePrompt must not guess. Return the
        // marked transient verdict when the host ANSWERED non-ok under an
        // embedded context; the standalone guidance stays for the rest.
        console.error(`[enhance] enhance answered non-JSON (status ${res.status}, body ${text.slice(0, 120)})`);
        if (!res.ok && isEmbedded()) {
            const err = new Error(`Enhancement unavailable right now (the app host answered ${res.status} with a non-JSON body — likely transient; retry)`);
            err.name = "EnhanceTransientError";
            throw err;
        }
        return null; // HTML/SPA fallback or empty body — no harness route here
    }
    if (typeof data.error === "string" && data.error.length > 0) {
        // OUR route answered (JSON error shape) — surface it honestly.
        throw new Error(`Enhancement failed (${res.status}): ${data.error.slice(0, 200)}`);
    }
    if (!res.ok) {
        console.error(`[enhance] enhance answered JSON but not-ok ${res.status} with no error field`);
        if (isEmbedded()) {
            const err = new Error(`Enhancement unavailable right now (the app host answered ${res.status}; likely transient — retry)`);
            err.name = "EnhanceTransientError";
            throw err;
        }
        return null;
    }
    const positive = String(data.positive ?? "").trim();
    const negative = String(data.negative ?? "").trim();
    if (!positive) {
        console.error(`[enhance] enhance answered ok but carried no positive prompt (via ${typeof data.via === "string" ? data.via : "?"})`);
        return null;
    }
    return {
        positive,
        negative,
        via: typeof data.via === "string" && data.via.length > 0 ? data.via : "?",
    };
}
export async function enhancePrompt(systemPrompt, prompt, llm, signal) {
    // The harness door — the ONLY enhance path. Zero configuration inside
    // the DSH GUI; standalone editors get an honest error (no fallback).
    // llm names the caller's harness route ("provider/model"); absent =
    // host default walk. The result's `via` says who actually answered.
    const harnessed = await enhanceViaHarness(systemPrompt, prompt, llm, signal);
    if (harnessed !== null)
        return harnessed;
    // Only the genuinely-unanswered shape lands here (host unreachable, or
    // a non-JSON answer that embedded context did NOT claim as transient).
    throw new Error("Prompt enhance runs inside the DeepSeek app (/melite-tools/enhance " +
        "not answered here)");
}
/**
 * AGENT ENHANCE (2026-08-22) — the ✦ Agent Enhance button's wire.
 * POST /melite-tools/enhance {model, prompt} on the DSH host: the agent
 * system's orchestration core sweeps EVERY declared enhance field of the
 * model (each with its own recipe) over the harness model in one press and
 * returns results keyed by field name. NO keystore key involved. Requires
 * the DSH app — standalone editors get an honest error.
 */
export async function agentEnhance(model, prompt, temperature, llm, signal) {
    const res = await apiFetch(externalUrl("/melite-tools/enhance"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
            model,
            prompt,
            ...(temperature !== undefined ? { temperature } : {}),
            ...(llm !== undefined && llm.length > 0 ? { llm } : {}),
        }),
    });
    if (!res.ok) {
        const body = await res.text();
        let msg = body.slice(0, 200);
        try {
            const parsed = JSON.parse(body);
            if (typeof parsed.error === "string")
                msg = parsed.error;
        }
        catch {
            // Non-JSON answer = no /melite-tools door here (standalone editor).
            msg = "Agent Enhance runs inside the DeepSeek app — use Enhance here.";
        }
        throw new Error(`Agent Enhance failed (${res.status}): ${msg}`);
    }
    const data = (await res.json());
    const results = {};
    for (const [field, v] of Object.entries(data.results ?? {})) {
        results[field] = {
            positive: String(v?.positive ?? "").trim(),
            negative: String(v?.negative ?? "").trim(),
            via: typeof v?.via === "string" && v.via.length > 0 ? v.via : "?",
        };
    }
    return results;
}
//# sourceMappingURL=enhance.js.map
