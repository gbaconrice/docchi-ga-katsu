"""Run focused Gravity UI regressions against one explicit source and its captured baselines."""
import concurrent.futures,hashlib,json,os,subprocess,sys,time
from pathlib import Path
here=Path(__file__).resolve().parent
source=Path(sys.argv[1]).resolve();base=Path(sys.argv[2]).resolve();baselines=Path(sys.argv[3]).resolve();harness=Path(sys.argv[4]).resolve();out=Path(sys.argv[5]).resolve();out.mkdir(parents=True,exist_ok=True)
animation=Path(os.environ.get('HOME_ANIMATION_DIR',str(here/'home-animation' if (here/'home-animation').is_dir() else here.parent/'home-animation')))
cases=[('profiles-emotes',here/'test-profiles-emotes.cjs',[str(source)]),('avatar-fallback-errors',here/'test-avatar-fallback-errors.cjs',[str(source)]),('waiting-room-lobby',here/'test-waiting-room-lobby.cjs',[]),('pick-icon-layout',here/'test-pick-icon-layout.cjs',[str(source)]),('results-waits-logs',here/'test-results-waits-logs.cjs',['--integrated']),('boss-status-logs',here/'test-boss-status-logs.cjs',[]),('home-gif',animation/'test-home-gif.cjs',[str(source)])]
def run(case):
 name,file,args=case;folder=out/name;folder.mkdir(exist_ok=True);env=os.environ.copy();env.update(GAME_HTML=str(source),BASELINE_HTML=str(base),BOSS_LOG_BASELINE=str(baselines/'before-boss-status-logs.html'),ENGINE_HARNESS=str(harness),HARNESS_PATH=str(harness),REPORT_DIR=str(folder));start=time.monotonic()
 try:r=subprocess.run(['node',str(file),*args],env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=900);status=r.returncode;log=r.stdout
 except Exception as e:status=-1;log=repr(e)
 (folder/'test.log').write_text(log);result={'suite':name,'status':status,'seconds':round(time.monotonic()-start,2)};print(json.dumps(result),flush=True);return result
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(run,cases))
report={'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'suites':results,'passed':sum(r['status']==0 for r in results),'failed':sum(r['status']!=0 for r in results)};(out/'summary.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report));sys.exit(bool(report['failed']))
