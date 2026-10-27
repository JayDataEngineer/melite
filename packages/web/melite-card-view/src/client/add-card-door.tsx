/** add-card-door.tsx — THE PLAIN DOOR: the picker whose pick IS the
 * add (extracted from CardsTab.tsx hour 15). */

import { createElement as h, useEffect, useState } from 'react'
import { Button, IconCloseOutlineRegular, Input, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import { fetchCardCatalog, fetchFormSpec, seedRecipeStamp, seedUser, type CatalogCard, type FormSpecDoc } from '@melite/card-base/client'
import { titleCaseId } from '@melite/card-base/client'
import css from './card.module.css'
import type { CardsBenchValue, BenchStageView } from './cards-resource.ts'
import { fetchBench } from './cards-resource.ts'
import { addStageWire } from './add-stage.ts'
import { rejectionVoice } from './rejection-voice.ts'
import { chromeCopy } from '../chromeCopy.ts'

/** THE ADD-CARD DOOR (the old system's power, DSH-native): the trailing
 *  + tile → the picker (the catalog's action cards, search + genre
 *  groups) → the card's DECLARED form (defaults seeded) → bench/add-stage
 *  as the user (CAS-chained). ONE surface: action cards; models are not
 *  entries (the model select lives ON the card's form). */
export function AddCardDoor({ bench, sessionKey, onAdded, onClose, onAddedRow }: {
  sessionKey: string
  bench: CardsBenchValue
  onAdded: () => void
  /** The add's fresh row, when the bench diff found it — the parent
   *  opens the card's drilldown right after the add (the old tree's
   *  law, InlinePipelineCards.handlePick: "Auto-open the new card —
   *  the user types the prompt immediately, in the zoom drilldown,
   *  not a mystery tile"). */
  onAddedRow?: (row: BenchStageView) => void
  onClose: () => void
}): ReturnType<typeof h> {
  // THE PLAIN DOOR (the operator's hour-24 order: "a random screen
  //  pops up that I don't want. It should just add the card and go
  //  into the drilldown view" — and the preadd form screen goes with
  //  it): the door is picker ONLY — the pick IS the add (the spec
  //  fetch rides silent for engine + axis seeds), then the fresh
  //  row's drill opens. For EVERY card, claimed or not. The hour-9
  //  claimed-studio preview (a page-sized studio modal hijacking the
  //  door the moment a studio card was picked) is REPEALED — the
  //  studio is the ZOOM face for its cards (the real-card law lives
  //  there), never the add door's.
  const [cards, setCards] = useState<CatalogCard[] | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  // THE PICK IS THE ADD (the operator's law: the preadd form screen
  // goes — clicking a card adds it and opens its drill, no middle
  // screen). busyId marks the row while its spec + add land.
  const [busyId, setBusyId] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    fetchCardCatalog()
      .then((list) => { if (alive) setCards(list) })
      .catch((e: unknown) => { if (alive) setCatalogError(rejectionVoice(e)) })
    return () => { alive = false }
  }, [])
  const pick = (card: CatalogCard): void => {
    if (busyId !== null) return
    setBusyId(card.id)
    setAddError(null)
    // the spec fetch goes SILENT (engine + axis seeds for the add —
    // the drill fetches it again for editing): the card's declared
    // form never renders here anymore.
    const family = card.families[0] ?? card.id
    void fetchFormSpec(family).then((doc) => add(card, doc), (e: unknown) => {
      setBusyId(null)
      setAddError(card.label + ': ' + (rejectionVoice(e)))
    })
  }
  const add = async (picked: CatalogCard, spec: FormSpecDoc): Promise<void> => {
    try {
      // THE ENGINE IS NOT AUTHORED HERE (benchStage.ts — the bench
      // stage contract): the door used to write `engine:
      // spec.engine ?? 'comfyui'` into every row it added, which is
      // the same default the bench door and the run door each wrote
      // for themselves. The row now says what it is (the card) and
      // the ONE contract derives the engine, on both sides of the
      // wire.
      const doc: Record<string, unknown> = {
        card: picked.id,
        author: 'user',
        expect_rev: bench.rev,
      }
      // THE AXIS SEED rides the add: a new card is born with its
      // declared variant/quant/model (the first-declared law) PLUS
      // the default recipe's payload stamp (seedRecipeStamp — D12:
      // a payload-carrying first recipe would otherwise compose
      // unstamped; the stamp rides the user layer so the face shows
      // what the run composes). The seeds ride as the row's params
      // — other defaults derive at compose, never ride the bench as
      // fake overrides.
      const seeds = seedRecipeStamp(spec, seedUser(spec, {}))
      if (Object.keys(seeds).length > 0) doc['params'] = { ...seeds }
      await addStageWire(doc, sessionKey)
      setBusyId(null)
      // THE OPEN-ON-ADD LAW (the operator's hour-7): after the door
      // lands, the bench is re-read and the ONE fresh id (the card
      // just added — the flow is one card at a time) is handed up;
      // the parent opens the REAL card (the zoom consult). The door
      // response shape never enters this — the bench diff is the
      // truth. A diff that finds nothing falls back to plain onAdded
      // (the row still lands; only the auto-open is skipped).
      try {
        const before = new Set(bench.stages.map((r) => r.id))
        const next = await fetchBench(sessionKey)
        const fresh = next.stages.find((r) => !before.has(r.id)) ?? null
        if (fresh !== null && onAddedRow !== undefined) onAddedRow(fresh)
        else onAdded()
      } catch {
        // the fresh-row tail is enrichment: the add itself already
        // fired — the door closes with the generic added voice and the
        // bench re-read on the next refresh seats the row
        onAdded()
      }
    } catch (e: unknown) {
      setBusyId(null)
      setAddError(picked.label + ': ' + (rejectionVoice(e)))
    }
  }
  const filtered = (cards ?? []).filter((c) => {
    if (query === '') return true
    const q = query.toLowerCase()
    return c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.genre.toLowerCase().includes(q)
  })
  const genres: Array<[string, CatalogCard[]]> = []
  for (const c of filtered) {
    // (f, operator): Motion belongs to 3d — one section, the 3d
    // lane's own motion cards sit with their kin.
    const g0 = c.genre !== '' ? c.genre : 'other'
    const g = g0 === 'motion' ? '3d' : g0
    const known = genres.find((x) => x[0] === g)
    if (known === undefined) genres.push([g, [c]])
    else known[1].push(c)
  }
  return h(Modal, {
    open: true, onClose, title: chromeCopy.addCard, closeLabel: chromeCopy.closePicker,
    className: css.drill,
  },
    h('div', { className: css.picker },
      h(Input, {
        value: query,
        placeholder: chromeCopy.searchPlaceholder,
        onChange: (e: unknown) => setQuery((e as { target: { value: string } }).target.value),
        'aria-label': chromeCopy.searchAria,
      }),
      // THE DISMISS LAW (audit 017 C4): the door's failure lines carry
      // the red × — the catalog Button (ghost sm + the close glyph, the
      // S6d idiom) INSIDE the error's own element (.runError is the
      // positioned ancestor, the anchor cure); the press retires the
      // line, a NEW refusal re-voices.
      catalogError !== null ? h('p', { className: css.runError }, catalogError,
        h(Button, {
          size: 'sm', variant: 'ghost', className: css.errorDismiss,
          'aria-label': chromeCopy.dismissError,
          onClick: () => setCatalogError(null),
        }, h(IconCloseOutlineRegular, { size: 12 })),
      ) : null,
      addError !== null ? h('p', { className: css.runError }, addError,
        h(Button, {
          size: 'sm', variant: 'ghost', className: css.errorDismiss,
          'aria-label': chromeCopy.dismissError,
          onClick: () => setAddError(null),
        }, h(IconCloseOutlineRegular, { size: 12 })),
      ) : null,
      cards === null && catalogError === null ? h('div', { className: css.load }, 'cards…') : null,
      // SECTIONS KEPT (operator, stroke 46d fix): the genre titles
      // STAY — the complaint was their SIZE, not their existence.
      // The titles now dominate the card labels (the css owns it).
      genres.map(([g, list]) => h('section', { key: g, className: css.pickerGenre },
        h('h4', { className: css.pickerGenreTitle }, titleCaseId(g)),
        list.map((c) => h('button', {
          key: c.id,
          type: 'button',
          className: css.pickerCard,
          disabled: busyId !== null,
          title: c.description !== '' ? c.label + ' — ' + c.description : c.label,
          onClick: () => pick(c),
        },
          h('span', { className: css.pickerCardLabel }, busyId === c.id ? 'adding…' : c.label),
        )),
      )),    ),
  )
}
