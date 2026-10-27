/**
 * bench-load — the restore gestures of the media plane (MediaPanel's
 * wand + its Flows face), 2026-09-10 (the bench rework's hunk 4: the
 * DECK_OPEN_WITH_DRAFT window seam retired with the deck takeover);
 * FULL PORT 2026-09-11 onto the gallery's routes + the CAS law.
 *
 * The gesture realizes "one shared state": a draft row click LOADS that
 * draft's stages onto THE BENCH (POST /v1/bench/ensure — the same load
 * wire melite_flow's bench verb rides; stages replace, the append-only
 * log records a load entry, undo restores) and then opens the cards
 * tab. The user refines on the bench — the same state the agent edits.
 *
 * THE CAS READ-MODIFY-WRITE (the door's own law, upgraded since the
 * original port): under persistent storage the shared bench SURVIVES
 * runs — a bare {stages} ensure on an existing bench refuses
 * bench/cas-conflict. Read the row first (GET /v1/bench/<session>); a
 * live bench's rev rides as expect_rev, a missing bench births (no
 * expect_rev — the only arm that may create).
 *
 * All wires are same-origin doors the host already serves; failures
 * surface as honest caller-side errors, never thrown past React.
 */

import { parseBenchSnapshot, parseCardSnapshot } from '@melite/contracts/benchSnapshot'
import {
  RESTORE_STRIP_KEYS,
  RESTORED_PROVENANCE_SPELLING,
  benchSessionOf,
  draftIdOf,
  normalizeBenchStage,
  runTailOf,
  stripKeys,
  stripSelfNamedModel,
  type DraftId,
} from '@melite/contracts/benchStage'
import { mediaKindOf } from '@melite/contracts/mediaKinds'

import { fetchUntilSeated } from './waitState.ts'

/** One bench session key — 'main' only for unattributed seats
 *  (stroke 44: the bench belongs to the conversation; the gallery's
 *  load writes the ACTIVE session's bench, never a stranger's).
 *  THE ONE SPELLING (the li-ay stroke): the sanitize decision used
 *  to be this file's own function over the imported grammar; the
 *  decision now lives beside its grammar on the contract floor and
 *  every seat (this client, the cards tab, the agent tool) imports
 *  the same function. */

/** The bench tab's address for one session (cross-plugin contract,
 * the estate-artifact pattern: client bundles cannot import across
 * plugins, so the form is restated with its definition site named —
 * cards-resource.ts's benchAddressOf). */
export function cardsBenchAddress(sessionId: string | undefined): string {
  return 'dsh-resource://cards/bench/' + benchSessionOf(sessionId)
}

// The run tab's address rides the ONE mint (card-base
// cards-address.ts; DRY sweep C3, 2026-10-18 - this twin conceded
// itself). Re-served for the spec's import shape.
export { cardsRunAddress } from '@melite/card-base/client'

export interface BenchLoadDeps {
  /** The tab action every tab body receives (useTabInfo().tab.actions). */
  openResource(address: string): void
  /** Honest inline error surface (the panel's setError). */
  onError(message: string): void
  /** The conversation the gallery serves (the session-scoped slot's
   *  standard sessionId prop); unattributed seats load 'main'. */
  sessionId?: string
  /** Cancels the load's door waits (audit V-E2): a caller whose
   *  gesture went stale aborts instead of waiting out the boot-race
   *  grace. Absent, the load runs to its own deadline. */
  signal?: AbortSignal
}

/** The run's own preview, stamped onto the restored stage (stroke
 *  45b, the operator's catch: the flow loaded but the card showed no
 *  image — a ran stage's result {run_id, url} IS the preview the
 *  cards tile renders; the media-sidebar audit 2026-09-22: the stamp
 *  was image-only, so every restored TTS / video / 3D card landed
 *  with NO preview). _flow.json.artifacts are absolute paths; the
 *  URL is the GALLERY'S OWN same-origin artifact route carrying the
 *  run-relative tail (the mask-recovery break's second half, live
 *  proof: /melite-media/* 502s 'estate-media/no-queue-seat' on a
 *  host without the queue seat, while /infer-gallery/artifact
 *  serves the same file 200 — the preview is a BROWSER <img>/<video>
 *  src, so it must ride the route that serves in THIS host; the
 *  engine-side PATH params keep /melite-media — different consumer,
 *  the engine's own lane). THE KIND UNION is the preview seam's own
 *  vocabulary, restated (client bundles cannot import across
 *  plugins — the parity site is named: melite-card-view's
 *  preview-kinds.ts previewKindFor). */
function resultOfRun(
  flow: Record<string, unknown> | null,
  runId: string,
): Record<string, unknown> | undefined {
  const arts = flow?.['artifacts']
  if (!Array.isArray(arts)) return undefined
  // ONE VOCABULARY (the li-ay stroke): these two private regexes
  // were a SECOND classifier — they carried avif|m4v|avi the
  // contract's vocab did not, and DROPPED svg|bmp it did carry, so
  // an svg-only run restored with NO preview while an .avif restored
  // with one the sidebar could not classify. The contract's
  // mediaKindOf is the only classifier on this plane now (the wall
  // bans the private spelling).
  const isMedia = (a: unknown): a is string =>
    typeof a === 'string' && mediaKindOf(a) !== undefined
  const isVideo = (p: string): boolean => mediaKindOf(p) === 'video'
  // THE FULL GALLERY RIDES THE STAMP (the operator's catch,
  // 2026-09-23: "reload card history, open the timeline card — the
  // preview shows ONE of the three clips"): the old stamp carried
  // the FIRST media artifact alone, so a restored h3 stage rendered
  // one window and the drill walk had one item. The stamp mirrors
  // the estate's terminal outcome: hero url + the artifacts map
  // (every clip, keyed by its run-relative name) + assetUrls.
  // THE HERO IS THE PRODUCT: a film-shaped video beats a window;
  // a generic video beats audio/image outputs. Never let the first
  // FLAC in the engine order become a video card's hero.
  const WINDOW_FILM = /_w\d+_\w+_?\.mp4$/i
  const media = arts.filter(isMedia)
  if (media.length === 0) return undefined
  const film = media.find((p: string): boolean =>
    /(?:^|\/)h3_t4_film_\d+_\.mp4$/i.test(p) && !WINDOW_FILM.test(p),
  )
  const video = media.find((p: string): boolean => isVideo(p) && !WINDOW_FILM.test(p))
  const hero = film ?? video ?? media.find((p: string): boolean => !WINDOW_FILM.test(p)) ?? media[0]
  // THE TAIL GRAMMAR IS RUN_ID_RE (the li-ay stroke): this private
  // tailOf accepted ANY "run-…" segment, so "/x/run-ZZZ/a.png" — a
  // directory no run minted — minted a served artifact address. The
  // contract's runTailOf takes the tail only under a REAL run id
  // (run-<hex>-<base62>, the mint grammar).
  const tailOf = runTailOf
  const heroTail = tailOf(hero)
  if (heroTail === undefined) return undefined
  const route = (tail: string): string => '/infer-gallery/artifact?path=' + encodeURIComponent(tail)
  const artifacts: Record<string, string> = {}
  const assetUrls: string[] = []
  for (const p of [hero, ...media.filter((m: string): boolean => m !== hero)]) {
    const tail = tailOf(p)
    if (tail === undefined || artifacts[tail] !== undefined) continue
    artifacts[tail] = route(tail)
    assetUrls.push(route(tail))
  }
  return { run_id: runId, url: route(heroTail), artifacts, assetUrls }
}

/** One stage's OWN preview, from its sidecar row (the per-stage
 * preview law, operator 2026-10-26: "IMAGE PREVIEWS DO NOT WORK ON
 * RELOAD, IT CHOOSES A RANDOM IMAGE AS THE PREVIEW OUTPUT FOR ALL
 * CARDS" — the D6 stamp shared resultOfRun's ONE run-level hero
 * across every stage, so every restored card painted the same
 * image). queueSidecar.ts's SidecarStage carries each stage's own
 * `url` + `gallery` names; this builder mirrors the estate's
 * terminal outcome (hero url first, the gallery as the artifacts
 * map, hero-first) over the gallery's own artifact route. The names
 * are run-relative tails on today's sidecars; an absolute spelling
 * folds through the contract's runTailOf, and a path that names no
 * run tail and is not itself relative refuses (undefined — the
 * run-level floor answers).
 * @param stage the sidecar's stage row (url/gallery optional — a
 *   legacy row without either carries no per-stage truth)
 * @param runId the run the sidecar names
 * @returns the stage's own result, or undefined when the row is
 *   preview-less */
function resultOfStage(
  stage: Record<string, unknown> | undefined,
  runId: string,
): Record<string, unknown> | undefined {
  if (stage === undefined) return undefined
  // THE TAIL GRAMMAR IS RUN_ID_RE's (the li-ay stroke's law,
  // resultOfRun below): an absolute path folds to its run-relative
  // tail; a path that already IS a tail rides verbatim.
  const tailOf = (p: string): string | undefined => {
    const folded = runTailOf(p)
    return folded !== undefined ? folded : (p.startsWith('/') ? undefined : p)
  }
  // THE SERVABLE TAIL (the operator's catch, 2026-10-26: "NOW I SEE
  // BROKEN IMAGES WHEN I LOAD FROM HISTORY"): the gallery's artifact
  // route serves RUN-RELATIVE names only (run-<id>/<file> — the
  // route's isRunRelative gate), and the sidecar's stage rows carry
  // RUN-DIR-relative urls ('s_0/x.png', no run-id segment). The
  // stage's tail folds onto the run-id-prefixed spelling the route
  // serves; a tail already led by its run id rides verbatim.
  const runIdOf = (p: string): string => runTailOf(p)?.split('/')[0] ?? ''
  const prefixRun = (tail: string): string => {
    const head = runIdOf(tail)
    return head !== '' ? tail : `${runId}/${tail}`
  }
  const url = typeof stage['url'] === 'string' && stage['url'] !== '' ? tailOf(stage['url']) : undefined
  const gallery: Array<{ name?: unknown }> = Array.isArray(stage['gallery'])
    ? (stage['gallery'] as Array<{ name?: unknown }>) : []
  const names: string[] = []
  for (const g of gallery) {
    if (typeof g?.name !== 'string' || g.name === '') continue
    if (mediaKindOf(g.name) === undefined) continue
    const tail = tailOf(g.name)
    if (tail !== undefined && !names.includes(tail)) names.push(tail)
  }
  if (url === undefined && names.length === 0) return undefined
  // THE HERO IS THE STAGE'S URL (terminalOutcomeOf's law, one hero
  // law both builders): the url leads the map even when the engine's
  // gallery listed another file first.
  const hero = prefixRun(url ?? names[0]!)
  const ordered = names.map(prefixRun)
  const route = (tail: string): string => '/infer-gallery/artifact?path=' + encodeURIComponent(tail)
  const artifacts: Record<string, string> = {}
  const assetUrls: string[] = []
  for (const n of [hero, ...ordered.filter((m: string): boolean => m !== hero)]) {
    if (artifacts[n] !== undefined) continue
    artifacts[n] = route(n)
    assetUrls.push(route(n))
  }
  return { run_id: runId, url: route(hero), artifacts, assetUrls }
}

/** The error message an !ok JSON response carries, else HTTP n. */
async function refusalOf(res: Response, answer: unknown): Promise<string> {
  const err = (answer as Record<string, unknown> | null)?.['error']
  return typeof err === 'string' && err !== '' ? err : 'HTTP ' + String(res.status)
}

/** Load one draft onto the bench and open the cards tab.
 *  @param draftId the drafts door's row id (never empty — callers gate).
 *  @param deps the open action + the error surface. */
/** The shared load tail (stroke 45): stages onto THE conversation's
 *  bench (the CAS law — read rev, ensure with expect_rev, birth on
 *  miss) + open the cards tab on it. */
async function loadStagesOntoBench(
  stages: unknown[],
  intent: string,
  deps: BenchLoadDeps,
): Promise<void> {
  const BENCH_SESSION = benchSessionOf(deps.sessionId)
  try {
    // THE CAS READ — the shared bench's current rev (birth arm on
    // any miss: ensure is the only arm that may create).
    // fetchUntilSeated: the estate's boot-race wait voices retry
    // within the doors' grace window — a lane still composing is a
    // wait state, never "the bench refused the load".
    let expectRev: number | undefined
    const getRes = await fetchUntilSeated('/v1/bench/' + encodeURIComponent(BENCH_SESSION), {
      headers: { accept: 'application/json' },
      ...(deps.signal !== undefined ? { signal: deps.signal } : {}),
    })
    if (getRes.ok) {
      const cur: unknown = await getRes.json().catch(() => null)
      const rev = (cur as Record<string, unknown> | null)?.['rev']
      if (typeof rev === 'number') expectRev = rev
    }
    // THE LOAD — stages replace; expect_rev carries the CAS, and
    // the click IS the confirmation (the overwrite law, 2026-09-15:
    // a user gesture declares what a composing agent must confirm).
    // NOTE: no strip here — this tail also carries the run arm's
    // FRESHLY stamped results (loadRunOntoBench stamps AFTER its own
    // strip). The stale-doc strip lives at the draft door
    // (loadDraftOntoBench), where the doc's own memory is the only
    // thing on the rows.
    const ensureRes = await fetchUntilSeated('/v1/bench/ensure', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      ...(deps.signal !== undefined ? { signal: deps.signal } : {}),
      body: JSON.stringify({
        session: BENCH_SESSION,
        author: 'user',
        stages,
        intent,
        overwrite: true,
        ...(expectRev !== undefined ? { expect_rev: expectRev } : {}),
      }),
    })
    const answer: unknown = await ensureRes.json().catch(() => null)
    if (!ensureRes.ok) {
      deps.onError('the bench refused the load (' + await refusalOf(ensureRes, answer) + ')')
      return
    }
    deps.openResource(cardsBenchAddress(deps.sessionId))
  } catch (e) {
    deps.onError('bench load failed — ' + (e instanceof Error ? e.message : String(e)))
  }
}

/** Load one draft onto the bench and open the cards tab.
 *  @param draftId the drafts door's row id (never empty — callers gate).
 *  @param deps the open action + the error surface. */
export async function loadDraftOntoBench(draftId: DraftId, deps: BenchLoadDeps): Promise<void> {
  try {
    // 1. the draft doc (stages + intent).
    const docRes = await fetchUntilSeated('/v1/flows/drafts/' + encodeURIComponent(draftId), {
      headers: { accept: 'application/json' },
      ...(deps.signal !== undefined ? { signal: deps.signal } : {}),
    })
    const doc: unknown = await docRes.json().catch(() => null)
    if (!docRes.ok || typeof doc !== 'object' || doc === null) {
      deps.onError('could not read that card (' + await refusalOf(docRes, doc) + ')')
      return
    }
    const stages = (doc as Record<string, unknown>)['stages']
    const intent = (doc as Record<string, unknown>)['intent']
    // THE RESTORE STRIP (the operator's "random image"): the drafts
    // door serves bench docs VERBATIM, results included — a draft
    // that ran before carries the old run's result/runStatus/
    // history on every stage. The contract's RESTORE_STRIP_KEYS
    // leave here, at the draft door, so the load lands the WORKFLOW
    // and never another run's outputs. It lives HERE and not in the
    // shared tail because the run arm stamps its FRESH results after
    // its own strip — a tail strip would eat those too.
    const rows = Array.isArray(stages) ? stages : []
    for (const st of rows) {
      if (typeof st === 'object' && st !== null && !Array.isArray(st)) {
        stripKeys(st as Record<string, unknown>, RESTORE_STRIP_KEYS)
      }
    }
    await loadStagesOntoBench(
      rows,
      typeof intent === 'string' && intent !== '' ? intent : 'restored draft',
      deps,
    )
  } catch (e) {
    deps.onError('bench load failed — ' + (e instanceof Error ? e.message : String(e)))
  }
}

/** Load one RUN's card onto the bench and open the cards tab.
 *  WHY THE SIDECAR (2026-09-11, the wand proof): the cards tab's run
 *  view hydrates from `runs/status`, which reads the registry's LIVE
 *  runs only — every settled run answers `runs/unknown-run`, so a
 *  wand that merely opens `cards/run/<id>` lands on a failure frame
 *  for the whole archive. The gallery host's sidecar route names the
 *  producing draft for settled runs too, so the wand resolves the
 *  draft itself and rides the same bench-load every other gesture
 *  uses — the workflow is back on the bench before the cards tab
 *  opens, for live and settled runs alike.
 *  @param runId the runs door's row id (never empty — callers gate).
 *  @param deps the open action + the error surface. */
export async function loadRunOntoBench(runId: string, deps: BenchLoadDeps): Promise<void> {
  const BENCH_SESSION = benchSessionOf(deps.sessionId)
  try {
    const sideRes = await fetchUntilSeated('/infer-gallery/flow?run_id=' + encodeURIComponent(runId), {
      headers: { accept: 'application/json' },
      ...(deps.signal !== undefined ? { signal: deps.signal } : {}),
    })
    const side: unknown = await sideRes.json().catch(() => null)
    if (!sideRes.ok || typeof side !== 'object' || side === null) {
      deps.onError('that run keeps no readable sidecar (' + await refusalOf(sideRes, side) + ')')
      return
    }
    const flow = (side as Record<string, unknown>)['flow']
    // THE RUN'S OWN RECORD WINS (stroke 45, the operator's law: "the
    // workflow that HAD that image"). draft_id names the MUTABLE
    // bench — re-reading it serves whatever the bench holds NOW, not
    // what ran. The card_snapshot (runs born after this law) is the
    // exact card + params; the verbatim request body (older runs) is
    // the honest floor. The living bench is NEVER the source.
    const snap = typeof flow === 'object' && flow !== null
      ? (flow as Record<string, unknown>)['card_snapshot']
      : undefined
    // THE FULL WORKFLOW FIRST (stroke 45d): bench_snapshot is the
    // bench doc read at the Run press — every stage + intent as they
    // stood. The ran card (card_snapshot.card) carries the preview;
    // stale run state is stripped from every stage.
    const benchSnap = typeof flow === 'object' && flow !== null
      ? (flow as Record<string, unknown>)['bench_snapshot']
      : undefined
    if (typeof benchSnap === 'object' && benchSnap !== null) {
      // THE SNAPSHOT CONTRACT (the operator's order, 2026-09-26):
      // the restore judges bench_snapshot through the SAME contract
      // the writer stamps — a snapshot that fails parse refuses with
      // the exact problem named, never a best-effort post to the
      // door (a silent partial restore is the fabrication the
      // contract exists to kill).
      const parsedBench = parseBenchSnapshot(benchSnap)
      if (!parsedBench.ok) {
        deps.onError('this run keeps an unloadable bench snapshot (' + parsedBench.problems.join('; ') + ')')
        return
      }
      const bs = parsedBench.value
      const bsStages = bs.stages.map((st) => ({ ...(st as Record<string, unknown>) }))
      if (bsStages.length > 1) {
        const result = resultOfRun(flow as Record<string, unknown> | null, String((side as Record<string, unknown>)['run_id'] ?? ''))
        for (const [i, st] of (bsStages as Record<string, unknown>[]).entries()) {
          // THE RESTORE'S OWN STRIP, BY THE CONTRACT'S NAMES
          // (benchStage.ts): the wand restores the WORKFLOW, never
          // another bench's output memory. The list used to be
          // written out here by hand AND in the birth arm AND in the
          // snapshot contract — three copies of one law, which is
          // how the restore and the birth drifted apart. The contract
          // names the keys; each arm decides which arm it is.
          stripKeys(st, RESTORE_STRIP_KEYS)
          // THE SELF-NAMING MODEL STRIP (see the card arm's law below
          // — era stages ride the same strip before re-admission).
          // THE SELF-NAMING STRIP IS THE CONTRACT'S (the identity
          // law, 2026-09-28). This was a hand copy that stripped
          // UNCONDITIONALLY — so on a restore it ate `anny`'s stated
          // model, which the contract's SELF_NAMED_FAMILIES exempts
          // (anny really does board the anny family). A restore and a
          // fresh compose were therefore not the same law. The
          // contract's own strip runs here; the client holds no copy.
          // THE CONTRACT'S STRIP, ASKED (no copy — see the client's
          // history: the two hand-copied versions of this law drifted
          // from the contract and every wall stayed green, because
          // the walls pin the contract and the SET and never drove
          // these two restore arms).
          stripSelfNamedModel(st['card'], st['params'])
          // (D6, operator 2026-11-06: "image previews not recovered
          // on all cards") the old arm re-attached the run's result
          // to the ONE stage whose card matched the ran card — every
          // OTHER ran stage in the flow restored previewless. The
          // SKIPPED set never carries another stage's product.
          // (THE PER-STAGE PREVIEW LAW, operator 2026-10-26: "IT
          // CHOOSES A RANDOM IMAGE AS THE PREVIEW OUTPUT FOR ALL
          // CARDS") the D6 cure over-shared: one run-level hero on
          // every stage painted one image on every card. The
          // sidecar's OWN stage rows carry each stage's url + gallery
          // (queueSidecar.ts) — joined by bench_stage_id (the card
          // skeleton's id names no bench row) then the row id, each
          // stage paints ITS OWN product; the run-level result is
          // the LEGACY floor for stages the sidecar leaves
          // preview-less (pre-sidecar-stage runs).
          const rawSideStages: unknown = (flow as Record<string, unknown>)['stages']
          const sideStages: Array<Record<string, unknown>> = Array.isArray(rawSideStages)
            ? rawSideStages.filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null && !Array.isArray(s))
            : []
          const sideRowFor = (benchId: unknown, index: number): Record<string, unknown> | undefined =>
            sideStages.find((s) => s['bench_stage_id'] === benchId)
              ?? sideStages.find((s) => s['id'] === benchId)
              ?? (sideStages.length === bsStages.length ? sideStages[index] : undefined)
          const skippedRaw: unknown = (side as Record<string, unknown>)['skipped_stages']
          const skipped: unknown[] = Array.isArray(skippedRaw) ? skippedRaw : []
          const isSkipped = skipped.some((k) => k === st['id'])
          if (!isSkipped) {
            const own = resultOfStage(sideRowFor(st['id'], i), String((side as Record<string, unknown>)['run_id'] ?? ''))
            if (own !== undefined) st['result'] = own
            else if (result !== undefined) st['result'] = result
          }
          st['provenance'] = RESTORED_PROVENANCE_SPELLING
        }
        const bsIntent = bs.intent !== '' ? bs.intent : 'restored run'
        await loadStagesOntoBench(bsStages, bsIntent.slice(0, 77), deps)
        return
      }
    }
    if (typeof snap === 'object' && snap !== null) {
      // THE SNAPSHOT CONTRACT, card face: same law, same judge.
      const parsedCard = parseCardSnapshot(snap)
      if (!parsedCard.ok) {
        deps.onError('this run keeps an unloadable card snapshot (' + parsedCard.problems.join('; ') + ')')
        return
      }
      const card = parsedCard.value.card
      const params = { ...parsedCard.value.params }
      delete params['draft_id']; delete params['test']
      // THE SELF-NAMING MODEL STRIP (the mask-recovery break, live
      // proof run-ffbabb558cb8: the era's compose wire stamped
      // params.model = the card's own id — 40 archive runs carry it
      // (mask ×6, h3-timeline ×34) — and today's write-time admission
      // refuses a model the card does not board, so every restore of
      // them died 'model X is not offered by card X'. A model naming
      // the card itself is the family-less compose voice (stroke
      // 100's {model:} law), never a board request — and the run's
      // own bench_snapshot stage proves the ran stage carried no such
      // key. Strip it; a model naming a REAL family (image-gen's
      // z-image) rides untouched for admission to judge. THE ONE
      // SELF-BOARDING CARD (audit 8a25fbc5): 'anny' boards the
      // 'anny' family — but requiresModel:false and its compose
      // ignores the model key outright (weights ride provisions), so
      // today's wire never writes it there either; the only anny
      // stage carrying model:'anny' is this same era residue, and
      // the strip is correct on it too.
      // …and here the same law, the same exemption (this copy
      // stripped unconditionally too — the divergence the audits
      // named, in the arm that restores a RAN stage).
      // THE CONTRACT'S STRIP, ASKED (one spelling; the copy this
      // replaced was missing the `card !== ''` guard the contract has).
      stripSelfNamedModel(card, params)
      const intentSrc = typeof params['prompt'] === 'string' ? params['prompt'] as string : 'restored run'
      const result = resultOfRun(flow as Record<string, unknown> | null, String((side as Record<string, unknown>)['run_id'] ?? ''))
      // THE STAGE ROW IS THE CONTRACT'S (the audit's Rule 1: this arm
      // built the row by hand — a THIRD copy of the self-naming strip
      // and its own engine/outputs laws). The contract shapes the row;
      // the restore's provenance and preview ride on top.
      const restoredCardRow: Record<string, unknown> = {
        ...normalizeBenchStage({ id: 's_0', card, params }, 0),
        provenance: RESTORED_PROVENANCE_SPELLING,
      }
      if (result !== undefined) restoredCardRow['result'] = result
      const stages = [restoredCardRow]
      await loadStagesOntoBench(stages, intentSrc.slice(0, 77), deps)
      return
    }
    const request = (side as Record<string, unknown>)['request']
    if (typeof request === 'object' && request !== null && typeof (request as Record<string, unknown>)['model'] === 'string') {
      const params = { ...(request as Record<string, unknown>) }
      delete params['draft_id']; delete params['test']
      // THE INTENT IS A LABEL, NEVER A PAYLOAD (the wire audit's M5):
      // this arm restores a request body with no card, so the birth
      // law stamps `card = intent` — and the old code passed the
      // PROMPT as the intent, so the restored tile was titled with
      // prompt text and its Run composed `model = <the prompt>`. A
      // cardless restore is honest and refuses; it is never dressed
      // up as a card.
      const result = resultOfRun(flow as Record<string, unknown> | null, String((side as Record<string, unknown>)['run_id'] ?? ''))
      // the same contract-shaped row; a cardless restore stays
      // cardless (the birth law stamps card = intent, and an intent is
      // a LABEL — naming the bench after the prompt titled the tile
      // with prompt text and ran model = <the prompt>)
      const restoredBareRow: Record<string, unknown> = {
        ...normalizeBenchStage({ id: 's_0', params }, 0),
        provenance: RESTORED_PROVENANCE_SPELLING,
      }
      if (result !== undefined) restoredBareRow['result'] = result
      const stages = [restoredBareRow]
      await loadStagesOntoBench(stages, 'restored run', deps)
      return
    }
    const flowDraft = typeof flow === 'object' && flow !== null
      ? (flow as Record<string, unknown>)['draft_id']
      : undefined
    const topDraft = (side as Record<string, unknown>)['draft_id']
    const draftId = typeof flowDraft === 'string' && flowDraft !== ''
      ? draftIdOf(flowDraft)
      : typeof topDraft === 'string' && topDraft !== '' ? draftIdOf(topDraft) : draftIdOf('')
    // THE MUTABLE-BENCH REFUSAL, run side (the media-sidebar audit
    // 2026-09-22): a bench-prefixed draft_id names the LIVING bench
    // — loading it serves whatever the bench holds NOW, never the
    // workflow that made this media (the panel's openCards refuses
    // the same ids on the row fast path). A snapshot-less bench-born
    // run is unrecoverable exactly; the honest error beats a wrong
    // workflow.
    if (draftId.startsWith('bench-')) {
      deps.onError('that run was born on a living bench and keeps no snapshot — nothing to restore exactly')
      return
    }
    if (draftId === '') {
      deps.onError('this run keeps no card record — nothing to restore')
      return
    }
    await loadDraftOntoBench(draftId, deps)
  } catch (e) {
    deps.onError('bench load failed — ' + (e instanceof Error ? e.message : String(e)))
  }
}
