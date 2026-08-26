#include "inference/vram.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>

static int evict_count = 0;
static void test_evict(void *ctx) {
    (void)ctx;
    evict_count++;
}

static void test_basic(void) {
    inference_vram *v = vram_create(1024);
    assert(v != NULL);
    assert(vram_total(v) == 1024);
    assert(vram_used(v) == 0);
    assert(vram_free(v) == 1024);
    vram_destroy(v);
    fprintf(stderr, "PASS: test_basic\n");
}

static void test_register_update(void) {
    inference_vram *v = vram_create(1024);
    evict_count = 0;

    assert(vram_register(v, "engine_a", 256, NULL, test_evict) == 0);
    assert(vram_used(v) == 256);

    assert(vram_register(v, "engine_b", 512, NULL, test_evict) == 0);
    assert(vram_used(v) == 768);

    assert(vram_update(v, "engine_a", 128) == 0);
    assert(vram_used(v) == 640);

    assert(vram_unregister(v, "engine_b") == 0);
    assert(vram_used(v) == 128);

    vram_destroy(v);
    fprintf(stderr, "PASS: test_register_update\n");
}

static void test_eviction(void) {
    /* Budget 512: register two 256-byte engines, then a third forces eviction */
    inference_vram *v = vram_create(512);
    evict_count = 0;

    assert(vram_register(v, "a", 256, NULL, test_evict) == 0);
    assert(vram_register(v, "b", 256, NULL, test_evict) == 0);
    assert(vram_used(v) == 512);

    /* This should evict the LRU (a) */
    assert(vram_register(v, "c", 256, NULL, test_evict) == 0);
    assert(evict_count == 1);
    assert(vram_used(v) == 512);  /* b + c */

    vram_destroy(v);
    fprintf(stderr, "PASS: test_eviction\n");
}

static void test_touch(void) {
    inference_vram *v = vram_create(512);
    evict_count = 0;

    vram_register(v, "a", 256, NULL, test_evict);
    vram_register(v, "b", 256, NULL, test_evict);

    /* Touch a, so b is now LRU */
    vram_touch(v, "a");

    /* Adding c should evict b */
    vram_register(v, "c", 256, NULL, test_evict);
    assert(evict_count == 1);
    assert(vram_used(v) == 512);

    vram_destroy(v);
    fprintf(stderr, "PASS: test_touch\n");
}

int main(void) {
    test_basic();
    test_register_update();
    test_eviction();
    test_touch();
    fprintf(stderr, "All VRAM tests passed.\n");
    return 0;
}
