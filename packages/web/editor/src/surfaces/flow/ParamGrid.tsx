/**
 * ParamGrid — the card's form view, generated from stage.params (the node's
 * signature inputs): read-only grid by default, the shared ParamEditor in
 * edit mode. Extracted from CardDetailModal (2026-08-14) because the Card
 * Studio shell renders THE SAME form in its PARAMS drawer (spec §4/E3 —
 * the shell owns the form view; tenants cannot omit or fake it).
 */
import type { CardStage } from "@melite/contracts"
import { ParamEditor } from "./FlowCard"
import { inputSlots } from "@melite/catalog"

export function ParamGrid({
 stage,
 editing,
 onSave,
 onDraftChange,
 modifierParamKeys = [],
}: {
 stage: CardStage;
 editing: boolean;
 onSave: (params: Record<string, unknown>, service?: string) => void;
 onDraftChange?: (params: Record<string, unknown>, service?: string) => void;
 /** The card's DECLARED modifier wire locations (spec features.modifiers
 * param_keys) — the mod bags render as subcards, never as raw rows. */
 modifierParamKeys?: string[];
}) {
 // Input slots (attach keys) vs the params hidden from the grid — the
 // editor (ParamEditor) owns prompt/model/inputs in edit mode. The
 // catalog-fed inputSlots() list (lib/inputSlots.ts) is the ONE source.
 const inputSlotsSet = new Set<string>(inputSlots());
 const skip = new Set([
 "prompt",
 "negative_prompt",
 "model",
 "keyframes",
 ...modifierParamKeys,
 ]);
 const entries = Object.entries(stage.params).filter(
 ([k]) => !skip.has(k) && !inputSlotsSet.has(k),
 );
 const attached = Object.entries(stage.params).filter(
 ([k, v]) => inputSlotsSet.has(k) && typeof v === "string" && v.length > 0,
 );
 // THE EDITOR IS THE CARD (2026-08-18 fix): the early "No parameters"
 // return used to fire for cards whose ONLY params are skip-listed
 // (prompt/model — a fresh generate card). That blanked the ENTIRE form
 // zone: no Model select, no Variant/Quant axes, no preset picker —
 // "I do not SEE them on the card!". In EDIT mode ParamEditor always
 // renders (it builds the form from the spec, not stage.params); the
 // read-only grid keeps the honest empty text.
 if (!editing && entries.length === 0 && attached.length === 0)
 return <p className="text-xs text-muted-foreground/50">No parameters</p>;

 if (!editing) {
 return (
 <div className="space-y-2">
 {attached.length > 0 && (
 <div className="flex gap-2">
 {attached.map(([k, v]) => {
 const s = String(v);
 return (
 <div key={k} className="flex flex-col gap-0.5">
 {/^(data:|https?:|\/)/.test(s) ? (
 <img
 src={s}
 alt={k}
 className="h-12 w-12 rounded border border-sidebar-border/60 object-cover"
 />
 ) : (
 <span className="max-w-[120px] truncate rounded border border-sidebar-border/60 bg-background/40 px-1.5 py-1 font-mono text-[10px] text-muted-foreground">
 {s}
 </span>
 )}
 <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/50">
 {k.replace(/_/g, " ")}
 </span>
 </div>
 );
 })}
 </div>
 )}
 <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
 {entries.map(([k, v]) => (
 <div key={k} className="flex flex-col">
 <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/50">
 {k.replace(/_/g, " ")}
 </span>
 <span className="font-mono text-[11px] text-foreground/90">
 {typeof v === "object"
 ? JSON.stringify(v).slice(0, 40)
 : String(v)}
 </span>
 </div>
 ))}
 </div>
 </div>
 );
 }

 // Inline editing — the shared ParamEditor (model selector + prompt +
 // numeric grid + remaining params). Keyframes stay in the composer above.
 return (
 <div>
 <ParamEditor
 stage={stage}
 onSave={(p, svc) => onSave(p, svc)}
 onDraftChange={onDraftChange}
 />
 </div>
 );
}
