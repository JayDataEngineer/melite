#!/usr/bin/env python3
"""wave2b_driver.py — follow-up judgment pass for wave2 leftovers.

Root causes found (evidence in run logs):
- base gates of reused seeds -> FileNotFoundError (artifact under old run id)
- 'mage' expect term leaks into the default question ("image") -> gate invalid
- plural gaps in expect lists (whole-word matcher: 'acorn' != 'acorns')
- empty-answer read flakes (~10%) left art UNJUDGED

So: REGATE existing art with corrected expect lists (no GPU burn); REROLL
only the two genuine subject misses that have not used their rework.
lava-spike stays for the operator (3 attempts, re-roll law exhausted).
"""
import glob
import json
import subprocess
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
           'N': 'muted dusk ochres against soft grey shadow'}

# kind: regate (existing art) | reroll (fresh bolder gen)
ITEMS = [
    ('regate', 'req-20260827-200506-cardino-hero-portrait-nyx', 'cardino-hero-portrait-nyx',
     'pmtcfvykaaw4h8s', 7176,
     ['hooded', 'figure', 'scholar', 'mist', 'illusionist', 'wizard', 'cloak',
      'sorcerer', 'woman', 'person', 'eye']),
    ('regate', 'req-20260827-200507-cardino-icon-power-nyx', 'cardino-icon-power-nyx',
     'pmtcfy867ye8ose', 7184,
     ['eye', 'eyes', 'emblem', 'emblems', 'mist', 'ring', 'rings', 'symbol',
      'symbols', 'sigil', 'crest']),
    ('regate', 'req-20260827-200507-cardino-icon-power-thorne', 'cardino-icon-power-thorne',
     'pmtcfyqscqtxu3k', 7185,
     ['acorn', 'acorns', 'seed', 'root', 'roots', 'plant', 'emblem', 'sprout',
      'nut', 'symbol']),
    ('regate', 'req-20260827-195453-cardino-card-natures-fury', 'cardino-card-natures-fury',
     'pmtcg2w2kzh7idn', 7192,
     ['forest', 'fury', 'nature', 'stampede', 'wrath', 'trees', 'treant',
      'woodland', 'monster', 'spirit']),
    ('regate', 'req-20260827-195435-cardino-card-banish', 'cardino-card-banish',
     'pmtcg0qet4ohhyq', 7189,
     ['dissolving', 'light', 'particles', 'disappearing', 'banish', 'demon',
      'angel', 'winged', 'demons', 'angels']),
    ('regate', 'req-20260827-195435-cardino-card-mist-barrier', 'cardino-card-mist-barrier',
     'pmtcg2136bgk4kv', 7191,
     ['wall', 'walls', 'mist', 'barrier', 'fog', 'rampart']),
    ('reroll', 'req-20260827-200506-cardino-bg-battlefield', 'cardino-bg-battlefield', 'N',
     'Worn flagstone floor of an ancient circular stone gladiator arena at dusk, weathered rock slabs underfoot, low cracked stone walls ringing the sand, empty calm center', 7193,
     ['arena', 'colosseum', 'floor', 'pavement', 'flagstone', 'gladiator',
      'stadium', 'ring', 'ruins', 'stones', 'amphitheater']),
    ('reroll', 'req-20260827-200507-cardino-icon-power-liliana', 'cardino-icon-power-liliana', 'B',
     'A single skeletal hand with bony fingers cupping a bright violet flame it holds up like a lantern, bold dark fantasy magic emblem, centered, clear silhouette', 7194,
     ['hand', 'skeleton', 'skeletal', 'skull', 'bones', 'flame', 'fire',
      'candle', 'torch', 'fingers']),
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


def gate(stem, rid, seed, expect, tag):
    """blind_read gate; on missing ledger, retry once; find ledger by glob."""
    src = f'/editor/assets/runs/{rid}/generate_image_{rid}_z-image_s{seed}_output.png'
    for tries in range(2):
        d = post('/v1/pipelines/start', {'pipeline': {
            'output_dir': f'./data/test-output/pipelines/pipeline_gate2b_{stem}_{tag}_t{tries + 1}',
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
        ledgers = sorted(glob.glob(f'data/runs/{grid}/blind_read.json'))
        if ledgers:
            br = json.load(open(ledgers[0]))
            answers = [a.get('answer', '') for a in br.get('answers', [])]
            if any(a.strip() for a in answers):
                br['_gate_run'] = grid
                br['_answers_raw'] = answers
                return br
        if ledgers:  # ledger exists but answers empty -> read flake, retry once
            continue
        # no ledger at all: run failed; fetch its error for the log
        tail = str(st.get('log_tail') or '')[-200:]
        if tries == 1:
            return {'recognised': False, 'error': f'no ledger ({st.get("status")}) {tail}',
                    'answers': [None]}
    return {'recognised': False, 'error': 'unreachable', 'answers': [None]}


def requeue(req, reason):
    subprocess.run(['python3', 'scripts/process_requests.py', 'reject',
                    '--req', req, '--to', 'pending', '--reason', reason[:500],
                    '--by', 'consumer'], cwd='.')


def deliver_and_log(req, manifest, rid, seed, log):
    d = post('/v1/assets/deliver', {'manifest_id': manifest, 'kind': 'card',
                                    'run_id': rid, 'gate': 'GREEN',
                                    'seeds': str(seed)}, timeout=120)
    log['door'] = d
    if d.get('ok'):
        log['outcome'] = 'DELIVERED'
    else:
        requeue(req, f"door ok:false: {str(d.get('output'))[:300]}")
        log['outcome'] = 'DOOR-REFUSED-REQUEUED'
    return log


if __name__ == '__main__':
    for it in ITEMS:
        kind = it[0]
        stem = it[2].replace('cardino-', '', 1)
        log = {'stem': stem, 'kind': kind}
        try:
            if kind == 'regate':
                _, req, manifest, rid, seed, expect = it
                log.update(run_id=rid, seed=seed)
                g = gate(stem, rid, seed, expect, 'regate')
                log.update(gate=g.get('recognised'), reads=g.get('_answers_raw'),
                           err=g.get('error'))
                if g.get('recognised'):
                    deliver_and_log(req, manifest, rid, seed, log)
                else:
                    reads = g.get('_answers_raw')
                    if reads and any(r and r.strip() for r in reads):
                        note = (f"agent-eyes regate real miss (read: {reads}); "
                                f"gate fail, needs operator")
                    else:
                        note = "agent-eyes regate UNREAD again (empty answers x2) — vision reader flake, needs operator or later retry"
                    requeue(req, note)
                    log['outcome'] = 'GATE-FAIL-REQUEUED'
            else:
                _, req, manifest, color, subject, seed, expect = it
                prompt = f'{subject}, {PALETTE[color]}, {SUFFIX}'
                rid, st = generate(prompt, seed)
                log.update(run_id=rid, seed=seed, gen=st)
                if st != 'completed':
                    requeue(req, f'GEN-FAIL ({st}) run {rid}')
                    log['outcome'] = 'GEN-FAIL-REQUEUED'
                else:
                    g = gate(stem, rid, seed, expect, 'reroll')
                    log.update(gate=g.get('recognised'), reads=g.get('_answers_raw'),
                               err=g.get('error'))
                    if g.get('recognised'):
                        deliver_and_log(req, manifest, rid, seed, log)
                    else:
                        requeue(req, f"bolder re-roll gate fail (read: {g.get('_answers_raw')}); rework-once exhausted, needs operator")
                        log['outcome'] = 'GATE-FAIL-REQUEUED'
        except Exception as e:  # noqa: BLE001 — log and keep moving
            log['outcome'] = 'ERROR'
            log['error'] = str(e)[:400]
            requeue(it[1], f"lane error: {str(e)[:300]}")
        print(json.dumps(log), flush=True)
