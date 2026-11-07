// Local VM support only, not browser/mobile/FPS evidence.
const fs=require('fs'),path=require('path'),assert=require('assert');
function loadGame(file,harnessPath=path.join(__dirname,'../../tests/reflect-cascade.cjs')){
 const source=fs.readFileSync(harnessPath,'utf8').split("for(const id of ['#red'")[0]
  .replace("fs.readFileSync('index.html','utf8')",`fs.readFileSync(${JSON.stringify(path.resolve(file))},'utf8')`);
 const {context,vm}=new Function('require','assert',source+'\nreturn {context,vm};')(require,assert);
 return expression=>{const value=vm.runInContext(expression,context,{timeout:60000});return value===undefined?null:JSON.parse(JSON.stringify(value));};
}
module.exports={loadGame};
