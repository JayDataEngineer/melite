#ifndef INFERENCE_PATHS_H
#define INFERENCE_PATHS_H
/*
 * paths.h — cross-platform scratch/estate path resolution.
 *
 * Kills the scattered "/tmp" and "/opt/ComfyUI" literals
 * (bootstrap/shareable portability pass, 2026-09-01). No silent
 * behavior change: TMPDIR is honored on POSIX, GetTempPath on Windows,
 * and the legacy defaults remain the last resort.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#include <windows.h>
#endif

/* Scratch dir: TMPDIR (POSIX) / GetTempPath (Windows) / "/tmp" legacy. */
static const char *inf_tmpdir(void) {
#ifdef _WIN32
    static char buf[512];
    if (GetTempPathA(sizeof buf, buf) > 0) return buf;
    return ".";
#else
    const char *t = getenv("TMPDIR");
    return (t && t[0]) ? t : "/tmp";
#endif
}

/* ComfyUI estate root for legacy fallbacks: COMFYUI_DIR env first
 * (config over hardcode — QUEUE LANE LAW spirit), /opt/ComfyUI last. */
static const char *inf_comfyui_root(void) {
    const char *c = getenv("COMFYUI_DIR");
    return (c && c[0]) ? c : "/opt/ComfyUI";
}

/* "<root>/input" built once (static buffer — call from any thread after
 * first use; first call races are benign: identical result). */
static const char *inf_comfyui_input(void) {
    static char buf[512];
    if (!buf[0])
        snprintf(buf, sizeof buf, "%s/input", inf_comfyui_root());
    return buf;
}

#endif /* INFERENCE_PATHS_H */
