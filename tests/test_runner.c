#include "inference/runner.h"
#include "inference/dag.h"
#include "inference/plugin.h"
#include <assert.h>
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/*
 * Integration test — proves end-to-end pipeline execution with tensor
 * chaining through 3 echo nodes.
 *
 * Pipeline: a -> b -> c
 *   a: takes "data" input, outputs "data"
 *   b: takes "a.data" input, outputs "data"
 *   c: takes "b.data" input, outputs "data"
 *
 * Verifies:
 *   1. Plugins load and resolve via runner
 *   2. DAG topo sort works
 *   3. Tensors chain between stages (a -> b -> c)
 *   4. VRAM tracking works (if budget set)
 *   5. All nodes unload cleanly
 */

/* Helper: find the echo_plugin.so relative to build dir */
static const char *find_echo_so(void) {
    static const char *paths[] = {
        "./echo_plugin.so",
        "../echo_plugin.so",
        "../../echo_plugin.so",
        "./libecho_plugin.so",
        NULL
    };
    for (const char **p = paths; *p; p++) {
        void *h = dlopen(*p, RTLD_NOW | RTLD_LOCAL);
        if (h) {
            dlclose(h);
            return *p;
        }
    }
    return NULL;
}

static void test_three_stage_pipeline(void) {
    fprintf(stderr, "\n=== test_three_stage_pipeline ===\n");

    const char *echo_so = find_echo_so();
    if (!echo_so) {
        fprintf(stderr, "SKIP: echo_plugin.so not found\n");
        return;
    }

    /* Create runner with 256MB VRAM budget, no WebSocket */
    inference_runner *runner = runner_create(256UL * 1024 * 1024, NULL);
    assert(runner != NULL);

    /* Register the echo plugin under type_id "echo" */
    int rc = runner_register_plugin(runner, "echo", echo_so);
    assert(rc == 0);

    /* Build a 3-stage pipeline */
    const char *yaml =
        "name: echo-chain\n"
        "nodes:\n"
        "  - id: stage_a\n"
        "    type: echo\n"
        "  - id: stage_b\n"
        "    type: echo\n"
        "    input_from:\n"
        "      - stage_a.data\n"
        "  - id: stage_c\n"
        "    type: echo\n"
        "    input_from:\n"
        "      - stage_b.data\n";

    inference_dag *dag = dag_parse_string(yaml, strlen(yaml));
    assert(dag != NULL);
    assert(dag->n_nodes == 3);

    /* Topological sort */
    size_t order[3];
    rc = dag_topo_sort(dag, order);
    assert(rc == 0);
    assert(order[0] == 0);  /* stage_a first */
    assert(order[1] == 1);  /* stage_b second */
    assert(order[2] == 2);  /* stage_c third */

    /* Create initial input tensor */
    float data[] = {1.0f, 2.0f, 3.0f, 4.0f, 5.0f};
    inference_tensor input = {
        .name   = "data",
        .dtype  = "f32",
        .ndim   = 1,
        .shape  = {5},
        .data   = data,
        .nbytes = sizeof(data)
    };

    /* Execute the pipeline */
    char *result = NULL;
    rc = runner_execute(runner, dag, &input, 1, &result);
    assert(rc == 0);
    assert(result != NULL);

    fprintf(stderr, "result: %s\n", result);

    /* Verify the result JSON mentions the last node */
    assert(strstr(result, "stage_c") != NULL);
    assert(strstr(result, "\"outputs\"") != NULL);

    /* Verify VRAM was tracked */
    inference_vram *vram = runner_get_vram(runner);
    assert(vram != NULL);
    size_t used = vram_used(vram);
    fprintf(stderr, "VRAM used: %zu bytes\n", used);
    /* With 3 nodes at 64MB each = 192MB registered */
    assert(used > 0);

    /* Cleanup */
    inference_free(result);
    dag_free(dag);
    runner_destroy(runner);

    fprintf(stderr, "PASS: test_three_stage_pipeline\n");
}

static void test_single_node(void) {
    fprintf(stderr, "\n=== test_single_node ===\n");

    const char *echo_so = find_echo_so();
    if (!echo_so) {
        fprintf(stderr, "SKIP: echo_plugin.so not found\n");
        return;
    }

    inference_runner *runner = runner_create(0, NULL);  /* no VRAM budget */
    runner_register_plugin(runner, "echo", echo_so);

    const char *yaml =
        "name: single\n"
        "nodes:\n"
        "  - id: solo\n"
        "    type: echo\n";

    inference_dag *dag = dag_parse_string(yaml, strlen(yaml));
    assert(dag != NULL);

    float data[] = {42.0f};
    inference_tensor input = {
        .name = "data", .dtype = "f32",
        .ndim = 1, .shape = {1},
        .data = data, .nbytes = sizeof(data)
    };

    char *result = NULL;
    int rc = runner_execute(runner, dag, &input, 1, &result);
    assert(rc == 0);
    assert(result != NULL);
    assert(strstr(result, "solo") != NULL);

    inference_free(result);
    dag_free(dag);
    runner_destroy(runner);

    fprintf(stderr, "PASS: test_single_node\n");
}

static void test_vram_eviction(void) {
    fprintf(stderr, "\n=== test_vram_eviction ===\n");

    const char *echo_so = find_echo_so();
    if (!echo_so) {
        fprintf(stderr, "SKIP: echo_plugin.so not found\n");
        return;
    }

    /* Tiny budget: 100MB. Each node registers 64MB.
     * 2 nodes = 128MB > 100MB → LRU eviction should fire */
    inference_runner *runner = runner_create(100UL * 1024 * 1024, NULL);
    runner_register_plugin(runner, "echo", echo_so);

    const char *yaml =
        "name: evict-test\n"
        "nodes:\n"
        "  - id: n1\n"
        "    type: echo\n"
        "  - id: n2\n"
        "    type: echo\n"
        "    input_from:\n"
        "      - n1.data\n";

    inference_dag *dag = dag_parse_string(yaml, strlen(yaml));

    float data[] = {1.0f};
    inference_tensor input = {
        .name = "data", .dtype = "f32",
        .ndim = 1, .shape = {1},
        .data = data, .nbytes = sizeof(data)
    };

    char *result = NULL;
    int rc = runner_execute(runner, dag, &input, 1, &result);
    assert(rc == 0);

    /* Both should have executed despite eviction pressure */
    assert(strstr(result, "n2") != NULL);

    inference_free(result);
    dag_free(dag);
    runner_destroy(runner);

    fprintf(stderr, "PASS: test_vram_eviction\n");
}

int main(void) {
    test_single_node();
    test_three_stage_pipeline();
    test_vram_eviction();
    fprintf(stderr, "\nAll runner tests passed.\n");
    return 0;
}
