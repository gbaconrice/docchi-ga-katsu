'use strict';
// Append only the reviewed stylesheet to the pinned reconstructed source.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert');
const input=process.argv[2],output=process.argv[3];
if(!input||!output)throw Error('Usage: node apply-ui-polish.cjs SOURCE_INDEX NEW_OUTPUT_INDEX');
assert(!fs.existsSync(output),'Refusing to overwrite an existing output');
const source=fs.readFileSync(input,'utf8'),css=fs.readFileSync(path.join(__dirname,'ui-polish.css'),'utf8'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
assert.equal(sha(source),'cf52cf8e8bcefeedc24b44c604e264fb56cc014cab88aca2a3f5fd53ec5055e3','Input is not the verified 28a4eb20 source');
assert.equal(source.split('</style>').length,2);
const marker='\n/* ui-polish-20261106: home-preserving */\n',candidate=source.replace('</style>',marker+css+'\n</style>');
assert.equal(candidate.replace(marker+css+'\n',''),source);
assert(!/#homeScreen|#soloStart|#showMultiplayer|\.home-choice/.test(css));
fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,candidate);
console.log(JSON.stringify({sourceSha256:sha(source),candidateSha256:sha(candidate),cssSha256:sha(css),onlyCssAppended:true,homeUnchanged:true,output},null,2));
