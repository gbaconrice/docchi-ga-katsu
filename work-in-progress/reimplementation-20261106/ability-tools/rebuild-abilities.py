"""Apply NEW ability reconstruction to the hash-verified recovered 119-test baseline.

Usage: python tools/reconstruction/rebuild-abilities.py BASELINE_HTML OUTPUT_HTML
Does not publish. Refuses to replace an output. No claim to recover lost final bytes.
After placing OUTPUT_HTML in a candidate, run tools/integration/refresh-candidate.py
from that candidate and rerun its regression tests; this refreshes its manifest.
"""
from pathlib import Path
import hashlib, subprocess, sys, tempfile

baseline, output = map(lambda p: Path(p).resolve(), sys.argv[1:3])
assert not output.exists(), 'Output exists; refuse to overwrite'
assert hashlib.sha256(baseline.read_bytes()).hexdigest() == '040ff2037e7ba6760a22b174b0d742224e45fc242cbce8731c3a98f8473b1d95', 'Not the recovered 119-test baseline'
here = Path(__file__).resolve().parent
output.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='ability-reconstruction-', dir=output.parent) as tmp:
    revival, summoner = Path(tmp)/'revival.html', Path(tmp)/'summoner.html'
    for script, source, target in [
        ('revival-original-apply.recovered.py', baseline, revival),
        ('summoner-original-apply.recovered.py', revival, summoner),
        ('integrate-abilities.py', summoner, output),
    ]:
        subprocess.run([sys.executable, str(here/script), str(source), str(target)], check=True)
print('NEW reconstruction written; refresh candidate fingerprint and rerun tests before use.')
