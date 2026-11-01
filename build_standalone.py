from pathlib import Path
import re,json,base64
root=Path(__file__).resolve().parent;s=(root/'source/solo-v3.template').read_text()
# Reinsert reviewed physics and early-army source on every build.
physics_start=s.index('// Independent collision candidate.')
physics_end=s.index('function damage(',physics_start)
s=s[:physics_start]+(root/'physics/physics.js').read_text()+'\n'+s[physics_end:]
early_start=s.index('// Optional opening generator:')
early_end=s.index('let previousArmyKinds',early_start)
s=s[:early_start]+(root/'physics/early-generator.js').read_text().split("if(typeof module")[0]+'\n'+s[early_end:]
contract=json.loads((root/'physics/monster-contract.json').read_text())
monster_types={k:{field:value for field,value in meta.items() if field!='cost'} for k,meta in contract['types'].items()}
s=s.replace('const keys=Object.keys(TYPES)',"Object.assign(TYPES,"+json.dumps(monster_types)+");for(const k of Object.keys(TYPES)){TYPES[k].collisionLayer??='ground';TYPES[k].attackTargetMask??=(['archer','cannon'].includes(k)?['ground','air']:['ground']);}let pendingSummons=[],combatEvents=[];\nconst keys=Object.keys(TYPES)")
s=s.replace("function setup(s){seed=", "function setup(s){pendingSummons=[];combatEvents=[];seed=")
s=s.replace("const COST={sword:3,shield:4,spear:3,archer:3,cannon:6,rider:8,healer:4};", "const COST={sword:3,shield:4,spear:3,archer:3,cannon:6,rider:8,healer:4};Object.assign(COST,"+json.dumps({k:meta['cost'] for k,meta in contract['types'].items()})+");")
monster_meta=json.loads((root/'assets/monsters/monster_units.json').read_text())['roles']
monster_assets={k+'_'+side:'data:image/png;base64,'+base64.b64encode((root/'assets/monsters'/file).read_bytes()).decode() for k,m in monster_meta.items() for side,file in [('blue',m['atlas']),('red',m['red_atlas'])]}
monster_block='const MONSTER_META='+json.dumps(monster_meta)+';\nObject.assign(SPRITE_ASSETS,'+json.dumps(monster_assets)+');\n'
s=re.sub(r'const MONSTER_META=[^\n]*\nObject.assign\(SPRITE_ASSETS,[^\n]*\n',lambda m:monster_block,s)
arena_data='data:image/png;base64,'+base64.b64encode((root/'assets/arena/arena_moss_court_480x538.png').read_bytes()).decode()
arena_code='const ARENA_ASSET='+json.dumps(arena_data)+';const arenaImage=typeof Image!==\'undefined\'?new Image():null;if(arenaImage){arenaImage.onload=()=>draw();arenaImage.src=ARENA_ASSET;}function drawArenaFloor(){if(arenaImage&&arenaImage.complete&&arenaImage.naturalWidth){ctx.imageSmoothingEnabled=false;ctx.drawImage(arenaImage,0,0,480,538);}else{ctx.fillStyle=\'#35463d\';ctx.fillRect(0,0,480,538);}}\n'
s=s.replace('function draw(){',arena_code+'function draw(){',1)
def bundle(name,path,dep=''):
 src=(root/path).read_text()
 exports=[]
 for line in src.splitlines():
  m=re.match(r'export (?:async )?function (\w+)',line)
  if m:exports.append(m[1])
  m=re.match(r'export const (.*)',line)
  if m:
   # multiple declaration names before '='
   exports.extend(re.findall(r'(?:^|,)\s*(\w+)\s*=',m[1]))
 src=re.sub(r'^import .*?;\n','',src,flags=re.M)
 return 'const '+name+'=(()=>{'+dep+'\n'+src.replace('export ','')+'\nreturn {'+','.join(exports)+'};})();\n'
s=s.replace('/* WALLET_MODULE */',bundle('Wallet','wallet/wallet.mjs')+'const RUN_MODE=Wallet.GAME_MODE,TOTAL_ROUNDS=Wallet.TOTAL_ROUNDS;\n')
b=bundle('ReactionLane','reactions/reaction-channel.mjs')
b+=bundle('ScoreBridge','ranking/score-bridge.mjs')
b+=bundle('ReplayTransfer','multiplayer/replay-transfer.mjs')
b+=bundle('ReplayClock','multiplayer/clock-sync.mjs')
b+=bundle('MultiProtocol','multiplayer/protocol.mjs','const {packReplay,validMeta,createSender,createReceiver}=ReplayTransfer;const {createClockEstimator,sceneTickFromWallMs}=ReplayClock;')
b+=bundle('MultiBinding','multiplayer/wallet-binding.mjs','const wallet=Wallet;const {createSession}=MultiProtocol;')
b+=bundle('ReactionSdkBridge','reactions/reaction-sdk-bridge.mjs','const {parseReactionWire,REACTION_MODE,REACTION_PROTOCOL,REACTION_TYPE}=ReactionLane;')
b+=bundle('SDKAdapter','multiplayer/sdk-adapter.mjs','const {PROTOCOL,encode,decode,createSession}=MultiProtocol;const {createReactionSdkBridge}=ReactionSdkBridge;')
b+=bundle('CompactReplay','replay/compact-replay.mjs')
s=s.replace('const TYPES=',(root/'audio/special-sfx-bank.js').read_text()+'\n'+(root/'audio/battle-audio.js').read_text()+'\n'+b+'\nconst TYPES=',1)
s=s.replace('function loop(t)',(root/'source/effects-adapter.js').read_text()+'\nfunction loop(t)',1)
code=(root/'source/multi-ui.js').read_text()
s=s.replace('freshWallet();openPrediction((Math.random()*4294967296)>>>0);requestAnimationFrame(loop);',code+'\n'+(root/'source/screen-ui.js').read_text()+'\n'+(root/'source/flow-ui.js').read_text()+'\n'+(root/'source/audio-ui.js').read_text()+'\n'+(root/'motion/motion-ui.js').read_text()+'\n'+(root/'source/motion-adapter.js').read_text()+'\n'+(root/'source/reactions-ui.js').read_text()+'\nrequestAnimationFrame(loop);')
s=re.sub(r'<style>[\s\S]*?</style>', lambda m:'<style>'+(root/'source/ui.css').read_text()+'</style>',s,count=1)
s=re.sub(r'<main>[\s\S]*?</main>', lambda m:(root/'source/ui-shell.html').read_text(),s,count=1)
s=s.replace("canvas=document.querySelector('canvas')","canvas=document.querySelector('#field')")
s=s.replace('<script>', '<script id="game-runtime">',1)
s=s.replace('<body>', '<body>'+(root/'source/boot-monitor.html').read_text(),1)
s=s.replace('requestAnimationFrame(loop);\n</script>', 'requestAnimationFrame(loop);\nif(typeof window!==\'undefined\'&&window.__gameBootComplete)window.__gameBootComplete();\n</script>')
(root/'index.html').write_text(s)
