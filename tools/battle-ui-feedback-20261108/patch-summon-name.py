"""Rename the visually verified crawler summon. Display text only.

Apply after patch-trait-text.py. The internal goblin type, registered sprites,
stats, summon timing, replay schema and other monsters remain unchanged.
"""

NAME = 'シャドウクローラー'
REPLACEMENTS = (
    ('"goblin":{"name":"小鬼"', '"goblin":{"name":"' + NAME + '"'),
    ('"goblin":"ゴブリン"', '"goblin":"' + NAME + '"'),
    ('`ゴブリン最大${type.summonCharges}', '`' + NAME + '最大${type.summonCharges}'),
    ("if (/^ゴブリン最大/.test(text)) return 'ゴブリンを召喚';", "if (/^" + NAME + "最大/.test(text)) return '" + NAME + "を召喚';"),
    ('"ゴブリンを召喚":"ゴブリン召喚"', '"' + NAME + 'を召喚":"クローラー召喚"'),
    ("wraith:'地上・小鬼3体召喚'", "wraith:'地上・" + NAME + "3体召喚'"),
    ("wraith:'飛行にも届く射撃。仲間の小鬼を最大3体、時間差で呼ぶ。'", "wraith:'飛行にも届く射撃。仲間の" + NAME + "を最大3体、時間差で呼ぶ。'"),
)


def patch(source: str) -> str:
    if all(source.count(old) == 0 and source.count(new) == 1 for old, new in REPLACEMENTS):
        return source
    for old, new in REPLACEMENTS:
        if source.count(old) != 1:
            raise ValueError('Expected unique summon-name anchor: ' + old)
        source = source.replace(old, new, 1)
    return source
