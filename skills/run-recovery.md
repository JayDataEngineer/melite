---
name: run-recovery
description: "Work off the file ledger: recover, audit, and resume generation work from _pipeline.json sidecars and the append-only _ledger.jsonl journal."
---

# Run Recovery — working off the file ledger

Every run is recoverable from disk. Nothing material lives only in memory.

## The two artifacts

1. **Spec sidecars** — `output/run-<id>/_pipeline.json` holds the full
   regeneration spec: `run_id, model, prompt, seed, created, status,
   error, yaml`. The status field is mirrored on every state change, so
   a sidecar is always current even after a crash mid-run.
2. **The ledger** — `output/_ledger.jsonl`, append-only, one JSON line
   per event: `server.boot`, `run.registered`, `run.state`,
   `prov.state`, `skill.read`. It is the SSOT for "what happened
   here, and when".

## The workflow

- Tail recent activity: `GET /v1/ledger?limit=50`
- Filter one kind of event (prefix match): `GET /v1/ledger?event=run.`
- List every run with its recovered spec: `GET /v1/pipelines/runs`
- Read one run's exact regeneration spec: the sidecar file, or the
  `pipeline`/`prompt`/`seed` fields on the runs row.
- Re-run a recovered spec: `POST /v1/pipelines/start` with the
  `model`, `prompt`, `seed` from the sidecar.

## What survives a restart

Everything. Runs are disk-scanned from sidecars; provision jobs are
rebuilt from the ledger at boot (last state per model+filename wins);
the ledger itself is append-only and never rewritten. After a server
restart, `GET /v1/ledger` shows a fresh `server.boot` stamp and the
full history before it.
