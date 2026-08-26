#ifndef INFERENCE_PLUGIN_HELPERS_H
#define INFERENCE_PLUGIN_HELPERS_H

#include "inference/plugin.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/*
 * Shared helpers for all plugins. Include this instead of repeating
 * JSON parsing, schema building, and tensor wiring in every plugin.
 */

#ifdef __cplusplus
extern "C" {
#endif

/* ---- JSON minimizer ---- */

static inline const char *inf_json_get(const char *json, const char *key) {
    if (!json || !key) return NULL;
    char needle[128];
    snprintf(needle, sizeof(needle), "\"%s\"", key);
    const char *p = strstr(json, needle);
    if (!p) return NULL;
    p += strlen(needle);
    while (*p == ' ' || *p == ':') p++;
    return p;
}

static inline const char *inf_json_string(const char *json, const char *key,
                                          char *buf, size_t buflen) {
    const char *p = inf_json_get(json, key);
    if (!p || *p != '"') return NULL;
    p++;
    size_t i = 0;
    while (*p && *p != '"' && i < buflen - 1) {
        if (*p == '\\' && p[1]) p++;
        buf[i++] = *p++;
    }
    buf[i] = '\0';
    return buf;
}

static inline int inf_json_int(const char *json, const char *key, int fallback) {
    const char *p = inf_json_get(json, key);
    if (!p || *p == '"') return fallback;
    return atoi(p);
}

static inline float inf_json_float(const char *json, const char *key, float fallback) {
    const char *p = inf_json_get(json, key);
    if (!p || *p == '"') return fallback;
    return (float)atof(p);
}

/* ---- Schema builder ---- */

typedef struct inf_schema_field {
    const char *name;
    const char *dtype;
    int         required;
    const char *default_val;  /* NULL for no default */
} inf_schema_field;

typedef struct inf_schema_param {
    const char *name;
    const char *type;
    const char *default_val;  /* NULL for required */
} inf_schema_param;

/* Build a schema JSON string from field lists. Caller frees the result. */
static inline inference_schema inf_build_schema(
        const inf_schema_field *inputs,  size_t n_inputs,
        const inf_schema_field *outputs, size_t n_outputs,
        const inf_schema_param *params,  size_t n_params) {

    char buf[4096];
    int off = 0;

    off += snprintf(buf + off, sizeof(buf) - off, "{\"inputs\":[");
    for (size_t i = 0; i < n_inputs; i++) {
        if (i) buf[off++] = ',';
        off += snprintf(buf + off, sizeof(buf) - off,
            "{\"name\":\"%s\",\"dtype\":\"%s\"%s}",
            inputs[i].name, inputs[i].dtype,
            inputs[i].required ? ",\"required\":true" : "");
    }
    off += snprintf(buf + off, sizeof(buf) - off, "],\"outputs\":[");
    for (size_t i = 0; i < n_outputs; i++) {
        if (i) buf[off++] = ',';
        off += snprintf(buf + off, sizeof(buf) - off,
            "{\"name\":\"%s\",\"dtype\":\"%s\"}",
            outputs[i].name, outputs[i].dtype);
    }
    off += snprintf(buf + off, sizeof(buf) - off, "],\"params\":{");
    for (size_t i = 0; i < n_params; i++) {
        if (i) buf[off++] = ',';
        if (params[i].default_val)
            off += snprintf(buf + off, sizeof(buf) - off,
                "\"%s\":{\"type\":\"%s\",\"default\":%s}",
                params[i].name, params[i].type, params[i].default_val);
        else
            off += snprintf(buf + off, sizeof(buf) - off,
                "\"%s\":{\"type\":\"%s\",\"required\":true}",
                params[i].name, params[i].type);
    }
    off += snprintf(buf + off, sizeof(buf) - off, "}}");

    char *out = malloc(off + 1);
    memcpy(out, buf, off + 1);
    return (inference_schema){ .json = out, .len = off };
}

/* ---- Copy tensor helper ---- */

static inline void inf_copy_tensor(inference_tensor *dst,
                                   const inference_tensor *src) {
    dst->name   = src->name;
    dst->dtype  = src->dtype;
    dst->ndim   = src->ndim;
    memcpy(dst->shape, src->shape, sizeof(src->shape));
    dst->data   = src->data;
    dst->nbytes = src->nbytes;
}

#ifdef __cplusplus
}
#endif

#endif /* INFERENCE_PLUGIN_HELPERS_H */
