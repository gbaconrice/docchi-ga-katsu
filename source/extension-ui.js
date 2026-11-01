// Explicit solo-only extension boundary. Multiplayer stays its existing ten-round protocol.
function syncExtensionControls(){const atBoundary=!multiSession&&state==='result'&&walletState?.completedRounds===walletState?.maxRounds&&!soloRunEnded;document.querySelector('#extensionChoices').hidden=!atBoundary;const net=document.querySelector('#checkpointNet');net.hidden=!atBoundary;if(atBoundary)net.textContent='開始時より '+credits(currentWallet().score);if(atBoundary){const next=document.querySelector('#next');next.hidden=false;next.disabled=false;next.textContent='終了';}}
function extendSoloRun(additionalRounds){if(multiSession||state!=='result'||soloRunEnded||walletState.completedRounds!==walletState.maxRounds)return false;const before=walletState;walletState=SoloWallet.extendSession(before,{sessionId:before.sessionId,requestId:'extend:'+round,roundId:round,additionalRounds});try{nextPrediction();}catch(error){walletState=before;throw error;}syncExtensionControls();return true;}
function finishSoloRun(){if(multiSession||state!=='result'||walletState.completedRounds!==walletState.maxRounds||soloRunEnded)return false;soloRunEnded=true;void submitFinalScore('finish');showScreen('home');document.querySelector('#soloStart').textContent='もう一度';syncExtensionControls();return true;}
for(const n of [5,10])document.querySelector('#extend'+n).onclick=()=>extendSoloRun(n);
const extensionNext=document.querySelector('#next').onclick;document.querySelector('#next').onclick=e=>{if(!multiSession&&state==='result'&&round>=sessionRoundLimit())finishSoloRun();else extensionNext(e);};
const extensionStart=document.querySelector('#soloStart').onclick;document.querySelector('#soloStart').onclick=e=>{if(soloRunEnded&&!multiSession){round=1;freshWallet();openPrediction((Math.random()*4294967296)>>>0);}extensionStart(e);};
const extensionUpdate=update;update=function(){extensionUpdate();syncExtensionControls();};
const extensionDisplay=displayMultiState;displayMultiState=function(){extensionDisplay();syncExtensionControls();};
const extensionLoop=loop;loop=function(t){extensionLoop(t);syncExtensionControls();};
syncExtensionControls();
