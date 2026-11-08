'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),assert=require('node:assert/strict'),{spawnSync}=require('child_process');
const [uiFile,gifFile,reportFile]=process.argv.slice(2);assert(uiFile&&gifFile&&reportFile,'Usage: test-fixed-gif-replacement.cjs UI_HTML FIXED_GIF REPORT_JSON');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),ui=fs.readFileSync(uiFile,'utf8'),gif=fs.readFileSync(gifFile),OLD='c97c1221053bc61e654bf76408ac0ada9560a3c5dafffd520cd2f648477b1eae',NEW='f194872040aa40216e601203501b678380f3f5fa72fd3f3e58f8f02e8acad084';
assert.equal(sha(ui),'b296d5d85653c7d3906d807f7c74cce087c60fa2692a5f6e51b542a6c0c49be0');assert.equal(sha(gif),NEW);assert.equal(gif.length,992844);
const matches=[...ui.matchAll(/data:image\/gif;base64,([A-Za-z0-9+/]+={0,2})/g)];assert.equal(matches.length,1);assert.equal(sha(Buffer.from(matches[0][1],'base64')),OLD);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'docchi-fixed-gif-')),checks=[];
function check(name,input,asset,pass){const n=checks.length,src=path.join(tmp,n+'.html'),dst=path.join(tmp,n+'-out.html'),img=path.join(tmp,n+'.gif');fs.writeFileSync(src,input);fs.writeFileSync(img,asset);const r=spawnSync(process.execPath,[path.join(__dirname,'replace-home-gif.cjs'),src,dst,img],{encoding:'utf8',maxBuffer:1024*1024});assert.equal(r.status===0,pass,name);if(!pass)assert(!fs.existsSync(dst),'Failure must not write output');checks.push({name,pass:true});return pass?fs.readFileSync(dst,'utf8'):null;}
try{
 const replacement='data:image/gif;base64,'+gif.toString('base64');const result=check('exact original GIF replaces directly; all other source bytes unchanged',ui,gif,true);assert.equal(result.replace(replacement,matches[0][0]),ui);
 check('wrong source GIF is refused','<img src="data:image/gif;base64,'+Buffer.from('GIF89a-unrecognized').toString('base64')+'">',gif,false);
 check('already replaced source is refused','<img src="'+replacement+'">',gif,false);
 check('duplicate source GIF is refused',matches[0][0]+matches[0][0],gif,false);
 check('wrong replacement bytes are refused',matches[0][0],Buffer.from(matches[0][1],'base64'),false);
 fs.mkdirSync(path.dirname(path.resolve(reportFile)),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify({oldGifSHA256:OLD,newGifSHA256:NEW,newGifBytes:gif.length,uiSourceSHA256:sha(ui),checks},null,2)+'\n');for(const c of checks)console.log('PASS '+c.name);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
