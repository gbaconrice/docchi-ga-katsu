"""Do not frame deployed ground traps as flying combat projectiles."""

def patch(s):
 old="for(const p of shots){if(!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;b.left=Math.min(b.left,p.x-10);"
 new="for(const p of shots){if(p.trap||p.k==='punchcap_mushroom'||p.done||!Number.isFinite(p.x)||!Number.isFinite(p.y))continue;b.left=Math.min(b.left,p.x-10);"
 assert s.count(old)==1, 'Expected one automatic camera projectile loop'
 return s.replace(old,"/* Ground traps are not follow subjects. Replay snapshots retain kind, not trap flags. */\n "+new,1)

if __name__=='__main__':
 import sys,pathlib
 p=pathlib.Path(sys.argv[2]);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(patch(pathlib.Path(sys.argv[1]).read_text()))
