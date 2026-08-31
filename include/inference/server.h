#ifndef INFERENCE_SERVER_H
#define INFERENCE_SERVER_H

#include "inference/runner.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef struct inference_server inference_server;

/* Accessor for the process-global runner (single-process law).
 * Set before server_start; valid until server_destroy. */
inference_runner *server_get_runner(void);
void server_set_runner(inference_runner *r);

inference_server *server_create(int port, const char *bind_addr);
int server_start(inference_server *s);
void server_stop(inference_server *s);
void server_destroy(inference_server *s);

#ifdef __cplusplus
}
#endif

#endif /* INFERENCE_SERVER_H */
