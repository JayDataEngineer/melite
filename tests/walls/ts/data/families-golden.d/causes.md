# families-golden regolds

## 2026-09-08 — the mod mutation system correction (operator order)

Two willed changes, one stroke (commit "the mod mutation system:
packs as a distinct category, flavors family-owned"):

1. **The `loras` key stripped from every DECL** — rows are mod
   MUTATIONS, owned by the family's own `mods/<pack>.ts` flavor
   files (krea-2's 12 rows live at
   `families/image/krea-2/mods/loras.ts`), never inline data in
   the family declaration. The py truth: "the mod's catalog data
   lives in the family's own mods/ package — not crammed into
   model.py".
2. **anny's DECL.mods re-keyed from py export class names
   (EstimateBodyVerb…) to the runtime verb ids
   (hmr-estimate, preset-save, preset-load, dress, prop)** — the
   boarding declaration keys the RUNTIME plane (verb ids + pack
   ids, one namespace), boot-gated against the registered packs
   and verbs (validateBootContracts, the satisfaction law).

Also this stroke: families restructured to directories
(`families/<genre>/<id>/index.ts`, the py model.py layout).

## 2026-09-08 (later) — the hierarchy stroke (operator order:
## "THEY ARE ONE MODEL")

ace-step ×6 flat rows and the qwen3-tts pair collapsed into TWO
model declarations (53 registry models total, from 59 flat ones)
— the py flattener had exploded one model per quant/variant copy
into sibling rows. The hierarchy rides the cascade the paper
prescribes: variant = intercept (resolver stamps, lane stamps,
card/source overrides), quant = cell head; the flat ids survive
as cell/variant ROUTES (derived serving — the golden now pins the
full 92-route derived view; every runtime address unchanged).

## 2026-09-08 — the moss meld + recipe sources die (operator order)

Combine moss-sfx + moss-tts + moss_voicegenerator into ONE model
`moss` (tts / voicegen / sfx variants; the engine rides the
variant — comfyui sfx + audio_cpp GGUF). Registry 53→51, routes
92→93, served 68 unchanged (moss-sfx serves; the GGUF three ride
frozen). Plus: recipe-row `source` blocks stripped from
ace-step/moss-tts-local/txt2music (a recipe stamps picks, never
downloads — ONLY THE QUANT CARRIES THE DOWNLOAD).

## 2026-09-08 — sfx OUT, tts-local IN (operator correction)

MOSS-SFX v2 is a DIFFERENT architecture — never a moss variant.
Restored as its own model (own lane table, own comfyui engine);
moss-tts-local folds INTO moss instead (same GGUF home, same
runtime — tts / voicegen / tts-local). Registry stays 51, routes
stay 93, served stays 68 — a swap, not a fold.

## 2026-09-08 — voicedesign meld + txt2music deletion (operator orders)

qwen3-tts-voicedesign folds INTO qwen3-tts (same qwen3_tts lane,
same engine — a variant, not a sibling; resolver stamps
mode:'design' + variant:'voicedesign' + voice:NULL — a null stamp
unsets the inherited persona default at the derived merge).
txt2music DELETED — the retired-GGUF dupe of the native comfyui
music3 (same weights, no callers). Registry 51→50→49, routes 93→92,
served 68 throughout.
