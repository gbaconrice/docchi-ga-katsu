'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(process.argv[2]||process.env.GAME_HTML||'index.html','utf8');
const scripts=[...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);
const boot=scripts.find(x=>x.includes('window.__gameBootDiagnostics = history;'));
assert(boot&&boot.includes('avatar-resource-fallback-20261108'));
for(const script of scripts)new vm.Script(script);
const own='https://gbaconrice.github.io/docchi-ga-katsu/releases/test/game-runtime.js';
let count=0;const pass=s=>{count++;console.log('PASS '+s)};
function fixture(){
 const node={hidden:true,textContent:''},callbacks={};
 const context={document:{scripts:[{id:'game-runtime',src:own}],getElementById:()=>node},location:{href:'https://gbaconrice.github.io/docchi-ga-katsu/qa.html'},addEventListener:(name,fn)=>{callbacks[name]=fn}};
 context.window=context;vm.runInNewContext(boot,context);return {node,context,report:callbacks.error};
}
function img({marked=true,handled=true}={}){const image={tagName:'IMG',hidden:false,getAttribute:key=>key==='data-avatar-fallback'&&marked?'true':null};if(handled)image.onerror=()=>{image.hidden=true};return image;}
for(const complete of [false,true]){
 const f=fixture();if(complete)f.context.__gameBootComplete();const portrait=img();
 f.report({type:'error',target:portrait});portrait.onerror();
 assert.equal(portrait.hidden,true);assert.equal(f.node.hidden,true);assert.equal(f.context.__gameBootDiagnostics.length,0);
 pass('handled avatar resource failure keeps fallback and no '+(complete?'runtime':'startup')+' banner');
}
for(const options of [{marked:false},{handled:false}]){const f=fixture();f.report({type:'error',target:img(options)});assert.equal(f.node.hidden,false);assert.equal(f.context.__gameBootDiagnostics.length,1)}pass('unmarked or unhandled IMG errors retain existing diagnostics');
for(const fields of [{filename:own,message:'real exception',lineno:42},{message:'real exception'},{error:new Error('actual runtime failure')}]){const f=fixture();f.report({type:'error',target:img(),...fields});assert.equal(f.node.hidden,false);assert.equal(f.context.__gameBootDiagnostics.length,1)}pass('runtime details are never hidden even when target resembles an avatar');
for(const tagName of ['SCRIPT','LINK']){const f=fixture();f.report({type:'error',target:{tagName,src:tagName==='SCRIPT'?own:null,href:tagName==='LINK'?own.replace('.js','.css'):null}});assert.equal(f.node.hidden,false);assert(f.node.textContent.includes('必要なファイル'));assert.equal(f.context.__gameBootDiagnostics.length,1)}pass('own SCRIPT and LINK resource failures still report required-file failure');
{const f=fixture();f.context.__gameBootComplete();f.report({type:'error',target:f.context,filename:own,message:'ReferenceError: missing',lineno:99});assert.equal(f.node.hidden,false);assert(f.node.textContent.includes('ゲーム画面でエラー'));assert.equal(f.context.__gameBootDiagnostics[0].line,99)}pass('real game runtime exceptions retain filename, line and runtime banner');
{const f=fixture();f.report({type:'error',target:f.context,message:'Script error.'});assert.equal(f.node.hidden,false);assert(f.node.textContent.includes('外部スクリプトのエラー詳細'));f.report({type:'error',target:{tagName:'AUDIO'}});assert.equal(f.context.__gameBootDiagnostics.length,2)}pass('opaque script errors and unrelated resource behavior remain unchanged');
const marks=(source.match(/img\.setAttribute\('data-avatar-fallback','true'\)/g)||[]).length;assert([2,3].includes(marks));assert.equal(marks,(source.match(/img\.referrerPolicy='no-referrer';/g)||[]).length,'Every existing avatar fallback, including lobby, must be marked');
const override='#app #gameScreen[data-reaction-open="true"] > #gameToolbar > #reaction-backdrop { pointer-events:auto; }';
assert(source.includes(override));assert(source.lastIndexOf(override)>source.indexOf('#app #gameScreen[data-reaction-open="true"] > #gameToolbar > * { pointer-events:none; }'));
pass('all existing avatar fallback paths marked; precise backdrop override outranks toolbar child rule');
console.log('AVATAR RESOURCE / BACKDROP PASS '+count+' cases; all embedded scripts compile.');
