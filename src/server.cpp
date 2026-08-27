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
#include <dirent.h>
#include <sys/stat.h>
#include <unistd.h>
#include <sys/stat.h>
#include <vector>
#include <algorithm>

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
        if (*p == '\\' && p[1]) {
            p++;
            if (*p == 'n') out[i++] = '\n';
            else if (*p == 't') out[i++] = '\t';
            else if (*p == 'r') out[i++] = '\r';
            else out[i++] = *p;
            p++;
            continue;
        }
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
 *   POST /v1/models/download-all   — download all catalog models *   GET  /v1/skills             -> progressive-disclosure skill index
 *   GET  /v1/skills/<id>        -> full skill body (ledgered on read)
 *   GET  /v1/ledger             -> tail of output/_ledger.jsonl

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
 *   GET  /v1/pipelines/runs    -> {runs:[...]} (gallery; disk-scanned from
 *                                  ./output/run-<id>/_pipeline.json sidecars -
 *                                  restart-safe; every run persists its spec)
 *   GET  /editor/assets/runs/{run}/{file} -> artifact bytes (media tree)
 *   GET  /v1/form-spec?model=  -> {defaults, variants, enhance_prompts}
 *   POST /v1/models/provision  -> {queued, manager:{accepted,...}} (async)
 *   GET  /v1/models/provision/status -> {jobs:[...]}
 * Execution happens on detached pthreads against the same runner/engines.
 */

#define RUNREG_MAX 256
#define RUN_ARTIFACTS_MAX 16

typedef struct {
    char name[64];
    char dtype[8];           /* "f32" or "u8" */
    float f;
    char *bytes;             /* malloc'd; owned by the entry, freed post-run */
    size_t nbytes;
} run_input;

#define RUN_STAGES_MAX 8
#define RUN_STAGE_ARTS_MAX 4

typedef struct {
    char id[64];             /* node id from the pipeline YAML */
    char state[16];          /* pending|running|done|skipped|error */
    char arts[RUN_STAGE_ARTS_MAX][160];  /* artifacts attributed to this stage */
    size_t n_arts;
} run_stage;

typedef struct {
    char run_id[48];
    char state[16];          /* queued|running|success|error|stopped */
    char error[256];
    char out_dir[512];
    char yaml[2048];         /* the pipeline YAML this run executes */
    char model[64];          /* requested model (spec persistence) */
    char prompt[2048];       /* requested prompt (spec persistence) */
    long seed;               /* requested seed, -1 = unset */
    time_t created;
    run_input inputs[16];
    size_t n_inputs;
    run_stage stages[RUN_STAGES_MAX];
    size_t n_stages;
    int  stop_req;           /* per-run cooperative stop request */
    int  th_done;            /* run thread fully drained; slot reusable.
                              * A terminal state alone is NOT enough: a
                              * stopped run's thread drains asynchronously. */
    /* resume support: prior outputs loaded from a previous run's
     * artifacts + the topo index to resume from */
#define RUN_PRIOR_MAX 16
    struct {
        char node_id[64];
        char tensor_name[32];
        char dtype[8];
        char *data;           /* malloc'd; owned by the entry, freed post-run */
        size_t nbytes;
    } prior[RUN_PRIOR_MAX];
    size_t n_prior;
    int  start_from;
} run_entry;

static run_entry g_runs[RUNREG_MAX];
static size_t g_n_runs = 0;
static pthread_mutex_t g_runs_mu = PTHREAD_MUTEX_INITIALIZER;

/* ---- GPU FIFO: serial execution, one run at a time ----
 * Ticket-based queue: each thread gets a monotonically increasing ticket
 * and waits until g_gpu_serving reaches its ticket. After execution it
 * increments g_gpu_serving and broadcasts so the next waiter proceeds.
 */
static int    g_gpu_tickets = 0;
static int    g_gpu_serving = 0;
static pthread_mutex_t g_gpu_mu  = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t  g_gpu_cv  = PTHREAD_COND_INITIALIZER;

/* Live ticket-queue depth: runs holding or waiting for the GPU. */
static int gpu_queue_depth(void) {
    pthread_mutex_lock(&g_gpu_mu);
    int d = g_gpu_tickets - g_gpu_serving;
    pthread_mutex_unlock(&g_gpu_mu);
    return d < 0 ? 0 : d;
}

/* Release the GPU ticket and wake the next waiter. Every path in
 * run_thread_fn that acquired a ticket MUST call this exactly once. */
static void gpu_ticket_release(void) {
    pthread_mutex_lock(&g_gpu_mu);
    g_gpu_serving++;
    pthread_cond_broadcast(&g_gpu_cv);
    pthread_mutex_unlock(&g_gpu_mu);
}

/* Free leftover heap state on a registry slot. Callers hold g_runs_mu
 * (registrars) or own the slot exclusively (run thread, terminal). */
static void run_slot_release_heap(size_t idx) {
    for (size_t i = 0; i < g_runs[idx].n_inputs; i++)
        free(g_runs[idx].inputs[i].bytes);
    g_runs[idx].n_inputs = 0;
    for (size_t p = 0; p < g_runs[idx].n_prior; p++)
        free(g_runs[idx].prior[p].data);
    g_runs[idx].n_prior = 0;
}

/* Mark a slot's thread as fully drained. Registrars only reuse slots
 * with th_done == 1, so no live thread ever touches a recycled slot. */
static void run_mark_th_done(size_t idx) {
    pthread_mutex_lock(&g_runs_mu);
    g_runs[idx].th_done = 1;
    pthread_mutex_unlock(&g_runs_mu);
}

static void run_write_sidecar(size_t idx);
static void ledger_log(const char *event, const char *data_json);
static char *json_quote(const char *src);

static void run_set_state(size_t idx, const char *state, const char *err) {
    pthread_mutex_lock(&g_runs_mu);
    snprintf(g_runs[idx].state, sizeof(g_runs[idx].state), "%s", state);
    if (err) snprintf(g_runs[idx].error, sizeof(g_runs[idx].error), "%s", err);
    pthread_mutex_unlock(&g_runs_mu);
    run_write_sidecar(idx);   /* the spec sidecar carries live status */
    {   /* every state change lands in the append-only file ledger */
        char eb[600];
        char *eq = (err && err[0]) ? json_quote(err) : NULL;
        snprintf(eb, sizeof(eb),
                 "{\"run_id\":\"%s\",\"state\":\"%s\",\"error\":%s}",
                 g_runs[idx].run_id, state, eq ? eq : "null");
        ledger_log("run.state", eb);
        free(eq);
    }
}

/* ---- Per-stage tracking ----
 * Parse the node ids out of a pipeline YAML (lines matching "  - id: X")
 * so a run can report stages[] before/while it executes. */
/* Editor status vocabulary mapper: internal success/error/done states map
 * onto the wire vocabulary the card system polls (completed/failed). */
static const char *wire_state(const char *s) {
    if (!s) return "unknown";
    if (strcmp(s, "success") == 0 || strcmp(s, "done") == 0) return "completed";
    if (strcmp(s, "error") == 0) return "failed";
    if (!s[0]) return "unknown";
    return s;
}

static void run_parse_stages(size_t idx) {
    const char *p = g_runs[idx].yaml;
    size_t n = 0;
    while (*p && n < RUN_STAGES_MAX) {
        /* a stage line: newline, spaces, "- id: " (YAML list of nodes) */
        const char *line = p;
        while (*p && *p != '\n') p++;
        const char *eol = p;
        size_t indent = 0;
        while (line + indent < eol && line[indent] == ' ') indent++;
        if (eol - line > (long)(indent + 6) &&
            strncmp(line + indent, "- id: ", 6) == 0) {
            const char *v = line + indent + 6;
            size_t len = 0;
            while (v + len < eol && v[len] != ' ' && v[len] != '\r') len++;
            if (len > 0 && len < sizeof(g_runs[idx].stages[n].id)) {
                snprintf(g_runs[idx].stages[n].id,
                         sizeof(g_runs[idx].stages[n].id), "%.*s", (int)len, v);
                snprintf(g_runs[idx].stages[n].state,
                         sizeof(g_runs[idx].stages[n].state), "pending");
                g_runs[idx].stages[n].n_arts = 0;
                n++;
            }
        }
        if (*p) p++;
    }
    g_runs[idx].n_stages = n;
}

/* Attribute not-yet-attributed artifacts in out_dir to the stage that just
 * finished. Called from the stage callback at RUNNER_STAGE_DONE. */
static void stage_attribute_artifacts(size_t idx, size_t stage_i) {
    if (stage_i >= RUN_STAGES_MAX) return;
    char seen[64][160];
    size_t n_seen = 0;
    /* collect already-attributed names across all stages */
    for (size_t s = 0; s < g_runs[idx].n_stages; s++)
        for (size_t a = 0; a < g_runs[idx].stages[s].n_arts && n_seen < 64; a++)
            snprintf(seen[n_seen++], sizeof(seen[0]), "%s",
                     g_runs[idx].stages[s].arts[a]);
    DIR *d = opendir(g_runs[idx].out_dir);
    if (!d) return;
    struct dirent *e;
    run_stage *st = &g_runs[idx].stages[stage_i];
    while ((e = readdir(d)) != NULL) {
        if (e->d_name[0] == '.') continue;
        if (strcmp(e->d_name, "_pipeline.json") == 0) continue;
        int attr = 0;
        for (size_t k = 0; k < n_seen; k++)
            if (strcmp(seen[k], e->d_name) == 0) { attr = 1; break; }
        if (attr) continue;
        if (st->n_arts >= RUN_STAGE_ARTS_MAX) break;
        snprintf(st->arts[st->n_arts++], sizeof(st->arts[0]), "%s", e->d_name);
        snprintf(seen[n_seen < 64 ? n_seen : 63], sizeof(seen[0]), "%s", e->d_name);
        if (n_seen < 64) n_seen++;
    }
    closedir(d);
}

/* Stage callback ctx = the run registry index (as a size_t*). */
static void run_stage_cb(void *ctx, const char *node_id,
                         int index, int total, int state) {
    (void)index; (void)total;
    size_t *idxp = (size_t *)ctx;
    size_t idx = *idxp;
    const char *sname =
        state == RUNNER_STAGE_STARTED  ? "running" :
        state == RUNNER_STAGE_DONE     ? "done" :
        state == RUNNER_STAGE_SKIPPED  ? "skipped" :
        state == RUNNER_STAGE_ERROR    ? "error" : "pending";
    pthread_mutex_lock(&g_runs_mu);
    for (size_t s = 0; s < g_runs[idx].n_stages; s++) {
        if (strcmp(g_runs[idx].stages[s].id, node_id) == 0) {
            snprintf(g_runs[idx].stages[s].state,
                     sizeof(g_runs[idx].stages[s].state), "%s", sname);
            if (state == RUNNER_STAGE_DONE)
                stage_attribute_artifacts(idx, s);
            break;
        }
    }
    pthread_mutex_unlock(&g_runs_mu);
    run_write_sidecar(idx);
    char eb[400];
    snprintf(eb, sizeof(eb),
             "{\"run_id\":\"%s\",\"stage\":\"%s\",\"state\":\"%s\"}",
             g_runs[idx].run_id, node_id, sname);
    ledger_log("run.stage", eb);
}

/* scan out_dir for artifacts -> JSON array string (caller frees) */
/* artifact kind by extension (gallery picks thumbnails by type) */
static const char *artifact_type(const char *name) {
    const char *e = strrchr(name, '.');
    if (!e) return "file";
    e++;
    if (!strcasecmp(e,"png") || !strcasecmp(e,"jpg") || !strcasecmp(e,"jpeg") ||
        !strcasecmp(e,"webp") || !strcasecmp(e,"gif") || !strcasecmp(e,"svg"))
        return "image";
    if (!strcasecmp(e,"wav") || !strcasecmp(e,"flac") || !strcasecmp(e,"mp3") ||
        !strcasecmp(e,"ogg") || !strcasecmp(e,"m4a") || !strcasecmp(e,"aac"))
        return "audio";
    if (!strcasecmp(e,"mp4") || !strcasecmp(e,"webm") || !strcasecmp(e,"mkv") ||
        !strcasecmp(e,"mov"))
        return "video";
    if (!strcasecmp(e,"glb") || !strcasecmp(e,"gltf")) return "model";
    if (!strcasecmp(e,"json")) return "spec";
    if (!strcasecmp(e,"txt") || !strcasecmp(e,"md") || !strcasecmp(e,"yaml"))
        return "text";
    return "file";
}

static const char *content_type_of(const char *name) {
    const char *e = strrchr(name, '.');
    if (!e) return "application/octet-stream";
    e++;
    if (!strcasecmp(e,"png"))  return "image/png";
    if (!strcasecmp(e,"jpg") || !strcasecmp(e,"jpeg")) return "image/jpeg";
    if (!strcasecmp(e,"webp")) return "image/webp";
    if (!strcasecmp(e,"gif"))  return "image/gif";
    if (!strcasecmp(e,"svg"))  return "image/svg+xml";
    if (!strcasecmp(e,"wav"))  return "audio/wav";
    if (!strcasecmp(e,"flac")) return "audio/flac";
    if (!strcasecmp(e,"mp3"))  return "audio/mpeg";
    if (!strcasecmp(e,"ogg"))  return "audio/ogg";
    if (!strcasecmp(e,"m4a"))  return "audio/mp4";
    if (!strcasecmp(e,"mp4"))  return "video/mp4";
    if (!strcasecmp(e,"webm")) return "video/webm";
    if (!strcasecmp(e,"glb"))  return "model/gltf-binary";
    if (!strcasecmp(e,"gltf")) return "model/gltf+json";
    if (!strcasecmp(e,"json")) return "application/json";
    if (!strcasecmp(e,"txt") || !strcasecmp(e,"md")) return "text/plain; charset=utf-8";
    if (!strcasecmp(e,"yaml")) return "text/yaml";
    return "application/octet-stream";
}

/* last path component of a dir path (run id from ./output/<run_id>) */
static const char *path_basename(const char *p) {
    const char *s = strrchr(p, '/');
    return s ? s + 1 : p;
}

static char *run_artifacts_json(const char *out_dir) {
    char cmd[1024];
    snprintf(cmd, sizeof(cmd), "ls -1 '%s' 2>/dev/null", out_dir);
    FILE *fp = popen(cmd, "r");
    if (!fp) return strdup("[]");
    const char *rid = path_basename(out_dir);
    size_t cap = 8192, len = 0;
    char *buf = (char *)malloc(cap);
    len += (size_t)snprintf(buf + len, cap - len, "[");
    char line[512];
    int first = 1;
    int listed = 0, total = 0, imgs = 0;
    const int MAX_IMGS = 3;      /* payload diet: sidebar lists media + 3 frames */
    while (fgets(line, sizeof(line), fp)) {
        size_t ll = strlen(line);
        while (ll && (line[ll-1] == '\n' || line[ll-1] == '\r')) line[--ll] = 0;
        if (!ll) continue;
        total++;
        if (line[0] == '_') continue;   /* sidecars + generated _poster.jpg */
        const char *t = artifact_type(line);
        if (strcmp(t, "image") == 0) {
            if (++imgs > MAX_IMGS) continue;
        } else if (strcmp(t, "video") != 0 && strcmp(t, "audio") != 0) {
            continue;            /* not media: not listed */
        }
        listed++;
        char path[1024], szcmd[1200];
        snprintf(path, sizeof(path), "%s/%s", out_dir, line);
        snprintf(szcmd, sizeof(szcmd), "stat -c %%s '%s' 2>/dev/null", path);
        FILE *sf = popen(szcmd, "r");
        long bytes = -1;
        if (sf) { if (fscanf(sf, "%ld", &bytes) != 1) bytes = -1; pclose(sf); }
        while (len + 900 > cap) { cap *= 2; buf = (char *)realloc(buf, cap); }
        if (!first) len += (size_t)snprintf(buf + len, cap - len, ",");
        first = 0;
        len += (size_t)snprintf(buf + len, cap - len,
            "{\"name\":\"%s\",\"path\":\"%s\",\"bytes\":%ld,"
            "\"url\":\"/editor/assets/runs/%s/%s\",\"type\":\"%s\",\"size\":%ld}",
            line, path, bytes, rid, line, artifact_type(line), bytes);
    }
    pclose(fp);
    if (total > listed) {
        if (!first) len += (size_t)snprintf(buf + len, cap - len, ",");
        len += (size_t)snprintf(buf + len, cap - len,
            "{\"truncated\":true,\"listed\":%d,\"total\":%d}", listed, total);
    }
    snprintf(buf + len, cap - len, "]");
    return buf;
}

/* read a harvested lane pipeline for a catalog model into out; NULL if none */
static char *pipeline_yaml_for_model(const char *model, char *out, size_t cap) {
    for (const char *p = model; *p; p++)
        if (!((*p >= 'a' && *p <= 'z') || (*p >= '0' && *p <= '9') ||
              *p == '-' || *p == '_' || *p == '.'))
            return NULL;                    /* path safety: slug chars only */
    char path[600];
    snprintf(path, sizeof(path), "../pipelines/%s/pipeline.yaml", model);
    FILE *fp = fopen(path, "rb");
    if (!fp) return NULL;
    size_t n = fread(out, 1, cap - 1, fp);
    fclose(fp);
    if (n == 0 || n >= cap - 1) return NULL;
    out[n] = 0;
    return out;
}

/* ── Timeline studio calls compile ─────────────────────────────────────
 * The video-timeline card body carries calls:[{text, beats:[{text, ...}]}]
 * instead of a flat prompt. Studio law: the compiler cuts windows at CALL
 * boundaries — each call becomes ONE window prompt (its beats joined, or
 * the call text alone). Feeds the prompt..prompt4 wire the multi-window
 * engine already speaks. Returns window count (0..4). */
static char g_tl_wins[4][2048];
static int  g_tl_nw = 0;

static int compile_calls_windows(const char *body, char out[4][2048]) {
    const char *key = strstr(body, "\"calls\"");
    if (!key) return 0;
    const char *calls = strchr(key + 7, '[');
    if (!calls) return 0;
    int depth = 0, in_str = 0, esc = 0, n = 0;
    const char *obj_start = NULL;
    for (const char *p = calls; *p; p++) {
        if (esc) { esc = 0; continue; }
        if (in_str && *p == '\\') { esc = 1; continue; }
        if (*p == '"') { in_str = !in_str; continue; }
        if (in_str) continue;
        if (*p == '[' || *p == '{') {
            if (*p == '{' && depth == 1 && !obj_start) obj_start = p;
            depth++;
        } else if (*p == ']' || *p == '}') {
            depth--;
            if (*p == '}' && obj_start && depth == 1) {
                if (n < 4) {
                    size_t len = (size_t)(p - obj_start + 2);
                    char *obj = (char *)malloc(len + 1);
                    if (obj) {
                        memcpy(obj, obj_start, len); obj[len] = 0;
                        out[n][0] = 0; size_t o = 0;
                        const char *q = obj;
                        while ((q = strstr(q, "\"text\":\"")) != NULL &&
                               o + 300 < 2048) {
                            q += 8;
                            if (o) o += (size_t)snprintf(out[n] + o,
                                                2048 - o, "  ");
                            while (*q && *q != '"' && o + 4 < 2048) {
                                if (*q == '\\' && q[1]) {
                                    q++;
                                    if (*q == 'n') out[n][o++] = ' ';
                                    else if (*q == '"') out[n][o++] = '"';
                                    else if (*q == '\\') out[n][o++] = '\\';
                                    q++; continue;
                                }
                                out[n][o++] = *q++;
                            }
                            out[n][o] = 0;
                        }
                        free(obj);
                        if (out[n][0]) n++;
                    }
                }
                obj_start = NULL;
            }
            if (depth == 0) break;
        }
    }
    return n;
}
static void add_run_input_text(size_t idx, const char *name, const char *s) {
    if (g_runs[idx].n_inputs >= 16) return;
    run_input *ri = &g_runs[idx].inputs[g_runs[idx].n_inputs++];
    snprintf(ri->name, sizeof(ri->name), "%s", name);
    snprintf(ri->dtype, sizeof(ri->dtype), "u8");
    ri->f = 0;
    ri->nbytes = strlen(s) + 1;  /* +1: NUL for C-string ops (access, curl) */
    ri->bytes = (char *)malloc(ri->nbytes);
    memcpy(ri->bytes, s, ri->nbytes);
}

static void add_run_input_f32(size_t idx, const char *name, float f) {
    if (g_runs[idx].n_inputs >= 16) return;
    run_input *ri = &g_runs[idx].inputs[g_runs[idx].n_inputs++];
    snprintf(ri->name, sizeof(ri->name), "%s", name);
    snprintf(ri->dtype, sizeof(ri->dtype), "f32");
    ri->f = f;
    ri->bytes = (char *)malloc(4);
    memcpy(ri->bytes, &f, 4);
    ri->nbytes = 4;
}

/* extra beat fields the timeline card carries (multi-window prompts) */
static void add_run_extra_inputs(size_t idx, const char *body,
                                 char *tmp, size_t tmpcap) {
    static const char *names[] = {"prompt2", "prompt3", "prompt4", NULL};
    for (int i = 0; names[i]; i++)
        if (inf_json_string(body, names[i], tmp, tmpcap) == 0 && tmp[0])
            add_run_input_text(idx, names[i], tmp);
    /* Timeline studio compiled windows (calls -> per-call prompts):
     * the card body carries no prompt2..4 keys - feed from the compile. */
    if (g_tl_nw > 1) {
        for (int i = 1; i < g_tl_nw && i < 4; i++)
            add_run_input_text(idx, names[i - 1], g_tl_wins[i]);
        g_tl_nw = 0;  /* one-shot: never leak into the next run */
    }
}

/* thread body: execute the run's pipeline YAML */
typedef struct { size_t idx; } run_thread_arg;

static void *run_thread_fn(void *argp) {
    run_thread_arg a = *(run_thread_arg *)argp;
    free(argp);
    size_t idx = a.idx;

    /* GPU FIFO: wait for our ticket before touching the GPU */
    pthread_mutex_lock(&g_gpu_mu);
    int my_ticket = g_gpu_tickets++;
    while (g_gpu_serving != my_ticket)
        pthread_cond_wait(&g_gpu_cv, &g_gpu_mu);
    pthread_mutex_unlock(&g_gpu_mu);

    /* Per-run stop may have arrived while we were queued. The check and
     * our queued->running transition happen in ONE critical section:
     * handle_pipelines_stop sets stop_req and re-reads the state under
     * the same mutex, so a stop can never slip between the check and
     * the transition (audit H2). */
    runner_clear_stop(g_server_runner);
    int stop_early;
    pthread_mutex_lock(&g_runs_mu);
    stop_early = g_runs[idx].stop_req;
    if (!stop_early)
        snprintf(g_runs[idx].state, sizeof(g_runs[idx].state), "running");
    pthread_mutex_unlock(&g_runs_mu);
    if (stop_early) {
        run_set_state(idx, "stopped", NULL);
        pthread_mutex_lock(&g_runs_mu);
        run_slot_release_heap(idx);
        pthread_mutex_unlock(&g_runs_mu);
        run_mark_th_done(idx);
        gpu_ticket_release();
        return NULL;
    }
    run_set_state(idx, "running", NULL);  /* sidecar + ledger bookkeeping */
    /* Real queue telemetry on the WS bus (audit M3) */
    if (g_ws_server)
        ws_send_status(g_ws_server, gpu_queue_depth());
    inference_dag *dag = dag_parse_string(g_runs[idx].yaml, strlen(g_runs[idx].yaml));
    if (!dag) {
        run_set_state(idx, "error", "dag parse failed");
        /* MUST release the FIFO ticket or every queued run behind us
         * deadlocks forever */
        pthread_mutex_lock(&g_runs_mu);
        run_slot_release_heap(idx);
        pthread_mutex_unlock(&g_runs_mu);
        run_mark_th_done(idx);
        gpu_ticket_release();
        return NULL;
    }
    inference_tensor tensors[16];
    size_t n_in = g_runs[idx].n_inputs;
    for (size_t i = 0; i < n_in; i++) {
        run_input *ri = &g_runs[idx].inputs[i];
        memset(&tensors[i], 0, sizeof(tensors[i]));
        tensors[i].name = ri->name;
        tensors[i].dtype = ri->dtype;
        tensors[i].ndim = 1;
        tensors[i].shape[0] = (long)ri->nbytes;
        tensors[i].data = ri->bytes;
        tensors[i].nbytes = ri->nbytes;
    }
    char *result = NULL;
    size_t cb_idx = idx;
    runner_set_stage_cb(g_server_runner, run_stage_cb, &cb_idx);
    /* Persist native-engine output tensors into this run's dir so the
     * artifact attribution scan sees them (comfyui writes its own files). */
    runner_set_outdir(g_server_runner, g_runs[idx].out_dir);
    runner_prior_output prior[RUN_PRIOR_MAX];
    size_t n_prior = g_runs[idx].n_prior;
    if (n_prior > RUN_PRIOR_MAX) n_prior = RUN_PRIOR_MAX;
    for (size_t p = 0; p < n_prior; p++) {
        prior[p].node_id = g_runs[idx].prior[p].node_id;
        prior[p].tensor_name = g_runs[idx].prior[p].tensor_name;
        prior[p].dtype = g_runs[idx].prior[p].dtype;
        prior[p].data = g_runs[idx].prior[p].data;
        prior[p].nbytes = g_runs[idx].prior[p].nbytes;
    }
    int rc = runner_execute_ex(g_server_runner, dag,
                               n_in ? tensors : NULL, n_in,
                               n_prior ? prior : NULL, n_prior,
                               g_runs[idx].start_from, &result);
    runner_set_stage_cb(g_server_runner, NULL, NULL);
    dag_free(dag);
    for (size_t i = 0; i < g_runs[idx].n_inputs; i++)
        free(g_runs[idx].inputs[i].bytes);
    g_runs[idx].n_inputs = 0;
    for (size_t p = 0; p < g_runs[idx].n_prior; p++)
        free(g_runs[idx].prior[p].data);
    g_runs[idx].n_prior = 0;
    /* Read server_url into locals BEFORE the final state change so the
     * slot can be recycled by a concurrent registrar without corrupting
     * the /free call. */
    char free_url[256] = "http://127.0.0.1:18465";
    inf_json_string(g_runs[idx].yaml, "server_url", free_url, sizeof(free_url));

    if (rc == 1) {
        run_set_state(idx, "stopped", NULL);
        inference_free(result);
    } else if (rc < 0) {
        run_set_state(idx, "error", "pipeline execution failed");
        inference_free(result);
    } else {
        inference_free(result);
        run_set_state(idx, "success", NULL);
    }

        /* Queue hygiene: ask ComfyUI to drop cached model weights BEFORE
     * handing the GPU ticket to the next queued job. */
    {
        char host[128] = "127.0.0.1";
        int port = 18465;
        const char *pp = strstr(free_url, "://");
        if (pp) {
            pp += 3;
            const char *colon = strchr(pp, ':');
            if (colon) {
                size_t hl = (size_t)(colon - pp);
                if (hl >= sizeof(host)) hl = sizeof(host) - 1;
                snprintf(host, hl + 1, "%s", pp);
                port = atoi(colon + 1);
            } else {
                snprintf(host, sizeof(host), "%s", pp);
            }
        }
        httplib::Client cli(host, (uint16_t)port);
        cli.set_connection_timeout(5);
        cli.set_read_timeout(120);
        auto fr = cli.Post("/free",
                           "{\"unload_models\":true,\"free_memory\":true}",
                           "application/json");
        fprintf(stderr, "[vram] comfy /free (%s:%d) -> %s\n", host, port,
                fr ? std::to_string(fr->status).c_str() : "no response");
    }

    /* GPU FIFO: release and wake next waiter, then mark the slot fully
     * drained so a registrar may recycle it (th_done gate, audit M2). */
    gpu_ticket_release();
    if (g_ws_server)
        ws_send_status(g_ws_server, gpu_queue_depth());
    run_mark_th_done(idx);
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

/* Write the generation-spec sidecar <out_dir>/_pipeline.json - the recovery
 * record. Everything needed to re-issue the run lives here: model, prompt,
 * seed, the exact pipeline YAML, and the live status (updated on every
 * run_set_state). /v1/pipelines/runs rebuilds the run list from these. */
static void run_write_sidecar(size_t idx) {
    pthread_mutex_lock(&g_runs_mu);
    char dir[512], rid[48], model[64], state[16], err[256];
    long seed = g_runs[idx].seed;
    long created = (long)g_runs[idx].created;
    snprintf(dir, sizeof(dir), "%s", g_runs[idx].out_dir);
    snprintf(rid, sizeof(rid), "%s", g_runs[idx].run_id);
    snprintf(model, sizeof(model), "%s", g_runs[idx].model);
    snprintf(state, sizeof(state), "%s", g_runs[idx].state);
    snprintf(err, sizeof(err), "%s", g_runs[idx].error);
    char *yamlq = json_quote(g_runs[idx].yaml);
    char *promptq = json_quote(g_runs[idx].prompt);
    char *errq = err[0] ? json_quote(err) : NULL;

    /* stages snapshot (per-stage state + attributed artifacts) */
    char stages_json[8192];
    {
        size_t so = 0;
        stages_json[so++] = '[';
        for (size_t s = 0; s < g_runs[idx].n_stages; s++) {
            run_stage *st = &g_runs[idx].stages[s];
            so += (size_t)snprintf(stages_json + so, sizeof(stages_json) - so,
                "%s{\"id\":\"%s\",\"name\":\"%s\",\"index\":%d,\"status\":\"%s\",\"artifacts\":[",
                s ? "," : "", st->id, st->id, (int)s, wire_state(st->state));
            for (size_t a = 0; a < st->n_arts; a++)
                so += (size_t)snprintf(stages_json + so,
                                      sizeof(stages_json) - so,
                                      "%s\"%s\"", a ? "," : "", st->arts[a]);
            so += (size_t)snprintf(stages_json + so, sizeof(stages_json) - so,
                                   "]}");
            if (so >= sizeof(stages_json) - 8) break;
        }
        stages_json[so++] = ']';
        stages_json[so] = 0;
    }
    pthread_mutex_unlock(&g_runs_mu);

    char path[600];
    snprintf(path, sizeof(path), "%s/_pipeline.json", dir);
    FILE *f = fopen(path, "w");
    if (!f) { free(yamlq); free(promptq); free(errq); return; }
    fprintf(f, "{\"run_id\":\"%s\",\"model\":\"%s\",\"prompt\":%s,"
               "\"seed\":%ld,\"created\":%ld,\"ended\":%ld,\"durationSec\":%ld,"
               "\"status\":\"%s\","
               "\"error\":%s,\"stages\":%s,\"yaml\":%s}",
            rid, model, promptq, seed, created, (long)time(NULL),
            (long)time(NULL) - created, state,
            errq ? errq : "null", stages_json, yamlq);
    fclose(f);
    free(yamlq); free(promptq); free(errq);
}

static void handle_pipelines_start(const httplib::Request &req,
                                   httplib::Response &res) {
    /* Wire shapes (parity with ray gateway):
     *   {pipeline:{steps:[...]}} - inline doc, single-step mapped to model
     *   {yaml:"name"}           - resolve pipeline YAML by name
     *   {route:true}            - 501 (routing not ported)
     *   {model,...}             - flat generation (default)
     */
    char model[64] = "krea-2", prompt[2048] = "", wf[512] = "";
    g_tl_nw = 0;
    long seed = -1;
    char yaml_override[4096] = "";
    const char *body = req.body.c_str();

    /* Shape: {route:true} -> 501 */
    if (strstr(body, "\"route\"") && strstr(body, "true")) {
        res.status = 501;
        res.set_content("{\"error\":\"Runner not yet ported (auto-route shape)\",\"shape\":\"route\"}", "application/json");
        return;
    }

    /* Shape: {yaml:"name"} -> resolve from pipelines dir */
    char yaml_name[256] = "";
    if (inf_json_string(body, "yaml", yaml_name, sizeof(yaml_name)) == 0 && yaml_name[0]) {
        for (const char *p = yaml_name; *p; p++)
            if (!((*p >= 'a' && *p <= 'z') || (*p >= '0' && *p <= '9') || *p == '-' || *p == '_')) {
                res.status = 400;
                res.set_content("{\"error\":\"invalid pipeline name\"}", "application/json");
                return;
            }
        char path[600];
        snprintf(path, sizeof(path), "../pipelines/%s/pipeline.yaml", yaml_name);
        FILE *fp = fopen(path, "rb");
        if (!fp) {
            res.status = 404;
            char err[300];
            snprintf(err, sizeof(err), "{\"error\":\"pipeline YAML not found: %s\"}", yaml_name);
            res.set_content(err, "application/json");
            return;
        }
        size_t n = fread(yaml_override, 1, sizeof(yaml_override) - 1, fp);
        fclose(fp);
        yaml_override[n] = 0;
        /* Extract model name from pipeline YAML */
        const char *nm = strstr(yaml_override, "name:");
        if (nm) {
            nm += 5;
            while (*nm == ' ') nm++;
            size_t i = 0;
            while (nm[i] && nm[i] != '\n' && i < sizeof(model) - 1) { model[i] = nm[i]; i++; }
            model[i] = 0;
        }
    }

    /* Shape: {pipeline:{steps:[...]}} -> extract first step family as model */
    if (strstr(body, "\"pipeline\"") && !yaml_override[0]) {
        const char *fam = strstr(body, "\"family\"");
        if (fam) {
            fam += 8;
            while (*fam == ' ' || *fam == ':' || *fam == '"') fam++;
            size_t i = 0;
            while (fam[i] && fam[i] != '"' && i < sizeof(model) - 1) { model[i] = fam[i]; i++; }
            model[i] = 0;
        }
    }


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
    /* Timeline studio shape: {model, calls:[...]} with no flat prompt -
     * compile the calls into window prompts (prompt..prompt4). */
    if (!prompt[0] && strstr(body, "\"calls\"")) {
        g_tl_nw = compile_calls_windows(body, g_tl_wins);
        if (g_tl_nw > 0) snprintf(prompt, sizeof(prompt), "%s", g_tl_wins[0]);
    }
    if (!prompt[0]) {
        res.status = 400;
        res.set_content("{\"error\":\"missing prompt\"}", "application/json");
        return;
    }
    if (!wf[0])
        snprintf(wf, sizeof(wf), "../pipelines/krea-txt2img/workflow.json");

    /* register the run */
    pthread_mutex_lock(&g_runs_mu);
    /* Find a slot: first terminal entry whose thread has fully drained,
     * else append. Never compact — it shifts indices and breaks runner
     * threads that hold old indices. th_done gates reuse: a terminal
     * state alone does not mean the thread stopped touching the slot
     * (a stopped run drains asynchronously). */
    size_t idx = (size_t)-1;
    for (size_t i = 0; i < g_n_runs; i++) {
        if ((strcmp(g_runs[i].state, "success") == 0 ||
             strcmp(g_runs[i].state, "error") == 0 ||
             strcmp(g_runs[i].state, "stopped") == 0) && g_runs[i].th_done) {
            idx = i;
            break;
        }
    }
    if (idx == (size_t)-1) {
        if (g_n_runs >= RUNREG_MAX) {
            pthread_mutex_unlock(&g_runs_mu);
            res.status = 503;
            res.set_content("run registry full", "text/plain");
            return;
        }
        idx = g_n_runs++;
    } else {
        run_slot_release_heap(idx);  /* drop any leaked inputs/prior */
    }
    snprintf(g_runs[idx].run_id, sizeof(g_runs[idx].run_id), "run-%lx-%lx",
             (unsigned long)time(NULL), (unsigned long)pthread_self());
    snprintf(g_runs[idx].state, sizeof(g_runs[idx].state), "queued");
    g_runs[idx].error[0] = 0;
    snprintf(g_runs[idx].out_dir, sizeof(g_runs[idx].out_dir), "./output/%s",
             g_runs[idx].run_id);
    g_runs[idx].created = time(NULL);
    snprintf(g_runs[idx].model, sizeof(g_runs[idx].model), "%s", model);
    snprintf(g_runs[idx].prompt, sizeof(g_runs[idx].prompt), "%s", prompt);
    g_runs[idx].seed = seed;
    g_runs[idx].stop_req = 0;
    g_runs[idx].th_done = 0;
    g_runs[idx].n_inputs = 0;
    g_runs[idx].n_stages = 0;
    g_runs[idx].n_prior = 0;
    g_runs[idx].start_from = 0;
    pthread_mutex_unlock(&g_runs_mu);

    /* the spec sidecar exists from the moment the run is registered */
    mkdir("./output", 0755);
    mkdir(g_runs[idx].out_dir, 0755);
    run_write_sidecar(idx);
    {   /* registration lands in the file ledger */
        char rb[400];
        snprintf(rb, sizeof(rb),
                 "{\"run_id\":\"%s\",\"model\":\"%s\",\"seed\":%ld}",
                 g_runs[idx].run_id, g_runs[idx].model, g_runs[idx].seed);
        ledger_log("run.registered", rb);
    }

    /* Harvested lane? execute the pinned pipeline with initial inputs
     * (prompt/lyrics/negative_prompt as text tensors, seed as f32) */
    char tmpin[2048];
    /* If yaml_override is set (from {yaml:name} or {pipeline} shape), use it directly */
    if (yaml_override[0]) {
        snprintf(g_runs[idx].yaml, sizeof(g_runs[idx].yaml), "%s", yaml_override);
        if (prompt[0]) add_run_input_text(idx, "prompt", prompt);
        if (inf_json_string(req.body.c_str(), "lyrics",
                            tmpin, sizeof(tmpin)) == 0 && tmpin[0])
            add_run_input_text(idx, "lyrics", tmpin);
        if (inf_json_string(req.body.c_str(), "negative_prompt",
                            tmpin, sizeof(tmpin)) == 0 && tmpin[0])
            add_run_input_text(idx, "negative_prompt", tmpin);
        if (seed >= 0) add_run_input_f32(idx, "seed", (float)seed);
        add_run_extra_inputs(idx, req.body.c_str(), tmpin, sizeof(tmpin));
    } else {
    char *piped = pipeline_yaml_for_model(model, g_runs[idx].yaml,
                                          sizeof(g_runs[idx].yaml));
    if (piped) {
        /* route artifacts into this run's dir: swap every out_dir literal */
        {
            char fixed[2048];
            size_t o = 0;
            const char *p = g_runs[idx].yaml;
            const char needle[] = "\"out_dir\":\"./output\"";
            while (*p && o < sizeof(fixed) - 128) {
                if (strncmp(p, needle, sizeof(needle) - 1) == 0) {
                    o += (size_t)snprintf(fixed + o, sizeof(fixed) - o,
                                          "\"out_dir\":\"%s\"",
                                          g_runs[idx].out_dir);
                    p += sizeof(needle) - 1;
                } else {
                    fixed[o++] = *p++;
                }
            }
            fixed[o] = 0;
            snprintf(g_runs[idx].yaml, sizeof(g_runs[idx].yaml), "%s", fixed);
        }
        if (prompt[0]) add_run_input_text(idx, "prompt", prompt);
        if (inf_json_string(req.body.c_str(), "lyrics",
                            tmpin, sizeof(tmpin)) == 0 && tmpin[0])
            add_run_input_text(idx, "lyrics", tmpin);
        if (inf_json_string(req.body.c_str(), "negative_prompt",
                            tmpin, sizeof(tmpin)) == 0 && tmpin[0])
            add_run_input_text(idx, "negative_prompt", tmpin);
        if (seed >= 0) add_run_input_f32(idx, "seed", (float)seed);
        if (inf_json_string(req.body.c_str(), "image",
                            tmpin, sizeof(tmpin)) == 0 && tmpin[0])
            add_run_input_text(idx, "image", tmpin);
        add_run_extra_inputs(idx, req.body.c_str(), tmpin, sizeof(tmpin));
    } else {
        /* legacy: compose a krea-style single-node YAML with baked injects */
        char *qp = json_quote(prompt);
        char seedclause[160] = "";
        if (seed >= 0)
            snprintf(seedclause, sizeof(seedclause),
                     ",\"KSampler.0.seed\":%ld", seed);
        snprintf(g_runs[idx].yaml, sizeof(g_runs[idx].yaml),
            "name: %s\n"
            "description: \"server-generated run\"\n"
            "nodes:\n"
            "  - id: generate\n"
            "    type: comfyui\n"
            "    params: {\"server_url\":\"http://127.0.0.1:18465\",\"workflow_file\":\"%s\",\"out_dir\":\"%s\",\"timeout_s\":300,\"inject\":{\"CLIPTextEncode.0.text\":%s%s}}\n",
            g_runs[idx].run_id, wf, g_runs[idx].out_dir, qp, seedclause);
        free(qp);
    }
    } /* end if(!yaml_override) */

    /* stage list comes from the final YAML (reported while queued too) */
    run_parse_stages(idx);

    run_thread_arg *ta = (run_thread_arg *)malloc(sizeof(*ta));
    ta->idx = idx;
    pthread_t th;
    if (pthread_create(&th, NULL, run_thread_fn, ta) != 0) {
        /* No thread will ever drain this slot: fail it loudly instead
         * of leaving a ghost "queued" entry (audit M2). */
        free(ta);
        pthread_mutex_lock(&g_runs_mu);
        run_slot_release_heap(idx);
        pthread_mutex_unlock(&g_runs_mu);
        run_set_state(idx, "error", "thread spawn failed");
        run_mark_th_done(idx);
        res.status = 503;
        res.set_content("{\"error\":\"thread spawn failed\"}",
                        "application/json");
        return;
    }
    pthread_detach(th);

    char out[256];
    snprintf(out, sizeof(out), "{\"run_id\":\"%s\",\"status\":\"queued\"}",
             g_runs[idx].run_id);
    res.status = 202;
    res.set_content(out, "application/json");
}

static void handle_queue(const httplib::Request &, httplib::Response &res) {
    pthread_mutex_lock(&g_runs_mu);
    int queued = 0, running = 0;
    char active_id[64] = "";
    for (size_t i = 0; i < g_n_runs; i++) {
        if (strcmp(g_runs[i].state, "queued") == 0) queued++;
        if (strcmp(g_runs[i].state, "running") == 0) {
            running++;
            snprintf(active_id, sizeof(active_id), "%s", g_runs[i].run_id);
        }
    }
    pthread_mutex_unlock(&g_runs_mu);
    char out[256];
    snprintf(out, sizeof(out),
        "{\"queued\":%d,\"running\":%d,\"active\":\"%s\"}",
        queued, running, active_id);
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
    /* stages snapshot for the response */
    char stages_json[8192];
    {
        size_t so = 0;
        stages_json[so++] = '[';
        for (size_t s = 0; s < g_runs[found].n_stages; s++) {
            run_stage *st = &g_runs[found].stages[s];
            so += (size_t)snprintf(stages_json + so, sizeof(stages_json) - so,
                "%s{\"id\":\"%s\",\"name\":\"%s\",\"index\":%d,\"status\":\"%s\"}",
                s ? "," : "", st->id, st->id, (int)s, wire_state(st->state));
            if (so >= sizeof(stages_json) - 8) break;
        }
        stages_json[so++] = ']';
        stages_json[so] = 0;
    }
    pthread_mutex_unlock(&g_runs_mu);

    char *arts = run_artifacts_json(outdir);
    size_t cap = strlen(arts) + strlen(stages_json) + 700;
    char *out = (char *)malloc(cap);
    snprintf(out, cap,
        "{\"run_id\":\"%s\",\"status\":\"%s\",\"stages\":%s,\"artifacts\":%s,\"error\":\"%s\"}",
        yamlhead, wire_state(state), stages_json, arts, err);
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

/* Aux draft tree: the ray-era draft files the editor cards still address.
 * Read-only data reuse (the JSON files are assets, like model weights) —
 * the ray SYSTEM is not running and is not needed. */
static const char *drafts_aux_dir(void) {
    const char *env = getenv("DRAFTS_AUX_DIR");
    return (env && *env) ? env
        : "/home/user/Documents/programs/ray/data/pipeline-drafts";
}

/* defined below (runs-list helper); needed early by the draft lister */


/* == Kinds lane (the fourth lane) ======================================

 * GET /v1/kinds - card kind BEHAVIOR FLAGS as data: the file stem IS the

 * kind string (persisted wire vocabulary). Sources: kinds dirs under

 * ../plugins/<plugin>/kinds and ./kinds. Wire contract mirrors the ray gateway

 * ({kinds:[{kind,runnable,executable,formSpec,compound,opensStudio,

 * badgeTone,icon?,plugin}]}) so the editor cardSeam store registers

 * runnability instead of rendering unknown kinds fail-safe (not runnable -

 * the Run/Re-run buttons die with it). */

static void kinds_parse_file(const char *path, const char *plugin,

                              std::string &out, int &n) {

    FILE *f = fopen(path, "rb");

    if (!f) return;

    char line[256];

    int runnable = 0, executable = 0, form_spec = 0, compound = 0, opens = 0;

    char tone[32] = "default", icon[64] = "";

    while (fgets(line, sizeof(line), f)) {

        char *nl = strchr(line, 10); if (nl) *nl = 0;

        char *v;

        if ((v = strstr(line, "runnable:")) == line) {

            runnable = strstr(v, "true") != NULL;

        } else if ((v = strstr(line, "executable:")) == line) {

            executable = strstr(v, "true") != NULL;

        } else if ((v = strstr(line, "formSpec:")) == line) {

            form_spec = strstr(v, "true") != NULL;

        } else if ((v = strstr(line, "compound:")) == line) {

            compound = strstr(v, "true") != NULL;

        } else if ((v = strstr(line, "opensStudio:")) == line) {

            opens = strstr(v, "true") != NULL;

        } else if ((v = strstr(line, "badgeTone:")) == line) {

            sscanf(v + 10, "%31s", tone);

        } else if ((v = strstr(line, "icon:")) == line) {

            sscanf(v + 5, "%63s", icon);

        }

    }

    fclose(f);

    const char *stem = strrchr(path, '/');

    stem = stem ? stem + 1 : path;

    char kind[96];

    snprintf(kind, sizeof(kind), "%s", stem);

    char *dot = strrchr(kind, '.');

    if (dot) *dot = 0;

    if (n++) out += ",";

    out += "{\"kind\":\"" + std::string(kind) + "\",\"runnable\":" +

           (runnable ? "true" : "false") + ",\"executable\":" +

           (executable ? "true" : "false") + ",\"formSpec\":" +

           (form_spec ? "true" : "false") + ",\"compound\":" +

           (compound ? "true" : "false") + ",\"opensStudio\":" +

           (opens ? "true" : "false") + ",\"badgeTone\":\"" + tone + "\"";

    if (icon[0]) out += ",\"icon\":\"" + std::string(icon) + "\"";

    out += ",\"plugin\":\"" + std::string(plugin) + "\"}";

}



static void handle_kinds(const httplib::Request &req,

                         httplib::Response &res) {

    std::string out = "{\"kinds\":[";

    int n = 0;

    const char *roots[2] = { "../plugins", "." };

    for (int r = 0; r < 2; r++) {

        DIR *[REDACTED 2026-11-05] = opendir(roots[r]);

        if (![REDACTED 2026-11-05]) continue;

        struct dirent *pe;

        while ((pe = readdir([REDACTED 2026-11-05])) != NULL) {

            if (pe->d_name[0] == '.') continue;

            char kd[512];

            snprintf(kd, sizeof(kd), "%s/%s/kinds", roots[r], pe->d_name);

            DIR *d = opendir(kd);

            if (!d) continue;

            struct dirent *e;

            while ((e = readdir(d)) != NULL) {

                size_t len = strlen(e->d_name);

                if (len < 6 || strcmp(e->d_name + len - 5, ".yaml") != 0) continue;

                char path[600];

                snprintf(path, sizeof(path), "%s/%s", kd, e->d_name);

                kinds_parse_file(path, pe->d_name, out, n);

            }

            closedir(d);

        }

        closedir([REDACTED 2026-11-05]);

    }

    out += "]}";

    res.set_content(out, "application/json");

}


static int sidecar_str(const char *json, const char *key, char *out, size_t cap);

/* Strict id charset — no path traversal from the wire. */
static int draft_id_ok(const std::string &id) {
    if (id.empty() || id.size() > 96) return 0;
    for (size_t i = 0; i < id.size(); i++) {
        char c = id[i];
        if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
              (c >= '0' && c <= '9') || c == '_' || c == '-')) return 0;
    }
    return 1;
}

/* GET /v1/pipelines/drafts/:id — one draft doc, verbatim bytes. */
static void handle_draft_get(const httplib::Request &req,
                             httplib::Response &res) {
    std::string id = req.path_params.at("id");
    if (!draft_id_ok(id)) {
        res.status = 400;
        res.set_content("{\"error\":\"bad id\"}", "application/json");
        return;
    }
    char path[512];
    snprintf(path, sizeof(path), "./drafts/%s.json", id.c_str());
    FILE *f = fopen(path, "rb");
    if (!f) {
        snprintf(path, sizeof(path), "%s/%s.json", drafts_aux_dir(), id.c_str());
        f = fopen(path, "rb");
    }
    if (!f) {
        res.status = 404;
        res.set_content("{\"error\":\"draft not found\"}", "application/json");
        return;
    }
    std::string body;
    char buf[65536];
    size_t n;
    while ((n = fread(buf, 1, sizeof(buf), f)) > 0) body.append(buf, n);
    fclose(f);
    res.set_content(body, "application/json");
}

/* GET /v1/pipelines/drafts — merged index (newest-first by mtime), with the
 * model/name strings when the doc carries them, so clients can map a run's
 * model (e.g. h3-timeline) to its draft. */
static void handle_draft_list(const httplib::Request &req,
                              httplib::Response &res) {
    (void)req;
    struct ent { char id[112]; long mt; char model[80]; char name[160]; };
    std::vector<ent> ents;
    const char *dirs[2] = { "./drafts", drafts_aux_dir() };
    for (int d = 0; d < 2; d++) {
        DIR *dr = opendir(dirs[d]);
        if (!dr) continue;
        struct dirent *e;
        while ((e = readdir(dr)) != NULL) {
            size_t L = strlen(e->d_name);
            if (L < 6 || L > 110 || strncmp(e->d_name + L - 5, ".json", 5) != 0)
                continue;
            char id[112], ppath[512];
            snprintf(id, sizeof(id), "%.*s", (int)(L - 5), e->d_name);
            if (!draft_id_ok(std::string(id))) continue;
            snprintf(ppath, sizeof(ppath), "%s/%s", dirs[d], e->d_name);
            struct stat st;
            if (stat(ppath, &st) != 0) continue;
            ent one = {};
            snprintf(one.id, sizeof(one.id), "%s", id);
            one.mt = (long)st.st_mtime;
            FILE *f = fopen(ppath, "rb");
            if (f) {
                char buf[8192] = "";
                size_t got = fread(buf, 1, sizeof(buf) - 1, f);
                fclose(f);
                buf[got] = 0;
                sidecar_str(buf, "model", one.model, sizeof(one.model));
                sidecar_str(buf, "name", one.name, sizeof(one.name));
            }
            ents.push_back(one);
        }
        closedir(dr);
    }
    std::sort(ents.begin(), ents.end(), [](const ent &a, const ent &b) {
        return a.mt > b.mt;
    });
    std::string out = "{\"count\":" + std::to_string(ents.size()) + ",\"drafts\":[";
    bool first = true;
    for (size_t i = 0; i < ents.size() && i < 600; i++) {
        char row[420];
        snprintf(row, sizeof(row),
                 "%s{\"draft_id\":\"%s\",\"model\":\"%s\",\"name\":\"%s\"}",
                 first ? "" : ",", ents[i].id, ents[i].model, ents[i].name);
        first = false;
        out += row;
    }
    out += "]}";
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

/* ---- DSH recovery surface: runs list, artifact tree, form-spec,
 *      async provisioning. The gallery/deck speak these verbatim. ---- */

/* minimal JSON string-field extraction from a sidecar we wrote ourselves */
static int sidecar_str(const char *json, const char *key, char *out, size_t cap) {
    char pat[64];
    snprintf(pat, sizeof(pat), "\"%s\":\"", key);
    const char *p = strstr(json, pat);
    if (!p) return -1;
    p += strlen(pat);
    size_t o = 0;
    while (*p && *p != '"' && o + 1 < cap) {
        if (*p == '\\' && p[1]) {
            p++;
            switch (*p) {
            case 'n': out[o++] = '\n'; break;
            case 'r': out[o++] = '\r'; break;
            case 't': out[o++] = '\t'; break;
            default:  out[o++] = *p;   break;   /* covers \" and \\ */
            }
            p++;
        } else {
            out[o++] = *p++;
        }
    }
    out[o] = 0;
    return 0;
}

static long sidecar_num(const char *json, const char *key, long dflt) {
    char pat[64];
    snprintf(pat, sizeof(pat), "\"%s\":", key);
    const char *p = strstr(json, pat);
    if (!p) return dflt;
    p += strlen(pat);
    return strtol(p, NULL, 10);
}

/* one thumbnail URL for a run dir: prefers the cached _previews/poster.jpg,
 * falls back to the first image file found */
static int run_thumbnail(const char *dir, char *out, size_t cap) {
    char poster[760];
    snprintf(poster, sizeof(poster), "%s/_poster.jpg", dir);
    struct stat pst;
    if (stat(poster, &pst) == 0) {
        snprintf(out, cap, "/editor/assets/runs/%s/_poster.jpg",
                 path_basename(dir));
        return 0;
    }
    char cmd[600];
    snprintf(cmd, sizeof(cmd), "ls -1 '%s' 2>/dev/null", dir);
    FILE *fp = popen(cmd, "r");
    if (!fp) return -1;
    char line[512];
    int found = -1;
    while (fgets(line, sizeof(line), fp)) {
        size_t ll = strlen(line);
        while (ll && (line[ll-1] == '\n' || line[ll-1] == '\r')) line[--ll] = 0;
        if (!ll) continue;
        if (strcmp(artifact_type(line), "image") == 0) {
            snprintf(out, cap, "/editor/assets/runs/%s/%s",
                     path_basename(dir), line);
            found = 0;
            break;
        }
    }
    pclose(fp);
    return found;
}

/* lazily build the small preview cache for a run dir: _previews/poster.jpg
 * (first video frame, else first image; ~480px wide jpeg, q4 — one ffmpeg
 * fork per run, cached on disk forever; no libwebp in this ffmpeg build). */
static void ensure_run_previews(const char *dir) {
    char poster[760];
    snprintf(poster, sizeof(poster), "%s/_poster.jpg", dir);
    struct stat st;
    if (stat(poster, &st) == 0) return;                 /* already cached */
    char cmd[700];
    snprintf(cmd, sizeof(cmd), "ls -1 '%s' 2>/dev/null", dir);
    FILE *fp = popen(cmd, "r");
    if (!fp) return;
    char line[512], video[1024] = "", image[1024] = "";
    while (fgets(line, sizeof(line), fp)) {
        size_t ll = strlen(line);
        while (ll && (line[ll-1] == '\n' || line[ll-1] == '\r')) line[--ll] = 0;
        if (!ll) continue;
        const char *t = artifact_type(line);
        if (strcmp(t, "video") == 0 && !video[0])
            snprintf(video, sizeof(video), "%s/%s", dir, line);
        else if (strcmp(t, "image") == 0 && !image[0])
            snprintf(image, sizeof(image), "%s/%s", dir, line);
    }
    pclose(fp);
    const char *src = video[0] ? video : image;
    if (!src[0]) return;
    char ff[1900];
    snprintf(ff, sizeof(ff),
        "ffmpeg -y -loglevel error -i '%s' -frames:v 1 -vf scale=480:-2 "
        "-q:v 4 '%s' >/dev/null 2>&1", src, poster);
    if (system(ff) != 0) unlink(poster);                /* failed: no poster */
}

typedef struct { char dir[64]; long created; } run_dir_ent;

static int rundir_cmp(const void *a, const void *b) {
    const run_dir_ent *x = (const run_dir_ent *)a;
    const run_dir_ent *y = (const run_dir_ent *)b;
    if (y->created > x->created) return 1;
    if (y->created < x->created) return -1;
    return 0;
}

/* GET /v1/pipelines/runs - gallery list, disk-scanned from ./output/run-*
 * sidecars: survives restarts; live status is mirrored into the sidecars
 * by run_set_state, so the disk is always current. */
static void handle_pipelines_runs(const httplib::Request &req,
                                  httplib::Response &res) {
    /* ?limit=N - clamp 1..500, default 200 (parity with ray gateway) */
    int limit = 200;
    if (req.has_param("limit")) {
        limit = atoi(req.get_param_value("limit").c_str());
        if (limit < 1) limit = 1;
        if (limit > 500) limit = 500;
    }
    run_dir_ent ents[256];
    size_t n = 0;
    DIR *d = opendir("./output");
    if (d) {
        struct dirent *e;
        while ((e = readdir(d)) != NULL && n < 256) {
            if (strncmp(e->d_name, "run-", 4) != 0) continue;
            char sd[640], buf[8192];
            snprintf(sd, sizeof(sd), "./output/%s/_pipeline.json", e->d_name);
            long created = 0;
            FILE *f = fopen(sd, "rb");
            if (f) {
                size_t got = fread(buf, 1, sizeof(buf) - 1, f);
                fclose(f);
                buf[got] = 0;
                created = sidecar_num(buf, "created", 0);
            }
            snprintf(ents[n].dir, sizeof(ents[n].dir), "%s", e->d_name);
            ents[n].created = created;
            n++;
        }
        closedir(d);
    }
    qsort(ents, n, sizeof(ents[0]), rundir_cmp);

    size_t cap = 16384, len = 0;
    char *out = (char *)malloc(cap);
    len += (size_t)snprintf(out + len, cap - len, "{\"count\":%zu,\"runs\":[", n);
    for (size_t i = 0; i < n && i < (size_t)limit; i++) {
        char dir[600], sd[640], buf[8192];
        snprintf(dir, sizeof(dir), "./output/%s", ents[i].dir);
        snprintf(sd, sizeof(sd), "%s/_pipeline.json", dir);
        char model[64] = "", prompt[2048] = "", status[16] = "unknown";
        long seed = -1, created = ents[i].created;
        FILE *f = fopen(sd, "rb");
        if (f) {
            size_t got = fread(buf, 1, sizeof(buf) - 1, f);
            fclose(f);
            buf[got] = 0;
            sidecar_str(buf, "model", model, sizeof(model));
            sidecar_str(buf, "prompt", prompt, sizeof(prompt));
            sidecar_str(buf, "status", status, sizeof(status));
            seed = sidecar_num(buf, "seed", -1);
            created = sidecar_num(buf, "created", created);
        } else {
            /* legacy run dir predating sidecars: report what exists */
            snprintf(status, sizeof(status), "success");
        }
        char thumb[600] = "";
        ensure_run_previews(dir);
        run_thumbnail(dir, thumb, sizeof(thumb));
        char *arts = run_artifacts_json(dir);
        char *promptq = json_quote(prompt);
        char *modelq = json_quote(model);
        while (len + strlen(arts) + strlen(promptq) + 1600 > cap) {
            cap *= 2; out = (char *)realloc(out, cap);
        }
        len += (size_t)snprintf(out + len, cap - len,
            "%s{\"run_id\":\"%s\",\"name\":%s,\"pipeline\":%s,"
            "\"status\":\"%s\",\"created_at\":%ld,\"prompt\":%s,"
            "\"seed\":%ld,\"thumbnail\":\"%s\",\"artifacts\":%s,"
            "\"params\":{\"seed\":%ld}}",
            i ? "," : "", ents[i].dir, modelq, modelq, status, created,
            promptq, seed, thumb, arts, seed);
        free(arts); free(promptq); free(modelq);
    }
    len += (size_t)snprintf(out + len, cap - len, "]}");
    res.set_content(out, "application/json");
    free(out);
}

/* GET /editor/assets/runs/<run_id>/<file> - the artifact media tree the
 * gallery + deck proxies stream from (path-traversal guarded). */
static void handle_asset(const httplib::Request &req, httplib::Response &res) {
    std::string rel = req.matches[1];
    if (rel.empty() || rel.find("..") != std::string::npos) {
        res.status = 400;
        res.set_content("{\"error\":\"bad path\"}", "application/json");
        return;
    }
    char path[1200];
    snprintf(path, sizeof(path), "./output/%s", rel.c_str());
    FILE *f = fopen(path, "rb");
    if (!f) {
        res.status = 404;
        res.set_content("{\"error\":\"artifact not found\"}",
                        "application/json");
        return;
    }
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    fseek(f, 0, SEEK_SET);
    const char *ctype = content_type_of(rel.c_str());
    res.set_content_provider((size_t)sz, ctype,
        [f](size_t offset, size_t length, httplib::DataSink &sink) {
            char chunk[65536];
            size_t want = length < sizeof(chunk) ? length : sizeof(chunk);
            fseek(f, (long)offset, SEEK_SET);
            size_t got = fread(chunk, 1, want, f);
            if (got > 0) sink.write(chunk, got);
            return true;
        },
        [f](bool) { fclose(f); });
}

/* GET /v1/form-spec?model=<id> - defaults + variants + the enhance recipe
 * (parsed from the unit's inference.yaml prompt_upscale block). */
static void handle_form_spec(const httplib::Request &req,
                             httplib::Response &res) {
    if (!g_catalog) {
        res.status = 500;
        res.set_content("{\"error\":\"no catalog loaded\"}",
                        "application/json");
        return;
    }
    std::string model = req.get_param_value("model");
    if (model.empty()) {
        res.status = 400;
        res.set_content("{\"error\":\"missing model param\"}",
                        "application/json");
        return;
    }
    const catalog_model *m = catalog_find_model(g_catalog, model.c_str());
    if (!m) {
        res.status = 404;
        res.set_content("{\"error\":\"model not found\"}",
                        "application/json");
        return;
    }

    /* enhance recipe: the prompt_upscale block of inference.yaml, verbatim */
    char recipe[4096] = "";
    if (m->inference_path) {
        FILE *f = fopen(m->inference_path, "rb");
        if (f) {
            char line[512];
            int in_block = 0;
            size_t o = 0;
            while (fgets(line, sizeof(line), f) != NULL &&
                   o + 600 < sizeof(recipe)) {
                if (strncmp(line, "prompt_upscale:", 15) == 0) {
                    in_block = 1;
                    continue;
                }
                if (in_block) {
                    if (line[0] != ' ' && line[0] != '#' && line[0] != '\t' &&
                        line[0] != '\n' && line[0] != 0)
                        break;                      /* next top-level key */
                    const char *p = line;
                    while (*p == ' ' || *p == '\t') p++;
                    size_t ll = strlen(p);
                    while (ll && (p[ll-1] == '\n' || p[ll-1] == '\r')) ll--;
                    if (ll) o += (size_t)snprintf(recipe + o,
                                                  sizeof(recipe) - o,
                                                  "%s%.*s", o ? "; " : "",
                                                  (int)ll, p);
                }
            }
            fclose(f);
        }
    }
    char *recipeq = json_quote(recipe);
    char *labelq = json_quote(m->label ? m->label : m->id);

    size_t cap = 8192 + strlen(recipeq) + strlen(labelq);
    char *out = (char *)malloc(cap);
    size_t len = 0;
    len += (size_t)snprintf(out + len, cap - len,
        "{\"model\":\"%s\",\"label\":%s,\"genre\":\"%s\","
        "\"engine\":\"%s\",\"defaults\":{",
        m->id, labelq, m->genre ? m->genre : "",
        m->engine_plugin ? m->engine_plugin : "");
    for (size_t i = 0; i < m->n_defaults; i++)
        len += (size_t)snprintf(out + len, cap - len, "%s\"%s\":\"%s\"",
                                i ? "," : "", m->default_keys[i],
                                m->default_vals[i]);
    len += (size_t)snprintf(out + len, cap - len, "},\"variants\":[");
    for (size_t g = 0; g < m->n_variant_groups; g++) {
        const catalog_variant_group *vg = &m->variant_groups[g];
        len += (size_t)snprintf(out + len, cap - len,
                                "%s{\"name\":\"%s\",\"options\":[",
                                g ? "," : "", vg->name ? vg->name : "");
        for (size_t o = 0; o < vg->n_options; o++)
            len += (size_t)snprintf(out + len, cap - len, "%s\"%s\"",
                                    o ? "," : "",
                                    vg->options[o].id ? vg->options[o].id : "");
        len += (size_t)snprintf(out + len, cap - len, "]}");
    }
    len += (size_t)snprintf(out + len, cap - len,
        "],\"features\":{},\"enhance_prompts\":{\"prompt\":%s}}", recipeq);
    res.set_content(out, "application/json");
    free(out); free(recipeq); free(labelq);
}



/* ==================================================================
 * SKILLS — progressive disclosure over markdown docs
 *
 * Tier 1 (index): GET /v1/skills        -> one cheap row per skill
 *                                          (id/name/description +
 *                                           genre/model when scoped)
 * Tier 2 (body):  GET /v1/skills/<id>   -> the full markdown body,
 *                                          loaded ONLY on demand
 *
 * Skill ids:
 *   <stem>              global lane doc   ./skills/<stem>.md or
 *                                         ../skills/<stem>.md
 *   model:<mid>         model card doc    <model>/agents/AGENT.md
 *   model:<mid>:<stem>  per-model skill   <model>/agents/skills/<stem>.md
 *
 * Every tier-2 read is ledgered (skill.read) so usage is auditable.
 * ================================================================== */

/* copy a frontmatter value [v, nl) into dst, trim + strip one quote pair */
static void fm_val(const char *v, const char *nl, char *dst, size_t cap) {
    while (*v == ' ') v++;
    size_t n = (size_t)(nl - v);
    if (n >= cap) n = cap - 1;
    memcpy(dst, v, n);
    dst[n] = 0;
    for (size_t i = strlen(dst); i > 0 && (dst[i-1] == ' ' || dst[i-1] == '\r'); i--)
        dst[i-1] = 0;
    size_t l = strlen(dst);
    if (l >= 2 && ((dst[0] == '"' && dst[l-1] == '"') ||
                   (dst[0] == '\'' && dst[l-1] == '\''))) {
        memmove(dst, dst + 1, l - 2);
        dst[l-2] = 0;
    }
}

/* parse --- frontmatter --- for name/description; 0 when a fence exists */
static int md_frontmatter(const char *path, char *name, size_t ncap,
                          char *desc, size_t dcap) {
    name[0] = 0; desc[0] = 0;
    FILE *f = fopen(path, "r");
    if (!f) return -1;
    char buf[8192];
    size_t got = fread(buf, 1, sizeof(buf) - 1, f);
    fclose(f);
    buf[got] = 0;
    if (strncmp(buf, "---", 3) != 0) return -1;
    char *end = strstr(buf + 3, "\n---");
    if (!end) return -1;
    char *p = buf + 3;
    while (p < end) {
        while (*p == '\n' || *p == '\r') p++;
        if (p >= end) break;
        char *nl = strchr(p, '\n');
        if (!nl || nl > end) nl = end;
        if (strncmp(p, "name:", 5) == 0 && name[0] == 0)
            fm_val(p + 5, nl, name, ncap);
        else if (strncmp(p, "description:", 12) == 0 && desc[0] == 0)
            fm_val(p + 12, nl, desc, dcap);
        if (nl == end) break;
        p = nl + 1;
    }
    return 0;
}

/* read a whole md file; return malloc'd BODY (frontmatter stripped) */
static char *md_body(const char *path) {
    FILE *f = fopen(path, "r");
    if (!f) return NULL;
    char *buf = (char *)malloc(512 * 1024);
    size_t got = fread(buf, 1, 512 * 1024 - 1, f);
    fclose(f);
    buf[got] = 0;
    if (strncmp(buf, "---", 3) == 0) {
        char *end = strstr(buf + 3, "\n---");
        if (end) {
            char *body = strchr(end + 4, '\n');
            if (body) {
                char *dup = strdup(body + 1);
                free(buf);
                return dup;
            }
        }
    }
    return buf;
}

/* append one index row; len advances; *first tracks the comma */
static size_t skills_row(char *out, size_t cap, size_t len, int *first,
                         const char *id, const char *name,
                         const char *desc, const char *genre,
                         const char *model) {
    char *nq = json_quote(name[0] ? name : id);
    char *dq = json_quote(desc);
    len += (size_t)snprintf(out + len, cap - len,
                            "%s{\"id\":\"%s\",\"name\":%s,"
                            "\"description\":%s",
                            *first ? "" : ",", id, nq, dq);
    if (genre && genre[0])
        len += (size_t)snprintf(out + len, cap - len,
                                ",\"genre\":\"%s\"", genre);
    if (model && model[0])
        len += (size_t)snprintf(out + len, cap - len,
                                ",\"model\":\"%s\"", model);
    len += (size_t)snprintf(out + len, cap - len, "}");
    *first = 0;
    free(nq); free(dq);
    return len;
}

static int skills_nested(char *dst, size_t cap, const char *dir,
                           const char *stem) {
    char p[900];
    snprintf(p, sizeof(p), "%s/%s/SKILL.md", dir, stem);
    FILE *fp = fopen(p, "r");
    if (!fp) return 0;
    fclose(fp);
    snprintf(dst, cap, "%s", p);
    return 1;
}

/* scan <dir>/*.md as global skills (id = file stem) */
static size_t skills_scan_global(char *out, size_t cap, size_t len, int *first,
                                 const char *dir) {
    DIR *d = opendir(dir);
    if (!d) return len;
    struct dirent *de;
    while ((de = readdir(d)) != NULL) {
        char stem[128];
        const char *e = strrchr(de->d_name, '.');
        if (e && strcasecmp(e, ".md") == 0) {
            size_t sl = (size_t)(e - de->d_name);
            if (sl >= sizeof(stem)) continue;
            memcpy(stem, de->d_name, sl);
            stem[sl] = 0;
        } else {
            size_t sl = strlen(de->d_name);
            if (sl == 0 || sl >= sizeof(stem)) continue;
            memcpy(stem, de->d_name, sl);
            stem[sl] = 0;
        }
        char idbuf[160];
        snprintf(idbuf, sizeof(idbuf), "\"id\":\"%s\"", stem);
        if (strstr(out, idbuf)) continue;   /* first dir wins */
        char path[600], name[128], desc[512];
        snprintf(path, sizeof(path), "%s/%s", dir, de->d_name);
        struct stat stb;
        if (stat(path, &stb) == 0 && S_ISDIR(stb.st_mode)) {
            /* nested skill bundle: <dir>/<stem>/SKILL.md */
            char nested[900];
            if (!skills_nested(nested, sizeof(nested), dir, stem)) continue;
            char nname[128], ndesc[512];
            char idn[160];
            snprintf(idn, sizeof(idn), "\"id\":\"%s\"", stem);
            if (strstr(out, idn)) continue;
            if (md_frontmatter(nested, nname, sizeof(nname), ndesc, sizeof(ndesc)) != 0)
                snprintf(nname, sizeof(nname), "%s", stem);
            len = skills_row(out, cap, len, first, stem, nname, ndesc, NULL, NULL);
            continue;
        }
        if (md_frontmatter(path, name, sizeof(name), desc, sizeof(desc)) != 0)
            snprintf(name, sizeof(name), "%s", stem);
        len = skills_row(out, cap, len, first, stem, name, desc, NULL, NULL);
    }
    closedir(d);
    return len;
}

/* GET /v1/skills — tier 1: the cheap index */
static void handle_skills_index(const httplib::Request &req,
                                httplib::Response &res) {
    (void)req;
    size_t cap = 64 * 1024, len = 0;
    char *out = (char *)malloc(cap);
    int first = 1;
    len += (size_t)snprintf(out + len, cap - len, "{\"skills\":[");
    if (g_catalog) {
        for (size_t i = 0; i < g_catalog->n_models; i++) {
            const catalog_model *m = &g_catalog->models[i];
            if (!m->id) continue;
            /* the model card doc (AGENT.md) */
            if (m->agent_md_path) {
                char name[128], desc[512];
                md_frontmatter(m->agent_md_path, name, sizeof(name),
                               desc, sizeof(desc));
                char idbuf[96];
                snprintf(idbuf, sizeof(idbuf), "model:%s", m->id);
                len = skills_row(out, cap, len, &first, idbuf,
                                 name[0] ? name : m->id, desc,
                                 m->genre ? m->genre : "", m->id);
            }
            /* per-model skill files: <agents>/skills/*.md */
            if (m->agent_md_path) {
                char sdir[600];
                size_t al = strlen(m->agent_md_path);
                size_t keep = al > 9 ? al - 9 : 0;   /* strip AGENT.md */
                snprintf(sdir, sizeof(sdir), "%.*s/skills", (int)keep,
                         m->agent_md_path);
                DIR *d = opendir(sdir);
                if (d) {
                    struct dirent *de;
                        while ((de = readdir(d)) != NULL) {
                            char stem[128];
                            const char *e = strrchr(de->d_name, '.');
                            if (e && strcasecmp(e, ".md") == 0) {
                                size_t sl = (size_t)(e - de->d_name);
                                if (sl >= sizeof(stem)) continue;
                                memcpy(stem, de->d_name, sl);
                                stem[sl] = 0;
                            } else {
                                size_t sl = strlen(de->d_name);
                                if (sl == 0 || sl >= sizeof(stem)) continue;
                                memcpy(stem, de->d_name, sl);
                                stem[sl] = 0;
                            }
                        char path[900], name[128], desc[512], idbuf[224];
                        snprintf(path, sizeof(path), "%s/%s", sdir, de->d_name);
                        struct stat stb;
                        if (stat(path, &stb) == 0 && S_ISDIR(stb.st_mode)) {
                            char nested[900];
                            if (!skills_nested(nested, sizeof(nested), sdir, stem)) continue;
                            char idn[224];
                            snprintf(idn, sizeof(idn), "\"id\":\"model:%s:%s\"", m->id, stem);
                            if (strstr(out, idn)) continue;
                            if (md_frontmatter(nested, name, sizeof(name), desc, sizeof(desc)) != 0)
                                snprintf(name, sizeof(name), "%s", stem);
                            snprintf(idbuf, sizeof(idbuf), "model:%s:%s", m->id, stem);
                            len = skills_row(out, cap, len, &first, idbuf, name, desc,
                                             m->genre ? m->genre : "", m->id);
                            continue;
                        }
                        snprintf(idbuf, sizeof(idbuf), "model:%s:%s",
                                 m->id, stem);
                        if (md_frontmatter(path, name, sizeof(name),
                                           desc, sizeof(desc)) != 0)
                            snprintf(name, sizeof(name), "%s", stem);
                        len = skills_row(out, cap, len, &first, idbuf,
                                         name, desc,
                                         m->genre ? m->genre : "", m->id);
                    }
                    closedir(d);
                }
            }
        }
    }
    len = skills_scan_global(out, cap, len, &first, "./skills");
    len = skills_scan_global(out, cap, len, &first, "../skills");
    len += (size_t)snprintf(out + len, cap - len, "]}");
    res.set_content(out, "application/json");
    free(out);
}

/* GET /v1/skills/<id> — tier 2: the full body, ledgered on read */
static void handle_skill_read(const httplib::Request &req,
                              httplib::Response &res) {
    std::string id = req.matches.size() > 1 ? req.matches[1].str() : "";
    if (id.empty() || id.find("..") != std::string::npos) {
        res.status = 400;
        res.set_content("{\"error\":\"bad skill id\"}", "application/json");
        return;
    }
    char path[900] = "";
    char genre[32] = "", model[64] = "";
    if (id.rfind("model:", 0) == 0) {
        std::string rest = id.substr(6);
        size_t c = rest.find(':');
        std::string mid = c == std::string::npos ? rest : rest.substr(0, c);
        std::string stem = c == std::string::npos ? "" : rest.substr(c + 1);
        const catalog_model *m =
            g_catalog ? catalog_find_model(g_catalog, mid.c_str()) : NULL;
        if (!m) {
            res.status = 404;
            res.set_content("{\"error\":\"unknown model\"}",
                            "application/json");
            return;
        }
        snprintf(model, sizeof(model), "%s", m->id ? m->id : "");
        snprintf(genre, sizeof(genre), "%s", m->genre ? m->genre : "");
        if (stem.empty()) {
            if (!m->agent_md_path) {
                res.status = 404;
                res.set_content("{\"error\":\"no agent doc for model\"}",
                                "application/json");
                return;
            }
            snprintf(path, sizeof(path), "%s", m->agent_md_path);
        } else {
            size_t al = m->agent_md_path ? strlen(m->agent_md_path) : 0;
            size_t keep = al > 9 ? al - 9 : 0;
            if (!al) {
                res.status = 404;
                res.set_content("{\"error\":\"no skill dir for model\"}",
                                "application/json");
                return;
            }
            char sdir2[600];
            snprintf(sdir2, sizeof(sdir2), "%.*s/skills", (int)keep,
                     m->agent_md_path);
            snprintf(path, sizeof(path), "%s/%s.md", sdir2, stem.c_str());
            FILE *np = fopen(path, "r");
            if (np) fclose(np);
            else {
                char nested[900];
                if (!skills_nested(nested, sizeof(nested), sdir2, stem.c_str())) {
                    /* keep flat path for the 404 message */
                } else snprintf(path, sizeof(path), "%s", nested);
            }
        }
    } else {
        snprintf(path, sizeof(path), "./skills/%s.md", id.c_str());
        FILE *probe = fopen(path, "r");
        if (probe) fclose(probe);
        else {
            char nested[900];
            if (skills_nested(nested, sizeof(nested), "./skills", id.c_str()))
                snprintf(path, sizeof(path), "%s", nested);
            else snprintf(path, sizeof(path), "../skills/%s.md", id.c_str());
        }
    }
    char name[128], desc[512];
    if (md_frontmatter(path, name, sizeof(name), desc, sizeof(desc)) != 0)
        name[0] = 0, desc[0] = 0;
    char *body = md_body(path);
    if (!body) {
        res.status = 404;
        res.set_content("{\"error\":\"skill not found\"}",
                        "application/json");
        return;
    }
    {   /* tier-2 reads are part of the audit trail */
        char lb[300];
        char *iq = json_quote(id.c_str());
        snprintf(lb, sizeof(lb), "{\"id\":%s}", iq);
        ledger_log("skill.read", lb);
        free(iq);
    }
    char *nq = json_quote(name);
    char *dq = json_quote(desc);
    char *bq = json_quote(body);
    size_t cap = strlen(bq) + strlen(dq) + strlen(nq) + 512;
    char *out = (char *)malloc(cap);
    snprintf(out, cap,
             "{\"id\":\"%s\",\"name\":%s,\"description\":%s,"
             "\"genre\":\"%s\",\"model\":\"%s\",\"content\":%s}",
             id.c_str(), nq, dq, genre, model, bq);
    res.set_content(out, "application/json");
    free(out); free(bq); free(dq); free(nq); free(body);
}

/* ==================================================================
 * FILE LEDGER — append-only activity journal at output/_ledger.jsonl
 *
 * One JSON object per line: {"ts":<epoch>,"event":"<name>,"data":{...}}.
 * Events: server.boot, run.registered, run.state, prov.state,
 * skill.read. The ledger is the SSOT for "what happened here":
 * /v1/ledger tails it for the agent, and boot recovery rebuilds the
 * in-memory provision table from it (restart-safe, like run sidecars).
 * ================================================================== */
static pthread_mutex_t g_ledger_mu = PTHREAD_MUTEX_INITIALIZER;

static void ledger_log(const char *event, const char *data_json) {
    pthread_mutex_lock(&g_ledger_mu);
    mkdir("./output", 0755);
    FILE *f = fopen("./output/_ledger.jsonl", "a");
    if (f) {
        fprintf(f, "{\"ts\":%ld,\"event\":\"%s\",\"data\":%s}\n",
                (long)time(NULL), event,
                data_json && data_json[0] ? data_json : "{}");
        fclose(f);   /* close-per-line keeps every event durable */
    }
    pthread_mutex_unlock(&g_ledger_mu);
}

/* ---- Provisioning: Manager-style async weight downloads ---- */

#define PROV_MAX 32
typedef struct {
    char model[64];
    char filename[256];
    char state[16];          /* queued|downloading|done|error */
    long enqueued;
} prov_job;

static prov_job g_prov[PROV_MAX];
static size_t g_n_prov = 0;
static pthread_mutex_t g_prov_mu = PTHREAD_MUTEX_INITIALIZER;

static void prov_set_state(const char *model, const char *filename,
                           const char *state) {
    pthread_mutex_lock(&g_prov_mu);
    for (size_t i = 0; i < g_n_prov; i++)
        if (strcmp(g_prov[i].model, model) == 0 &&
            strcmp(g_prov[i].filename, filename) == 0) {
            snprintf(g_prov[i].state, sizeof(g_prov[i].state), "%s", state);
            pthread_mutex_unlock(&g_prov_mu);
            /* every provision transition hits the file ledger */
            char pb[420];
            snprintf(pb, sizeof(pb),
                     "{\"model\":\"%s\",\"filename\":\"%s\",\"state\":\"%s\"}",
                     model, filename, state);
            ledger_log("prov.state", pb);
            return;
        }
    pthread_mutex_unlock(&g_prov_mu);
}

typedef struct { char model[64]; char filename[256]; } prov_arg;

static void *prov_thread_fn(void *argp) {
    prov_arg *a = (prov_arg *)argp;
    if (!g_download_cfg) g_download_cfg = download_config_create(NULL);
    const catalog_model *m = g_catalog ? catalog_find_model(g_catalog, a->model)
                                       : NULL;
    if (m) {
        prov_set_state(a->model, a->filename, "downloading");
        download_ws_progress ctx = {"prov"};
        int rc = download_model(g_download_cfg, &m->source, a->filename,
                                download_progress_ws, &ctx);
        prov_set_state(a->model, a->filename, rc < 0 ? "error" : "done");
    } else {
        prov_set_state(a->model, a->filename, "error");
    }
    free(a);
    return NULL;
}

/* POST /v1/models/provision {model, variant?} - queue the download,
 * answer immediately with the Manager-shaped verdict. */
static void handle_provision(const httplib::Request &req,
                             httplib::Response &res) {
    if (!g_catalog) {
        res.status = 500;
        res.set_content("{\"error\":\"no catalog loaded\"}",
                        "application/json");
        return;
    }
    char model[64] = "", variant[64] = "";
    inf_json_string(req.body.c_str(), "model", model, sizeof(model));
    inf_json_string(req.body.c_str(), "variant", variant, sizeof(variant));
    if (!model[0]) {
        res.status = 400;
        res.set_content("{\"error\":\"missing model\"}", "application/json");
        return;
    }
    const catalog_model *m = catalog_find_model(g_catalog, model);
    if (!m) {
        res.status = 404;
        char out[256];
        snprintf(out, sizeof(out), "{\"error\":\"unknown model: %s\"}",
                 model);
        res.set_content(out, "application/json");
        return;
    }
    if (!m->source.type || strcmp(m->source.type, "builtin") == 0) {
        res.status = 422;
        char out[300];
        snprintf(out, sizeof(out),
                 "{\"error\":\"model %s declares no downloadable source\"}",
                 model);
        res.set_content(out, "application/json");
        return;
    }

    char fn[256];
    if (m->source.filename)
        snprintf(fn, sizeof(fn), "%s", m->source.filename);
    else
        snprintf(fn, sizeof(fn), "%s.gguf", m->id);
    /* the YAML parser keeps surrounding quotes on scalars - strip them */
    {
        size_t fl = strlen(fn);
        if (fl >= 2 && fn[0] == '"' && fn[fl-1] == '"') {
            memmove(fn, fn + 1, fl - 2);
            fn[fl-2] = 0;
        }
    }
    /* {variant} template: use the requested variant, else the first
     * declared option (the catalog's default pick) */
    if (strstr(fn, "{variant}")) {
        if (!variant[0] && m->n_variant_groups > 0 &&
            m->variant_groups[0].n_options > 0 &&
            m->variant_groups[0].options[0].id)
            snprintf(variant, sizeof(variant), "%s",
                     m->variant_groups[0].options[0].id);
        if (variant[0]) {
            /* an option matching the variant may carry its own exact
             * filename - that beats the source template */
            const char *exact = NULL;
            for (size_t g = 0; g < m->n_variant_groups && !exact; g++) {
                for (size_t o = 0; o < m->variant_groups[g].n_options; o++) {
                    const catalog_variant_option *op =
                        &m->variant_groups[g].options[o];
                    if (op->id && op->filename && op->filename[0] &&
                        strcmp(op->id, variant) == 0)
                        exact = op->filename;
                }
            }
            if (exact) {
                snprintf(fn, sizeof(fn), "%s", exact);
                size_t fl = strlen(fn);
                if (fl >= 2 && fn[0] == '"' && fn[fl-1] == '"') {
                    memmove(fn, fn + 1, fl - 2);
                    fn[fl-2] = 0;
                }
            } else {
                char *p = strstr(fn, "{variant}");
                char tail[256];
                snprintf(tail, sizeof(tail), "%s%s", variant, p + 9);
                *p = 0;
                snprintf(fn + strlen(fn), sizeof(fn) - strlen(fn), "%s", tail);
            }
        } else {
            res.status = 422;
            res.set_content("{\"error\":\"variant required but none declared\"}",
                            "application/json");
            return;
        }
    }

    if (!g_download_cfg) g_download_cfg = download_config_create(NULL);
    char *cache = download_cache_path(g_download_cfg, fn);

    pthread_mutex_lock(&g_prov_mu);
    size_t row = (size_t)-1;
    for (size_t i = 0; i < g_n_prov; i++)
        if (strcmp(g_prov[i].model, model) == 0 &&
            strcmp(g_prov[i].filename, fn) == 0) { row = i; break; }
    if (row != (size_t)-1 &&
        (strcmp(g_prov[row].state, "queued") == 0 ||
         strcmp(g_prov[row].state, "downloading") == 0)) {
        /* Dedup: one live download per model+filename. A second thread
         * would race the first on the same target file (audit M1). */
        pthread_mutex_unlock(&g_prov_mu);
        char out[900];
        snprintf(out, sizeof(out),
            "{\"queued\":true,\"model\":\"%s\",\"variant\":\"%s\","
            "\"manager\":{\"accepted\":true,\"worker_kicked\":false,"
            "\"status\":\"already downloading\"},"
            "\"payload\":{\"filename\":\"%s\",\"save_path\":\"%s\"}}",
            model, variant, fn, cache ? cache : "");
        res.set_content(out, "application/json");
        free(cache);
        return;
    }
    if (row == (size_t)-1) {
        if (g_n_prov >= PROV_MAX) {
            /* Honest refusal: previously the row was silently dropped
             * but the download still ran, invisible to /status. */
            pthread_mutex_unlock(&g_prov_mu);
            free(cache);
            res.status = 503;
            res.set_content("{\"error\":\"provision table full\"}",
                            "application/json");
            return;
        }
        row = g_n_prov++;
    }
    snprintf(g_prov[row].model, sizeof(g_prov[0].model), "%s", model);
    snprintf(g_prov[row].filename, sizeof(g_prov[0].filename), "%s", fn);
    snprintf(g_prov[row].state, sizeof(g_prov[0].state), "queued");
    g_prov[row].enqueued = (long)time(NULL);
    pthread_mutex_unlock(&g_prov_mu);

    prov_arg *a = (prov_arg *)malloc(sizeof(*a));
    snprintf(a->model, sizeof(a->model), "%s", model);
    snprintf(a->filename, sizeof(a->filename), "%s", fn);
    pthread_t th;
    if (pthread_create(&th, NULL, prov_thread_fn, a) != 0) {
        free(a);
        prov_set_state(model, fn, "error");
        free(cache);
        res.status = 503;
        res.set_content("{\"error\":\"thread spawn failed\"}",
                        "application/json");
        return;
    }
    pthread_detach(th);

    char out[900];
    snprintf(out, sizeof(out),
        "{\"queued\":true,\"model\":\"%s\",\"variant\":\"%s\","
        "\"manager\":{\"accepted\":true,\"worker_kicked\":true,"
        "\"status\":\"download queued\"},"
        "\"payload\":{\"filename\":\"%s\",\"save_path\":\"%s\"}}",
        model, variant, fn, cache ? cache : "");
    res.set_content(out, "application/json");
    free(cache);
}

/* GET /v1/models/provision/status - the queue snapshot */
static void handle_provision_status(const httplib::Request &req,
                                    httplib::Response &res) {
    (void)req;
    size_t cap = 16384, len = 0;
    char *out = (char *)malloc(cap);
    if (!out) { res.status = 500; return; }
    len += (size_t)snprintf(out + len, cap - len, "{\"jobs\":[");
    pthread_mutex_lock(&g_prov_mu);
    for (size_t i = 0; i < g_n_prov; i++) {
        /* Build each row in a bounded local buffer and check fit BEFORE
         * touching out: feeding snprintf's return straight into len lets
         * len pass cap, after which cap - len underflows and out + len
         * writes past the heap block (audit H3). */
        char row[640];
        int rl = snprintf(row, sizeof(row),
            "%s{\"model\":\"%s\",\"filename\":\"%s\","
            "\"state\":\"%s\",\"enqueued\":%ld}",
            i ? "," : "", g_prov[i].model, g_prov[i].filename,
            g_prov[i].state, g_prov[i].enqueued);
        if (len + (size_t)rl + 3 >= cap) break;  /* room for "]}"+NUL */
        memcpy(out + len, row, (size_t)rl + 1);
        len += (size_t)rl;
    }
    pthread_mutex_unlock(&g_prov_mu);
    len += (size_t)snprintf(out + len, cap - len, "]}");
    res.set_content(out, "application/json");
    free(out);
}

/* ---- Ledger boot + tail ---- */

/* boot: rebuild the provision table from the ledger (last state per
 * model+filename wins) so /v1/models/provision/status survives restarts,
 * then stamp server.boot. Called once at serve start; reads silently. */
static void ledger_boot(void) {
    FILE *f = fopen("./output/_ledger.jsonl", "r");
    if (f) {
        struct prov_last {
            char model[64];
            char filename[256];
            char state[16];
        } last[PROV_MAX];
        size_t n_last = 0;
        char line[1024];
        while (fgets(line, sizeof(line), f)) {
            if (!strstr(line, "\"event\":\"prov.state\""))
                continue;
            char model[64] = "", filename[256] = "", state[16] = "";
            sidecar_str(line, "model", model, sizeof(model));
            sidecar_str(line, "filename", filename, sizeof(filename));
            sidecar_str(line, "state", state, sizeof(state));
            if (!model[0] || !filename[0] || !state[0])
                continue;
            size_t k;
            for (k = 0; k < n_last; k++)
                if (strcmp(last[k].model, model) == 0 &&
                    strcmp(last[k].filename, filename) == 0)
                    break;
            if (k == n_last && n_last < PROV_MAX)
                n_last++;
            if (k < n_last) {
                snprintf(last[k].model, sizeof(last[k].model), "%s", model);
                snprintf(last[k].filename, sizeof(last[k].filename), "%s",
                         filename);
                snprintf(last[k].state, sizeof(last[k].state), "%s", state);
            }
        }
        fclose(f);
        pthread_mutex_lock(&g_prov_mu);
        for (size_t k = 0; k < n_last; k++) {
            size_t j;
            for (j = 0; j < g_n_prov; j++)
                if (strcmp(g_prov[j].model, last[k].model) == 0 &&
                    strcmp(g_prov[j].filename, last[k].filename) == 0)
                    break;
            if (j == g_n_prov && g_n_prov < PROV_MAX)
                g_n_prov++;
            if (j < g_n_prov) {
                snprintf(g_prov[j].model, sizeof(g_prov[j].model), "%s",
                         last[k].model);
                snprintf(g_prov[j].filename, sizeof(g_prov[j].filename), "%s",
                         last[k].filename);
                snprintf(g_prov[j].state, sizeof(g_prov[j].state), "%s",
                         last[k].state);
                g_prov[j].enqueued = 0;   /* recovered, not live-queued */
            }
        }
        pthread_mutex_unlock(&g_prov_mu);
    }
    {   /* the boot stamp anchors the timeline for ledger readers */
        char pb[96];
        snprintf(pb, sizeof(pb), "{\"pid\":%ld}", (long)getpid());
        ledger_log("server.boot", pb);
    }
}

/* GET /v1/ledger?limit=N&event=prefix - tail of the append-only journal.
 * Entries come back oldest -> newest within the tail. */
static void handle_ledger(const httplib::Request &req,
                          httplib::Response &res) {
    long limit = 50;
    if (req.has_param("limit")) {
        char *e = NULL;
        long v = strtol(req.get_param_value("limit").c_str(), &e, 10);
        if (e && *e == 0 && v > 0)
            limit = v;
    }
    if (limit > 500)
        limit = 500;
    char ev[64] = "";
    if (req.has_param("event"))
        snprintf(ev, sizeof(ev), "%s", req.get_param_value("event").c_str());

    FILE *f = fopen("./output/_ledger.jsonl", "r");
    if (!f) {
        res.set_content("{\"entries\":[],\"shown\":0,\"matched\":0}",
                        "application/json");
        return;
    }
    char(*ring)[1024] = (char(*)[1024])calloc((size_t)limit, sizeof(*ring));
    if (!ring) {
        fclose(f);
        res.status = 500;
        res.set_content("{\"error\":\"oom\"}", "application/json");
        return;
    }
    char needle[96], line[1024];
    snprintf(needle, sizeof(needle), "\"event\":\"%s", ev);
    size_t n = 0, total = 0;
    while (fgets(line, sizeof(line), f)) {
        if (ev[0] && !strstr(line, needle))
            continue;
        total++;
        snprintf(ring[n % (size_t)limit], 1024, "%s", line);
        size_t l = strlen(ring[n % (size_t)limit]);
        if (l && ring[n % (size_t)limit][l - 1] == '\n')
            ring[n % (size_t)limit][l - 1] = 0;
        n++;
    }
    fclose(f);
    size_t shown = n < (size_t)limit ? n : (size_t)limit;
    size_t cap = 128 + shown * 1100;
    char *out = (char *)malloc(cap);
    size_t len = (size_t)snprintf(out, cap, "{\"entries\":[");
    for (size_t i = 0; i < shown; i++) {
        size_t idx = (n - shown + i) % (size_t)limit;
        len += (size_t)snprintf(out + len, cap - len, "%s%s",
                                i ? "," : "", ring[idx]);
    }
    len += (size_t)snprintf(out + len, cap - len,
                            "],\"shown\":%zu,\"matched\":%zu}", shown, total);
    res.set_content(out, "application/json");
    free(out);
    free(ring);
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

            char status[96];
            snprintf(status, sizeof(status),
                     "event: status\ndata: {\"queue_remaining\":%d}\n\n",
                     gpu_queue_depth());
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



static void handle_pipelines_stop(const httplib::Request &req,
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
    char state[16];
    snprintf(state, sizeof(state), "%s", g_runs[found].state);
    pthread_mutex_unlock(&g_runs_mu);

    if (strcmp(state, "queued") == 0 || strcmp(state, "running") == 0) {
        /* Set stop_req and re-read the CURRENT state inside ONE critical
         * section (audit H2). run_thread_fn flips queued->running under
         * g_runs_mu only while stop_req == 0, so:
         *   still "queued"     -> the thread is guaranteed to take the
         *                        stopped path at the ticket head; calling
         *                        runner_request_stop now would kill the
         *                        WRONG (currently running) run;
         *   already "running"  -> the cooperative stop below lands at
         *                        the next node boundary;
         *   terminal in between-> nothing left to stop. */
        pthread_mutex_lock(&g_runs_mu);
        g_runs[found].stop_req = 1;
        char now[16];
        snprintf(now, sizeof(now), "%s", g_runs[found].state);
        pthread_mutex_unlock(&g_runs_mu);
        if (strcmp(now, "running") == 0) {
            runner_request_stop(g_server_runner);
        } else if (strcmp(now, "queued") == 0) {
            /* Responsive UX: mark it now; the thread re-affirms when it
             * drains. Slot reuse is gated on th_done, so no registrar
             * can recycle this slot under the live thread. */
            run_set_state(found, "stopped", NULL);
        }
        char out[128];
        snprintf(out, sizeof(out), "{\"run_id\":\"%s\",\"status\":\"stopped\"}",
                 rid.c_str());
        res.set_content(out, "application/json");
    } else {
        res.status = 400;
        char out[200];
        snprintf(out, sizeof(out),
                 "{\"error\":\"cannot stop run in state %s\"}", state);
        res.set_content(out, "application/json");
    }
}

/* ---- COMPOSE (dry-run) handler ---- */
static void handle_compose(const httplib::Request &req,
                           httplib::Response &res) {
    char model[64] = "krea-2";
    char body_tmp[2048] = "";
    if (req.body.size() < sizeof(body_tmp))
        snprintf(body_tmp, sizeof(body_tmp), "%s", req.body.c_str());
    char tmp[256];
    if (inf_json_string(body_tmp, "model", tmp, sizeof(tmp)) == 0)
        snprintf(model, sizeof(model), "%s", tmp);

    char yaml_buf[4096] = "";
    char *piped = pipeline_yaml_for_model(model, yaml_buf, sizeof(yaml_buf));
    if (!piped) {
        res.status = 404;
        char err[200];
        snprintf(err, sizeof(err),
                 "{\"error\":\"no pipeline for model: %s\"}", model);
        res.set_content(err, "application/json");
        return;
    }
    /* Extract workflow_file value: find the key:value pair in the embedded JSON */
    char wf_path[512] = "";
    const char *marker = strstr(yaml_buf, "workflow_file\"");
    if (marker) {
        /* Walk past the key and its closing quote, find the colon, then the value opening quote */
        const char *val_start = strchr(marker, ':');
        if (val_start) {
            val_start++; /* skip ':' */
            while (*val_start == ' ') val_start++; /* skip whitespace */
            if (*val_start == '"') {
                val_start++; /* skip opening quote */
                size_t i = 0;
                while (*val_start && *val_start != '"' && i < sizeof(wf_path) - 1) {
                    wf_path[i++] = *val_start++;
                }
                wf_path[i] = 0;
            }
        }
    }
    if (!wf_path[0]) {
        res.status = 404;
        res.set_content("{\"error\":\"no workflow_file in pipeline\"}", "application/json");
        return;
    }
    FILE *fp = fopen(wf_path, "rb");
    if (!fp) {
        res.status = 404;
        char err[300];
        snprintf(err, sizeof(err),
                 "{\"error\":\"workflow not found: %s\"}", wf_path);
        res.set_content(err, "application/json");
        return;
    }
    fseek(fp, 0, SEEK_END);
    long fsize = ftell(fp);
    fseek(fp, 0, SEEK_SET);
    char *json = (char *)malloc(fsize + 1);
    (void)fread(json, 1, fsize, fp);
    json[fsize] = 0;
    fclose(fp);

    size_t rlen = strlen(json) + 200;
    char *resp = (char *)malloc(rlen);
    snprintf(resp, rlen,
             "{\"model\":\"%s\",\"status\":\"dry_run\",\"workflow\":%s}",
             model, json);
    free(json);
    res.set_content(resp, "application/json");
    free(resp);
}


/* ---- RESUME handler ---- */
static void handle_pipelines_resume(const httplib::Request &req,
                                    httplib::Response &res) {
    std::string rid = req.path_params.at("run_id");
    /* Find the stopped run's sidecar to get the spec */
    char sidecar_path[600];
    snprintf(sidecar_path, sizeof(sidecar_path), "./output/%s/_pipeline.json",
             rid.c_str());
    FILE *fp = fopen(sidecar_path, "rb");
    if (!fp) {
        res.status = 404;
        res.set_content("{\"error\":\"run sidecar not found\"}", "application/json");
        return;
    }
    fseek(fp, 0, SEEK_END);
    long fsize = ftell(fp);
    fseek(fp, 0, SEEK_SET);
    char *spec = (char *)malloc(fsize + 1);
    (void)fread(spec, 1, fsize, fp);
    spec[fsize] = 0;
    fclose(fp);

    /* Extract model, prompt, seed, yaml from the sidecar */
    char model[64] = "", prompt[2048] = "", yaml_buf[4096] = "";
    long seed = -1;
    inf_json_string(spec, "model", model, sizeof(model));
    inf_json_string(spec, "prompt", prompt, sizeof(prompt));
    seed = inf_json_int(spec, "seed", -1);
    inf_json_string(spec, "yaml", yaml_buf, sizeof(yaml_buf));
    /* copy the stages array out so spec can be freed now (error paths
     * below must not leak it) */
    char stages_buf[8192] = "";
    {
        const char *sp = strstr(spec, "\"stages\":[");
        if (sp) {
            const char *se = strchr(sp + 9, ']');
            if (se) {
                size_t L = (size_t)(se - sp + 1);
                if (L >= sizeof(stages_buf)) L = sizeof(stages_buf) - 1;
                snprintf(stages_buf, L + 1, "%.*s", (int)L, sp);
            }
        }
    }
    free(spec);

    if (!model[0]) {
        res.status = 400;
        res.set_content("{\"error\":\"cannot resume: no model in sidecar\"}",
                        "application/json");
        return;
    }

    /* Register a new run with the same spec. Same slot policy as
     * handle_pipelines_run: reuse a fully-drained terminal slot, else
     * append. NEVER compact — compaction shifts g_runs indices under
     * threads parked on the GPU ticket and under executing runs
     * (audit C1). */
    pthread_mutex_lock(&g_runs_mu);
    size_t idx = (size_t)-1;
    for (size_t i = 0; i < g_n_runs; i++) {
        if ((strcmp(g_runs[i].state, "success") == 0 ||
             strcmp(g_runs[i].state, "error") == 0 ||
             strcmp(g_runs[i].state, "stopped") == 0) && g_runs[i].th_done) {
            idx = i;
            break;
        }
    }
    if (idx == (size_t)-1) {
        if (g_n_runs >= RUNREG_MAX) {
            pthread_mutex_unlock(&g_runs_mu);
            res.status = 503;
            res.set_content("{\"error\":\"run registry full\"}",
                            "application/json");
            return;
        }
        idx = g_n_runs++;
    } else {
        run_slot_release_heap(idx);  /* drop any leaked inputs/prior */
    }
    snprintf(g_runs[idx].run_id, sizeof(g_runs[idx].run_id), "run-%lx-%lx",
             (unsigned long)time(NULL), (unsigned long)pthread_self());
    snprintf(g_runs[idx].state, sizeof(g_runs[idx].state), "queued");
    g_runs[idx].error[0] = 0;
    snprintf(g_runs[idx].out_dir, sizeof(g_runs[idx].out_dir), "./output/%s",
             g_runs[idx].run_id);
    g_runs[idx].created = time(NULL);
    snprintf(g_runs[idx].model, sizeof(g_runs[idx].model), "%s", model);
    snprintf(g_runs[idx].prompt, sizeof(g_runs[idx].prompt), "%s", prompt);
    g_runs[idx].seed = seed;
    g_runs[idx].stop_req = 0;
    g_runs[idx].th_done = 0;
    g_runs[idx].n_inputs = 0;
    g_runs[idx].n_stages = 0;
    g_runs[idx].n_prior = 0;
    g_runs[idx].start_from = 0;
    pthread_mutex_unlock(&g_runs_mu);

    mkdir("./output", 0755);
    mkdir(g_runs[idx].out_dir, 0755);
    run_write_sidecar(idx);
    { char rb[400];
      snprintf(rb, sizeof(rb),
               "{\"run_id\":\"%s\",\"model\":\"%s\",\"seed\":%ld}",
               g_runs[idx].run_id, g_runs[idx].model, g_runs[idx].seed);
      ledger_log("run.registered", rb); }

    /* Use saved YAML or resolve from model */
    char tmpin[2048];
    if (yaml_buf[0]) {
        snprintf(g_runs[idx].yaml, sizeof(g_runs[idx].yaml), "%s", yaml_buf);
    } else {
        char *piped = pipeline_yaml_for_model(model, g_runs[idx].yaml,
                                              sizeof(g_runs[idx].yaml));
        if (!piped) {
            /* Fail the registered run instead of leaving a ghost
             * "queued" entry with no thread behind it (audit M2). */
            pthread_mutex_lock(&g_runs_mu);
            run_slot_release_heap(idx);
            pthread_mutex_unlock(&g_runs_mu);
            run_set_state(idx, "error", "no pipeline for model");
            run_mark_th_done(idx);
            res.status = 400;
            res.set_content("{\"error\":\"cannot resume: no pipeline for model\"}",
                            "application/json");
            return;
        }
    }
    if (prompt[0]) add_run_input_text(idx, "prompt", prompt);
    if (inf_json_string(req.body.c_str(), "lyrics",
                        tmpin, sizeof(tmpin)) == 0 && tmpin[0])
        add_run_input_text(idx, "lyrics", tmpin);
    if (inf_json_string(req.body.c_str(), "negative_prompt",
                        tmpin, sizeof(tmpin)) == 0 && tmpin[0])
        add_run_input_text(idx, "negative_prompt", tmpin);
    if (seed >= 0) add_run_input_f32(idx, "seed", (float)seed);

    /* stage list from the (possibly saved) YAML */
    run_parse_stages(idx);

    /* start_from: resume from topo index N (default 0 = re-run everything).
     * Stages before N with recorded artifacts in the ORIGINAL run's dir
     * are injected as prior outputs so the runner can skip them. */
    int start_from = inf_json_int(req.body.c_str(), "start_from", 0);
    if (start_from < 0) start_from = 0;
    if (start_from > 0 && stages_buf[0]) {
        const char *cur = stages_buf;
        if (cur) {
            cur += 10;
            int stage_i = 0;
            while (*cur == '{' && stage_i < start_from) {
                char sid[64] = "";
                const char *idp = strstr(cur, "\"id\":\"");
                const char *objend = strchr(cur, '}');
                if (!objend) break;
                if (idp && idp < objend) {
                    idp += 6;
                    size_t L = 0;
                    while (idp[L] && idp[L] != '"' && L < sizeof(sid) - 1) L++;
                    snprintf(sid, sizeof(sid), "%.*s", (int)L, idp);
                }
                /* artifacts recorded for this stage */
                const char *arts = strstr(cur, "\"artifacts\":[");
                if (sid[0] && arts && arts < objend) {
                    arts += 14;
                    int art_i = 0;
                    while (*arts == '"' && g_runs[idx].n_prior < RUN_PRIOR_MAX) {
                        char aname[192];
                        size_t L = 0;
                        arts++;
                        while (arts[L] && arts[L] != '"' &&
                               L < sizeof(aname) - 1) L++;
                        snprintf(aname, sizeof(aname), "%.*s", (int)L, arts);
                        arts += L;
                        if (*arts == '"') arts++;
                        while (*arts == ',' || *arts == ' ') arts++;
                        /* load the bytes from the ORIGINAL run dir */
                        char apath[900];
                        snprintf(apath, sizeof(apath), "./output/%s/%s",
                                 rid.c_str(), aname);
                        FILE *af = fopen(apath, "rb");
                        if (af) {
                            fseek(af, 0, SEEK_END);
                            long asz = ftell(af);
                            fseek(af, 0, SEEK_SET);
                            char *abytes = (char *)malloc(asz > 0 ? asz : 1);
                            (void)fread(abytes, 1, asz, af);
                            fclose(af);
                            size_t pi = g_runs[idx].n_prior++;
                            snprintf(g_runs[idx].prior[pi].node_id,
                                     sizeof(g_runs[idx].prior[pi].node_id),
                                     "%s", sid);
                            snprintf(g_runs[idx].prior[pi].tensor_name,
                                     sizeof(g_runs[idx].prior[pi].tensor_name),
                                     "image_%d", art_i);
                            snprintf(g_runs[idx].prior[pi].dtype,
                                     sizeof(g_runs[idx].prior[pi].dtype), "u8");
                            g_runs[idx].prior[pi].data = abytes;
                            g_runs[idx].prior[pi].nbytes = (size_t)asz;
                            art_i++;
                        }
                    }
                }
                cur = objend + 1;
                while (*cur == ',') cur++;
                stage_i++;
            }
        }
    }
    g_runs[idx].start_from = start_from;

    run_thread_arg *ta = (run_thread_arg *)malloc(sizeof(*ta));
    ta->idx = idx;
    pthread_t th;
    if (pthread_create(&th, NULL, run_thread_fn, ta) != 0) {
        /* No thread will ever drain this slot: fail it loudly instead
         * of leaving a ghost "queued" entry (audit M2). */
        free(ta);
        pthread_mutex_lock(&g_runs_mu);
        run_slot_release_heap(idx);
        pthread_mutex_unlock(&g_runs_mu);
        run_set_state(idx, "error", "thread spawn failed");
        run_mark_th_done(idx);
        res.status = 503;
        res.set_content("{\"error\":\"thread spawn failed\"}",
                        "application/json");
        return;
    }
    pthread_detach(th);

    char out[256];
    snprintf(out, sizeof(out), "{\"run_id\":\"%s\",\"status\":\"queued\"}",
             g_runs[idx].run_id);
    res.status = 202;
    res.set_content(out, "application/json");
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
    s->srv.Post("/v1/pipelines/generate", handle_pipelines_start);
    s->srv.Post("/v1/run",               handle_pipelines_start);
    s->srv.Get("/v1/pipelines/status/:run_id", handle_pipelines_status);
    s->srv.Get("/v1/queue",                handle_queue);
    s->srv.Post("/v1/pipelines/stop/:run_id",   handle_pipelines_stop);
    s->srv.Post("/v1/pipelines/resume/:run_id", handle_pipelines_resume);
    s->srv.Post("/v1/pipelines/drafts",  handle_pipelines_drafts);
    s->srv.Get("/v1/pipelines/drafts/:id", handle_draft_get);
    s->srv.Get("/v1/pipelines/drafts",     handle_draft_list);
    s->srv.Get("/v1/pipelines/runs",     handle_pipelines_runs);
    s->srv.Get(R"(/editor/assets/runs/(.+))", handle_asset);
    s->srv.Get("/v1/form-spec",          handle_form_spec);
    s->srv.Post("/v1/models/provision",  handle_provision);
    s->srv.Get("/v1/models/provision/status", handle_provision_status);
    s->srv.Get("/v1/model-catalog",      handle_catalog);
    s->srv.Get("/v1/kinds",              handle_kinds);
    s->srv.Get("/v1/model/:id",          handle_catalog_model);
    s->srv.Get("/v1/agent-manifest",     handle_agent_manifest);
    s->srv.Post("/v1/models/download",   handle_download);
    s->srv.Post("/v1/models/download-all", handle_download_all);
    s->srv.Get("/v1/skills",               handle_skills_index);
    s->srv.Get(R"(/v1/skills/(.+))",       handle_skill_read);
    s->srv.Get("/v1/ledger",               handle_ledger);
    s->srv.Post("/v1/compose",              handle_compose);
    ledger_boot();   /* recover prov jobs from the ledger + stamp boot */

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
    /* run artifacts over HTTP — /media/<run_id>/<file> (mp4/png/flac) */
    s->srv.set_mount_point("/media", "./output");
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
