#include "inference/catalog.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/*
 * Model catalog — scans models/ + cards/ directories, parses YAML
 * metadata files, builds a unified index.
 *
 * Uses a minimal YAML subset parser (no external deps).
 */

/* ---- Minimal YAML helpers ---- */

static char *ystrdup(const char *s) {
    return s ? strdup(s) : NULL;
}

static char *ystrip(char *s) {
    while (*s == ' ' || *s == '\t') s++;
    char *end = s + strlen(s);
    while (end > s && (end[-1] == '\n' || end[-1] == '\r' ||
                       end[-1] == ' '  || end[-1] == '\t'))
        end--;
    *end = '\0';
    return s;
}

/* Extract value after "key: " */
static const char *ykv(const char *line, const char *key) {
    size_t klen = strlen(key);
    if (strncmp(line, key, klen) != 0) return NULL;
    const char *p = line + klen;
    if (*p != ':') return NULL;
    p++;
    while (*p == ' ') p++;
    return p;
}

/* Count leading spaces */
static int yindent(const char *line) {
    int n = 0;
    while (line[n] == ' ') n++;
    return n;
}

/* ---- File reading ---- */

static char *read_file(const char *path) {
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    fseek(f, 0, SEEK_SET);
    if (sz <= 0) { fclose(f); return NULL; }
    char *buf = malloc(sz + 1);
    if (!buf) { fclose(f); return NULL; }
    size_t nread = fread(buf, 1, sz, f);
    buf[nread] = '\0';
    fclose(f);
    return buf;
}

/* ---- Directory scanning ---- */

#include <dirent.h>
#include <sys/stat.h>

static int is_dir(const char *path) {
    struct stat st;
    return stat(path, &st) == 0 && S_ISDIR(st.st_mode);
}

static int has_suffix(const char *name, const char *suffix) {
    size_t nlen = strlen(name);
    size_t slen = strlen(suffix);
    if (nlen < slen) return 0;
    return strcmp(name + nlen - slen, suffix) == 0;
}

/* ---- Model parser ---- */

static void free_source(catalog_source *s) {
    free(s->type);
    free(s->repo_id);
    free(s->url);
    free(s->filename);
}

static void free_model(catalog_model *m) {
    free(m->id);
    free(m->genre);
    free(m->label);
    free(m->description);
    free_source(&m->source);
    for (size_t i = 0; i < m->n_variant_groups; i++) {
        catalog_variant_group *vg = &m->variant_groups[i];
        free(vg->name);
        free(vg->label);
        for (size_t j = 0; j < vg->n_options; j++) {
            free(vg->options[j].id);
            free(vg->options[j].label);
            free(vg->options[j].filename);
        }
        free(vg->options);
    }
    free(m->variant_groups);
    for (size_t i = 0; i < m->n_loras; i++) {
        free(m->loras[i].id);
        free(m->loras[i].label);
        free(m->loras[i].category);
        free_source(&m->loras[i].source);
    }
    free(m->loras);
    for (size_t i = 0; i < m->n_defaults; i++) {
        free(m->default_keys[i]);
        free(m->default_vals[i]);
    }
    free(m->default_keys);
    free(m->default_vals);
    free(m->engine_plugin);
    free(m->agent_md_path);
}

static catalog_model *parse_model_yaml(const char *yaml) {
    catalog_model *m = calloc(1, sizeof(*m));
    if (!m) return NULL;

    char *buf = strdup(yaml);
    char *saveptr = NULL;
    char *line = strtok_r(buf, "\n", &saveptr);

    int section = 0;  /* 0=none, 1=family, 2=source, 3=defaults, 4=engine */
    int in_source = 0;
    int in_defaults = 0;
    int in_engine = 0;

    /* Defaults accumulator */
    size_t cap_def = 16;
    m->default_keys = malloc(cap_def * sizeof(char *));
    m->default_vals = malloc(cap_def * sizeof(char *));

    while (line) {
        int indent = yindent(line);
        char *s = ystrip(line);
        if (*s == '\0' || *s == '#') {
            line = strtok_r(NULL, "\n", &saveptr);
            continue;
        }

        /* Top-level sections */
        if (indent == 0) {
            if (strcmp(s, "family:") == 0)      { section = 1; }
            else if (strcmp(s, "source:") == 0)      { section = 2; }
            else if (strcmp(s, "defaults:") == 0)    { section = 3; }
            else if (strcmp(s, "engine:") == 0)      { section = 4; }
            else if (strncmp(s, "variant_groups:", 15) == 0) { section = 5; }
            else if (strncmp(s, "lora_catalog:", 13) == 0) { section = 6; }
            else { section = 0; }
        }

        const char *val;

        /* Family section */
        if (section == 1 && indent == 2) {
            if ((val = ykv(s, "id")) != NULL)       { free(m->id); m->id = ystrdup(val); }
            if ((val = ykv(s, "genre")) != NULL)     { free(m->genre); m->genre = ystrdup(val); }
            if ((val = ykv(s, "label")) != NULL)     { free(m->label); m->label = ystrdup(val); }
            if ((val = ykv(s, "description")) != NULL) { free(m->description); m->description = ystrdup(val); }
        }

        /* Source section */
        if (section == 2 && indent == 2) {
            if ((val = ykv(s, "type")) != NULL)      { free(m->source.type); m->source.type = ystrdup(val); }
            if ((val = ykv(s, "repo_id")) != NULL)   { free(m->source.repo_id); m->source.repo_id = ystrdup(val); }
            if ((val = ykv(s, "url")) != NULL)       { free(m->source.url); m->source.url = ystrdup(val); }
            if ((val = ykv(s, "filename")) != NULL)  { free(m->source.filename); m->source.filename = ystrdup(val); }
        }

        /* Defaults section */
        if (section == 3 && indent == 2) {
            const char *colon = strchr(s, ':');
            if (colon) {
                size_t klen = (size_t)(colon - s);
                const char *v = colon + 1;
                while (*v == ' ') v++;
                if (m->n_defaults >= cap_def) {
                    cap_def *= 2;
                    m->default_keys = realloc(m->default_keys, cap_def * sizeof(char *));
                    m->default_vals = realloc(m->default_vals, cap_def * sizeof(char *));
                }
                m->default_keys[m->n_defaults] = strndup(s, klen);
                m->default_vals[m->n_defaults] = ystrdup(v);
                m->n_defaults++;
            }
        }

        /* Engine section */
        if (section == 4 && indent == 2) {
            if ((val = ykv(s, "plugin")) != NULL) {
                free(m->engine_plugin);
                m->engine_plugin = ystrdup(val);
            }
        }

        line = strtok_r(NULL, "\n", &saveptr);
    }

    free(buf);
    return m;
}

/* ---- Card parser ---- */

static void free_card(catalog_card *c) {
    free(c->id);
    free(c->label);
    free(c->description);
    free(c->genre);
    free(c->icon);
    for (size_t i = 0; i < c->n_families; i++) free(c->family_ids[i]);
    free(c->family_ids);
    for (size_t i = 0; i < c->n_principles; i++) free(c->principles[i]);
    free(c->principles);
    free(c->parameters_yaml);
    for (size_t i = 0; i < c->n_skills; i++) {
        free(c->skill_ids[i]);
        free(c->skill_labels[i]);
    }
    free(c->skill_ids);
    free(c->skill_labels);
}

static catalog_card *parse_card_yaml(const char *yaml) {
    catalog_card *c = calloc(1, sizeof(*c));
    if (!c) return NULL;

    char *buf = strdup(yaml);
    char *saveptr = NULL;
    char *line = strtok_r(buf, "\n", &saveptr);

    int section = 0;  /* 0=none, 1=card, 2=families, 3=principles, 4=skills */

    size_t cap_fam = 8, cap_prin = 8, cap_skill = 8;
    c->family_ids = malloc(cap_fam * sizeof(char *));
    c->principles = malloc(cap_prin * sizeof(char *));
    c->skill_ids = malloc(cap_skill * sizeof(char *));
    c->skill_labels = malloc(cap_skill * sizeof(char *));

    while (line) {
        int indent = yindent(line);
        char *s = ystrip(line);
        if (*s == '\0' || *s == '#') {
            line = strtok_r(NULL, "\n", &saveptr);
            continue;
        }

        if (indent == 0) {
            if (strcmp(s, "card:") == 0)      { section = 1; }
            else if (strcmp(s, "families:") == 0)   { section = 2; }
            else if (strcmp(s, "principles:") == 0)  { section = 3; }
            else if (strncmp(s, "parameters:", 11) == 0) { section = 4; }
            else if (strncmp(s, "skills:", 7) == 0)  { section = 5; }
            else { section = 0; }
        }

        const char *val;

        /* Card section */
        if (section == 1 && indent == 2) {
            if ((val = ykv(s, "id")) != NULL)          { free(c->id); c->id = ystrdup(val); }
            if ((val = ykv(s, "label")) != NULL)       { free(c->label); c->label = ystrdup(val); }
            if ((val = ykv(s, "description")) != NULL) { free(c->description); c->description = ystrdup(val); }
            if ((val = ykv(s, "genre")) != NULL)       { free(c->genre); c->genre = ystrdup(val); }
            if ((val = ykv(s, "icon")) != NULL)        { free(c->icon); c->icon = ystrdup(val); }
        }

        /* Families section */
        if (section == 2 && strncmp(s, "- id:", 5) == 0) {
            const char *fid = ystrip((char *)s + 5);
            if (c->n_families >= cap_fam) {
                cap_fam *= 2;
                c->family_ids = realloc(c->family_ids, cap_fam * sizeof(char *));
            }
            c->family_ids[c->n_families++] = ystrdup(fid);
        }

        /* Principles section */
        if (section == 3 && strncmp(s, "- \"", 3) == 0) {
            const char *p = s + 2;
            /* Extract quoted string */
            const char *start = strchr(p, '"');
            if (start) {
                start++;
                const char *end = strchr(start, '"');
                if (end) {
                    if (c->n_principles >= cap_prin) {
                        cap_prin *= 2;
                        c->principles = realloc(c->principles, cap_prin * sizeof(char *));
                    }
                    c->principles[c->n_principles++] = strndup(start, (size_t)(end - start));
                }
            }
        }

        /* Skills section */
        if (section == 5 && indent == 2) {
            if ((val = ykv(s, "id")) != NULL) {
                if (c->n_skills >= cap_skill) {
                    cap_skill *= 2;
                    c->skill_ids = realloc(c->skill_ids, cap_skill * sizeof(char *));
                    c->skill_labels = realloc(c->skill_labels, cap_skill * sizeof(char *));
                }
                c->skill_ids[c->n_skills] = ystrdup(val);
                c->skill_labels[c->n_skills] = NULL;
                c->n_skills++;
            }
            if ((val = ykv(s, "label")) != NULL && c->n_skills > 0) {
                free(c->skill_labels[c->n_skills - 1]);
                c->skill_labels[c->n_skills - 1] = ystrdup(val);
            }
        }

        line = strtok_r(NULL, "\n", &saveptr);
    }

    free(buf);
    return c;
}

/* ---- Catalog scan ---- */

static void scan_models(inference_catalog *cat, const char *models_dir) {
    DIR *d = opendir(models_dir);
    if (!d) {
        fprintf(stderr, "catalog: cannot open %s\n", models_dir);
        return;
    }

    fprintf(stderr, "catalog: scanning %s\n", models_dir);
    struct dirent *ent;
    while ((ent = readdir(d)) != NULL) {
        if (ent->d_name[0] == '.') continue;

        /* Check if this entry is a directory using full path */
        char dirpath[1024];
        snprintf(dirpath, sizeof(dirpath), "%s/%s", models_dir, ent->d_name);
        if (!is_dir(dirpath)) {
            fprintf(stderr, "catalog: skip %s (not a dir)\n", ent->d_name);
            continue;
        }

        char path[1024];
        snprintf(path, sizeof(path), "%s/%s/model.yaml", models_dir, ent->d_name);

        char *yaml = read_file(path);
        if (!yaml) {
            fprintf(stderr, "catalog: skip %s (no model.yaml)\n", ent->d_name);
            continue;
        }

        fprintf(stderr, "catalog: found %s/%s/model.yaml (%zu bytes)\n",
                models_dir, ent->d_name, strlen(yaml));

        catalog_model *m = parse_model_yaml(yaml);
        free(yaml);

        fprintf(stderr, "catalog: parsed %s -> id=%s\n",
                ent->d_name, m && m->id ? m->id : "NULL");

        if (m && m->id) {
            /* Check for agent.md */
            char agent_path[1024];
            snprintf(agent_path, sizeof(agent_path), "%s/%s/agents/AGENT.md",
                     models_dir, ent->d_name);
            /* Check if file exists */
            FILE *af = fopen(agent_path, "r");
            if (af) {
                fclose(af);
                m->agent_md_path = strdup(agent_path);
            }

            /* Grow array */
            cat->n_models++;
            cat->models = realloc(cat->models,
                                  cat->n_models * sizeof(catalog_model));
            cat->models[cat->n_models - 1] = *m;
            free(m);
        } else {
            if (m) free_model(m);
            free(m);
        }
    }
    closedir(d);
}

static void scan_cards(inference_catalog *cat, const char *cards_dir) {
    DIR *d = opendir(cards_dir);
    if (!d) {
        fprintf(stderr, "catalog: cannot open %s\n", cards_dir);
        return;
    }

    struct dirent *ent;
    while ((ent = readdir(d)) != NULL) {
        if (ent->d_name[0] == '.') continue;

        /* Check if this entry is a directory using full path */
        char dirpath[1024];
        snprintf(dirpath, sizeof(dirpath), "%s/%s", cards_dir, ent->d_name);
        if (!is_dir(dirpath)) continue;

        char path[1024];
        snprintf(path, sizeof(path), "%s/%s/card.yaml", cards_dir, ent->d_name);

        char *yaml = read_file(path);
        if (!yaml) continue;

        catalog_card *c = parse_card_yaml(yaml);
        free(yaml);

        if (c && c->id) {
            cat->n_cards++;
            cat->cards = realloc(cat->cards,
                                 cat->n_cards * sizeof(catalog_card));
            cat->cards[cat->n_cards - 1] = *c;
            free(c);
        } else {
            if (c) free_card(c);
            free(c);
        }
    }
    closedir(d);
}

inference_catalog *catalog_scan(const char *models_dir,
                                const char *cards_dir,
                                const char *agents_dir) {
    inference_catalog *cat = calloc(1, sizeof(*cat));
    if (!cat) return NULL;

    cat->models_dir = ystrdup(models_dir);
    cat->cards_dir = ystrdup(cards_dir);
    cat->agents_dir = ystrdup(agents_dir);

    scan_models(cat, models_dir);
    scan_cards(cat, cards_dir);

    /* Scan agents directory and link to models */
    if (agents_dir) {
        DIR *ad = opendir(agents_dir);
        if (ad) {
            struct dirent *ent;
            while ((ent = readdir(ad)) != NULL) {
                if (ent->d_name[0] == '.') continue;
                char dirpath[1024];
                snprintf(dirpath, sizeof(dirpath), "%s/%s", agents_dir, ent->d_name);
                if (!is_dir(dirpath)) continue;

                /* Look for AGENT.md */
                char agent_file[1024];
                snprintf(agent_file, sizeof(agent_file), "%s/%s/AGENT.md",
                         agents_dir, ent->d_name);
                FILE *af = fopen(agent_file, "r");
                if (!af) continue;
                fclose(af);

                /* Link to matching model */
                for (size_t i = 0; i < cat->n_models; i++) {
                    if (cat->models[i].id &&
                        strcmp(cat->models[i].id, ent->d_name) == 0) {
                        if (!cat->models[i].agent_md_path)
                            cat->models[i].agent_md_path = strdup(agent_file);
                        break;
                    }
                }
            }
            closedir(ad);
        }
    }

    fprintf(stderr, "catalog: scanned %zu models, %zu cards\n",
            cat->n_models, cat->n_cards);
    return cat;
}

/* ---- Lookup ---- */

const catalog_model *catalog_find_model(const inference_catalog *cat,
                                        const char *family_id) {
    if (!cat || !family_id) return NULL;
    for (size_t i = 0; i < cat->n_models; i++) {
        if (cat->models[i].id && strcmp(cat->models[i].id, family_id) == 0)
            return &cat->models[i];
    }
    return NULL;
}

const catalog_card *catalog_find_card(const inference_catalog *cat,
                                      const char *card_id) {
    if (!cat || !card_id) return NULL;
    for (size_t i = 0; i < cat->n_cards; i++) {
        if (cat->cards[i].id && strcmp(cat->cards[i].id, card_id) == 0)
            return &cat->cards[i];
    }
    return NULL;
}

size_t catalog_cards_for_family(const inference_catalog *cat,
                                const char *family_id,
                                const catalog_card **out, size_t max_out) {
    if (!cat || !family_id) return 0;
    size_t count = 0;
    for (size_t i = 0; i < cat->n_cards && count < max_out; i++) {
        for (size_t j = 0; j < cat->cards[i].n_families; j++) {
            if (strcmp(cat->cards[i].family_ids[j], family_id) == 0) {
                out[count++] = &cat->cards[i];
                break;
            }
        }
    }
    return count;
}

/* ---- JSON serialization ---- */

static void json_escape(char *dst, size_t cap, const char *src) {
    if (!src) { dst[0] = '\0'; return; }
    size_t j = 0;
    for (size_t i = 0; src[i] && j < cap - 2; i++) {
        char c = src[i];
        if (c == '"')  { dst[j++] = '\\'; dst[j++] = '"'; }
        else if (c == '\\') { dst[j++] = '\\'; dst[j++] = '\\'; }
        else if (c == '\n') { dst[j++] = '\\'; dst[j++] = 'n'; }
        else dst[j++] = c;
    }
    dst[j] = '\0';
}

char *catalog_model_to_json(const catalog_model *m) {
    if (!m) return strdup("{}");

    char esc[2048];
    size_t cap = 4096;
    char *json = malloc(cap);
    int off = 0;

    off += snprintf(json + off, cap - off, "{");

    /* Family */
    off += snprintf(json + off, cap - off, "\"id\":\"");
    json_escape(esc, sizeof(esc), m->id);
    off += snprintf(json + off, cap - off, "%s\",", esc);

    off += snprintf(json + off, cap - off, "\"genre\":\"");
    json_escape(esc, sizeof(esc), m->genre);
    off += snprintf(json + off, cap - off, "%s\",", esc);

    off += snprintf(json + off, cap - off, "\"label\":\"");
    json_escape(esc, sizeof(esc), m->label);
    off += snprintf(json + off, cap - off, "%s\",", esc);

    off += snprintf(json + off, cap - off, "\"description\":\"");
    json_escape(esc, sizeof(esc), m->description);
    off += snprintf(json + off, cap - off, "%s\",", esc);

    /* Source */
    off += snprintf(json + off, cap - off, "\"source\":{");
    off += snprintf(json + off, cap - off, "\"type\":\"");
    json_escape(esc, sizeof(esc), m->source.type);
    off += snprintf(json + off, cap - off, "%s\"", esc);
    if (m->source.repo_id) {
        off += snprintf(json + off, cap - off, ",\"repo_id\":\"");
        json_escape(esc, sizeof(esc), m->source.repo_id);
        off += snprintf(json + off, cap - off, "%s\"", esc);
    }
    if (m->source.filename) {
        off += snprintf(json + off, cap - off, ",\"filename\":\"");
        json_escape(esc, sizeof(esc), m->source.filename);
        off += snprintf(json + off, cap - off, "%s\"", esc);
    }
    off += snprintf(json + off, cap - off, "},");

    /* LoRAs */
    off += snprintf(json + off, cap - off, "\"loras\":[");
    for (size_t i = 0; i < m->n_loras; i++) {
        if (i) json[off++] = ',';
        off += snprintf(json + off, cap - off, "{\"id\":\"");
        json_escape(esc, sizeof(esc), m->loras[i].id);
        off += snprintf(json + off, cap - off, "%s\",", esc);
        off += snprintf(json + off, cap - off, "\"label\":\"");
        json_escape(esc, sizeof(esc), m->loras[i].label);
        off += snprintf(json + off, cap - off, "%s\"}", esc);
    }
    off += snprintf(json + off, cap - off, "],");

    /* Defaults */
    off += snprintf(json + off, cap - off, "\"defaults\":{");
    for (size_t i = 0; i < m->n_defaults; i++) {
        if (i) json[off++] = ',';
        off += snprintf(json + off, cap - off, "\"");
        json_escape(esc, sizeof(esc), m->default_keys[i]);
        off += snprintf(json + off, cap - off, "%s\":", esc);
        json_escape(esc, sizeof(esc), m->default_vals[i]);
        off += snprintf(json + off, cap - off, "%s", esc);
    }
    off += snprintf(json + off, cap - off, "},");

    /* Engine */
    off += snprintf(json + off, cap - off, "\"engine\":\"");
    json_escape(esc, sizeof(esc), m->engine_plugin);
    off += snprintf(json + off, cap - off, "%s\"", esc);

    /* Agent */
    if (m->agent_md_path) {
        off += snprintf(json + off, cap - off, ",\"has_agent\":true");
    }

    off += snprintf(json + off, cap - off, "}");
    return json;
}

char *catalog_card_to_json(const catalog_card *c) {
    if (!c) return strdup("{}");

    char esc[2048];
    size_t cap = 4096;
    char *json = malloc(cap);
    int off = 0;

    off += snprintf(json + off, cap - off, "{");

    off += snprintf(json + off, cap - off, "\"id\":\"");
    json_escape(esc, sizeof(esc), c->id);
    off += snprintf(json + off, cap - off, "%s\",", esc);

    off += snprintf(json + off, cap - off, "\"label\":\"");
    json_escape(esc, sizeof(esc), c->label);
    off += snprintf(json + off, cap - off, "%s\",", esc);

    off += snprintf(json + off, cap - off, "\"description\":\"");
    json_escape(esc, sizeof(esc), c->description);
    off += snprintf(json + off, cap - off, "%s\",", esc);

    off += snprintf(json + off, cap - off, "\"genre\":\"");
    json_escape(esc, sizeof(esc), c->genre);
    off += snprintf(json + off, cap - off, "%s\",", esc);

    /* Families */
    off += snprintf(json + off, cap - off, "\"families\":[");
    for (size_t i = 0; i < c->n_families; i++) {
        if (i) json[off++] = ',';
        off += snprintf(json + off, cap - off, "\"");
        json_escape(esc, sizeof(esc), c->family_ids[i]);
        off += snprintf(json + off, cap - off, "%s\"", esc);
    }
    off += snprintf(json + off, cap - off, "],");

    /* Principles */
    off += snprintf(json + off, cap - off, "\"principles\":[");
    for (size_t i = 0; i < c->n_principles; i++) {
        if (i) json[off++] = ',';
        off += snprintf(json + off, cap - off, "\"");
        json_escape(esc, sizeof(esc), c->principles[i]);
        off += snprintf(json + off, cap - off, "%s\"", esc);
    }
    off += snprintf(json + off, cap - off, "],");

    /* Skills */
    off += snprintf(json + off, cap - off, "\"skills\":[");
    for (size_t i = 0; i < c->n_skills; i++) {
        if (i) json[off++] = ',';
        off += snprintf(json + off, cap - off, "{\"id\":\"");
        json_escape(esc, sizeof(esc), c->skill_ids[i]);
        off += snprintf(json + off, cap - off, "%s\",", esc);
        off += snprintf(json + off, cap - off, "\"label\":\"");
        json_escape(esc, sizeof(esc), c->skill_labels ? c->skill_labels[i] : "");
        off += snprintf(json + off, cap - off, "%s\"}", esc);
    }
    off += snprintf(json + off, cap - off, "]");

    off += snprintf(json + off, cap - off, "}");
    return json;
}

char *catalog_to_json(const inference_catalog *cat) {
    if (!cat) return strdup("{\"models\":[],\"cards\":[]}");

    size_t cap = cat->n_models * 2048 + cat->n_cards * 2048 + 256;
    char *json = malloc(cap);
    int off = 0;

    off += snprintf(json + off, cap - off, "{\"models\":[");
    for (size_t i = 0; i < cat->n_models; i++) {
        if (i) json[off++] = ',';
        char *mjson = catalog_model_to_json(&cat->models[i]);
        size_t mlen = strlen(mjson);
        if (off + mlen < cap) {
            memcpy(json + off, mjson, mlen);
            off += mlen;
        }
        free(mjson);
    }
    off += snprintf(json + off, cap - off, "],\"cards\":[");

    for (size_t i = 0; i < cat->n_cards; i++) {
        if (i) json[off++] = ',';
        char *cjson = catalog_card_to_json(&cat->cards[i]);
        size_t clen = strlen(cjson);
        if (off + clen < cap) {
            memcpy(json + off, cjson, clen);
            off += clen;
        }
        free(cjson);
    }
    off += snprintf(json + off, cap - off, "]}");

    return json;
}

void catalog_free(inference_catalog *cat) {
    if (!cat) return;
    for (size_t i = 0; i < cat->n_models; i++)
        free_model(&cat->models[i]);
    free(cat->models);
    for (size_t i = 0; i < cat->n_cards; i++)
        free_card(&cat->cards[i]);
    free(cat->cards);
    free(cat->models_dir);
    free(cat->cards_dir);
    free(cat->agents_dir);
    free(cat);
}
