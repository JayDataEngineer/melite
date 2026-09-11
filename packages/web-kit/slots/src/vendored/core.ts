// Slot registry pure core — VENDORED + ADAPTED from DeepSeek Harness
// (MIT, Copyright (c) 2026 DeepSeek). See ./ATTRIBUTION.md for the upstream
// source, commit, and the adaptation ledger (what was kept, what was
// dropped). Design contract: docs/DSH-PLUGIN-GAP-ANALYSIS.md §8.1 and
// ../README.md ("the Minimal Shell").
//
// Owners declare seat contracts by merging into SlotMap (declaration
// merging — the seat vocabulary is extensible by any module); ONE
// register() call contributes a component AND declares its child seats
// (declaration = render authorization = runtime spec, one table).
// Zero runtime dependencies — React types only (type imports erase).
import type { ComponentType } from "react"

/** Seat contract table. Owners extend via declaration merging. */
export interface SlotMap {}

/** Seat cardinality: single occupant, ordered list, key-dispatched, or
 * selector-routed chain. ('keyed' + 'chain' re-vendored 2026-09-08, S1 —
 * see ./ATTRIBUTION.md. Scope/session axes and store seats stay out;
 * the two-share props cut stands.) */
export type SlotKind = "single" | "list" | "keyed" | "chain"

/** One SlotMap entry: kind plus the optional owner-supplied props share. */
export interface SlotEntryDef {
  kind: SlotKind
  owner?: object
}

/** Child-seat declaration table for register(): keys are the declared (and
 * thereby render-authorized) seat names, values are their runtime specs.
 * Declaring is claiming: the registering entry becomes the only entry
 * allowed to render these keys. */
export type ChildrenDecl = {
  [P in keyof SlotMap & string]?: {
    kind: SlotMap[P] extends SlotEntryDef ? SlotMap[P]["kind"] : never
  }
}

/** Owner-supplied props share for a seat key ({} for entries declaring no
 * `owner`). */
export type OwnerOf<K extends keyof SlotMap & string> =
  SlotMap[K] extends { owner: infer O extends object } ? O : object

/** Entry label: static string or a thunk resolved at read time. */
export type SlotLabel = string | (() => string)

/** Chain-entry selector: the routing decision of one chain contribution.
 * Runs at election time in chain order (ascending `priority`, default 0 —
 * lower tries first; ties keep registration order); the first non-null
 * return elects its entry and becomes the caller's `matched` value; `null`
 * passes to the next entry; all-null falls to the owner's fallback. MUST
 * be pure — a function of the owner props only, no external mutable reads,
 * no side effects (upstream ui-slots ChainSelect, adapted to the two-share
 * cut: the owner share is the whole input). */
export type ChainSelect<O extends object = Record<string, unknown>, M = unknown> = (
  owner: O,
) => M | null

/** Chain election result: the winning entry's view plus its selector's
 * non-null return (the `matched` prop the renderer injects). Null = every
 * entry declined — the owner renders its fallback. */
export interface ChainElection {
  view: SlotEntryView
  matched: unknown
}

/** Resolve a possibly-thunked label at read time. */
export function resolveSlotLabel(label: SlotLabel | undefined): string | undefined {
  return typeof label === "function" ? label() : label
}

/** A slot component. Props compose from the outlet's owner share plus the
 * seat's declared shares (see ../README.md — the two-share cut). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SlotComponent<P = any> = ComponentType<P>

/** Typed register options. `name` and `children` keys are compile-time
 * checked against SlotMap; the runtime re-validates for dynamically
 * composed callers. */
export interface RegisterOptions {
  /** Target seat (must be declared — by the a-priori 'root' or a parent
   * registration's children table). */
  name: keyof SlotMap & string
  /** Keyed-seat cell key (required for keyed seats). */
  key?: string
  /** List-seat cell id (required for list seats). */
  id?: string
  /** List-seat display order (ascending; ties keep registration order). */
  order?: number
  /** Optional display label (inventory/tooltip). */
  label?: SlotLabel
  /** Chain-seat routing selector (required for chain seats — the entry's
   * routing seat; election runs selectors in priority order). */
  select?: ChainSelect<Record<string, unknown>, unknown>
  /** Shadowing priority: entries sharing one cell coexist at distinct
   * priorities, sorted ascending — the cell's lowest live entry renders. */
  priority?: number
  /** Child-seat declarations riding this registration. */
  children?: Readonly<ChildrenDecl>
  /** Diagnostics label of who registered. */
  registrant?: string
}

/** JSON-safe view of one live registration (the renderer's projection). */
export interface SlotEntryView {
  key: string
  id?: string
  order: number
  label: SlotLabel | undefined
  priority: number
  registrant: string | undefined
  component: SlotComponent
}

/** JSON-safe live seat declaration tree (inspection / gate tests). */
export interface LiveSlotNode {
  name: string
  kind: SlotKind | "(collapsed)"
  declaredBy?: string
  occupants: {
    key?: string
    id?: string
    order?: number
    priority: number
    registrant?: string
  }[]
  children: LiveSlotNode[]
}

interface StoredEntry {
  component: SlotComponent
  options: {
    key?: string
    id?: string
    order?: number
    label?: SlotLabel
    priority?: number
  }
  /** Chain routing selector (present exactly on chain-seat entries). */
  select?: ChainSelect<Record<string, unknown>, unknown>
  children?: Record<string, { kind: SlotKind }>
  registrant?: string
}

/** Per-key registry record. Created on first touch; never removed (version
 * stays monotonic across redeclarations). */
interface SlotRecord {
  spec: { kind: SlotKind } | undefined
  /** Diagnostics: which seat's entry declared this key ("(built-in)" for root). */
  declaredBy: string | undefined
  /** Live parent declaration, absent for the a-priori root. */
  parent: string | undefined
  /** Monotonic declaration lifetime, distinct from ordinary entry mutations. */
  declarationEpoch: number
  entries: readonly StoredEntry[]
  /** Cached SlotEntryView snapshot (the useSyncExternalStore contract:
   *  getSnapshot must return a STABLE reference until the store mutates —
   *  a fresh array per call sends React into an infinite re-render loop).
   *  Null = stale; entriesOfSlot rebuilds it. Invalidated by markDirty,
   *  the ONE funnel every entry mutation rides. */
  snapshot: readonly SlotEntryView[] | null
  version: number
  listeners: Set<() => void>
  /** Declaration-lifetime listeners: fire SYNCHRONOUSLY on declare and
   * collapse (ordinary entry mutations never notify this set) — the
   * injectSlot wait seam. */
  declarationListeners: Set<() => void>
}

const NO_ENTRIES: readonly StoredEntry[] = Object.freeze([])
const NO_VIEWS: readonly SlotEntryView[] = Object.freeze([])

/**
 * Pure slot registry (no React, no framework). The 'root' seat is the one
 * a-priori declaration, seeded at construction — the render tree's root
 * hole.
 *
 * Change propagation contract (as upstream): versions bump synchronously
 * per mutation (registry state is consistent when they bump); subscribe()
 * notifications batch per microtask, so N same-tick mutations produce one
 * notification per touched key. Declaration and entry mutations ride the
 * same flow in this cut — one listener set per seat.
 */
export class SlotCore {
  private records = new Map<string, SlotRecord>()
  private dirty = new Set<SlotRecord>()
  private flushScheduled = false
  /** Entries retired by an abdicating crash report (reportEntryError):
   * excluded from entriesOfSlot projections for the rest of their
   * registration's life, while the registration itself stays on the ledger
   * (disposal authority remains with the registrant). */
  private abdicated = new WeakSet<StoredEntry>()
  /** View → stored-entry link (the staleness probe's identity map;
   * populated whenever a snapshot builds). */
  private viewEntries = new WeakMap<SlotEntryView, StoredEntry>()
  private entryErrorListeners = new Set<
    (key: string, entry: StoredEntry, error: unknown, info: { abdicated: boolean }) => void
  >()

  constructor() {
    // The a-priori root hole. No markDirty: nothing can observe construction.
    const root = this.record("root")
    root.spec = { kind: "single" }
    root.declaredBy = "(built-in)"
    root.declarationEpoch = 1
  }

  /**
   * Contribute a component to a declared seat and (optionally) declare
   * child seats.
   *
   * Load-time validation (misconfiguration fails loud; the render hot path
   * re-checks nothing): registering into an undeclared seat throws;
   * declaring an already-declared child key throws (one declarer per seat —
   * the message names the first declarer). Kind constraints: list — missing
   * `id` throws; chain — missing `select` throws (the selector is the
   * entry's routing seat). Shadowing (single/keyed/list): entries sharing
   * one cell
   * (single — the seat itself; keyed — same `key`; list — same `id`) coexist at distinct
   * priorities, sorted ascending with ties keeping registration order; the
   * cell's lowest live entry renders. A second registration at an occupied
   * cell's exact priority (default 0) throws naming the occupant, so
   * priority-less composition keeps the one-occupant-per-cell fail-loud.
   * Chain seats skip shadowing: election consumes every entry.
   *
   * Lifecycle: the disposer removes the contribution AND collapses every
   * declared child seat (child entries clear recursively; their stale
   * disposers become no-ops) — one lifecycle axis, no dangling state.
   */
  register(options: RegisterOptions, component: SlotComponent): () => void {
    const rec = this.records.get(options.name)
    if (!rec?.spec) {
      throw new Error(
        `slot "${options.name}" is not declared (a parent entry's children table must declare it)`,
      )
    }
    const spec = rec.spec
    const priority = options.priority ?? 0
    const occupantHint = (occupant: StoredEntry) =>
      `at priority ${priority}${occupant.registrant !== undefined ? ` (registered by ${occupant.registrant})` : ""} — register at a different priority to shadow it (lowest renders)`
    switch (spec.kind) {
      case "single": {
        const occupant = rec.entries.find((e) => (e.options.priority ?? 0) === priority)
        if (occupant) throw new Error(`single slot "${options.name}" already has a registration ${occupantHint(occupant)}`)
        break
      }
      case "keyed": {
        if (options.key === undefined) throw new Error(`keyed slot "${options.name}" requires options.key`)
        const occupant = rec.entries.find((e) => e.options.key === options.key && (e.options.priority ?? 0) === priority)
        if (occupant) {
          throw new Error(`keyed slot "${options.name}" already has an entry for key "${options.key}" ${occupantHint(occupant)}`)
        }
        break
      }
      case "list": {
        if (options.id === undefined) throw new Error(`list slot "${options.name}" requires options.id`)
        const occupant = rec.entries.find((e) => e.options.id === options.id && (e.options.priority ?? 0) === priority)
        if (occupant) {
          throw new Error(`list slot "${options.name}" already has an entry with id "${options.id}" ${occupantHint(occupant)}`)
        }
        break
      }
      case "chain": {
        if (options.select === undefined) throw new Error(`chain slot "${options.name}" requires options.select`)
        break
      }
    }
    if (options.children) {
      for (const childKey of Object.keys(options.children)) {
        const childRec = this.records.get(childKey)
        if (childRec?.spec) {
          // spec-set implies declaredBy-set (declare assigns both together;
          // collapse clears both together) — the gate proves presence, so no
          // `??` fallback (an `||`/`??` right operand cannot be covered here).
          throw new Error(`slot "${childKey}" is already declared (by ${childRec.declaredBy as string})`)
        }
      }
    }

    const entry: StoredEntry = {
      component,
      options: {
        ...(options.key !== undefined ? { key: options.key } : {}),
        ...(options.id !== undefined ? { id: options.id } : {}),
        ...(options.order !== undefined ? { order: options.order } : {}),
        ...(options.label !== undefined ? { label: options.label } : {}),
        ...(options.priority !== undefined ? { priority: options.priority } : {}),
      },
      ...(options.select !== undefined ? { select: options.select } : {}),
      ...(options.children ? { children: options.children as Record<string, { kind: SlotKind }> } : {}),
      ...(options.registrant !== undefined ? { registrant: options.registrant } : {}),
    }
    const next = [...rec.entries, entry]
    // Stable sorts: priority ascending for every kind, ties keep
    // registration sequence — a cell's winner is its first occurrence. List
    // refines equal priorities by explicit `order` so the raw ledger keeps
    // its display sequence for priority-less compositions.
    next.sort(
      spec.kind === "list"
        ? (a, b) => (a.options.priority ?? 0) - (b.options.priority ?? 0) || (a.options.order ?? 0) - (b.options.order ?? 0)
        : (a, b) => (a.options.priority ?? 0) - (b.options.priority ?? 0),
    )
    rec.entries = next
    this.markDirty(rec)

    if (options.children) {
      const declarations: [key: string, record: SlotRecord][] = []
      for (const [childKey, childSpec] of Object.entries(options.children as Record<string, { kind: SlotKind }>)) {
        const childRec = this.record(childKey)
        childRec.spec = { kind: childSpec.kind }
        childRec.declaredBy = `an entry in "${options.name}"${options.registrant ? ` (${options.registrant})` : ""}`
        childRec.parent = options.name
        childRec.declarationEpoch += 1
        declarations.push([childKey, childRec])
      }
      // Synchronous listeners may register into or try to redeclare a
      // sibling; publish only after the whole children table owns its
      // declarations (markDirty batches the notifications together).
      for (const [, childRec] of declarations) this.markDirty(childRec)
      // Declaration listeners run AFTER the whole table commits (an
      // injectSlot waiter may register into a sibling in its callback).
      for (const [, childRec] of declarations) this.notifyDeclaration(childRec)
    }

    let disposed = false
    return () => {
      if (disposed) return
      disposed = true
      this.disposeEntry(options.name, entry)
    }
  }

  /** Live registrations of a seat, ledger order (single/keyed: winner
   *  first; chain: election order — every entry, shadowing does not apply).
   *  Abdicated entries (reportEntryError) are excluded. STABLE REFERENCE
   *  until the next mutation — this feeds useSyncExternalStore, so a fresh
   *  array per call would loop React forever (rec.snapshot is the
   *  contract). */
  entriesOfSlot(name: string): readonly SlotEntryView[] {
    const rec = this.records.get(name)
    if (!rec) return NO_VIEWS
    if (rec.snapshot === null) {
      const live = rec.entries.filter((e) => !this.abdicated.has(e))
      const views = live.map((e) => this.buildView(rec, e))
      rec.snapshot = Object.freeze(views)
    }
    return rec.snapshot
  }

  /** One stored entry's JSON-safe view (links the staleness-probe map). */
  private buildView(rec: SlotRecord, e: StoredEntry): SlotEntryView {
    const view: SlotEntryView = {
      key: e.options.key ?? e.options.id ?? `#${rec.entries.indexOf(e)}`,
      ...(e.options.id !== undefined ? { id: e.options.id } : {}),
      order: e.options.order ?? 0,
      label: e.options.label,
      priority: e.options.priority ?? 0,
      registrant: e.registrant,
      component: e.component,
    }
    this.viewEntries.set(view, e)
    return view
  }

  /** Run chain election over a seat: selectors run in chain order
   * (ascending priority, ties keep registration order) over `owner`;
   * the first non-null return elects its entry and becomes `matched`.
   * Null = every entry declined — the owner renders its fallback.
   * Non-chain seats return null (their routing is shadowing, not
   * election); abdicated entries never elect. Pure + synchronous. */
  resolveChain(name: string, owner: Record<string, unknown>): ChainElection | null {
    const rec = this.records.get(name)
    if (!rec?.spec || rec.spec.kind !== "chain") return null
    for (const e of rec.entries) {
      if (this.abdicated.has(e)) continue
      // Chain entries always carry select: register() throws for a chain
      // seat without one, so presence is proven by that gate (no defensive
      // branch — an `||`/`??` right operand cannot be ignore-suppressed).
      const matched = (e.select as ChainSelect<Record<string, unknown>, unknown>)(owner)
      if (matched !== null && matched !== undefined) {
        return { view: this.buildView(rec, e), matched }
      }
    }
    return null
  }

  /** Whether a previously obtained view is still registered (the
   * renderer's stale-authorization probe: a retained view whose entry
   * left the ledger — or abdicated — must not render). Linear scan;
   * fine at UI-plugin registration counts (upstream documents the same
   * tradeoff on isLive). */
  isLive(view: SlotEntryView): boolean {
    const entry = this.viewEntries.get(view)
    if (!entry || this.abdicated.has(entry)) return false
    for (const rec of this.records.values()) {
      if (rec.entries.includes(entry)) return true
    }
    return false
  }

  /** Monotonic mutation version of a seat (useSyncExternalStore snapshot). */
  versionOf(name: string): number {
    return this.records.get(name)?.version ?? 0
  }

  /** Whether a seat is currently declared. */
  isDeclared(name: string): boolean {
    return this.records.get(name)?.spec !== undefined
  }

  /** A seat's kind, or undefined when undeclared/collapsed. */
  kindOf(name: string): SlotKind | undefined {
    return this.records.get(name)?.spec?.kind
  }

  /** Subscribe to a seat's mutations (batched per microtask). */
  subscribe(name: string, listener: () => void): () => void {
    const rec = this.record(name)
    rec.listeners.add(listener)
    return () => rec.listeners.delete(listener)
  }

  /** Read a seat's declaration lifetime. Entry additions and removals do
   * not change it; declaration creation and collapse each advance it
   * (0 before the first declaration). */
  declarationEpoch(name: string): number {
    return this.records.get(name)?.declarationEpoch ?? 0
  }

  /** Subscribe to a seat's declaration lifetime boundaries. Notifications
   * are SYNCHRONOUS — declaration teardown finishes before a subsequent
   * same-tick registration can observe stale resources. Ordinary entry
   * mutations never notify this surface. A children table commits every
   * sibling declaration before its first notification. */
  subscribeDeclaration(name: string, listener: () => void): () => void {
    const rec = this.record(name)
    rec.declarationListeners.add(listener)
    return () => {
      rec.declarationListeners.delete(listener)
    }
  }

  private notifyDeclaration(rec: SlotRecord): void {
    for (const listener of [...rec.declarationListeners]) listener()
  }

  /** Renderer crash report from an entry boundary. Always notifies
   * onEntryError listeners; with `info.abdicate` set it first retires the
   * entry from its cell, one-shot: the seat's version bumps through the
   * ordinary mutation channel so outlets re-project onto the cell's next
   * survivor, and a repeat abdicating report no-ops entirely. The
   * registration itself stays on the ledger either way — the raw ledger
   * still lists the entry and its disposer keeps working. (Chain crashes
   * report with `abdicate: false` — election alternatives resolve at
   * select time, so the entry keeps its cell and only the notification
   * fires.) */
  reportEntryError(
    name: string,
    id: string | undefined,
    error: unknown,
    info: { abdicate: boolean },
  ): void {
    const rec = this.records.get(name)
    const entry = rec?.entries.find((e) =>
      rec.spec?.kind === "keyed" ? e.options.key === id : e.options.id === id,
    ) ?? (id === undefined ? rec?.entries[0] : undefined)
    // A report naming no live entry is a stale boundary — dropped (the
    // registration already left the ledger; its disposer owns teardown).
    if (entry === undefined) return
    if (info.abdicate) {
      if (this.abdicated.has(entry)) return
      this.abdicated.add(entry)
      /* v8 ignore next -- entry-defined implies rec-defined (entry is drawn
       * from rec.entries / rec.entries[0] above; the early return covers the
       * rec-absent shape) (2026-09-12) */
      if (rec !== undefined) this.markDirty(rec)
    }
    for (const listener of [...this.entryErrorListeners]) {
      listener(name, entry, error, { abdicated: info.abdicate })
    }
  }

  /** Observe entry boundary crashes (every render-time entry failure the
   * boundaries contain, abdicating or not) — the supervision seam for
   * hosts mirroring contribution health. Fires synchronously per report,
   * after the registry mutated for abdicating crashes. */
  onEntryError(
    listener: (key: string, entry: StoredEntry, error: unknown, info: { abdicated: boolean }) => void,
  ): () => void {
    this.entryErrorListeners.add(listener)
    return () => {
      this.entryErrorListeners.delete(listener)
    }
  }

  /** The declaration tree from the a-priori root (inspection / gates). */
  describe(): LiveSlotNode {
    const nodeOf = (name: string): LiveSlotNode => {
      // nodeOf only visits reachable seats: "root" (built-in) plus keys
      // enumerated from this.records below — so get() is always defined
      // (the enumeration proves presence), and the seat always carries a
      // spec and a declarer (collapse severs reachability when clearing).
      const rec = this.records.get(name) as SlotRecord
      const children = [...this.records.entries()]
        .filter(([, r]) => r.parent === name)
        .map(([k]) => nodeOf(k))
      return {
        name,
        // Reachable seats always carry a spec and a declarer: collapse (the
        // only clearer) also severs the parent link this walk follows, so a
        // collapsed seat is never visited (the walk proves presence — no
        // defensive branches an `||`/`??` right operand could never cover).
        kind: (rec.spec as { kind: SlotKind }).kind,
        declaredBy: rec.declaredBy as string,
        occupants: rec.entries.map((e) => ({
          ...(e.options.key !== undefined ? { key: e.options.key } : {}),
          ...(e.options.id !== undefined ? { id: e.options.id } : {}),
          ...(e.options.order !== undefined ? { order: e.options.order } : {}),
          priority: e.options.priority ?? 0,
          ...(e.registrant !== undefined ? { registrant: e.registrant } : {}),
        })),
        children,
      }
    }
    return nodeOf("root")
  }

  // ── internals ────────────────────────────────────────────────────────

  private record(key: string): SlotRecord {
    let rec = this.records.get(key)
    if (!rec) {
      rec = {
        spec: undefined,
        declaredBy: undefined,
        parent: undefined,
        declarationEpoch: 0,
        entries: NO_ENTRIES,
        snapshot: null,
        version: 0,
        listeners: new Set(),
        declarationListeners: new Set(),
      }
      this.records.set(key, rec)
    }
    return rec
  }

  private markDirty(rec: SlotRecord): void {
    rec.version += 1
    rec.snapshot = null // snapshots die with the mutation that precedes them
    this.dirty.add(rec)
    if (!this.flushScheduled) {
      this.flushScheduled = true
      queueMicrotask(() => {
        this.flushScheduled = false
        const touched = [...this.dirty]
        this.dirty.clear()
        for (const r of touched) for (const listener of r.listeners) listener()
      })
    }
  }

  private disposeEntry(name: string, entry: StoredEntry): void {
    const rec = this.records.get(name)
    /* v8 ignore next -- records is append-only (record() never deletes), and
     * disposers close over their registration's seat name, so rec is always
     * present (2026-09-12) */
    if (!rec) return
    const next = rec.entries.filter((e) => e !== entry)
    if (next.length !== rec.entries.length) {
      rec.entries = next
      this.markDirty(rec)
    }
    if (entry.children) {
      for (const childKey of Object.keys(entry.children)) this.collapse(childKey)
    }
  }

  /** Collapse a declared child seat: recursively clear its entries, then
   * forget the declaration (epoch advances; redeclaration becomes legal). */
  private collapse(key: string): void {
    const rec = this.records.get(key)
    /* v8 ignore next -- records is append-only and collapse only visits
     * child keys declared (hence record-created) by a live entry, so rec is
     * always present (2026-09-12) */
    if (!rec) return
    for (const entry of rec.entries) {
      if (entry.children) {
        for (const grandChildKey of Object.keys(entry.children)) this.collapse(grandChildKey)
      }
    }
    /* v8 ignore next -- the skip arm is unreachable: collapse is the only
     * spec-clearer and it runs this body when clearing, so a visited seat
     * always has entries or a live spec (double-dispose is guarded;
     * two entries cannot share a child key — redeclare throws) (2026-09-12) */
    if (rec.entries.length > 0 || rec.spec !== undefined) {
      rec.entries = NO_ENTRIES
      rec.spec = undefined
      rec.declaredBy = undefined
      rec.parent = undefined
      rec.declarationEpoch += 1
      this.markDirty(rec)
      this.notifyDeclaration(rec)
    }
  }
}

/** One synchronous effect installed while an injected seat declaration is
 * live: a single disposer, or an iterable of disposers installed
 * transactionally (setup failure rolls earlier yields back; teardown runs
 * in reverse order). */
export type SlotInjectionEffect = (() => void) | Iterable<() => void>

/** Install an effect for each declaration lifetime of a seat — the
 * ctx-free port of upstream `ctx.slots.inject` (whose controller belongs
 * to the caller's plugin fiber; here the caller owns the returned master
 * disposer — bind it to a React-effect return or a fiber teardown, the
 * way ctx.slots.inject binds it to the caller's ctx.effect).
 *
 * The callback runs synchronously when the declaration already exists,
 * otherwise it waits; collapse disposes the active effect and a later
 * redeclaration runs the callback again. Master-dispose cancels a pending
 * wait and removes any active contribution — the unload-cancels
 * guarantee. A callback setup failure retires the injection permanently
 * (a delayed failure never retries on a later declaration) and
 * propagates to the caller. */
export function injectSlot(
  core: SlotCore,
  name: string,
  callback: () => SlotInjectionEffect,
): () => void {
  let active: (() => void) | undefined
  let activeEpoch: number | undefined
  let stopped = false
  // Assigned before any caller can observe the returned disposer (the
  // initial reconcile runs first and assigns it; a throwing setup still
  // assigns before stop-on-failure) — no defensive noop initializer.
  let unsubscribe!: () => void

  const stop = (): void => {
    if (stopped) return
    // Failure callers retire the injection permanently: a delayed setup
    // failure never retries on a later declaration.
    stopped = true
    unsubscribe()
    const dispose = active
    active = undefined
    activeEpoch = undefined
    dispose?.()
  }

  const runCallback = (): (() => void) => {
    const effect = callback()
    if (typeof effect === "function") return effect
    const disposers: (() => void)[] = []
    try {
      for (const dispose of effect) disposers.push(dispose)
    } catch (error) {
      for (let i = disposers.length - 1; i >= 0; i--) disposers[i]?.()
      throw error
    }
    return () => {
      for (let i = disposers.length - 1; i >= 0; i--) disposers[i]?.()
    }
  }

  const reconcile = (): void => {
    /* v8 ignore next -- reconcile can only observe stopped=false: stop()
     * unsubscribes before setting stopped (so declaration events never reach
     * a stopped injection), and the initial call runs pre-subscription with
     * stopped=false (2026-09-12) */
    if (stopped) return
    const epoch = core.declarationEpoch(name)
    /* v8 ignore next -- the same-epoch skip is unreachable through the public
     * API: reconcile runs on inject (active undefined) and on declaration
     * events, and both declare and collapse advance the epoch before
     * notifying — activeEpoch can never equal epoch here (2026-09-12) */
    if (active !== undefined && activeEpoch === epoch) return
    const dispose = active
    active = undefined
    activeEpoch = undefined
    dispose?.()
    if (!core.isDeclared(name)) return
    active = runCallback()
    activeEpoch = epoch
  }

  const changed = (): void => {
    try {
      reconcile()
    } catch (error) {
      stop()
      throw error
    }
  }

  unsubscribe = core.subscribeDeclaration(name, changed)
  try {
    reconcile()
  } catch (error) {
    stop()
    throw error
  }
  return stop
}
