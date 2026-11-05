#!/usr/bin/env python3
"""Run copied mock suites in temporary directories without modifying inputs."""
from pathlib import Path
import argparse,json,os,shutil,subprocess,tempfile,sys
sys.dont_write_bytecode=True
from verify_packet import ROOT,verify
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--runtime',type=Path,required=True);p.add_argument('--html',type=Path,required=True);p.add_argument('--css',type=Path,required=True);p.add_argument('--timeout',type=int,default=240);a=p.parse_args()
verify();runtime=a.runtime.resolve();html=a.html.resolve();css=a.css.resolve()
if not runtime.is_file() or not html.is_file() or not css.is_file():raise SystemExit('Runtime, HTML and CSS input files must exist')
if 'const CONTENT_REVISION=' not in html.read_text(encoding='utf-8'):raise SystemExit('HTML must contain the assembled runtime, not an external loader')
suites=json.loads((ROOT/'tests/suites.json').read_text(encoding='utf-8'));results=[]
with tempfile.TemporaryDirectory(prefix='docchi-review-tests-') as tmp:
 work=Path(tmp);shutil.copytree(ROOT/'tests/runtime',work/'runtime');shutil.copytree(ROOT/'tests/reward',work/'reward');shutil.copyfile(html,work/'reward/index.html')
 env={**os.environ,'GAME_JS':str(runtime),'PACKET_ROOT':str(ROOT),'GAME_HTML':str(html),'GAME_CSS':str(css),'STUDY_INSTRUMENT':'0','HELPER_JS':str(work/'runtime/corner-presentation-helper.js')};env.pop('NODE_OPTIONS',None);env.pop('OUT',None)
 cases=[('runtime',n,['node',n+'.cjs']) for n in suites['runtime']]+[('reward',n,['node','tests/'+n+'.cjs']) for n in suites['reward']]+[('reward',n+'-explicit-image-failure',['node','-r','./tests/adapted-fallback-preload.cjs','tests/'+n+'.cjs']) for n in suites['reward_explicit_image_failure']]
 for group,name,cmd in cases:
  try:
   r=subprocess.run(cmd,cwd=work/group,env=env,text=True,encoding='utf-8',errors='replace',capture_output=True,timeout=a.timeout);code=r.returncode;output=r.stdout+r.stderr
  except subprocess.TimeoutExpired:code=124;output='Timed out'
  row={'test':name,'group':group,'exit_code':code};results.append(row);print(json.dumps(row),flush=True)
  if code:print(output[-6000:],flush=True)
print(json.dumps({'passed':sum(x['exit_code']==0 for x in results),'total':len(results),'results':results,'limits':'Mock tests only; current normal-source and device acceptance are separate.'},indent=2))
raise SystemExit(0 if all(x['exit_code']==0 for x in results) else 1)
