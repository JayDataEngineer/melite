#ifndef INFERENCE_PLUGIN_H
#define INFERENCE_PLUGIN_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/*
 * C-ABI plugin contract for inference.cpp engines.
 *
 * Every backend (llama.cpp, sd.cpp, trellis.cpp, audio.cpp, kimodo.cpp,
 * sam3.cpp, ...) implements these six functions. The orchestrator loads
 * shared libraries at runtime and resolves these symbols.
 *
 * All functions return 0 on success, negative on error.
 */

/* Opaque per-instance context created by node_load */
typedef struct inference_context inference_context;

/* JSON-serialised schema describing this node's inputs/outputs/params */
typedef struct inference_schema {
    const char *json;   /* owned string; caller frees with inference_free() */
    size_t      len;
} inference_schema;

/* Named tensor slot — the orchestrator wires these between stages */
typedef struct inference_tensor {
    const char *name;   /* e.g. "image_rgb", "latent", "text" */
    const char *dtype;  /* "f32", "f16", "i32", "u8", ... */
    size_t      ndim;
    size_t      shape[8];
    void       *data;   /* device pointer (CUDA/Vulkan/CPU) */
    size_t      nbytes;
} inference_tensor;

/* ---------- plugin ABI (implemented by each engine) ---------- */

/* Identity */
const char *node_type_id(void);
const char *node_version(void);

/* Schema — returns JSON describing accepted inputs, outputs, and params */
inference_schema node_schema(void);

/* Lifecycle */
int node_load(const char *config_json, size_t config_len,
              inference_context **ctx);

int node_execute(inference_context *ctx,
                 const inference_tensor *inputs,  size_t n_inputs,
                 inference_tensor       *outputs, size_t n_outputs);

void node_unload(inference_context *ctx);

/* ---------- optional extension (audit F3, 2026-08-29) ----------
 * node_stop: called from ANOTHER thread while node_execute is in flight
 * (e.g. the operator pressed stop mid-render). Implementations should set
 * an internal stop flag their execute loop polls, cancel any remote work,
 * and make execute return promptly. Absent symbol = cooperative stop at
 * node boundaries only (legacy behavior). Never fatal to load. */
void node_stop(inference_context *ctx);

/* ---------- helpers for string ownership ---------- */

void inference_free(void *ptr);

#ifdef __cplusplus
}
#endif

#endif /* INFERENCE_PLUGIN_H */
