#include "inference/ws_server.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>
#include <signal.h>
#include <pthread.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <arpa/inet.h>
#include <openssl/sha.h>
#include <openssl/bio.h>
#include <openssl/evp.h>
#include <openssl/buffer.h>

/*
 * Minimal RFC 6455 WebSocket server for ComfyUI-compatible progress streaming.
 * Single-threaded event loop with pthread for accept.
 */

#define WS_MAX_CLIENTS 64
#define WS_MAX_FRAME_SIZE (16 * 1024 * 1024)  /* 16MB max frame */
#define WS_GUID "258EAFA5-E914-47DA-95CA-5AB9DC66B179"

/* ---- Base64 helper ---- */

static char *base64_encode(const unsigned char *input, int length) {
    BIO *b64 = BIO_new(BIO_f_base64());
    BIO *mem = BIO_new(BIO_s_mem());
    b64 = BIO_push(b64, mem);
    BIO_set_flags(b64, BIO_FLAGS_BASE64_NO_NL);
    BIO_write(b64, input, length);
    BIO_flush(b64);
    BUF_MEM *buffer = NULL;
    BIO_get_mem_ptr(b64, &buffer);
    char *output = malloc(buffer->length + 1);
    memcpy(output, buffer->data, buffer->length);
    output[buffer->length] = '\0';
    BIO_free_all(b64);
    return output;
}

/* ---- WebSocket handshake ---- */

static int ws_handshake(int client_fd) {
    char buf[4096];
    int n = recv(client_fd, buf, sizeof(buf) - 1, 0);
    if (n <= 0) return -1;
    buf[n] = '\0';

    /* Find Sec-WebSocket-Key header */
    const char *key_header = "Sec-WebSocket-Key: ";
    char *key_start = strstr(buf, key_header);
    if (!key_start) return -1;
    key_start += strlen(key_header);

    char *key_end = strstr(key_start, "\r\n");
    if (!key_end) return -1;
    *key_end = '\0';

    /* Compute accept key: SHA1(key + GUID) base64-encoded */
    char combined[256];
    snprintf(combined, sizeof(combined), "%s%s", key_start, WS_GUID);

    unsigned char sha1[20];
    SHA1((unsigned char *)combined, strlen(combined), sha1);
    char *accept_key = base64_encode(sha1, 20);

    /* Send handshake response */
    snprintf(buf, sizeof(buf),
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Accept: %s\r\n"
        "\r\n", accept_key);

    send(client_fd, buf, strlen(buf), 0);
    free(accept_key);
    return 0;
}

/* ---- WebSocket frame I/O ---- */

static int ws_read_frame(int fd, int *opcode, unsigned char **payload, size_t *len) {
    unsigned char header[2];
    if (recv(fd, header, 2, MSG_WAITALL) != 2) return -1;

    int masked = (header[1] & 0x80) != 0;
    *opcode = header[0] & 0x0F;
    uint64_t payload_len = header[1] & 0x7F;

    if (payload_len == 126) {
        unsigned char ext[2];
        if (recv(fd, ext, 2, MSG_WAITALL) != 2) return -1;
        payload_len = (ext[0] << 8) | ext[1];
    } else if (payload_len == 127) {
        unsigned char ext[8];
        if (recv(fd, ext, 8, MSG_WAITALL) != 8) return -1;
        payload_len = 0;
        for (int i = 0; i < 8; i++)
            payload_len = (payload_len << 8) | ext[i];
    }

    if (payload_len > WS_MAX_FRAME_SIZE) return -1;

    unsigned char mask[4] = {0};
    if (masked) {
        if (recv(fd, mask, 4, MSG_WAITALL) != 4) return -1;
    }

    *payload = malloc(payload_len);
    if (payload_len > 0) {
        if (recv(fd, *payload, payload_len, MSG_WAITALL) != (ssize_t)payload_len) {
            free(*payload);
            return -1;
        }
    }

    if (masked) {
        for (size_t i = 0; i < payload_len; i++)
            (*payload)[i] ^= mask[i % 4];
    }

    *len = payload_len;
    return 0;
}

static int ws_send_frame(int fd, int opcode, const unsigned char *data, size_t len) {
    unsigned char header[10];
    int header_len;

    header[0] = 0x80 | opcode;  /* FIN + opcode */

    if (len < 126) {
        header[1] = (unsigned char)len;
        header_len = 2;
    } else if (len < 65536) {
        header[1] = 126;
        header[2] = (len >> 8) & 0xFF;
        header[3] = len & 0xFF;
        header_len = 4;
    } else {
        header[1] = 127;
        for (int i = 0; i < 8; i++)
            header[8 - i] = (len >> (i * 8)) & 0xFF;
        header_len = 10;
    }

    send(fd, header, header_len, 0);
    if (len > 0) send(fd, data, len, 0);
    return 0;
}

/* ---- Server state ---- */

struct inference_ws {
    int port;
    int server_fd;
    int clients[WS_MAX_CLIENTS];
    int n_clients;
    pthread_mutex_t lock;
    volatile int running;

    ws_message_fn on_message;
    void *user_data;
};

/* ---- Public API ---- */

inference_ws *ws_create(int port) {
    inference_ws *ws = calloc(1, sizeof(inference_ws));
    ws->port = port;
    ws->server_fd = -1;
    ws->n_clients = 0;
    ws->running = 0;
    pthread_mutex_init(&ws->lock, NULL);

    for (int i = 0; i < WS_MAX_CLIENTS; i++)
        ws->clients[i] = -1;

    return ws;
}

void ws_set_callback(inference_ws *ws, ws_message_fn fn, void *user_data) {
    ws->on_message = fn;
    ws->user_data = user_data;
}

int ws_start(inference_ws *ws) {
    struct sockaddr_in addr;
    int opt = 1;

    ws->server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (ws->server_fd < 0) return -1;

    setsockopt(ws->server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    setsockopt(ws->server_fd, SOL_SOCKET, SO_REUSEPORT, &opt, sizeof(opt));

    memset(&addr, 0, sizeof(addr));
    addr.sin_family = AF_INET;
    addr.sin_port = htons(ws->port);
    addr.sin_addr.s_addr = htonl(INADDR_ANY);

    if (bind(ws->server_fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        close(ws->server_fd);
        return -1;
    }

    if (listen(ws->server_fd, 8) < 0) {
        close(ws->server_fd);
        return -1;
    }

    ws->running = 1;
    fprintf(stderr, "[ws] Listening on port %d\n", ws->port);

    /* Accept loop */
    while (ws->running) {
        struct sockaddr_in client_addr;
        socklen_t addr_len = sizeof(client_addr);
        int client_fd = accept(ws->server_fd, (struct sockaddr *)&client_addr, &addr_len);
        if (client_fd < 0) continue;

        /* WebSocket handshake */
        if (ws_handshake(client_fd) < 0) {
            close(client_fd);
            continue;
        }

        /* Add client */
        pthread_mutex_lock(&ws->lock);
        if (ws->n_clients < WS_MAX_CLIENTS) {
            ws->clients[ws->n_clients++] = client_fd;
            fprintf(stderr, "[ws] Client connected (total: %d)\n", ws->n_clients);
        } else {
            close(client_fd);
        }
        pthread_mutex_unlock(&ws->lock);
    }

    return 0;
}

void ws_broadcast_text(inference_ws *ws, const char *msg, size_t len) {
    pthread_mutex_lock(&ws->lock);
    for (int i = ws->n_clients - 1; i >= 0; i--) {
        if (ws_send_frame(ws->clients[i], 0x01,
                          (const unsigned char *)msg, len) < 0) {
            /* Remove disconnected client */
            close(ws->clients[i]);
            ws->clients[i] = ws->clients[--ws->n_clients];
        }
    }
    pthread_mutex_unlock(&ws->lock);
}

void ws_broadcast_binary(inference_ws *ws, const uint8_t *data, size_t len) {
    pthread_mutex_lock(&ws->lock);
    for (int i = ws->n_clients - 1; i >= 0; i--) {
        if (ws_send_frame(ws->clients[i], 0x02, data, len) < 0) {
            close(ws->clients[i]);
            ws->clients[i] = ws->clients[--ws->n_clients];
        }
    }
    pthread_mutex_unlock(&ws->lock);
}

void ws_stop(inference_ws *ws) {
    ws->running = 0;
    if (ws->server_fd >= 0) {
        shutdown(ws->server_fd, SHUT_RDWR);
        close(ws->server_fd);
        ws->server_fd = -1;
    }
}

void ws_destroy(inference_ws *ws) {
    pthread_mutex_lock(&ws->lock);
    for (int i = 0; i < ws->n_clients; i++) {
        if (ws->clients[i] >= 0) close(ws->clients[i]);
    }
    pthread_mutex_unlock(&ws->lock);
    pthread_mutex_destroy(&ws->lock);
    free(ws);
}

/* ---- ComfyUI-compatible event helpers ---- */

static void ws_send_json(inference_ws *ws, const char *json) {
    ws_broadcast_text(ws, json, strlen(json));
}

void ws_send_progress(inference_ws *ws, const char *prompt_id,
                      const char *node_id, int value, int max_val) {
    char buf[512];
    snprintf(buf, sizeof(buf),
        "{\"type\":\"progress\",\"data\":{\"prompt_id\":\"%s\","
        "\"node\":\"%s\",\"value\":%d,\"max\":%d}}",
        prompt_id, node_id, value, max_val);
    ws_send_json(ws, buf);
}

void ws_send_execution_start(inference_ws *ws, const char *prompt_id) {
    char buf[256];
    snprintf(buf, sizeof(buf),
        "{\"type\":\"execution_start\",\"data\":{\"prompt_id\":\"%s\"}}",
        prompt_id);
    ws_send_json(ws, buf);
}

void ws_send_executing(inference_ws *ws, const char *prompt_id,
                       const char *node_id) {
    char buf[512];
    snprintf(buf, sizeof(buf),
        "{\"type\":\"executing\",\"data\":{\"prompt_id\":\"%s\","
        "\"node\":\"%s\"}}",
        prompt_id, node_id ? node_id : "null");
    ws_send_json(ws, buf);
}

void ws_send_execution_success(inference_ws *ws, const char *prompt_id) {
    char buf[256];
    snprintf(buf, sizeof(buf),
        "{\"type\":\"execution_success\",\"data\":{\"prompt_id\":\"%s\"}}",
        prompt_id);
    ws_send_json(ws, buf);
}

void ws_send_execution_error(inference_ws *ws, const char *prompt_id,
                             const char *node_id, const char *error) {
    char buf[1024];
    snprintf(buf, sizeof(buf),
        "{\"type\":\"execution_error\",\"data\":{\"prompt_id\":\"%s\","
        "\"node_id\":\"%s\",\"exception_message\":\"%s\"}}",
        prompt_id, node_id, error);
    ws_send_json(ws, buf);
}

void ws_send_status(inference_ws *ws, int queue_remaining) {
    char buf[256];
    snprintf(buf, sizeof(buf),
        "{\"type\":\"status\",\"data\":{\"exec_info\":{\"queue_remaining\":%d}}}",
        queue_remaining);
    ws_send_json(ws, buf);
}

void ws_send_preview(inference_ws *ws, const char *prompt_id,
                     const char *node_id,
                     const uint8_t *image_data, size_t image_len) {
    /* ComfyUI binary protocol: 8-byte header + image data
     * Header: [event_type: uint32 LE][padding: uint32 LE]
     * event_type 1 = UNENCODED_PREVIEW_IMAGE
     */
    size_t frame_len = 8 + image_len;
    uint8_t *frame = malloc(frame_len);

    /* Event type = 1 (UNENCODED_PREVIEW_IMAGE) */
    frame[0] = 1; frame[1] = 0; frame[2] = 0; frame[3] = 0;
    /* Reserved */
    frame[4] = 0; frame[5] = 0; frame[6] = 0; frame[7] = 0;

    memcpy(frame + 8, image_data, image_len);

    ws_broadcast_binary(ws, frame, frame_len);
    free(frame);
}
