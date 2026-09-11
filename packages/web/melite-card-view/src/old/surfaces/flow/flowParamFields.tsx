// flowParamFields.tsx — the Parameters zone of the form card
// (FILE-SIZE PIVOT Cut 1c; moved VERBATIM from FlowCard.tsx): the
// declared-vocabulary render flow — numbers grid, prompt/lyrics/
// negative blocks, JSON document widget, boolean pills, textarea +
// select + free-text rows. PURE PROPS COMPONENT: every draft write
// flows through onFieldChange / onSelectChange / onEnhancePrompt.

import { optionValue, optionLabel, evalVisibleWhen, type SelectOptions, type FormFeatures } from "@melite/contracts"
import { inputSlots } from "@melite/catalog"
import { Tip } from "@melite/ui/tip"
import { Bot, Loader2, Wand2 } from "lucide-react"
import { NumberField } from "@melite/ui/NumberField"
import { FieldLabel, FIELD_CONTROL } from "@melite/ui/field"
import { Button } from "@melite/ui/button"
import { Input } from "@melite/ui/input"
import { Textarea } from "@melite/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@melite/ui/select"
import { JsonParamField } from "./flowCardJsonField"
import type { Variant } from "@/surfaces/generate/PresetGroup"
import type { CardStage } from "@melite/contracts"
import { useEffect, useRef } from "react"

/** START SMALL, GROW ON DEMAND (operator order, 2026-09-06: "it needs
 * to START SMALL, and ONLY EXPAND when it needs more room"). Two rows
 * at rest, one row per ~16px of content, capped at 10 rows (then it
 * scrolls). Shrinks back when content is deleted. */
function GrowTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }): React.ReactElement {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 160) + "px"
  }, [props.value])
  return (
    <Textarea
      {...props}
      ref={ref as React.Ref<HTMLTextAreaElement>}
      rows={2}
      className={
        (props.className ?? "") +
        " min-h-[2.6rem] overflow-y-auto scrollbar-thin"
      }
    />
  )
}

export function ParamFields({
  draft,
  stage,
  specFields,
  specVw,
  specZones,
  specModifierKeys,
  specFeatures,
  specEnhancePrompt,
  specEnhancePrompts,
  enhancing,
  enhanceError,
  onFieldChange,
  onSelectChange,
  onEnhancePrompt,
  onAgentEnhancePrompt,
  serveLabel,
  agentEnhancing,
}: {
  draft: Record<string, unknown>
  stage: CardStage
  specFields: Record<string, { type?: string; label?: string; options?: SelectOptions; min?: number | null; max?: number | null; step?: number | null; tooltip?: string | null }>
  specVw: Record<string, string | null>
  specZones: Record<string, string>
  specModifierKeys: string[]
  specFeatures: FormFeatures | null
  specEnhancePrompt: string
  specEnhancePrompts: Record<string, string>
  enhancing: boolean
  enhanceError: string | null
  onFieldChange: (updater: (draft: Record<string, unknown>) => Record<string, unknown>) => void
  onSelectChange: (k: string, value: string) => void
  onEnhancePrompt: (fieldName: string) => void
  onAgentEnhancePrompt: () => void
  serveLabel: string | null
  agentEnhancing: boolean
}) {
  const TEXT_KEYS = new Set(["prompt", "negative_prompt"])
  // When the lyrics enhance prompt is declared (music cards — ACE-Step,
  // MiniMax Music 3), claim lyrics for a dedicated block with its own
  // Enhance button (below).
  // When NOT declared, lyrics stays in the generic textarea grid — no
  // duplicate rendering, no hidden field.
  if (specEnhancePrompts["lyrics"]) TEXT_KEYS.add("lyrics")
  // visible_when gate — a field renders only when its schema-groups
  // condition passes against the live draft (no condition = always
  // visible). The upscale family's two-tier matrix (2026-08-08): the
  // region select on `mode == 'inpaint'`, the mask + prompt on
  // `mode == 'inpaint' && inpaint_region == 'free'`, the YOLO detail
  // knobs on `mode == 'inpaint' && inpaint_region != 'free'` — without
  // this the prompt textarea leaked onto every upscale card.
  const isVisible = (k: string): boolean => !specVw[k] || evalVisibleWhen(specVw[k], draft)
  
  // Display label: the form-spec's human ``label`` (Field.label — "Target
  // Size", "Upscale Method") when the backend shipped one, else the wire key
  // with underscores → spaces. The select/free rows previously rendered the
  // RAW key ({k}) in a w-20 truncate span, so "target_size" ellipsed to
  // "target_…" — unreadable (2026-08-09: "I can't even read the full
  // titles, the names of parameters get cut off"). The backend already
  // declares nice labels; specFields just wasn't capturing them.
  const fieldLabel = (k: string): string => specFields[k]?.label?.trim() || k.replace(/_/g, " ")
  // Field render order — DECLARED schema order, not dict-insertion
  // accident (2026-08-15). The form-spec's flat fields list IS the
  // declaration order (form_spec.py emits groups sorted by Group.order,
  // fields sorted by Field.order), and rememberSpecFields walks that
  // same list building specFields — so Object.keys(specFields) preserves
  // it. Before this, bucket order followed the DRAFT's key insertion
  // order (catalog defaults YAML, then schema-fill appends), which put
  // the inpaint card's mode discriminator AFTER sampler/scheduler — the
  // select that gates half the card rendered below the knobs it gates.
  //
  // THE FORM IS THE CARD (2026-08-18, "YAML IS TRUTH — it's a FORM,
  // not bespoke-hardcoded-[REDACTED 2026-11-05]"): ONLY spec-declared fields render.
  // The old renderer appended every draft key the form never declared
  // as raw free-text rows ("target size 1024 / vl encoder size 392")
  // under the YAML-curated form — a values-driven dump overriding the
  // form's curation. Undeclared draft keys still exist BY DESIGN as
  // TRANSPORT, never as UI:
  //   * route YAML defaults the form hides on purpose — the form YAML's
  //     own `internal: true` fields (target_size, vl_encoder_size,
  //     use_stock_nodes, double_reference) are stripped from the served
  //     vocabulary but still ride the served values;
  //   * wire-only switch keys (loras_selected — the managed-LoRA
  //     switch the flow draft carries as transport; no family
  //     signature declares it and NO backend reader consumes it
  //     (2026-09-05 audit — a silent-drop fossil the flow lane owns;
  //     the generate-surface click gate no longer blesses it), so
  //     the run door's defaults merge can NEVER supply it — the
  //     draft must keep carrying it).
  // They ride the request unchanged and the run door applies the
  // route's YAML defaults server-side (catalog defaults = SSOT,
  // request wins) — NOTHING is dropped; the card just stops RENDERING
  // what the form never declared. If a hidden param needs UI, DECLARE
  // it in the form YAML — never render values the form doesn't name.
  const allKeys = Object.keys(specFields).filter((k) => k in draft)
  // Keys owned by variant overrides — driven by the Variant dropdown
  // (VariantSelect), never by a standalone form field. A variant's
  // overrides (e.g. {model: "moss-tts-local"}) are owned by the dropdown;
  // the key stays in the draft but never renders as a text input.
  // NOTE (2026-08-13): qwen3_variant is NOT here — it has no variant
  // overrides (it's a catalog default, not an override). It has a proper
  // Field declaration (type="select") and renders ONCE as a Talker Mode
  // dropdown in the selectKeys grid (2026-08-14: the header special-case
  // that rendered it a SECOND time — and showed "Talker Mode: CustomVoice"
  // on the VoiceID card as a phantom voice default — is deleted; the spec
  // field is the one surface).
  const variantOverrideKeys = new Set<string>(
  ((specFeatures?.variants ?? []) as Variant[]).flatMap(
  (v) => Object.keys(v.defaults ?? {}),
  ),
  )
  // ── Unified numeric routing (2026-08-10) ───────────────────────────
  // ONE NumberField for every numeric param — absorbs the old hardcoded
  // NUMERIC_KEYS list AND the old schema-declared "slider" full-width
  // rows. Routing is type-driven now: a param is numeric if its value is
  // a number OR the spec declares type number/slider. min/max/step flow
  // from specFields into the NumberField's drag sensitivity + fill bar.
  // This also plugs the old leak where a numeric value not in the
  // NUMERIC_KEYS allowlist fell through to the free-text grid.
  const isNumericField = (k: string): boolean => {
    if (TEXT_KEYS.has(k)) return false
    if ((inputSlots() as readonly string[]).includes(k)) return false
    if (specModifierKeys.includes(k)) return false
    const specType = specFields[k]?.type
    // textarea/select own their own widgets — never numeric.
    if (specType === "textarea" || specType === "select") return false
    if (typeof draft[k] === "number") return true
    return specType === "number" || specType === "slider"
}
  // ── THE RENDER FLOW (2026-08-15): ONE pass in DECLARED order ────────
  // The bucket layout this replaces (numbers grid → textareas → selects →
  // free text) re-ordered declared fields BY TYPE: a select declared
  // first (the inpaint card's mode discriminator — Group "Mode", field
  // order 0) rendered below EVERY numeric knob in the form, because the
  // selects bucket came after the numbers bucket. Within-bucket declared
  // ordering (the first half of the 2026-08-15 fix) was not enough — the
  // bucket STRUCTURE is the reorder. Now the body is one sequential flow
  // over allKeys (declared order, undeclared trailing): each field renders
  // at its declared position with its declared widget, and only CONSECUTIVE
  // numeric runs collapse into the 3-col grid (density preserved for knob
  // clusters; a select between two numbers breaks the run by declaration,
  // as the schema author intended).
  // NOTE: input slots are NOT in the flow. The slot UI lives at the top of
  // the card — SlotGrid (CardDetailModal.tsx → SlotGrid → the shared
  // SlotSquare): file picker + asset drag-drop + wire to an earlier card.
  // Mod bags are subcards (SubcardGrid), never standalone rows. Variant
  // override keys are owned by the Variant dropdowns in the model row.
  const flowExcluded = new Set<string>([
    ...(inputSlots() as readonly string[]),
    ...specModifierKeys,
    ...variantOverrideKeys,
    // 4-zone anatomy backstop (card-studio-pattern.md §4/E6): a field
    // whose group is NOT params renders on its zone's surface (Inputs
    // via SlotGrid, Mods via SubcardGrid), never in the flat params
    // flow. A no-op for real specs today — slot fields are in
    // inputSlots(), mod-bag keys in specModifierKeys — but it makes
    // the contract render-proof against a future group tagged
    // inputs/mods without the slot/mod wiring.
    ...Object.entries(specZones).filter(([, z]) => z !== "params").map(([k]) => k),
  ])
  const flow: Array<{ kind: "numbers"; keys: string[] } | { kind: "field"; key: string }> = []
  for (const k of allKeys) {
    if (flowExcluded.has(k) || !isVisible(k)) continue
    if (isNumericField(k)) {
      const last = flow[flow.length - 1]
      if (last && last.kind === "numbers") last.keys.push(k)
      else flow.push({ kind: "numbers", keys: [k] })
    } else {
      flow.push({ kind: "field", key: k })
    }
  }
  
  const numOrStr = (k: string, v: string) => {
    const orig = stage.params[k]
    return typeof orig === "number" ? Number(v) : v
}
  return (
    <>
      {/* ── Parameters zone (4-zone anatomy §4) — the schema groups'
          non-slot fields in declared order. Skip-empty: no visible
          fields → no Parameters zone. ── */}
      {flow.length > 0 && (
        <div key="params-zone" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
          Parameters
        </div>
      )}
      {/* ── THE BODY — one sequential flow in DECLARED order (2026-08-15).
          Each field renders at its declared position with its declared
          widget; consecutive numeric runs collapse into the 3-col grid.
          The dedicated prompt/lyrics/negative blocks are IN the flow — a
          schema that declares the discriminator first renders it first
          (the inpaint card's "What do you want to do?" leads the form),
          and a schema that declares the prompt first keeps the generate
          card's layout unchanged. */}
      {flow.map((block) =>
        block.kind === "numbers" ? (
          <div key={block.keys.join("|")} className="grid grid-cols-3 gap-2">
            {block.keys.map((k) => {
              const meta = specFields[k]
              return (
                <NumberField
                  key={k}
                  value={Number(draft[k] ?? 0)}
                  onChange={(v) => onFieldChange((d) => ({ ...d, [k]: v }))}
                  min={typeof meta?.min === "number" ? meta.min : undefined}
                  max={typeof meta?.max === "number" ? meta.max : undefined}
                  step={typeof meta?.step === "number" ? meta.step : undefined}
                  label={fieldLabel(k)}
                  tooltip={meta?.tooltip || k}
                />
              )
            })}
          </div>
        ) : (
          (() => {
            const k = block.key
            // ── Prompt — large textarea. Gated on visible_when (the
            // upscale family's prompt renders only in inpaint mode).
            // Enhance button (2026-08-09): renders across from the label
            // ONLY when the model's form-spec carries an enhance_prompt
            // (the model catalogue declares one for this route).
            // Single-shot LLM rewrite via the active Enhance key.
            if (k === "prompt") {
              return (
                <label className="block">
                  <FieldLabel
                    label="Prompt"
                    right={(specEnhancePrompts["prompt"] || specEnhancePrompt) ? (
                      <span className="inline-flex items-center gap-2">
                        <Tip tip={`One-shot rewrite via ${serveLabel ?? "…"}`}>
                          <span className="inline-flex">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={() => onEnhancePrompt("prompt")}
                              disabled={enhancing || agentEnhancing || !String(draft.prompt ?? "").trim()}
                              // aria-label is REQUIRED (2026-08-09 gate:4):
                              // the wrapping <label> names its first
                              // labelable descendant — without it the wand
                              // announces the prompt VALUE, not its action.
                              aria-label="Enhance"
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-brand/80 hover:bg-accent/60 hover:text-brand disabled:opacity-40"
                            >
                              {enhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                              {enhancing ? "Enhancing…" : "Enhance"}
                            </Button>
                          </span>
                        </Tip>
                        {/* AGENT ENHANCE (2026-08-22): the agent system's
                         * orchestration core over EVERY declared field via
                         * /melite-tools/enhance {model} — one press, all
                         * fields. The serving model shows in the tooltip. */}
                        <Tip tip={`Agent Enhance — every declared field via ${serveLabel ?? "…"}`}>
                          <span className="inline-flex">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={onAgentEnhancePrompt}
                              disabled={enhancing || agentEnhancing || !String(draft.prompt ?? "").trim()}
                              aria-label="Agent Enhance"
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-brand/80 hover:bg-accent/60 hover:text-brand disabled:opacity-40"
                            >
                              {agentEnhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                              {agentEnhancing ? "Agent working…" : "Agent Enhance"}
                            </Button>
                          </span>
                        </Tip>
                      </span>
                    ) : undefined}
                  />
                  {enhanceError && (
                    <p className="mb-1 text-[10px] text-destructive/80">{enhanceError}</p>
                  )}
                  <GrowTextarea
                    value={String(draft.prompt ?? "")}
                    onChange={(e) => onFieldChange((d) => ({ ...d, prompt: e.target.value }))}
                    // aria-label is REQUIRED: the Enhance button inside the
                    // wrapping <label> is its first labelable descendant, so
                    // per the HTML spec the label's control association goes
                    // to the BUTTON, not this textarea — without the
                    // attribute the field has no accessible name
                    // (2026-08-09 gate:4 root cause).
                    aria-label="Prompt"
                    className={FIELD_CONTROL + " leading-relaxed resize-y"}
                  />
                </label>
              )
            }
            // ── Lyrics — ACE-Step music only. Dedicated block (not the
            // generic textarea widget) so it carries its own Enhance
            // button, independent from the prompt Enhance. When the spec
            // declares no lyrics enhance prompt, lyrics falls through to
            // the generic textarea widget below.
            if (k === "lyrics" && specEnhancePrompts["lyrics"]) {
              return (
                <label className="block">
                  <FieldLabel
                    label="Lyrics"
                    right={
                      <Tip tip="Enhance the lyrics with the active LLM key">
                      <span className="inline-flex">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => onEnhancePrompt("lyrics")}
                          disabled={enhancing || !String(draft.lyrics ?? "").trim()}
                          // Same naming requirement as the prompt wand
                          // (2026-08-09 gate:4): the wrapping <label>
                          // names its first labelable descendant.
                          aria-label="Enhance"
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-brand/80 hover:bg-accent/60 hover:text-brand disabled:opacity-40"
                        >
                          {enhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                          {enhancing ? "Enhancing…" : "Enhance"}
                        </Button>
                      </span>
                      </Tip>
                    }
                  />
                  <GrowTextarea
                    value={String(draft.lyrics ?? "")}
                    onChange={(e) => onFieldChange((d) => ({ ...d, lyrics: e.target.value }))}
                    aria-label="Lyrics"
                    placeholder="[Verse 1]&#10;...&#10;[Chorus]&#10;..."
                    className={FIELD_CONTROL + " leading-relaxed resize-y"}
                  />
                </label>
              )
            }
            // ── Negative prompt — medium textarea.
            if (k === "negative_prompt") {
              return (
                <label className="block">
                  <FieldLabel label="Negative Prompt" />
                  <GrowTextarea
                    value={String(draft.negative_prompt ?? "")}
                    onChange={(e) => onFieldChange((d) => ({ ...d, negative_prompt: e.target.value }))}
                    className={FIELD_CONTROL + " leading-relaxed resize-y"}
                  />
                </label>
              )
            }
            const specType = specFields[k]?.type
            // ── JSON document widget — object/array VALUES (the Timeline
            // card's beats/keyframes documents). Claims the field BEFORE
            // the textarea/select branches: a document field declared
            // type="textarea" whose value is a list must never fall into
            // String(draft[k]) ("[object Object]") or the single-line
            // free-text input. Commits parsed values only — see
            // JsonParamField.
            if (Array.isArray(draft[k]) || (typeof draft[k] === "object" && draft[k] !== null)) {
              return (
                <JsonParamField
                  key={k}
                  label={fieldLabel(k)}
                  tooltip={specFields[k]?.tooltip}
                  value={draft[k]}
                  onChange={(v) => onFieldChange((d) => ({ ...d, [k]: v }))}
                />
              )
            }
            // ── Boolean widget — On/Off pills storing REAL booleans
            // (2026-08-15). Before this, a boolean param fell through to
            // the free-text input, stored the STRING "true" on edit, and
            // the run gate rejected the request at Run time
            // (validateParamsAgainstSchema: expected boolean, got string).
            if (specType === "boolean" || typeof draft[k] === "boolean") {
              const on = draft[k] === true
              const pill = (val: boolean, text: string) => (
                <Button
                  type="button"
                  variant="ghost"
                  aria-pressed={on === val}
                  onClick={() => onFieldChange((d) => ({ ...d, [k]: val }))}
                  className={`px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                    on === val
                      ? "bg-brand/20 text-brand"
                      : "bg-transparent text-muted-foreground/70 hover:bg-sidebar-accent/50"
                  }`}
                >
                  {text}
                </Button>
              )
              return (
                <div key={k} className="block">
                  <FieldLabel label={fieldLabel(k)} tooltip={specFields[k]?.tooltip || k} />
                  <div className="inline-flex overflow-hidden rounded border border-sidebar-border/60">
                    {pill(true, "On")}
                    {pill(false, "Off")}
                  </div>
                </div>
              )
            }
            // ── Textarea widget (schema_groups type="textarea" — instruct,
            // voice_pca_strengths, …): multi-line textbox for long-form
            // content a 1-row input truncates. Enhance button (2026-08-13):
            // textareas with an entry in specEnhancePrompts get one, like
            // the dedicated prompt/lyrics blocks (see the instruct note).
            if (specType === "textarea") {
              const canEnhance = !!specEnhancePrompts[k] &&
                (k !== "instruct" ||
                  !("qwen3_variant" in draft) ||
                  draft.qwen3_variant === "VoiceDesign")
              return (
                <label key={k} className="block">
                  <FieldLabel
                    label={specFields[k]?.tooltip ? (
                        <abbr title={specFields[k]!.tooltip!} className="no-underline">
                          {fieldLabel(k)}
                        </abbr>
                      ) : (
                        fieldLabel(k)
                      )}
                    right={canEnhance ? (
                      <Tip tip={`Enhance ${fieldLabel(k)} with the active LLM key`}>
                        <span className="inline-flex">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            aria-label={`Enhance ${fieldLabel(k)}`}
                            onClick={() => onEnhancePrompt(k)}
                            disabled={enhancing || !String(draft[k] ?? "").trim()}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-brand/80 hover:bg-accent/60 hover:text-brand disabled:opacity-40"
                          >
                            {enhancing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                            {enhancing ? "Enhancing…" : "Enhance"}
                          </Button>
                        </span>
                      </Tip>
                    ) : undefined}
                  />
                  <GrowTextarea
                    value={String(draft[k] ?? "")}
                    onChange={(e) => onFieldChange((d) => ({ ...d, [k]: e.target.value }))}
                    className={FIELD_CONTROL + " font-mono leading-relaxed resize-y"}
                  />
                </label>
              )
            }
            // ── Select widget — the spec's finite options, never free text
            // (2026-08-07: "sampler is free-text, there are finite
            // options"). Discriminators (mode, …) land here at their
            // DECLARED position — the inpaint card's mode select leads
            // the form.
            if (specType === "select" && (specFields[k]?.options?.length ?? 0) > 0) {
              const options = specFields[k]!.options!
              const cur = String(draft[k] ?? "")
              // ── Button row for small option sets — PRESETS VISIBLE
              // (2026-08-18: "I don't SEE presets ANYWHERE"). A finite
              // choice set small enough to take in at a glance renders
              // as chips ON the card — int8's lone "Blue Mesh SOTA" was
              // a CLOSED one-option dropdown that read as a hardcoded
              // label. The rule is generic and count-driven (no
              // field-name special cases), and the options themselves
              // are YAML truth: option_sources._preset_options — "the
              // filesystem IS the option list", the route's served
              // presets. Larger vocabularies (samplers, schedulers,
              // catalog model routes) keep the dropdown.
              if (options.length <= 5) {
                const chip = (active: boolean) =>
                  `px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                    active
                      ? "bg-brand/20 text-brand"
                      : "bg-transparent text-muted-foreground/70 hover:bg-sidebar-accent/50"
                  }`
                // A value not offered as an option (the preset field's
                // "" plain-default) still gets a chip — state is never
                // invisible. Selecting it routes through the same
                // onSelectChange contract as every other chip.
                const hasNone =
                  cur === "" && !options.some((o) => optionValue(o) === "")
                return (
                  <div key={k} className="block">
                    <FieldLabel label={fieldLabel(k)} tooltip={specFields[k]?.tooltip || k} />
                    <div className="inline-flex flex-wrap overflow-hidden rounded border border-sidebar-border/60">
                      {hasNone && (
                        <Button
                          type="button"
                          variant="ghost"
                          aria-pressed={true}
                          onClick={() => onSelectChange(k, "")}
                          className={chip(true)}
                        >
                          Default
                        </Button>
                      )}
                      {options.map((o) => {
                        const v = optionValue(o)
                        const active = cur === v
                        return (
                          <Button
                            key={v}
                            type="button"
                            variant="ghost"
                            aria-pressed={active}
                            onClick={() => onSelectChange(k, v)}
                            className={chip(active)}
                          >
                            {optionLabel(o)}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )
              }
              return (
                <label key={k} className="block">
                  <FieldLabel label={fieldLabel(k)} tooltip={specFields[k]?.tooltip || k} />
                  <Select
                    value={cur}
                    onValueChange={(v) => onSelectChange(k, v)}
                  >
                    <SelectTrigger
                      aria-label={fieldLabel(k)}
                      // FIELD_CONTROL minus `block`: the kit trigger is
                      // flex (value + chevron row) — `block` would stack
                      // them (tailwind-merge display conflict). Every
                      // other box token rides verbatim (field grammar).
                      className="w-full rounded border border-sidebar-border/60 bg-background/60 px-1.5 py-0.5 text-[11px] text-foreground outline-none focus:border-brand/60"
                    >
                      <SelectValue>
                        {(v: unknown) => {
                          const hit = options.find((o) => optionValue(o) === v)
                          return hit ? optionLabel(hit) : String(v ?? "")
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((o) => (
                        <SelectItem key={optionValue(o)} value={optionValue(o)}>
                          {optionLabel(o)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              )
            }
            // ── Free-text row — strings/objects the spec doesn't declare a
            // widget for (spec-less keys).
              return (
                <label key={k} className="block">
                  <FieldLabel label={fieldLabel(k)} tooltip={specFields[k]?.tooltip || k} />
                  <Input
                    aria-label={fieldLabel(k)}
                    value={typeof draft[k] === "object" ? JSON.stringify(draft[k]) : String(draft[k] ?? "")}
                    onChange={(e) => onFieldChange((d) => ({ ...d, [k]: numOrStr(k, e.target.value) }))}
                    className={FIELD_CONTROL}
                  />
                </label>
              )
          })()
        ),
      )}
      {/* Save bar REMOVED (2026-08-09): edits auto-save on a 300ms debounce.
          The "Save & mark stale" button was redundant — updateStageParams
          already marks the flow stale on every param write, so the
          button was just a gate on WHEN persistence happened. Now it just
          happens. */}
    </>
  )
}
