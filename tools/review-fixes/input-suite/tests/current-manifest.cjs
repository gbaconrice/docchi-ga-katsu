const fs=require('fs'),crypto=require('crypto'),assert=require('assert');
const m=JSON.parse(fs.readFileSync('CURRENT_PREVIEW_MANIFEST.json','utf8'));
assert.equal(m.index,'index.html');
const html=fs.readFileSync(m.index,'utf8').replace(/\r\n/g,'\n'),actual=crypto.createHash('sha256').update(html,'utf8').digest('hex');
if(fs.existsSync('INTEGRATION_CANDIDATE_MANIFEST.json')){
 const c=JSON.parse(fs.readFileSync('INTEGRATION_CANDIDATE_MANIFEST.json','utf8'));
 assert.equal(c.status,'unpublished');assert.equal(c.publishedIndexSHA256,m.indexSHA256,'published metadata must remain unchanged');assert.equal(actual,c.candidateIndexSHA256,'candidate manifest must match candidate HTML');
 const revision=html.match(/const CONTENT_REVISION="([a-f0-9]{64})"/);assert(revision);assert.equal(revision[1],c.contentRevision,'candidate revision must match source');
}else assert.equal(actual,m.indexSHA256,'manifest must match LF-normalized index');
console.log('PASS published metadata and LF-normalized current or explicitly unpublished candidate');
