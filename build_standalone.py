from pathlib import Path
import re
root=Path(__file__).resolve().parent;s=(root/'source/solo-v3.template').read_text()
# Reinsert reviewed physics and early-army source on every build.
physics_start=s.index('// Independent collision candidate.')
physics_end=s.index('function damage(',physics_start)
s=s[:physics_start]+(root/'physics/physics.js').read_text()+'\n'+s[physics_end:]
early_start=s.index('// Optional opening generator:')
early_end=s.index('let previousArmyKinds',early_start)
s=s[:early_start]+(root/'physics/early-generator.js').read_text().split("if(typeof module")[0]+'\n'+s[early_end:]
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
b=bundle('ReplayTransfer','multiplayer/replay-transfer.mjs')
b+=bundle('MultiProtocol','multiplayer/protocol.mjs','const {packReplay,validMeta,createSender,createReceiver}=ReplayTransfer;')
b+=bundle('MultiBinding','multiplayer/wallet-binding.mjs','const wallet=Wallet;const {createSession}=MultiProtocol;')
b+=bundle('SDKAdapter','multiplayer/sdk-adapter.mjs','const {PROTOCOL,encode,decode,createSession}=MultiProtocol;')
b+=bundle('CompactReplay','replay/compact-replay.mjs')
s=s.replace('const TYPES=',b+'\nconst TYPES=',1)
s=s.replace('<div class="wallet"',"""<details id="modePanel"><summary>ひとり / みんなで観戦（通信試作）</summary><p class="hint">SDK実機未検証。部屋操作はボタンを押したときだけ接続します。既定はオフラインひとり用です。</p><div class="actions"><button id="mockRoom">2人ローカルmock</button><button id="createRoom">部屋を作る</button></div><label>部屋ID <input id="roomId" type="text" autocomplete="off" maxlength="128"></label><div class="actions"><button id="joinRoom">部屋に参加</button><button id="exitRoom" hidden>退出してひとりに戻る</button></div><button id="beginRound" hidden>このメンバーで第1戦へ</button><p id="roomStatus" class="hint">オフライン・ひとり用</p></details><div class="wallet" """,1)
# fix replacement attribute spacing
s=s.replace('class="wallet"  aria-label','class="wallet" aria-label')
code=(root/'source/multi-ui.js').read_text()
s=s.replace('freshWallet();openPrediction((Math.random()*4294967296)>>>0);requestAnimationFrame(loop);',code+'\nfreshWallet();openPrediction((Math.random()*4294967296)>>>0);requestAnimationFrame(loop);')
(root/'index.html').write_text(s)
