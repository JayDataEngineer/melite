# form-spec_model_music3.json — regold causes

Date: 2026-09-05 · Status: landed (mod-audit follow-up)

## Why this golden changed

The music card's surface was pruned to exactly what the lane wires
(operator order: "AUDIT THE MOD SYSTEM, WE CAN'T HAVE LEAKS"; the
image-edit incident class — an offered knob with no graph slot is a
400 waiting for one touch).

- REMOVED (no template slot exists): `negative_prompt` (the negative
  leg is `ConditioningZeroOut` — no second encode node to wire),
  `language`, `temperature`, `top_p` (no node input accepts them;
  ported from the retired audio-cpp engine whose surface never
  applied here).
- KEPT, now wired end-to-end (previously hardcoded in the renderer):
  `guidance_scale` (KSampler cfg, default 1.7 = the hardcoded value),
  `n_diffusion_steps` (KSampler steps, 30), `lm_cfg_scale`
  (MiniMaxMusic3TextEncode cfg_scale, 1.7).

Schema (`MusicParams`) admits exactly the 7-field card surface now;
the `audio/music` `_NARROW` dispensation in
tests/walls/suites/test_compose_gates.py is SPENT (deleted). The
tooltips referencing a Turbo/Base variant axis were stale ports —
music3 declares a single `standard` variant.

Divergence set is fully explained by this stroke (fields list 11→7,
three tooltips rewritten; nothing else in the body moved).

## 2026-09-06 — lane defaults declared on the card (frontend-impossible stroke)

`duration`/`guidance_scale`/`n_diffusion_steps`/`lm_cfg_scale` carried
no card default (form seeded `""`, click gate refused `""→null` as
"null but has no default" while the backend row defaults it — every
untouched knob 400'd). The card now declares the lane values
(30 / 1.7 / 30 / 1.7, each == `MusicParams`, wall-pinned); the golden's
only deltas are those four `fields[].default` + `schema_groups`
entries. Verified: patched file is leaf-identical to the live
`/v1/form-spec?model=music3` serve.
