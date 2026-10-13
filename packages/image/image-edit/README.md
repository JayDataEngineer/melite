---
description: Anchored image-edit card and agent tool over the qwen-img-edit-21 and qwen-img-edit-2511 families.
kind: package-library
---

# @melite/image-image-edit

`@melite/image-image-edit` is the image-editing card plus the `image_edit` agent tool. Two families board: `qwen-img-edit-21` and `qwen-img-edit-2511`, on the anchored edit lane — outputs stamp under `<runId>/edit`. The cardPackages SSOT composes the card from `./card`; the tool registers through melite-tools' cardTools gate from `./tool`.

## Contract

- `./card` — the card definition (`id: 'image-edit'`). The schema's 36 keys include `steps` and `cfg` with NO schema default — they ride the model row (ride-the-model law: model defaults overlay first, explicit params win). `width`/`height` ride together: a 2.1 edit lands at the target size. `match_input_resolution` (default ON) makes the 2.1 output match the first input image's resolution so Width/Height never need typing — the Width/Height rows hide on the form while it is on (`visible_when: 'match_input_resolution=false'`), and turning it OFF reveals them for a custom pair (on 2511 and the crop_stitch detailer it is an admitted no-op: those lanes own their size already). Image intake is `orderedInputImages`: `input_images` verbatim, else the legacy merge of `image1`/`image2`/`image3`/`reference_images`; 2.1 maps the order contiguously from `image_2` on, while 2511 lands on the stock `image2`/`image3` optionals. The lanpaint arm takes `input_mask`. `MAX_IMAGES` rides the families' DECLs. `refuseImageEditFiring` rejects graph-changing features by field name — the refusal names the field, never silently drops. `finalizeImageEdit` strips family leaks post-compose; the mask and lanpaint riders (`MASK_RIDERS`, `LANPAINT_RIDERS`) scope their packs.
- `./tool` — `buildImageEditTool`, the `image_edit` tool face.
- `.` — the row-mounted composition marker; it registers the card only when the `comfyui` seat exists, and never registers the tool.
- `./package.json` — the manifest.

## Model Experience

### Request context and condition

The `image_edit` tool fires an agent request when called; the card conditions a ComfyUI run when composed.

#### What the model sees

The edit model receives the instruction prompt, the ordered input images, and the gated params (including mask and lanpaint payloads when boarded) as the composed graph's inputs.

#### Token effect

conditional — the schema occupies context only in sessions that register the tool; values ride only tool-call turns.

#### KV Cache effect

append-only — tool-call turns append messages; earlier turns stay byte-identical.

## Known Limitations and Deferred Work

- **Steps/cfg carry no schema default** — the values ride the selected model row; a card-level override is not declared.
- **Image cap rides the DECLs** — `MAX_IMAGES` is per-family; the card refuses beyond it rather than truncating.
