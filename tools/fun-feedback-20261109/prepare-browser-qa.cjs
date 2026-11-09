'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const {makeEntry}=require('./entry-loader.cjs');
const source=path.resolve(process.argv[2]||'releases/fun-feedback-20261109'),out=path.resolve(process.argv[3]||'');
assert(process.argv[3], 'Usage: node prepare-browser-qa.cjs RELEASE_DIRECTORY NEW_OUTPUT_DIRECTORY');
assert(!fs.existsSync(out),'Output must not exist');
fs.mkdirSync(path.join(out,'release'),{recursive:true});
const m=JSON.parse(fs.readFileSync(path.join(source,'manifest.json')));
for(const row of m.files){const b=fs.readFileSync(path.join(source,row.file));assert.equal(b.length,row.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),row.sha256);}
const files=[m.css.file,...m.loadOrder];for(const f of files)fs.copyFileSync(path.join(source,f),path.join(out,'release',f));
const scripts=m.loadOrder.map(file=>{const r=m.scripts.find(s=>s.file===file);const id=r&&({0:'host-layout-config',3:'game-runtime',4:'home-ambience-controller'}[r.index]);return {file,...(id?{id}:{})};});
fs.copyFileSync(path.join(__dirname,'qa-harness.js'),path.join(out,'qa-harness.js'));
fs.writeFileSync(path.join(out,'index.html'),makeEntry({base:'./release/',cssFile:m.css.file,scripts,gravity:false}));
fs.writeFileSync(path.join(out,'qa.html'),makeEntry({base:'./release/',cssFile:m.css.file,scripts:[...scripts,{file:'../qa-harness.js'}],gravity:false}));
console.log(JSON.stringify({sourceSha256:m.sourceSha256,out,images:'unchanged public image URLs',solo:'index.html',multi:'qa.html?role=host&session=test1 then qa.html?role=guest&session=test1',gravity:'append &hostShell=gravity (or ?hostShell=gravity for index)',eightPlayers:'append &bots=6 to host URL'},null,2));
