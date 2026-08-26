#include "inference/vram.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/*
 * VRAM budget state machine — LRU eviction across engines.
 */

typedef struct vram_entry {
    char          *engine_id;
    size_t         bytes;
    uint64_t       last_touch;  /* monotonic counter */
    void          *engine_ctx;
    vram_evict_fn  evict;
    struct vram_entry *prev;    /* doubly-linked LRU list */
    struct vram_entry *next;
} vram_entry;

struct inference_vram {
    size_t      budget;
    size_t      used;
    uint64_t    clock;
    vram_entry *head;  /* most-recently-used */
    vram_entry *tail;  /* least-recently-used */
};

inference_vram *vram_create(size_t budget_bytes) {
    inference_vram *v = calloc(1, sizeof(*v));
    if (!v) return NULL;
    v->budget = budget_bytes;
    return v;
}

static vram_entry *find_entry(inference_vram *v, const char *id) {
    for (vram_entry *e = v->head; e; e = e->next) {
        if (strcmp(e->engine_id, id) == 0) return e;
    }
    return NULL;
}

static void list_remove(inference_vram *v, vram_entry *e) {
    if (e->prev) e->prev->next = e->next;
    else         v->head = e->next;
    if (e->next) e->next->prev = e->prev;
    else         v->tail = e->prev;
    e->prev = e->next = NULL;
}

static void list_push_front(inference_vram *v, vram_entry *e) {
    e->prev = NULL;
    e->next = v->head;
    if (v->head) v->head->prev = e;
    v->head = e;
    if (!v->tail) v->tail = e;
}

int vram_register(inference_vram *v, const char *engine_id,
                  size_t initial_bytes, void *engine_ctx,
                  vram_evict_fn evict) {
    if (!v || !engine_id) return -1;
    if (find_entry(v, engine_id)) return -1;  /* duplicate */

    vram_entry *e = calloc(1, sizeof(*e));
    if (!e) return -1;

    e->engine_id  = strdup(engine_id);
    e->bytes      = initial_bytes;
    e->last_touch = ++v->clock;
    e->engine_ctx = engine_ctx;
    e->evict      = evict;

    list_push_front(v, e);
    v->used += initial_bytes;

    /* Evict LRU if over budget */
    while (v->used > v->budget && v->tail) {
        vram_evict_lru(v);
    }

    return 0;
}

int vram_update(inference_vram *v, const char *engine_id, size_t new_bytes) {
    if (!v) return -1;
    vram_entry *e = find_entry(v, engine_id);
    if (!e) return -1;

    v->used -= e->bytes;
    e->bytes = new_bytes;
    v->used += new_bytes;

    /* Evict LRU if over budget */
    while (v->used > v->budget && v->tail) {
        vram_evict_lru(v);
    }

    return 0;
}

int vram_unregister(inference_vram *v, const char *engine_id) {
    if (!v) return -1;
    vram_entry *e = find_entry(v, engine_id);
    if (!e) return -1;

    list_remove(v, e);
    v->used -= e->bytes;
    free(e->engine_id);
    free(e);
    return 0;
}

int vram_touch(inference_vram *v, const char *engine_id) {
    if (!v) return -1;
    vram_entry *e = find_entry(v, engine_id);
    if (!e) return -1;

    list_remove(v, e);
    e->last_touch = ++v->clock;
    list_push_front(v, e);
    return 0;
}

size_t vram_total(const inference_vram *v) { return v ? v->budget : 0; }
size_t vram_used(const inference_vram *v) { return v ? v->used   : 0; }
size_t vram_free(const inference_vram *v) {
    return v && v->budget > v->used ? v->budget - v->used : 0;
}

int vram_evict_lru(inference_vram *v) {
    if (!v || !v->tail) return -1;

    vram_entry *e = v->tail;
    list_remove(v, e);
    v->used -= e->bytes;

    fprintf(stderr, "vram: evicting %s (%zu bytes)\n",
            e->engine_id, e->bytes);

    if (e->evict) e->evict(e->engine_ctx);

    free(e->engine_id);
    free(e);
    return 0;
}

void vram_destroy(inference_vram *v) {
    if (!v) return;
    vram_entry *e = v->head;
    while (e) {
        vram_entry *next = e->next;
        free(e->engine_id);
        free(e);
        e = next;
    }
    free(v);
}
