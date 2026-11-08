"""Remove the duplicate leading zero from the zero-stake hint only."""
def patch(s):
 old="'0 G · 的中 +10 G · 外れ・引分 ±0 G'";new="'的中 +10 G · 外れ・引分 ±0 G'"
 if old not in s and new in s:return s
 assert s.count(old)==1
 return s.replace(old,new)
