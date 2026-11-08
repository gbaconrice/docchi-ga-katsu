"""Remove only the unrequested battle opening text, preserving battle mechanics."""
def patch(s):
 markup='      <span id="openingCue" class="opening-cue" aria-hidden="true" hidden>対戦開始</span>\n'
 if 'syncOpeningCue' not in s and 'id="openingCue"' not in s:return s
 assert s.count(markup)==1;s=s.replace(markup,'')
 start=s.index('const openingCueSeen=new Set();let openingCueAnimation=null;')
 end=s.index('const personalScreen=showScreen;',start)
 s=s[:start]+s[end:]
 assert s.count('syncOpeningCue();')==1
 s=s.replace('syncOpeningCue();','')
 return s
