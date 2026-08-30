#!/usr/bin/env python3
"""cardino_wave.py — CARDINO lane driver (one card end-to-end, serial GPU).

Per card: z-image 1024 flat generation (seed 71xx family) -> blind_read
agent-eyes gate (neutral subject read, retry-once on empty) -> gateway
CARD DOOR delivery. No local delivery writes: the door is the only proof.
"""
import hashlib
import json
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
           'R': 'rich deep reds and charcoal shadow'}

# id -> (color, subject, expect)
CARDS = {
 'island': ('U','Lonely rocky island rising from a calm dark sea, waves breaking against its craggy base, drifting sea mist, storm clouds gathering on the horizon, the tide keeps every secret',['island','land','sea','ocean','rock','coast']),
 'plains': ('W','Vast sunlit grass plains under a wide pale sky, a lone windswept tree on a low rise, golden light falling evenly across the land to the horizon',['plains','field','grassland','meadow','prairie','plain','grass']),
 'swamp': ('B','Dark festering swamp, twisted dead trees rising from black still water, hanging moss and low fog, a dim violet glow in the depths where light fears to tread',['swamp','marsh','bog','wetland','dead trees']),
 'vampire-lord': ('B','Imperious vampire lord in ornate dark armor with a high collar, pale aristocratic face, crimson mist and bats swirling around him as the night bows to its master',['vampire','lord','count','noble','dracula']),
 'bone-rattler': ('B','Animated skeleton warrior rattling with loose yellowed bones, notched blade in hand, rising from a shallow grave it does not miss being whole in',['skeleton','bones','undead','skull','skeletal']),
 'dark-ritual': ('B','Hooded figure with arms raised over a glowing violet sigil circle, black candles burning low, tendrils of living darkness gathering as power is borrowed',['ritual','ceremony','cult','summoning','magic','occult','candles']),
 'dread-wraith': ('B','Tall wraith of grief given hunger, a tattered black shroud and long clawed hands, hollow glowing face floating in cold mist',['wraith','ghost','spirit','specter','phantom','shade']),
 'elvish-archdruid': ('G','Elvish archdruid wearing an antlered crown, channeling green living light through a gnarled wooden staff, seated before an ancient forest throne',['elf','druid','archdruid','shaman','elvish']),
 'rise-again': ('B','Skeletal hand bursting up through grave dirt as necromantic violet light raises the dead, coffin lid and leaning tombstones, death is a door',['grave','resurrection','skeleton','tomb','coffin','hand','rising']),
 'shadow-assassin': ('B','Assassin dissolving into living darkness, body of shadow, only a curved blade catching the moonlight — you never see the blade',['assassin','shadow','rogue','ninja','killer','dark figure']),
 'undead-plague': ('B','Rotting zombie horde shambling forward under a sickly green-black miasma, countless dead rising not to serve but to consume',['zombie','plague','horde','undead','outbreak']),
 'wild-beast': ('G','Hulking feral beast all muscle and tusks charging through broken undergrowth, hunger is the only law',['beast','monster','animal','predator','boar']),
 'beast-token': ('G','Young wild beast snarling, compact muscular body and short tusks, a summoned spirit of the forest',['beast','animal','monster','predator','boar']),
 'bloodlust-berserker': ('R','Fierce berserker warrior mid-swing with twin axes, blood-red warpaint and braided hair, she strikes first because she never learned to wait',['berserker','warrior','fighter','barbarian','viking']),
 'feral-instinct': ('G','Wolf pack moving as one through a moonlit forest, eyes gleaming green, primal unity — trust the wild within',['wolf','wolves','pack','predators']),
 'giant-growth': ('G','Small sprout erupting into a colossal vine creature towering over the trees, explosive magical growth — even the smallest acorn fells the oak',['plant','vines','growth','tree','sprout','vine']),
 'goblin-raider': ('R','Snarling goblin raider with a jagged blade and a stolen shield, crouched to sprint by torchlight — tomorrow is a myth invented by cowards',['goblin','orc','imp']),
 'mist-veil': ('G','Forest path dissolving into thick silver mist, hidden shapes of creatures the forest loves, concealment made visible',['mist','fog','forest','veil','path']),
 'rampant-growth': ('G','Roots and green vines bursting up through cracked stone pavement, unstoppable verdant overgrowth — roots find a way',['roots','vines','growth','overgrowth','plants']),
 'savage-bite': ('G','Massive beast jaws snapping shut in a savage bite, fangs bared, spittle and fury — teeth first, apologies never',['jaws','bite','fangs','teeth','beast','mouth']),
 'spider-pack': ('G','Giant spiders descending on silk lines through a dark forest canopy, many eyes gleaming — the canopy has an opinion about flyers',['spider','spiders','arachnid']),
 'titanic-charger': ('G','Colossal horned beast thundering forward, horns like battering rams, the valley learned to step aside a generation ago',['beast','rhino','bull','charger','horned']),
 'angel-of-dawn': ('W','Radiant angel in golden armor with vast white wings, a sword of dawn light raised, mercy armored',['angel','winged','seraph']),
 'ember-dragon': ('R','Ember dragon in flight, scales like cooling lava, wings trailing sparks and smoke — the sky remembers its name in scars',['dragon','wyvern','drake']),
 'fire-elemental': ('R','Humanoid figure of living flame and magma, a fire elemental rising from cracked volcanic ground, a thought the mountain once had',['fire','flame','elemental','burning','magma']),
 'flame-wave': ('R','Wall of roaring flame sweeping across the horizon, bending the sky, consuming everything before it — the horizon bent to pass it by',['fire','flames','wave','blaze','inferno']),
 'lava-spike': ('R','A single colossal hurtling spear of jagged black volcanic glass veined with white-hot molten lava, sharp stone tip driving straight toward the viewer, filling the frame edge to edge, embers streaming off its length, plain dark smoke void behind it — a gift delivered fast and kept forever',['lava','molten','magma','spear','projectile','obsidian','shard','spike','javelin']),
 'lightning-strike': ('R','Massive lightning bolt splitting a storm-black sky to strike a lone tower, a blinding fork — the storm answers on the first ring',['lightning','storm','thunderbolt','bolt']),
 'loyal-sentry': ('W','Steadfast soldier sentry standing a castle wall at dusk, tall shield and spear, unflinching vigil — the wall is only as brave as the one who stands on it',['soldier','sentry','guard','knight','warrior']),
 'pegasus-rider': ('W','Winged warrior riding a white pegasus through sunlit clouds, spear lowered for the charge — the charge begins where the ladders end',['pegasus','winged horse','rider','flying horse']),
 'sunlit-knight': ('W','Knight in gleaming armor backlit by the dawn sun, sword raised, golden radiance — dawn rides with him',['knight','paladin','soldier','warrior']),
 'azure-drake': ('U','Sleek azure-blue drake banking through storm winds over the open sea, lightning on the horizon — deeper water, deeper hunger',['drake','dragon','winged']),
 'banish': ('W','Dark creature dissolving into white-gold particles of light as it is torn from the world — some stains are removed, not washed out',['dissolving','light','particles','disappearing','banish']),
 'honor-guard': ('W','Rank of shield-bearer soldiers in perfect formation, banners raised and interlocked shields — none fights alone who fights in formation',['soldiers','formation','shields','guard','army','rank']),
 'judgment-of-the-sky': ('W','The sky opening with blinding heavenly light striking judgment down upon the earth below — and the sky said enough',['sky','light','judgment','heavens','divine']),
 'mist-barrier': ('U','A towering translucent wall of thick pale-blue mist and fog rolling across a dark moonlit shore, the vapor itself shaped into a faint crenellated battlement, soft glowing vapor with moonlight shining clean through it, nothing solid, wave-shaped cloud front blocking the way — you may pass, it will decide when',['wall','mist','barrier','fog','rampart','cloud','clouds','vapor','haze','veil']),
 'sacred-light': ('W','Beacon of warm sacred light falling on a kneeling figure from above, hope made visible — hope is a resource, spend it wisely',['light','beacon','glow','divine','radiance']),
 'wind-drake': ('U','Lean wind-drake gliding on gale winds, storm-grey wings, electric eyes — the storm keeps pets',['drake','dragon','winged']),
 'counterspell': ('U','Spell circle shattering like broken glass in midair, blue magic dissolving into shards — no',['shattered','glass','spell','magic','breaking','crystal']),
 'deep-sea-serpent': ('U','Enormous sea serpent coiling up from abyssal black depths, scales like ship hulls, a doomed ship beyond — charts of this coast end mid-sentence',['serpent','leviathan','kraken','sea monster','sea serpent']),
 'inspiration': ('U','Lone figure by a lantern-lit desk as a glowing tide of blue light arrives like a wave of ideas — ideas arrive like tides',['light','idea','glow','wave','lamp']),
 'tidal-lock': ('U','Ocean waves frozen mid-crash, held utterly still like sculpture, the held breath of the sea — even the waves hold their breath',['frozen','ocean','sea','waves','still water','wave']),
 'tidal-vision': ('U','Figure gazing into a still pool whose reflection shows a different tomorrow, faint images in the water — the reflection shows tomorrow',['reflection','pool','water','scrying','vision','mirror']),
 'unsummon': ('U','Creature being pulled backward into a spiral of swirling water, fading from reality — the sea returns what it borrows',['spiral','water','vortex','whirlpool','disappearing']),
 'lilianas-command': ('B','Necromancer queen issuing a commanding gesture, chains of violet dark magic binding a doomed kneeling figure — she does not ask twice',['necromancer','queen','sorceress','witch','enchantress']),
 'natures-fury': ('G','The forest itself rising in fury, uprooted trees and a stampede of beasts moving as one wrath — the wild does not negotiate',['forest','fury','nature','stampede','wrath','trees']),
}


def post(path, body, timeout=60):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=timeout))


def generate(card_id, seed):
    color, subject, expect = CARDS[card_id]
    prompt = f'{subject}, {PALETTE[color]}, {SUFFIX}'
    d = post('/v1/pipelines/start', {'model': 'z-image', 'prompt': prompt,
                                     'seed': seed, 'width': 1024, 'height': 1024})
    rid = d['run_id']
    for _ in range(60):
        time.sleep(4)
        s = json.load(urllib.request.urlopen(f'{BASE}/v1/pipelines/status/{rid}', timeout=15))
        if s.get('status') in ('completed', 'failed'):
            return rid, s.get('status'), s
    return rid, 'timeout', {}


def gate(card_id, rid, attempt):
    """blind_read neutral gate on the card art; one retry on empty answer."""
    color, subject, expect = CARDS[card_id]
    img = f'/editor/assets/runs/{rid}/generate_image_{rid}_z-image_s{{SEED}}_output.png'
    s = json.load(urllib.request.urlopen(f'{BASE}/v1/pipelines/status/{rid}', timeout=15))
    png = (s.get('final_ctx') or {}).get('output')
    if not png or not png.endswith('.png'):
        return {'error': f'no png artifact (final_ctx={s.get("final_ctx")})', 'recognised': False}
    rel = png.replace('/home/user/Documents/programs/ray', '')
    src = f'/editor/assets{rel.replace("/data/runs", "/runs")}'
    for tries in range(2):
        d = post('/v1/pipelines/start', {'pipeline': {
            'output_dir': f'./data/test-output/pipelines/pipeline_card_gate_{card_id}_a{attempt}',
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
            return {'error': f'no blind_read.json ({st.get("status")})', 'recognised': False}
        answers = [a.get('answer', '') for a in br.get('answers', [])]
        if any(a.strip() for a in answers) or tries == 1:
            br['_gate_run'] = grid
            br['_answers_raw'] = answers
            return br
    return {'error': 'unreachable'}


def sha16(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 16), b''):
            h.update(chunk)
    return h.hexdigest()[:16]


def deliver(card_id, rid, seed, verdict='GREEN'):
    d = post('/v1/assets/deliver', {'manifest_id': f'cardino-card-{card_id}',
                                    'kind': 'card', 'run_id': rid,
                                    'gate': verdict, 'seeds': str(seed)}, timeout=120)
    return d


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'wave':
        import subprocess
        cards = sys.argv[2].split(',')
        base_seed = int(sys.argv[3])
        rework_seed = int(sys.argv[4])
        for i, cid in enumerate(cards):
            seed = base_seed + i
            log = {'card': cid, 'seed': seed}
            try:
                rid, st, _ = generate(cid, seed)
                log['run_id'] = rid
                log['gen_status'] = st
                if st != 'completed':
                    log['outcome'] = 'GEN-FAIL'
                    print(json.dumps(log), flush=True)
                    continue
                g = gate(cid, rid, 1)
                log['gate1'] = g.get('recognised')
                log['reads'] = g.get('_answers_raw') or g.get('answers')
                verdict = 'GREEN' if g.get('recognised') else None
                if not verdict:
                    rs = rework_seed
                    rework_seed += 1
                    rid2, st2, _ = generate(cid, rs)
                    log['rework_seed'] = rs
                    log['rework_run'] = rid2
                    log['rework_gen'] = st2
                    if st2 == 'completed':
                        g2 = gate(cid, rid2, 2)
                        log['gate2'] = g2.get('recognised')
                        log['reads2'] = g2.get('_answers_raw') or g2.get('answers')
                        if g2.get('recognised'):
                            rid, verdict = rid2, 'GREEN'
                if verdict == 'GREEN':
                    d = deliver(cid, rid, seed if log.get('gate1') else log['rework_seed'])
                    log['door'] = d
                    if not d.get('ok'):
                        reason = f"door ok:false: {str(d.get('output'))[:300]}"
                        subprocess.run(['python3', 'scripts/process_requests.py', 'reject',
                                        '--req', f'req-20260827-195431-cardino-card-{cid}',
                                        '--to', 'pending', '--reason', reason], cwd='.')
                        log['outcome'] = 'DOOR-REFUSED-REQUEUED'
                    else:
                        log['outcome'] = 'DELIVERED'
                else:
                    reason = (f"agent-eyes gate fail x2 (reads: {log.get('reads')} / "
                              f"{log.get('reads2')}); rework-once exhausted, needs operator")
                    subprocess.run(['python3', 'scripts/process_requests.py', 'reject',
                                    '--req', f'req-20260827-195431-cardino-card-{cid}',
                                    '--to', 'pending', '--reason', reason], cwd='.')
                    log['outcome'] = 'GATE-FAIL-REQUEUED'
            except Exception as e:
                log['outcome'] = 'ERROR'
                log['error'] = str(e)[:400]
            print(json.dumps(log), flush=True)
    if cmd == 'retry':
        import subprocess
        pairs = sys.argv[2].split(',')
        rework_seed = int(sys.argv[3])
        def req_id_for(cid):
            import glob as _g
            hits = _g.glob(f'game-kit/requests/pending/req-*-cardino-card-{cid}.yaml')
            return hits[0].split('/')[-1].replace('.yaml', '') if hits else f'req-UNKNOWN-{cid}'
        for pair in pairs:
            cid, seed_s = pair.split(':')
            seed = int(seed_s)
            req = req_id_for(cid)
            log = {'card': cid, 'seed': seed, 'req': req}
            def requeue(reason):
                subprocess.run(['python3', 'scripts/process_requests.py', 'reject',
                                '--req', req, '--to', 'pending', '--reason', reason[:500]],
                               cwd='.', check=False)
            try:
                rid, st, s = generate(cid, seed)
                log['run_id'] = rid
                log['gen_status'] = st
                if st != 'completed':
                    requeue(f'gen {st}: {str(s.get("error"))[:300]}')
                    log['outcome'] = 'GEN-FAIL-REQUEUED'
                    print(json.dumps(log), flush=True)
                    continue
                g = gate(cid, rid, 1)
                log['gate1'] = g.get('recognised')
                log['reads'] = g.get('_answers_raw') or g.get('answers')
                log['gate_err'] = g.get('error')
                verdict = 'GREEN' if g.get('recognised') else None
                if not verdict:
                    rs = rework_seed
                    rework_seed += 1
                    rid2, st2, s2 = generate(cid, rs)
                    log['rework_seed'] = rs
                    log['rework_run'] = rid2
                    log['rework_gen'] = st2
                    if st2 == 'completed':
                        g2 = gate(cid, rid2, 2)
                        log['gate2'] = g2.get('recognised')
                        log['reads2'] = g2.get('_answers_raw') or g2.get('answers')
                        if g2.get('recognised'):
                            rid, verdict = rid2, 'GREEN'
                    else:
                        log['rework_err'] = str(s2.get('error'))[:200]
                if verdict == 'GREEN':
                    d = deliver(cid, rid, seed if log.get('gate1') else log['rework_seed'])
                    log['door'] = d
                    if not d.get('ok'):
                        requeue(f'door ok:false: {str(d.get("output"))[:300]}')
                        log['outcome'] = 'DOOR-REFUSED-REQUEUED'
                    else:
                        log['outcome'] = 'DELIVERED'
                else:
                    requeue(f'agent-eyes gate fail x2 (reads: {log.get("reads")} / '
                            f'{log.get("reads2")}); rework-once exhausted, needs operator')
                    log['outcome'] = 'GATE-FAIL-REQUEUED'
            except Exception as e:
                log['outcome'] = 'ERROR'
                log['error'] = str(e)[:400]
                requeue(f'error: {str(e)[:300]}')
            print(json.dumps(log), flush=True)
    elif cmd == 'generate':
        rid, st, s = generate(sys.argv[2], int(sys.argv[3]))
        print(json.dumps({'run_id': rid, 'status': st}))
    elif cmd == 'gate':
        print(json.dumps(gate(sys.argv[2], sys.argv[3], sys.argv[4])))
    elif cmd == 'sha16':
        print(sha16(sys.argv[2]))
    elif cmd == 'deliver':
        print(json.dumps(deliver(sys.argv[2], sys.argv[3], sys.argv[4])))
