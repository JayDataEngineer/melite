#include "inference/dag.h"
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/*
 * Minimal YAML DAG parser — handles the subset:
 *
 *   name: my-pipeline
 *   nodes:
 *     - id: encode
 *       type: sd_cpp
 *       model: models/sd-v1-5
 *     - id: generate
 *       type: trellis_cpp
 *       model: models/trellis
 *       input_from:
 *         - encode.image_rgb
 */

static char *strdup_safe(const char *s) {
    return s ? strdup(s) : NULL;
}

static char *strip(char *s) {
    while (*s == ' ' || *s == '\t') s++;
    char *end = s + strlen(s);
    while (end > s && (end[-1] == '\n' || end[-1] == '\r' ||
                       end[-1] == ' '  || end[-1] == '\t'))
        end--;
    *end = '\0';
    return s;
}

/* Extract "key: value" — returns value part (after ": "), or NULL */
static const char *parse_kv(const char *line, const char *key) {
    size_t klen = strlen(key);
    if (strncmp(line, key, klen) != 0) return NULL;
    const char *p = line + klen;
    if (*p != ':') return NULL;
    p++;
    while (*p == ' ') p++;
    return p;
}

inference_dag *dag_parse_string(const char *yaml, size_t len) {
    if (!yaml || len == 0) return NULL;

    inference_dag *dag = calloc(1, sizeof(*dag));
    if (!dag) return NULL;

    /* First pass: count nodes (lines starting with "    - id:") */
    size_t capacity = 8;
    dag->nodes = malloc(capacity * sizeof(dag_node));
    if (!dag->nodes) { free(dag); return NULL; }

    /* Working state for current node being parsed */
    dag_node cur = {0};
    int in_nodes = 0;
    int in_input_from = 0;

    char *buf = malloc(len + 1);
    if (!buf) { free(dag->nodes); free(dag); return NULL; }
    memcpy(buf, yaml, len);
    buf[len] = '\0';

    char *saveptr = NULL;
    char *line = strtok_r(buf, "\n", &saveptr);

    while (line) {
        char *s = strip(line);

        /* Skip empty lines and comments */
        if (*s == '\0' || *s == '#') {
            line = strtok_r(NULL, "\n", &saveptr);
            continue;
        }

        /* Top-level key: name */
        const char *val;
        if ((val = parse_kv(s, "name")) != NULL && !in_nodes) {
            free(dag->name);
            dag->name = strdup(val);
            line = strtok_r(NULL, "\n", &saveptr);
            continue;
        }

        /* Top-level key: nodes */
        if (strcmp(s, "nodes:") == 0) {
            in_nodes = 1;
            line = strtok_r(NULL, "\n", &saveptr);
            continue;
        }

        /* Inside nodes list: new entry */
        if (in_nodes && strncmp(s, "- id:", 5) == 0) {
            /* Save previous node if it has an id */
            if (cur.id) {
                if (dag->n_nodes >= capacity) {
                    capacity *= 2;
                    dag->nodes = realloc(dag->nodes, capacity * sizeof(dag_node));
                }
                dag->nodes[dag->n_nodes++] = cur;
                cur = (dag_node){0};
            }
            const char *id_val = strip((char *)s + 5);
            cur.id = strdup(id_val);
            in_input_from = 0;
            line = strtok_r(NULL, "\n", &saveptr);
            continue;
        }

        /* Inside input_from list */
        if (in_input_from && strncmp(s, "- ", 2) == 0) {
            const char *ref = s + 2;
            cur.n_inputs++;
            cur.input_from = realloc(cur.input_from,
                                     cur.n_inputs * sizeof(char *));
            cur.input_from[cur.n_inputs - 1] = strdup(ref);
            line = strtok_r(NULL, "\n", &saveptr);
            continue;
        }

        /* Node-level keys (order-insensitive: a key line after an
         * input_from list must still parse — the list only consumes
         * "- " item lines, so params/type/model after the list land
         * here and are not skipped) */
        if (cur.id) {
            if ((val = parse_kv(s, "type")) != NULL) {
                free(cur.type);
                cur.type = strdup(val);
                line = strtok_r(NULL, "\n", &saveptr);
                continue;
            }
            if ((val = parse_kv(s, "model")) != NULL) {
                free(cur.model);
                cur.model = strdup(val);
                line = strtok_r(NULL, "\n", &saveptr);
                continue;
            }
            if (strcmp(s, "input_from:") == 0) {
                in_input_from = 1;
                line = strtok_r(NULL, "\n", &saveptr);
                continue;
            }
            if ((val = parse_kv(s, "params")) != NULL) {
                free(cur.params_json);
                cur.params_json = strdup(val);
                line = strtok_r(NULL, "\n", &saveptr);
                continue;
            }
        }

        line = strtok_r(NULL, "\n", &saveptr);
    }

    /* Flush last node */
    if (cur.id) {
        if (dag->n_nodes >= capacity) {
            capacity *= 2;
            dag->nodes = realloc(dag->nodes, capacity * sizeof(dag_node));
        }
        dag->nodes[dag->n_nodes++] = cur;
    }

    free(buf);
    return dag;
}

inference_dag *dag_parse_file(const char *path) {
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;

    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    fseek(f, 0, SEEK_SET);

    if (sz <= 0) { fclose(f); return NULL; }

    char *buf = malloc(sz);
    if (!buf) { fclose(f); return NULL; }
    fread(buf, 1, sz, f);
    fclose(f);

    inference_dag *dag = dag_parse_string(buf, sz);
    free(buf);
    return dag;
}

/* Simple DFS-based topological sort (pre-order) */
static int dfs(const inference_dag *dag, size_t node_idx,
               uint8_t *visited, uint8_t *on_stack,
               size_t *order, size_t *pos) {
    if (on_stack[node_idx]) return -1;  /* cycle */
    if (visited[node_idx]) return 0;
    visited[node_idx] = 1;
    on_stack[node_idx] = 1;

    order[(*pos)++] = node_idx;

    const dag_node *n = &dag->nodes[node_idx];
    for (size_t i = 0; i < n->n_inputs; i++) {
        /* Parse "node_id.output_name" to find the source node */
        const char *ref = n->input_from[i];
        const char *dot = strchr(ref, '.');
        size_t ref_len = dot ? (size_t)(dot - ref) : strlen(ref);

        for (size_t j = 0; j < dag->n_nodes; j++) {
            if (strlen(dag->nodes[j].id) == ref_len &&
                strncmp(dag->nodes[j].id, ref, ref_len) == 0) {
                if (dfs(dag, j, visited, on_stack, order, pos) < 0)
                    return -1;
                break;
            }
        }
    }

    on_stack[node_idx] = 0;
    return 0;
}

int dag_topo_sort(const inference_dag *dag, size_t *out_order) {
    if (!dag || !out_order) return -1;

    size_t n = dag->n_nodes;
    uint8_t *visited = calloc(n, 1);
    uint8_t *on_stack = calloc(n, 1);
    if (!visited || !on_stack) { free(visited); free(on_stack); return -1; }

    size_t pos = 0;
    for (size_t i = 0; i < n; i++) {
        if (!visited[i]) {
            if (dfs(dag, i, visited, on_stack, out_order, &pos) < 0) {
                free(visited); free(on_stack);
                return -1;  /* cycle detected */
            }
        }
    }

    free(visited);
    free(on_stack);
    return 0;
}

void dag_free(inference_dag *dag) {
    if (!dag) return;
    for (size_t i = 0; i < dag->n_nodes; i++) {
        free(dag->nodes[i].id);
        free(dag->nodes[i].type);
        free(dag->nodes[i].model);
        free(dag->nodes[i].params_json);
        for (size_t j = 0; j < dag->nodes[i].n_inputs; j++)
            free(dag->nodes[i].input_from[j]);
        free(dag->nodes[i].input_from);
    }
    free(dag->nodes);
    free(dag->name);
    free(dag);
}
