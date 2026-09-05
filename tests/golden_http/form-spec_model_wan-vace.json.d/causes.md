# form-spec_model_wan-vace.json — regeneration causes

## 2026-09-05 — surgical options-vocab catch-up (object_info pin)

Same `_option_list` fix as `form-spec_model_krea-2.json.d/causes.md`
(the exec namespace now carries the plugin file location, so the
comfyui pin vocab loads instead of serving `[]`). This golden is NOT
parity-pinned and carries its owning lane's unrelated drift — so the
stroke does NOT wholesale-regold it (that would absorb another
lane's work). SURGICAL patch: the 4 sampler/scheduler `options`
lists (flat + schema_groups mirror) set to the pin vocab, file bytes
otherwise untouched (verified: full-file leaf diff shows 42
divergences, every one under an `options` list — nothing else).
The lane's other drift stays its lane's business.
