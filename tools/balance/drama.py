# Usage: python3 tools/balance/drama.py out1.json [out2.json ...]   (files from readability-sessions.cjs)
# How often battles are close, how often the lead changes, and how spread out the units are over time.
# "Share" = left remaining HP / (left + right remaining HP), each side normalised by its own max HP
# so that a 60-unit army and a 4-unit army start at 50/50.
import json, sys, statistics as st

rows = [r for f in sys.argv[1:] for r in json.load(open(f)) if r.get('tl') and r['winner'] in (0, 1)]
FIELD_W, FIELD_H = 480, 538

def share(p):
    l = p[1] / max(1, p[2]); r = p[4] / max(1, p[5])
    return 0.5 if l + r == 0 else l / (l + r)

def pct(a, b): return f'{a}/{b} = {100*a/max(1,b):.0f}%'

lead_changes, comeback, close_end, close_any, late_flip, decided_at, durations = [], [], 0, 0, 0, [], []
spread = {k: [] for k in ('start', '25%', '50%', '75%', 'end')}
for r in rows:
    tl = r['tl']; w = r['winner']; T = max(1, tl[-1][0]); durations.append(T / 60)
    s = [share(p) for p in tl]
    ws = [x if w == 0 else 1 - x for x in s]          # winner's share over time
    # lead changes with hysteresis (must cross 45/55 band)
    side, n = None, 0
    for x in s:
        cur = 0 if x > 0.55 else 1 if x < 0.45 else side
        if side is not None and cur != side: n += 1
        side = cur
    lead_changes.append(n)
    comeback.append(min(ws))                          # winner's worst moment
    # close finish: in the last 25% of the battle, the loser still had >= 35% share at some point
    last = [x for p, x in zip(tl, ws) if p[0] >= 0.75 * T]
    if last and min(last) <= 0.65: close_end += 1
    if min(ws) < 0.5: close_any += 1
    # late flip: winner was behind at 60% of the battle
    mid = [x for p, x in zip(tl, ws) if p[0] >= 0.6 * T]
    if mid and mid[0] < 0.5: late_flip += 1
    # when was it decided: first time winner's share stays >= 0.7 until the end
    dt = T
    for p, x in reversed(list(zip(tl, ws))):
        if x < 0.7: break
        dt = p[0]
    decided_at.append(dt / T)
    for key, frac in (('start', 0), ('25%', .25), ('50%', .5), ('75%', .75), ('end', 1)):
        p = min(tl, key=lambda q: abs(q[0] - frac * T))
        w_ = max(0, p[8] - p[7]); h_ = max(0, p[10] - p[9])
        spread[key].append(max(w_ / FIELD_W, h_ / FIELD_H))

n = len(rows)
print('fights', n, '| battle length s: median %.1f  p90 %.1f' % (st.median(durations), sorted(durations)[int(.9 * n)]))
print('winner was behind at some point (HP share < 50%):', pct(close_any, n))
print('winner was behind at 60% of the battle (late reversal):', pct(late_flip, n))
print('close finish (loser still >= 35% share in last quarter):', pct(close_end, n))
print('lead changes (45/55 band): 0 = %s, 1 = %s, 2+ = %s' % (pct(sum(c == 0 for c in lead_changes), n), pct(sum(c == 1 for c in lead_changes), n), pct(sum(c >= 2 for c in lead_changes), n)))
print("winner's worst share: median %.2f; below 0.40 in %s" % (st.median(comeback), pct(sum(c < .4 for c in comeback), n)))
print('decided (winner >= 70%% and stays) at median %.0f%% of the battle; before 50%% in %s' % (100 * st.median(decided_at), pct(sum(d < .5 for d in decided_at), n)))
print('alive-unit bounding box / field (max of w,h ratios), median:', {k: round(st.median(v), 2) for k, v in spread.items()})
print('  share of fights where the fight fits in half the field: ', {k: pct(sum(x <= .5 for x in v), n) for k, v in spread.items()})
