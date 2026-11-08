'use strict';
// Portable exact-source tests. Browser geometry is checked separately through CUA.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const game=path.resolve(process.env.GAME_HTML||path.join(__dirname,'../source/index.html'));
const baseline=path.resolve(process.env.BASELINE_HTML||path.join(__dirname,'../../game-ui-inspect/home-audio-fix/source/index.html'));
const harness=path.resolve(process.env.ENGINE_HARNESS||path.join(__dirname,'../../game-ui-inspect/test-suite/tests/harness.cjs'));
const reportDir=path.resolve(process.env.REPORT_DIR||path.join(__dirname,'../validation/home-room-display'));
const html=fs.readFileSync(game,'utf8'),before=fs.readFileSync(baseline,'utf8');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),checks=[];
function test(name,fn){fn();checks.push({name,pass:true});console.log('PASS',name);}
function block(text,start,end){let a=text.indexOf(start),b=text.indexOf(end,a+start.length);assert(a>=0&&b>a,start);return text.slice(a,b);}
test('existing art/audio payload order and bytes are unchanged',()=>{
 const assets=s=>[...s.matchAll(/data:[^;\s"'<>]+;base64,[A-Za-z0-9+/=]+/g)].map(m=>hash(m[0]));
 assert.deepEqual(assets(html),assets(before));assert(assets(html).length>0);
});
test('home art fills app; safe-area and content size rules are preserved',()=>{
 assert(html.includes('#app:has(#homeScreen:not([hidden])) { background-image:url('));
 assert(!html.includes('#homeScreen.home-screen { background-image:url('));
 assert(html.includes('#app #homeScreen.home-screen { position:static; isolation:auto; background-image:none; }'));
 assert.equal(block(html,'/* Standalone gets device safe areas only.','h1 {'),block(before,'/* Standalone gets device safe areas only.','h1 {'));
 assert.equal(block(html,'/* Home: one title, two clear large actions. */','.home-choice, .cta {'),block(before,'/* Home: one title, two clear large actions. */','.home-choice, .cta {'));
 assert.equal(block(html,'/* Multiplayer entry: one quiet paper sheet','/* UI uses flat edges'),block(before,'/* Multiplayer entry: one quiet paper sheet','/* UI uses flat edges'));
});
test('routine bottom chatter removed; actionable errors and choices remain',()=>{
 for(const text of ['部屋へ接続しています…','対戦準備中…','共有時刻で再生（推定誤差±','時計または記録の確認待ち'])assert(!html.includes(text),text);
 assert(html.includes('#app > #multiStatusRow:not(:has(#multiSummary:not(:empty), #roomStatus:not(:empty), #roomScoreStatus:not([hidden]):not(:empty), #roomScoreRetry:not([hidden]), #exitRoom:not([hidden])))'));
 for(const text of ['部屋IDを入力してください','版が異なります。全員でページを更新してください。','戦場条件が一致しないため参加・観戦できません。確定済みの残高は維持されます。','オフラインひとり用は継続できます。','退出失敗：','ひとり用へ移るには、先に部屋から退出してください。','観戦記録の転送障害（確定結果は維持）','離脱者は10戦後に終了','記録を再試行'])assert(html.includes(text),text);
 assert.equal(block(html,'function multiStatusSummary(', '\nfunction ',),block(before,'function multiStatusSummary(', '\nfunction '));
});
test('single shared sound node; only home and menu dock are suppressed',()=>{
 assert.equal((html.match(/id="soundToggle"/g)||[]).length,1);
 assert(html.includes('#app #homeScreen > #soundToggle { display:none !important; }'));
 assert(html.includes('#app > #menuAudioDock { display:none !important; }'));
 assert.equal(block(html,'function syncAudioControlPlacement(', '\nsyncAudioControlPlacement(screenMode);'),block(before,'function syncAudioControlPlacement(', '\nsyncAudioControlPlacement(screenMode);'));
 assert.equal(block(html,'  function createBattleAudio(', '    if (muteButton?.addEventListener)'),block(before,'  function createBattleAudio(', '    if (muteButton?.addEventListener)'));
 const hideRules=html.split('\n').filter(line=>line.length<2000&&line.includes('soundToggle')&&/display\s*:\s*none/.test(line));
 assert(hideRules.every(rule=>rule.includes('#homeScreen')),hideRules.join('\n'));
});
test('full-app ambience geometry and reduced motion lifecycle',()=>{
 const code=html.match(/<script id="home-ambience-controller">([\s\S]*?)<\/script>/)[1];
 const listeners=new Map(),styles={},observed=[];
 const home={hidden:false,clientWidth:350,clientHeight:700,scrollHeight:700,scrollWidth:350};
 const app={clientWidth:390,clientHeight:844},layer={hidden:true,dataset:{},style:{setProperty:(k,v)=>styles[k]=v}};
 const reduced={matches:false,addEventListener(){},removeEventListener(){}};
 const win={document:null,navigator:{},matchMedia:()=>reduced,addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k),ResizeObserver:class{constructor(f){this.callback=f;}observe(n){observed.push(n);}disconnect(){}},MutationObserver:class{constructor(f){}observe(){}disconnect(){}}};
 const doc={hidden:false,getElementById:id=>({homeScreen:home,app,homeAmbience:layer}[id]),addEventListener(){},removeEventListener(){}};win.document=doc;win.window=win;
 vm.runInNewContext(code,win);
 for(const [w,h] of [[320,568],[390,844],[430,932],[844,390],[1180,780]]){
  app.clientWidth=w;app.clientHeight=h;win.DocchiHomeAmbience.sync();const scale=Math.max(w/1024,h/1536);
  assert.equal(parseFloat(styles['--home-art-width']),1024*scale);assert.equal(parseFloat(styles['--home-art-height']),1536*scale);assert.equal(layer.dataset.motion,'running');
 }
 assert(observed.includes(home)&&observed.includes(app));
 home.hidden=true;win.DocchiHomeAmbience.sync();assert(layer.hidden);
 home.hidden=false;reduced.matches=true;win.DocchiHomeAmbience.sync();assert.equal(layer.dataset.motion,'reduced-motion');
 reduced.matches=false;home.scrollHeight=701;win.DocchiHomeAmbience.sync();assert.equal(layer.dataset.motion,'overflow');
 home.scrollHeight=700;win.DocchiHomeAmbience.sync();assert.equal(layer.dataset.motion,'running');
 win.DocchiHomeAmbience.destroy();assert.equal(layer.dataset.motion,'disposed');assert(layer.hidden);
});

(async()=>{
 process.env.GAME_HTML=game;delete require.cache[require.resolve(harness)];const {ev,nodes,context}=require(harness);
 test('home room game room home round trip preserves audio singleton/listener',()=>{
  for(const id of ['#homeScreen','#menuAudioDock','#gameToolbar']){ev('document.querySelector('+JSON.stringify(id)+')');nodes.get(id).appendChild=function(n){n.parentNode=this;};}
  const audio=nodes.get('#soundToggle'),audioController=ev('battleAudio'),muted=audioController.muted,listeners=[];
  audio.addEventListener=(kind,listener)=>{if(kind==='click')listeners.push(listener);};
  const probe=ev("createBattleAudio({document,muteButton:document.querySelector('#soundToggle')})");
  assert.equal(listeners.length,1);const listener=listeners[0];
  for(const [mode,parent] of [['home','#homeScreen'],['room','#menuAudioDock'],['game','#gameToolbar'],['room','#menuAudioDock'],['home','#homeScreen'],['game','#gameToolbar']]){
   ev('showScreen('+JSON.stringify(mode)+')');assert.equal(nodes.get('#soundToggle'),audio);assert.equal(audio.parentNode,nodes.get(parent));assert.equal(listeners[0],listener);assert.equal(listeners.length,1);assert.equal(ev('battleAudio'),audioController);assert.equal(audioController.muted,muted);assert.equal(audio.hidden,false);
  }
  probe.destroy();
 });
 await ev("enterNative('join')");assert.equal(nodes.get('#roomStatus').textContent,'部屋IDを入力してください');
 await ev("loadNativeSDK=async()=>{throw Error('接続に失敗しました');};enterNative('create')");assert.equal(nodes.get('#roomStatus').textContent,'接続に失敗しました / オフラインひとり用は継続できます。');
 ev("loadNativeSDK=()=>new Promise(()=>{});enterNative('create')");assert.equal(nodes.get('#roomStatus').textContent,'');ev('multiBusy=false;');
 test('join validation and native connection failure remain; connecting text is empty',()=>{});
 ev("beginMock();");
 test('real mock room summary/exit remain without routine protocol text',()=>{
  assert.equal(nodes.get('#roomStatus').textContent,'');assert(nodes.get('#multiSummary').textContent.length);assert.equal(nodes.get('#exitRoom').hidden,false);
  ev("multiError='再接続してください';displayMultiState();");assert.equal(nodes.get('#roomStatus').textContent,'再接続してください');
  ev("multiError='';multiSnapshot={...multiSnapshot,replayError:'transfer-failed'};displayMultiState();");assert(nodes.get('#roomStatus').textContent.includes('観戦記録の転送障害'));
  ev("multiSnapshot={...multiSnapshot,replayError:null,phase:'stopped',stoppedReason:'content-revision-mismatch'};displayMultiState();");assert.equal(nodes.get('#roomStatus').textContent,'版が異なります。全員でページを更新してください。');
 });
 await ev('leaveMulti()');
 test('successful exit clears both old status and summary',()=>{assert.equal(nodes.get('#roomStatus').textContent,'');assert.equal(nodes.get('#multiSummary').textContent,'');assert.equal(nodes.get('#exitRoom').hidden,true);});
 await ev("multiAdapter={exit:async()=>{throw Error('通信エラー');}};leaveMulti()");
 test('failed exit retains retry instruction',()=>assert.equal(nodes.get('#roomStatus').textContent,'退出失敗：通信エラー。もう一度退出してください。'));
 fs.mkdirSync(reportDir,{recursive:true});fs.writeFileSync(path.join(reportDir,'home-room-display.json'),JSON.stringify({source:game,sha256:hash(html),baseline,baselineSha256:hash(before),checks},null,2)+'\n');
 console.log('PASS '+checks.length+' home/room checks');
})().catch(e=>{console.error(e);process.exitCode=1;});
