"""Serial wave runner — one lane at a time (GPU serial law, gotcha #7).
Starts each lane, waits for settle, logs, proceeds. Writes progress to
/tmp/serial_wave.log via print flush.
"""
import json
import sys
import time
import urllib.error
import urllib.request

BASE = 'http://localhost:33081'


def start(yaml):
    req = urllib.request.Request(f'{BASE}/v1/pipelines/start',
        data=json.dumps({'yaml': yaml}).encode(), headers={'Content-Type': 'application/json'})
    try:
        d = json.load(urllib.request.urlopen(req))
        return d.get('run_id')
    except urllib.error.HTTPError as e:
        print(f'  START FAIL {yaml}: {e.code} {e.read().decode()[:160]}', flush=True)
        return None


def wait(rid, yaml, timeout_s=3600):
    t0 = time.time()
    while time.time() - t0 < timeout_s:
        d = json.load(urllib.request.urlopen(f'{BASE}/v1/pipelines/status/{rid}'))
        st = d.get('status')
        if st in ('completed', 'failed'):
            print(f'  {yaml} -> {st}' + (f' ERR: {str(d.get("error"))[:130]}' if st == 'failed' else ''), flush=True)
            return st
        time.sleep(20)
    print(f'  {yaml} -> TIMEOUT', flush=True)
    return 'timeout'


if __name__ == '__main__':
    lanes = sys.argv[1:]
    results = {}
    for y in lanes:
        print(f'[serial] starting {y}', flush=True)
        rid = start(y)
        if rid:
            results[y] = (rid, wait(rid, y))
        else:
            results[y] = (None, 'start-failed')
    print('=== serial wave done ===', flush=True)
    for y, (rid, st) in results.items():
        print(f'{y:30s} {st}  {rid or ""}', flush=True)
