# AOTInductor Playbook — PyTorch → C++ Shared Library

## Overview

AOTInductor is PyTorch's official Ahead-Of-Time compiler. It takes a PyTorch `nn.Module` and produces a standalone `.so` (Linux) or `.dll` (Windows) that can be loaded and executed in pure C++ with **zero Python at runtime**.

```
PyTorch nn.Module (Python)
    ↓  torch.export.export()
ExportedProgram (graph representation)
    ↓  torch._inductor.aoti_compile_and_package()
.pt2 package (weights + metadata + C++ code)
    ↓  cmake / libtorch
Shared library (.so)
    ↓  dlopen() in inference.cpp
Pure C++ inference
```

## Quick Start

```bash
# 1. Export a model
python3 scripts/compile_with_aoti.py \
    --model-dir models/sd-unet/ \
    --output models/sd-unet-compiled.pt2

# 2. Load in inference.cpp
# The plugin calls dlopen("sd-unet-compiled.so") and runs inference
```

## Detailed Steps

### Step 1: Prepare the Model for Export

Not all PyTorch models can be exported. `torch.export` requires:
- No data-dependent control flow (if/else on tensor values)
- No dynamic shapes (unless annotated)
- All ops must be in the export graph

```python
import torch

# Example: SD UNet
class SDUNet(torch.nn.Module):
    def forward(self, x, timestep, context):
        # Must be traceable — no Python if/else on tensors
        ...

model = SDUNet()
model.load_state_dict(torch.load("unet.safetensors"))
```

### Step 2: Export with torch.export

```python
from torch.export import export

example_inputs = (
    torch.randn(1, 4, 64, 64),   # latent
    torch.tensor([0.0]),          # timestep
    torch.randn(1, 77, 768),     # CLIP context
)

exported = export(model, example_inputs)
```

### Step 3: Compile with AOTInductor

```python
from torch._inductor.aoti_compile_and_package import (
    aoti_compile_and_package,
)

output_path = aoti_compile_and_package(
    exported,
    package_path="sd-unet.pt2",
)
```

### Step 4: Load in C++

```cpp
#include <torch/torch.h>
#include <torch/csrc/inductor/aoti_package/model_package_loader.h>

// Load the compiled model
auto loader = torch::inductor::AOTIModelPackageLoader("sd-unet.pt2");

// Run inference
auto input = torch::randn({1, 4, 64, 64});
auto output = loader.run({input});
```

## Integration with inference.cpp

### Option A: Direct libtorch loading (preferred)

Link inference.cpp against libtorch and load `.pt2` packages directly:

```c
// plugins/aotind/aotind_plugin.c
#include <torch/torch.h>

int node_load(const char *config, size_t len, inference_context **ctx) {
    auto loader = new torch::inductor::AOTIModelPackageLoader(model_path);
    *ctx = (inference_context*)loader;
}

int node_execute(inference_context *ctx, ...) {
    auto *loader = (torch::inductor::AOTIModelPackageLoader*)ctx;
    auto outputs = loader->run(inputs);
}
```

### Option B: dlopen the .so directly

AOTInductor also generates a thin C wrapper alongside the `.so`:

```c
// Generated header: sd-unet.h
int32_t sd_unet_run(
    AOTIModelPackageLoader* loader,
    AOTITensorHandle* inputs, int n_inputs,
    AOTITensorHandle* outputs, int n_outputs
);
```

### Option C: Standalone .so via AOTInductor C interface

```python
# Export as standalone .so (no libtorch dependency at runtime)
torch._inductor.aoti_compile_and_package(
    exported,
    package_path="model.pt2",
    # This generates a C-compatible .so with flat API
)
```

## Limitations

| Limitation | Impact | Workaround |
|-----------|--------|------------|
| Requires `torch.export` | Some models use dynamic control flow | Use `torch.export.dynamic_shapes` or restructure |
| Still links libtorch (~200MB) | Large binary | Acceptable for GPU inference; or use Option C |
| Custom ops need registration | ComfyUI custom nodes with custom CUDA kernels | Register via `torch.library` |
| Dynamic batch sizes | Static shapes by default | Use `torch.export.Dim` for dynamic dims |

## Build System Integration

```cmake
# CMakeLists.txt
option(INFERENCE_BUILD_AOTIND_PLUGIN "Build AOTInductor plugin" OFF)

if(INFERENCE_BUILD_AOTIND_PLUGIN)
    find_package(Torch REQUIRED)
    add_library(aotind_plugin plugins/aotind/aotind_plugin.c)
    target_link_libraries(aotind_plugin ${TORCH_LIBRARIES} inference_common)
endif()
```

## When to Use AOTInductor vs GGUF

| Scenario | Use AOTInductor | Use GGUF |
|----------|----------------|----------|
| Model has complex architecture | Yes | Manual rewrite needed |
| Need quantization | Not built-in | Q4_K_M, Q8_0, etc. |
| Want zero runtime deps | No (needs libtorch) | Yes (pure ggml) |
| Quick port from PyTorch | Yes (auto-converter) | Manual |
| Production deployment | Yes | Yes |
| Mobile/embedded | No (too large) | Yes |

## References

- https://pytorch.org/docs/stable/torch.compiler_aot_inductor.html
- https://pytorch.org/docs/stable/export.html
- https://pytorch.org/docs/stable/torch.compiler_inductor_nightly.html
