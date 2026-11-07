#!/usr/bin/env python3
"""Restore the existing loss flight without modifying gameplay, sound, gain effects or UI."""
from pathlib import Path
import sys
old='''  const paths=[];
  for(let i=0;i<12;i++){
   const lag=i*15,dx=width+18+(i%4)*16-origin.x,dy=height+18+((i*7)%5)*9-origin.y;
   const points=Array.from({length:25},(_,j)=>{const t=j/24;return {x:origin.x+Math.round(dx*t*t),y:origin.y+Math.round(dy*t*t),t};});
   // Long amounts retain the signed number instead of sending coins across it.
   if(points.some((p,j)=>j>0&&(crosses(points[j-1],p,rect)||crosses(points[j-1],p,wallet))))return false;
   paths.push({lag,points});
  }
'''
new='''  // Keep the original flight whenever it fits. A left-aligned wallet needs
  // a slightly steeper launch to clear its digits before fanning to the right.
  // One unsafe coin must not suppress all twelve when a nearby curve is safe.
  let paths=[];
  for(const horizontalPower of [2,2.25,2.5]){
   const candidate=[];
   for(let i=0;i<12;i++){
    const lag=i*15,dx=width+18+(i%4)*16-origin.x,dy=height+18+((i*7)%5)*9-origin.y;
    const points=Array.from({length:25},(_,j)=>{const t=j/24;return {x:origin.x+Math.round(dx*Math.pow(t,horizontalPower)),y:origin.y+Math.round(dy*t*t),t};});
    if(points.some((p,j)=>j>0&&(crosses(points[j-1],p,rect)||crosses(points[j-1],p,wallet))))break;
    candidate.push({lag,points});
   }
   if(candidate.length===12){paths=candidate;break;}
  }
  // Truly obstructed long amounts retain readable signed feedback.
  if(!paths.length)return false;
'''
def patch(s):
    # The source uses one space for function body indentation.
    a='\n'.join(l[1:] if l.startswith(' ') else l for l in old.split('\n'))
    b='\n'.join(l[1:] if l.startswith(' ') else l for l in new.split('\n'))
    if s.count(a)!=1: raise ValueError(f'Expected one original loss path block, found {s.count(a)}')
    return s.replace(a,b)
if __name__=='__main__':
    if len(sys.argv)!=3: raise SystemExit('Usage: patch-miss-animation.py SOURCE OUTPUT (distinct paths)')
    src,out=map(Path,sys.argv[1:]);
    if src.resolve()==out.resolve(): raise SystemExit('Use a separate output; canonical source is not overwritten.')
    out.write_text(patch(src.read_text()))
    print(out)
