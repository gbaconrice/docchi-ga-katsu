#!/usr/bin/env python3
"""Analyze fights recorded by tools/measure/sessions.cjs.

Usage: python3 tools/measure/analyze.py reports/measure/<commit>/seed*.json > report.md

Refuses to mix files from different HTML builds (htmlSHA256 must match).
Definitions (also printed in the report):
  ranged = reach >= 40, large = radius >= 16, flying = flying or collisionLayer 'air',
  anti-air = attackTargetMask contains 'air', area = has burst/cone/high/pillar/splash/chain/explosion,
  champion = previous winner, taken from the game's openingPlan.incumbentSide (round >= 2).
Confidence intervals: 95% bootstrap over sessions (fights inside a session are dependent).
"""
import json, sys, math, random, statistics as st, collections

RANGED, LARGE = 40, 16
FIELD_W, FIELD_H = 480, 538

files = sys.argv[1:]
if not files:
    sys.exit(__doc__)
runs = [json.load(open(f)) for f in files]
shas = {r['manifest']['htmlSHA256'] for r in runs}
if len(shas) != 1:
    sys.exit('refusing to mix builds: ' + ', '.join(sorted(shas)))
types = runs[0]['types']
fights = []
for f, r in zip(files, runs):
    for x in r['fights']:
        x['sid'] = (r['manifest']['seed'], x['session'])
        fights.append(x)

def side(f, s):
    army = f['left'] if s == 0 else f['right']
    n = sum(army.values())
    def share(pred): return sum(c for k, c in army.items() if pred(types[k])) / max(1, n)
    return dict(
        n=n, kinds=len(army),
        hp=sum(types[k]['hp'] * c for k, c in army.items()),
        dps=sum(types[k]['dmg'] / types[k]['rate'] * c for k, c in army.items()),
        reach=sum(types[k]['reach'] * c for k, c in army.items()) / max(1, n),
        speed=sum(types[k]['speed'] * c for k, c in army.items()) / max(1, n),
        ranged=share(lambda t: t['reach'] >= RANGED),
        large=share(lambda t: t['radius'] >= LARGE),
        flying=share(lambda t: t['flying']),
        anti_air=share(lambda t: t['antiAir']),
        area=share(lambda t: t['area']),
        support=share(lambda t: t['support']),
        cost=(f['costs'] or [None, None])[s],
    )

for f in fights:
    f['L'], f['R'] = side(f, 0), side(f, 1)
dec = [f for f in fights if f['winner'] in (0, 1)]
sessions = sorted({f['sid'] for f in dec})

def rate(rows, hit):
    """hit(f) -> True/False/None (None = rule does not apply). Returns (hits, n, lo, hi)."""
    vals = [(f['sid'], h) for f in rows for h in [hit(f)] if h is not None]
    k = sum(h for _, h in vals); n = len(vals)
    if n == 0: return (0, 0, None, None)
    by = collections.defaultdict(list)
    for s, h in vals: by[s].append(h)
    keys = list(by); rnd = random.Random(12345); boots = []
    for _ in range(1000):
        sample = [h for s in (rnd.choice(keys) for _ in keys) for h in by[s]]
        if sample: boots.append(sum(sample) / len(sample))
    boots.sort()
    return (k, n, boots[25], boots[974])

def fmt(r, flag=False):
    k, n, lo, hi = r
    if n == 0: return '—'
    p = k / n
    s = f'{k}/{n} = **{100*p:.0f}%**' if (flag and p >= .6) else f'{k}/{n} = {100*p:.0f}%'
    return s + (f' ({100*lo:.0f}–{100*hi:.0f}%)' if lo is not None else '')

def pick(f, a, b):
    """Side favoured by comparing feature values a (left) vs b (right); None on tie."""
    return None if a == b else (0 if a > b else 1)

out = []
P = out.append
m = runs[0]['manifest']
P('# 計測レポート\n')
P(f'- 対象：`{m["html"]}`、SHA-256 `{m["htmlSHA256"]}`、コミット `{m["commit"]}`')
P(f'- シード：{", ".join(str(r["manifest"]["seed"]) for r in runs)}／試合数 {len(fights)}／セッション数 {len({f["sid"] for f in fights})}／Node {m["node"]}')
P(f'- ツール：`tools/measure/sessions.cjs`（製品の戦闘ロジックをモックDOMで実行、ゲーム内の乱数をシード固定）。賭けは常に左（戦闘には影響しません）')
P(f'- 定義：遠距離＝reach≥{RANGED}、大型＝radius≥{LARGE}、飛行＝flying または collisionLayer=air、対空＝attackTargetMask に air を含む、範囲攻撃＝burst/cone/high/pillar/splash/chain/explosion を持つ。王者＝ゲーム内の incumbentSide（2戦目以降）')
P('- 括弧内はセッション単位のブートストラップで出した95%区間です。太字は60%以上で、「単純な選び方が必勝法になっている」候補を示します。\n')

draws = len(fights) - len(dec); timeouts = sum(f.get('timeout') for f in fights)
dur = sorted(f['ticks'] / 60 for f in fights)
P('## 概要\n')
P(f'| 項目 | 値 |\n|---|---|\n| 決着した試合 | {len(dec)}（引分 {draws}、時間切れ {timeouts}） |\n| 戦闘時間（ゲーム内） | 中央値 {st.median(dur):.1f}秒、上位10%は {dur[int(.9*len(dur))]:.1f}秒以上 |\n| 片側の最大人数 | {max(max(f["L"]["n"], f["R"]["n"]) for f in fights)} |\n')

r1 = [f for f in dec if f['round'] == 1]
ch = [f for f in dec if f['incumbentSide'] is not None]
P('## 初戦・連戦\n')
P('| 状況 | 勝率 |\n|---|---|')
P(f'| 初戦で左が勝つ | {fmt(rate(r1, lambda f: f["winner"] == 0))} |')
P(f'| 2戦目以降で王者が勝つ | {fmt(rate(ch, lambda f: f["winner"] == f["incumbentSide"]), True)} |')
for lo, hi, lab in ((1, 1, '王者1勝目'), (2, 2, '2連勝中'), (3, 3, '3連勝中'), (4, 99, '4連勝以上')):
    rows = [f for f in ch if lo <= f['streak'] <= hi]
    P(f'| {lab} | {fmt(rate(rows, lambda f: f["winner"] == f["incumbentSide"]), True)} |')
P(f'| 王者が右側 | {sum(f["incumbentSide"] == 1 for f in ch)}/{len(ch)} |\n')

envs = collections.Counter(f['env'] for f in dec)
P('## 地図別（初戦の左勝率・王者勝率）\n')
P('| 地図 | 試合数 | 初戦の左 | 王者 | 遠距離が多い側 |\n|---|---|---|---|---|')
for e, _ in envs.most_common():
    rows = [f for f in dec if f['env'] == e]
    P(f'| {e} | {len(rows)} | {fmt(rate([f for f in rows if f["round"] == 1], lambda f: f["winner"] == 0))} | {fmt(rate([f for f in rows if f["incumbentSide"] is not None], lambda f: f["winner"] == f["incumbentSide"]), True)} | {fmt(rate(rows, lambda f: None if abs(f["L"]["ranged"] - f["R"]["ranged"]) < 1e-9 else f["winner"] == pick(f, f["L"]["ranged"], f["R"]["ranged"])), True)} |')
P('')

rules = [
    ('遠距離の割合が大きい側', lambda f: (f['L']['ranged'], f['R']['ranged'])),
    ('平均の間合いが長い側', lambda f: (f['L']['reach'], f['R']['reach'])),
    ('人数が多い側', lambda f: (f['L']['n'], f['R']['n'])),
    ('総HPが多い側', lambda f: (f['L']['hp'], f['R']['hp'])),
    ('総攻撃力/秒が高い側', lambda f: (f['L']['dps'], f['R']['dps'])),
    ('HP×攻撃が大きい側', lambda f: (f['L']['hp'] * f['L']['dps'], f['R']['hp'] * f['R']['dps'])),
    ('実コストが高い側', lambda f: (f['L']['cost'] or 0, f['R']['cost'] or 0)),
    ('大型の割合が大きい側', lambda f: (f['L']['large'], f['R']['large'])),
    ('飛行の割合が大きい側', lambda f: (f['L']['flying'], f['R']['flying'])),
    ('範囲攻撃の割合が大きい側', lambda f: (f['L']['area'], f['R']['area'])),
    ('兵種数が多い側（混成）', lambda f: (f['L']['kinds'], f['R']['kinds'])),
    ('平均速度が速い側', lambda f: (f['L']['speed'], f['R']['speed'])),
]
P('## 単純な選び方の的中率（必勝法チェック）\n')
P('その特徴が左右で同じ試合は、母数から除いています。\n')
P('| 選び方 | 全試合 | 初戦 | 2戦目以降 |\n|---|---|---|---|')
for name, feat in rules:
    def hit(f, feat=feat):
        a, b = feat(f); w = pick(f, a, b)
        return None if w is None else f['winner'] == w
    P(f'| {name} | {fmt(rate(dec, hit), True)} | {fmt(rate(r1, hit), True)} | {fmt(rate(ch, hit), True)} |')
P('')

P('## 遠距離への対抗手段\n')
P('遠距離の割合の差が0.25以上ある試合で、遠距離が多い側の勝率を、相手側の特徴ごとに分けました。勝率が50%前後まで下がれば、その特徴は対抗手段として機能しています。\n')
rf = []
for f in dec:
    d = f['L']['ranged'] - f['R']['ranged']
    if abs(d) >= .25:
        s = 0 if d > 0 else 1
        f['_rs'], f['_rso'] = (f['L'], f['R']) if s == 0 else (f['R'], f['L'])
        f['_rw'] = f['winner'] == s
        rf.append(f)
cases = [
    ('（全体）', lambda f: True),
    ('相手に飛行がいる', lambda f: f['_rso']['flying'] > 0),
    ('相手に飛行がいて、遠距離側の対空が少ない（<25%）', lambda f: f['_rso']['flying'] > 0 and f['_rs']['anti_air'] < .25),
    ('相手に大型がいる（≥25%）', lambda f: f['_rso']['large'] >= .25),
    ('相手が範囲攻撃を持つ（≥25%）', lambda f: f['_rso']['area'] >= .25),
    ('相手の平均速度が遠距離側より10以上速い', lambda f: f['_rso']['speed'] - f['_rs']['speed'] >= 10),
    ('相手の人数が1.5倍以上', lambda f: f['_rso']['n'] >= 1.5 * f['_rs']['n']),
    ('相手の総HPが1.5倍以上', lambda f: f['_rso']['hp'] >= 1.5 * f['_rs']['hp']),
    ('遠距離側が遠距離だけ（100%）', lambda f: f['_rs']['ranged'] >= .999),
    ('遠距離側に前衛もいる（遠距離50%未満）', lambda f: f['_rs']['ranged'] < .5),
]
P('| 条件 | 遠距離が多い側の勝率 |\n|---|---|')
for name, cond in cases:
    P(f'| {name} | {fmt(rate([f for f in rf if cond(f)], lambda f: f["_rw"]), True)} |')
P('')
P('「相手に飛行がいて、遠距離側の対空が少ない」が0件（—）なのは、生成器が飛行の相手に対空を必ず含めるためと考えられます。\n')

P('## 人数差\n')
P('| 人数比（多い側／少ない側） | 人数が多い側の勝率 |\n|---|---|')
for lo, hi in ((1, 1.25), (1.25, 2), (2, 4), (4, 999)):
    rows = [f for f in dec if f['L']['n'] != f['R']['n'] and lo <= max(f['L']['n'], f['R']['n']) / min(f['L']['n'], f['R']['n']) < hi]
    P(f'| {lo}〜{hi if hi < 999 else ""} | {fmt(rate(rows, lambda f: f["winner"] == pick(f, f["L"]["n"], f["R"]["n"])), True)} |')
P('')

tl_rows = [f for f in dec if f.get('tl')]
if tl_rows:
    def share(p):
        l = p[1] / max(1, p[2]); r = p[4] / max(1, p[5])
        return .5 if l + r == 0 else l / (l + r)
    behind = late = close = 0; changes = []; worst = []; decided = []
    spread = {k: [] for k in (0, .25, .5, .75, 1)}
    one_left = 0; few_left = 0
    for f in tl_rows:
        tl = f['tl']; T = max(1, tl[-1][0]); w = f['winner']
        ws = [share(p) if w == 0 else 1 - share(p) for p in tl]
        behind += min(ws) < .5; worst.append(min(ws))
        mid = [x for p, x in zip(tl, ws) if p[0] >= .6 * T]; late += bool(mid) and mid[0] < .5
        last = [x for p, x in zip(tl, ws) if p[0] >= .75 * T]; close += bool(last) and min(last) <= .65
        sideL = None; c = 0
        for x in (share(p) for p in tl):
            cur = 0 if x > .55 else 1 if x < .45 else sideL
            if sideL is not None and cur != sideL: c += 1
            sideL = cur
        changes.append(c)
        dt = T
        for p, x in reversed(list(zip(tl, ws))):
            if x < .7: break
            dt = p[0]
        decided.append(dt / T)
        alive_w = tl[-1][3] if w == 0 else tl[-1][6]
        one_left += alive_w == 1; few_left += alive_w <= 2
        for k in spread:
            p = min(tl, key=lambda q: abs(q[0] - k * T))
            spread[k].append(max(max(0, p[8] - p[7]) / FIELD_W, max(0, p[10] - p[9]) / FIELD_H))
    n = len(tl_rows); pc = lambda a: f'{a}/{n} = {100*a/n:.0f}%'
    P('## 接戦・逆転・散らばり（演出とカメラの判断材料）\n')
    P('優勢度は、左右それぞれの「残りHP ÷ 最大HP」の比です（召喚体は除外）。人数差がある軍どうしでも、開戦時は50:50になります。\n')
    P('| 項目 | 値 |\n|---|---|')
    P(f'| 勝者が一度でも劣勢（<50%）になった | {pc(behind)} |')
    P(f'| 戦闘の60%時点で勝者が劣勢（終盤の逆転） | {pc(late)} |')
    P(f'| 最後の4分の1でも、敗者が35%以上を保っていた（接戦の決着） | {pc(close)} |')
    P(f'| 優勢の入れ替わり（45/55%を越えたもの） | 0回 {pc(sum(c == 0 for c in changes))}、1回 {pc(sum(c == 1 for c in changes))}、2回以上 {pc(sum(c >= 2 for c in changes))} |')
    P(f'| 勝者が40%未満まで追い込まれた | {pc(sum(x < .4 for x in worst))} |')
    P(f'| 勝敗が決まった時点（勝者が70%以上を保ち続けた最初の時点） | 戦闘全体の中央値 {100*st.median(decided):.0f}% の時点 |')
    P(f'| 勝者の生存が1体だけ／2体以下 | {pc(one_left)} ／ {pc(few_left)} |')
    P('| 生存兵の外接矩形が盤面に占める割合（中央値：開戦→25%→50%→75%→決着） | ' + ' → '.join(f'{st.median(spread[k]):.2f}' for k in spread) + ' |')
    P('| 生存兵が盤面の半分以内に収まる試合（25%／50%／75%時点） | ' + ' ／ '.join(pc(sum(x <= .5 for x in spread[k])) for k in (.25, .5, .75)) + ' |')
    P('')
print('\n'.join(out))
