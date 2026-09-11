/**
 * CardOutputs — the Outputs zone, FIRST zone of the action-card form
 * pattern (2026-08-16: "a) Outputs b) Inputs c) Parameters d) Mods").
 *
 *     Outputs → Inputs → Model → Parameters → Mods
 *
 * ONE shared implementation for every form card — the anatomy is a
 * pattern, not per-card code. The zone holds two things:
 *
 *   1. The OUTPUT CONTRACT (declared, skip-empty): what this card
 *      produces, straight from the catalog family block —
 *      ``primary_output`` (the primary artifact name), ``outputs`` (the
 *      declared format vocabulary, e.g. mp4|webm), ``optional_outputs``
 *      (named opt-in artifacts, e.g. mask_face). Pure display: the
 *      format SELECT stays a schema field in Parameters (the schema is
 *      the SSOT for what the user sets), optional outputs activate via
 *      their ``emit_when`` params. This line answers "what will I get?"
 *      BEFORE the run — the same declaration the run's output resolver
 *      enforces after it (declared = enforced, outputs.py).
 *   2. The artifacts (children): the caller's preview/empty-state block
 *      renders inside the zone — the card's outputs ARE the zone's
 *      content, before (the contract) and after (the artifacts) the run.
 *
 * Card-model resolution mirrors ParamEditor's: an imported flow
 * card's ``service`` is the FAMILY name (e.g. "video_generate"), while
 * ``params.model`` carries the real catalog key — prefer it.
 *
 * No model-specific branches (the golden rule): a family that declares
 * nothing gets the label + artifacts, no chips — the pattern renders
 * from the catalog, never from code.
 */
import type { ReactNode } from "react"
import { getCachedCatalog, familyOf } from "@melite/catalog"
import type { CardStage } from "@melite/contracts"
export function CardOutputs({ stage, children }: {
 stage: CardStage
 /** The artifact area — the preview (done) or the empty-state hint. */
 children?: ReactNode
}) {
 // Pre-catalog boot (cache null — the loader is skipped under Vitest and
 // races the first open in production): no declarations to show, the
 // zone renders label + artifacts only. Declared-only, never a guess.
 const cat = getCachedCatalog()
 const model =
 typeof stage.params?.model === "string" && stage.params.model
 ? stage.params.model
 : stage.service
 const fam = cat ? familyOf(model, cat) : undefined
 const famEntry = fam && cat ? cat.families?.[fam] : undefined
 const primary = famEntry?.primary_output ?? null
 const formats = famEntry?.outputs ?? []
 const optionals = famEntry?.optional_outputs ?? []
 const hasContract = Boolean(primary) || formats.length > 0 || optionals.length > 0

 return (
 <div data-zone="outputs" className="flex h-full flex-col">
 <div className="px-4 pb-1 pt-3">
 <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
 Outputs
 </label>
 {hasContract && (
 <div
 data-outputs-contract={model}
 className="flex flex-wrap items-center gap-1.5 pb-0.5"
 >
 {primary && (
 <span
 title={`Primary artifact — "${primary}" is the name downstream slots wire by`}
 data-output-primary={primary}
 className="rounded border border-brand/40 bg-brand/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-brand"
 >
 → {primary}
 </span>
 )}
 {formats.map((f) => (
 <span
 key={f.id}
 data-output-format={f.id}
 title={
 f.default
 ? `Default format — the output_format param's fallback`
 : `Declared format — pick via the output_format param`
 }
 className={
 f.default
 ? "rounded border border-sidebar-border/60 bg-sidebar/40 px-1.5 py-0.5 font-mono text-[9px] text-foreground/80"
 : "rounded border border-sidebar-border/40 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/70"
 }
 >
 {f.label}
 </span>
 ))}
 {optionals.map((o) => (
 <span
 key={o.name}
 data-output-optional={o.name}
 title={
 o.tooltip ??
 `Optional — emits when "${o.emit_when}" is set`
 }
 className="rounded border border-dashed border-sidebar-border/60 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/60"
 >
 + {o.label}
 </span>
 ))}
 </div>
 )}
 </div>
 {children}
 </div>
 )
}
