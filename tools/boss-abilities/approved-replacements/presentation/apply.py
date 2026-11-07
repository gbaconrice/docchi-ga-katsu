from pathlib import Path
import re,hashlib
root=Path(__file__).resolve().parent
def patch(s):
 s=s.replace('function licensedShieldFrame(u){',''+(root/'motion.js').read_text()+'\nfunction licensedShieldFrame(u){\n  const replacement=bossReplacementFrame(u);if(replacement!==null)return replacement;',1)
 needle="  if(kind==='boss_effect')admitEffect"
 s=s.replace(needle,"  consumeBossReplacementEvent(event,actor);\n"+needle,1)
 needle=" if(k==='warning'){"
 assert s.count(needle)==1
 s=s.replace(needle,(root/'fx.js').read_text()+needle,1)
 # Apply the fixed action direction before the recorder, independently of whether a draw happened.
 needle="  for(const u of units){const flags=CompactReplay.fourSpeciesPresentationFlags"
 s=s.replace(needle,"  for(const u of units)if(BOSS_REPLACEMENT_ROLES.has(u.k))bossReplacementFrame(u);\n"+needle,1)
 return s
