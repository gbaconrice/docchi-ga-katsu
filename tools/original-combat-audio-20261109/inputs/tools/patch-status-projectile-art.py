#!/usr/bin/env python3
"""Isolated art-only patch. Apply major effect art first for shared licensed FX.
Original target bytes are pinned separately so inverse preserves other patches.
"""
from pathlib import Path
import json, hashlib, argparse, re
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'status-projectile'
MARKER='// AQSP ART-ONLY ADDITIONS BEGIN\n'
END='// AQSP ART-ONLY ADDITIONS END\n'
TARGETS=['drawGuardIndicator','drawExposureIndicator','drawRootIndicator','drawHealingBlockIndicator','drawOrdinaryMovementCues','drawBossStatus','drawMaterialProjectile','drawOrbGlyph','drawSparkGlyph','drawCinderArrow','drawGuidedFlight','drawMushroomTrap','drawProjectile']
def function_text(source,name):
    start=source.index('function '+name+'(')
    opening=source.index('{',start)
    depth=1;i=opening+1;quote=None;line=False;block=False
    while i<len(source):
        c=source[i];n=source[i+1:i+2]
        if line:
            if c=='\n':line=False
        elif block:
            if c=='*' and n=='/':block=False;i+=1
        elif quote:
            if c=='\\':i+=1
            elif c==quote:quote=None
        elif c in "'\"`":quote=c
        elif c=='/' and n=='/':line=True;i+=1
        elif c=='/' and n=='*':block=True;i+=1
        elif c=='{':depth+=1
        elif c=='}':
            depth-=1
            if not depth:return source[start:i+1]
        i+=1
    raise ValueError('Unterminated '+name)
def payload():
    source=(DATA/'status-projectile-art.js').read_text()
    helper, replacement=source.split('// REPLACEMENT FUNCTIONS\n',1)
    olds=json.loads((DATA/'original-target-functions.json').read_text())
    fallback='const aqspFallback=Object.freeze({\n'+',\n'.join(n+':'+olds[n].replace('function '+n+'(','function(',1) for n in TARGETS)+'\n});\n'
    return MARKER+helper+'\n'+fallback+END,{n:function_text(replacement,n) for n in TARGETS},olds

def patch(source):
    if MARKER in source:raise ValueError('Already patched')
    additions,reps,olds=payload()
    for name in TARGETS:
        if source.count(olds[name])!=1:raise ValueError('Target changed or missing: '+name)
        source=source.replace(olds[name],reps[name],1)
    anchor='function drawGuardIndicator('
    source=source.replace(anchor,additions+anchor,1)
    return source

def unpatch(source):
    additions,reps,olds=payload()
    if source.count(additions)!=1:raise ValueError('Missing or changed additions')
    source=source.replace(additions,'',1)
    for name in TARGETS:
        if source.count(reps[name])!=1:raise ValueError('Replacement changed: '+name)
        source=source.replace(reps[name],olds[name],1)
    return source
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('output');p.add_argument('--inverse',action='store_true');args=p.parse_args()
    src=Path(args.source).read_text();result=unpatch(src) if args.inverse else patch(src)
    Path(args.output).parent.mkdir(parents=True,exist_ok=True);Path(args.output).write_text(result)
    print(json.dumps({'sourceSHA256':hashlib.sha256(src.encode()).hexdigest(),'outputSHA256':hashlib.sha256(result.encode()).hexdigest(),'targets':TARGETS,'bytesAdded':len(result.encode())-len(src.encode())}))
