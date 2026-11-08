"""Exact allowlist and inverse equality for the isolated display cleanup."""
from pathlib import Path
import hashlib
import importlib.util
import re
import sys

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('patch', HERE / 'patch-redundant-match-labels.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
base = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE.parent / 'source/index.html'
candidate = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / 'validation/redundant-labels/index.html'
before, after = base.read_text(), candidate.read_text()
assert hashlib.sha256(base.read_bytes()).hexdigest() == module.BASE_SHA
assert len(module.REPLACEMENTS) == 7
assert after == module.patch(before), 'Undeclared edits in isolated candidate'
assert module.unpatch(after) == before, 'Inverse must restore every original byte'
assert module.patch(after) == after, 'Idempotent application required'
assert after.count(module.MARKER) == 1

def block(source, start, end):
    a = source.index(start)
    b = source.index(end, a + len(start))
    return source[a:b]

for start, end in [
    ('function multiNextRoundSeconds(', 'function multiStatusSummary('),
    ('function multiStatusSummary(', 'function multiResultText('),
    ('function syncStableBattleClock(', 'function predictionPickEntries('),
    ('function openMultiRound(){', 'function buildCanonicalReplay'),
    ('function pumpMulti(', 'loop=function(t)'),
    ('async function leaveMulti(', "document.querySelector('#mockRoom')"),
    ("const pauseExit=document.querySelector('#pauseExit');", "if(typeof document.addEventListener==='function')document.addEventListener('keydown',e=>{if(!pausePanelOpen)"),
    ('function syncEarnedCount(', 'function syncPersonalResult('),
]:
    assert block(before, start, end) == block(after, start, end), start

scripts = lambda text: re.findall(r'<script\b[^>]*>([\s\S]*?)</script>', text, re.I)
assert scripts(module.unpatch(after)) == scripts(before)
assert re.findall(r'<style\b[^>]*>([\s\S]*?)</style>', after, re.I) == re.findall(r'<style\b[^>]*>([\s\S]*?)</style>', before, re.I)
assert re.findall(r'(?:src|href)="([^"]+)"', after) == re.findall(r'(?:src|href)="([^"]+)"', before)
for text in ["#app #gameScreen #resultPanel #message:empty { display:none; }", "results.hidden=!resultsText", "q('#next').disabled=true;const nextLabel=multiNextRoundLabel(s,clock)"]:
    assert text in after
assert "'予想なし'" not in after and "'的中なし'" not in after and "'予想：なし'" not in after
print('PASS seven-fragment exact allowlist and byte-for-byte inverse; input SHA unchanged; idempotence; CSS/assets unchanged')
print('PASS protocol, receipts, prediction deadlines, payout, replay pump, countdown labels/deadlines, leaveMulti and pause exit unchanged')
print('Candidate SHA256', hashlib.sha256(candidate.read_bytes()).hexdigest())
