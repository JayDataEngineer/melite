#ifndef INFERENCE_WS_SERVER_H
#define INFERENCE_WS_SERVER_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/*
 * Minimal WebSocket server for ComfyUI-compatible progress streaming.
 *
 * Implements RFC 6455 WebSocket over a plain TCP socket.
 * Supports text frames (JSON events) and binary frames (preview images).
 *
 * ComfyUI protocol:
 *   Text: {"type":"progress","data":{"node":"10","value":5,"max":20}}
 *   Binary: [8-byte header][JPEG/PNG preview image]
 */

typedef struct inference_ws inference_ws;

/* Callback for received messages */
typedef void (*ws_message_fn)(void *user_data,
                              const char *msg, size_t len,
                              int is_binary);

/* Create a WebSocket server on the given port. Returns NULL on error. */
inference_ws *ws_create(int port);

/* Set the message callback (called when a client sends a message) */
void ws_set_callback(inference_ws *ws, ws_message_fn fn, void *user_data);

/* Start listening (blocks). Call from a thread. */
int ws_start(inference_ws *ws);

/* Send a text message to all connected clients */
void ws_broadcast_text(inference_ws *ws, const char *msg, size_t len);

/* Send a binary message to all connected clients */
void ws_broadcast_binary(inference_ws *ws, const uint8_t *data, size_t len);

/* Stop the server */
void ws_stop(inference_ws *ws);

/* Destroy the server */
void ws_destroy(inference_ws *ws);

/* ---- ComfyUI-compatible event helpers ---- */

/* Send a progress event: {"type":"progress","data":{...}} */
void ws_send_progress(inference_ws *ws, const char *prompt_id,
                      const char *node_id, int value, int max_val);

/* Send an execution_start event */
void ws_send_execution_start(inference_ws *ws, const char *prompt_id);

/* Send an executing event (node started/finished) */
void ws_send_executing(inference_ws *ws, const char *prompt_id,
                       const char *node_id);

/* Send an execution_success event */
void ws_send_execution_success(inference_ws *ws, const char *prompt_id);

/* Send an execution_error event */
void ws_send_execution_error(inference_ws *ws, const char *prompt_id,
                             const char *node_id, const char *error);

/* Send a status event (queue info) */
void ws_send_status(inference_ws *ws, int queue_remaining);

/* Send a preview image (binary frame with 8-byte header) */
void ws_send_preview(inference_ws *ws, const char *prompt_id,
                     const char *node_id,
                     const uint8_t *image_data, size_t image_len);

#ifdef __cplusplus
}
#endif

#endif /* INFERENCE_WS_SERVER_H */
