#ifndef INFERENCE_RUNNER_H
#define INFERENCE_RUNNER_H

#include "inference/dag.h"
#include "inference/plugin_loader.h"
#include "inference/vram.h"
#include "inference/ws_server.h"
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/*
 * DAG runner — executes a pipeline by loading plugins, wiring tensors
 * between stages, and managing VRAM via LRU eviction.
 */

typedef struct inference_runner inference_runner;

/* Create a runner with a VRAM budget (0 = unlimited).
 * ws: optional WebSocket server for progress streaming (can be NULL). */
inference_runner *runner_create(size_t vram_budget_bytes, inference_ws *ws);

/* Register a plugin .so path for a given engine type_id.
 * The runner will dlopen the .so when the DAG references this type. */
int runner_register_plugin(inference_runner *r,
                           const char *type_id, const char *so_path);

/* Execute a DAG. Returns 0 on success, negative on error.
 * On success, *result_json is set to a malloc'd JSON string with output
 * tensor metadata. Caller frees with inference_free(). */
int runner_execute(inference_runner *r,
                   const inference_dag *dag,
                   const inference_tensor *initial_inputs, size_t n_initial,
                   char **result_json);

/* Get the VRAM tracker from a runner (may be NULL if budget was 0). */
inference_vram *runner_get_vram(inference_runner *r);

/* Destroy the runner, unloading all plugins and freeing VRAM. */
void runner_destroy(inference_runner *r);

#ifdef __cplusplus
}
#endif

#endif /* INFERENCE_RUNNER_H */
