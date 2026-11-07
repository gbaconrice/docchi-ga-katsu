'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function reassemble(dir){
 const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
 assert.equal(m.format,'docchi-demand-images-v1');
 const read=f=>{assert(!path.isAbsolute(f));if(f.startsWith('../'))assert(/^\.\.\/(?:gravity-lazy-v3\/images|reconstructed-20261106\/assets|review-fixes-20261107\/images)\/[a-f0-9]{64}\.(?:png|webp)$/.test(f),'Unreviewed shared asset path');else assert(!f.split(/[\\/]/).includes('..'));return fs.readFileSync(path.join(dir,f));};
 for(const a of m.files){const b=read(a.file);assert.equal(b.length,a.bytes,a.file);assert.equal(sha(b),a.sha256,a.file);}
 const originals=new Map(m.imageAssets.map(a=>{const b=read(a.file);assert.equal(sha(b),a.sha256,a.file);const value='data:'+a.mime+';base64,'+b.toString('base64');assert.equal(sha(value),a.stringSha256);return [a.url,value];}));
 const restore=text=>text.replace(/https:\/\/gbaconrice\.github\.io\/docchi-ga-katsu\/releases\/(?:review-fixes-20261107\/images|gravity-lazy-v3\/images|reconstructed-20261106\/assets)\/[a-f0-9]{64}\.(?:png|webp)/g,url=>{assert(originals.has(url));return originals.get(url);});
 let source=restore(read(m.reconstructionTemplate).toString('utf8'));
 for(const s of m.scripts){let code=read(s.file).toString('utf8');if(s.index===3){assert(code.includes(m.runtimeHelper));code=code.replace(m.runtimeHelper,'');for(const [before,after,count=1] of m.runtimeEdits){assert.equal(code.split(after).length,count+1);code=code.split(after).join(before);}}code=restore(code);assert.equal(sha(code),s.originalSha256,s.file);source=source.replace('@@DEMAND_SCRIPT_'+s.index+'@@',()=>code);}
 const css=restore(read(m.css.file).toString('utf8'));assert.equal(sha(css),m.css.originalSha256);source=source.replace('@@DEMAND_STYLE_0@@',()=>css);
 assert(!source.includes('@@DEMAND_'));assert.equal(sha(source),m.sourceSha256);assert.equal(Buffer.byteLength(source),m.sourceBytes);
 return {source,manifest:m};
}
module.exports={reassemble};
if(require.main===module){const {source,manifest}=reassemble(path.resolve(process.argv[2]));if(process.argv[3]){fs.mkdirSync(path.dirname(path.resolve(process.argv[3])),{recursive:true});fs.writeFileSync(process.argv[3],source);}console.log(JSON.stringify({result:'PASS',sourceSha256:manifest.sourceSha256,bytes:Buffer.byteLength(source)},null,2));}
