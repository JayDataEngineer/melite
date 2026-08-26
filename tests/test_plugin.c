#include "inference/plugin.h"
#include <assert.h>
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/*
 * Plugin test — loads the echo.so shared library and exercises the ABI.
 */

int main(void) {
    void *h = dlopen("./echo_plugin.so", RTLD_NOW | RTLD_LOCAL);
    if (!h) {
        fprintf(stderr, "SKIP: libecho_plugin.so not found (%s)\n", dlerror());
        return 0;
    }

    const char *(*type_id)(void) = dlsym(h, "node_type_id");
    const char *(*version)(void) = dlsym(h, "node_version");
    inference_schema (*schema)(void) = dlsym(h, "node_schema");
    int (*load)(const char *, size_t, inference_context **) = dlsym(h, "node_load");
    int (*execute)(inference_context *,
                   const inference_tensor *, size_t,
                   inference_tensor *, size_t) = dlsym(h, "node_execute");
    void (*unload)(inference_context *) = dlsym(h, "node_unload");

    assert(type_id && version && schema && load && execute && unload);

    assert(strcmp(type_id(), "echo") == 0);
    assert(strcmp(version(), "0.1.0") == 0);

    inference_schema s = schema();
    assert(s.json != NULL);
    assert(s.len > 0);
    fprintf(stderr, "schema: %.*s\n", (int)s.len, s.json);
    free((void *)s.json);

    inference_context *ctx = NULL;
    assert(load(NULL, 0, &ctx) == 0);
    assert(ctx != NULL);

    float data[] = {1.0f, 2.0f, 3.0f};
    inference_tensor input = {
        .name = "data", .dtype = "f32",
        .ndim = 1, .shape = {3},
        .data = data, .nbytes = sizeof(data)
    };
    inference_tensor output = {0};

    assert(execute(ctx, &input, 1, &output, 1) == 0);
    assert(output.data == input.data);  /* zero-copy */

    unload(ctx);

    dlclose(h);
    fprintf(stderr, "PASS: test_plugin\n");
    return 0;
}
