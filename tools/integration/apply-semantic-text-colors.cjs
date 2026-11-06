#!/usr/bin/env node
// Apply display-only changes to a compatible index after validating every anchor.
// Allows independent ability/catalog additions. Does not overwrite a whole checkout.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const manifest=require('./semantic-text-colors.edits.json');
const count=(text,needle)=>text.split(needle).length-1;
function apply(source){let next=source;const changes=[];for(const edit of manifest.edits){
 const installed=count(next,edit.after),found=count(next,edit.before);
 if(installed===1){changes.push({name:edit.name,status:'already-applied'});continue;}
 if(installed!==0||found!==1)throw Error('Unsafe anchor for '+edit.name+': before='+found+', after='+installed);
 next=next.replace(edit.before,edit.after);changes.push({name:edit.name,status:'applied'});
 }return {text:next,changes};}
module.exports={apply,manifest};
if(require.main===module){try{
 const args=process.argv.slice(2),check=args.includes('--check'),files=args.filter(x=>x!=='--check');
 if(files.length!==1)throw Error('Usage: node apply-semantic-text-colors.cjs [--check] /path/to/index.html');
 const target=path.resolve(files[0]),source=fs.readFileSync(target,'utf8'),result=apply(source),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
 if(!check&&result.text!==source){const tmp=target+'.semantic.tmp';fs.writeFileSync(tmp,result.text);fs.renameSync(tmp,target);}
 console.log(JSON.stringify({mode:check?'check':'apply',inputSHA256:hash(source),outputSHA256:hash(result.text),changes:result.changes},null,2));
 }catch(error){console.error(error.message);process.exitCode=1;}}
