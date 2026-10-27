---
name: Krea 2
description: Image family — painterly/stylized generation branch
genre: image
---

# Krea 2

The stylized branch of the image family — painterly, illustrative,
design-forward renders. Same card surface as z-image; choose it when
the brief says stylized, not photoreal.

## The variant rail (THE LAW — never fight it)

FOUR checkpoints, each owning its sampler marriage. Pick the route,
let it marry; never hand-stamp steps/cfg against a distilled lane.

- **turbo** (DEFAULT): the 8-step distilled checkpoint. Family
  defaults ARE its marriage — steps 8, cfg 1, euler/normal; declared
  envelope steps [4, 8] / cfg [1, 2]. Compose with NO steps/cfg
  stated; the rail resolves 8/1. A stated value outside the envelope
  REFUSES at compose — a turbo run at 25 steps is not agency.
- **raw**: the 52-step base checkpoint the loras train on. Its route
  marries steps 52, cfg 3.5 (resolver_defaults); declared envelope
  steps [30, 60] / cfg [2, 6]. Use it when a lora demands its
  training base or the brief wants the full schedule.
- **kroma**: the Kroma Turbo lane — lodestones' v0.3.1-turbo-opd
  distill of the Krea-2 fine-tune. Its route marries steps 8, cfg 1;
  declared envelope steps [4, 12] / cfg [1, 2] (upstream: 8-12
  steps, CFG 1.0-1.5); flow shift 1.15 rides the lane. The distill
  trained without negatives — run it clean; a stated negative buys
  nothing. INT8 ConvRot is the default quant, BF16 the fidelity tier.
- **kroma-base**: the Kroma base lane — the v0.3 FULL FINE-TUNE of
  the Krea-2 RAW (non-distilled) weights (negatives fully
  functional). Its route marries steps 52, cfg 3.5 (the raw
  schedule); declared envelope steps [30, 60] / cfg [2, 6]; NO flow
  shift — sample it as you would the Krea 2 raw checkpoint. The
  dtype-mapped BF16 tier (upstream's fp32 original is a 51GB
  impracticality).

## The loras (raw-trained; fire on both routes via the bag)

`loras: [{id, strength?}]` resolves against the family's 12-row
catalog; a strength-less row rides the adapter's declared default:
krea2_realism_lora (0.7), krea2_turbo_lora_rank_64_bf16 (1.0),
krea2_darkbrush, krea2_dotmatrix, krea2_kidsdrawing, krea2_neondrip,
krea2_rainywindow, krea2_retroanime, krea2_softwatercolor,
krea2_sunsetblur, krea2_vintagetarot, krea2filterbypass3 (0.8).

## Prompting

Continuous descriptive prose — subject, action, environment, style
suffix LAST. Keep style suffixes IDENTICAL across a set; that is
what makes it a set. Same seed + same suffix = same world texture
across a family of renders.
