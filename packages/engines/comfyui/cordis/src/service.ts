// The ComfyUI service (Tier 3's mount point). One service instance
// per Cordis context; cards register into it, the compose door
// reads from it. The EXTENSION-LAW requires gate rides here: card
// requires resolve against live object_info node sets BEFORE any
// graph is emitted (never an assumed install).
import { Context, Service } from '@deepseek-ai/cordis'
import { GraphBuilder, deriveDefaults } from './graph.ts'
import type { PromptGraph, JsonValue } from './graph.ts'
import type { FactsFile, ModelFacts } from './facts.ts'

/** Loud refusal — the estate's rc=-3 door shape, never a silent default. */
export class ComposeRefusal extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export interface CardDefinition {
  id: string
  /** Stage-row id the compose emits (retired compose.py skeleton=
   *  verbatim, SSOT'd from the py decls; TS owns the truth post-flip
   *  — required on every card, never a fallback). */
  skeleton: string
  /** Boarded model ids (the board gate; unboarded models refuse). */
  boarded: readonly string[]
  /** Extension packs the card's renderers ride (EXTENSION LAW). */
  requires?: readonly string[]
  /** Per-family extension packs — the py requires_by_family mirror.
   *  (2026-09-08: declared on the base interface — the compose door
   *  below already read it; tagger.ts / img-to-mesh.ts module
   *  augmentations merge the identical shape. Type-level only.) */
  requiresByFamily?: Record<string, readonly string[]>
  /** Schemastery schema of the card params (validated before compose). */
  schema: (v: unknown) => Record<string, unknown>
  /** Build the graph. Order of node creation IS the node-id order. */
  compose(params: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string): void
  /** Post-serialize pass — the lane's autofill-strip calibration
   *  (stripAutofill / stripEmptyAutofill). Cards whose python
   *  renderer strips must port the table here; parity pins it. */
  finalize?(graph: PromptGraph): PromptGraph
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    comfyui: ComfyUIService
  }
}

export class ComfyUIService extends Service {
  private readonly cards = new Map<string, CardDefinition>()
  private facts: FactsFile | null = null
  /** Live object_info node names — set before compose to arm the gate. */
  private objectInfoNodes: Set<string> | null = null
  /** Pin defaults map (class → input → default), derived from the
   *  same snapshot — comfy-script autofill parity. */
  private pinDefaults: Record<string, Record<string, JsonValue>> = {}

  constructor(ctx: Context) {
    super(ctx, 'comfyui')
  }

  registerCard(def: CardDefinition): void {
    if (this.cards.has(def.id)) {
      throw new ComposeRefusal('duplicate-card', `card '${def.id}' registered twice — one card, one plugin`)
    }
    this.cards.set(def.id, def)
  }

  setFacts(facts: FactsFile): void {
    this.facts = facts
  }

  setObjectInfo(objectInfo: Record<string, any> | null): void {
    if (!objectInfo) {
      this.objectInfoNodes = null
      this.pinDefaults = {}
      return
    }
    this.objectInfoNodes = new Set(Object.keys(objectInfo))
    this.pinDefaults = deriveDefaults(objectInfo)
  }

  /** Legacy: node-name set only (gate arming without autofill). */
  setObjectInfoNodes(nodes: Iterable<string> | null): void {
    this.objectInfoNodes = nodes ? new Set(nodes) : null
  }

  compose(cardId: string, modelId: string, params: unknown, runId: string): PromptGraph {
    const def = this.cards.get(cardId)
    if (!def) throw new ComposeRefusal('unknown-card', `unknown card '${cardId}' (registered: ${[...this.cards.keys()].sort().join(', ') || 'none'})`)
    if (!def.boarded.includes(modelId)) {
      throw new ComposeRefusal('not-boarded', `model '${modelId}' is not boarded on the ${cardId} card (boarded: ${[...def.boarded].sort().join(', ')})`)
    }
    if (!this.facts) throw new ComposeRefusal('no-facts', 'model facts not loaded — the compose door requires --facts')
    const model = this.facts.models[modelId]
    if (!model) throw new ComposeRefusal('no-model-facts', `model '${modelId}' has no facts row (regenerate: python3 tools/export_model_facts.py)`)
    if (model.card !== cardId) throw new ComposeRefusal('card-mismatch', `model '${modelId}' facts name card '${model.card}', not '${cardId}'`)

    // params cascade: schema defaults ← model defaults ← explicit params
    let merged: Record<string, unknown>
    try {
      merged = def.schema(params)
    } catch (e) {
      throw new ComposeRefusal('bad-params', `card '${cardId}' refused params: ${(e as Error).message}`)
    }
    merged = { ...merged, ...Object.fromEntries(Object.entries(model.defaults).filter(([, v]) => v !== null && !Array.isArray(v))), ...((params ?? {}) as Record<string, unknown>) }

    // EXTENSION LAW gate: family slice wins when present (py
    // requires_by_family precedent); flat union otherwise.
    const packs = def.requiresByFamily?.[modelId] ?? def.requires
    if (packs?.length && this.objectInfoNodes) {
      const extMap = this.facts.extension_node_types ?? {}
      for (const pack of packs) {
        const expected = extMap[pack] ?? []
        const found = expected.filter((n) => this.objectInfoNodes!.has(n))
        if (expected.length > 0 && found.length === 0) {
          throw new ComposeRefusal('missing-extension', `card '${cardId}' requires '${pack}' (nodes ${expected.join(', ')}) — none live on the engine; install via ComfyUI-Manager`)
        }
      }
    }

    const g = new GraphBuilder(this.pinDefaults)
    def.compose(merged, model, g, runId)
    const graph = g.toJSON()
    return def.finalize ? def.finalize(graph) : graph
  }
}
