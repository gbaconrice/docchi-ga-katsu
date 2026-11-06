/* Isolated rendering fixtures. No SDK, network transport, score or user data. */
(()=>{
'use strict';
const q=id=>document.getElementById(id);
const people=Array.from({length:8},(_,i)=>'a1-viewer-'+i);
function base(){
  DocchiQa.run('solo-left');setBattleLogOpen(false);cancelPersonalResult();
  multiSession=null;multiSnapshot=null;multiAdapter=null;multiReplay=null;multiPlayback=null;multiUser=null;
  showScreen('home');openSoloScreen();
}
function profiles(){return {getProfile:id=>({name:'参加者'+(people.indexOf(id)+1)})};}
function picks(){base();multiUser=people[0];multiAdapter=profiles();
 multiSnapshot={phase:'predict',participants:people,confirmedSides:[{userId:people[1],side:'A'},{userId:people[2],side:'B'}],selectedSides:people.slice(3).map((userId,i)=>({userId,side:i%2?'A':'B'})),readyIds:[],departedIds:[],cashedOutIds:[]};
 selectedSide=0;syncPredictionPicks(multiSnapshot);
 return measure();
}
function battle(){base();commitArmy(0);startPrediction();
 multiUser=people[0];multiAdapter=profiles();multiSnapshot={phase:'battle',participants:people,spectators:[],confirmedSides:people.map((userId,i)=>({userId,side:i%2?'A':'B'}))};
 multiSession={};syncParticipantRail(true,[{sender:people[2],emoji:'wow'}]);syncCrowdInspector();syncBattleLog(1000,true);draw();
 return measure();
}
function measure(){const box=id=>{const n=q(id),r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,width:r.width,height:r.height,hidden:n.hidden,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth}};
 return {fixture:true,liveSDK:false,viewport:[innerWidth,innerHeight],picks:{red:box('redPicks'),redStats:box('redStats'),blue:box('bluePicks'),blueStats:box('blueStats')},rail:box('participantRail'),game:box('gameScreen'),documentWidth:document.documentElement.scrollWidth};
}
window.A1Qa={picks,battle,measure};
})();
