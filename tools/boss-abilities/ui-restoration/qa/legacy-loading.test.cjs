'use strict';
// Execute original tests unchanged, redirecting only their read of index.html.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const requiredPath=name=>{if(!process.env[name])throw Error(name+' must point to an existing local input');return path.resolve(process.env[name]);};
const repo=requiredPath('GAME_REPOSITORY'),candidate=requiredPath('GAME_HTML');
const shim=Object.create(fs);
shim.readFileSync=(p,...a)=>fs.readFileSync(typeof p==='string'&&path.resolve(p)===path.join(repo,'index.html')?candidate:p,...a);
const old=process.cwd(),crypto=require('node:crypto'),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const protectedFiles=[candidate,path.join(repo,'tests','inline-image-play.cjs'),path.join(repo,'tests','character-loading.cjs'),path.join(repo,'tests','boot-smoke.cjs')];
const protectedHashes=Object.fromEntries(protectedFiles.map(p=>[p,hash(p)]));
try{
 process.chdir(repo);
 for(const name of ['inline-image-play','character-loading']){
  console.log('ORIGINAL_TEST',name);
  const file=path.join(repo,'tests',name+'.cjs'),req=createRequire(file);
  new Function('require','__dirname',fs.readFileSync(file,'utf8'))(id=>id==='fs'?shim:req(id),path.dirname(file));
 }
}finally{process.chdir(old);for(const [p,digest] of Object.entries(protectedHashes))if(hash(p)!==digest)throw Error('Test input changed: '+p);}
