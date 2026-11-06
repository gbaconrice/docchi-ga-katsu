from pathlib import Path
import hashlib,re,sys,json
src,out=map(Path,sys.argv[1:3]); s=src.read_text()
expected='fe91cc2808610cb6a33f7aa2696aa84c2b4009bb2f70326e7bf2aa14296710a0'
assert hashlib.sha256(src.read_bytes()).hexdigest()==expected,'Unexpected source; do not patch a different build'
def replace(old,new):
 global s
 assert s.count(old)==1,('nonunique anchor',old[:90],s.count(old))
 s=s.replace(old,new)
replace("'shellburst_arcade','wraith','rune_exorcist']);","'shellburst_arcade','wraith','rune_exorcist','frosthorn_rhino']);")
replace("TYPES.tetherlash_adept.pullDistance=12;", "TYPES.tetherlash_adept.pullDistance=12;\n// Frost horn: a ground melee hit briefly slows movement; existing slow immunity/cleanse applies.\nObject.assign(TYPES.frosthorn_rhino,{meleeSlowFactor:.6,meleeSlowDuration:1.2,meleeSlowImmunity:2.4,repulsionDistance:18,repulsionRecoveryTicks:30});")
replace("function update(){}\n", "function update(){}\n\nfor(const k of keys){const t=TYPES[k];if(t.meleeSlowDuration!==undefined&&(!(t.meleeSlowDuration>0&&t.meleeSlowDuration<=2)||!(t.meleeSlowFactor>0&&t.meleeSlowFactor<1)||!(t.meleeSlowImmunity>=t.meleeSlowDuration&&t.meleeSlowImmunity<=10)||t.dmg<=0||t.projectile||t.collisionLayer!=='ground'||t.attackTargetMask.join(',')!=='ground'||t.rootOnHitDuration))throw Error('invalid-melee-slow:'+k);}\n")
anchor="  if(amount>0&&remainingHpBeforeHit>0&&delivery==='melee'&&targetLayers.get(u)==='ground'&&TYPES[sourceKind]?.rootOnHitDuration)slowIntents.push({target:u,sourceToken,factor:0,duration:TYPES[sourceKind].rootOnHitDuration,immunity:TYPES[sourceKind].rootOnHitImmunity});"
line="  if(amount>0&&remainingHpBeforeHit>0&&delivery==='melee'&&targetLayers.get(u)==='ground'&&TYPES[sourceKind]?.meleeSlowDuration)slowIntents.push({target:u,sourceToken,factor:TYPES[sourceKind].meleeSlowFactor,duration:TYPES[sourceKind].meleeSlowDuration,immunity:TYPES[sourceKind].meleeSlowImmunity});"
replace(anchor,anchor+'\n'+line)
anchor="    if (type.rootOnHitDuration) addTrait(`地上を${comparisonSeconds(type.rootOnHitDuration)}足止め（鈍足解除可・耐性${comparisonSeconds(type.rootOnHitImmunity)}）`, 'control');"
replace(anchor,anchor+"\n    if (type.meleeSlowDuration) addTrait(`氷角：地上を速度${comparisonNumber(type.meleeSlowFactor)}倍・${comparisonSeconds(type.meleeSlowDuration)}（解除可・耐性${comparisonSeconds(type.meleeSlowImmunity)}）`, 'control');")
pattern=r'const CONTENT_REVISION="[a-f0-9]{64}";'
normalized=re.sub(pattern,'const CONTENT_REVISION="'+'0'*64+'";',s,count=1)
revision=hashlib.sha256(b'docchi-integrated-candidate-v1\0'+normalized.encode()).hexdigest()
s=re.sub(pattern,f'const CONTENT_REVISION="{revision}";',s,count=1)
out.write_text(s)
(out.parent/'FROST_RHINO_CANDIDATE.json').write_text(json.dumps({'status':'local-unpublished','sourceSHA256':expected,'candidateSHA256':hashlib.sha256(s.encode()).hexdigest(),'contentRevision':revision,'changedType':'frosthorn_rhino','ability':{'meleeSlowFactor':.6,'meleeSlowDuration':1.2,'meleeSlowImmunity':2.4,'repulsionDistance':18,'repulsionRecoveryTicks':30},'unchanged':['HP','damage','attack interval','movement speed','armor','roster size','cost','composition model','deployment caps'],'validation':'See ../REPORT.md; old copied manifests describe historical builds, not this candidate.'},ensure_ascii=False,indent=2)+'\n')
print(hashlib.sha256(s.encode()).hexdigest())
