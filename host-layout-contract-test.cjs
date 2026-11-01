const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const script=html.match(/<script id="host-layout-config">([\s\S]*?)<\/script>/)?.[1];
assert(script,'host layout config script exists');
function run(config={},search=''){
  const writes={};
  const root={dataset:{},style:{setProperty:(k,v)=>writes[k]=v}};
  const c={document:{documentElement:root},window:null,location:{search},URLSearchParams};
  c.window=c;c.DOCCHI_HOST_LAYOUT=config;
  vm.createContext(c);vm.runInContext(script,c);
  return {shell:root.dataset.hostShell,writes};
}
assert.deepStrictEqual(run().shell,'standalone');
assert.deepStrictEqual(run({shell:'gravity'}),{shell:'gravity',writes:{}});
assert.deepStrictEqual(run({shell:'gravity',profile:'legacy-74'}).writes,{'--gravity-top-inset':'74px'});
assert.deepStrictEqual(run({shell:'gravity',profile:'legacy-74',topInsetPx:83}).writes,{'--gravity-top-inset':'83px'});
assert.deepStrictEqual(run({shell:'gravity',profile:'legacy-98',viewportAlreadyInset:true}).writes,{'--gravity-top-inset':'0px','--gravity-bottom-inset':'0px'});
assert.deepStrictEqual(run({},'?hostShell=gravity&gravityProfile=legacy-98').writes,{'--gravity-top-inset':'98px'});
console.log('PASS host layout: standalone/default zero, explicit legacy profiles, measured override, viewport-already-inset precedence; no SDK/iframe height guess');
