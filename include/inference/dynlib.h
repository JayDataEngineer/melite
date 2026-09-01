#ifndef INFERENCE_DYNLIB_H
#define INFERENCE_DYNLIB_H
/*
 * dynlib.h — cross-platform shared-object loading for the plugin ABI.
 *
 * POSIX: dlopen/dlsym (RTLD_NOW|RTLD_LOCAL preserved).
 * Windows: LoadLibraryA/GetProcAddress (.dll plugins).
 *
 * Engine code never includes <dlfcn.h> directly — every load site goes
 * through these shims (bootstrap/shareable portability pass, 2026-09-01).
 */

#ifdef _WIN32
#include <windows.h>

static void *dy_open(const char *path) {
    return (void *)(uintptr_t)LoadLibraryA(path);
}
static void *dy_sym(void *h, const char *sym) {
    return (void *)(uintptr_t)GetProcAddress((HMODULE)(uintptr_t)h, sym);
}
static void dy_close(void *h) { FreeLibrary((HMODULE)(uintptr_t)h); }
static const char *dy_err(void) { return "LoadLibraryA failed"; }

#else
#include <dlfcn.h>

static void *dy_open(const char *path) {
    return dlopen(path, RTLD_NOW | RTLD_LOCAL);
}
static void *dy_sym(void *h, const char *sym) { return dlsym(h, sym); }
static void dy_close(void *h) { dlclose(h); }
static const char *dy_err(void) {
    const char *e = dlerror();
    return e ? e : "unknown dlopen error";
}

#endif
#endif /* INFERENCE_DYNLIB_H */
