# regold — model-catalog.json

Date: 2026-09-07
Status: landed

The h3 derivation stroke (17fa0dab + the card.py admits work)
briefly served the t4_open template defaults (768x448, one family)
while the py emission settled; the capture rode that state. The
serve is the derivation law's truth again (1344x768 form defaults,
3 families: h3-timeline/h3/h3-keyframe — fresh-scan verified both
on production :33081 and a scratch boot). Regolded from the live
scratch serve; verified by test_http_parity 48/0.

## 2026-09-08 — the moss meld (operator order: combine the three)

moss-sfx + moss-tts + moss_voicegenerator are ONE model `moss`
(tts / voicegen / sfx variants, cells moss-tts /
moss_voicegenerator / moss-sfx — every flat address survives).
The engine rides the variant (comfyui sfx + audio_cpp GGUF), so
the served set is unchanged at 68 (moss-sfx serves; the GGUF
three ride frozen). Registry 53→51, routes 92→93. Regolded from
the live serve; walls 17/17.

## 2026-09-08 — sfx OUT, tts-local IN (operator correction)

Same swap as the families golden: moss = tts/voicegen/tts-local
(audio_cpp throughout); moss-sfx its own comfyui model. Served
set unchanged at 68. Walls 17/17.

## 2026-09-08 — voicedesign meld + txt2music deletion

Same: qwen3-tts gains the VoiceDesign variant (the voice-lock
card boards the surviving route); the txt2music dupe dies, the
native music3 stands alone. Served 68. Walls 17/17.

## 2026-09-08 — mask-studio phantom DELETED (operator order)

Action card, not a model. Served 67. Walls 17/17.

## 2026-09-08 — 13 hollow atoms unoffered (operator order)

Served 67→53 (13 owners + the flux-fill-onereward variant
route, which rides its owner out). New wall: every served
owner is claimed (against-cards). Walls 17/17.

## 2026-09-08 — the img-to-mesh tenant flips to the card-id spelling

Card 13 of the card-folder migration: the img_to_mesh card unit
lands at cards/3d/img-to-mesh/ and the served studio claims
(trellis2-native, pixal3d) join the new tenant id — the folder
spelling IS the claim spelling (the join key). 18 pins, one key
per family/variant block; nothing else moved (golden-suite diff
was exactly the tenant key). Walls 17/17 after.

## 2026-09-08 — ideogram joins the card-id spelling; estate tenants realigned

Card 14 (canvas-ideogram → cards/image/ideogram4): the ideogram
claim flips to image/ideogram4 (1 pin here, 1 in
families-golden). The estate door's ESTATE_TENANTS/ROWS keys
realign with the folder spellings already landed — mask-studio
(card 1) and img-to-mesh (card 13) keys flip here too; the
discovery-catalog.json pin stays (frozen py artifact, generator
deleted). Walls 17/17.

## 2026-09-08 — motion merges; the tenant joins the card-id spelling

Card 15 (motion-studio → cards/motion/motion/ui; the motion card
gains its studio half): the kimodo claim flips to motion/motion
(1 pin here, 1 in families-golden); the estate door key flips
with it. The two nested cards' CardDefinition augmentations go
name-form (declare module '@melite/comfyui/service'). Walls 17/17.

## 2026-09-10 — form restored to every served row (the TS-flip omission)

The 2026-09-08 live-emission swap (loadCatalog replacing the frozen
catalog section with buildCatalogSections) silently dropped
`form` from all 53 rows: servedRow never read it, the TS ModelRow
schema never required it (the py refusal died with the purge), and
the 2026-09-07 golden regold had already pinned the formless shape
— so the models-golden wall defended the bug and only the frontend
catalog contract caught it (operator report: "Catalog contract
violation — anima: missing required key(s) form").

Restored through every layer: ModelDecl.form + ModelRow.form
(schema-required, servedRow REFUSES LOUD on empty — QUEUE LANE
LAW), 43 family DECLs carry the py wire-vocabulary tags verbatim
(form_generate … — from the frozen discovery-catalog capture, the
py exporter's own values), golden regolded from the live serve
(53/53 rows with form). Walls must stay green.
