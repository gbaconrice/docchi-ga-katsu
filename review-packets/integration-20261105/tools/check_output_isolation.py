#!/usr/bin/env python3
"""Regression: inherited OUT cannot redirect test output outside scratch space."""
from pathlib import Path
import argparse,json,os,subprocess,tempfile,sys
p=argparse.ArgumentParser(description=__doc__)
for name in ['runtime','html','css']:p.add_argument('--'+name,type=Path,required=True)
a=p.parse_args();root=Path(__file__).resolve().parent
with tempfile.TemporaryDirectory(prefix='docchi-output-guard-') as temp:
 sentinel=Path(temp)/'must-not-change.json';data=b'OUT destination must not be modified\n';sentinel.write_bytes(data)
 env={**os.environ,'OUT':str(sentinel)}
 args=[sys.executable,str(root/'run_tests.py'),'--runtime',str(a.runtime.resolve()),'--html',str(a.html.resolve()),'--css',str(a.css.resolve())]
 result=subprocess.run(args,env=env,text=True,encoding='utf-8',errors='replace',capture_output=True,timeout=1800)
 if sentinel.read_bytes()!=data:raise SystemExit('FAIL: inherited OUT modified a file outside runner scratch')
 if result.returncode:print(result.stdout+result.stderr);raise SystemExit(result.returncode)
 at=result.stdout.rfind('{\n  "passed"');summary=json.loads(result.stdout[at:])
 assert summary['passed']==summary['total']==37,summary
 print(json.dumps({'output_isolation':'passed','inherited_OUT_sentinel_unchanged':True,'mock_suites':summary['total'],'mock_suites_passed':summary['passed'],'limits':'Historical cloud reference and mocks only.'},indent=2))
