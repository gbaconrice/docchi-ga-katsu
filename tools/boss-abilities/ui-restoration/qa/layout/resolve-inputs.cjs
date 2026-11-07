'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const expected=require('./preserved-test-hashes.json');
function resolveInputs(argument){
 if(!process.env.GAME_REPOSITORY)throw Error('Set GAME_REPOSITORY to the repository containing the preserved historical input suite.');
 const repository=path.resolve(process.env.GAME_REPOSITORY),sourcePath=path.resolve(process.env.GAME_HTML||argument||path.join(repository,'index.html'));
 if(!fs.existsSync(sourcePath))throw Error('GAME_HTML source does not exist: '+sourcePath);
 const candidates=[process.env.GAME_TEST_ROOT,path.join(repository,'tools/review-fixes/input-suite/tests'),path.join(repository,'validation-preview/tests'),path.join(repository,'tests')].filter(Boolean).map(p=>path.resolve(p));
 const testRoot=candidates.find(dir=>Object.entries(expected).every(([name,want])=>{const p=path.join(dir,name);return fs.existsSync(p)&&hash(fs.readFileSync(p))===want;}));
 if(!testRoot)throw Error('No preserved test directory matches all173 original SHA256 values. Checked: '+candidates.join(', '));
 return {repository,sourcePath,testRoot};
}
module.exports={resolveInputs,hash,expected};
