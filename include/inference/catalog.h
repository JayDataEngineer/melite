#ifndef INFERENCE_CATALOG_H
#define INFERENCE_CATALOG_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/*
 * Model catalog — scans the plugins/ tree (ray plugin law), parses YAML
 * metadata, and serves a unified index.
 *
 *   plugins/<owner>/models/<genre>/<model-id>/model.yaml  — engine metadata
 *   plugins/<owner>/cards/<card-id>/card.yaml             — action cards (owner = category)
 *   plugins/<owner>/pipelines/<pipeline-id>/pipeline.yaml — pipelines
 *
 * Unit-asset law — every unit folder (model / card / pipeline) may carry:
 *   agents/AGENT.md       LLM-facing docs (progressive disclosure)
 *   inference.yaml        prompt-upscale + parameter-agentry recipe
 *   grading_rubric.yaml   output judging criteria (gates, retry rules)
 */

/* ---- Source declaration (where to download weights) ---- */

typedef struct catalog_source {
    char *type;          /* "huggingface", "builtin", "url" */
    char *repo_id;       /* HF org/repo (e.g. "ggml-org/llama.cpp") */
    char *url;           /* direct download URL */
    char *filename;      /* template: "sd-{variant}.gguf" */
} catalog_source;

/* ---- LoRA entry ---- */

typedef struct catalog_lora {
    char *id;
    char *label;
    char *category;      /* "base", "style", "enhancement" */
    catalog_source source;
} catalog_lora;

/* ---- Variant group (model selection axis) ---- */

typedef struct catalog_variant_option {
    char *id;
    char *label;
    char *filename;
} catalog_variant_option;

typedef struct catalog_variant_group {
    char *name;
    char *label;
    catalog_variant_option *options;
    size_t n_options;
} catalog_variant_group;

/* ---- Model entry (parsed from models/<engine>/model.yaml) ---- */

typedef struct catalog_model {
    char *id;            /* family id, e.g. "llama", "sd" */
    char *genre;         /* "text", "image", "audio", "3d", "utility" */
    char *label;
    char *description;

    /* Source */
    catalog_source source;

    /* Variants */
    catalog_variant_group *variant_groups;
    size_t n_variant_groups;

    /* LoRA catalog */
    catalog_lora *loras;
    size_t n_loras;

    /* Defaults (key=value pairs) */
    char **default_keys;
    char **default_vals;
    size_t n_defaults;

    /* Engine binding */
    char *engine_plugin;

    /* Editor form routing (e.g. form_video_director) — the card surface the
     * editor must mount for this model; without it the client contract
     * refuses to route or render the model. May be NULL. */
    char *form;

    /* Card studio body claim (e.g. melite-video/video_timeline) — the
     * editor's studio-tenant resolver reads families[id].studio.tenant
     * from /v1/model-catalog and mounts that card component INSTEAD of
     * the schema form (precedence 100). May be NULL. */
    char *studio_tenant;
    int studio_owns_params;

    /* Agent bundle path (may be NULL) */
    char *agent_md_path;

    /* Unit assets (may be NULL) */
    char *inference_path;
    char *rubric_path;
} catalog_model;

/* ---- Card entry (parsed from cards/<action>/card.yaml) ---- */

typedef struct catalog_card {
    char *id;            /* e.g. "text-gen", "image-gen" */
    char *label;
    char *description;
    char *genre;
    char *icon;

    /* Families this card serves */
    char **family_ids;
    size_t n_families;

    /* Principles (strings) */
    char **principles;
    size_t n_principles;

    /* Parameter definitions (raw YAML text) */
    char *parameters_yaml;
    size_t parameters_yaml_len;

    /* Skills */
    char **skill_ids;
    char **skill_labels;
    size_t n_skills;

    /* Unit assets (may be NULL) */
    char *inference_path;
    char *rubric_path;
} catalog_card;

/* ---- Full catalog ---- */

typedef struct inference_catalog {
    catalog_model *models;
    size_t n_models;
    catalog_card *cards;
    size_t n_cards;
    char *plugins_dir;
} inference_catalog;

/* Scan the plugins/ tree and build the catalog. Returns NULL on error. */
inference_catalog *catalog_scan(const char *plugins_dir);

/* Find a model by family id. Returns NULL if not found. */
const catalog_model *catalog_find_model(const inference_catalog *cat,
                                        const char *family_id);

/* Find a card by id. Returns NULL if not found. */
const catalog_card *catalog_find_card(const inference_catalog *cat,
                                      const char *card_id);

/* Find cards that serve a given family */
size_t catalog_cards_for_family(const inference_catalog *cat,
                                const char *family_id,
                                const catalog_card **out, size_t max_out);

/* Serialize the catalog to JSON (caller frees). */
char *catalog_to_json(const inference_catalog *cat);

/* Serialize a single model to JSON. */
char *catalog_model_to_json(const catalog_model *m);

/* Serialize a single card to JSON. */
char *catalog_card_to_json(const catalog_card *c);

/* Free the catalog */
void catalog_free(inference_catalog *cat);

#ifdef __cplusplus
}
#endif

#endif /* INFERENCE_CATALOG_H */
