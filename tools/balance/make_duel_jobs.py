"""Usage: python3 tools/balance/make_duel_jobs.py roster.json jobs.json
roster.json: {"sel":[species...], "costs":{species:[cost,estimateCost,antiAir,flying,radius]}} (dump it from the booted game).
Each species fights 4 single-species reference armies (anti-air references for fliers) at ~24 cost,
with its own budget drawn from 20/24/29, on both sides. References also fight each other."""
import json, random, sys
r = json.load(open(sys.argv[1])); c = r['costs']; sel = r['sel']; random.seed(7)
REF_G = ['sword', 'archer', 'shield', 'boar']; REF_F = ['archer', 'cannon', 'light_bowman', 'emberstring_archer']
n_for = lambda k, B: max(1, min(64, round(B / c[k][0])))
jobs = []
def add(a, na, b, nb):
    for A, NA, B, NB in ((a, na, b, nb), (b, nb, a, na)):
        jobs.append({'kL': A, 'nL': NA, 'kR': B, 'nR': NB, 'seed': random.getrandbits(32)})
for k in sel:
    for ref in (REF_F if c[k][3] else REF_G):
        if ref != k: add(k, n_for(k, random.choice([20, 24, 29])), ref, n_for(ref, 24))
refs = sorted(set(REF_G + REF_F))
for a in refs:
    for b in refs:
        if a < b:
            for Ba in (20, 24, 29): add(a, n_for(a, Ba), b, n_for(b, 24))
json.dump(jobs, open(sys.argv[2], 'w')); print(len(jobs), 'jobs')
