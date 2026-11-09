#!/usr/bin/env python3
from pathlib import Path
import sys
src=Path(sys.argv[1]);dst=Path(sys.argv[2]);s=src.read_text()
changes=[
('    function safeResume() {','    function safeResume(retryPending = false) {'),
('      if (resumePromise) return resumePromise;', '''      // A browser may leave resume() pending when its first gesture is not
      // accepted. A later genuine input must be able to try again instead of
      // remaining attached to that unresolved request forever.
      if (resumePromise && !retryPending) return resumePromise;'''),
('''      if (context) {
        safeResume();
        syncAmbient();''','''      if (context) {
        safeResume(true);
        syncAmbient();'''),
('''      safeResume();
      return true;
    }

    function startVoice''','''      safeResume(true);
      return true;
    }

    function startVoice''')]
for old,new in changes:
 assert s.count(old)==1, (old[:70],s.count(old))
 s=s.replace(old,new)
dst.parent.mkdir(parents=True,exist_ok=True);dst.write_text(s)
print('Applied pending audio resume retry fix:',dst)
