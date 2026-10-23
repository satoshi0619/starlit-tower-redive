(function (root, factory) {
  'use strict';
  var content = factory();
  if (typeof module === 'object' && module.exports) module.exports = content;
  if (root) root.TowerContent = content;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // All values below are new fan-game rules, rather than original-game skill data.
  var hit = function (amount, damageType, extra) { return Object.assign({ type: 'hit', amount: amount, damageType: damageType }, extra || {}); };
  var block = function (amount, to) { return { type: 'block', amount: amount, to: to || 'self' }; };
  var stars = function (amount, all) { return { type: 'stars', amount: amount, all: !!all }; };
  var weak = function (amount, all) { return { type: 'weak', amount: amount, all: !!all }; };
  var heal = function (amount, to) { return { type: 'heal', amount: amount, to: to || 'target' }; };
  var curseHit = function (amount, bonus, consume, extra) { return Object.assign({ type: 'curseHit', amount: amount, detonateBonus: bonus, consume: consume }, extra || {}); };
  var branch = function (name, cost, text, effects, extra) { return Object.assign({ name: name, cost: cost, text: text, effects: effects }, extra || {}); };
  var cards = {};
  function card(id, owner, name, cost, target, text, effects, A, B, tags, starter, extra) {
    cards[id] = Object.assign({ id: id, owner: owner, name: name, cost: cost, target: target, text: text, tags: tags || [], starter: !!starter, effects: effects, branches: { A: A, B: B } }, extra || {});
  }

  card('pecorine_slash', 'pecorine', '挥击', 1, 'enemy', '造成4物理伤害，自身获得4护盾。', [hit(4, 'physical'), block(4)],
    branch('稳守挥击', 1, '造成4物理伤害，自身获得6护盾。', [hit(4, 'physical'), block(6)]),
    branch('奋力挥击', 1, '造成7物理伤害，自身获得2护盾。', [hit(7, 'physical'), block(2)]), ['attack', 'physical', 'guard'], true);
  card('pecorine_cover', 'pecorine', '掩护', 1, 'otherAlly', '自身获得5护盾，代承指定队友下一次单体攻击。', [block(5), { type: 'cover' }],
    branch('牢靠掩护', 1, '自身获得8护盾，代承指定队友下一次单体攻击。', [block(8), { type: 'cover' }]),
    branch('反攻掩护', 1, '自身获得5护盾并蓄力2，代承指定队友下一次单体攻击。', [block(5), { type: 'buff', amount: 2, to: 'self' }, { type: 'cover' }]), ['support', 'guard'], true);
  card('pecorine_heavy', 'pecorine', '重击', 2, 'enemy', '造成10物理伤害。可消耗最多6护盾，每2护盾额外造成1伤害。', [{ type: 'heavy', amount: 10, cap: 6, step: 2, bonus: 1 }],
    branch('轻装重击', 1, '造成6物理伤害，自身获得3护盾；不再消耗护盾。', [hit(6, 'physical'), block(3)]),
    branch('全力重击', 2, '造成10物理伤害，可耗最多12盾，每2盾加2伤害。', [{ type: 'heavy', amount: 10, cap: 12, step: 2, bonus: 2 }]), ['attack', 'physical'], true);
  card('pecorine_hold', 'pecorine', '守住阵线', 2, 'none', '全队各获得5护盾，最虚弱的队友额外获得2护盾。', [block(5, 'all'), block(2, 'lowest')],
    branch('稳固阵线', 2, '全队各获得7护盾。', [block(7, 'all')]),
    branch('紧急阵线', 1, '全队各获得3护盾。', [block(3, 'all')]), ['support', 'guard']);
  card('pecorine_sweep', 'pecorine', '横扫', 2, 'allEnemies', '所有敌人受到4物理伤害，自身获得3护盾。', [hit(4, 'physical', { all: true }), block(3)],
    branch('守势横扫', 2, '所有敌人受到4物理伤害，自身获得6护盾。', [hit(4, 'physical', { all: true }), block(6)]),
    branch('猛力横扫', 3, '所有敌人受到8物理伤害。', [hit(8, 'physical', { all: true })]), ['attack', 'physical', 'area']);

  card('rei_slash', 'rei', '一闪', 1, 'enemy', '造成6物理伤害。', [hit(6, 'physical')],
    branch('精准一闪', 1, '造成8物理伤害。', [hit(8, 'physical')]),
    branch('追击一闪', 1, '造成3物理伤害两次；每次分别受护甲与破甲影响。', [hit(3, 'physical', { hits: 2 })]), ['attack', 'physical'], true);
  card('rei_break', 'rei', '破甲', 1, 'enemy', '造成3物理伤害，再施加本轮破甲2：后续每段物理伤害加2。', [hit(3, 'physical'), { type: 'break', amount: 2, turns: 1 }],
    branch('持久破甲', 1, '造成3物理伤害，施加持续2轮的破甲2。', [hit(3, 'physical'), { type: 'break', amount: 2, turns: 2 }]),
    branch('深度破甲', 1, '造成3物理伤害，再施加本轮破甲4。', [hit(3, 'physical'), { type: 'break', amount: 4, turns: 1 }]), ['attack', 'physical', 'debuff'], true);
  card('rei_feint', 'rei', '牵制', 1, 'enemy', '造成4物理伤害，目标本轮下一次单体攻击减3。', [hit(4, 'physical'), weak(3)],
    branch('压制牵制', 1, '造成4物理伤害，目标本轮下一次单体攻击减5。', [hit(4, 'physical'), weak(5)]),
    branch('锐利牵制', 1, '造成7物理伤害，目标本轮下一次单体攻击减2。', [hit(7, 'physical'), weak(2)]), ['attack', 'physical', 'debuff'], true);
  card('rei_dance', 'rei', '连续剑舞', 2, 'enemy', '造成3物理伤害三次，适合攻击已经破甲的目标。', [hit(3, 'physical', { hits: 3 })],
    branch('沉着剑舞', 2, '造成5物理伤害两次。', [hit(5, 'physical', { hits: 2 })]),
    branch('追风剑舞', 3, '造成4物理伤害四次。', [hit(4, 'physical', { hits: 4 })]), ['attack', 'physical']);
  card('rei_disarm', 'rei', '打乱阵势', 1, 'enemy', '造成2物理伤害，所有敌人本轮下一次单体攻击减2。', [hit(2, 'physical'), weak(2, true)],
    branch('扰乱阵势', 1, '造成2物理伤害，所有敌人本轮下一次单体攻击减3。', [hit(2, 'physical'), weak(3, true)]),
    branch('击溃阵势', 2, '造成5物理伤害，所有敌人本轮下一次单体攻击减4。', [hit(5, 'physical'), weak(4, true)]), ['attack', 'physical', 'debuff']);

  card('kokkoro_buff', 'kokkoro', '鼓舞', 1, 'otherAlly', '指定队友本轮下一张单体牌的主伤害加5。群攻、星痕与咒痕附伤不获得加成。', [{ type: 'buff', amount: 5 }],
    branch('专注鼓舞', 1, '指定队友本轮下一次单体主伤害加7。', [{ type: 'buff', amount: 7 }]),
    branch('守护鼓舞', 1, '指定队友本轮下一次单体主伤害加4，并获得4护盾。', [{ type: 'buff', amount: 4 }, block(4, 'target')]), ['support', 'buff'], true);
  card('kokkoro_guide', 'kokkoro', '指路', 1, 'none', '查看实际牌顶3张，选择1张入手，其余按原顺序放到牌底。', [{ type: 'guide', count: 3 }],
    branch('远见指路', 1, '查看实际牌顶5张，选择1张入手，其余按原顺序放到牌底。', [{ type: 'guide', count: 5 }]),
    branch('稳妥指路', 1, '先给最虚弱的队友3护盾，再看牌顶3张选1入手。', [block(3, 'lowest'), { type: 'guide', count: 3 }]), ['support', 'draw'], true);
  card('kokkoro_ward', 'kokkoro', '风之守望', 2, 'ally', '全队各获得5护盾，再净化指定一人1项负面状态。', [block(5, 'all'), { type: 'cleanse', amount: 1 }],
    branch('群星守望', 2, '全队各获得7护盾，再净化指定一人1项负面状态。', [block(7, 'all'), { type: 'cleanse', amount: 1 }]),
    branch('迅捷守望', 1, '全队各获得3护盾，再净化指定一人1项负面状态。', [block(3, 'all'), { type: 'cleanse', amount: 1 }]), ['support', 'guard', 'cleanse'], true);
  card('kokkoro_relay', 'kokkoro', '传递心意', 1, 'otherAlly', '指定队友获得2TP和2护盾。', [{ type: 'tp', amount: 2, to: 'target' }, block(2, 'target')],
    branch('专心传递', 1, '指定队友获得3TP和2护盾。', [{ type: 'tp', amount: 3, to: 'target' }, block(2, 'target')]),
    branch('共同心意', 2, '全队各获得2TP和3护盾。', [{ type: 'tp', amount: 2, to: 'all' }, block(3, 'all')]), ['support', 'tp']);
  card('kokkoro_shelter', 'kokkoro', '轻风庇护', 1, 'ally', '指定角色获得5护盾，净化1项负面状态。', [block(5, 'target'), { type: 'cleanse', amount: 1 }],
    branch('厚实庇护', 1, '指定角色获得7护盾，净化1项负面状态。', [block(7, 'target'), { type: 'cleanse', amount: 1 }]),
    branch('清澈庇护', 1, '指定角色获得4护盾，净化2项负面状态，抽1张牌。', [block(4, 'target'), { type: 'cleanse', amount: 2 }, { type: 'draw', amount: 1 }]), ['support', 'guard', 'cleanse']);

  card('kyaru_curse', 'kyaru', '暗咒', 1, 'enemyAny', '造成3魔法伤害，再挂2轮咒痕。咒痕每轮首次受到主动伤害额外受2伤害。', [hit(3, 'magic'), { type: 'curse', turns: 2 }],
    branch('绵延暗咒', 1, '造成3魔法伤害，再挂3轮咒痕。', [hit(3, 'magic'), { type: 'curse', turns: 3 }]),
    branch('炽烈暗咒', 1, '造成5魔法伤害，再挂仅本轮有效的咒痕。', [hit(5, 'magic'), { type: 'curse', turns: 1 }]), ['attack', 'magic', 'curse'], true);
  card('kyaru_dispel', 'kyaru', '破咒', 1, 'enemyAny', '先造成4魔法伤害，再驱散目标1项正面效果；优先移除剩余魔法屏障。', [hit(4, 'magic'), { type: 'dispel', amount: 1 }],
    branch('彻底破咒', 1, '先造成4魔法伤害，再驱散目标2项正面效果。', [hit(4, 'magic'), { type: 'dispel', amount: 2 }]),
    branch('强袭破咒', 1, '先造成6魔法伤害，再驱散目标1项正面效果。', [hit(6, 'magic'), { type: 'dispel', amount: 1 }]), ['attack', 'magic', 'dispel'], true);
  card('kyaru_consume', 'kyaru', '吞咒', 2, 'enemyAny', '造成9魔法伤害；可选择引爆咒痕额外5伤害并移除，或保留咒痕。未触发的本轮咒痕另加2。', [curseHit(9, 5, true, { optionalConsume: true })],
    branch('续咒', 2, '造成9魔法伤害，不引爆或移除咒痕，改为延长1轮。', [curseHit(9, 0, false, { extend: 1 })]),
    branch('噬咒', 2, '造成9魔法伤害；可选择引爆咒痕额外8伤害并移除，或保留咒痕。', [curseHit(9, 8, true, { optionalConsume: true })]), ['attack', 'magic', 'curse'], true);
  card('kyaru_spread', 'kyaru', '夜幕蔓延', 2, 'allEnemies', '所有敌人受到2魔法伤害，然后各挂2轮咒痕。', [hit(2, 'magic', { all: true }), { type: 'curse', turns: 2, all: true }],
    branch('深夜蔓延', 2, '所有敌人受到3魔法伤害，然后各挂3轮咒痕。', [hit(3, 'magic', { all: true }), { type: 'curse', turns: 3, all: true }]),
    branch('骤然夜幕', 1, '所有敌人受到1魔法伤害，然后各挂仅本轮有效的咒痕。', [hit(1, 'magic', { all: true }), { type: 'curse', turns: 1, all: true }]), ['attack', 'magic', 'curse', 'area']);
  card('kyaru_seal', 'kyaru', '干扰法阵', 1, 'enemyAny', '造成2魔法伤害，所有敌人本轮下一次单体攻击减2。', [hit(2, 'magic'), weak(2, true)],
    branch('压制法阵', 1, '造成2魔法伤害，所有敌人本轮下一次单体攻击减3。', [hit(2, 'magic'), weak(3, true)]),
    branch('破阵法术', 2, '造成8魔法伤害，再驱散目标1项正面效果。', [hit(8, 'magic'), { type: 'dispel', amount: 1 }]), ['attack', 'magic', 'debuff']);

  card('hatsune_rain', 'hatsune', '星雨', 1, 'allEnemies', '所有敌人受到1魔法伤害，然后各获得1星痕。', [hit(1, 'magic', { all: true }), stars(1, true)],
    branch('漫天星雨', 1, '所有敌人获得2星痕，不造成直接伤害。', [stars(2, true)]),
    branch('明亮星雨', 1, '所有敌人受到3魔法伤害，然后各获得1星痕。', [hit(3, 'magic', { all: true }), stars(1, true)]), ['attack', 'magic', 'stars', 'area'], true);
  card('hatsune_mark', 'hatsune', '牵星', 1, 'enemyAny', '目标获得2星痕，本轮下一次单体攻击减2。相同减攻不叠加。', [stars(2), weak(2)],
    branch('安眠牵星', 1, '目标获得2星痕，本轮下一次单体攻击减4。', [stars(2), weak(4)]),
    branch('汇聚牵星', 1, '目标获得3星痕，本轮下一次单体攻击减1。', [stars(3), weak(1)]), ['stars', 'debuff'], true);
  card('hatsune_meteor', 'hatsune', '流星坠落', 2, 'enemyAny', '指定目标受到5魔法主伤；再额外结算所有敌人的星痕一次，不减层。', [hit(5, 'magic'), { type: 'starPulse', multiplier: 1, all: true, consume: false }],
    branch('轻盈流星', 1, '指定目标受到2魔法主伤，再额外结算该目标的星痕一次，不减层。', [hit(2, 'magic'), { type: 'starPulse', multiplier: 1, all: false, consume: false }]),
    branch('引爆流星', 2, '指定目标受到5魔法主伤，再让所有敌人的星痕每层造成2魔伤，随后清空。', [hit(5, 'magic'), { type: 'starPulse', multiplier: 2, all: true, consume: true }]), ['attack', 'magic', 'stars'], true);
  card('hatsune_orbit', 'hatsune', '星光环绕', 1, 'none', '所有敌人各获得1星痕，最虚弱的队友获得2护盾。', [stars(1, true), block(2, 'lowest')],
    branch('守护星环', 1, '所有敌人各获得1星痕，最虚弱的队友获得5护盾。', [stars(1, true), block(5, 'lowest')]),
    branch('繁星环绕', 2, '所有敌人各获得2星痕，最虚弱的队友获得3护盾。', [stars(2, true), block(3, 'lowest')]), ['stars', 'guard']);
  card('hatsune_comet', 'hatsune', '彗星低语', 2, 'allEnemies', '所有敌人受到3魔法伤害，本轮下一次单体攻击减1。', [hit(3, 'magic', { all: true }), weak(1, true)],
    branch('安静彗星', 2, '所有敌人受到4魔法伤害，本轮下一次单体攻击减2。', [hit(4, 'magic', { all: true }), weak(2, true)]),
    branch('闪耀彗星', 3, '所有敌人受到7魔法伤害，然后各获得1星痕。', [hit(7, 'magic', { all: true }), stars(1, true)]), ['attack', 'magic', 'area', 'debuff']);

  card('yui_heal', 'yui', '温柔祈愿', 1, 'ally', '回复指定角色5生命。消耗：本场不再进入循环。', [heal(5)],
    branch('深切祈愿', 1, '回复指定角色8生命。消耗。', [heal(8)], { exhaust: true }),
    branch('守护祈愿', 1, '回复指定角色4生命，再给予4护盾。消耗。', [heal(4), block(4, 'target')], { exhaust: true }), ['support', 'heal'], true, { exhaust: true });
  card('yui_cleanse', 'yui', '净化', 1, 'ally', '净化指定角色1项负面状态，给予3护盾。', [{ type: 'cleanse', amount: 1 }, block(3, 'target')],
    branch('清澈净化', 1, '净化指定角色2项负面状态，给予5护盾。', [{ type: 'cleanse', amount: 2 }, block(5, 'target')]),
    branch('共同净化', 2, '全队各净化1项负面状态，获得4护盾。', [{ type: 'cleanse', amount: 1, to: 'all' }, block(4, 'all')]), ['support', 'cleanse', 'guard'], true);
  card('yui_light', 'yui', '微光', 1, 'enemyAny', '造成3魔法伤害，最虚弱的队友获得2护盾。', [hit(3, 'magic'), block(2, 'lowest')],
    branch('温暖微光', 1, '造成4魔法伤害，最虚弱的队友获得4护盾。', [hit(4, 'magic'), block(4, 'lowest')]),
    branch('散落微光', 2, '所有敌人受到3魔法伤害，全队各获得2护盾。', [hit(3, 'magic', { all: true }), block(2, 'all')]), ['attack', 'magic', 'guard'], true);
  card('yui_prayer', 'yui', '共同的心愿', 2, 'none', '全队各回复3生命。消耗。', [heal(3, 'all')],
    branch('真挚心愿', 2, '全队各回复5生命。消耗。', [heal(5, 'all')], { exhaust: true }),
    branch('澄澈心愿', 1, '全队各回复2生命并各净化1项负面状态。消耗。', [heal(2, 'all'), { type: 'cleanse', amount: 1, to: 'all' }], { exhaust: true }), ['support', 'heal'], false, { exhaust: true });
  card('yui_banish', 'yui', '驱散阴影', 2, 'enemyAny', '造成7魔法伤害，目标本轮下一次单体攻击减2。', [hit(7, 'magic'), weak(2)],
    branch('轻声驱散', 1, '造成5魔法伤害，目标本轮下一次单体攻击减2。', [hit(5, 'magic'), weak(2)]),
    branch('破晓驱散', 2, '造成10魔法伤害，再驱散目标1项正面效果。', [hit(10, 'magic'), { type: 'dispel', amount: 1 }]), ['attack', 'magic', 'debuff']);

  var art = function (name) { return 'priconne_standing_pngs/' + name; };
  var heroes = {
    pecorine: { id: 'pecorine', name: '佩可', role: '保护 · 反击', hp: 36, color: '#efae56', art: art('Pecorine -- Pecorine (game).png'), portrait: 'assets/portraits/pecorine.png', passive: '每轮敌方阶段，首次用护盾吸收单体攻击后，反击3物理伤害。', burst: { name: '公主的决意', text: '造成8物理伤害，自身获得10护盾。', target: 'enemy', effects: [hit(8, 'physical'), block(10)] } },
    rei: { id: 'rei', name: '怜', role: '物理 · 破甲', hp: 28, color: '#7885d8', art: art('Rei -- Rei (game).png'), portrait: 'assets/portraits/rei.png', passive: '每轮首次攻击已有负面状态的敌人，主伤害加2。', burst: { name: '决胜一剑', text: '造成12物理伤害，无视护甲；仍可获得鼓舞、破甲和自身被动加成。', target: 'enemy', effects: [hit(12, 'physical', { ignoreArmor: true })] } },
    kokkoro: { id: 'kokkoro', name: '可可萝', role: '支援 · 调度', hp: 26, color: '#72bda3', art: art('Kokkoro -- Kokkoro (game).svg'), portrait: 'assets/portraits/kokkoro.png', passive: '每轮首次打出普通支援牌，最低生命比例的角色获得2护盾。平手选靠前者。', burst: { name: '精灵的守护', text: '全队各获得5护盾，指定另一名队友获得2TP。', target: 'otherAlly', effects: [block(5, 'all'), { type: 'tp', amount: 2, to: 'target' }] } },
    kyaru: { id: 'kyaru', name: '凯露', role: '魔法 · 咒痕', hp: 24, color: '#bd86cb', art: art('Karyl -- Kyaru (game).png'), portrait: 'assets/portraits/kyaru.png', passive: '每轮首次主动命中后排的主伤害加2；群攻只有一个后排目标获得这份加成。', burst: { name: '黑暗裁决', text: '所有敌人受到8魔法伤害；可选择引爆各自咒痕额外4伤并清除，或保留咒痕。未触发的本轮咒痕另加2。', target: 'allEnemies', effects: [curseHit(8, 4, true, { all: true, optionalConsume: true })] } },
    hatsune: { id: 'hatsune', name: '初音', role: '魔法 · 星痕', hp: 24, color: '#dc8cbb', art: art('Hatsune -- Hatsune (game).png'), portrait: art('Hatsune -- Hatsune (game).png'), passive: '星痕最多3层；我方回合末造成等于层数的魔法伤害，然后减少1层。', burst: { name: '群星苏醒', text: '所有敌人先受到4魔法伤害，然后各获得2星痕。', target: 'allEnemies', effects: [hit(4, 'magic', { all: true }), stars(2, true)] } },
    yui: { id: 'yui', name: '优衣', role: '治疗 · 净化', hp: 26, color: '#e69aaf', art: art('Yui -- Yui (game).png'), portrait: 'assets/portraits/yui.png', passive: '每战首次实际回复生命时，该治疗目标额外获得3护盾。满血不触发。', burst: { name: '守护大家的愿望', text: '全队各回复4生命，获得2护盾。', target: 'none', effects: [heal(4, 'all'), block(2, 'all')] } }
  };

  var relics = {};
  function relic(id, name, text, image, tags) { relics[id] = { id: id, name: name, text: text, art: 'assets/relics/' + image + '.webp', tags: tags || [] }; }
  relic('guard_badge', '守护徽章', '每轮第一次获得护盾的角色额外获得2护盾；全队合计一次。', 'shield_badge', ['guard']);
  relic('opening_shield', '旅途的围巾', '开战时佩可获得4护盾；没有佩可则给前排。', 'warm_scarf', ['guard']);
  relic('star_book', '星图书签', '每战第一次使用牵星时，目标额外获得1星痕；仍最多3层。', 'witch_grimoire', ['stars']);
  relic('ember_prism', '余烬棱镜', '每轮首次流星引爆星痕后，给仍存活的主目标2星；主目标已倒下则给最前的存活敌人。', 'barrier_prism', ['stars']);
  relic('starlight_ward', '星光护符', '每轮首次星痕实际造成伤害后，最低生命比例队友获得2护盾。', 'spirit_lamp', ['stars', 'guard']);
  relic('battle_horn', '启程号角', '开战时全队各获得1TP，仍以6为上限。', 'battle_horn', ['tp']);
  relic('healing_bell', '疗愈铃铛', '每战首次实际治疗时，同一目标额外回复2生命；群体治疗只取第一个实际恢复者。', 'healing_bell', ['heal']);
  relic('hex_crystal', '留咒水晶', '每战首次施加咒痕时，该咒痕额外持续1轮。', 'hex_crystal', ['curse']);
  relic('wolf_fang', '狼牙饰物', '每轮首次对已有负面的目标造成单体物理主伤时，加2伤害。', 'wolf_fang', ['physical']);
  relic('witch_grimoire', '魔女手记', '每轮首次单体魔法主伤害加1，不强化星痕或群攻。', 'witch_grimoire', ['magic']);
  relic('counter_medal', '迎击勋章', '佩可每轮唯一一次护盾反击由3物理伤害提高到5。', 'counter_medal', ['guard', 'physical']);
  relic('tactical_notes', '行路笔记', '每战第一次指路多查看1张牌；仍只选1张入手。', 'tactical_notes', ['draw']);
  relic('warm_scarf', '暖心披肩', '开战时最低生命比例的角色回复3生命；每战一次。', 'regen_seed', ['heal']);
  relic('silver_arrow', '银色箭羽', '每轮首次主动单体命中后排时，主伤害加1。', 'silver_arrow', ['attack']);
  relic('holy_cup', '旅人的水杯', '每战胜利后全队各回复2生命。', 'holy_cup', ['heal']);

  function attack(name, amount, target, extra) { return Object.assign({ name: name, type: 'attack', amount: amount, target: target || 'front' }, extra || {}); }
  function aoe(name, amount, extra) { return Object.assign({ name: name, type: 'aoe', amount: amount }, extra || {}); }
  function guard(name, extra) { return Object.assign({ name: name, type: 'guard', amount: 0 }, extra || {}); }
  function mark(name, amount, target) { return { name: name, type: 'curse', amount: amount, target: target || 'lowest' }; }
  function enemy(id, name, hp, position, icon, color, cycle, extra) { return Object.assign({ id: id, name: name, hp: hp, position: position, icon: icon, color: color, cycle: cycle }, extra || {}); }
  var encounters = {};
  function encounter(id, name, act, type, description, enemies) { encounters[id] = { id: id, name: name, act: act, type: type, description: description, enemies: enemies }; }
  encounter('tutorial_gate', '出发前 · 三人的配合练习', 1, 'training', '固定牌序的安全演练：先各出一张专属牌，再让三位伙伴逐一释放必杀。练习不消耗远征生命、金币或卡牌。', [
    enemy('forest_spear', '训练守卫', 180, 'front', '🛡', '#8e9a6a', [attack('轻击：对前排造成2伤害', 2)]),
    enemy('forest_beast', '训练魔物', 120, 'back', '✦', '#ae7c66', [guard('观察：本轮不攻击')])
  ]);
  encounter('forest_patrol', '林间巡逻', 1, 'battle', '枪兵隔轮架盾；幼兽越打越凶。魔法可绕过前排处理后方。', [
    enemy('forest_spear', '架盾枪兵', 22, 'front', '🛡', '#8e9a6a', [guard('架盾：本轮5盾，不攻击', { amount: 5 }), attack('突刺', 6)] , { armor: 1 }),
    enemy('forest_beast', '饥饿幼兽', 14, 'back', '🐺', '#ae7c66', [attack('扑咬：每轮成长1，最多额外2', 3, 'lowest')], { growth: 1, growthCap: 2 })
  ]);
  encounter('forest_swarm', '草丛里的动静', 1, 'battle', '三名敌人生命不高，但放任多人同时行动会累积伤势。', [
    enemy('forest_bug_a', '硬壳虫', 13, 'front', '🪲', '#8baf78', [attack('钳击', 3)] , { armor: 1 }),
    enemy('forest_bug_b', '硬壳虫', 13, 'front', '🪲', '#91a86b', [attack('钳击', 3)] , { armor: 1 }),
    enemy('forest_sprite', '迷途精灵', 11, 'back', '✨', '#bb9ccf', [mark('破绽：下一轮首次受击加2', 2), attack('微光', 4, 'back')])
  ]);
  encounter('forest_mirror', '镜盾守卫', 1, 'elite', '只有一次6点魔法屏障。迎击轮先挡反击，或等下一轮集中出手。', [
    enemy('mirror_guard', '镜盾守卫', 42, 'front', '◈', '#8ca9bb', [guard('迎击：首次主动受伤后反击4', { counter: 4 }), attack('盾击', 7), aoe('震地', 2)], { armor: 1, barrier: 6 })
  ]);
  encounter('forest_boss', '幻影试炼 · 不败的邀约', 1, 'boss', '克莉丝提娜独自迎战。后排4伤、前排7伤、全队各4伤、获得4护盾，按四轮循环。', [
    enemy('seal_knight', '克莉丝提娜的幻影', 50, 'front', '♜', '#b78a65', [attack('远击：后排4', 4, 'back'), attack('不败重斩：前排7', 7), aoe('封印解放：全队4', 4), guard('整顿架势：4护盾', { amount: 4 })], { armor: 1 })
  ]);
  encounter('ruins_curse', '古道的诅咒', 2, 'battle', '施咒者不直接攻击；及时击败它或保留净化，能避免下一轮重击被放大。', [
    enemy('ruin_sentinel', '石像卫兵', 28, 'front', '🗿', '#999a9a', [attack('石拳', 6), attack('双拳', 3, 'front', { hits: 2 })], { armor: 2 }),
    enemy('ruin_hexer', '遗迹施咒者', 16, 'back', '✦', '#9e80b3', [mark('破绽：下一轮首次受击加2', 2), attack('暗光', 4, 'lowest')])
  ]);
  encounter('ruins_watch', '守望者小队', 2, 'battle', '有限魔盾需要破咒或连续伤害；中间的群攻敌人不会被单体减攻克制。', [
    enemy('ruin_warder', '魔盾守卫', 24, 'front', '🛡', '#799cad', [attack('守卫打击', 5)], { barrier: 6 }),
    enemy('ruin_chanter', '回声术士', 12, 'front', '☄', '#a18cbb', [aoe('回声', 2)]),
    enemy('ruin_hunter', '追猎幼兽', 18, 'back', '🐺', '#b58a72', [attack('追猎：每轮成长1，最多额外2', 4, 'lowest')], { growth: 1, growthCap: 2 })
  ]);
  encounter('ruins_elite', '符文卫队', 2, 'elite', '两名敌人交替重击。减攻只挡一次单体攻击，群体护盾能覆盖换目标后的压力。', [
    enemy('rune_knight', '符文骑士', 36, 'front', '⚔', '#8b91a9', [attack('符文重斩', 8), guard('稳住阵脚：4盾', { amount: 4 }), attack('连斩', 4, 'front', { hits: 2 })], { armor: 1 }),
    enemy('rune_mage', '符文使', 20, 'back', '◉', '#aa83b4', [mark('刻下破绽', 2), attack('魔弹', 6, 'lowest'), aoe('符文扩散', 2)], { barrier: 4 })
  ]);
  encounter('ruins_boss', '幻影试炼 · 镜中的答案', 2, 'boss', '似似花独自迎战。追击伤者6伤、全队各3伤、后排4伤连击2次、获得4护盾，按四轮循环。', [
    enemy('echo_master', '似似花的幻影', 58, 'back', '♛', '#9876b4', [attack('回声弹', 6, 'lowest'), aoe('遗迹共鸣', 3), attack('连环回声', 4, 'back', { hits: 2 }), guard('镜面整备：4护盾', { amount: 4 })], { barrier: 6 })
  ]);
  encounter('summit_duel', '塔顶巡狩', 3, 'battle', '前排重甲和后排低血弓手要求你决定伤害投向；后排攻击优先追逐受伤队友。', [
    enemy('summit_guard', '高塔重卫', 30, 'front', '♜', '#9c9690', [attack('重锤', 7), guard('架势：6盾', { amount: 6 })], { armor: 2 }),
    enemy('summit_archer', '巡狩弓手', 18, 'back', '🏹', '#b19377', [attack('瞄准伤者', 5, 'lowest')])
  ]);
  encounter('summit_stars', '星门守望', 3, 'battle', '三名敌人交替发力。前排的魔盾只展开一次，群攻可以缩短多人行动的时间。', [
    enemy('summit_shield', '星门卫兵', 22, 'front', '◈', '#87a1b2', [attack('星枪', 5)], { barrier: 6 }),
    enemy('summit_wisp', '游星', 14, 'back', '✧', '#bea3cd', [aoe('星光涟漪', 2)]),
    enemy('summit_hexer', '刻印使', 14, 'back', '✦', '#9e7ba6', [mark('破绽：下一轮首次受击加2', 2), attack('刻印爆发', 5, 'lowest')])
  ]);
  encounter('summit_elite', '守塔者', 3, 'elite', '单体重击、全体攻击、有限魔盾轮替。不能靠一种防御反复解决所有意图。', [
    enemy('tower_keeper', '守塔者', 58, 'front', '♞', '#9b91b5', [attack('决胜重击', 9), aoe('塔顶冲击', 3), guard('魔盾6：暂停攻击', { barrier: 6 })], { armor: 1 })
  ]);
  encounter('summit_boss', '幻影试炼 · 霸瞳的终局', 3, 'boss', '以单体、全体与连击轮换施压。第七轮起公开疲劳增压，抓住暂停轮完成准备。', [
    enemy('tower_crown', '星冠骑士', 68, 'front', '♚', '#b092c5', [attack('星冠重斩', 9), aoe('星潮', 4), guard('观测星轨：本轮6盾', { amount: 6 }), attack('两重星刃', 4, 'back', { hits: 2 })], { armor: 1, barrier: 6 })
  ]);

  var events = [
    { id: 'lost_lunch', name: '迷路的午餐篮', text: '路边留下了一篮热乎乎的食物。带走补给，还是循着便条把它送回去？', choices: [{ label: '分享食物', description: '全队各回复4生命。', effect: 'heal', amount: 4 }, { label: '送还篮子', description: '获得24金币。', effect: 'gold', amount: 24 }] },
    { id: 'training_stone', name: '刻着招式的石碑', text: '石碑上的动作并不适合所有人。只挑一张真正准备继续使用的牌练习。', choices: [{ label: '练习一种招式', description: '选择一张未升级卡，选择A或B分支。', effect: 'upgrade' }, { label: '记录沿途见闻', description: '获得18金币。', effect: 'gold', amount: 18 }] },
    { id: 'lighten_pack', name: '太重的行囊', text: '接下来的山路更窄了。减少重复工具能让想用的牌更容易到手。', choices: [{ label: '整理牌组', description: '选择并移除一张牌。', effect: 'remove' }, { label: '保留工具', description: '获得16金币。', effect: 'gold', amount: 16 }] },
    { id: 'guild_teacher', name: '休息中的冒险者', text: '一位冒险者愿意用自己的经验，交换一段关于塔内敌人的情报。', choices: [{ label: '学习专属特技', description: '从当前三名队员的奖励卡中三选一。', effect: 'draft' }, { label: '交换路费', description: '获得22金币。', effect: 'gold', amount: 22 }] },
    { id: 'broken_charm', name: '破损的护符', text: '石缝间的护符仍有微弱光芒。修好它需要花一点时间和材料。', choices: [{ label: '修复护符', description: '花费25金币，获得一件遗物。', effect: 'relic', cost: 25 }, { label: '继续赶路', description: '全队各回复2生命。', effect: 'heal', amount: 2 }] },
    { id: 'moon_spring', name: '月下泉水', text: '泉水只够做一件事。把这次补给用在眼前，或者为下一场准备一个更明确的打法。', choices: [{ label: '治疗伤势', description: '全队各回复5生命。', effect: 'heal', amount: 5 }, { label: '静心练习', description: '选择一张卡升级。', effect: 'upgrade' }] }
  ];
  var acts = [
    { id: 1, name: '林间入口', subtitle: '学会看清敌人的下一步', background: 'assets/boss/act1_boss_stage.webp', boss: 'forest_boss', battles: ['forest_patrol', 'forest_swarm'], elites: ['forest_mirror'], nodes: ['battle', 'event', 'choice', 'rest', 'boss'] },
    { id: 2, name: '遗迹回廊', subtitle: '把构筑变成可以反复实现的打法', background: 'assets/boss/act2_boss_stage.webp', boss: 'ruins_boss', battles: ['ruins_curse', 'ruins_watch'], elites: ['ruins_elite'], nodes: ['battle', 'event', 'choice', 'shop', 'boss'] },
    { id: 3, name: '星冠之顶', subtitle: '在多种威胁之间保住进攻机会', background: 'assets/boss/act3_boss_stage.webp', boss: 'summit_boss', battles: ['summit_duel', 'summit_stars'], elites: ['summit_elite'], nodes: ['battle', 'event', 'choice', 'rest', 'boss'] }
  ];
  var teams = [
    { name: '守护反击', ids: ['pecorine', 'rei', 'kokkoro'], text: '佩可承担压力，怜把破甲兑现成物理爆发，可可萝负责护盾和关键牌调度。没有治疗，伤势要靠路线补给。' },
    { name: '咒痕与群星', ids: ['kokkoro', 'kyaru', 'hatsune'], text: '凯露越过前排处理后方，初音用星痕缩短多敌战。护盾、牵星与指路让准备回合也有防守选择。' },
    { name: '安心远征', ids: ['pecorine', 'kyaru', 'yui'], text: '佩可掩护受压队友，凯露负责魔法突破，优衣有限次数的治疗修复已发生的损失。清场速度较慢。' }
  ];
  // RELEASE_V3_CONTENT_START: approved fan-game rules; no paper modules loaded at runtime.
  card("j1", "jun", "盾击", 1, "enemy", "近战3点物理伤害，自身3护盾。", [{"type":"hit","amount":3,"damageType":"physical"},{"type":"block","amount":3,"to":"self"}], {"name":"盾击 · 专精","cost":1,"text":"近战3点物理伤害，自身5护盾。","effects":[{"type":"hit","amount":3,"damageType":"physical"},{"type":"block","amount":5,"to":"self"}],"exhaust":false}, {"name":"盾击 · 变式","cost":1,"text":"近战6点物理伤害，自身1护盾。","effects":[{"type":"hit","amount":6,"damageType":"physical"},{"type":"block","amount":1,"to":"self"}],"exhaust":false}, ["attack","physical","guard"], true, {"paperId":"j1","kind":"attack","exhaust":false});
  card("j2", "jun", "稳住重铠", 1, "none", "自身7护盾。", [{"type":"block","amount":7,"to":"self"}], {"name":"稳住重铠 · 专精","cost":1,"text":"自身10护盾。","effects":[{"type":"block","amount":10,"to":"self"}],"exhaust":false}, {"name":"稳住重铠 · 变式","cost":1,"text":"自身6护盾，并净化自身1项。","effects":[{"type":"block","amount":6,"to":"self"},{"type":"cleanse","amount":1,"to":"self"}],"exhaust":false}, ["support","guard"], true, {"paperId":"j2","kind":"support","exhaust":false});
  card("j3", "jun", "铁壁", 2, "none", "自身12护盾，其他存活队友中最低比例者3护盾。", [{"type":"block","amount":12,"to":"self"},{"type":"block","amount":3,"to":"otherLowest"}], {"name":"铁壁 · 专精","cost":2,"text":"自身14护盾，其他最低比例者5护盾。","effects":[{"type":"block","amount":14,"to":"self"},{"type":"block","amount":5,"to":"otherLowest"}],"exhaust":false}, {"name":"铁壁 · 变式","cost":1,"text":"自身6护盾，其他最低比例者2护盾。","effects":[{"type":"block","amount":6,"to":"self"},{"type":"block","amount":2,"to":"otherLowest"}],"exhaust":false}, ["support","guard"], true, {"paperId":"j3","kind":"support","exhaust":false});
  card("j4", "jun", "撞开阵脚", 2, "enemy", "近战8点物理伤害，目标下一次单体减3。", [{"type":"hit","amount":8,"damageType":"physical"},{"type":"weak","amount":3}], {"name":"撞开阵脚 · 专精","cost":2,"text":"近战10点物理伤害，下一次单体减4。","effects":[{"type":"hit","amount":10,"damageType":"physical"},{"type":"weak","amount":4}],"exhaust":false}, {"name":"撞开阵脚 · 变式","cost":1,"text":"近战5点物理伤害，下一次单体减2。","effects":[{"type":"hit","amount":5,"damageType":"physical"},{"type":"weak","amount":2}],"exhaust":false}, ["attack","physical","debuff"], false, {"paperId":"j4","kind":"attack","exhaust":false});
  card("j5", "jun", "分担重负", 1, "otherAlly", "自身4护盾，代承指定其他队友下一次单体。", [{"type":"block","amount":4,"to":"self"},{"type":"cover"}], {"name":"分担重负 · 专精","cost":1,"text":"自身7护盾，代承一次单体。","effects":[{"type":"block","amount":7,"to":"self"},{"type":"cover"}],"exhaust":false}, {"name":"分担重负 · 变式","cost":1,"text":"自身4护盾，代承一次单体，并净化指定受护者1项。","effects":[{"type":"block","amount":4,"to":"self"},{"type":"cover"},{"type":"cleanse","amount":1,"to":"target"}],"exhaust":false}, ["support","guard"], false, {"paperId":"j5","kind":"support","exhaust":false});
  card("nz1", "nozomi", "开场号令", 1, "none", "所有存活队友2护盾；支援被动可给自身鼓舞2。", [{"type":"block","amount":2,"to":"all"}], {"name":"开场号令 · 专精","cost":1,"text":"所有存活队友3护盾；被动照常。","effects":[{"type":"block","amount":3,"to":"all"}],"exhaust":false}, {"name":"开场号令 · 变式","cost":1,"text":"所有存活队友1护盾；该牌触发的自身鼓舞改4。","effects":[{"type":"block","amount":1,"to":"all"}],"exhaust":false,"nozomiBuff":4}, ["support","guard"], true, {"paperId":"nz1","kind":"support","exhaust":false});
  card("nz2", "nozomi", "剑声", 1, "enemy", "近战4点物理伤害，下一次单体减2。", [{"type":"hit","amount":4,"damageType":"physical"},{"type":"weak","amount":2}], {"name":"剑声 · 专精","cost":1,"text":"近战4点物理伤害，下一次单体减4。","effects":[{"type":"hit","amount":4,"damageType":"physical"},{"type":"weak","amount":4}],"exhaust":false}, {"name":"剑声 · 变式","cost":1,"text":"近战7点物理伤害，下一次单体减1。","effects":[{"type":"hit","amount":7,"damageType":"physical"},{"type":"weak","amount":1}],"exhaust":false}, ["attack","physical","debuff"], true, {"paperId":"nz2","kind":"attack","exhaust":false});
  card("nz3", "nozomi", "聚光", 2, "otherAlly", "自身10护盾，代承指定其他队友下一次单体。", [{"type":"block","amount":10,"to":"self"},{"type":"cover"}], {"name":"聚光 · 专精","cost":2,"text":"自身14护盾，代承一次单体。","effects":[{"type":"block","amount":14,"to":"self"},{"type":"cover"}],"exhaust":false}, {"name":"聚光 · 变式","cost":1,"text":"自身6护盾，代承一次单体。","effects":[{"type":"block","amount":6,"to":"self"},{"type":"cover"}],"exhaust":false}, ["support","guard"], true, {"paperId":"nz3","kind":"support","exhaust":false});
  card("nz4", "nozomi", "安可守护", 1, "ally", "指定队友5护盾，净化1项。", [{"type":"block","amount":5,"to":"target"},{"type":"cleanse","amount":1,"to":"target"}], {"name":"安可守护 · 专精","cost":1,"text":"指定队友7护盾，净化1项。","effects":[{"type":"block","amount":7,"to":"target"},{"type":"cleanse","amount":1,"to":"target"}],"exhaust":false}, {"name":"安可守护 · 变式","cost":1,"text":"指定队友4护盾，净化2项。","effects":[{"type":"block","amount":4,"to":"target"},{"type":"cleanse","amount":2,"to":"target"}],"exhaust":false}, ["support","guard","cleanse"], false, {"paperId":"nz4","kind":"support","exhaust":false});
  card("nz5", "nozomi", "回声剑", 2, "enemy", "近战9点物理伤害，最低比例队友2护盾。", [{"type":"hit","amount":9,"damageType":"physical"},{"type":"block","amount":2,"to":"lowest"}], {"name":"回声剑 · 专精","cost":2,"text":"近战11点物理伤害，最低比例队友3护盾。","effects":[{"type":"hit","amount":11,"damageType":"physical"},{"type":"block","amount":3,"to":"lowest"}],"exhaust":false}, {"name":"回声剑 · 变式","cost":1,"text":"近战5点物理伤害，最低比例队友2护盾。","effects":[{"type":"hit","amount":5,"damageType":"physical"},{"type":"block","amount":2,"to":"lowest"}],"exhaust":false}, ["attack","physical","guard"], false, {"paperId":"nz5","kind":"attack","exhaust":false});
  card("sz1", "shizuru", "拂刃", 1, "enemy", "近战4点物理伤害，自身2护盾。", [{"type":"hit","amount":4,"damageType":"physical"},{"type":"block","amount":2,"to":"self"}], {"name":"拂刃 · 专精","cost":1,"text":"近战4点物理伤害，自身4护盾。","effects":[{"type":"hit","amount":4,"damageType":"physical"},{"type":"block","amount":4,"to":"self"}],"exhaust":false}, {"name":"拂刃 · 变式","cost":1,"text":"近战7点物理伤害，不再给盾。","effects":[{"type":"hit","amount":7,"damageType":"physical"}],"exhaust":false}, ["attack","physical","guard"], true, {"paperId":"sz1","kind":"attack","exhaust":false});
  card("sz2", "shizuru", "姐姐的守望", 1, "ally", "指定队友5护盾；不高于半血时卡面另2，可再触发每轮一次被动2。", [{"type":"block","amount":5,"to":"target","halfBonus":2}], {"name":"姐姐的守望 · 专精","cost":1,"text":"指定队友7护盾；保留卡面半血2与被动2。","effects":[{"type":"block","amount":7,"to":"target","halfBonus":2}],"exhaust":false}, {"name":"姐姐的守望 · 变式","cost":1,"text":"指定队友4护盾，净化2项；移除卡面半血2，被动仍可触发。","effects":[{"type":"block","amount":4,"to":"target"},{"type":"cleanse","amount":2,"to":"target"}],"exhaust":false}, ["support","guard"], true, {"paperId":"sz2","kind":"support","exhaust":false});
  card("sz3", "shizuru", "紧急包扎", 2, "ally", "指定队友回6HP后得2护盾；消耗。", [{"type":"heal","amount":6,"to":"target"},{"type":"block","amount":2,"to":"target"}], {"name":"紧急包扎 · 专精","cost":2,"text":"回9HP后得2护盾；消耗。","effects":[{"type":"heal","amount":9,"to":"target"},{"type":"block","amount":2,"to":"target"}],"exhaust":true}, {"name":"紧急包扎 · 变式","cost":1,"text":"回4HP后得1护盾；消耗。","effects":[{"type":"heal","amount":4,"to":"target"},{"type":"block","amount":1,"to":"target"}],"exhaust":true}, ["support","guard","heal"], true, {"paperId":"sz3","kind":"support","exhaust":true});
  card("sz4", "shizuru", "护住身后", 1, "none", "所有存活队友3护盾，被动最多给前到后首位不高于半血者额外2。", [{"type":"block","amount":3,"to":"all"}], {"name":"护住身后 · 专精","cost":1,"text":"所有存活队友4护盾，被动限制相同。","effects":[{"type":"block","amount":4,"to":"all"}],"exhaust":false}, {"name":"护住身后 · 变式","cost":1,"text":"所有存活队友2护盾，各净化1项；被动限制相同。","effects":[{"type":"block","amount":2,"to":"all"},{"type":"cleanse","amount":1,"to":"all"}],"exhaust":false}, ["support","guard"], false, {"paperId":"sz4","kind":"support","exhaust":false});
  card("sz5", "shizuru", "援剑", 2, "enemy", "近战8点物理伤害，最低比例队友回2HP；消耗。", [{"type":"hit","amount":8,"damageType":"physical"},{"type":"heal","amount":2,"to":"lowest"}], {"name":"援剑 · 专精","cost":2,"text":"近战10点物理伤害，最低比例队友回4HP；消耗。","effects":[{"type":"hit","amount":10,"damageType":"physical"},{"type":"heal","amount":4,"to":"lowest"}],"exhaust":true}, {"name":"援剑 · 变式","cost":1,"text":"近战5点物理伤害，最低比例队友回2HP；消耗。","effects":[{"type":"hit","amount":5,"damageType":"physical"},{"type":"heal","amount":2,"to":"lowest"}],"exhaust":true}, ["attack","physical","heal"], false, {"paperId":"sz5","kind":"attack","exhaust":true});
  card("m1", "makoto", "裂甲", 1, "enemy", "近战2点物理伤害后上本轮破甲3。", [{"type":"hit","amount":2,"damageType":"physical"},{"type":"break","amount":3,"turns":1}], {"name":"裂甲 · 专精","cost":1,"text":"近战2点物理伤害后上本轮破甲4。","effects":[{"type":"hit","amount":2,"damageType":"physical"},{"type":"break","amount":4,"turns":1}],"exhaust":false}, {"name":"裂甲 · 变式","cost":1,"text":"近战2点物理伤害后上两轮破甲2。","effects":[{"type":"hit","amount":2,"damageType":"physical"},{"type":"break","amount":2,"turns":2}],"exhaust":false}, ["attack","physical","debuff"], true, {"paperId":"m1","kind":"attack","exhaust":false});
  card("m2", "makoto", "追猎", 1, "enemy", "近战5点物理伤害，整张后消耗目标现有破甲。", [{"type":"hit","amount":5,"damageType":"physical"},{"type":"consumeBreak"}], {"name":"追猎 · 专精","cost":1,"text":"近战4点物理伤害，不消耗破甲。","effects":[{"type":"hit","amount":4,"damageType":"physical"}],"exhaust":false}, {"name":"追猎 · 变式","cost":1,"text":"近战7点物理伤害，照常消耗破甲。","effects":[{"type":"hit","amount":7,"damageType":"physical"},{"type":"consumeBreak"}],"exhaust":false}, ["attack","physical"], true, {"paperId":"m2","kind":"attack","exhaust":false});
  card("m3", "makoto", "狼突", 2, "enemy", "近战10点物理伤害后消耗破甲。", [{"type":"hit","amount":10,"damageType":"physical"},{"type":"consumeBreak"}], {"name":"狼突 · 专精","cost":2,"text":"近战13点物理伤害后消耗破甲。","effects":[{"type":"hit","amount":13,"damageType":"physical"},{"type":"consumeBreak"}],"exhaust":false}, {"name":"狼突 · 变式","cost":1,"text":"近战6点物理伤害后消耗破甲。","effects":[{"type":"hit","amount":6,"damageType":"physical"},{"type":"consumeBreak"}],"exhaust":false}, ["attack","physical"], true, {"paperId":"m3","kind":"attack","exhaust":false});
  card("m4", "makoto", "先让你一剑", 1, "enemy", "近战2点物理伤害，上两轮破甲2，不消耗。", [{"type":"hit","amount":2,"damageType":"physical"},{"type":"break","amount":2,"turns":2}], {"name":"先让你一剑 · 专精","cost":1,"text":"近战3点物理伤害，上两轮破甲3，不消耗。","effects":[{"type":"hit","amount":3,"damageType":"physical"},{"type":"break","amount":3,"turns":2}],"exhaust":false}, {"name":"先让你一剑 · 变式","cost":1,"text":"近战4点物理伤害，上本轮破甲3，不消耗。","effects":[{"type":"hit","amount":4,"damageType":"physical"},{"type":"break","amount":3,"turns":1}],"exhaust":false}, ["attack","physical","debuff"], false, {"paperId":"m4","kind":"attack","exhaust":false});
  card("m5", "makoto", "咬住步伐", 1, "enemy", "近战3点物理伤害，下一次单体减3，不消耗破甲。", [{"type":"hit","amount":3,"damageType":"physical"},{"type":"weak","amount":3}], {"name":"咬住步伐 · 专精","cost":1,"text":"近战3点物理伤害，下一次单体减5。","effects":[{"type":"hit","amount":3,"damageType":"physical"},{"type":"weak","amount":5}],"exhaust":false}, {"name":"咬住步伐 · 变式","cost":1,"text":"近战6点物理伤害，下一次单体减2。","effects":[{"type":"hit","amount":6,"damageType":"physical"},{"type":"weak","amount":2}],"exhaust":false}, ["attack","physical","debuff"], false, {"paperId":"m5","kind":"attack","exhaust":false});
  card("z1", "suzuna", "随手一箭", 1, "enemyAny", "任意敌人5点物理伤害。", [{"type":"hit","amount":5,"damageType":"physical"}], {"name":"随手一箭 · 专精","cost":1,"text":"任意敌人7点物理伤害。","effects":[{"type":"hit","amount":7,"damageType":"physical"}],"exhaust":false}, {"name":"随手一箭 · 变式","cost":1,"text":"任意敌人4点物理伤害，自身2护盾。","effects":[{"type":"hit","amount":4,"damageType":"physical"},{"type":"block","amount":2,"to":"self"}],"exhaust":false}, ["attack","physical"], true, {"paperId":"z1","kind":"attack","exhaust":false});
  card("z2", "suzuna", "认真瞄准", 1, "none", "自身本轮鼓舞5。", [{"type":"buff","amount":5,"to":"self"}], {"name":"认真瞄准 · 专精","cost":1,"text":"自身本轮鼓舞7。","effects":[{"type":"buff","amount":7,"to":"self"}],"exhaust":false}, {"name":"认真瞄准 · 变式","cost":1,"text":"自身鼓舞3并得4护盾。","effects":[{"type":"buff","amount":3,"to":"self"},{"type":"block","amount":4,"to":"self"}],"exhaust":false}, ["support","buff"], true, {"paperId":"z2","kind":"support","exhaust":false});
  card("z3", "suzuna", "穿心箭", 2, "enemyAny", "任意敌人10点物理伤害；出手前不高于半血改13。", [{"type":"hit","amount":10,"damageType":"physical","executeAmount":13,"executeThreshold":0.5}], {"name":"穿心箭 · 专精","cost":2,"text":"基础12点物理伤害，半血改16。","effects":[{"type":"hit","amount":12,"damageType":"physical","executeAmount":16,"executeThreshold":0.5}],"exhaust":false}, {"name":"穿心箭 · 变式","cost":1,"text":"基础6点物理伤害，半血改8。","effects":[{"type":"hit","amount":6,"damageType":"physical","executeAmount":8,"executeThreshold":0.5}],"exhaust":false}, ["attack","physical"], true, {"paperId":"z3","kind":"attack","exhaust":false});
  card("z4", "suzuna", "压住准星", 1, "enemyAny", "任意敌人3点物理伤害，下一次单体减2。", [{"type":"hit","amount":3,"damageType":"physical"},{"type":"weak","amount":2}], {"name":"压住准星 · 专精","cost":1,"text":"任意敌人5点物理伤害，下一次单体减3。","effects":[{"type":"hit","amount":5,"damageType":"physical"},{"type":"weak","amount":3}],"exhaust":false}, {"name":"压住准星 · 变式","cost":1,"text":"任意敌人3点物理伤害，下一次单体减4。","effects":[{"type":"hit","amount":3,"damageType":"physical"},{"type":"weak","amount":4}],"exhaust":false}, ["attack","physical","debuff"], false, {"paperId":"z4","kind":"attack","exhaust":false});
  card("z5", "suzuna", "横贯射线", 2, "allEnemies", "所有敌人4点物理伤害，不吃单体鼓舞或满血穿甲被动。", [{"type":"hit","amount":4,"damageType":"physical","all":true}], {"name":"横贯射线 · 专精","cost":2,"text":"所有敌人6点物理伤害。","effects":[{"type":"hit","amount":6,"damageType":"physical","all":true}],"exhaust":false}, {"name":"横贯射线 · 变式","cost":1,"text":"所有敌人2点物理伤害。","effects":[{"type":"hit","amount":2,"damageType":"physical","all":true}],"exhaust":false}, ["attack","physical"], false, {"paperId":"z5","kind":"attack","exhaust":false});
  card("ar1", "arisa", "叶间短射", 1, "enemyAny", "任意敌人4点物理伤害。", [{"type":"hit","amount":4,"damageType":"physical"}], {"name":"叶间短射 · 专精","cost":1,"text":"任意敌人6点物理伤害。","effects":[{"type":"hit","amount":6,"damageType":"physical"}],"exhaust":false}, {"name":"叶间短射 · 变式","cost":1,"text":"任意敌人3点物理伤害，自身3护盾。","effects":[{"type":"hit","amount":3,"damageType":"physical"},{"type":"block","amount":3,"to":"self"}],"exhaust":false}, ["attack","physical"], true, {"paperId":"ar1","kind":"attack","exhaust":false});
  card("ar2", "arisa", "复射", 2, "enemyAny", "任意单一敌人3点物理伤害×2。", [{"type":"hit","amount":3,"damageType":"physical","hits":2}], {"name":"复射 · 专精","cost":2,"text":"任意单一敌人4点物理伤害×2。","effects":[{"type":"hit","amount":4,"damageType":"physical","hits":2}],"exhaust":false}, {"name":"复射 · 变式","cost":1,"text":"任意敌人一段4点物理伤害。","effects":[{"type":"hit","amount":4,"damageType":"physical"}],"exhaust":false}, ["attack","physical"], true, {"paperId":"ar2","kind":"attack","exhaust":false});
  card("ar3", "arisa", "寻叶", 1, "none", "自身2护盾，看实际顶2取1，其余原序置底。", [{"type":"block","amount":2,"to":"self"},{"type":"guide","count":2}], {"name":"寻叶 · 专精","cost":1,"text":"自身2护盾，看顶4取1。","effects":[{"type":"block","amount":2,"to":"self"},{"type":"guide","count":4}],"exhaust":false}, {"name":"寻叶 · 变式","cost":1,"text":"自身5护盾，看顶2取1。","effects":[{"type":"block","amount":5,"to":"self"},{"type":"guide","count":2}],"exhaust":false}, ["support","guard","draw"], true, {"paperId":"ar3","kind":"support","exhaust":false});
  card("ar4", "arisa", "穿叶", 1, "enemyAny", "任意敌人3点物理伤害，下一次单体减2。", [{"type":"hit","amount":3,"damageType":"physical"},{"type":"weak","amount":2}], {"name":"穿叶 · 专精","cost":1,"text":"任意敌人5点物理伤害，下一次单体减3。","effects":[{"type":"hit","amount":5,"damageType":"physical"},{"type":"weak","amount":3}],"exhaust":false}, {"name":"穿叶 · 变式","cost":1,"text":"任意敌人3点物理伤害，下一次单体减4。","effects":[{"type":"hit","amount":3,"damageType":"physical"},{"type":"weak","amount":4}],"exhaust":false}, ["attack","physical","debuff"], false, {"paperId":"ar4","kind":"attack","exhaust":false});
  card("ar5", "arisa", "森之长矢", 2, "enemyAny", "任意敌人8点物理伤害；本轮经卡牌实际额外取得过手牌则+3。", [{"type":"hit","amount":8,"damageType":"physical","afterDrawBonus":3}], {"name":"森之长矢 · 专精","cost":2,"text":"基础10点物理伤害，条件满足另+4。","effects":[{"type":"hit","amount":10,"damageType":"physical","afterDrawBonus":4}],"exhaust":false}, {"name":"森之长矢 · 变式","cost":1,"text":"基础5点物理伤害，条件满足另+2。","effects":[{"type":"hit","amount":5,"damageType":"physical","afterDrawBonus":2}],"exhaust":false}, ["attack","physical"], false, {"paperId":"ar5","kind":"attack","exhaust":false});
  card("u1", "miyako", "幽拳", 1, "enemy", "近战4点物理伤害，自身回2HP。", [{"type":"hit","amount":4,"damageType":"physical"},{"type":"heal","amount":2,"to":"self"}], {"name":"幽拳 · 专精","cost":1,"text":"近战4点物理伤害，自身回4HP。","effects":[{"type":"hit","amount":4,"damageType":"physical"},{"type":"heal","amount":4,"to":"self"}],"exhaust":false}, {"name":"幽拳 · 变式","cost":1,"text":"近战7点物理伤害，不再治疗。","effects":[{"type":"hit","amount":7,"damageType":"physical"}],"exhaust":false}, ["attack","physical","heal"], true, {"paperId":"u1","kind":"attack","exhaust":false});
  card("u2", "miyako", "布丁时间", 1, "none", "自身回4HP；消耗。", [{"type":"heal","amount":4,"to":"self"}], {"name":"布丁时间 · 专精","cost":1,"text":"自身回7HP；消耗。","effects":[{"type":"heal","amount":7,"to":"self"}],"exhaust":true}, {"name":"布丁时间 · 变式","cost":1,"text":"自身回3HP后得4护盾；消耗。","effects":[{"type":"heal","amount":3,"to":"self"},{"type":"block","amount":4,"to":"self"}],"exhaust":true}, ["support","heal"], true, {"paperId":"u2","kind":"support","exhaust":true});
  card("u3", "miyako", "轻飘飘", 1, "none", "自身6护盾。", [{"type":"block","amount":6,"to":"self"}], {"name":"轻飘飘 · 专精","cost":1,"text":"自身9护盾。","effects":[{"type":"block","amount":9,"to":"self"}],"exhaust":false}, {"name":"轻飘飘 · 变式","cost":1,"text":"自身5护盾，净化自身1项。","effects":[{"type":"block","amount":5,"to":"self"},{"type":"cleanse","amount":1,"to":"self"}],"exhaust":false}, ["support","guard"], true, {"paperId":"u3","kind":"support","exhaust":false});
  card("u4", "miyako", "分一小口", 1, "ally", "指定队友回3HP，自身3护盾；消耗。", [{"type":"heal","amount":3,"to":"target"},{"type":"block","amount":3,"to":"self"}], {"name":"分一小口 · 专精","cost":1,"text":"指定队友回5HP，自身3护盾；消耗。","effects":[{"type":"heal","amount":5,"to":"target"},{"type":"block","amount":3,"to":"self"}],"exhaust":true}, {"name":"分一小口 · 变式","cost":1,"text":"指定队友回2HP，自身6护盾；消耗。","effects":[{"type":"heal","amount":2,"to":"target"},{"type":"block","amount":6,"to":"self"}],"exhaust":true}, ["support","guard","heal"], false, {"paperId":"u4","kind":"support","exhaust":true});
  card("u5", "miyako", "夜间敲门", 2, "enemyAny", "任意敌人7点魔法伤害，自身回3HP；消耗。", [{"type":"hit","amount":7,"damageType":"magic"},{"type":"heal","amount":3,"to":"self"}], {"name":"夜间敲门 · 专精","cost":2,"text":"任意敌人10点魔法伤害，自身回4HP；消耗。","effects":[{"type":"hit","amount":10,"damageType":"magic"},{"type":"heal","amount":4,"to":"self"}],"exhaust":true}, {"name":"夜间敲门 · 变式","cost":1,"text":"任意敌人5点魔法伤害，自身回2HP；消耗。","effects":[{"type":"hit","amount":5,"damageType":"magic"},{"type":"heal","amount":2,"to":"self"}],"exhaust":true}, ["attack","magic","heal"], false, {"paperId":"u5","kind":"attack","exhaust":true});
  card("a1", "anna", "冥火", 1, "allEnemies", "自己付2HP，所有敌人2点魔法伤害；本轮首次支付另所有敌人1点魔法伤害。", [{"type":"payHp","amount":2},{"type":"hit","amount":2,"damageType":"magic","all":true}], {"name":"冥火 · 专精","cost":1,"text":"付1HP，所有敌人2点魔法伤害。","effects":[{"type":"payHp","amount":1},{"type":"hit","amount":2,"damageType":"magic","all":true}],"exhaust":false}, {"name":"冥火 · 变式","cost":1,"text":"付3HP，所有敌人3点魔法伤害。","effects":[{"type":"payHp","amount":3},{"type":"hit","amount":3,"damageType":"magic","all":true}],"exhaust":false}, ["attack","magic","payHp"], true, {"paperId":"a1","kind":"attack","exhaust":false});
  card("a2", "anna", "禁咒", 2, "enemyAny", "自己付3HP，任意敌人11点魔法伤害。", [{"type":"payHp","amount":3},{"type":"hit","amount":11,"damageType":"magic"}], {"name":"禁咒 · 专精","cost":2,"text":"自己付2HP，任意敌人11点魔法伤害。","effects":[{"type":"payHp","amount":2},{"type":"hit","amount":11,"damageType":"magic"}],"exhaust":false}, {"name":"禁咒 · 变式","cost":3,"text":"自己付4HP，任意敌人18点魔法伤害。","effects":[{"type":"payHp","amount":4},{"type":"hit","amount":18,"damageType":"magic"}],"exhaust":false}, ["attack","magic","payHp"], true, {"paperId":"a2","kind":"attack","exhaust":false});
  card("a3", "anna", "封句", 1, "none", "自身6护盾。", [{"type":"block","amount":6,"to":"self"}], {"name":"封句 · 专精","cost":1,"text":"自身9护盾。","effects":[{"type":"block","amount":9,"to":"self"}],"exhaust":false}, {"name":"封句 · 变式","cost":1,"text":"自身5护盾，净化自身1项。","effects":[{"type":"block","amount":5,"to":"self"},{"type":"cleanse","amount":1,"to":"self"}],"exhaust":false}, ["support","guard"], true, {"paperId":"a3","kind":"support","exhaust":false});
  card("a4", "anna", "收束咒文", 1, "none", "所有敌人下一次单体减1，自身2护盾。", [{"type":"weak","amount":1,"all":true},{"type":"block","amount":2,"to":"self"}], {"name":"收束咒文 · 专精","cost":1,"text":"所有敌人下一次单体减2，自身3护盾。","effects":[{"type":"weak","amount":2,"all":true},{"type":"block","amount":3,"to":"self"}],"exhaust":false}, {"name":"收束咒文 · 变式","cost":1,"text":"所有敌人下一次单体减1，自身5护盾。","effects":[{"type":"weak","amount":1,"all":true},{"type":"block","amount":5,"to":"self"}],"exhaust":false}, ["support","guard","debuff"], false, {"paperId":"a4","kind":"support","exhaust":false});
  card("a5", "anna", "吸魔", 2, "enemyAny", "任意敌人6点魔法伤害，自身回3HP；消耗。", [{"type":"hit","amount":6,"damageType":"magic"},{"type":"heal","amount":3,"to":"self"}], {"name":"吸魔 · 专精","cost":2,"text":"任意敌人9点魔法伤害，自身回4HP；消耗。","effects":[{"type":"hit","amount":9,"damageType":"magic"},{"type":"heal","amount":4,"to":"self"}],"exhaust":true}, {"name":"吸魔 · 变式","cost":1,"text":"任意敌人4点魔法伤害，自身回2HP；消耗。","effects":[{"type":"hit","amount":4,"damageType":"magic"},{"type":"heal","amount":2,"to":"self"}],"exhaust":true}, ["attack","magic","heal"], false, {"paperId":"a5","kind":"attack","exhaust":true});
  card("y1", "yori", "弱电", 1, "enemyAny", "任意敌人4点魔法伤害。", [{"type":"hit","amount":4,"damageType":"magic"}], {"name":"弱电 · 专精","cost":1,"text":"任意敌人6点魔法伤害。","effects":[{"type":"hit","amount":6,"damageType":"magic"}],"exhaust":false}, {"name":"弱电 · 变式","cost":1,"text":"任意敌人3点魔法伤害，净化自身1项。","effects":[{"type":"hit","amount":3,"damageType":"magic"},{"type":"cleanse","amount":1,"to":"self"}],"exhaust":false}, ["attack","magic"], true, {"paperId":"y1","kind":"attack","exhaust":false});
  card("y2", "yori", "留到现在的雷霆", 2, "enemyAny", "任意敌人11点魔法伤害；消耗。", [{"type":"hit","amount":11,"damageType":"magic"}], {"name":"留到现在的雷霆 · 专精","cost":2,"text":"任意敌人11点魔法伤害，最低比例队友3护盾；消耗。","effects":[{"type":"hit","amount":11,"damageType":"magic"},{"type":"block","amount":3,"to":"lowest"}],"exhaust":true}, {"name":"留到现在的雷霆 · 变式","cost":2,"text":"任意敌人8点魔法伤害，不再消耗。","effects":[{"type":"hit","amount":8,"damageType":"magic"}],"exhaust":false}, ["attack","magic"], true, {"paperId":"y2","kind":"attack","exhaust":true});
  card("y3", "yori", "护法", 1, "ally", "指定队友5护盾，净化1项。", [{"type":"block","amount":5,"to":"target"},{"type":"cleanse","amount":1,"to":"target"}], {"name":"护法 · 专精","cost":1,"text":"指定队友7护盾，净化1项。","effects":[{"type":"block","amount":7,"to":"target"},{"type":"cleanse","amount":1,"to":"target"}],"exhaust":false}, {"name":"护法 · 变式","cost":1,"text":"指定队友4护盾，净化2项。","effects":[{"type":"block","amount":4,"to":"target"},{"type":"cleanse","amount":2,"to":"target"}],"exhaust":false}, ["support","guard","cleanse"], true, {"paperId":"y3","kind":"support","exhaust":false});
  card("y4", "yori", "净魔雷", 1, "enemyAny", "任意敌人6点魔法伤害后移除最多2剩余魔法屏障；消耗。", [{"type":"hit","amount":6,"damageType":"magic"},{"type":"stripBarrier","amount":2}], {"name":"净魔雷 · 专精","cost":1,"text":"任意敌人8点魔法伤害后移除最多3剩余魔法屏障；消耗。","effects":[{"type":"hit","amount":8,"damageType":"magic"},{"type":"stripBarrier","amount":3}],"exhaust":true}, {"name":"净魔雷 · 变式","cost":1,"text":"任意敌人5点魔法伤害后移除最多2剩余魔法屏障，不再消耗。","effects":[{"type":"hit","amount":5,"damageType":"magic"},{"type":"stripBarrier","amount":2}],"exhaust":false}, ["attack","magic"], false, {"paperId":"y4","kind":"attack","exhaust":true});
  card("y5", "yori", "留一手", 1, "none", "本人弃牌中选1非消耗牌置顶，不入手、不抽牌。", [{"type":"recover","count":1}], {"name":"留一手 · 专精","cost":1,"text":"同基础，再自身3护盾。","effects":[{"type":"recover","count":1},{"type":"block","amount":3,"to":"self"}],"exhaust":false}, {"name":"留一手 · 变式","cost":1,"text":"从本人弃牌选最多2非消耗牌，按选择顺序置顶；不抽牌。","effects":[{"type":"recover","count":2}],"exhaust":false}, ["support","draw"], false, {"paperId":"y5","kind":"support","exhaust":false});
  card("k1", "kaori", "正拳", 1, "enemy", "5点物理伤害。", [{"type":"hit","amount":5,"damageType":"physical"}], {"name":"正拳 · 专精","cost":1,"text":"7点物理伤害。","effects":[{"type":"hit","amount":7,"damageType":"physical"}],"exhaust":false}, {"name":"正拳 · 变式","cost":1,"text":"4点物理伤害，自身2护盾。","effects":[{"type":"hit","amount":4,"damageType":"physical"},{"type":"block","amount":2,"to":"self"}],"exhaust":false}, ["attack","physical"], true, {"paperId":"k1","kind":"attack","exhaust":false});
  card("k2", "kaori", "连打", 1, "enemy", "2点物理伤害×2。", [{"type":"hit","amount":2,"damageType":"physical","hits":2}], {"name":"连打 · 专精","cost":1,"text":"一段6点物理伤害。","effects":[{"type":"hit","amount":6,"damageType":"physical"}],"exhaust":false}, {"name":"连打 · 变式","cost":1,"text":"2点物理伤害×3。","effects":[{"type":"hit","amount":2,"damageType":"physical","hits":3}],"exhaust":false}, ["attack","physical"], true, {"paperId":"k2","kind":"attack","exhaust":false});
  card("k3", "kaori", "调整架势", 1, "none", "自身4护盾、鼓舞2。", [{"type":"block","amount":4,"to":"self"},{"type":"buff","amount":2,"to":"self"}], {"name":"调整架势 · 专精","cost":1,"text":"自身6护盾、鼓舞2。","effects":[{"type":"block","amount":6,"to":"self"},{"type":"buff","amount":2,"to":"self"}],"exhaust":false}, {"name":"调整架势 · 变式","cost":1,"text":"自身2护盾、鼓舞4。","effects":[{"type":"block","amount":2,"to":"self"},{"type":"buff","amount":4,"to":"self"}],"exhaust":false}, ["support","guard","buff"], true, {"paperId":"k3","kind":"support","exhaust":false});
  card("s1", "saren", "应援", 1, "otherAlly", "其他队友3护盾、1TP。", [{"type":"block","amount":3,"to":"target"},{"type":"tp","amount":1,"to":"target"}], {"name":"应援 · 专精","cost":1,"text":"其他队友5护盾、1TP。","effects":[{"type":"block","amount":5,"to":"target"},{"type":"tp","amount":1,"to":"target"}],"exhaust":false}, {"name":"应援 · 变式","cost":1,"text":"其他队友2护盾、2TP。","effects":[{"type":"block","amount":2,"to":"target"},{"type":"tp","amount":2,"to":"target"}],"exhaust":false}, ["support","guard","tp"], true, {"paperId":"s1","kind":"support","exhaust":false});
  card("s2", "saren", "筹备", 1, "none", "自身2护盾，真实顶2取1余底。", [{"type":"block","amount":2,"to":"self"},{"type":"guide","count":2}], {"name":"筹备 · 专精","cost":1,"text":"自身2护盾，真实顶4取1余底。","effects":[{"type":"block","amount":2,"to":"self"},{"type":"guide","count":4}],"exhaust":false}, {"name":"筹备 · 变式","cost":1,"text":"自身5护盾，只看顶1取1，不再二选一。","effects":[{"type":"block","amount":5,"to":"self"},{"type":"guide","count":1}],"exhaust":false}, ["support","guard","draw"], true, {"paperId":"s2","kind":"support","exhaust":false});
  card("s3", "saren", "侧援", 1, "enemy", "3点物理伤害，最低比例2护盾。", [{"type":"hit","amount":3,"damageType":"physical"},{"type":"block","amount":2,"to":"lowest"}], {"name":"侧援 · 专精","cost":1,"text":"4点物理伤害，最低比例2护盾。","effects":[{"type":"hit","amount":4,"damageType":"physical"},{"type":"block","amount":2,"to":"lowest"}],"exhaust":false}, {"name":"侧援 · 变式","cost":1,"text":"2点物理伤害，最低比例4护盾。","effects":[{"type":"hit","amount":2,"damageType":"physical"},{"type":"block","amount":4,"to":"lowest"}],"exhaust":false}, ["attack","physical","guard"], true, {"paperId":"s3","kind":"attack","exhaust":false});
  card("n1", "monika", "指挥", 1, "otherAlly", "另一队友3护盾、鼓舞3。", [{"type":"block","amount":3,"to":"target"},{"type":"buff","amount":3,"to":"target"}], {"name":"指挥 · 专精","cost":1,"text":"另一队友5护盾、鼓舞3。","effects":[{"type":"block","amount":5,"to":"target"},{"type":"buff","amount":3,"to":"target"}],"exhaust":false}, {"name":"指挥 · 变式","cost":1,"text":"另一队友2护盾、鼓舞5。","effects":[{"type":"block","amount":2,"to":"target"},{"type":"buff","amount":5,"to":"target"}],"exhaust":false}, ["support","guard","buff"], true, {"paperId":"n1","kind":"support","exhaust":false});
  card("n2", "monika", "跟进挥刀", 1, "enemy", "4点物理伤害，上一付费普通牌属别人则6。", [{"type":"hit","amount":4,"damageType":"physical","afterOtherAmount":6}], {"name":"跟进挥刀 · 专精","cost":1,"text":"5点物理伤害，上一付费普通牌属别人则7。","effects":[{"type":"hit","amount":5,"damageType":"physical","afterOtherAmount":7}],"exhaust":false}, {"name":"跟进挥刀 · 变式","cost":1,"text":"3点物理伤害，上一付费普通牌属别人则5；自身2护盾。","effects":[{"type":"hit","amount":3,"damageType":"physical","afterOtherAmount":5},{"type":"block","amount":2,"to":"self"}],"exhaust":false}, ["attack","physical"], true, {"paperId":"n2","kind":"attack","exhaust":false});
  card("n3", "monika", "整列", 1, "none", "所有存活队友2护盾。", [{"type":"block","amount":2,"to":"all"}], {"name":"整列 · 专精","cost":1,"text":"所有存活队友3护盾。","effects":[{"type":"block","amount":3,"to":"all"}],"exhaust":false}, {"name":"整列 · 变式","cost":1,"text":"所有存活队友1护盾，本人鼓舞3。","effects":[{"type":"block","amount":1,"to":"all"},{"type":"buff","amount":3,"to":"self"}],"exhaust":false}, ["support","guard"], true, {"paperId":"n3","kind":"support","exhaust":false});
  card("k4", "kaori", "踏住地面", 2, "enemy", "7点物理伤害，下次单体减3。", [{"type":"hit","amount":7,"damageType":"physical"},{"type":"weak","amount":3}], {"name":"踏住地面 · 专精","cost":2,"text":"7点物理伤害，下次单体减5。","effects":[{"type":"hit","amount":7,"damageType":"physical"},{"type":"weak","amount":5}],"exhaust":false}, {"name":"踏住地面 · 变式","cost":1,"text":"5点物理伤害，下次单体减1。","effects":[{"type":"hit","amount":5,"damageType":"physical"},{"type":"weak","amount":1}],"exhaust":false}, ["attack","physical","debuff"], false, {"paperId":"k4","kind":"attack","exhaust":false});
  card("k5", "kaori", "三连拳", 2, "enemy", "3点物理伤害×3。", [{"type":"hit","amount":3,"damageType":"physical","hits":3}], {"name":"三连拳 · 专精","cost":1,"text":"2点物理伤害×3，失去3基础总伤换少1AP。","effects":[{"type":"hit","amount":2,"damageType":"physical","hits":3}],"exhaust":false}, {"name":"三连拳 · 变式","cost":2,"text":"改为4点物理伤害×2，减少1总伤与一段受甲次数。","effects":[{"type":"hit","amount":4,"damageType":"physical","hits":2}],"exhaust":false}, ["attack","physical"], false, {"paperId":"k5","kind":"attack","exhaust":false});
  card("s4", "saren", "重新集合", 2, "otherAlly", "所有存活队友4护盾，指定另一队友1TP。", [{"type":"block","amount":4,"to":"all"},{"type":"tp","amount":1,"to":"target"}], {"name":"重新集合 · 专精","cost":2,"text":"所有存活队友6护盾，指定另一队友1TP。","effects":[{"type":"block","amount":6,"to":"all"},{"type":"tp","amount":1,"to":"target"}],"exhaust":false}, {"name":"重新集合 · 变式","cost":1,"text":"所有存活队友2护盾，指定另一队友1TP。","effects":[{"type":"block","amount":2,"to":"all"},{"type":"tp","amount":1,"to":"target"}],"exhaust":false}, ["support","guard","tp"], false, {"paperId":"s4","kind":"support","exhaust":false});
  card("s5", "saren", "点亮火种", 1, "otherAlly", "指定另一队友鼓舞4。", [{"type":"buff","amount":4,"to":"target"}], {"name":"点亮火种 · 专精","cost":1,"text":"指定另一队友鼓舞6。","effects":[{"type":"buff","amount":6,"to":"target"}],"exhaust":false}, {"name":"点亮火种 · 变式","cost":1,"text":"指定另一队友鼓舞3、3护盾。","effects":[{"type":"buff","amount":3,"to":"target"},{"type":"block","amount":3,"to":"target"}],"exhaust":false}, ["support","buff"], false, {"paperId":"s5","kind":"support","exhaust":false});
  card("n4", "monika", "侧翼守护", 1, "ally", "指定队友6护盾；上一普通牌属别人再+2。", [{"type":"block","amount":6,"to":"target","afterOtherBonus":2}], {"name":"侧翼守护 · 专精","cost":1,"text":"指定队友8护盾；上一普通牌属别人再+2。","effects":[{"type":"block","amount":8,"to":"target","afterOtherBonus":2}],"exhaust":false}, {"name":"侧翼守护 · 变式","cost":1,"text":"指定队友4护盾、鼓舞2，取消交替额外盾。","effects":[{"type":"block","amount":4,"to":"target"},{"type":"buff","amount":2,"to":"target"}],"exhaust":false}, ["support","guard"], false, {"paperId":"n4","kind":"support","exhaust":false});
  card("n5", "monika", "军刀连斩", 2, "enemy", "3点物理伤害×2，所有敌人下次单体减1。", [{"type":"hit","amount":3,"damageType":"physical","hits":2},{"type":"weak","amount":1,"all":true}], {"name":"军刀连斩 · 专精","cost":2,"text":"4点物理伤害×2，所有敌人下次单体减1。","effects":[{"type":"hit","amount":4,"damageType":"physical","hits":2},{"type":"weak","amount":1,"all":true}],"exhaust":false}, {"name":"军刀连斩 · 变式","cost":1,"text":"3点物理伤害×2，取消所有敌人减攻。","effects":[{"type":"hit","amount":3,"damageType":"physical","hits":2}],"exhaust":false}, ["attack","physical","debuff"], false, {"paperId":"n5","kind":"attack","exhaust":false});
  heroes.jun = {"id":"jun","name":"纯","hp":36,"role":"前排 · 保留余盾","color":"#8c98b4","passive":"敌方阶段结束清盾时，仅保留自身剩余护盾中的最多3点；不凭空生盾、不跨战保留。","art":"assets/encounter-cast/heroes/jun-full.svg","portrait":"assets/portraits/jun.png","mediaKey":"jun","startingCards":["j1","j2","j3"],"burst":{"name":"不动的誓约","text":"给予自身15护盾；给予其他队友4护盾。","target":"none","effects":[{"type":"block","amount":15,"to":"self"},{"type":"block","amount":4,"to":"allOther"}]}};
  heroes.nozomi = {"id":"nozomi","name":"望","hp":34,"role":"保护 · 舞台号令","color":"#df81b0","passive":"每轮首次用本人付费普通支援牌给其他队友护盾后，自身获得鼓舞2；与已有鼓舞取高，不叠加。","art":"assets/encounter-cast/heroes/nozomi-full.svg","portrait":"assets/portraits/nozomi.png","mediaKey":"nozomi","startingCards":["nz1","nz2","nz3"],"burst":{"name":"同一束光","text":"给予全队6护盾；所有敌人下一次单体攻击减2。","target":"none","effects":[{"type":"block","amount":6,"to":"all"},{"type":"weak","amount":2,"all":true}]}};
  heroes.shizuru = {"id":"shizuru","name":"静流","hp":32,"role":"保护 · 濒危救援","color":"#87a6db","passive":"每轮首次用普通牌给当前生命不高于一半的存活队友护盾时，该人额外获得2护盾；给盾时检查生命。","art":"assets/encounter-cast/heroes/shizuru-full.svg","portrait":"assets/portraits/shizuru.png","mediaKey":"shizuru","startingCards":["sz1","sz2","sz3"],"burst":{"name":"姐姐会接住你","text":"目标受到8点物理伤害；回复最低生命比例队友5生命。","target":"enemy","effects":[{"type":"hit","amount":8,"damageType":"physical"},{"type":"heal","amount":5,"to":"lowest"}]}};
  heroes.makoto = {"id":"makoto","name":"真琴","hp":28,"role":"物理 · 破甲取舍","color":"#928ac3","passive":"每轮首次由本人普通牌或必杀实际消耗敌人现有破甲后，自身获得3护盾；没有破甲不触发。","art":"assets/encounter-cast/heroes/makoto-full.svg","portrait":"assets/portraits/makoto.png","mediaKey":"makoto","startingCards":["m1","m2","m3"],"burst":{"name":"截断退路","text":"目标受到12点物理伤害；随后消耗目标破甲。","target":"enemy","effects":[{"type":"hit","amount":12,"damageType":"physical"},{"type":"consumeBreak"}]}};
  heroes.suzuna = {"id":"suzuna","name":"铃奈","hp":24,"role":"远程 · 瞄准收尾","color":"#dba9bd","passive":"每轮首次主动单体攻击满生命目标时，该牌第一段忽略最多2护甲；普通护盾照常吸收，群攻不触发。","art":"assets/encounter-cast/heroes/suzuna-full.svg","portrait":"assets/portraits/suzuna.png","mediaKey":"suzuna","startingCards":["z1","z2","z3"],"burst":{"name":"这一箭很认真","text":"目标受到14点物理伤害，无视护甲。","target":"enemyAny","effects":[{"type":"hit","amount":14,"damageType":"physical","ignoreArmor":true}]}};
  heroes.arisa = {"id":"arisa","name":"亚里莎","hp":24,"role":"远程 · 牌序射击","color":"#82b47c","passive":"每轮本人第二张普通攻击牌第一段伤害加3；同一牌内部多段不算第二张，必杀不计数。","art":"assets/encounter-cast/heroes/arisa-full.svg","portrait":"assets/portraits/arisa.png","mediaKey":"arisa","startingCards":["ar1","ar2","ar3"],"burst":{"name":"抵达的箭","text":"目标受到12点物理伤害；给予自身4护盾。","target":"enemyAny","effects":[{"type":"hit","amount":12,"damageType":"physical"},{"type":"block","amount":4,"to":"self"}]}};
  heroes.miyako = {"id":"miyako","name":"宫子","hp":32,"role":"前排 · 有限自疗","color":"#9fc6df","passive":"每轮首次在自身0护盾时，用本人的普通牌直接获得护盾，该次额外获得2护盾；必杀与队友给盾不触发。","art":"assets/encounter-cast/heroes/miyako-full.svg","portrait":"assets/portraits/miyako.png","mediaKey":"miyako","startingCards":["u1","u2","u3"],"burst":{"name":"幽灵布丁拳","text":"目标受到10点物理伤害；回复自身6生命。","target":"enemy","effects":[{"type":"hit","amount":10,"damageType":"physical"},{"type":"heal","amount":6,"to":"self"}]}};
  heroes.anna = {"id":"anna","name":"安娜","hp":24,"role":"魔法 · 生命支付","color":"#b488c5","passive":"每轮首次由本人普通牌实际支付生命费用后，所有敌人受到1魔法附伤；非主动，不吃鼓舞、不触发反伤。","art":"assets/encounter-cast/heroes/anna-full.svg","portrait":"assets/portraits/anna.png","mediaKey":"anna","startingCards":["a1","a2","a3"],"burst":{"name":"冥姬宣言","text":"所有敌人受到8点魔法伤害。","target":"allEnemies","effects":[{"type":"hit","amount":8,"damageType":"magic","all":true}]}};
  heroes.yori = {"id":"yori","name":"依里","hp":24,"role":"魔法 · 消耗爆发","color":"#b990be","passive":"每战首次打出本人的消耗牌时，先获得4护盾再结算卡牌；本战仅一次。","art":"assets/encounter-cast/heroes/yori-full.svg","portrait":"assets/portraits/yori.png","mediaKey":"yori","startingCards":["y1","y2","y3"],"burst":{"name":"终于说出口的雷光","text":"目标受到12点魔法伤害；给予最低生命比例队友4护盾。","target":"enemyAny","effects":[{"type":"hit","amount":12,"damageType":"magic"},{"type":"block","amount":4,"to":"lowest"}]}};
  heroes.kaori = {"id":"kaori","name":"香织","hp":30,"role":"物理 · 连续出拳","color":"#d7a36e","passive":"本人本轮第二张普通攻击牌若与第一张同目标，其第一段伤害加2；第三张不补触发，必杀不计数。","art":"assets/encounter-cast/heroes/kaori-full.svg","portrait":"assets/portraits/kaori.png","mediaKey":"kaori","startingCards":["k1","k2","k3"],"burst":{"name":"浪潮三击","text":"目标受到3×3点物理伤害。","target":"enemy","effects":[{"type":"hit","amount":3,"damageType":"physical","hits":3}]}};
  heroes.saren = {"id":"saren","name":"咲恋","hp":26,"role":"支援 · 指定充能","color":"#d2b971","passive":"每轮首张本人付费普通支援牌若指定另一名队友，该人额外获得1TP；必杀与无指定的群体牌不触发。","art":"assets/encounter-cast/heroes/saren-full.svg","portrait":"assets/portraits/saren.png","mediaKey":"saren","startingCards":["s1","s2","s3"],"burst":{"name":"让大家继续向前","text":"给予全队5护盾；其他存活队友各获得1TP。","target":"none","effects":[{"type":"block","amount":5,"to":"all"},{"type":"tp","amount":1,"to":"allOther"}]}};
  heroes.monika = {"id":"monika","name":"莫妮卡","hp":28,"role":"支援 · 出牌接力","color":"#a8b9d7","passive":"每轮首次相邻两张付费普通牌归属不同，后出牌者先获得3护盾；必杀与免费调度不改变普通牌顺序。","art":"assets/encounter-cast/heroes/monika-full.svg","portrait":"assets/portraits/monika.png","mediaKey":"monika","startingCards":["n1","n2","n3"],"burst":{"name":"队列向前","text":"给予全队4护盾；指定另一队友获得鼓舞5。","target":"otherAlly","effects":[{"type":"block","amount":4,"to":"all"},{"type":"buff","amount":5,"to":"target"}]}};
  relic("shield_etching", "盾纹刻盘", "每轮首次普通攻击实际消耗自身至少4护盾，整牌及反伤后本人仍活、战斗未结束时，为另一名最低生命比例队友提供至多3护盾（已耗盾除2向下取整）；不返还本人。", "shield_badge", ["guard","physical"]);
  relics.shield_etching.requires = ["spentShieldAttack"];
  relic("blood_receipt", "血费凭证", "同一角色本轮普通牌实际支付生命累计达到3，整牌及反伤后仍存活则自身获得4护盾；全队每轮一次。受伤不算支付，护盾不能支付生命。", "hex_crystal", ["payHp","guard"]);
  relics.blood_receipt.requires = ["payHp"];
  relic("concert_ribbon", "合拍缎带", "三名存活队员本轮各出过普通牌，预约下轮开始当前前排获得2护盾；每轮一次，不跨战、不产TP。", "battle_horn", ["support","guard"]);
  relics.concert_ribbon.requires = ["threeNormalOwners"];
  relic("crooked_compass", "歪针罗盘", "沿用每战一次免费调度：先指定角色，从她的实际抽牌堆随机展示至多2张，选择1张换入；未选牌留原序，旧牌沉底。不增加手牌、AP、TP或调度次数，两张可能同种。", "tactical_notes", ["draw"]);
  relics.crooked_compass.requires = ["redraw"];
  relic("spent_fuse", "余火引线", "本战前两张真正消耗的普通牌，在卡牌及反伤后本人仍活、战斗未结束时，对当前最低生命存活敌人造成3魔法附伤；同分靠前。不是主动攻击，不吃主动加成。", "barrier_prism", ["magic","exhaust"]);
  relics.spent_fuse.requires = ["exhaustCard"];
  relic("last_ember_locket", "余烬命锁", "每战全队首次承受敌方主动致命伤害段时，留1生命并清空该人TP；不防自付生命、毒、反伤，不复活。连击后续段仍可击倒。", "regen_seed", ["guard","tp"]);
  relics.last_ember_locket.requires = [];
  events.push({"id":"travelling_smith","name":"幻影练习场","acts":[1,2,3],"text":"自己的幻影重演着刚才的失误。可以请引导者安全练习，也能由练习者亲自承受代价，只精进她自己的招式；或者将沿途记录换成路费。","choices":[{"label":"安全练习一招","effect":"upgrade","cost":28,"description":"支付28金币；选择一张未升级实体及A/B分支。"},{"label":"亲自承受训练","effect":"upgrade","cost":10,"hpCost":{"scope":"upgradeOwner","amount":4},"description":"支付10金币；升级牌本人支付4生命，支付后至少剩1；选择一张未升级实体及A/B分支。"},{"label":"出售沿途记录","effect":"gold","amount":8,"description":"获得8金币。"},{"label":"离开","effect":"gold","amount":0,"description":"本次离开。"}]});
  events.push({"id":"field_infirmary","name":"临时救护所","acts":[1,2,3],"text":"药包足够处理全队轻伤，但医师不会免费提供。","choices":[{"label":"购买全队包扎","effect":"heal","amount":6,"cost":22,"description":"支付22金币；所有存活队友各回复6生命。"},{"label":"离开","effect":"gold","amount":0,"description":"本次离开。"}]});
  events.push({"id":"pack_broker","name":"行囊收购台","acts":[1,2,3],"text":"整理师可以帮你舍弃一张牌；也有人愿意收购不影响战斗的杂物。","choices":[{"label":"整理一张实体牌","effect":"remove","cost":15,"description":"支付15金币；移除一个实体，牌组最低12张。"},{"label":"保留战术工具，出售杂物","effect":"gold","amount":10,"description":"获得10金币。"},{"label":"离开","effect":"gold","amount":0,"description":"本次离开。"}]});
  events.push({"id":"damaged_reliquary","name":"裂纹遗物匣","acts":[2,3],"text":"完整修复要付高价；也可以由一位队员承受修复时的反震。报酬内容在付款后展示。","choices":[{"label":"完整修复","effect":"relic","cost":40,"description":"支付40金币；付款后从实际可得遗物三选一。"},{"label":"承担修复反震","effect":"relic","cost":15,"hpCost":{"scope":"one","amount":4},"description":"支付15金币；指定一名存活者支付4生命，支付后至少剩1；付款后从实际可得遗物三选一。"},{"label":"离开","effect":"gold","amount":0,"description":"本次离开。"}]});
  events.push({"id":"night_watch_job","name":"夜间值守","acts":[1,2,3],"text":"三人共同值守才能获得全额报酬，不能让一位队友替全队承担疲劳。","choices":[{"label":"三人共同值守","effect":"gold","amount":28,"hpCost":{"scope":"party","amount":3},"description":"三人各支付3生命，支付后至少剩1；获得28金币。"},{"label":"离开","effect":"gold","amount":0,"description":"本次离开。"}]});
  events.push({"id":"old_travel_notes","name":"旧旅行札","acts":[1,2,3],"text":"你可以付费学习一项队伍专属技巧，也能出售这些零散记述。学习后仍可放弃领牌，学费不退。","choices":[{"label":"购买一次学习机会","effect":"draft","cost":12,"description":"支付12金币；付款后从本队奖励牌三选一；跳过仅拿原8金币，学费不退。"},{"label":"出售零散记述","effect":"gold","amount":6,"description":"获得6金币。"},{"label":"离开","effect":"gold","amount":0,"description":"本次离开。"}]});
  events.push({"id":"side_path_spring","name":"支路泉眼","acts":[1,2,3],"text":"现在绕路补给，全队各回6HP；会耗去本幕后续免费营地的时间。该幕仍能自费购物，也能直接离开商店。","choices":[{"label":"现在绕路补给","effect":"heal","amount":6,"campAdvance":true,"description":"所有存活队友各回复6生命。预支本幕免费营地，之后仍可自费购物。"},{"label":"离开","effect":"gold","amount":0,"description":"本次离开。"}],"eligibility":{"livingHpRatioAtMost":0.5,"requiresUnusedCamp":true,"requiresActualHealing":true}});
  encounters.paper_fubuki = {"id":"paper_fubuki","name":"幻影试炼 · 布武机","act":1,"type":"boss","bossId":"fubuki","mediaKey":"fubuki","description":"布武机独自迎战。前排4伤、后排2伤连射2次、全队各2伤、获得4护盾，按四轮循环。减攻只减连射第一次命中，准备轮可蓄势或整理手牌。","enemies":[{"id":"fubuki","name":"布武机的幻影","hp":44,"position":"front","icon":"♛","color":"#8aa8d0","cycle":[{"name":"精密射击","type":"attack","amount":4,"target":"front"},{"name":"武装连射：后排2×2","type":"attack","amount":2,"target":"back","hits":2},{"name":"武装齐射：全队2","type":"aoe","amount":2},{"name":"过热整理：4护盾","type":"guard","amount":4}],"armor":0,"barrier":0,"bossCore":true,"role":"core","mediaKey":"fubuki","art":"assets/encounter-cast/fubuki-full.svg"}],"fatigue":{"startRound":7,"every":3,"amount":2}};
  encounters.paper_yamato = {"id":"paper_yamato","name":"幻影试炼 · 倭","act":1,"type":"boss","bossId":"yamato","mediaKey":"yamato","description":"第二轮先消耗实际承伤者至多2护盾，再单击5；无盾不加伤。第四轮攻击前两名存活者，不吃单体减攻或代承。","enemies":[{"id":"yamato","name":"倭的幻影","hp":54,"position":"front","icon":"♛","color":"#c98785","cycle":[{"name":"豪快挥击","type":"attack","amount":5,"target":"front"},{"name":"豪快重砸：先耗至多2护盾再5伤","type":"attack","amount":5,"target":"front","stripBlock":2},{"name":"稳住脚步：4护盾","type":"guard","amount":4},{"name":"前方横扫：前两人各3","type":"aoe","amount":3,"frontCount":2}],"armor":1,"barrier":0,"bossCore":true,"role":"core","mediaKey":"yamato","art":"assets/encounter-cast/yamato-full.svg"}],"fatigue":{"startRound":7,"every":3,"amount":2}};
  encounters.paper_ranpha = {"id":"paper_ranpha","name":"幻影试炼 · 兰法","act":2,"type":"boss","bossId":"ranpha","mediaKey":"ranpha","description":"兰法独自迎战。咏唱让下一轮首张普通攻击主伤减2；之后全队各2伤、后排6伤并挂一次下轮腐毒2、获得4护盾。腐毒可用护盾吸收或净化，必杀不受咏唱影响。","enemies":[{"id":"ranpha","name":"兰法的幻影","hp":58,"position":"back","icon":"♛","color":"#b08acc","cycle":[{"name":"咏唱：下一轮首张普通攻击主伤减2","type":"chant","amount":2},{"name":"幽声共鸣","type":"aoe","amount":2},{"name":"回响魔弹：后排6并挂下轮腐毒2","type":"attack","amount":6,"target":"back","poison":2},{"name":"静听：4护盾","type":"guard","amount":4}],"armor":0,"barrier":4,"bossCore":true,"role":"core","mediaKey":"ranpha","art":"assets/media/bosses/ranpha/poster.jpg"}],"fatigue":{"startRound":7,"every":3,"amount":2}};
  encounters.paper_misora = {"id":"paper_misora","name":"幻影试炼 · 美空","act":2,"type":"boss","bossId":"misora","mediaKey":"misora","description":"美空独自迎战。后排2伤连射2次、获得4护盾、后排2伤连射3次、追击生命比例最低者6伤。减攻只挡连击第一次命中；装填轮可准备护盾、指路和TP。","enemies":[{"id":"misora","name":"美空的幻影","hp":60,"position":"back","icon":"♛","color":"#dd8ab5","cycle":[{"name":"试探弹幕：后排2×2","type":"attack","amount":2,"target":"back","hits":2},{"name":"装填：4护盾","type":"guard","amount":4},{"name":"加特林齐射：后排2×3","type":"attack","amount":2,"target":"back","hits":3},{"name":"瞄准伤者","type":"attack","amount":6,"target":"lowest"}],"armor":0,"barrier":0,"bossCore":true,"role":"core","mediaKey":"misora","art":"assets/media/bosses/misora/poster.jpg"}],"fatigue":{"startRound":7,"every":3,"amount":2}};
  encounters.paper_kaiser = {"id":"paper_kaiser","name":"幻影试炼 · 霸瞳皇帝","act":3,"type":"boss","bossId":"kaiser","mediaKey":"kaiser","description":"前排重击、全队压力、准备轮与后排连击四轮循环；第七轮起公开疲劳。第三轮只获得6护盾，不附带攻击。","enemies":[{"id":"kaiser","name":"霸瞳皇帝的幻影","hp":68,"position":"front","icon":"♛","color":"#c6a15f","cycle":[{"name":"王权重斩","type":"attack","amount":9,"target":"front"},{"name":"王权震荡","type":"aoe","amount":4},{"name":"俯瞰高塔：6护盾","type":"guard","amount":6},{"name":"两重裁决：后排4×2","type":"attack","amount":4,"target":"back","hits":2}],"armor":1,"barrier":6,"bossCore":true,"role":"core","mediaKey":"kaiser","art":"assets/media/bosses/kaiser/poster.jpg"}],"fatigue":{"startRound":7,"every":3,"amount":2}};
  encounters.paper_christina = {
    id: 'paper_christina', name: '幻影试炼 · 克莉丝提娜', act: 1, type: 'boss', bossId: 'christina', mediaKey: 'christina',
    description: '克莉丝提娜独自迎战。后排4伤、前排7伤、全队各4伤、获得4护盾，按四轮循环。重斩用减攻或护盾应对，第三轮准备全队保护。',
    enemies: [
      enemy('christina', '克莉丝提娜的幻影', 50, 'front', '♛', '#b78a65', [attack('远击：后排4', 4, 'back'), attack('不败重斩：前排7', 7), aoe('封印解放：全队4', 4), guard('整顿架势：4护盾', { amount: 4 })], { armor: 1, barrier: 0, bossCore: true, role: 'core', mediaKey: 'christina', art: 'assets/encounter-cast/christina-full.svg' })
    ], fatigue: { startRound: 7, every: 3, amount: 2 }
  };
  acts.forEach(function (act, index) { act.legacyBoss = act.boss; act.bosses = [["paper_fubuki","paper_christina"],["paper_ranpha","paper_misora"],["paper_kaiser"]][index]; act.boss = act.bosses[0]; });
  teams.push({"name":"重装与猎手","ids":["jun","makoto","suzuna"],"text":"纯保留少量余盾，真琴决定消费或保留破甲，铃奈用远程射击处理后排。没有常驻治疗，要靠路线补给。"});
  teams.push({"name":"冥火与雷光","ids":["miyako","anna","yori"],"text":"宫子自保，安娜支付真实生命换爆发，依里择时使用消耗雷霆；有限治疗、护盾与补给共同维持续航。"});
  teams.push({"name":"三人接力","ids":["kaori","saren","monika"],"text":"香织用本人第二张同目标攻击兑现连拳，咲恋选择充能对象，莫妮卡奖励交替出牌。调整顺序也可能错过清场。"});
  teams.push({"name":"聚光与长矢","ids":["nozomi","makoto","arisa"],"text":"望提供分散保护和单次代承，真琴建立破甲窗口，亚里莎用真实牌顶选择与本人第二张攻击推进。"});
  teams.push({"name":"守望与祈愿","ids":["shizuru","anna","yui"],"text":"静流按给盾时的半血条件保护，优衣用有限消耗治疗修复，安娜承担生命费用；续航足但不要拖入疲劳。"});
  var release = {"schemaVersion":3,"heroCount":18,"cardCount":90,"relicCount":21,"eventCount":13,"bossPools":[["paper_fubuki","paper_christina"],["paper_ranpha","paper_misora"],["paper_kaiser"]],"designSources":["design/release-18-heroes-draft.md","design/release-upgrade-branches-v1.md","design/launch-scope-five-bosses.md","design/relic-events-round5-conclusions.md"]};
  // RELEASE_V3_CONTENT_END

  // READABLE_COPY_V31_START: display strings only. Effects, values and assets stay separate.
  var readableCards = {"pecorine_slash":{"text":"对选定的敌人造成4点物理伤害。\n若战斗仍在继续，佩可获得4点本轮护盾。","A":"对选定的敌人造成4点物理伤害。\n若战斗仍在继续，佩可获得6点本轮护盾。","B":"对选定的敌人造成7点物理伤害。\n若战斗仍在继续，佩可获得2点本轮护盾。"},"pecorine_cover":{"text":"佩可获得5点本轮护盾。\n本轮由佩可替选定的另一名队员接下下一次单体攻击；连击只接第一次命中。","A":"佩可获得8点本轮护盾。\n本轮由佩可替选定的另一名队员接下下一次单体攻击；连击只接第一次命中。","B":"佩可获得5点本轮护盾。\n佩可获得本轮鼓舞：下一次单体攻击加2伤害，连击只加在第一次命中；群攻和附加伤害不加成。\n本轮由佩可替选定的另一名队员接下下一次单体攻击；连击只接第一次命中。"},"pecorine_heavy":{"text":"对选定的敌人造成10点物理伤害。可消耗佩可的护盾强化：每2点护盾加1点伤害，最多消耗6点。","A":"对选定的敌人造成6点物理伤害。\n若战斗仍在继续，佩可获得3点本轮护盾。","B":"对选定的敌人造成10点物理伤害。可消耗佩可的护盾强化：每2点护盾加2点伤害，最多消耗12点。"},"pecorine_hold":{"text":"每名存活队员获得5点本轮护盾。\n生命比例最低的队员获得2点本轮护盾。","A":"每名存活队员获得7点本轮护盾。","B":"每名存活队员获得3点本轮护盾。"},"pecorine_sweep":{"text":"对所有敌人造成4点物理伤害。\n若战斗仍在继续，佩可获得3点本轮护盾。","A":"对所有敌人造成4点物理伤害。\n若战斗仍在继续，佩可获得6点本轮护盾。","B":"对所有敌人造成8点物理伤害。"},"rei_slash":{"text":"对选定的敌人造成6点物理伤害。","A":"对选定的敌人造成8点物理伤害。","B":"对选定的敌人连击2次，每次造成3点物理伤害。"},"rei_break":{"text":"对选定的敌人造成3点物理伤害。\n若战斗仍在继续，给选定的敌人施加破甲2：后续每次物理命中加2伤害，本轮有效。","A":"对选定的敌人造成3点物理伤害。\n若战斗仍在继续，给选定的敌人施加破甲2：后续每次物理命中加2伤害，持续2轮（含本轮）。","B":"对选定的敌人造成3点物理伤害。\n若战斗仍在继续，给选定的敌人施加破甲4：后续每次物理命中加4伤害，本轮有效。"},"rei_feint":{"text":"对选定的敌人造成4点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成3点伤害；连击只减少第一次命中，群攻不受影响。","A":"对选定的敌人造成4点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成5点伤害；连击只减少第一次命中，群攻不受影响。","B":"对选定的敌人造成7点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成2点伤害；连击只减少第一次命中，群攻不受影响。"},"rei_dance":{"text":"对选定的敌人连击3次，每次造成3点物理伤害。","A":"对选定的敌人连击2次，每次造成5点物理伤害。","B":"对选定的敌人连击4次，每次造成4点物理伤害。"},"rei_disarm":{"text":"对选定的敌人造成2点物理伤害。\n若战斗仍在继续，所有敌人本轮下一次单体攻击少造成2点伤害；连击只减少第一次命中，群攻不受影响。","A":"对选定的敌人造成2点物理伤害。\n若战斗仍在继续，所有敌人本轮下一次单体攻击少造成3点伤害；连击只减少第一次命中，群攻不受影响。","B":"对选定的敌人造成5点物理伤害。\n若战斗仍在继续，所有敌人本轮下一次单体攻击少造成4点伤害；连击只减少第一次命中，群攻不受影响。"},"kokkoro_buff":{"text":"选定的队员获得本轮鼓舞：下一次单体攻击加5伤害，连击只加在第一次命中；群攻和附加伤害不加成。","A":"选定的队员获得本轮鼓舞：下一次单体攻击加7伤害，连击只加在第一次命中；群攻和附加伤害不加成。","B":"选定的队员获得本轮鼓舞：下一次单体攻击加4伤害，连击只加在第一次命中；群攻和附加伤害不加成。\n选定的队员获得4点本轮护盾。"},"kokkoro_guide":{"text":"查看抽牌堆顶3张，选1张加入手牌；其余按展示顺序放到牌堆底。","A":"查看抽牌堆顶5张，选1张加入手牌；其余按展示顺序放到牌堆底。","B":"生命比例最低的队员获得3点本轮护盾。\n查看抽牌堆顶3张，选1张加入手牌；其余按展示顺序放到牌堆底。"},"kokkoro_ward":{"text":"每名存活队员获得5点本轮护盾。\n移除选定的队员的1种负面状态。","A":"每名存活队员获得7点本轮护盾。\n移除选定的队员的1种负面状态。","B":"每名存活队员获得3点本轮护盾。\n移除选定的队员的1种负面状态。"},"kokkoro_relay":{"text":"选定的队员获得2TP（必杀能量，上限6）。\n选定的队员获得2点本轮护盾。","A":"选定的队员获得3TP（必杀能量，上限6）。\n选定的队员获得2点本轮护盾。","B":"每名存活队员获得2TP（必杀能量，上限6）。\n每名存活队员获得3点本轮护盾。"},"kokkoro_shelter":{"text":"选定的队员获得5点本轮护盾。\n移除选定的队员的1种负面状态。","A":"选定的队员获得7点本轮护盾。\n移除选定的队员的1种负面状态。","B":"选定的队员获得4点本轮护盾。\n移除选定的队员的2种负面状态。\n抽1张牌。"},"kyaru_curse":{"text":"对选定的敌人造成3点魔法伤害，可选择后排。\n若战斗仍在继续，给选定的敌人留下2轮咒痕（含本轮）：每轮第一次被卡牌或必杀击中时，额外受到2点伤害。","A":"对选定的敌人造成3点魔法伤害，可选择后排。\n若战斗仍在继续，给选定的敌人留下3轮咒痕（含本轮）：每轮第一次被卡牌或必杀击中时，额外受到2点伤害。","B":"对选定的敌人造成5点魔法伤害，可选择后排。\n若战斗仍在继续，给选定的敌人留下1轮咒痕（含本轮）：每轮第一次被卡牌或必杀击中时，额外受到2点伤害。"},"kyaru_dispel":{"text":"对选定的敌人造成4点魔法伤害，可选择后排。\n若战斗仍在继续，驱散目标1种增益，优先清空剩余魔法屏障。","A":"对选定的敌人造成4点魔法伤害，可选择后排。\n若战斗仍在继续，驱散目标2种增益，优先清空剩余魔法屏障。","B":"对选定的敌人造成6点魔法伤害，可选择后排。\n若战斗仍在继续，驱散目标1种增益，优先清空剩余魔法屏障。"},"kyaru_consume":{"text":"对选定的敌人造成9点魔法伤害，可选择后排。可选择引爆已有咒痕，让伤害再加5点并清除咒痕；也可保留。咒痕本轮尚未触发时，另加2点伤害。","A":"对选定的敌人造成9点魔法伤害，可选择后排。若目标已有咒痕，保留它并延长1轮。咒痕本轮尚未触发时，另加2点伤害。","B":"对选定的敌人造成9点魔法伤害，可选择后排。可选择引爆已有咒痕，让伤害再加8点并清除咒痕；也可保留。咒痕本轮尚未触发时，另加2点伤害。"},"kyaru_spread":{"text":"对所有敌人造成2点魔法伤害。\n若战斗仍在继续，给所有敌人留下2轮咒痕（含本轮）：每轮第一次被卡牌或必杀击中时，额外受到2点伤害。","A":"对所有敌人造成3点魔法伤害。\n若战斗仍在继续，给所有敌人留下3轮咒痕（含本轮）：每轮第一次被卡牌或必杀击中时，额外受到2点伤害。","B":"对所有敌人造成1点魔法伤害。\n若战斗仍在继续，给所有敌人留下1轮咒痕（含本轮）：每轮第一次被卡牌或必杀击中时，额外受到2点伤害。"},"kyaru_seal":{"text":"对选定的敌人造成2点魔法伤害，可选择后排。\n若战斗仍在继续，所有敌人本轮下一次单体攻击少造成2点伤害；连击只减少第一次命中，群攻不受影响。","A":"对选定的敌人造成2点魔法伤害，可选择后排。\n若战斗仍在继续，所有敌人本轮下一次单体攻击少造成3点伤害；连击只减少第一次命中，群攻不受影响。","B":"对选定的敌人造成8点魔法伤害，可选择后排。\n若战斗仍在继续，驱散目标1种增益，优先清空剩余魔法屏障。"},"hatsune_rain":{"text":"对所有敌人造成1点魔法伤害。\n若战斗仍在继续，给所有敌人添加1层星痕，最多3层；回合结束时每层造成1点魔法伤害，然后减少1层。","A":"给所有敌人添加2层星痕，最多3层；回合结束时每层造成1点魔法伤害，然后减少1层。","B":"对所有敌人造成3点魔法伤害。\n若战斗仍在继续，给所有敌人添加1层星痕，最多3层；回合结束时每层造成1点魔法伤害，然后减少1层。"},"hatsune_mark":{"text":"给选定的敌人添加2层星痕，最多3层；回合结束时每层造成1点魔法伤害，然后减少1层。\n选定的敌人本轮下一次单体攻击少造成2点伤害；连击只减少第一次命中，群攻不受影响。","A":"给选定的敌人添加2层星痕，最多3层；回合结束时每层造成1点魔法伤害，然后减少1层。\n选定的敌人本轮下一次单体攻击少造成4点伤害；连击只减少第一次命中，群攻不受影响。","B":"给选定的敌人添加3层星痕，最多3层；回合结束时每层造成1点魔法伤害，然后减少1层。\n选定的敌人本轮下一次单体攻击少造成1点伤害；连击只减少第一次命中，群攻不受影响。"},"hatsune_meteor":{"text":"对选定的敌人造成5点魔法伤害，可选择后排。\n若战斗仍在继续，立刻追加一次全体敌人的星痕伤害：每层1点魔法伤害；随后保留现有层数。","A":"对选定的敌人造成2点魔法伤害，可选择后排。\n若战斗仍在继续，立刻追加一次目标的星痕伤害：每层1点魔法伤害；随后保留现有层数。","B":"对选定的敌人造成5点魔法伤害，可选择后排。\n若战斗仍在继续，立刻追加一次全体敌人的星痕伤害：每层2点魔法伤害；随后清空星痕。"},"hatsune_orbit":{"text":"给所有敌人添加1层星痕，最多3层；回合结束时每层造成1点魔法伤害，然后减少1层。\n生命比例最低的队员获得2点本轮护盾。","A":"给所有敌人添加1层星痕，最多3层；回合结束时每层造成1点魔法伤害，然后减少1层。\n生命比例最低的队员获得5点本轮护盾。","B":"给所有敌人添加2层星痕，最多3层；回合结束时每层造成1点魔法伤害，然后减少1层。\n生命比例最低的队员获得3点本轮护盾。"},"hatsune_comet":{"text":"对所有敌人造成3点魔法伤害。\n若战斗仍在继续，所有敌人本轮下一次单体攻击少造成1点伤害；连击只减少第一次命中，群攻不受影响。","A":"对所有敌人造成4点魔法伤害。\n若战斗仍在继续，所有敌人本轮下一次单体攻击少造成2点伤害；连击只减少第一次命中，群攻不受影响。","B":"对所有敌人造成7点魔法伤害。\n若战斗仍在继续，给所有敌人添加1层星痕，最多3层；回合结束时每层造成1点魔法伤害，然后减少1层。"},"yui_heal":{"text":"选定的队员回复5点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。","A":"选定的队员回复8点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。","B":"选定的队员回复4点生命，不能超过生命上限。\n选定的队员获得4点本轮护盾。\n消耗：打出后，本场战斗不再抽到这张牌。"},"yui_cleanse":{"text":"移除选定的队员的1种负面状态。\n选定的队员获得3点本轮护盾。","A":"移除选定的队员的2种负面状态。\n选定的队员获得5点本轮护盾。","B":"移除每名存活队员的1种负面状态。\n每名存活队员获得4点本轮护盾。"},"yui_light":{"text":"对选定的敌人造成3点魔法伤害，可选择后排。\n若战斗仍在继续，生命比例最低的队员获得2点本轮护盾。","A":"对选定的敌人造成4点魔法伤害，可选择后排。\n若战斗仍在继续，生命比例最低的队员获得4点本轮护盾。","B":"对所有敌人造成3点魔法伤害。\n若战斗仍在继续，每名存活队员获得2点本轮护盾。"},"yui_prayer":{"text":"每名存活队员回复3点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。","A":"每名存活队员回复5点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。","B":"每名存活队员回复2点生命，不能超过生命上限。\n移除每名存活队员的1种负面状态。\n消耗：打出后，本场战斗不再抽到这张牌。"},"yui_banish":{"text":"对选定的敌人造成7点魔法伤害，可选择后排。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成2点伤害；连击只减少第一次命中，群攻不受影响。","A":"对选定的敌人造成5点魔法伤害，可选择后排。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成2点伤害；连击只减少第一次命中，群攻不受影响。","B":"对选定的敌人造成10点魔法伤害，可选择后排。\n若战斗仍在继续，驱散目标1种增益，优先清空剩余魔法屏障。"},"j1":{"text":"对选定的敌人造成3点物理伤害。\n若战斗仍在继续，纯获得3点本轮护盾。","A":"对选定的敌人造成3点物理伤害。\n若战斗仍在继续，纯获得5点本轮护盾。","B":"对选定的敌人造成6点物理伤害。\n若战斗仍在继续，纯获得1点本轮护盾。"},"j2":{"text":"纯获得7点本轮护盾。","A":"纯获得10点本轮护盾。","B":"纯获得6点本轮护盾。\n移除纯的1种负面状态。"},"j3":{"text":"纯获得12点本轮护盾。\n其他人中生命比例最低的队员获得3点本轮护盾。","A":"纯获得14点本轮护盾。\n其他人中生命比例最低的队员获得5点本轮护盾。","B":"纯获得6点本轮护盾。\n其他人中生命比例最低的队员获得2点本轮护盾。"},"j4":{"text":"对选定的敌人造成8点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成3点伤害；连击只减少第一次命中，群攻不受影响。","A":"对选定的敌人造成10点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成4点伤害；连击只减少第一次命中，群攻不受影响。","B":"对选定的敌人造成5点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成2点伤害；连击只减少第一次命中，群攻不受影响。"},"j5":{"text":"纯获得4点本轮护盾。\n本轮由纯替选定的另一名队员接下下一次单体攻击；连击只接第一次命中。","A":"纯获得7点本轮护盾。\n本轮由纯替选定的另一名队员接下下一次单体攻击；连击只接第一次命中。","B":"纯获得4点本轮护盾。\n本轮由纯替选定的另一名队员接下下一次单体攻击；连击只接第一次命中。\n移除选定的队员的1种负面状态。"},"nz1":{"text":"每名存活队员获得2点本轮护盾。","A":"每名存活队员获得3点本轮护盾。","B":"每名存活队员获得1点本轮护盾。\n这张牌触发望的被动时，鼓舞加成由2提高到4。"},"nz2":{"text":"对选定的敌人造成4点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成2点伤害；连击只减少第一次命中，群攻不受影响。","A":"对选定的敌人造成4点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成4点伤害；连击只减少第一次命中，群攻不受影响。","B":"对选定的敌人造成7点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成1点伤害；连击只减少第一次命中，群攻不受影响。"},"nz3":{"text":"望获得10点本轮护盾。\n本轮由望替选定的另一名队员接下下一次单体攻击；连击只接第一次命中。","A":"望获得14点本轮护盾。\n本轮由望替选定的另一名队员接下下一次单体攻击；连击只接第一次命中。","B":"望获得6点本轮护盾。\n本轮由望替选定的另一名队员接下下一次单体攻击；连击只接第一次命中。"},"nz4":{"text":"选定的队员获得5点本轮护盾。\n移除选定的队员的1种负面状态。","A":"选定的队员获得7点本轮护盾。\n移除选定的队员的1种负面状态。","B":"选定的队员获得4点本轮护盾。\n移除选定的队员的2种负面状态。"},"nz5":{"text":"对选定的敌人造成9点物理伤害。\n若战斗仍在继续，生命比例最低的队员获得2点本轮护盾。","A":"对选定的敌人造成11点物理伤害。\n若战斗仍在继续，生命比例最低的队员获得3点本轮护盾。","B":"对选定的敌人造成5点物理伤害。\n若战斗仍在继续，生命比例最低的队员获得2点本轮护盾。"},"sz1":{"text":"对选定的敌人造成4点物理伤害。\n若战斗仍在继续，静流获得2点本轮护盾。","A":"对选定的敌人造成4点物理伤害。\n若战斗仍在继续，静流获得4点本轮护盾。","B":"对选定的敌人造成7点物理伤害。"},"sz2":{"text":"选定的队员获得5点本轮护盾。给盾时若她的生命不超过一半，再多给2点。","A":"选定的队员获得7点本轮护盾。给盾时若她的生命不超过一半，再多给2点。","B":"选定的队员获得4点本轮护盾。\n移除选定的队员的2种负面状态。"},"sz3":{"text":"选定的队员回复6点生命，不能超过生命上限。\n选定的队员获得2点本轮护盾。\n消耗：打出后，本场战斗不再抽到这张牌。","A":"选定的队员回复9点生命，不能超过生命上限。\n选定的队员获得2点本轮护盾。\n消耗：打出后，本场战斗不再抽到这张牌。","B":"选定的队员回复4点生命，不能超过生命上限。\n选定的队员获得1点本轮护盾。\n消耗：打出后，本场战斗不再抽到这张牌。"},"sz4":{"text":"每名存活队员获得3点本轮护盾。","A":"每名存活队员获得4点本轮护盾。","B":"每名存活队员获得2点本轮护盾。\n移除每名存活队员的1种负面状态。"},"sz5":{"text":"对选定的敌人造成8点物理伤害。\n若战斗仍在继续，生命比例最低的队员回复2点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。","A":"对选定的敌人造成10点物理伤害。\n若战斗仍在继续，生命比例最低的队员回复4点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。","B":"对选定的敌人造成5点物理伤害。\n若战斗仍在继续，生命比例最低的队员回复2点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。"},"m1":{"text":"对选定的敌人造成2点物理伤害。\n若战斗仍在继续，给选定的敌人施加破甲3：后续每次物理命中加3伤害，本轮有效。","A":"对选定的敌人造成2点物理伤害。\n若战斗仍在继续，给选定的敌人施加破甲4：后续每次物理命中加4伤害，本轮有效。","B":"对选定的敌人造成2点物理伤害。\n若战斗仍在继续，给选定的敌人施加破甲2：后续每次物理命中加2伤害，持续2轮（含本轮）。"},"m2":{"text":"对选定的敌人造成5点物理伤害。\n若战斗仍在继续，随后清除目标身上的全部破甲；之后的物理攻击不再享受它。","A":"对选定的敌人造成4点物理伤害。","B":"对选定的敌人造成7点物理伤害。\n若战斗仍在继续，随后清除目标身上的全部破甲；之后的物理攻击不再享受它。"},"m3":{"text":"对选定的敌人造成10点物理伤害。\n若战斗仍在继续，随后清除目标身上的全部破甲；之后的物理攻击不再享受它。","A":"对选定的敌人造成13点物理伤害。\n若战斗仍在继续，随后清除目标身上的全部破甲；之后的物理攻击不再享受它。","B":"对选定的敌人造成6点物理伤害。\n若战斗仍在继续，随后清除目标身上的全部破甲；之后的物理攻击不再享受它。"},"m4":{"text":"对选定的敌人造成2点物理伤害。\n若战斗仍在继续，给选定的敌人施加破甲2：后续每次物理命中加2伤害，持续2轮（含本轮）。","A":"对选定的敌人造成3点物理伤害。\n若战斗仍在继续，给选定的敌人施加破甲3：后续每次物理命中加3伤害，持续2轮（含本轮）。","B":"对选定的敌人造成4点物理伤害。\n若战斗仍在继续，给选定的敌人施加破甲3：后续每次物理命中加3伤害，本轮有效。"},"m5":{"text":"对选定的敌人造成3点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成3点伤害；连击只减少第一次命中，群攻不受影响。","A":"对选定的敌人造成3点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成5点伤害；连击只减少第一次命中，群攻不受影响。","B":"对选定的敌人造成6点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成2点伤害；连击只减少第一次命中，群攻不受影响。"},"z1":{"text":"对选定的敌人造成5点物理伤害，可选择后排。","A":"对选定的敌人造成7点物理伤害，可选择后排。","B":"对选定的敌人造成4点物理伤害，可选择后排。\n若战斗仍在继续，铃奈获得2点本轮护盾。"},"z2":{"text":"铃奈获得本轮鼓舞：下一次单体攻击加5伤害，连击只加在第一次命中；群攻和附加伤害不加成。","A":"铃奈获得本轮鼓舞：下一次单体攻击加7伤害，连击只加在第一次命中；群攻和附加伤害不加成。","B":"铃奈获得本轮鼓舞：下一次单体攻击加3伤害，连击只加在第一次命中；群攻和附加伤害不加成。\n铃奈获得4点本轮护盾。"},"z3":{"text":"对选定的敌人造成10点物理伤害，可选择后排。若目标生命不超过一半，伤害改为13点。","A":"对选定的敌人造成12点物理伤害，可选择后排。若目标生命不超过一半，伤害改为16点。","B":"对选定的敌人造成6点物理伤害，可选择后排。若目标生命不超过一半，伤害改为8点。"},"z4":{"text":"对选定的敌人造成3点物理伤害，可选择后排。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成2点伤害；连击只减少第一次命中，群攻不受影响。","A":"对选定的敌人造成5点物理伤害，可选择后排。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成3点伤害；连击只减少第一次命中，群攻不受影响。","B":"对选定的敌人造成3点物理伤害，可选择后排。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成4点伤害；连击只减少第一次命中，群攻不受影响。"},"z5":{"text":"对所有敌人造成4点物理伤害。","A":"对所有敌人造成6点物理伤害。","B":"对所有敌人造成2点物理伤害。"},"ar1":{"text":"对选定的敌人造成4点物理伤害，可选择后排。","A":"对选定的敌人造成6点物理伤害，可选择后排。","B":"对选定的敌人造成3点物理伤害，可选择后排。\n若战斗仍在继续，亚里莎获得3点本轮护盾。"},"ar2":{"text":"对选定的敌人连击2次，每次造成3点物理伤害，可选择后排。","A":"对选定的敌人连击2次，每次造成4点物理伤害，可选择后排。","B":"对选定的敌人造成4点物理伤害，可选择后排。"},"ar3":{"text":"亚里莎获得2点本轮护盾。\n查看抽牌堆顶2张，选1张加入手牌；其余按展示顺序放到牌堆底。","A":"亚里莎获得2点本轮护盾。\n查看抽牌堆顶4张，选1张加入手牌；其余按展示顺序放到牌堆底。","B":"亚里莎获得5点本轮护盾。\n查看抽牌堆顶2张，选1张加入手牌；其余按展示顺序放到牌堆底。"},"ar4":{"text":"对选定的敌人造成3点物理伤害，可选择后排。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成2点伤害；连击只减少第一次命中，群攻不受影响。","A":"对选定的敌人造成5点物理伤害，可选择后排。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成3点伤害；连击只减少第一次命中，群攻不受影响。","B":"对选定的敌人造成3点物理伤害，可选择后排。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成4点伤害；连击只减少第一次命中，群攻不受影响。"},"ar5":{"text":"对选定的敌人造成8点物理伤害，可选择后排。本轮若已用卡牌额外拿过牌，再加3点伤害；开轮抽牌和免费调度不算。","A":"对选定的敌人造成10点物理伤害，可选择后排。本轮若已用卡牌额外拿过牌，再加4点伤害；开轮抽牌和免费调度不算。","B":"对选定的敌人造成5点物理伤害，可选择后排。本轮若已用卡牌额外拿过牌，再加2点伤害；开轮抽牌和免费调度不算。"},"u1":{"text":"对选定的敌人造成4点物理伤害。\n若战斗仍在继续，宫子回复2点生命，不能超过生命上限。","A":"对选定的敌人造成4点物理伤害。\n若战斗仍在继续，宫子回复4点生命，不能超过生命上限。","B":"对选定的敌人造成7点物理伤害。"},"u2":{"text":"宫子回复4点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。","A":"宫子回复7点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。","B":"宫子回复3点生命，不能超过生命上限。\n宫子获得4点本轮护盾。\n消耗：打出后，本场战斗不再抽到这张牌。"},"u3":{"text":"宫子获得6点本轮护盾。","A":"宫子获得9点本轮护盾。","B":"宫子获得5点本轮护盾。\n移除宫子的1种负面状态。"},"u4":{"text":"选定的队员回复3点生命，不能超过生命上限。\n宫子获得3点本轮护盾。\n消耗：打出后，本场战斗不再抽到这张牌。","A":"选定的队员回复5点生命，不能超过生命上限。\n宫子获得3点本轮护盾。\n消耗：打出后，本场战斗不再抽到这张牌。","B":"选定的队员回复2点生命，不能超过生命上限。\n宫子获得6点本轮护盾。\n消耗：打出后，本场战斗不再抽到这张牌。"},"u5":{"text":"对选定的敌人造成7点魔法伤害，可选择后排。\n若战斗仍在继续，宫子回复3点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。","A":"对选定的敌人造成10点魔法伤害，可选择后排。\n若战斗仍在继续，宫子回复4点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。","B":"对选定的敌人造成5点魔法伤害，可选择后排。\n若战斗仍在继续，宫子回复2点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。"},"a1":{"text":"安娜先失去2点生命，护盾不能抵扣；失去后必须至少剩1点生命。\n对所有敌人造成2点魔法伤害。","A":"安娜先失去1点生命，护盾不能抵扣；失去后必须至少剩1点生命。\n对所有敌人造成2点魔法伤害。","B":"安娜先失去3点生命，护盾不能抵扣；失去后必须至少剩1点生命。\n对所有敌人造成3点魔法伤害。"},"a2":{"text":"安娜先失去3点生命，护盾不能抵扣；失去后必须至少剩1点生命。\n对选定的敌人造成11点魔法伤害，可选择后排。","A":"安娜先失去2点生命，护盾不能抵扣；失去后必须至少剩1点生命。\n对选定的敌人造成11点魔法伤害，可选择后排。","B":"安娜先失去4点生命，护盾不能抵扣；失去后必须至少剩1点生命。\n对选定的敌人造成18点魔法伤害，可选择后排。"},"a3":{"text":"安娜获得6点本轮护盾。","A":"安娜获得9点本轮护盾。","B":"安娜获得5点本轮护盾。\n移除安娜的1种负面状态。"},"a4":{"text":"所有敌人本轮下一次单体攻击少造成1点伤害；连击只减少第一次命中，群攻不受影响。\n安娜获得2点本轮护盾。","A":"所有敌人本轮下一次单体攻击少造成2点伤害；连击只减少第一次命中，群攻不受影响。\n安娜获得3点本轮护盾。","B":"所有敌人本轮下一次单体攻击少造成1点伤害；连击只减少第一次命中，群攻不受影响。\n安娜获得5点本轮护盾。"},"a5":{"text":"对选定的敌人造成6点魔法伤害，可选择后排。\n若战斗仍在继续，安娜回复3点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。","A":"对选定的敌人造成9点魔法伤害，可选择后排。\n若战斗仍在继续，安娜回复4点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。","B":"对选定的敌人造成4点魔法伤害，可选择后排。\n若战斗仍在继续，安娜回复2点生命，不能超过生命上限。\n消耗：打出后，本场战斗不再抽到这张牌。"},"y1":{"text":"对选定的敌人造成4点魔法伤害，可选择后排。","A":"对选定的敌人造成6点魔法伤害，可选择后排。","B":"对选定的敌人造成3点魔法伤害，可选择后排。\n若战斗仍在继续，移除依里的1种负面状态。"},"y2":{"text":"对选定的敌人造成11点魔法伤害，可选择后排。\n消耗：打出后，本场战斗不再抽到这张牌。","A":"对选定的敌人造成11点魔法伤害，可选择后排。\n若战斗仍在继续，生命比例最低的队员获得3点本轮护盾。\n消耗：打出后，本场战斗不再抽到这张牌。","B":"对选定的敌人造成8点魔法伤害，可选择后排。"},"y3":{"text":"选定的队员获得5点本轮护盾。\n移除选定的队员的1种负面状态。","A":"选定的队员获得7点本轮护盾。\n移除选定的队员的1种负面状态。","B":"选定的队员获得4点本轮护盾。\n移除选定的队员的2种负面状态。"},"y4":{"text":"对选定的敌人造成6点魔法伤害，可选择后排。\n若战斗仍在继续，再削去目标剩余魔法屏障中的最多2点。\n消耗：打出后，本场战斗不再抽到这张牌。","A":"对选定的敌人造成8点魔法伤害，可选择后排。\n若战斗仍在继续，再削去目标剩余魔法屏障中的最多3点。\n消耗：打出后，本场战斗不再抽到这张牌。","B":"对选定的敌人造成5点魔法伤害，可选择后排。\n若战斗仍在继续，再削去目标剩余魔法屏障中的最多2点。"},"y5":{"text":"从依里的弃牌中选择最多1张没有“消耗”标记的牌，按选择顺序放到抽牌堆顶，先选的在最上方；不会立即抽到。","A":"从依里的弃牌中选择最多1张没有“消耗”标记的牌，按选择顺序放到抽牌堆顶，先选的在最上方；不会立即抽到。\n依里获得3点本轮护盾。","B":"从依里的弃牌中选择最多2张没有“消耗”标记的牌，按选择顺序放到抽牌堆顶，先选的在最上方；不会立即抽到。"},"k1":{"text":"对选定的敌人造成5点物理伤害。","A":"对选定的敌人造成7点物理伤害。","B":"对选定的敌人造成4点物理伤害。\n若战斗仍在继续，香织获得2点本轮护盾。"},"k2":{"text":"对选定的敌人连击2次，每次造成2点物理伤害。","A":"对选定的敌人造成6点物理伤害。","B":"对选定的敌人连击3次，每次造成2点物理伤害。"},"k3":{"text":"香织获得4点本轮护盾。\n香织获得本轮鼓舞：下一次单体攻击加2伤害，连击只加在第一次命中；群攻和附加伤害不加成。","A":"香织获得6点本轮护盾。\n香织获得本轮鼓舞：下一次单体攻击加2伤害，连击只加在第一次命中；群攻和附加伤害不加成。","B":"香织获得2点本轮护盾。\n香织获得本轮鼓舞：下一次单体攻击加4伤害，连击只加在第一次命中；群攻和附加伤害不加成。"},"s1":{"text":"选定的队员获得3点本轮护盾。\n选定的队员获得1TP（必杀能量，上限6）。","A":"选定的队员获得5点本轮护盾。\n选定的队员获得1TP（必杀能量，上限6）。","B":"选定的队员获得2点本轮护盾。\n选定的队员获得2TP（必杀能量，上限6）。"},"s2":{"text":"咲恋获得2点本轮护盾。\n查看抽牌堆顶2张，选1张加入手牌；其余按展示顺序放到牌堆底。","A":"咲恋获得2点本轮护盾。\n查看抽牌堆顶4张，选1张加入手牌；其余按展示顺序放到牌堆底。","B":"咲恋获得5点本轮护盾。\n查看抽牌堆顶1张，选1张加入手牌；其余按展示顺序放到牌堆底。"},"s3":{"text":"对选定的敌人造成3点物理伤害。\n若战斗仍在继续，生命比例最低的队员获得2点本轮护盾。","A":"对选定的敌人造成4点物理伤害。\n若战斗仍在继续，生命比例最低的队员获得2点本轮护盾。","B":"对选定的敌人造成2点物理伤害。\n若战斗仍在继续，生命比例最低的队员获得4点本轮护盾。"},"n1":{"text":"选定的队员获得3点本轮护盾。\n选定的队员获得本轮鼓舞：下一次单体攻击加3伤害，连击只加在第一次命中；群攻和附加伤害不加成。","A":"选定的队员获得5点本轮护盾。\n选定的队员获得本轮鼓舞：下一次单体攻击加3伤害，连击只加在第一次命中；群攻和附加伤害不加成。","B":"选定的队员获得2点本轮护盾。\n选定的队员获得本轮鼓舞：下一次单体攻击加5伤害，连击只加在第一次命中；群攻和附加伤害不加成。"},"n2":{"text":"对选定的敌人造成4点物理伤害。若上一张卡牌由队友打出，伤害改为6点；必杀不改变出牌顺序。","A":"对选定的敌人造成5点物理伤害。若上一张卡牌由队友打出，伤害改为7点；必杀不改变出牌顺序。","B":"对选定的敌人造成3点物理伤害。若上一张卡牌由队友打出，伤害改为5点；必杀不改变出牌顺序。\n若战斗仍在继续，莫妮卡获得2点本轮护盾。"},"n3":{"text":"每名存活队员获得2点本轮护盾。","A":"每名存活队员获得3点本轮护盾。","B":"每名存活队员获得1点本轮护盾。\n莫妮卡获得本轮鼓舞：下一次单体攻击加3伤害，连击只加在第一次命中；群攻和附加伤害不加成。"},"k4":{"text":"对选定的敌人造成7点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成3点伤害；连击只减少第一次命中，群攻不受影响。","A":"对选定的敌人造成7点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成5点伤害；连击只减少第一次命中，群攻不受影响。","B":"对选定的敌人造成5点物理伤害。\n若战斗仍在继续，选定的敌人本轮下一次单体攻击少造成1点伤害；连击只减少第一次命中，群攻不受影响。"},"k5":{"text":"对选定的敌人连击3次，每次造成3点物理伤害。","A":"对选定的敌人连击3次，每次造成2点物理伤害。","B":"对选定的敌人连击2次，每次造成4点物理伤害。"},"s4":{"text":"每名存活队员获得4点本轮护盾。\n选定的队员获得1TP（必杀能量，上限6）。","A":"每名存活队员获得6点本轮护盾。\n选定的队员获得1TP（必杀能量，上限6）。","B":"每名存活队员获得2点本轮护盾。\n选定的队员获得1TP（必杀能量，上限6）。"},"s5":{"text":"选定的队员获得本轮鼓舞：下一次单体攻击加4伤害，连击只加在第一次命中；群攻和附加伤害不加成。","A":"选定的队员获得本轮鼓舞：下一次单体攻击加6伤害，连击只加在第一次命中；群攻和附加伤害不加成。","B":"选定的队员获得本轮鼓舞：下一次单体攻击加3伤害，连击只加在第一次命中；群攻和附加伤害不加成。\n选定的队员获得3点本轮护盾。"},"n4":{"text":"选定的队员获得6点本轮护盾。若上一张卡牌由队友打出，再多给2点；必杀不改变出牌顺序。","A":"选定的队员获得8点本轮护盾。若上一张卡牌由队友打出，再多给2点；必杀不改变出牌顺序。","B":"选定的队员获得4点本轮护盾。\n选定的队员获得本轮鼓舞：下一次单体攻击加2伤害，连击只加在第一次命中；群攻和附加伤害不加成。"},"n5":{"text":"对选定的敌人连击2次，每次造成3点物理伤害。\n若战斗仍在继续，所有敌人本轮下一次单体攻击少造成1点伤害；连击只减少第一次命中，群攻不受影响。","A":"对选定的敌人连击2次，每次造成4点物理伤害。\n若战斗仍在继续，所有敌人本轮下一次单体攻击少造成1点伤害；连击只减少第一次命中，群攻不受影响。","B":"对选定的敌人连击2次，每次造成3点物理伤害。"}};
  Object.keys(readableCards).forEach(function(id) { var copy=readableCards[id], card=cards[id]; card.text=copy.text; card.branches.A.text=copy.A; card.branches.B.text=copy.B; });
  var readableHeroes = {"pecorine":{"summary":"先加盾，再决定留盾挡伤还是消耗它重击。","passive":"每轮敌人行动时，佩可第一次用护盾挡住单体攻击，就反击3点物理伤害。连击也只反击一次。","burst":"对选定的敌人造成8点物理伤害。\n若战斗仍在继续，佩可获得10点本轮护盾。"},"rei":{"summary":"先破甲，再用连击或重剑扩大伤害。","passive":"每轮第一次攻击带有减益的敌人时，怜的这次伤害加2。卡牌与必杀都能触发。","burst":"对选定的敌人造成12点物理伤害，无视护甲。"},"kokkoro":{"summary":"用护盾、鼓舞和选牌帮助队友行动。","passive":"每轮第一次打出可可萝的支援牌时，生命比例最低的队员获得2点本轮护盾；比例相同选站得更靠前的人。","burst":"每名存活队员获得5点本轮护盾。\n选定的队员获得2TP（必杀能量，上限6）。"},"kyaru":{"summary":"越过前排施咒，再选择保咒或引爆。","passive":"每轮第一次用卡牌或必杀攻击后排时，凯露的这次伤害加2。群攻也能触发，但只强化一名后排敌人。","burst":"对所有敌人造成8点魔法伤害。可选择引爆已有咒痕，让伤害再加4点并清除咒痕；也可保留。咒痕本轮尚未触发时，另加2点伤害。"},"hatsune":{"summary":"先铺星痕，再用流星提前结算伤害。","passive":"星痕最多3层。结束我方回合时，敌人每有1层就受到1点魔法伤害，随后减少1层；流星可以提前追加一次结算。","burst":"对所有敌人造成4点魔法伤害。\n若战斗仍在继续，给所有敌人添加2层星痕，最多3层；回合结束时每层造成1点魔法伤害，然后减少1层。"},"yui":{"summary":"用有限的治疗和净化修复队伍伤势。","passive":"每战优衣第一次成功治疗队员时，那位队员再获得3点护盾。满血治疗不算；群体治疗只奖励首位真正恢复生命的人。","burst":"每名存活队员回复4点生命，不能超过生命上限。\n每名存活队员获得2点本轮护盾。"},"jun":{"summary":"留下少量余盾，为下一轮守住阵线。","passive":"敌人行动结束后，纯可以留下剩余护盾中的最多3点。没有余盾就不会获得；不能带到下一场战斗。","burst":"纯获得15点本轮护盾。\n其余每名存活队员获得4点本轮护盾。"},"nozomi":{"summary":"给队友加盾，也为自己的攻击做准备。","passive":"每轮第一次用望的支援牌给队友加盾后，望本轮下一次单体攻击多造成2点伤害，连击只强化一次。通过必杀给盾不触发；鼓舞数值可与其他来源叠加。","burst":"每名存活队员获得6点本轮护盾。\n所有敌人本轮下一次单体攻击少造成2点伤害；连击只减少第一次命中，群攻不受影响。"},"shizuru":{"summary":"队友越危险，保护时额外给的盾越关键。","passive":"每轮第一次用静流的卡牌给半血或更低的队员加盾时，那位队员多获得2点本轮护盾。按给盾当时的生命判断，必杀不触发。","burst":"对选定的敌人造成8点物理伤害。\n若战斗仍在继续，生命比例最低的队员回复5点生命，不能超过生命上限。"},"makoto":{"summary":"可以保留破甲给队友，也能自己收尾。","passive":"每轮第一次用真琴的卡牌或必杀清除敌人的破甲后，真琴获得3点本轮护盾。目标原本没有破甲就不触发。","burst":"对选定的敌人造成12点物理伤害。\n若战斗仍在继续，随后清除目标身上的全部破甲；之后的物理攻击不再享受它。"},"suzuna":{"summary":"远程射击可打后排，瞄准后适合收尾。","passive":"每轮第一次单体攻击满生命敌人时，这次命中无视敌人最多2点护甲，普通护盾仍能挡住。连射只强化第一次命中，群攻不享受。","burst":"对选定的敌人造成14点物理伤害，可选择后排，无视护甲。"},"arisa":{"summary":"寻找需要的牌，再安排同轮第二次射击。","passive":"同一轮打出亚里莎的第二张攻击牌时，这张牌额外造成3点伤害；连射只强化第一次命中。必杀不计入张数，也不享受这项加成。","burst":"对选定的敌人造成12点物理伤害，可选择后排。\n若战斗仍在继续，亚里莎获得4点本轮护盾。"},"miyako":{"summary":"自己承压自己恢复，治疗资源需要留着用。","passive":"每轮一次：宫子没有护盾时，打她自己的卡牌给自己加盾，会额外获得2点本轮护盾。队友给盾和必杀不触发。","burst":"对选定的敌人造成10点物理伤害。\n若战斗仍在继续，宫子回复6点生命，不能超过生命上限。"},"anna":{"summary":"用自己的生命换魔法爆发，别忽略补给。","passive":"每轮第一次用安娜的卡牌支付生命后，所有敌人额外受到1点魔法伤害。这次附伤不受鼓舞强化，也不会引发反伤。","burst":"对所有敌人造成8点魔法伤害。"},"yori":{"summary":"把一次性雷霆留给值得爆发的时机。","passive":"每战第一次打出依里带“消耗”标记的牌时，依里先获得4点本轮护盾，再执行卡牌效果。","burst":"对选定的敌人造成12点魔法伤害，可选择后排。\n若战斗仍在继续，生命比例最低的队员获得4点本轮护盾。"},"kaori":{"summary":"让前两张攻击瞄准同一敌人，连拳更强。","passive":"同一轮内，若香织打出的前两张攻击牌都攻击同一敌人，第二张多造成2点伤害；连击只强化第一次命中。第三张不补触发，必杀不计入张数。","burst":"对选定的敌人连击3次，每次造成3点物理伤害。"},"saren":{"summary":"选择需要充能的队友，帮她更早放必杀。","passive":"每轮第一次用咲恋的支援牌指定其他队员时，那位队员额外获得1TP（必杀能量）。给自己和释放必杀都不触发。","burst":"每名存活队员获得5点本轮护盾。\n其余每名存活队员获得1TP（必杀能量，上限6）。"},"monika":{"summary":"轮流让不同队员出牌，接手的人获得护盾。","passive":"每轮第一次由另一名队员接着出牌时，接手者先获得3点本轮护盾。必杀和免费调度不算出牌，也不改变前后卡牌的顺序。","burst":"每名存活队员获得4点本轮护盾。\n选定的队员获得本轮鼓舞：下一次单体攻击加5伤害，连击只加在第一次命中；群攻和附加伤害不加成。"}};
  Object.keys(readableHeroes).forEach(function(id) { var copy=readableHeroes[id], h=heroes[id]; h.summary=copy.summary; h.passive=copy.passive; h.burst.text=copy.burst; });
  var readableRelics = {"guard_badge":["每轮首次加盾，额外给那人2点。","每轮第一个获得护盾的队员，再多获得2点本轮护盾。\n全队每轮只触发一次。"],"opening_shield":["开战时，佩可或前排先得4点护盾。","开战时，佩可获得4点护盾；没有存活的佩可则给最前面的存活队员。\n每战一次。"],"star_book":["每战首次牵星，多加1层星痕。","每战第一次使用“牵星”时，目标额外获得1层星痕。\n星痕仍最多3层。"],"ember_prism":["流星引爆后，为一名敌人补2层星痕。","每轮第一次用流星引爆星痕后，给主目标补上2层星痕；它已被击败则给最靠前的存活敌人。\n星痕最多3层，战斗结束不再补星。"],"starlight_ward":["星痕扣到生命时，为伤者补2点护盾。","每轮第一次由星痕实际扣除敌人生命后，生命比例最低的队员获得2点本轮护盾。\n伤害全被护盾或魔法屏障挡住时不触发。"],"battle_horn":["开战时，全队各加1TP。","开战时，每名存活队员获得1TP（必杀能量）。\nTP最多6，每战一次。"],"healing_bell":["每战首次有效治疗，多回复2点生命。","每战首次通过卡牌或必杀恢复生命时，同一人多回复2点。\n群体治疗仅强化第一个真正回血的人；满血不消耗机会。"],"hex_crystal":["每战首次施咒，咒痕延长1轮。","每战第一次施加咒痕时，该敌人的咒痕延长1轮。\n群体施咒也只强化第一个目标。"],"wolf_fang":["攻击带减益的敌人，物理伤害加2。","每轮首次单体物理攻击命中带减益的敌人时，这次伤害加2。\n连击只强化一次，群攻不触发。"],"witch_grimoire":["每轮首次单体魔法攻击加1伤害。","每轮第一次单体魔法攻击多造成1点伤害。\n不强化群攻、星痕或其他附加伤害。"],"counter_medal":["佩可的护盾反击从3伤害提高到5。","佩可用护盾触发的反击，由3点物理伤害提高到5点。\n仍每轮只能反击一次。"],"tactical_notes":["每战首次查看牌顶，多看1张。","每战首次用卡牌查看抽牌堆顶时，多查看1张。\n仍只选1张加入手牌，其余按原顺序放到牌堆底。"],"warm_scarf":["开战时，为伤势最重的队员回复3点。","开战时，生命比例最低的存活队员回复3点生命。\n不能超过生命上限，每战一次。"],"silver_arrow":["每轮首次单体打后排，加1伤害。","每轮首次用卡牌或必杀单体攻击后排时，这次伤害加1。\n群攻不触发。"],"holy_cup":["战斗获胜时，存活队员各回复2点。","每次战斗获胜，仍存活的队员各回复2点生命。\n倒地队员不会因此复起。"],"shield_etching":["消耗护盾重击，为另一名伤者补盾。","攻击牌实际消耗至少4点自身护盾后，为另一名生命比例最低的队员补盾：消耗4点给2点，消耗6点以上给3点。\n全队每轮一次；出牌者撑过反伤且战斗未结束才生效。"],"blood_receipt":["用牌累计付出3点生命，自己获得4盾。","同一队员本轮通过卡牌合计支付至少3点生命后，获得4点本轮护盾。\n全队每轮一次；出牌者撑过反伤且战斗未结束才生效。敌人的伤害不算支付。"],"concert_ribbon":["三人都出过牌，下轮前排获得2盾。","本轮三人都打过卡牌后，下一轮开始时给最前面的存活队员2点护盾。\n每轮只预约一次，战斗结束即取消；必杀不算。"],"crooked_compass":["免费调度改为至多2张选1张。","免费调度时，从所选角色的牌库随机展示至多2张，选择1张替换手牌。\n未选牌留原处，换出的牌沉底。仍每战只能调度一次，两张可能同名。"],"spent_fuse":["消耗牌追加3点魔法伤害，每战至多两次。","消耗牌打出后，若出牌者撑过反伤且战斗未结束，对当前生命最低的敌人追加3点魔法伤害；生命相同选靠前者。\n每战最多触发2次，不受鼓舞强化，也不引发反伤。"],"last_ember_locket":["抵挡一次致命攻击，留1生命但清空TP。","每战一次：队员将被敌人攻击击倒时，改为剩1点生命，并失去全部TP。\n毒、反伤和主动付生命不受保护；连击的后续伤害仍可能击倒她。"]};
  Object.keys(readableRelics).forEach(function(id) { relics[id].summary=readableRelics[id][0]; relics[id].text=readableRelics[id][1]; });
  var readableEncounters = {"tutorial_gate":"先试用三人的专属卡，再让她们逐一释放必杀。练习不消耗远征生命、金币或卡牌。","forest_patrol":"枪兵隔轮架盾，幼兽会逐轮变强。魔法与远程物理能先打后排；也可以破甲后集中解决枪兵。","forest_swarm":"三名敌人生命不高，但活着的每一名都会增加压力。群攻能同时削血，单体攻击也可以先减少敌人数。","forest_mirror":"开场有6点魔法屏障。迎击轮第一次受到攻击会反伤4点：先给出牌者护盾，或利用攻击牌附带的盾接住反伤。","forest_boss":"克莉丝提娜独自迎战：后排4伤、前排7伤、全队各4伤、获得4护盾，按四轮循环。单体减攻适合防重斩；群攻轮给全队护盾。","ruins_curse":"后排施咒者会给队员留下破绽，使下一次受击更痛。先打掉它、净化破绽，或为被标记的人加盾，都能降低风险。","ruins_watch":"前排魔法屏障只能吸收有限伤害；群攻术士不受单体减攻影响。可先减少敌人数，别让后排幼兽持续变强。","ruins_elite":"两名敌人交替重击和群攻。减攻只减少下一次单体攻击的第一次命中；保护不同目标时，全队护盾更灵活。","ruins_boss":"似似花独自迎战：追击伤者6伤、全队各3伤、后排4伤连击2次、获得4护盾。开场6魔盾用完不会重补，准备轮可整理手牌。","summit_duel":"前排穿重甲，后排弓手专挑伤者。近战可先破甲，魔法与远程物理则能先处理弓手。","summit_stars":"三名敌人交替攻击、群攻和施咒。前排魔法屏障用完就不再补充，群攻适合同时压低多名敌人的生命。","summit_elite":"重击、群攻和补充魔法屏障轮换出现。按预告选择减攻、全队护盾或进攻，准备轮可整理手牌与能量。","summit_boss":"重击、群攻、准备轮和后排连击循环出现。第七轮开始每次命中加2伤害，此后每三轮再加2；别让准备变成无限拖延。","paper_fubuki":"布武机独自迎战：前排4伤、后排2伤连射2次、全队各2伤、获得4护盾，按四轮循环。\n减攻只减少连射的第一次命中；第三轮用全队护盾，第四轮可蓄势或整理手牌。","paper_yamato":"第二轮先削去受击者至多2点护盾，再打5伤害；没有盾不会额外扣血。\n第四轮攻击最前的两名存活队员，各3伤害。用单体减攻防重击，用全队护盾防横扫。","paper_ranpha":"兰法独自迎战。咏唱让下一轮第一张普通攻击牌的主伤少2，必杀、星痕与附加效果不变。\n之后依次全队各2伤、后排6伤并留下下轮腐毒2、获得4护盾。腐毒在下轮敌人行动前结算，可用护盾吸收或净化。","paper_misora":"美空独自迎战：后排2伤连射2次、获得4护盾、后排2伤连射3次、追击伤者6伤。\n减攻只减少连击的第一次命中；第二轮装填不攻击，可准备护盾、指路和TP。","paper_kaiser":"前排9伤害、全队各4、获得6护盾休整、后排4伤害连射2次，按四轮循环。\n第七轮开始每次命中加2伤害，此后每三轮再加2。抓住第三轮准备，别忽略后排保护。"};
  Object.keys(readableEncounters).forEach(function(id) { encounters[id].description=readableEncounters[id]; });
  var readableEvents = {"lost_lunch":"路边有一篮仍温热的食物。可以分给受伤的伙伴，也能按便条送回主人，换一笔路费。","training_stone":"石碑映出伙伴们练习过的招式。挑一张准备继续使用的牌精进，或记录见闻换取路费。","lighten_pack":"行囊越来越重，想要的牌却不容易抽到。舍弃一张不需要的牌，或保留现有工具再带些路费。","guild_teacher":"休息中的冒险者愿意分享实战经验。可以学习同行伙伴的新技巧，也能交换沿途消息领取路费。","broken_charm":"石缝里的护符还亮着微光。花钱修好它能得到一件遗物；不修复就短暂休息，处理一点轻伤。","moon_spring":"泉边足够停留一小会儿。用来治疗队伍伤势，还是练好一张卡牌，为下一场战斗做准备？","travelling_smith":"塔中的镜面重演着伙伴刚才的失误。可以花28金币安全练习，也能花10金币，让练习的那位伙伴承受4生命代价。\n只选一项：升级一张牌、出售记录获得8金币，或直接离开。","field_infirmary":"临时救护所愿意为三人包扎。花22金币，让每名存活队员回复最多6点生命；满血者不会额外得到补偿。","pack_broker":"整理师能帮你舍弃一张牌，减少它挤进手牌的机会。付15金币整理，或保留牌组、卖掉杂物领取10金币。","damaged_reliquary":"匣中的遗物需要修复。付40金币稳妥处理，或付15金币，再让一名存活队员承受4点生命损失。\n付款后才展示可选遗物，也可以不修复直接离开。","night_watch_job":"有人需要守住营火。三人各失去3点生命，可以换来28金币；必须每人都能承担，不能让一人代付。","old_travel_notes":"旅行札记着队伍专属的新技巧。花12金币，从展示的奖励牌中选一张；也可出售记述，领取6金币。\n付学费后若放弃选牌，只拿原有的8金币跳牌奖励，净损4金币。","side_path_spring":"支路里有一眼清泉，能让每名存活队员立即回复6点生命。\n绕路会用掉本幕那次免费营地机会，之后仍可自费进商店；不愿付这个代价就离开。"};
  var readableChoices = {"lost_lunch":["每名存活队员回复最多4点生命。","获得24金币。"],"training_stone":["选择一张未升级的牌，再选择A或B分支。","获得18金币。"],"lighten_pack":["选择并移除一张牌；同名的另一张仍保留，牌组最低12张。","获得16金币。"],"guild_teacher":["从当前三名队员的奖励牌中三选一。","获得22金币。"],"broken_charm":["支付25金币，再从遗物中三选一。","每名存活队员回复最多2点生命。"],"moon_spring":["每名存活队员回复最多5点生命。","选择一张未升级的牌，再选择A或B分支。"],"travelling_smith":["支付28金币，升级一张未升级的牌；选择A或B分支。","支付10金币；要升级的那张牌属于谁，就由谁失去4点生命。她必须至少剩1点，再选择A或B分支。","获得8金币，不进行升级。","不付出、不领取，直接离开。"],"field_infirmary":["支付22金币，每名存活队员回复最多6点生命。","不购买，直接离开。"],"pack_broker":["支付15金币，移除选定的一张牌；同名另一张保留，牌组最低12张。","不删牌，获得10金币。","不付出、不领取，直接离开。"],"damaged_reliquary":["支付40金币，修复后从遗物中三选一。","支付15金币，再选择一名存活队员失去4点生命；她必须至少剩1点。修复后从遗物中三选一。","不修复，直接离开。"],"night_watch_job":["三名队员各失去3点生命，获得28金币；每人都必须至少剩1点生命。","不值守，直接离开。"],"old_travel_notes":["支付12金币，从本队奖励牌中三选一；若放弃选牌，只得到8金币，不退学费。","获得6金币，不选新牌。","不付出、不领取，直接离开。"],"side_path_spring":["每名存活队员回复最多6点生命；用掉本幕免费营地机会，之后仍可自费购物。","不绕路，不消耗营地机会。"]};
  events.forEach(function(e) { e.text=readableEvents[e.id]; e.choices.forEach(function(c,i) { c.description=readableChoices[e.id][i]; }); });
  // READABLE_COPY_V31_END

  // Local expansion: ordinary encounters keep ordinary rewards and presentation.
  encounters.starlit_dual = {
    id: 'starlit_dual', name: '交替双卫', act: 2, type: 'battle',
    objective: '击败两名卫兵。两人交替进攻，按受威胁队员与防御选择目标。',
    description: '重甲卫有2护甲，第二轮攻击前排6点；魔盾卫只有开场4魔盾，第一轮攻击后排5点。两人交替进攻，不会重补魔盾。',
    enemies: [
      enemy('starlit_armored', '重甲卫兵', 18, 'front', '♜', '#a9a0a0', [guard('架盾：4护盾', { amount: 4 }), attack('前排重击', 6)], { armor: 2, art: 'assets/enemies/priconne/golem.png' }),
      enemy('starlit_warded', '屏障卫兵', 18, 'front', '◈', '#789fb8', [attack('射击后排', 5, 'back'), guard('架盾：4护盾', { amount: 4 })], { barrier: 4, art: 'assets/enemies/priconne/blue-golem.png' })
    ]
  };
  function commanderEncounter(id, act, hp, guardHp) {
    return { id: id, name: act === 2 ? '指挥者据点' : '塔顶指挥所', act: act, type: 'battle', victoryCoreId: 'starlit_commander',
      objective: '击败后排指挥者即可获胜，前卫不必全部清除。',
      description: '击败后排指挥者即可获胜。魔法和远程可直取核心，近战先清前卫；指挥者首轮不攻击，之后群攻、追击伤者与防守循环。',
      enemies: [
        enemy('starlit_commander', '幻影指挥者', hp, 'back', '⚑', '#a682aa', [guard('整队：本轮不攻击'), aoe('号令群攻', 2), attack('锁定伤者', 6, 'lowest'), guard('防守：4护盾', { amount: 4 })], { barrier: 2, role: 'core', art: 'assets/enemies/priconne/fire-mage.png' }),
        enemy('starlit_bodyguard', '据点前卫', guardHp, 'front', '🛡', '#8a9d83', [attack('护卫突击', 4), guard('举盾：4护盾', { amount: 4 })], { armor: 1, art: 'assets/enemies/priconne/goblin-guard.png' })
      ] };
  }
  encounters.starlit_commander = commanderEncounter('starlit_commander', 2, 22, 12);
  encounters.starlit_core = commanderEncounter('starlit_core', 3, 26, 14);
  // Every Boss faces the trio alone. The revision also upgrades active saved Boss battles.
  Object.keys(encounters).forEach(function (id) {
    if (encounters[id].type === 'boss') encounters[id].soloRevision = 1;
  });
  // Keep Yamato definitions for already saved battles, but never offer her in a new pool.
  var echoSpecs = { fubuki: [54, 2], christina: [56, 2], yamato: [60, 2], ranpha: [56, 4], misora: [54, 0] };
  Object.keys(echoSpecs).forEach(function (bossId) {
    var sourceId = 'paper_' + bossId, enc = JSON.parse(JSON.stringify(encounters[sourceId]));
    enc.id = 'echo_' + bossId; enc.sourceEncounterId = sourceId; enc.act = 3; enc.echo = true;
    enc.name = '回响 · ' + enc.name.replace('幻影试炼 · ', '');
    enc.enemies[0].hp = echoSpecs[bossId][0]; enc.enemies[0].barrier = echoSpecs[bossId][1];
    enc.enemies.forEach(function (unit) {
      unit.cycle.forEach(function (intent) {
        if (intent.type === 'attack' || intent.type === 'aoe') {
          intent.amount += 1;
          // The UI calculates live damage; do not keep the main fight's lower numbers in the move name.
          intent.name = intent.name.split(/[：:]/)[0];
        }
      });
    });
    enc.description = '可选单场回响：使用登顶牌组、升级与遗物，全员满血开始。胜负不改变主线通关，不发成长奖励。敌方意图以战斗内数值为准。';
    encounters[enc.id] = enc;
  });
  // Standard v3.7 Boss challenge: tested public rhythms are snapshotted only
  // on battle creation. Historical cycles, active saves and echoes stay intact.
  var standardBossRhythms = {
    "paper_fubuki": {
      "threshold": 0.5,
      "phases": [
        {
          "id": "armaments",
          "name": "武装轮转",
          "summary": "前排6 → 后排3×2 → 全队4 → 整理不攻击。",
          "cycle": [
            {
              "name": "精密射击：前排6",
              "type": "attack",
              "amount": 6,
              "target": "front"
            },
            {
              "name": "武装连射：后排3×2",
              "type": "attack",
              "amount": 3,
              "target": "back",
              "hits": 2
            },
            {
              "name": "武装齐射：全队4",
              "type": "aoe",
              "amount": 4
            },
            {
              "name": "过热整理：本轮不攻击",
              "type": "guard",
              "amount": 0
            }
          ]
        }
      ],
      "revision": 2,
      "challengeVersion": "candidate-2",
      "description": "独自迎战。前排6 → 后排3×2 → 全队4 → 整理不攻击。已预告的本轮行动保持不变。第7轮起每次命中加2伤，此后每3轮再加2。",
      "legacyDescription": "布武机独自迎战：前排4伤、后排2伤连射2次、全队各2伤、获得4护盾，按四轮循环。\n减攻只减少连射的第一次命中；第三轮用全队护盾，第四轮可蓄势或整理手牌。"
    },
    "paper_christina": {
      "threshold": 0.5,
      "phases": [
        {
          "id": "duel",
          "name": "试探决斗",
          "summary": "后排5 → 前排11 → 全队4 → 整顿2盾。",
          "cycle": [
            {
              "name": "远击：后排5",
              "type": "attack",
              "amount": 5,
              "target": "back"
            },
            {
              "name": "不败重斩：前排11",
              "type": "attack",
              "amount": 11,
              "target": "front"
            },
            {
              "name": "封印解放：全队4",
              "type": "aoe",
              "amount": 4
            },
            {
              "name": "整顿架势：2护盾",
              "type": "guard",
              "amount": 2
            }
          ]
        },
        {
          "id": "assault",
          "name": "决斗追击",
          "summary": "前排12 → 全队5 → 后排6 → 收势不攻击。",
          "cycle": [
            {
              "name": "决斗重斩：前排12",
              "type": "attack",
              "amount": 12,
              "target": "front"
            },
            {
              "name": "封印解放：全队5",
              "type": "aoe",
              "amount": 5
            },
            {
              "name": "追击：后排6",
              "type": "attack",
              "amount": 6,
              "target": "back"
            },
            {
              "name": "决斗收势：本轮不攻击",
              "type": "guard",
              "amount": 0
            }
          ]
        }
      ],
      "revision": 2,
      "challengeVersion": "candidate-2",
      "description": "独自迎战。后排5 → 前排11 → 全队4 → 整顿2盾。生命不高于25时，下一轮进入「决斗追击」：前排12 → 全队5 → 后排6 → 收势不攻击。已预告的本轮行动保持不变。第7轮起每次命中加2伤，此后每3轮再加2。",
      "legacyDescription": "克莉丝提娜独自迎战。后排4伤、前排7伤、全队各4伤、获得4护盾，按四轮循环。重斩用减攻或护盾应对，第三轮准备全队保护。"
    },
    "paper_ranpha": {
      "threshold": 0.5,
      "phases": [
        {
          "id": "song",
          "name": "幽声咏唱",
          "summary": "咏唱减2 → 全队5 → 后排9并留腐毒2 → 间奏。",
          "cycle": [
            {
              "name": "幽声咏唱：下轮首张普通攻击主伤减2",
              "type": "chant",
              "amount": 2
            },
            {
              "name": "幽声共鸣：全队5",
              "type": "aoe",
              "amount": 5
            },
            {
              "name": "回响魔弹：后排9并留腐毒2",
              "type": "attack",
              "amount": 9,
              "target": "back",
              "poison": 2
            },
            {
              "name": "回响间奏：本轮不攻击",
              "type": "guard",
              "amount": 0
            }
          ]
        },
        {
          "id": "requiem",
          "name": "终曲回响",
          "summary": "后排10并留腐毒2 → 全队6 → 咏唱减2 → 间奏。",
          "cycle": [
            {
              "name": "终曲魔弹：后排10并留腐毒2",
              "type": "attack",
              "amount": 10,
              "target": "back",
              "poison": 2
            },
            {
              "name": "终曲共鸣：全队6",
              "type": "aoe",
              "amount": 6
            },
            {
              "name": "幽声咏唱：下轮首张普通攻击主伤减2",
              "type": "chant",
              "amount": 2
            },
            {
              "name": "回响间奏：本轮不攻击",
              "type": "guard",
              "amount": 0
            }
          ]
        }
      ],
      "revision": 2,
      "challengeVersion": "candidate-2",
      "description": "独自迎战。咏唱减2 → 全队5 → 后排9并留腐毒2 → 间奏。生命不高于29时，下一轮进入「终曲回响」：后排10并留腐毒2 → 全队6 → 咏唱减2 → 间奏。已预告的本轮行动保持不变。第7轮起每次命中加2伤，此后每3轮再加2。",
      "legacyDescription": "兰法独自迎战。咏唱让下一轮第一张普通攻击牌的主伤少2，必杀、星痕与附加效果不变。\n之后依次全队各2伤、后排6伤并留下下轮腐毒2、获得4护盾。腐毒在下轮敌人行动前结算，可用护盾吸收或净化。"
    },
    "paper_misora": {
      "threshold": 0.5,
      "phases": [
        {
          "id": "barrage",
          "name": "猎手弹幕",
          "summary": "后排3×2 → 追击伤者8 → 后排3×3 → 装填不攻击。",
          "cycle": [
            {
              "name": "试探弹幕：后排3×2",
              "type": "attack",
              "amount": 3,
              "target": "back",
              "hits": 2
            },
            {
              "name": "瞄准伤者：8伤",
              "type": "attack",
              "amount": 8,
              "target": "lowest"
            },
            {
              "name": "加特林齐射：后排3×3",
              "type": "attack",
              "amount": 3,
              "target": "back",
              "hits": 3
            },
            {
              "name": "弹仓装填：本轮不攻击",
              "type": "guard",
              "amount": 0
            }
          ]
        }
      ],
      "revision": 2,
      "challengeVersion": "candidate-2",
      "description": "独自迎战。后排3×2 → 追击伤者8 → 后排3×3 → 装填不攻击。已预告的本轮行动保持不变。第7轮起每次命中加2伤，此后每3轮再加2。",
      "legacyDescription": "美空独自迎战：后排2伤连射2次、获得4护盾、后排2伤连射3次、追击伤者6伤。\n减攻只减少连击的第一次命中；第二轮装填不攻击，可准备护盾、指路和TP。"
    },
    "paper_kaiser": {
      "threshold": 0.5,
      "phases": [
        {
          "id": "dominion",
          "name": "王权压迫",
          "summary": "前排13 → 后排5×2 → 全队7 → 俯瞰不攻击。",
          "cycle": [
            {
              "name": "王权重斩：前排13",
              "type": "attack",
              "amount": 13,
              "target": "front"
            },
            {
              "name": "两重裁决：后排5×2",
              "type": "attack",
              "amount": 5,
              "target": "back",
              "hits": 2
            },
            {
              "name": "王权震荡：全队7",
              "type": "aoe",
              "amount": 7
            },
            {
              "name": "俯瞰高塔：本轮不攻击",
              "type": "guard",
              "amount": 0
            }
          ]
        },
        {
          "id": "judgment",
          "name": "终焉裁决",
          "summary": "全队7 → 后排6×2 → 前排15 → 收势不攻击。",
          "cycle": [
            {
              "name": "终焉震荡：全队7",
              "type": "aoe",
              "amount": 7
            },
            {
              "name": "终焉裁决：后排6×2",
              "type": "attack",
              "amount": 6,
              "target": "back",
              "hits": 2
            },
            {
              "name": "终焉重斩：前排15",
              "type": "attack",
              "amount": 15,
              "target": "front"
            },
            {
              "name": "王权收势：本轮不攻击",
              "type": "guard",
              "amount": 0
            }
          ]
        }
      ],
      "revision": 2,
      "challengeVersion": "candidate-2",
      "description": "独自迎战。前排13 → 后排5×2 → 全队7 → 俯瞰不攻击。生命不高于34时，下一轮进入「终焉裁决」：全队7 → 后排6×2 → 前排15 → 收势不攻击。已预告的本轮行动保持不变。第7轮起每次命中加2伤，此后每3轮再加2。",
      "legacyDescription": "前排9伤害、全队各4、获得6护盾休整、后排4伤害连射2次，按四轮循环。\n第七轮开始每次命中加2伤害，此后每三轮再加2。抓住第三轮准备，别忽略后排保护。"
    }
  };
  Object.keys(standardBossRhythms).forEach(function (id) {
    encounters[id].bossRhythm = standardBossRhythms[id];
    encounters[id].description = standardBossRhythms[id].description;
  });
  return { version: 'local-2026-10-23-v3.7', heroes: heroes, cards: cards, relics: relics, encounters: encounters, events: events, acts: acts, teams: teams, release: release };
});
