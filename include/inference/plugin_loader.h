#ifndef INFERENCE_PLUGIN_LOADER_H
#define INFERENCE_PLUGIN_LOADER_H

#include "inference/plugin.h"

#ifdef __cplusplus
extern "C" {
#endif

/* Opaque handle to a loaded plugin */
typedef struct inference_plugin inference_plugin;

/* Load a plugin shared library and resolve its ABI symbols */
inference_plugin *plugin_load(const char *so_path);

/* Query a loaded plugin */
const char *plugin_type_id(const inference_plugin *p);
const char *plugin_version(const inference_plugin *p);
const char *plugin_so_path(const inference_plugin *p);
inference_schema plugin_schema(const inference_plugin *p);

/* Lifecycle */
int plugin_load_model(const inference_plugin *p,
                      const char *config, size_t len,
                      inference_context **ctx);
int plugin_execute(const inference_plugin *p,
                   inference_context *ctx,
                   const inference_tensor *in, size_t n_in,
                   inference_tensor *out, size_t n_out);
/* Optional cooperative-stop hook (audit F3): forwards to node_stop when
 * the plugin exports it; returns 0 (no-op) when it does not. */
int plugin_stop(const inference_plugin *p, inference_context *ctx);

/* Optional card-compose hook (PLUGIN ARCHITECTURE LAW, 2026-08-31):
 * lane/card-specific run-graph rewrite, owned by the plugin. Returns 0
 * when the plugin has no card semantics (plain run, no-op). */
int plugin_card_compose(const inference_plugin *p, const char *body,
                        const char *model, const char *run_id,
                        char *yaml, size_t cap,
                        const char *prior_tail, char *extra_json,
                        size_t extra_cap);

void plugin_unload_model(const inference_plugin *p, inference_context *ctx);
void plugin_unload(inference_plugin *p);

#ifdef __cplusplus
}
#endif

#endif /* INFERENCE_PLUGIN_LOADER_H */
