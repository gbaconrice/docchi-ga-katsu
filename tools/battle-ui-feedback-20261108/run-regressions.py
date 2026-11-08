"""Run the focused regression suites against an explicitly rebuilt source."""
import concurrent.futures,hashlib,json,os,subprocess,sys,time
from pathlib import Path
root=Path.cwd();here=Path(__file__).resolve().parent
source=Path(sys.argv[1]).resolve();baselines=Path(sys.argv[2]).resolve();harness=Path(sys.argv[3]).resolve();out=Path(sys.argv[4]).resolve();out.mkdir(parents=True,exist_ok=True)
cases=[
 ('participant-rail',None,[str(source)]),('event-log',None,[]),('draw-matchup','draw-matchup',['--integrated']),
 ('late-boss-rounds','draw-matchup',['--integrated']),('zero-bet-text','zero-bet-text',[]),('home-room-display','home-room-display',[]),
 ('speed-damage','speed-damage',[]),('speed-natural','speed-damage',[]),('trap-placement','trap-placement',[]),('trap-camera',None,[]),
 ('dead-unit-motion','dead-unit-motion',[]),('summon-name','summon-name',[]),('matchup-diversity','matchup-diversity',[]),('distinct-opponents','distinct-opponents',[]),('effect-art','effect-art',[]),('battle-ui',None,['--focused']),('trait-terms',None,[])]
def run(c):
 name,before,args=c;folder=out/name;folder.mkdir(exist_ok=True);env=os.environ.copy();env.update(GAME_HTML=str(source),ENGINE_HARNESS=str(harness),HARNESS_PATH=str(harness),REPORT_DIR=str(folder),BASELINE_HTML=str(baselines/('before-'+before+'.html') if before else baselines/'before-round-summary.html'),ART_BASELINE_HTML=str(baselines/'before-effect-art.html'))
 file=here/'validation/test-trait-terms.cjs' if name=='trait-terms' else here/('test-'+name+'.cjs');start=time.monotonic()
 try:r=subprocess.run(['node',str(file),*args],env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=900);status=r.returncode;log=r.stdout
 except Exception as e:status=-1;log=repr(e)
 (folder/'test.log').write_text(log);result={'suite':name,'status':status,'seconds':round(time.monotonic()-start,2)};print(json.dumps(result),flush=True);return result
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(run,cases))
report={'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'suites':results,'passed':sum(r['status']==0 for r in results),'failed':sum(r['status']!=0 for r in results)};(out/'summary.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report));sys.exit(bool(report['failed']))
