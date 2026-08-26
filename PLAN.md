# inference.cpp — Hybrid Multi-Modal C++ Orchestrator Engine

## What this is

A single-process C++ orchestrator that chains GPU inference engines (sd.cpp,
trellis.cpp, whisper.cpp, llama.cpp, ...) behind a unified plugin ABI, with a
VRAM state machine and OpenAI-compatible REST server. The goal is to eliminate
the Python overhead and inter-stage serialization that today's ComfyUI-based
pipeline (ray) pays at every handoff.

---

## 1. What already exists

| Piece | Where | Status |
|-------|-------|--------|
| GGUF loading + GGML backends (CUDA/Vulkan/ROCm) | trellis.cpp M0-M1 | Done — vendored ggml, sm 86+ |
| DiT blocks, FlashAttention (padded K/V), RoPE | trellis.cpp src/dit.cpp, src/sparse.cpp | Done — runs on 16 GB |
| Custom CUDA kernels alongside ggml | trellis.cpp src/deform_conv.cu, decimate_qem.cu | Done — proves mixed ggml+raw kernel build |
| Per-stage model load / free | trellis.cpp M6 (trellis_cli driver) | Done |
| sd.cpp text->image chained into trellis | trellis.cpp M2 | Done |
| Multi-GPU placement (gpu arg) | trellis.cpp M6 | Done |
| CUDA graphs via ggml | trellis.cpp (GGML_CUDA_DISABLE_GRAPHS for ROCm only) | Working |
| Embedded HTTP server | trellis.cpp src/trellis-server.cpp (cpp-httplib) | Done |
| Declarative pipeline DAGs + plugin lanes | ray (server-js + @melite/dsl + YAML plugins) | Working at app level; port concept to C-ABI |
| VRAM load/infer/flush loop | trellis.cpp CLI + llama.cpp -ngl partial offload | Proven per-engine; cross-engine budget is new |
| TRELLIS.2 C++/GGML (DINOv3 + flow DiT + PBR) | trellis2cpp (localai-org) | Done — image→mesh, GLB export, CGAL alpha wrap, C ABI |
| SAM 2/2.1/3 + EdgeTAM segmentation | sam3.cpp (PABannier) | Done — text-prompted, video tracking, Q4-Q8, Metal GPU |
| NVIDIA Kimodo motion (SMPL-X/SOMA/G1) | kimodo.cpp (localai-org) | Done — C API, GGUF weights, Vulkan/CPU |
| Audio inference (TTS/ASR/music/VC/separation) | audio.cpp (0xShug0) | Done — 50+ families, CUDA optimized, GGUF packages |

---

## 2. Feasibility matrix for each spec section

### 2.1 Section 1A — LibTorch + comfy-kitchen dual backend

**Feasible but deferred.** Two runtimes in one process means two CUDA
allocators sharing one budget. comfy-kitchen kernels are coupled to ATen
(torch extensions); extracting them requires rewriting around raw CUDA calls
or using libtorch's C++ API alongside ggml. The pragmatic path: port the few
kernels you actually need (row-wise INT8 rotation, flash-attention int8) as
ggml custom ops — exactly the pattern already proven by deform_conv.cu.

**Recommendation:** Defer to Phase 3. Start all-ggml.

### 2.2 Section 1B — GGUF parser + cross-vendor GGML runtime

**Proven.** ggml provides CUDA, Vulkan, ROCm, Metal, and CPU (AVX-512)
from one codebase. llama.cpp, sd.cpp, whisper.cpp, and trellis.cpp all
ship today. trellis.cpp's benchmarks show Vulkan fastest on Strix Halo,
CUDA ~2.9x on discrete Blackwell.

### 2.3 Section 2 — Multi-modal engine table

| Modality | Backend | Exists? | Notes |
|----------|---------|---------|-------|
| Text / LLM | llama.cpp | YES | Mature, OpenAI-compatible server included |
| Image generation | stable-diffusion.cpp | YES | Chains into trellis.cpp today |
| Image -> 3D mesh | trellis.cpp, trellis2cpp | YES | trellis.cpp: your own port v0.6.0; trellis2cpp: community GGML port with PBR textures + GLB export |
| Speech-to-text | whisper.cpp, sam3.cpp, audio.cpp | YES | whisper mature; sam3.cpp adds SAM 2/2.1/3 + EdgeTAM segmentation; audio.cpp has 10+ ASR families |
| Text-to-speech | audio.cpp | YES | 50+ model families incl. Qwen3-TTS, Fish Audio, Higgs Audio, VibeVoice, Supertonic. CUDA optimized, GGUF packages |
| Music | audio.cpp | YES | ACE-Step, MiniMax Music 3, HeartMuLa, Stable Audio, MiDashengLM-Gen. GGUF packages |
| Audio conversion | audio.cpp | YES | Voice conversion (SeedVC, RVC, MeanVC2), source separation (HTDemucs, BS-RoFormer), VAD, diarization, codecs |
| Segmentation | sam3.cpp | YES | SAM 2/2.1/3 + EdgeTAM. Text-prompted detection, video tracking, Q4-Q8 quantization, Metal GPU |
| 3D Motion | kimodo.cpp | YES | C++/GGML NVIDIA Kimodo port. SMPL-X RP (22j), SOMA RP/SEED (30j), G1 (34j). C API, GGUF weights, Vulkan/CPU |

**Note on audio.cpp:** Full ggml-native audio framework — TTS, ASR, music, voice conversion, separation, VAD, diarization. 50+ families, CUDA optimized, 1.8-8x faster than Python refs. GGUF packages available.

**Note on kimodo.cpp:** Apache-2.0 C++ port with C API (`kimodo_capi.h`). LLM2Vec text encoder bundled. GGUF weights on HuggingFace (LocalAI-io). SMPL-X RP requires gated NVIDIA license; SOMA/G1 are open.

**Note on sam3.cpp:** Not mentioned in original spec. Useful as a preprocessor for trellis2cpp pipelines (segment subject before 3D reconstruction).

### 2.4 Section 3 — Zero-copy CUDA VRAM handoff

**Possible with per-engine surgery.** Same-process cuda_device_ptr
addresses are shareable across ggml backends and even into libtorch via
at::from_blob. But each engine must be patched to expose mid-pipeline
tensors:

- sd.cpp currently returns pixels after PNG encode -> patch to expose
  latent ggml_tensor device pointer or decoded RGB FP16 buffer
- trellis.cpp preprocess consumes RGB image -> the realistic zero-copy
  win is passing the decoded RGB device pointer directly, skipping
  PNG encode/decode round-trip (saves hundreds of ms, not seconds)

**Key insight the spec gets wrong:** TRELLIS does not consume SD latents.
It runs DINOv3 on the decoded RGB image. So sd-latent-to-trellis-latent
handoff as drawn in the YAML example is architecturally incorrect
regardless of copy cost. The real zero-copy boundary is RGB pixel data,
not latent space.

### 2.5 Section 4 — VRAM state machine

**Proven per-engine; cross-engine budget is new but straightforward.**

trellis.cpp M6 already does: load stage, infer, free stage. llama.cpp
does mmap streaming + layer-by-layer offload (-ngl, --override-tensor).
The cross-engine LRU allocator wrapping ggml's buffer system is new
engineering but ordinary bookkeeping:

1. Register all ggml backend buffers with a central budget tracker
2. On budget pressure: evict LRU engine, call its cleanup
3. Streaming GGUF blocks when weights exceed VRAM = llama.cpp's existing
   mmap + lazy-read path, generalized

**LRU budget for 8 GB:** ~6 GB allocated models + 1.5 GB working set +
0.5 GB overhead. Three 2 GB models can coexist; a fourth evicts the oldest.

### 2.6 Section 5 — C-ABI plugin + DAG

**Straightforward engineering.** ray's plugin-lane YAML architecture
(plugins/owner/models/group/model-id/model.yaml) is the same concept
at the application level. Port to C-ABI:

Plugin contract:
- node_type_id() -> returns string like 'llama_cpp', 'sd_cpp_krea', etc.
- node_version() -> semver
- node_schema() -> inputs/outputs/params JSON schema
- node_load(config, context) -> initialize engine
- node_execute(inputs, outputs, context) -> run inference
- node_unload(context) -> release resources

The DAG runner:
- Parse YAML/JSON -> topological sort -> stage list
- For each stage: load (if not resident) -> wire inputs (device pointers
  from predecessors) -> execute -> wire outputs -> evict if budget demands
- Async: cudaEventRecord between stages for overlap where stream topology
  allows

### 2.7 Section 6 — OpenAI-compatible REST server

**Trivial.** trellis-server already embeds cpp-httplib. llama-server is
the reference for /v1/chat/completions, /v1/completions. Lemonade
(Lemonade-SDK) already orchestrates trellis.cpp via this pattern. Add:
- /v1/models (catalog of loaded/available engines)
- /v1/pipelines (submit DAG run, poll status)
- /v1/infer/<engine> (single-engine direct inference)

---

## 3. Prior art

| Project | What it proves |
|---------|---------------|
| trellis.cpp | Single-process GGML multi-stage + custom CUDA + per-stage free |
| trellis2cpp | TRELLIS.2 in C++/GGML: DINOv3 + flow DiT + sparse decoder + PBR textures. C ABI, Go demo server |
| sam3.cpp | SAM 2/2.1/3 + EdgeTAM: text-prompted segmentation, video tracking, quantization. Single-file lib pattern |
| kimodo.cpp | NVIDIA Kimodo motion in C++/GGML: GGUF loading, C API, Vulkan/CPU, multi-skeleton |
| audio.cpp | 50+ audio model families: TTS, ASR, music, VC, separation. CUDA optimized, GGUF packages, WebUI |
| KoboldCpp | Single binary embedding llama + whisper + sd + llava |
| Lemonade | OpenAI-compatible server orchestrating trellis.cpp + llama.cpp |
| llama.cpp server | REST API + model hot-swap + partial GPU offload |
| ComfyUI model_management | VRAM tracking + forced unload of competing models |
| ray (Melite) | YAML/DAG plugin UX, model catalog, pipeline runner |

---

## 4. Where this beats ComfyUI (and where it does not)

### Wins

| Dimension | ComfyUI / ray today | inference.cpp |
|-----------|-------------------|---------------|
| Cold start | 10s+ Python boot | Sub-second process |
| Stage handoff | PNG/Base64 serialization | Device pointer (ms) |
| Deployment | Python + ComfyUI install + custom_nodes | One binary + GGUFs |
| Embedding | Cannot embed in Unreal/Unity | C-ABI P/Invoke works |
| VRAM accounting | Heuristic (can OOM) | Deterministic LRU budget |

### Does NOT win

| Dimension | Why |
|-----------|-----|
| Per-stage kernel speed | Identical kernels, identical FLOPs |
| Day-one model support | No custom_nodes ecosystem |
| New model integration | Weeks of porting per model (weight conversion + validation) |

**Bottom line:** if your pipelines are long sampling jobs (1024 cascade
meshes, video frames), the overhead savings are single-digit percent of
total time. If they are fan-outs of many small jobs (icons, VO bricks,
SFX lanes — exactly your game-kit lanes), the win is large.

---

## 5. Phased plan

### Phase 0 — Foundation (Week 1-2)

Target: skeleton builds, loads one engine, serves hello-world.

- CMake build system (follow trellis.cpp pattern: vendored ggml submod,
  backend flags -DGGML_CUDA=ON etc.)
- C-ABI plugin header (node_type_id, node_schema, node_load, node_execute,
  node_unload)
- YAML DAG parser (simple subset: nodes list, type, model path, input_from)
- DAG runner: topological sort, sequential stage execution
- VRAM budget struct (tracks allocated bytes per engine, eviction callbacks)
- HTTP server skeleton (cpp-httplib, /v1/models, /v1/health)
- One proof-of-concept plugin: wrap trellis.cpp CLI invocation as a
  C-ABI node (externally, not linked yet — just prove the contract)

### Phase 1 — Engine integration (Week 3-5)

Target: sd.cpp + trellis.cpp run inside inference.cpp with real zero-copy.

- llama.cpp: link as library, wrap as C-ABI node (llama.cpp has a clean
  C API already)
- sd.cpp: link as library, patch to expose latent device pointers
  (currently returns host pixels; need sd_image() variant returning
  ggml_tensor*)
- trellis.cpp: refactor trellis_cli into a library target (libtrellis)
  with execute(input_image, params, output_mesh) API, then wrap as
  C-ABI node
- Wire sd.cpp -> trellis.cpp pipeline in-process:
  sd.cpp outputs RGB FP16 device pointer -> trellis.cpp preprocess
  consumes it directly (skip PNG round-trip = zero-copy boundary)
- VRAM state machine v1: load/infer/free per stage, hard budget
  enforcement, LRU eviction when budget exceeded

### Phase 2 — DAG + production (Week 6-8)

Target: multi-stage DAGs with automatic VRAM management, REST server.

- DAG runner v2: async execution, cudaEvent-based sync, partial overlap
  where streams allow
- VRAM state machine v2: soft preemption (evict idle engines before
  hard OOM), streaming layer-by-layer offload for llama.cpp
- OpenAI-compatible endpoints: /v1/chat/completions, /v1/completions
- /v1/pipelines: submit DAG JSON, poll status, download artifacts
- whisper.cpp integration (C-ABI node)
- llama.cpp text-embedding endpoint (for image description -> TTS etc.)

### Phase 3 — Extended modalities (Month 3+)

Target: wrap existing C++ engines as C-ABI plugins, add segmentation preprocessor.

- TTS + ASR + music + VC + separation: audio.cpp is a mature
  ggml-native framework with 50+ model families, CUDA optimization,
  and GGUF packages. Wrap as C-ABI node(s) — likely one node per
  task family (tts, asr, music, vc, sep) since audio.cpp's internal
  dispatch already handles model selection
- Motion (kimodo.cpp): C++/GGML port already exists with C API,
  GGUF weights, Vulkan/CPU. Wrap kimodo_capi.h as C-ABI node.
  Two skeleton paths: SOMA RP/SEED (30j, open license) and
  SMPL-X RP (22j, requires gated NVIDIA license)
- Segmentation (sam3.cpp): useful preprocessor for trellis2cpp
  pipelines — segment subject before 3D reconstruction. Wrap as
  C-ABI node with text-prompted or point/box input
- comfy-kitchen INT8 kernels: extract specific ops (INT8 ConvRot for
  FLUX/Krea2/H3) as ggml custom ops; benchmark against BF16 path;
  only justify if INT8 gives >30% speedup on target hardware

### Phase 4 — Unify with ray (ongoing)

Target: inference.cpp replaces ComfyUI as ray's inference backend.

- ray gateway calls inference.cpp REST API instead of ComfyUI API
- Model catalog plugin syncs ray's YAML plugin format with inference.cpp's
  GGUF registry
- Hybrid mode: inference.cpp for C++ engines + ComfyUI subprocess for
  Python-only nodes (Trellis-adjacent, new custom_nodes)
- DSH plugin integration (side panel for inference.cpp management)

---

## 6. Scope control

**MVP = Phase 0 + Phase 1.** That gives you: in-process sd.cpp ->
trellis.cpp with real zero-copy, llama.cpp inference, OpenAI-compatible
server, VRAM budget management. Nothing exotic, all proven pieces.

**Defer aggressively:** LibTorch dual backend (Section 1A), comfy-kitchen INT8.
Each can be added later without architectural changes — the C-ABI plugin
contract is the extension point. Note: kimodo.cpp, audio.cpp (TTS/music/ASR),
and sam3.cpp already exist as ggml-native C++ engines; wrapping them as
C-ABI plugins is Phase 3 work, not a porting effort.

**Risk register:**

| Risk | Mitigation |
|------|-----------|
| ggml + libtorch allocator conflict (Phase 3) | Stay all-ggml in MVP; add torch only for specific kernels via raw CUDA |
| sd.cpp API changes break fork | Pin to a specific commit; maintain a thin wrapper |
| Per-stage free does not actually release VRAM (driver retention) | Use cudaMallocAsync + cudaDeviceSynchronize before free; test with nvidia-smi monitoring |
| DAG deadlocks (circular dependencies) | Topological sort rejects cycles at parse time |
| ComfyUI ecosystem pressure (users want custom_nodes) | Hybrid mode: inference.cpp for hot path, ComfyUI subprocess for rest |

---

*Plan authored: 2026-08-26. Working directory: /home/user/Documents/programs/active/inference.cpp*