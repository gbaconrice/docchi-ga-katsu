"""Exact byte-level scope proof for the standalone-ranking notice removal."""
from pathlib import Path
import hashlib
import importlib.util
import re
import sys

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('notice_patch', HERE / 'patch-external-ranking-notice.py')
patch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(patch)
base = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE.parents[1] / 'terrain-emote-feedback/source-fixed-final/index.html'
candidate = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / 'source-candidate/index.html'
before_bytes, after_bytes = base.read_bytes(), candidate.read_bytes()
before, after = before_bytes.decode('utf-8'), after_bytes.decode('utf-8')
assert hashlib.sha256(before_bytes).hexdigest() == patch.BASE_SHA
assert after_bytes == before_bytes.replace(patch.OLD.encode(), patch.NEW.encode(), 1)
assert after == patch.patch(before)
assert patch.unpatch(after).encode() == before_bytes, 'Every unrelated byte must be preserved'
assert patch.patch(after) == after, 'Composition must be idempotent'
assert patch.NOTICE not in after
assert len(before_bytes) - len(after_bytes) == len(patch.NOTICE.encode())
for invalid in [before.replace(patch.OLD, 'unknown'), before + patch.OLD, before + patch.NEW, after + patch.NOTICE]:
    try:
        patch.patch(invalid)
    except ValueError:
        pass
    else:
        raise AssertionError('ambiguous/unknown input was accepted')

def block(text, start, end):
    a = text.index(start)
    b = text.index(end, a + len(start))
    return text[a:b]

for start, end in [
    ('const ScoreBridge=', 'const ReplayTransfer='),
    ('async function submitFinalScore(', 'function attemptFinalScore('),
    ("document.querySelector('#scoreRetry').onclick=", "document.querySelector('#roomScoreRetry').onclick="),
]:
    assert block(before, start, end) == block(after, start, end)
assert re.findall(r'<style\b[^>]*>([\s\S]*?)</style>', after, re.I) == re.findall(r'<style\b[^>]*>([\s\S]*?)</style>', before, re.I)
assert re.findall(r'(?:src|href)="([^"]+)"', after) == re.findall(r'(?:src|href)="([^"]+)"', before)
print('PASS exact one-literal removal; inverse restores every original byte; immutable input SHA; idempotence; fail-closed anchors')
print('PASS ScoreBridge, submit eligibility, retry handlers, markup, CSS and all embedded assets are byte-for-byte unchanged')
print('Candidate SHA256', hashlib.sha256(after_bytes).hexdigest())
