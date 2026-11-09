#!/usr/bin/env python3
"""Reversible, audio-only patch. No simulation, assets, events or outcomes edited."""
from pathlib import Path
import base64,re,zlib
HERE=Path(__file__).resolve().parent
BEGIN='/* COMBAT_AUDIO_QUALITY_V1_BEGIN */\n'
END='/* COMBAT_AUDIO_QUALITY_V1_END */\n'
MARKER='/*\n * どっちが勝つ？ — original, synthesized battle audio.'
def replace_once(s,a,b):
 if s.count(a)!=1:raise ValueError('Audio patch anchor count != 1: '+a[:90])
 return s.replace(a,b,1)
def patch(source):
 if BEGIN in source:raise ValueError('Combat audio already patched; unpatch before rebuilding')
 a=source.index(MARKER);b=source.index('\nconst ReactionLane=',a)
 original=source[a:b];new=original
 new=replace_once(new,'    let ambientNodes = [];',(HERE/'combat-audio-runtime.js').read_text()+'\n    let ambientNodes = [];')
 new=replace_once(new,'    function playCue(kind, intensity = 1, guard = null, fromQueue = false) {','    function playCue(kind, intensity = 1, guard = null, fromQueue = false) {\n      if(contactCues.has(kind) && enabled()){const result=playContactCue(kind,intensity,guard);if(result!==null)return result;}')
 p=new.index('    function ingestCombatEvents(');q=new.index('    function ingestReplayEffects(',p)
 new=new[:p]+(HERE/'combat-audio-events.js').read_text()+'\n'+new[q:]
 new=replace_once(new,'      sfxMintBuffers = Object.create(null);','      sfxMintBuffers = Object.create(null);\n      contactBank = null;')
 new=replace_once(new,'      currentBattle = key;\n      phase = \'battle\'; paused = false;',"      currentBattle = key;\n      contactBank?.reset(); lastHitAt=-Infinity; lastReleaseAt=-Infinity; lastStatusAt=-Infinity; lastHealAt=-Infinity; lastWindupAt=-Infinity;\n      phase = 'battle'; paused = false;")
 backup=base64.b64encode(zlib.compress(original.encode(),9)).decode()
 bank=(HERE/'combat-audio-bank.js').read_text()
 assert '__COMBAT_SAMPLE_DATA__' not in bank
 block=BEGIN+'/* ORIGINAL_AUDIO_ZLIB_BASE64:'+backup+' */\n'+bank+'\n'+new+END
 return source[:a]+block+source[b:]
def unpatch(source):
 a=source.index(BEGIN);b=source.index(END,a)+len(END)
 saved=re.search(r'/\* ORIGINAL_AUDIO_ZLIB_BASE64:([A-Za-z0-9+/=]+) \*/',source[a:b])
 if not saved:raise ValueError('No reversible audio backup')
 original=zlib.decompress(base64.b64decode(saved[1])).decode()
 return source[:a]+original+source[b:]
if __name__=='__main__':
 import argparse
 p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('output',type=Path);p.add_argument('--unpatch',action='store_true');a=p.parse_args()
 a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text((unpatch if a.unpatch else patch)(a.source.read_text()))
