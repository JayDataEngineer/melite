/** write-through.ts — THE STUDIO'S TRAILING WRITE WINDOW (the
 *  settings-eater cure, 2026-10-30). DeclarativeStudio owns NO
 *  second copy of the bench row: every edit fires through the
 *  host's onPatch door (drafts/patch behind it — the
 *  write-accountability ledger, draft.ts:130-150, owns the flight
 *  from the moment the door is called). Keystroke-class edits
 *  coalesce here per key on a short trailing delay — one write per
 *  pause, not one per character — because the door is CAS-fenced:
 *  per-character writes would burn the rebase budget and lose
 *  characters. Discrete gestures (atomic picks, toggles, slot
 *  writes) bypass the window: one door write, now.
 *
 *  The window is a QUEUE, never a truth: it holds a value only
 *  until its write fires. It is module-level so a view flip cannot
 *  kill a pending write by unmounting its owner (the 2026-09-23
 *  burn's exact death, named at draft.ts:141-145). The press
 *  FLUSHES the window synchronously before onRun: a flushed write
 *  enters the host ledger's inflight set at call entry
 *  (draft.ts:702-730), and the host's run gate awaits the ledger
 *  before anything composes (stage-run.ts:54) — the engine sees
 *  exactly what the screen shows, by construction. ONE hole, named
 *  honestly (draft.ts:242-249 owns the twin): a write inside its
 *  window dies on TAB close with the whole heap — no beforeunload
 *  honestly can: the door's CAS fence needs the write's answer. */

/** The seat a studio mount holds. `trailing` queues keystroke-class
 *  edits; `now` fires a discrete frame immediately (the atomic-pick
 *  law — one door write); `flush` fires every queued edit now (the
 *  press's first move). */
export interface WriteThroughSeat {
  /** Queue edits on the trailing delay (per key, newest wins). */
  trailing(patch: Record<string, unknown>): void
  /** Fire a discrete frame NOW, superseding any queued value for
   *  its keys (a queued stale value must never overwrite a newer
   *  discrete write that already landed). */
  now(patch: Record<string, unknown>): void
  /** Fire every queued edit immediately (one merged door write). */
  flush(): void
}

interface TrailingRow {
  /** The freshest mount's door — updated on every seat creation. */
  send: (patch: Record<string, unknown>) => void
  entries: Map<string, unknown>
  timer: ReturnType<typeof setTimeout> | null
}

const TRAILING_MS = 300
const rows = new Map<string, TrailingRow>()

function fire(row: TrailingRow): void {
  if (row.timer !== null) {
    clearTimeout(row.timer)
    row.timer = null
  }
  // NEVER an empty frame: a timer whose every entry a discrete NOW
  // superseded fires nothing — a phantom {} door write burns the CAS
  // budget and pollutes the write ledger (the press-supersede law,
  // 2026-10-21).
  if (row.entries.size === 0) return
  const frame: Record<string, unknown> = {}
  for (const [k, v] of row.entries) frame[k] = v
  row.entries.clear()
  row.send(frame)
}

/** Bind (or rebind) the stage's trailing row to this mount's door.
 *  A pending write from an unmounted view still fires — through the
 *  freshest send, same stage, same door. */
export function writeThroughSeat(
  stageId: string,
  send: (patch: Record<string, unknown>) => void,
): WriteThroughSeat {
  let row = rows.get(stageId)
  if (row === undefined) {
    row = { send, entries: new Map(), timer: null }
    rows.set(stageId, row)
  }
  row.send = send
  return {
    trailing(patch: Record<string, unknown>): void {
      for (const [k, v] of Object.entries(patch)) row.entries.set(k, v)
      if (row.timer !== null) clearTimeout(row.timer)
      row.timer = setTimeout((): void => { fire(row) }, TRAILING_MS)
    },
    now(patch: Record<string, unknown>): void {
      for (const k of Object.keys(patch)) row.entries.delete(k)
      send(patch)
    },
    flush(): void {
      if (row.entries.size > 0) fire(row)
    },
  }
}

/** Drop the window (spec isolation ONLY — specs share stage ids
 *  across tests, and a queued write from one test must not fire
 *  into the next. Production NEVER calls this; the window's memory
 *  is the law — resetStageWrites at draft.ts:507-512 names the same
 *  discipline). */
export function resetWriteThrough(): void {
  for (const row of rows.values()) {
    if (row.timer !== null) clearTimeout(row.timer)
  }
  rows.clear()
}
