"""Recovered original summoner edits; new explicit CLI refuses overwrite.
Not a recovered final build and not regression-tested on recovered HTML.
"""
from pathlib import Path
import json,re,hashlib,sys
input_path,output_path=map(Path,sys.argv[1:3])
assert not output_path.exists()
s=input_path.read_text()
def edit(a,b):
 global s
 assert s.count(a)==1,(a[:120],s.count(a))
 s=s.replace(a,b)
edit('TYPES.tetherlash_adept.pullDistance=12;', '''TYPES.tetherlash_adept.pullDistance=12;
// Regular summoner: one extra goblin in the same opening window, priced separately from the Lich.
Object.assign(TYPES.wraith,{summonCharges:4,summonCooldown:1});''')
edit('// Optional opening generator:', 'Object.assign(COST,{wraith:9});\n// Optional opening generator:')
marker='const growthGenerator=TypedGrowthGenerator.createTypedGenerator('
a=s.index(marker)+len(marker);catalog,n=json.JSONDecoder().raw_decode(s[a:]);chunk=s[a:a+n]
chunk,count=re.subn(r'("wraith"\s*:\s*\{\s*"cost"\s*:\s*)\d+(\s*,\s*"estimateCost"\s*:\s*)\d+',lambda m:m[1]+'9'+m[2]+'9',chunk)
assert count==1
updated=json.loads(chunk);expected=json.loads(json.dumps(catalog));expected['wraith'].update(cost=9,estimateCost=9);assert updated==expected
s=s[:a]+chunk+s[a+n:]
edit("if (type.summonCharges) addTrait(`召喚最大${type.summonCharges}体`, 'summon');", "if (type.summonCharges) addTrait(type===TYPES.wraith?`ゴブリン最大${type.summonCharges}体（開幕すぐから${comparisonSeconds(type.summonCooldown)}間隔）`:`召喚最大${type.summonCharges}体`, 'summon');")
s=re.sub(r'const CONTENT_REVISION="[0-9a-f]{64}"','const CONTENT_REVISION="'+'0'*64+'"',s)
revision=hashlib.sha256(('docchi-wraith-four-price-nine-v1\n'+s).encode()).hexdigest()
s=s.replace('const CONTENT_REVISION="'+'0'*64+'"','const CONTENT_REVISION="'+revision+'"')
output_path.parent.mkdir(parents=True,exist_ok=True)
with output_path.open('x') as out: out.write(s)
print('NEW UNTESTED reconstruction:',output_path,'content revision:',revision)
