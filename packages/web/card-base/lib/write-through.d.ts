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
    trailing(patch: Record<string, unknown>): void;
    /** Fire a discrete frame NOW, superseding any queued value for
     *  its keys (a queued stale value must never overwrite a newer
     *  discrete write that already landed). */
    now(patch: Record<string, unknown>): void;
    /** Fire every queued edit immediately (one merged door write). */
    flush(): void;
}
/** Bind (or rebind) the stage's trailing row to this mount's door.
 *  A pending write from an unmounted view still fires — through the
 *  freshest send, same stage, same door. */
export declare function writeThroughSeat(stageId: string, send: (patch: Record<string, unknown>) => void): WriteThroughSeat;
/** Drop the window (spec isolation ONLY — specs share stage ids
 *  across tests, and a queued write from one test must not fire
 *  into the next. Production NEVER calls this; the window's memory
 *  is the law — resetStageWrites at draft.ts:507-512 names the same
 *  discipline). */
export declare function resetWriteThrough(): void;
//# sourceMappingURL=write-through.d.ts.map