# Usage: python3 tools/balance/readability.py out1.json [out2.json ...]
# Champion = previous winner (right winner stays right; left win or draw stays left).
# Prints round-1 / champion win rates and hit rate of simple "read the card" rules.
import json, glob, math, collections, sys
S = './'
files = sys.argv[1:] or []
rows = []
for f in files:
    d = json.load(open(f)); prev = None
    for r in d:
        if r['round'] == 1 or prev is None:
            r['champ'] = None
        else:
            w = prev['winner']
            r['champ'] = 1 if w == 1 else 0   # right winner keeps right; left win or draw keeps left
        prev = r; rows.append(r)

def side_stats(r, s):
    us = [u for u in r['units'] if u[0] == s]
    hp = sum(u[2] for u in us); dps = sum(u[3] / u[4] for u in us)
    return dict(n=len(us), hp=hp, dps=dps, power=hp * dps, reach=sum(u[5] for u in us) / max(1, len(us)),
                cost=r['ac'][s] if r.get('ac') else None)

dec = [r for r in rows if r['winner'] in (0, 1)]
draws = len(rows) - len(dec)
pct = lambda a, b: f'{a}/{b} = {100*a/max(1,b):.0f}%'
print('fights', len(rows), 'draws', draws, 'mean battle s %.1f' % (sum(r['ticks'] for r in rows) / len(rows) / 60),
      'max units on a side', max(max(r['nL'], r['nR']) for r in rows))
r1 = [r for r in dec if r['round'] == 1]
print('round 1: left wins', pct(sum(r['winner'] == 0 for r in r1), len(r1)))
ch = [r for r in dec if r['champ'] is not None]
print('rounds 2+: champion wins', pct(sum(r['winner'] == r['champ'] for r in ch), len(ch)),
      '| champion on right', sum(r['champ'] == 1 for r in ch))
by = collections.defaultdict(list)
for r in ch: by[min(r['streak'], 4)].append(r)
print('  by streak', {k: pct(sum(x['winner'] == x['champ'] for x in v), len(v)) for k, v in sorted(by.items())})

# How readable is a fight? Accuracy of simple "read the card" rules.
def acc(rule, rs):
    hit = n = 0
    for r in rs:
        a, b = side_stats(r, 0), side_stats(r, 1)
        p = rule(a, b)
        if p is None: continue
        n += 1; hit += (p == r['winner'])
    return pct(hit, n)
rules = {
    'more units': lambda a, b: None if a['n'] == b['n'] else (0 if a['n'] > b['n'] else 1),
    'more total HP': lambda a, b: 0 if a['hp'] > b['hp'] else 1,
    'more total attack/s': lambda a, b: 0 if a['dps'] > b['dps'] else 1,
    'HP x attack': lambda a, b: 0 if a['power'] > b['power'] else 1,
    'longer reach': lambda a, b: None if a['reach'] == b['reach'] else (0 if a['reach'] > b['reach'] else 1),
}
for name, rs in (('round 1', r1), ('rounds 2+', ch), ('all', dec)):
    print(name, {k: acc(f, rs) for k, f in rules.items()})

# Lopsidedness: how often is the result already obvious from the power ratio?
lop = [r for r in dec if max(side_stats(r, 0)['power'], side_stats(r, 1)['power']) / max(1e-9, min(side_stats(r, 0)['power'], side_stats(r, 1)['power'])) > 4]
print('fights with >4x HPxattack gap', len(lop), 'stronger side wins', acc(rules['HP x attack'], lop))
# unit count asymmetry
asym = [r for r in dec if max(r['nL'], r['nR']) >= 3 * min(r['nL'], r['nR'])]
print('fights with >=3x headcount gap', len(asym), 'more-units side wins', acc(rules['more units'], asym))
