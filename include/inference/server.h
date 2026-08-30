#ifndef INFERENCE_SERVER_H
#define INFERENCE_SERVER_H

#include "inference/runner.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct inference_server inference_server;

/* Global runner for the HTTP server (single-process). Set before server_start. */
extern inference_runner *g_server_runner;

inference_server *server_create(int port, const char *bind_addr);
int server_start(inference_server *s);
void server_stop(inference_server *s);
void server_destroy(inference_server *s);

#ifdef __cplusplus
}
#endif

#endif /* INFERENCE_SERVER_H */
