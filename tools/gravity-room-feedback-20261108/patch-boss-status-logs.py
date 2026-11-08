"""Record only concrete boss outcomes using existing bounded diagnostic log fields."""

MARKER = '// Boss diagnostic outcomes use existing status/kind/blocked fields, not a new replay schema.'


def patch(source):
    if MARKER in source:
        return source
    text = source

    def once(before, after):
        nonlocal text
        assert text.count(before) == 1, 'Expected unique patch anchor: ' + before[:100]
        text = text.replace(before, after, 1)

    once(" function event(c,u,name,target=null,details={}){if(c.collect)publishCombatEvent({type:'boss_ability',sourceToken:tokenOf(u),...(target?{targetToken:tokenOf(target)}:{}),tick:c.tick,x:u.x,y:u.y,name,...details});observeBattleLogExtra({type:'boss_ability',sourceToken:tokenOf(u),...(target?{targetToken:tokenOf(target)}:{}),tick:c.tick,name,...details});}",
         ''' ''' + MARKER + '''
 function event(c,u,name,target=null,details={}){
  // Combat consumers receive precisely the original payload. Skip the wrapper's
  // duplicate diagnostic copy and observe only an outcome that actually occurred.
  if(c.collect)publishCombatEvent({type:'boss_ability',sourceToken:tokenOf(u),...(target?{targetToken:tokenOf(target)}:{}),tick:c.tick,x:u.x,y:u.y,name,...details},true);
  if(!target||typeof name!=='string'||!name.trim()||name.length>80)return;
  const applied=Number.isInteger(details.duration)&&details.duration>0&&details.duration<=600;
  const blocked=Number.isFinite(details.absorbed)&&details.absorbed>0&&details.absorbed<=1e9;
  const guard=name==='爪の構え'&&!!u.bossState?.clawGuard;
  if(!applied&&!blocked&&!guard)return;
  observeBattleLogExtra({type:'boss_ability',sourceToken:tokenOf(u),targetToken:tokenOf(target),tick:c.tick,status:name,kind:applied?'status':blocked?'block':'guard',...(blocked?{blocked:details.absorbed}:{})});
 }''')
    once("BATTLE_LOG_CATALOG.boss_ability={s:['sourceToken'],t:['targetToken'],text:'{source}：{name}',extra:{}};",
         "BATTLE_LOG_CATALOG.boss_ability={s:['sourceToken'],t:['targetToken'],text:'{source} → {target}：{status}',extra:{}};")
    anchor = "function battleLogVisibleRow(row){\n"
    assert text.count(anchor) == 1, 'Apply the result/wait/log cleanup patch first'
    once(anchor, anchor + ''' if(row?.type==='boss_ability'){
  const d=row.data||{},named=typeof d.status==='string'&&d.status.trim().length>0&&d.status.length<=80;
  // Older rows lost the outcome name; hide them rather than inventing an action.
  return named&&(['status','guard'].includes(d.kind)||d.kind==='block'&&Number.isFinite(d.blocked)&&d.blocked>0);
 }
''')
    once("  if(row.type==='combo_melee_contact')template='{source} → {target}：連撃の{subhitId}発目が命中';",
         "  if(row.type==='boss_ability'){args.status=typeof d.status==='string'?d.status:'';if(d.kind==='status')template='{source} → {target}：{status}を付与';else if(d.kind==='block')template='{source} → {target}：{status}（{blocked}軽減）';}\n  if(row.type==='combo_melee_contact')template='{source} → {target}：連撃の{subhitId}発目が命中';")
    return text


if __name__ == '__main__':
    import argparse
    from pathlib import Path
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    assert args.source.resolve() != args.output.resolve(), 'Keep the input immutable'
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(patch(args.source.read_text()))
