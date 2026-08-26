#ifndef INFERENCE_DAG_H
#define INFERENCE_DAG_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/*
 * Declarative pipeline DAG — parsed from YAML, executed sequentially
 * (Phase 0) or async with CUDA events (Phase 2).
 */

typedef struct inference_dag inference_dag;

/* A single node in the pipeline */
typedef struct dag_node {
    char *id;           /* unique node name, e.g. "encode_image" */
    char *type;         /* engine type id, e.g. "sd_cpp", "llama_cpp" */
    char *model;        /* model path or identifier */
    char *params_json;  /* engine-specific params as JSON string */
    char **input_from;  /* array of "node_id.output_name" strings */
    size_t n_inputs;
} dag_node;

/* The parsed DAG */
struct inference_dag {
    dag_node *nodes;
    size_t    n_nodes;
    char     *name;     /* pipeline name from YAML */
};

/* Parse a YAML file into a DAG. Returns NULL on error. */
inference_dag *dag_parse_file(const char *path);

/* Parse a YAML string into a DAG. Returns NULL on error. */
inference_dag *dag_parse_string(const char *yaml, size_t len);

/* Topological sort — returns sorted node indices (0..n_nodes-1).
   Returns -1 if the graph has cycles. */
int dag_topo_sort(const inference_dag *dag, size_t *out_order);

/* Free a DAG */
void dag_free(inference_dag *dag);

#ifdef __cplusplus
}
#endif

#endif /* INFERENCE_DAG_H */
