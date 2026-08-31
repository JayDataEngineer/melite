/* server_internal.h — shared declarations for the server.cpp split.
 * Every .cpp file that was part of the original server.cpp includes this
 * header to access shared types, globals, and function declarations. */
#ifndef SERVER_INTERNAL_H
#define SERVER_INTERNAL_H

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
#include <signal.h>
#include <stdarg.h>
#include <atomic>
#include <vector>
#include <algorithm>
#include <string>

/* ================================================================
 * CONSTANTS
 * ================================================================ */
#define RUNREG_MAX 128
#define RUN_ARTIFACTS_MAX 16
#define RUN_STAGES_MAX 136
#define RUN_STAGE_ARTS_MAX 4
#define RUN_TL_MAX 128
#define RUN_PRIOR_MAX 16
#define AGENT_SESSIONS_MAX 128
#define PROV_MAX 32

/* ================================================================
 * TYPES
 * ================================================================ */
typedef struct {
    char name[64];
    char dtype[8];
    float f;
    char *bytes;
    size_t nbytes;
} run_input;

typedef struct {
    char id[64];
    char state[16];
    char error[768];
    char arts[RUN_STAGE_ARTS_MAX][160];
    size_t n_arts;
} run_stage;

typedef struct {
    char run_id[48];
    char state[16];
    char error[256];
    char out_dir[512];
    int  tl_n;
    int  tl_trims[RUN_TL_MAX];
    int  tl_spans[RUN_TL_MAX];
    char yaml[131072];
    char model[64];
    char prompt[2048];
    long seed;
    time_t created;
    run_input inputs[144];
    size_t n_inputs;
    run_stage stages[RUN_STAGES_MAX];
    size_t n_stages;
    int  stop_req;
    int  ticket;
    int  has_ticket;
    int  th_done;
    struct {
        char node_id[64];
        char tensor_name[32];
        char dtype[8];
        char *data;
        size_t nbytes;
    } prior[RUN_PRIOR_MAX];
    size_t n_prior;
    int  start_from;
    char draft_id[80];
    int  draft_stage;
} run_entry;

typedef struct {
    char token[48];
    char lane[64];
    char log[512];
    time_t created;
    int composed;
    char draft_id[80];
} agent_session;

typedef struct {
    char model[64];
    char filename[256];
    char state[16];
    long enqueued;
} prov_job;

typedef struct { size_t idx; } run_thread_arg;

struct jmember { char key[128]; const char *vs; const char *ve; };

struct download_ws_progress {
    httplib::WSDataType *ws;
    size_t total;
    size_t done;
};

typedef struct { char dir[64]; long created; } run_dir_ent;

/* ================================================================
 * GLOBALS (defined in server.cpp, extern here)
 * ================================================================ */
extern inference_runner *g_server_runner;
extern pthread_t g_ws_thread;
extern run_entry g_runs[RUNREG_MAX];
extern size_t g_n_runs;
extern pthread_mutex_t g_runs_mu;
extern int    g_gpu_tickets;
extern int    g_gpu_serving;
extern pthread_mutex_t g_gpu_mu;
extern pthread_cond_t  g_gpu_cv;
extern agent_session g_agent_sessions[AGENT_SESSIONS_MAX];
extern int g_loop_port;
extern char g_loop_host[64];
extern size_t g_agent_sessions_n;
extern pthread_mutex_t g_agent_mu;
extern pthread_mutex_t g_ledger_mu;
extern prov_job g_prov[PROV_MAX];
extern size_t g_n_prov;
extern pthread_mutex_t g_prov_mu;
extern inference_catalog *g_catalog;
extern download_config   g_download_cfg;
extern httplib::Server *g_ws_server;
extern std::atomic<unsigned long> g_run_seq;

/* ================================================================
 * UTILITY FUNCTIONS (defined in server.cpp or helpers)
 * ================================================================ */
int inf_json_string(const char *json, const char *key, char *out, size_t cap);
int inf_json_int(const char *json, const char *key, int fallback);
const char *pipelines_root(void);
const char *plugins_root(void);
std::string json_escape(const char *s);
std::string read_file_str(const char *path, size_t max_bytes);
size_t jappend(char **buf, size_t *cap, size_t len, const char *fmt, ...);
char *json_quote(const char *src);

/* ================================================================
 * RUN REGISTRY FUNCTIONS (defined in run_section.cpp)
 * ================================================================ */
void gpu_ticket_release(void);
int  gpu_queue_depth(void);
void run_slot_release_heap(size_t idx);
void run_mark_th_done(size_t idx);
void run_set_state(size_t idx, const char *state, const char *err);
const char *wire_state(const char *s);
void run_parse_stages(size_t idx);
void stage_attribute_artifacts(size_t idx, size_t stage_i);
void run_stage_cb(void *ctx, const char *node_id, const char *state,
                  const char *error, const char *artifacts_json);
const char *artifact_type(const char *name);
const char *content_type_of(const char *name);
const char *path_basename(const char *p);
char *run_artifacts_json(const char *out_dir);
char *pipeline_yaml_for_model_ex(const char *model, const char *body,
                                 char *out, size_t cap);
char *pipeline_yaml_for_model(const char *model, char *out, size_t cap);
void add_run_input_text(size_t idx, const char *name, const char *s);
void card_register_extra_inputs(size_t idx, const char *extra);
void add_run_input_f32(size_t idx, const char *name, float f);
int  run_input_has(size_t idx, const char *name);
int  run_validate_input_coverage(size_t idx, const char *body, char *missing, size_t miss_cap);
char *root_history_span(char *doc);
void run_write_sidecar(size_t idx);
void draft_writeback(size_t idx, const char *wire);
int  run_abandon_ticket_ordered(size_t idx);
int  run_spawn_thread(size_t idx, void *(*fn)(void *));
void *run_thread_fn(void *argp);
void ledger_log(const char *event, const char *data_json);
int  boot_patch_sidecar(const char *path, const char *why);

/* ================================================================
 * AGENT SESSION FUNCTIONS (defined in lane.cpp or server.cpp)
 * ================================================================ */
agent_session *agent_session_find(const char *token);
agent_session *agent_session_spawn(const char *lane, const char *prompt);

/* ================================================================
 * HANDLER REGISTRATION (each module registers its own routes)
 * ================================================================ */
void register_core_handlers(httplib::Server &svr);
void register_lane_handlers(httplib::Server &svr);
void register_handler_apis(httplib::Server &svr);
void register_draft_handlers(httplib::Server &svr);
void register_skill_handlers(httplib::Server &svr);
void register_ledger_handlers(httplib::Server &svr);
void register_api_handlers(httplib::Server &svr);
void register_sse_handlers(httplib::Server &svr);
void register_lifecycle_handlers(httplib::Server &svr);

#endif /* SERVER_INTERNAL_H */
