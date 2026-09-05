# form-spec_model_scail2-animate.json — regeneration causes

## 2026-09-05 — surgical options-vocab catch-up (object_info pin)

Same `_option_list` fix as `form-spec_model_krea-2.json.d/causes.md`
(the exec namespace now carries the plugin file location, so the
comfyui pin vocab loads instead of serving `[]`). This golden is NOT
parity-pinned and carries its owning lane's unrelated drift — so the
stroke does NOT wholesale-regold it (that would absorb another
lane's work). SURGICAL patch: the 4 sampler/scheduler `options`
lists (flat + schema_groups mirror) set to the pin vocab, file bytes
otherwise untouched (verified: full-file leaf diff shows 42
divergences, every one under an `options` list — nothing else). The
lane's other drift stays its lane's business.

## 2026-09-06 — the 09-05 options patch never landed (sampler 12 → 45)

`test_python_cards` flagged `fields[9].options: len 45 != 12`: the
committed bytes still pinned the C-era 12-sampler hand list while the
`_option_list` pin serves the 45-entry sorted KSampler vocab — the
09-05 entry above describes the surgery but the file never carried
it (git log: last touch is the validated-row sweep; "recorded but
never executed", same as z-image/anima admitted). Executed here,
SURGICAL: the 2 `sampler` lists (flat + `schema_groups[2]` mirror;
scheduler was already 9 = 9) set VERBATIM from the live
`/v1/form-spec?model=scail2-animate` serve — verified: 90 diff
lines, every one a vocab string entry, zero non-vocab bytes. The
video model-layer churn stays its lane's business.

## 2026-09-06 — lane default declared on the card (frontend-impossible stroke)

Same surgical convention: `pose_strength` carried no card default
(untouched knob 400'd at the click while `VideoGenParams` defaults
it to 1.0). The card now declares `default=1.0` (== the schema row,
wall-pinned); SURGICAL patch of the flat + schema_groups rows only,
file bytes otherwise untouched (verified: the added lines are
exactly the two `"default": 1.0` insertions). The sampler-options
drift (`fields[9].options` 12 vs the live 45-pin) and the video
model-layer churn stay their lanes' business.
