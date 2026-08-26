# ComfyUI PyTorch → C++ Converter Playbook

## Overview

This playbook converts ComfyUI PyTorch model nodes into:
1. **GGUF weight files** — quantized, memory-mappable, no Python dependency
2. **C++ inference plugins** — thin wrappers around ggml operations

## Architecture

```
ComfyUI Python Node (nn.Module)
    ↓  convert_comfyui_to_gguf.py
    ↓  reads safetensors/bin, maps tensor names, writes GGUF
GGUF file (weights + metadata)
    ↓  loaded by inference.cpp plugin via ggml
Pure C++ inference (no Python, no libtorch, ~50MB runtime)
```

## Conversion Steps

### Step 1: Identify the Model Architecture

```bash
# List all PyTorch files in a ComfyUI model
find models/ -name "*.safetensors" -o -name "*.ckpt" -o -name "*.bin" | head -20

# Check what architecture the model uses
python3 -c "
import safetensors.torch
t = safetensors.torch.load_file('model.safetensors')
for k in list(t.keys())[:20]:
    print(k, t[k].shape)
"
```

### Step 2: Map Tensor Names

Every model has a tensor name mapping. Example for a UNet:

| PyTorch tensor name | GGUF name |
|---------------------|-----------|
| `model.diffusion_model.input_blocks.0.0.weight` | `diffusion.block0.conv.weight` |
| `model.diffusion_model.middle_block.0.block1.layer.0.weight` | `diffusion.mid.block1.norm1.weight` |

Use `scripts/convert_comfyui_to_gguf.py` which auto-detects architecture.

### Step 3: Run the Converter

```bash
# Basic conversion (FP16)
python3 scripts/convert_comfyui_to_gguf.py \
    --model models/my-model/ \
    --output models/my-model.gguf

# With quantization
python3 scripts/convert_comfyui_to_gguf.py \
    --model models/my-model/ \
    --output models/my-model-q4_k_m.gguf \
    --quantize q4_k_m

# Auto-detect architecture
python3 scripts/convert_comfyui_to_gguf.py \
    --model models/my-model/ \
    --auto-detect
```

### Step 4: Write the C++ Plugin

Use the common plugin pattern (`include/inference/plugin_helpers.h`):

```c
#include "inference/plugin_helpers.h"

const char *node_type_id(void)  { return "my_model"; }
const char *node_version(void)  { return "0.1.0"; }

inference_schema node_schema(void) { ... }

int node_load(const char *config, size_t len, inference_context **ctx) {
    // 1. Parse config JSON for model_path
    // 2. Call gguf_init_from_file() to load weights
    // 3. Allocate ggml_context for computation
    // 4. Store in ctx
}

int node_execute(inference_context *ctx,
                 const inference_tensor *in, size_t n_in,
                 inference_tensor *out, size_t n_out) {
    // 1. Create ggml tensors from input
    // 2. Build computation graph
    // 3. ggml_graph_compute()
    // 4. Extract output tensors
}

void node_unload(inference_context *ctx) {
    // gguf_free(), ggml_free()
}
```

### Step 5: Build and Test

```bash
# Build with your plugin
cmake -B build -DINFERENCE_BUILD_MY_PLUGIN=ON
cmake --build build -j$(nproc)

# Test
LD_LIBRARY_PATH=build ./inference_cli load build/my_plugin.so
```

## Supported Architectures

| Architecture | Status | Converter |
|-------------|--------|-----------|
| SD 1.x/2.x UNet | Done (sd.cpp) | `convert_sd_to_gguf.py` |
| SDXL UNet | Done (sd.cpp) | `convert_sdxl_to_gguf.py` |
| SD3 DiT | Done (sd.cpp) | `convert_sd3_to_gguf.py` |
| FLUX DiT | Done (sd.cpp) | `convert_flux_to_gguf.py` |
| LLaMA/Mistral/Qwen | Done (llama.cpp) | `convert_hf_to_gguf.py` |
| Whisper encoder | Done (whisper.cpp) | `convert_whisper_to_gguf.py` |
| TRELLIS 3D | Partial | Custom converter needed |
| Kimodo Motion | Custom | Custom converter needed |
| SAM 3 | Custom | Custom converter needed |

## Adding a New Architecture

1. Create `scripts/convert_<arch>_to_gguf.py`
2. Implement `TensorNameMap` for the architecture
3. Write `gguf_write_header()` + `gguf_write_tensors()`
4. Create `plugins/<arch>/<arch>_plugin.c` using ggml ops
5. Add `INFERENCE_BUILD_<ARCH>_PLUGIN` to CMakeLists.txt
