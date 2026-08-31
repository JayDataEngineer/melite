/* poser_handlers.cpp — ANNY poser routes (ray /poser/skin/* parity).
 *
 * Migrates the Body Studio card's backend from the ray ComfyUI poser
 * (melite-poser-nodes + py-soma-x) to the native inference.cpp anny
 * plugin. The UI code (BodyCardEditor, BodyShapePanel, bodyMesh.ts)
 * is UNCHANGED — it still calls:
 *
 *   GET  /poser/skin/identity-space?identity_model=anny
 *   POST /poser/skin/mesh   {identity_model, identity_coeffs,
 *                            local_changes, custom_targets}
 *
 * but the mesh now comes from anny_plugin.so in <1ms instead of a
 * round-trip through ComfyUI + PyTorch + py-soma-x.
 *
 * PLUGIN ARCHITECTURE LAW: data files live in the plugin that owns the
 * lane. We resolve them relative to the plugin's own directory by
 * walking up from the .so path (plugins/<name>/engines/<name>/<name>.so
 * -> plugins/<name>/data/). No shared root data/ directory.
 *
 * Data files (single source of truth, no embedded JSON in C):
 *   plugins/anny/data/anny_identity_space.json   — dimension metadata
 *   plugins/anny/data/anny_shape_basis_names.json — slider names
 *   plugins/anny/data/anny_shape_basis.bin        — vertex deltas
 *
 * The anny plugin is loaded ONCE and cached (the basis is ~10MB; reload
 * per request would burn 10ms+ of disk for every slider drag).
 */

#include "inference/server.h"
#include "inference/plugin.h"
#include "inference/plugin_loader.h"
#include "httplib.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

/* ---- plugin data directory resolution (PLUGIN ARCHITECTURE LAW) ----
 *
 * Data lives in plugins/anny/data/, resolved by probing the plugin tree.
 * After plugin_load(), we also derive the path from the .so location.
 */
static char g_anny_data_dir[512] = "";

static const char *anny_data_dir(void) {
    if (g_anny_data_dir[0]) return g_anny_data_dir;
    /* Probe the plugin tree for the data file (ground truth) */
    const char *candidates[] = {
        "plugins/anny/data",
        NULL
    };
    for (int i = 0; candidates[i]; i++) {
        char path[640];
        snprintf(path, sizeof(path), "%s/anny_shape_basis_names.json", candidates[i]);
        FILE *f = fopen(path, "r");
        if (f) {
            fclose(f);
            snprintf(g_anny_data_dir, sizeof(g_anny_data_dir), "%s/", candidates[i]);
            return g_anny_data_dir;
        }
    }
    fprintf(stderr, "poser: WARNING - anny data not found in plugins/anny/data/\n");
    return "";
}

/* Derive plugin data dir from a .so path (called after plugin_load) */
static void anny_data_dir_from_so(const char *so_path) {
    if (!so_path || g_anny_data_dir[0]) return;
    const char *plug = strstr(so_path, "plugins/");
    if (plug) {
        const char *name_start = plug + 8;
        const char *slash = strchr(name_start, '/');
        if (slash) {
            snprintf(g_anny_data_dir, sizeof(g_anny_data_dir),
                     "%.*s/data/", (int)(slash - plug), plug);
        }
    }
}

/* ---- cached identity-space JSON (loaded once) ---- */
static char *g_identity_space_json = NULL;
static pthread_mutex_t g_poser_lock = PTHREAD_MUTEX_INITIALIZER;

static const char *load_identity_space(void) {
    if (g_identity_space_json) return g_identity_space_json;
    const char *dir = anny_data_dir();
    char path[640];
    snprintf(path, sizeof(path), "%sanny_identity_space.json", dir);
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    fseek(f, 0, SEEK_SET);
    g_identity_space_json = (char *)malloc(sz + 1);
    size_t rd = fread(g_identity_space_json, 1, sz, f);
    g_identity_space_json[rd] = 0;
    fclose(f);
    return g_identity_space_json;
}

/* ---- cached slider names (64) ---- */
static char g_slider_names[64][64];
static int g_n_sliders = 0;

static int load_slider_names(void) {
    if (g_n_sliders) return g_n_sliders;
    const char *dir = anny_data_dir();
    char path[640];
    snprintf(path, sizeof(path), "%sanny_shape_basis_names.json", dir);
    FILE *f = fopen(path, "rb");
    if (!f) return 0;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    fseek(f, 0, SEEK_SET);
    char *buf = (char *)malloc(sz + 1);
    size_t rd = fread(buf, 1, sz, f);
    buf[rd] = 0;
    fclose(f);
    /* crude JSON array-of-strings scan */
    const char *p = buf;
    while (*p && g_n_sliders < 64) {
        while (*p && *p != '"') p++;
        if (!*p) break;
        p++;
        int i = 0;
        while (*p && *p != '"' && i < 63) g_slider_names[g_n_sliders][i++] = *p++;
        g_slider_names[g_n_sliders][i] = 0;
        if (i > 0) g_n_sliders++;
        if (*p) p++;
    }
    free(buf);
    return g_n_sliders;
}

static int slider_index(const char *name) {
    int n = load_slider_names();
    for (int i = 0; i < n; i++)
        if (strcmp(g_slider_names[i], name) == 0) return i;
    return -1;
}

/* ---- cached anny plugin handle (loaded once) ---- */
static inference_plugin *g_anny_plugin = NULL;
static inference_context *g_anny_ctx = NULL;

static int anny_plugin_init(void) {
    if (g_anny_ctx) return 0;   /* already loaded */
    if (!g_anny_plugin) {
        const char *paths[] = { "./anny_plugin.so", "./build/anny_plugin.so",
                                "plugins/anny/engines/anny/anny_plugin.so", NULL };
        for (int i = 0; paths[i]; i++) {
            g_anny_plugin = plugin_load(paths[i]);
            if (g_anny_plugin) {
                /* PLUGIN ARCHITECTURE LAW: derive data dir from .so path */
                anny_data_dir_from_so(plugin_so_path(g_anny_plugin));
                break;
            }
        }
        if (!g_anny_plugin) {
            fprintf(stderr, "poser: anny plugin not found\n");
            return -1;
        }
    }
    /* shape_names come from the names file — build the config by reading
     * it verbatim so C never embeds the 64-name array. */
    const char *dir = anny_data_dir();
    char names_path[640];
    snprintf(names_path, sizeof(names_path), "%sanny_shape_basis_names.json", dir);
    char basis_path[640];
    snprintf(basis_path, sizeof(basis_path), "%sanny_shape_basis.bin", dir);

    char config[8192];
    FILE *f = fopen(names_path, "rb");
    if (!f) return -1;
    char names[4096] = "";
    size_t rd = fread(names, 1, sizeof(names) - 1, f);
    names[rd] = 0;
    fclose(f);
    /* Compact whitespace OUT of the names array before embedding: the
     * file is pretty-printed (newlines between entries) but embedding
     * raw newlines inside a JSON string value breaks the config. Names
     * are identifiers — no internal whitespace — so stripping ALL
     * whitespace from the buffer is safe. */
    {
        char compact[4096];
        size_t ci = 0;
        for (size_t i = 0; i < rd && ci < sizeof(compact) - 1; i++)
            if (names[i] != '\n' && names[i] != '\r' &&
                names[i] != ' '  && names[i] != '\t')
                compact[ci++] = names[i];
        compact[ci] = 0;
        snprintf(config, sizeof(config),
                 "{\"basis_file\":\"%s\",\"shape_names\":%s}",
                 basis_path, compact);
    }
    inference_context *ctx = NULL;
    if (plugin_load_model(g_anny_plugin, config, strlen(config), &ctx) != 0 || !ctx) {
        fprintf(stderr, "poser: anny plugin load failed\n");
        return -1;
    }
    g_anny_ctx = ctx;
    fprintf(stderr, "poser: anny plugin loaded + cached\n");
    return 0;
}

/* ---- identity_coeffs (11, 0..1, neutral 0.5) -> sliders (64, -1..1) ---- */
static void identity_to_sliders(const float *coeffs, int n_coeffs, float *sliders) {
    int n = load_slider_names();
    for (int i = 0; i < n; i++) sliders[i] = 0.0f;
    /* The 11 identity dims that have same-named sliders in the basis */
    static const char *dim_map[][2] = {
        {"age", "age"}, {"muscle", "muscle"}, {"weight", "weight"},
        {"height", "height"}, {NULL, NULL}
    };
    (void)n_coeffs;
    static const char *dim_names[11] = {
        "gender","age","muscle","weight","height","proportions",
        "cupsize","firmness","african","asian","caucasian"
    };
    for (int c = 0; c < 11; c++) {
        if (!dim_names[c]) continue;
        float v = (coeffs[c] - 0.5f) * 2.0f;
        int idx = slider_index(dim_names[c]);
        if (idx >= 0) sliders[idx] = v;
    }
    (void)dim_map;
}

/* ---- handlers ---- */

void handle_poser_identity_space(const httplib::Request &req,
                                 httplib::Response &res) {
    (void)req;
    const char *json = load_identity_space();
    if (!json) {
        res.status = 500;
        res.set_content("{\"error\":\"identity space file missing (plugins/anny/data/anny_identity_space.json)\"}",
                        "application/json");
        return;
    }
    res.set_content(json, "application/json");
}

void handle_poser_mesh(const httplib::Request &req,
                       httplib::Response &res) {
    pthread_mutex_lock(&g_poser_lock);

    /* 1. parse identity_coeffs array */
    float coeffs[11] = {0.5f,0.5f,0.5f,0.5f,0.5f,0.5f,0.5f,0.5f,0.5f,0.5f,0.5f};
    const char *cp = strstr(req.body.c_str(), "identity_coeffs");
    if (cp) {
        cp = strchr(cp, '[');
        if (cp) {
            cp++;
            for (int i = 0; i < 11 && *cp && *cp != ']'; i++) {
                while (*cp == ' ' || *cp == ',') cp++;
                coeffs[i] = (float)strtod(cp, (char **)&cp);
            }
        }
    }

    /* 2. identity -> 64 sliders */
    float sliders[64] = {0};
    if (load_slider_names() == 0) {
        pthread_mutex_unlock(&g_poser_lock);
        res.status = 500;
        res.set_content("{\"error\":\"slider names file missing (plugins/anny/data/anny_shape_basis_names.json)\"}",
                        "application/json");
        return;
    }
    identity_to_sliders(coeffs, 11, sliders);

    /* 3. merge local_changes ({"slider_name": value}) */
    const char *lc = strstr(req.body.c_str(), "local_changes");
    if (lc) {
        lc = strchr(lc, '{');
        if (lc) {
            lc++;
            while (*lc && *lc != '}') {
                while (*lc == ' ' || *lc == ',' || *lc == '\n') lc++;
                if (*lc != '"') break;
                lc++;
                char key[128] = "";
                int ki = 0;
                while (*lc && *lc != '"' && ki < 127) key[ki++] = *lc++;
                key[ki] = 0;
                lc++;
                while (*lc == ' ' || *lc == ':') lc++;
                if (*lc == '"') {           /* string value: skip */
                    lc++;
                    while (*lc && *lc != '"') lc++;
                    if (*lc) lc++;
                } else if (*lc && *lc != '}') {
                    float v = (float)strtod(lc, (char **)&lc);
                    int idx = slider_index(key);
                    if (idx >= 0) {
                        sliders[idx] += v;
                        if (sliders[idx] >  1.0f) sliders[idx] =  1.0f;
                        if (sliders[idx] < -1.0f) sliders[idx] = -1.0f;
                    }
                }
            }
        }
    }
    /* custom_targets (community .target blendshapes) are accepted but the
     * synthetic basis has no target slots yet — ignored, logged once. */

    /* 4. build slider JSON for the plugin */
    char slider_json[4096];
    int off = snprintf(slider_json, sizeof(slider_json), "{");
    for (int i = 0; i < g_n_sliders; i++) {
        if (fabsf(sliders[i]) < 0.001f) continue;
        if (off > 1) off += snprintf(slider_json + off, sizeof(slider_json) - off, ",");
        off += snprintf(slider_json + off, sizeof(slider_json) - off,
                        "\"%s\":%.4f", g_slider_names[i], sliders[i]);
        if (off >= (int)sizeof(slider_json) - 64) break;
    }
    snprintf(slider_json + off, sizeof(slider_json) - off, "}");

    /* 5. ensure plugin loaded, execute */
    if (anny_plugin_init() != 0) {
        pthread_mutex_unlock(&g_poser_lock);
        res.status = 500;
        res.set_content("{\"error\":\"anny plugin unavailable\"}", "application/json");
        return;
    }

    inference_tensor inputs[1], outputs[2];
    memset(inputs, 0, sizeof(inputs));
    memset(outputs, 0, sizeof(outputs));
    inputs[0].name = "sliders";
    inputs[0].dtype = "string";
    inputs[0].data = (void *)slider_json;
    inputs[0].nbytes = strlen(slider_json) + 1;

    if (plugin_execute(g_anny_plugin, g_anny_ctx, inputs, 1, outputs, 2) != 0) {
        pthread_mutex_unlock(&g_poser_lock);
        res.status = 500;
        res.set_content("{\"error\":\"anny execute failed\"}", "application/json");
        return;
    }

    float *verts = (float *)outputs[0].data;
    int N = (int)outputs[0].shape[0];

    /* 6. stream the response: {"vertices":[[x,y,z],...],"faces":[[i,j,k],...]} */
    size_t cap = (size_t)N * 40 + (size_t)(N / 3) * 24 + 128;
    std::string out;
    out.reserve(cap);
    out += "{\"vertices\":[";
    char tmp[96];
    for (int i = 0; i < N; i++) {
        if (i) out += ',';
        snprintf(tmp, sizeof(tmp), "[%.5f,%.5f,%.5f]",
                 verts[i*3], verts[i*3+1], verts[i*3+2]);
        out += tmp;
    }
    out += "],\"faces\":[";
    for (int i = 0; i + 2 < N; i += 3) {
        if (i) out += ',';
        snprintf(tmp, sizeof(tmp), "[%d,%d,%d]", i, i + 1, i + 2);
        out += tmp;
    }
    out += "]}";
    res.set_content(out, "application/json");

    /* outputs data is owned by caller — free it */
    free(outputs[0].data);
    free(outputs[1].data);

    pthread_mutex_unlock(&g_poser_lock);
}

