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

/* ---- Stage-level control (parity with the ray gateway run door) ---- */

/* Stage callback states */
#define RUNNER_STAGE_STARTED  0
#define RUNNER_STAGE_DONE     1
#define RUNNER_STAGE_SKIPPED  2
#define RUNNER_STAGE_ERROR    3

/* Fired at each node boundary: started / done / skipped(prior output). */
typedef void (*runner_stage_cb)(void *ctx, const char *node_id,
                                int index, int total, int state);

/* A pre-computed output from a prior (already-executed) run - lets a
 * resumed run skip nodes whose artifacts already exist on disk. */
typedef struct runner_prior_output {
    const char *node_id;      /* which node produced it */
    const char *tensor_name;  /* e.g. "image_0" */
    const char *dtype;        /* "u8" or "f32" */
    const void *data;
    size_t      nbytes;
} runner_prior_output;

void runner_set_stage_cb(inference_runner *r, runner_stage_cb cb, void *ctx);

/* Output persistence: when dir is set (non-empty), every node's output
 * tensors are written to <dir>/<node_id>_<name>.<ext> after successful
 * execution (magic-byte sniffed extension). Tensors with data==NULL are
 * skipped, so engines that write their own files (comfyui) are unaffected. */
void runner_set_outdir(inference_runner *r, const char *dir);

/* Cooperative stop: checked at node boundaries. The running execute
 * returns 1 (stopped) at the next boundary. */
void runner_request_stop(inference_runner *r);
void runner_clear_stop(inference_runner *r);

/* Extended execution:
 *   prior/n_prior  - outputs injected for skipped nodes
 *   start_from     - topo index to resume from; nodes before it are skipped
 *                    when their outputs are available in prior (nodes
 *                    without prior outputs still execute - their outputs
 *                    cannot be reconstructed)
 *   returns 0 success, 1 stopped cooperatively, negative on error */
int runner_execute_ex(inference_runner *r, const inference_dag *dag,
                      const inference_tensor *initial_inputs, size_t n_initial,
                      const runner_prior_output *prior, size_t n_prior,
                      int start_from,
                      char **result_json);

/* Get the VRAM tracker from a runner (may be NULL if budget was 0). */
inference_vram *runner_get_vram(inference_runner *r);

/* Destroy the runner, unloading all plugins and freeing VRAM. */
void runner_destroy(inference_runner *r);

#ifdef __cplusplus
}
#endif

#endif /* INFERENCE_RUNNER_H */
