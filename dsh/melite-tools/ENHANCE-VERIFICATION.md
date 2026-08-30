# melite-tools — enhance on THE HARNESS MODEL (2026-08-22, rev 2)

> AGENTS.md §0 law: raw command + verbatim output for every claim.
> Operator verdict that drove this revision: enhance must ride the DeepSeek
> harness's own model (ctx.llm) — it must NEVER answer "no model" because
> the host that converses at all always has a registered route. The
> keystore/OpenRouter plane is gone from this path entirely.

## Architecture (one execution core, two doors)

    dsh/melite-tools/src/llm-complete.ts      ← THE core: resolveHarnessRoutes →
                                             harnessCompleteOnRoute (ctx.llm
                                             stream) → parseEnhanceJson
      ├─ tool   enhance_prompt             ← model-facing; form-spec recipes;
      │                                      multi-field agent mode
      └─ route  POST /melite-tools/enhance    ← the editor ✦ button's door
                                             (chat embed = same origin)

Route resolution is ZERO-config: every registered provider × advertised
model in registration order; a dead route (quota/auth) is STEPPED PAST —
the first healthy route serves. All routes dead → one error naming every
failure. There is no keystore lookup anywhere on this path.

## Live proof — real completion through the harness model

Disposable DSH instance (:3082, isolated DSH_HOME seeded from ~/.dsh):

    $ curl -s -w "\n[HTTP %{http_code} in %{time_total}s]" --max-time 300 \
        -X POST http://127.0.0.1:3082/melite-tools/enhance \
        -H 'content-type: application/json' -d @/tmp/enh-req.json | tail -c 900
    …Arrangement sections: Groove & Foundation Progression … Embellishments,
    Textures & Spatial FX …","negative":""}
    [HTTP 200 in 36.279838s]

(The body carried music3's caption recipe from /v1/form-spec — the SSOT.)

The route walk proven live: this deployment's first registered route was
quota-dead and the walker stepped past it:

    earlier attempt (pre-walk build): {"error":"enhance: harness model call
    failed — Weekly usage limit reached. Resets in 1 day. … [QUOTA]"} [HTTP 502]
    post-walk build:                  [HTTP 200 in 36.279838s]  ← next route served

Failure paths (verbatim):

    malformed body  → {"error":"body must be JSON: {system_prompt, prompt, temperature?}"} [400]
    missing prompt  → {"error":"system_prompt and prompt are required strings"} [400]

Registration proof:

    $ curl -s http://127.0.0.1:3082/melite-tools/catalog | jq '.tools[].name'
    "model_catalog"
    "build_pipeline"
    "enhance_prompt"

## Tool logic (deterministic fake-seam harness, verbatim)

    [1] {"model":"music3","positive":"","fields":["prompt","lyrics"]}     ← agentic listing
    [2] {"model":"music3","field":"lyrics","positive":"ENHANCED(stealth/ox-alpha)","negative":""}
                                                                          ← walked past the dead route
    [3] melite gateway 404 …/v1/form-spec?model=nope: {"error":"Unknown model: nope"}
    [4] enhance_prompt: model "z-image" declares no recipe for field "banjo" — declared fields: prompt
    [5] enhance: every registered harness route failed — a/a-m: … [PROVIDER_DOWN] | b/b-m: … [PROVIDER_DOWN]

## Editor ✦ button ("just like before", now key-free under DSH)

- web/editor/packages/catalog/src/enhance.ts: enhancePrompt tries the
  /melite-tools/enhance door FIRST (harness model); only outside the DSH host
  (standalone :5173/:33081) does it fall back to /v1/llm/enhance + keystore.
  Our route's JSON errors surface honestly; non-JSON answers mean "no door
  here" and trigger the fallback.
- pipelineParamEditor.tsx: the early "Add an LLM key" gate is REMOVED —
  the client decides.

Suites (verbatim tails):

    $ npx vitest run src/__tests__/enhance.test.ts src/__tests__/enhancement-store.test.ts \
        src/__tests__/card-detail-one-ui.test.tsx src/__tests__/pipeline-card.test.tsx
     Test Files  4 passed (4)
          Tests  213 passed (213)

    $ npx tsc -p tsconfig.app.json --noEmit ; echo "tsc exit: $?"
    tsc exit: 0

## Gateway lane (unchanged from rev 1, still pinned)

- server-js/src/core/catalog/form_spec/enhance_prompts.ts walks EVERY
  plugins/*/models lane; music3 lyrics probe is model-key-first.
- server-js/tests/gate.enhance_prompts.test.ts: 5 pass.
- Full contract suite at time of change: 216 pass / 0 fail.


## 6. Agent Enhance (rev 3, 2026-08-22) — the sweep door

The ✦ Agent Enhance button (next to Enhance, in the card drill-down's
prompt block) POSTs /melite-tools/enhance {model, prompt}: the agent system's
orchestration core (dsh/melite-tools/src/enhance-agent.ts, shared with the
chat tool) sweeps EVERY declared field of the model — each with its own
recipe — over the harness model in one press.

Live (disposable instance :3082, verbatim):

    POST {model: "music3", prompt: "upbeat summer pop song about road trips"}
    → 200 in 48.896494s
      field lyrics -> 1396 chars | [intro] (Oh-oh-oh, windows down) …
      field prompt -> 2711 chars | Global Metadata Basic Attributes: Upbeat summer pop …

    POST {model: "h3", prompt: "a drone shot over neon tokyo at night, rain"}
    → 200 in 28.714820s
      field prompt -> 1898 chars | integrated_multimodal_description: [Shot 1] Live-action cinematic aerial footage …

Gate coverage (server-js/tests/gate.enhance_e2e.test.ts — 13 → 17 tests):
sweep music3 → both fields with their OWN recipes; single-field sweep
degenerates to one completion; unknown model → 502 verbatim; neither
model nor system_prompt → 400.

    $ bun test server-js/tests/gate.enhance_e2e.test.ts server-js/tests/gate.enhance_prompts.test.ts
      22 pass
      0 fail
