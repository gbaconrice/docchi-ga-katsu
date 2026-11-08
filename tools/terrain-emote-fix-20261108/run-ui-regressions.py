"""Run the retained UI checks with only the explicitly superseded copy assertions updated."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

here = Path(__file__).resolve().parent
prior = Path(os.environ.get('PRIOR_UI_TOOLS', str(here.parent / 'gravity-room-feedback-20261108'))).resolve()
source, base, baselines, harness, out = map(lambda value: Path(value).resolve(), sys.argv[1:6])
out.mkdir(parents=True, exist_ok=True)
animation = Path(os.environ.get('HOME_ANIMATION_DIR', str(prior / 'home-animation' if (prior / 'home-animation').is_dir() else prior.parent / 'home-animation')))
cases = [
    ('profiles-emotes', prior / 'test-profiles-emotes.cjs', [str(source)]),
    ('avatar-fallback-errors', prior / 'test-avatar-fallback-errors.cjs', [str(source)]),
    ('waiting-room-lobby', here / 'test-waiting-room-lobby.cjs', []),
    ('pick-icon-layout', prior / 'test-pick-icon-layout.cjs', [str(source)]),
    ('results-waits-logs', here / 'test-results-waits-logs.cjs', ['--integrated']),
    ('boss-status-logs', prior / 'test-boss-status-logs.cjs', []),
    ('home-gif', animation / 'test-home-gif.cjs', [str(source)]),
]

def run(case):
    name, file, args = case
    folder = out / name
    folder.mkdir(exist_ok=True)
    env = os.environ.copy()
    env.update(GAME_HTML=str(source), BASELINE_HTML=str(base), BOSS_LOG_BASELINE=str(baselines / 'before-boss-status-logs.html'), ENGINE_HARNESS=str(harness), HARNESS_PATH=str(harness), REPORT_DIR=str(folder))
    started = time.monotonic()
    try:
        result = subprocess.run(['node', str(file), *args], env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=900)
        status, log = result.returncode, result.stdout
    except Exception as exc:
        status, log = -1, repr(exc)
    (folder / 'test.log').write_text(log)
    record = {'suite': name, 'status': status, 'seconds': round(time.monotonic() - started, 2)}
    print(json.dumps(record), flush=True)
    return record

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    results = list(pool.map(run, cases))
report = {'sourceSHA256': hashlib.sha256(source.read_bytes()).hexdigest(), 'suites': results, 'passed': sum(row['status'] == 0 for row in results), 'failed': sum(row['status'] != 0 for row in results)}
(out / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report))
sys.exit(bool(report['failed']))
