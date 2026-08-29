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
#include <signal.h>   /* (audit F13) sigwait shutdown thread */
#include <stdarg.h>   /* (audit F28) jappend va_list */
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

/* poser_handlers.cpp — ANNY poser routes (ray /poser/skin/* parity) */
void handle_poser_identity_space(const httplib::Request &, httplib::Response &);
void handle_poser_mesh(const httplib::Request &, httplib::Response &);

inference_catalog *g_catalog = NULL;
inference_ws *g_ws_server = NULL;
download_config *g_download_cfg = NULL;
static pthread_t g_ws_thread;

struct inference_server {
    httplib::Server srv;
    int port;
    int ws_port;
    char bind_addr[64];
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

/* ---- Engine web-UI registry ----
 *   GET /v1/apps  -> JSON list of registered engine webui endpoints
 *   GET /apps     -> HTML index page linking to each webui
 *   Source of truth: static/apps.json (regenerate via scripts/generate-apps-json)
 */

static std::string read_file_str(const char *path, size_t max_bytes) {
    FILE *f = fopen(path, "rb");
    if (!f) return std::string();
    std::string buf;
    buf.resize(max_bytes);
    size_t n = fread(&buf[0], 1, max_bytes, f);
    fclose(f);
    buf.resize(n);
    return buf;
}

static void handle_apps(const httplib::Request &req,
                        httplib::Response &res) {
    (void)req;
    std::string body = read_file_str("./static/apps.json", 65536);
    if (body.empty()) {
        res.status = 500;
        res.set_content("{\"error\":\"apps.json not found\"}", "application/json");
        return;
    }
    res.set_content(body, "application/json");
}

static void handle_apps_index(const httplib::Request &req,
                              httplib::Response &res) {
    (void)req;
    std::string body = read_file_str("./static/apps.html", 256 * 1024);
    if (body.empty()) {
        res.status = 500;
        res.set_content("<h1>apps.html not found</h1>", "text/html");
        return;
    }
    res.set_content(body, "text/html");
}

/* ---- DSH serving surface: run registry + async run door + drafts ----
 * Wire contract mirrors the ray gateway the DSH melite lane speaks:
 *   POST /v1/pipelines/start   {"yaml":"<name>","prompt":...,"seed":...} -> {"run_id"}
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
    char error[2048];        /* exact error message (written to sidecar ledger) */
    char arts[RUN_STAGE_ARTS_MAX][160];  /* artifacts attributed to this stage */
    size_t n_arts;
} run_stage;

typedef struct {
    char run_id[48];
    char state[16];          /* queued|running|success|error|stopped */
    char error[256];
    char out_dir[512];
    /* (audit F31, 2026-08-29) 4096 to match yaml_override[4096]: the old
     * 2048 cap silently truncated pipelines (h3-timeline-b4 sits at 2020
     * bytes — 28 from a silent dag-parse failure). */
    char yaml[4096];         /* the pipeline YAML this run executes */
    char model[64];          /* requested model (spec persistence) */
    char prompt[2048];       /* requested prompt (spec persistence) */
    long seed;               /* requested seed, -1 = unset */
    time_t created;
    run_input inputs[16];
    size_t n_inputs;
    run_stage stages[RUN_STAGES_MAX];
    size_t n_stages;
    int  stop_req;           /* per-run cooperative stop request */
    /* (audit M4, 2026-08-29) FIFO ticket assigned AT REGISTRATION under
     * g_gpu_mu — strict submission order (was: taken inside the spawned
     * thread, i.e. scheduler order). has_ticket=1 until the run thread (or
     * a spawn-failure path) releases it. */
    int  ticket;
    int  has_ticket;
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
    /* action-card write-back: when a run belongs to a draft card, the
     * terminal state is written back into the draft JSON so reopening the
     * card shows films + latent seams from the latest run */
    char draft_id[80];
    int  draft_stage;
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
static int  boot_patch_sidecar(const char *path, const char *why); /* audit F6/F7 */

/* (audit F28, 2026-08-29) Bounded-growth JSON appender. The old
 * "len += snprintf(buf + len, cap - len, ...)" idiom lets a truncated
 * snprintf return the WOULD-BE length, so len can pass cap and the next
 * cap-len underflows to a huge size_t — an unbounded heap write (the H3
 * class). jappend grows the buffer and RETRIES; snprintf never truncates. */
static size_t jappend(char **buf, size_t *cap, size_t len,
                      const char *fmt, ...) {
    va_list ap;
    for (;;) {
        va_start(ap, fmt);
        int n = vsnprintf(*buf + len, *cap - len, fmt, ap);
        va_end(ap);
        if (n < 0) return len;                    /* encoding error: skip */
        if ((size_t)n < *cap - len) return len + (size_t)n;
        size_t need = *cap * 2 + (size_t)n + 64;
        char *nb = (char *)realloc(*buf, need);
        if (!nb) return len;                      /* OOM: keep valid prefix */
        *buf = nb;
        *cap = need;
    }
}

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

/* Runner writes its last_error here before the stage_cb fires
 * so the callback can propagate it into the sidecar ledger. */
static char g_runner_error_buf[2048] = "";
extern "C" void runner_set_error_for_cb(const char *msg) {
    if (msg) snprintf(g_runner_error_buf, sizeof(g_runner_error_buf), "%s", msg);
    else g_runner_error_buf[0] = 0;
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
            if (state == RUNNER_STAGE_ERROR && g_runner_error_buf[0])
                snprintf(g_runs[idx].stages[s].error,
                         sizeof(g_runs[idx].stages[s].error), "%s",
                         g_runner_error_buf);
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
        if (!first) len = jappend(&buf, &cap, len, ",");
        first = 0;
        len = jappend(&buf, &cap, len,
            "{\"name\":\"%s\",\"path\":\"%s\",\"bytes\":%ld,"
            "\"url\":\"/editor/assets/runs/%s/%s\",\"type\":\"%s\",\"size\":%ld}",
            line, path, bytes, rid, line, artifact_type(line), bytes);
    }
    pclose(fp);
    if (total > listed) {
        if (!first) len = jappend(&buf, &cap, len, ",");
        len = jappend(&buf, &cap, len,
            "{\"truncated\":true,\"listed\":%d,\"total\":%d}", listed, total);
    }
    len = jappend(&buf, &cap, len, "]");
    return buf;
}

/* read a harvested lane pipeline for a catalog model into out; NULL if none.
 * audio_guided: when the caller body carries {audio:"/abs/file"} and the
 * lane ships a pipeline_audio.yaml sibling, prefer that variant graph. */
static char *pipeline_yaml_for_model_ex(const char *model, const char *body,
                                        char *out, size_t cap) {
    for (const char *p = model; *p; p++)
        if (!((*p >= 'a' && *p <= 'z') || (*p >= '0' && *p <= '9') ||
              *p == '-' || *p == '_' || *p == '.'))
            return NULL;                    /* path safety: slug chars only */
    char path[600];
    snprintf(path, sizeof(path), "../pipelines/%s/pipeline.yaml", model);
    if (body) {
        char aud[1024], apath[600];
        if (inf_json_string(body, "audio", aud, sizeof(aud)) == 0 && aud[0] &&
            access(aud, R_OK) == 0) {
            snprintf(apath, sizeof(apath), "../pipelines/%s/pipeline_audio.yaml", model);
            if (access(apath, R_OK) == 0)
                snprintf(path, sizeof(path), "%s", apath);
        }
    }
    FILE *fp = fopen(path, "rb");
    if (!fp) return NULL;
    size_t n = fread(out, 1, cap - 1, fp);
    fclose(fp);
    if (n == 0 || n >= cap - 1) return NULL;
    out[n] = 0;
    return out;
}

static char *pipeline_yaml_for_model(const char *model, char *out, size_t cap) {
    return pipeline_yaml_for_model_ex(model, NULL, out, cap);
}

/* ── Timeline studio calls compile ─────────────────────────────────────
 * The video-timeline card body carries calls:[{text, beats:[{text, ...}]}]
 * instead of a flat prompt. Studio law: the compiler cuts windows at CALL
 * boundaries — each call becomes ONE window prompt (its beats joined, or
 * the call text alone). Feeds the prompt..prompt4 wire the multi-window
 * engine already speaks. Returns window count (0..4). */
/* (audit F2, 2026-08-29) was global g_tl_wins/g_tl_nw — two concurrent
 * POSTs could cross-wire their window prompts. Now compiled into a
 * LOCAL array at the registration call site and passed as a parameter. */

static int compile_calls_windows(const char *body, char out[4][2048], int lens[4]) {
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
                        /* calls-length law (2026-08-30): each window renders
                         * its call span + the seam overlap
                         * (first_frame_prev_sec x fps) so the in-graph trim
                         * can remove the pinned head and land the exact
                         * tile. Lens land in the pipeline inject map. */
                        {
                            int sf=0, ef=0, pv=0;
                            const char *m = strstr(obj, "start_frame");
                            if (m) sf = atoi(strchr(m, ':') + 1);
                            m = strstr(obj, "end_frame");
                            if (m) ef = atoi(strchr(m, ':') + 1);
                            m = strstr(obj, "first_frame_prev_sec");
                            if (m) pv = atoi(strchr(m, ':') + 1);
                            lens[n] = (ef > sf ? ef - sf : 0) + pv * 24;
                        free(obj);
                        }
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

/* extra beat fields the timeline card carries (multi-window prompts).
 * (audit F2) tl_wins/tl_nw are the CALLER'S LOCAL compile output — no
 * shared state, concurrent registrations cannot cross-wire prompts. */
static void add_run_extra_inputs(size_t idx, const char *body,
                                 char *tmp, size_t tmpcap,
                                 char tl_wins[4][2048], int tl_nw) {
    static const char *names[] = {"prompt2", "prompt3", "prompt4", NULL};
    for (int i = 0; names[i]; i++)
        if (inf_json_string(body, names[i], tmp, tmpcap) == 0 && tmp[0])
            add_run_input_text(idx, names[i], tmp);
    /* Timeline studio compiled windows (calls -> per-call prompts):
     * the card body carries no prompt2..4 keys - feed from the compile. */
    if (tl_nw > 1) {
        for (int i = 1; i < tl_nw && i < 4; i++)
            add_run_input_text(idx, names[i - 1], tl_wins[i]);
    }
    /* audio guide track: stage the file into ComfyUI's input dir and expose
     * the bare filename as the "audio" run input (pipeline_audio.yaml
     * injects it into LoadAudio.0.audio). Missing file: loud stderr, no
     * tensor - the plain pipeline then runs unchanged. */
    {
        char aud[1024];
        if (inf_json_string(body, "audio", aud, sizeof(aud)) == 0 && aud[0]) {
            if (access(aud, R_OK) == 0) {
                const char *base = strrchr(aud, '/');
                base = base ? base + 1 : aud;
                char dst[640];
                snprintf(dst, sizeof(dst), "/opt/ComfyUI/input/guide_%lx_%s",
                         (unsigned long)time(NULL), base);
                FILE *src = fopen(aud, "rb"), *o = fopen(dst, "wb");
                if (src && o) {
                    char buf[65536];
                    size_t r;
                    while ((r = fread(buf, 1, sizeof(buf), src)) > 0)
                        fwrite(buf, 1, r, o);
                }
                if (src) fclose(src);
                if (o) fclose(o);
                const char *db = strrchr(dst, '/');
                db = db ? db + 1 : dst;
                add_run_input_text(idx, "audio", db);
                fprintf(stderr, "[timeline] audio guide staged: %s -> %s" "\n", aud, db);
            } else {
                fprintf(stderr, "[timeline] audio param set but file unreadable: %s" "\n", aud);
            }
        }
    }
}

/* thread body: execute the run's pipeline YAML */
typedef struct { size_t idx; } run_thread_arg;

/* Action-card write-back: rewrite the linked draft card's stage result
 * with this run's artifacts (stitch film, window films, latent seams) and
 * append a history row, so reopening the card shows the latest state.
 * Targets the FIRST stage carrying a "result" block (timeline card). */
static void draft_writeback(size_t idx, const char *wire) {
    if (!g_runs[idx].draft_id[0]) return;
    char path[256];
    snprintf(path, sizeof(path), "./drafts/%s.json", g_runs[idx].draft_id);
    FILE *f = fopen(path, "rb");
    if (!f) return;
    static char buf[32768];
    size_t n = fread(buf, 1, sizeof(buf) - 1, f);
    fclose(f);
    buf[n] = 0;

    const char *rid = g_runs[idx].run_id;
    const char *outdir = g_runs[idx].out_dir;
    char stitch[640] = "", wf[3][640] = {{0}, {0}, {0}};
    char seam[4][640] = {{0}, {0}, {0}, {0}};
    char p[768];
    const char *wins[4] = {"window1", "window2", "window3", "window4"};
    snprintf(p, sizeof(p), "%s/stitch_video_0.mp4", outdir);
    if (access(p, R_OK) == 0)
        snprintf(stitch, sizeof(stitch), "/editor/assets/runs/%s/stitch_video_0.mp4", rid);
    for (int w = 0; w < 4; w++) {
        snprintf(p, sizeof(p), "%s/%s_video_0.mp4", outdir, wins[w]);
        if (access(p, R_OK) == 0)
            snprintf(wf[w], sizeof(wf[w]), "/editor/assets/runs/%s/%s_video_0.mp4", rid, wins[w]);
        snprintf(p, sizeof(p), "%s/%s_latent_last.h3latent", outdir, wins[w]);
        if (access(p, R_OK) == 0)
            snprintf(seam[w], sizeof(seam[w]), "/editor/assets/runs/%s/%s_latent_last.h3latent", rid, wins[w]);
    }
    long dur = (long)(time(NULL) - g_runs[idx].created);
    if (dur < 0) dur = 0;

    /* history row (also stamped into result.metadata.history so the card
     * can render prior runs without draft-root access) */
    char hrow[1024];
    snprintf(hrow, sizeof(hrow),
             "{\"runId\":\"%s\",\"status\":\"%s\",\"at\":%ld,\"durationSec\":%ld,"
             "\"video\":\"%s\"}",
             rid, wire, (long)time(NULL), dur, stitch);
    /* existing root history rows (raw JSON text, already valid) */
    char oldh[8192] = "";
    {
        /* ROOT history = the LAST "history" key (result.metadata.history
         * sits earlier in the doc and is rebuilt by this write-back) */
        const char *hp0 = NULL;
        for (const char *q = strstr(buf, "\"history\""); q; q = strstr(q + 1, "\"history\""))
            hp0 = q;
        if (hp0) {
            const char *ab = strchr(hp0, '[');
            if (ab) {
                const char *ae = ab + 1;
                int depth = 0;
                while (*ae) {
                    if (*ae == '[') depth++;
                    else if (*ae == ']') { if (depth == 0) break; depth--; }
                    ae++;
                }
                size_t L = (size_t)(ae - ab - 1);
                if (L >= sizeof(oldh)) L = sizeof(oldh) - 1;
                memcpy(oldh, ab + 1, L);
                oldh[L] = 0;
            }
        }
    }
    char mhist[9216];
    {
        const char *t = oldh;
        while (*t == ' ' || *t == 10 || *t == 9 || *t == 13) t++;
        snprintf(mhist, sizeof(mhist), "%s%s%s", hrow,
                 (*t && *t != ']') ? "," : "", oldh);
    }

    /* splice the new result block over the first "result":{...} span */
    char res[12288];
    int ro = 0;
    ro += snprintf(res + ro, sizeof(res) - ro,
        "{\"assetUrls\":[%s%s%s],\"artifacts\":{"
        "\"video\":\"%s\","
        "\"video_w1_main\":\"%s\",\"video_w2_main\":\"%s\",\"video_w3_main\":\"%s\","
        "\"seam_w1\":\"%s\",\"seam_w2\":\"%s\",\"seam_w3\":\"%s\"},"
        "\"metadata\":{\"runId\":\"%s\",\"seam\":\"latent\",\"history\":[%s]},"
        "\"completedAt\":%ld,\"durationSec\":%ld}",
        stitch[0] ? "\"" : "", stitch, stitch[0] ? "\"" : "",
        stitch, wf[0], wf[1], wf[2], seam[0], seam[1], seam[2], seam[3], rid, mhist,
        (long)time(NULL) * 1000, dur);

    const char *rp = strstr(buf, "\"result\"");
    char out[36864];
    size_t oo = 0;
    if (rp) {
        const char *ob = strchr(rp, '{');
        const char *oe = ob;
        int depth = 0;
        while (*oe) {
            if (*oe == '{') depth++;
            else if (*oe == '}') { depth--; if (!depth) break; }
            oe++;
        }
        if (ob && *oe == '}') {
            size_t head = (size_t)(ob - buf);
            memcpy(out, buf, head); oo = head;
            memcpy(out + oo, res, strlen(res)); oo += strlen(res);
            oo += snprintf(out + oo, sizeof(out) - oo, "%s", oe + 1);   /* res carries its own braces */
            out[oo] = 0;
        } else {
            return;
        }
    } else {
        return;   /* draft has no result block: not a card we understand */
    }

    /* runStatus -> wire state (done | error) */
    char *rs = strstr(out, "\"runStatus\"");
    if (rs) {
        char *vs = strchr(rs + 11, '"');
        if (vs) {
            char *ve = strchr(vs + 1, '"');
            if (ve) {
                size_t vl = (size_t)(ve - vs - 1);
                const char *nw = strcmp(wire, "completed") == 0 ? "done" : "error";
                memmove(vs + 1 + strlen(nw), vs + 1 + vl, strlen(vs + 1 + vl) + 1);
                memcpy(vs + 1, nw, strlen(nw));
            }
        }
    }

    /* history row at draft root (no trailing comma: the array may be empty) */
    /* ROOT history again — the LAST key (metadata.history inside the
     * freshly spliced result block comes first in the doc) */
    char *hp = NULL;
    for (char *q = strstr(out, "\"history\""); q; q = strstr(q + 1, "\"history\""))
        hp = q;
    if (hp) {
        char *hb = strchr(hp, '[');
        if (hb) {
            hb++;
            const char *nx = hb;
            while (*nx == ' ' || *nx == '\n' || *nx == '\t' || *nx == '\r') nx++;
            char sep[2] = "";
            if (*nx && *nx != ']') sep[0] = ',';
            char tmp2[36864];
            size_t head = (size_t)(hb - out);
            snprintf(tmp2, sizeof(tmp2), "%.*s%s%s%s", (int)head, out, hrow, sep, hb);
            snprintf(out, sizeof(out), "%s", tmp2);
        }
    } else {
        char *last = strrchr(out, '}');
        if (last) {
            char tmp2[36864];
            size_t head = (size_t)(last - out);
            snprintf(tmp2, sizeof(tmp2), "%.*s,\"history\":[%s]}%s", (int)head, out,
                     hrow, last + 1);
            snprintf(out, sizeof(out), "%s", tmp2);
        }
    }

    char tmp_path[280];
    snprintf(tmp_path, sizeof(tmp_path), "%s.tmp", path);
    FILE *o = fopen(tmp_path, "w");
    if (o) {
        fwrite(out, 1, strlen(out), o);
        fclose(o);
        rename(tmp_path, path);
        fprintf(stderr, "[draft] wrote run %s back into %s (%s)\n",
                rid, path, wire);
    }
}


/* (audit M4, 2026-08-29) Wait OUR ticket turn inline, then fail the run
 * and release — used when pthread_create failed so NO run thread exists.
 * Releasing out of turn would starve earlier waiters (serving skips past
 * their tickets), so the abandonment still respects strict FIFO order.
 * Rare path (EAGAIN under thread exhaustion); the handler blocks until
 * the queue drains to this run's turn, then replies. */
static void run_abandon_ticket_ordered(size_t idx) {
    pthread_mutex_lock(&g_gpu_mu);
    int tk = g_runs[idx].ticket;
    while (g_gpu_serving != tk)
        pthread_cond_wait(&g_gpu_cv, &g_gpu_mu);
    pthread_mutex_unlock(&g_gpu_mu);
    run_set_state(idx, "error", "thread spawn failed (ticket drained in order)");
    run_mark_th_done(idx);
    gpu_ticket_release();
}

/* (audit M4) spawn a run thread with bounded retry; on persistent failure
 * the registration-time ticket is abandoned IN ORDER and the caller is
 * told to reply 503. Returns 0 on success. */
static int run_spawn_thread(size_t idx, void *(*fn)(void *)) {
    run_thread_arg *ta = (run_thread_arg *)malloc(sizeof(*ta));
    if (!ta) return -1;
    ta->idx = idx;
    for (int attempt = 0; attempt < 3; attempt++) {
        pthread_t th;
        if (pthread_create(&th, NULL, fn, ta) == 0) {
                    return 0;
        }
        fprintf(stderr, "run: pthread_create failed (attempt %d)\n", attempt + 1);
        usleep(250 * 1000);
    }
    free(ta);
    run_abandon_ticket_ordered(idx);
    return -1;
}

static void *run_thread_fn(void *argp) {
    run_thread_arg a = *(run_thread_arg *)argp;
    free(argp);
    size_t idx = a.idx;

    /* GPU FIFO: wait for OUR ticket before touching the GPU. The ticket
     * was assigned AT REGISTRATION (audit M4) — the queue serves runs in
     * exact submission order, independent of thread scheduling. */
    pthread_mutex_lock(&g_gpu_mu);
    int my_ticket = g_runs[idx].ticket;
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
    g_runner_error_buf[0] = '\0';  /* clear stale error from prior run */
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

    if (rc == 1) {
        run_set_state(idx, "stopped", NULL);
        inference_free(result);
    } else if (rc < 0) {
        const char *errmsg = g_runner_error_buf[0]
            ? g_runner_error_buf : "pipeline execution failed";
        run_set_state(idx, "error", errmsg);
        inference_free(result);
        draft_writeback(idx, "failed");
    } else {
        inference_free(result);
        run_set_state(idx, "success", NULL);
        draft_writeback(idx, "completed");
    }

    /* VRAM management belongs to ComfyUI itself: model_management keeps
     * weights cached between executions and evicts under pressure. The
     * wrapper NEVER unloads — the /free hack is deleted (1:1 node law,
     * 2026-08-28). */

    /* GPU FIFO: release and wake next waiter, then mark the slot fully
     * drained so a registrar may recycle it (th_done gate, audit M2).
     * th_done BEFORE release: no window where the ticket is free but the
     * slot looks occupied (prevents spurious 503 under concurrent load). */
    run_mark_th_done(idx);
    gpu_ticket_release();
    if (g_ws_server)
        ws_send_status(g_ws_server, gpu_queue_depth());
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
            char *sterrq = st->error[0] ? json_quote(st->error) : NULL;
            so += (size_t)snprintf(stages_json + so, sizeof(stages_json) - so,
                "%s{\"id\":\"%s\",\"name\":\"%s\",\"index\":%d,\"status\":\"%s\"%s%s,\"artifacts\":[",
                s ? "," : "", st->id, st->id, (int)s, wire_state(st->state),
                sterrq ? ",\"error\":" : "",
                sterrq ? sterrq : "");
            if (sterrq) free(sterrq);
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

    /* ATOMIC WRITE (audit F1, 2026-08-29): a crash or concurrent read
     * mid-write must never see a truncated sidecar. Write to .tmp then
     * rename() — readers always see either the old or the new file. */
    char path[600], tmp_path[620];
    snprintf(path, sizeof(path), "%s/_pipeline.json", dir);
    snprintf(tmp_path, sizeof(tmp_path), "%s.tmp", path);
    FILE *f = fopen(tmp_path, "w");
    if (!f) { free(yamlq); free(promptq); free(errq); return; }
    int wok = fprintf(f, "{\"run_id\":\"%s\",\"model\":\"%s\",\"prompt\":%s,"
               "\"seed\":%ld,\"created\":%ld,\"ended\":%ld,\"durationSec\":%ld,"
               "\"status\":\"%s\","
               "\"error\":%s,\"stages\":%s,\"yaml\":%s}",
            rid, model, promptq, seed, created, (long)time(NULL),
            (long)time(NULL) - created, state,
            errq ? errq : "null", stages_json, yamlq) > 0;
    wok = (fclose(f) == 0) && wok;
    if (wok) rename(tmp_path, path);
    else unlink(tmp_path);
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
    char model[64] = "", prompt[2048] = "";
    char tl_wins[4][2048];   /* (audit F2) LOCAL: per-request window prompts */
    int  tl_wins_len[4] = {0,0,0,0}; /* calls-length law: render length per window */
    int  tl_nw = 0;
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
        /* audio-guided variant: body {audio:"/abs/path.wav"} + a sibling
         * pipeline_audio.yaml -> run that graph instead. Regression-safe:
         * no audio param keeps the stock pipeline byte-identical. */
        {
            char aud[1024], apath[600];
            if (inf_json_string(body, "audio", aud, sizeof(aud)) == 0 && aud[0] &&
                access(aud, R_OK) == 0) {
                snprintf(apath, sizeof(apath), "../pipelines/%s/pipeline_audio.yaml", yaml_name);
                if (access(apath, R_OK) == 0)
                    snprintf(path, sizeof(path), "%s", apath);
            }
        }
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
        char tmp[2048];
        if (m && inf_json_string(req.body.c_str(), "model", tmp, sizeof(tmp)) == 0)
            snprintf(model, sizeof(model), "%s", tmp);
        if (p && inf_json_string(req.body.c_str(), "prompt", tmp, sizeof(tmp)) == 0)
            snprintf(prompt, sizeof(prompt), "%s", tmp);
        if (s) seed = inf_json_int(req.body.c_str(), "seed", -1);
    }
    /* Timeline studio shape: {model, calls:[...]} - compile the calls
     * into window prompts (prompt..prompt4).
     * (audit F34) compile even when a flat prompt rides along: a body
     * carrying BOTH prompt (window-0 text) AND calls must still feed
     * tl_wins[1..3] to prompt2..4 - the old !prompt[0] gate dropped
     * every window past the first whenever prompt was present. */
    if (strstr(body, "\"calls\"")) {
        tl_nw = compile_calls_windows(body, tl_wins, tl_wins_len);
        if (!prompt[0] && tl_nw > 0) snprintf(prompt, sizeof(prompt), "%s", tl_wins[0]);
    }
    if (!prompt[0]) {
        res.status = 400;
        res.set_content("{\"error\":\"missing prompt\"}", "application/json");
        return;
    }

    /* LAW (operator order, 2026-08-30): "No legacy. No fallbacks. No
     * hardcodes. These are banned." The run spec must resolve EXPLICITLY
     * -- a {yaml:name} pipeline, a {pipeline:{steps}} card, or a {model}
     * that maps to pipelines/<model>/pipeline.yaml on disk. The legacy
     * composed graph with a baked-in executor address is deleted; an
     * unresolvable request is rejected here, BEFORE any run is
     * registered, so no zombie slots or sidecars are manufactured. */
    if (!yaml_override[0]) {
        if (!model[0]) {
            res.status = 400;
            res.set_content("{\"error\":\"no pipeline selected: provide yaml, pipeline, or model (no fallback by law)\"}", "application/json");
            return;
        }
        char probe[512];
        if (!pipeline_yaml_for_model_ex(model, body, probe, sizeof(probe))) {
            res.status = 404;
            char err[300];
            snprintf(err, sizeof(err),
                     "{\"error\":\"no pipeline for model: %s\"}", model);
            res.set_content(err, "application/json");
            return;
        }
    }
    /* context engine (cross-run continuation, 2026-08-30): continue_from
     * seeds window1 with the prior run's durable last context (window4
     * tail h3latent). Unresolved refs are rejected BEFORE registration
     * (queue lane law: no zombie slots, no silent fallbacks). */
    char ctx_prev_run[128] = "";
    {
        char cfr[128] = "";
        if (inf_json_string(body, "continue_from", cfr, sizeof(cfr)) == 0 && cfr[0]) {
            for (const char *p2 = cfr; *p2; p2++)
                if (!((*p2 >= 'a' && *p2 <= 'z') || (*p2 >= '0' && *p2 <= '9') || *p2 == '-')) {
                    res.status = 400;
                    res.set_content("{\"error\":\"invalid continue_from run id\"}", "application/json");
                    return;
                }
            snprintf(ctx_prev_run, sizeof(ctx_prev_run), "%s", cfr);
            char clp[600];
            snprintf(clp, sizeof(clp), "./output/%s/window4_latent_last.h3latent", cfr);
            if (access(clp, R_OK) != 0) {
                res.status = 404;
                char err[400];
                snprintf(err, sizeof(err),
                         "{\"error\":\"continue_from run has no window4 context\",\"run\":\"%s\",\"missing\":\"window4_latent_last.h3latent\"}", cfr);
                res.set_content(err, "application/json");
                return;
            }
            if (yaml_override[0]) {
                char abs_lat[4096];
                if (realpath(clp, abs_lat)) {
                    /* capacity law: the swap + inject must fit the buffer.
                     * A run may NEVER overflow the server (resilience law).
                     * Reject loudly instead. */
                    const char *wf0 = strstr(yaml_override, "window1_t4.json");
                    const char *inj0 = wf0 ? strstr(yaml_override, "\"inject\":{") : NULL;
                    size_t need = strlen(yaml_override) + 2 + 60 + strlen(abs_lat);
                    if (!wf0 || !inj0 || need >= sizeof(yaml_override)) {
                        res.status = 400;
                        res.set_content("{\"error\":{\"continue_from: composed pipeline too large for context injection\"}}", "application/json");
                        return;
                    }
                    /* swap window1 to the load variant (first occurrence) */
                    const char *wf = strstr(yaml_override, "window1_t4.json");
                    if (wf) {
                        const char rep[] = "window1_load.json";
                        const char old[] = "window1_t4.json";
                        size_t ol = sizeof(old) - 1, nl = sizeof(rep) - 1;
                        memmove((char *)wf + nl, wf + ol, strlen(wf + ol) + 1);
                        memcpy((char *)wf, rep, nl);
                        /* inject the abs latent path into window1's params:
                         * the first inject map gains the loader key */
                        const char *inj = strstr(yaml_override, "\"inject\":{");
                        if (inj) {
                            const char *brace = inj + strlen("\"inject\":{");
                            char kv[4200];
                            snprintf(kv, sizeof(kv),
                                     "\"MiniMaxH3MotionContextLoadLatent.0.latent_path\":\"%s\"," , abs_lat);
                            size_t kvl = strlen(kv), tail = strlen(brace) + 1;
                            memmove((char *)brace + kvl, brace, tail);
                            memcpy((char *)brace, kv, kvl);
                        }
                    }
                }
            }
        }
    }

    /* (law 2026-08-30) the hardcoded workflow_file default is gone:
     * a run names its pipeline explicitly or it does not start. */

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
    /* (2026-08-30 forever-truth law) the VERBATIM start request — every
     * prompt, every input — is persisted beside the run at registration.
     * The card that launched the run can always be reconstructed exactly
     * from disk; no future run can lose its authored parameters. */
    {
        char rqpath[600];
        snprintf(rqpath, sizeof(rqpath), "%s/_request.json",
                 g_runs[idx].out_dir);
        FILE *rf = fopen(rqpath, "wb");
        if (rf) {
            fwrite(req.body.c_str(), 1, req.body.size(), rf);
            fclose(rf);
        }
    }
    /* action-card linkage: timeline card runs (params carry "calls")
     * persist their result back into the timeline draft card */
    if (strstr(req.body.c_str(), "\"calls\"") &&
        access("./drafts/draft-timeline-h3.json", R_OK) == 0) {
        snprintf(g_runs[idx].draft_id, sizeof(g_runs[idx].draft_id),
                 "draft-timeline-h3");
        g_runs[idx].draft_stage = 0;
        fprintf(stderr, "[draft] run %s linked to card draft-timeline-h3\n",
                g_runs[idx].run_id);
    }
    /* (2026-08-30 cards-button law) the CARD document for this run - what
     * the DSH "Cards" button rebuilds the exact action card from: model +
     * pipeline + the verbatim start request as a first-class JSON value +
     * the draft linkage. Written at registration so it exists in every run
     * state, success or failure, alongside _request.json (forever-truth). */
    {
        char cpath[600];
        snprintf(cpath, sizeof(cpath), "%s/card.json",
                 g_runs[idx].out_dir);
        FILE *cf = fopen(cpath, "wb");
        if (cf) {
            fprintf(cf,
                "{\"card_version\":1,\"run_id\":\"%s\",\"model\":\"%s\","
                "\"pipeline\":\"%s\",\"seed\":%ld,\"created\":%lld,"
                "\"source\":\"queue\",\"linked_draft\":\"%s\",\"request\":",
                g_runs[idx].run_id, model,
                model,
                seed, (long long)time(NULL),
                g_runs[idx].draft_id[0] ? g_runs[idx].draft_id : "");
            fwrite(req.body.c_str(), 1, req.body.size(), cf);
            fputc('}', cf);
            fclose(cf);
        }
    }
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
        add_run_extra_inputs(idx, req.body.c_str(), tmpin, sizeof(tmpin), tl_wins, tl_nw);
    } else {
    char *piped = pipeline_yaml_for_model_ex(model, req.body.c_str(),
                                             g_runs[idx].yaml,
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
        add_run_extra_inputs(idx, req.body.c_str(), tmpin, sizeof(tmpin), tl_wins, tl_nw);
    } else {
        /* (operator law, 2026-08-30: no legacy, no fallbacks, no
         * hardcodes) the composed krea-style graph with its BAKED-IN
         * executor address is deleted. Unreachable behind the early
         * gate; if it ever fires anyway, fail the run LOUDLY. */
        pthread_mutex_lock(&g_runs_mu);
        g_runs[idx].th_done = 1;   /* no thread will drain this slot */
        pthread_mutex_unlock(&g_runs_mu);
        run_set_state(idx, "error",
                       "pipeline resolution failed at dispatch "
                       "(no fallback by law)");
        res.status = 500;
        res.set_content("{\"error\":\"pipeline resolution failed at dispatch (no fallback by law)\"}",
                        "application/json");
        return;
    }
    } /* end if(!yaml_override) */

    /* calls-length law (2026-08-30): each window renders its call span
     * plus the seam overlap (first_frame_prev_sec x fps); the in-graph
     * pack-trim removes the pinned head and lands the exact tile. Splice
     * the literal length into each window node's inject map, anchored on
     * its KSampler.0.seed entry (one per window node, in file order). */
    if (tl_nw > 0) {
        char inj[64];
        const char *needle = "\"KSampler.0.seed\"";
        int wi = 0;
        char *q = strstr(g_runs[idx].yaml, needle);
        while (q && wi < tl_nw) {
            if (tl_wins_len[wi] > 0) {
                snprintf(inj, sizeof(inj),
                         "\"MiniMaxH3ImageToVideo.0.length\":%d,",
                         tl_wins_len[wi]);
                size_t il = strlen(inj);
                size_t used = strlen(g_runs[idx].yaml);
                size_t off = (size_t)(q - g_runs[idx].yaml);
                if (used + il < sizeof(g_runs[idx].yaml) - 1) {
                    memmove(q + il, q, used - off + 1);
                    memcpy(q, inj, il);
                    q += il;
                }
            }
            wi++;
            q = strstr(q + strlen(needle), needle);
        }
    }
    /* stage list comes from the final YAML (reported while queued too) */
    run_parse_stages(idx);

    /* (audit M4, 2026-08-29) FIFO ticket at REGISTRATION: strict
     * submission order, independent of thread scheduling. */
    {
        pthread_mutex_lock(&g_gpu_mu);
        g_runs[idx].ticket = g_gpu_tickets++;
        g_runs[idx].has_ticket = 1;
        pthread_mutex_unlock(&g_gpu_mu);
    }
    if (run_spawn_thread(idx, run_thread_fn) != 0) {
        /* the ticket was abandoned IN ORDER by the helper; fail loudly */
        pthread_mutex_lock(&g_runs_mu);
        run_slot_release_heap(idx);
        pthread_mutex_unlock(&g_runs_mu);
        res.status = 503;
        res.set_content("{\"error\":\"thread spawn failed\"}",
                        "application/json");
        return;
    }

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
    char qids[4096]; size_t qo = 0;
    qids[0] = 0;
    for (size_t i = 0; i < g_n_runs; i++) {
        if (strcmp(g_runs[i].state, "queued") == 0) {
            queued++;
            qo += (size_t)snprintf(qids + qo, sizeof(qids) - qo,
                                   "%s\"%s\"", qo ? "," : "", g_runs[i].run_id);
        }
        if (strcmp(g_runs[i].state, "running") == 0) {
            running++;
            snprintf(active_id, sizeof(active_id), "%s", g_runs[i].run_id);
        }
    }
    pthread_mutex_unlock(&g_runs_mu);
    char out[4600];
    snprintf(out, sizeof(out),
        "{\"queued\":%d,\"running\":%d,\"active\":\"%s\",\"queued_ids\":[%s]}",
        queued, running, active_id, qids);
    res.set_content(out, "application/json");
}

static int sidecar_str(const char *json, const char *key, char *out, size_t cap);

static void handle_pipelines_status(const httplib::Request &req,
                                    httplib::Response &res) {
    std::string rid = req.path_params.at("run_id");
    pthread_mutex_lock(&g_runs_mu);
    int found = -1;
    for (size_t i = 0; i < g_n_runs; i++)
        if (rid == g_runs[i].run_id) { found = (int)i; break; }
    if (found < 0) {
        pthread_mutex_unlock(&g_runs_mu);
        /* Registry is in-memory: after a gateway restart, resurrect the run
         * from its on-disk sidecar so history panels keep working. */
        char sc[640];
        snprintf(sc, sizeof(sc), "./output/%s/_pipeline.json", rid.c_str());
        FILE *fp = fopen(sc, "r");
        if (fp) {
            /* (chaos C11, 2026-08-30) was STATIC: two concurrent
             * restores cross-wired this buffer and the response
             * stopped being valid JSON. Stack per request thread. */
            char sb[65536]; /* chaos C11: static removed - shared under concurrent restores */
            size_t n = fread(sb, 1, sizeof(sb) - 1, fp);
            fclose(fp);
            sb[n] = 0;
            char st[24] = "unknown", ev[256] = "";
            long created = 0, dur = 0;
            const char *qq = strstr(sb, "\"status\"");
            if (qq) {
                const char *c = strchr(qq + 8, '"');
                if (c) {
                    const char *e = strchr(c + 1, '"');
                    if (e) { size_t L = (size_t)(e - c - 1);
                        if (L < sizeof(st)) { memcpy(st, c + 1, L); st[L] = 0; } }
                }
            }
            /* raw sidecar state -> editor wire state */
            if (!strcmp(st, "success")) snprintf(st, sizeof(st), "completed");
            else if (!strcmp(st, "error")) snprintf(st, sizeof(st), "failed");
            qq = strstr(sb, "\"error\":\"");
            if (qq) {
                const char *c = qq + 8;
                const char *e = strchr(c, '"');
                if (e) { size_t L = (size_t)(e - c);
                    if (L < sizeof(ev)) { memcpy(ev, c, L); ev[L] = 0; } }
            }
            qq = strstr(sb, "\"created\"");     if (qq) { const char *c = strchr(qq, ':'); if (c) created = strtol(c + 1, NULL, 10); }
            qq = strstr(sb, "\"durationSec\""); if (qq) { const char *c = strchr(qq, ':'); if (c) dur = strtol(c + 1, NULL, 10); }
            char *evq = json_quote(ev);   /* (audit F26) sidecar errors carry quotes */
            /* (2026-08-30) restored runs must revive in the cards editor:
             * status.stages comes from the run dir's card.json when present
             * (the editor's revive reads exactly this field — without it
             * every restored run is "Run has no stages"), and artifacts
             * come from a real scan instead of a hardcoded empty array. */
            char odir[512];
            snprintf(odir, sizeof(odir), "./output/%s", rid.c_str());
            char *arts2 = run_artifacts_json(odir);
            char stages2[24576] = "[]";
            {
                /* priority: run-dir card.json (explicit card), else the
                 * sidecar's own stages snapshot — VERBATIM from disk, never
                 * hand-composed. */
                char cpath[600];
                snprintf(cpath, sizeof(cpath), "%s/card.json", odir);
                FILE *cf = fopen(cpath, "rb");
                const char *src = NULL;
                char *cbuf = (char *)malloc(sizeof(stages2));
                if (cf && cbuf) {
                    size_t cg = fread(cbuf, 1, sizeof(stages2) - 1, cf);
                    cbuf[cg] = 0;
                    src = cbuf;
                }
                if (cf) fclose(cf);
                if (!src && cbuf) { snprintf(cbuf, sizeof(stages2), "%s", sb); src = cbuf; }
                if (src) {
                    const char *sp = strstr(src, "\"stages\"");
                    if (sp) {
                        const char *c = sp;
                        while (*c && *c != '[') c++;
                        if (*c == '[') {
                            const char *e2 = c + 1;
                            int depth = 1;
                            while (*e2 && depth > 0) {
                                if (*e2 == '[') depth++;
                                else if (*e2 == ']') depth--;
                                e2++;
                            }
                            size_t Ln = (size_t)(e2 - c);
                            if (Ln >= sizeof(stages2)) Ln = sizeof(stages2) - 1;
                            memcpy(stages2, c, Ln);
                            stages2[Ln] = 0;
                        }
                    }
                }
                if (cbuf) free(cbuf);
            }
            /* chain runs revive through the spec: yaml_filename = the
             * sidecar's model (the pipeline name the run started with) */
            char yfn2[80] = "";
            sidecar_str(sb, "model", yfn2, sizeof(yfn2));
            /* (placeholder-prompt fix, 2026-08-30) the editor merges
             * status.stages[i].params OVER the spec card — without a
             * params.prompt the card renders the editor default
             * ("A single shot — describe…"). Inject the run's REAL
             * values: seed + prompt (per-stage when the verbatim request
             * was persisted; the sidecar prompt otherwise). */
            {
                char rprom[1024] = "";
                sidecar_str(sb, "prompt", rprom, sizeof(rprom));
                long rseed = 0;
                {
                    const char *sg = strstr(sb, "\"seed\"");
                    if (sg) rseed = strtol(strchr(sg, ':') + 1, NULL, 10);
                }
                char *reqbuf = (char *)malloc(65536);
                if (reqbuf) {
                    char rqp[600];
                    snprintf(rqp, sizeof(rqp), "%s/_request.json", odir);
                    FILE *rf = fopen(rqp, "rb");
                    if (rf) {
                        size_t rg = fread(reqbuf, 1, 65535, rf);
                        reqbuf[rg] = 0;
                        fclose(rf);
                    } else {
                        reqbuf[0] = 0;
                    }
                }
                char *walk = stages2;
                while (walk && *walk) {
                    char *ob = strchr(walk, '{');
                    if (!ob) break;
                    char *cb = ob + 1;
                    while (*cb && *cb != '}') cb++;
                    if (!*cb) break;
                    char sid[64] = "";
                    {
                        const char *ip = strstr(ob, "\"id\":\"");
                        if (ip && ip < cb) {
                            const char *v = ip + 5;
                            size_t L = 0;
                            while (v + L < cb && v[L] != '"' && L < sizeof(sid) - 1) L++;
                            memcpy(sid, v, L); sid[L] = 0;
                        }
                    }
                    char pkey[24] = "prompt";
                    {
                        const char *w = strstr(sid, "window");
                        if (w) {
                            long n = strtol(w + 6, NULL, 10);
                            if (n > 1 && n < 20) snprintf(pkey, sizeof(pkey), "prompt%ld", n);
                        }
                    }
                    char spro[1024] = "";
                    int have = 0;
                    if (reqbuf && reqbuf[0]) {
                        char probe[24];
                        snprintf(probe, sizeof(probe), "\"%s\"", pkey);
                        if (strstr(reqbuf, probe)) {
                            sidecar_str(reqbuf, pkey, spro, sizeof(spro));
                            have = spro[0] != 0;
                        }
                    }
                    if (!have && rprom[0]) { snprintf(spro, sizeof(spro), "%s", rprom); have = 1; }
                    char pjson[4200];
                    if (have) {
                        char *pq = json_quote(spro);
                        snprintf(pjson, sizeof(pjson),
                                 ",\"params\":{\"prompt\":%s,\"seed\":%ld}",
                                 pq ? pq : "\"\"", rseed);
                        if (pq) free(pq);
                    } else {
                        snprintf(pjson, sizeof(pjson),
                                 ",\"params\":{\"seed\":%ld}", rseed);
                    }
                    size_t pl = strlen(pjson);
                    size_t tail = strlen(cb);
                    if (strlen(stages2) + pl + 1 < sizeof(stages2)) {
                        memmove(cb + pl, cb, tail + 1);
                        memcpy(cb, pjson, pl);
                        walk = cb + pl + 1;
                    } else break;
                }
                if (reqbuf) free(reqbuf);
            }
            size_t cap2 = strlen(arts2) + strlen(stages2) + strlen(evq) + 800;
            char *out2 = (char *)malloc(cap2);
            snprintf(out2, cap2,
                "{\"run_id\":\"%s\",\"status\":\"%s\",\"state\":\"%s\",\"error\":%s,\"created\":%ld,\"durationSec\":%ld,\"restored_from_sidecar\":true,\"artifacts\":%s,\"stages\":%s,\"yaml_filename\":\"%s\"}",
                rid.c_str(), st, st, evq, created, dur, arts2, stages2, yfn2);
            free(evq); free(arts2);
            res.status = 200;
            res.set_content(out2, "application/json");
            free(out2);
            return;
        }
        res.status = 404;
        res.set_content("{\"error\":\"unknown run_id\"}", "application/json");
        return;
    }
    char outdir[512], state[16], err[256], yamlhead[80], modelh[80];
    snprintf(outdir, sizeof(outdir), "%s", g_runs[found].out_dir);
    snprintf(state, sizeof(state), "%s", g_runs[found].state);
    snprintf(err, sizeof(err), "%s", g_runs[found].error);
    snprintf(yamlhead, sizeof(yamlhead), "%.60s", g_runs[found].run_id);
    snprintf(modelh, sizeof(modelh), "%.76s", g_runs[found].model);
    /* queue position: how many queued runs registered before this one */
    int qpos = 0;
    if (strcmp(state, "queued") == 0) {
        for (size_t i = 0; i < g_n_runs; i++) {
            if ((long)i == (long)found) break;
            if (strcmp(g_runs[i].state, "queued") == 0) qpos++;
        }
    }
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
    /* (audit F26, 2026-08-29) the exact-error law pipes RAW plugin/ComfyUI
     * stderr into run.error — it routinely contains double quotes. Quote
     * it for JSON or the whole status response becomes unparseable (this
     * is exactly what broke the queue test at char 236). */
    char *errq = json_quote(err);
    size_t cap = strlen(arts) + strlen(stages_json) + strlen(errq) + 700;
    char *out = (char *)malloc(cap);
    snprintf(out, cap,
        "{\"run_id\":\"%s\",\"status\":\"%s\",\"stages\":%s,\"artifacts\":%s,\"error\":%s,\"queue_position\":%d,\"yaml_filename\":\"%s\"}",
        yamlhead, wire_state(state), stages_json, arts, errq, qpos, modelh);
    res.set_content(out, "application/json");
    free(arts); free(errq); free(out);
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
    /* (audit F32, 2026-08-29) time+thread collided for two drafts created
     * in the same second on the same handler thread — the second fopen
     * silently OVERWROTE the first card. A monotonic sequence under an
     * atomic makes ids unique forever. */
    static int64_t dseq = 0;
    int64_t seq = __atomic_add_fetch(&dseq, 1, __ATOMIC_RELAXED);
    char id[80];
    snprintf(id, sizeof(id), "draft-%lx-%lx-%llx",
             (unsigned long)time(NULL), (unsigned long)pthread_self(),
             (unsigned long long)seq);
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

/* ── Draft stage PATCH (2026-08-30) ────────────────────────────────────
 * PATCH /v1/pipelines/drafts/{id}/stages/{sid}
 * Body (any subset, ray-gateway parity):
 *   {"params":{...}}        key-wise MERGE into the stage's params object
 *   {"inputs":[...],"inputOutputs":[...]}   wire arrays (verbatim replace)
 *   {"result":{...},"runStatus":"done"}     render state (verbatim replace)
 * 200 → the updated draft doc; 400 empty/invalid patch; 404 unknown
 * draft/stage. THIS is the editor studio's only param persistence channel
 * (onSave PATCHes here) — a 404 makes the client roll the edit back,
 * which is why card-side edits (e.g. the route select) "didn't stick". */
struct jmember { char key[128]; const char *vs; const char *ve; };

static const char *j_skip_ws(const char *p, const char *e) {
    while (p < e && (*p == ' ' || *p == '\t' || *p == '\n' || *p == '\r')) p++;
    return p;
}

/* one-past-the-end of the JSON value starting at p (strings, numbers,
 * true/false/null, balanced arrays/objects — string-aware). NULL if the
 * span never closes inside (p,e). */
static const char *j_value_end(const char *p, const char *e) {
    p = j_skip_ws(p, e);
    if (p >= e) return NULL;
    if (*p == '"') {
        p++;
        while (p < e) {
            if (*p == '\\') { p += 2; continue; }
            if (*p == '"') return p + 1;
            p++;
        }
        return NULL;
    }
    if (*p == '{' || *p == '[') {
        const char open = *p, close = (open == '{') ? '}' : ']';
        int depth = 0, in_str = 0, esc = 0;
        for (; p < e; p++) {
            if (esc) { esc = 0; continue; }
            if (in_str) {
                if (*p == '\\') esc = 1;
                else if (*p == '"') in_str = 0;
                continue;
            }
            if (*p == '"') { in_str = 1; continue; }
            if (*p == open) depth++;
            else if (*p == close && --depth == 0) return p + 1;
        }
        return NULL;
    }
    const char *q = p;
    while (q < e && ((*q >= 'a' && *q <= 'z') || (*q >= 'A' && *q <= 'Z') ||
                     (*q >= '0' && *q <= '9') || *q == '-' || *q == '+' || *q == '.')) q++;
    return (q > p) ? q : NULL;
}

/* depth-1 members of the object spanning [os..oe) (os at '{'). Fills arr,
 * returns count (capped). Tolerant: stops at the first malformed member. */
static int j_object_members(const char *os, const char *oe,
                            struct jmember *arr, int cap) {
    int n = 0;
    const char *p = j_skip_ws(os + 1, oe);
    while (p < oe && *p != '}') {
        if (*p != '"') return n;
        const char *ks = p + 1, *ke = ks;
        while (ke < oe && *ke != '"') {
            if (*ke == '\\' && ke + 1 < oe) ke++;
            ke++;
        }
        if (ke >= oe) return n;
        struct jmember m;
        size_t kl = (size_t)(ke - ks);
        if (kl >= sizeof(m.key)) kl = sizeof(m.key) - 1;
        memcpy(m.key, ks, kl); m.key[kl] = 0;
        p = j_skip_ws(ke + 1, oe);
        if (p >= oe || *p != ':') return n;
        const char *ve = j_value_end(p + 1, oe);
        if (!ve) return n;
        m.vs = j_skip_ws(p + 1, oe);
        m.ve = ve;
        if (n < cap) arr[n++] = m;
        p = j_skip_ws(ve, oe);
        if (p < oe && *p == ',') p = j_skip_ws(p + 1, oe);
    }
    return n;
}

static std::string j_span(const std::string &doc, const struct jmember *m) {
    return doc.substr((size_t)(m->vs - doc.data()), (size_t)(m->ve - m->vs));
}

/* find the params/inputs/result members of a patch body without a full
 * JSON parse (span surgery, same style as the rest of this file) */
static void handle_draft_stage_patch(const httplib::Request &req,
                                     httplib::Response &res) {
    std::string id = req.path_params.at("id");
    std::string sid = req.path_params.at("sid");
    if (!draft_id_ok(id) || sid.empty() ||
        sid.find_first_not_of(
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_")
            != std::string::npos) {
        res.status = 400;
        res.set_content("{\"error\":\"bad id\"}", "application/json");
        return;
    }
    if (req.body.empty() || req.body[0] != '{') {
        res.status = 400;
        res.set_content("{\"error\":\"invalid patch body\"}", "application/json");
        return;
    }
    /* patch body spans (kept as offsets into req.body) */
    struct jmember pb[16];
    int npb = j_object_members(req.body.c_str(),
                               req.body.c_str() + req.body.size(), pb, 16);
    const struct jmember *p_params = NULL, *p_inputs = NULL,
                         *p_io = NULL, *p_result = NULL, *p_status = NULL;
    for (int i = 0; i < npb; i++) {
        if (!strcmp(pb[i].key, "params")) p_params = &pb[i];
        else if (!strcmp(pb[i].key, "inputs")) p_inputs = &pb[i];
        else if (!strcmp(pb[i].key, "inputOutputs")) p_io = &pb[i];
        else if (!strcmp(pb[i].key, "result")) p_result = &pb[i];
        else if (!strcmp(pb[i].key, "runStatus")) p_status = &pb[i];
    }
    if (!p_params && !p_inputs && !p_result) {
        res.status = 400;
        res.set_content("{\"error\":\"Empty patch body\"}", "application/json");
        return;
    }

    /* load the draft: native dir first, then the aux tree. A patch on an
     * aux-tree draft COPY-WRITES into ./drafts (every reader prefers it). */
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
    std::string doc;
    char rbuf[65536];
    size_t rn;
    while ((rn = fread(rbuf, 1, sizeof(rbuf), f)) > 0) doc.append(rbuf, rn);
    fclose(f);
    if (doc.empty() || doc[0] != '{') {
        res.status = 500;
        res.set_content("{\"error\":\"draft unreadable\"}", "application/json");
        return;
    }

    const char *ds = doc.c_str(), *de = ds + doc.size();
    struct jmember top[32];
    int ntop = j_object_members(ds, de, top, 32);
    const struct jmember *m_stages = NULL;
    for (int i = 0; i < ntop; i++)
        if (!strcmp(top[i].key, "stages")) { m_stages = &top[i]; break; }
    const char *stage_os = NULL, *stage_oe = NULL;
    if (m_stages && *j_skip_ws(m_stages->vs, de) == '[') {
        const char *as = j_skip_ws(m_stages->vs, de);
        const char *p = j_skip_ws(as + 1, de);
        while (p < de && *p != ']') {
            const char *ve = j_value_end(p, de);
            if (!ve) break;
            if (*p == '{') {
                struct jmember sm[32];
                int nsm = j_object_members(p, ve, sm, 32);
                for (int i = 0; i < nsm; i++) {
                    if (!strcmp(sm[i].key, "id")) {
                        const char *v = j_skip_ws(sm[i].vs, ve);
                        size_t vl = (size_t)(sm[i].ve - v);
                        if (vl >= 2 && v[0] == '"' &&
                            (size_t)(vl - 2) == sid.size() &&
                            !memcmp(v + 1, sid.c_str(), sid.size())) {
                            stage_os = p; stage_oe = ve;
                        }
                        break;
                    }
                }
            }
            if (stage_os) break;
            p = j_skip_ws(ve, de);
            if (p < de && *p == ',') p = j_skip_ws(p + 1, de);
        }
    }
    if (!stage_os) {
        char emsg[256];
        snprintf(emsg, sizeof(emsg),
                 "{\"error\":\"Stage %s not found in draft %s\"}",
                 sid.c_str(), id.c_str());
        res.status = 404;
        res.set_content(emsg, "application/json");
        return;
    }

    /* rebuild the stage object member-by-member */
    struct jmember sm[96];
    int nsm = j_object_members(stage_os, stage_oe, sm, 96);
    std::string inner;
    const struct jmember *old_params = NULL, *old_inputs = NULL,
                         *old_io = NULL, *old_result = NULL, *old_status = NULL;
    for (int i = 0; i < nsm; i++) {
        if (!strcmp(sm[i].key, "params")) old_params = &sm[i];
        else if (!strcmp(sm[i].key, "inputs")) old_inputs = &sm[i];
        else if (!strcmp(sm[i].key, "inputOutputs")) old_io = &sm[i];
        else if (!strcmp(sm[i].key, "result")) old_result = &sm[i];
        else if (!strcmp(sm[i].key, "runStatus")) old_status = &sm[i];
    }
    auto append_member = [&](const std::string &k, const std::string &v) {
        if (!inner.empty()) inner += ',';
        inner += "\"" + k + "\":" + v;
    };
    /* pass 1: keep every member EXCEPT the ones this patch replaces */
    for (int i = 0; i < nsm; i++) {
        const char *k = sm[i].key;
        if (p_params && !strcmp(k, "params")) continue;
        if (p_inputs && (!strcmp(k, "inputs") || !strcmp(k, "inputOutputs"))) continue;
        if (p_result && (!strcmp(k, "result") || !strcmp(k, "runStatus"))) continue;
        append_member(k, j_span(doc, &sm[i]));
    }
    /* pass 2: apply the patch */
    if (p_params) {
        /* key-wise merge into the old params object: old members minus the
         * incoming keys, then the incoming members (newest wins) */
        struct jmember pm[96], nm[96];
        int npm = 0, nnm = 0;
        if (old_params && *j_skip_ws(old_params->vs, stage_oe) == '{') {
            const char *ps = j_skip_ws(old_params->vs, stage_oe);
            npm = j_object_members(ps, old_params->ve, pm, 96);
        }
        nnm = j_object_members(p_params->vs, p_params->ve, nm, 96);
        auto has_key = [&](const char *k) {
            for (int i = 0; i < nnm; i++)
                if (!strcmp(nm[i].key, k)) return 1;
            return 0;
        };
        std::string pins;
        auto append_p = [&](const std::string &k, const std::string &v) {
            if (!pins.empty()) pins += ',';
            pins += "\"" + k + "\":" + v;
        };
        for (int i = 0; i < npm; i++)
            if (!has_key(pm[i].key))
                append_p(pm[i].key, j_span(doc, &pm[i]));
        for (int i = 0; i < nnm; i++)
            append_p(nm[i].key, j_span(req.body, &nm[i]));
        append_member("params", "{" + pins + "}");
    }
    if (p_inputs) {
        std::string iv = j_span(req.body, p_inputs);
        std::string iov;
        if (p_io) iov = j_span(req.body, p_io);
        else {
            /* ray parity: inputOutputs absent → paired nulls */
            int cnt = 0;
            const char *p = j_skip_ws(p_inputs->vs, p_inputs->ve);
            while (p < p_inputs->ve && *p != ']') {
                const char *ve = j_value_end(p, p_inputs->ve);
                if (!ve) break;
                cnt++;
                p = j_skip_ws(ve, p_inputs->ve);
                if (p < p_inputs->ve && *p == ',') p = j_skip_ws(p + 1, p_inputs->ve);
            }
            iov = "[";
            for (int i = 0; i < cnt; i++) { if (i) iov += ","; iov += "null"; }
            iov += "]";
        }
        append_member("inputs", iv);
        append_member("inputOutputs", iov);
    }
    if (p_result) {
        append_member("result", j_span(req.body, p_result));
        append_member("runStatus",
            p_status ? j_span(req.body, p_status) : std::string("\"done\""));
    }

    /* splice: doc[0..stage_os) + "{" + inner + "}" + doc[stage_oe..] */
    std::string out(doc, 0, (size_t)(stage_os - ds));
    out += "{" + inner + "}";
    out.append(doc, (size_t)(stage_oe - ds), std::string::npos);

    mkdir("./drafts", 0755);
    snprintf(path, sizeof(path), "./drafts/%s.json", id.c_str());
    FILE *o = fopen(path, "wb");
    if (!o) {
        res.status = 500;
        res.set_content("{\"error\":\"cannot persist draft\"}", "application/json");
        return;
    }
    fwrite(out.data(), 1, out.size(), o);
    fclose(o);
    res.status = 200;
    res.set_content(out, "application/json");
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
                /* ray-era draft cards carry no top-level model/name: the
                 * card title lives in intent (or the first stage title) and
                 * the lane in the first stage service. Without these
                 * fallbacks the whole card index reads empty (the 2026-08-30
                 * "cards view reconstructs nothing" migration break). */
                if (!one.name[0])
                    sidecar_str(buf, "intent", one.name, sizeof(one.name));
                if (!one.name[0])
                    sidecar_str(buf, "title", one.name, sizeof(one.name));
                if (!one.model[0])
                    sidecar_str(buf, "service", one.model, sizeof(one.model));
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

/* GET /v1/pipelines/yaml/list - the editor Pipelines library section.
 * Contract (editorClient.listChains): {pipelines:[{filename,name,path}]}
 * built from ../pipelines/<dir>/pipeline.yaml. Sorted by name for a stable UI. */
static int yaml_ent_cmp(const void *a, const void *b) {
    return strcmp((const char *)a, (const char *)b);
}

static std::string JQ(const std::string &s);  /* json quote helper, defined below */
static void handle_yaml_list(const httplib::Request &, httplib::Response &res) {
    /* (chaos C12, 2026-08-30) was STATIC: concurrent list GETs
     * cross-wired the names table. Stack per request thread. */
    char names[256][80];
    size_t n = 0;
    DIR *d = opendir("../pipelines");
    if (d) {
        struct dirent *e;
        while ((e = readdir(d)) != NULL && n < 256) {
            if (e->d_name[0] == '.') continue;
            char py[512];
            snprintf(py, sizeof(py), "../pipelines/%s/pipeline.yaml", e->d_name);
            if (access(py, R_OK) != 0) continue;
            snprintf(names[n], sizeof(names[n]), "%s", e->d_name);
            n++;
        }
        closedir(d);
    }
    qsort(names, n, sizeof(names[0]), yaml_ent_cmp);
    std::string out = "{\"pipelines\":[";
    for (size_t i = 0; i < n; i++) {
        if (i) out += ",";
        out += "{\"filename\":" + JQ(std::string(names[i]) + ".yaml") + ",\"name\":" +
               JQ(std::string(names[i])) + ",\"path\":" +
               JQ(std::string("../pipelines/") + names[i] + "/pipeline.yaml") + "}";
    }
    out += "]}";
    res.set_content(out, "application/json");
}

/* small JSON string-quote helper for the handlers above */
static std::string JQ(const std::string &s) {
    std::string o;
    o.push_back('"');
    static const char *hx = "0123456789abcdef";
    for (char c : s) {
        if (c == '"' || c == '\\') { o.push_back('\\'); o.push_back(c); }
        else if ((unsigned char)c < 0x20) {  /* JSON: control chars MUST be \u-escaped */
            o += "\\u00"; o.push_back(hx[(c >> 4) & 0xf]); o.push_back(hx[c & 0xf]);
        }
        else o.push_back(c);
    }
    o.push_back('"');
    return o;
}

/* GET /v1/pipelines/yaml/detail?yaml=<name>[.yaml] - name, first
 * description line, node id list, raw spec text. */
static void handle_yaml_detail(const httplib::Request &req,
                               httplib::Response &res) {
    if (!req.has_param("yaml")) {
        res.status = 400;
        res.set_content("{\"error\":\"missing yaml param\"}", "application/json");
        return;
    }
    std::string name = req.get_param_value("yaml");
    size_t dot = name.rfind(".yaml");
    if (dot != std::string::npos) name = name.substr(0, dot);
    char py[512];
    snprintf(py, sizeof(py), "../pipelines/%s/pipeline.yaml", name.c_str());
    FILE *f = fopen(py, "rb");
    if (!f) {
        res.status = 404;
        res.set_content("{\"error\":\"no such pipeline\"}", "application/json");
        return;
    }
    /* (chaos C12, 2026-08-30) was STATIC: concurrent detail GETs
     * cross-wired the spec text. Stack per request thread. */
    char buf[65536];
    size_t bn = fread(buf, 1, sizeof(buf) - 1, f);
    fclose(f);
    buf[bn] = 0;
    char desc[256] = "";
    const char *dp = strstr(buf, "description:");
    if (dp) {
        const char *v = dp + 12;
        while (*v == ' ' || *v == '"') v++;
        size_t L = 0;
        while (v[L] && v[L] != 10 && v[L] != '"' && L < sizeof(desc) - 1) L++;
        memcpy(desc, v, L); desc[L] = 0;
    }
    /* (2026-08-30 permanent card law) the editor's chain revive reads
     * `steps[]` (hydrateSpecSteps: family/title/params[{name,value}]/outputs)
     * — an id-only node list hydrated every card EMPTY and the editor fell
     * back to placeholder prompts ("A single shot…"). Serve the authored
     * shape verbatim: per node, the id, its type (family/service) and the
     * single-line JSON params object exactly as authored in the yaml. */
    std::string steps = "[";
    std::string nodes = "[";
    const char *p = buf;
    int first = 1, nfirst = 1;
    std::string cur_id, cur_type;
    std::string cur_params;
    auto flush_node = [&]() {
        if (cur_id.empty()) return;
        if (!nfirst) nodes += ",";
        nfirst = 0;
        nodes += "{\"id\":" + JQ(cur_id) + "}";
        std::string fam = cur_type.empty() ? "node" : cur_type;
        std::string step = "{\"family\":" + JQ(fam) +
                           ",\"service\":" + JQ(fam) +
                           ",\"title\":" + JQ(cur_id) +
                           ",\"params\":" + cur_params + "}";
        if (!first) steps += ",";
        first = 0;
        steps += step;
        cur_id.clear(); cur_type.clear(); cur_params = "[]";
    };
    cur_params = "[]";
    while (*p) {
        const char *eol = strchr(p, 10);
        if (!eol) eol = p + strlen(p);
        size_t indent = 0;
        while (p + indent < eol && p[indent] == ' ') indent++;
        size_t ll = (size_t)(eol - p);
        if (ll > indent + 6 && strncmp(p + indent, "- id: ", 6) == 0) {
            flush_node();
            const char *v = p + indent + 6;
            size_t L = 0;
            while (v + L < eol && v[L] != ' ' && v[L] != 13) L++;
            cur_id.assign(v, L);
        } else if (!cur_id.empty() && ll > indent + 6 &&
                   strncmp(p + indent, "type: ", 6) == 0) {
            const char *v = p + indent + 6;
            size_t L = 0;
            while (v + L < eol && v[L] != ' ' && v[L] != 13) L++;
            cur_type.assign(v, L);
        } else if (!cur_id.empty() && ll > indent + 8 &&
                   strncmp(p + indent, "params: ", 8) == 0) {
            /* single-line JSON object -> params:[{name,value},...] */
            const char *v = p + indent + 8;
            if (*v == '{') {
                int depth = 0; const char *e = v; bool instr = false;
                while (*e) {
                    if (instr) { if (*e == '\\' && e[1]) e++; else if (*e == '"') instr = false; }
                    else { if (*e == '"') instr = true; else if (*e == '{') depth++; else if (*e == '}') { depth--; if (!depth) { e++; break; } } }
                    e++;
                }
                /* shallow-walk top-level "key":value pairs */
                std::string ps = "[";
                const char *c = v + 1; bool pfirst = true;
                while (c < e - 1) {
                    if (*c != '"') { c++; continue; }
                    const char *k = c + 1; const char *ke = k;
                    while (*ke && *ke != '"') { if (*ke == '\\' && ke[1]) ke++; ke++; }
                    std::string key(k, (size_t)(ke - k));
                    c = ke + 1;
                    while (c < e && (*c == ' ' || *c == ':')) c++;
                    const char *vs = c; int d2 = 0; bool in2 = false;
                    while (c < e) {
                        if (in2) { if (*c == '\\' && c[1]) c++; else if (*c == '"') in2 = false; }
                        else { if (*c == '"') { in2 = true; c++; continue; }
                               if (*c == '{' || *c == '[') d2++;
                               else if (*c == '}' || *c == ']') { if (!d2) break; d2--; }
                               else if (*c == ',' && !d2) break; }
                        c++;
                    }
                    std::string val(vs, (size_t)(c - vs));
                    if (!pfirst) ps += ",";
                    pfirst = false;
                    ps += "{\"name\":" + JQ(key) + ",\"value\":" + val + "}";
                }
                ps += "]";
                cur_params = ps;
            }
        }
        p = eol + 1;
    }
    flush_node();
    steps += "]";
    nodes += "]";
    std::string out = "{\"name\":" + JQ(name) + ",\"description\":" + JQ(desc) +
                      ",\"nodes\":" + nodes + ",\"steps\":" + steps +
                      ",\"yaml\":" + JQ(buf) + "}";
    res.set_content(out, "application/json");
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
    len = jappend(&out, &cap, len, "{\"count\":%zu,\"runs\":[", n);
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
            /* ZOMBIE SWEEP (2026-08-29): a "running" sidecar with no matching
             * live g_runs[] entry is a stale leftover from a prior crash/restart.
             * Self-heal at read time: patch sidecar to "failed" so zombies never
             * accumulate.  Uses a temp-file rename for atomicity (no binary patch). */
            if (strcmp(status, "running") == 0) {
                int live = 0;
                for (size_t j = 0; j < g_n_runs; j++)
                    if (strcmp(g_runs[j].run_id, ents[i].dir) == 0 &&
                        strcmp(g_runs[j].state, "running") == 0) { live = 1; break; }
                if (!live) {
                    snprintf(status, sizeof(status), "failed");
                    /* (audit F6 rev2, 2026-08-29) sweep the FILE too — a
                     * zombie sidecar must never keep lying on disk. Same
                     * all-occurrences patcher as the boot sweep (top-level
                     * AND per-stage statuses; idempotent — a swept file is
                     * never re-swept). */
                    char sc_path[700];
                    snprintf(sc_path, sizeof(sc_path), "%s/_pipeline.json", dir);
                    if (boot_patch_sidecar(
                            sc_path,
                            "read-time sweep: stale running sidecar, no live registry entry")) {
                        char eb[400];
                        snprintf(eb, sizeof(eb),
                                 "{\"run_id\":\"%s\",\"state\":\"failed\","
                                 "\"error\":\"zombie swept at read time\"}",
                                 ents[i].dir);
                        ledger_log("run.swept", eb);
                    }
                }
            }
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
        len = jappend(&out, &cap, len,
            "%s{\"run_id\":\"%s\",\"name\":%s,\"pipeline\":%s,"
            "\"status\":\"%s\",\"created_at\":%ld,\"prompt\":%s,"
            "\"seed\":%ld,\"thumbnail\":\"%s\",\"artifacts\":%s,"
            "\"params\":{\"seed\":%ld}}",
            i ? "," : "", ents[i].dir, modelq, modelq, status, created,
            promptq, seed, thumb, arts, seed);
        free(arts); free(promptq); free(modelq);
    }
    len = jappend(&out, &cap, len, "]}");
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
        /* (2026-08-30 form-spec fix) the editor asks form-specs for node
         * FAMILY names too (comfyui, ffmpeg_concat…) — not catalog models.
         * A 404 here spammed "modifiers may be missing" on every revived
         * card. Family names (verified against pipeline `type:` values on
         * disk) get a minimal valid spec; anything else still 404s.
         * Display wire only — the run door's no-fallback law is untouched. */
        int safe = !model.empty() && model.size() < 64;
        for (size_t i = 0; safe && i < model.size(); i++) {
            char c = model[i];
            if (!((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                  (c >= '0' && c <= '9') || c == '_' || c == '-')) safe = 0;
        }
        if (safe) {
            char probe[256];
            snprintf(probe, sizeof(probe),
                     "grep -q 'type: %s' ../pipelines/*/pipeline.yaml 2>/dev/null",
                     model.c_str());
            if (system(probe) == 0) {
                res.set_content(
                    "{\"defaults\":{},\"variants\":[],\"enhance_prompts\":\"\"}",
                    "application/json");
                return;
            }
        }
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
    len = jappend(&out, &cap, len,
        "{\"model\":\"%s\",\"label\":%s,\"genre\":\"%s\","
        "\"engine\":\"%s\",\"defaults\":{",
        m->id, labelq, m->genre ? m->genre : "",
        m->engine_plugin ? m->engine_plugin : "");
    for (size_t i = 0; i < m->n_defaults; i++)
        len = jappend(&out, &cap, len, "%s\"%s\":\"%s\"",
                                i ? "," : "", m->default_keys[i],
                                m->default_vals[i]);
    len = jappend(&out, &cap, len, "},\"variants\":[");
    for (size_t g = 0; g < m->n_variant_groups; g++) {
        const catalog_variant_group *vg = &m->variant_groups[g];
        len = jappend(&out, &cap, len,
                                "%s{\"name\":\"%s\",\"options\":[",
                                g ? "," : "", vg->name ? vg->name : "");
        for (size_t o = 0; o < vg->n_options; o++)
            len = jappend(&out, &cap, len, "%s\"%s\"",
                                    o ? "," : "",
                                    vg->options[o].id ? vg->options[o].id : "");
        len = jappend(&out, &cap, len, "]}");
    }
    len = jappend(&out, &cap, len,
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
    len = jappend(&out, &cap, len,
                            "%s{\"id\":\"%s\",\"name\":%s,"
                            "\"description\":%s",
                            *first ? "" : ",", id, nq, dq);
    if (genre && genre[0])
        len = jappend(&out, &cap, len,
                                ",\"genre\":\"%s\"", genre);
    if (model && model[0])
        len = jappend(&out, &cap, len,
                                ",\"model\":\"%s\"", model);
    len = jappend(&out, &cap, len, "}");
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
    len = jappend(&out, &cap, len, "{\"skills\":[");
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
    len = jappend(&out, &cap, len, "]}");
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
    len = jappend(&out, &cap, len, "{\"jobs\":[");
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
    len = jappend(&out, &cap, len, "]}");
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
        len = jappend(&out, &cap, len, "%s%s",
                                i ? "," : "", ring[idx]);
    }
    len = jappend(&out, &cap, len,
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
    },
    "/v1/apps": {
      "get": {
        "operationId": "listApps",
        "summary": "Engine web-UI registry — all vendored engines that expose a web interface",
        "responses": {"200": {"description": "App registry", "content": {"application/json": {"schema": {"type": "object", "properties": {"apps": {"type": "array", "items": {"type": "object", "properties": {"id": {"type": "string"}, "label": {"type": "string"}, "description": {"type": "string"}, "url": {"type": "string", "format": "uri"}, "icon": {"type": "string"}, "features": {"type": "array", "items": {"type": "string"}}}}}}}}}}}
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

/* forward declarations for MCP tool handlers */
static void handle_pipelines_stop(const httplib::Request &req,
                                  httplib::Response &res);

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
                "{\"name\":\"get_catalog\",\"description\":\"Get model catalog\",\"inputSchema\":{\"type\":\"object\",\"properties\":{}}},"
                "{\"name\":\"start_pipeline\",\"description\":\"Start a pipeline run\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"yaml\":{\"type\":\"string\"},\"model\":{\"type\":\"string\"},\"prompt\":{\"type\":\"string\"},\"seed\":{\"type\":\"integer\"},\"calls\":{\"type\":\"array\"}}}},"
                "{\"name\":\"get_run_status\",\"description\":\"Get run status\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"run_id\":{\"type\":\"string\"}},\"required\":[\"run_id\"]}},"
                "{\"name\":\"stop_pipeline\",\"description\":\"Stop a running pipeline\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"run_id\":{\"type\":\"string\"}},\"required\":[\"run_id\"]}},"
                "{\"name\":\"list_runs\",\"description\":\"List pipeline runs\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"limit\":{\"type\":\"integer\"}}}},"
                "{\"name\":\"list_pipelines\",\"description\":\"List available pipeline YAMLs\",\"inputSchema\":{\"type\":\"object\",\"properties\":{}}},"
                "{\"name\":\"describe_model\",\"description\":\"Describe a model from the catalog\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"model_id\":{\"type\":\"string\"}},\"required\":[\"model_id\"]}}"
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
            "{\"name\":\"get_catalog\",\"description\":\"Get model catalog\",\"inputSchema\":{\"type\":\"object\",\"properties\":{}}},"
            "{\"name\":\"start_pipeline\",\"description\":\"Start a pipeline run\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"yaml\":{\"type\":\"string\"},\"model\":{\"type\":\"string\"},\"prompt\":{\"type\":\"string\"},\"seed\":{\"type\":\"integer\"},\"calls\":{\"type\":\"array\"}}}},"
            "{\"name\":\"get_run_status\",\"description\":\"Get run status\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"run_id\":{\"type\":\"string\"}},\"required\":[\"run_id\"]}},"
            "{\"name\":\"stop_pipeline\",\"description\":\"Stop a running pipeline\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"run_id\":{\"type\":\"string\"}},\"required\":[\"run_id\"]}},"
            "{\"name\":\"list_runs\",\"description\":\"List pipeline runs\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"limit\":{\"type\":\"integer\"}}}},"
            "{\"name\":\"list_pipelines\",\"description\":\"List available pipeline YAMLs\",\"inputSchema\":{\"type\":\"object\",\"properties\":{}}},"
            "{\"name\":\"describe_model\",\"description\":\"Describe a model from the catalog\",\"inputSchema\":{\"type\":\"object\",\"properties\":{\"model_id\":{\"type\":\"string\"}},\"required\":[\"model_id\"]}}"
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

        if (tool_name == "start_pipeline") {
            auto pp = body.find('\"params\":');
            std::string rb = "{}";
            if (pp != std::string::npos) {
                auto os = body.find('{', pp);
                if (os != std::string::npos) {
                    int d = 0; bool in_s = false; bool esc = false;
                    size_t oe = os;
                    for (size_t k = os; k < body.size(); k++) {
                        char c = body[k];
                        if (esc) { esc = false; continue; }
                        if (in_s && c == '\\') { esc = true; continue; }
                        if (c == '"') { in_s = !in_s; continue; }
                        if (in_s) continue;
                        if (c == '{') d++;
                        else if (c == '}') { d--; if (d == 0) { oe = k; break; } }
                    }
                    rb = body.substr(os, oe - os + 1);
                }
            } else { rb = body; }
            httplib::Request fReq; httplib::Response fRes;
            fReq.body = rb;
            handle_pipelines_start(fReq, fRes);
            res.set_content(
                "{\"jsonrpc\":\"2.0\",\"id\":" + id + ","
                "\"result\":{\"content\":[{\"type\":\"text\",\"text\":\"\"" +
                json_escape(fRes.body.c_str()) + "}]}}",
                "application/json");
            return;
        }

        if (tool_name == "get_run_status") {
            std::string rid = extract_field("run_id");
            httplib::Request fReq; httplib::Response fRes;
            fReq.path_params["run_id"] = rid;
            handle_pipelines_status(fReq, fRes);
            res.set_content(
                "{\"jsonrpc\":\"2.0\",\"id\":" + id + ","
                "\"result\":{\"content\":[{\"type\":\"text\",\"text\":\"\"" +
                json_escape(fRes.body.c_str()) + "}]}}",
                "application/json");
            return;
        }

        if (tool_name == "stop_pipeline") {
            std::string rid = extract_field("run_id");
            httplib::Request fReq; httplib::Response fRes;
            fReq.path_params["run_id"] = rid;
            handle_pipelines_stop(fReq, fRes);
            res.set_content(
                "{\"jsonrpc\":\"2.0\",\"id\":" + id + ","
                "\"result\":{\"content\":[{\"type\":\"text\",\"text\":\"\"" +
                json_escape(fRes.body.c_str()) + "}]}}",
                "application/json");
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
    char model[64] = "";   /* (law 2026-08-30) no default model */
    char body_tmp[2048] = "";
    if (req.body.size() < sizeof(body_tmp))
        snprintf(body_tmp, sizeof(body_tmp), "%s", req.body.c_str());
    char tmp[256];
    if (inf_json_string(body_tmp, "model", tmp, sizeof(tmp)) == 0)
        snprintf(model, sizeof(model), "%s", tmp);
    if (!model[0]) {
        res.status = 400;
        res.set_content("{\"error\":\"missing model (no default by law)\"}", "application/json");
        return;
    }

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

    /* (audit M4, 2026-08-29) FIFO ticket at REGISTRATION: strict
     * submission order, independent of thread scheduling. */
    {
        pthread_mutex_lock(&g_gpu_mu);
        g_runs[idx].ticket = g_gpu_tickets++;
        g_runs[idx].has_ticket = 1;
        pthread_mutex_unlock(&g_gpu_mu);
    }
    if (run_spawn_thread(idx, run_thread_fn) != 0) {
        /* the ticket was abandoned IN ORDER by the helper; fail loudly */
        pthread_mutex_lock(&g_runs_mu);
        run_slot_release_heap(idx);
        pthread_mutex_unlock(&g_runs_mu);
        res.status = 503;
        res.set_content("{\"error\":\"thread spawn failed\"}",
                        "application/json");
        return;
    }

    char out[256];
    snprintf(out, sizeof(out), "{\"run_id\":\"%s\",\"status\":\"queued\"}",
             g_runs[idx].run_id);
    res.status = 202;
    res.set_content(out, "application/json");
}

/* ==================================================================
 * SERVER LIFECYCLE
 * ================================================================== */

/* ==================================================================
 * (audit F7/F13, 2026-08-29) BOOT SWEEP + CLEAN SHUTDOWN
 * ================================================================== */

/* Patch one stale sidecar (running/queued with no live owner after a
 * crash or kill -9) to failed, atomically. Returns 1 if patched.
 * (audit F7 rev2, 2026-08-29) replaces EVERY status occurrence — the
 * top-level status AND per-stage statuses — because a first-match-only
 * rewrite left stage entries claiming "running" and the next boot
 * re-swept the same file forever. The reason is appended as a new
 * "sweep" key before the closing brace (no duplicate keys). */
static int boot_patch_sidecar(const char *path, const char *why) {
    FILE *f = fopen(path, "rb");
    if (!f) return 0;
    fseek(f, 0, SEEK_END); long sz = ftell(f);
    fseek(f, 0, SEEK_SET);
    if (sz <= 0 || sz > 8 * 1024 * 1024) { fclose(f); return 0; }
    char *buf = (char *)malloc((size_t)sz + 1);
    if (!buf) { fclose(f); return 0; }
    size_t rd = fread(buf, 1, (size_t)sz, f);
    buf[rd] = 0;
    fclose(f);
    if (!strstr(buf, "\"status\":\"running\"") &&
        !strstr(buf, "\"status\":\"queued\"")) { free(buf); return 0; }
    /* cap the reason to plain ASCII without quotes for safe embedding */
    char note[160];
    { size_t i = 0;
      for (const char *s = why; s && *s && i < sizeof(note) - 1; s++)
          note[i++] = (*s == '"' || (unsigned char)*s < 32) ? ' ' : *s;
      note[i] = 0; }
    char *fixed = (char *)malloc(rd + strlen(note) + 64);
    if (!fixed) { free(buf); return 0; }
    const char *r = buf; size_t w = 0;
    while (*r) {
        if (strncmp(r, "\"status\":\"running\"", 18) == 0) {
            memcpy(fixed + w, "\"status\":\"failed\"", 17); w += 17; r += 18;
        } else if (strncmp(r, "\"status\":\"queued\"", 17) == 0) {
            memcpy(fixed + w, "\"status\":\"failed\"", 17); w += 17; r += 17;
        } else {
            fixed[w++] = *r++;
        }
    }
    fixed[w] = 0;
    /* append the sweep note before the final closing brace */
    char *last = strrchr(fixed, '}');
    if (last) {
        size_t pos = (size_t)(last - fixed);
        char tail[256];
        int tl = snprintf(tail, sizeof(tail),
                          ",\"sweep\":\"%s\"}", note);
        memmove(fixed + pos + (size_t)tl, fixed + pos + 1, strlen(fixed + pos + 1) + 1);
        memcpy(fixed + pos, tail, (size_t)tl);
    }
    char tmp[720];
    snprintf(tmp, sizeof(tmp), "%s.tmp", path);
    FILE *o = fopen(tmp, "w");
    int ok = 0;
    if (o) {
        fputs(fixed, o);
        if (fclose(o) == 0) ok = (rename(tmp, path) == 0);
    }
    if (!ok) unlink(tmp);
    free(fixed); free(buf);
    return ok;
}

/* Boot-time zombie sweep: every sidecar still claiming running/queued
 * belongs to a DEAD process (we just started — nothing is live yet).
 * Sweep them to failed BEFORE the server accepts traffic, so the ledger
 * never shows phantom active runs after a crash/restart. */
static void boot_sweep_stale_sidecars(void) {
    DIR *d = opendir("./output");
    if (!d) return;
    struct dirent *e;
    int swept = 0;
    while ((e = readdir(d)) != NULL) {
        if (strncmp(e->d_name, "run-", 4) != 0) continue;
        char path[760];
        snprintf(path, sizeof(path), "./output/%s/_pipeline.json", e->d_name);
        if (boot_patch_sidecar(path, "gateway restarted (boot sweep): stale active sidecar from a dead process")) {
            char eb[400];
            snprintf(eb, sizeof(eb),
                     "{\"run_id\":\"%s\",\"state\":\"failed\","
                     "\"error\":\"boot sweep\"}", e->d_name);
            ledger_log("run.swept", eb);
            swept++;
        }
    }
    closedir(d);
    if (swept)
        fprintf(stderr, "[boot-sweep] patched %d stale sidecar(s) to failed\n", swept);
}

/* Clean-shutdown thread (audit F13): SIGTERM/SIGINT are BLOCKED in every
 * thread (mask inherited from this one); this thread sigwait()s for them.
 * On receipt: every queued/running run is marked stopped with the reason,
 * sidecars + ledger written, then exit(0). No run is ever left claiming
 * "running" after a deliberate shutdown. */
static void *shutdown_signal_thread(void *arg) {
    (void)arg;
    int sig;
    sigset_t set;
    sigemptyset(&set);
    sigaddset(&set, SIGTERM);
    sigaddset(&set, SIGINT);
    for (;;) {
        if (sigwait(&set, &sig) != 0) continue;
        fprintf(stderr, "[shutdown] caught signal %d — marking active runs stopped\n", sig);
        pthread_mutex_lock(&g_runs_mu);
        size_t marked[64]; size_t n_marked = 0;
        for (size_t i = 0; i < g_n_runs && n_marked < 64; i++)
            if (strcmp(g_runs[i].state, "queued") == 0 ||
                strcmp(g_runs[i].state, "running") == 0)
                marked[n_marked++] = i;
        pthread_mutex_unlock(&g_runs_mu);
        for (size_t k = 0; k < n_marked; k++)
            run_set_state(marked[k], "stopped",
                          "gateway shutdown (operator signal)");
        ledger_log("server.shutdown", "{\"reason\":\"signal\"}");
        exit(0);
    }
    return NULL;
}

inference_server *server_create(int port, const char *bind_addr) {
    /* (audit F13) Block SIGTERM/SIGINT BEFORE any thread exists — every
     * thread inherits this mask, and the dedicated shutdown thread below
     * catches the signals via sigwait(). A Ctrl+C or systemd stop can
     * never kill a run thread mid-sidecar-write. */
    {
        sigset_t set;
        sigemptyset(&set);
        sigaddset(&set, SIGTERM);
        sigaddset(&set, SIGINT);
        pthread_sigmask(SIG_BLOCK, &set, NULL);
        pthread_t sth;
        if (pthread_create(&sth, NULL, shutdown_signal_thread, NULL) == 0)
            pthread_detach(sth);
        else
            fprintf(stderr, "[shutdown] WARNING: signal thread spawn failed\n");
    }

    /* (audit F7) sweep stale active sidecars from any dead process */
    boot_sweep_stale_sidecars();

    inference_server *s = new inference_server;
    if (!s) return NULL;
    s->port    = port;
    s->ws_port = port + 1;
    snprintf(s->bind_addr, sizeof(s->bind_addr), "%s",
             bind_addr && bind_addr[0] ? bind_addr : "127.0.0.1");
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
    s->srv.Patch("/v1/pipelines/drafts/:id/stages/:sid",
                 handle_draft_stage_patch);
    s->srv.Get("/v1/pipelines/drafts",     handle_draft_list);
    s->srv.Get("/v1/pipelines/yaml/list",  handle_yaml_list);
    s->srv.Get("/v1/pipelines/yaml/detail", handle_yaml_detail);
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
    s->srv.Get("/v1/apps",                 handle_apps);
    s->srv.Get("/apps",                    handle_apps_index);
    s->srv.Post("/v1/compose",              handle_compose);

    /* ---- ANNY poser (ray Body Studio parity — native C++ backend) ---- */
    s->srv.Get("/poser/skin/identity-space", handle_poser_identity_space);
    s->srv.Post("/poser/skin/mesh",          handle_poser_mesh);
    /* every unmatched route answers with VALID JSON so client-side
     * res.json() never trips on an empty body */
    s->srv.set_error_handler([](const auto &req, auto &res) {
        char b0 = res.body.empty() ? 0 : res.body[0];
        if (b0 != '{' && b0 != '[') {   /* keep handler-provided JSON bodies */
            res.status = res.status ? res.status : 404;
            res.set_content("{\"error\":\"not found\",\"path\":" + JQ(req.path) + "}", "application/json");
        }
    });
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
    fprintf(stderr, "server: listening on http://%s:%d\n", s->bind_addr, s->port);
    s->srv.listen(s->bind_addr, s->port);
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
