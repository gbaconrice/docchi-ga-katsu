'use strict';
// Exact approved 44-label expectation adapter. No properties are omitted.
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
function pinned(file,hash){const b=fs.readFileSync(path.join(__dirname,'fixtures',file));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),hash);return JSON.parse(b);}
const changes=pinned('approved-unit-names.json',"1de2e001cee816c1f0ae721d1ca6cdca202e0f650b63c01ef0e9c8098104735c"),old=pinned('previous-unit-names.json',"19664e7c7842b913ad3df0315f9978bd49ec4e175511b9ed8e0a4aa145698b3d");
module.exports=function applyApprovedNames(types){assert.equal(Object.keys(types).length,301);assert.equal(Object.keys(changes).length,44);for(const [id,name] of Object.entries(changes)){assert.equal(types[id].name,old[id],id+' exact old name');types[id].name=name;}return types;};
