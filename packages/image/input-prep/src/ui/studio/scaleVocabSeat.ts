// scaleVocabSeat.ts — the studio's family seat (the plugin law's
// client seam, the L3 cure, 2026-11-16): the ONLY bridge between
// the studio and the family's client-safe vocabulary leaf, held as
// a guarded dynamic import — the studio tree carries zero static
// family imports, so a pruned family package costs only this seat.
// The leaf (@melite/models-input/scale-vocab) imports nothing (the
// 2026-11-10 client purity split), so the client bundle inlines its
// bytes (tsdown's single-file law) and the guarded import resolves
// from the bundle on the first microtask — no network, no
// module-table entry.
import { useEffect, useState } from 'react'

export interface ScaleVocab {
  SCALE_METHODS: readonly string[]
  SCALE_MODEL_OPTIONS: readonly string[]
  MIN_DIM: number
}

let seat: ScaleVocab | null = null
let loading: Promise<ScaleVocab> | null = null

/** Load the vocabulary seat (idempotent). Guarded: a module that
 *  fails to resolve rejects and leaves the seat absent — the studio
 *  renders empty menus and no floor, and the compose door owns the
 *  loud family refusal (the per-family degrade law; the client
 *  never dies for a family). */
export const loadScaleVocab = (): Promise<ScaleVocab> => {
  loading ??= import('@melite/models-input/scale-vocab').then((mod) => {
    seat = {
      SCALE_METHODS: [...mod.SCALE_METHODS],
      SCALE_MODEL_OPTIONS: [...mod.SCALE_MODEL_OPTIONS],
      MIN_DIM: mod.MIN_DIM,
    }
    return seat
  })
  return loading
}

/** The seat's synchronous peek — null until primed (the render
 *  paths read this; the hook seeds its state from it). */
export const scaleVocab = (): ScaleVocab | null => seat

/** The hook (the component seam): the seat's current face, filled
 *  by the guarded load. The seat fills once and never changes
 *  after, so a state seed + one effect read is the whole
 *  subscription. */
export const useScaleVocab = (): ScaleVocab | null => {
  const [vocab, setVocab] = useState<ScaleVocab | null>(() => seat)
  useEffect(() => {
    if (seat !== null) return
    let live = true
    void loadScaleVocab().then((filled) => {
      if (live) setVocab(filled)
    })
    return () => { live = false }
  }, [])
  return vocab
}
