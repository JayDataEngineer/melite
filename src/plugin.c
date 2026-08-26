#include "inference/plugin.h"
#include "inference/plugin_loader.h"
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/*
 * Plugin loader — dlopen's shared libraries and resolves the C-ABI symbols.
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
};

inference_plugin *plugin_load(const char *so_path) {
    if (!so_path) return NULL;

    void *h = dlopen(so_path, RTLD_NOW | RTLD_LOCAL);
    if (!h) {
        fprintf(stderr, "plugin: dlopen(%s): %s\n", so_path, dlerror());
        return NULL;
    }

    inference_plugin *p = calloc(1, sizeof(*p));
    if (!p) { dlclose(h); return NULL; }

    p->handle = h;
    p->path   = strdup(so_path);

#define RESOLVE(name, sym)                                     \
    do {                                                       \
        p->name = (typeof(p->name))dlsym(h, sym);             \
        if (!p->name) {                                        \
            fprintf(stderr, "plugin: missing symbol %s in %s\n", \
                    sym, so_path);                             \
            dlclose(h); free(p->path); free(p); return NULL;  \
        }                                                      \
    } while (0)

    RESOLVE(type_id,  "node_type_id");
    RESOLVE(version,  "node_version");
    RESOLVE(schema,   "node_schema");
    RESOLVE(load,     "node_load");
    RESOLVE(execute,  "node_execute");
    RESOLVE(unload,   "node_unload");

#undef RESOLVE

    return p;
}

const char *plugin_type_id(const inference_plugin *p)  { return p->type_id(); }
const char *plugin_version(const inference_plugin *p)  { return p->version(); }
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

void plugin_unload_model(const inference_plugin *p, inference_context *ctx) {
    if (p->unload) p->unload(ctx);
}

void plugin_unload(inference_plugin *p) {
    if (!p) return;
    if (p->handle) dlclose(p->handle);
    free(p->path);
    free(p);
}

void inference_free(void *ptr) {
    free(ptr);
}
