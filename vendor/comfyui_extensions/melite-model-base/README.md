# melite-model-base

Shared base class (`PipelinePatcher`) that registers diffusers-style
pipelines with ComfyUI's `comfy.model_management` VRAM tracking.

External pipelines loaded as module globals are invisible to ComfyUI's
`load_models_gpu`/`free_memory` loop — they squat on VRAM until manually
cleared. `PipelinePatcher` wraps any object exposing `.to(device)` so it
appears in `current_loaded_models`: ComfyUI accounts for its VRAM, can
evict it to CPU under pressure, and reports it in `/system_stats`.

It implements exactly the subset of the `ModelPatcher` interface that
`LoadedModel` calls — no weight patching, LoRA, or hooks.

## Usage (inside a custom node pack)

```python
from melite_model_base import PipelinePatcher, register_pipeline

patcher = register_pipeline("mypack:ckpt-a", PipelinePatcher(pipeline, name="ckpt-a"))
# ... later ...
from melite_model_base import unregister_all_pipelines
unregister_all_pipelines("mypack:")
```

## Distribution model

Canonical source: `packages/melite-model-base/src/melite_model_base/`.

Every consuming node pack carries a **vendored copy** under
`<pack>/_vendor/melite_model_base/` and falls back to it when no installed
`melite_model_base` is importable — making each pack standalone (drop into
`custom_nodes/`, done). An installed `pip install melite-model-base` always
wins over the vendored copy.

Copies are kept byte-identical by `scripts/sync_melite_model_base.py`
(`--check` mode runs in CI):

```bash
python3 scripts/sync_melite_model_base.py           # sync canonical -> vendors
python3 scripts/sync_melite_model_base.py --check   # verify only
```

## License

CC-BY-NC-4.0 — see the repository root [`LICENSE`](../../LICENSE).
