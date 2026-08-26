#ifndef INFERENCE_DOWNLOAD_H
#define INFERENCE_DOWNLOAD_H

#include "inference/catalog.h"
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/*
 * Model downloader — fetches weights from HuggingFace or direct URLs.
 *
 * Supports:
 *   - HuggingFace Hub API (with auth token)
 *   - Direct HTTP/HTTPS URLs
 *   - Resume interrupted downloads (Range header)
 *   - SHA256 checksum verification
 *   - Progress callback for UI integration
 */

/* Download progress callback */
typedef void (*download_progress_fn)(void *user_data,
                                     const char *filename,
                                     size_t downloaded,
                                     size_t total);

/* Download configuration */
typedef struct download_config {
    char *cache_dir;         /* Where to store downloaded files */
    char *hf_token;          /* HuggingFace auth token (optional) */
    int   max_retries;       /* Retry count on failure (default: 3) */
    int   follow_redirects;  /* Follow HTTP redirects (default: 1) */
} download_config;

/* Create a default download config */
download_config *download_config_create(const char *cache_dir);

/* Free a download config */
void download_config_free(download_config *cfg);

/* ---- High-level API ---- */

/* Download a model from a catalog source.
 * Returns 0 on success, -1 on error.
 * The file is stored at <cache_dir>/<filename>. */
int download_model(const download_config *cfg,
                   const catalog_source *source,
                   const char *filename,
                   download_progress_fn progress,
                   void *user_data);

/* Auto-download all models referenced in the catalog.
 * Only downloads if the file doesn't already exist.
 * Returns number of models downloaded, -1 on error. */
int download_catalog_models(const download_config *cfg,
                            const inference_catalog *cat,
                            download_progress_fn progress,
                            void *user_data);

/* ---- Low-level API ---- */

/* Download from a direct URL.
 * Supports resume via Range header if partial_file exists.
 * Returns 0 on success. */
int download_url(const download_config *cfg,
                 const char *url,
                 const char *output_path,
                 const char *partial_file,
                 download_progress_fn progress,
                 void *user_data);

/* Download from HuggingFace Hub.
 * Resolves repo_id + filename to a direct URL via the HF API.
 * Returns 0 on success. */
int download_huggingface(const download_config *cfg,
                         const char *repo_id,
                         const char *filename,
                         const char *output_path,
                         download_progress_fn progress,
                         void *user_data);

/* Verify a file's SHA256 checksum.
 * Returns 0 if match, -1 if mismatch, 1 if no checksum provided. */
int download_verify_sha256(const char *file_path,
                           const char *expected_hash);

/* Get the cache path for a model file.
 * Returns <cache_dir>/<filename> or NULL on error. */
char *download_cache_path(const download_config *cfg,
                          const char *filename);

#ifdef __cplusplus
}
#endif

#endif /* INFERENCE_DOWNLOAD_H */
