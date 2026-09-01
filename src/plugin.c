#include "inference/plugin.h"
#include "inference/plugin_loader.h"
#include "inference/dynlib.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/*
 * Plugin loader — loads shared libraries (dy_open shim: dlopen on POSIX,
 * LoadLibrary on Windows) and resolves the C-ABI symbols.
 */

struct inference_plugin {
    char       *path;
    void       *handle;
    const char *(*type_id)(void);
    const char *(*version)(void);
    inference_schema (*schema)(void);
    int (*load)(const char *, size_t, inference_context **);
    int (*execute)(inference_context *,
                   const inference_tensor *, size_t,
                   inference_tensor *, size_t);
    void (*unload)(inference_context *);
    int (*stop)(inference_context *);   /* OPTIONAL (audit F3) */
    /* OPTIONAL card compose (PLUGIN ARCHITECTURE LAW, 2026-08-31):
     * lane/card-specific run-graph rewrite, owned by the plugin. */
    int (*card_compose)(const char *, const char *, const char *,
                        char *, size_t, const char *, char *, size_t);
};

inference_plugin *plugin_load(const char *so_path) {
    if (!so_path) return NULL;

    void *h = dy_open(so_path);
    if (!h) {
        fprintf(stderr, "plugin: dy_open(%s): %s\n", so_path, dy_err());
        return NULL;
    }

    inference_plugin *p = calloc(1, sizeof(*p));
    if (!p) { dy_close(h); return NULL; }

    p->handle = h;
    p->path   = strdup(so_path);

#define RESOLVE(name, sym)                                     \
    do {                                                       \
        p->name = (typeof(p->name))dy_sym(h, sym);             \
        if (!p->name) {                                        \
            fprintf(stderr, "plugin: missing symbol %s in %s\n", \
                    sym, so_path);                             \
            dy_close(h); free(p->path); free(p); return NULL;  \
        }                                                      \
    } while (0)

    RESOLVE(type_id,  "node_type_id");
    RESOLVE(version,  "node_version");
    RESOLVE(schema,   "node_schema");
    RESOLVE(load,     "node_load");
    RESOLVE(execute,  "node_execute");
    RESOLVE(unload,   "node_unload");

#undef RESOLVE

    /* OPTIONAL: node_stop (audit F3) — absent in older plugins, never fatal */
    p->stop = (int (*)(inference_context *))dy_sym(h, "node_stop");

    /* OPTIONAL: card_compose (PLUGIN ARCHITECTURE LAW) — absent = the
     * lane has no card semantics; plain runs are unaffected. */
    p->card_compose = (int (*)(const char *, const char *, const char *,
                               char *, size_t, const char *,
                               char *, size_t))dy_sym(h, "card_compose");

    return p;
}

const char *plugin_type_id(const inference_plugin *p)  { return p->type_id(); }
const char *plugin_version(const inference_plugin *p)  { return p->version(); }
const char *plugin_so_path(const inference_plugin *p)   { return p ? p->path : NULL; }
inference_schema plugin_schema(const inference_plugin *p) { return p->schema(); }

int plugin_load_model(const inference_plugin *p,
                      const char *config, size_t len,
                      inference_context **ctx) {
    return p->load(config, len, ctx);
}

int plugin_execute(const inference_plugin *p,
                   inference_context *ctx,
                   const inference_tensor *in, size_t n_in,
                   inference_tensor *out, size_t n_out) {
    return p->execute(ctx, in, n_in, out, n_out);
}

int plugin_stop(const inference_plugin *p, inference_context *ctx) {
    if (p && p->stop && ctx) return p->stop(ctx);
    return 0;   /* plugin predates the hook: stop lands at node boundary */
}

void plugin_unload_model(const inference_plugin *p, inference_context *ctx) {
    if (p->unload) p->unload(ctx);
}

void plugin_unload(inference_plugin *p) {
    if (!p) return;
    if (p->handle) dy_close(p->handle);
    free(p->path);
    free(p);
}

void inference_free(void *ptr) {
    free(ptr);
}

/* Card compose dispatch (PLUGIN ARCHITECTURE LAW): the server NEVER
 * names a lane. It finds the plugin that owns the run's engine type
 * and, if that plugin implements card semantics, hands over the graph. */
int plugin_card_compose(const inference_plugin *p, const char *body,
                        const char *model, const char *run_id,
                        char *yaml, size_t cap,
                        const char *prior_tail, char *extra_json,
                        size_t extra_cap) {
    if (!p || !p->card_compose) return 0;   /* no card semantics: no-op */
    return p->card_compose(body, model, run_id, yaml, cap,
                           prior_tail, extra_json, extra_cap);
}
