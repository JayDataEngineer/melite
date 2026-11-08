import { createUserMessage } from "@deepseek-ai/dsh-llm";
/** "provider/model" — the only spelling a route is ever named by. */
export function routeName(r) {
    return r.provider + '/' + r.model;
}
/** End-to-end deadline for one auxiliary completion (observed live: ~60s). */
export const ENHANCE_DEADLINE_MS = 180_000;
// NO maxTokens (2026-09-06, operator: "HOW DO I GET 502 MAX TOKENS
// ERROR?"): the fixed output cap was this door's own invention, and
// small-context routes reject input+cap combinations with a stream
// error ("max-tokens") — a whole failure class that exists ONLY
// because of the cap. The output contract (strict one-object JSON)
// bounds the reply; the deadline bounds time. Nothing else is sent.
/**
 * Resolve the harness model routes with ZERO configuration: every
 * registered provider route × its advertised models — INTERLEAVED
 * round-robin across providers (2026-09-05 fix: registration order
 * let ONE keyless provider with many advertised models eat the entire
 * attempt budget — observed live: six deepseek-official routes burned
 * before the credentialed xiaomi/zai/openrouter providers were ever
 * tried). The interleave order stays; the attempt budget that shaped
 * it is GONE with the walk it bounded (burn e, operator 2026-10-26:
 * the enhance dropdown "IS MISSING MANY MODELS" — the retire-the-walk
 * stroke left the 12-route slice behind as its only effect, and the
 * card's model picker + the matcher both read this list): a provider
 * with 50 advertised models showed 12. The list is COMPLETE now —
 * every route every provider advertises, nothing sliced.
 */
export async function resolveHarnessRoutes(llm) {
    // LlmProviderInfo: { id } is the route key GenerateOptions.provider wants.
    const providers = llm.listProviders();
    if (providers.length === 0) {
        throw new Error('enhance: no LLM adapter is registered in the harness host');
    }
    const perProvider = [];
    for (const p of providers) {
        try {
            const models = await llm.listModels(p.id);
            if (models.length > 0) {
                perProvider.push(models.map((m) => ({ provider: p.id, model: m.id })));
            }
        }
        catch { /* a provider that cannot enumerate is still usable — keep going */ }
    }
    // ROUND-ROBIN interleave: every provider's FIRST route rides ahead of
    // any provider's SECOND — provider variety up front, then the same
    // cadence to the END of the longest provider's list (never sliced).
    const routes = [];
    const longest = perProvider.reduce((n, list) => Math.max(n, list.length), 0);
    for (let i = 0; i < longest; i++) {
        for (const list of perProvider) {
            if (list[i])
                routes.push(list[i]);
        }
    }
    if (routes.length === 0) {
        throw new Error('enhance: no registered harness provider advertises any model');
    }
    return routes;
}
/**
 * One streaming completion on ONE exact route, assembled to text. Terminal
 * finish reasons other than 'stop' become thrown errors carrying the
 * provider failure message + code — never swallowed.
 */
export async function harnessCompleteOnRoute(llm, route, req) {
    const timeout = AbortSignal.timeout(ENHANCE_DEADLINE_MS);
    const signal = req.signal ? AbortSignal.any([req.signal, timeout]) : timeout;
    // The message rides createUserMessage (the DSH factory): a real
    // Message.id + a kind:'user' source — the old hand-built literal
    // had no id and a plugin source missing its ContextFormed
    // companion, tolerated only because adapters read role/content
    // (deep-audit harness finding #6, fixed 2026-09-10).
    const options = {
        provider: route.provider,
        model: route.model,
        messages: [
            createUserMessage({
                content: [{ type: 'text', text: req.prompt }],
                source: { kind: 'user' },
            }),
        ],
        system: req.system + OUTPUT_CONTRACT,
        ...(req.temperature !== undefined && Number.isFinite(req.temperature) ? { temperature: req.temperature } : {}),
        signal,
    };
    // The text join is a DELIBERATE hand-roll, not an oversight (the
    // audit's 4.5 record, 2026-10-12): dsh-llm's BlockAssembler is the
    // canonical assembler, but its contract defaults a finish-less
    // stream to {kind:'stop'} and owns block semantics, while this
    // door's tests pin the OPPOSITE teeth — malformed deltas
    // (non-string text, unknown chunk types) are ignored, and a
    // stream with no terminal finish THROWS. Porting would trade
    // those pinned loud refusals for the assembler's quiet defaults.
    let text = '';
    let finish = null;
    for await (const chunk of llm.stream(options)) {
        if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
            text += chunk.text;
        }
        else if (chunk.type === 'finish') {
            // StreamChunk finish: { type:'finish', reason: FinishReason } where
            // FinishReason = { kind: 'stop'|'error'|'aborted'|…, failure? }.
            const r = chunk.reason;
            finish = {
                kind: typeof r?.kind === 'string' ? r.kind : JSON.stringify(r ?? null),
                failure: r?.failure,
            };
        }
    }
    if (finish === null) {
        throw new Error('enhance: the harness model stream ended without a terminal finish');
    }
    if (finish.kind !== 'stop') {
        // Route-named failure (2026-09-06): the operator must SEE which
        // model 502'd — an anonymous "max-tokens" taught nothing.
        const detail = finish.failure ? finish.failure.message + ' [' + (finish.failure.code ?? '?') + ']' : finish.kind;
        throw new Error('enhance: ' + routeName(route) + ' failed — ' + detail);
    }
    return text;
}
/**
 * The door's WIRE CONTRACT, appended to EVERY recipe (2026-09-06,
 * live-caught 1:1: the image model's form-spec recipe is pure
 * structure rules — no output-format word in it — so the model
 * answered "**Prompt:** …" prose and the JSON parse 502'd). The
 * {positive, negative} JSON shape is THIS door's requirement, so
 * THIS door guarantees it, whatever the per-model recipe says.
 */
export const OUTPUT_CONTRACT = '\n\nOutput contract: reply with ONLY a JSON object '
    + '{"positive": "<the rewritten prompt>", "negative": "<what to avoid, or empty string>"} '
    + '— no prose, no markdown, nothing outside the JSON.';
/**
 * Match a caller-named route against the live list. Exact
 * "provider/model" wins; a bare "model" must be unambiguous (two
 * providers advertising it is a 400 naming both — guessing between
 * providers is how silent-DeepSeek happens). Unknown → throw with
 * the live list (the route turns it into a 400, never a walk).
 *
 * `{ quiet: true }` (the preference arm): an unresolvable or
 * ambiguous name returns undefined instead of throwing — a
 * preference is an ordered candidate, so the caller skips to its
 * next arm; every resolve rule above is unchanged.
 *
 * Version-tail tolerance (2026-09-06, live-caught): the settings
 * default names glm-5.3 while the provider advertises glm-4.7 —
 * a newer default than the live provider list carries. The named
 * model is RESOLVED, never walked: same provider, its NEWEST
 * advertised model below the named one in the family line. If the
 * provider itself is absent, or nothing matches, the failure stays
 * loud with the live list. This is resolution of the user's own
 * default, not a fallback to a DIFFERENT provider's model.
 */
export function matchHarnessRoute(routes, want, opts) {
    const exact = routes.find((r) => routeName(r) === want);
    if (exact)
        return exact;
    const bare = routes.filter((r) => r.model === want);
    if (bare.length === 1)
        return bare[0];
    if (bare.length > 1) {
        if (opts?.quiet === true)
            return undefined;
        throw new Error('enhance: ambiguous llm "' + want + '" — advertised by '
            + bare.map(routeName).join(', ') + '; name provider/model');
    }
    // Same-provider family resolution: the named model's provider with
    // its newest advertised variant (glm-5.3 → zai's newest glm line).
    const provider = want.split('/')[0];
    const family = want.split('/')[1] ?? '';
    const stem = family.replace(/[-.][0-9]+.*$/, '').toLowerCase();
    if (stem !== '') {
        const sameProvider = routes.filter((r) => r.provider === provider);
        const familyRoutes = sameProvider.filter((r) => r.model.toLowerCase() === stem
            || r.model.toLowerCase().startsWith(stem + '-')
            || r.model.toLowerCase().startsWith(stem + '.'));
        if (familyRoutes.length > 0) {
            // Highest version tail wins (glm-4.5-air < glm-4.7); no tail = 0.
            const ver = (m) => {
                const t = /[-.]v?([0-9]+(?:[._][0-9]+)*)/.exec(m);
                return t ? Number.parseFloat(t[1].replace('_', '.')) : 0;
            };
            return familyRoutes.reduce((best, r) => (ver(r.model) > ver(best.model) ? r : best));
        }
    }
    const live = routes.map(routeName).join(', ');
    if (opts?.quiet === true)
        return undefined;
    throw new Error('enhance: unknown llm route "' + want
        + '" — live routes: ' + live);
}
/**
 * Recipe + prompt in, {positive, negative, via} out. THE one enhance
 * call. NO WALK, NO FALLBACKS (queue lane law, operator 2026-09-06:
 * "No fallbacks. Ever." — the first-breathing walk is what served
 * DeepSeek/minimax by luck of registration order and provider
 * health):
 *
 *   - explicit req.llm names the route, else defaultLlm (the
 *     agentDefaultModel service's live selection — the user's own
 *     default) names it. Explicit wins; NEITHER walks.
 *   - preference (operator order, "muse-spark-1.3-contributor i
 *     want to use over glm-5v-turbo"): a route name the door
 *     prefers BETWEEN explicit and the host default. An ordered
 *     candidate, not a contract — a name that does not resolve
 *     against the live list is SKIPPED (the default arm serves);
 *     a named-live preference that fails to complete is still the
 *     honest 502 (no step-past, ever).
 *   - unresolvable name → throw naming the live routes (the route
 *     maps explicit→400, stale default→502).
 *   - the ONE route completes; its failure is the honest error
 *     (502 naming route + cause) — never a silent other model.
 *
 * `via` echoes the serving route. This is the keystore era's shape
 * (one configured model, loud otherwise) with the model resolved
 * from the host default instead of the retired keystore.
 */
export async function harnessEnhance(llm, req, defaultLlm, preference) {
    const routes = await resolveHarnessRoutes(llm);
    const explicit = typeof req.llm === 'string' && req.llm.length > 0 ? req.llm : undefined;
    if (explicit !== undefined) {
        // non-quiet match: throws through on any unresolvable name.
        const route = matchHarnessRoute(routes, explicit);
        const text = await harnessCompleteOnRoute(llm, route, req);
        return { ...parseEnhanceJson(text), via: routeName(route) };
    }
    // The preference arm: resolve-or-skip — a name that cannot resolve
    // against the live list falls through to the default arm (a
    // preference is an ordered candidate, never a contract).
    if (typeof preference === 'string' && preference.length > 0) {
        const preferred = matchHarnessRoute(routes, preference, { quiet: true });
        if (preferred !== undefined) {
            const text = await harnessCompleteOnRoute(llm, preferred, req);
            return { ...parseEnhanceJson(text), via: routeName(preferred) };
        }
    }
    if (typeof defaultLlm === 'string' && defaultLlm.length > 0) {
        // non-quiet match: a stale default throws (the 502 law).
        const route = matchHarnessRoute(routes, defaultLlm);
        const text = await harnessCompleteOnRoute(llm, route, req);
        return { ...parseEnhanceJson(text), via: routeName(route) };
    }
    throw new Error('enhance: no llm named and no host default configured — '
        + 'name llm ("provider/model") or set the host default model');
}
/**
 * Parse the recipe's STRICT JSON reply ({positive, negative}) out of model
 * text: direct parse, then fenced, then first-brace slice. All fail → throw
 * with the raw head (honest failure, never a silent whole-text positive).
 */
export function parseEnhanceJson(text) {
    const attempts = [text, text.replace(/^```(?:json)?\s*|\s*```$/g, ''), text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)];
    for (const attempt of attempts) {
        try {
            const obj = JSON.parse(attempt);
            if (obj !== null && typeof obj === 'object' && typeof obj.positive === 'string') {
                return { positive: obj.positive, negative: typeof obj.negative === 'string' ? obj.negative : '' };
            }
        }
        catch { /* next shape */ }
    }
    throw new Error('enhance: the model reply was not the recipe JSON — head: ' + text.slice(0, 160));
}
//# sourceMappingURL=llm-complete.js.map
