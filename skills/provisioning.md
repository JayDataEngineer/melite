---
name: provisioning
description: "Fetch model weights before first use: variant-aware queueing via /v1/models/provision, progress via /status, audit trail in the ledger."
---

# Provisioning — weight downloads

Catalog models declare their weights in `model.yaml` under `source:`
(`type: huggingface` with `repo_id` + `filename`, or a direct URL).
Builtin models have no download. Before a model's first run, its
weights must be fetched.

## Queue a download

`POST /v1/models/provision {"model":"<id>","variant":"<optional>"}`

- No variant + the model declares variant options → the first declared
  option is the default pick.
- An option that carries its own `filename:` wins over the source
  template; otherwise `{variant}` in the template is substituted
  (e.g. `sd-{variant}.gguf` → `sd-q8_0.gguf`).
- Replies Manager-shaped: `{"queued":true,"manager":{"accepted":true,
  "worker_kicked":true},"payload":{"filename","save_path"}}`.

## Watch progress

`GET /v1/models/provision/status` → `{"jobs":[{"model","filename",
"state"}]}` with states `queued | downloading | done | error`.
Downloads run on a detached thread; errors land in the state and in the
ledger (`GET /v1/ledger?event=prov`).

## Failure modes (honest answers, not paraphrases)

- Unknown model id → 404 `{"error":"unknown model: <id>"}`
- Builtin / no downloadable source → 422
- Missing/empty body → 400
- Jobs survive server restarts via ledger recovery — a job interrupted
  mid-download shows its last ledgered state, re-queue to retry.
