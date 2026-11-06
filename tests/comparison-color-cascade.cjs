// Bounded static author-style cascade audit, not a browser/layout engine.
// Fixture structure mirrors fillUnitStats; color-relevant rules use only the
// selector forms implemented here. No external resource or browser execution.
const fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const source=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n').replace(/data:image\/[^)"']+/g,'[image-data]').replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' '));
const rules=[];for(const m of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
 const decls=[];for(const part of m[2].split(';')){const at=part.indexOf(':');if(at<0)continue;const prop=part.slice(0,at).trim(),raw=part.slice(at+1).trim();if(prop!=='color'&&!prop.startsWith('--tone-'))continue;decls.push({prop,value:raw.replace(/\s*!important\s*$/,''),important:/!important/.test(raw)});}
 if(decls.length)for(const selector of m[1].trim().split(/,\s*/))rules.push({selector:selector.trim(),decls,order:rules.length,line:source.slice(0,m.index).split('\n').length});
}
function el(tag,classes='',id='',parent=null,attrs={}){return {tag,classes:classes.split(' ').filter(Boolean),id,parent,attrs};}
function compound(selector,n){
 if(!n||selector.includes('::'))return false;
 // None of these state selectors can apply to this fixed noninteractive value.
 selector=selector.replace(/:not\(([^()]*)\)/g,(_,x)=>compound(x,n)?':never':'');
 if(/:/.test(selector))return false;
 for(const m of selector.matchAll(/#([\w-]+)/g))if(n.id!==m[1])return false;
 for(const m of selector.matchAll(/\.([\w-]+)/g))if(!n.classes.includes(m[1]))return false;
 for(const m of selector.matchAll(/\[([\w-]+)(?:=["']?([^"'\]]+)["']?)?\]/g))if(!(m[1] in n.attrs)||(m[2]!==undefined&&n.attrs[m[1]]!==m[2]))return false;
 const tag=selector.match(/^[a-zA-Z][\w-]*/)?.[0];return !tag||tag===n.tag;
}
function matches(selector,n){const parts=selector.replace(/\s*>\s*/g,' > ').split(/\s+/);let p=parts.length-1;if(!compound(parts[p--],n))return false;while(p>=0){if(parts[p]==='>'){n=n.parent;p--;if(!compound(parts[p--],n))return false;}else{n=n.parent;while(n&&!compound(parts[p],n))n=n.parent;if(!n)return false;p--;}}return true;}
function specificity(s){s=s.replace(/:not\(([^()]*)\)/g,'$1');return [(s.match(/#[\w-]+/g)||[]).length,(s.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g)||[]).length,(s.replace(/#[\w-]+|\.[\w-]+|\[[^\]]+\]|:[\w-]+/g,'').match(/\b[a-zA-Z][\w-]*\b/g)||[]).length];}
function compare(a,b){for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0;}
function specified(n,prop){let winner=null;for(const rule of rules)if(matches(rule.selector,n))for(const d of rule.decls)if(d.prop===prop){const rank=[+d.important,...specificity(rule.selector),rule.order];if(!winner||compare(rank,winner.rank)>=0)winner={...d,selector:rule.selector,line:rule.line,rank};}return winner;}
function resolved(n,prop){const d=specified(n,prop);if(!d)return n.parent?resolved(n.parent,prop):undefined;return d.value.replace(/var\((--[\w-]+)\)/g,(_,v)=>resolved(n,v)||'UNDEFINED');}
const body=el('body'),app=el('main','','app',body),game=el('section','','gameScreen',app),comparison=el('section','','comparison',game),army=el('button','army-card army-red','red',comparison),unitspanel=el('div','units-panel','unitsPanel',app),unitsSide=el('div','units-side','',unitspanel);
const report=[];
for(const [scope,container,expected]of [['prediction',army,{health:'#174e9a',attack:'#a01d1a',support:'#12642c',defense:'#174e9a',control:'#7435a0',mobility:'#00626c'}],['details',unitsSide,{health:'#97c7ff',attack:'#ffaaa0',support:'#83e39b',defense:'#97c7ff',control:'#dab0ff',mobility:'#83dce2'}]]){
 const list=el('div','unit-stats comparison-list','',container),unit=el('span','comparison-unit','',list),stats=el('span','comparison-stats','',unit);
 for(const [tone,want]of Object.entries(expected)){
  const cell=el('span',tone==='mobility'?'comparison-mobility-item':'comparison-stat','',stats,{'data-tone':tone,'data-emphasis':'true'}),value=el('strong',tone==='mobility'?'comparison-mobility-value':'comparison-stat-value','',cell);
  assert.equal(resolved(value,'color'),want);assert.equal(specified(value,'color').value,'var(--tone-ink)');
  const traits=el('span','comparison-traits','',unit),trait=el('span','comparison-trait','',traits,{'data-tone':tone});assert.equal(resolved(trait,'color'),want);
  report.push({scope,tone,value:resolved(value,'color'),winningRule:specified(value,'color').selector,trait:resolved(trait,'color')});
 }
 const plain=el('span','comparison-stat','',stats,{'data-tone':'attack'}),value=el('strong','comparison-stat-value','',plain);
 assert.equal(resolved(value,'color'),scope==='prediction'?'#3b2c21':'#fff4d9');
}
fs.mkdirSync('reports/ui-complete',{recursive:true});fs.writeFileSync('reports/ui-complete/color-cascade-evidence.json',JSON.stringify({method:'Bounded static selector/specificity/source-order and inherited custom-property analysis; not computed browser CSS.',report},null,2));
console.log('PASS 12 emphasized numeric color cases and 12 trait color cases, prediction/detail scopes; ordinary values retain their own neutral colors.');
