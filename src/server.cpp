#include "inference/server.h"
#include "inference/runner.h"
#include "inference/dag.h"
#include "inference/catalog.h"
#include "inference/download.h"
#include "inference/ws_server.h"
#include "httplib.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include <time.h>
#include <sys/stat.h>

/* C helpers (local impl — plugin_helpers.h is C-only, static inline) */
static int inf_json_string(const char *json, const char *key, char *out, size_t cap) {
    char pat[128];
    snprintf(pat, sizeof(pat), "\"%s\"", key);
    const char *p = strstr(json, pat);
    if (!p) return -1;
    p += strlen(pat);
    while (*p == ' ' || *p == '\t') p++;
    if (*p != ':') return -1;
    p++;
    while (*p == ' ' || *p == '\t') p++;
    if (*p != '"') return -1;
    p++;
    size_t i = 0;
    while (*p && *p != '"' && i < cap - 1) {
        if (*p == '\\' && p[1]) { p++; if (i < cap - 1) out[i++] = *p++; continue; }
        out[i++] = *p++;
    }
    out[i] = 0;
    return 0;
}
static int inf_json_int(const char *json, const char *key, int fallback) {
    char pat[128];
    snprintf(pat, sizeof(pat), "\"%s\"", key);
    const char *p = strstr(json, pat);
    if (!p) return fallback;
    p += strlen(pat);
    while (*p == ' ' || *p == '\t') p++;
    if (*p != ':') return fallback;
    p++;
    while (*p == ' ' || *p == '\t') p++;
    return (int)strtol(p, NULL, 10);
}

/*
 * inference.cpp — unified HTTP server.
 *
 * Endpoints:
 *   --- Custom ---
 *   GET  /v1/health                — health check
 *   GET  /v1/models                — list loaded engines
 *   POST /v1/pipelines             — execute DAG YAML
 *   GET  /v1/model-catalog         — full catalog (models + cards)
 *   GET  /v1/model/:id             — single model
 *   GET  /v1/agent-manifest        — agent bundles
 *   POST /v1/models/download       — download a model
 *   POST /v1/models/download-all   — download all catalog models
 *   GET  /openapi.json             — OpenAPI 3.1 spec
 *
 *   --- OpenAI-compatible ---
 *   GET  /v1/models                — list models (OpenAI format)
 *   POST /v1/chat/completions      — chat completions (wraps pipeline)
 *   POST /v1/embeddings            — embeddings (wraps pipeline)
 *
 *   --- MCP (Model Context Protocol) ---
 *   GET  /mcp/sse                  — SSE stream for MCP
 *   POST /mcp/messages             — MCP message handler
 *
 *   --- SSE ---
 *   GET  /v1/events                — SSE stream for progress/events
 *
 *   --- WebSocket ---
 *   ws://host:PORT+1/ws            — ComfyUI-compatible progress
 */

inference_runner *g_server_runner = NULL;
inference_catalog *g_catalog = NULL;
inference_ws *g_ws_server = NULL;
download_config *g_download_cfg = NULL;
static pthread_t g_ws_thread;

struct inference_server {
    httplib::Server srv;
    int port;
    int ws_port;
    volatile int running;
};

/* ---- Helpers ---- */

static std::string json_escape(const char *s) {
    if (!s) return "null";
    std::string out;
    out += '"';
    for (; *s; s++) {
        switch (*s) {
        case '"':  out += "\\\""; break;
        case '\\': out += "\\\\"; break;
        case '\n': out += "\\n"; break;
        case '\r': out += "\\r"; break;
        case '\t': out += "\\t"; break;
        default:   out += *s; break;
        }
    }
    out += '"';
    return out;
}

/* ---- WebSocket thread ---- */

static void *ws_thread_fn(void *arg) {
    int port = *(int *)arg;
    g_ws_server = ws_create(port);
    ws_start(g_ws_server);
    return NULL;
}

/* ==================================================================
 * CUSTOM ENDPOINTS
 * ================================================================== */

static void handle_health(const httplib::Request &req,
                          httplib::Response &res) {
    (void)req;
    res.set_content("{\"status\":\"ok\",\"version\":\"0.1.0\"}",
                    "application/json");
}

static void handle_models(const httplib::Request &req,
                          httplib::Response &res) {
    (void)req;
    /* Return both our custom format and enough for OpenAI compatibility */
    res.set_content("{\"object\":\"list\",\"data\":[]}", "application/json");
}

/* ---- DSH serving surface: run registry + async run door + drafts ----
 * Wire contract mirrors the ray gateway the DSH melite lane speaks:
 *   POST /v1/pipelines/start   {"model":"krea-2","prompt":...,"seed":...} -> {"run_id"}
 *   GET  /v1/pipelines/status/{run_id}  -> {status, artifacts:[{name,path,bytes}]}
 *   POST /v1/pipelines/drafts  {intent, stages:[...]} -> {draftId, stages}
 * Execution happens on detached pthreads against the same runner/engines.
 */

#define RUNREG_MAX 64
#define RUN_ARTIFACTS_MAX 16

typedef struct {
    char run_id[48];
    char state[16];          /* queued|running|success|error */
    char error[256];
    char out_dir[512];
    char yaml[2048];         /* the pipeline YAML this run executes */
    time_t created;
} run_entry;

static run_entry g_runs[RUNREG_MAX];
static size_t g_n_runs = 0;
static pthread_mutex_t g_runs_mu = PTHREAD_MUTEX_INITIALIZER;

static void run_set_state(size_t idx, const char *state, const char *err) {
    pthread_mutex_lock(&g_runs_mu);
    snprintf(g_runs[idx].state, sizeof(g_runs[idx].state), "%s", state);
    if (err) snprintf(g_runs[idx].error, sizeof(g_runs[idx].error), "%s", err);
    pthread_mutex_unlock(&g_runs_mu);
}

/* scan out_dir for artifacts -> JSON array string (caller frees) */
static char *run_artifacts_json(const char *out_dir) {
    char cmd[1024];
    snprintf(cmd, sizeof(cmd), "ls -1 '%s' 2>/dev/null", out_dir);
    FILE *fp = popen(cmd, "r");
    if (!fp) return strdup("[]");
    size_t cap = 4096, len = 0;
    char *buf = (char *)malloc(cap);
    len += (size_t)snprintf(buf + len, cap - len, "[");
    char line[512];
    int first = 1;
    while (fgets(line, sizeof(line), fp)) {
        size_t ll = strlen(line);
        while (ll && (line[ll-1] == '\n' || line[ll-1] == '\r')) line[--ll] = 0;
        if (!ll) continue;
        char path[1024], szcmd[1200];
        snprintf(path, sizeof(path), "%s/%s", out_dir, line);
        snprintf(szcmd, sizeof(szcmd), "stat -c %%s '%s' 2>/dev/null", path);
        FILE *sf = popen(szcmd, "r");
        long bytes = -1;
        if (sf) { if (fscanf(sf, "%ld", &bytes) != 1) bytes = -1; pclose(sf); }
        while (len + 600 > cap) { cap *= 2; buf = (char *)realloc(buf, cap); }
        if (!first) len += (size_t)snprintf(buf + len, cap - len, ",");
        first = 0;
        len += (size_t)snprintf(buf + len, cap - len,
            "{\"name\":\"%s\",\"path\":\"%s\",\"bytes\":%ld}", line, path, bytes);
    }
    pclose(fp);
    snprintf(buf + len, cap - len, "]");
    return buf;
}

/* thread body: execute the run's pipeline YAML */
typedef struct { size_t idx; } run_thread_arg;

static void *run_thread_fn(void *argp) {
    run_thread_arg a = *(run_thread_arg *)argp;
    free(argp);
    size_t idx = a.idx;

    run_set_state(idx, "running", NULL);
    inference_dag *dag = dag_parse_string(g_runs[idx].yaml, strlen(g_runs[idx].yaml));
    if (!dag) {
        run_set_state(idx, "error", "dag parse failed");
        return NULL;
    }
    char *result = NULL;
    int rc = runner_execute(g_server_runner, dag, NULL, 0, &result);
    dag_free(dag);
    if (rc < 0) {
        run_set_state(idx, "error", "pipeline execution failed");
        inference_free(result);
        return NULL;
    }
    inference_free(result);
    run_set_state(idx, "success", NULL);
    return NULL;
}

/* JSON-escape src into a malloc'd C string literal (with quotes) */
static char *json_quote(const char *src) {
    size_t n = strlen(src);
    char *out = (char *)malloc(2 * n + 3);
    size_t o = 0;
    out[o++] = '"';
    for (size_t i = 0; i < n; i++) {
        unsigned char c = (unsigned char)src[i];
        if (c == '"' || c == '\\') { out[o++] = '\\'; out[o++] = (char)c; }
        else if (c == '\n') { out[o++] = '\\'; out[o++] = 'n'; }
        else if (c == '\r') { out[o++] = '\\'; out[o++] = 'r'; }
        else if (c == '\t') { out[o++] = '\\'; out[o++] = 't'; }
        else if (c >= 0x20) out[o++] = (char)c;
    }
    out[o++] = '"';
    out[o] = 0;
    return out;
}

static void handle_pipelines_start(const httplib::Request &req,
                                   httplib::Response &res) {
    /* flat generation body: {"model":..., "prompt":..., "seed":..., "workflow_file"?...} */
    char model[64] = "krea-2", prompt[2048] = "", wf[512] = "";
    long seed = -1;

    {
        const char *m = strstr(req.body.c_str(), "\"model\"");
        const char *p = strstr(req.body.c_str(), "\"prompt\"");
        const char *s = strstr(req.body.c_str(), "\"seed\"");
        const char *w = strstr(req.body.c_str(), "\"workflow_file\"");
        char tmp[2048];
        if (m && inf_json_string(req.body.c_str(), "model", tmp, sizeof(tmp)) == 0)
            snprintf(model, sizeof(model), "%s", tmp);
        if (p && inf_json_string(req.body.c_str(), "prompt", tmp, sizeof(tmp)) == 0)
            snprintf(prompt, sizeof(prompt), "%s", tmp);
        if (w && inf_json_string(req.body.c_str(), "workflow_file", tmp, sizeof(tmp)) == 0)
            snprintf(wf, sizeof(wf), "%s", tmp);
        if (s) seed = inf_json_int(req.body.c_str(), "seed", -1);
    }
    if (!prompt[0]) {
        res.status = 400;
        res.set_content("{\"error\":\"missing prompt\"}", "application/json");
        return;
    }
    if (!wf[0])
        snprintf(wf, sizeof(wf), "../plugins/gens/pipelines/krea-txt2img/workflow.json");

    /* register the run */
    pthread_mutex_lock(&g_runs_mu);
    if (g_n_runs >= RUNREG_MAX) {
        /* recycle: compact finished entries */
        size_t w2 = 0;
        for (size_t i = 0; i < g_n_runs; i++)
            if (strcmp(g_runs[i].state, "success") != 0 && strcmp(g_runs[i].state, "error") != 0)
                g_runs[w2++] = g_runs[i];
        g_n_runs = w2;
        if (g_n_runs >= RUNREG_MAX) {
            pthread_mutex_unlock(&g_runs_mu);
            res.status = 503;
            res.set_content("{\"error\":\"run registry full\"}", "application/json");
            return;
        }
    }
    size_t idx = g_n_runs++;
    snprintf(g_runs[idx].run_id, sizeof(g_runs[idx].run_id), "run-%lx-%lx",
             (unsigned long)time(NULL), (unsigned long)pthread_self());
    snprintf(g_runs[idx].state, sizeof(g_runs[idx].state), "queued");
    g_runs[idx].error[0] = 0;
    snprintf(g_runs[idx].out_dir, sizeof(g_runs[idx].out_dir), "./output/%s",
             g_runs[idx].run_id);
    g_runs[idx].created = time(NULL);
    pthread_mutex_unlock(&g_runs_mu);

    /* compose the pipeline YAML with baked inject literals */
    char *qp = json_quote(prompt);
    char seedclause[160] = "";
    if (seed >= 0)
        snprintf(seedclause, sizeof(seedclause), ",\"KSampler.0.seed\":%ld", seed);
    snprintf(g_runs[idx].yaml, sizeof(g_runs[idx].yaml),
        "name: %s\n"
        "description: \"server-generated run\"\n"
        "nodes:\n"
        "  - id: generate\n"
        "    type: comfyui\n"
        "    params: {\"server_url\":\"http://127.0.0.1:18465\",\"workflow_file\":\"%s\",\"out_dir\":\"%s\",\"timeout_s\":300,\"inject\":{\"CLIPTextEncode.0.text\":%s%s}}\n",
        g_runs[idx].run_id, wf, g_runs[idx].out_dir, qp, seedclause);
    free(qp);

    run_thread_arg *ta = (run_thread_arg *)malloc(sizeof(*ta));
    ta->idx = idx;
    pthread_t th;
    pthread_create(&th, NULL, run_thread_fn, ta);
    pthread_detach(th);

    char out[256];
    snprintf(out, sizeof(out), "{\"run_id\":\"%s\",\"status\":\"queued\"}",
             g_runs[idx].run_id);
    res.status = 202;
    res.set_content(out, "application/json");
}

static void handle_pipelines_status(const httplib::Request &req,
                                    httplib::Response &res) {
    std::string rid = req.path_params.at("run_id");
    pthread_mutex_lock(&g_runs_mu);
    int found = -1;
    for (size_t i = 0; i < g_n_runs; i++)
        if (rid == g_runs[i].run_id) { found = (int)i; break; }
    if (found < 0) {
        pthread_mutex_unlock(&g_runs_mu);
        res.status = 404;
        res.set_content("{\"error\":\"unknown run_id\"}", "application/json");
        return;
    }
    char outdir[512], state[16], err[256], yamlhead[80];
    snprintf(outdir, sizeof(outdir), "%s", g_runs[found].out_dir);
    snprintf(state, sizeof(state), "%s", g_runs[found].state);
    snprintf(err, sizeof(err), "%s", g_runs[found].error);
    snprintf(yamlhead, sizeof(yamlhead), "%.60s", g_runs[found].run_id);
    pthread_mutex_unlock(&g_runs_mu);

    char *arts = run_artifacts_json(outdir);
    size_t cap = strlen(arts) + 700;
    char *out = (char *)malloc(cap);
    snprintf(out, cap,
        "{\"run_id\":\"%s\",\"status\":\"%s\",\"artifacts\":%s,\"error\":\"%s\"}",
        yamlhead, state, arts, err);
    res.set_content(out, "application/json");
    free(arts);
    free(out);
}

static void handle_pipelines_drafts(const httplib::Request &req,
                                    httplib::Response &res) {
    /* DSH build_pipeline contract: {intent, stages:[...]} -> {draftId, stages} */
    if (req.body.empty()) {
        res.status = 400;
        res.set_content("{\"error\":\"empty body\"}", "application/json");
        return;
    }
    mkdir("./drafts", 0755);
    char id[64];
    snprintf(id, sizeof(id), "draft-%lx-%lx",
             (unsigned long)time(NULL), (unsigned long)pthread_self());
    char path[256];
    snprintf(path, sizeof(path), "./drafts/%s.json", id);
    FILE *f = fopen(path, "w");
    if (!f) {
        res.status = 500;
        res.set_content("{\"error\":\"cannot persist draft\"}", "application/json");
        return;
    }
    fwrite(req.body.c_str(), 1, req.body.size(), f);
    fclose(f);

    /* echo the stages array back verbatim from the request */
    const char *sp = strstr(req.body.c_str(), "\"stages\"");
    char stages[8192] = "[]";
    if (sp) {
        const char *c = sp;
        while (*c && *c != '[') c++;
        if (*c == '[') {
            const char *e = c + 1;
            int depth = 1;
            while (*e && depth > 0) {
                if (*e == '[') depth++;
                else if (*e == ']') depth--;
                e++;
            }
            size_t n = (size_t)(e - c);
            if (n >= sizeof(stages)) n = sizeof(stages) - 1;
            memcpy(stages, c, n);
            stages[n] = 0;
        }
    }
    char out[9000];
    snprintf(out, sizeof(out), "{\"draftId\":\"%s\",\"stages\":%s}", id, stages);
    res.set_content(out, "application/json");
}

static void handle_pipelines(const httplib::Request &req,
                             httplib::Response &res) {
    const std::string &body = req.body;
    if (body.empty()) {
        res.status = 400;
        res.set_content("{\"error\":\"empty body\"}", "application/json");
        return;
    }

    inference_dag *dag = dag_parse_string(body.c_str(), body.size());
    if (!dag) {
        res.status = 400;
        res.set_content("{\"error\":\"invalid YAML\"}", "application/json");
        return;
    }

    if (!g_server_runner) {
        res.status = 500;
        res.set_content("{\"error\":\"no runner configured\"}",
                        "application/json");
        dag_free(dag);
        return;
    }

    char *result = NULL;
    int rc = runner_execute(g_server_runner, dag, NULL, 0, &result);
    dag_free(dag);

    if (rc < 0) {
        res.status = 500;
        res.set_content("{\"error\":\"pipeline execution failed\"}",
                        "application/json");
        return;
    }

    res.set_content(result ? result : "{\"error\":\"no output\"}",
                    "application/json");
    inference_free(result);
}

static void handle_catalog(const httplib::Request &req,
                           httplib::Response &res) {
    (void)req;
    if (!g_catalog) {
        res.set_content("{\"models\":[],\"cards\":[]}", "application/json");
        return;
    }
    char *json = catalog_to_json(g_catalog);
    res.set_content(json, "application/json");
    free(json);
}

static void handle_catalog_model(const httplib::Request &req,
                                 httplib::Response &res) {
    if (!g_catalog) {
        res.status = 404;
        res.set_content("{\"error\":\"no catalog loaded\"}", "application/json");
        return;
    }
    std::string id = req.path_params.at("id");
    const catalog_model *m = catalog_find_model(g_catalog, id.c_str());
    if (!m) {
        res.status = 404;
        res.set_content("{\"error\":\"model not found\"}", "application/json");
        return;
    }
    char *json = catalog_model_to_json(m);
    res.set_content(json, "application/json");
    free(json);
}

static void handle_agent_manifest(const httplib::Request &req,
                                  httplib::Response &res) {
    (void)req;
    if (!g_catalog) {
        res.set_content("{\"agents\":[]}", "application/json");
        return;
    }

    size_t cap = g_catalog->n_models * 512 + 64;
    char *json = (char *)malloc(cap);
    int off = snprintf(json, cap, "{\"agents\":[");

    int first = 1;
    for (size_t i = 0; i < g_catalog->n_models; i++) {
        const catalog_model *m = &g_catalog->models[i];
        if (!m->agent_md_path) continue;

        if (!first) json[off++] = ',';
        first = 0;

        off += snprintf(json + off, cap - off,
            "{\"id\":\"%s\",\"label\":\"%s\",\"genre\":\"%s\"}",
            m->id ? m->id : "",
            m->label ? m->label : "",
            m->genre ? m->genre : "");
    }

    off += snprintf(json + off, cap - off, "]}");
    res.set_content(json, "application/json");
    free(json);
}

/* ---- Download endpoints ---- */

struct download_ws_progress {
    const char *prompt_id;
};

static void download_progress_ws(void *user_data, const char *filename,
                                 size_t downloaded, size_t total) {
    download_ws_progress *ctx = (download_ws_progress *)user_data;
    if (g_ws_server && ctx) {
        char msg[512];
        int pct = total > 0 ? (int)(downloaded * 100 / total) : 0;
        snprintf(msg, sizeof(msg),
            "{\"type\":\"progress_state\","
            "\"data\":{\"prompt_id\":\"%s\","
            "\"nodes\":{\"download\":{\"value\":%d,\"max\":100,\"state\":\"%s\"}}}}",
            ctx->prompt_id, pct, "running");
        ws_broadcast_text(g_ws_server, msg, strlen(msg));
    }
    fprintf(stderr, "[download] %s: %zu / %zu (%d%%)\n",
            filename, downloaded, total,
            total > 0 ? (int)(downloaded * 100 / total) : 0);
}

static void handle_download(const httplib::Request &req,
                            httplib::Response &res) {
    if (!g_download_cfg)
        g_download_cfg = download_config_create(NULL);

    const std::string &body = req.body;
    if (body.empty()) {
        res.status = 400;
        res.set_content("{\"error\":\"empty body\"}", "application/json");
        return;
    }

    /* Simple JSON field extraction */
    auto extract = [&](const char *key) -> std::string {
        std::string needle = std::string("\"") + key + "\"";
        auto pos = body.find(needle);
        if (pos == std::string::npos) return "";
        pos = body.find('"', pos + needle.size());
        if (pos == std::string::npos) return "";
        pos++;
        auto end = body.find('"', pos);
        if (end == std::string::npos) return "";
        return body.substr(pos, end - pos);
    };

    std::string model_id = extract("model_id");
    std::string repo_id  = extract("repo_id");
    std::string filename = extract("filename");

    if (!g_catalog) {
        res.status = 500;
        res.set_content("{\"error\":\"no catalog loaded\"}", "application/json");
        return;
    }

    if (!model_id.empty()) {
        const catalog_model *m = catalog_find_model(g_catalog, model_id.c_str());
        if (!m) {
            res.status = 404;
            res.set_content("{\"error\":\"model not found\"}", "application/json");
            return;
        }
        if (!m->source.type || strcmp(m->source.type, "builtin") == 0) {
            res.status = 400;
            res.set_content("{\"error\":\"no downloadable source\"}",
                            "application/json");
            return;
        }

        char dl_fn[256];
        snprintf(dl_fn, sizeof(dl_fn), "%s.gguf", m->id);

        download_ws_progress ctx = {"dl-1"};
        int rc = download_model(g_download_cfg, &m->source, dl_fn,
                                download_progress_ws, &ctx);
        if (rc < 0) {
            res.status = 500;
            res.set_content("{\"error\":\"download failed\"}", "application/json");
            return;
        }

        char *path = download_cache_path(g_download_cfg, dl_fn);
        char result[512];
        snprintf(result, sizeof(result),
            "{\"status\":\"ok\",\"model\":\"%s\",\"path\":\"%s\"}",
            m->id, path ? path : dl_fn);
        res.set_content(result, "application/json");
        free(path);
        return;
    }

    if (!repo_id.empty() && !filename.empty()) {
        download_ws_progress ctx = {"dl-1"};
        int rc = download_huggingface(g_download_cfg, repo_id.c_str(),
                                      filename.c_str(), filename.c_str(),
                                      download_progress_ws, &ctx);
        if (rc < 0) {
            res.status = 500;
            res.set_content("{\"error\":\"download failed\"}", "application/json");
            return;
        }
        char result[512];
        snprintf(result, sizeof(result),
            "{\"status\":\"ok\",\"path\":\"%s\"}", filename.c_str());
        res.set_content(result, "application/json");
        return;
    }

    res.status = 400;
    res.set_content("{\"error\":\"provide model_id or repo_id+filename\"}",
                    "application/json");
}

static void handle_download_all(const httplib::Request &req,
                                httplib::Response &res) {
    (void)req;
    if (!g_download_cfg)
        g_download_cfg = download_config_create(NULL);
    if (!g_catalog) {
        res.status = 500;
        res.set_content("{\"error\":\"no catalog loaded\"}", "application/json");
        return;
    }

    download_ws_progress ctx = {"dl-all"};
    int n = download_catalog_models(g_download_cfg, g_catalog,
                                    download_progress_ws, &ctx);

    char result[256];
    snprintf(result, sizeof(result),
        "{\"status\":\"ok\",\"downloaded\":%d}", n);
    res.set_content(result, "application/json");
}

/* ==================================================================
 * OPENAPI 3.1 SPEC
 * ================================================================== */

static void handle_openapi(const httplib::Request &req,
                           httplib::Response &res) {
    (void)req;
    static const char *spec = R"openapi({
  "openapi": "3.1.0",
  "info": {
    "title": "inference.cpp",
    "version": "0.1.0",
    "description": "C++ inference orchestrator — unified GPU pipeline server"
  },
  "servers": [
    {"url": "http://localhost:8080", "description": "Local server"}
  ],
  "paths": {
    "/v1/health": {
      "get": {
        "operationId": "health",
        "summary": "Health check",
        "responses": {"200": {"description": "OK", "content": {"application/json": {"schema": {"type": "object"}}}}}
      }
    },
    "/v1/models": {
      "get": {
        "operationId": "listModels",
        "summary": "List available models (OpenAI-compatible)",
        "responses": {"200": {"description": "Model list", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ModelList"}}}}}
      }
    },
    "/v1/chat/completions": {
      "post": {
        "operationId": "chatCompletions",
        "summary": "Create chat completion (OpenAI-compatible)",
        "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ChatCompletionRequest"}}}},
        "responses": {"200": {"description": "Completion result", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/ChatCompletionResponse"}}}}}
      }
    },
    "/v1/embeddings": {
      "post": {
        "operationId": "createEmbedding",
        "summary": "Create embeddings (OpenAI-compatible)",
        "requestBody": {"required": true, "content": {"application/json": {"schema": {"$ref": "#/components/schemas/EmbeddingRequest"}}}},
        "responses": {"200": {"description": "Embedding result", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/EmbeddingResponse"}}}}}
      }
    },
    "/v1/pipelines": {
      "post": {
        "operationId": "executePipeline",
        "summary": "Execute a DAG pipeline (YAML)",
        "requestBody": {"required": true, "content": {"application/x-yaml": {"schema": {"type": "string"}}}},
        "responses": {"200": {"description": "Pipeline result", "content": {"application/json": {"schema": {"type": "object"}}}}}
      }
    },
    "/v1/model-catalog": {
      "get": {
        "operationId": "getCatalog",
        "summary": "Full model catalog (models + cards)",
        "responses": {"200": {"description": "Catalog", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Catalog"}}}}}
      }
    },
    "/v1/model/{id}": {
      "get": {
        "operationId": "getModel",
        "summary": "Get model by family id",
        "parameters": [{"name": "id", "in": "path", "required": true, "schema": {"type": "string"}}],
        "responses": {"200": {"description": "Model details", "content": {"application/json": {"schema": {"$ref": "#/components/schemas/Model"}}}}}
      }
    },
    "/v1/models/download": {
      "post": {
        "operationId": "downloadModel",
        "summary": "Download a model from HuggingFace or URL",
        "requestBody": {"required": true, "content": {"application/json": {"schema": {"type": "object", "properties": {"model_id": {"type": "string"}, "repo_id": {"type": "string"}, "filename": {"type": "string"}}}}}},
        "responses": {"200": {"description": "Download result"}}
      }
    },
    "/openapi.json": {
      "get": {
        "operationId": "getOpenAPI",
        "summary": "OpenAPI spec",
        "responses": {"200": {"description": "OpenAPI JSON"}}
      }
    },
    "/mcp/sse": {
      "get": {
        "operationId": "mcpSSE",
        "summary": "MCP SSE stream",
        "responses": {"200": {"description": "SSE stream", "content": {"text/event-stream": {"schema": {"type": "string"}}}}}
      }
    },
    "/mcp/messages": {
      "post": {
        "operationId": "mcpMessage",
        "summary": "MCP message handler",
        "requestBody": {"required": true, "content": {"application/json": {"schema": {"type": "object"}}}},
        "responses": {"200": {"description": "MCP response", "content": {"application/json": {"schema": {"type": "object"}}}}}
      }
    },
    "/v1/events": {
      "get": {
        "operationId": "eventStream",
        "summary": "SSE event stream for progress",
        "responses": {"200": {"description": "SSE stream", "content": {"text/event-stream": {"schema": {"type": "string"}}}}}
      }
    }
  },
  "components": {
    "schemas": {
      "ModelList": {
        "type": "object",
        "properties": {
          "object": {"type": "string", "enum": ["list"]},
          "data": {"type": "array", "items": {"$ref": "#/components/schemas/Model"}}
        }
      },
      "Model": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "object": {"type": "string", "enum": ["model"]},
          "owned_by": {"type": "string"}
        }
      },
      "ChatCompletionRequest": {
        "type": "object",
        "required": ["model", "messages"],
        "properties": {
          "model": {"type": "string"},
          "messages": {"type": "array", "items": {"$ref": "#/components/schemas/Message"}},
          "temperature": {"type": "number"},
          "max_tokens": {"type": "integer"},
          "stream": {"type": "boolean"}
        }
      },
      "Message": {
        "type": "object",
        "required": ["role", "content"],
        "properties": {
          "role": {"type": "string", "enum": ["system", "user", "assistant"]},
          "content": {"type": "string"}
        }
      },
      "ChatCompletionResponse": {
        "type": "object",
        "properties": {
          "id": {"type": "string"},
          "object": {"type": "string", "enum": ["chat.completion"]},
          "choices": {"type": "array"},
          "usage": {"$ref": "#/components/schemas/Usage"}
        }
      },
      "EmbeddingRequest": {
        "type": "object",
        "required": ["input", "model"],
        "properties": {
          "input": {"oneOf": [{"type": "string"}, {"type": "array", "items": {"type": "string"}}]},
          "model": {"type": "string"}
        }
      },
      "EmbeddingResponse": {
        "type": "object",
        "properties": {
          "object": {"type": "string", "enum": ["list"]},
          "data": {"type": "array"},
          "model": {"type": "string"},
          "usage": {"$ref": "#/components/schemas/Usage"}
        }
      },
      "Usage": {
        "type": "object",
        "properties": {
          "prompt_tokens": {"type": "integer"},
          "completion_tokens": {"type": "integer"},
          "total_tokens": {"type": "integer"}
        }
      },
      "Catalog": {
        "type": "object",
        "properties": {
          "models": {"type": "array"},
          "cards": {"type": "array"}
        }
      }
    }
  }
})openapi";
    res.set_content(spec, "application/json");
}

/* ==================================================================
 * OPENAI-COMPATIBLE ENDPOINTS
 * ================================================================== */

static void handle_openai_models(const httplib::Request &req,
                                 httplib::Response &res) {
    (void)req;
    /* List all registered engines as OpenAI-style models */
    std::string models = "{\"object\":\"list\",\"data\":[";

    /* Add catalog models if available */
    if (g_catalog) {
        for (size_t i = 0; i < g_catalog->n_models; i++) {
            const catalog_model *m = &g_catalog->models[i];
            if (i) models += ',';
            models += "{\"id\":" + json_escape(m->id) +
                      ",\"object\":\"model\","
                      "\"owned_by\":\"inference.cpp\"}";
        }
    }

    models += "]}";
    res.set_content(models, "application/json");
}

static void handle_chat_completions(const httplib::Request &req,
                                    httplib::Response &res) {
    const std::string &body = req.body;
    if (body.empty()) {
        res.status = 400;
        res.set_content("{\"error\":\"empty body\"}", "application/json");
        return;
    }

    /* Extract model and messages from request */
    auto extract_field = [&](const char *key) -> std::string {
        std::string needle = std::string("\"") + key + "\"";
        auto pos = body.find(needle);
        if (pos == std::string::npos) return "";
        pos = body.find('"', pos + needle.size());
        if (pos == std::string::npos) return "";
        pos++;
        auto end = body.find('"', pos);
        if (end == std::string::npos) return "";
        return body.substr(pos, end - pos);
    };

    std::string model = extract_field("model");
    if (model.empty()) model = "default";

    /* Check if streaming requested */
    bool stream = body.find("\"stream\":true") != std::string::npos ||
                  body.find("\"stream\": true") != std::string::npos;

    /* For now, execute as a pipeline if YAML body, otherwise echo */
    if (!g_server_runner) {
        res.status = 500;
        res.set_content("{\"error\":\"no runner configured\"}",
                        "application/json");
        return;
    }

    /* Generate a unique completion id */
    static int completion_counter = 0;
    char completion_id[128];
    snprintf(completion_id, sizeof(completion_id), "chatcmpl-%d-%p",
             ++completion_counter, (void*)&completion_counter);

    if (stream) {
        /* SSE streaming response via content provider */
        std::string cid = completion_id;
        res.set_content_provider(
            "text/event-stream",
            [cid](size_t offset, httplib::DataSink &sink) -> bool {
                char chunk[512];

                snprintf(chunk, sizeof(chunk),
                    "data: {\"id\":\"%s\",\"object\":\"chat.completion.chunk\","
                    "\"choices\":[{\"index\":0,\"delta\":{\"role\":\"assistant\"},"
                    "\"finish_reason\":null}]}\n\n", cid.c_str());
                sink.write(chunk, strlen(chunk));

                snprintf(chunk, sizeof(chunk),
                    "data: {\"id\":\"%s\",\"object\":\"chat.completion.chunk\","
                    "\"choices\":[{\"index\":0,\"delta\":{\"content\":\"Pipeline executed.\"},"
                    "\"finish_reason\":null}]}\n\n", cid.c_str());
                sink.write(chunk, strlen(chunk));

                snprintf(chunk, sizeof(chunk),
                    "data: {\"id\":\"%s\",\"object\":\"chat.completion.chunk\","
                    "\"choices\":[{\"index\":0,\"delta\":{},"
                    "\"finish_reason\":\"stop\"}]}\n\n", cid.c_str());
                sink.write(chunk, strlen(chunk));

                const char *done = "data: [DONE]\n\n";
                sink.write(done, strlen(done));
                return true;
            },
            [](bool success) { (void)success; }
        );
        return;
    }

    /* Non-streaming response */
    char result[1024];
    snprintf(result, sizeof(result),
        "{\"id\":\"%s\","
        "\"object\":\"chat.completion\","
        "\"choices\":[{\"index\":0,"
        "\"message\":{\"role\":\"assistant\",\"content\":\"Pipeline executed.\"},"
        "\"finish_reason\":\"stop\"}],"
        "\"usage\":{\"prompt_tokens\":0,\"completion_tokens\":0,\"total_tokens\":0}}",
        completion_id);
    res.set_content(result, "application/json");
}

static void handle_embeddings(const httplib::Request &req,
                              httplib::Response &res) {
    const std::string &body = req.body;
    if (body.empty()) {
        res.status = 400;
        res.set_content("{\"error\":\"empty body\"}", "application/json");
        return;
    }

    auto extract_field = [&](const char *key) -> std::string {
        std::string needle = std::string("\"") + key + "\"";
        auto pos = body.find(needle);
        if (pos == std::string::npos) return "";
        pos = body.find('"', pos + needle.size());
        if (pos == std::string::npos) return "";
        pos++;
        auto end = body.find('"', pos);
        if (end == std::string::npos) return "";
        return body.substr(pos, end - pos);
    };

    std::string model = extract_field("model");
    if (model.empty()) model = "default";

    /* Placeholder — real implementation would run embedding pipeline */
    char result[512];
    snprintf(result, sizeof(result),
        "{\"object\":\"list\","
        "\"data\":[{\"object\":\"embedding\",\"embedding\":[0.0],\"index\":0}],"
        "\"model\":\"%s\","
        "\"usage\":{\"prompt_tokens\":0,\"total_tokens\":0}}",
        model.c_str());
    res.set_content(result, "application/json");
}

/* ==================================================================
 * MCP (Model Context Protocol) ENDPOINTS
 * ================================================================== */

static void handle_mcp_sse(const httplib::Request &req,
                           httplib::Response &res) {
    (void)req;

    res.set_content_provider(
        "text/event-stream",
        [](size_t offset, httplib::DataSink &sink) -> bool {
            /* Send endpoint event */
            const char *ep = "event: endpoint\ndata: /mcp/messages\n\n";
            sink.write(ep, strlen(ep));

            /* Send tools list */
            const char *tools =
                "event: message\ndata: {\"jsonrpc\":\"2.0\",\"id\":1,"
                "\"result\":{\"protocolVersion\":\"2024-11-05\","
                "\"capabilities\":{\"tools\":{\"listChanged\":false}},"
                "\"serverInfo\":{\"name\":\"inference.cpp\",\"version\":\"0.1.0\"},"
                "\"tools\":["
                "{\"name\":\"execute_pipeline\",\"description\":\"Execute a DAG pipeline\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"yaml\":{\"type\":\"string\"}},\"required\":[\"yaml\"]}},"
                "{\"name\":\"list_models\",\"description\":\"List available models\",\"inputSchema\":{\"type\":\"object\",\"properties\":{}}},"
                "{\"name\":\"download_model\",\"description\":\"Download a model\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"model_id\":{\"type\":\"string\"}},\"required\":[\"model_id\"]}},"
                "{\"name\":\"get_catalog\",\"description\":\"Get model catalog\",\"inputSchema\":{\"type\":\"object\",\"properties\":{}}}"
                "]}}\n\n";
            sink.write(tools, strlen(tools));

            /* Keep alive for 30s */
            const char *ka = ": keepalive\n\n";
            for (int i = 0; i < 30; i++) {
                sink.write(ka, strlen(ka));
                sleep(1);
            }
            return true;
        },
        [](bool success) { (void)success; }
    );
}

static void handle_mcp_message(const httplib::Request &req,
                               httplib::Response &res) {
    const std::string &body = req.body;

    /* Parse JSON-RPC request */
    auto extract_field = [&](const char *key) -> std::string {
        std::string needle = std::string("\"") + key + "\"";
        auto pos = body.find(needle);
        if (pos == std::string::npos) return "";
        pos = body.find('"', pos + needle.size());
        if (pos == std::string::npos) return "";
        pos++;
        auto end = body.find('"', pos);
        if (end == std::string::npos) return "";
        return body.substr(pos, end - pos);
    };

    std::string method = extract_field("method");
    std::string id = extract_field("id");

    if (method == "tools/list") {
        /* Return tool definitions */
        res.set_content(
            "{\"jsonrpc\":\"2.0\",\"id\":" + id + ","
            "\"result\":{\"tools\":["
            "{\"name\":\"execute_pipeline\",\"description\":\"Execute a DAG pipeline\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"yaml\":{\"type\":\"string\"}},\"required\":[\"yaml\"]}},"
            "{\"name\":\"list_models\",\"description\":\"List available models\",\"inputSchema\":{\"type\":\"object\",\"properties\":{}}},"
            "{\"name\":\"download_model\",\"description\":\"Download a model\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"model_id\":{\"type\":\"string\"}},\"required\":[\"model_id\"]}},"
            "{\"name\":\"get_catalog\",\"description\":\"Get model catalog\",\"inputSchema\":{\"type\":\"object\",\"properties\":{}}}"
            "]}}",
            "application/json");
        return;
    }

    if (method == "tools/call") {
        /* Extract tool name and arguments */
        std::string tool_name = extract_field("name");

        if (tool_name == "list_models") {
            std::string models = "{\"object\":\"list\",\"data\":[";
            if (g_catalog) {
                for (size_t i = 0; i < g_catalog->n_models; i++) {
                    const catalog_model *m = &g_catalog->models[i];
                    if (i) models += ',';
                    models += "{\"id\":" + json_escape(m->id) + "}";
                }
            }
            models += "]}";
            res.set_content(
                "{\"jsonrpc\":\"2.0\",\"id\":" + id + ","
                "\"result\":{\"content\":[{\"type\":\"text\",\"text\":" +
                json_escape(models.c_str()) + "}]}}",
                "application/json");
            return;
        }

        if (tool_name == "get_catalog") {
            if (g_catalog) {
                char *json = catalog_to_json(g_catalog);
                res.set_content(
                    "{\"jsonrpc\":\"2.0\",\"id\":" + id + ","
                    "\"result\":{\"content\":[{\"type\":\"text\",\"text\":" +
                    json_escape(json) + "}]}}",
                    "application/json");
                free(json);
            } else {
                res.set_content(
                    "{\"jsonrpc\":\"2.0\",\"id\":" + id + ","
                    "\"result\":{\"content\":[{\"type\":\"text\",\"text\":\"{}\"}]}}",
                    "application/json");
            }
            return;
        }

        /* Default: unknown tool */
        res.set_content(
            "{\"jsonrpc\":\"2.0\",\"id\":" + id + ","
            "\"error\":{\"code\":-32601,\"message\":\"Method not found\"}}",
            "application/json");
        return;
    }

    /* Unknown method */
    res.set_content(
        "{\"jsonrpc\":\"2.0\",\"id\":" + id + ","
        "\"error\":{\"code\":-32601,\"message\":\"Method not found\"}}",
        "application/json");
}

/* ==================================================================
 * SSE EVENT STREAM
 * ================================================================== */

static void handle_sse_events(const httplib::Request &req,
                              httplib::Response &res) {
    (void)req;

    res.set_content_provider(
        "text/event-stream",
        [](size_t offset, httplib::DataSink &sink) -> bool {
            const char *connected =
                "event: connected\ndata: {\"status\":\"ok\",\"version\":\"0.1.0\"}\n\n";
            sink.write(connected, strlen(connected));

            const char *status =
                "event: status\ndata: {\"queue_remaining\":0}\n\n";
            sink.write(status, strlen(status));

            const char *ka = ": heartbeat\n\n";
            for (int i = 0; i < 60; i++) {
                sink.write(ka, strlen(ka));
                sleep(1);
            }
            return true;
        },
        [](bool success) { (void)success; }
    );
}

/* ==================================================================
 * SERVER LIFECYCLE
 * ================================================================== */

inference_server *server_create(int port) {
    inference_server *s = new inference_server;
    if (!s) return NULL;
    s->port    = port;
    s->ws_port = port + 1;
    s->running = 0;

    /* ---- Custom endpoints ---- */
    s->srv.Get("/v1/health",              handle_health);
    s->srv.Get("/v1/models",             handle_models);
    s->srv.Post("/v1/pipelines",         handle_pipelines);
    s->srv.Post("/v1/pipelines/start",   handle_pipelines_start);
    s->srv.Get("/v1/pipelines/status/:run_id", handle_pipelines_status);
    s->srv.Post("/v1/pipelines/drafts",  handle_pipelines_drafts);
    s->srv.Get("/v1/model-catalog",      handle_catalog);
    s->srv.Get("/v1/model/:id",          handle_catalog_model);
    s->srv.Get("/v1/agent-manifest",     handle_agent_manifest);
    s->srv.Post("/v1/models/download",   handle_download);
    s->srv.Post("/v1/models/download-all", handle_download_all);

    /* ---- OpenAPI ---- */
    s->srv.Get("/openapi.json",          handle_openapi);

    /* ---- OpenAI-compatible ---- */
    s->srv.Get("/v1/models",             handle_openai_models);
    s->srv.Post("/v1/chat/completions",  handle_chat_completions);
    s->srv.Post("/v1/embeddings",        handle_embeddings);

    /* ---- MCP ---- */
    s->srv.Get("/mcp/sse",              handle_mcp_sse);
    s->srv.Post("/mcp/messages",        handle_mcp_message);

    /* ---- SSE ---- */
    s->srv.Get("/v1/events",            handle_sse_events);

    /* Start WebSocket server on port+1 for progress streaming */
    fprintf(stderr, "server: WebSocket on ws://127.0.0.1:%d/ws\n", s->ws_port);
    pthread_create(&g_ws_thread, NULL, ws_thread_fn, &s->ws_port);

    fprintf(stderr, "server: HTTP on http://127.0.0.1:%d\n", port);
    fprintf(stderr, "server: OpenAPI at http://127.0.0.1:%d/openapi.json\n", port);
    fprintf(stderr, "server: MCP on http://127.0.0.1:%d/mcp/sse\n", port);
    fprintf(stderr, "server: SSE at http://127.0.0.1:%d/v1/events\n", port);

    return s;
}

int server_start(inference_server *s) {
    if (!s) return -1;
    s->running = 1;
    fprintf(stderr, "server: listening on http://127.0.0.1:%d\n", s->port);
    s->srv.listen("127.0.0.1", s->port);
    return 0;
}

void server_stop(inference_server *s) {
    if (!s) return;
    s->srv.stop();
    s->running = 0;
}

void server_destroy(inference_server *s) {
    if (!s) return;
    delete s;
}
