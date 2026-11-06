const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),assert=require('assert'),cp=require('child_process');
const root=process.cwd(),html=fs.readFileSync('index.html','utf8'),build=path.join(root,'tools/build-gravity-single.cjs');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
assert.equal(scripts.length,5);assert(scripts[4][1].includes('home-ambience-controller'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'docchi-build-test-'));
try{
 fs.writeFileSync(path.join(temp,'index.html'),html);
 cp.execFileSync(process.execPath,[build],{cwd:temp,encoding:'utf8',stdio:'pipe'});
 const output=path.join(temp,'gravity-generated'),manifest=JSON.parse(fs.readFileSync(path.join(output,'manifest.json'),'utf8'));
 const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
 assert.equal(manifest.sourceSha256,sha(html));assert.equal(manifest.notPublished,true);
 const names=['host-layout.js','boot-errors.js','viewport.js','game-runtime.js','home-ambience.js'];
 for(let i=0;i<names.length;i++)assert.equal(fs.readFileSync(path.join(output,names[i]),'utf8'),scripts[i][2]);
 for(const f of manifest.files){const b=fs.readFileSync(path.join(output,f.name));assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256);}
 for(const [entry,shell]of [['index.html','gravity'],['local.html','standalone']]){
  const s=fs.readFileSync(path.join(output,entry),'utf8');assert(s.includes('data-host-shell="'+shell+'"'));
  assert(s.includes('id="home-ambience-controller"'));assert(s.indexOf('game-runtime.js')<s.indexOf('home-ambience.js'));
  const urls=[...s.matchAll(/\bsrc="([^"]+)"/g)].map(m=>m[1]);assert.equal(urls.length,6);
 }
 const body=fs.readFileSync(path.join(output,'body-fragment.html'),'utf8');assert(body.includes('id="homeAmbience"'));assert(!/<script\b/i.test(body));
 console.log('PASS GRAVITY and standalone split builds retain all five original scripts, home motion DOM, defer order and exact manifest hashes');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
