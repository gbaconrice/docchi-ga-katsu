#!/usr/bin/env python3
"""Reimplement recovered policy, not historical bytes; unique anchors fail closed.

Usage: python apply-capacity-disclosure.py INPUT_HTML OUTPUT_HTML [--capacity-only]
The input may already contain the independently reimplemented abilities. This tool
never rewrites TYPES, COST, combat, predictor, feature pack, learned weights or UI.
Use an untouched pre-capacity source, not an already patched output.
"""
import argparse
import hashlib
import json
from pathlib import Path

MARKER = '// Deployment reservation policy, reconstructed 2026-11-06.'
DISCLOSURE = '''// Nominal model disclosure, reconstructed 2026-11-06; metadata only.
(()=>{
 const affectedIds=new Set(['candle_archdeacon','glasswing_sting_moth','shellburst_arcade','wraith','rune_exorcist']);
 const bossIds=new Set(BOSS_KINDS);
 const priorMetadata=compositionEstimator.metadataFor.bind(compositionEstimator);
 compositionEstimator.metadataFor=pair=>{
  const old=priorMetadata(pair),ids=[...new Set(pair.flatMap(army=>Object.keys(army)))],changed=ids.filter(k=>affectedIds.has(k)).sort(),bosses=ids.filter(k=>bossIds.has(k)).sort();
  if(!changed.length&&!bosses.length)return old;
  return {...old,predictionStatus:changed.length?'NOMINAL_ONLY_CHANGED_ABILITIES':'NOMINAL_ONLY_RETUNED_BOSSES',calibratedStatus:'not recalibrated after ability or boss changes',calibrated:false,confidenceClaim:false,scoreInterval:[-1,1],untrainedTypeIds:[...new Set([...(old.untrainedTypeIds||[]),...changed,...bosses])].sort(),changedAbilityTypeIds:changed,retunedBossTypeIds:bosses,note:'能力・大型の変更後は未校正です。旧モデルの選定スコアを参考値として使っており、現在の勝率を示すものではありません。[-1,1]はスコアの範囲であり、信頼区間ではありません。'};
 };
})();
'''


def replace_once(source, old, new):
    count = source.count(old)
    if count != 1:
        raise ValueError(f'Expected one anchor, found {count}: {old[:140]}')
    return source.replace(old, new, 1)


def apply(source, capacity_only=False):
    if MARKER in source or '// Nominal model disclosure, reconstructed' in source:
        raise ValueError('Already patched; supply the pre-capacity source.')
    anchor = 'const growthGenerator=TypedGrowthGenerator.createTypedGenerator('
    if source.count(anchor) != 1:
        raise ValueError('Expected one production generator catalog')
    start = source.index(anchor) + len(anchor)
    catalog, length = json.JSONDecoder().raw_decode(source[start:])
    for kind, count in {'wraith': 5, 'bone_crown_lich': 7, 'slime': 2}.items():
        if kind not in catalog or 'deploymentUnits' in catalog[kind]:
            raise ValueError(f'Unexpected deployment catalog: {kind}')
        catalog[kind]['deploymentUnits'] = count
    source = source[:start] + json.dumps(catalog, ensure_ascii=False) + source[start + length:]
    old = 'let headcountCap=64;function fit(kinds){if(!Array.isArray(kinds)||kinds.length>Math.min(64,headcountCap)||kinds.some(k=>!catalog[k])||kinds.filter(k=>catalog[k].boss===true).length>1)return null;'
    new = '''let headcountCap=64,carriedRosterSignature=null;
 // Deployment reservation policy, reconstructed 2026-11-06.
 const deploymentCount=kinds=>kinds.reduce((n,k)=>n+(catalog[k].deploymentUnits||1),0);
 // Reserve finite summons/splits before selection; unchanged carried winners stay intact.
 function fit(kinds){if(!Array.isArray(kinds)||kinds.length>Math.min(64,headcountCap)||kinds.some(k=>!catalog[k])||kinds.filter(k=>catalog[k].boss===true).length>1)return null;if(deploymentCount(kinds)>32&&signature(kinds)!==carriedRosterSignature)return null;'''
    source = replace_once(source, old, new)
    old = "if(![null,'A','B','draw','invalid'].includes(previousOutcome))throw Error('INVALID_PREVIOUS_OUTCOME');"
    source = replace_once(source, old, old + 'carriedRosterSignature=carryKinds.length?signature(carryKinds):null;')
    source = replace_once(source, 'return Object.freeze({generate,fit,estimateCost:cost,catalog,headcountCapFor});', 'return Object.freeze({generate,fit,estimateCost:cost,catalog,headcountCapFor,deploymentCount});')
    source = replace_once(source, 'return Object.freeze({generate,fit:normal.fit,estimateCost:normal.estimateCost,catalog:normal.catalog});', 'return Object.freeze({generate,fit:normal.fit,estimateCost:normal.estimateCost,catalog:normal.catalog,deploymentCount:normal.deploymentCount});')
    if not capacity_only:
        old = 'geometryIds:meta.geometryIds||[]}});}'
        new = 'geometryIds:meta.geometryIds||[],...(meta.calibratedStatus?{calibratedStatus:meta.calibratedStatus}:{}),...(meta.changedAbilityTypeIds?{changedAbilityTypeIds:meta.changedAbilityTypeIds}:{}),...(meta.retunedBossTypeIds?{retunedBossTypeIds:meta.retunedBossTypeIds}:{}),...(meta.note?{note:meta.note}:{})}});}'
        source = replace_once(source, old, new)
        anchor = '// Human-readable labels; immutable unit IDs and combat data remain unchanged.'
        source = replace_once(source, anchor, DISCLOSURE + anchor)
    return source


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--capacity-only', action='store_true')
    args = parser.parse_args()
    original = args.input.read_text()
    result = apply(original, args.capacity_only)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(result)
    print(json.dumps({'status':'reimplemented, not historical artifact', 'capacityOnly':args.capacity_only, 'input':str(args.input), 'inputSHA256':hashlib.sha256(original.encode()).hexdigest(), 'output':str(args.output), 'outputSHA256':hashlib.sha256(result.encode()).hexdigest()}))

if __name__ == '__main__':
    main()
