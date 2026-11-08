'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const input=path.resolve(process.argv[2]||''),out=path.resolve(process.argv[3]||'');
assert(process.argv[2]&&process.argv[3], 'Usage: apply-home-gif.cjs INPUT_HTML OUTPUT_HTML');
assert.notEqual(input,out,'Use a separate output file.');
const required=['home-tavern.gif','home-gif.css','home-gif-controller.js'];
const candidates=process.env.HOME_ANIMATION_DIR?[path.resolve(process.env.HOME_ANIMATION_DIR)]:[path.join(__dirname,'home-animation'),path.resolve(__dirname,'../home-animation')];
const root=candidates.find(dir=>required.every(file=>fs.existsSync(path.join(dir,file))));
assert(root,'Missing home-animation package. Required: '+required.join(', '));
const gif=fs.readFileSync(path.join(root,'home-tavern.gif'));
assert.equal(gif.subarray(0,6).toString(),'GIF89a');
const before=fs.readFileSync(input,'utf8');
assert(!before.includes('home-background-gif-v1'),'Already applied.');
const oldCss=/\/\* Existing 1024 x 1536 tavern art stays still\.[\s\S]*?@media \(prefers-reduced-motion:reduce\), \(update:slow\) \{[\s\S]*?\n\}/;
assert(oldCss.test(before),'Expected original local-light CSS.');
let next=before.replace(oldCss,fs.readFileSync(path.join(root,'home-gif.css'),'utf8').trim());
// Keep every original static artwork byte. A variable also gives CSS an immediate
// preference fallback while the media-query change event is being delivered.
const backdrop=/#app:has\(#homeScreen:not\(\[hidden\]\)\) \{ background-image:(url\(data:image\/png;base64,[^)]+\));/;
assert(backdrop.test(next),'Expected the existing full-surface PNG backdrop.');
next=next.replace(backdrop,(whole,url)=>'#app:has(#homeScreen:not([hidden])) { --home-still-image:'+url+'; background-image:var(--home-still-image);');
const oldDecor=/    <div id="homeAmbience" class="home-ambience" aria-hidden="true" hidden>[\s\S]*?\n      <\/div>\n    <\/div>\n/;
assert(oldDecor.test(next),'Expected original CSS-light decoration.');next=next.replace(oldDecor,'');
const script=/<script id="home-ambience-controller">[\s\S]*?<\/script>/;
assert.equal((next.match(new RegExp(script.source,'g'))||[]).length,1);
const controller=fs.readFileSync(path.join(root,'home-gif-controller.js'),'utf8').replace('__HOME_GIF_SOURCE__','data:image/gif;base64,'+gif.toString('base64'));
next=next.replace(script,'<script id="home-ambience-controller">\n'+controller+'</script>');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,next);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const oldPng=before.match(backdrop)[1];assert(next.includes('--home-still-image:'+oldPng+';'));assert.equal(next.split(oldPng).length-1,before.split(oldPng).length-1);
const scripts=s=>[...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);assert.deepEqual(scripts(next).slice(0,-1),scripts(before).slice(0,-1));
for(const id of ['homeTitle','soloStart','showMultiplayer']){const pattern=new RegExp('<(?:h1|button) id="'+id+'"[\\s\\S]*?<\\/(?:h1|button)>');assert.equal(before.match(pattern)?.[0],next.match(pattern)?.[0]);}
console.log(JSON.stringify({input,out,sourceSHA256:sha(before),outputSHA256:sha(next),gifSHA256:sha(gif),gifBytes:gif.length,addedBytes:Buffer.byteLength(next)-Buffer.byteLength(before),originalPngAndLogoAndControlsPreserved:true,existingGameScriptsUnchanged:true,scripts:scripts(next).length},null,2));
