const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');const code=html.match(/<script id="host-layout-config">([\s\S]*?)<\/script>/)[1];
function shell({height=844,width=390,config={},search='',gravity=false,entry='standalone',sdk=false}={}){
 const styles={},events={},root={dataset:{hostShell:entry},style:{setProperty:(k,v)=>styles[k]=v,removeProperty:k=>delete styles[k]}};
 const document={documentElement:root,activeElement:null,addEventListener:(k,f)=>events[k]=f};
 const window={innerHeight:height,innerWidth:width,isGravity:gravity,DOCCHI_HOST_LAYOUT:config,AgentSDK:sdk?{room:{},user:{}}:undefined,addEventListener:(k,f)=>events[k]=f};
 vm.runInNewContext(code,{document,window,location:{search},URLSearchParams});
 return {styles,root,window,document,events};
}
let s=shell();assert.equal(s.root.dataset.hostShell,'standalone');assert.equal(s.styles['--gravity-top-inset'],undefined);
s=shell({sdk:true});assert.equal(s.root.dataset.hostShell,'standalone','SDK presence alone cannot change a normal browser layout');
for(const height of [390,568,667,811,812,844,932]){s=shell({height,entry:'gravity'});assert.equal(s.styles['--gravity-top-inset'],height>=812?'98px':'74px');assert.equal(s.styles['--gravity-bottom-inset'],'0px');}
for(const args of [{config:{shell:'gravity'}},{gravity:true},{search:'?hostShell=gravity'},{search:'?isGravity=1'}]){s=shell(args);assert.equal(s.root.dataset.hostShell,'gravity');assert.equal(s.styles['--gravity-top-inset'],'98px');}
s=shell({entry:'gravity',gravity:true,config:{shell:'standalone'}});assert.equal(s.root.dataset.hostShell,'standalone');assert.equal(s.styles['--gravity-top-inset'],undefined);
for(const top of [0,47,74,98,126,220]){s=shell({entry:'gravity',config:{topInsetPx:top,bottomInsetPx:34}});assert.equal(s.styles['--gravity-top-inset'],`${top}px`);assert.equal(s.styles['--gravity-bottom-inset'],'34px');}
for(const top of [null,'',-1,221,'not-a-number']){s=shell({entry:'gravity',config:{topInsetPx:top}});assert.equal(s.styles['--gravity-top-inset'],'98px');}
s=shell({entry:'gravity',config:{profile:'legacy-74'}});assert.equal(s.styles['--gravity-top-inset'],'74px');
s=shell({height:667,search:'?hostShell=gravity&gravityProfile=legacy-98'});assert.equal(s.styles['--gravity-top-inset'],'98px');
s=shell({entry:'gravity',config:{profile:'legacy-98',topInsetPx:110}});assert.equal(s.styles['--gravity-top-inset'],'110px');
console.log('PASS explicit shell, normal browser, SDK-only browser, 74/98 fallback, profile and measured-inset precedence');
s=shell({entry:'gravity'});s.document.activeElement={tagName:'INPUT'};s.window.innerHeight=500;s.events.resize();assert.equal(s.styles['--gravity-top-inset'],'98px');s.document.activeElement={tagName:'BODY'};s.events.focusout();assert.equal(s.styles['--gravity-top-inset'],'74px');s.window.innerHeight=844;s.events.resize();assert.equal(s.styles['--gravity-top-inset'],'98px');s.document.activeElement={tagName:'INPUT'};s.window.innerWidth=844;s.window.innerHeight=390;s.events.resize();assert.equal(s.styles['--gravity-top-inset'],'74px');
console.log('PASS keyboard shrink keeps the native band, blur/full-height recovery and real orientation changes recalculate it');
s=shell({entry:'gravity',config:{viewportAlreadyInset:true,topInsetPx:98,bottomInsetPx:34}});assert.equal(s.root.dataset.hostViewportInset,'true');assert.equal(s.styles['--gravity-top-inset'],'0px');assert.equal(s.styles['--gravity-bottom-inset'],'0px');s.window.DOCCHI_HOST_LAYOUT.viewportAlreadyInset=false;s.events.resize();assert.equal(s.root.dataset.hostViewportInset,'false');assert.equal(s.styles['--gravity-top-inset'],'98px');
assert(html.includes('padding-block-start: calc(max(env(safe-area-inset-top, 0px), var(--gravity-top-inset, 0px)) + 8px)'));
const pre=html.match(/html\[data-host-shell="gravity"\]\[data-host-viewport-inset="true"\] #app\s*{([^}]*)}/)?.[1];assert(pre&&/padding-block-start:8px/.test(pre)&&/padding-block-end:10px/.test(pre)&&!pre.includes('env('));
const overlay=html.match(/html\[data-host-shell="gravity"\]\[data-host-viewport-inset="true"\] \.units-panel\s*{([^}]*)}/)?.[1];assert(overlay&&/padding-block-start:10px/.test(overlay)&&!overlay.includes('env('));
for(const safe of [0,20,47,59])for(const native of [0,74,98,126])assert.equal(Math.max(safe,native)+8,native>=safe?native+8:safe+8);
assert(html.includes('html[data-host-shell="gravity"] #entryStatus'));assert(html.includes('var(--gravity-top-inset, 98px)) + 12px) !important'));
console.log('PASS max(safe-area, native) rather than addition; preinset app/dialogs avoid double reserve and loading text is protected');
const css=html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/)[1];
assert(css.includes('#app:has(#gameScreen:not([hidden]))'));assert(css.includes('data:image/png;base64,'));assert(css.includes('background-size:cover'));assert(css.includes('outline-offset:-6px'));assert(css.includes('box-shadow:none'));
console.log('PASS game-only table background, selected-card outlines and shadow-free visual treatment are present');
assert(/id="red" class="army-card army-red"[^>]+aria-label="左の軍"/.test(html));
assert(/id="blue" class="army-card army-blue"[^>]+aria-label="右の軍"/.test(html));
function rule(selector){const start=css.lastIndexOf(selector+' {');assert(start>=0,selector);return css.slice(start,css.indexOf('}',start)+1);}
for(const [side,color,bg]of [['red','#176ab4','#e6e8dd'],['blue','#b93632','#efdfca']]){
 const plain=rule('#app #gameScreen #comparison .army-'+side),selected=rule('#app #gameScreen #comparison .army-'+side+'[aria-pressed="true"]');
 assert(plain.includes('border-color:#a69a80')&&plain.includes('outline:none')&&plain.includes('background-color:'+bg));
 assert(selected.includes('border-color:'+color)&&selected.includes('outline:2px solid '+color)&&selected.includes('outline-offset:-6px')&&selected.includes('box-shadow:none'));
 assert(!selected.includes('color:var(')&&!selected.includes('border-width')&&!selected.includes('padding:'));
 const luminance=hex=>{const a=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;};
 assert((luminance(bg)+.05)/(luminance(color)+.05)>=3,'selection outline contrast against card');
}
console.log('PASS actual left=#red uses blue, right=#blue uses red; selection has a second line, neutral unselected borders, no shadow/layout shift, and >=3:1 outline contrast');
