# RETIRED 2026-09-08 (red-closure lane): the sim subject is dead —
# the queue-native test engine (packages/engines/sim/) was
# quarantined to vendor/retired-engines/ intact (mono-engine
# quarantine 47e1c583 — operator order verbatim: "We are building an
# api caller for comfyui, not having engines anymore"). The TS door
# serves comfyui stages only, so every leg here refused at the
# validate door (400 "names engine 'sim' — this gateway serves
# comfyui stages only", code preview_scope): 10 red, one cause.
#
# This file was a PURE RUNNER (its subject died), not a pattern wall
# with a living carrier — verdict precedent: the 2026-09-08
# unit-death commit (5cb645ba) deletes dead-subject runners; walls
# stay as tombstones so wall-name ledgers and history stay intact
# (the decl_schema precedent, 7d540e1f). Bodies deleted, not
# skipped — a dead engine must never go green vacuously. Do not
# extend; re-derive (not resurrect) when a headless engine exists.
#
# Per-leg residue — every seam this wall guarded still pins live:
# (a) chain-carry (stage-2 artifact contains stage-1's echo) →
#     test_gateway_queue_parity + test_gateway_flows_run_parity
#     (queue/sidecar seams on live engines);
# (b) fail-exact (the EXACT error message) →
#     test_gateway_queue_refusals (60 refusal-shape legs);
# (c) stop-lands-stopped → test_gateway_resurrect_parity (102 legs)
#     + test_gateway_runs_parity (stop/status seams);
# (d) kind-mismatch refuses pre-slot at validate →
#     test_gateway_flows_validate_parity (102 legs, kind-refusal
#     byte legs);
# (e) storm convergence (seeded start/stop storm, every run
#     terminal, clean run completes after) → NO live carrier (the
#     pattern needs a headless engine); the pattern survives in the
#     design record docs/design/row6-sim-backend.md — re-derive
#     the storm onto the next headless engine, never onto GPU;
# (f) transition lattice (queued/terminal stop, stopped/failed/
#     completed/live resume) → test_gateway_resurrect_parity +
#     test_gateway_runs_parity (stop/resume/status transitions on
#     the live queue) + the quarantine wall
#     tests/walls/suites/test_cpp_engines.py (16/16: the sim engine
#     stays quarantined — this tombstone's precondition).
