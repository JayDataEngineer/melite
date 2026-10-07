/** use-form-spec.ts — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { useEffect, useState } from 'react'
import { fetchFormSpec } from './wire.ts'
import { type FormSpecDoc } from './spec.ts'
import { rejectionVoice } from './rejection-voice.ts'

/** THE SERVED-SPEC HOOK (the DRY extraction, 2026-09-13): four
 *  consumers (mask-studio's TuneSection, h3's RunAdvancedPanels,
 *  img-to-mesh's client, ideogram4's client) each hand-copied the
 *  same fetch-once + abort dance. One spelling now: fetches
 *  /v1/form-spec?model=<id> when the id is non-empty, aborts the
 *  in-flight fetch on unmount or id change, and hands back the doc
 *  (null until it lands) + the refusal message (null unless the door
 *  refused — loud consumers render it, silent ones ignore it).
 *  Consumer-specific derivations (field filters, value seeding) stay
 *  at the call site as reactions to `spec`. */
export function useFormSpec(modelId: string | null | undefined): {
  spec: FormSpecDoc | null
  error: string | null
} {
  const [spec, setSpec] = useState<FormSpecDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const id = typeof modelId === 'string' && modelId !== '' ? modelId : null
  useEffect(() => {
    if (id === null) return
    const ctl = new AbortController()
    setSpec(null)
    setError(null)
    fetchFormSpec(id, ctl.signal)
      .then((doc) => { setSpec(doc) })
      .catch((e: unknown) => { setError(rejectionVoice(e)) })
    return () => { ctl.abort() }
  }, [id])
  return { spec, error }
}

