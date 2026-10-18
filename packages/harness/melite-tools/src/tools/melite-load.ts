// melite_load — Melite load (the rework, 2026-09-09): open ONE
// card or flow discovered via melite_discover. Returns the bundle:
// agents md + tool-call signature + tier-1 skill lines (+ model
// hints on cards — the boarded families' DECL identity, data FOR
// the card; prompt craft is the agent's own via melite_skill_read, and
// LLM-powered enhance is the user's ✦ door, never this bundle).
// Bodies stay behind melite_skill_read; quote the bundle digest you hold
// and skip reload on a match. Thin door wrapper (estateRequest).
import { MODIFIER_PACKS } from '../discovery.ts'
import { registryModel, theService } from '@melite/comfyui-cordis'
import type { SamplerEnvelope } from '@melite/contracts/laneRelations'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolCallView } from '@deepseek-ai/dsh-tools'
import type { JsonValue, ToolDefinition } from '../types.ts'
import type { Estate } from '../estate.ts'
import { jsonClean } from '../json-clean.ts'

const TIMEOUT_MS = 20_000

/** Canonical result — the typed mirror of output.schema (the music
 *  card's CardResult pattern: defineTool infers from the schema and
 *  checks the execute return against it). name/inference_type ride
 *  every shape (the refusal echoes the args); bundle is
 *  success-only. */
type LoadResult = {
  name: string;
  inference_type: string;
  bundle?: Record<string, JsonValue>;
  error?: string;
} & Record<string, JsonValue>;

export function meliteLoad(
  estate: Estate,
  // expandEstateDoors (the expansion seat) is optional AT THE BUILDER:
  // unit tests construct the tool to pin render/present paths, and the
  // seat law is index.spec's subject (the apply wiring always passes
  // it — a missed production wiring shows as doors never seating,
  // loud on the first catalog touch).
  opts: { headless?: boolean; expandEstateDoors?: () => void } = {},
): ToolDefinition {
  // PRESENTATION SEAT (§7 P7, the tool-presentation wall — one
  // seat for the invalid face): the presenter rides defineTool
  // validation, and defineTool's soft gate OWNS invalid args
  // (invalid → undefined, never throw). The pre-purge re-attach over
  // that gate (a second, ungated seat rendering the generic card for
  // junk) is deleted — conversion invariance (presentCall output must
  // not change) now reads against the gated face. execute validation
  // (ToolArgsError/INVALID_ARGS) is unaffected.
  const presentCall: (args: unknown) => ToolCallView = (args) => {
    const a = (args ?? {}) as { name?: unknown; inference_type?: unknown };
    const nm = typeof a.name === 'string' && a.name !== '' ? a.name : '?';
    return { card: 'generic', title: `Load ${nm}`, kind: 'search' };
  };
  // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
  // registry gains schema compilation + input validation
  // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
  // never had as a raw registration.
  const def = defineTool({
    name: 'melite_load',
    description:
      'Open ONE card or flow (discover it first with melite_discover). Args: name (the card id or flow name) +  THE EXPANSION LAW: the estate’s deeper doors (melite_view, comfy_manage, melite_skill_index, melite_skill_read, ledger_tail) seat themselves on this call — never missing, only deferred.'
      + 'inference_type (card | flow — a card or a flow tool call; nothing else executes). Returns the bundle: '
      + 'agents md, the tool-call signature (params_schema for cards; the prebuilt simplified signature for flows), '
      + 'tier-1 skill lines for the underlying skills (bodies load via melite_skill_read — write the prompts yourself from '
      + 'the craft you read), model hints on cards (the boarded checkpoints — description, each marked present:true|false: present means downloaded on this machine; absent-but-boarded models are OFFERED — prompt the user to download, or provision via comfy_manage provision_model) + pack hints (the card\'s declared ComfyUI extension packs, marked present:true|false|null — missing packs refuse the run: install via comfy_manage install_extension), '
      + 'and a stable bundle digest — quote it and skip reload on a match.',
    // ParameterSchemaSpec grammar: the map IS the implicit object root
    // (no type/properties wrapper), per-property `required: true`.
    parameters: {
      name: {
        type: 'string',
        description: 'The card id or flow name exactly as discovered.',
        required: true,
      },
      inference_type: {
        type: 'string',
        description: 'card | flow.',
        required: true,
      },
    },
    presentCall,
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          bundle: {
            type: 'object',
            additionalProperties: true,
            description: 'The opened bundle (name/kind/signature/agents/skills + stages/refs on flows, model_hints on cards, digest). Absent on refusal.',
          },
          // Ledger row 11 (2026-09-10): required = fields every return
          // shape carries (the refusal echoes the args); bundle is
          // success-only and stays optional.
          name: { type: 'string', description: 'Echo of the requested card id or flow name.', required: true },
          inference_type: { type: 'string', description: 'Echo of the requested inference_type.', required: true },
          error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
        },
      },
      render: (_args, value) => {
        const v = value as {
          bundle?: {
            name?: unknown; kind?: unknown; digest?: unknown
            signature?: {
              name?: unknown; model?: unknown; card?: unknown
              params_schema?: { properties?: Record<string, unknown>; required?: unknown }
              modifiers?: Array<{ kind?: unknown; category?: unknown; fields?: unknown[] }>
              // THE LANE CONTRACT (2026-10-10): family atom → the
              // family's declared base surface, its relation words,
              // and its per-variant additions — served by
              // /v1/card-tools (the agent's card manifest) and
              // rendered as the lane line below. Absent for legacy
              // families, which declare nothing.
              lanes?: Record<string, unknown>
            } | null
            agents?: Array<{ path?: unknown; text?: unknown }>
            skills?: Array<Record<string, unknown>>
            model_hints?: Array<{ description?: unknown; present?: unknown }>
            stages?: Array<Record<string, unknown>>
          }
          error?: string
        }
        if (v && typeof v.error === 'string') return [{ type: 'text', text: 'melite_load REFUSED: ' + v.error }]
        // THE BUNDLE RIDES (the render IS the model-facing tool response
        // — see melite-discover's render note): the follow-up call needs
        // the params keys (melite_flow's params) and the model ids (its
        // model arg) — counts alone leave the agent unable to compose
        // anything. Agents md rides verbatim (the estate already caps
        // it: 8 files / 32KB); the digest rides so a reload can be
        // skipped by quoting it.
        const b = v?.bundle ?? {}
        const str = (x: unknown): string => typeof x === 'string' ? x : ''
        // THE INTERFACE LAW (2026-09-13, the operator's agent-mode
        // breakdown + the follow-up correction): the NEXT-STEP hint
        // names a door THIS agent actually has. The browser interface
        // registers no melite_flow (compose-only), so pointing the
        // model at melite_flow there sends it hunting a phantom verb
        // until it breaks down. But compose-only is NOT a hand-off —
        // the browser agent is the live co-editor of the flow state
        // in the user's cards tab (right sidebar): it composes the
        // flow and keeps editing it as asked; runs start at the
        // user's Run press. Headless keeps the old line — it owns
        // the verb.
        // The hint follows the BUNDLE's own kind: a flow loaded in
        // browser mode is not benchable as a whole — its card stages
        // may be benched, its family.action stages compose when the
        // flow runs. Telling a flow's reader to add_stage sent
        // makers hunting a door that refuses (the honest split).
        const next = opts.headless === true
          ? 'open with melite_flow'
          : str(b.kind) === 'flow'
            ? 'it is a flow, not a card — drive it through the run doors; its card stages may also be benched with melite_construct (add_stage), and its family.action stages compose when the flow runs'
            : 'compose it with melite_construct (add_stage) — the bench state is live in the user\'s cards tab; keep editing it there; runs start at the user\'s Run press'
        const out: string[] = [`loaded ${str(b.kind) || '?'} ${str(b.name) || '?'} — ${next}`]
        // THE CARD ABSTRACTION LAW (operator 2026-09-21): during
        // inference the agent interfaces with the CARD, never the
        // model — the card bundle NEVER names family ids. The hints
        // ride as an operational count only; the model plane is
        // estate-internal.
        const hints = Array.isArray(b.model_hints) ? b.model_hints : []
        if (hints.length > 0) {
          const present = hints.filter((h) => h?.present === true).length
          out.push(`weights: ${present}/${hints.length} boarded checkpoints present on this machine (provisioning is the estate's business — compose the card)`)
        }
        const sig = b.signature
        if (sig !== null && sig !== undefined) {
          const props = sig.params_schema?.properties
          const keys = props !== undefined && props !== null ? Object.keys(props) : []
          const req = Array.isArray(sig.params_schema?.required)
            ? sig.params_schema.required.filter((r): r is string => typeof r === 'string') : []
          if (keys.length > 0) {
            const marked = keys.map((k) => req.includes(k) ? k + '*' : k)
            out.push('params: ' + marked.join(', ') + ' (* required)')
          }
          // THE MODS LINE (stroke 79 — the seam-law unification): the
          // same kinds the UI form-spec serves, one line for the
          // agent — the bags are compose-required on mod-owned cards,
          // and params alone leave the agent blind to them. The
          // category names the stacking law (ordered = array order
          // matters; standalone = own output).
          // THE FAMILY-PACK SEATS (022's self-critique #3, 2026-09-24):
          // the card's OWN declared kinds ride the signature; the
          // DECL-BOARDED packs (qvoice/qvoice_save on the tts card)
          // ride the families — the load line now serves BOTH, with
          // the param_key + field names the compose bag takes (the
          // grammar the maker had to grep card.ts for).
          const mods = Array.isArray(sig?.modifiers) ? sig.modifiers : []
          // THE PACK-SEAT FAMILIES (model-knob cure, 2026-10-18): the
          // bundle never names family ids (Card Abstraction Law) and
          // model_hints no longer carry id — the boarded families
          // arrive as the signature's semantic model style
          // (family:variant:cell) plus every style in its model enum;
          // bare legacy values read whole.
          const styleVals: unknown[] = [sig?.model]
          const modelProp = (sig?.params_schema?.properties as Record<string, unknown> | undefined)?.model as { enum?: unknown } | undefined
          if (Array.isArray(modelProp?.enum)) styleVals.push(...modelProp.enum)
          const seatFams: string[] = []
          for (const v of styleVals) {
            if (typeof v !== 'string' || v === '') continue
            const fam = v.split(':')[0]
            if (fam !== '' && !seatFams.includes(fam)) seatFams.push(fam)
          }
          const packSeats = familyPackSeats(
            seatFams,
            new Set(mods.map((m) => str(m?.kind))),
          )
          const modLines = mods.map((m) => {
            const kind = str(m?.kind) || '?'
            const cat = str(m?.category) || 'ordered'
            const fs = Array.isArray(m?.fields)
              ? m.fields.filter((f): f is string => typeof f === 'string') : []
            return kind + '[] (' + cat + (fs.length ? '; fields: ' + fs.join(', ') : '') + ')'
          })
          for (const p of packSeats) {
            modLines.push(p.kind + '[] (' + p.cardinality + '; fields: ' + p.fields.join(', ') + ')')
          }
          if (modLines.length > 0) {
            // THE CARD-MODE ENVELOPE (023's self-critique #2,
            // 2026-09-24): the maker guessed arrays-vs-flat and paid
            // a refusal-oracle turn on `qvoice_save`. Card-mode
            // melite_flow takes the absorbed mod FIELDS flat
            // top-level beside params — never under the pack key.
            // THE VARIANT SEAT (025's self-critique #4, 2026-09-24):
            // the maker guessed variant-in-params and got lucky —
            // state it: `variant`/`quant` ride INSIDE card-mode
            // params (the compose selects the lane off the body;
            // the engine never sees them).
            // THE TWO-GRAMMAR SPLIT (030's self-critique #2,
            // 2026-09-24): the old line stated BOTH grammars with no
            // mode owner — "arrays under the kind keys" vs "fields
            // flat, never under the pack key" read as opposite
            // instructions. They are the TWO MODES: bag-mode
            // (flow_inline/ad-hoc stages) takes arrays under the kind
            // keys; card-mode (melite_flow card) takes the FIELDS
            // flat inside params. Stated per-mode, never mingled.
            // THE BENCH-GRAMMAR-FIRST LAW (032/033, 2026-09-24): two
            // commissions burned a refusal + a remove/re-add cycle on
            // the mods copy because it LED with bag-mode arrays while
            // every maker composes on the BENCH (melite_construct
            // add_stage/patch), whose door REFUSES arrays under kind
            // keys — "its fields ride flat top-level: voice_name, …"
            // (the compose door's own voice, cardsCompose.ts). The
            // refusal taught better than the hint did. So the hint
            // now leads with the bench grammar and quotes the door.
            out.push('mods: ' + modLines.join(', ')
              + ' — THE BENCH GRAMMAR (melite_construct add_stage/patch, where you compose): mod FIELDS ride FLAT inside params (e.g. params {voice_name, qvoice}) — never keyed under the pack name, never at flow top-level. A pack key (e.g. qvoice_save) as a params key REFUSES at the compose door: the pack takes no key of its own, its fields ride flat top-level'
              + '; card-mode lane select: `variant`/`quant` ride INSIDE params (e.g. params {variant: \'customvoice\'}) while the stage\'s `model` selector rides top-level — the compose reads them off the body, the engine never sees them. ONE named exception: a card whose own doc reads the model FAMILY from params (tts: params {model: \'qwen3-tts-large\'} — the loaded card doc owns the seat spelling; follow it there)'
              + '; bag-mode arrays under the kind keys exist ONLY for flow_inline/ad-hoc stages (melite_flow {flow}, never the bench) — ordered kinds stack in array order, standalone kinds each provide their own output (the bag lives at param_key when it differs)')
            const keyed = packSeats.filter((p) => p.param_key !== p.kind)
            if (keyed.length > 0) {
              out.push('mod param_keys: ' + keyed.map((p) => p.kind + ' → ' + p.param_key + ' (entries: {' + p.fields.join(', ') + '})').join('; '))
            }
          }
          // THE LANE LINE (2026-10-10, the liar report's fix shape 2
          // on the agent's READ surface): which fields a lane accepts
          // is the DECL's declaration, and the bench door refuses
          // anything outside it — the agent used to learn that only
          // by hitting the refusal. One line per declaring family:
          // the family base, the variant additions, and the relation
          // words as the field pairs they bind. Absent for legacy
          // families, which declare nothing.
          // THE ROW TYPES ARE THE DECL'S (2026-10-10, the DECL
          // audit's row 1): `required` and `at_most_one` rows are
          // {fields, cure?} OBJECTS, not strings — the old
          // string[] cast rendered "[object Object]" into the agent
          // bundle for every tts lane — and VARIANT rows carry their
          // own relations/bounds (the serve rides them; the render
          // dropped them, so an agent composing from this bundle was
          // never told a variant tightens the law).
          type LaneRel = {
            requires?: Array<{ field?: unknown; needs?: unknown[] }>
            together?: Array<{ fields?: unknown[] }>
            conflicts?: Array<{ a?: unknown; b?: unknown }>
            either_or?: Array<{ groups?: unknown[][] }>
            required?: Array<{ fields?: unknown[]; any_of?: boolean }>
            at_most_one?: Array<{ fields?: unknown[] }>
          }
          type LaneBounds = Record<string, { min?: number; max?: number }>
          const lawWords = (rel: LaneRel | undefined, bounds: LaneBounds | undefined): string[] => {
            const words: string[] = []
            for (const r of rel?.requires ?? []) {
              const needs = Array.isArray(r?.needs) ? r.needs : []
              words.push('requires(' + String(r?.field) + ' → ' + needs.join(', ') + ')')
            }
            for (const t of rel?.together ?? []) {
              if (Array.isArray(t?.fields)) words.push('together(' + t.fields.join(' × ') + ')')
            }
            for (const c of rel?.conflicts ?? []) {
              words.push('conflicts(' + String(c?.a) + ' × ' + String(c?.b) + ')')
            }
            for (const e of rel?.either_or ?? []) {
              if (Array.isArray(e?.groups)) {
                words.push('either_or(' + e.groups.map((g) => '(' + g.join(' × ') + ')').join(' | ') + ')')
              }
            }
            for (const r of rel?.required ?? []) {
              if (!Array.isArray(r?.fields) || r.fields.length === 0) continue
              words.push(r.any_of === true
                ? 'required-one-of(' + r.fields.join(' | ') + ')'
                : 'required(' + r.fields.join(', ') + ')')
            }
            for (const m of rel?.at_most_one ?? []) {
              if (Array.isArray(m?.fields) && m.fields.length > 0) {
                words.push('at_most_one(' + m.fields.join(' | ') + ')')
              }
            }
            if (bounds !== null && bounds !== undefined && typeof bounds === 'object') {
              const spans = Object.entries(bounds)
                .map(([k, bb]) => k + ' ' + String(bb?.min ?? '..') + '…' + String(bb?.max ?? '..'))
              if (spans.length > 0) words.push('bounds(' + spans.join(', ') + ')')
            }
            return words
          }
          const sigLanes = sig.lanes as Record<string, { base?: unknown; relations?: LaneRel; variants?: Record<string, { params?: unknown[]; relations?: LaneRel; bounds?: LaneBounds; sampler_envelope?: Partial<SamplerEnvelope> | null }>; bounds?: LaneBounds }> | undefined
          if (sigLanes !== null && sigLanes !== undefined && typeof sigLanes === 'object') {
            for (const [fam, lane] of Object.entries(sigLanes)) {
              const base = Array.isArray(lane?.base) ? lane.base.filter((f): f is string => typeof f === 'string') : []
              const adds = Object.entries(lane?.variants ?? {})
                .map(([v, row]) => {
                  const params = Array.isArray(row?.params) ? row.params.join(', ') : ''
                  // the variant's SAMPLER DOMAIN rides the line as
                  // its bounds span (the DECL audit's gap 2 — the
                  // lane contract merges sampler_envelope into
                  // bounds, so one spelling speaks the domain; an
                  // agent composing from this bundle reads it here)
                  const vlaws = lawWords(row?.relations, row?.bounds)
                  let line = v + (params !== '' ? ' +' + params : '')
                  if (vlaws.length > 0) line += ' [' + vlaws.join(', ') + ']'
                  return line
                })
                .filter((line) => line !== '')
              // EVERY DECLARED WORD SPEAKS (the audit's GAP 2: the
              // line used to render three of six — `required` (the
              // tts text law) and the numeric bounds were silently
              // dropped, so an agent composing from this bundle was
              // never told text is required or width is bounded).
              const words = lawWords(lane?.relations, lane?.bounds)
              out.push('lane ' + fam + ': ' + (base.length > 0 ? 'base ' + base.join(', ') : 'no declared base')
                + (adds.length > 0 ? '; variants: ' + adds.join('; ') : '')
                + (words.length > 0 ? '; laws: ' + words.join(', ') : '')
                + ' — a field outside this lane REFUSES at the bench door (add_stage/patch), named, with the cure')
            }
          }
          const model = str(sig.model)
          if (model !== '') out.push('signature model: ' + model)
        }
        const stages = Array.isArray(b.stages) ? b.stages : []
        if (stages.length > 0) {
          out.push('stages: ' + stages.map((s) => `${str(s?.id)}:${str(s?.card)}`).join(' → '))
        }
        const skills = Array.isArray(b.skills) ? b.skills : []
        if (skills.length > 0) {
          // THE ROUTING LAW (2026-09-13, image-flow session): a bare id
          // list points the model at the WRONG door — the harness's own
          // core `skill` tool (session catalog) refused
          // `invalid skill name "card:image-gen:image-craft"` while the
          // melite plane served the very id 200. Every list-yielding
          // render names the tool that opens one entry; these ids open
          // with melite_skill_read, never the core skill tool.
          //
          // EACH SKILL RIDES ITS DESCRIPTION (2026-10-02, the
          // operator's live break — "it chooses anima but never reads
          // the prompt guide unless I tell it"): an id alone says
          // nothing about WHICH entry matters, so the agent picked the
          // model, skipped every skill, and wrote prose to a
          // tag-trained model. The description is the routing surface.
          const names = skills.slice(0, 8).map((s) => {
            const id = str(s?.id) !== '' ? str(s?.id) : str(s?.ref)
            const desc = str(s?.description)
            return desc !== '' ? `${id} — ${desc}` : id
          })
          out.push(`skills: ${skills.length} — read one with melite_skill_read: ${names.join(', ')}${skills.length > 8 ? ' …' : ''}`)
          // THE PROMPTING LAW: each model's `prompt-enhance` skill
          // states how THAT model wants its prompt written (anima takes
          // comma-separated Danbooru tags, NOT prose). A prompt written
          // in another model's style yields the wrong picture, so the
          // load names the duty instead of leaving it to be guessed —
          // the ids never carried it.
          if (skills.some((s) => /prompt-enhance/.test(str(s?.id)))) {
            out.push('prompting: read the per-model prompt rules with melite_skill_read BEFORE writing a prompt — every model wants a different style (comma tags for the anime models, prose for others)')
          }
        }
        const digest = str(b.digest)
        if (digest !== '') out.push('digest: ' + digest + ' (quote it to skip a reload)')
        const docs = Array.isArray(b.agents) ? b.agents : []
        if (docs.length > 0) {
          out.push('agents md:')
          for (const d of docs) out.push(str(d?.text))
        }
        return [{ type: 'text', text: out.join('\n') }]
      },
    },
    async execute(args, exec): Promise<LoadResult> {
    // THE EXPANSION LAW: the catalog was touched — seat the estate's
    // deferred doors (view / manage / skill twins / ledger) for the
    // NEXT request boundary. Idempotent; a no-op once seated.
    opts.expandEstateDoors?.()

      // defineTool input validation runs in the wrapper BEFORE the body
      // (invalid args throw ToolArgsError there) — args is always a
      // defined object here, so no nullish fallback exists to cover;
      // name/inference_type are required strings in parameters, so the
      // wrapper gate guarantees strings at the body and honest casts
      // ride instead of gate-dead typeof fallbacks (2026-09-12).
      const a = args as { name?: unknown; inference_type?: unknown }
      const name = a.name as string;
      const inferenceType = a.inference_type as string;
      if (!name) return jsonClean<LoadResult>({ error: 'name is required (discover it first)', name, inference_type: inferenceType });
      if (inferenceType !== 'card' && inferenceType !== 'flow') {
        return jsonClean<LoadResult>({ error: 'inference_type must be card|flow — a card or a flow tool call; nothing else executes', name, inference_type: inferenceType });
      }
      try {
        const res = await estate.loadCard(inferenceType, name, exec.signal, TIMEOUT_MS);
        // THE ECHO LAW (agent-trace audit, 2026-09-13): the output
        // schema marks name/inference_type required on EVERY shape
        // (ledger row 11) and dsh-tools' registry validates the value
        // against it at the tool-service layer — the seat's success
        // answer is {bundle} alone, so a verbatim return was
        // schema-INVALID in every real agent mount ("missing required
        // property value.name"; the wall drove execute() directly and
        // bypassed that validation — blind spot closed there too).
        // Spread the seat answer, echo the args over it.
        const body = (res ?? {}) as Record<string, unknown>
        return jsonClean({ ...body, name, inference_type: inferenceType }) as LoadResult;
      } catch (e) {
        const err = e as { body?: unknown; message?: string };
        return jsonClean<LoadResult>({ error: typeof err.body === 'string' && err.body !== '' ? err.body : (err.message ?? 'load failed'), name, inference_type: inferenceType });
      }
    },
  });
  // (§7 P7: the presenter rides defineTool validation — no second,
  // ungated seat over the gate. The tool-presentation wall pins the
  // gated face.)
  return def;
}

/** THE FAMILY-PACK SEATS (022's self-critique #3): the grammar of
 *  every modifier pack the card's boarded families DECL-board, read
 *  off the ONE grammar table (MODIFIER_PACKS — the form-spec's own)
 *  with field names off the engine's registered pack contract (the
 *  service read, never a re-derivation). Families arrive pre-parsed
 *  (first segment of each semantic model style + enum — the render
 *  owns the parse, never the hints). Kinds the card itself
 *  declares are skipped (dedupe — the signature already serves
 *  them). A registry/service miss drops the family quietly here:
 *  the compose door still refuses loud on a bad bag, and the
 *  signature's own kinds were never at risk. */
function familyPackSeats(
  families: string[],
  servedKinds: Set<string>,
): Array<{ kind: string; param_key: string; fields: string[]; cardinality: string }> {
  const out: Array<{ kind: string; param_key: string; fields: string[]; cardinality: string }> = []
  const seen = new Set<string>(servedKinds)
  let svc: { packFieldNames(pack: string): string[] } | null = null
  try {
    svc = theService() as { packFieldNames(pack: string): string[] }
  } catch {
    svc = null
  }
  for (const fam of families) {
    if (fam === '') continue
    let packs: string[] = []
    try {
      const decl = registryModel(fam) as { mods?: unknown } | null
      const raw = decl?.mods
      if (Array.isArray(raw)) {
        packs = raw.map((m) => typeof m === 'string' ? m : (typeof (m as { pack?: unknown })?.pack === 'string' ? (m as { pack: string }).pack : '')).filter((p) => p !== '')
      }
    } catch {
      continue
    }
    for (const pack of packs) {
      const meta = MODIFIER_PACKS[pack]
      if (meta === undefined || seen.has(meta.kind)) continue
      seen.add(meta.kind)
      const fields = svc !== null ? svc.packFieldNames(pack) : []
      if (fields.length === 0) continue
      out.push({
        kind: meta.kind,
        param_key: meta.param_key ?? pack,
        fields,
        cardinality: meta.cardinality,
      })
    }
  }
  return out;
}
