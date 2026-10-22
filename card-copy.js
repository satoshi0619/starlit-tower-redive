(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TowerCardCopy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var effectTypes = ['hit', 'heavy', 'curseHit', 'block', 'heal', 'tp', 'cleanse', 'cover', 'buff', 'guide', 'draw', 'payHp', 'consumeBreak', 'stripBarrier', 'recover', 'debuff', 'break', 'weak', 'curse', 'stars', 'starPulse', 'dispel'];
  var fields = {
    hit: ['amount', 'damageType', 'all', 'hits', 'executeAmount', 'executeThreshold', 'afterOtherAmount', 'afterDrawBonus', 'ignoreArmor'],
    heavy: ['amount', 'damageType', 'all', 'hits', 'cap', 'step', 'bonus'],
    curseHit: ['amount', 'damageType', 'all', 'hits', 'detonateBonus', 'consume', 'optionalConsume', 'extend'],
    block: ['amount', 'to', 'halfBonus', 'afterOtherBonus'], heal: ['amount', 'to'], tp: ['amount', 'to'], cleanse: ['amount', 'to'],
    cover: [], buff: ['amount', 'to'], guide: ['count'], draw: ['amount'], payHp: ['amount'], consumeBreak: ['all'], stripBarrier: ['amount', 'all'],
    recover: ['count'], debuff: ['amount', 'to', 'status', 'turns'], break: ['amount', 'all', 'turns'], weak: ['amount', 'all'],
    curse: ['turns', 'all'], stars: ['amount', 'all'], starPulse: ['multiplier', 'all', 'consume'], dispel: ['amount', 'all']
  };
  var terms = Object.freeze({
    '物伤': '物理伤害；每一段分别计算护甲与破甲。',
    '魔伤': '魔法伤害；先扣除目标的有限魔法屏障。',
    '护盾': '普通护盾，通常在本轮敌方阶段结束后清零；角色保留余盾的被动照常生效。',
    '全队': '所有仍能作战的同行队员；给盾、治疗或加TP都不会使倒地队员复活。',
    '效果顺序': '同张牌按卡面顺序结算。击败胜利目标后立即结束战斗，尚未执行的给盾、治疗等后续效果不再触发。',
    '鼓舞': '本轮下一次单体攻击的第一段额外伤害；数值可叠加，用后清空，群攻与附加伤害不享受。',
    '减攻': '本轮下一次单体攻击的第一段少造成对应伤害；数值可叠加，群攻不受影响。',
    '破甲': '每段物理伤害额外增加对应数值；可叠加，每次施加的持续时间分别到期，轮数包含施加当轮。',
    '咒痕': '每轮首次被主动攻击时额外受2伤；再次施加刷新持续时间，不叠加触发次数。',
    '星屑': '最多3层；轮末按层数造成魔法伤害，再减少1层。',
    '接力': '上一张付费普通牌由另一名队员打出；必杀不改变普通牌的出牌顺序。',
    '本场消耗': '使用后移出本场循环，战斗结束后归还牌组。',
    '付生命': '由出牌者本人支付，不由护盾或队友承担；付出后必须至少剩1生命。'
  });
  function supported(view) {
    return !!view && Array.isArray(view.effects) && view.effects.every(function (fx) {
      return effectTypes.indexOf(fx.type) >= 0 && Object.keys(fx).every(function (key) { return key === 'type' || fields[fx.type].indexOf(key) >= 0; });
    });
  }
  function friends(fx, view) {
    if (fx.to === 'all') return '全队';
    if (fx.to === 'allOther') return '其他队友';
    if (fx.to === 'otherLowest') return '其他队友中生命比例最低者';
    if (fx.to === 'lowest') return '生命比例最低者';
    if (fx.to === 'self' || view.target === 'self') return '自身';
    return view.target === 'otherAlly' ? '队友' : '选定队员';
  }
  function foes(fx) { return fx.all ? '敌方全体' : '目标'; }
  function damageType(fx) { return fx.damageType === 'magic' || fx.type === 'curseHit' ? '魔伤' : '物伤'; }
  function attack(fx, view) {
    var kind = damageType(fx), aim = fx.all ? '敌方全体' : view.target === 'enemyAny' ? kind === '魔伤' ? '任意敌人' : '远程' : '近战';
    var text = aim + fx.amount + kind + ((fx.hits || 1) > 1 ? '×' + fx.hits + '段' : '');
    if (fx.executeAmount !== undefined) text += '；目标≤' + Math.round((fx.executeThreshold === undefined ? 0.5 : fx.executeThreshold) * 100) + '%血时改为' + fx.executeAmount;
    if (fx.afterOtherAmount !== undefined) text += '；接力时改为' + fx.afterOtherAmount;
    if (fx.afterDrawBonus) text += '；本轮用牌额外入手则+' + fx.afterDrawBonus + '伤';
    if (fx.ignoreArmor) text += '，无视护甲';
    if (fx.type === 'heavy') text += '；可耗至多' + fx.cap + '盾，每' + (fx.step || 2) + '盾+' + fx.bonus + '伤';
    if (fx.type === 'curseHit') {
      if (fx.consume !== false) text += '；可引爆咒痕+' + (fx.detonateBonus || 0) + '伤';
      else if (fx.extend) text += '；命中咒痕时续' + fx.extend + '轮，不引爆';
    }
    return text;
  }
  function effectText(fx, view) {
    var n = fx.amount, who = friends(fx, view), target = foes(fx);
    if (fx.type === 'hit' || fx.type === 'heavy' || fx.type === 'curseHit') return attack(fx, view);
    if (fx.type === 'block') return who + '护盾+' + n + (fx.halfBonus ? '（给盾时≤半血再+' + fx.halfBonus + '）' : '') + (fx.afterOtherBonus ? '，接力再+' + fx.afterOtherBonus : '');
    if (fx.type === 'heal') return who + '恢复' + n + '生命';
    if (fx.type === 'tp') return who + 'TP+' + n;
    if (fx.type === 'cleanse') return '净化' + who + (n || 1) + '种负面';
    if (fx.type === 'cover') return '本轮替选定队友接下下次单体首击';
    if (fx.type === 'buff') return who + '鼓舞+' + n + '（本轮下次单体首段）';
    if (fx.type === 'guide') return '看牌顶' + (fx.count || 3) + '张，选1入手，其余依序置底';
    if (fx.type === 'draw') return '抽' + n + '张牌';
    if (fx.type === 'payHp') return '本人支付' + n + '生命';
    if (fx.type === 'consumeBreak') return '之后清空' + target + '破甲';
    if (fx.type === 'stripBarrier') return '再削' + target + n + '魔盾';
    if (fx.type === 'recover') return '本人弃牌中至多选' + (fx.count || 1) + '张非消耗牌依序置顶（不入手）';
    if (fx.type === 'debuff') return who + '获得' + ({ vulnerable: '破绽', slow: '迟缓', clog: '阻滞', poison: '毒' }[fx.status] || fx.status || '破绽') + (n || 2) + '（' + (fx.turns || 1) + '轮）';
    if (fx.type === 'break') return target + '破甲+' + n + '（' + (fx.turns || 1) + '轮）';
    if (fx.type === 'weak') return target + '减攻' + n + '（本轮下次单体首段）';
    if (fx.type === 'curse') return target + '咒痕' + (fx.turns || 2) + '轮（刷新）';
    if (fx.type === 'stars') return target + '星屑+' + n + '（最多3层）';
    if (fx.type === 'starPulse') return (fx.all ? '全敌各受' : '目标受') + '星屑层数' + ((fx.multiplier || 1) !== 1 ? '×' + fx.multiplier : '') + '魔伤，' + (fx.consume ? '清空星屑' : '星屑保留');
    if (fx.type === 'dispel') return '驱散' + target + (n || 1) + '种增益';
    return null;
  }
  function shortLines(view) {
    if (!supported(view)) return [view && view.text || '查看完整规则。'];
    var lines = view.effects.map(function (fx) { return effectText(fx, view); });
    // This branch changes the once-per-round passive amount rather than adding
    // a normal buff effect. Do not drop the real branch change from the card.
    if (view.nozomiBuff && view.nozomiBuff !== 2) lines.push('本牌触发号令时，自身鼓舞+' + view.nozomiBuff);
    if (view.exhaust) lines.push('本场消耗');
    return lines;
  }
  function shortText(view) { return shortLines(view).map(function (s) { return /[。！？]$/.test(s) ? s : s + '。'; }).join('\n'); }
  return { shortText: shortText, shortLines: shortLines, terms: terms, hasSupportedEffects: supported, effectTypes: effectTypes.slice() };
});
