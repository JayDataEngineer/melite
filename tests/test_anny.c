#include "inference/plugin.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <dlfcn.h>

/*
 * ANNY plugin smoke test.
 * Loads the anny_plugin.so, calls the ABI functions, validates basic behavior.
 */

typedef const char *(*type_id_fn)(void);
typedef const char *(*version_fn)(void);
typedef inference_schema (*schema_fn)(void);
typedef int (*load_fn)(const char *, size_t, inference_context **);
typedef int (*exec_fn)(inference_context *,
                       const inference_tensor *, size_t,
                       inference_tensor *, size_t);
typedef void (*unload_fn)(inference_context *);

static void test_plugin_abi(void) {
    void *handle = dlopen("./libanny_plugin.so", RTLD_LAZY);
    if (!handle) {
        fprintf(stderr, "test_anny: dlopen failed: %s\n", dlerror());
        fprintf(stderr, "test_anny: SKIPPED (plugin not built)\n");
        return;
    }

    type_id_fn type_id = (type_id_fn)dlsym(handle, "node_type_id");
    version_fn version = (version_fn)dlsym(handle, "node_version");
    schema_fn schema   = (schema_fn)dlsym(handle, "node_schema");
    load_fn load       = (load_fn)dlsym(handle, "node_load");
    exec_fn exec       = (exec_fn)dlsym(handle, "node_execute");
    unload_fn unload   = (unload_fn)dlsym(handle, "node_unload");

    assert(type_id && "node_type_id not found");
    assert(version && "node_version not found");
    assert(schema && "node_schema not found");
    assert(load && "node_load not found");
    assert(exec && "node_execute not found");
    assert(unload && "node_unload not found");

    /* 1. Identity */
    const char *tid = type_id();
    const char *ver = version();
    printf("type_id: %s\n", tid);
    printf("version: %s\n", ver);
    assert(strcmp(tid, "anny") == 0);

    /* 2. Schema */
    inference_schema s = schema();
    assert(s.json && s.len > 0);
    printf("schema: %.*s\n", (int)s.len, s.json);
    assert(strstr(s.json, "sliders") && "schema should mention 'sliders' input");
    assert(strstr(s.json, "vertices") && "schema should mention 'vertices' output");
    inference_free((void *)s.json);

    /* 3. Load (without basis file — should still succeed, just warn) */
    inference_context *ctx = NULL;
    const char *config = "{}";
    int rc = load(config, strlen(config), &ctx);
    printf("load (no basis): rc=%d\n", rc);
    /* Loading without basis_file should succeed (warns but doesn't fail) */
    assert(rc == 0);
    assert(ctx != NULL);

    /* 4. Execute without loaded basis should fail gracefully */
    inference_tensor inputs[1];
    inference_tensor outputs[2];
    memset(inputs, 0, sizeof(inputs));
    memset(outputs, 0, sizeof(outputs));

    inputs[0].name = "sliders";
    inputs[0].dtype = "string";
    inputs[0].data = (void *)"{\"height\": 0.5}";
    inputs[0].nbytes = strlen((const char *)inputs[0].data) + 1;

    rc = exec(ctx, inputs, 1, outputs, 2);
    printf("execute (no basis): rc=%d (expected -1)\n", rc);
    assert(rc == -1 && "should fail when basis not loaded");

    /* 5. Unload */
    unload(ctx);
    printf("unload: OK\n");

    dlclose(handle);
    printf("\n=== ALL ANNY TESTS PASSED ===\n");
}

int main(void) {
    test_plugin_abi();
    return 0;
}
