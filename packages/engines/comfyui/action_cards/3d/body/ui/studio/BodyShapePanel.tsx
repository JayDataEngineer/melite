/**
 * BodyShapePanel - embedded slider panel for the Body Studio workspace.
 *
 * This is the panel-only form of BodyShapeDialog (no Dialog wrapper). Sliders
 * write to the Body Studio store's `editing` character slice, which the
 * MeshPreviewCanvas subscribes to for live updates.
 *
 * Layout:
 * - Phenotype / Body / Face tabs (Anny has all three; MHR just Phenotype;
 * SOMA shows a "no controls" hint).
 * - Each tab is a fixed-height ScrollArea so the bottom is always reachable.
 * - Randomize / Reset action bar.
 * - The "save preset" affordance is intentionally omitted here - Body
 * Studio's library (Save / Load named characters) lives at the bottom of
 * the BodyStudioTab and uses the studio store directly. This panel only
 * owns the live-edit surface.
 */
import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@melite/ui/button"
import { Label } from "@melite/ui/label"
import { NumberField } from "@melite/ui/NumberField"
import { ScrollArea } from "@melite/ui/scroll-area"
import {
 Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@melite/ui/collapsible"
import { Tabs, TabsContent } from "@melite/ui/tabs"
import { RailTabs } from "../../../ui/railTabs"
import { Dices, RotateCcw, ChevronDown, Loader2 } from "lucide-react"
import { fetchIdentitySpace, type IdentitySpace } from "./bodyMesh"
import { useBodyStudio } from "./bodyStudio"
import { Tip } from "@melite/ui/tip"

// ── Label formatting helpers ────────────────────────────────────────────────

/**
 * Format a raw dimension label for display.
 *
 * MHR's PCA dimensions come back as "pc1".."pc45" - meaningful to the model
 * but opaque to a user sculpting a body. We surface them as "PC 1" so they
 * at least read as numbered principal components.
 *
 * Anny's labels are kebab-case morph names like "upperarm-fat-incr",
 * "measure-upperarm-length-incr", "breast-volume-vert-up". We strip the
 * noise (measure- prefix, -incr suffix) and pull out axis/direction
 * qualifiers into a clean Title Case phrase:
 * upperarm-fat-incr -> "Upperarm Fat"
 * upperarm-scale-depth-incr -> "Upperarm Scale (Depth)"
 * measure-upperarm-length-incr -> "Upperarm Length"
 * breast-volume-vert-up -> "Breast Volume Up (Vertical)"
 * cupsize -> "Cup Size"
 */
function formatDimLabel(raw: string, idx: number): string {
 if (!raw) return `Dim ${idx}`
 // pc1 / PC1 / pca_1 -> "PC 1"
 const pcMatch = raw.match(/^p?c?a?_?(\d+)$/i)
 if (pcMatch) return `PC ${pcMatch[1]}`
 // dim0 / dimension_0 -> "Dim 0"
 const dimMatch = raw.match(/^dim(?:ension)?_?(\d+)$/i)
 if (dimMatch) return `Dim ${dimMatch[1]}`

 let s = raw.toLowerCase()
 // Split smashed compound words so they title-case correctly.
 s = s.replace(/\bcupsize\b/g, "cup size")
 // "measure-X-Y-incr" - the "measure-" prefix just flags it as a
 // measurement morph; the X-Y part is what the user cares about.
 if (s.startsWith("measure-")) s = s.slice(8)
 // "-incr" (increase) is the default direction for blendshape morphs;
 // dropping it removes visual noise without losing meaning.
 s = s.replace(/-incr$/, "")
 // Axis qualifier (last token after incr strip): vert / horiz / depth.
 // Pulled out into a parenthetical so the main phrase stays readable.
 let axisQual = ""
 s = s.replace(/-vert$/, () => { axisQual = "Vertical"; return "" })
 .replace(/-horiz$/, () => { axisQual = "Horizontal"; return "" })
 .replace(/-depth$/, () => { axisQual = "Depth"; return "" })
 // Direction qualifier (now the last token): up / down / out / in.
 let dirQual = ""
 s = s.replace(/-(up|down|out|in)$/, (_, d: string) => {
 dirQual = d.charAt(0).toUpperCase() + d.slice(1)
 return ""
 })
 // Tidy any trailing dash left over from suffix strips.
 s = s.replace(/-+$/g, "")
 // Title-Case the remaining kebab/space-separated phrase.
 const out = s.split(/[-\s]+/).filter(Boolean)
 .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
 .join(" ")
 // Append direction first (semantic), then axis as parenthetical.
 return [out, dirQual, axisQual ? `(${axisQual})` : ""]
 .filter(Boolean).join(" ") || raw
}

/**
 * Shorten a variance-group label for use as a TAB name (must fit in ~12ch).
 *
 * MHR's group labels are descriptive sentences ("Major - height / weight /
 * build") which would overflow a tab trigger. We pull the leading keyword
 * out so the tab reads "Major" / "Regional" / "Fine" - the full label is
 * still shown as a subheader inside the tab content.
 */
function shortGroupLabel(label: string): string {
 // "Major - height / weight / build" -> "Major"
 const dashIdx = label.search(/\s[-\/]/)
 if (dashIdx > 0) return label.slice(0, dashIdx).trim()
 // Single-word labels pass through.
 return label.length > 14 ? label.slice(0, 12) + "..." : label
}

// ── Single slider row ───────────────────────────────────────────────────────

interface SliderRowProps {
 label: string
 value: number
 min: number
 max: number
 defaultVal: number
 onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, defaultVal, onChange }: SliderRowProps) {
 const isDefault = Math.abs(value - defaultVal) < 0.001
 return (
 <div className="flex items-center gap-2 py-0.5">
 <Tip tip={label}>
 <Label className="w-32 shrink-0 text-[10px] text-muted-foreground/80 leading-tight whitespace-normal">
 {label}
 </Label>
 </Tip>
 {/* The app's standard numeric bar (2026-08-10): drag horizontally to
 scrub, click to type an exact value, range-fill tints to show
 position. Replaces the former <Slider> + <Input type="number">
 pair so the Mesh card uses the SAME type-or-drag control the rest
 of the editor uses (NumberField). min/max feed the drag
 sensitivity, the snap, and the fill; step=0.01 matches the prior
 slider granularity so existing presets round-trip identically. */}
 <NumberField
 value={value}
 min={min}
 max={max}
 step={0.01}
 onChange={onChange}
 className="flex-1 min-w-0"
 />
 {!isDefault && (
 <Tip tip={`Reset ${label} to default (${defaultVal})`}>
 <Button
 type="button"
 variant="ghost"
 onClick={() => onChange(defaultVal)}
 className="h-5 w-5 border-0 text-muted-foreground/40 hover:text-foreground shrink-0"
 aria-label={`Reset ${label} to default (${defaultVal})`}
 >
 <RotateCcw className="h-2.5 w-2.5" />
 </Button>
 </Tip>
 )}
 </div>
 )
}

// ── Region group list (Body / Face tabs) ────────────────────────────────────

interface RegionGroupListProps {
 space: IdentitySpace
 category: "body" | "face"
 openDetailRegions: Record<string, boolean>
 setOpenDetailRegions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
 localDetail: Record<string, number>
 onUpdate: (label: string, v: number, defaultVal: number) => void
}

function RegionGroupList({
 space, category, openDetailRegions, setOpenDetailRegions, localDetail, onUpdate,
}: RegionGroupListProps) {
 if (!space.local_changes) return null
 const lc = space.local_changes
 const groups = lc.groups.filter((g) => g.category === category)
 const activeInCategory = groups.reduce(
 (n, g) => n + g.indices.filter((idx) => lc.labels[idx] in localDetail).length,
 0,
 )
 const totalInCategory = groups.reduce((n, g) => n + g.indices.length, 0)
 return (
 <div className="py-1">
 <div className="flex items-center justify-between py-1 px-1 text-[9px] uppercase tracking-wider text-muted-foreground/50">
 <span>{category === "face" ? "Face detail morphs" : "Body detail morphs"}</span>
 <span>
 {activeInCategory > 0
 ? `${activeInCategory} / ${totalInCategory} active`
 : `${totalInCategory} sliders`}
 </span>
 </div>
 {groups.map((region) => {
 const isRegionOpen = openDetailRegions[region.label] ?? false
 const regionActive = region.indices.filter((idx) => lc.labels[idx] in localDetail).length
 return (
 <Collapsible
 key={region.label}
 open={isRegionOpen}
 onOpenChange={(o) => setOpenDetailRegions((p) => ({ ...p, [region.label]: o }))}
 >
 <CollapsibleTrigger
 className={`flex items-center gap-1 w-full py-0.5 pl-1 text-[10px] hover:text-foreground ${
 category === "face" ? "text-amber-400/70" : "text-muted-foreground/70"
 }`}
 >
 <ChevronDown className={`h-2.5 w-2.5 transition-transform ${isRegionOpen ? "" : "-rotate-90"}`} />
 {region.label}
 <span className="ml-auto text-muted-foreground/40">
 {regionActive > 0 ? `${regionActive}/${region.indices.length}` : `${region.indices.length}`}
 </span>
 </CollapsibleTrigger>
 <CollapsibleContent>
 <div className="pl-3 border-l border-border/20 ml-1.5 space-y-0">
 {region.indices.map((idx) => {
 const lbl = lc.labels[idx] ?? `morph${idx}`
 const def = lc.defaults[idx] ?? 0
 return (
 <SliderRow
 key={idx}
 label={formatDimLabel(lbl, idx)}
 value={localDetail[lbl] ?? def}
 min={lc.range[0]}
 max={lc.range[1]}
 defaultVal={def}
 onChange={(v) => onUpdate(lbl, v, def)}
 />
 )
 })}
 </div>
 </CollapsibleContent>
 </Collapsible>
 )
 })}
 </div>
 )
}

// ── Main panel ──────────────────────────────────────────────────────────────

export function BodyShapePanel() {
 const editing = useBodyStudio((s) => s.editing)
 const patchEditing = useBodyStudio((s) => s.patchEditing)

 const [space, setSpace] = useState<IdentitySpace | null>(null)
 const [local, setLocal] = useState<number[]>([])
 const [localDetail, setLocalDetail] = useState<Record<string, number>>({})
 const [customTargets, setCustomTargets] = useState<Record<string, number>>({})
 const [loading, setLoading] = useState(false)
 const [activeTab, setActiveTab] = useState<string>("g0")
 const [openDetailRegions, setOpenDetailRegions] = useState<Record<string, boolean>>({})

 // ── Load identity space when model changes ─────────────────────────────
 useEffect(() => {
 if (editing.identityModel === "soma") {
 setSpace(null)
 return
 }
 let cancelled = false
 setLoading(true)
 fetchIdentitySpace(editing.identityModel)
 .then((data) => {
 if (cancelled) return
 setSpace(data)
 const init = editing.coeffs && editing.coeffs.length === data.dims
 ? [...editing.coeffs]
 : [...data.defaults]
 setLocal(init)
 // If editing.coeffs was null/empty, seed the store with the model's
 // default coefficients. Without this, MeshPreviewCanvas sees null
 // coeffs and falls through to the GET endpoint (which serves a
 // static default mesh), so the FIRST slider drag causes a jarring
 // snap as the viewer switches from GET to POST. Seeding the coeffs
 // makes the initial load use the POST path, and slider drags then
 // produce smooth incremental updates.
 if (!editing.coeffs || editing.coeffs.length !== data.dims) {
 patchEditing({ coeffs: init })
 }
 setLocalDetail(editing.localChanges ? { ...editing.localChanges } : {})
 setCustomTargets(editing.customTargets ? { ...editing.customTargets } : {})
 if (data.local_changes && data.local_changes.groups.length > 0) {
 const firstBody = data.local_changes.groups.find((g) => g.category === "body")
 const firstFace = data.local_changes.groups.find((g) => g.category === "face")
 setOpenDetailRegions((prev) => {
 const next = { ...prev }
 if (firstBody && next[firstBody.label] === undefined) next[firstBody.label] = true
 if (firstFace && next[firstFace.label] === undefined) next[firstFace.label] = true
 return next
 })
 }
 // Default tab: MHR has per-group tabs (g0 = first variance group),
 // Anny has a flat Phenotype tab. Pick the first available tab so
 // the user lands on real content rather than a blank panel.
 if (data.groups && data.groups.length > 0) {
 setActiveTab("g0")
 } else {
 setActiveTab("phenotype")
 }
 })
 .catch((e: unknown) => {
 // NO SILENT SWALLOW — body-shape load failure should be visible.
 console.error("[BodyShapePanel] failed to load body shape space:", e)
 if (!cancelled) setSpace(null)
 })
 .finally(() => { if (!cancelled) setLoading(false) })
 return () => { cancelled = true }
 }, [editing.identityModel]) // eslint-disable-line react-hooks/exhaustive-deps

 // ── Sync from external store changes (presets, library load) ─────────
 // The model-change effect above only fires on identityModel swap, but
 // presets and library loads also overwrite editing.coeffs/localChanges/
 // customTargets from outside. Track the last-seen external signature in a
 // ref and re-pull into local slider state when it changes - but only when
 // it differs from what our own slider drags just wrote, so we don't loop.
 const lastExternalSigRef = useRef<string>("")
 useEffect(() => {
 if (!space) return
 const coeffSig = editing.coeffs
 ? editing.coeffs.map((v) => v.toFixed(3)).join(",")
 : ""
 const lcSig = editing.localChanges
 ? Object.entries(editing.localChanges).sort(([a], [b]) =>
 a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${k}=${v.toFixed(3)}`).join(",")
 : ""
 const ctSig = editing.customTargets
 ? Object.entries(editing.customTargets).sort(([a], [b]) =>
 a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${k}=${v.toFixed(3)}`).join(",")
 : ""
 const sig = `${editing.identityModel}|${coeffSig}|${lcSig}|${ctSig}`
 if (sig === lastExternalSigRef.current) return
 lastExternalSigRef.current = sig
 // Only adopt external coeffs/localChanges if the lengths match what
 // we currently have (otherwise the model just changed and the model
 // effect above is doing the load).
 if (editing.coeffs && editing.coeffs.length === space.dims) {
 setLocal([...editing.coeffs])
 }
 setLocalDetail(editing.localChanges ? { ...editing.localChanges } : {})
 setCustomTargets(editing.customTargets ? { ...editing.customTargets } : {})
 }, [editing.coeffs, editing.localChanges, editing.customTargets, space]) // eslint-disable-line react-hooks/exhaustive-deps

 // ── Propagate coefficients to the store ────────────────────────────────
 // Coefficients are local UI state (so the slider feels responsive); we
 // commit them to the store on the same tick. No debounce needed because
 // the mesh cache + 30ms prepare_identity keep up.
 const updateCoeff = useCallback((i: number, v: number) => {
 setLocal((prev) => {
 const next = [...prev]
 next[i] = v
 patchEditing({ coeffs: next })
 return next
 })
 }, [patchEditing])

 const updateDetail = useCallback((label: string, v: number, defaultVal: number) => {
 setLocalDetail((prev) => {
 const next = { ...prev }
 if (Math.abs(v - defaultVal) < 0.001) {
 delete next[label]
 } else {
 next[label] = v
 }
 patchEditing({ localChanges: Object.keys(next).length > 0 ? next : null })
 return next
 })
 }, [patchEditing])

 const updateCustomTarget = useCallback((id: string, v: number, defaultVal: number) => {
 setCustomTargets((prev) => {
 const next = { ...prev }
 if (Math.abs(v - defaultVal) < 0.001) {
 delete next[id]
 } else {
 next[id] = v
 }
 patchEditing({ customTargets: Object.keys(next).length > 0 ? next : null })
 return next
 })
 }, [patchEditing])

 // ── Actions ────────────────────────────────────────────────────────────
 const handleRandomize = useCallback(() => {
 if (!space) return
 const next = Array.from({ length: space.dims }, () => {
 // Box-Muller N(0,1)
 let u = 0, v = 0
 while (u === 0) u = Math.random()
 while (v === 0) v = Math.random()
 const r = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
 return Math.max(space.range[0], Math.min(space.range[1], r))
 })
 setLocal(next)
 patchEditing({ coeffs: next })
 }, [space, patchEditing])

 const handleReset = useCallback(() => {
 if (!space) return
 const next = [...space.defaults]
 setLocal(next)
 setLocalDetail({})
 setCustomTargets({})
 patchEditing({ coeffs: next, localChanges: null, customTargets: null })
 }, [space, patchEditing])

 // ── Derived counts for tab badges ─────────────────────────────────────
 const detailCount = Object.keys(localDetail).length
 const detailTotal = space?.local_changes?.dims ?? 0
 const customActive = Object.keys(customTargets).length
 const customTotal = space?.custom_targets?.items?.length ?? 0
 const { bodyActive, faceActive } = (() => {
 if (!space?.local_changes) return { bodyActive: 0, faceActive: 0 }
 const lc = space.local_changes
 const labelToCategory: Record<string, "body" | "face"> = {}
 for (const g of lc.groups) {
 for (const idx of g.indices) {
 labelToCategory[lc.labels[idx]] = g.category
 }
 }
 let b = 0, f = 0
 for (const label of Object.keys(localDetail)) {
 const cat = labelToCategory[label]
 if (cat === "body") b++
 else if (cat === "face") f++
 }
 return { bodyActive: b, faceActive: f }
 })()

 const isAllDefaults = space
 ? local.every((v, i) => Math.abs(v - space.defaults[i]) < 0.001)
 && detailCount === 0 && customActive === 0
 : true

 return (
 <div className="flex flex-col h-full min-h-0">
 {editing.identityModel === "soma" && (
 <div className="py-8 text-center text-xs text-muted-foreground/60">
 The default SOMA mesh has no parametric identity controls.
 <br />
 Switch to <span className="text-foreground">MHR</span> or{" "}
 <span className="text-foreground">Anny</span> in the model picker to customize body shape.
 </div>
 )}

 {loading && (
 <div className="flex flex-col gap-3 px-1 py-2 animate-pulse">
 {/* fake action bar */}
 <div className="flex items-center gap-2 pb-2 border-b border-border/30">
 <div className="h-7 w-24 rounded-md bg-muted/40" />
 <div className="h-7 w-16 rounded-md bg-muted/40" />
 <div className="flex-1" />
 <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
 </div>
 {/* fake tab strip */}
 <div className="flex gap-1">
 {[72, 52, 48, 80].map((w, i) => (
 <div key={i} className="h-8 rounded-md bg-muted/40" style={{ width: w }} />
 ))}
 </div>
 {/* fake slider rows */}
 {Array.from({ length: 8 }).map((_, i) => (
 <div key={i} className="flex items-center gap-3">
 <div className="h-3 rounded bg-muted/30" style={{ width: 60 + (i % 3) * 20 }} />
 <div className="flex-1 h-2 rounded-full bg-muted/30" />
 <div className="h-3 w-8 rounded bg-muted/30" />
 </div>
 ))}
 </div>
 )}

 {space && !loading && (
 <>
 {/* Action bar */}
 <div className="flex items-center gap-2 pb-2 border-b border-border/30 shrink-0">
 <Tip tip="Fill all dimensions with random N(0,1) samples">
 <span className="contents">
 <Button
 size="sm" variant="outline"
 onClick={handleRandomize}
 disabled={isAllDefaults && editing.identityModel !== "mhr"}
 className="h-7 text-[10px] gap-1"
 >
 <Dices className="h-3 w-3" /> Randomize
 </Button>
 </span>
 </Tip>
 <Button
 size="sm" variant="outline"
 onClick={handleReset}
 disabled={isAllDefaults}
 className="h-7 text-[10px] gap-1"
 >
 <RotateCcw className="h-3 w-3" /> Reset
 </Button>
 <div className="ml-auto text-[9px] text-muted-foreground/50">
 {detailTotal > 0 && detailCount > 0
 ? `${detailCount}/${detailTotal} morphs active`
 : `${space.dims} phenotype dims`}
 </div>
 </div>

 {/* Tabs — THE SHARED RailTabs strip (operator order, 2026-09-06:
 "the 3 sub menus… should look like the 'CHARACTER' and 'RENDER',
 just under the above bigger menus. Reusing components"). The kit
 <Tabs> stays the STATE owner (TabsContent must live inside it);
 only the strip is RailTabs, dense — the nested sub-menu level:
 - MHR (space.groups && !space.local_changes): one tab per
 variance group (Major / Regional / Fine detail) so the user
 navigates by category instead of scrolling one panel of 45 PC
 sliders (previously collapsibles inside one "Phenotype" tab).
 - Anny (!space.groups && space.local_changes): Phenotype /
 Body / Face / Style tabs (flat phenotype list + region
 collapsibles + community MakeHuman .target blends).
 - Hybrid (groups + local_changes): group tabs FIRST, then Body
 and Face. Currently no model uses this but the UI supports it.
 */}
 <Tabs
 value={activeTab}
 onValueChange={setActiveTab}
 className="flex-1 min-h-0 flex flex-col gap-2"
 >
 <RailTabs
 ariaLabel="Shape sub-menus"
 dense
 value={activeTab}
 onChange={setActiveTab}
 tabs={[
 ...(space.groups ? space.groups.map((grp, gi) => {
 const indices = Array.from({ length: grp.count }, (_, k) => grp.start + k)
 const activeInGroup = indices.filter((i) => Math.abs((local[i] ?? 0) - (space.defaults[i] ?? 0)) >= 0.001).length
 return {
 id: `g${gi}` as string,
 label: shortGroupLabel(grp.label),
 badge: activeInGroup,
 badgeTone: "emerald" as const,
 }
 }) : []),
 ...(!space.groups ? [{ id: "phenotype" as string, label: "Phenotype" }] : []),
 ...(space.local_changes && space.local_changes.groups.some((g) => g.category === "body")
 ? [{ id: "body" as string, label: "Body", badge: bodyActive, badgeTone: "emerald" as const }]
 : []),
 ...(space.local_changes && space.local_changes.groups.some((g) => g.category === "face")
 ? [{ id: "face" as string, label: "Face", badge: faceActive, badgeTone: "amber" as const }]
 : []),
 ...(space.custom_targets && space.custom_targets.items.length > 0
 ? [{ id: "style" as string, label: "Style", badge: customActive, badgeTone: "fuchsia" as const }]
 : []),
 ]}
 />

 {/* MHR: one TabsContent per variance group, flat slider list */}
 {space.groups && space.groups.map((grp, gi) => {
 const indices = Array.from({ length: grp.count }, (_, k) => grp.start + k)
 return (
 <TabsContent
 key={`g${gi}`}
 value={`g${gi}`}
 className="data-[state=inactive]:hidden min-h-0"
 >
 <ScrollArea className="pr-2" style={{ height: "calc(100% - 4px)" }}>
 <div className="py-1 px-1 text-[9px] uppercase tracking-wider text-muted-foreground/50">
 {grp.label} - {grp.count} dims
 </div>
 <div className="space-y-0.5">
 {indices.map((i) => (
 <SliderRow
 key={i}
 label={formatDimLabel(space.labels[i] ?? `dim${i}`, i)}
 value={local[i] ?? space.defaults[i]}
 min={space.range[0]}
 max={space.range[1]}
 defaultVal={space.defaults[i]}
 onChange={(v) => updateCoeff(i, v)}
 />
 ))}
 </div>
 </ScrollArea>
 </TabsContent>
 )
 })}

 {/* Anny: Phenotype (flat list of 11 labeled dims) */}
 {!space.groups && (
 <TabsContent value="phenotype" className="data-[state=inactive]:hidden min-h-0">
 <ScrollArea className="pr-2" style={{ height: "calc(100% - 4px)" }}>
 <div className="space-y-0.5 py-1">
 {local.map((_, i) => (
 <SliderRow
 key={i}
 label={formatDimLabel(space.labels[i] ?? `dim${i}`, i)}
 value={local[i] ?? space.defaults[i]}
 min={space.range[0]}
 max={space.range[1]}
 defaultVal={space.defaults[i]}
 onChange={(v) => updateCoeff(i, v)}
 />
 ))}
 </div>
 </ScrollArea>
 </TabsContent>
 )}

 {/* Anny: Body detail morphs */}
 {space.local_changes && space.local_changes.dims > 0 && (
 <TabsContent value="body" className="data-[state=inactive]:hidden min-h-0">
 <ScrollArea className="pr-2" style={{ height: "calc(100% - 4px)" }}>
 <RegionGroupList
 space={space}
 category="body"
 openDetailRegions={openDetailRegions}
 setOpenDetailRegions={setOpenDetailRegions}
 localDetail={localDetail}
 onUpdate={updateDetail}
 />
 </ScrollArea>
 </TabsContent>
 )}

 {/* Anny: Face detail morphs */}
 {space.local_changes && space.local_changes.dims > 0 && (
 <TabsContent value="face" className="data-[state=inactive]:hidden min-h-0">
 <ScrollArea className="pr-2" style={{ height: "calc(100% - 4px)" }}>
 <RegionGroupList
 space={space}
 category="face"
 openDetailRegions={openDetailRegions}
 setOpenDetailRegions={setOpenDetailRegions}
 localDetail={localDetail}
 onUpdate={updateDetail}
 />
 </ScrollArea>
 </TabsContent>
 )}

 {/* Anny: Stylization (community MakeHuman .target blends).
 Each item is one .target file in media/motion's
 references/makehuman_targets/ directory, exposed as a single
 slider. The slider value is the weight applied to the .target
 blendshape: 0 = no effect, 1 = full effect as designed by the
 target file. Values >1 are allowed for over-drive. */}
 {space.custom_targets && space.custom_targets.items.length > 0 && (
 <TabsContent value="style" className="data-[state=inactive]:hidden min-h-0">
 <ScrollArea className="pr-2" style={{ height: "calc(100% - 4px)" }}>
 <div className="py-1 px-1 text-[9px] uppercase tracking-wider text-muted-foreground/50">
 Stylization blends - {customTotal} target{customTotal === 1 ? "" : "s"}
 </div>
 <div className="space-y-0.5 py-1">
 {space.custom_targets.items.map((tgt, i) => {
 const def = space.custom_targets!.defaults[i] ?? 0
 return (
 <div key={tgt.id} className="py-1">
 <SliderRow
 label={tgt.name}
 value={customTargets[tgt.id] ?? def}
 min={space.custom_targets!.range[0]}
 max={space.custom_targets!.range[1]}
 defaultVal={def}
 onChange={(v) => updateCustomTarget(tgt.id, v, def)}
 />
 {tgt.description && (
 <div className="pl-32 text-[9px] text-muted-foreground/50 leading-tight pb-1">
 {tgt.description}
 </div>
 )}
 </div>
 )
 })}
 </div>
 </ScrollArea>
 </TabsContent>
 )}
 </Tabs>
 </>
 )}
 </div>
 )
}
