"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto"),cp=require("child_process"),assert=require("assert/strict");
const [candidate,baseline,output]=process.argv.slice(2);assert(candidate&&baseline,"Usage: node verify.cjs CANDIDATE_HTML PUBLISHED_B080_HTML [OUTPUT_DIR]");
const expected=require("./summary.json"),sha=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
assert.equal(sha(candidate),expected.sourceSHA256,"candidate hash");assert.equal(sha(baseline),expected.publishedBaselineSHA256,"published baseline hash");
const out=path.resolve(output||path.join(__dirname,"generated"));fs.mkdirSync(out,{recursive:true});
for(const name of ["test-preserved-structures.cjs","test-preserved-replays.cjs"]){
 const r=cp.spawnSync(process.execPath,[path.join(__dirname,"tools",name)],{stdio:"inherit",env:{...process.env,GAME_HTML:path.resolve(candidate),BASELINE_HTML:path.resolve(baseline),ENGINE_HARNESS:path.join(__dirname,"tools/harness.cjs"),GENERATION_AUDIT:path.join(__dirname,"generation-audit-b080.json"),REPORT_DIR:out}});if(r.status!==0)process.exit(r.status||1);
}
assert.equal(sha(candidate),expected.sourceSHA256,"candidate changed during verification");console.log("PASS final-source structures and seven complete canonical replays");
