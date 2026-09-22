// The compose door — the gateway-facing CLI. One subprocess per
// compose (compose is per-run, not hot). Refusals are LOUD: message
// on stderr, exit 1; the graph JSON on stdout is the only success
// signal (no partial output, ever).
import { Context } from '@deepseek-ai/cordis'
import { ComfyUIService } from './service.ts'
import { composeCards, composeModPlane } from './cardDefs.ts'
import { checkModelPresent } from './catalog.ts'
import { loadFacts } from '@melite/comfyui-card-kit/facts'
import { liveObjectInfo } from './comfyui-transport.ts'
import { resolveEngineBaseUrl } from './comfyui-config.ts'

function die(msg: string): never {
  process.stderr.write(`compose-door: ${msg}\n`)
  process.exit(1)
}

interface Args {
  card?: string
  model?: string
  facts?: string
  params?: string
  runId?: string
}

function parseArgs(argv: string[]): Args {
  const out: Args = {}
  for (let i = 0; i < argv.length; i += 2) {
    const raw = argv[i]?.replace(/^--/, '')
    if (!raw || argv[i + 1] === undefined) die(`bad argument pair: ${argv[i]}`)
    const k = raw.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    ;(out as Record<string, string | undefined>)[k] = argv[i + 1]
  }
  return out
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2)
  if (cmd !== 'compose') die(`unknown command '${cmd ?? '(none)'}' — usage: compose --card <id> --model <id> --facts <file> [--params <json>] [--run-id <id>]`)
  const args = parseArgs(rest)
  if (!args.card) die('--card is required')
  if (!args.facts) die('--facts is required (card-owned slices: packages/engines/comfyui/data/model-facts.json; rows derive from the registry)')
  const runId = args.runId ?? 'run'
  let params: unknown = {}
  if (args.params) {
    try {
      params = JSON.parse(args.params)
    } catch (e) {
      die(`--params is not valid JSON: ${(e as Error).message}`)
    }
  }

  const ctx = new Context()
  // the host plugin PROVIDES comfyui (no inject — injecting the
  // service it provides would self-wait); cards inject it.
  await ctx.plugin({ apply(c: Context) { new ComfyUIService(c) } })
  // the card sweep (loadCardDefs' own boot, mirrored): every card
  // is a package — the registry fills before the model probe below.
  await composeCards(ctx)
  await composeModPlane(ctx)

  // cards compose through cardDefs' package table (the card sweep,
  // 2026-09-09 — every card is a package; no dir walk anywhere).
  // the registry boots first: rows derive through its reads
  // (facts.ts renders through injected reads — no frozen rows).
  const { bootModels, getModel, registryIds, registryModel } = await import('./models/models.ts')
  await bootModels()
  const factsDoc = loadFacts(args.facts, { getModel, registryIds, registryModel })
  ctx.comfyui.setFacts(factsDoc)

  // --model is required UNLESS the card declares requiresModel:
  // false (pure-tool cards with no families ride model-less — the
  // check sits after the card auto-load so the declaration speaks).
  if (!args.model) {
    const probe = ctx.comfyui.getCardDef(args.card)
    if (probe?.requiresModel !== false) die('--model is required')
  }

  // The live node set: arms the EXTENSION-LAW gate AND supplies
  // the comfy-script autofill defaults. Fetched from the engine
  // (endpoint config — QUEUE LANE LAW: no default host, no pin).
  ctx.comfyui.setObjectInfo(await liveObjectInfo(resolveEngineBaseUrl()))
  // THE ARM-WEIGHT READER (the silent-truncation law, 2026-10-09):
  // the same models-tree presence read the harness seats — the
  // CLI composes under the identical gate, never fail-open by
  // accident.
  ctx.comfyui.setWeightPresent((relativePath, name) => checkModelPresent(relativePath, name) !== null)

  // ── THE NESTED STANZA UNWRAP (lift:
  // card_compose_body rides the editor wire's own `params` key
  // THROUGH as params.params — test_card_compose_body_lifts_envelope
  // pins the lift; the compose plane unwraps). A `params` dict key
  // in the incoming params IS the stanza; siblings merge over it
  // (route stamps like seed ride beside it). No card declares a
  // knob named `params` — the unwrap is unambiguous.
  {
    const p = params as Record<string, unknown> | null | undefined
    if (p !== null && p !== undefined && typeof p === 'object' && !Array.isArray(p)
      && typeof (p as Record<string, unknown>)['params'] === 'object'
      && (p as Record<string, unknown>)['params'] !== null
      && !Array.isArray((p as Record<string, unknown>)['params'])) {
      const inner = (p as Record<string, unknown>)['params'] as Record<string, unknown>
      params = { ...inner, ...Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'params')) }
    }
  }

  // ── THE ADMISSION CONTRACT GATE (compose = the single translation
  // rim; the card definition is the truth — "admission is the
  // surface", docs/design/image-edit-param-contract.md). Every param
  // key must be a declared knob (the card's schema carrier) or ride
  // the admits (def.admits extras ∪ the boarded families' studio
  // writes; exact names or trailing-* prefixes). Everything else
  // refuses LOUD at compile time — a silent drop is banned (QUEUE
  // LANE LAW; the 2026-09-05 stepz class never rides silently
  // again). The gate reads the card registry (the single declaration).
  const def = ctx.comfyui.getCardDef(args.card)
  // no def -> the compose door's own unknown-card refusal fires
  // below (its voice is the pinned one — the gate never shadows it)
  if (def !== undefined) {
    const carrier = (def as { schemaCarrier?: unknown }).schemaCarrier ?? def.schema
    // Schemastery schemas are CALLABLE (the def types .schema as a
    // function) — typeof is 'function', not 'object'. .dict rides
    // the callable either way.
    const dict = ((typeof carrier === 'object' || typeof carrier === 'function') && carrier !== null
      ? (carrier as { dict?: unknown }).dict : undefined) as Record<string, unknown> | undefined ?? {}
    const knobs = new Set(Object.keys(dict))
    const admits: string[] = [...(def.admits ?? [])]
    for (const fam of def.boarded) {
      for (const w of factsDoc.models[fam]?.studio?.writes ?? []) admits.push(w)
    }
    const admitted = (key: string): boolean => knobs.has(key) || admits.some((a) => a === key || (a.endsWith('*') && key.startsWith(a.slice(0, -1))))
    const pkeys = Object.keys((params ?? {}) as Record<string, unknown>)
    const unknown = pkeys.filter((k) => !admitted(k)).sort()
    if (unknown.length > 0) {
      die(`unknown param(s) on the ${args.card} card: ${unknown.join(', ')} (admission is the declared surface — knobs + contract admits; see the card's TS definition)`)
    }
  }

  const graph = ctx.comfyui.compose(args.card, args.model ?? null, params, runId)
  process.stdout.write(JSON.stringify(graph, null, 2) + '\n')
}

// THE DOOR CONTRACT: success = graph JSON on stdout ONLY; refusal =
// exit 1 + ONE clean stderr line (code: message) — the gateway shell
// reads the last stderr line as the refusal detail, so an uncaught
// trace (which ends in node's version footer) would swallow the
// cause. Every failure exits through here, never a bare throw.
try {
  await main()
} catch (err) {
  const code = (err as { code?: string }).code
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(code ? `${code}: ${msg}\n` : `${msg}\n`)
  process.exit(1)
}
