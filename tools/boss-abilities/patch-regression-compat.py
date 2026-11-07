"""Optional isolated presentation fix: retain airborne role in compact boss cards.
Parent must compose patch(s) into its build explicitly; does not write source itself.
"""
def patch(s):
    old="return {...b,actionDetail:BOSS_SHORT_COPY[k]||b.ability,traits:[b.value],traitTones:[b.actionTone],timing:''};"
    new="return {...b,actionDetail:BOSS_SHORT_COPY[k]||b.ability,traits:[b.value,...(type.flying?['空を飛ぶ']:[])],traitTones:[b.actionTone,...(type.flying?['mobility']:[])],timing:''};"
    if new in s:
        return s
    assert s.count(old)==1, ('compact boss trait anchor',s.count(old))
    return s.replace(old,new)
