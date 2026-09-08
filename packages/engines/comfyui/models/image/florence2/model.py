# florence2 — the tagger card's third family (tagger-card stroke, 2026-09-06).
# Florence-2 captioning via kijai's ComfyUI-Florence2 pack: the
# DownloadAndLoadFlorence2Model loader (repo-id combo, self-downloads to
# ComfyUI/models/LLM on first run — the WD14 self-provisioning precedent;
# no estate loader row exists for LLM, so LaneInputs() stays empty) +
# Florence2Run (caption tasks; caption STRING is output index 2).
#
# SSOT law: this file REPLACES model.yaml + variants/. A
# model.yaml reappearing next to it is a LOUD refusal.
#
# The defaults below speak ONLY the tagger card's vocab — cross-val
# refuses a default the card never declares. Default checkpoint is the
# PromptGen-tuned large (recreation-prompt lineage); precision stays fp16
# (renderer-fixed, not surfaced).

from melite_models import  KnobRow,Model, Variant, Cell, Genre, Quant


class Florence2Captioner(Model):
    id = 'florence2'
    genre = Genre.IMAGE
    label = 'Florence-2'
    description = ('Natural-language image captioning (Florence-2 large, '
                   'PromptGen-tuned) — dense descriptive prompts for '
                   'recreating images in FLUX / Ideogram / image-edit.')
    engine = 'comfyui'
    card = 'tagger'
    form = 'form_tagger'
    # No lane_inputs row (the input-lane precedent): weightless lanes
    # declare none — the loader node self-provisions its checkpoint to
    # ComfyUI/models/LLM on first run.
    defaults = dict(
            checkpoint='MiaoshouAI/Florence-2-large-PromptGen-v2.0',
            caption_task='more_detailed_caption',
        )
    # the CASCADE GATE — this lane ships a single configuration. Cell tier
    # is the ARTIFACT tier (stored weights; compute precision fp16 is
    # renderer-fixed, not a tier). Live-fire evidence (2026-09-06):
    # models/LLM/Florence-2-large-PromptGen-v2.0/model.safetensors =
    # 3291921348 bytes (~3.1GB = 770M params fp32) — F32 stated true.
    # 6GB peak covers generation headroom.
    variants = (
        Variant(id='standard', label='Standard', route='florence2', cells=(
            Cell(quant=Quant.F32, label='F32', route='florence2', vram_peak_gb=6.0),
        )),
    )

    # the tagger card surface for the florence2 arm (row 3,
    # 2026-09-06) — the vision-task lane wires three knobs; the
    # caption (output index 2) is the artifact, never a row.
    card_knobs = (
        KnobRow(card='input_image', inject='LoadImage.0.image', kind='s'),
        KnobRow(card='checkpoint', inject='DownloadAndLoadFlorence2Model.0.model', kind='s'),
        KnobRow(card='caption_task', inject='Florence2Run.0.task', kind='s'),
    )
