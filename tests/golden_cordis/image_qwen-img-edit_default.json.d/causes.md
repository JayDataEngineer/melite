# image_qwen-img-edit_default.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, image-edit card)

Captured from the PRODUCTION python renderer (the image-edit card's
`render("image_edit", doc, QwenImgEdit2511)`), doc = the ROAD's
`_step_doc` shape: family defaults resolved (sampler "euler" /
scheduler "simple" / steps 4.0 / cfg 1.0 — the qwen-img-edit-2511
facts row), image1 = the staged input-dir filename, loras = []
(no picks, byte-stable bare graph), seed 42 pinned, prefix
"testrun/edit" (the lane-local `<run_id>/edit` convention — NOT
image-gen's `/gen`).

This golden pins the plain-edit default branch of the LAST held
card: 11 nodes, UNETLoader → (no loras) → CLIPLoader/VAELoader →
LoadImage (with comfy-script's `upload: "image"` riding in inputs)
→ TextEncodeQwenImageEditPlus pair (positive .0, negative .1) →
ModelSamplingAuraFlow at FIXED shift 1.0 (template-pinned, never
li.sampling_shift) → VAEEncode(anchor) → KSampler → VAEDecode →
SaveImage. Pins the road's empty-string coercions (sampler ""
→ "euler", scheduler "" → "simple").
