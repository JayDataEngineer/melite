# datafolder/ — THE data root

All generated state and data live here. No exceptions. (Never commit;
the gitignore declares the streams.)

## Streams — ComfyUI's own vocabulary (install-agnostic)

The three hot streams are named exactly as ComfyUI names its data
dirs, so ANY ComfyUI instance — local, remote, cloud, updated — can
mount this root via deployment config (endpoint json /
extra_model_paths). The estate does NOT own or assume any install
(comfyui-mcp IS the engine; instance location is deployment config).

- input/    — staged inputs (guide audio, reference images...) that
              graphs' LoadImage/LoadAudio nodes consume
- output/   — ALL artifacts: the curated store (by-date/, by-model/,
              by-run/, by-type/, media trees...) plus everything the
              transport fetches
- temp/     — transient scratch (the local instance's own output dir
              lands here; the estate keeps only fetched artifacts)

## Streams — estate bookkeeping

- runs/     — gateway run state: run dirs, drafts, _ledger.jsonl
- downloads/, delivery/, sessions/, agent-sessions/, staging/,
  artifacts/ — intake, delivery, session and processing streams

## History

2026-09-03: consolidated. comfyui/{inputs,outputs,temp} (113G
artifact heritage), outputs/ (by-media tree) and inputs/ merged into
the singular ComfyUI-pattern streams; the endpoint config decoupled
from a foreign project (programs/ray); engine names died in the data
root. "Right now, the stuff is built with the assumption that WE
control comfyui" — it isn't anymore.
