#include "inference/runner.h"
#include "inference/plugin.h"
#include "inference/plugin_loader.h"
#include "inference/vram.h"
#include "inference/ws_server.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include <unistd.h>   /* dup/dup2/close for stderr capture */

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
    char             last_error[2048]; /* last node_execute error detail */
    /* (audit F3, 2026-08-29) mid-execute stop forwarding: while a node is
     * executing, these point at its plugin+ctx so runner_request_stop()
     * (called from the HTTP thread) can call plugin_stop() INTO the live
     * execution — e.g. comfyui cancels the render instead of burning the
     * GPU until timeout. Guarded by cur_mu; NULL outside execute. */
    pthread_mutex_t   cur_mu;
    const inference_plugin   *cur_plugin;
    inference_context        *cur_ctx;
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
    pthread_mutex_init(&r->cur_mu, NULL);   /* (audit F3) */
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

/* (validation law, 2026-08-30) schema query for registration-time
 * input-coverage checks — dlopen the .so, read node_schema, unload.
 * Registration is not the hot path; the cost is one dlopen per
 * validated node type. */
int runner_schema_for_type(inference_runner *r, const char *type_id,
                           char *out, size_t cap) {
    if (!r || !type_id || !out || cap == 0) return -1;
    const char *path = find_plugin_path(r, type_id);
    if (!path) return -1;
    inference_plugin *p = plugin_load(path);
    if (!p) return -1;
    int rc = -1;
    const char *tid = plugin_type_id(p);
    if (tid && strcmp(tid, type_id) == 0) {
        inference_schema s = plugin_schema(p);
        if (s.json && s.len > 0) {
            snprintf(out, cap, "%.*s", (int)(s.len < cap - 1 ? s.len : cap - 1),
                     s.json);
            rc = (int)strlen(out);
        }
        if (s.json) inference_free((void *)s.json);
    }
    plugin_unload(p);
    return rc;
}

/* (PLUGIN ARCHITECTURE LAW, 2026-08-31) card-compose dispatch: hand the
 * CARD's own semantics to the plugin that owns the lane's engine type.
 * The plugin rewrites the run graph in place (Layer A globals / Layer B
 * per-call overrides from the card's plugin-owned knob map). Absent
 * hook = no card semantics: plain run, no-op. The server NEVER names a
 * lane or an engine — it passes the graph's own node type through. */
int runner_card_compose(inference_runner *r, const char *type_id,
                        const char *body, const char *model,
                        const char *run_id, char *yaml, size_t cap,
                        const char *prior_tail, char *extra_json,
                        size_t extra_cap) {
    if (!r || !type_id) return -1;
    const char *path = find_plugin_path(r, type_id);
    if (!path) return -1;
    inference_plugin *p = plugin_load(path);
    if (!p) return -1;
    int rc = plugin_card_compose(p, body, model, run_id, yaml, cap,
                                 prior_tail, extra_json, extra_cap);
    plugin_unload(p);
    return rc;
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
            } else {
                /* Resilience law: a dropped cross-node ref must be LOUD.
                 * Silent shrinking turned a 4-window stitch into 2 inputs
                 * with no trace in the logs (2026-08-30). */
                fprintf(stderr, "runner: WARNING input ref '%s' unresolved for node '%s' (source has no such tensor)", ref, dnode->id);
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
    if (t->name && strcmp(t->name, "video") == 0) return "mp4";
    if (t->nbytes > 8 && b[0] == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G')
        return "png";
    if (t->nbytes > 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF)
        return "jpg";
    if (t->nbytes > 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F')
        return "wav";
    if (t->nbytes > 4 && b[0] == 'f' && b[1] == 'L' && b[2] == 'a' && b[3] == 'C')
        return "flac";
    if (t->nbytes > 12 && b[4] == 'f' && b[5] == 't' && b[6] == 'y' && b[7] == 'p')
        return "mp4";
    if (t->nbytes > 4 && b[0] == 'O' && b[1] == 'g' && b[2] == 'g' && b[3] == 'S')
        return "ogg";
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

        /* latent seam tensors carry a local .h3latent file PATH as text:
         * copy the actual pack into the run dir so the card keeps the seam
         * artifact even after ComfyUI's output dir rotates. */
        if (strcmp(t->name, "latent_last") == 0 && t->nbytes > 5 &&
            (((const char *)t->data)[0] == '/' ||
             (((const char *)t->data)[0] == '.' &&
              ((const char *)t->data)[1] == '/'))) {
            char lsrc[768], ldst[768];
            size_t lp = t->nbytes < sizeof(lsrc) - 1 ? t->nbytes : sizeof(lsrc) - 1;
            memcpy(lsrc, t->data, lp); lsrc[lp] = 0;
            if (!strstr(lsrc, ".h3latent")) continue;
            snprintf(ldst, sizeof(ldst), "%s/%s_latent_last.h3latent",
                     r->out_dir, node_id);
            FILE *in = fopen(lsrc, "rb");
            if (in) {
                FILE *o = fopen(ldst, "wb");
                if (o) {
                    char buf[65536]; size_t got, total = 0;
                    while ((got = fread(buf, 1, sizeof(buf), in)) > 0) {
                        fwrite(buf, 1, got, o); total += got;
                    }
                    fclose(o);
                    fprintf(stderr,
                            "runner: persisted latent seam %s (%zu bytes)\n",
                            ldst, total);
                }
                fclose(in);
            } else {
                fprintf(stderr, "runner: latent seam src unreadable: %s\n", lsrc);
            }
        }
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

void runner_set_error(inference_runner *r, const char *msg) {
    if (!r) return;
    if (msg) snprintf(r->last_error, sizeof(r->last_error), "%s", msg);
    else r->last_error[0] = '\0';
}

const char *runner_get_error(inference_runner *r) {
    if (!r) return "";
    return r->last_error;
}

void runner_request_stop(inference_runner *r) {
    if (!r) return;
    __atomic_store_n(&r->stop_flag, 1, __ATOMIC_RELEASE);
    /* (audit F3) forward INTO the currently executing node so engines
     * that poll a stop flag (comfyui) cancel remote work immediately.
     * Snapshot under the mutex, call OUTSIDE it — plugin_stop must be
     * able to take its own locks. */
    const inference_plugin *pl;
    inference_context      *cx;
    pthread_mutex_lock(&r->cur_mu);
    pl = r->cur_plugin;
    cx = r->cur_ctx;
    pthread_mutex_unlock(&r->cur_mu);
    if (pl && cx)
        plugin_stop(pl, cx);
}

void runner_clear_stop(inference_runner *r) {
    if (r) __atomic_store_n(&r->stop_flag, 0, __ATOMIC_RELEASE);
}

int runner_execute(inference_runner *r,
                   const inference_dag *dag,
                   const inference_tensor *initial_inputs, size_t n_initial,
                   char **result_json) {
    return runner_execute_ex(r, dag, initial_inputs, n_initial,
                             NULL, 0, 0, result_json);
}

/* ── Process-global model cache (1:1 ComfyUI node law, 2026-08-28) ───
 * Loaded engine contexts are CACHE-RESIDENT across runs: a later run of
 * the same node config reuses the loaded model instead of re-reading
 * weights, and nothing eagerly unloads at run end. Eviction happens only
 * under pressure: a different model for the same engine type, or the
 * cache filling up (LRU). Exactly how ComfyUI's model_management treats
 * weights between queue items. Key = engine type + config hash: the
 * config is static per pipeline definition (per-run data arrives via
 * execute inputs), so identical configs mean identical models. */
#define MODEL_CACHE_MAX 8
typedef struct model_cache_ent {
    char type[64];
    unsigned long long key;      /* FNV-1a of the full config string */
    inference_plugin *plugin;    /* owned by the cache */
    inference_context *ctx;      /* owned by the cache */
    unsigned long long touched;  /* LRU tick */
} model_cache_ent;
static model_cache_ent g_mcache[MODEL_CACHE_MAX];
static size_t g_mcache_n = 0;
static unsigned long long g_mcache_tick = 0;
static pthread_mutex_t g_mcache_mu = PTHREAD_MUTEX_INITIALIZER;

static unsigned long long mcache_hash(const char *s) {
    unsigned long long h = 1469598103934665603ULL;
    while (*s) { h ^= (unsigned char)*s++; h *= 1099511628211ULL; }
    return h;
}

/* Evict one entry (pressure) — unload exactly like a normal teardown. */
static void mcache_drop(model_cache_ent *e) {
    fprintf(stderr, "runner: model cache EVICT %s (pressure)\n",
            e->type);
    if (e->ctx && e->plugin) plugin_unload_model(e->plugin, e->ctx);
    if (e->plugin) plugin_unload(e->plugin);
    memset(e, 0, sizeof(*e));
}

/* Lookup a cached (plugin, ctx) for this node config; touches on hit. */
static int mcache_acquire(const char *type, const char *config,
                          inference_plugin **plugin,
                          inference_context **ctx) {
    unsigned long long key = mcache_hash(config);
    int hit = 0;
    pthread_mutex_lock(&g_mcache_mu);
    for (size_t i = 0; i < g_mcache_n; i++) {
        if (g_mcache[i].key == key && strcmp(g_mcache[i].type, type) == 0) {
            g_mcache[i].touched = ++g_mcache_tick;
            *plugin = g_mcache[i].plugin;
            *ctx = g_mcache[i].ctx;
            hit = 1;
            break;
        }
    }
    pthread_mutex_unlock(&g_mcache_mu);
    if (hit)
        fprintf(stderr, "runner: model cache HIT %s (weights stay \n"
                        "resident, no reload)\n", type);
    return hit;
}

/* Take ownership of a freshly loaded (plugin, ctx); evicts under
 * pressure: same engine type with a different config first, then LRU. */
static void mcache_insert(const char *type, const char *config,
                          inference_plugin *plugin,
                          inference_context *ctx) {
    unsigned long long key = mcache_hash(config);
    pthread_mutex_lock(&g_mcache_mu);
    /* same type, different config = replace (the old model is obsolete) */
    for (size_t i = 0; i < g_mcache_n; i++) {
        if (strcmp(g_mcache[i].type, type) == 0 && g_mcache[i].key != key) {
            mcache_drop(&g_mcache[i]);
            g_mcache_n--;
            memmove(&g_mcache[i], &g_mcache[i + 1],
                    (g_mcache_n - i) * sizeof(model_cache_ent));
            break;
        }
    }
    /* full = evict LRU */
    if (g_mcache_n == MODEL_CACHE_MAX) {
        size_t lru = 0;
        for (size_t i = 1; i < g_mcache_n; i++)
            if (g_mcache[i].touched < g_mcache[lru].touched) lru = i;
        mcache_drop(&g_mcache[lru]);
        g_mcache_n--;
        memmove(&g_mcache[lru], &g_mcache[lru + 1],
                (g_mcache_n - lru) * sizeof(model_cache_ent));
    }
    snprintf(g_mcache[g_mcache_n].type, sizeof(g_mcache[0].type), "%s",
             type);
    g_mcache[g_mcache_n].key = key;
    g_mcache[g_mcache_n].plugin = plugin;
    g_mcache[g_mcache_n].ctx = ctx;
    g_mcache[g_mcache_n].touched = ++g_mcache_tick;
    g_mcache_n++;
    fprintf(stderr, "runner: model cache INSERT %s key=%llu cfg=%.120s\n",
            type, key, config);
    pthread_mutex_unlock(&g_mcache_mu);
}

/* Flush the whole cache (process shutdown only — never per run). */
static void mcache_flush(void) {
    pthread_mutex_lock(&g_mcache_mu);
    for (size_t i = 0; i < g_mcache_n; i++) mcache_drop(&g_mcache[i]);
    g_mcache_n = 0;
    pthread_mutex_unlock(&g_mcache_mu);
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

    /* Release the PREVIOUS execution's per-node records. Loaded models
     * stay resident — the model cache owns them (1:1 law); only the
     * bookkeeping array and output buffers are per-run. */
    if (r->nodes) {
        for (size_t k = 0; k < r->n_nodes; k++) {
            runner_node *on = &r->nodes[k];
            for (size_t j = 0; j < on->n_outputs; j++) {
                if (on->outputs[j].data) free((void *)on->outputs[j].data);
                if (on->outputs[j].name) free((void *)on->outputs[j].name);
            }
            free(on->outputs);
        }
        free(r->nodes);
        r->nodes = NULL;
        r->n_nodes = 0;
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
        if (__atomic_load_n(&r->stop_flag, __ATOMIC_ACQUIRE)) {
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
            { char _emsg[256]; snprintf(_emsg, sizeof(_emsg),
                "no plugin registered for type: %s", dnode->type);
              runner_set_error(r, _emsg); }
            if (r->ws) ws_send_execution_error(r->ws, r->prompt_id, dnode->id,
                                               "no plugin registered");
            free(order);
            return -1;
        }

        /* Cache-resident models (1:1 law): a node whose exact config ran
         * before reuses its loaded engine — no reload. The config is the
         * cache key; per-run data arrives via execute inputs. */
        char *config = build_config(dnode);
        rnode->ctx = NULL;
        if (mcache_acquire(dnode->type, config, &rnode->plugin,
                           &rnode->ctx)) {
            free(config);
            goto have_model;
        }

        /* Load plugin */
        rnode->plugin = plugin_load(so_path);
        if (!rnode->plugin) {
            fprintf(stderr, "runner: failed to load plugin %s\n", so_path);
            { char _emsg[256]; snprintf(_emsg, sizeof(_emsg),
                "plugin load failed: %s", so_path);
              runner_set_error(r, _emsg); }
            if (r->ws) ws_send_execution_error(r->ws, r->prompt_id, dnode->id,
                                               "plugin load failed");
            free(order);
            return -1;
        }

        /* Load model (config was built above as the cache key) */
        int rc = plugin_load_model(rnode->plugin, config, strlen(config),
                                   &rnode->ctx);
        if (rc == 0)
            mcache_insert(dnode->type, config, rnode->plugin, rnode->ctx);
        free(config);
        if (rc < 0) {
            fprintf(stderr, "runner: node_load failed for %s\n", dnode->id);
            { char _emsg[256]; snprintf(_emsg, sizeof(_emsg),
                "node_load failed for %s: plugin params missing or invalid", dnode->id);
              runner_set_error(r, _emsg); }
            if (r->ws) ws_send_execution_error(r->ws, r->prompt_id, dnode->id,
                                               "node_load failed");
            plugin_unload(rnode->plugin);
            rnode->plugin = NULL;
            free(order);
            return -1;
        }

have_model:
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

        /* Execute — capture plugin stderr so failures carry their
         * exact message into the queue ledger (operator order 2026-08-29).
         * fd 2 is swapped to a capture file around plugin_execute. */
        {
            /* (audit F8) pid-suffixed capture path: two gateway/CLI
             * processes running side by side must never overwrite each
             * other's error capture. */
            char cap_path[96];
            snprintf(cap_path, sizeof(cap_path),
                     "/tmp/_runner_stderr_capture_%ld", (long)getpid());
            fflush(stderr);
            int saved_stderr = dup(2);
            FILE *cap = fopen(cap_path, "w");
            if (cap) {
                dup2(fileno(cap), 2);
                fclose(cap);
            }
            /* (audit F3) publish the live node for runner_request_stop():
             * an operator stop mid-render forwards INTO this execution. */
            pthread_mutex_lock(&r->cur_mu);
            r->cur_plugin = rnode->plugin;
            r->cur_ctx    = rnode->ctx;
            pthread_mutex_unlock(&r->cur_mu);
            rc = plugin_execute(rnode->plugin, rnode->ctx,
                                inputs, n_inputs,
                                rnode->outputs, rnode->n_outputs);
            pthread_mutex_lock(&r->cur_mu);
            r->cur_plugin = NULL;
            r->cur_ctx    = NULL;
            pthread_mutex_unlock(&r->cur_mu);
            fflush(stderr);
            if (saved_stderr >= 0) {
                dup2(saved_stderr, 2);
                close(saved_stderr);
            }
            /* Replay captured plugin output to the real stderr so normal
             * logs stay visible; the capture file itself is only read on
             * failure (exact-error ledger law). */
            { FILE *rp = fopen(cap_path, "r");
              if (rp) { char buf[4096]; size_t n;
                         while ((n = fread(buf, 1, sizeof(buf), rp)) > 0)
                             fwrite(buf, 1, n, stderr);
                         fclose(rp); } }
        }

        /* Deep-copy outputs into runner-owned memory (dangling-tensor
         * law, 2026-08-30): plugin_execute returns tensors whose bytes are
         * owned by the plugin's cache-resident context. A later model-cache
         * eviction (window2's INSERT evicting window1's cfg) frees those
         * bytes while downstream stages still hold the pointers — the
         * stitch stage then reads freed memory ("moov atom not found").
         * The runner owns its records end-to-end: copy now; runner_destroy
         * and the resume path already free .data. */
        for (size_t j = 0; j < rnode->n_outputs; j++) {
            inference_tensor *t = &rnode->outputs[j];
            if (!t->data || t->nbytes == 0) continue;
            void *copy = malloc(t->nbytes);
            if (copy) {
                memcpy(copy, t->data, t->nbytes);
                t->data = copy;
            }
            /* name strings are cfg-owned too (own(cfg, strdup(...)) in the
             * comfyui engine) — an eviction would dangle them and
             * find_tensor() then misses refs; the runner must own the
             * names as well. dtype is a .roda literal, safe as-is. */
            if (t->name) {
                char *nm = strdup(t->name);
                if (nm) t->name = (const char *)nm;
            }
        }

        /* Count actual outputs */
        size_t actual = 0;
        for (size_t j = 0; j < rnode->n_outputs; j++) {
            if (rnode->outputs[j].data) actual++;
        }
        rnode->n_outputs = actual;

        if (rc < 0) {
            fprintf(stderr, "runner: node_execute failed for %s\n", dnode->id);
            { char cap_path[96];
                snprintf(cap_path, sizeof(cap_path),
                         "/tmp/_runner_stderr_capture_%ld", (long)getpid());
              FILE *cap = fopen(cap_path, "r");
              if (cap) { size_t n = fread(r->last_error, 1,
                             sizeof(r->last_error) - 2, cap);
                         r->last_error[n] = 0; fclose(cap); }
              else snprintf(r->last_error, sizeof(r->last_error),
                            "node_execute failed for %s (no capture)", dnode->id);
            }
            /* (audit F3, 2026-08-29) a node that failed BECAUSE the
             * operator pressed stop is a STOP, not an error: the comfyui
             * engine cancels its render and returns -1 on node_stop. Map
             * it onto the cooperative-stop path (rc=1 -> "stopped") so
             * the ledger never blames the queue for an operator stop. */
            if (__atomic_load_n(&r->stop_flag, __ATOMIC_ACQUIRE)) {
                fprintf(stderr, "runner: node failure coincides with stop "
                                "request -> reporting stopped (%s)\n", dnode->id);
                free(order);
                return 1;
            }
            if (r->stage_cb)
                r->stage_cb(r->stage_ctx, dnode->id, (int)i,
                            (int)r->n_nodes, RUNNER_STAGE_ERROR);
            if (r->ws) ws_send_execution_error(r->ws, r->prompt_id, dnode->id,
                                                r->last_error);
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

    /* Per-node records only — loaded models live in the process-global
     * model cache and are flushed below (shutdown-time, never per run). */
    for (size_t i = 0; i < r->n_nodes; i++) {
        runner_node *n = &r->nodes[i];
        if (n->ctx && n->plugin && r->vram)
            vram_unregister(r->vram, n->id);
        /* Free deep-copied output tensor data + owned name strings */
        for (size_t j = 0; j < n->n_outputs; j++) {
            if (n->outputs[j].data) free((void *)n->outputs[j].data);
            if (n->outputs[j].name) free((void *)n->outputs[j].name);
        }
        free(n->outputs);
    }
    free(r->nodes);

    /* Destroy VRAM tracker */
    if (r->vram) vram_destroy(r->vram);

    /* Shutdown only: release every cached engine context */
    mcache_flush();

    /* Free registry */
    for (size_t i = 0; i < r->n_registry; i++) {
        free(r->registry[i].type_id);
        free(r->registry[i].so_path);
    }
    free(r->registry);

    free(r);
}
