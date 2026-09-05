# form-spec_model_ideogram.json — regeneration causes

## 2026-09-05 — surgical options-vocab catch-up (object_info pin)

Same `_option_list` fix as `form-spec_model_krea-2.json.d/causes.md`
(the exec namespace now carries the plugin file location, so the
comfyui pin vocab loads instead of serving `[]`). This golden is NOT
parity-pinned — so the stroke does NOT wholesale-regold it.
SURGICAL patch: the 2 sampler `options` lists (flat + schema_groups
mirror; this card declares no scheduler field) set to the 45-entry
pin vocab, file bytes otherwise untouched (verified: full-file leaf
diff shows 26 divergences, every one under an `options` list —
nothing else).
