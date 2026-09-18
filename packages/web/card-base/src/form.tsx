/**
 * form.tsx — @melite/card-base: THE CONSTRUCTOR (the godfile
 * split, hour 15: the seams live in their own files now —
 * use-form-spec.ts, square-provider.tsx, atoms.tsx, rows.tsx,
 * spec-panel.tsx, axes.tsx — this file is the CardForm
 * composition + the stable re-export surface).
 *
 * THE CONSTRUCTION LAW (operator order, 2026-09-12: "The package to
 * construct the card ui should see that the card package emits an
 * image input, then constructs the input component automatically"):
 * the base reads the card package's EMISSION — the served form-spec
 * (the schema envelope, declared input/output edges, mod kinds) —
 * and constructs the surface. The resolved value derives per render
 * (resolveValue — the engine's compose cascade mirrored); every
 * image/file field gets THE ONE square (square.tsx) with the
 * three source verbs; no card ever hand-rolls an input component.
 *
 * THE SEAM (slots.ts): each field renders through the field-atom seam
 * keyed by its emitted wire type — the caller may pass claimed atoms
 * (the composition consults the slot machinery and hands them in);
 * the base's built-in atom is the default (the ui-tool built-ins
 * pattern). A whole-form takeover replaces CardForm itself.
 *
 * DSH NATIVE: Menu/Input/Switch from the installed ui-primitives; the
 * atoms the primitives set lacks (select, slider, textarea) are
 * layout-only module CSS over native elements, every color an
 * inherited --dsw-alias-* token (the package's documented pattern).
 */
import { createElement as h, useState } from 'react'
import { type BboxFaceComponent, ModifiersSection, type PaintFaceComponent } from './mods.tsx'
import { type FormSpecDoc, type SpecField, type SpecValues, coerceFieldEdit, entryFieldsOfEnvelope, fieldsOf, fieldsOfEnvelope, groupFields, kindScalarFieldsOfEnvelope, modOwnedFields, resolveValue, titleCaseId } from './spec.ts'
import css from './card.module.css'
import { useFormSpec } from './use-form-spec.ts'
import { type FieldAtomClaim, type SquareHost, type SquareWire, useSquareProvider } from './square-provider.tsx'
import { SpecAtom } from './atoms.tsx'
import { SpecFieldRow } from './rows.tsx'
import { infoGlyph } from './rows.tsx'
import { ModelAxes, PackPrompt } from './axes.tsx'

// THE STABLE SURFACE: every extracted name re-exports from here so
// the package's public API (index.ts) never moved — importers are
// untouched by the split.
export { useFormSpec } from './use-form-spec.ts'
export { useSquareProvider, type SquareHost, type SquareWire, type FieldAtomClaim, type SourceRowProps } from './square-provider.tsx'
export { SourceRow, TriStateAtom, SpecSliderAtom, SpecAtom } from './atoms.tsx'
export { SeedDice, SpecFieldRow } from './rows.tsx'
export { SpecPanel, type SpecPanelRow, type SpecPanelSection } from './spec-panel.tsx'
export { PackPrompt, ModelAxes, RecipePills } from './axes.tsx'

/** THE CARD FORM (the constructor's surface half) — the emission's
 *  fields walked off the schema envelope, grouped, visible-when
 *  honored; the RESOLVED value derives per render (resolveValue —
 *  the engine's compose cascade mirrored), edits are set/unset ops
 *  over the USER layer (the settings law: presence IS the override
 *  mark, the reset chip removes it). The constructor OWNS the square
 *  provider (no call site wires it, no call site can forget it). */
export function CardForm({ spec, user, base, onSet, onUnset, wire, square, atoms, onPatch, onDownloadModel, onInstallPack, paintFace, bboxFace, paintReference }: {
  /** the WHOLE emission (the schema envelope + model/variants) —
   *  REQUIRED now: the fields, the axes, and the mod param rows all
   *  derive from THIS (useFormSpec fetches it). */
  spec: FormSpecDoc
  /** THE USER LAYER (the settings model): the stage's explicit
   *  params. A key's PRESENCE is the override mark — the resolved
   *  value derives (resolveValue: schema defaults <- model defaults
   *  <- card recipe <- user), never a seeded values map. */
  user: SpecValues
  /** THE SERVED BASE (hour-26 stroke 15, the 1:1 run law): the stage
   *  row's `resolved` map — prepareCardParams' own stamps, served by
   *  the drafts doors. Layers under the user (presence still wins)
   *  and over the client's guesses — one resolver, served to the
   *  visual. Absent = the registry-less lane derive. */
  base?: SpecValues
  onSet(name: string, v: unknown): void
  /** Remove an override (the reset path): the host patches the key
   *  out of the user layer; the row re-derives to its base. */
  onUnset?(name: string): void
  /** the picker wire (the other stages' latest outputs) — data, never
   *  components. The constructor builds the provider from THIS. */
  wire?: SquareWire
  /** the host's square override (the claim seam). Rare. */
  square?: (f: SpecField) => SquareHost | undefined
  /** the field-atom seam's claims, keyed by emitted wire type —
   *  a card's takeover of its own atoms (undefined = built-ins). */
  atoms?: Record<string, FieldAtomClaim>
  /** immediate persistence for mod commits (the onSaveParams law).
   *  Absent (the add drill): commits ride the user map. */
  onPatch?: (patch: Record<string, unknown>) => void
  /** THE PAINT FACE (paint-leaf-canvas.md): the host's brush modal
   *  for leaf_face kinds. Absent host = no verb (the square holds).
   *  Threaded verbatim into the mod section. */
  paintFace?: PaintFaceComponent
  /** THE BBOX FACE (stroke 78): the host's selection modal for
   *  bbox-canvas kinds. Absent host = the four inputs hold. */
  bboxFace?: BboxFaceComponent
  /** the card-level image field feeding the brush reference
   *  (mask-form: 'input_image'). Absent = no verb. */
  paintReference?: string
  /** THE DOWNLOAD PROMPT's arm (stroke 18): a boarded-but-absent
   *  model prompts download; the host supplies the manage wire. See
   *  ModelAxes. */
  onDownloadModel?: (id: string) => Promise<boolean>
  /** THE EXTENSION INSTALL ARM (stroke 18): a missing declared pack
   *  prompts install; the host supplies the manage wire. See
   *  PackPrompt. */
  onInstallPack?: (id: string) => Promise<boolean>
}): ReturnType<typeof h> {
  // DERIVED, ALWAYS FRESH (the layered law): fields walk the schema
  // envelope (families-scoped); the resolved value layers defaults
  // <- model defaults <- recipe <- user — exactly what a run
  // composes. No seeding, no mirrors, no stamp ledger: one source,
  // re-derived every render.
  const fields = fieldsOf(spec)
  const value = resolveValue(spec, user, base)
  const fieldByName = new Map(fields.map((f) => [f.name, f] as const))
  // THE EDIT COERCION (the one specPatch duty that survives, moved
  // to the edit boundary where it always belonged): atoms emit raw
  // strings while typing; a numeric field's edit rides the user
  // layer as a NUMBER. An unparseable/empty numeric string rides
  // VERBATIM (the run's schema parse refuses loud, naming the field
  // — never a silent 0). The tri-state's `undefined` (inherit) is an
  // UNSET, not a value: the settings' unset path op, natively.
  const edit = (name: string, v: unknown): void => {
    if (v === undefined) { onUnset?.(name); return }
    onSet(name, coerceFieldEdit(fieldByName.get(name), v))
  }
  // THE MOD SYSTEM IS CORE (operator, 2026-09-12: "MOD SYSTEM IS
  // CORE. NEVER HARDCODED"): mod-owned names NEVER render as flat
  // card fields — the section owns them. The exclusion is derived
  // from the served kinds alone, in EVERY surface, automatically.
  // The FIELD kinds' param rows derive off the mod contracts' own
  // envelopes (mod_schemas — the same walker as the card fields).
  // HYBRID kinds (the served entry mode — never the kind name):
  // the catalog select binds the option_key field while the bag
  // element's REMAINING fields render as entry rows, plus the
  // pack-level scalars as the section's own rows (the floor).
  const family = typeof spec.model === 'string' ? spec.model : undefined
  const modKinds = (spec.features?.modifiers ?? []).map((k) => {
    const env = spec.mod_schemas?.[k.schema_key ?? k.param_key]
    const hybrid = k.entry === 'hybrid'
    // CONTRACT A (stroke 76 wall — the paint leaf proved it): a
    // card-declared kind IS the catalog — its served fields/
    // kindFields ride VERBATIM, never re-derived from a mod_schemas
    // envelope it doesn't have (derivation would wipe the leaf).
    // Pack kinds (no declared rows) still derive from the envelope.
    // The declared rows normalize through the walker's own rule
    // (presentation type: the wtype hint wins — a declared
    // {type:'path',wtype:'image'} constructs the square like the
    // envelope's extra.wtype does).
    const declared = (rows: SpecField[] | undefined): SpecField[] | undefined =>
      rows?.map((f) => (typeof f.wtype === 'string' && f.wtype !== '' ? { ...f, type: f.wtype } : f))
    return {
      ...k,
      fields: hybrid ? entryFieldsOfEnvelope(env, k.param_key, family) : (declared(k.fields) ?? fieldsOfEnvelope(env, family)),
      kindFields: hybrid ? kindScalarFieldsOfEnvelope(env, k.param_key, family) : (declared(k.kindFields) ?? []),
    }
  })
  const owned = modOwnedFields(spec)
  const flatFields = owned.size > 0 ? fields.filter((f) => !owned.has(f.name)) : fields
  // THE INPUT RAIL (the operator's law, 2026-09-13: "CARDS EMIT INPUT
  // SIGNATURES, SO IT'S CLEAN DATA THE UI PACKAGE RECEIVES"): when the
  // spec carries the declared input signature, the slot-shaped inputs
  // render in ONE rail IN DECLARED ORDER — image1, image2, image3 side
  // by side, the image_list row in the same zone — and the param groups
  // EXCLUDE them (the flat fields' incidental grouping — card-owned vs
  // absorbed flavor, group ids, emission order — never shapes the
  // input surface again). Text-kind edges stay params; fields whose
  // wtype has no slot atom yet stay in the groups.
  const signature = Array.isArray(spec.inputs) ? spec.inputs : []
  // THE MOD-OWNED SLOT LAW (stroke 32 — the operator's missing-seat
  // report: image-edit's required image1 never rendered): the
  // signature names SLOTS, not schema fields — a mod-owned slot
  // (image1, the lanpaint brick's anchor) seats in the rail like any
  // other, so the rail falls back to the mod kinds' fields. The mod
  // leaf skips rail-seated fields (no double face) — the signature
  // is the seat, the brick keeps its knobs.
  const modFieldByName = new Map<string, SpecField>()
  // NO ?? [] (the always-assigned proof): the modKinds map above
  // overwrites fields on EVERY arm (hybrid → entryFieldsOfEnvelope,
  // else declared ?? fieldsOfEnvelope — all arrays), so k.fields is
  // never undefined here.
  for (const k of modKinds) for (const f of k.fields) {
    if (!modFieldByName.has(f.name)) modFieldByName.set(f.name, f)
  }
  const railOf = (inp: { name: string; kind?: string }): SpecField | undefined => {
    const f = flatFields.find((x) => x.name === inp.name) ?? modFieldByName.get(inp.name)
    if (f === undefined) return undefined
    if (f.type === 'image' || f.type === 'file') return f
    return undefined
  }
  const railFields = signature
    .map((inp) => (typeof inp?.name === 'string' ? railOf(inp as { name: string }) : undefined))
    .filter((f): f is SpecField => f !== undefined)
  const railNames = new Set(railFields.map((f) => f.name))
  const visible = (f: SpecField): boolean =>
    f.type !== 'image_list' && !railNames.has(f.name)
  const groupFieldsAll = flatFields.filter(visible)
  const groups = groupFields(groupFieldsAll, value)
  // THE PARAMETER SUBMENU (stroke 89, operator order 2026-09-17:
  // "instead of making a form card, and abstracting the form card
  // to allow for switchable submenus of parameters, you handroll" —
  // the base form owns it now): an emission declaring MORE THAN ONE
  // parameter group renders the groups as a switchable submenu — a
  // tab rail, one visible panel at a time. Zero/one group keeps the
  // stacked sections: no existing card sees a behavior change, and
  // a card NEVER owns this UI (the constructor reads the declared
  // `group` extras — the emission contract, nothing bespoke).
  const submenu = groups.length > 1
  const [openGroup, setOpenGroup] = useState<string | null | undefined>(undefined)
  const activeGroup = submenu ? (groups.find((g) => g.group === openGroup) ?? groups[0]) : undefined
  const shownGroups = submenu && activeGroup !== undefined ? [activeGroup] : groups
  const atomOf = (f: SpecField): FieldAtomClaim | undefined => atoms?.[f.type]
  // THE CONSTRUCTOR'S OWN PROVIDER — always built (hook law), used
  // unless the host claimed the square seam itself.
  const own = useSquareProvider(edit, wire ?? { candidates: [] })
  const squareFor = square ?? own.square
  return h('div', { className: css.specForm },
    // THE AXES ride the user layer through the same edit seam (their
    // picks are ordinary sets; the resolved value passes along).
    h(PackPrompt, { spec, onInstallPack }),
    h(ModelAxes, { spec, value, onSet: edit, onDownloadModel }),
    railFields.length > 0
      ? h('section', { className: css.specGroup + ' ' + css.inputRail, 'data-input-rail': '1' },
          h('div', { className: css.specSlotRow },
            railFields.map((f) => {
              // NO image_list ARM (the rail-gate proof): railOf returns
              // a field ONLY for type image|file, so railFields can
              // never carry an image_list row.
              return h('div', {
                key: f.name,
                className: css.specSlotCell,
                title: f.tooltip !== undefined && f.tooltip !== '' ? f.tooltip : undefined,
              },
                h(SpecAtom, { f, value: value[f.name], onEdit: edit, square: squareFor(f), ...(wire?.candidates !== undefined ? { wireCandidates: wire.candidates } : {}) }),
              )
            }),
          ),
        )
      : null,
    submenu && activeGroup !== undefined
      ? h('div', { className: css.groupTabs, role: 'tablist', 'data-form-submenu': '1' },
          groups.map((g) => {
            const selected = activeGroup.group === g.group
            return h('button', {
              key: g.group ?? '__general__',
              type: 'button',
              role: 'tab',
              'aria-selected': selected ? 'true' : 'false',
              'data-form-group-tab': g.group ?? 'general',
              className: css.groupTab + (selected ? ' ' + css.groupTabActive : ''),
              onClick: () => { setOpenGroup(g.group) },
            }, titleCaseId(g.group ?? 'General'))
          }),
        )
      : null,
    shownGroups.map((g) => {
      // THE DECL GRID (stroke 22): the group's `columns` (declared on
      // its fields — first-seen wins) grids the section; each field
      // spans its declared `width`. Undeclared → the stacked face.
      const gridCols = g.fields.find((f) => typeof f.columns === 'number' && f.columns >= 2)?.columns
      const cellStyle = (f: SpecField): Record<string, string> => {
        // NO gridCols-undefined ARM (the guarded-call-site proof):
        // the sole call below runs only in the gridded branch, so
        // gridCols is ALWAYS defined here.
        // THE TEXTAREA LAW: prompts never sit side by side — a
        // textarea spans the full row however the group grids
        // THE OVERFLOW LAW (stroke 24): minWidth 0 lets the ITEM
        // shrink inside its track — an input's ~185px intrinsic min
        // must never grow the card a horizontal scrollbar.
        if (f.type === 'textarea') return { gridColumn: '1 / -1', minWidth: '0' }
        return { gridColumn: `span ${Math.max(1, Math.floor(f.width ?? 1))}`, minWidth: '0' }
      }
      // THE SLOT ROW partition: image/image_list fields of one group
      // share a horizontal row (their labels live under their squares);
      // every other field keeps its stacked key row.
      const children: Array<ReturnType<typeof h>> = []
      let row: Array<ReturnType<typeof h>> = []
      const flush = (): void => {
        if (row.length === 0) return
        children.push(h('div', {
          key: 'slotrow-' + String(children.length), className: css.specSlotRow,
          ...(gridCols !== undefined ? { style: { gridColumn: '1 / -1', minWidth: '0' } } : {}),
        }, row))
        row = []
      }
      for (const f of g.fields) {
        // NO railNames SKIP (the visible-filter proof): groups derive
        // from groupFieldsAll, which visible() already stripped of
        // rail-seated names — a rail field can never arrive here.
        const claim = atomOf(f)
        const sq = squareFor(f)
        const wireCandidates = wire?.candidates
        if (claim !== undefined) {
          flush()
          const cell = h('div', { key: f.name, className: css.specField },
            h('span', { className: css.specFieldKey },
              f.label,
              f.required === true ? h('span', { className: css.specRequired }, ' *') : null,
              infoGlyph(f),
            ),
            claim({ f, value: value[f.name], onEdit: edit, square: sq }),
          )
          children.push(gridCols === undefined ? cell : h('div', { key: f.name + '-cell', style: cellStyle(f) }, cell))
          continue
        }
        if (f.type === 'image' || f.type === 'file') {
          row.push(h('div', {
            key: f.name,
            className: css.specSlotCell,
            title: f.tooltip !== undefined && f.tooltip !== '' ? f.tooltip : undefined,
          },
            h(SpecAtom, { f, value: value[f.name], onEdit: edit, square: sq, ...(wireCandidates !== undefined ? { wireCandidates } : {}) }),
          ))
          continue
        }
        flush()
        const cell = h(SpecFieldRow, {
          key: f.name, f, value: value[f.name], onEdit: edit,
          ...(sq !== undefined ? { square: sq } : {}),
          ...(wireCandidates !== undefined ? { wireCandidates } : {}),
        })
        children.push(gridCols === undefined ? cell : h('div', { key: f.name + '-cell', style: cellStyle(f) }, cell))
      }
      flush()
      return h('section', { key: g.group ?? '', className: css.specGroup, 'data-form-group-panel': g.group ?? 'general' },
        // THE SUBMENU NAMES THE PANEL: when the tab rail carries the
        // group's title, the panel repeats nothing (the DRY law).
        g.group !== null && !submenu ? h('h4', { className: css.specGroupTitle }, titleCaseId(g.group)) : null,
        gridCols === undefined ? children
          : h('div', { className: css.specGrid, style: { gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` } }, children),
      )
    }),
    // THE MOD SYSTEM — rendered by the constructor itself: every
    // surface (stage drill, add drill, studios) obeys, none wires it.
    modKinds.length > 0
      ? h(ModifiersSection, {
          kinds: modKinds, values: value, onEdit: edit, railSeated: railNames,
          ...(onPatch !== undefined ? { onPatch } : {}),
          ...(paintFace !== undefined ? { paintFace } : {}),
          ...(bboxFace !== undefined ? { bboxFace } : {}),
          ...(paintReference !== undefined ? { paintReference } : {}),
          ...(wire?.loadMedia !== undefined ? { loadMedia: wire.loadMedia } : {}),
        })
      : null,
    own.wireMenu,
  )
}
