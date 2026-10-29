---
name: outfit-swap
model: qwen-img-edit-21
description: "Re-dress the subject of one image in a described outfit — the garment designed from the description while face, body, pose, and scene hold. Use when asked to change clothes with no second image."
---

# Outfit Swap

> VERIFIED LIVE 2026-11-12 against receipt `dev_docs/contracts/receipts/2026-11-12-models-qwen-edit-21-docs.md` (run run-a04c947b8fea-870a52ba — the Grecian-gown swap prompt rendered live end-to-end with face, body, pose, and scene held: the describe-the-garment pattern plus the invariant law this skill teaches). Geometry note: this doc's sizing passage was reworked to the render-sizing law after that press — the run proves the prompt pattern, density, and identity law; a post-rework stated-pair press is owed for the sizing seat.

## What it is for

Outfit-swap is the ONE-image arm of try-on: the new garment comes
from the user's DESCRIPTION, not a second picture. Everything that
is not clothing is the invariant: face, hair, body, pose, hands,
the scene, the light. When the user has a picture of the garment
instead of words, that is the `try-on` skill — the two-image
compose.

## The prompt pattern

- the operation: "Change the outfit of the person in the image to
  <described garment>"
- design the garment concretely: cut, length, material, colorway,
  closure, how it fits — one coherent garment, not a mood ("smart
  casual" is a mall, not a coat). Translate style words into the
  visual properties they imply
- fabric behavior: how it drapes on THIS body — structure over the
  shoulders, soft folds at the waist, hemline break
- coverage honesty: say the current outfit is REPLACED (including
  what it covered), never vaguely "updated"
- the blanket clause: "keep the face, hairstyle, body shape, pose,
  hands, the background, and the lighting exactly as in the image"

## Guards

The accessory law: accessories that make the person recognizable
(glasses, a watch, a wedding ring) survive — an outfit swap that
drops them is leakage. The new garment must be unmistakable
(under-editing guard): if the result could pass for the original
outfit, the description was too faint. Scene clothing rides the
change only when implied (a ski jacket in a beach scene needs the
scene addressed or held deliberately).

Iterate cheaply: same seed, one garment clause changed per pass —
collar shape, sleeve length, colorway — the rest of the compose
untouched.

## Composing the run

image-edit card, `model: qwen-img-edit-21`: `input_images` =
[the photo], the prompt, fixed seed. THE RENDER SIZES ITSELF
(the ground-truth cure, 2026-11-12): the output keeps the anchor's
frame; a different ratio states the new pair on the card (match
OFF) and the sampler renders that exact canvas — never crop the
anchor to change the ratio (pad to grow when the look needs more
room).

## Density tripwire

A prompt under ~200 words cannot render a designed layout — one
paragraph per zone, every rendered string quoted.
