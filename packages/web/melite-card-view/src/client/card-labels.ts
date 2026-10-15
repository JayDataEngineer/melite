/** card-labels.ts — the card's professional name, resolved client-side.
 *
 * The bench rows carry the card id ('image-gen'); the tile and the
 * drill must face the catalog's professional label ('Generate
 * Image' — the card's own identity rung, served by the catalog
 * door). The GET is cached at the wire (card-base's ONE DOOR LAW),
 * so every face calling this hook shares one read; a refused door
 * resolves nothing (null) and the faces keep today's id faces —
 * never a second failure voice over a name. */
import { useEffect, useState } from 'react'
import { fetchCardCatalog } from '@melite/card-base/client'

export function useCardLabels(): (cardId: string) => string | null {
  const [labels, setLabels] = useState<ReadonlyMap<string, string> | null>(null)
  useEffect(() => {
    let alive = true
    fetchCardCatalog()
      .then((list) => {
        if (!alive) return
        setLabels(new Map(list.map((c) => [c.id, c.label])))
      })
      // THE NAME IS NEVER A FAILURE (the operator's faces stay up
      // when the catalog door is down — the add door owns the
      // refusal voice, not every tile): resolve nothing, keep the
      // id faces below.
      .catch(() => { if (alive) setLabels(new Map()) })
    return () => { alive = false }
  }, [])
  return (cardId: string): string | null => labels?.get(cardId) ?? null
}
