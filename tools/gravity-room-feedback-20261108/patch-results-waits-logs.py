"""Simplify result display and event history; shorten only normal room result waits."""

MARKER = '// Normal room results are brief; post-ten decisions retain their own deadline.'


def patch(source):
    if MARKER in source:
        return source
    text = source

    def once(before, after):
        nonlocal text
        assert text.count(before) == 1, 'Expected unique patch anchor: ' + before[:100]
        text = text.replace(before, after, 1)

    once('''      <details id="multiResults" class="multi-results" open hidden>
        <summary>参加者の結果</summary>
        <div id="multiResultsList" class="multi-results-list"></div>
      </details>''', '''      <div id="multiResults" class="multi-results" hidden>
        <div id="multiResultsList" class="multi-results-list"></div>
      </div>''')
    start = text.index('function multiResultText(s,userId){')
    end = text.index('\nfunction syncOwnBattleChoice()', start)
    text = text[:start] + '''function multiResultText(s,userId){
 if(!['settle','result'].includes(s.phase)||!Array.isArray(s.roundResults))return '';
 // Draw/invalid already appear in the main result; do not repeat them here.
 if(!['A','B'].includes(s.winner))return '';
 const names=s.participants.flatMap((id,i)=>{
  const entry=s.roundResults.find(row=>row.playerId===id);
  if(entry?.submitted!==true||entry.correct!==true||entry.side!==s.winner)return [];
  const profile=typeof multiAdapter!=='undefined'?multiAdapter?.getProfile?.(id):null;
  return [profile?.name||(id===userId?'あなた':'参加者'+(i+1))];
 });
 // Canonical receipts only: missing results never become invented hits or misses.
 if(names.length)return '的中：'+names.join('、');
 const complete=s.participants.every(id=>s.roundResults.some(row=>row.playerId===id)||s.wallets?.some(row=>row.playerId===id&&(row.cashedOut===true||row.terminalReason==='bankrupt')));
 return complete?'的中なし':'';
}''' + text[end:]
    once('const DECISION_TIMEOUT_MS = 30000;', MARKER + '\nconst RESULT_WAIT_MS = 8000;\nconst DECISION_TIMEOUT_MS = 30000;')
    once('const decisionAt=now()+DECISION_TIMEOUT_MS,nextRoundAt=state.roundId<TOTAL_ROUNDS?decisionAt:null,decisionDeadline=state.roundId>=TOTAL_ROUNDS?decisionAt:null;',
         'const decisionAt=now()+(state.roundId<TOTAL_ROUNDS?RESULT_WAIT_MS:DECISION_TIMEOUT_MS),nextRoundAt=state.roundId<TOTAL_ROUNDS?decisionAt:null,decisionDeadline=state.roundId>=TOTAL_ROUNDS?decisionAt:null;')
    once('return {GAME_MODE,TOTAL_ROUNDS,DECISION_TIMEOUT_MS,PROTOCOL,MAX_WIRE_BYTES,encode,decode,createSession};',
         'return {GAME_MODE,TOTAL_ROUNDS,RESULT_WAIT_MS,DECISION_TIMEOUT_MS,PROTOCOL,MAX_WIRE_BYTES,encode,decode,createSession};')
    once("function battleLogVisibleRow(row){return !!row&&!BATTLE_LOG_PREPARATION.has(row.type)&&!BATTLE_LOG_LAUNCH.has(row.type)&&!(BATTLE_LOG_COMPLETION.has(row.type)&&row.data?.reason==='complete');}", '''const BATTLE_LOG_PROJECTILE_END=new Set('flight_projectile_end projectile_end orb_projectile_end moon_projectile_end counter_bolt_end'.split(' '));
// Summon preparation repeats retained summon_spawn/split_spawn outcomes.
// Trap arming/expiry and cancelled revival have no target outcome.
const BATTLE_LOG_REDUNDANT=new Set('revive_cancel trap_armed trap_expired slime_split book_batch_committed'.split(' '));
function battleLogVisibleRow(row){
 if(!row||BATTLE_LOG_PREPARATION.has(row.type)||BATTLE_LOG_LAUNCH.has(row.type)||BATTLE_LOG_REDUNDANT.has(row.type))return false;
 // Contact damage has its own outcome row. Expiry/cancellation is bookkeeping.
 if(BATTLE_LOG_PROJECTILE_END.has(row.type))return row.data?.reason==='blocked';
 if(BATTLE_LOG_COMPLETION.has(row.type)){
  // These are actual active-defense state changes, not cancelled preparations.
  return row.type==='defense_action_end'&&row.data?.kind==='barrier'&&['expired','consumed'].includes(row.data?.reason)||row.type==='aegis_action_end'&&row.data?.reason==='complete';
 }
 return true;
}''')
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
