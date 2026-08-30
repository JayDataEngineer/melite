#!/usr/bin/env python3
"""wave2c_driver.py — single-item judgment pass (consumer, 2026-08-28).

ONE re-roll for the last taste-disputed cardino item of wave2/2b:
  cardino-icon-power-liliana — prior fail: seed 7183 run pmtcfxytq7o3c3p
  read 'Shadow Isles card back' (decorative frame read); the bolder
  reroll queued in wave2b_driver.py (seed 7194) never executed (pass cut
  short — log ends at bg-battlefield). Seeds 7194/7195 are since burned
  (lava-spike / mist-barrier). Fresh seed: 7196, rework 7197.

Lane law unchanged: z-image 1024 square -> blind_read agent-eyes gate
(retry once on empty) -> gateway CARD DOOR delivery. No local writes.
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
PALETTE_B = 'violet-blacks and ashen shadow'

SUBJECT = ('A single skeletal hand with bony fingers cupping a bright violet '
           'soul-flame it holds up like a lantern, bold dark fantasy magic '
           'emblem, centered, clear silhouette, plain dark background')
EXPECT = ['hand', 'skeleton', 'skeletal', 'skull', 'bones', 'flame', 'fire',
          'candle', 'torch', 'fingers', 'soul', 'violet', 'purple']

REQ = 'req-20260827-200507-cardino-icon-power-liliana'
MANIFEST = 'cardino-icon-power-liliana'
STEM = 'icon-power-liliana'


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
    """blind_read gate; retry once on empty answer; find ledger by glob."""
    src = f'/editor/assets/runs/{rid}/generate_image_{rid}_z-image_s{seed}_output.png'
    for tries in range(2):
        d = post('/v1/pipelines/start', {'pipeline': {
            'output_dir': f'./data/test-output/pipelines/pipeline_gate2c_{stem}_{tag}_t{tries + 1}',
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
        if ledgers:
            continue
        tail = str(st.get('log_tail') or '')[-200:]
        if tries == 1:
            return {'recognised': False, 'error': f'no ledger ({st.get("status")}) {tail}',
                    'answers': [None]}
    return {'recognised': False, 'error': 'unreachable', 'answers': [None]}


def requeue(req, reason):
    subprocess.run(['python3', 'scripts/process_requests.py', 'reject',
                    '--req', req, '--to', 'pending', '--reason', reason[:500],
                    '--by', 'consumer'], cwd='.')


if __name__ == '__main__':
    log = {'stem': STEM, 'kind': 'reroll'}
    try:
        prompt = f'{SUBJECT}, {PALETTE_B}, {SUFFIX}'
        seed = 7196
        rid, st = generate(prompt, seed)
        log.update(run_id=rid, seed=seed, gen=st)
        if st != 'completed':
            requeue(REQ, f'GEN-FAIL ({st}) run {rid}')
            log['outcome'] = 'GEN-FAIL-REQUEUED'
        else:
            g = gate(STEM, rid, seed, EXPECT, 'reroll')
            log.update(gate=g.get('recognised'), reads=g.get('_answers_raw'),
                       err=g.get('error'))
            if g.get('recognised'):
                d = post('/v1/assets/deliver', {'manifest_id': MANIFEST, 'kind': 'card',
                                                'run_id': rid, 'gate': 'GREEN',
                                                'seeds': str(seed)}, timeout=120)
                log['door'] = d
                if d.get('ok'):
                    log['outcome'] = 'DELIVERED'
                else:
                    requeue(REQ, f"door ok:false: {str(d.get('output'))[:300]}")
                    log['outcome'] = 'DOOR-REFUSED-REQUEUED'
            else:
                # retry-once lane law: ONE bolder rework before requeue
                rseed = 7197
                rid2, st2 = generate(prompt, rseed)
                log.update(rework_seed=rseed, rework_run=rid2, rework_gen=st2)
                g2 = None
                if st2 == 'completed':
                    g2 = gate(STEM, rid2, rseed, EXPECT, 'rework')
                    log.update(gate2=g2.get('recognised'), reads2=g2.get('_answers_raw'))
                if g2 and g2.get('recognised'):
                    d = post('/v1/assets/deliver', {'manifest_id': MANIFEST, 'kind': 'card',
                                                    'run_id': rid2, 'gate': 'GREEN',
                                                    'seeds': str(rseed)}, timeout=120)
                    log['door'] = d
                    if d.get('ok'):
                        log['outcome'] = 'DELIVERED'
                    else:
                        requeue(REQ, f"door ok:false: {str(d.get('output'))[:300]}")
                        log['outcome'] = 'DOOR-REFUSED-REQUEUED'
                else:
                    requeue(REQ, f"agent-eyes gate fail x2 (reads: {log.get('reads')} / "
                                 f"{log.get('reads2')}); rework-once exhausted, needs operator")
                    log['outcome'] = 'GATE-FAIL-REQUEUED'
    except Exception as e:  # noqa: BLE001 — log and keep moving
        log['outcome'] = 'ERROR'
        log['error'] = str(e)[:400]
        requeue(REQ, f"lane error: {str(e)[:300]}")
    print(json.dumps(log), flush=True)
