#include "inference/runner.h"
#include "inference/plugin.h"
#include "inference/plugin_loader.h"
#include "inference/vram.h"
#include "inference/ws_server.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/*
 * DAG runner — loads plugins, wires tensors, executes in topo order,
 * manages VRAM via LRU eviction.
 */

/* ---- Per-node execution state ---- */

typedef struct {
    inference_plugin  *plugin;
    inference_context  *ctx;
    char               *type_id;
    char               *id;
    /* Outputs produced by this node */
    inference_tensor   *outputs;
    size_t              n_outputs;
} runner_node;

/* ---- Plugin registry (type_id -> .so path) ---- */

typedef struct {
    char *type_id;
    char *so_path;
} plugin_entry;

/* ---- Runner ---- */

struct inference_runner {
    inference_vram  *vram;
    inference_ws   *ws;       /* optional WebSocket for progress streaming */
    plugin_entry    *registry;
    size_t           n_registry;
    size_t           cap_registry;
    /* Per-execution state */
    runner_node     *nodes;
    size_t           n_nodes;
    /* Execution context for progress events */
    char             prompt_id[64];
    /* Stage-level control (see runner.h) */
    runner_stage_cb  stage_cb;
    void            *stage_ctx;
    volatile int     stop_flag;
    /* Output persistence: when set, node output tensors are written to
     * <out_dir>/<node_id>_<name>.<ext> after successful execution so the
     * server's artifact attribution (out_dir scan) can pick them up.
     * Engines that persist their own files (comfyui plugin writes images
     * itself and returns metadata-only tensors with data==NULL) are
     * skipped by the data!=NULL guard. */
    char             out_dir[512];
};

inference_runner *runner_create(size_t vram_budget_bytes, inference_ws *ws) {
    inference_runner *r = calloc(1, sizeof(*r));
    if (!r) return NULL;
    r->ws = ws;
    if (vram_budget_bytes > 0)
        r->vram = vram_create(vram_budget_bytes);
    return r;
}

int runner_register_plugin(inference_runner *r,
                           const char *type_id, const char *so_path) {
    if (!r || !type_id || !so_path) return -1;

    /* Grow registry if needed */
    if (r->n_registry >= r->cap_registry) {
        r->cap_registry = r->cap_registry ? r->cap_registry * 2 : 8;
        r->registry = realloc(r->registry,
                              r->cap_registry * sizeof(plugin_entry));
    }

    plugin_entry *e = &r->registry[r->n_registry++];
    e->type_id = strdup(type_id);
    e->so_path = strdup(so_path);
    return 0;
}

/* Find a registered .so path for a type_id */
static const char *find_plugin_path(const inference_runner *r,
                                    const char *type_id) {
    for (size_t i = 0; i < r->n_registry; i++) {
        if (strcmp(r->registry[i].type_id, type_id) == 0)
            return r->registry[i].so_path;
    }
    return NULL;
}

/* Build a config JSON by merging node model + params */
static char *build_config(const dag_node *node) {
    /* If params_json already contains everything, use it */
    if (node->params_json && node->model) {
        /* Merge model into params: insert "model_path" key */
        size_t plen = strlen(node->params_json);
        size_t mlen = strlen(node->model);
        /* {"model_path":"...<params_json without { */
        size_t cap = plen + mlen + 64;
        char *cfg = malloc(cap);
        /* Find opening brace of params */
        const char *body = node->params_json;
        while (*body && *body != '{') body++;
        if (*body == '{') body++;
        snprintf(cfg, cap, "{\"model_path\":\"%s\",%s", node->model, body);
        return cfg;
    }
    if (node->params_json) {
        return strdup(node->params_json);
    }
    if (node->model) {
        size_t cap = strlen(node->model) + 64;
        char *cfg = malloc(cap);
        snprintf(cfg, cap, "{\"model_path\":\"%s\"}", node->model);
        return cfg;
    }
    return strdup("{}");
}

/* Find a tensor by name in an array */
static const inference_tensor *find_tensor(const inference_tensor *tensors,
                                           size_t n, const char *name) {
    for (size_t i = 0; i < n; i++) {
        if (tensors[i].name && strcmp(tensors[i].name, name) == 0)
            return &tensors[i];
    }
    return NULL;
}

/* Resolve input tensors for a node from initial inputs + upstream outputs */
static size_t resolve_inputs(const runner_node *all_nodes, size_t n_nodes,
                             const dag_node *dnode,
                             const inference_tensor *initial, size_t n_initial,
                             inference_tensor *resolved) {
    size_t count = 0;

    for (size_t i = 0; i < dnode->n_inputs; i++) {
        const char *ref = dnode->input_from[i];
        const char *dot = strchr(ref, '.');
        if (!dot) continue;

        size_t node_id_len = (size_t)(dot - ref);
        const char *tensor_name = dot + 1;

        /* Find the source node */
        for (size_t j = 0; j < n_nodes; j++) {
            if (strlen(all_nodes[j].id) != node_id_len) continue;
            if (strncmp(all_nodes[j].id, ref, node_id_len) != 0) continue;

            /* Search upstream outputs first */
            const inference_tensor *t =
                find_tensor(all_nodes[j].outputs, all_nodes[j].n_outputs,
                            tensor_name);
            if (!t) {
                /* Search initial inputs */
                t = find_tensor(initial, n_initial, tensor_name);
            }
            if (t) {
                resolved[count] = *t;
                count++;
            }
            break;
        }
    }

    /* If no input_from references resolved anything and there are initial
       inputs, pass them through directly (first node gets raw inputs) */
    if (count == 0 && n_initial > 0) {
        for (size_t i = 0; i < n_initial && i < 32; i++) {
            resolved[count++] = initial[i];
        }
    }

    return count;
}

/* Choose a file extension for an output tensor. */
static const char *out_ext(const inference_tensor *t) {
    const uint8_t *b = (const uint8_t *)t->data;
    if (t->name && strcmp(t->name, "audio") == 0) return "wav";
    if (t->nbytes > 8 && b[0] == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G')
        return "png";
    if (t->nbytes > 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF)
        return "jpg";
    if (t->nbytes > 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F')
        return "wav";
    if (t->nbytes > 4 && b[0] == 'g' && b[1] == 'l' && b[2] == 'T' && b[3] == 'F')
        return "glb";
    if (t->dtype && strcmp(t->dtype, "f32") == 0) return "f32";
    if (t->dtype && strcmp(t->dtype, "i32") == 0) return "i32";
    return "bin";
}

/* Persist output tensors of a completed node into r->out_dir. */
static void persist_outputs(inference_runner *r, const char *node_id,
                            const inference_tensor *outs, size_t n) {
    if (!r->out_dir[0]) return;
    for (size_t j = 0; j < n; j++) {
        const inference_tensor *t = &outs[j];
        if (!t->data || t->nbytes == 0 || !t->name) continue;
        char path[768];
        snprintf(path, sizeof(path), "%s/%s_%s.%s",
                 r->out_dir, node_id, t->name, out_ext(t));
        FILE *f = fopen(path, "wb");
        if (!f) {
            fprintf(stderr, "runner: cannot write output %s\n", path);
            continue;
        }
        if (fwrite(t->data, 1, t->nbytes, f) != t->nbytes)
            fprintf(stderr, "runner: short write on %s\n", path);
        else
            fprintf(stderr, "runner: saved output %s (%zu bytes)\n",
                    path, t->nbytes);
        fclose(f);
    }
}

void runner_set_outdir(inference_runner *r, const char *dir) {
    if (!r) return;
    if (!dir) { r->out_dir[0] = '\0'; return; }
    snprintf(r->out_dir, sizeof(r->out_dir), "%s", dir);
}

void runner_set_stage_cb(inference_runner *r, runner_stage_cb cb, void *ctx) {
    if (!r) return;
    r->stage_cb = cb;
    r->stage_ctx = ctx;
}

void runner_request_stop(inference_runner *r) {
    if (r) r->stop_flag = 1;
}

void runner_clear_stop(inference_runner *r) {
    if (r) r->stop_flag = 0;
}

int runner_execute(inference_runner *r,
                   const inference_dag *dag,
                   const inference_tensor *initial_inputs, size_t n_initial,
                   char **result_json) {
    return runner_execute_ex(r, dag, initial_inputs, n_initial,
                             NULL, 0, 0, result_json);
}

int runner_execute_ex(inference_runner *r,
                      const inference_dag *dag,
                      const inference_tensor *initial_inputs, size_t n_initial,
                      const runner_prior_output *prior, size_t n_prior,
                      int start_from,
                      char **result_json) {
    if (!r || !dag) return -1;
    if (start_from < 0) start_from = 0;

    /* Generate prompt ID for this execution */
    static int prompt_counter = 0;
    snprintf(r->prompt_id, sizeof(r->prompt_id), "exec-%d-%p",
             ++prompt_counter, (void*)r);

    /* Emit execution_start event */
    if (r->ws) {
        ws_send_execution_start(r->ws, r->prompt_id);
        ws_send_status(r->ws, 1);  /* queue_remaining = 1 */
    }

    /* Topological sort */
    if (dag->n_nodes == 0) {
        /* empty/garbage DAG - error out, never index order[n-1] */
        if (r->ws) ws_send_execution_error(r->ws, r->prompt_id, "",
                                            "dag has no nodes");
        return -2;
    }
    size_t *order = malloc(dag->n_nodes * sizeof(size_t));
    if (!order) return -1;
    if (dag_topo_sort(dag, order) < 0) {
        free(order);
        if (r->ws) ws_send_execution_error(r->ws, r->prompt_id, "", "cycle detected");
        return -1;  /* cycle */
    }

    /* Allocate per-node state */
    r->n_nodes = dag->n_nodes;
    r->nodes = calloc(r->n_nodes, sizeof(runner_node));

    /* Execute in topo order */
    int stopped_rc = 0;
    for (size_t i = 0; i < r->n_nodes; i++) {
        size_t idx = order[i];
        dag_node *dnode = &dag->nodes[idx];
        runner_node *rnode = &r->nodes[idx];

        rnode->id = dnode->id;
        rnode->type_id = dnode->type;

        /* Cooperative stop - checked at every node boundary */
        if (r->stop_flag) {
            fprintf(stderr, "runner: cooperative stop before node %s\n",
                    dnode->id);
            stopped_rc = 1;
            break;
        }

        /* Resume: skip nodes whose prior outputs are available */
        if ((int)i < start_from) {
            size_t n_have = 0;
            for (size_t p = 0; p < n_prior; p++)
                if (prior && prior[p].node_id &&
                    strcmp(prior[p].node_id, dnode->id) == 0)
                    n_have++;
            if (n_have > 0) {
                /* Allocate output slots and fill from prior outputs */
                rnode->outputs = calloc(16, sizeof(inference_tensor));
                rnode->n_outputs = 16;
                size_t slot = 0;
                for (size_t p = 0; p < n_prior && slot < 16; p++) {
                    if (!prior || !prior[p].node_id) continue;
                    if (strcmp(prior[p].node_id, dnode->id) != 0) continue;
                    inference_tensor *t = &rnode->outputs[slot++];
                    memset(t, 0, sizeof(*t));
                    t->name = (char *)prior[p].tensor_name;
                    t->dtype = (char *)prior[p].dtype;
                    t->ndim = 1;
                    t->shape[0] = (long)prior[p].nbytes;
                    t->data = (void *)prior[p].data;
                    t->nbytes = prior[p].nbytes;
                }
                rnode->n_outputs = slot;
                fprintf(stderr, "runner: [%zu/%zu] %s SKIPPED (%zu prior outputs)\n",
                        i + 1, r->n_nodes, dnode->id, slot);
                if (r->stage_cb)
                    r->stage_cb(r->stage_ctx, dnode->id, (int)i,
                                (int)r->n_nodes, RUNNER_STAGE_SKIPPED);
                continue;
            }
            fprintf(stderr, "runner: [%zu/%zu] %s has no prior outputs - executing\n",
                    i + 1, r->n_nodes, dnode->id);
        }

        fprintf(stderr, "runner: [%zu/%zu] %s (type=%s)\n",
                i + 1, r->n_nodes, dnode->id, dnode->type);

        if (r->stage_cb)
            r->stage_cb(r->stage_ctx, dnode->id, (int)i,
                        (int)r->n_nodes, RUNNER_STAGE_STARTED);

        /* Emit executing event — node started */
        if (r->ws) {
            ws_send_executing(r->ws, r->prompt_id, dnode->id);
        }

        /* Find plugin */
        const char *so_path = find_plugin_path(r, dnode->type);
        if (!so_path) {
            fprintf(stderr, "runner: no plugin registered for type '%s'\n",
                    dnode->type);
            if (r->ws) ws_send_execution_error(r->ws, r->prompt_id, dnode->id,
                                               "no plugin registered");
            free(order);
            return -1;
        }

        /* Load plugin */
        rnode->plugin = plugin_load(so_path);
        if (!rnode->plugin) {
            fprintf(stderr, "runner: failed to load plugin %s\n", so_path);
            if (r->ws) ws_send_execution_error(r->ws, r->prompt_id, dnode->id,
                                               "plugin load failed");
            free(order);
            return -1;
        }

        /* Build config */
        char *config = build_config(dnode);

        /* Load model */
        int rc = plugin_load_model(rnode->plugin, config, strlen(config),
                                   &rnode->ctx);
        free(config);
        if (rc < 0) {
            fprintf(stderr, "runner: node_load failed for %s\n", dnode->id);
            if (r->ws) ws_send_execution_error(r->ws, r->prompt_id, dnode->id,
                                               "node_load failed");
            plugin_unload(rnode->plugin);
            rnode->plugin = NULL;
            free(order);
            return -1;
        }

        /* Register with VRAM manager */
        if (r->vram) {
            vram_register(r->vram, dnode->id, 64 * 1024 * 1024,
                          rnode->ctx, NULL);
        }

        /* Resolve inputs */
        inference_tensor inputs[32];
        size_t n_inputs = resolve_inputs(r->nodes, r->n_nodes, dnode,
                                         initial_inputs, n_initial, inputs);

        /* Allocate output slots */
        rnode->outputs = calloc(16, sizeof(inference_tensor));
        rnode->n_outputs = 16;

        /* Emit progress — 50% (model loaded, about to execute) */
        if (r->ws) {
            ws_send_progress(r->ws, r->prompt_id, dnode->id,
                            (int)(i * 2), (int)(r->n_nodes * 2));
        }

        /* Execute */
        rc = plugin_execute(rnode->plugin, rnode->ctx,
                            inputs, n_inputs,
                            rnode->outputs, rnode->n_outputs);

        /* Count actual outputs */
        size_t actual = 0;
        for (size_t j = 0; j < rnode->n_outputs; j++) {
            if (rnode->outputs[j].data) actual++;
        }
        rnode->n_outputs = actual;

        if (rc < 0) {
            fprintf(stderr, "runner: node_execute failed for %s\n", dnode->id);
            if (r->stage_cb)
                r->stage_cb(r->stage_ctx, dnode->id, (int)i,
                            (int)r->n_nodes, RUNNER_STAGE_ERROR);
            if (r->ws) ws_send_execution_error(r->ws, r->prompt_id, dnode->id,
                                               "node_execute failed");
            free(order);
            return -1;
        }

        /* Touch VRAM */
        if (r->vram) {
            vram_touch(r->vram, dnode->id);
        }

        /* Emit progress — node completed */
        if (r->ws) {
            ws_send_progress(r->ws, r->prompt_id, dnode->id,
                            (int)((i + 1) * 2), (int)(r->n_nodes * 2));
            ws_send_executing(r->ws, r->prompt_id, NULL);  /* node done */
        }

        fprintf(stderr, "runner: %s completed (%zu outputs)\n",
                dnode->id, rnode->n_outputs);

        /* Persist output tensors BEFORE the DONE callback so the server's
         * artifact attribution (out_dir scan) sees the files. */
        persist_outputs(r, dnode->id, rnode->outputs, rnode->n_outputs);

        if (r->stage_cb)
            r->stage_cb(r->stage_ctx, dnode->id, (int)i,
                        (int)r->n_nodes, RUNNER_STAGE_DONE);
    }

    /* Cooperatively stopped: emit error-side event and bail */
    if (stopped_rc == 1) {
        if (r->ws) {
            ws_send_execution_error(r->ws, r->prompt_id, "",
                                    "cooperative stop");
            ws_send_status(r->ws, 0);
        }
        free(order);
        return 1;
    }

    /* Build result JSON from last node's outputs */
    if (result_json) {
        size_t last = order[r->n_nodes - 1];
        runner_node *rnode = &r->nodes[last];
        size_t cap = 4096;
        char *json = malloc(cap);
        int off = snprintf(json, cap, "{\"prompt_id\":\"%s\",\"node\":\"%s\",\"outputs\":[",
                           r->prompt_id, rnode->id);
        for (size_t j = 0; j < rnode->n_outputs; j++) {
            inference_tensor *t = &rnode->outputs[j];
            if (j) json[off++] = ',';
            off += snprintf(json + off, cap - off,
                "{\"name\":\"%s\",\"dtype\":\"%s\",\"nbytes\":%zu}",
                t->name ? t->name : "?",
                t->dtype ? t->dtype : "?",
                t->nbytes);
        }
        snprintf(json + off, cap - off, "]}");
        *result_json = json;
    }

    /* Emit execution_success */
    if (r->ws) {
        ws_send_execution_success(r->ws, r->prompt_id);
        ws_send_status(r->ws, 0);  /* queue_remaining = 0 */
    }

    free(order);
    return 0;
}

inference_vram *runner_get_vram(inference_runner *r) {
    return r ? r->vram : NULL;
}

void runner_destroy(inference_runner *r) {
    if (!r) return;

    /* Unload all loaded contexts */
    for (size_t i = 0; i < r->n_nodes; i++) {
        runner_node *n = &r->nodes[i];
        if (n->ctx && n->plugin) {
            if (r->vram) vram_unregister(r->vram, n->id);
            plugin_unload_model(n->plugin, n->ctx);
        }
        if (n->plugin) plugin_unload(n->plugin);
        /* Free deep-copied output tensor data */
        for (size_t j = 0; j < n->n_outputs; j++) {
            if (n->outputs[j].data) free(n->outputs[j].data);
        }
        free(n->outputs);
    }
    free(r->nodes);

    /* Destroy VRAM tracker */
    if (r->vram) vram_destroy(r->vram);

    /* Free registry */
    for (size_t i = 0; i < r->n_registry; i++) {
        free(r->registry[i].type_id);
        free(r->registry[i].so_path);
    }
    free(r->registry);

    free(r);
}
