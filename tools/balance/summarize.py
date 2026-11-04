# Usage: python3 tools/balance/summarize.py out1.json [out2.json ...]  -> round-1 and champion win rates
import json,sys,collections
rows=sum((json.load(open(f)) for f in sys.argv[1:]),[])
d=[r for r in rows if r['winner'] in (0,1)]
def rate(v): return '%d/%d=%.2f'%(sum(r['winner']==0 for r in v),len(v),sum(r['winner']==0 for r in v)/max(1,len(v)))
print('round1',rate([r for r in d if r['round']==1]),'| champion',rate([r for r in d if r['round']>1]))
c=collections.defaultdict(list)
for r in d:
    if r['round']>1: c[min(r['streak'],4)].append(r)
print('by streak',{k:rate(v) for k,v in sorted(c.items())})
print('draws',sum(r['winner'] is None for r in rows),'/',len(rows),'battle s %.1f'%(sum(r['ticks'] for r in rows)/len(rows)/60),'challenger avg units %.1f vs champion %.1f'%(sum(r['nR'] for r in rows)/len(rows),sum(r['nL'] for r in rows)/len(rows)))
