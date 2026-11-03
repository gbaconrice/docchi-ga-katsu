"""Fit per-species strength from duels: logit P(left wins) = th[L] - th[R] + kappa*log(budgetL/budgetR) + side.
Draws count as half a win. Ridge prior keeps species with few/odd results near 0."""
import json, math, os, sys
S = os.environ.get('S', '.')
r = json.load(open(S + '/roster.json')); C = r['costs']
rows = []
for f in ('duel0.json', 'duel1.json'):
    rows += [x for x in json.load(open(S + '/' + f)) if 'error' not in x]
errs = sum('error' in x for f in ('duel0.json', 'duel1.json') for x in json.load(open(S + '/' + f)))
sp = sorted({x['kL'] for x in rows} | {x['kR'] for x in rows}); idx = {k: i for i, k in enumerate(sp)}
data = []
for x in rows:
    y = 0.5 if x['winner'] is None else (1.0 if x['winner'] == 0 else 0.0)
    bL = x['nL'] * C[x['kL']][0]; bR = x['nR'] * C[x['kR']][0]
    data.append((idx[x['kL']], idx[x['kR']], math.log(bL / bR), y))
n = len(sp); th = [0.0] * n; kappa = 1.0; side = 0.0; L2 = 0.3
def sig(z): return 1 / (1 + math.exp(-max(-30, min(30, z))))
lr = 0.5
for it in range(4000):
    g = [0.0] * n; gk = 0.0; gs = 0.0
    for a, b, lb, y in data:
        p = sig(th[a] - th[b] + kappa * lb + side); e = p - y
        g[a] += e; g[b] -= e; gk += e * lb; gs += e
    m = len(data)
    for i in range(n): th[i] -= lr * (g[i] / m * 40 + L2 * th[i] / m * 40)
    kappa -= lr * gk / m; side -= lr * gs / m
# Anchor: mean of the ground references = 0
ref = ['sword', 'archer', 'shield', 'boar']; mu = sum(th[idx[k]] for k in ref) / len(ref); th = [t - mu for t in th]
ll = sum(math.log(max(1e-9, (lambda p: p if y == 1 else (1 - p) if y == 0 else math.sqrt(p * (1 - p)))(sig(th[a] - th[b] + kappa * lb + side)))) for a, b, lb, y in data) / len(data)
draws = sum(1 for x in rows if x['winner'] is None)
print(f'duels {len(rows)} errors {errs} draws {draws} species {n} kappa {kappa:.3f} side {side:+.3f} avg-ll {ll:.3f}')
res = {}
for k in sp:
    c = C[k][0]; mult = math.exp(th[idx[k]] / kappa); new = max(1, round(c * mult))
    res[k] = {'theta': th[idx[k]], 'cost': c, 'mult': mult, 'new': new, 'duels': sum(1 for x in rows if k in (x['kL'], x['kR']))}
json.dump({'kappa': kappa, 'side': side, 'species': res}, open(S + '/fit.json', 'w'), indent=0)
mults = sorted(v['mult'] for v in res.values())
q = lambda p: mults[int(p * (len(mults) - 1))]
print('strength-per-cost multiplier quantiles 5/25/50/75/95%%: %.2f %.2f %.2f %.2f %.2f' % (q(.05), q(.25), q(.5), q(.75), q(.95)))
changed = [k for k, v in res.items() if v['new'] != v['cost']]
print('species whose integer cost changes:', len(changed))
top = sorted(res.items(), key=lambda kv: -kv[1]['mult'])
print('most underpriced:', [(k, v['cost'], v['new'], round(v['mult'], 2)) for k, v in top[:8]])
print('most overpriced :', [(k, v['cost'], v['new'], round(v['mult'], 2)) for k, v in top[-8:]])
