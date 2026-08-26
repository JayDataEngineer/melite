#include "inference/inference.h"
#include "inference/plugin_loader.h"
#include "inference/runner.h"
#include "inference/catalog.h"
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

/*
 * inference.cpp — main entry point.
 *
 * Usage:
 *   inference_cli serve [--port PORT] [--plugin-dir DIR] [--vram MB]
 *   inference_cli run   <pipeline.yaml> [--plugin-dir DIR] [--vram MB]
 *   inference_cli load  <plugin.so>
 */

static void usage(void) {
    fprintf(stderr,
        "inference.cpp v0.1.0\n"
        "\n"
        "Usage:\n"
        "  inference_cli serve [--port PORT] [--plugin-dir DIR] [--vram MB]\n"
        "  inference_cli run   <pipeline.yaml> [--plugin-dir DIR] [--vram MB]\n"
        "                      [--input NAME=FILE] [--input NAME=VALUE]\n"
        "  inference_cli load  <plugin.so>\n"
    );
}

/* Scan a directory for .so files and register them with the runner */
static void register_plugins_from_dir(inference_runner *r, const char *dir) {
    char cmd[1024];
    snprintf(cmd, sizeof(cmd), "ls %s/*.so 2>/dev/null", dir);

    FILE *p = popen(cmd, "r");
    if (!p) return;

    char path[1024];
    while (fgets(path, sizeof(path), p)) {
        /* Strip newline */
        size_t len = strlen(path);
        while (len > 0 && (path[len-1] == '\n' || path[len-1] == '\r'))
            path[--len] = '\0';
        if (len == 0) continue;

        /* Load plugin to get type_id, then register */
        inference_plugin *pl = plugin_load(path);
        if (pl) {
            const char *tid = plugin_type_id(pl);
            fprintf(stderr, "registering plugin: %s -> %s\n", tid, path);
            runner_register_plugin(r, tid, path);
            plugin_unload(pl);
        }
    }
    pclose(p);
}

/* Forward declaration from server.cpp */
extern inference_catalog *g_catalog;

static int cmd_serve(int argc, char **argv) {
    int port = 8080;
    size_t vram_bytes = 0;
    const char *plugin_dir = NULL;
    const char *catalog_dir = NULL;

    for (int i = 2; i < argc; i++) {
        if (strcmp(argv[i], "--port") == 0 && i + 1 < argc)
            port = atoi(argv[++i]);
        else if (strcmp(argv[i], "--plugin-dir") == 0 && i + 1 < argc)
            plugin_dir = argv[++i];
        else if (strcmp(argv[i], "--catalog-dir") == 0 && i + 1 < argc)
            catalog_dir = argv[++i];
        else if (strcmp(argv[i], "--vram") == 0 && i + 1 < argc)
            vram_bytes = (size_t)atol(argv[++i]) * 1024 * 1024;
    }

    inference_runner *runner = runner_create(vram_bytes, NULL);

    /* Auto-discover plugins */
    if (plugin_dir) {
        register_plugins_from_dir(runner, plugin_dir);
    } else {
        /* Default: current directory */
        register_plugins_from_dir(runner, ".");
    }

    g_server_runner = runner;

    /* Scan model catalog */
    char models_path[1024], cards_path[1024], agents_path[1024];
    const char *base = catalog_dir ? catalog_dir : ".";
    snprintf(models_path, sizeof(models_path), "%s/models", base);
    snprintf(cards_path, sizeof(cards_path), "%s/cards", base);
    snprintf(agents_path, sizeof(agents_path), "%s/agents", base);
    g_catalog = catalog_scan(models_path, cards_path, agents_path);
    if (g_catalog) {
        fprintf(stderr, "catalog: %zu models, %zu cards loaded\n",
                g_catalog->n_models, g_catalog->n_cards);
    }

    inference_server *srv = server_create(port);
    if (!srv) {
        fprintf(stderr, "failed to create server\n");
        runner_destroy(runner);
        return 1;
    }

    fprintf(stderr, "Starting server on port %d...\n", port);
    fprintf(stderr, "Press Ctrl+C to stop.\n");
    server_start(srv);  /* blocks */

    server_stop(srv);
    server_destroy(srv);
    g_server_runner = NULL;
    runner_destroy(runner);
    if (g_catalog) { catalog_free(g_catalog); g_catalog = NULL; }
    return 0;
}

static int cmd_run(int argc, char **argv) {
    if (argc < 3) {
        fprintf(stderr, "usage: inference_cli run <pipeline.yaml> "
                "[--plugin-dir DIR] [--vram MB] [--input NAME=FILE]\n");
        return 1;
    }

    const char *yaml_path = argv[2];
    size_t vram_bytes = 0;
    const char *plugin_dir = NULL;

    /* Collect initial inputs: --input name=file or --input name=value */
    inference_tensor initial_inputs[32];
    size_t n_initial = 0;
    float input_bufs[32][1024];  /* raw data buffers for file/string inputs */

    for (int i = 3; i < argc; i++) {
        if (strcmp(argv[i], "--plugin-dir") == 0 && i + 1 < argc)
            plugin_dir = argv[++i];
        else if (strcmp(argv[i], "--vram") == 0 && i + 1 < argc)
            vram_bytes = (size_t)atol(argv[++i]) * 1024 * 1024;
        else if (strcmp(argv[i], "--input") == 0 && i + 1 < argc) {
            const char *spec = argv[++i];
            const char *eq = strchr(spec, '=');
            if (!eq || n_initial >= 32) continue;

            size_t name_len = (size_t)(eq - spec);
            char name[64];
            snprintf(name, sizeof(name), "%.*s", (int)name_len, spec);
            const char *val = eq + 1;

            /* Try to open as file first */
            FILE *f = fopen(val, "rb");
            if (f) {
                fseek(f, 0, SEEK_END);
                long sz = ftell(f);
                fseek(f, 0, SEEK_SET);
                if (sz > (long)sizeof(input_bufs[n_initial]))
                    sz = sizeof(input_bufs[n_initial]);
                size_t nread = fread(input_bufs[n_initial], 1, sz, f);
                fclose(f);

                initial_inputs[n_initial].name   = strdup(name);
                initial_inputs[n_initial].dtype  = "u8";
                initial_inputs[n_initial].ndim   = 1;
                initial_inputs[n_initial].shape[0] = nread;
                initial_inputs[n_initial].data   = input_bufs[n_initial];
                initial_inputs[n_initial].nbytes = nread;
                n_initial++;
                fprintf(stderr, "input '%s': %zu bytes from file\n",
                        name, nread);
            } else {
                /* Treat as inline float value */
                float val_f = (float)atof(val);
                input_bufs[n_initial][0] = val_f;

                initial_inputs[n_initial].name   = strdup(name);
                initial_inputs[n_initial].dtype  = "f32";
                initial_inputs[n_initial].ndim   = 1;
                initial_inputs[n_initial].shape[0] = 1;
                initial_inputs[n_initial].data   = &input_bufs[n_initial][0];
                initial_inputs[n_initial].nbytes = sizeof(float);
                n_initial++;
                fprintf(stderr, "input '%s': %f\n", name, val_f);
            }
        }
    }

    inference_dag *dag = dag_parse_file(yaml_path);
    if (!dag) {
        fprintf(stderr, "failed to parse %s\n", yaml_path);
        return 1;
    }

    fprintf(stderr, "Pipeline: %s (%zu nodes)\n",
            dag->name ? dag->name : "(unnamed)", dag->n_nodes);

    /* Create runner and discover plugins */
    inference_runner *runner = runner_create(vram_bytes, NULL);
    if (plugin_dir) {
        register_plugins_from_dir(runner, plugin_dir);
    } else {
        register_plugins_from_dir(runner, ".");
    }

    /* Execute */
    char *result = NULL;
    int rc = runner_execute(runner, dag, initial_inputs, n_initial, &result);
    dag_free(dag);

    if (rc < 0) {
        fprintf(stderr, "pipeline execution failed\n");
        runner_destroy(runner);
        return 1;
    }

    printf("%s\n", result ? result : "{}");
    inference_free(result);
    runner_destroy(runner);
    return 0;
}

static int cmd_load(int argc, char **argv) {
    if (argc < 3) {
        fprintf(stderr, "usage: inference_cli load <plugin.so>\n");
        return 1;
    }

    inference_plugin *p = plugin_load(argv[2]);
    if (!p) return 1;

    printf("type_id:  %s\n", plugin_type_id(p));
    printf("version:  %s\n", plugin_version(p));

    inference_schema s = plugin_schema(p);
    printf("schema:   %.*s\n", (int)s.len, s.json);
    if (s.json) inference_free((void *)s.json);

    plugin_unload(p);
    return 0;
}

int main(int argc, char **argv) {
    if (argc < 2) { usage(); return 1; }

    if (strcmp(argv[1], "serve") == 0) return cmd_serve(argc, argv);
    if (strcmp(argv[1], "run")   == 0) return cmd_run(argc, argv);
    if (strcmp(argv[1], "load")  == 0) return cmd_load(argc, argv);

    usage();
    return 1;
}
