"""Presentation-only concise trait terms. Combat facts remain unchanged."""
import json

CSS = '''
/* Trait readability: complete descriptions at a readable size in both views. */
#comparison .comparison-traits, .units-side .comparison-traits {
  align-items: stretch;
}
#comparison .comparison-trait[data-tone], .units-side .comparison-trait[data-tone] {
  display: block;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  white-space: normal;
  word-break: normal;
  line-break: strict;
  overflow-wrap: anywhere;
  text-wrap: balance;
  font-size: 13px;
  line-height: 1.4;
}
/* Recover trait reading width in narrow battle-detail columns. */
@media (max-width: 360px) {
  #unitsPanel .units-dialog { padding: 6px; }
  #unitsPanel .units-side { padding: 4px; }
  #unitsPanel .units-grid { gap: 6px; }
}
'''

TERMS = {
"射撃ダメージを軽減":"射撃軽減",
"離れた敵を射撃":"遠距離射撃",
"飛ぶ敵にも攻撃":"対空攻撃",
"着弾地点の周囲にダメージ":"着弾範囲攻撃",
"味方を回復":"味方回復",
"空を飛ぶ":"飛行",
"ゴブリンを召喚":"ゴブリン召喚",
"仲間を召喚":"仲間召喚",
"突進で追加ダメージ":"突進追加攻撃",
"攻撃で敵を押し込む":"押し込み攻撃",
"自爆して周囲にダメージ":"範囲自爆",
"周囲にダメージ":"周囲攻撃",
"敵の移動を遅くする":"移動鈍足",
"敵から敵へ連鎖する攻撃":"連鎖攻撃",
"複数の敵を攻撃":"複数体攻撃",
"地中を通って移動":"地中移動",
"倒されると分裂":"死亡時分裂",
"敵の攻撃を遅らせる":"攻撃遅延",
"近接攻撃を一度軽減":"一度だけ近接軽減",
"敵を毒にする":"毒付与",
"飛ぶ敵を優先して攻撃":"対空優先",
"召喚された敵を優先":"召喚体優先",
"地上の敵を足止め":"地上足止め",
"鈍足・足止め・弱点露出を解除":["鈍足・足止め解除","弱点露出解除"],
"大きな敵に強い":"大型特効",
"攻撃後に後退":"攻撃後退",
"味方をかばう":"味方かばい",
"味方を一度守る":"一度だけ味方防御",
"扇状に射撃":"扇状射撃",
"前方にダメージ":"前方範囲攻撃",
"追尾弾を3連射":"追尾弾3連射",
"敵の狙いを引き受ける":"敵の狙い誘引",
"自分の被ダメージを軽減":"自身ダメージ軽減",
"味方の移動を速める":"味方移動加速",
"追撃で追加ダメージ":"追撃追加ダメージ",
"自分を修復":"自己修復",
"直接攻撃を反射":"直接攻撃反射",
"触れた敵を押し返す":"接触押し返し",
"最後の一撃が強い":"最終段強化",
"後の一撃が強い":"後段強化",
"複数の味方を回復":"複数体回復",
"自分も守る":"自身も防御対象",
"地上の敵を引き寄せる":"地上引き寄せ",
"敵の回復を妨げる":"回復阻害",
"柱を出して攻撃":"柱攻撃",
"与えたダメージで回復":"与ダメージ回復",
"倒されると周囲にダメージ":"死亡時範囲攻撃",
"味方を一度だけ復活":"一度だけ味方蘇生",
"地上の敵への罠を置く":"対地罠設置",
"密着した敵にも攻撃":"密着時も攻撃可",
"敵を傷つきやすくする":"弱点露出",
"味方への射撃ダメージを軽減":"味方射撃軽減",
"スケルトンを召喚":"スケルトン召喚",
"召喚は一度だけ":"一度だけ召喚",
"召喚体は時間で消える":"召喚体は時限式",
"召喚体は素早い":"高速召喚体",
"触れた敵に反撃":"接触反撃",
"倒れると二段階に分裂":"死亡時二段分裂",
"周囲の敵を棘で縫い止める":"周囲棘縛り",
"咆哮で周囲の敵を気絶":"咆哮・周囲気絶",
"幽体となり後衛へ潜り込む":"幽体・後衛潜行",
"凍らせた敵から氷が飛び散る":"凍結敵から氷拡散",
"命を吸収して成長する":"吸命成長",
"連打と衝撃波で敵を押し返す":["連打衝波","押し返し"],
"敵の上を旋回して炎の雨":"上空旋回・炎雨",
"頭蓋骨が別々の敵を燃やす":"頭蓋骨の分散炎上",
"根で敵の群れを絡め取る":"根の集団束縛",
"後退から突進を繰り返す":"後退・反復突進",
"光の柱が前方へ連なる":"前方連鎖光柱",
"広がる炎の輪で焼く":"拡大炎輪",
"味方をかばい殻から衝撃波":"かばい・殻衝波",
"味方の光輪が割れると反発":["味方光輪","破壊時反発"],
"味方をかばって強く殴り返す":"かばい・強反撃",
"弱ると膨らみ倒れると大爆発":["低HP膨張","死亡時大爆発"],
"打ち上げた敵が落下して衝撃":"打上げ・落下衝撃",
"巨大な鋏を閉じて重い一撃":"巨鋏重撃",
"倒れると壁と岩人形を残す":"死亡時壁・岩人形",
"雷の鎧から敵へ電撃が連鎖":"雷鎧・電撃連鎖",
"角で突いた敵の周囲へ落雷":"角撃・周囲落雷",
"大きく溜めて前方の盾を砕く":"溜め前方盾割り",
"瀕死の敵を刈るほど成長":"瀕死狩り成長",
"傷つくと赤い月で移動が加速":"負傷時移動加速",
"連撃の最後に周囲へ落雷":"最終段・周囲落雷",
"地割れが走り敵を打ち上げる":"地割れ打上げ",
"闇の爪痕で削り回復を封じる":"闇爪痕・回復封じ",
"炎と氷の交点が爆発":"炎氷交差爆発",
"足元を溶岩に変えて焼く":"足元溶岩化",
"吹雪で前方の敵を凍らせる":"吹雪・前方凍結",
"攻撃を反射し水晶片を飛ばす":"攻撃反射・水晶片",
"倒れると周囲へ雷を放つ":"死亡時周囲放雷",
"冷気で凍らせ攻撃を遅らせる":"凍結・攻撃遅延",
"三つの頭が別々の敵を攻撃":"三頭の分散攻撃",
"地面を叩き周囲の敵を気絶":"地震・周囲気絶",
"尾から周囲へ火の粉を散らす":"尾撃・周囲火の粉",
"火柱が敵を追って立ち上がる":"敵追尾火柱",
"丸まって全方位へ棘を連射":"全方位棘連射",
"双鳥の交差点で爆発":"双鳥交差爆発",
"角で敵をすくって背後へ投げる":"角撃・背後投げ",
"回転でなぎ払い矢を弾く":"回転薙ぎ・矢弾き",
"爪で防ぎ、開く勢いで反撃":"爪防御・反撃",
"雄叫びで味方全員を強化":"咆哮・全味方強化",
"長い首で後衛を狙って食らう":"長首・後衛捕食",
"敵の密集地へ隕石を落とす":"敵密集地に隕石",
"倒れた敵を味方の骸骨に変える":"敵死体を骸骨化",
"広がる毒霧でじわじわ削る":"拡散毒霧",
"溜めた光線で戦場を貫く":"溜め全域貫通光線"
}

JS = r"""
// Short display terms only; source mechanics and precise facts stay unchanged.
function buildUnitComparisonDisplayFacts(type) {
  const facts=buildUnitComparisonDisplayFactsSource(type);
  if(!facts)return facts;
  const terms=text=>{const value=Object.prototype.hasOwnProperty.call(COMPARISON_TRAIT_TERMS,text)?COMPARISON_TRAIT_TERMS[text]:text;return (Array.isArray(value)?value:[value]).filter(Boolean);};
  const action=terms(facts.actionDetail),traits=[],traitTones=[];
  const add=(text,tone)=>{if(text!==action[0]&&!traits.includes(text)){traits.push(text);traitTones.push(tone||'neutral');}};
  action.slice(1).forEach(text=>add(text,facts.actionTone));
  facts.traits.forEach((text,index)=>terms(text).forEach(term=>add(term,facts.traitTones[index])));
  return {...facts,actionDetail:action[0]||'',traits,traitTones};
}
"""


def patch(source: str) -> str:
    anchor = 'function buildUnitComparisonDisplayFacts(type) {'
    if source.count(anchor) != 1:
        raise ValueError('Expected unique comparison display function')
    source=source.replace(anchor,'function buildUnitComparisonDisplayFactsSource(type) {',1)
    anchor='function fillUnitStats() {'
    if source.count(anchor) != 1:
        raise ValueError('Expected unique renderer insertion anchor')
    source=source.replace(anchor,'const COMPARISON_TRAIT_TERMS='+json.dumps(TERMS,ensure_ascii=False,separators=(',',':'))+';\n'+JS+'\n'+anchor,1)
    if '</style>' not in source:
        raise ValueError('Missing stylesheet anchor')
    head,tail=source.rsplit('</style>',1)
    return head+CSS+'</style>'+tail
