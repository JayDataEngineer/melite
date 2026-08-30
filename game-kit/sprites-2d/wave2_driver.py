#!/usr/bin/env python3
"""wave2_driver.py — cardino wave 2 (portraits, bg, mana gems, power icons,
logo + taste-disputed card re-rolls). One lane at a time (serial GPU law).

Per item: z-image 1024 flat generation (seed 71xx family) -> blind_read
agent-eyes gate (neutral read, retry-once on missing blind_read.json flake)
-> gateway CARD DOOR delivery. The door claims the request itself, so
requests must sit PENDING at deliver time. No local delivery writes.
"""
import json
import subprocess
import sys
import time
import urllib.request

BASE = 'http://127.0.0.1:33081'
SUFFIX = ('painterly dark fantasy trading card illustration, dramatic rim '
          'lighting, detailed visible brushwork, centered iconic composition, '
          'no text, no border, square format')
PALETTE = {'U': 'deep teals and storm-blue shadow',
           'W': 'pale gold light against soft grey shadow',
           'B': 'violet-blacks and ashen shadow',
           'G': 'rich deep greens against shadow',
           'R': 'rich deep reds and charcoal shadow',
           'N': 'muted dusk ochres against soft grey shadow'}

# manifest_id == FULL asset_id; door derives the png stem automatically.
# items: (req_id, manifest_id, color, subject, seed, expect, rework_subject, rework_seed)
# taste-disputed cards carry a bolder more-literal rework subject (ONE re-roll law).
ITEMS = [
    # ---- P1: hero portraits + battlefield bg (subject verbatim from request spec)
    ('req-20260827-200505-cardino-hero-portrait-thorne', 'cardino-hero-portrait-thorne', 'G',
     'Wild-lands warden, weathered bark-skinned guardian with living-wood antlers, moss cloak, stone-still calm eyes, feral wisdom, deep green forest gloom behind', 7172,
     ['warden', 'guardian', 'druid', 'ranger', 'man', 'tree', 'forest', 'antlers', 'knight'], None, None),
    ('req-20260827-200506-cardino-bg-battlefield', 'cardino-bg-battlefield', 'N',
     'Ancient stone duel arena at dusk, worn runic flagstones, faint color-neutral magic haze at the edges, calm unobtrusive center, dark fantasy atmosphere', 7173,
     ['arena', 'colosseum', 'ruins', 'stone', 'stadium', 'courtyard', 'amphitheater', 'floor', 'pavement'], None, None),
    ('req-20260827-200506-cardino-hero-portrait-aurelia', 'cardino-hero-portrait-aurelia', 'W',
     'Knight commander, silver-armored warrior queen with gold filigree, white mantle, resolute merciful gaze, unwavering banner light, dawn glow behind', 7174,
     ['knight', 'queen', 'warrior', 'paladin', 'armor', 'armored', 'woman', 'commander'], None, None),
    ('req-20260827-200506-cardino-hero-portrait-ignis', 'cardino-hero-portrait-ignis', 'R',
     'Fire warlord, scarred red-skinned bruiser with molten cracks along the jaw, wild flame hair, reckless grin, explosive temper, ember storm behind', 7175,
     ['warlord', 'warrior', 'fire', 'demon', 'bruiser', 'man', 'flame', 'fighter'], None, None),
    ('req-20260827-200506-cardino-hero-portrait-nyx', 'cardino-hero-portrait-nyx', 'U',
     'Mist illusionist, hooded scholar veiled in pale blue mist, starlit runes floating around one visible curious eye, enigmatic mild amusement, deep-sea dusk behind', 7176,
     ['hooded', 'figure', 'scholar', 'mage', 'mist', 'illusionist', 'wizard', 'cloak', 'sorcerer'], None, None),
    # ---- P2: mana gems (anchor mana-r 7120 delivered)
    ('req-20260827-200506-cardino-mana-b', 'cardino-mana-b', 'B',
     'Black mana gem, obsidian-purple skull-tinted crystal orb with violet necromantic glow, dark fantasy faceted cut, centered on a dark backdrop', 7177,
     ['gem', 'crystal', 'orb', 'jewel', 'sphere', 'ball', 'diamond'], None, None),
    ('req-20260827-200506-cardino-mana-u', 'cardino-mana-u', 'U',
     'Blue mana gem, deep-sea sapphire crystal orb with drifting mist inside, dark fantasy faceted cut, centered on a dark backdrop', 7178,
     ['gem', 'crystal', 'orb', 'jewel', 'sphere', 'ball', 'diamond'], None, None),
    ('req-20260827-200506-cardino-mana-w', 'cardino-mana-w', 'W',
     'White mana gem, radiant sun-white crystal orb with soft inner light, dark fantasy faceted cut, centered on a dark backdrop', 7179,
     ['gem', 'crystal', 'orb', 'jewel', 'sphere', 'ball', 'diamond'], None, None),
    ('req-20260827-200507-cardino-mana-g', 'cardino-mana-g', 'G',
     'Green mana gem, verdant emerald crystal orb with a coiling vine inside, dark fantasy faceted cut, centered on a dark backdrop', 7180,
     ['gem', 'crystal', 'orb', 'jewel', 'sphere', 'ball', 'diamond'], None, None),
    # ---- P2: hero power icons (clear silhouette at 24px)
    ('req-20260827-200507-cardino-icon-power-aurelia', 'cardino-icon-power-aurelia', 'W',
     'Radiant winged shield sigil, hero power emblem, bold dark fantasy crest, clear silhouette', 7181,
     ['shield', 'emblem', 'sigil', 'crest', 'winged', 'wings', 'symbol', 'badge'], None, None),
    ('req-20260827-200507-cardino-icon-power-ignis', 'cardino-icon-power-ignis', 'R',
     'Clenched fist wreathed in an explosion of sparks, hero power emblem, bold dark fantasy crest, clear silhouette', 7182,
     ['fist', 'hand', 'emblem', 'sparks', 'fire', 'punch', 'flame', 'symbol'], None, None),
    ('req-20260827-200507-cardino-icon-power-liliana', 'cardino-icon-power-liliana', 'B',
     'Skeletal hand cupping a violet soul-flame, hero power emblem, bold dark fantasy crest, clear silhouette', 7183,
     ['skull', 'skeleton', 'hand', 'flame', 'fire', 'bone', 'emblem', 'candle'], None, None),
    ('req-20260827-200507-cardino-icon-power-nyx', 'cardino-icon-power-nyx', 'U',
     'Open eye inside a swirling mist ring, hero power emblem, bold dark fantasy crest, clear silhouette', 7184,
     ['eye', 'emblem', 'mist', 'ring', 'symbol', 'sigil', 'crest'], None, None),
    ('req-20260827-200507-cardino-icon-power-thorne', 'cardino-icon-power-thorne', 'G',
     'Sprouting acorn split by a living root, hero power emblem, bold dark fantasy crest, clear silhouette', 7185,
     ['acorn', 'seed', 'root', 'plant', 'emblem', 'sprout', 'nut', 'symbol'], None, None),
    # ---- P2: game logo mark (crest shape only — NEVER text)
    ('req-20260827-200508-cardino-logo', 'cardino-logo', 'N',
     'Stylized arcane spade crest formed from five interlocking color shards, white blue black red and green, bold dark fantasy game emblem, readable at small size', 7186,
     ['logo', 'crest', 'emblem', 'spade', 'symbol', 'sigil', 'badge', 'star'], None, None),
    # ---- taste-disputed cards: ONE bolder more-literal re-roll + fresh seed
    ('req-20260827-195432-cardino-card-wild-beast', 'cardino-card-wild-beast', 'G',
     'Hulking feral beast all muscle and tusks charging through broken undergrowth, hunger is the only law', 7113,
     ['beast', 'monster', 'animal', 'predator', 'boar'],
     'Massive tusked wild boar charging head-on through broken forest undergrowth, bristled dark fur, huge curved tusks, furious eyes, all muscle', 7187),
    ('req-20260827-195434-cardino-card-lava-spike', 'cardino-card-lava-spike', 'R',
     'Spear of molten lava hurtling toward the viewer, white-hot tip, volcanic fury — a gift delivered fast and kept forever', 7128,
     ['lava', 'molten', 'magma', 'spear', 'projectile', 'fire'],
     'A single spear-shaped spike of glowing molten lava flying straight toward the viewer against a dark volcanic sky, white-hot pointed tip, trailing embers', 7188),
    ('req-20260827-195435-cardino-card-banish', 'cardino-card-banish', 'W',
     'Dark creature dissolving into white-gold particles of light as it is torn from the world — some stains are removed, not washed out', 7134,
     ['dissolving', 'light', 'particles', 'disappearing', 'banish', 'demon', 'angel', 'winged'],
     'A dark winged demon being torn upward into white-gold particles of light, half its body already dissolving into radiant sparks against shadow', 7189),
    ('req-20260827-195435-cardino-card-judgment-of-the-sky', 'cardino-card-judgment-of-the-sky', 'W',
     'The sky opening with blinding heavenly light striking judgment down upon the earth below — and the sky said enough', 7136,
     ['sky', 'light', 'judgment', 'heavens', 'divine', 'beam', 'clouds'],
     'A single blinding beam of heavenly light striking down from parted storm clouds onto a dark plain below, divine judgment made visible', 7190),
    ('req-20260827-195435-cardino-card-mist-barrier', 'cardino-card-mist-barrier', 'U',
     'Wall of living mist shaped like a fortress rampart, semi-solid illusion wall across a dark shore — you may pass, it will decide when', 7137,
     ['wall', 'mist', 'barrier', 'fog', 'rampart'],
     'A tall solid wall of glowing pale mist standing like a fortress rampart across the frame, semi-solid fog bricks, faint shoreline behind it', 7191),
    ('req-20260827-195453-cardino-card-natures-fury', 'cardino-card-natures-fury', 'G',
     'The forest itself rising in fury, uprooted trees and a stampede of beasts moving as one wrath — the wild does not negotiate', 7147,
     ['forest', 'fury', 'nature', 'stampede', 'wrath', 'trees'],
     'The forest itself rising in wrath, a colossal vengeful woodland spirit of uprooted animated trees striding forward as one furious wall of wood and leaves', 7192),
]


def post(path, body, timeout=90):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=timeout))


def generate(prompt, seed):
    d = post('/v1/pipelines/start', {'model': 'z-image', 'prompt': prompt,
                                     'seed': seed, 'width': 1024, 'height': 1024})
    rid = d['run_id']
    for _ in range(60):
        time.sleep(4)
        s = json.load(urllib.request.urlopen(f'{BASE}/v1/pipelines/status/{rid}', timeout=15))
        if s.get('status') in ('completed', 'failed'):
            return rid, s.get('status')
    return rid, 'timeout'


def gate(stem, rid, seed, expect, attempt):
    src = f'/editor/assets/runs/{rid}/generate_image_{rid}_z-image_s{seed}_output.png'
    for tries in range(2):
        d = post('/v1/pipelines/start', {'pipeline': {
            'output_dir': f'./data/test-output/pipelines/pipeline_gate_{stem}_a{attempt}_t{tries + 1}',
            'shared': {'comfy_url': 'http://127.0.0.1:18465'},
            'steps': [
                {'family': 'input', 'params': {'model': 'input', 'source': src,
                 'output_artifact': 'card'}, 'inputs': [], 'outputs': ['card']},
                {'family': 'blind_read', 'params': {'model': 'blind_read',
                 'images': ['card'], 'expect': expect, 'fail_on': 'never',
                 'output_artifact': 'br'}, 'inputs': ['card'], 'outputs': ['br']}]}})
        grid = d['run_id']
        for _ in range(30):
            time.sleep(4)
            st = json.load(urllib.request.urlopen(f'{BASE}/v1/pipelines/status/{grid}', timeout=15))
            if st.get('status') in ('completed', 'failed'):
                break
        try:
            br = json.load(open(f'data/runs/{grid}/blind_read.json'))
        except FileNotFoundError:
            if tries == 1:
                return {'recognised': False, 'error': f'no blind_read.json x2 ({st.get("status")})',
                        'answers': [None]}
            continue
        answers = [a.get('answer', '') for a in br.get('answers', [])]
        if any(a.strip() for a in answers) or tries == 1:
            br['_gate_run'] = grid
            br['_answers_raw'] = answers
            return br
    return {'recognised': False, 'error': 'unreachable', 'answers': [None]}


def requeue(req, reason):
    subprocess.run(['python3', 'scripts/process_requests.py', 'reject',
                    '--req', req, '--to', 'pending', '--reason', reason[:500],
                    '--by', 'consumer'], cwd='.')


def run_item(it):
    (req, manifest, color, subject, seed, expect, rework_subject, rework_seed) = it
    stem = manifest.replace('cardino-', '', 1)
    log = {'stem': stem, 'req': req, 'seed': seed}
    base_prompt = f'{subject}, {PALETTE[color]}, {SUFFIX}'
    rid, st = generate(base_prompt, seed)
    log.update(run_id=rid, gen=st)
    if st != 'completed':
        requeue(req, f'GEN-FAIL ({st}) run {rid} — requeueing for retry')
        log['outcome'] = 'GEN-FAIL-REQUEUED'
        return log
    g = gate(stem, rid, seed, expect, 1)
    log.update(gate1=g.get('recognised'), reads=g.get('_answers_raw'))
    chosen_seed, verdict = seed, None
    if g.get('recognised'):
        verdict = 'GREEN'
    elif rework_subject:  # taste-disputed: ONE bolder literal re-roll, fresh seed
        rid2, st2 = generate(f'{rework_subject}, {PALETTE[color]}, {SUFFIX}', rework_seed)
        log.update(rework_run=rid2, rework_seed=rework_seed, rework_gen=st2)
        if st2 == 'completed':
            g2 = gate(stem, rid2, rework_seed, expect, 2)
            log.update(gate2=g2.get('recognised'), reads2=g2.get('_answers_raw'))
            if g2.get('recognised'):
                rid, chosen_seed, verdict = rid2, rework_seed, 'GREEN'
    if verdict == 'GREEN':
        d = post('/v1/assets/deliver', {'manifest_id': manifest, 'kind': 'card',
                                        'run_id': rid, 'gate': 'GREEN',
                                        'seeds': str(chosen_seed)}, timeout=120)
        log['door'] = d
        if not d.get('ok'):
            requeue(req, f"door ok:false: {str(d.get('output'))[:300]}")
            log['outcome'] = 'DOOR-REFUSED-REQUEUED'
        else:
            log['outcome'] = 'DELIVERED'
    else:
        note = (f"agent-eyes gate fail (this pass reads: {log.get('reads')} / "
                f"{log.get('reads2')}); taste-disputed, needs operator — "
                f"bolder re-roll law exhausted this pass")
        requeue(req, note)
        log['outcome'] = 'GATE-FAIL-REQUEUED'
    return log


if __name__ == '__main__':
    only = sys.argv[1].split(',') if len(sys.argv) > 1 else None
    for it in ITEMS:
        if only and it[1] not in only:
            continue
        try:
            log = run_item(it)
        except Exception as e:  # noqa: BLE001 — log and keep the wave moving
            log = {'stem': it[1], 'outcome': 'ERROR', 'error': str(e)[:400]}
            requeue(it[0], f"lane error: {str(e)[:300]}")
        print(json.dumps(log), flush=True)
