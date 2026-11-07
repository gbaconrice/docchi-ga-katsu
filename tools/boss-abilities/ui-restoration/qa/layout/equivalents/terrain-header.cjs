'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const file=process.argv[2]||'index.html',src=fs.readFileSync(file,'utf8');
const endMark='return {FIELD_VERSION,FIELD_IDS,STRENGTHS,CANDIDATE_STRENGTH,mix32,selectRunEnvironment,validateEnvironment,sameEnvironment,movementFactor,firingReach,fieldLabel};})();';
function fields(s){const a=s.indexOf('const BattleFields=(()=>{'),b=s.indexOf(endMark,a);assert(a>=0&&b>a);return s.slice(a,b+endMark.length);}
if(process.argv[3]){const old=fs.readFileSync(process.argv[3],'utf8');assert.equal(fields(src),fields(old),'Every terrain ID/value/seed/mechanic is unchanged');const money=s=>s.slice(s.indexOf('const Money=(()=>{'),s.indexOf('const GrowthGenerator=(()=>{'));assert.equal(money(src),money(old),'All wallet rules are unchanged');}
for(const token of ['fieldDetails','field-detail-icon','fieldStatusText','TerrainHeader','地形の詳細を表示'])assert(!src.includes(token),'Old information UI removed: '+token);
assert(/<p id="fieldStatus" class="field-status" tabindex="0" role="region" aria-label="地形と効果">地図未定<\/p>/.test(src));
assert.equal((src.match(/id="unitsToggle"/g)||[]).length,1,'Existing character-list button retained');
assert(src.includes('fieldStatus.textContent=inlineFieldLabel(battleEnvironment);'));
const css=src.slice(src.indexOf('/* reference-layout-restoration-20261107 */'),src.indexOf('</style>'));
for(const s of ['grid-template-rows:44px;','row-gap:0;','grid-column:1; grid-row:1; align-self:center;','grid-column:2; grid-row:1;','grid-column:3; grid-row:1; align-self:center;','grid-column:4; grid-row:1; align-self:center;','font-size:13px;','line-height:20px;','height:20px; max-height:20px;','white-space:nowrap; overflow-wrap:normal;','overflow-x:auto; overflow-y:hidden;'])assert(css.includes(s),s);
const amountStart=src.indexOf('/* reference-layout-restoration-20261107 */'),amountRules=src.slice(amountStart,src.indexOf('/* Utility dialogs',amountStart));assert(amountStart>0);for(const a of ['grid-template-columns:minmax(0,1fr) max-content 88px 44px;','align-self:center;','margin-block-start:0;','max-height:40px;','scrollbar-width:thin;'])assert(amountRules.includes(a));
assert(!/line-clamp|text-overflow|transform/.test(css),'No abbreviation or scaling terrain');assert(css.includes('touch-action:pan-x pinch-zoom;'),'Complete terrain can scroll without moving controls');
assert(src.includes('max-height:min(68%,calc(100% - 126px));')&&src.includes('max-height:min(68%,calc(100% - 170px));'));
const a=src.indexOf('function inlineFieldLabel(e){'),b=src.indexOf('const Money=',a);assert(a>=0&&b>a);const formatter=src.slice(a,b);assert(!/document|window|addEventListener|click|\.fit\(/.test(formatter));
const c=vm.createContext({});vm.runInContext(fields(src)+'\n'+formatter+'\nglobalThis.F=BattleFields;globalThis.label=inlineFieldLabel;',c);const F=c.F;
const expected=(id,p)=>({grassland:'草原 · 補正なし',shallow_ford:`浅瀬 · 地上移動−${p}%`,crosswind_ridge:`荒野 · 射撃間合い−${p}%`,desert:`砂漠 · 回復量−${p}%`,icefield:`氷原 · 押し出し距離+${p}%`,highland:`高地 · 飛行移動−${p}%`,rockfield:`岩場 · 突撃追加ダメージ−${p}%`,volcano:`火山 · 地上に最大HP${p/2}%ダメージ/8秒`})[id];
let cases=0;const labels=[];
for(const p of F.STRENGTHS)for(const id of F.FIELD_IDS){let e;for(let seed=0;seed<10000;seed++){const x=F.selectRunEnvironment(seed,p);if(x.fieldId===id){e=x;break;}}assert(e);const before=JSON.stringify(e),text=c.label(e);assert.equal(text,expected(id,p));assert.equal(JSON.stringify(e),before);assert(!/詳細|…|\.\.\./.test(text));assert(text.startsWith(F.fieldLabel(e).split(' · ')[0]));if(id==='volcano')for(const part of ['地上','最大HP',p/2+'%','ダメージ','/8秒'])assert(text.includes(part));labels.push({id,p,text});
 for(const width of [320,375,390,430])for(const gravity of [0,74,98])for(const amount of ['100','9'.repeat(600)]){const inner=width-24-16,remaining=inner-72-44-18,wallet=88,slot=remaining-wallet;assert(slot>0);assert(wallet>=88);assert.equal(slot+72+wallet+44+18,inner);for(const height of [32,36,40])assert.equal((40-height)/2+height/2,20,'Native scroll area stays centered in the40px row');assert(32+8<=40,'Line plus at most8px native scroll track stays above terrain');assert.equal(44,44,'All metadata uses one44px row');assert(amount.length>=3&&gravity>=0);cases++;}
}
assert.equal(c.label(null),'地図未定');assert.throws(()=>c.label({fieldId:'volcano',percent:7}));
console.log(JSON.stringify({result:'PASS',cases,labels,canonicalFieldsUnchanged:!!process.argv[3],walletRulesUnchanged:!!process.argv[3],noTerrainControls:true,existingUnitsToggleRetained:true,independentScrollableTerrainSlot:true,minimumWallet88:true,renderedBrowser:false,realIOS:false,notes:'Pure formatter/static CSS/box arithmetic. Real font audit is separate evidence; final browser geometry is not claimed.'},null,2));
