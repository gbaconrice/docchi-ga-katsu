const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto'),{api}=require('./harness.cjs');
const original=fs.readFileSync(__dirname+'/../tests/original-v8.js','utf8'),originalTypes=vm.runInNewContext('('+original.match(/const TYPES=(.*);/)[1]+')');
for(const [k,t] of Object.entries(originalTypes))for(const [stat,value] of Object.entries(t))assert.equal(api.TYPES[k][stat],value,k+'.'+stat);
const html=fs.readFileSync(__dirname+'/../index.html','utf8'),physics=fs.readFileSync(__dirname+'/../physics/physics.js','utf8');
assert(html.includes(physics));assert.equal(crypto.createHash('sha256').update(physics).digest('hex'),'a61625ea357b559f8bb888a05429453495793eff9c65ad7e331875f0f4d54bd0');
console.log('PASS: reviewed physics source exact SHA; original HP/damage/rate/speed/armor/heal stats unchanged; intentional radius/reach additions only');
