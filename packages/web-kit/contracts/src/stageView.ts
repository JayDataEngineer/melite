/** stageView.ts — the keyed `cards.stage.view` slot's OWNER currency
 * (the ui-tool law verbatim): everything the bench host hands a card's
 * stage surface. This is the CONTRACT a card package's own client
 * entry programs against — the host (the card-view plugin) and every
 * self-registering card studio import it from here, never from the
 * host package (a card must not depend on the bench that hosts it:
 * adding a card never touches the host, the DSH plugin contract).
 *
 * The view is a pure function of what the bench already knows, plus
 * the host callbacks the drill owns. Keyed by CARD name; an unclaimed
 * key falls back to the generic form-spec card. */
export interface StageViewOwnerProps {
  /** Bench stage identity (stable across param edits). */
  stageId: string
  /** Wire card name — the keyed dispatch value. */
  cardName: string
  /** Frozen bench row (params/inputs/outputs as the SSOT holds them).
   *  `resolved` (when present) is the estate's SERVED compose input —
   *  prepareCardParams' own stamps, what the next run will see — the
   *  1:1 run law's served truth; the studio layers it under its user
   *  state (resolveValue's base arm). */
  row: Record<string, unknown>
  /** The estate's own runStatus field ('' when never run). */
  runStatus: string
  /** Patch stage params through drafts/patch (the slot's own door). */
  onPatch: (patch: Record<string, unknown>) => void
  /** Start the run for THIS stage (the single-stage gateway). */
  onRun: () => void
  /** THE GESTURE REGISTRATION (hour-26, the 1:1 law): a studio that
   * must PATCH ITS DOMAIN FIRST binds its run verb here — the frame's
   * top-bar pill calls the bound verb, never a bare onRun that would
   * start past un-flushed domain state. */
  bindRun?: (run: () => void) => void
  /** Cancel a live run (runs/stop). */
  onStop: () => void
  /** Remove the stage from the bench. */
  onRemove: () => void
  /** Host verb: report the envelope's size class (the zoom card
   * frame listens — 'huge' grows the card; '' = the default). */
  onSurface: (size: string) => void
  /** The other stages' LATEST OUTPUTS (the picker's candidates —
   * the slot is the wire: picking one writes this row's param). */
  upstream: Array<{ id: string; title: string; url: string }>
  /** The draft's last started run (client memory until the estate
   * serves draft→run; the studio polls runs/status for artifacts). */
  runId: string | null
}
