#include "inference/download.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>
#include <errno.h>

/*
 * Model downloader — fetches weights from HuggingFace or direct URLs
 * using the curl CLI (no libcurl dev headers required).
 */

/* ---- Config ---- */

download_config *download_config_create(const char *cache_dir) {
    download_config *cfg = calloc(1, sizeof(download_config));
    if (!cfg) return NULL;
    cfg->cache_dir = cache_dir ? strdup(cache_dir) : strdup("~/.cache/inference.cpp");
    cfg->max_retries = 3;
    cfg->follow_redirects = 1;
    return cfg;
}

void download_config_free(download_config *cfg) {
    if (!cfg) return;
    free(cfg->cache_dir);
    free(cfg->hf_token);
    free(cfg);
}

/* ---- File helpers ---- */

static int file_exists(const char *path) {
    struct stat st;
    return stat(path, &st) == 0 && S_ISREG(st.st_mode);
}

static size_t file_size(const char *path) {
    struct stat st;
    if (stat(path, &st) != 0) return 0;
    return (size_t)st.st_size;
}

static int mkdir_p(const char *path) {
    char tmp[1024];
    snprintf(tmp, sizeof(tmp), "%s", path);
    for (char *p = tmp + 1; *p; p++) {
        if (*p == '/') {
            *p = '\0';
            mkdir(tmp, 0755);
            *p = '/';
        }
    }
    return mkdir(tmp, 0755);
}

/* ---- Cache path ---- */

char *download_cache_path(const download_config *cfg,
                          const char *filename) {
    if (!cfg || !filename) return NULL;

    char cache_dir[1024];
    if (cfg->cache_dir[0] == '~') {
        const char *home = getenv("HOME");
        if (!home) return NULL;
        snprintf(cache_dir, sizeof(cache_dir), "%s%s", home, cfg->cache_dir + 1);
    } else {
        snprintf(cache_dir, sizeof(cache_dir), "%s", cfg->cache_dir);
    }

    mkdir_p(cache_dir);

    char *path = malloc(1024);
    snprintf(path, 1024, "%s/%s", cache_dir, filename);
    return path;
}

/* ---- curl CLI wrapper ---- */

static int curl_download(const char *url, const char *output_path,
                         const char *auth_header,
                         download_progress_fn progress,
                         void *user_data, const char *filename) {
    char cmd[4096];

    /* Build curl command:
     *   -L: follow redirects
     *   -C -: resume from partial
     *   -o: output file
     *   -s: silent (no progress bar, we handle progress ourselves)
     *   -w: write exit code to stdout
     *   --connect-timeout 30
     */
    const char *auth_flag = "";
    if (auth_header) {
        /* Auth is passed via env var for security */
        snprintf(cmd, sizeof(cmd),
            "HF_HUB_ENABLE_HF_TRANSFER=1 curl -L -C - -o %s "
            "-w '%%{http_code}' --connect-timeout 30 --max-time 0 "
            "-H 'Authorization: Bearer %s' '%s'",
            output_path, auth_header, url);
    } else {
        snprintf(cmd, sizeof(cmd),
            "curl -L -C - -o %s "
            "-w '%%{http_code}' --connect-timeout 30 --max-time 0 "
            "'%s'",
            output_path, url);
    }

    fprintf(stderr, "[download] %s -> %s\n", url, strrchr(output_path, '/') + 1);

    FILE *fp = popen(cmd, "r");
    if (!fp) {
        fprintf(stderr, "[download] Failed to run curl\n");
        return -1;
    }

    char http_code[8] = {0};
    fread(http_code, 1, 7, fp);
    int status = pclose(fp);

    int code = atoi(http_code);
    if (code >= 200 && code < 300) {
        fprintf(stderr, "[download] OK (HTTP %d): %s\n",
                code, strrchr(output_path, '/') + 1);
        return 0;
    }

    fprintf(stderr, "[download] Failed (HTTP %d) for %s\n", code, url);
    return -1;
}

/* ---- HuggingFace URL resolver ---- */

static void resolve_hf_url(const download_config *cfg,
                           const char *repo_id,
                           const char *filename,
                           char *url, size_t url_len) {
    snprintf(url, url_len,
             "https://huggingface.co/%s/resolve/main/%s",
             repo_id, filename);
}

/* ---- High-level API ---- */

int download_model(const download_config *cfg,
                   const catalog_source *source,
                   const char *filename,
                   download_progress_fn progress,
                   void *user_data) {
    if (!cfg || !source || !filename) return -1;

    char *output_path = download_cache_path(cfg, filename);
    if (!output_path) return -1;

    /* Skip if already downloaded */
    if (file_exists(output_path)) {
        fprintf(stderr, "[download] %s already exists (%zu bytes), skipping\n",
                filename, file_size(output_path));
        free(output_path);
        return 0;
    }

    int rc = -1;

    if (strcmp(source->type, "huggingface") == 0 && source->repo_id) {
        char url[1024];
        resolve_hf_url(cfg, source->repo_id, source->filename, url, sizeof(url));
        rc = curl_download(url, output_path, cfg->hf_token,
                           progress, user_data, filename);
    } else if (source->url) {
        rc = curl_download(source->url, output_path, NULL,
                           progress, user_data, filename);
    } else {
        fprintf(stderr, "[download] %s: no source URL or repo_id\n", filename);
    }

    free(output_path);
    return rc;
}

int download_catalog_models(const download_config *cfg,
                            const inference_catalog *cat,
                            download_progress_fn progress,
                            void *user_data) {
    if (!cfg || !cat) return -1;

    int downloaded = 0;

    for (size_t i = 0; i < cat->n_models; i++) {
        const catalog_model *m = &cat->models[i];

        if (!m->source.type) continue;
        if (strcmp(m->source.type, "builtin") == 0) continue;

        char filename[256];
        if (m->source.filename) {
            snprintf(filename, sizeof(filename), "%s", m->source.filename);
        } else {
            snprintf(filename, sizeof(filename), "%s.gguf", m->id);
        }

        fprintf(stderr, "[download] Checking %s (%s)...\n", m->id, filename);

        if (download_model(cfg, &m->source, filename, progress, user_data) == 0) {
            downloaded++;
        }
    }

    return downloaded;
}

/* ---- Low-level API ---- */

int download_url(const download_config *cfg,
                 const char *url,
                 const char *output_path,
                 const char *partial_file,
                 download_progress_fn progress,
                 void *user_data) {
    (void)partial_file;  /* curl -C - handles resume automatically */
    (void)progress;
    (void)user_data;
    return curl_download(url, output_path, NULL, progress, user_data, NULL);
}

int download_huggingface(const download_config *cfg,
                         const char *repo_id,
                         const char *filename,
                         const char *output_path,
                         download_progress_fn progress,
                         void *user_data) {
    if (!cfg || !repo_id || !filename) return -1;

    char url[1024];
    resolve_hf_url(cfg, repo_id, filename, url, sizeof(url));

    fprintf(stderr, "[download] HuggingFace: %s/%s\n", repo_id, filename);
    return curl_download(url, output_path, cfg->hf_token,
                         progress, user_data, filename);
}

int download_verify_sha256(const char *file_path,
                           const char *expected_hash) {
    if (!expected_hash || !expected_hash[0]) return 1;

    char cmd[1024];
    snprintf(cmd, sizeof(cmd), "sha256sum %s", file_path);

    FILE *fp = popen(cmd, "r");
    if (!fp) return -1;

    char hash[65] = {0};
    if (fscanf(fp, "%64s", hash) != 1) {
        pclose(fp);
        return -1;
    }
    pclose(fp);

    if (strcmp(hash, expected_hash) == 0) {
        fprintf(stderr, "[download] SHA256 verified: %s\n", file_path);
        return 0;
    }

    fprintf(stderr, "[download] SHA256 mismatch: expected %s, got %s\n",
            expected_hash, hash);
    return -1;
}
