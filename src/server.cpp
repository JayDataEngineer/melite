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
#include <atomic>    /* (id-uniqueness law) g_run_seq */
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

#define RUNREG_MAX 128   /* N-window law: bigger entries, halved registry (slots recycle) */
#define RUN_ARTIFACTS_MAX 16

typedef struct {
    char name[64];
    char dtype[8];           /* "f32" or "u8" */
    float f;
    char *bytes;             /* malloc'd; owned by the entry, freed post-run */
    size_t nbytes;
} run_input;

/* (N-window law, 2026-08-31) ONE timeline card = N calls = ONE run:
 * stages hold every window + stitch. error copy 2048->768 to keep the
 * registry affordable at this depth (sidecar ledger keeps full text). */
#define RUN_STAGES_MAX 136
#define RUN_STAGE_ARTS_MAX 4

typedef struct {
    char id[64];             /* node id from the pipeline YAML */
    char state[16];          /* pending|running|done|skipped|error */
    char error[768];         /* exact error message (full text in sidecar ledger) */
    char arts[RUN_STAGE_ARTS_MAX][160];  /* artifacts attributed to this stage */
    size_t n_arts;
} run_stage;

typedef struct {
    char run_id[48];
    char state[16];          /* queued|running|success|error|stopped */
    char error[256];
    char out_dir[512];
    /* (latent-chain law, 2026-08-30) the run's PLAN — what the compile
     * computed at registration. tl_n = window count (0 = not a timeline
     * run); tl_trims = carried head frames per window (window 1 = 0);
     * tl_spans = delivered tile frames per window. Two consumers:
     * the post-run META CROSS-CHECK (each chain node's <tail>.meta.json
     * carried_pixel_frames must equal tl_trims or the run is an error —
     * a drift means the film double-plays or skips at the joins) and the
     * card reconstruction (params.calls rebuilt 1:1 from these + the
     * actual prompt run inputs). */
#define RUN_TL_MAX 128
    int  tl_n;
    int  tl_trims[RUN_TL_MAX];
    int  tl_spans[RUN_TL_MAX];
    /* (audit F31, 2026-08-29) sized to never truncate (h3-timeline-b4
     * sat 28 bytes from a silent dag-parse failure at the old 2048).
     * (N-window law, 2026-08-31) 128KB: ONE card with up to 128 calls
     * expands to N window stages INSIDE this buffer. */
    char yaml[131072];       /* the pipeline YAML this run executes */
    char model[64];          /* requested model (spec persistence) */
    char prompt[2048];       /* requested prompt (spec persistence) */
    long seed;               /* requested seed, -1 = unset */
    time_t created;
    run_input inputs[144];   /* N-window law: prompt..promptN + globals */
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

/* ── (2026-08-31 GRID LAW / 2026-08-30 LATENT-CHAIN LAW) ────────────
 * H3 snaps every clip length UP to the 17k+5 frame grid (5,22,39,56,
 * 73,90,107,124... — align_frame_count, ComfyUI nodes_minimax_h3.py).
 * The exterminated motion-context pack is GONE: seams are TRUE latent
 * chains now (RayH3SaveLatentTail -> RayH3ChainLatentAV, in-tree pack
 * plugins/comfyui/custom_nodes/melite-h3-motion-nodes). Each seam
 * window splices the previous window's SAMPLED latent tail
 * (carry_latent_frames slots) into its head — bit-exact carry — and
 * REGENERATES those frames as its decoded head. Zero-skip tiling
 * therefore REQUIRES the concat to trim EXACTLY carried_pixel_frames
 * off each seam window's head and to deliver the whole remainder:
 *     tile = sampled - carried_px   (seam windows, n > 0; 17k multiple)
 *     tile = sampled                (window 1, no carry)
 * A tail span-cut below sampled - carried_px would skip motion (the
 * next carry comes from the SAMPLED tail, past the cut) — never do it.
 * The chain node writes <tail>.meta.json with the exact numbers; the
 * plan math below mirrors _carried_pixel_frames() in h3_chain.py and
 * a mismatch is a hard error at the stitch. */
static int tl_snap_grid(int n, int resid) {
    int k = (n - resid + 8) / 17;      /* nearest k */
    int v = 17 * k + resid;
    return v < resid ? resid : v;
}

/* grid math mirrors h3_chain.py (_video_latent_t / _carried_pixel_frames):
 * video latent slots for a sampled frame count; pixel frames covered by
 * the LAST carry slots of a window with total_slots slots. */
static int tl_slots_for(int frames) {
    return frames <= 5 ? 2 : ((frames - 5) / 17) * 5 + 2;
}
static int tl_carried_px(int carry, int total_slots) {
    if (total_slots <= 2 || carry >= total_slots)
        return total_slots == 2 ? 5 : 5 + (total_slots - 2) * 17 / 5;
    int head = carry < 2 ? carry : 2;
    int tail = carry - head;
    return head * 5 / 2 + tail * 17 / 5;
}

/* The seam carry is the RayH3ChainLatentAV carry_latent_frames WIDGET in
 * the seam template — the single source of truth, never a hardcoded 6
 * (queue-lane law: no hardcodes). Read once, cached.
 * -1 = graph unreadable (start door rejects loudly). */
static int tl_scan_carry(const char *body, char *out, size_t outsz);
static int tl_carry_cache = -2;   /* -2 unloaded, -1 error, >=0 slots */
static pthread_mutex_t tl_carry_mu = PTHREAD_MUTEX_INITIALIZER;
static int tl_carry_default(void) {
    pthread_mutex_lock(&tl_carry_mu);
    if (tl_carry_cache == -2) {
        tl_carry_cache = -1;
        static const char *paths[] = {
            "../pipelines/h3-timeline/window2_t4.json",
            "pipelines/h3-timeline/window2_t4.json",
        };
        for (size_t pi = 0; pi < 2 && tl_carry_cache < 0; pi++) {
            FILE *f = fopen(paths[pi], "rb");
            if (!f) continue;
            char buf[16384];
            size_t r = fread(buf, 1, sizeof(buf) - 1, f);
            fclose(f); buf[r] = 0;
            char *ch = strstr(buf, "\"RayH3ChainLatentAV.0\"");
            if (!ch) continue;
            char *cl = strstr(ch, "\"carry_latent_frames\"");
            if (!cl) continue;
            /* INT widget — scan past the colon for the number */
            char cv[32];
            if (tl_scan_carry(cl, cv, sizeof cv)) {
                int v = atoi(cv);
                if (v >= 1 && v <= 64) tl_carry_cache = v;
            }
        }
    }
    int v = tl_carry_cache;
    pthread_mutex_unlock(&tl_carry_mu);
    return v;
}

/* Card-level carry_latent_frames override (latent TAIL SLOTS, 1..64 —
 * the node's own range; 6 slots ≈ 18px ≈ 0.75s at the default widget).
 * Accepts "6" or 6. */
static int tl_scan_carry(const char *body, char *out, size_t outsz) {
    out[0] = 0;
    if (!body) return 0;
    const char *k = strstr(body, "\"carry_latent_frames\"");
    if (!k) return 0;
    const char *v = k + strlen("\"carry_latent_frames\"");
    while (*v == ' ' || *v == '\t' || *v == '\n' || *v == '\r') v++;
    if (*v != ':') return 0;
    v++;
    while (*v == ' ' || *v == '\t' || *v == '\n' || *v == '\r') v++;
    if (*v == '"') {
        v++;
        size_t o = 0;
        while (*v && *v != '"' && o + 1 < outsz) out[o++] = *v++;
        out[o] = 0;
    } else {
        snprintf(out, outsz, "%d", atoi(v));
    }
    return out[0] != 0;
}

#define TL_MAX_WINDOWS 128   /* N-window law: ONE card = N calls = ONE run.
                               * Buffer-derived engineering bound (128KB run
                               * yaml), stated loudly — never a product cap
                               * on film length. 128 calls ~ 7.5 min film. */

/* (N-window law, 2026-08-31) ONE card = N calls = ONE run. The static
 * pipeline.yaml ships 4 window stages; this expands the run graph
 * in-place to nw windows by cloning the window2 seam prototype: clone k
 * gets a unique stage id, its own prompt inject key ($promptK), and its
 * own latent-tail inject keys ($tailpathK save / $tailpathK-1 chain —
 * the same workflow file for every seam; the .pt paths ride the inject
 * map and resolve from run inputs at execute time). The stitch
 * input_from list is rebuilt for N inputs. Returns 0 on success; -1 on
 * any anchor or buffer failure — the caller fails the run LOUDLY, never
 * a silent truncation. nw <= 4 is a no-op (the static graph covers it,
 * the proven path). */
static int tl_expand_windows(char *yaml, size_t cap, int nw) {
    if (nw <= 4) return 0;
    if (nw > TL_MAX_WINDOWS) return -1;

    const char *w2 = strstr(yaml, "- id: window2");
    const char *w3 = strstr(yaml, "- id: window3");
    const char *st = strstr(yaml, "- id: stitch");
    const char *inf = st ? strstr(st, "input_from:") : NULL;
    if (!w2 || !w3 || !st || !inf || w3 < w2 || st < w3 || inf < st)
        return -1;

    /* input_from entry list: starts after the colon, ends at the first
     * line that does not begin with a '-' entry */
    const char *il = inf + strlen("input_from:");
    const char *ie = il;
    {
        const char *q = il;
        while (*q) {
            while (*q == ' ' || *q == '\t' || *q == '\n' || *q == '\r') q++;
            if (*q == '-') {
                while (*q && *q != '\n') q++;
                if (*q) q++;
                ie = q;
            } else break;
        }
    }

    size_t proto_len = (size_t)(w3 - w2);
    size_t head_len  = (size_t)(w2 - yaml);
    size_t stch_len  = (size_t)(il - st);          /* stitch block header */
    size_t tail_len  = strlen(ie);
    size_t need = head_len + stch_len + tail_len + 64;
    for (int k = 2; k <= nw; k++) need += proto_len + 200;
    need += (size_t)nw * 26;                        /* input_from lines */
    if (need + 64 >= cap) return -1;

    char *out = (char *)malloc(need + 256);
    if (!out) return -1;
    size_t o = 0;

    memcpy(out, yaml, head_len); o = head_len;

    for (int k = 2; k <= nw; k++) {
        size_t i = 0;
        while (i < proto_len) {
            if (strncmp(w2 + i, "- id: window2", 13) == 0) {
                o += (size_t)snprintf(out + o, 32, "- id: window%d", k);
                i += 13;
            } else if (strncmp(w2 + i, "$prompt2", 8) == 0) {
                o += (size_t)snprintf(out + o, 32, "$prompt%d", k);
                i += 8;
                /* the first '}' after the needle closes the INJECT MAP.
                 * Copy the span up to it with the prototype's tail-path
                 * vars REWRITTEN to this clone's own ($tailpath2 is the
                 * prototype's save var, $tailpath1 its chain source).
                 * Never eat the closing quote — that corrupts the JSON
                 * and the plugin skips the whole inject map (proven live
                 * 2026-08-31: "$prompt5, — windows 2-6 ran on baked
                 * defaults, byte-identical). */
                const char *cl = w2 + i;
                while (cl < w3 && *cl != '}') cl++;
                if (cl >= w3 || *cl != '}') { free(out); return -1; }
                const char *s = w2 + i;
                while (s < cl) {
                    if (strncmp(s, "$tailpath2", 10) == 0) {
                        o += (size_t)snprintf(out + o, 32, "$tailpath%d", k);
                        s += 10;
                    } else if (strncmp(s, "$tailpath1", 10) == 0) {
                        o += (size_t)snprintf(out + o, 32, "$tailpath%d", k - 1);
                        s += 10;
                    } else {
                        out[o++] = *s++;
                    }
                }
                out[o++] = *cl;
                i = (size_t)(cl - w2) + 1;
            } else {
                out[o++] = w2[i++];
            }
        }
        if (o + 2 >= need + 256) { free(out); return -1; }
    }

    /* stitch block header (through "input_from:"), then N entries */
    memcpy(out + o, st, stch_len); o += stch_len;
    for (int k = 1; k <= nw; k++)
        o += (size_t)snprintf(out + o, 32, "\n      - window%d.video_0", k);
    memcpy(out + o, ie, tail_len); o += tail_len;
    out[o] = 0;

    snprintf(yaml, cap, "%s", out);
    free(out);
    return 0;
}

static int compile_calls_windows(const char *body, char out[TL_MAX_WINDOWS][2048],
                                 int lens[TL_MAX_WINDOWS], int spans_out[TL_MAX_WINDOWS],
                                 int trims_out[TL_MAX_WINDOWS]) {
    const char *key = strstr(body, "\"calls\"");
    if (!key) return 0;
    /* (latent-chain law) the seam carry: card-level override, else the
     * RayH3ChainLatentAV widget in the seam template. Returns
     * -1 = seam graph unreadable, -2 = carry off the node's 1..64 range. */
    int carry = -1;
    {
        char cv[32];
        if (tl_scan_carry(body, cv, sizeof cv))
            carry = atoi(cv);
        else
            carry = tl_carry_default();
        if (carry <= 0) return -1;
        if (carry < 1 || carry > 64) return -2;
    }
    /* (2026-08-30 string-form law) callers send calls EITHER as a JSON
     * array OR as a JSON-encoded STRING (the h3_timeline_card tool and
     * the drafts door store the document as a string). Escaped quotes
     * (\"start_frame\") make the array walker see one giant string and
     * parse zero windows -> default 1.66s stub renders. Unescape the
     * string form first so both shapes hit the same parser. */
    char scratch[16384];
    const char *calls = NULL;
    {
        const char *v = key + 7;                     /* past "calls" */
        while (*v == ' ' || *v == '\t' || *v == '\n') v++;
        if (*v == ':') v++;
        while (*v == ' ' || *v == '\t' || *v == '\n') v++;
        if (*v == '"') {                             /* string form */
            size_t o = 0; v++;
            while (*v && *v != '"' && o + 1 < sizeof(scratch)) {
                if (*v == '\\' && v[1]) {
                    char c2 = v[1];
                    v += 2;
                    if (c2 == 'n') scratch[o++] = '\n';
                    else if (c2 == 't') scratch[o++] = '\t';
                    else scratch[o++] = c2;          /* \" \\ etc: the char */
                } else scratch[o++] = *v++;
            }
            scratch[o] = 0;
            calls = strchr(scratch, '[');
            if (!calls) return 0;
        } else {
            calls = strchr(key + 7, '[');
            if (!calls) return 0;
        }
    }
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
                if (n >= TL_MAX_WINDOWS) {
                    /* (no silent caps law, 2026-08-30) a card with more
                     * calls than the window array must REJECT, not
                     * silently truncate: a dropped call is a dropped
                     * shot, and the film would lie about its own length */
                    return -4;
                }
                {
                    size_t len = (size_t)(p - obj_start + 2);
                    char *obj = (char *)malloc(len + 1);
                    if (obj) {
                        memcpy(obj, obj_start, len); obj[len] = 0;
                        out[n][0] = 0; size_t o = 0;
                        const char *q = obj;
                        /* (2026-08-30 whitespace law) accept "text" with any
                         * spacing around the colon -- callers serialize with
                         * json.dumps (space after colon); the old byte-exact
                         * match silently produced zero windows and default
                         * 1.66s renders on full-length specs. */
                        while (q && o + 300 < 2048) {
                            q = strstr(q, "\"text\"");
                            if (!q) break;
                            const char *r = q + 6;
                            while (*r == ' ' || *r == '\t' || *r == '\n' || *r == '\r') r++;
                            if (*r != ':') { q += 6; continue; }
                            r++;
                            while (*r == ' ' || *r == '\t' || *r == '\n' || *r == '\r') r++;
                            if (*r != '"') { q += 6; continue; }
                            q = r + 1;
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
                        /* (LATENT-CHAIN LAW — replaces the pack's in-graph
                         * trim): sampled ON-GRID at 17k+5, the chain node
                         * carries `carry` tail slots from the previous
                         * window's SAMPLED tail and regenerates them as
                         * this window's head; the concat trims EXACTLY
                         * carried_px off the head and delivers the whole
                         * remainder (a tail span-cut would skip motion —
                         * the next carry starts at the sampled tail).
                         * sampled = smallest grid point covering
                         * tile + carried_px(sampled) — a fixpoint (the
                         * carry math depends on the sampled slot count). */
                        {
                            int sf=0, ef=0;
                            const char *m = strstr(obj, "start_frame");
                            if (m) sf = atoi(strchr(m, ':') + 1);
                            m = strstr(obj, "end_frame");
                            if (m) ef = atoi(strchr(m, ':') + 1);
                            int span = ef > sf ? ef - sf : 0;
                            if (n == 0) {
                                lens[n] = tl_snap_grid(span, 5);
                                if (spans_out) spans_out[n] = lens[n];
                                if (trims_out) trims_out[n] = 0;
                            } else {
                                int tile = tl_snap_grid(span, 0);
                                /* THE NODE'S OWN CLAMP — the plan must carry
                                 * EXACTLY what RayH3ChainLatentAV will splice:
                                 *   c = max(1, min(carry, total_slots-1,
                                 *                   tail_slots))
                                 * total_slots = slots(sampled) (this head);
                                 * tail_slots = slots(lens[n-1]) (the previous
                                 * window's SAMPLED tail). Planning with the
                                 * RAW carry diverges from the node's meta and
                                 * the film double-plays at the join. */
                                int tail_S = tl_slots_for(lens[n - 1]);
                                int sampled = tile;
                                int cp = 0;
                                for (int it = 0; it < 8; it++) {
                                    int S = tl_slots_for(sampled);
                                    int c_eff = carry;
                                    if (c_eff > S - 1) c_eff = S - 1;
                                    if (c_eff > tail_S) c_eff = tail_S;
                                    if (c_eff < 1) c_eff = 1;
                                    cp = tl_carried_px(c_eff, S);
                                    int want = tl_snap_grid(tile + cp, 5);
                                    if (want == sampled) break;
                                    sampled = want;
                                }
                                /* cover-or-reject (queue lane law): growing
                                 * the sample cannot outrun a carry that eats
                                 * every new slot — for carry near the tile's
                                 * slot demand NO grid point covers the tile.
                                 * Bump until covered or past the grid
                                 * ceiling; still uncovered = 4xx, never a
                                 * silent motion-skipping span. */
                                int covered = 0;
                                for (int bump = 0; bump < 220; bump++) {
                                    int S = tl_slots_for(sampled);
                                    int c_eff = carry;
                                    if (c_eff > S - 1) c_eff = S - 1;
                                    if (c_eff > tail_S) c_eff = tail_S;
                                    if (c_eff < 1) c_eff = 1;
                                    cp = tl_carried_px(c_eff, S);
                                    if (sampled - cp >= tile) { covered = 1; break; }
                                    if (sampled >= 17 * 128 + 5) break;
                                    sampled = tl_snap_grid(sampled + 17, 5);
                                }
                                if (!covered) {
                                    free(obj);
                                    return -3;   /* carry/tile incompatible */
                                }
                                lens[n] = sampled;
                                if (spans_out) spans_out[n] = sampled - cp;
                                if (trims_out) trims_out[n] = cp;
                            }
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
    if (g_runs[idx].n_inputs >= 144) return;
    run_input *ri = &g_runs[idx].inputs[g_runs[idx].n_inputs++];
    snprintf(ri->name, sizeof(ri->name), "%s", name);
    snprintf(ri->dtype, sizeof(ri->dtype), "u8");
    ri->f = 0;
    ri->nbytes = strlen(s) + 1;  /* +1: NUL for C-string ops (access, curl) */
    ri->bytes = (char *)malloc(ri->nbytes);
    memcpy(ri->bytes, s, ri->nbytes);
}

static void add_run_input_f32(size_t idx, const char *name, float f) {
    if (g_runs[idx].n_inputs >= 144) return;
    run_input *ri = &g_runs[idx].inputs[g_runs[idx].n_inputs++];
    snprintf(ri->name, sizeof(ri->name), "%s", name);
    snprintf(ri->dtype, sizeof(ri->dtype), "f32");
    ri->f = f;
    ri->bytes = (char *)malloc(4);
    memcpy(ri->bytes, &f, 4);
    ri->nbytes = 4;
}

/* (validation law, 2026-08-30) schema-driven input coverage.
 *
 * PROVEN FAILURE (2026-08-30, six dead runs): the motion card submits
 * params {text, model, frames, ...}; the kimodo pipeline's node
 * declares a REQUIRED "text" input; the gateway registered the run
 * with prompt/seed inputs only and let it burn a queue slot to die at
 * EXECUTION ("[kimodo] no text input"). Same class: anny "sliders".
 * The engine schemas were always queryable — nothing asked.
 *
 * This pass runs AFTER input registration, BEFORE the FIFO ticket:
 *   1. WIRING — for every node's REQUIRED input with no run input
 *      of that name, if the request body carries a string field with
 *      that exact name, register it as the run input (schema-driven,
 *      no per-lane hardcode: the card's field IS the engine's input).
 *   2. COVERAGE — a required input still unsatisfied (no run input,
 *      no cross-node input_from ref naming it) rejects the request
 *      4xx BEFORE any ticket/thread/sidecar is committed (queue lane
 *      law: no zombie slots). Engines with runtime name aliasing
 *      (audio: text|prompt|lyrics) declare their inputs optional —
 *      validation defers to the engine's own loud error. */
static int run_input_has(size_t idx, const char *name) {
    for (size_t i = 0; i < g_runs[idx].n_inputs; i++)
        if (g_runs[idx].inputs[i].name &&
            strcmp(g_runs[idx].inputs[i].name, name) == 0)
            return 1;
    return 0;
}

/* Returns 0 = coverage OK (wiring applied as needed); -1 = rejection
 * message written to err. */
static int run_validate_input_coverage(size_t idx, const char *body,
                                       char *err, size_t errsz) {
    if (!g_server_runner) return 0;   /* no plugin registry: skip */
    inference_dag *dag = dag_parse_string(g_runs[idx].yaml,
                                          strlen(g_runs[idx].yaml));
    if (!dag) {
        snprintf(err, errsz, "dag parse failed before validation");
        return -1;
    }
    int rc = 0;
    for (size_t n = 0; n < dag->n_nodes && rc == 0; n++) {
        dag_node *dn = &dag->nodes[n];
        if (!dn->type || !dn->id) continue;
        char sch[4096];
        if (runner_schema_for_type(g_server_runner, dn->type,
                                   sch, sizeof sch) <= 0)
            continue;   /* native/unknown type: nothing declared */
        const char *ip = strstr(sch, "\"inputs\"");
        if (!ip) continue;
        ip = strchr(ip, '[');
        if (!ip) continue;
        for (;;) {
            const char *o = strstr(ip, "{\"name\":\"");
            if (!o) break;
            o += strlen("{\"name\":\"");
            char nm[64];
            size_t nl = 0;
            while (*o && *o != '"' && nl < sizeof nm - 1) nm[nl++] = *o++;
            nm[nl] = 0;
            const char *e = strchr(o, '}');
            if (!e) break;
            int required = 0;
            for (const char *q = o; q < e; q++)
                if (strncmp(q, "\"required\":true", 15) == 0 ||
                    strncmp(q, "\"required\": true", 16) == 0) {
                    required = 1;
                    break;
                }
            ip = e;
            if (!required || !nm[0]) continue;
            if (run_input_has(idx, nm)) continue;
            /* cross-node reference naming this tensor? */
            int refed = 0;
            for (size_t ri = 0; ri < dn->n_inputs; ri++) {
                if (!dn->input_from[ri]) continue;
                const char *dot = strrchr(dn->input_from[ri], '.');
                if (dot && strcmp(dot + 1, nm) == 0) { refed = 1; break; }
            }
            if (refed) continue;
            /* schema-driven wiring: the body's same-named field */
            char val[8192];
            if (inf_json_string(body, nm, val, sizeof val) == 0 && val[0]) {
                add_run_input_text(idx, nm, val);
                fprintf(stderr,
                        "[validation] wired body field '%s' -> run input "
                        "for node '%s' (type %s)\n",
                        nm, dn->id, dn->type);
                continue;
            }
            snprintf(err, errsz,
                     "pipeline node '%s' (type %s) requires input '%s': "
                     "no run input, cross-node ref, or request field "
                     "provides it",
                     dn->id, dn->type, nm);
            rc = -1;
            break;
        }
    }
    dag_free(dag);
    return rc;
}

/* extra beat fields the timeline card carries (multi-window prompts).
 * (audit F2) tl_wins/tl_nw are the CALLER'S LOCAL compile output — no
 * shared state, concurrent registrations cannot cross-wire prompts. */
static void add_run_extra_inputs(size_t idx, const char *body,
                                 char *tmp, size_t tmpcap,
                                 char tl_wins[TL_MAX_WINDOWS][2048], int tl_nw) {    /* (N-window law) prompt2..promptN for EVERY window of the card.
     * (The tailpath inject vars are NOT run inputs: the 144-input cap
     * would silently drop them past ~70 windows — the registration
     * pass resolves them to literal absolute paths in the run yaml.) */
    for (int i = 1; i < tl_nw; i++) {
        char nm[24];
        snprintf(nm, sizeof(nm), "prompt%d", i + 1);
        add_run_input_text(idx, nm, tl_wins[i]);
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

/* (root-history law, 2026-08-31, proven by the lifecycle suite) a card
 * has TWO history arrays: the root one and result.metadata.history
 * (rebuilt on every write-back). "The last history key in the doc" is
 * NOT the root one — on a fresh card the only history key sits INSIDE
 * the freshly spliced result block, so the append pass wrote the row
 * into metadata a second time and the root history was never created
 * (duplicates compounding run over run). The root array is the last
 * "history" key at BRACE DEPTH 1. Strings are skipped while tracking
 * depth. Returns the '[' of its value, or NULL when the card has no
 * root history yet. */
static char *root_history_span(char *doc) {
    char *best = NULL;
    int depth = 0, in_str = 0, esc = 0;
    for (char *p = doc; *p; p++) {
        if (in_str) {
            if (esc) esc = 0;
            else if (*p == '\\') esc = 1;
            else if (*p == '"') in_str = 0;
            continue;
        }
        if (*p == '"') {
            /* (root-history law) at depth 1 a "history" key is the
             * ROOT array — match it BEFORE entering string mode */
            if (depth == 1 && strncmp(p, "\"history\"", 9) == 0) {
                char *v = p + 9;
                int saw_colon = 0;
                while (*v && *v != '[') {
                    if (*v == ':') {
                        if (saw_colon) break;
                        saw_colon = 1;
                    } else if (*v != ' ' && *v != '\t') break;
                    v++;
                }
                if (*v == '[') { best = v; p = v - 1; continue; }
            }
            in_str = 1;
            continue;
        }
        if (*p == '{' || *p == '[') depth++;
        else if (*p == '}' || *p == ']') depth--;
        else if (depth == 1 && *p == '"' &&
                 strncmp(p, "\"history\"", 9) == 0) {
            /* value must be an array: only ':' and spaces between the
             * key and its '[' */
            char *v = p + 9;
            int saw_colon = 0;
            while (*v && *v != '[') {
                if (*v == ':') { if (saw_colon) break; saw_colon = 1; }
                else if (*v != ' ' && *v != '\t') break;
                v++;
            }
            if (*v == '[') { best = v; p = v - 1; }
            else p += 8;   /* skip the matched token */
        }
    }
    return best;
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
    /* (stack-smash + reconstruction law, 2026-08-31) the draft is read
     * WHOLE: the old fixed buf[32768] truncated any 26+ call card mid-
     * document and wrote the truncated copy back — card corruption. */
    size_t fsz = 0;
    if (fseek(f, 0, SEEK_END) == 0) fsz = (size_t)ftell(f);
    rewind(f);
    if (fsz < 64) fsz = 64;
    char *buf = (char *)malloc(fsz + 1);
    if (!buf) { fclose(f); return; }
    size_t n = fread(buf, 1, fsz, f);
    fclose(f);
    buf[n] = 0;

    const char *rid = g_runs[idx].run_id;
    const char *outdir = g_runs[idx].out_dir;
    char stitch[640] = "";
    /* (reconstruction law, 2026-08-30) ALL N windows — the fixed-4 scan
     * was the "1/4 of the h3 model calls" lie: a 12-call card showed 4
     * films. ONE call = ONE window = ONE model call; the card must list
     * every film and every latent seam that actually ran. Scan the
     * out_dir for window%_video_0.mp4 / window%_tail.pt up to 128. */
    static char wf[RUN_TL_MAX][640];
    static char seam[RUN_TL_MAX][640];
    int nwin = 0;
    char p[768];
    snprintf(p, sizeof(p), "%s/stitch_video_0.mp4", outdir);
    if (access(p, R_OK) == 0)
        snprintf(stitch, sizeof(stitch), "/editor/assets/runs/%s/stitch_video_0.mp4", rid);
    for (int k = 1; nwin < RUN_TL_MAX; k++) {
        snprintf(p, sizeof(p), "%s/window%d_video_0.mp4", outdir, k);
        if (access(p, R_OK) != 0) {
            if (k > nwin + 2 || k > 8) break;  /* past the contiguous tail */
            continue;
        }
        snprintf(wf[nwin], sizeof(wf[0]),
                 "/editor/assets/runs/%s/window%d_video_0.mp4", rid, k);
        snprintf(p, sizeof(p), "%s/window%d_tail.pt", outdir, k);
        if (access(p, R_OK) == 0)
            snprintf(seam[nwin], sizeof(seam[0]),
                     "/editor/assets/runs/%s/window%d_tail.pt", rid, k);
        else
            seam[nwin][0] = 0;
        nwin++;
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
    /* (stack-smash law, round 2, 2026-08-31) the ORIGINAL card-killing
     * corruption was exactly here: oldh was a fixed 8192 with a blind
     * clamp — a card whose history exceeded the cap was cut MID-ROW
     * (unterminated string), the doc stopped parsing, and the sidebar
     * click died. History length is bounded by the draft file size,
     * so allocate that much and never cut. */
    size_t buf_len = strlen(buf);
    char *oldh = (char *)malloc(buf_len + 16);
    if (!oldh) return;
    oldh[0] = 0;
    {
        /* (root-history law) the ROOT array only — never the metadata
         * copy inside result, which is rebuilt below */
        char *ab = root_history_span(buf);
        if (ab) {
            char *ae = ab + 1;
            int depth2 = 0;
            while (*ae) {
                if (*ae == '[') depth2++;
                else if (*ae == ']') { if (depth2 == 0) break; depth2--; }
                ae++;
            }
            size_t L = (size_t)(ae - ab - 1);
            if (L > buf_len) L = buf_len;
            memcpy(oldh, ab + 1, L);
            oldh[L] = 0;
        }
    }
    size_t mcap = strlen(hrow) + strlen(oldh) + 8;
    char *mhist = (char *)malloc(mcap);
    if (!mhist) { free(oldh); return; }
    {
        const char *t = oldh;
        while (*t == ' ' || *t == 10 || *t == 9 || *t == 13) t++;
        snprintf(mhist, mcap, "%s%s%s", hrow,
                 (*t && *t != ']') ? "," : "", t);
    }

    /* splice the new result block over the first "result":{...} span */
    /* (2026-08-30 ray parity + reconstruction law) assetUrls lists EVERY
     * run output — the stitch film AND ALL N window clips — the way ray
     * done-cards list all outputs; one model call = one window film.
     * artifacts keeps the legacy w1..w4 keys (editor compat) and adds
     * windowFilms/seams arrays with EVERY window.
     * (stack-smash law, 2026-08-31) jappend heap accumulators: the old
     * 16384 fixeds silently DROPPED windows past their cap (the "1/4
     * of the model calls" lie reborn) and their would-be-length `+=
     * snprintf` appends indexed past the buffer on long paths. */
    size_t uc = 1024, fc = 1024, sc = 1024;
    char *urls = (char *)malloc(uc);
    char *wfilms = (char *)malloc(fc);
    char *seamsj = (char *)malloc(sc);
    if (!urls || !wfilms || !seamsj) {
        free(buf); free(oldh); free(mhist); free(urls); free(wfilms); free(seamsj);
        return;
    }
    /* (write-back law, proven 2026-08-31 on draft-timeline-h3) a run
     * with NO artifacts (errored window lane) never appends to urls,
     * leaving the malloc'd buffer UNTERMINATED — the "%s" below then
     * published raw heap bytes into the card ("assetUrls":[X\x04]).
     * Every accumulator starts as an empty string. */
    urls[0] = 0; wfilms[0] = 0; seamsj[0] = 0;
    {
        size_t uo = 0;
        if (stitch[0])
            uo = jappend(&urls, &uc, uo, "\"%s\"", stitch);
        for (int w = 0; w < nwin; w++) {
            if (!wf[w][0]) continue;
            if (uo) uo = jappend(&urls, &uc, uo, ",");
            uo = jappend(&urls, &uc, uo, "\"%s\"", wf[w]);
        }
    }
    {
        size_t fo = jappend(&wfilms, &fc, 0, "[");
        size_t so2 = jappend(&seamsj, &sc, 0, "[");
        for (int w = 0; w < nwin; w++) {
            if (w) {
                fo = jappend(&wfilms, &fc, fo, ",");
                so2 = jappend(&seamsj, &sc, so2, ",");
            }
            fo = jappend(&wfilms, &fc, fo, "\"%s\"", wf[w]);
            so2 = jappend(&seamsj, &sc, so2, "\"%s\"",
                          seam[w][0] ? seam[w] : "");
        }
        jappend(&wfilms, &fc, fo, "]");
        jappend(&seamsj, &sc, so2, "]");
    }
    size_t rc = 4096;
    char *res = (char *)malloc(rc);
    if (!res) { free(buf); free(oldh); free(mhist); free(urls); free(wfilms); free(seamsj); return; }
    jappend(&res, &rc, 0,
        "{\"assetUrls\":[%s],\"artifacts\":{"
        "\"video\":\"%s\","
        "\"video_w1_main\":\"%s\",\"video_w2_main\":\"%s\",\"video_w3_main\":\"%s\",\"video_w4_main\":\"%s\","
        "\"seam_w1\":\"%s\",\"seam_w2\":\"%s\",\"seam_w3\":\"%s\",\"seam_w4\":\"%s\","
        "\"windowFilms\":%s,\"seams\":%s},"
        "\"metadata\":{\"runId\":\"%s\",\"seam\":\"latent-chain\",\"windows\":%d,"
        "\"history\":[%s]},"
        "\"completedAt\":%ld,\"durationSec\":%ld}",
        urls,
        stitch,
        nwin > 0 ? wf[0] : "", nwin > 1 ? wf[1] : "",
        nwin > 2 ? wf[2] : "", nwin > 3 ? wf[3] : "",
        nwin > 0 ? (seam[0][0] ? seam[0] : "") : "",
        nwin > 1 ? (seam[1][0] ? seam[1] : "") : "",
        nwin > 2 ? (seam[2][0] ? seam[2] : "") : "",
        nwin > 3 ? (seam[3][0] ? seam[3] : "") : "",
        wfilms, seamsj,
        rid, nwin, mhist,
        (long)time(NULL) * 1000, dur);

    const char *rp = strstr(buf, "\"result\"");
    /* (stack-smash law, 2026-08-31) exact-size heap splice + slack for
     * the in-place memmoves below: the old out[36864] received an
     * UNGUARDED memcpy of res (up to 32KB) + draft head + tail — a
     * large card smashed the stack. */
    char *out = NULL;
    if (rp) {
        const char *ob = strchr(rp, '{');
        const char *oe = ob;
        int depth = 0;
        while (*oe) {
            if (*oe == '{') depth++;
            else if (*oe == '}') { depth--; if (!depth) break; }
            oe++;
        }
        if (!(ob && *oe == '}')) {
            free(buf); free(oldh); free(mhist); free(urls); free(wfilms); free(seamsj); free(res);
            return;
        }
        size_t head = (size_t)(ob - buf);
        size_t rlen = strlen(res), tlen = strlen(oe + 1);
        out = (char *)malloc(head + rlen + tlen + 64);
        if (!out) {
            free(buf); free(oldh); free(mhist); free(urls); free(wfilms); free(seamsj); free(res);
            return;
        }
        memcpy(out, buf, head);
        memcpy(out + head, res, rlen);
        memcpy(out + head + rlen, oe + 1, tlen + 1);
    } else {
        /* (2026-08-30 card-birth law) a freshly composed card (a
         * build_pipeline draft) has no result block yet — SEED one into
         * the first stage instead of ignoring the card. The card is
         * BORN with this run: runStatus + result + (below) history. */
        const char *st = strstr(buf, "\"stages\"");
        const char *sb = st ? strchr(st, '{') : NULL;
        if (!sb) {
            free(buf); free(oldh); free(mhist); free(urls); free(wfilms); free(seamsj); free(res);
            return;
        }
        size_t head = (size_t)(sb - buf) + 1;   /* past stage's '{' */
        char seed[64];
        snprintf(seed, sizeof(seed), "\"runStatus\":\"%s\",\"result\":",
                 strcmp(wire, "completed") == 0 ? "done" : "error");
        size_t slen = strlen(seed), rlen = strlen(res),
               blen = strlen(sb + 1);
        out = (char *)malloc(head + slen + rlen + 1 + blen + 64);
        if (!out) {
            free(buf); free(oldh); free(mhist); free(urls); free(wfilms); free(seamsj); free(res);
            return;
        }
        memcpy(out, buf, head);
        memcpy(out + head, seed, slen);
        memcpy(out + head + slen, res, rlen);
        out[head + slen + rlen] = ',';
        memcpy(out + head + slen + rlen + 1, sb + 1, blen + 1);
        /* root status: ready (Ray card parity) when the draft lacks it */
        if (!strstr(out, "\"status\"")) {
            char *root = strchr(out, '{');
            if (root) {
                size_t h2 = (size_t)(root - out) + 1;
                size_t ol = strlen(out);
                char *tmp3 = (char *)malloc(ol + 32);
                if (tmp3) {
                    snprintf(tmp3, ol + 32, "%.*s\"status\":\"ready\",%s",
                             (int)h2, out, out + h2);
                    free(out);
                    out = tmp3;
                }
            }
        }
    }
    free(buf); free(oldh); free(mhist); free(urls); free(wfilms); free(seamsj); free(res);
    if (!out) return;

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

    /* history row at draft ROOT (no trailing comma: the array may be
     * empty). (root-history law) depth-aware: the metadata copy inside
     * the spliced result block is NOT the root — appending there
     * duplicated every row. If the card has no root history yet, the
     * else branch creates one.
     * (stack-smash law, 2026-08-31) exact-size heap splice: the old
     * tmp2[36864] + `snprintf(out, sizeof(out), ...)` — sizeof of the
     * now-heap pointer is 8 — truncated the card to 7 bytes whenever
     * this path ran. */
    char *hb = root_history_span(out);
    if (hb) {
        hb++;
        const char *nx = hb;
        while (*nx == ' ' || *nx == '\n' || *nx == '\t' || *nx == '\r') nx++;
        char sep[2] = "";
        if (*nx && *nx != ']') sep[0] = ',';
        size_t head = (size_t)(hb - out);
        size_t ol = strlen(out);
        char *tmp2 = (char *)malloc(ol + strlen(hrow) + 8);
        if (tmp2) {
            snprintf(tmp2, ol + strlen(hrow) + 8, "%.*s%s%s%s",
                     (int)head, out, hrow, sep, hb);
            free(out);
            out = tmp2;
        }
    } else {
        char *last = strrchr(out, '}');
        if (last) {
            size_t head = (size_t)(last - out);
            size_t ol = strlen(out);
            char *tmp2 = (char *)malloc(ol + strlen(hrow) + 16);
            if (tmp2) {
                snprintf(tmp2, ol + strlen(hrow) + 16,
                         "%.*s,\"history\":[%s]}%s", (int)head, out,
                         hrow, last + 1);
                free(out);
                out = tmp2;
            }
        }
    }

    /* (2026-08-30 doc-version contract) createdAt IS the doc version:
     * the studio's hydrate gate re-hydrates a same-id draft only when
     * the incoming createdAt is strictly newer. Every server-side
     * rewrite stamps a fresh createdAt so an already-open card picks
     * up the run result / contract fix instead of early-returning on
     * the stale stored copy. */
    {
        char *cp = strstr(out, "\"createdAt\":");
        if (cp) {
            char *ns = cp + strlen("\"createdAt\":");
            while (*ns == ' ') ns++;
            char *ne = ns;
            while (*ne >= '0' && *ne <= '9') ne++;
            if (ne > ns) {
                char nb[32];
                int nl = snprintf(nb, sizeof(nb), "%ld",
                                  (long)time(NULL) * 1000);
                size_t tail = strlen(ne);
                /* grow-aware: the memmove may need a few extra bytes
                 * (old stamp shorter than the new one) */
                if ((size_t)(ns - out) + (size_t)nl + tail + 1
                        > strlen(out) + 1) {
                    /* would write past the NUL: re-seat into a fresh
                     * allocation with slack */
                    size_t off = (size_t)(ns - out);
                    size_t need = off + (size_t)nl + tail + 64;
                    char *nb2 = (char *)malloc(need);
                    if (nb2) {
                        memcpy(nb2, out, off);
                        memcpy(nb2 + off, nb, (size_t)nl);
                        memcpy(nb2 + off + nl, ne, tail + 1);
                        free(out);
                        out = nb2;
                    }
                } else {
                    memmove(ns + nl, ne, tail + 1);
                    memcpy(ns, nb, (size_t)nl);
                }
            }
        }
    }

    /* (2026-08-30 reconstruction law, v2) the card's params.calls are
     * the AUTHORED TRUTH and stay VERBATIM: compile_calls_windows maps
     * ONE call -> ONE window -> ONE model call (1:1, always), so the
     * authored document IS the actual call list. The old synthetic
     * split (padding M-N calls with copied text) was itself a
     * reconstruction lie — it fabricated calls that were never
     * authored. What the card ALSO shows now: every window film and
     * every latent seam that ran (windowFilms/seams above), so N calls
     * on the card always face N films in the artifacts. */
    { char logmsg[128];
      snprintf(logmsg, sizeof(logmsg),
               "[draft] reconstruction: %d calls (verbatim) <-> %d window films",
               g_runs[idx].tl_n, nwin);
      fprintf(stderr, "%s\n", logmsg); }
    (void)0;

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
    free(out);
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
    /* (crash law, 2026-08-30 #3) this was tensors[16] — a FIXED stack
     * array smashed by any run whose inputs exceed 16: every timeline
     * window contributes a prompt input tensor, so a 31-call card
     * (the asset-queue consumer's 95 s film) wrote past the array and
     * the fortify build ABORTED the whole gateway mid-registration
     * (ASAN: memset WRITE 104 bytes past tensors[16], server.cpp:1519).
     * 5-call runs sat at ~8 inputs and never saw the cliff. The array
     * is now EXACTLY n_inputs — a run can never outgrow its own input
     * list. */
    size_t n_in = g_runs[idx].n_inputs;
    inference_tensor *tensors =
        n_in ? (inference_tensor *)calloc(n_in, sizeof(inference_tensor))
             : NULL;
    if (n_in && !tensors) {
        run_set_state(idx, "error", "input tensor alloc OOM");
        pthread_mutex_lock(&g_runs_mu);
        run_slot_release_heap(idx);
        pthread_mutex_unlock(&g_runs_mu);
        run_mark_th_done(idx);
        gpu_ticket_release();
        dag_free(dag);
        return NULL;
    }
    for (size_t i = 0; i < n_in; i++) {
        run_input *ri = &g_runs[idx].inputs[i];
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
    free(tensors);
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
        /* (latent-chain law) META CROSS-CHECK before success is
         * declared: every seam window's chain node wrote
         * window{k}_tail.pt.meta.json with the EXACT carried_pixel_
         * frames it spliced. The plan (tl_trims, mirroring
         * _carried_pixel_frames in h3_chain.py) drove the concat
         * trim_heads — if the node's truth disagrees with the plan,
         * the film double-plays or skips at the joins: the run is an
         * ERROR with the exact diff, never a quiet success. */
        char chain_err[512] = "";
        {
            int n = g_runs[idx].tl_n;
            int bad_k = 0, bad_meta = 0, bad_plan = 0, missing_k = 0;
            for (int k = 2; k <= n; k++) {
                char mp[760];
                snprintf(mp, sizeof(mp), "%s/window%d_tail.pt.meta.json",
                         g_runs[idx].out_dir, k - 1);
                FILE *mf = fopen(mp, "rb");
                if (!mf) { missing_k = k; break; }
                char mb[2048];
                size_t mr = fread(mb, 1, sizeof(mb) - 1, mf);
                fclose(mf);
                mb[mr] = 0;
                const char *cp = strstr(mb, "\"carried_pixel_frames\"");
                if (!cp) { bad_k = k; break; }
                const char *c = strchr(cp + 22, ':');
                if (!c) { bad_k = k; break; }
                bad_meta = atoi(c + 1);
                bad_plan = g_runs[idx].tl_trims[k - 1];
                if (bad_meta != bad_plan) { bad_k = k; break; }
                bad_meta = bad_plan = 0;
            }
            if (missing_k > 0 || bad_k > 0) {
                if (missing_k > 0)
                    snprintf(chain_err, sizeof(chain_err),
                             "latent-chain meta cross-check: window%d chain "
                             "meta missing (window%d_tail.pt.meta.json not "
                             "fetched into the run dir — the save node did "
                             "not author it or the /view fetch failed)",
                             missing_k, missing_k - 1);
                else
                    snprintf(chain_err, sizeof(chain_err),
                             "latent-chain meta cross-check: window%d meta "
                             "carried_pixel_frames=%d but the plan trimmed "
                             "%d — the film would double-play/skip at the "
                             "join; concat trims and chain math diverged",
                             bad_k, bad_meta, bad_plan);
            }
        }
        if (chain_err[0]) {
            run_set_state(idx, "error", chain_err);
            draft_writeback(idx, "failed");
        } else {
            run_set_state(idx, "success", NULL);
            draft_writeback(idx, "completed");
        }
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

    /* stages snapshot (per-stage state + attributed artifacts).
     * (stack-smash law, 2026-08-31) was `char stages_json[8192]` with
     * `so += snprintf` appends: snprintf returns the WOULD-BE length,
     * so a stage header crossing the cap advanced `so` past the array
     * bound and the trailing ']' then wrote PAST the stack buffer —
     * "*** buffer overflow detected ***" killed the gateway mid-run on
     * a 25-window card (run-6a94bc7a; the sidecar froze mid-stage,
     * evidence `"artifacts":,` at the smash boundary). jappend
     * grows-and-retries (audit F28): no fixed ceiling, no truncation,
     * no out-of-bounds index — a 100-window run reports all stages. */
    size_t sj_cap = 1024;
    char *stages_json = (char *)malloc(sj_cap);
    size_t so = 0;
    if (stages_json) {
        so = jappend(&stages_json, &sj_cap, so, "[");
        for (size_t s = 0; s < g_runs[idx].n_stages; s++) {
            run_stage *st = &g_runs[idx].stages[s];
            char *sterrq = st->error[0] ? json_quote(st->error) : NULL;
            so = jappend(&stages_json, &sj_cap, so,
                "%s{\"id\":\"%s\",\"name\":\"%s\",\"index\":%d,"
                "\"status\":\"%s\"%s%s,\"artifacts\":[",
                s ? "," : "", st->id, st->id, (int)s, wire_state(st->state),
                sterrq ? ",\"error\":" : "",
                sterrq ? sterrq : "");
            if (sterrq) free(sterrq);
            for (size_t a = 0; a < st->n_arts; a++)
                so = jappend(&stages_json, &sj_cap, so, "%s\"%s\"",
                             a ? "," : "", st->arts[a]);
            so = jappend(&stages_json, &sj_cap, so, "]}");
        }
        so = jappend(&stages_json, &sj_cap, so, "]");
        (void)so;
    }
    pthread_mutex_unlock(&g_runs_mu);

    /* ATOMIC WRITE (audit F1, 2026-08-29): a crash or concurrent read
     * mid-write must never see a truncated sidecar. Write to .tmp then
     * rename() — readers always see either the old or the new file. */
    char path[600], tmp_path[620];
    snprintf(path, sizeof(path), "%s/_pipeline.json", dir);
    snprintf(tmp_path, sizeof(tmp_path), "%s.tmp", path);
    FILE *f = fopen(tmp_path, "w");
    if (!f) {
        free(yamlq); free(promptq); free(errq);
        free(stages_json);
        return;
    }
    int wok = fprintf(f, "{\"run_id\":\"%s\",\"model\":\"%s\",\"prompt\":%s,"
               "\"seed\":%ld,\"created\":%ld,\"ended\":%ld,\"durationSec\":%ld,"
               "\"status\":\"%s\","
               "\"error\":%s,\"stages\":%s,\"yaml\":%s,"
               "\"draft_id\":\"%s\"}",
            rid, model, promptq, seed, created, (long)time(NULL),
            (long)time(NULL) - created, state,
            errq ? errq : "null",
            stages_json ? stages_json : "[]", yamlq,
            g_runs[idx].draft_id) > 0;
    wok = (fclose(f) == 0) && wok;
    if (wok) rename(tmp_path, path);
    else unlink(tmp_path);
    free(yamlq); free(promptq); free(errq);
    free(stages_json);
}

/* ===================== LANE LAW (2026-08-31) =====================
 * ONE lane = ONE card = ONE tool = ONE prompt file. A lane session is
 * spawned by the agent door with MELITE_CARD_TOOLS_LANE set, so the
 * melite-tools plugin mounts EXACTLY the lane's card tool and nothing
 * else (no build_pipeline, no catalog, no skills door, no other
 * cards). The prompt it receives is the lane's AGENT.md file — the
 * audited surface. Every session is tracked; a session may compose
 * exactly ONE card (second compose 409s) and may NEVER touch the
 * pipeline start door directly (403) — the gateway arms the card run
 * itself on first compose. Impossibility by mounting, not instruction. */

typedef struct {
    char token[48];
    char lane[64];
    char log[512];
    time_t created;
    int composed;      /* one-card law: 0 -> 1 -> 409 forever */
    char draft_id[80];
} agent_session;

#define AGENT_SESSIONS_MAX 128
static agent_session g_agent_sessions[AGENT_SESSIONS_MAX];

/* (lane-law fix, 2026-08-31) loopback target for the auto-arm: THIS
 * server, not a hardcoded port. Set at boot before listen; handlers
 * read it only while serving. */
static int g_loop_port = 0;
static char g_loop_host[64] = "127.0.0.1";
static size_t g_agent_sessions_n = 0;
static pthread_mutex_t g_agent_mu = PTHREAD_MUTEX_INITIALIZER;

static agent_session *agent_session_find(const char *token) {
    for (size_t i = 0; i < g_agent_sessions_n; i++)
        if (strcmp(g_agent_sessions[i].token, token) == 0)
            return &g_agent_sessions[i];
    return NULL;
}

/* normalize a lane name: '-' and '_' are the same letter separator */
static void lane_norm(const char *in, char *out, size_t outsz) {
    size_t o = 0;
    for (const char *p = in; *p && o + 1 < outsz; p++)
        out[o++] = (*p == '-') ? '_' : *p;
    out[o] = 0;
}

/* resolve a lane to its card dir: the dir NAME or the manifest's
 * "model" field, dash/underscore-insensitive. Returns 0 and fills
 * dir_out/agent_md on success. Scans both plugin roots. */
/* Plain file copy (continue_from tail staging): 0 on success. */
static int inf_copy_file(const char *src, const char *dst) {
    FILE *in = fopen(src, "rb");
    if (!in) return -1;
    FILE *out = fopen(dst, "wb");
    if (!out) { fclose(in); return -1; }
    char buf[65536];
    size_t n;
    int ok = 1;
    while ((n = fread(buf, 1, sizeof(buf), in)) > 0)
        if (fwrite(buf, 1, n, out) != n) { ok = 0; break; }
    fclose(in);
    if (fclose(out) != 0) ok = 0;
    return ok ? 0 : -1;
}

/* (lane SSOT law, 2026-08-30) a card's MODEL TRUTH is the models list
 * in its card.yaml (one card may serve several models — image_card:
 * krea-2 default, z-image override). tool.json carries a single
 * derived "model" string; resolving a lane against only that field
 * breaks the card for every other model it serves (proven: the z-image
 * lane resolved nothing once tool.json said krea-2). This helper
 * matches a lane against EVERY model the card declares. */
static int lane_card_models_match(const char *card_dir, const char *want) {
    const char *cands[] = { "card.yaml", "card.json", NULL };
    char wantn[64];
    char wtmp[72];
    snprintf(wtmp, sizeof(wtmp), "%s", want);
    lane_norm(wtmp, wantn, sizeof(wantn));
    for (int i = 0; cands[i]; i++) {
        char p[1536];
        snprintf(p, sizeof(p), "%s/%s", card_dir, cands[i]);
        FILE *f = fopen(p, "rb");
        if (!f) continue;
        static char buf[131072];
        size_t n = fread(buf, 1, sizeof(buf) - 1, f);
        fclose(f);
        buf[n] = 0;
        /* yaml list entries "  - id: <model>" */
        const char *q = buf;
        while ((q = strstr(q, "id:")) != NULL) {
            const char *v = q + 3;
            while (*v == ' ' || *v == '\t') v++;
            const char *e = v;
            while (*e && *e != '\n' && *e != ',' && *e != ']' &&
                   *e != '}' && *e != '"') e++;
            char mdl[64];
            size_t L = (size_t)(e - v) < sizeof(mdl) - 1
                ? (size_t)(e - v) : sizeof(mdl) - 1;
            memcpy(mdl, v, L);
            mdl[L] = 0;
            char mn[64];
            lane_norm(mdl, mn, sizeof(mn));
            if (mn[0] && strcmp(mn, wantn) == 0)
                return 1;
            q = e;
        }
        /* json variant: "id": "model" */
        q = buf;
        while ((q = strstr(q, "\"id\"")) != NULL) {
            const char *v = strchr(q + 4, '"');
            const char *e = v ? strchr(v + 1, '"') : NULL;
            if (v && e && (size_t)(e - v - 1) < 64) {
                char mdl[64], mn[64];
                snprintf(mdl, sizeof(mdl), "%.*s", (int)(e - v - 1), v + 1);
                lane_norm(mdl, mn, sizeof(mn));
                if (mn[0] && strcmp(mn, wantn) == 0)
                    return 1;
            }
            q += 4;
        }
    }
    return 0;
}

static int lane_resolve(const char *lane, char *dir_out, size_t dirsz,
                        char *agent_md, size_t mdsz) {
    char want[64];
    lane_norm(lane, want, sizeof(want));
    /* (lane SSOT, 2026-08-30) multi-match arbitration: when more than
     * one card dir claims the lane (video-gen AND video_timeline both
     * model h3-timeline), the lane's OWN tool wins — the dir whose
     * tool.json name normalizes to "<lane>_card". First pass takes the
     * name match; the old first-match behavior stands when only one
     * dir matches (image/z-image, image-edit/img-edit unchanged). */
    const char *plugins[] = { "../plugins", "./plugins", NULL };
    char best_md_dir[1024] = "";
    static char name_matched_md[65536];
    name_matched_md[0] = 0;
    for (int pass = 0; pass < 2; pass++) {
    for (int pi = 0; plugins[pi]; pi++) {
        DIR *d = opendir(plugins[pi]);
        if (!d) continue;
        struct dirent *owner;
        while ((owner = readdir(d)) != NULL) {
            if (owner->d_name[0] == '.') continue;
            char cards_dir[1024];
            snprintf(cards_dir, sizeof(cards_dir), "%s/%s/cards",
                     plugins[pi], owner->d_name);
            DIR *cd = opendir(cards_dir);
            if (!cd) continue;
            struct dirent *card;
            while ((card = readdir(cd)) != NULL) {
                if (card->d_name[0] == '.') continue;
                char dn[64];
                lane_norm(card->d_name, dn, sizeof(dn));
                int match = strcmp(dn, want) == 0;
                int name_match = 0;
                if (!match) {
                    char card_path[1024];
                    snprintf(card_path, sizeof(card_path), "%s/%s",
                             cards_dir, card->d_name);
                    match = lane_card_models_match(card_path, want);
                }
                if (!match) {
                    /* compare against manifest model too */
                    char tj[1536];
                    snprintf(tj, sizeof(tj), "%s/%s/tool.json",
                             cards_dir, card->d_name);
                    FILE *f = fopen(tj, "rb");
                    if (f) {
                        static char buf[65536];
                        size_t n = fread(buf, 1, sizeof(buf) - 1, f);
                        fclose(f);
                        buf[n] = 0;
                        const char *m = strstr(buf, "\"model\"");
                        if (m) {
                            const char *q1 = strchr(m + 7, '"');
                            const char *q2 = q1 ? strchr(q1 + 1, '"') : NULL;
                            if (q1 && q2 && (size_t)(q2 - q1 - 1) < sizeof(dn)) {
                                char mdl[64];
                                snprintf(mdl, sizeof(mdl), "%.*s",
                                         (int)(q2 - q1 - 1), q1 + 1);
                                lane_norm(mdl, dn, sizeof(dn));
                                match = strcmp(dn, want) == 0;
                            }
                        }
                        if (match) {
                            /* tool "<lane>_card" names the lane's own card */
                            const char *tn = strstr(buf, "\"name\"");
                            if (tn) {
                                const char *r1 = strchr(tn + 6, '"');
                                const char *r2 = r1 ? strchr(r1 + 1, '"') : NULL;
                                if (r1 && r2 && (size_t)(r2 - r1 - 1) < sizeof(dn)) {
                                    char tname[64], tnorm[64];
                                    snprintf(tname, sizeof(tname), "%.*s",
                                             (int)(r2 - r1 - 1), r1 + 1);
                                    lane_norm(tname, tnorm, sizeof(tnorm));
                                    char wantcard[72];
                                    snprintf(wantcard, sizeof(wantcard),
                                             "%s_card", want);
                                    name_match = strcmp(tnorm, wantcard) == 0;
                                }
                            }
                        }
                    }
                }
                if ((pass == 0) != (name_match != 0))
                    continue;         /* pass 0: name matches only */
                if (match) {
                    snprintf(dir_out, dirsz, "%s/%s", cards_dir, card->d_name);
                    char am[1536];
                    snprintf(am, sizeof(am), "%s/%s", dir_out, "AGENT.md");
                    FILE *af = fopen(am, "rb");
                    if (!af) break;          /* lane exists but has no agent prompt */
                    size_t an = fread(pass == 0 ? name_matched_md : agent_md,
                                      1, mdsz - 1, af);
                    fclose(af);
                    if (pass == 0) {
                        name_matched_md[an] = 0;
                        snprintf(best_md_dir, sizeof(best_md_dir), "%s", dir_out);
                        closedir(cd); closedir(d);
                        /* name match is final: publish and stop */
                        snprintf(dir_out, dirsz, "%s", best_md_dir);
                        snprintf(agent_md, mdsz, "%s", name_matched_md);
                        return 0;
                    }
                    closedir(cd); closedir(d);
                    return 0;
                }
            }
            closedir(cd);
        }
        closedir(d);
    }
    }
    return -1;
}


/* POST /v1/cards/:lane/agent  {"prompt": "..."}
 * LANE LAW agent door: resolve the lane to its card dir (the audited
 * bundle: AGENT.md + SKILL.md + tool.json all live there), spawn a
 * headless dsh session whose ENTIRE world is that lane —
 *   MELITE_CARD_TOOLS_LANE=<lane>  -> melite-tools mounts exactly ONE
 *                                     card tool, nothing else
 *   cwd = the lane dir             -> the only markdown the session
 *                                     can discover is the lane's own
 *   prompt = AGENT.md + request    -> the prompt is a FILE, audited
 *   INF_AGENT_SESSION=<token>      -> every gateway call the session
 *                                     makes is marked; one compose,
 *                                     no pipeline door, ever
 * The response names the log + the lane dir so anyone can audit what
 * the agent received BEFORE it runs. */
static void handle_card_agent(const httplib::Request &req,
                              httplib::Response &res) {
    std::string lane = req.matches[1].str();   /* regex route param */
    char dir_out[1024], agent_md[131072];
    if (lane_resolve(lane.c_str(), dir_out, sizeof(dir_out),
                     agent_md, sizeof(agent_md)) != 0) {
        res.status = 404;
        char err[256];
        snprintf(err, sizeof(err),
                 "{\"error\":\"unknown lane '%s' (no card dir + AGENT.md)\"}",
                 lane.c_str());
        res.set_content(err, "application/json");
        return;
    }
    std::string prompt = req.body;
    /* accept {"prompt": "..."} or raw text */
    {
        char pv[8192];
        if (inf_json_string(req.body.c_str(), "prompt", pv, sizeof(pv)) == 0
            && pv[0])
            prompt = pv;
    }
    if (prompt.empty()) {
        res.status = 400;
        res.set_content("{\"error\":\"missing prompt (raw text or {\"prompt\": ...})\"}",
                        "application/json");
        return;
    }

    /* register the session FIRST (the spawn is fire-and-forget) */
    char token[48];
    snprintf(token, sizeof(token), "agent-%lx-%lx",
             (unsigned long)time(NULL), (unsigned long)pthread_self());
    pthread_mutex_lock(&g_agent_mu);
    if (g_agent_sessions_n >= AGENT_SESSIONS_MAX) {
        /* recycle the oldest finished slot */
        size_t oldest = 0;
        for (size_t i = 1; i < g_agent_sessions_n; i++)
            if (g_agent_sessions[i].created < g_agent_sessions[oldest].created)
                oldest = i;
        memcpy(&g_agent_sessions[oldest], &g_agent_sessions[g_agent_sessions_n - 1],
               sizeof(agent_session));
        g_agent_sessions_n--;
    }
    agent_session *as = &g_agent_sessions[g_agent_sessions_n++];
    snprintf(as->token, sizeof(as->token), "%s", token);
    lane_norm(lane.c_str(), as->lane, sizeof(as->lane));
    mkdir("./agent-sessions", 0755);
    snprintf(as->log, sizeof(as->log), "./agent-sessions/%s.log", token);
    as->created = time(NULL);
    as->composed = 0;
    as->draft_id[0] = 0;
    pthread_mutex_unlock(&g_agent_mu);

    /* write the composed prompt (AGENT.md + user request) beside the log
     * so the audit trail holds exactly what the agent received */
    char prompt_file[600];
    snprintf(prompt_file, sizeof(prompt_file), "./agent-sessions/%s.prompt.md", token);
    FILE *pf = fopen(prompt_file, "w");
    if (pf) {
        fprintf(pf, "%s\n\n---\n\n# USER REQUEST\n\n%s\n", agent_md,
                prompt.c_str());
        fclose(pf);
    }

    /* spawn: the session's whole world is the lane dir */
    /* every path ABSOLUTE: the spawn cds into the lane dir before the
     * redirects run — relative paths would land inside the lane dir */
    char abs_dir[1024], abs_log[1024], abs_prompt[1024];
    {
        char wd[768];
        if (!getcwd(wd, sizeof(wd))) wd[0] = 0;
        if (dir_out[0] == '/')
            snprintf(abs_dir, sizeof(abs_dir), "%s", dir_out);
        else
            snprintf(abs_dir, sizeof(abs_dir), "%s/%s", wd, dir_out);
        if (as->log[0] == '/')
            snprintf(abs_log, sizeof(abs_log), "%s", as->log);
        else
            snprintf(abs_log, sizeof(abs_log), "%s/%s", wd, as->log);
        if (prompt_file[0] == '/')
            snprintf(abs_prompt, sizeof(abs_prompt), "%s", prompt_file);
        else
            snprintf(abs_prompt, sizeof(abs_prompt), "%s/%s", wd, prompt_file);
    }
    char cmd[262144];
    snprintf(cmd, sizeof(cmd),
        "cd '%s' && MELITE_CARD_TOOLS_LANE='%s' INF_AGENT_SESSION='%s' "
        /* the task argv gets a safe label prefix: the prompt FILE
         * begins with the lane AGENT.md's YAML frontmatter ('---'),
         * and the headless CLI parses a leading-dash task as an
         * option and dies instantly (replicated 2026-08-30, agent
         * door; `--` is not honored by the variadic parser). The
         * audited prompt file stays verbatim — only argv is labeled. */
        "setsid dsh --profile headless \"$(printf 'lane session: %s\\n'; cat '%s')\" "
        ">> '%s' 2>&1 < /dev/null &",
        abs_dir, as->lane, token, as->lane, abs_prompt, abs_log);
    FILE *sp = popen(cmd, "r");
    if (sp) pclose(sp);

    char out[1024];
    snprintf(out, sizeof(out),
             "{\"session\":\"%s\",\"lane\":\"%s\",\"log\":\"%s\","
             "\"prompt\":\"%s\",\"lane_dir\":\"%s\","
             "\"audit\":\"read lane_dir + prompt file; the session sees "
             "ONE tool and this prompt only\"}",
             token, as->lane, as->log, prompt_file, dir_out);
    res.set_content(out, "application/json");
    fprintf(stderr, "[lane] agent session %s spawned for lane %s (dir %s)\n",
            token, as->lane, dir_out);
}


/* GET /v1/cards/:lane/schema — the lane's manifest + audit facts for
 * the UI and humans. One lane, one card, one tool: what you see here
 * is everything a lane session could ever mount. */
static void handle_card_schema(const httplib::Request &req,
                               httplib::Response &res) {
    std::string lane = req.matches[1].str();   /* regex route param */
    char dir_out[1024], agent_md[131072];
    if (lane_resolve(lane.c_str(), dir_out, sizeof(dir_out),
                     agent_md, sizeof(agent_md)) != 0) {
        res.status = 404;
        res.set_content("{\"error\":\"unknown lane\"}", "application/json");
        return;
    }
    char tj[1536], buf[65536];
    snprintf(tj, sizeof(tj), "%s/tool.json", dir_out);
    FILE *f = fopen(tj, "rb");
    if (!f) {
        res.status = 500;
        res.set_content("{\"error\":\"lane has no tool.json\"}",
                        "application/json");
        return;
    }
    size_t n = fread(buf, 1, sizeof(buf) - 1, f);
    fclose(f);
    buf[n] = 0;
    char out[76000];
    snprintf(out, sizeof(out),
             "{\"lane\":\"%s\",\"lane_dir\":\"%s\",\"tool\":%s,"
             "\"agent_prompt_file\":\"%s/AGENT.md\"}",
             lane.c_str(), dir_out, buf, dir_out);
    res.set_content(out, "application/json");
}

static void handle_pipelines_start(const httplib::Request &req,
                                   httplib::Response &res) {
    /* LANE LAW: a lane agent session may NEVER start a pipeline
     * directly — it has no tool for it, and if it curls this door by
     * hand anyway, the header it inherited (x-agent-session) marks the
     * request and it is refused here. Server-originated auto-arm does
     * not carry the header. */
    {
        std::string tok_str = req.get_header_value("x-agent-session");
        if (!tok_str.empty() && agent_session_find(tok_str.c_str())) {
            res.status = 403;
            res.set_content(
                "{\"error\":\"lane agent sessions run through the card "
                "lane; direct pipeline start is refused (structural law)\"}",
                "application/json");
            return;
        }
    }
    /* Wire shapes (parity with ray gateway):
     *   {pipeline:{steps:[...]}} - inline doc, single-step mapped to model
     *   {yaml:"name"}           - resolve pipeline YAML by name
     *   {route:true}            - 501 (routing not ported)
     *   {model,...}             - flat generation (default)
     */
    char model[64] = "", prompt[2048] = "";
    /* (audit F2) LOCAL per-request window prompts. (N-window law) sized
     * to TL_MAX_WINDOWS: one card may carry up to 128 calls. */
    static thread_local char tl_wins[TL_MAX_WINDOWS][2048];
    int  tl_wins_len[TL_MAX_WINDOWS];
    int  tl_spans[TL_MAX_WINDOWS];
    int  tl_trims[TL_MAX_WINDOWS];
    for (int i = 0; i < TL_MAX_WINDOWS; i++) { tl_wins_len[i] = 0; tl_spans[i] = 0; tl_trims[i] = 0; }
    char tl_carry_draft[32] = {0};    /* latent-chain law: card-level carry override from the draft */
    char prior_tail_path[1024] = ""; /* continue_from: prior run's tail .pt on disk (host side) */
    int  tl_nw = 0;
    long seed = -1;
    char yaml_override[131072] = "";   /* N-window law: holds expanded graphs */
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
        tl_nw = compile_calls_windows(body, tl_wins, tl_wins_len, tl_spans,
                                      tl_trims);
        /* (latent-chain law) seam-graph resolution failures are loud,
         * before any run registers: -1 = the RayH3ChainLatentAV
         * carry widget is not readable in the seam template;
         * -2 = card-level carry_latent_frames outside the node's
         * 1..64 range. */
        if (tl_nw == -1) {
            res.status = 500;
            res.set_content("{\"error\":\"h3-timeline seam graph unreadable: RayH3ChainLatentAV.0.carry_latent_frames not found in pipelines/h3-timeline/window2_t4.json\"}", "application/json");
            return;
        }
        if (tl_nw == -2) {
            res.status = 400;
            res.set_content("{\"error\":\"carry_latent_frames must be 1..64 (latent tail slots; RayH3ChainLatentAV range)\"}", "application/json");
            return;
        }
        if (tl_nw == -3) {
            res.status = 400;
            res.set_content("{\"error\":\"carry_latent_frames too large for a tile: the carried head would swallow every new frame (no grid point covers tile + carried head) — lower the carry or lengthen the shortest call\"}", "application/json");
            return;
        }
        if (tl_nw == -4) {
            res.status = 400;
            char err[128];
            snprintf(err, sizeof(err),
                     "{\"error\":\"%d calls exceeds TL_MAX_WINDOWS (%d): "
                     "one card may carry up to 128 calls\"}",
                     /* we can't easily recount here, but the reject is
                      * by definition > 128 */ 129, 128);
            res.set_content(err, "application/json");
            return;
        }
        /* (2026-08-30 queue-lane law) a calls array longer than the 4-window
         * graph is a shape error, never a silent truncation: reject BEFORE
         * any run is registered. The caller splits into chained runs
         * (continue_from). A calls array that parses to zero windows is also
         * rejected loudly. */
        {
            const char *ck = strstr(body, "\"calls\"");
            const char *arr = ck ? strchr(ck + 7, '[') : NULL;
            if (arr) {
                int total_calls = 0;
                const char *w = arr;
                /* (string-form law) count form-agnostically: the key
                 * name followed (within quotes/ws) by a colon. */
                while ((w = strstr(w, "start_frame")) != NULL) {
                    /* "start_frame" is ELEVEN chars — the old +10 put k2 on
                     * the final 'e', ':' never matched, the counter read 0
                     * on EVERY body and >4 calls silently truncated to the
                     * 4-window graph (queue-lane law breach, caught live by
                     * the loader probe 2026-08-31). */
                    const char *k2 = w + 11;
                    while (*k2 == ' ' || *k2 == '\t' || *k2 == '"' ||
                           *k2 == '\\') k2++;
                    if (*k2 == ':') total_calls++;
                    w += 11;
                }
                /* (N-window law, 2026-08-31) the 4-call cap is DEAD: ONE
                 * card carries every call and the gateway EXPANDS the run
                 * graph to N windows. The only remaining bound is the
                 * run-yaml buffer (TL_MAX_WINDOWS), stated loudly. */
                if (total_calls > TL_MAX_WINDOWS) {
                    res.status = 400;
                    char err[240];
                    snprintf(err, sizeof(err),
                             "{\"error\":\"calls document has %d calls; the run graph buffer holds %d windows per run (engineering bound, not a card limit)\"}",
                             total_calls, TL_MAX_WINDOWS);
                    res.set_content(err, "application/json");
                    return;
                }
                if (tl_nw == 0 && total_calls > 0) {
                    res.status = 400;
                    res.set_content("{\"error\":\"calls document present but no windows parsed (bad calls shape)\"}", "application/json");
                    return;
                }
            }
        }
        /* (prompt law, 2026-08-30) FIRST CALL'S TEXT IS WINDOW 1'S PROMPT.
         * Applied ONCE below, after BOTH compile paths (body calls AND
         * draft card doc) — an in-branch copy here missed the draft_id
         * path, and auto-arm's "lane-auto-arm" label stole window 1
         * again (proven in the 19:52 ASAN run inject log). */
    }
    /* (2026-08-30 CARD LAW, operator order) a timeline-graph run without
     * its card is REJECTED before registration: compose via the
     * h3_timeline_card tool (draft_id) or carry the calls document.
     * Hand-rolled params.prompt2..4 bodies (consumer model improvisation,
     * observed twice) produce silent 1.66s stubs — never again. */
    if (yaml_override[0] && strstr(yaml_override, "window1") &&
        tl_nw == 0) {
        char did[96] = "";
        int card_ok = 0;
        if (inf_json_string(body, "draft_id", did, sizeof(did)) == 0 && did[0]) {
            char dp[256];
            snprintf(dp, sizeof(dp), "./drafts/%s.json", did);
            if (access(dp, R_OK) == 0) card_ok = 1;
            else {
                snprintf(dp, sizeof(dp), "./drafts/%s-1.json", did);
                if (access(dp, R_OK) == 0) card_ok = 1;
            }
        }
        if (!card_ok) {
            res.status = 400;
            res.set_content(
                "{\"error\":\"timeline runs require their action card: compose via the h3_timeline_card tool and send draft_id, or carry the calls document. Bare prompt/params bodies are rejected (card law)\"}",
                "application/json");
            return;
        }
        /* THE CARD IS THE RUN DEFINITION: when the body carries no calls,
         * load them from the card document itself (stages[0].params.calls
         * — string or array form; the compiler handles both). seed/fps
         * ride from the card when the body omits them. */
        {
            char dp[256];
            snprintf(dp, sizeof(dp), "./drafts/%s.json", did);
            if (access(dp, R_OK) != 0)
                snprintf(dp, sizeof(dp), "./drafts/%s-1.json", did);
            static char dbuf[32768];
            FILE *df = fopen(dp, "rb");
            if (df) {
                size_t dn = fread(dbuf, 1, sizeof(dbuf) - 1, df);
                fclose(df); dbuf[dn] = 0;
                tl_nw = compile_calls_windows(dbuf, tl_wins, tl_wins_len,
                                              tl_spans, tl_trims);
                /* (latent-chain law) same loud guards as the body path;
                 * the card doc may carry its own carry override. */
                if (tl_nw == -1) {
                    res.status = 500;
                    res.set_content("{\"error\":\"h3-timeline seam graph unreadable: RayH3ChainLatentAV.0.carry_latent_frames not found in pipelines/h3-timeline/window2_t4.json\"}", "application/json");
                    return;
                }
                if (tl_nw == -2) {
                    res.status = 400;
                    res.set_content("{\"error\":\"card carry_latent_frames must be 1..64 (latent tail slots; RayH3ChainLatentAV range)\"}", "application/json");
                    return;
                }
                if (tl_nw == -3) {
                    res.status = 400;
                    res.set_content("{\"error\":\"card carry_latent_frames too large for a tile: the carried head would swallow every new frame — lower the carry or lengthen the shortest call\"}", "application/json");
                    return;
                }
                if (tl_nw == -4) {
                    res.status = 400;
                    res.set_content("{\"error\":\"card calls exceed TL_MAX_WINDOWS (128): one card may carry up to 128 calls\"}", "application/json");
                    return;
                }
                tl_scan_carry(dbuf, tl_carry_draft, sizeof tl_carry_draft);
                if (tl_nw == 0)
                    fprintf(stderr,
                            "[draft] card %s carries no parsable calls\n", did);
                else
                    fprintf(stderr,
                            "[draft] run executes card %s (%d calls)\n",
                            did, tl_nw);
                if (seed < 0) seed = inf_json_int(dbuf, "seed", -1);
                if (seed < 0) seed = 42;
            }
        }
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
    /* context engine (cross-run continuation, 2026-08-30; latent-chain
     * law 2026-08-30): continue_from seeds window1 with the prior run's
     * LAST window tail (window{N}_tail.pt — the sampled AV latent the
     * chain nodes write into the run out_dir). Unresolved refs are
     * rejected BEFORE registration (queue lane law: no zombie slots,
     * no silent fallbacks). */
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
            /* find the prior run's HIGHEST window tail (window1_load
             * chains from the film's final motion) */
            char clp[600];
            snprintf(clp, sizeof(clp), "./output/%s", cfr);
            int last_win = 0;
            {
                DIR *d = opendir(clp);
                if (d) {
                    struct dirent *e;
                    while ((e = readdir(d)) != NULL) {
                        int wk = 0;
                        if (sscanf(e->d_name, "window%d_tail.pt", &wk) == 1
                            && wk > last_win && wk <= RUN_TL_MAX) {
                            /* sscanf quirk: it returns 1 for
                             * "window4_video_0.mp4" because %d consumed
                             * the digit and sscanf doesn't require the
                             * rest of the format to match. Verify the
                             * tail file actually exists before accepting
                             * the candidate. */
                            char probe[700];
                            snprintf(probe, sizeof(probe),
                                     "%s/window%d_tail.pt", clp, wk);
                            if (access(probe, R_OK) == 0)
                                last_win = wk;
                        }
                    }
                    closedir(d);
                }
            }
            if (last_win > 0)
                snprintf(clp, sizeof(clp), "./output/%s/window%d_tail.pt",
                         cfr, last_win);
            else
                clp[0] = 0;
            if (!clp[0] || access(clp, R_OK) != 0) {
                res.status = 404;
                char err[400];
                snprintf(err, sizeof(err),
                         "{\"error\":\"continue_from run has no window tail latent\",\"run\":\"%s\",\"missing\":\"windowN_tail.pt\"}", cfr);
                res.set_content(err, "application/json");
                return;
            }
            if (yaml_override[0]) {
                /* (container law 2026-08-30) the prior tail crosses to
                 * ComfyUI the same way fresh tails do: copied into THIS
                 * run's out_dir at registration, uploaded via /upload
                 * before window 1, and referenced by its run-scoped
                 * RELATIVE path. The $priortail token resolves in the
                 * registration tailpath pass (run_id + out_dir live
                 * there); no realpath anywhere. */
                const char *wf0 = strstr(yaml_override, "window1_t4.json");
                const char *inj0 = wf0 ? strstr(yaml_override, "\"inject\":{") : NULL;
                if (!wf0 || !inj0) {
                    res.status = 400;
                    res.set_content("{\"error\":{\"continue_from: composed pipeline too large for context injection\"}}", "application/json");
                    return;
                }
                snprintf(prior_tail_path, sizeof(prior_tail_path), "%s", clp);
                /* swap window1 to the load variant (first occurrence) */
                const char *wf = strstr(yaml_override, "window1_t4.json");
                if (wf) {
                    const char rep[] = "window1_load.json";
                    const char old[] = "window1_t4.json";
                    size_t ol = sizeof(old) - 1, nl = sizeof(rep) - 1;
                    memmove((char *)wf + nl, wf + ol, strlen(wf + ol) + 1);
                    memcpy((char *)wf, rep, nl);
                    /* inject the prior tail into window1's chain node:
                     * the first inject map gains the tail_path key */
                    const char *inj = strstr(yaml_override, "\"inject\":{");
                    if (inj) {
                        const char *brace = inj + strlen("\"inject\":{");
                        char kv[64];
                        snprintf(kv, sizeof(kv),
                                 "\"RayH3ChainLatentAV.0.tail_path\":\"$priortail\",");
                        size_t kvl = strlen(kv), tail = strlen(brace) + 1;
                        memmove((char *)brace + kvl, brace, tail);
                        memcpy((char *)brace, kv, kvl);
                    }
                }
            }
        }
    }

    /* (prompt law, 2026-08-30, unified) FIRST CALL'S TEXT IS WINDOW 1'S
     * PROMPT — unconditionally, whichever path compiled the windows
     * (body calls OR the draft card doc). Without this, a flat body
     * prompt — the auto-arm label "lane-auto-arm", a card title —
     * steals window 1 while windows 2..N get their call texts: the
     * film's first window renders the label, not the call (proven in
     * the 19:52 ASAN run: inject MiniMaxH3ImageToVideo.0.prompt =
     * "lane-auto-arm" on a 5-call card). The calls document ALWAYS
     * wins; a flat prompt may only label the run. */
    if (tl_nw > 0) snprintf(prompt, sizeof(prompt), "%s", tl_wins[0]);

    /* (queue-lane law, 2026-08-30) PRE-REGISTRATION NODE VALIDATION:
     * every workflow file the run graph references must be readable and
     * EVERY class_type inside must exist in the LIVE backend's
     * /object_info. The extermination incident (templates still naming
     * MiniMaxH3SaveLatent after the pack was removed) produced a
     * REGISTERED run that died at ComfyUI submit — a zombie slot with a
     * half-dead sidecar. Now the door rejects 4xx BEFORE the run
     * registers, naming the missing classes. Unreachable backend is
     * also a 4xx: the run could never execute. */
    if (yaml_override[0] && strstr(yaml_override, "workflow_file")) {
        char surl[256] = "";
        {
            const char *su = strstr(yaml_override, "\"server_url\"");
            if (su) {
                const char *q = strchr(su + 12, '"');
                const char *q2 = q ? strchr(q + 1, '"') : NULL;
                if (q && q2 && (size_t)(q2 - q - 1) < sizeof(surl))
                    snprintf(surl, (size_t)(q2 - q - 1) + 1, "%s", q + 1);
            }
        }
        char host[128];
        int port = 0;
        if (sscanf(surl, "http://%127[^:/]:%d", host, &port) != 2 || port <= 0) {
            res.status = 400;
            char eb[420];
            snprintf(eb, sizeof(eb),
                     "{\"error\":\"workflow graph has no usable server_url (got '%s') — cannot validate nodes\"}",
                     surl);
            res.set_content(eb, "application/json");
            return;
        }
        /* collect distinct class_type names across all referenced
         * workflow files (deduped; cloned windows share one file) */
        static char classes[96][96];
        int n_classes = 0;
        char missing_files[512] = "";
        {
            static char wfbuf[32768];
            const char *wf = strstr(yaml_override, "workflow_file");
            while (wf && n_classes < 96) {
                /* value = first quoted string after the colon following
                 * the key (handles "key":"v" and key: "v" forms) */
                const char *colon = strchr(wf, ':');
                const char *q = colon ? strchr(colon, '"') : NULL;
                const char *q2 = q ? strchr(q + 1, '"') : NULL;
                if (!q || !q2) break;
                char rel[300];
                size_t rl = (size_t)(q2 - q - 1);
                if (rl >= sizeof(rel)) { wf = strstr(q2, "workflow_file"); continue; }
                memcpy(rel, q + 1, rl); rel[rl] = 0;
                /* read the workflow (repo-relative or build-relative) */
                FILE *ff = NULL;
                char pp[600];
                const char *prefs[] = {"", "../", "pipelines/", NULL};
                for (int pi = 0; pi < 3 && !ff; pi++) {
                    snprintf(pp, sizeof(pp), "%s%s", prefs[pi], rel);
                    if (prefs[pi][0] == 0 && rel[0] != '/')
                        snprintf(pp, sizeof(pp), "%s", rel);
                    ff = fopen(pp, "rb");
                }
                if (!ff) {
                    if (!missing_files[0])
                        snprintf(missing_files, sizeof(missing_files), "%s", rel);
                    wf = strstr(q2, "workflow_file");
                    continue;
                }
                size_t fr = fread(wfbuf, 1, sizeof(wfbuf) - 1, ff);
                fclose(ff);
                wfbuf[fr] = 0;
                for (const char *ct = strstr(wfbuf, "\"class_type\"");
                     ct && n_classes < 96;
                     ct = strstr(ct + 1, "\"class_type\"")) {
                    const char *cq = strchr(ct + 12, '"');
                    const char *cq2 = cq ? strchr(cq + 1, '"') : NULL;
                    if (!cq || !cq2) continue;
                    size_t cl = (size_t)(cq2 - cq - 1);
                    if (cl == 0 || cl >= 95) continue;
                    char cname[96];
                    memcpy(cname, cq + 1, cl); cname[cl] = 0;
                    int dup = 0;
                    for (int ci = 0; ci < n_classes; ci++)
                        if (strcmp(classes[ci], cname) == 0) { dup = 1; break; }
                    if (!dup)
                        snprintf(classes[n_classes++], 96, "%s", cname);
                }
                wf = strstr(q2, "workflow_file");
            }
        }
        if (missing_files[0]) {
            res.status = 400;
            char eb[640];
            snprintf(eb, sizeof(eb),
                     "{\"error\":\"workflow file not found on disk: %s\"}",
                     missing_files);
            res.set_content(eb, "application/json");
            return;
        }
        /* one object_info fetch validates everything */
        httplib::Client cli(host, port);
        cli.set_connection_timeout(5, 0);
        cli.set_read_timeout(10, 0);
        auto oi = cli.Get("/object_info");
        if (!oi || oi->status != 200) {
            res.status = 400;
            char eb[420];
            snprintf(eb, sizeof(eb),
                     "{\"error\":\"comfyui backend unreachable at %s — cannot validate workflow nodes (run rejected before registration)\"}",
                     surl);
            res.set_content(eb, "application/json");
            return;
        }
        static char oibuf[1 << 21];
        size_t oilen = oi->body.size();
        if (oilen >= sizeof(oibuf)) oilen = sizeof(oibuf) - 1;
        memcpy(oibuf, oi->body.data(), oilen);
        oibuf[oilen] = 0;
        char miss[512];
        size_t ml = 0;
        miss[0] = 0;
        for (int ci = 0; ci < n_classes; ci++) {
            /* whitespace-tolerant match: real ComfyUI serializes
             * compact ("C":{) but json.dumps backends use ": {" */
            const char *p2 = strstr(oibuf, classes[ci]);
            int found = 0;
            while (p2) {
                if (p2 > oibuf && p2[-1] == '"') {
                    const char *e = p2 + strlen(classes[ci]);
                    if (*e == '"') {          /* closing quote of the key */
                        e++;
                        while (*e == ' ' || *e == '\t') e++;
                        if (*e == ':') {
                            e++;
                            while (*e == ' ' || *e == '\t') e++;
                            if (*e == '{') { found = 1; break; }
                        }
                    }
                }
                p2 = strstr(p2 + 1, classes[ci]);
            }
            if (!found) {
                int w = snprintf(miss + ml, sizeof(miss) - ml, "%s%s",
                                 ml ? "," : "", classes[ci]);
                if (w > 0) ml += (size_t)w;
                if (ml >= sizeof(miss) - 96) break;
            }
        }
        if (miss[0]) {
            res.status = 400;
            char eb[760];
            snprintf(eb, sizeof(eb),
                     "{\"error\":\"workflow references node classes missing from the live backend at %s: [%s] — the lane SSOT and the deployed packs diverged (run rejected before registration)\"}",
                     surl, miss);
            res.set_content(eb, "application/json");
            return;
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
    /* (id-uniqueness law, proven 2026-08-31 by chaos C2) run ids were
     * time+tid — but httplib REUSES pool worker threads, so two
     * submissions in the same second on the same worker minted the
     * SAME id: duplicate queue entries, two stops on one run, the
     * second rejected 400 "cannot stop run in state stopped". A
     * process-wide sequence number makes ids collision-free. */
    static std::atomic<unsigned long> g_run_seq{0};
    snprintf(g_runs[idx].run_id, sizeof(g_runs[idx].run_id), "run-%lx-%lx-%lx",
             (unsigned long)time(NULL), (unsigned long)pthread_self(),
             g_run_seq.fetch_add(1, std::memory_order_relaxed));
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
    /* (latent-chain law) persist the COMPILE PLAN: the meta cross-check
     * and the 1:1 card reconstruction read these, not re-derivation. */
    g_runs[idx].tl_n = tl_nw > 0 ? tl_nw : 0;
    for (int i = 0; i < RUN_TL_MAX; i++) {
        g_runs[idx].tl_trims[i] = i < tl_nw ? tl_trims[i] : 0;
        g_runs[idx].tl_spans[i] = i < tl_nw ? tl_spans[i] : 0;
    }
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
    /* action-card linkage (2026-08-30 card law, Ray parity): the run
     * belongs to THE CARD the request names. draft_id in the start body
     * (from the build_pipeline tool / drafts door) wins; the legacy
     * draft-timeline-h3 fallback fires ONLY when no draft_id was sent.
     * The write-back below then persists this run's artifacts + history
     * INTO that card — the card is the artifact of record. */
    {
        char rid_draft[96] = "";
        int have_draft = inf_json_string(req.body.c_str(), "draft_id",
                                         rid_draft, sizeof(rid_draft)) == 0
                         && rid_draft[0];
        if (have_draft) {
            /* sanitize: [A-Za-z0-9_-] only (path safety) */
            for (const char *p = rid_draft; *p; p++)
                if (!((*p >= 'a' && *p <= 'z') || (*p >= 'A' && *p <= 'Z') ||
                      (*p >= '0' && *p <= '9') || *p == '-' || *p == '_')) {
                    have_draft = 0;
                    break;
                }
            char dpath[256];
            if (have_draft) {
                snprintf(dpath, sizeof(dpath), "./drafts/%s.json", rid_draft);
                if (access(dpath, R_OK) != 0) {
                    /* (2026-08-30 suffix law) the drafts door persists ids
                     * with a stage suffix (-1); callers may send the bare
                     * id. Resolve the canonical single-stage form rather
                     * than dropping the card. */
                    char alt[128];
                    snprintf(alt, sizeof(alt), "%s-1", rid_draft);
                    char apath[256];
                    snprintf(apath, sizeof(apath), "./drafts/%s.json", alt);
                    if (access(apath, R_OK) == 0)
                        snprintf(rid_draft, sizeof(rid_draft), "%s", alt);
                    else have_draft = 0;
                }
            }
        }
        if (!have_draft &&
            strstr(req.body.c_str(), "\"calls\"") &&
            access("./drafts/draft-timeline-h3.json", R_OK) == 0) {
            snprintf(rid_draft, sizeof(rid_draft), "draft-timeline-h3");
            have_draft = 1;
        }
        if (have_draft) {
            snprintf(g_runs[idx].draft_id, sizeof(g_runs[idx].draft_id),
                     "%s", rid_draft);
            g_runs[idx].draft_stage = 0;
            fprintf(stderr, "[draft] run %s linked to card %s\n",
                    g_runs[idx].run_id, rid_draft);
        }
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
        /* (artifact law 2026-08-30) yaml_override runs get the SAME
         * per-run artifact routing as {model} runs: every
         * "out_dir":"./output" literal is swapped to this run's dir.
         * Without it the comfyui plugin staged downloads into the
         * shared ./output root — outside the run's ledger, invisible
         * to artifact attribution, and colliding across concurrent
         * runs. The latent-chain tail contract (canonical
         * out_dir/window<k>_tail.pt) rides on this too. */
        {
            size_t fixedcap = strlen(g_runs[idx].yaml) + 512;
            char *fixed = (char *)malloc(fixedcap);
            if (!fixed) {
                run_set_state(idx, "error", "out_dir rewrite OOM");
                res.status = 500;
                res.set_content("{\"error\":\"out_dir rewrite OOM\"}",
                                "application/json");
                return;
            }
            size_t o = 0;
            const char *p = g_runs[idx].yaml;
            const char needle[] = "\"out_dir\":\"./output\"";
            while (*p && o < fixedcap - 128) {
                if (strncmp(p, needle, sizeof(needle) - 1) == 0) {
                    o += (size_t)snprintf(fixed + o, fixedcap - o,
                                          "\"out_dir\":\"%s\"",
                                          g_runs[idx].out_dir);
                    p += sizeof(needle) - 1;
                } else {
                    fixed[o++] = *p++;
                }
            }
            fixed[o] = 0;
            snprintf(g_runs[idx].yaml, sizeof(g_runs[idx].yaml), "%s",
                     fixed);
            free(fixed);
        }
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
            /* (N-window law) heap: the expanded yaml can be 100KB+ */
            size_t fixedcap = sizeof(g_runs[idx].yaml) + 512;
            char *fixed = (char *)malloc(fixedcap);
            if (!fixed) {
                run_set_state(idx, "error", "out_dir rewrite OOM");
                res.status = 500;
                res.set_content("{\"error\":\"out_dir rewrite OOM\"}",
                                "application/json");
                return;
            }
            size_t o = 0;
            const char *p = g_runs[idx].yaml;
            const char needle[] = "\"out_dir\":\"./output\"";
            while (*p && o < fixedcap - 128) {
                if (strncmp(p, needle, sizeof(needle) - 1) == 0) {
                    o += (size_t)snprintf(fixed + o, fixedcap - o,
                                          "\"out_dir\":\"%s\"",
                                          g_runs[idx].out_dir);
                    p += sizeof(needle) - 1;
                } else {
                    fixed[o++] = *p++;
                }
            }
            fixed[o] = 0;
            snprintf(g_runs[idx].yaml, sizeof(g_runs[idx].yaml), "%s", fixed);
            free(fixed);
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

    /* (N-window law, 2026-08-31) ONE card = N calls = ONE run: expand the
     * static 4-window graph to tl_nw windows BEFORE the per-window inject
     * splices (which then anchor on every clone's seed key). Failure is
     * loud — a card with more calls than the buffer holds is rejected,
     * never silently truncated. */
    if (tl_nw > 0 && tl_expand_windows(g_runs[idx].yaml,
                                       sizeof(g_runs[idx].yaml), tl_nw) != 0) {
        run_set_state(idx, "error",
                      "timeline N-window expansion failed (graph anchors "
                      "or run-yaml buffer)");
        res.status = 500;
        res.set_content(
            "{\"error\":\"timeline N-window expansion failed (graph anchors or run-yaml buffer)\"}",
            "application/json");
        return;
    }

    /* (latent-chain law, container edition 2026-08-30) resolve every
     * $tailpathK inject var to the LITERAL run-scoped RELATIVE path
     * "<run_id>/windowK_tail.pt". ComfyUI runs CONTAINERIZED with an
     * overlay view of the repo — an absolute repo path wrote the tail
     * into the container's own layer and the bytes never reached the
     * host (proven live 2026-08-30: tails existed only under
     * /proc/<comfy>/root/...). Tails now travel ComfyUI's artifact
     * doors: the save node writes <output>/<run_id>/windowK_tail.pt and
     * returns it as a UI output (the plugin fetches via /view into the
     * run dir); the plugin uploads the fetched tail via /upload into
     * <input>/<run_id>/ before each seam window, and the chain node
     * resolves the same relative path against the INPUT directory.
     * run_id names the subfolder — unique per run, known here, and no
     * realpath anywhere (the sub-PATH_MAX realpath buffer was a fortify
     * abort: chaos C16). */
    if (tl_nw > 0) {
        /* continue_from: stage the prior tail (+meta) into THIS run's
         * dir and resolve $priortail to the run-scoped relative path —
         * the plugin uploads it before window 1 exactly like a fresh
         * tail. */
        if (prior_tail_path[0]) {
            const char *pb = strrchr(prior_tail_path, '/');
            pb = pb ? pb + 1 : prior_tail_path;
            char dst[768];
            snprintf(dst, sizeof(dst), "%s/%s", g_runs[idx].out_dir, pb);
            mkdir(g_runs[idx].out_dir, 0755);
            if (inf_copy_file(prior_tail_path, dst) == 0) {
                char pmeta[1100], dmeta[800];
                snprintf(pmeta, sizeof(pmeta), "%s.meta.json", prior_tail_path);
                snprintf(dmeta, sizeof(dmeta), "%s/%s.meta.json",
                         g_runs[idx].out_dir, pb);
                inf_copy_file(pmeta, dmeta);   /* optional: meta may be absent */
                char *pq = strstr(g_runs[idx].yaml, "$priortail");
                if (pq) {
                    char lit[192];
                    snprintf(lit, sizeof(lit), "%s/%s", g_runs[idx].run_id, pb);
                    size_t vl = strlen("$priortail"), ll = strlen(lit);
                    size_t used = strlen(g_runs[idx].yaml);
                    size_t off = (size_t)(pq - g_runs[idx].yaml);
                    if (used + (ll - vl) + 1 < sizeof(g_runs[idx].yaml)) {
                        memmove(pq + ll, pq + vl, used - off - vl + 1);
                        memcpy(pq, lit, ll);
                    }
                }
                fprintf(stderr, "[timeline] continue_from staged %s -> %s\n",
                        prior_tail_path, dst);
            }
        }
        /* Count the ACTUAL window nodes in the DAG yaml — the base
         * template always defines window1..4 even when tl_nw < 4 (e.g.
         * a 2-call continuation has 4 windows but tl_nw=2). The old
         * loop iterated only 1..tl_nw, leaving $tailpath3/$tailpath4
         * as raw tokens — ComfyUI could not resolve them and the last
         * window's chain node failed. */
        int yaml_nw = tl_nw;
        {
            const char *yp = g_runs[idx].yaml;
            while ((yp = strstr(yp, "- id: window")) != NULL) {
                int wnum = 0;
                if (sscanf(yp + 12, "%d", &wnum) == 1 && wnum > yaml_nw)
                    yaml_nw = wnum;
                yp++;
            }
        }
        for (int k = 1; k <= yaml_nw; k++) {
            char var[24], lit[192];
            snprintf(var, sizeof(var), "$tailpath%d", k);
            snprintf(lit, sizeof(lit), "%s/window%d_tail.pt",
                     g_runs[idx].run_id, k);
            size_t vl = strlen(var), ll = strlen(lit);
            char *q = strstr(g_runs[idx].yaml, var);
            while (q) {
                /* only whole tokens: the char after the var must not be
                 * a digit ($tailpath1 must not hit $tailpath12) */
                if (!(q[vl] >= '0' && q[vl] <= '9')) {
                    size_t used = strlen(g_runs[idx].yaml);
                    size_t off = (size_t)(q - g_runs[idx].yaml);
                    if (used + (ll - vl) + 1 >= sizeof(g_runs[idx].yaml))
                        break;   /* buffer law: loud failure at expand */
                    memmove(q + ll, q + vl, used - off - vl + 1);
                    memcpy(q, lit, ll);
                    q = strstr(q + ll, var);
                } else {
                    q = strstr(q + 1, var);
                }
            }
        }
    }

    /* (latent-chain law, 2026-08-30) each window samples its ON-GRID
     * length (window 1: tile; seams: tile + carried_px). Splice the
     * literal length into each window node's inject map, anchored on its
     * KSampler.0.seed entry (one per window node, in file order). A
     * card-level carry_latent_frames override also lands in each SEAM
     * window's RayH3ChainLatentAV widget (INT form). */
    if (tl_nw > 0) {
        char inj[256];
        char carry[32] = {0};
        if (!tl_scan_carry(req.body.c_str(), carry, sizeof carry)) {
            if (tl_carry_draft[0])
                snprintf(carry, sizeof carry, "%s", tl_carry_draft);
            else
                snprintf(carry, sizeof carry, "%d", tl_carry_default());
        }
        /* (container law 2026-08-30) the SAVE node authors the tail's
         * .meta.json from its carry widget — so EVERY window (window 1
         * included) gets the plan's carry injected into
         * RayH3SaveLatentTail.0.carry_latent_frames; seams additionally
         * carry it into the chain node. One carry literal per run, fed
         * to every consumer: save, chain, plan, stitch must agree. */
        const char *needle = "\"KSampler.0.seed\"";
        int wi = 0;
        char *q = strstr(g_runs[idx].yaml, needle);
        while (q && wi < tl_nw) {
            if (tl_wins_len[wi] > 0) {
                if (wi > 0)
                    snprintf(inj, sizeof(inj),
                             "\"MiniMaxH3ImageToVideo.0.length\":%d,"
                             "\"RayH3SaveLatentTail.0.carry_latent_frames\":%s,"
                             "\"RayH3ChainLatentAV.0.carry_latent_frames\":%s,",
                             tl_wins_len[wi], carry, carry);
                else
                    snprintf(inj, sizeof(inj),
                             "\"MiniMaxH3ImageToVideo.0.length\":%d,"
                             "\"RayH3SaveLatentTail.0.carry_latent_frames\":%s,",
                             tl_wins_len[wi], carry);
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
    /* (latent-chain law) THE STITCH TRIM IS LIVE: each seam window
     * regenerates the previous window's carried tail as its head; the
     * concat must drop EXACTLY carried_px frames (picture+sound) from
     * each seam head or every join double-plays. trim_heads comes from
     * the plan math (tl_trims — mirrors _carried_pixel_frames); the
     * chain node's <tail>.meta.json carries the same number and the
     * meta cross-check below hard-errors on any drift. spans stay the
     * delivered tiles: sampled - carried_px (seams) / sampled (w1). */
    if (tl_nw > 0) {
        int tlfps = inf_json_int(body, "fps", 24);
        if (tlfps <= 0) tlfps = 24;
        char trimsj[1280];   /* N-window law: up to 128 trims */
        int to = snprintf(trimsj, sizeof(trimsj), "[");
        for (int i = 0; i < tl_nw; i++)
            to += snprintf(trimsj + to, sizeof(trimsj) - to, "%s%.4f",
                           i ? "," : "", (double)tl_trims[i] / tlfps);
        snprintf(trimsj + to, sizeof(trimsj) - to, "]");
        char *th = strstr(g_runs[idx].yaml, "\"trim_heads\"");
        if (th) {
            char *tb = strchr(th, '[');
            char *te = tb ? strchr(tb, ']') : NULL;
            if (tb && te) {
                /* replace the whole array (brackets included): the shipped
                 * [0,0,0,0] placeholder makes room; memmove handles the
                 * overlap, and the buffer law rejects the impossible. */
                size_t used = strlen(g_runs[idx].yaml);
                size_t cut = (size_t)(te + 1 - tb);
                size_t il = strlen(trimsj);
                if (used - cut + il + 1 < sizeof(g_runs[idx].yaml)) {
                    memmove(tb + il, te + 1, used - cut + 1);
                    memcpy(tb, trimsj, il);
                }
                /* spans ride in after the (now replaced) trim array */
                char spansj[1280];
                int so = snprintf(spansj, sizeof(spansj), ",\"spans\":[");
                for (int i = 0; i < tl_nw; i++)
                    so += snprintf(spansj + so, sizeof(spansj) - so, "%s%.4f",
                                   i ? "," : "", (double)tl_spans[i] / tlfps);
                snprintf(spansj + so, sizeof(spansj) - so, "]");
                size_t sil = strlen(spansj);
                used = strlen(g_runs[idx].yaml);
                size_t off = (size_t)(tb + il - g_runs[idx].yaml);
                if (used + sil + 1 < sizeof(g_runs[idx].yaml)) {
                    memmove(tb + il + sil, tb + il, used - off + 1);
                    memcpy(tb + il, spansj, sil);
                }
            }
        }
        /* loud tiling evidence: what the film will actually be */
        {
            char cv[32];
            int carry = tl_scan_carry(req.body.c_str(), cv, sizeof cv)
                            ? atoi(cv)
                            : (tl_carry_draft[0] ? atoi(tl_carry_draft)
                                                 : tl_carry_default());
            int tot = 0;
            for (int i = 0; i < tl_nw; i++) tot += tl_spans[i];
            fprintf(stderr,
                    "[timeline] latent-chain law: windows=%d carry=%dslots "
                    "trims=[%d,%d,%d,%d%s] tiles=[%d,%d,%d,%d%s] "
                    "total=%df/%.3fs\n",
                    tl_nw, carry,
                    tl_trims[0], tl_nw > 1 ? tl_trims[1] : -1,
                    tl_nw > 2 ? tl_trims[2] : -1, tl_nw > 3 ? tl_trims[3] : -1,
                    tl_nw > 4 ? ",..." : "",
                    tl_spans[0], tl_nw > 1 ? tl_spans[1] : -1,
                    tl_nw > 2 ? tl_spans[2] : -1, tl_nw > 3 ? tl_spans[3] : -1,
                    tl_nw > 4 ? ",..." : "",
                    tot, (double)tot / tlfps);
        }
    }
    /* stage list comes from the final YAML (reported while queued too) */
    run_parse_stages(idx);

    /* (validation law, 2026-08-30) schema-driven input coverage: wire
     * body fields to declared required inputs, then REJECT any node
     * input that remains unsatisfied — BEFORE the FIFO ticket, thread,
     * or queue entry exists. The spec sidecar written at registration
     * is removed so no zombie dir survives in the runs listing. */
    {
        char verr[512];
        if (run_validate_input_coverage(idx, body, verr, sizeof verr) != 0) {
            char sc_path[512];
            snprintf(sc_path, sizeof(sc_path), "%s/_pipeline.json",
                     g_runs[idx].out_dir);
            unlink(sc_path);
            rmdir(g_runs[idx].out_dir);   /* empty at this point */
            pthread_mutex_lock(&g_runs_mu);
            run_slot_release_heap(idx);
            /* recycle-invisible: terminal + done, no sidecar on disk */
            snprintf(g_runs[idx].state, sizeof(g_runs[idx].state), "error");
            g_runs[idx].th_done = 1;
            pthread_mutex_unlock(&g_runs_mu);
            res.status = 400;
            char ej[640];
            snprintf(ej, sizeof(ej), "{\"error\":\"%s\"}", verr);
            res.set_content(ej, "application/json");
            return;
        }
    }

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
    /* (stack-smash law, 2026-08-31) jappend heap accumulator: the old
     * qids[4096] fixed underflowed once >~114 runs sat queued (128
     * slots x ~36B ids) — snprintf's would-be return pushed qo past
     * the array and the next append wrote unbounded. This door is
     * polled constantly; it must never be the crash surface. */
    size_t qcap = 1024;
    char *qids = (char *)malloc(qcap);
    size_t qo = 0;
    if (qids) qids[0] = 0;
    for (size_t i = 0; i < g_n_runs; i++) {
        if (strcmp(g_runs[i].state, "queued") == 0) {
            queued++;
            if (qids)
                qo = jappend(&qids, &qcap, qo, "%s\"%s\"",
                             qo ? "," : "", g_runs[i].run_id);
        }
        if (strcmp(g_runs[i].state, "running") == 0) {
            running++;
            snprintf(active_id, sizeof(active_id), "%s", g_runs[i].run_id);
        }
    }
    pthread_mutex_unlock(&g_runs_mu);
    size_t ocap = (qids ? strlen(qids) : 0) + 256;
    char *out = (char *)malloc(ocap);
    if (out)
        snprintf(out, ocap,
            "{\"queued\":%d,\"running\":%d,\"active\":\"%s\",\"queued_ids\":[%s]}",
            queued, running, active_id, qids ? qids : "");
    res.set_content(out ? out : "{\"queued\":0,\"running\":0,\"active\":\"\",\"queued_ids\":[]}",
                    "application/json");
    free(qids);
    free(out);
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
            /* card linkage on the restore path too (2026-08-30): after a
             * restart every historical run serves from here — the wand's
             * run→card resolution must not depend on the live registry. */
            char did2[96] = "";
            sidecar_str(sb, "draft_id", did2, sizeof(did2));
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
                "{\"run_id\":\"%s\",\"status\":\"%s\",\"state\":\"%s\",\"error\":%s,\"created\":%ld,\"durationSec\":%ld,\"restored_from_sidecar\":true,\"artifacts\":%s,\"stages\":%s,\"yaml_filename\":\"%s\",\"draft_id\":\"%s\"}",
                rid.c_str(), st, st, evq, created, dur, arts2, stages2, yfn2, did2);
            free(evq); free(arts2);
            res.status = 200;
            res.set_header("Cache-Control", "no-store");
            res.set_content(out2, "application/json");
            free(out2);
            return;
        }
        res.status = 404;
        res.set_content("{\"error\":\"unknown run_id\"}", "application/json");
        return;
    }
    char outdir[512], state[16], err[256], yamlhead[80], modelh[80];
    char didh[96] = "";
    snprintf(outdir, sizeof(outdir), "%s", g_runs[found].out_dir);
    snprintf(state, sizeof(state), "%s", g_runs[found].state);
    snprintf(err, sizeof(err), "%s", g_runs[found].error);
    snprintf(yamlhead, sizeof(yamlhead), "%.60s", g_runs[found].run_id);
    snprintf(modelh, sizeof(modelh), "%.76s", g_runs[found].model);
    /* card linkage (2026-08-30 full-flow): the replay surfaces (media
     * sidebar wand) resolve a run -> its action card through draft_id. */
    if (g_runs[found].draft_id[0])
        snprintf(didh, sizeof(didh), "%s", g_runs[found].draft_id);
    /* queue position: how many queued runs registered before this one */
    int qpos = 0;
    if (strcmp(state, "queued") == 0) {
        for (size_t i = 0; i < g_n_runs; i++) {
            if ((long)i == (long)found) break;
            if (strcmp(g_runs[i].state, "queued") == 0) qpos++;
        }
    }
    /* stages snapshot for the response.
     * (stack-smash law, 2026-08-31) twin of the sidecar builder: the
     * fixed 8192 array + would-be-length `so += snprintf` appends
     * indexed past the stack on stage-dense runs — and this door runs
     * on every status POLL. jappend: grow-and-retry, unbounded. */
    size_t sj_cap = 1024;
    char *stages_json = (char *)malloc(sj_cap);
    size_t so = 0;
    if (stages_json) {
        so = jappend(&stages_json, &sj_cap, so, "[");
        for (size_t s = 0; s < g_runs[found].n_stages; s++) {
            run_stage *st = &g_runs[found].stages[s];
            so = jappend(&stages_json, &sj_cap, so,
                "%s{\"id\":\"%s\",\"name\":\"%s\",\"index\":%d,"
                "\"status\":\"%s\"}",
                s ? "," : "", st->id, st->id, (int)s, wire_state(st->state));
        }
        so = jappend(&stages_json, &sj_cap, so, "]");
        (void)so;
    }
    pthread_mutex_unlock(&g_runs_mu);

    char *arts = run_artifacts_json(outdir);
    /* (audit F26, 2026-08-29) the exact-error law pipes RAW plugin/ComfyUI
     * stderr into run.error — it routinely contains double quotes. Quote
     * it for JSON or the whole status response becomes unparseable (this
     * is exactly what broke the queue test at char 236). */
    char *errq = json_quote(err);
    size_t cap = strlen(arts) + strlen(stages_json ? stages_json : "[]")
                 + strlen(errq) + 700;
    char *out = (char *)malloc(cap);
    snprintf(out, cap,
        "{\"run_id\":\"%s\",\"status\":\"%s\",\"stages\":%s,\"artifacts\":%s,\"error\":%s,\"queue_position\":%d,\"yaml_filename\":\"%s\",\"draft_id\":\"%s\"}",
        yamlhead, wire_state(state),
        stages_json ? stages_json : "[]", arts, errq, qpos, modelh, didh);
    res.set_header("Cache-Control", "no-store");
    res.set_content(out, "application/json");
    free(arts); free(errq); free(out);
    free(stages_json);
}

/* == Ray 1:1 card birth (server-js routes/pipeline/drafts.ts createDraft) ==
 *
 * The studio's hydrateDraft maps the doc ONLY when it carries the ray birth
 * fields — draft_id at root, id/inputs/provenance per stage (the stage
 * view-model does stage.inputs.map(...) unguarded: a missing inputs array
 * crashes the card render; a missing draft_id leaves the composing
 * skeleton up forever). The 2026-08-30 compose door persisted the raw tool
 * body ({intent,stages}) — every /editor/?meliteCards surface froze. This
 * composer rewrites the incoming body into the FULL ray contract before
 * persistence:
 *   root {draft_id,intent,stages,status:"ready",createdAt,completedAt:null}
 *   stage {id:"s_<i>",inputs:[""],provenance:"agent",...} (injected only
 *         when absent — idempotent against bodies already carrying them)
 * Unknown root members are preserved AFTER the contract keys (no data
 * loss; ray consumers read named keys only). Key order matches ray's
 * createDraft exactly. */
static std::string ray_compose_draft_doc(const std::string &body,
                                         const char *draft_id);

static void handle_pipelines_drafts(const httplib::Request &req,
                                    httplib::Response &res) {
    /* DSH build_pipeline contract: {intent, stages:[...]} -> {draftId, stages} */
    if (req.body.empty()) {
        res.status = 400;
        res.set_content("{\"error\":\"empty body\"}", "application/json");
        return;
    }
    /* LANE LAW: an agent session may compose EXACTLY ONE card. The
     * second compose 409s forever — not a rule the agent follows, a
     * wall the gateway enforces. Non-agent sessions are unaffected. */
    agent_session *as = NULL;
    {
        std::string tok_str = req.get_header_value("x-agent-session");
        if (!tok_str.empty()) {
            pthread_mutex_lock(&g_agent_mu);
            as = agent_session_find(tok_str.c_str());
            if (as && as->composed >= 1) {
                pthread_mutex_unlock(&g_agent_mu);
                res.status = 409;
                res.set_content(
                    "{\"error\":\"one card per agent session (structural "
                    "law): this session already composed a card\"}",
                    "application/json");
                return;
            }
            pthread_mutex_unlock(&g_agent_mu);
        }
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
    /* RAY 1:1 (2026-08-30 "nothing less than 1:1 Ray functionality"): the
     * doc is BORN with the full card contract — not the raw tool body. */
    std::string doc = ray_compose_draft_doc(req.body, id);
    FILE *f = fopen(path, "w");
    if (!f) {
        res.status = 500;
        res.set_content("{\"error\":\"cannot persist draft\"}", "application/json");
        return;
    }
    fwrite(doc.c_str(), 1, doc.size(), f);
    fclose(f);

    /* LANE LAW auto-arm: when an agent session composes its one card,
     * the GATEWAY arms the run itself — the agent never touches any
     * run door (structural: no run tool exists in a lane session).
     * Loopback through the same start door every card uses; the
     * request is server-originated (no session header), so the lane
     * 403 cannot bite it. */
    if (as) {
        pthread_mutex_lock(&g_agent_mu);
        as->composed = 1;
        snprintf(as->draft_id, sizeof(as->draft_id), "%s", id);
        pthread_mutex_unlock(&g_agent_mu);

        /* THE SIMPLEST LOOPBACK: the start handler already knows how to
         * load everything from a draft_id (it reads the draft JSON,
         * extracts calls/fps/seed/context_length itself). We don't need
         * to reconstruct anything — just tell it "run this draft."
         * The prompt field is mandatory (line 1999 generic gate) — it
         * becomes the run's prompt_name tag; value is cosmetic. */
        char card_body[512];
        snprintf(card_body, sizeof(card_body),
                 "{\"yaml\":\"h3-timeline\",\"draft_id\":\"%s\","
                 "\"prompt\":\"lane-auto-arm\"}",
                 as->draft_id);

        /* loopback start — server-originated queue action */
        httplib::Client cli(g_loop_host, g_loop_port);
        cli.set_connection_timeout(5);
        auto r = cli.Post("/v1/pipelines/start", card_body,
                          "application/json");
        fprintf(stderr, "[lane] auto-arm session %s draft %s -> start %s (%d)\n",
                as->token, as->draft_id,
                r ? r->body.substr(0, 120).c_str() : "no response",
                r ? r->status : 0);
        (void)r;
    }

    /* echo the stages array back verbatim from the COMPOSED doc (the ray
     * response contract {draftId, stages} reads the birth-time stages) */
    const char *sp = strstr(doc.c_str(), "\"stages\"");
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

/* Ray 1:1 calls normalization: the tool schema (cards/video_timeline/
 * tool.json) declares calls as an ARRAY, and the studio parses it as one
 * — a JSON-encoded STRING parses to zero calls and the editor silently
 * renders its default placeholder call ("A single shot — describe…").
 * Inference-era writers stringified it; the composer un-stringifies at
 * birth: params.calls:"[…]" → params.calls:[…]. Arrays pass through
 * untouched. Returns the (possibly rewritten) stage-body text. */
static std::string ray_unwrap_calls(const std::string &inner) {
    const char *hs = inner.c_str();
    const char *he = hs + inner.size();
    const char *key = NULL;
    for (const char *q = hs; (q = strstr(q, "\"calls\"")) != NULL; q++) {
        const char *c = j_skip_ws(q + 7, he);
        if (c < he && *c == ':') { key = q; break; }
    }
    if (!key) return inner;
    const char *vs = j_skip_ws(strchr(key, ':') + 1, he);
    if (vs >= he || *vs != '"') return inner;   /* already an array */
    const char *ve = j_value_end(vs, he);
    if (!ve) return inner;
    /* unescape the embedded JSON text */
    std::string raw(vs + 1, (size_t)(ve - 1 - (vs + 1)));
    std::string un;
    un.reserve(raw.size());
    for (size_t i = 0; i < raw.size(); i++) {
        if (raw[i] == '\\' && i + 1 < raw.size()) {
            char nx = raw[i + 1];
            if (nx == '"' || nx == '\\') { un += nx; i++; continue; }
            if (nx == 'n') { un += '\n'; i++; continue; }
            if (nx == 't') { un += '\t'; i++; continue; }
            if (nx == 'r') { un += '\r'; i++; continue; }
        }
        un += raw[i];
    }
    /* validate: must parse as a JSON array (the calls document) */
    const char *us = un.c_str();
    const char *p0 = j_skip_ws(us, us + un.size());
    if (*p0 != '[' || !j_value_end(p0, us + un.size()))
        return inner;
    std::string out(inner, 0, (size_t)(vs - hs));
    out += un;
    out.append(ve, (size_t)(he - ve));
    return out;
}

static std::string ray_compose_draft_doc(const std::string &body,
                                         const char *draft_id) {
    const char *bs = body.c_str();
    const char *be = bs + body.size();
    struct jmember ms[24];
    int n = j_object_members(bs, be, ms, 24);
    std::string intent = "\"\"", stages = "[]", extras;
    for (int i = 0; i < n; i++) {
        std::string key = ms[i].key;
        if (key == "intent") {
            intent.assign(ms[i].vs, (size_t)(ms[i].ve - ms[i].vs));
        } else if (key == "stages") {
            stages.assign(ms[i].vs, (size_t)(ms[i].ve - ms[i].vs));
        } else if (key != "draft_id" && key != "status" &&
                   key != "createdAt" && key != "completedAt") {
            extras += ",\"";
            extras += key;
            extras += "\":";
            extras.append(ms[i].vs, (size_t)(ms[i].ve - ms[i].vs));
        }
    }

    /* per-stage birth fields: s_-ids, the ""-padded input slot, agent
     * provenance (createDraft lines 197-232). Span surgery preserves each
     * stage's authored members verbatim (params stays exactly as sent). */
    std::string stg = "[";
    const char *as = stages.c_str(), *ae = as + stages.size();
    const char *p = j_skip_ws(as + (*as == '[' ? 1 : 0), ae);
    int idx = 0;
    while (p < ae && *p != ']') {
        if (*p == ',') { p = j_skip_ws(p + 1, ae); continue; }
        if (*p != '{') break;               /* tolerant: stop at malformed */
        const char *ve = j_value_end(p, ae);
        if (!ve) break;
        if (idx > 0) stg += ',';
        struct jmember sm[48];
        int sn = j_object_members(p, ve, sm, 48);
        bool has_id = false, has_inputs = false, has_prov = false;
        for (int k = 0; k < sn; k++) {
            std::string kk = sm[k].key;
            if (kk == "id") has_id = true;
            else if (kk == "inputs") has_inputs = true;
            else if (kk == "provenance") has_prov = true;
        }
        std::string inner(p + 1, (size_t)(ve - 1 - (p + 1)));
        while (!inner.empty() && (inner.back() == ' ' || inner.back() == '\n' ||
               inner.back() == '\t' || inner.back() == '\r'))
            inner.pop_back();
        inner = ray_unwrap_calls(inner);
        char sid[32];
        snprintf(sid, sizeof(sid), "s_%d", idx);
        stg += '{';
        bool c = false;
        if (!has_id) { stg += "\"id\":\""; stg += sid; stg += "\""; c = true; }
        if (!inner.empty()) { if (c) stg += ','; stg += inner; c = true; }
        if (!has_inputs) {
            if (c) stg += ',';
            stg += "\"inputs\":[\"\"]";
            c = true;
        }
        if (!has_prov) {
            if (c) stg += ',';
            stg += "\"provenance\":\"agent\"";
            c = true;
        }
        stg += '}';
        p = j_skip_ws(ve, ae);
        idx++;
    }
    stg += ']';

    std::string out = "{\"draft_id\":\"";
    out += draft_id;
    out += "\",\"intent\":";
    out += intent;
    out += ",\"stages\":";
    out += stg;
    out += ",\"status\":\"ready\",\"createdAt\":";
    out += std::to_string((long long)time(NULL) * 1000);
    out += ",\"completedAt\":null";
    out += extras;
    out += "}";
    return out;
}

/* GET /v1/pipelines/drafts/:id — one draft doc, verbatim bytes. */
/* forward decls (defined near the boot lint): the GET door below uses
 * them for the runtime card-heal law */
static int jscan_doc(const char *doc, size_t len, size_t *bad_at);
static int draft_lint_one(const char *path, const char *id);

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
    /* (runtime card-heal law, 2026-08-31) the boot lint repairs cards
     * at REBOOT — but a card corrupted MID-SESSION (a future write-back
     * bug, a partial disk write) served unparseable bytes to every
     * click until someone restarted the gateway. The click door itself
     * now validates what it serves: one O(n) scan, and a damaged doc
     * is healed IN PLACE by the same lint, then re-read. The click can
     * never again be the place a corruption is discovered. */
    {
        size_t bad_at = 0;
        if (jscan_doc(body.c_str(), body.size(), &bad_at) != 0) {
            draft_lint_one(path, id.c_str());
            FILE *f2 = fopen(path, "rb");
            if (f2) {
                body.clear();
                while ((n = fread(buf, 1, sizeof(buf), f2)) > 0)
                    body.append(buf, n);
                fclose(f2);
            }
        }
    }
    /* (2026-08-30 doc-version contract) createdAt is the doc version and
     * the studio's refresh gate keys on it — a browser-HTTP-cached copy
     * would freeze the card at a stale version forever (the write-back
     * bump can never arrive). Drafts are cheap local reads: never
     * cacheable. */
    res.set_header("Cache-Control", "no-store");
    res.set_content(body, "application/json");
}

/* (2026-08-30 clip-loss gates) count video files (stitch + windows) that
 * exist in a run dir, and build the ray-named artifact map from disk.
 * The run registry on disk is the source of truth — a doc or snapshot
 * that lists fewer clips than the run produced is DEGRADED and must be
 * healed, never trusted. */
static int run_dir_clip_names(const char *rdir, char names[6][64],
                              char keys[6][40]) {
    int n = 0;
    char stitch[96] = "";
    int winmask = 0;
    DIR *d = opendir(rdir);
    if (!d) return 0;
    struct dirent *e;
    while ((e = readdir(d)) != NULL) {
        const char *nm = e->d_name;
        size_t l = strlen(nm);
        if (l < 5 || strcmp(nm + l - 4, ".mp4") != 0) continue;
        if (strncmp(nm, "stitch_video", 12) == 0) {
            snprintf(stitch, sizeof(stitch), "%s", nm);
            continue;
        }
        int wi = 0;
        if (sscanf(nm, "window%d_video", &wi) == 1 && wi >= 1 && wi <= 4)
            winmask |= 1 << wi;
    }
    closedir(d);
    if (stitch[0]) {
        snprintf(names[n], 64, "%s", stitch);
        snprintf(keys[n], 40, "video");
        n++;
    }
    for (int w = 1; w <= 4; w++) {
        if (!(winmask & (1 << w))) continue;
        /* match the exact window video (windowN_video_*.mp4) */
        DIR *d2 = opendir(rdir);
        if (!d2) continue;
        struct dirent *e2;
        while ((e2 = readdir(d2)) != NULL) {
            char pat[24];
            snprintf(pat, sizeof(pat), "window%d_video", w);
            size_t l2 = strlen(e2->d_name);
            if (strncmp(e2->d_name, pat, strlen(pat)) == 0 && l2 > 4 &&
                strcmp(e2->d_name + l2 - 4, ".mp4") == 0 && n < 6) {
                snprintf(names[n], 64, "%s", e2->d_name);
                snprintf(keys[n], 40, "video_w%d_main", w);
                n++;
                break;
            }
        }
        closedir(d2);
    }
    return n;
}

/* GET /v1/pipelines/drafts/:id/stages/:sid/result — ray's MISSING-RESULT
 * HEAL door (pipelineRunSlice._healStageResults). Rebuilds the stage
 * result from the run registry on disk (the SSOT): the doc's
 * result.metadata.runId when present, else the newest sidecar carrying
 * this draft_id. Emits {found:true,result:{assetUrls,artifacts,
 * metadata:{runId}}} — the studio then re-renders every clip. A doc that
 * lost clips heals; a snapshot that lost clips heals; clip loss can no
 * longer survive a card re-open. */
static long sidecar_num(const char *json, const char *key, long dflt);
static void handle_stage_result(const httplib::Request &req,
                                httplib::Response &res) {
    std::string id = req.path_params.at("id");
    std::string sid = req.path_params.at("sid");
    if (!draft_id_ok(id)) {
        res.status = 400;
        res.set_content("{\"error\":\"bad id\"}", "application/json");
        return;
    }
    /* resolve the run: the doc's result.metadata.runId, else the newest
     * sidecar with draft_id == id */
    char rid[128] = "";
    char path[512];
    snprintf(path, sizeof(path), "./drafts/%s.json", id.c_str());
    FILE *f = fopen(path, "rb");
    if (f) {
        std::string body;
        char buf[65536];
        size_t n;
        while ((n = fread(buf, 1, sizeof(buf), f)) > 0) body.append(buf, n);
        fclose(f);
        const char *rp = strstr(body.c_str(), "\"runId\"");
        if (rp) {
            const char *q1 = strchr(rp, '"') ? strchr(strchr(rp, '"') + 1, '"') : NULL;
            /* skip to the value quote after "runId": */
            const char *c = strchr(rp, ':');
            if (c) {
                const char *vs = strchr(c, '"');
                const char *ve = vs ? strchr(vs + 1, '"') : NULL;
                if (vs && ve && (size_t)(ve - vs - 1) < sizeof(rid))
                    snprintf(rid, sizeof(rid), "%.*s", (int)(ve - vs - 1), vs + 1);
            }
            (void)q1;
        }
    }
    if (!rid[0]) {
        /* scan sidecars newest-first for this draft */
        struct ent { char dir[128]; long created; } ents[512];
        int n2 = 0;
        DIR *d = opendir("./output");
        if (d) {
            struct dirent *e;
            while (e = readdir(d)) {
                if (strncmp(e->d_name, "run-", 4) != 0 || n2 >= 512) continue;
                char sd[640], sbuf[8192];
                snprintf(sd, sizeof(sd), "./output/%s/_pipeline.json", e->d_name);
                FILE *sf = fopen(sd, "rb");
                if (!sf) continue;
                size_t got = fread(sbuf, 1, sizeof(sbuf) - 1, sf);
                fclose(sf);
                sbuf[got] = 0;
                char dr[96] = "";
                sidecar_str(sbuf, "draft_id", dr, sizeof(dr));
                if (strcmp(dr, id.c_str()) != 0) continue;
                snprintf(ents[n2].dir, sizeof(ents[n2].dir), "%s", e->d_name);
                ents[n2].created = sidecar_num(sbuf, "created", 0);
                n2++;
            }
            closedir(d);
        }
        if (n2 == 0) {
            res.set_content("{\"found\":false}", "application/json");
            return;
        }
        int best = 0;
        for (int i = 1; i < n2; i++)
            if (ents[i].created > ents[best].created) best = i;
        snprintf(rid, sizeof(rid), "%s", ents[best].dir);
    }
    char rdir[600];
    snprintf(rdir, sizeof(rdir), "./output/%s", rid);
    char names[6][64], keys[6][40];
    int ncl = run_dir_clip_names(rdir, names, keys);
    if (ncl == 0) {
        res.set_content("{\"found\":false}", "application/json");
        return;
    }
    std::string out = "{\"found\":true,\"result\":{\"assetUrls\":[";
    for (int i = 0; i < ncl; i++) {
        if (i) out += ",";
        out += "\"/editor/assets/runs/" + std::string(rid) + "/" + names[i] + "\"";
    }
    out += "],\"artifacts\":{";
    for (int i = 0; i < ncl; i++) {
        if (i) out += ",";
        out += "\"" + std::string(keys[i]) + "\":\"/editor/assets/runs/" +
               std::string(rid) + "/" + names[i] + "\"";
    }
    out += "},\"metadata\":{\"runId\":\"" + std::string(rid) + "\"}}}";
    res.set_header("Cache-Control", "no-store");
    res.set_content(out, "application/json");
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
    res.set_header("Cache-Control", "no-store");
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

/* == Ray 1:1 family param schemas (server-js routes/catalog/
 * family_schemas.ts + media/comfyui/schema/family_schema.ts) ============
 * GET /v1/pipelines/families/param-schemas  → always 200 {family_id:
 * schema} for every catalog family. GET /v1/pipelines/families/{family_id}
 * /param-schema → the schema, or 404 {error,family_id} for an unknown
 * family. The envelope mirrors the ray derivation exactly — no family
 * declares a paramSchema, so the derived schema is the pydantic-style
 * envelope with empty properties (ray parity, wire-shape identical). */
static void handle_family_param_schemas(const httplib::Request &req,
                                        httplib::Response &res) {
    (void)req;
    std::string out = "{";
    if (g_catalog) {
        for (size_t i = 0; i < g_catalog->n_models; i++) {
            const catalog_model *m = &g_catalog->models[i];
            if (!m->id || !*m->id) continue;
            if (out.size() > 1) out += ',';
            out += "\"";
            out += m->id;
            out += "\":{\"title\":\"";
            out += m->id;
            out += "_Params\",\"type\":\"object\","
                   "\"additionalProperties\":false,"
                   "\"properties\":{},\"required\":[]}";
        }
    }
    out += "}";
    res.set_content(out, "application/json");
}

static void handle_family_param_schema(const httplib::Request &req,
                                       httplib::Response &res) {
    std::string id = req.path_params.at("family_id");
    if (g_catalog) {
        for (size_t i = 0; i < g_catalog->n_models; i++) {
            const catalog_model *m = &g_catalog->models[i];
            if (m->id && id == m->id) {
                std::string out = "{\"title\":\"";
                out += m->id;
                out += "_Params\",\"type\":\"object\","
                       "\"additionalProperties\":false,"
                       "\"properties\":{},\"required\":[]}";
                res.set_content(out, "application/json");
                return;
            }
        }
    }
    res.status = 404;
    char out[320];
    snprintf(out, sizeof(out),
             "{\"error\":\"Unknown family_id '%s'\",\"family_id\":\"%s\"}",
             id.c_str(), id.c_str());
    res.set_content(out, "application/json");
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

        /* (stack-smash law, 2026-08-31) clamp the would-be return so
         * off can never pass cap — the old `off += snprintf` let a
         * long id/label push off past the allocation and the next
         * `json[off++] = ','` wrote past the heap. */
        if (!first) {
            if ((size_t)off + 2 < cap) json[off++] = ',';
            else break;
        }
        first = 0;
        int rn = snprintf(json + off, cap - (size_t)off,
            "{\"id\":\"%s\",\"label\":\"%s\",\"genre\":\"%s\"}",
            m->id ? m->id : "",
            m->label ? m->label : "",
            m->genre ? m->genre : "");
        if (rn < 0 || (size_t)rn >= cap - 1 - (size_t)off) break;
        off += rn;
    }

    if ((size_t)off < cap)
        snprintf(json + off, cap - (size_t)off, "]}");
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
    snprintf(pat, sizeof(pat), "\"%s\":", key);
    const char *p = strstr(json, pat);
    if (!p) return -1;
    p += strlen(pat);
    /* (2026-08-31) tolerate pretty-printed sidecars: skip spaces between
     * the colon and the opening quote before expecting the value. */
    while (*p == ' ' || *p == '\t') p++;
    if (*p != '"') return -1;
    p++;
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
            /* API gate: only list pipelines with api: true */
            FILE *pf = fopen(py, "r");
            if (!pf) continue;
            char pbuf[4096];
            size_t pn = fread(pbuf, 1, sizeof(pbuf) - 1, pf);
            fclose(pf);
            pbuf[pn] = 0;
            if (!strstr(pbuf, "api: true")) continue;
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
    run_dir_ent ents[8192];
    size_t n = 0;
    DIR *d = opendir("./output");
    if (d) {
        struct dirent *e;
        while ((e = readdir(d)) != NULL && n < 8192) {
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
    /* (2026-08-31) emitted-count drives the row separator: the
     * underscore-hide filter may skip rows, so a positional i>0 test
     * emits a leading comma after a skipped first row → unparseable
     * listing. */
    size_t emitted = 0;
    for (size_t i = 0; i < n && i < (size_t)limit; i++) {
        char dir[600], sd[640], buf[8192];
        snprintf(dir, sizeof(dir), "./output/%s", ents[i].dir);
        snprintf(sd, sizeof(sd), "%s/_pipeline.json", dir);
        char model[64] = "", prompt[2048] = "", status[16] = "unknown";
        char draft[96] = "";
        long seed = -1, created = ents[i].created;
        FILE *f = fopen(sd, "rb");
        if (f) {
            size_t got = fread(buf, 1, sizeof(buf) - 1, f);
            fclose(f);
            buf[got] = 0;
            sidecar_str(buf, "model", model, sizeof(model));
            /* (user-surface law, 2026-08-31) test-fixture pipelines are
             * named with a LEADING UNDERSCORE by repo convention
             * (_lc_ok, _chaos_*, _queue_test, _rc_hold, ...). Their runs
             * share ./output with real work but must NEVER surface in a
             * user-facing listing: a leaked test run on top of the media
             * sidebar buried the user's real cards, and clicking its
             * deleted draft 404'd ("card does not recover"). */
            if (model[0] == '_') continue;
            sidecar_str(buf, "prompt", prompt, sizeof(prompt));
            sidecar_str(buf, "status", status, sizeof(status));
            sidecar_str(buf, "draft_id", draft, sizeof(draft));
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
            "\"params\":{\"seed\":%ld},\"draft_id\":\"%s\"}",
            emitted ? "," : "", ents[i].dir, modelq, modelq, status, created,
            promptq, seed, thumb, arts, seed, draft);
        emitted++;
        free(arts); free(promptq); free(modelq);
    }
    len = jappend(&out, &cap, len, "]}");
    res.set_header("Cache-Control", "no-store");
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


/* GET /v1/card-tools — the PLUGIN SYSTEM door for model-facing card
 * tools. Each complex card OWNS its tool: a tool.json manifest beside
 * the card's form (plugins/<owner>/cards/<card>/tool.json) declares
 * name/description/model + the params schema + constraint vocabulary.
 * This handler scans the card dirs and serves the manifests verbatim;
 * the DSH side registers one tool per manifest dynamically. Adding a
 * complex card = adding its dir + tool.json — zero DSH-side code. */
/* append every tool.json matching lane_want (empty lane = ALL tools):
 * card manifests under plugins/<owner>/cards/<card>/tool.json and
 * curated pipeline manifests under pipelines/<name>/tool.json.
 * LANE LAW: with a lane set, a session must never even SEE another
 * lane's tool exist. */
static void lane_tools_append(std::string &out, const char *lane_want) {
    int count = 0;
    const char *plugins[] = { "../plugins", "./plugins", NULL };
    /* (lane SSOT, 2026-08-30) same arbitration as lane_resolve: when a
     * lane matches several card dirs by model, the lane's OWN tool
     * ("<lane>_card") is the one manifest served — melite-tools refuses
     * multi-manifest lanes, and a session must see EXACTLY one tool.
     * Pass 0: name matches only; pass 1: the old first-match behavior. */
    char wantcard[72];
    snprintf(wantcard, sizeof(wantcard), "%s_card", lane_want);
    for (int pass = 0; pass < 2; pass++) {
    if (pass == 1 && count) break;   /* pass 0 already found the lane's own tool */
    for (int pi = 0; plugins[pi]; pi++) {
        DIR *d = opendir(plugins[pi]);
        if (!d) continue;
        struct dirent *owner;
        while ((owner = readdir(d)) != NULL) {
            if (owner->d_name[0] == '.') continue;
            char cards_dir[1024];
            snprintf(cards_dir, sizeof(cards_dir), "%s/%s/cards",
                     plugins[pi], owner->d_name);
            DIR *cd = opendir(cards_dir);
            if (!cd) continue;
            struct dirent *card;
            while ((card = readdir(cd)) != NULL) {
                if (card->d_name[0] == '.') continue;
                char tj[1536];
                snprintf(tj, sizeof(tj), "%s/%s/tool.json",
                         cards_dir, card->d_name);
                FILE *f = fopen(tj, "rb");
                if (!f) continue;
                char *buf = (char *)malloc(65536);
                size_t n = fread(buf, 1, 65535, f);
                fclose(f);
                buf[n] = 0;
                while (n && (buf[n-1] == 10 || buf[n-1] == 13 ||
                             buf[n-1] == ' ' || buf[n-1] == 9)) buf[--n] = 0;
                if (buf[0] != '{' || buf[n-1] != '}' || n < 10) {
                    fprintf(stderr, "[card-tools] skipping malformed %s\n", tj);
                    free(buf);
                    continue;
                }
                if (lane_want[0]) {
                    char dn[64], mdl[64], tnorm[64];
                    lane_norm(card->d_name, dn, sizeof(dn));
                    mdl[0] = 0;
                    const char *m = strstr(buf, "\"model\"");
                    if (m) {
                        const char *q1 = strchr(m + 7, '"');
                        const char *q2 = q1 ? strchr(q1 + 1, '"') : NULL;
                        if (q1 && q2 && (size_t)(q2 - q1 - 1) < sizeof(mdl))
                            snprintf(mdl, sizeof(mdl), "%.*s",
                                     (int)(q2 - q1 - 1), q1 + 1);
                    }
                    char mn[64];
                    lane_norm(mdl, mn, sizeof(mn));
                    tnorm[0] = 0;
                    const char *tn = strstr(buf, "\"name\"");
                    if (tn) {
                        const char *r1 = strchr(tn + 6, '"');
                        const char *r2 = r1 ? strchr(r1 + 1, '"') : NULL;
                        if (r1 && r2 && (size_t)(r2 - r1 - 1) < sizeof(tnorm))
                            snprintf(tnorm, sizeof(tnorm), "%.*s",
                                     (int)(r2 - r1 - 1), r1 + 1);
                        for (char *c2 = tnorm; *c2; c2++)
                            if (*c2 == '-') *c2 = '_';
                    }
                    int lane_match = strcmp(dn, lane_want) == 0 ||
                                     strcmp(mn, lane_want) == 0;
                    if (!lane_match) {
                        /* (lane SSOT law) card.yaml may declare more
                         * models than tool.json's single string */
                        char card_path[1024];
                        snprintf(card_path, sizeof(card_path), "%s/%s",
                                 cards_dir, card->d_name);
                        lane_match = lane_card_models_match(card_path,
                                                           lane_want);
                    }
                    int name_match = strcmp(tnorm, wantcard) == 0;
                    if (!lane_match ||
                        ((pass == 0) != (name_match != 0))) {
                        free(buf);
                        continue;
                    }
                }
                if (count) out += ",";
                out += buf;
                count++;
                free(buf);
            }
            closedir(cd);
        }
        closedir(d);
    }
    }
    /* curated pipeline manifests: pipelines/<name>/tool.json */
    const char *pdirs[] = { "../pipelines", "./pipelines", NULL };
    for (int pi = 0; pdirs[pi]; pi++) {
        DIR *d = opendir(pdirs[pi]);
        if (!d) continue;
        struct dirent *ent;
        while ((ent = readdir(d)) != NULL) {
            if (ent->d_name[0] == '.') continue;
            char tj[900];
            snprintf(tj, sizeof(tj), "%s/%s/tool.json", pdirs[pi], ent->d_name);
            FILE *f = fopen(tj, "rb");
            if (!f) continue;
            char *buf = (char *)malloc(65536);
            size_t n = fread(buf, 1, 65535, f);
            fclose(f);
            buf[n] = 0;
            while (n && (buf[n-1] == 10 || buf[n-1] == 13 ||
                         buf[n-1] == ' ' || buf[n-1] == 9)) buf[--n] = 0;
            if (buf[0] != '{' || buf[n-1] != '}' || n < 10) {
                free(buf);
                continue;
            }
            if (lane_want[0]) {
                char dn[64], mdl[64];
                lane_norm(ent->d_name, dn, sizeof(dn));
                mdl[0] = 0;
                const char *m = strstr(buf, "\"model\"");
                if (m) {
                    const char *q1 = strchr(m + 7, '"');
                    const char *q2 = q1 ? strchr(q1 + 1, '"') : NULL;
                    if (q1 && q2 && (size_t)(q2 - q1 - 1) < sizeof(mdl))
                        snprintf(mdl, sizeof(mdl), "%.*s",
                                 (int)(q2 - q1 - 1), q1 + 1);
                }
                char mn[64];
                lane_norm(mdl, mn, sizeof(mn));
                if (strcmp(dn, lane_want) != 0 && strcmp(mn, lane_want) != 0) {
                    free(buf);
                    continue;
                }
            }
            if (count) out += ",";
            out += buf;
            count++;
            free(buf);
        }
        closedir(d);
    }
}

static void handle_card_tools(const httplib::Request &req,
                              httplib::Response &res) {
    char lane_want[64] = "";
    std::string lane_q = req.get_param_value("lane");
    if (!lane_q.empty()) lane_norm(lane_q.c_str(), lane_want, sizeof(lane_want));
    std::string out = "[";
    lane_tools_append(out, lane_want);
    out += "]";
    res.set_content(out, "application/json");
}

/* (editor lane law, 2026-08-31) The Tech Noir editor (served by the card
 * deck at /editor) syncs its registries through a fixed set of /v1 lanes.
 * The deck proxies the WHOLE /v1 prefix here, so every lane the editor
 * names must answer — a 404 makes the editor's plugin registry sync die
 * ("registry untouched") and its surfaces render empty. These nine were
 * missing; each answers with the exact envelope the editor parses
 * ({entries|panes|uiSlots|themes|tags|services|tools|plugins|forms:[...]}).
 * Real data where the gateway owns it; empty arrays are VALID registries
 * (the editor treats them as "nothing registered", never as an error). */
static void handle_lane_registry(const httplib::Request &req,
                                 httplib::Response &res) {
    std::string path = req.path;
    std::string body;
    if (path == "/v1/forms") {
        /* the compose-form list: one entry per lane pipeline, same names
         * the card tools door already publishes */
        body = "{\"forms\":[";
        DIR *[REDACTED 2026-11-05] = opendir("../pipelines");
        int n = 0;
        if ([REDACTED 2026-11-05]) {
            struct dirent *e;
            while ((e = readdir([REDACTED 2026-11-05])) != NULL) {
                char p[600];
                snprintf(p, sizeof(p), "../pipelines/%s/pipeline.yaml",
                         e->d_name);
                struct stat st;
                if (e->d_name[0] == '_' || e->d_name[0] == '.'
                        || stat(p, &st) != 0)
                    continue;
                char safe[256];
                snprintf(safe, sizeof(safe), "%s", e->d_name);
                for (char *c = safe; *c; c++)
                    if ((unsigned char)*c < 0x20 || *c == '"' || *c == '\\')
                        *c = '_';
                body += (n ? "," : "");
                body += "{\"id\":\"" + std::string(safe)
                      + "\",\"name\":\"" + std::string(safe) + "\"}";
                n++;
            }
            closedir([REDACTED 2026-11-05]);
        }
        body += "]}";
    } else if (path == "/v1/shell") {
        body = "{\"entries\":[]}";
    } else if (path == "/v1/right-panes") {
        body = "{\"panes\":[]}";
    } else if (path == "/v1/ui-slots") {
        body = "{\"uiSlots\":[]}";
    } else if (path == "/v1/themes") {
        body = "{\"themes\":[]}";
    } else if (path == "/v1/tags") {
        body = "{\"tags\":[]}";
    } else if (path == "/v1/services") {
        body = "{\"services\":[]}";
    } else if (path == "/v1/tools") {
        body = "{\"tools\":[]}";
    } else if (path == "/v1/plugins") {
        body = "{\"plugins\":[]}";
    } else if (path == "/v1/llm/keys/active") {
        /* the LLM lane lives in DSH, not this gateway: report no active
         * key so the editor falls back to its embed banner instead of
         * erroring the sync loop */
        body = "{\"key\":null,\"error\":\"no_active_key\"}";
    } else if (path == "/v1/llm/health") {
        body = "{\"connected\":false}";
    } else {
        res.status = 404;
        res.set_content("{\"error\":\"not_found\"}", "application/json");
        return;
    }
    res.set_header("Cache-Control", "no-store");
    res.set_content(body, "application/json");
}

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
            /* (2026-08-31 lane-spec law) the editor also asks form-specs
             * for PIPELINE LANE names (h3-timeline, …) — card lanes, not
             * catalog models. A lane with pipelines/<name>/pipeline.yaml
             * on disk gets a minimal valid spec so its card renders;
             * unknown names still 404. Display wire only. */
            char lane[300];
            snprintf(lane, sizeof(lane), "../pipelines/%s/pipeline.yaml",
                     model.c_str());
            struct stat lst;
            if (stat(lane, &lst) == 0) {
                res.set_content(
                    "{\"defaults\":{},\"variants\":[],\"features\":{},\"enhance_prompts\":\"\"}",
                    "application/json");
                return;
            }
            char probe[256];
            snprintf(probe, sizeof(probe),
                     "grep -q 'type: %s' ../pipelines/*/pipeline.yaml 2>/dev/null",
                     model.c_str());
            if (system(probe) == 0) {
                res.set_content(
                    "{\"defaults\":{},\"variants\":[],\"features\":{},\"enhance_prompts\":\"\"}",
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
                    if (ll) {
                        /* (stack-smash law, 2026-08-31) clamp the
                         * would-be return: a long AGENT.md recipe block
                         * pushed o past the 4096 array and the next
                         * append underflowed sizeof-o into an
                         * unbounded stack write. */
                        int rn = snprintf(recipe + o, sizeof(recipe) - o,
                                          "%s%.*s", o ? "; " : "",
                                          (int)ll, p);
                        if (rn > 0)
                            o += (size_t)rn < sizeof(recipe) - 1 - o
                                     ? (size_t)rn
                                     : sizeof(recipe) - 1 - o;
                    }
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
/* ---------- LANE BUNDLES --------------------------------------------
 * BUNDLE LAW: every endpoint serves its OWN tools + skills. A timeline
 * lane never sees an image skill; an image lane never sees a video
 * tool. The full index (no ?lane=) stays complete for the GUI. */

/* row appender with grow-and-retry (jappend) — char** so reallocs
 * propagate, unlike skills_row's by-value buffer. */
static size_t bundle_row(char **buf, size_t *cap, size_t len, int *first,
                         const char *id, const char *name,
                         const char *desc, const char *genre,
                         const char *model) {
    char *nq = json_quote(name && name[0] ? name : id);
    char *dq = json_quote(desc ? desc : "");
    len = jappend(buf, cap, len,
                  "%s{\"id\":\"%s\",\"name\":%s,\"description\":%s",
                  *first ? "" : ",", id, nq, dq);
    if (genre && genre[0])
        len = jappend(buf, cap, len, ",\"genre\":\"%s\"", genre);
    if (model && model[0])
        len = jappend(buf, cap, len, ",\"model\":\"%s\"", model);
    len = jappend(buf, cap, len, "}");
    *first = 0;
    free(nq); free(dq);
    return len;
}

/* scan one unit's agents dir: <agents>/AGENT.md as <prefix>:<uid> plus
 * every <agents>/skills/<stem>.md (or <stem>/SKILL.md) as
 * <prefix>:<uid>:<stem>. prefix is "card", "pipeline" or "model". */
static size_t bundle_scan_unit(char **buf, size_t *cap, size_t len,
                               int *first, const char *agents_dir,
                               const char *uid, const char *prefix,
                               const char *genre) {
    char agmd[900];
    snprintf(agmd, sizeof(agmd), "%s/AGENT.md", agents_dir);
    {
        char name[128], desc[512], idbuf[224];
        if (md_frontmatter(agmd, name, sizeof(name), desc, sizeof(desc)) == 0) {
            snprintf(idbuf, sizeof(idbuf), "%s:%s", prefix, uid);
            len = bundle_row(buf, cap, len, first, idbuf,
                             name[0] ? name : uid, desc, genre, NULL);
        }
    }
    char sdir[900];
    snprintf(sdir, sizeof(sdir), "%s/skills", agents_dir);
    DIR *d = opendir(sdir);
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
        char path[1200], name[128], desc[512], idbuf[300];
        struct stat stb;
        snprintf(path, sizeof(path), "%s/%s", sdir, de->d_name);
        if (stat(path, &stb) == 0 && S_ISDIR(stb.st_mode)) {
            char nested[1200];
            if (!skills_nested(nested, sizeof(nested), sdir, stem)) continue;
            snprintf(idbuf, sizeof(idbuf), "%s:%s:%s", prefix, uid, stem);
            if (md_frontmatter(nested, name, sizeof(name), desc, sizeof(desc)) != 0)
                snprintf(name, sizeof(name), "%s", stem);
            len = bundle_row(buf, cap, len, first, idbuf, name, desc, genre, NULL);
            continue;
        }
        snprintf(idbuf, sizeof(idbuf), "%s:%s:%s", prefix, uid, stem);
        if (md_frontmatter(path, name, sizeof(name), desc, sizeof(desc)) != 0)
            snprintf(name, sizeof(name), "%s", stem);
        len = bundle_row(buf, cap, len, first, idbuf, name, desc, genre, NULL);
    }
    closedir(d);
    return len;
}

/* parse card.yaml top-level "families:" and "skills:" lists of the
 * form "  - id: <value>" (quotes optional). */
static int card_yaml_sections(const char *path,
                              char fams[][64], size_t *nf, size_t maxf,
                              char skls[][64], size_t *ns, size_t maxs) {
    *nf = 0;
    *ns = 0;
    FILE *f = fopen(path, "rb");
    if (!f) return -1;
    char line[600];
    int section = 0;   /* 0 none, 1 families, 2 skills */
    while (fgets(line, sizeof(line), f)) {
        if (line[0] && line[0] != ' ' && line[0] != 9 &&
            line[0] != '#' && line[0] != 10 && line[0] != 13) {
            if (strncmp(line, "families:", 9) == 0) section = 1;
            else if (strncmp(line, "skills:", 7) == 0) section = 2;
            else section = 0;
            continue;
        }
        if (section != 1 && section != 2) continue;
        const char *p = line;
        while (*p == ' ' || *p == 9) p++;
        if (strncmp(p, "- id:", 5) != 0) continue;
        p += 5;
        while (*p == ' ') p++;
        char val[64];
        size_t vl = 0;
        while (*p && *p != 10 && *p != 13 && vl < sizeof(val) - 1)
            val[vl++] = *p++;
        val[vl] = 0;
        if (vl >= 2 && val[0] == val[vl-1] && (val[0] == '"' || val[0] == 39)) {
            val[vl-1] = 0;
            memmove(val, val + 1, vl);
        }
        if (!val[0]) continue;
        if (section == 1 && *nf < maxf)
            snprintf(fams[(*nf)++], 64, "%s", val);
        else if (section == 2 && *ns < maxs)
            snprintf(skls[(*ns)++], 64, "%s", val);
    }
    fclose(f);
    return 0;
}

/* the bundle for ONE lane: card-local skills + skills the card
 * declares from the global pile + the family models' own skills —
 * or, for a pipeline lane, the pipeline's own agents bundle. */
static size_t skills_lane_bundle(char **buf, size_t *cap, size_t len,
                                 int *first, const char *lane) {
    char card_dir[1024], agent_md[131072];
    if (lane_resolve(lane, card_dir, sizeof(card_dir),
                     agent_md, sizeof(agent_md)) == 0) {
        char uid[64];
        const char *slash = strrchr(card_dir, '/');
        snprintf(uid, sizeof(uid), "%s", slash ? slash + 1 : card_dir);
        char agdir[1024];
        snprintf(agdir, sizeof(agdir), "%s/agents", card_dir);
        len = bundle_scan_unit(buf, cap, len, first, agdir, uid, "card", NULL);
        /* card.yaml: declared skills + families */
        char cy[1100];
        snprintf(cy, sizeof(cy), "%s/card.yaml", card_dir);
        char fams[12][64]; size_t nf;
        char skls[12][64]; size_t ns;
        if (card_yaml_sections(cy, fams, &nf, 12, skls, &ns, 12) == 0) {
            for (size_t i = 0; i < ns; i++) {
                char cand[4][700];
                snprintf(cand[0], sizeof(cand[0]), "./skills/%s.md", skls[i]);
                snprintf(cand[1], sizeof(cand[1]), "../skills/%s.md", skls[i]);
                snprintf(cand[2], sizeof(cand[2]), "./skills/%s/SKILL.md", skls[i]);
                snprintf(cand[3], sizeof(cand[3]), "../skills/%s/SKILL.md", skls[i]);
                const char *found = NULL;
                for (int c = 0; c < 4 && !found; c++)
                    if (access(cand[c], R_OK) == 0) found = cand[c];
                if (!found) continue;
                char name[128], desc[512];
                if (md_frontmatter(found, name, sizeof(name),
                                   desc, sizeof(desc)) == 0)
                    len = bundle_row(buf, cap, len, first, skls[i],
                                     name, desc, NULL, NULL);
            }
            for (size_t i = 0; i < nf; i++) {
                /* several model dirs share one family id (variants);
                 * take the FIRST one that carries an agents bundle */
                const catalog_model *m = NULL;
                if (g_catalog)
                    for (size_t k = 0; k < g_catalog->n_models; k++) {
                        const catalog_model *cand = &g_catalog->models[k];
                        if (cand->id && strcmp(cand->id, fams[i]) == 0
                            && cand->agent_md_path) { m = cand; break; }
                    }
                if (!m) continue;
                size_t al = strlen(m->agent_md_path);
                size_t keep = al > 9 ? al - 9 : 0;
                char magents[600];
                snprintf(magents, sizeof(magents), "%.*s", (int)keep,
                         m->agent_md_path);
                len = bundle_scan_unit(buf, cap, len, first, magents,
                                       m->id, "model",
                                       m->genre ? m->genre : "");
            }
        }
        return len;
    }
    /* pipeline lane? disk folders use dashes, lane_norm makes
     * underscores — probe BOTH forms under both pipeline roots. */
    char want[64];
    lane_norm(lane, want, sizeof(want));
    char pdir[600];
    pdir[0] = 0;
    {
        const char *proots[] = { "../pipelines", "./pipelines", NULL };
        const char *names[] = { lane, want, NULL };
        for (int r = 0; r < 2 && !pdir[0]; r++)
            for (int n = 0; n < 2 && !pdir[0]; n++) {
                char probe[600];
                snprintf(probe, sizeof(probe), "%s/%s/agents",
                         proots[r], names[n]);
                if (access(probe, R_OK) == 0)
                    snprintf(pdir, sizeof(pdir), "%s", probe);
            }
    }
    if (pdir[0])
        len = bundle_scan_unit(buf, cap, len, first, pdir, want,
                               "pipeline", NULL);
    return len;
}

static void handle_skills_index(const httplib::Request &req,
                                httplib::Response &res) {
    /* BUNDLE LAW: ?lane=<name> serves EXACTLY that lane's bundle — a
     * lane session never sees another endpoint's skills. */
    char lane_want[64] = "";
    std::string lane_q = req.get_param_value("lane");
    if (!lane_q.empty()) lane_norm(lane_q.c_str(), lane_want, sizeof(lane_want));
    size_t cap = 64 * 1024, len = 0;
    char *out = (char *)malloc(cap);
    int first = 1;
    len = jappend(&out, &cap, len, "{\"skills\":[");
    if (lane_want[0]) {
        len = skills_lane_bundle(&out, &cap, len, &first,
                                 lane_q.c_str());   /* RAW: pipelines keep dashes */
        len = jappend(&out, &cap, len, "]}");
        res.set_content(out, "application/json");
        free(out);
        return;
    }
    if (g_catalog) {
        for (size_t i = 0; i < g_catalog->n_models; i++) {
            const catalog_model *m = &g_catalog->models[i];
            if (!m->id) continue;
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
    /* card bundles: plugins/<owner>/cards/<card>/agents - ids card:<folder>:* */
    {
        const char *plugins[] = { "../plugins", "./plugins", NULL };
        for (int pi = 0; plugins[pi]; pi++) {
            DIR *d = opendir(plugins[pi]);
            if (!d) continue;
            struct dirent *owner;
            while ((owner = readdir(d)) != NULL) {
                if (owner->d_name[0] == '.') continue;
                char cards_dir[1024];
                snprintf(cards_dir, sizeof(cards_dir), "%s/%s/cards",
                         plugins[pi], owner->d_name);
                DIR *cd = opendir(cards_dir);
                if (!cd) continue;
                struct dirent *card;
                while ((card = readdir(cd)) != NULL) {
                    if (card->d_name[0] == '.') continue;
                    char agdir[1024];
                    snprintf(agdir, sizeof(agdir), "%s/%s/agents",
                             cards_dir, card->d_name);
                    if (access(agdir, R_OK) != 0) continue;
                    len = bundle_scan_unit(&out, &cap, len, &first,
                                           agdir, card->d_name, "card", NULL);
                }
                closedir(cd);
            }
            closedir(d);
        }
    }
    /* pipeline bundles: pipelines/<name>/agents - ids pipeline:<name>:* */
    {
        const char *pdirs[] = { "../pipelines", "./pipelines", NULL };
        for (int pi = 0; pdirs[pi]; pi++) {
            DIR *d = opendir(pdirs[pi]);
            if (!d) continue;
            struct dirent *ent;
            while ((ent = readdir(d)) != NULL) {
                if (ent->d_name[0] == '.') continue;
                char agdir[600];
                snprintf(agdir, sizeof(agdir), "%s/%s/agents",
                         pdirs[pi], ent->d_name);
                if (access(agdir, R_OK) != 0) continue;
                len = bundle_scan_unit(&out, &cap, len, &first,
                                       agdir, ent->d_name, "pipeline", NULL);
            }
            closedir(d);
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
        /* (bundle-law fix, 2026-08-31) several model dirs share one id
         * (variants); catalog_find_model returns the FIRST which may
         * lack an agents bundle - the advertised model:<id> row comes
         * from the variant WITH one, so resolve the same way. */
        const catalog_model *m = NULL;
        if (g_catalog) {
            const catalog_model *fallback =
                catalog_find_model(g_catalog, mid.c_str());
            for (size_t k = 0; k < g_catalog->n_models; k++) {
                const catalog_model *cand = &g_catalog->models[k];
                if (cand->id && strcmp(cand->id, mid.c_str()) == 0
                    && cand->agent_md_path) { m = cand; break; }
            }
            m = m ? m : fallback;
        }
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
    } else if (id.rfind("pipeline:", 0) == 0) {
        /* (bundle-law fix, 2026-08-31) the bundle doors advertise
         * pipeline:<name>[:<stem>] ids; the reader must resolve the
         * SAME ids or the bundle promises skills it cannot serve.
         * Disk dirs keep dashes, ids normalize to underscores -
         * probe both, exactly like the bundle scanner. */
        std::string rest = id.substr(9);
        size_t c = rest.find(':');
        std::string pname = c == std::string::npos ? rest : rest.substr(0, c);
        std::string stem = c == std::string::npos ? "" : rest.substr(c + 1);
        char pnorm[80], pdash[80];
        lane_norm(pname.c_str(), pnorm, sizeof(pnorm));
        /* disk dirs keep dashes while ids normalize to underscores:
         * probe BOTH spellings across both roots (4 cells) */
        snprintf(pdash, sizeof(pdash), "%s", pnorm);
        for (char *p = pdash; *p; p++)
            if (*p == '_') *p = '-';
        const char *roots[] = { "./pipelines", "../pipelines" };
        const char *names[] = { pnorm, pdash };
        char agents[600] = "";
        for (int r = 0; r < 2 && !agents[0]; r++)
            for (int nm = 0; nm < 2 && !agents[0]; nm++) {
                char p2[768];
                snprintf(p2, sizeof(p2), "%s/%s/agents",
                         roots[r], names[nm]);
                char probe0[900];
                snprintf(probe0, sizeof(probe0), "%s/AGENT.md", p2);
                FILE *f0 = fopen(probe0, "r");
                if (f0) { fclose(f0); snprintf(agents, sizeof(agents), "%s", p2); }
            }
        if (!agents[0]) {
            res.status = 404;
            res.set_content("{\"error\":\"unknown pipeline lane\"}",
                            "application/json");
            return;
        }
        if (stem.empty()) {
            snprintf(path, sizeof(path), "%s/AGENT.md", agents);
        } else {
            char nested[900], sdir2[700];
            snprintf(sdir2, sizeof(sdir2), "%s/skills", agents);
            snprintf(path, sizeof(path), "%s/%s.md", sdir2, stem.c_str());
            FILE *np = fopen(path, "r");
            if (np) fclose(np);
            else if (skills_nested(nested, sizeof(nested), sdir2,
                                   stem.c_str()))
                snprintf(path, sizeof(path), "%s", nested);
        }
    } else if (id.rfind("card:", 0) == 0) {
        /* card:<lane>[:<stem>] - the card-local skill namespace the
         * bundle scanner serves. Lane-resolve to the audited dir. */
        std::string rest = id.substr(5);
        size_t c = rest.find(':');
        std::string lane = c == std::string::npos ? rest : rest.substr(0, c);
        std::string stem = c == std::string::npos ? "" : rest.substr(c + 1);
        char dir_out[1024], agent_md[4096];
        if (lane_resolve(lane.c_str(), dir_out, sizeof(dir_out),
                         agent_md, sizeof(agent_md)) != 0) {
            res.status = 404;
            res.set_content("{\"error\":\"unknown card lane\"}",
                            "application/json");
            return;
        }
        if (stem.empty()) {
            snprintf(path, sizeof(path), "%s/AGENT.md", dir_out);
        } else {
            char nested[1500], sdir2[1300];
            snprintf(sdir2, sizeof(sdir2), "%s/agents/skills", dir_out);
            snprintf(path, sizeof(path), "%s/%s.md", sdir2, stem.c_str());
            FILE *np = fopen(path, "r");
            if (np) fclose(np);
            else if (skills_nested(nested, sizeof(nested), sdir2,
                                   stem.c_str()))
                snprintf(path, sizeof(path), "%s", nested);
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
/* GET /v1/cards/<lane>/bundle — the LANE DOOR: one call returns the
 * lane's tool manifest(s) AND its skill bundle. Nothing belonging to
 * any other endpoint ever appears here. */
static void handle_lane_bundle(const httplib::Request &req,
                               httplib::Response &res) {
    std::string lane = req.matches[1].str();
    char lane_want[64] = "";
    lane_norm(lane.c_str(), lane_want, sizeof(lane_want));
    std::string tools;
    lane_tools_append(tools, lane_want);
    size_t cap = 64 * 1024, len = 0;
    char *out = (char *)malloc(cap);
    int first = 1;
    len = jappend(&out, &cap, len, "{\"lane\":\"%s\",\"tools\":[", lane_want);
    len = jappend(&out, &cap, len, "%s", tools.c_str());
    len = jappend(&out, &cap, len, "],\"skills\":[");
    len = skills_lane_bundle(&out, &cap, len, &first,
                             lane.c_str());       /* RAW: pipelines keep dashes */
    len = jappend(&out, &cap, len, "]}");
    res.set_content(out, "application/json");
    free(out);
}

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
    /* (id-uniqueness law, proven 2026-08-31 by chaos C2) run ids were
     * time+tid — but httplib REUSES pool worker threads, so two
     * submissions in the same second on the same worker minted the
     * SAME id: duplicate queue entries, two stops on one run, the
     * second rejected 400 "cannot stop run in state stopped". A
     * process-wide sequence number makes ids collision-free. */
    static std::atomic<unsigned long> g_run_seq{0};
    snprintf(g_runs[idx].run_id, sizeof(g_runs[idx].run_id), "run-%lx-%lx-%lx",
             (unsigned long)time(NULL), (unsigned long)pthread_self(),
             g_run_seq.fetch_add(1, std::memory_order_relaxed));
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
    g_runs[idx].tl_n = 0;    /* resume door: no fresh compile plan */
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

/* ===================== DRAFT LINT LAW (2026-08-31) =====================
 * The media sidebar's card click GETs ./drafts/<id>.json verbatim; a
 * structurally-broken draft (unterminated string / unbalanced braces)
 * kills the hydrate and the card NEVER OPENS. PROVEN (2026-08-31):
 * the old fixed-buffer write-back cut two live cards mid-string
 * (draft-timeline-h3.json history row truncated inside a URL). The
 * write-back is now unbounded, but any future writer must not be able
 * to brick the card surface permanently: at every boot each draft is
 * structurally scanned; a CUT document is repaired by truncating at
 * the damaged token, nulling a dangling key and closing the open
 * structure stack — authored intent/stages/params survive, only the
 * corrupt tail is dropped. Every repair is ledgered (draft.repaired);
 * an unrepairable doc is quarantined to .corrupt-<ts> with a minimal
 * valid stub left in its place (the click still opens SOMETHING). */
/* One structural scanner used everywhere in the lint: a real JSON
 * grammar state machine (not just bracket balance). Catches both
 * crash classes: cut-mid-string (bad_at=len) and balanced-but-
 * malformed shapes like '"runStatus":"done",{' (the old seed-splice
 * bug, proven 2026-08-31 in draft-6a93ea45). LESSON from the same
 * day: a naive "after , in object expect a key" rule FALSE-POSITIVED
 * on '{"a":{}}' (outer close after nested close) and mass-quarantined
 * 1860 healthy ray-era drafts — this machine tracks container state
 * properly instead. Returns 0 when valid; else 1 and *bad_at. */
static int jscan_doc(const char *doc, size_t len, size_t *bad_at) {
    enum { S_NEED_KEY, S_NEED_COLON, S_NEED_VALUE, S_AFTER_VALUE } st_cur;
    struct frame { int is_obj; int fresh; } st[128];
    int ns = 0;
    int in_str = 0, esc = 0, lit = 0;
    st_cur = S_NEED_VALUE;      /* at top level a value is expected */
    /* top level = implicit array-of-one semantics: keys not allowed */
    for (size_t i = 0; i < len; i++) {
        char c = doc[i];
        if (lit) {
            /* inside a number/true/false/null token: only token chars
             * may continue it; a delimiter ends it (handled below by
             * the normal switch). Token chars are exactly the JSON
             * grammar's [0-9+-.eEtTrRuUeEfFaAlLsSnN] — a stray 'X'
             * (uninitialized heap published as "assetUrls":[X\x04],
             * proven 2026-08-31) is NOT a literal and must fail. */
            if (c == ',' || c == '}' || c == ']' || c == ' ' ||
                c == '\t' || c == '\n' || c == '\r') {
                lit = 0;        /* fall through to normal handling */
            } else if (strchr("0123456789+-.eEtTrRuUeEfFaAlLsSnN", c)
                       && (unsigned char)c >= 0x20) {
                continue;       /* still inside the literal token */
            } else {
                *bad_at = i; return 1;
            }
        }
        if (in_str) {
            if (esc) esc = 0;
            else if (c == '\\') esc = 1;
            else if (c == '"') {
                in_str = 0;
                /* a string is either a key (object, NEED_KEY) or a
                 * value (NEED_VALUE / after-value) */
                if (st_cur == S_NEED_KEY) st_cur = S_NEED_COLON;
                else st_cur = S_AFTER_VALUE;
                if (ns > 0) st[ns - 1].fresh = 0;
            } else if ((unsigned char)c < 0x20) {
                /* raw control byte inside a string: illegal strict
                 * JSON, python rejects — so do we (heap-garbage law) */
                *bad_at = i; return 1;
            }
            continue;
        }
        if (c == '"') {
            if (st_cur == S_NEED_COLON || st_cur == S_AFTER_VALUE) {
                *bad_at = i; return 1;   /* key w/o colon / missing , */
            }
            in_str = 1;                  /* key string or value string */
            continue;
        }
        if (c == '{' || c == '[') {
            if (st_cur == S_NEED_KEY || st_cur == S_NEED_COLON ||
                st_cur == S_AFTER_VALUE) {
                *bad_at = i; return 1;   /* '...",{': THE proven class */
            }
            if (ns < 128) {
                st[ns].is_obj = (c == '{');
                st[ns].fresh = 1;
                ns++;
            } else {
                *bad_at = i; return 1;   /* nesting too deep */
            }
            st_cur = st[ns - 1].is_obj ? S_NEED_KEY : S_NEED_VALUE;
            continue;
        }
        if (c == '}' || c == ']') {
            if (ns == 0) { *bad_at = i; return 1; }
            int want_obj = (c == '}');
            if (st[ns - 1].is_obj != want_obj) { *bad_at = i; return 1; }
            if (st[ns - 1].fresh) {
                /* empty container close: {}, [] */
            } else if (st_cur == S_AFTER_VALUE) {
                /* normal close after a value */
            } else {
                *bad_at = i; return 1;   /* dangling , : etc. */
            }
            ns--;
            st_cur = S_AFTER_VALUE;
            if (ns > 0) st[ns - 1].fresh = 0;
            continue;
        }
        if (c == ',') {
            if (st_cur != S_AFTER_VALUE) { *bad_at = i; return 1; }
            if (ns == 0) { *bad_at = i; return 1; }   /* top-level , */
            st_cur = st[ns - 1].is_obj ? S_NEED_KEY : S_NEED_VALUE;
            st[ns - 1].fresh = 0;
            continue;
        }
        if (c == ':') {
            if (st_cur != S_NEED_COLON) { *bad_at = i; return 1; }
            st_cur = S_NEED_VALUE;
            continue;
        }
        if (c == ' ' || c == '\t' || c == '\n' || c == '\r') continue;
        /* literal token start (number/true/false/null) */
        if (st_cur != S_NEED_VALUE ||
            !strchr("0123456789+-.tTfFnN", c)) {
            *bad_at = i; return 1;       /* bare garbage / value as key */
        }
        lit = 1;
        st_cur = S_AFTER_VALUE;
        if (ns > 0) st[ns - 1].fresh = 0;
    }
    if (in_str || lit || ns != 0) { *bad_at = len; return 1; }
    if (st_cur != S_AFTER_VALUE) { *bad_at = len; return 1; }
    return 0;
}

static int draft_lint_one(const char *path, const char *id) {
    FILE *f = fopen(path, "rb");
    if (!f) return 0;
    fseek(f, 0, SEEK_END);
    long fsz = ftell(f);
    rewind(f);
    if (fsz < 2 || fsz > 8 * 1024 * 1024) { fclose(f); return 0; }
    char *doc = (char *)malloc((size_t)fsz + 64);
    if (!doc) { fclose(f); return 0; }
    size_t len = fread(doc, 1, (size_t)fsz, f);
    fclose(f);
    doc[len] = 0;

    /* structural scan */
    size_t bad_at = 0;
    int in_str = 0, esc = 0;
    if (jscan_doc(doc, len, &bad_at) == 0) { free(doc); return 0; }

    /* find EOF-in-string / bad token details for the repair cut */
    size_t cut = bad_at, last_quote = 0;
    {
        int s = 0, e = 0;
        for (size_t i = 0; i < len; i++) {
            char c = doc[i];
            if (s) {
                if (e) e = 0;
                else if (c == '\\') e = 1;
                else if (c == '"') s = 0;
            } else if (c == '"') { s = 1; last_quote = i; }
        }
        in_str = s;
        (void)esc;
    }

    /* repair: drop the unterminated string (or the bad token onward) */
    size_t nl = in_str ? last_quote : cut;
    while (nl > 0 && (doc[nl-1] == ' ' || doc[nl-1] == '\n' ||
                      doc[nl-1] == '\r' || doc[nl-1] == '\t' ||
                      doc[nl-1] == ','))
        nl--;
    if (nl == 0) { free(doc); goto quarantine; }

    /* rebuild closer stack over the surviving prefix */
    {
        int st[128], ns = 0;
        int s2 = 0, e2 = 0;
        for (size_t i = 0; i < nl; i++) {
            char c = doc[i];
            if (s2) {
                if (e2) e2 = 0;
                else if (c == '\\') e2 = 1;
                else if (c == '"') s2 = 0;
            } else if (c == '"') s2 = 1;
            else if (c == '{' || c == '[') {
                if (ns < 128) st[ns++] = (c == '{');
            } else if (c == '}' || c == ']') {
                if (ns > 0) ns--;
            }
        }
        size_t wo = nl;
        if (doc[wo-1] == ':') {
            memcpy(doc + wo, "null", 4);
            wo += 4;
        }
        for (int k = ns - 1; k >= 0; k--)
            doc[wo++] = st[k] ? '}' : ']';
        doc[wo] = 0;

        /* final validation of the repaired doc (full grammar scan) */
        size_t dummy = 0;
        if (jscan_doc(doc, wo, &dummy) != 0) { free(doc); goto quarantine; }

        char tmp[600];
        snprintf(tmp, sizeof(tmp), "%s.tmp", path);
        FILE *o = fopen(tmp, "w");
        if (!o) { free(doc); return 0; }
        fwrite(doc, 1, wo, o);
        fclose(o);
        rename(tmp, path);
        char eb[512];
        snprintf(eb, sizeof(eb),
                 "{\"draft\":\"%s\",\"was\":%zu,\"now\":%zu}",
                 id, len, wo);
        ledger_log("draft.repaired", eb);
        fprintf(stderr, "[draft-lint] repaired %s (%zu -> %zu bytes)\n",
                id, len, wo);
        free(doc);
        return 1;
    }

quarantine:
    {
        char qpath[600];
        snprintf(qpath, sizeof(qpath), "%s.corrupt-%ld", path,
                 (long)time(NULL));
        rename(path, qpath);
        char stub[512];
        snprintf(stub, sizeof(stub),
                 "{\"draftId\":\"%s\",\"intent\":\"(recovered from a "
                 "corrupt card)\",\"stages\":[],\"status\":\"ready\","
                 "\"history\":[]}", id);
        FILE *o = fopen(path, "w");
        if (o) { fputs(stub, o); fclose(o); }
        char eb[512];
        snprintf(eb, sizeof(eb), "{\"draft\":\"%s\",\"kept\":\"%s\"}",
                 id, qpath);
        ledger_log("draft.quarantined", eb);
        fprintf(stderr, "[draft-lint] quarantined %s -> %s\n", id, qpath);
        return 1;
    }
}

static void boot_lint_drafts(void) {
    const char *aux = drafts_aux_dir();
    const char *scan[3] = { "./drafts", (aux && aux[0]) ? aux : NULL,
                            NULL };
    int repaired = 0;
    for (int t = 0; t < 2 && scan[t]; t++) {
        DIR *d = opendir(scan[t]);
        if (!d) continue;
        struct dirent *e;
        while ((e = readdir(d)) != NULL) {
            size_t l = strlen(e->d_name);
            if (l < 6 || strcmp(e->d_name + l - 5, ".json") != 0) continue;
            if (strstr(e->d_name, ".corrupt-")) continue;
            char path[600];
            snprintf(path, sizeof(path), "%s/%s", scan[t], e->d_name);
            char id[240];
            snprintf(id, sizeof(id), "%.*s", (int)(l - 5), e->d_name);
            repaired += draft_lint_one(path, id);
        }
        closedir(d);
    }
    if (repaired)
        fprintf(stderr, "[draft-lint] %d draft(s) repaired at boot\n",
                repaired);
}

/* ===================== QUEUE RECOVERY LAW (2026-08-31) =================
 * "Queues should be recoverable — if the system crashes, the progress
 * and queue is not lost" (operator order, after the 2026-08-31 fortify
 * crash ate a live queue). The sidecar is the truth ledger: every run
 * carries its FULLY COMPOSED yaml (windows resolved, tailpaths bound
 * to its own out_dir), model, seed, prompt and draft link. At boot,
 * before the stale-sweep, any sidecar still claiming queued/running
 * is RESURRECTED into the live registry under its ORIGINAL run_id and
 * re-armed as queued — the operator's card runs again without anyone
 * re-submitting. (A mid-flight run restarts from its first node; its
 * own artifacts overwrite in place. The FIFO order follows recovery
 * order = original registration order via the created timestamp.) */
static void boot_recover_queue(void) {
    DIR *d = opendir("./output");
    if (!d) return;
    /* pass 1: collect live sidecars with mtimes (submission order —
     * readdir order is arbitrary; FIFO law requires original order) */
    struct rl { char name[256]; long mtime; };
    struct rl *live = NULL;
    size_t nlive = 0, cap = 0;
    struct dirent *e;
    while ((e = readdir(d)) != NULL) {
        if (strncmp(e->d_name, "run-", 4) != 0) continue;
        char spath[760];
        snprintf(spath, sizeof(spath), "./output/%s/_pipeline.json",
                 e->d_name);
        FILE *f = fopen(spath, "rb");
        if (!f) continue;
        static char sb[1 << 20];   /* composed yamls are 100KB-class */
        size_t n = fread(sb, 1, sizeof(sb) - 1, f);
        fclose(f);
        sb[n] = 0;
        char st[32];
        if (sidecar_str(sb, "status", st, sizeof st) != 0) continue;
        if (strcmp(st, "queued") != 0 && strcmp(st, "running") != 0)
            continue;
        char rid[64];
        if (sidecar_str(sb, "run_id", rid, sizeof rid) != 0 ||
            strcmp(rid, e->d_name) != 0) continue;   /* not its own */
        struct stat fst;
        long mt = 0;
        if (stat(spath, &fst) == 0) mt = (long)fst.st_mtime;
        if (nlive == cap) {
            cap = cap ? cap * 2 : 16;
            struct rl *tmp = (struct rl *)realloc(live, cap * sizeof(*live));
            if (!tmp) break;
            live = tmp;
        }
        snprintf(live[nlive].name, sizeof(live[nlive].name), "%s", e->d_name);
        live[nlive].mtime = mt;
        nlive++;
    }
    closedir(d);
    if (!nlive) return;

    /* FIFO law: resurrect oldest-first (original submission order) */
    for (size_t a = 0; a + 1 < nlive; a++)
        for (size_t b = 0; b + 1 < nlive - a; b++)
            if (live[b].mtime > live[b + 1].mtime) {
                struct rl t = live[b]; live[b] = live[b + 1];
                live[b + 1] = t;
            }

    int recovered = 0;
    for (size_t li = 0; li < nlive; li++) {
        const char *rname = live[li].name;
        char spath[760];
        snprintf(spath, sizeof(spath), "./output/%s/_pipeline.json", rname);
        FILE *f = fopen(spath, "rb");
        if (!f) continue;
        static char sb[1 << 20];
        size_t n = fread(sb, 1, sizeof(sb) - 1, f);
        fclose(f);
        sb[n] = 0;
        char st[32];
        if (sidecar_str(sb, "status", st, sizeof st) != 0) continue;
        if (strcmp(st, "queued") != 0 && strcmp(st, "running") != 0)
            continue;
        char rid[64], model[80], prompt[4096], seedS[32], draft[96];
        if (sidecar_str(sb, "run_id", rid, sizeof rid) != 0 ||
            strcmp(rid, rname) != 0) continue;   /* not its own */
        static char ybuf[1 << 20];   /* composed yamls are 100KB-class */
        if (sidecar_str(sb, "yaml", ybuf, sizeof(ybuf)) != 0) continue;
        if (sidecar_str(sb, "model", model, sizeof model) != 0) model[0] = 0;
        if (sidecar_str(sb, "prompt", prompt, sizeof prompt) != 0) prompt[0] = 0;
        long seed = 0;
        if (sidecar_str(sb, "seed", seedS, sizeof seedS) == 0)
            seed = atol(seedS);
        if (sidecar_str(sb, "draft_id", draft, sizeof draft) != 0)
            draft[0] = 0;

        pthread_mutex_lock(&g_runs_mu);
        /* same slot policy as the start handler: recycle a drained
         * terminal slot, else append (boot registry is empty anyway) */
        size_t idx = (size_t)-1;
        for (size_t i = 0; i < g_n_runs; i++) {
            if ((strcmp(g_runs[i].state, "success") == 0 ||
                 strcmp(g_runs[i].state, "error") == 0 ||
                 strcmp(g_runs[i].state, "stopped") == 0) &&
                g_runs[i].th_done) {
                idx = i;
                break;
            }
        }
        if (idx == (size_t)-1) {
            if (g_n_runs >= RUNREG_MAX) {
                pthread_mutex_unlock(&g_runs_mu);
                break;
            }
            idx = g_n_runs++;
        } else {
            run_slot_release_heap(idx);
        }
        snprintf(g_runs[idx].run_id, sizeof(g_runs[idx].run_id), "%s", rid);
        snprintf(g_runs[idx].out_dir, sizeof(g_runs[idx].out_dir),
                 "./output/%s", rid);
        snprintf(g_runs[idx].yaml, sizeof(g_runs[idx].yaml), "%s", ybuf);
        snprintf(g_runs[idx].model, sizeof(g_runs[idx].model), "%s", model);
        snprintf(g_runs[idx].prompt, sizeof(g_runs[idx].prompt), "%s", prompt);
        g_runs[idx].seed = seed;
        snprintf(g_runs[idx].draft_id, sizeof(g_runs[idx].draft_id),
                 "%s", draft);
        snprintf(g_runs[idx].state, sizeof(g_runs[idx].state), "queued");
        g_runs[idx].error[0] = 0;
        g_runs[idx].th_done = 0;
        g_runs[idx].created = time(NULL);
        /* FIFO LAW (proven 2026-08-31 by chaos C7): a recovered run
         * MUST hold a registration-time ticket exactly like a fresh
         * submission. Ticket 0-by-default collided with the first new
         * registration's ticket 0 — two runs on one ticket = parallel
         * GPU (serial law broken) and a queue that never showed a
         * single active run. */
        g_runs[idx].ticket = g_gpu_tickets++;
        g_runs[idx].has_ticket = 1;
        run_parse_stages(idx);
        pthread_mutex_unlock(&g_runs_mu);
        if (run_spawn_thread(idx, run_thread_fn) != 0) {
            pthread_mutex_lock(&g_runs_mu);
            run_slot_release_heap(idx);
            pthread_mutex_unlock(&g_runs_mu);
            continue;
        }
        char eb[400];
        snprintf(eb, sizeof(eb),
                 "{\"run_id\":\"%s\",\"prior_state\":\"%s\"}", rid, st);
        ledger_log("run.recovered", eb);
        fprintf(stderr, "[recover] resurrected %s (was %s)\n", rid, st);
        recovered++;
    }
    free(live);
    if (recovered)
        fprintf(stderr, "[recover] %d run(s) re-armed from sidecars\n",
                recovered);
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

    /* (queue recovery law, 2026-08-31) resurrect queued/running runs
     * from their sidecars FIRST — the sweep below must only see what
     * recovery refused (malformed / unresurrectable), never eat a
     * live queue again. */
    boot_recover_queue();

    /* (audit F7) sweep stale active sidecars from any dead process */
    boot_sweep_stale_sidecars();

    /* (draft lint law, 2026-08-31) no corrupt draft may survive a
     * reboot: the sidebar card click must always open a valid doc. */
    boot_lint_drafts();

    inference_server *s = new inference_server;
    if (!s) return NULL;
    s->port    = port;
    g_loop_port = port;
    if (bind_addr && *bind_addr && strcmp(bind_addr, "0.0.0.0") != 0)
        snprintf(g_loop_host, sizeof(g_loop_host), "%s", bind_addr);
    s->ws_port = port + 1;
    snprintf(s->bind_addr, sizeof(s->bind_addr), "%s",
             bind_addr && bind_addr[0] ? bind_addr : "127.0.0.1");
    s->running = 0;

    /* ---- Custom endpoints ---- */
    s->srv.Get("/v1/health",              handle_health);
    for (const char *lane : {"/v1/forms", "/v1/shell", "/v1/right-panes",
                             "/v1/ui-slots", "/v1/themes", "/v1/tags",
                             "/v1/services", "/v1/tools", "/v1/plugins",
                             "/v1/llm/keys/active", "/v1/llm/health"})
        s->srv.Get(lane, handle_lane_registry);
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
    s->srv.Get(
        "/v1/pipelines/drafts/:id/stages/:sid/result", handle_stage_result);
    s->srv.Patch("/v1/pipelines/drafts/:id/stages/:sid",
                 handle_draft_stage_patch);
    s->srv.Get("/v1/pipelines/drafts",     handle_draft_list);
    s->srv.Get("/v1/pipelines/yaml/list",  handle_yaml_list);
    s->srv.Get("/v1/pipelines/yaml/detail", handle_yaml_detail);
    s->srv.Get("/v1/pipelines/runs",     handle_pipelines_runs);
    s->srv.Get(R"(/editor/assets/runs/(.+))", handle_asset);
    s->srv.Get("/v1/form-spec",          handle_form_spec);
    s->srv.Get("/v1/card-tools",          handle_card_tools);
    s->srv.Post(R"(/v1/cards/([^/]+)/agent)", handle_card_agent);
    s->srv.Get(R"(/v1/cards/([^/]+)/bundle)", handle_lane_bundle);
    s->srv.Get(R"(/v1/cards/([^/]+)/schema)",  handle_card_schema);
    s->srv.Post("/v1/models/provision",  handle_provision);
    s->srv.Get("/v1/models/provision/status", handle_provision_status);
    s->srv.Get("/v1/model-catalog",      handle_catalog);
    s->srv.Get("/v1/pipelines/families/param-schemas",
               handle_family_param_schemas);
    s->srv.Get("/v1/pipelines/families/:family_id/param-schema",
               handle_family_param_schema);
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
