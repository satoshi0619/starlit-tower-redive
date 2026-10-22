(function (root, factory) {
  'use strict';
  var api;
  if (typeof module === 'object' && module.exports) {
    api = factory(require('./content.js'), function () { return require('./combat-engine.js'); });
    module.exports = api;
  } else {
    api = factory(root.TowerContent, function () { return root.TowerCombat; });
  }
  if (root) root.TowerRun = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C, getCombat) {
  'use strict';
  var combatOverride = null;
  var PRICES = { heal: 35, upgrade: 45, remove: 40, relic: 75, card: 40 };

  function ok(message, extra) { return Object.assign({ ok: true, message: message || '' }, extra || {}); }
  function no(message, extra) { return Object.assign({ ok: false, message: message }, extra || {}); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function hash(seed) {
    var value = 2166136261, text = String(seed);
    for (var i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
    return value >>> 0;
  }
  function random(run) {
    var value = run.rngState = (run.rngState + 0x6d2b79f5) >>> 0;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  function sample(run, values, count) {
    var pool = values.slice(), result = [];
    while (pool.length && result.length < count) result.push(pool.splice(Math.floor(random(run) * pool.length), 1)[0]);
    return result;
  }
  function actDef(run) { return C.acts.find(function (act) { return act.id === run.act; }); }
  function mapSteps(run) {
    var steps = [
      { key: 'battle', label: '遭遇敌人', icon: '⚔' },
      { key: 'event', label: '沿途奇遇', icon: '✧' },
      { key: 'challenge', label: '选择挑战', icon: '◇' },
      { key: 'service', label: '旅途整备', icon: '♧' },
      { key: 'boss', label: '封印之战', icon: '♜' }
    ];
    if (run && run.layoutVersion === 1 && run.act === 2) steps.splice(2, 0, { key: 'commander', label: '突破据点', icon: '⚑' });
    return steps;
  }
  function currentStep(run) { return mapSteps(run)[run.stage] || null; }
  function normalize(run) {
    if (!run || !Array.isArray(run.heroIds)) throw new Error('远征存档无效。');
    run.bossByAct = run.bossByAct || {};
    // A v2 expedition keeps its original encounters and RNG. New expeditions
    // choose one Boss only when that act becomes public.
    if ((run.version || 2) < 3) C.acts.forEach(function (act) {
      var cached = run.mapChoices && run.mapChoices[act.id + ':4'];
      run.bossByAct[act.id] = run.bossByAct[act.id] || (cached && cached[0] && cached[0].encounterId) || act.legacyBoss || act.boss;
    });
    run.version = 3;
    run.eventsSeen = run.eventsSeen || [];
    run.campDebt = run.campDebt || {};
    run.swapsByAct = run.swapsByAct || {};
    return run;
  }
  function chooseActBoss(run) {
    normalize(run);
    if (!run.bossByAct[run.act]) {
      var act = actDef(run), pool = act.bosses || [act.boss];
      run.bossByAct[run.act] = pool.length === 1 ? pool[0] : sample(run, pool, 1)[0];
    }
    return run.bossByAct[run.act];
  }
  function publicBoss(run) {
    var id = run.bossByAct && run.bossByAct[run.act];
    return C.encounters[id || actDef(run).legacyBoss || actDef(run).boss];
  }
  function record(run, type, data) {
    run.history.push(Object.assign({ type: type, act: run.act, stage: run.stage }, data || {}));
  }
  function addCard(run, defId) {
    var card = { uid: 'card-' + run.nextCardUid++, defId: defId, branch: null };
    run.deck.push(card);
    return card;
  }
  function cardPool(run) {
    return Object.keys(C.cards).filter(function (id) { return run.heroIds.indexOf(C.cards[id].owner) !== -1 && !C.cards[id].starter; });
  }
  function relicPool(run) {
    // These effects require a specific hero/card. All unlisted relics are generic.
    var ownerRequired = {
      counter_medal: 'pecorine', star_book: 'hatsune', ember_prism: 'hatsune',
      starlight_ward: 'hatsune', hex_crystal: 'kyaru', tactical_notes: 'kokkoro', healing_bell: 'yui'
    };
    return Object.keys(C.relics).filter(function (id) {
      return run.relics.indexOf(id) === -1 && (!ownerRequired[id] || run.heroIds.indexOf(ownerRequired[id]) !== -1) && relicAvailability(run, id).enabled;
    });
  }
  function resolvedCard(card) { var d = C.cards[card.defId]; return Object.assign({}, d, card.branch && d.branches[card.branch]); }
  function relicAvailability(run, id) {
    var special = ['shield_etching', 'blood_receipt', 'concert_ribbon', 'crooked_compass', 'spent_fuse', 'last_ember_locket'];
    if (special.indexOf(id) < 0) return { enabled: !!C.relics[id], reason: '' };
    if (run.layoutVersion !== 1 && run.act === 3 && run.stage === 4 && run.battle && run.battle.status !== 'active') return { enabled: false, reason: '终幕战斗已经结束，没有后续战斗。' };
    var cards = run.deck.map(resolvedCard), enabled = true, reason = '';
    if (id === 'shield_etching') {
      enabled = cards.some(function (c) { return (c.effects || []).some(function (e) { return e.type === 'heavy' && (e.cap || e.maxSpend || 0) >= 4; }); });
      reason = '需要至少一张仍可实际消耗4点护盾的普通攻击；重击A不满足。';
    } else if (id === 'spent_fuse') {
      enabled = cards.some(function (c) { return c.exhaust; }); reason = '需要至少一张本战使用后消耗的普通牌。';
    } else if (id === 'blood_receipt') {
      enabled = run.heroIds.some(function (owner) {
        var dp = [0, -Infinity, -Infinity, -Infinity];
        cards.filter(function (c) { return c.owner === owner; }).forEach(function (c) {
          var fee = (c.effects || []).reduce(function (n, e) { return n + (e.type === 'payHp' ? e.amount : 0); }, 0);
          for (var ap = 3; ap >= c.cost; ap--) dp[ap] = Math.max(dp[ap], dp[ap - c.cost] + fee);
        });
        return Math.max.apply(null, dp) >= 3;
      }); reason = '需要同一角色能在3行动内用现有普通牌累计支付至少3生命。';
    } else if (id === 'concert_ribbon') {
      enabled = run.heroIds.every(function (owner) { return cards.some(function (c) { return c.owner === owner; }); });
      reason = '三名角色都需要保留至少一张普通牌。';
    }
    return { enabled: enabled, reason: enabled ? '' : reason };
  }
  function heal(run, amount, percentage) {
    run.heroIds.forEach(function (id) {
      if (run.hp[id] <= 0) return;
      var maxHp = C.heroes[id].hp;
      var value = percentage ? Math.ceil(maxHp * amount) : amount;
      run.hp[id] = Math.min(maxHp, run.hp[id] + value);
    });
  }
  function create(options) {
    options = options || {};
    var ids = options.heroIds;
    if (!Array.isArray(ids) || ids.length !== 3 || new Set(ids).size !== 3 || ids.some(function (id) { return !C.heroes[id]; })) {
      throw new Error('请选择三名不同的有效角色。');
    }
    var seed = options.seed === undefined ? Date.now() : options.seed;
    var run = { version: 3, layoutVersion: 1, seed: seed, heroIds: ids.slice(), hp: {}, deck: [], relics: [], gold: 55,
      act: 1, stage: 0, screen: 'map', room: null, battle: null, reward: null,
      stats: { battles: 0, elites: 0, bosses: 0, rounds: 0 }, history: [],
      rngState: hash(seed), nextCardUid: 1, mapChoices: {}, rewardQueue: [], bossByAct: {}, eventsSeen: [], campDebt: {}, swapsByAct: {} };
    ids.forEach(function (id) {
      run.hp[id] = C.heroes[id].hp;
      Object.keys(C.cards).filter(function (key) { return C.cards[key].owner === id && C.cards[key].starter; }).forEach(function (key) {
        addCard(run, key); addCard(run, key);
      });
    });
    if (run.deck.length !== 18) throw new Error('起始牌组必须恰好18张。');
    chooseActBoss(run);
    return run;
  }
  function choices(run) {
    if (!run || run.screen !== 'map' || run.result) return [];
    normalize(run); chooseActBoss(run);
    var key = run.act + ':' + run.stage;
    if (run.mapChoices[key]) return clone(run.mapChoices[key]);
    var act = actDef(run), list = [], step = currentStep(run);
    if (!act) return list;
    function battleChoice(id) {
      var enc = C.encounters[id];
      return { id: 'battle:' + id, name: enc.name, text: enc.description, icon: enc.type === 'boss' ? '♛' : enc.type === 'elite' ? '⚔' : '⚑', type: enc.type, encounterId: id };
    }
    if (!step) return [];
    if (step.key === 'battle') {
      var firstBattles = act.battles;
      if (run.layoutVersion === 1 && run.act === 2) firstBattles = ['starlit_dual', act.battles[1]];
      if (run.layoutVersion === 1 && run.act === 3) firstBattles = ['starlit_core', act.battles[1]];
      list = firstBattles.map(battleChoice);
    } else if (step.key === 'event') {
      var event = sample(run, eligibleEvents(run), 1)[0];
      if (!event) return [];
      list = [{ id: 'event:' + event.id, name: event.name, text: event.text, icon: '✦', type: 'event', eventId: event.id }];
    } else if (step.key === 'commander') {
      list = [battleChoice('starlit_commander')];
      list[0].text += ' 本战10金币，不另选卡；下个挑战的金币减少10，卡牌与精英遗物照常。';
    } else if (step.key === 'challenge') {
      list = [battleChoice(sample(run, act.battles, 1)[0]), battleChoice(sample(run, act.elites, 1)[0])];
    } else if (step.key === 'service') {
      list = [{ id: 'camp', name: '旅途营地', text: '免费为全队回复35%最大生命，或升级一张未升级卡。', icon: '♨', type: 'camp' },
        { id: 'shop', name: '行商的帐篷', text: '用金币购买补给、卡牌与遗物，也可付费升级或删牌。', icon: '◈', type: 'shop' }];
      if (run.campDebt[run.act] && run.campDebt[run.act].status === 'owed') list = [list[1], { id: 'skip-service', name: '继续前进', text: '泉眼已预支本幕免费营地；保留金币，直接迎战本幕Boss。', icon: '→', type: 'pass' }];
    } else if (step.key === 'boss') list = [battleChoice(run.bossByAct[run.act])];
    run.mapChoices[key] = clone(list);
    return clone(list);
  }
  function enter(run, choiceId) {
    if (run.screen !== 'map' || run.result) return no('当前不能进入新节点。');
    var choice = choices(run).find(function (item) { return item.id === choiceId; });
    if (!choice) return no('这个节点当前不可选。');
    var room = clone(choice);
    if (choice.encounterId) {
      var combat = combatOverride || getCombat();
      if (!combat || typeof combat.createBattle !== 'function') return no('战斗系统尚未准备好。');
      var battle;
      try {
        battle = combat.createBattle({ heroIds: run.heroIds.slice(), deck: clone(run.deck), encounterId: choice.encounterId,
          relics: run.relics.slice(), hp: clone(run.hp), seed: String(run.seed) + ':' + run.act + ':' + run.stage + ':' + choice.encounterId });
      } catch (error) { return no('无法开始战斗：' + error.message); }
      run.battle = battle;
      run.screen = 'battle';
    } else if (choice.type === 'event') {
      room.event = clone(C.events.find(function (item) { return item.id === choice.eventId; }));
      if (run.eventsSeen.indexOf(choice.eventId) < 0) run.eventsSeen.push(choice.eventId);
      run.screen = 'event';
    } else if (choice.type === 'shop') {
      room.stock = { relics: sample(run, relicPool(run), 2), cards: sample(run, cardPool(run), 3) };
      room.purchased = [];
      room.prices = clone(PRICES);
      run.screen = 'shop';
    } else if (choice.type === 'pass') {
      if (run.campDebt[run.act]) run.campDebt[run.act].status = 'spent';
      record(run, 'skipService', { reason: 'springAdvance' }); completeNode(run); return ok('本幕营地已预支，继续前进。');
    } else run.screen = 'camp';
    run.room = room;
    record(run, 'enter', { choiceId: choiceId, encounterId: choice.encounterId || null });
    return ok('进入' + choice.name + '。');
  }
  function completeNode(run) {
    run.stage += 1;
    run.room = null; run.battle = null; run.reward = null; run.rewardQueue = [];
    if (run.stage >= mapSteps(run).length) {
      if (run.act >= 3) {
        run.screen = 'result'; run.result = 'won';
        record(run, 'complete', { result: 'won' });
        return;
      }
      run.act += 1; run.stage = 0;
      heal(run, 0.35, true);
      chooseActBoss(run);
      record(run, 'actRecovery', { percentage: 35 });
    }
    run.screen = 'map';
  }
  function rewardSpec(run, type, source) {
    var options = type === 'upgrade' ? run.deck.filter(function (card) { return !card.branch; }).map(function (card) { return card.uid; }) : sample(run, type === 'card' ? cardPool(run) : relicPool(run), 3);
    return { type: type, options: options, source: source };
  }
  function advanceReward(run) {
    while (run.rewardQueue.length) {
      var next = run.rewardQueue.shift();
      if (next.type === 'upgrade') {
        next.options = next.options.filter(function (uid) { return run.deck.some(function (card) { return card.uid === uid && !card.branch; }); });
        if (!next.options.length) continue;
      }
      run.reward = next;
      run.screen = 'reward';
      return;
    }
    completeNode(run);
  }
  function openRewards(run, specs) {
    run.rewardQueue = specs;
    advanceReward(run);
  }
  function finishBattle(run) {
    if (run.echo && run.echo.status === 'active') return finishEcho(run);
    var battle = run.battle;
    if (!battle || run.screen !== 'battle' || battle.runSettled) return no('这场战斗已经结算，或当前没有待结算战斗。');
    if (battle.status !== 'won' && battle.status !== 'lost') return no('战斗尚未结束。');
    var allDown = run.heroIds.every(function (id) {
      var member = battle.party.find(function (item) { return item.uid === id || item.id === id; });
      return member ? member.hp <= 0 : run.hp[id] <= 0;
    });
    if (battle.status === 'lost' && !allDown) return no('仍有队员可以作战，不能结算为全队战败。');
    run.heroIds.forEach(function (id) {
      var hero = battle.party.find(function (item) { return item.uid === id || item.id === id; });
      if (hero) run.hp[id] = Math.max(0, Math.min(C.heroes[id].hp, hero.hp));
    });
    var lost = allDown;
    var type = C.encounters[battle.encounterId || run.room.encounterId].type;
    battle.runSettled = true;
    run.stats.battles += 1;
    run.stats.rounds += Number.isFinite(battle.round) ? battle.round : 0;
    record(run, 'battle', { encounterId: battle.encounterId || run.room.encounterId, result: lost ? 'lost' : 'won', rounds: battle.round || 0 });
    if (lost) {
      run.screen = 'result'; run.result = 'lost'; run.reward = null; run.rewardQueue = [];
      return ok('全队倒地，远征失败。');
    }
    if (type === 'elite') run.stats.elites += 1;
    if (type === 'boss') run.stats.bosses += 1;
    var shortEncounter = run.layoutVersion === 1 && currentStep(run).key === 'commander';
    var gold = type === 'boss' ? 50 : type === 'elite' ? 35 : 20;
    if (shortEncounter) gold = 10;
    else if (run.layoutVersion === 1 && run.act === 2 && currentStep(run).key === 'challenge') gold -= 10;
    run.gold += gold;
    // Surviving members retain the existing +2 (and combat's separate holy_cup).
    // Downed members recover exactly 25%, not 25% followed by that survivor heal.
    var revived = [];
    run.heroIds.forEach(function (id) {
      if (run.hp[id] > 0) run.hp[id] = Math.min(C.heroes[id].hp, run.hp[id] + 2);
      else {
        run.hp[id] = Math.max(1, Math.ceil(C.heroes[id].hp * 0.25));
        var recovery = { heroId: id, hp: run.hp[id] }; revived.push(recovery);
        record(run, 'revive', { heroId: id, hp: run.hp[id], percentage: 25 });
      }
    });
    battle.revivals = clone(revived);
    var rewards = [];
    if (!shortEncounter) {
      if (type === 'elite' || type === 'boss') rewards.push(rewardSpec(run, 'relic', 'battle'));
      if (type === 'boss') rewards.push(rewardSpec(run, 'upgrade', 'battle'));
      rewards.push(rewardSpec(run, 'card', 'battle'));
    }
    openRewards(run, rewards);
    return ok('战斗胜利，获得' + gold + '金币，' + (revived.length ? '存活队友各回复2生命；倒地队友以25%最大生命重返队伍。' : '全队各回复2生命。'), { revived: clone(revived) });
  }
  function takeReward(run, index, selection) {
    if (run.screen !== 'reward' || !run.reward) return no('当前没有可领取的奖励。');
    var reward = run.reward;
    if (index !== 'skip' && (!Number.isInteger(index) || index < 0 || index >= reward.options.length)) return no('请选择有效奖励或跳过。');
    var id = index === 'skip' ? null : reward.options[index];
    var name;
    if (id && reward.type === 'upgrade') {
      selection = selection || {};
      if (selection.cardUid && selection.cardUid !== id) return no('升级选项与指定卡牌不一致。');
      var upgrade = { cardUid: id, branch: selection.branch };
      var checked = selectionCheck(run, 'upgrade', upgrade);
      if (!checked.ok) return checked;
      name = C.cards[checked.card.defId].branches[selection.branch].name;
      applySelection(run, 'upgrade', upgrade);
    }
    if (index === 'skip' && reward.type === 'card') run.gold += 8;
    if (id && reward.type === 'card') {
      if (!C.cards[id] || run.heroIds.indexOf(C.cards[id].owner) < 0) return no('这张卡不属于当前队伍。');
      addCard(run, id);
    } else if (id && reward.type === 'relic') {
      if (!C.relics[id] || run.relics.indexOf(id) !== -1) return no('无法重复领取这件遗物。');
      run.relics.push(id);
    }
    record(run, 'reward', { rewardType: reward.type, id: id, branch: id && reward.type === 'upgrade' ? selection.branch : null });
    advanceReward(run);
    return ok(id ? reward.type === 'upgrade' ? '升级为' + name + '。' : '获得' + (C.cards[id] || C.relics[id]).name + '。' : reward.type === 'card' ? '跳过卡牌奖励，获得8金币。' : reward.type === 'upgrade' ? '跳过升级。' : '跳过遗物奖励。');
  }
  function swapOptions(run, index) {
    var reason = '', cards = [], reward = run && run.reward;
    if (!run || run.screen !== 'reward' || !reward || reward.type !== 'card') reason = '当前没有卡牌奖励可换招。';
    else if (run.layoutVersion !== 1 || (run.act !== 1 && run.act !== 2)) reason = '换招只在新版远征的第一、二幕开放。';
    else if ((run.swapsByAct || {})[run.act]) reason = '本幕已经换招；每幕最多一次。';
    else if (!Number.isInteger(index) || index < 0 || index >= reward.options.length || !C.cards[reward.options[index]]) reason = '请选择当前展示的一张奖励牌。';
    else {
      var owner = C.cards[reward.options[index]].owner;
      if (run.heroIds.indexOf(owner) < 0) reason = '这张奖励牌不属于当前队伍。';
      else cards = run.deck.filter(function (card) {
        var def = C.cards[card.defId];
        return def && def.owner === owner && def.starter && !card.branch && run.deck.filter(function (other) { return other.defId === card.defId; }).length >= 2;
      }).map(clone);
      if (!reason && !cards.length) reason = '该角色没有可替换的未升级起手副本；每种起手至少保留一张。';
      if (!reason && run.gold < 40) reason = '换招需要40金币。';
    }
    return { enabled: !reason, reason: reason, cost: 40, cards: cards };
  }
  function swapReward(run, index, cardUid) {
    var offer = swapOptions(run, index);
    if (!offer.enabled) return no(offer.reason);
    var old = offer.cards.find(function (card) { return card.uid === cardUid; });
    if (!old) return no('请选择该角色可替换的未升级起手副本。');
    var next = clone(run), id = next.reward.options[index], act = next.act;
    next.gold -= 40;
    next.deck.splice(next.deck.findIndex(function (card) { return card.uid === cardUid; }), 1);
    var gained = addCard(next, id);
    next.swapsByAct = next.swapsByAct || {}; next.swapsByAct[act] = true;
    record(next, 'swapReward', { fromUid: old.uid, fromDefId: old.defId, toUid: gained.uid, toDefId: id, cost: 40 });
    advanceReward(next);
    Object.assign(run, next);
    return ok('支付40金币，将' + C.cards[old.defId].name + '换为' + C.cards[id].name + '，牌组张数不变。');
  }
  function echoChoices(run) {
    if (!run || run.layoutVersion !== 1 || run.result !== 'won' || run.screen !== 'result' || run.echo) return [];
    var encountered = (run.history || []).filter(function (entry) { return entry.type === 'battle'; }).map(function (entry) { return entry.encounterId; });
    return C.acts.filter(function (act) { return act.id < 3; }).reduce(function (pool, act) { return pool.concat(act.bosses || [act.boss]); }, []).filter(function (id) { return encountered.indexOf(id) < 0; }).map(function (sourceId) {
      var source = C.encounters[sourceId], enc = C.encounters['echo_' + source.bossId];
      return { id: enc.id, name: enc.name, text: enc.description, sourceEncounterId: enc.sourceEncounterId, bossId: source.bossId };
    });
  }
  function startEcho(run, encounterId) {
    var choice = echoChoices(run).find(function (item) { return item.id === encounterId; });
    if (!choice) return no('该回响当前不可选；每局最多挑战一次。');
    var combat = combatOverride || getCombat(), fullHp = {};
    run.heroIds.forEach(function (id) { fullHp[id] = C.heroes[id].hp; });
    var b;
    try { b = combat.createBattle({ heroIds: run.heroIds.slice(), deck: clone(run.deck), relics: run.relics.slice(), hp: fullHp, encounterId: encounterId, seed: String(run.seed) + ':echo:' + encounterId }); }
    catch (error) { return no('无法开始回响：' + error.message); }
    run.echo = { status: 'active', encounterId: encounterId, sourceEncounterId: choice.sourceEncounterId, name: choice.name, rounds: 0, outcome: null };
    run.room = { id: 'echo:' + encounterId, encounterId: encounterId, type: 'boss', name: choice.name, introSeen: false, echo: true };
    run.battle = b; run.screen = 'battle';
    return ok('进入单场回响。主线已通关，试炼胜负不改变远征结果。');
  }
  function finishEcho(run) {
    var b = run.battle;
    if (!b || run.screen !== 'battle' || !run.echo || run.echo.status !== 'active') return no('当前没有待结算的回响。');
    if (b.status !== 'won' && b.status !== 'lost') return no('回响尚未结束。');
    if (b.status === 'lost' && !b.party.every(function (hero) { return hero.hp <= 0; })) return no('仍有队员可以作战，不能结算为全队战败。');
    b.runSettled = true;
    run.echo.status = b.status; run.echo.outcome = b.status; run.echo.rounds = b.round || 0;
    run.echo.finalHp = {}; b.party.forEach(function (hero) { run.echo.finalHp[hero.id] = hero.hp; });
    run.battle = null; run.room = null; run.screen = 'result';
    return ok(b.status === 'won' ? '回响挑战完成。主线通关与远征收获保持原样。' : '回响结束。主线已经登顶，通关与远征收获保持原样。');
  }
  function exitEcho(run) {
    if (!run || run.screen !== 'battle' || !run.echo || run.echo.status !== 'active') return no('当前不在回响中。');
    run.echo.status = 'abandoned'; run.echo.outcome = 'abandoned'; run.echo.rounds = run.battle ? run.battle.round : 0;
    run.battle = null; run.room = null; run.screen = 'result';
    return ok('已离开回响，主线通关与收获保持原样。');
  }
  function selectionCheck(run, action, selection) {
    selection = selection || {};
    if (action === 'remove' && run.deck.length <= 12) return no('牌组至少保留12张，不能再移除。');
    if (action === 'upgrade' && !run.deck.some(function (card) { return !card.branch; })) return no('所有卡牌都已经升级。');
    if (!selection.cardUid) return no(action === 'upgrade' ? '选择一张未升级卡与A/B分支。' : '选择一张要移除的卡。', { pending: action });
    var card = run.deck.find(function (item) { return item.uid === selection.cardUid; });
    if (!card) return no('没有找到这张卡。');
    if (action === 'upgrade') {
      if (card.branch) return no('每张卡只能升级一次，A/B分支互斥。');
      if (selection.branch === undefined || selection.branch === null) return no('请选择A或B升级分支。', { pending: 'upgrade' });
      if ((selection.branch !== 'A' && selection.branch !== 'B') || !C.cards[card.defId].branches[selection.branch]) return no('升级分支无效。');
    }
    return ok('', { card: card });
  }
  function applySelection(run, action, selection) {
    if (action === 'upgrade') run.deck.find(function (item) { return item.uid === selection.cardUid; }).branch = selection.branch;
    else run.deck.splice(run.deck.findIndex(function (item) { return item.uid === selection.cardUid; }), 1);
  }
  function eventAvailability(run, event) {
    event = event || (run.room && run.room.event);
    if (!event) return [];
    return event.choices.map(function (choice, index) {
      var reasons = [], fee = choice.hpCost, payers = [], upgrades = run.deck.filter(function (c) { return !c.branch; });
      if (run.gold < (choice.cost || 0)) reasons.push('金币不足');
      if (choice.effect === 'upgrade' && !upgrades.length) reasons.push('没有未升级卡牌');
      if (choice.effect === 'remove' && run.deck.length <= 12) reasons.push('牌组已到12张下限');
      if (choice.effect === 'draft' && !cardPool(run).length) reasons.push('没有可学习的同行角色奖励牌');
      if (choice.effect === 'relic' && !relicPool(run).length) reasons.push('没有尚未持有的兼容遗物');
      if (fee) {
        payers = run.heroIds.filter(function (id) { return run.hp[id] > fee.amount; });
        if (fee.scope === 'party' && payers.length !== run.heroIds.length) reasons.push('需要三人都能付血并至少保留1生命');
        if (fee.scope === 'one' && !payers.length) reasons.push('没有能承担代价的存活队员');
        if (fee.scope === 'upgradeOwner' && !upgrades.some(function (c) { return payers.indexOf(C.cards[c.defId].owner) >= 0; })) reasons.push('没有能亲自付血的练习者与未升级牌');
      }
      if (choice.campAdvance && (run.stage >= 3 || run.campDebt && run.campDebt[run.act])) reasons.push('本幕免费营地已使用或已预支');
      var healPreview = choice.effect === 'heal' ? Object.fromEntries(run.heroIds.map(function (id) { return [id, run.hp[id] > 0 ? Math.min(choice.amount || 0, C.heroes[id].hp - run.hp[id]) : 0]; })) : null;
      return { index: index, enabled: !reasons.length, reason: reasons.join('；'), payableHeroes: payers, healPreview: healPreview,
        leave: choice.effect === 'gold' && !choice.amount && !choice.cost && !choice.hpCost };
    });
  }
  function eligibleEvents(run) {
    return C.events.filter(function (event) {
      if (event.acts && event.acts.indexOf(run.act) < 0) return false;
      if ((run.eventsSeen || []).indexOf(event.id) >= 0) return false;
      if (event.eligibility) {
        if (event.eligibility.livingHpRatioAtMost !== undefined && !run.heroIds.some(function (id) { return run.hp[id] > 0 && run.hp[id] / C.heroes[id].hp <= event.eligibility.livingHpRatioAtMost && run.hp[id] < C.heroes[id].hp; })) return false;
        if (event.eligibility.requiresUnusedCamp && (run.stage >= 3 || run.campDebt && run.campDebt[run.act])) return false;
      }
      return eventAvailability(run, event).some(function (option) {
        if (!option.enabled || option.leave) return false;
        return !option.healPreview || Object.values(option.healPreview).some(function (n) { return n > 0; });
      });
    });
  }
  function eventChoice(run, index, selection) {
    if (run.screen !== 'event' || !run.room || !run.room.event) return no('当前不在事件中。');
    var event = run.room.event;
    var choice = Number.isInteger(index) ? event.choices[index] : null;
    if (!choice) return no('事件选项无效。');
    selection = selection || {};
    var availability = eventAvailability(run, event)[index];
    if (!availability.enabled) return no(availability.reason);
    var cost = choice.cost || 0;
    if (run.gold < cost) return no('金币不足。');
    if (choice.effect === 'upgrade' || choice.effect === 'remove') {
      var checked = selectionCheck(run, choice.effect, selection);
      if (!checked.ok) return checked;
    }
    if (['heal', 'gold', 'upgrade', 'remove', 'relic', 'draft'].indexOf(choice.effect) < 0) return no('此事件效果暂不可用。');
    if (choice.effect === 'relic' && !relicPool(run).length) return no('没有尚未持有的遗物。');
    var payers = [], fee = choice.hpCost;
    if (fee && fee.scope === 'upgradeOwner') {
      var owner = C.cards[run.deck.find(function (card) { return card.uid === selection.cardUid; }).defId].owner;
      if (selection.heroId && selection.heroId !== owner) return no('只能由练习者本人支付生命，不能让同伴代付。');
      payers = [owner];
    } else if (fee && fee.scope === 'party') payers = run.heroIds.slice();
    else if (fee) {
      if (!selection.heroId) return no('请选择一名队员承担4点生命代价。', { pending: 'hero', heroIds: availability.payableHeroes, hpCost: fee.amount });
      if (run.heroIds.indexOf(selection.heroId) < 0) return no('请选择本队存活队员。');
      payers = [selection.heroId];
    }
    if (fee && payers.some(function (id) { return run.hp[id] <= fee.amount; })) return no('支付生命后必须至少保留1生命。');
    // Preflight above is read-only. Commit a fully completed clone so invalid
    // UID/branch/payer/pool never consumes gold, HP or reward RNG.
    var next = clone(run); normalize(next);
    next.gold -= cost;
    payers.forEach(function (id) { next.hp[id] -= fee.amount; });
    if (choice.campAdvance) next.campDebt[next.act] = { source: event.id, status: 'owed' };
    if (choice.effect === 'heal') heal(next, choice.amount || 0, false);
    else if (choice.effect === 'gold') next.gold += choice.amount || 0;
    else if (choice.effect === 'upgrade' || choice.effect === 'remove') applySelection(next, choice.effect, selection);
    record(next, 'eventChoice', { eventId: event.id, index: index, effect: choice.effect, cost: cost, hpPaid: payers.map(function (id) { return { heroId: id, amount: fee.amount }; }), campAdvance: !!choice.campAdvance });
    if (choice.effect === 'relic' || choice.effect === 'draft') openRewards(next, [rewardSpec(next, choice.effect === 'draft' ? 'card' : 'relic', 'event')]);
    else completeNode(next);
    Object.assign(run, next);
    return ok(choice.label + '。');
  }
  function camp(run, action, selection) {
    if (run.screen !== 'camp') return no('当前不在营地。');
    if (run.campDebt && run.campDebt[run.act] && run.campDebt[run.act].status === 'owed') return no('本幕免费营地已预支，可自费进商店或继续前进。');
    if (action !== 'heal' && action !== 'upgrade') return no('营地选项无效。');
    if (action === 'upgrade') {
      var checked = selectionCheck(run, action, selection);
      if (!checked.ok) return checked;
      applySelection(run, action, selection);
    } else heal(run, 0.35, true);
    record(run, 'camp', { action: action });
    completeNode(run);
    return ok(action === 'heal' ? '全队各回复35%最大生命。' : '卡牌已升级。');
  }
  function buy(run, product, selection) {
    if (run.screen !== 'shop' || !run.room || !run.room.stock) return no('当前不在商店。');
    if (typeof product !== 'string') return no('商品无效。');
    var parts = product.split(':'), kind = parts[0], id = parts[1];
    if (['heal', 'upgrade', 'remove', 'relic', 'card'].indexOf(kind) < 0 || ((kind === 'relic' || kind === 'card') !== !!id) || parts.length > 2) return no('商品无效。');
    if (run.room.purchased.indexOf(product) !== -1) return no('此商品或服务本次已经购买。');
    var price = PRICES[kind];
    if (run.gold < price) return no('金币不足，需要' + price + '金币。');
    if (kind === 'relic' && (run.room.stock.relics.indexOf(id) < 0 || run.relics.indexOf(id) >= 0)) return no('这件遗物不在库存，或已经持有。');
    if (kind === 'relic' && !relicAvailability(run, id).enabled) return no(relicAvailability(run, id).reason);
    if (kind === 'card' && (run.room.stock.cards.indexOf(id) < 0 || !C.cards[id] || run.heroIds.indexOf(C.cards[id].owner) < 0)) return no('这张卡不在当前队伍的商店库存。');
    if (kind === 'upgrade' || kind === 'remove') {
      var checked = selectionCheck(run, kind, selection);
      if (!checked.ok) return checked;
    }
    run.gold -= price;
    if (kind === 'heal') heal(run, 6, false);
    else if (kind === 'upgrade' || kind === 'remove') applySelection(run, kind, selection);
    else if (kind === 'relic') run.relics.push(id);
    else addCard(run, id);
    run.room.purchased.push(product);
    record(run, 'buy', { product: product, price: price });
    return ok('购买成功。');
  }
  function leaveShop(run) {
    if (run.screen !== 'shop') return no('当前不在商店。');
    record(run, 'leaveShop');
    if (run.campDebt && run.campDebt[run.act] && run.campDebt[run.act].status === 'owed') run.campDebt[run.act].status = 'spent';
    completeNode(run);
    return ok('继续前进。');
  }
  function setCombat(combat) {
    if (combat !== null && (!combat || typeof combat.createBattle !== 'function')) throw new Error('combat需要提供createBattle。');
    combatOverride = combat;
  }
  return { create: create, choices: choices, enter: enter, finishBattle: finishBattle, takeReward: takeReward,
    eventChoice: eventChoice, camp: camp, buy: buy, leaveShop: leaveShop, setCombat: setCombat, prices: clone(PRICES),
    normalize: normalize, publicBoss: publicBoss, relicAvailability: relicAvailability, eventAvailability: eventAvailability, eligibleEvents: eligibleEvents,
    mapSteps: mapSteps, currentStep: currentStep, swapOptions: swapOptions, swapReward: swapReward,
    echoChoices: echoChoices, startEcho: startEcho, exitEcho: exitEcho };
});
