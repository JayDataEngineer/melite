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

/** Seat cardinality. (Upstream also has 'keyed' | 'chain' — dropped in the
 * adaptation until a consumer needs them; see ATTRIBUTION.md.) */
export type SlotKind = "single" | "list"

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
  /** List-seat cell id (required for list seats). */
  id?: string
  /** List-seat display order (ascending; ties keep registration order). */
  order?: number
  /** Optional display label (inventory/tooltip). */
  label?: SlotLabel
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
    id?: string
    order?: number
    label?: SlotLabel
    priority?: number
  }
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
   * `id` throws. Shadowing (single/list): entries sharing one cell
   * (single — the seat itself; list — same `id`) coexist at distinct
   * priorities, sorted ascending with ties keeping registration order; the
   * cell's lowest live entry renders. A second registration at an occupied
   * cell's exact priority (default 0) throws naming the occupant, so
   * priority-less composition keeps the one-occupant-per-cell fail-loud.
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
      case "list": {
        if (options.id === undefined) throw new Error(`list slot "${options.name}" requires options.id`)
        const occupant = rec.entries.find((e) => e.options.id === options.id && (e.options.priority ?? 0) === priority)
        if (occupant) {
          throw new Error(`list slot "${options.name}" already has an entry with id "${options.id}" ${occupantHint(occupant)}`)
        }
        break
      }
    }
    if (options.children) {
      for (const childKey of Object.keys(options.children)) {
        const childRec = this.records.get(childKey)
        if (childRec?.spec) {
          throw new Error(`slot "${childKey}" is already declared (by ${childRec.declaredBy ?? "an unknown entry"})`)
        }
      }
    }

    const entry: StoredEntry = {
      component,
      options: {
        ...(options.id !== undefined ? { id: options.id } : {}),
        ...(options.order !== undefined ? { order: options.order } : {}),
        ...(options.label !== undefined ? { label: options.label } : {}),
        ...(options.priority !== undefined ? { priority: options.priority } : {}),
      },
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
    }

    let disposed = false
    return () => {
      if (disposed) return
      disposed = true
      this.disposeEntry(options.name, entry)
    }
  }

  /** Live registrations of a seat, ledger order (single: winner first).
   *  STABLE REFERENCE until the next mutation — this feeds
   *  useSyncExternalStore, so a fresh array per call would loop React
   *  forever (rec.snapshot is the contract). */
  entriesOfSlot(name: string): readonly SlotEntryView[] {
    const rec = this.records.get(name)
    if (!rec) return NO_VIEWS
    if (rec.snapshot === null) {
      rec.snapshot = Object.freeze(rec.entries.map((e) => ({
          key: e.options.id ?? `#${rec.entries.indexOf(e)}`,
          ...(e.options.id !== undefined ? { id: e.options.id } : {}),
          order: e.options.order ?? 0,
          label: e.options.label,
          priority: e.options.priority ?? 0,
          registrant: e.registrant,
          component: e.component,
        })),
      )
    }
    return rec.snapshot
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

  /** The declaration tree from the a-priori root (inspection / gates). */
  describe(): LiveSlotNode {
    const nodeOf = (name: string): LiveSlotNode => {
      const rec = this.records.get(name)
      const children = [...this.records.entries()]
        .filter(([, r]) => r.parent === name)
        .map(([k]) => nodeOf(k))
      return {
        name,
        kind: rec?.spec?.kind ?? "(collapsed)",
        ...(rec?.declaredBy !== undefined ? { declaredBy: rec.declaredBy } : {}),
        occupants: (rec?.entries ?? []).map((e) => ({
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
    if (!rec) return
    for (const entry of rec.entries) {
      if (entry.children) {
        for (const grandChildKey of Object.keys(entry.children)) this.collapse(grandChildKey)
      }
    }
    if (rec.entries.length > 0 || rec.spec !== undefined) {
      rec.entries = NO_ENTRIES
      rec.spec = undefined
      rec.declaredBy = undefined
      rec.parent = undefined
      rec.declarationEpoch += 1
      this.markDirty(rec)
    }
  }
}
