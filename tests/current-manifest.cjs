const fs=require('fs'),crypto=require('crypto'),assert=require('assert');
const m=JSON.parse(fs.readFileSync('CURRENT_PREVIEW_MANIFEST.json','utf8'));
assert.equal(m.index,'index.html');
const html=fs.readFileSync(m.index,'utf8').replace(/\r\n/g,'\n');
assert.equal(crypto.createHash('sha256').update(html,'utf8').digest('hex'),m.indexSHA256,'manifest must match LF-normalized HTML');
console.log('PASS current manifest matches LF-normalized index');
