#ifndef INFERENCE_VRAM_H
#define INFERENCE_VRAM_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/*
 * VRAM budget state machine.
 *
 * Tracks allocated bytes per engine, enforces a hard budget, and evicts
 * the least-recently-used engine when pressure exceeds the limit.
 */

typedef struct inference_vram inference_vram;

/* Create a budget tracker with the given total budget in bytes */
inference_vram *vram_create(size_t budget_bytes);

/* Register an engine instance. Returns a handle for subsequent calls. */
typedef void (*vram_evict_fn)(void *engine_ctx);
int vram_register(inference_vram *v, const char *engine_id,
                  size_t initial_bytes, void *engine_ctx,
                  vram_evict_fn evict);

/* Update the tracked allocation for an engine (after load/infer/resize). */
int vram_update(inference_vram *v, const char *engine_id,
                size_t new_bytes);

/* Unregister an engine (on unload). */
int vram_unregister(inference_vram *v, const char *engine_id);

/* Touch an engine to mark it as most-recently-used. */
int vram_touch(inference_vram *v, const char *engine_id);

/* Query current state */
size_t vram_total(const inference_vram *v);
size_t vram_used(const inference_vram *v);
size_t vram_free(const inference_vram *v);

/* Force-evict the least-recently-used engine. Returns 0 if evicted, -1 if
   nothing to evict. The evicted engine's evict callback is called. */
int vram_evict_lru(inference_vram *v);

/* Destroy the tracker (does NOT evict — call vram_evict_lru in a loop first) */
void vram_destroy(inference_vram *v);

#ifdef __cplusplus
}
#endif

#endif /* INFERENCE_VRAM_H */
