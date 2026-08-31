#include "inference/plugin.h"
#include "inference/plugin_loader.h"
#include <assert.h>
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/*
 * Plugin test — loads the echo.so shared library and exercises the ABI.
 * Also tests plugin_load() failure paths.
 */

/* ---- Failure path tests for plugin_load() ---- */

static void test_plugin_load_null_path(void) {
    inference_plugin *p = plugin_load(NULL);
    assert(p == NULL);
    fprintf(stderr, "PASS: plugin_load(NULL) returns NULL\n");
}

static void test_plugin_load_nonexistent(void) {
    inference_plugin *p = plugin_load("./nonexistent_plugin_xyz.so");
    assert(p == NULL);
    fprintf(stderr, "PASS: plugin_load(nonexistent) returns NULL\n");
}

/* ---- Happy-path test using echo_plugin.so ---- */

int main(void) {
    /* Test failure paths first (no .so needed) */
    test_plugin_load_null_path();
    test_plugin_load_nonexistent();

    /* Happy path: load echo via the proper plugin_load() API */
    void *h = dlopen("./echo_plugin.so", RTLD_NOW | RTLD_LOCAL);
    if (!h) {
        fprintf(stderr, "SKIP: echo_plugin.so not found (%s)\n", dlerror());
        return 0;
    }
    dlclose(h);  /* close raw handle; plugin_load will reopen */

    inference_plugin *p = plugin_load("./echo_plugin.so");
    if (!p) {
        fprintf(stderr, "FAIL: plugin_load(./echo_plugin.so) returned NULL\n");
        return 1;
    }

    assert(strcmp(plugin_type_id(p), "echo") == 0);
    assert(strcmp(plugin_version(p), "0.1.0") == 0);

    inference_schema s = plugin_schema(p);
    assert(s.json != NULL);
    assert(s.len > 0);
    fprintf(stderr, "schema: %.*s\n", (int)s.len, s.json);
    inference_free((void *)s.json);

    inference_context *ctx = NULL;
    assert(plugin_load_model(p, NULL, 0, &ctx) == 0);
    assert(ctx != NULL);

    float data[] = {1.0f, 2.0f, 3.0f};
    inference_tensor input = {
        .name = "data", .dtype = "f32",
        .ndim = 1, .shape = {3},
        .data = data, .nbytes = sizeof(data)
    };
    inference_tensor output = {0};

    assert(plugin_execute(p, ctx, &input, 1, &output, 1) == 0);
    assert(output.data == input.data);  /* zero-copy */

    plugin_unload_model(p, ctx);
    plugin_unload(p);

    fprintf(stderr, "PASS: test_plugin\n");
    return 0;
}
