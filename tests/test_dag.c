#include "inference/dag.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>

static void test_parse_simple(void) {
    const char *yaml =
        "name: test-pipeline\n"
        "nodes:\n"
        "  - id: encode\n"
        "    type: sd_cpp\n"
        "    model: models/sd-v1-5\n"
        "  - id: generate\n"
        "    type: trellis_cpp\n"
        "    model: models/trellis\n"
        "    input_from:\n"
        "      - encode.image_rgb\n";

    inference_dag *dag = dag_parse_string(yaml, strlen(yaml));
    assert(dag != NULL);
    assert(dag->n_nodes == 2);
    assert(strcmp(dag->name, "test-pipeline") == 0);

    assert(strcmp(dag->nodes[0].id, "encode") == 0);
    assert(strcmp(dag->nodes[0].type, "sd_cpp") == 0);
    assert(strcmp(dag->nodes[0].model, "models/sd-v1-5") == 0);
    assert(dag->nodes[0].n_inputs == 0);

    assert(strcmp(dag->nodes[1].id, "generate") == 0);
    assert(strcmp(dag->nodes[1].type, "trellis_cpp") == 0);
    assert(dag->nodes[1].n_inputs == 1);
    assert(strcmp(dag->nodes[1].input_from[0], "encode.image_rgb") == 0);

    dag_free(dag);
    fprintf(stderr, "PASS: test_parse_simple\n");
}

static void test_topo_sort(void) {
    const char *yaml =
        "name: chain\n"
        "nodes:\n"
        "  - id: a\n"
        "    type: echo\n"
        "  - id: b\n"
        "    type: echo\n"
        "    input_from:\n"
        "      - a.out\n"
        "  - id: c\n"
        "    type: echo\n"
        "    input_from:\n"
        "      - b.out\n";

    inference_dag *dag = dag_parse_string(yaml, strlen(yaml));
    assert(dag != NULL);
    assert(dag->n_nodes == 3);

    size_t order[3];
    assert(dag_topo_sort(dag, order) == 0);

    /* a must come before b, b before c */
    assert(order[0] == 0);  /* a */
    assert(order[1] == 1);  /* b */
    assert(order[2] == 2);  /* c */

    dag_free(dag);
    fprintf(stderr, "PASS: test_topo_sort\n");
}

static void test_cycle_detection(void) {
    const char *yaml =
        "name: cyclic\n"
        "nodes:\n"
        "  - id: a\n"
        "    type: echo\n"
        "    input_from:\n"
        "      - b.out\n"
        "  - id: b\n"
        "    type: echo\n"
        "    input_from:\n"
        "      - a.out\n";

    inference_dag *dag = dag_parse_string(yaml, strlen(yaml));
    assert(dag != NULL);

    size_t order[2];
    assert(dag_topo_sort(dag, order) == -1);  /* cycle */

    dag_free(dag);
    fprintf(stderr, "PASS: test_cycle_detection\n");
}

int main(void) {
    test_parse_simple();
    test_topo_sort();
    test_cycle_detection();
    fprintf(stderr, "All DAG tests passed.\n");
    return 0;
}
