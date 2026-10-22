(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    var content = null;
    try { content = require('./content.js'); } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND' || !String(error.message).includes("'./content.js'")) throw error;
    }
    module.exports = factory(content);
  } else root.TowerCombat = factory(root.TowerContent);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (initialContent) {
  'use strict';
  var C = initialContent || { heroes: {}, cards: {}, encounters: {}, relics: {} };
  var clone = function (x) { return JSON.parse(JSON.stringify(x)); };
  var alive = function (x) { return x && x.hp > 0; };
  var result = function (ok, message) { return { ok: ok, message: message }; };
  function event(b, type, source, target, amount, extra) {
    b.events.push(Object.assign({ type: type, source: source || null, target: target || null, amount: amount || 0 }, extra || {}));
  }
  function log(b, message) { b.log.push(message); }
  function relic(b, id) { return b.relics.includes(id); }
  function syncBreak(e, round) {
    if (!Array.isArray(e.breakLayers) || (!e.breakLayers.length && e.breakAmount > 0)) {
      e.breakLayers = e.breakAmount > 0 ? [{ amount: e.breakAmount, expires: e.breakExpires || round }] : [];
    }
    e.breakLayers = e.breakLayers.filter(function (layer) { return layer.amount > 0 && layer.expires >= round; });
    e.breakAmount = e.breakLayers.reduce(function (sum, layer) { return sum + layer.amount; }, 0);
    e.breakExpires = e.breakLayers.reduce(function (last, layer) { return Math.max(last, layer.expires); }, 0);
  }
  function normalizeBattle(b) {
    b.flags = b.flags || {}; b.battleFlags = b.battleFlags || {};
    b.downedPile = b.downedPile || []; b.exhaustPile = b.exhaustPile || [];
    if (b.previousPaidOwner === undefined) b.previousPaidOwner = null;
    if (b.nextConcertRound === undefined) b.nextConcertRound = 0;
    if (b.nextAttackPenalty === undefined) b.nextAttackPenalty = null;
    if (b.energyReserve === undefined) b.energyReserve = 0;
    if (b.turnEnergy === undefined) b.turnEnergy = Math.max(3, b.energy || 0);
    b.party.forEach(function (h) { h.flags = h.flags || {}; h.debuffs = h.debuffs || []; });
    b.enemies.forEach(function (e) { syncBreak(e, b.round); });
    if (b.pending && b.pending.type === 'guide' && b.pending.cards) b.pending.cardUids = b.pending.cards.map(function (c) { return c.uid; });
    normalizeSoloBoss(b);
    return b;
  }
  function normalizeSoloBoss(b) {
    var encounter = C.encounters[b.encounterId], revision = encounter && encounter.soloRevision;
    if (b.status !== 'active' || !encounter || encounter.type !== 'boss' || !(revision > 0) || b.bossSoloRevision >= revision || encounter.enemies.length !== 1) return;
    var def = encounter.enemies[0], core = b.enemies.find(function (e) { return e.uid === b.bossCoreUid; });
    // A broken/custom save must never promote a surviving escort into the Boss,
    // invent a fresh core or revive one. Its existing settlement still owns it.
    if (!core || core.id !== def.id || !Array.isArray(def.cycle) || !def.cycle.length) return;
    var oldIntent = core.intent || {}, lockedUid = oldIntent.lockedTargetUid === undefined ? oldIntent.targetUid : oldIntent.lockedTargetUid;
    core.cycle = clone(def.cycle);
    delete core.device; delete core.deviceAoe; delete core.maxSummons;
    b.enemies = [core];
    var intent = roundIntent(b, core), locked = hero(b, lockedUid);
    // Preserve a genuine living lock, even if the solo cycle now names another
    // target rule. Only an unavailable lock uses the deterministic fallback.
    if (!alive(locked)) locked = intent.targetUid ? hero(b, intent.targetUid) : null;
    if (!alive(locked)) locked = lockTarget(b, intent.target || 'front');
    intent.lockedTargetUid = locked ? locked.uid : null;
    core.intent = intent;
    // This is a forecast refresh, not prepare(): no guard/barrier grants, flags
    // reset, draw, TP, opening relics, new turn, event or random roll is replayed.
    refreshIntents(b);
    b.bossSoloRevision = revision;
  }
  function relicEvent(b, id, target, amount, extra) { event(b, 'relic', id, target, amount, Object.assign({ relicId: id }, extra || {})); }
  function rand(b) {
    var x = b.seed | 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    b.seed = x >>> 0;
    return b.seed / 4294967296;
  }
  function seedValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return (value >>> 0) || 2463534242;
    var text = String(value === undefined ? 'tower-default' : value), hash = 2166136261;
    for (var i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return (hash >>> 0) || 2463534242;
  }
  function shuffle(b, array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(rand(b) * (i + 1)), t = array[i]; array[i] = array[j]; array[j] = t;
    }
    return array;
  }
  function hero(b, id) { return b.party.find(function (h) { return h.uid === id; }); }
  function enemy(b, id) { return b.enemies.find(function (e) { return e.uid === id; }); }
  function lowest(b) {
    return b.party.filter(alive).reduce(function (a, h) { return !a || h.hp / h.maxHp < a.hp / a.maxHp ? h : a; }, null);
  }
  function targets(b, kind, owner) {
    var foes = b.enemies.filter(alive), friends = b.party.filter(alive);
    if (kind === 'enemy') {
      var front = foes.filter(function (e) { return !e.device && e.position !== 'back'; });
      return foes.filter(function (e) { return e.device || !front.length || e.position !== 'back'; }).map(function (e) { return e.uid; });
    }
    if (kind === 'enemyAny' || kind === 'allEnemies') return foes.map(function (e) { return e.uid; });
    if (kind === 'ally') return friends.map(function (h) { return h.uid; });
    if (kind === 'otherAlly') return friends.filter(function (h) { return h.uid !== owner; }).map(function (h) { return h.uid; });
    if (kind === 'self') return alive(hero(b, owner)) ? [owner] : [];
    return [];
  }
  function definition(card) {
    var def = C.cards[card.defId];
    if (!def) throw new Error('未知卡牌：' + card.defId);
    if (card.branch && !['A', 'B'].includes(card.branch)) throw new Error('未知升级分支。');
    var branch = card.branch && def.branches && def.branches[card.branch];
    if (card.branch && !branch) throw new Error('该卡没有此升级分支。');
    return Object.assign({}, def, branch || {}, { id: def.id || card.defId, owner: def.owner, tags: (branch && branch.tags) || def.tags || [] });
  }
  function cardView(card, b) {
    if (typeof card === 'string') card = b && b.hand.concat(b.drawPile || [], b.discardPile || [], b.exhaustPile || [], b.downedPile || [], b.pending && b.pending.type === 'guide' ? b.pending.cards || [] : []).find(function (c) { return c.uid === card; });
    if (!card) return null;
    return Object.assign({}, definition(card), { uid: card.uid, defId: card.defId, branch: card.branch || null });
  }
  function legalTargets(b, cardUid) {
    var card = b.hand.find(function (c) { return c.uid === cardUid; });
    if (!card || b.status !== 'active' || b.pending) return [];
    var d = definition(card);
    if (!alive(hero(b, d.owner)) || hero(b, d.owner).hp <= paidHpCost(d.effects)) return [];
    return targets(b, d.target, d.owner);
  }
  function legalBurstTargets(b, heroId) {
    var h = hero(b, heroId), def = h && C.heroes[h.id];
    if (!alive(h) || b.status !== 'active' || b.pending || !def || !def.burst || h.hp <= paidHpCost(def.burst.effects)) return [];
    return targets(b, def.burst.target, heroId);
  }
  function normalizeTarget(b, kind, owner, targetUid) {
    if (kind === 'none' || kind === 'allEnemies') return { ok: true, uid: targetUid || null };
    if (kind === 'self') targetUid = owner;
    return { ok: targets(b, kind, owner).includes(targetUid), uid: targetUid };
  }
  function tp(b, h, n) {
    if (!alive(h)) return;
    var before = h.tp; h.tp = Math.max(0, Math.min(6, h.tp + n));
    if (h.tp !== before) event(b, 'tp', null, h.uid, h.tp - before);
  }
  function block(b, h, n, source, ctx) {
    if (!alive(h) || n <= 0) return;
    var giver = hero(b, source), ordinary = ctx && ctx.kind === 'card';
    if (ordinary && source === 'miyako' && h.uid === source && h.block === 0 && !h.flags.miyako) { n += 2; h.flags.miyako = true; }
    if (ordinary && source === 'shizuru' && alive(giver) && !giver.flags.shizuru && h.hp <= h.maxHp / 2) { n += 2; giver.flags.shizuru = true; }
    if (relic(b, 'guard_badge') && !b.flags.guardBadge) { n += 2; b.flags.guardBadge = true; }
    h.block += n; event(b, 'block', source, h.uid, n);
    if (ordinary && source === 'nozomi' && alive(giver) && ctx.cost > 0 && ctx.tags.includes('support') && h.uid !== source && !giver.flags.nozomi) {
      giver.flags.nozomi = true; giver.buff = (giver.buff || 0) + (ctx.nozomiBuff || 2);
      event(b, 'passive', source, source, ctx.nozomiBuff || 2, { passive: 'nozomi', recipient: h.uid });
    }
  }
  function heal(b, h, n, source, allowTriggers) {
    if (!alive(h) || n <= 0 || h.hp >= h.maxHp) return;
    if (allowTriggers !== false && relic(b, 'healing_bell') && !b.battleFlags.healingBell) {
      b.battleFlags.healingBell = true; n += 2;
    }
    var actual = Math.min(n, h.maxHp - h.hp); h.hp += actual;
    event(b, 'heal', source, h.uid, actual);
    if (allowTriggers !== false && source === 'yui' && !b.battleFlags.yuiHeal) {
      b.battleFlags.yuiHeal = true; block(b, h, 3, 'yui');
    }
  }
  function suspendDowned(b) {
    if (!b.downedPile) b.downedPile = [];
    b.party.forEach(function (h) {
      if (alive(h)) return;
      var firstDown = !h.downed, removed = [];
      h.downed = true; h.block = 0; h.buff = 0; h.coverFrom = null; h.debuffs = [];
      b.party.forEach(function (friend) { if (friend.coverFrom === h.uid) friend.coverFrom = null; });
      ['hand', 'drawPile', 'discardPile'].forEach(function (zone) {
        b[zone] = b[zone].filter(function (card) {
          if (definition(card).owner !== h.id) return true;
          b.downedPile.push(card); removed.push(card.uid); return false;
        });
      });
      if (b.pending && b.pending.type === 'guide') {
        b.pending.cards = b.pending.cards.filter(function (card) {
          if (definition(card).owner !== h.id) return true;
          b.downedPile.push(card); removed.push(card.uid); return false;
        });
        if (!b.pending.cards.length) b.pending = null;
        else b.pending.cardUids = b.pending.cards.map(function (card) { return card.uid; });
      } else if (b.pending && b.pending.type === 'recoverTop' && b.pending.owner === h.uid) b.pending = null;
      else if (b.pending && b.pending.type === 'redraw') {
        b.pending.cardUids = b.pending.cardUids.filter(function (uid) { return b.drawPile.some(function (c) { return c.uid === uid; }); });
        if (!b.pending.cardUids.length || !b.hand.some(function (c) { return c.uid === b.pending.oldUid; })) b.pending = null;
      }
      if (firstDown) {
        log(b, h.name + '倒地，本场不能行动，其卡牌暂离本场战斗；其余队员继续作战。');
        event(b, 'downed', null, h.uid, 0, { cards: removed, round: b.round });
      }
    });
  }
  function checkEnd(b) {
    if (b.status !== 'active') return true;
    suspendDowned(b);
    if (!b.party.some(alive)) {
      b.status = 'lost'; b.pending = null;
      log(b, '全队倒地，本次远征失败。'); event(b, 'lost'); return true;
    }
    refreshIntents(b);
    if (!b.enemies.some(alive) || (b.bossCoreUid && !alive(enemy(b, b.bossCoreUid)))) {
      b.status = 'won'; b.pending = null;
      if (relic(b, 'holy_cup') && !b.battleFlags.holyCup) {
        b.battleFlags.holyCup = true; b.party.forEach(function (h) { heal(b, h, 2, 'holy_cup', false); });
      }
      log(b, '战斗胜利。'); event(b, 'win'); return true;
    }
    return false;
  }
  function refreshIntents(b) {
    b.enemies.forEach(function (e) {
      if (!e.intent) return;
      var intent = e.intent, n = intent.baseAmount === undefined ? intent.amount || 0 : intent.baseAmount;
      var hasDevice = b.enemies.some(function (foe) { return alive(foe) && foe.device; });
      if (!hasDevice && intent.amountWithoutDevice !== undefined) n = intent.amountWithoutDevice + (intent.increase || 0);
      if (intent.hitsWithDevice !== undefined) intent.hits = hasDevice ? intent.hitsWithDevice : intent.hitsWithoutDevice || 1;
      if (alive(e) && ['attack', 'curse'].includes(intent.type)) resolveIntentTarget(b, e);
      intent.unweakenedAmount = n;
      if (intent.type === 'attack') n = Math.max(0, n - (e.weak || 0));
      if (intent.type === 'aoe') {
        var perDevice = intent.perDevice || intent.deviceAoe || e.deviceAoe || 0;
        n += perDevice * b.enemies.filter(function (x) { return alive(x) && (x.device || (!b.enemies.some(function (z) { return z.device; }) && x.uid !== b.bossCoreUid)); }).length;
      }
      intent.amount = n; intent.damage = ['attack', 'aoe'].includes(intent.type) ? n : 0;
      intent.hitDamages = intent.type === 'attack' ? Array.from({ length: intent.hits || 1 }, function (_, i) { return i === 0 ? n : intent.unweakenedAmount; }) : intent.type === 'aoe' ? [n] : [];
      intent.totalDamage = intent.hitDamages.reduce(function (sum, amount) { return sum + amount; }, 0);
      intent.targetUid = intent.lockedTargetUid;
    });
  }
  function negative(e) { return !!(e.breakAmount || e.weak || e.curseExpires > 0 || e.stars > 0); }
  function hit(b, owner, e, amount, damageType, ctx, opts) {
    if (!alive(e) || b.status !== 'active') return 0;
    opts = opts || {}; var n = amount, active = ctx.active === true, armorIgnored = 0;
    ctx.primaryTargets = ctx.primaryTargets || {};
    var first = active && !ctx.primaryTargets[e.uid];
    if (active) ctx.primaryTargets[e.uid] = true;
    if (first && ctx.attackPenalty) n = Math.max(0, n - ctx.attackPenalty);
    if (active) {
      var h = hero(b, owner);
      if (first && !ctx.all && ctx.attackBonus) n += ctx.attackBonus;
      if (first && !ctx.all && owner === 'suzuna' && e.hp === e.maxHp && !h.flags.suzuna) { armorIgnored = 2; h.flags.suzuna = true; }
      if (owner === 'rei' && negative(e) && !h.flags.rei) { n += 2; h.flags.rei = true; }
      if (owner === 'kyaru' && e.position === 'back' && !h.flags.kyaru) { n += 2; h.flags.kyaru = true; }
      if (e.curseExpires >= b.round && e.curseExpires > 0 && e.curseUsedRound !== b.round) {
        n += 2; e.curseUsedRound = b.round;
      }
      if (!ctx.all && !ctx.buffUsed && h.buff) { n += h.buff; h.buff = 0; ctx.buffUsed = true; }
      if (!ctx.all && damageType === 'physical' && negative(e) && relic(b, 'wolf_fang') && !b.flags.wolfFang) { n += 2; b.flags.wolfFang = true; }
      if (!ctx.all && damageType === 'magic' && relic(b, 'witch_grimoire') && !b.flags.witchGrimoire) { n += 1; b.flags.witchGrimoire = true; }
      if (!ctx.all && e.position === 'back' && relic(b, 'silver_arrow') && !b.flags.silverArrow) { n += 1; b.flags.silverArrow = true; }
    }
    if (damageType === 'physical') n += e.breakAmount || 0;
    var resistance = damageType === 'physical' && !opts.ignoreArmor ? Math.max(0, (e.armor || 0) - armorIgnored) : 0;
    n = Math.max(0, n - resistance);
    var barrierAbsorbed = damageType === 'magic' ? Math.min(e.barrier || 0, n) : 0;
    if (damageType === 'magic') e.barrier -= barrierAbsorbed;
    n -= barrierAbsorbed;
    var shieldAbsorbed = Math.min(e.block || 0, n); e.block -= shieldAbsorbed; n -= shieldAbsorbed;
    var dealt = Math.min(e.hp, n); e.hp -= dealt;
    event(b, 'hit', owner, e.uid, dealt, { damageType: damageType, absorbed: barrierAbsorbed + shieldAbsorbed, sourceKind: ctx.kind, raw: amount });
    log(b, (hero(b, owner) || { name: owner }).name + ' → ' + e.name + '：' + dealt + (barrierAbsorbed + shieldAbsorbed ? '（吸收' + (barrierAbsorbed + shieldAbsorbed) + '）' : ''));
    if (active && dealt + shieldAbsorbed + barrierAbsorbed > 0 && e.intent && e.intent.reflect && !e.flags.reflected) {
      e.flags.reflected = true;
      if (!ctx.reactions.some(function (x) { return x.enemy === e.uid; })) ctx.reactions.push({ enemy: e.uid, target: owner, amount: e.intent.reflect });
    }
    if (dealt > 0 && ctx.kind === 'star' && relic(b, 'starlight_ward') && !b.flags.starlightWard) {
      b.flags.starlightWard = true; block(b, lowest(b), 2, 'starlight_ward');
    }
    refreshIntents(b); checkEnd(b); return dealt;
  }
  function hurt(b, e, h, n, single, kind, options) {
    if (!alive(h) || b.status !== 'active') return;
    if (single && h.coverFrom) {
      var cover = hero(b, h.coverFrom); h.coverFrom = null;
      if (alive(cover)) h = cover;
    }
    if (options && options.stripBlock) {
      var stripped = Math.min(h.block, options.stripBlock); h.block -= stripped;
      if (stripped) event(b, 'stripBlock', e && e.uid, h.uid, stripped);
    }
    if (kind === 'enemy' && h.debuffs) {
      var vulnerability = h.debuffs.filter(function (x) { return x.type === 'vulnerable' && x.expires >= b.round; });
      if (vulnerability.length) {
        n += vulnerability.reduce(function (sum, layer) { return sum + layer.amount; }, 0);
        h.debuffs = h.debuffs.filter(function (x) { return vulnerability.indexOf(x) < 0; });
      }
    }
    var absorbed = Math.min(h.block, Math.max(0, n)); h.block -= absorbed;
    var dealt = Math.min(h.hp, Math.max(0, n - absorbed));
    if (kind === 'enemy' && dealt >= h.hp && relic(b, 'last_ember_locket') && !b.battleFlags.lastEmber) {
      b.battleFlags.lastEmber = true; var saved = dealt - (h.hp - 1), spentTp = h.tp;
      dealt = h.hp - 1; tp(b, h, -spentTp);
      relicEvent(b, 'last_ember_locket', h.uid, saved, { tpSpent: spentTp, prevented: saved });
    }
    h.hp -= dealt;
    event(b, 'hit', e ? e.uid : null, h.uid, dealt, { absorbed: absorbed, sourceKind: kind || 'enemy', raw: n });
    log(b, (e ? e.name : '状态') + ' → ' + h.name + '：' + dealt + (absorbed ? '（吸收' + absorbed + '）' : ''));
    if (checkEnd(b)) return h;
    if (kind === 'enemy' && single && absorbed > 0 && alive(h) && h.id === 'pecorine' && !h.flags.counter && alive(e)) {
      h.flags.counter = true;
      hit(b, h.uid, e, relic(b, 'counter_medal') ? 5 : 3, 'physical', { active: false, all: false, kind: 'counter', reactions: [] });
    }
    return h;
  }
  function drawOne(b) {
    while (true) {
      if (!b.drawPile.length && b.discardPile.length) {
        b.drawPile = shuffle(b, b.discardPile.splice(0));
        event(b, 'shuffle'); log(b, '弃牌堆重洗。');
      }
      var card = b.drawPile.shift();
      if (!card) return null;
      if (alive(hero(b, definition(card).owner))) return card;
      if (!b.downedPile) b.downedPile = [];
      b.downedPile.push(card);
    }
  }
  function draw(b, n) { for (var i = 0; i < n; i++) { var c = drawOne(b); if (c) b.hand.push(c); } }
  function effectFriends(b, effect, owner, target) {
    if (effect.to === 'all') return b.party.filter(alive);
    if (effect.to === 'allOther') return b.party.filter(function (h) { return alive(h) && h.uid !== owner; });
    if (effect.to === 'otherLowest') return b.party.filter(function (h) { return alive(h) && h.uid !== owner; }).reduce(function (list, h) { return !list.length || h.hp / h.maxHp < list[0].hp / list[0].maxHp ? [h] : list; }, []);
    if (effect.to === 'lowest') return [lowest(b)].filter(Boolean);
    if (effect.to === 'self') return [hero(b, owner)].filter(alive);
    return [hero(b, target)].filter(alive);
  }
  function effectEnemies(b, effect, target) { return effect.all ? b.enemies.filter(alive) : [enemy(b, target)].filter(alive); }
  function effects(b, list, owner, target, ctx, options) {
    for (var i = 0; i < list.length && b.status === 'active'; i++) {
      var fx = list[i], es, hs;
      if (fx.type === 'hit' || fx.type === 'heavy' || fx.type === 'curseHit') {
        es = effectEnemies(b, fx, target); var allBefore = ctx.all; ctx.all = !!fx.all;
        es.forEach(function (e) {
          if (b.status !== 'active') return;
          var amount = fx.amount || 0;
          if (fx.executeAmount !== undefined && e.hp <= e.maxHp * (fx.executeThreshold === undefined ? 0.5 : fx.executeThreshold)) amount = fx.executeAmount;
          if (fx.afterOtherAmount !== undefined && ctx.previousPaidOwner && ctx.previousPaidOwner !== owner) amount = fx.afterOtherAmount;
          if (fx.afterDrawBonus && b.flags.extraHand) amount += fx.afterDrawBonus;
          if (fx.type === 'heavy') {
            var h = hero(b, owner), step = fx.step || 2;
            var spend = Math.floor(Math.min(h.block, fx.cap || 0, Math.max(0, Number(options.spendBlock) || 0)) / step) * step;
            h.block -= spend; amount += spend / step * (fx.bonus || 0);
            if (spend) { ctx.spentBlock = (ctx.spentBlock || 0) + spend; event(b, 'spendBlock', owner, owner, spend); }
          }
          var hadCurse = e.curseExpires >= b.round && e.curseExpires > 0;
          var detonate = fx.type === 'curseHit' && hadCurse && fx.consume !== false && options.consumeCurse !== false;
          if (detonate) amount += fx.detonateBonus || 0;
          for (var k = 0; k < (fx.hits || 1) && alive(e) && b.status === 'active'; k++) hit(b, owner, e, amount, fx.damageType || (fx.type === 'curseHit' ? 'magic' : 'physical'), ctx, fx);
          if (fx.type === 'curseHit' && hadCurse) {
            if (detonate) { e.curseExpires = 0; e.curseUsedRound = 0; }
            else if (fx.extend) e.curseExpires += fx.extend;
          }
        }); ctx.all = allBefore;
      } else if (fx.type === 'block' || fx.type === 'heal' || fx.type === 'tp' || fx.type === 'cleanse') {
        hs = effectFriends(b, fx, owner, target);
        hs.forEach(function (h) {
          if (fx.type === 'block') {
            var shield = fx.amount || 0;
            if (fx.halfBonus && h.hp <= h.maxHp / 2) shield += fx.halfBonus;
            if (fx.afterOtherBonus && ctx.previousPaidOwner && ctx.previousPaidOwner !== owner) shield += fx.afterOtherBonus;
            block(b, h, shield, owner, ctx);
          }
          else if (fx.type === 'heal') heal(b, h, fx.amount, owner);
          else if (fx.type === 'tp') tp(b, h, fx.amount);
          else {
            var types = [];
            h.debuffs.forEach(function (layer) { if (types.length < (fx.amount || 1) && types.indexOf(layer.type) < 0) types.push(layer.type); });
            h.debuffs = h.debuffs.filter(function (layer) { return types.indexOf(layer.type) < 0; });
            event(b, 'cleanse', owner, h.uid, types.length);
          }
        });
      } else if (fx.type === 'cover') {
        var friend = hero(b, target); if (friend && friend.uid !== owner) friend.coverFrom = owner;
      } else if (fx.type === 'buff') {
        effectFriends(b, fx, owner, target).forEach(function (recipient) { recipient.buff = (recipient.buff || 0) + fx.amount; });
      } else if (fx.type === 'guide') {
        var count = fx.count || 3;
        if (relic(b, 'tactical_notes') && !b.battleFlags.tacticalNotes) { count++; b.battleFlags.tacticalNotes = true; }
        var choices = []; for (var q = 0; q < count; q++) { var c = drawOne(b); if (c) choices.push(c); }
        if (choices.length) { b.pending = { type: 'guide', cards: choices, cardUids: choices.map(function (c) { return c.uid; }) }; event(b, 'guide', owner, null, choices.length); }
      } else if (fx.type === 'draw') {
        var handBefore = b.hand.length; draw(b, fx.amount);
        if (b.hand.length > handBefore && ctx.kind === 'card') b.flags.extraHand = true;
      } else if (fx.type === 'payHp') {
        var payer = hero(b, owner), payment = fx.amount || 0;
        payer.hp -= payment; ctx.paidHp = (ctx.paidHp || 0) + payment; event(b, 'payHp', owner, owner, payment);
        if (ctx.kind === 'card' && owner === 'anna' && payment > 0 && !payer.flags.anna) {
          payer.flags.anna = true;
          b.enemies.filter(alive).forEach(function (foe) { hit(b, owner, foe, 1, 'magic', { active: false, all: true, kind: 'passive', reactions: [] }); });
        }
      } else if (fx.type === 'consumeBreak') {
        effectEnemies(b, fx, target).forEach(function (foe) {
          if (!foe.breakAmount) return;
          var consumed = foe.breakAmount; foe.breakAmount = 0; foe.breakExpires = 0; foe.breakLayers = [];
          event(b, 'consumeBreak', owner, foe.uid, consumed);
          var consumer = hero(b, owner);
          if (owner === 'makoto' && !consumer.flags.makoto) { consumer.flags.makoto = true; block(b, consumer, 3, owner); }
        });
      } else if (fx.type === 'stripBarrier') {
        effectEnemies(b, fx, target).forEach(function (foe) { var stripped = Math.min(foe.barrier, fx.amount || 0); foe.barrier -= stripped; event(b, 'stripBarrier', owner, foe.uid, stripped); });
      } else if (fx.type === 'recover') {
        var recoverable = b.discardPile.filter(function (c) { var d = definition(c); return d.owner === owner && !d.exhaust; }).map(function (c) { return c.uid; });
        if (recoverable.length) {
          b.pending = { type: 'recoverTop', owner: owner, count: Math.min(2, fx.count || 1), cardUids: recoverable, selectedUids: [] };
          event(b, 'recoverTop', owner, null, b.pending.count, { cardUids: recoverable.slice() });
        }
      }
      else if (fx.type === 'debuff') {
        effectFriends(b, fx, owner, target).forEach(function (h) { applyDebuff(b, h, fx.status || 'vulnerable', fx.amount || 2, fx.turns || 1); });
      }
      else if (['break', 'weak', 'curse', 'stars', 'starPulse', 'dispel'].includes(fx.type)) {
        es = effectEnemies(b, fx, target);
        var pulseLayers = es.map(function (e) { return e.stars; }), consumedStars = false;
        es.forEach(function (e, enemyIndex) {
          if (fx.type === 'break') { syncBreak(e, b.round); e.breakLayers.push({ amount: fx.amount, expires: b.round + (fx.turns || 1) - 1 }); syncBreak(e, b.round); }
          if (fx.type === 'weak') { e.weak = (e.weak || 0) + fx.amount; refreshIntents(b); }
          if (fx.type === 'curse') {
            var turns = fx.turns || 2;
            if (relic(b, 'hex_crystal') && !b.battleFlags.hexCrystal) { turns++; b.battleFlags.hexCrystal = true; }
            e.curseExpires = Math.max(e.curseExpires || 0, b.round + turns - 1);
          }
          if (fx.type === 'stars') {
            var stars = fx.amount;
            if (relic(b, 'star_book') && !b.battleFlags.starBook && ctx.defId === 'hatsune_mark') { stars++; b.battleFlags.starBook = true; }
            e.stars = Math.min(3, e.stars + stars);
          }
          if (fx.type === 'starPulse') {
            var layers = pulseLayers[enemyIndex];
            if (layers > 0) hit(b, owner, e, layers * (fx.multiplier || 1), 'magic', { active: false, all: !!fx.all, kind: 'star', reactions: [] });
            if (fx.consume) { e.stars = 0; if (layers > 0) consumedStars = true; }
          }
          if (fx.type === 'dispel') {
            var remaining = fx.amount || 1;
            if (remaining && e.barrier > 0) { e.barrier = 0; remaining--; }
            if (remaining && e.armorBonus > 0) { e.armor -= e.armorBonus; e.armorBonus = 0; remaining--; }
            if (remaining && e.attackBuff > 0) { e.attackBuff = 0; remaining--; }
          }
        });
        if (fx.type === 'starPulse' && consumedStars && ctx.defId === 'hatsune_meteor' && relic(b, 'ember_prism') && !b.flags.emberPrism) {
          b.flags.emberPrism = true; var primary = enemy(b, target), newTarget = alive(primary) ? primary : b.enemies.find(alive);
          if (newTarget && b.status === 'active') newTarget.stars = Math.min(3, newTarget.stars + 2);
        }
      }
    }
  }
  function gate(b) {
    normalizeBattle(b);
    if (b.status !== 'active') return result(false, b.status === 'lost' ? '本次远征已失败。' : '战斗已结束。');
    if (b.pending) return result(false, '请先完成当前选牌。');
    return null;
  }
  function reactions(b, ctx) {
    ctx.reactions.forEach(function (r) {
      var e = enemy(b, r.enemy);
      if (b.status === 'active' && alive(e)) hurt(b, e, hero(b, r.target), r.amount, true, 'reflect');
    });
  }
  function paidHpCost(list) { return (list || []).reduce(function (n, fx) { return n + (fx.type === 'payHp' ? Math.max(0, fx.amount || 0) : 0); }, 0); }
  function afterCard(b, card, d, h, ctx) {
    if (b.status !== 'active' || !alive(h)) return;
    b.flags.paidHp = b.flags.paidHp || {};
    b.flags.paidHp[h.uid] = (b.flags.paidHp[h.uid] || 0) + (ctx.paidHp || 0);
    if (relic(b, 'blood_receipt') && !b.flags.bloodReceipt && b.flags.paidHp[h.uid] >= 3) {
      b.flags.bloodReceipt = true; block(b, h, 4, 'blood_receipt');
      relicEvent(b, 'blood_receipt', h.uid, 4, { paidHp: b.flags.paidHp[h.uid] });
    }
    if (d.exhaust && relic(b, 'spent_fuse') && (b.battleFlags.spentFuse || 0) < 2 && b.exhaustPile.some(function (c) { return c.uid === card.uid; })) {
      var foe = b.enemies.filter(alive).reduce(function (best, e) { return !best || e.hp < best.hp ? e : best; }, null);
      if (foe) {
        b.battleFlags.spentFuse = (b.battleFlags.spentFuse || 0) + 1;
        relicEvent(b, 'spent_fuse', foe.uid, 3, { cardUid: card.uid, count: b.battleFlags.spentFuse });
        hit(b, 'spent_fuse', foe, 3, 'magic', { active: false, all: false, kind: 'relic', reactions: [] });
      }
    }
    if (b.status !== 'active') return;
    if (relic(b, 'concert_ribbon')) {
      b.flags.normalOwners = b.flags.normalOwners || [];
      if (!b.flags.normalOwners.includes(h.uid)) b.flags.normalOwners.push(h.uid);
      if (!b.flags.concertRibbon && b.flags.normalOwners.length === 3 && b.party.every(alive)) {
        b.flags.concertRibbon = true; b.nextConcertRound = b.round + 1;
        relicEvent(b, 'concert_ribbon', null, 0, { queuedFor: b.nextConcertRound });
      }
    }
    if (relic(b, 'shield_etching') && !b.flags.shieldEtching && d.tags.includes('attack') && ctx.spentBlock >= 4) {
      var other = effectFriends(b, { to: 'otherLowest' }, h.uid)[0];
      if (other) {
        b.flags.shieldEtching = true; var shield = Math.min(3, Math.floor(ctx.spentBlock / 2));
        block(b, other, shield, 'shield_etching'); relicEvent(b, 'shield_etching', other.uid, shield, { spentBlock: ctx.spentBlock, owner: h.uid });
      }
    }
  }
  function play(b, cardUid, targetUid, options) {
    var stop = gate(b); if (stop) return stop;
    var index = b.hand.findIndex(function (c) { return c.uid === cardUid; });
    if (index < 0) return result(false, '卡牌不在手中。');
    var card = b.hand[index], d = definition(card), h = hero(b, d.owner), t = normalizeTarget(b, d.target, d.owner, targetUid);
    if (!alive(h)) return result(false, '角色无法行动。');
    if (!t.ok) return result(false, '目标不合法。');
    if (b.energy < d.cost) return result(false, '行动点不足。');
    if (h.hp <= paidHpCost(d.effects)) return result(false, '生命不足以支付费用；支付后必须保留至少1生命。');
    options = options || {}; if (Number(options.spendBlock || 0) < 0) return result(false, '耗盾数不合法。');
    var previous = b.previousPaidOwner;
    var ctx = { active: true, all: d.target === 'allEnemies', kind: 'card', defId: card.defId, cardUid: card.uid, reactions: [], buffUsed: false, cost: d.cost, tags: d.tags, previousPaidOwner: previous, nozomiBuff: d.nozomiBuff || 2, paidHp: 0, spentBlock: 0 };
    b.hand.splice(index, 1); b.energy -= d.cost;
    if (d.cost > 0) {
      tp(b, h, 1);
      if (b.party.some(function (friend) { return friend.id === 'monika' && alive(friend); }) && previous && previous !== h.uid && !b.flags.monika) { b.flags.monika = true; block(b, h, 3, 'monika'); }
      b.previousPaidOwner = h.uid;
      if (h.id === 'saren' && d.tags.includes('support') && t.uid !== h.uid && alive(hero(b, t.uid)) && !h.flags.saren) { h.flags.saren = true; tp(b, hero(b, t.uid), 1); }
    }
    if (d.tags.includes('attack')) {
      h.flags.attackCount = (h.flags.attackCount || 0) + 1;
      if (h.flags.attackCount === 1) h.flags.firstAttackTarget = t.uid;
      if (h.id === 'kaori' && h.flags.attackCount === 2 && h.flags.firstAttackTarget === t.uid) ctx.attackBonus = 2;
      if (h.id === 'arisa' && h.flags.attackCount === 2) ctx.attackBonus = 3;
      if (b.flags.attackPenalty) { ctx.attackPenalty = b.flags.attackPenalty; b.flags.attackPenalty = 0; event(b, 'attackPenalty', null, h.uid, ctx.attackPenalty, { card: card.uid }); }
    }
    if (h.id === 'yori' && d.exhaust && !b.battleFlags.yoriExhaust) { b.battleFlags.yoriExhaust = true; block(b, h, 4, h.uid); }
    if (h.id === 'kokkoro' && d.tags.includes('support') && !h.flags.support) { h.flags.support = true; block(b, lowest(b), 2, h.uid); }
    log(b, h.name + '使用' + d.name + '（' + d.cost + '行动）。'); event(b, 'play', h.uid, t.uid, d.cost, { card: card.uid, defId: card.defId });
    effects(b, d.effects || [], h.uid, t.uid, ctx, options);
    (d.exhaust ? b.exhaustPile : alive(h) ? b.discardPile : b.downedPile).push(card);
    reactions(b, ctx); afterCard(b, card, d, h, ctx); return result(true, '已使用' + d.name + '。');
  }
  function chooseGuide(b, cardUid) {
    normalizeBattle(b);
    if (b.status !== 'active' || !b.pending || b.pending.type !== 'guide') return result(false, '当前没有待选卡牌。');
    var cards = b.pending.cards, chosen = cards.find(function (c) { return c.uid === cardUid; });
    if (!chosen) return result(false, '请选择展示的卡牌。');
    if (!alive(hero(b, definition(chosen).owner))) return result(false, '倒地角色的卡牌不能加入手牌。');
    b.hand.push(chosen); cards.forEach(function (c) { if (c.uid !== chosen.uid) b.drawPile.push(c); });
    b.pending = null; b.flags.extraHand = true; event(b, 'guideChoice', null, null, 1, { card: chosen.uid }); log(b, '搜索取得' + definition(chosen).name + '，其余按原序置底。');
    return result(true, '卡牌已加入手牌。');
  }
  function burst(b, heroId, targetUid, options) {
    var stop = gate(b); if (stop) return stop;
    var h = hero(b, heroId), d = h && C.heroes[h.id].burst;
    if (!alive(h) || !d) return result(false, '角色无法使用UB。');
    var t = normalizeTarget(b, d.target, h.uid, targetUid);
    if (!t.ok) return result(false, '目标不合法。');
    if (h.tp < 6 || b.energy < 1) return result(false, '需要6TP和1行动点。');
    if (h.hp <= paidHpCost(d.effects)) return result(false, '生命不足以支付UB费用。');
    h.tp = 0; b.energy--; event(b, 'burst', h.uid, t.uid, 0, { name: d.name }); log(b, h.name + '释放UB：' + d.name);
    var ctx = { active: true, all: d.target === 'allEnemies', kind: 'burst', reactions: [], buffUsed: false };
    effects(b, d.effects || [], h.uid, t.uid, ctx, options || {}); reactions(b, ctx);
    return result(true, '已释放' + d.name + '。');
  }
  function redraw(b, cardUid, heroId) {
    var stop = gate(b); if (stop) return stop;
    if (b.redrawUsed) return result(false, '本战调度已用完。');
    var index = b.hand.findIndex(function (c) { return c.uid === cardUid; });
    if (index < 0 || !alive(hero(b, heroId))) return result(false, '调度对象不合法。');
    var pool = b.drawPile.map(function (c, i) { return { card: c, index: i }; }).filter(function (x) { return definition(x.card).owner === heroId; });
    if (!pool.length) return result(false, '牌库没有该角色的牌。');
    if (relic(b, 'crooked_compass')) {
      var sample = pool.slice(), shown = [];
      while (sample.length && shown.length < 2) shown.push(sample.splice(Math.floor(rand(b) * sample.length), 1)[0].card.uid);
      b.redrawUsed = true; b.pending = { type: 'redraw', owner: heroId, oldUid: cardUid, cardUids: shown };
      event(b, 'redrawOffer', heroId, null, shown.length, { oldUid: cardUid, cardUids: shown.slice(), relicId: 'crooked_compass' });
      log(b, '歪针罗盘：请选择一张展示的牌；调度次数已使用。'); return result(true, '请选择调度取得的牌。');
    }
    var pick = pool[Math.floor(rand(b) * pool.length)], old = b.hand[index];
    b.drawPile.splice(pick.index, 1); b.hand[index] = pick.card; b.drawPile.push(old); b.redrawUsed = true;
    event(b, 'redraw', heroId, null, 1); log(b, '调度：取得' + definition(pick.card).name + '，原牌置底。'); return result(true, '调度完成。');
  }
  function chooseRedraw(b, cardUid) {
    normalizeBattle(b); var pending = b.pending;
    if (b.status !== 'active' || !pending || pending.type !== 'redraw') return result(false, '当前没有待选调度。');
    if (!pending.cardUids.includes(cardUid)) return result(false, '请选择已经展示的调度牌。');
    var hi = b.hand.findIndex(function (c) { return c.uid === pending.oldUid; }), di = b.drawPile.findIndex(function (c) { return c.uid === cardUid; });
    if (hi < 0 || di < 0 || !alive(hero(b, pending.owner))) return result(false, '调度候选已不可用。');
    var chosen = b.drawPile[di], old = b.hand[hi];
    b.drawPile.splice(di, 1); b.hand[hi] = chosen; b.drawPile.push(old); b.pending = null;
    event(b, 'redraw', pending.owner, null, 1, { card: chosen.uid, oldUid: old.uid, shown: pending.cardUids.slice(), relicId: 'crooked_compass' });
    return result(true, '调度完成，其余候选留在原牌库位置。');
  }
  function chooseRecoverTop(b, cardUid) {
    normalizeBattle(b); var pending = b.pending;
    if (b.status !== 'active' || !pending || pending.type !== 'recoverTop') return result(false, '当前没有待选弃牌。');
    if (!alive(hero(b, pending.owner))) return result(false, '倒地角色不能回收弃牌。');
    if (cardUid !== null && cardUid !== undefined) {
      if (!pending.cardUids.includes(cardUid) || pending.selectedUids.includes(cardUid)) return result(false, '请选择尚未选择的展示弃牌。');
      var card = b.discardPile.find(function (c) { return c.uid === cardUid; });
      if (!card || definition(card).owner !== pending.owner || definition(card).exhaust) return result(false, '该牌不能回收。');
      pending.selectedUids.push(cardUid);
    }
    if (cardUid !== null && cardUid !== undefined && pending.selectedUids.length < pending.count && pending.selectedUids.length < pending.cardUids.length) return result(true, '可继续选择，或结束选择。');
    var selected = pending.selectedUids.map(function (uid) { return b.discardPile.find(function (c) { return c.uid === uid; }); }).filter(Boolean);
    b.discardPile = b.discardPile.filter(function (c) { return !pending.selectedUids.includes(c.uid); });
    b.drawPile.unshift.apply(b.drawPile, selected); b.pending = null;
    event(b, 'recoverTopChoice', pending.owner, null, selected.length, { cardUids: selected.map(function (c) { return c.uid; }) });
    return result(true, '已按选择顺序置于抽牌堆顶，没有额外抽牌。');
  }
  function makeEnemy(def, index) {
    return Object.assign({}, clone(def), { uid: def.uid || def.id + '-' + index, maxHp: def.hp, hp: def.hp, baseArmor: def.armor || 0, armor: def.armor || 0,
      barrier: def.barrier || 0, block: 0, armorBonus: 0, attackBuff: 0, breakAmount: 0, breakExpires: 0, breakLayers: [], weak: 0,
      stars: 0, curseExpires: 0, curseUsedRound: 0, flags: {}, summons: 0 });
  }
  function applyDebuff(b, h, type, amount, turns) {
    if (!alive(h)) return;
    var expires = b.round + turns;
    h.debuffs.push({ type: type, amount: amount, expires: expires });
    event(b, 'debuff', null, h.uid, amount, { status: type, expires: expires });
  }
  function lockTarget(b, type) {
    var friends = b.party.filter(alive);
    if (type === 'lowest') return lowest(b);
    if (type === 'back') {
      var rear = friends.slice(1); return rear.reduce(function (a, h) { return !a || h.hp / h.maxHp < a.hp / a.maxHp ? h : a; }, null) || friends[0];
    }
    return friends[0];
  }
  function resolveIntentTarget(b, e) {
    var intent = e.intent, current = hero(b, intent.lockedTargetUid);
    if (alive(current)) return current;
    var next = lockTarget(b, intent.target || 'front'), previous = intent.lockedTargetUid;
    intent.lockedTargetUid = next ? next.uid : null; intent.targetUid = intent.lockedTargetUid;
    if (next && previous !== next.uid) {
      event(b, 'retarget', e.uid, next.uid, 0, { from: previous || null, reason: 'downed' });
      log(b, e.name + '的原目标倒地，转而锁定' + next.name + '。');
    }
    return next;
  }
  function roundIntent(b, e) {
      var cycle = e.cycle || [{ name: '待机', type: 'guard', amount: 0 }], intent = clone(cycle[(b.round - 1) % cycle.length]);
      var fatigue = b.fatigue, pressure = fatigue ? Math.max(0, Math.floor((b.round - (fatigue.startRound || 7)) / (fatigue.every || 3)) + 1) * (fatigue.amount || 0) : Math.max(0, Math.floor((b.round - 1) / 3) - 1) * (b.encounterType === 'boss' ? 2 : 1);
      var growth = Math.min((e.growth || 0) * (b.round - 1), e.growthCap === undefined ? Infinity : e.growthCap);
      intent.increase = ['attack', 'aoe'].includes(intent.type) ? pressure + growth + (e.attackBuff || 0) : 0;
      intent.amount = (intent.amount || 0) + intent.increase; intent.baseAmount = intent.amount;
      intent.reflect = intent.reflect || intent.counter || 0;
      return intent;
  }
  function prepare(b) {
    b.enemies.filter(alive).forEach(function (e) {
      var intent = roundIntent(b, e);
      var locked = intent.targetUid ? hero(b, intent.targetUid) : lockTarget(b, intent.target || 'front');
      if (!alive(locked)) locked = lockTarget(b, intent.target || 'front');
      intent.lockedTargetUid = locked ? locked.uid : null;
      e.intent = intent; e.flags = {}; e.armorBonus = intent.armor || 0; e.armor = e.baseArmor + e.armorBonus;
      if (intent.barrier) e.barrier += intent.barrier;
      if (intent.type === 'guard' && intent.amount) e.block += intent.amount;
    });
    refreshIntents(b);
  }
  function beginTurn(b, first) {
    var slow = 0, clog = 0;
    suspendDowned(b);
    b.party.filter(alive).forEach(function (h) { h.debuffs.forEach(function (x) { if (x.expires >= b.round) { if (x.type === 'slow') slow += x.amount; if (x.type === 'clog') clog += x.amount; } }); });
    var reserved = Math.min(1, Math.max(0, b.energyReserve || 0));
    b.energy = Math.min(4, 3 - Math.min(1, slow) + reserved); b.turnEnergy = b.energy; b.energyReserve = 0;
    b.flags = {}; b.previousPaidOwner = null;
    if (reserved) { event(b, 'energy', null, null, reserved, { sourceKind: 'reserve' }); log(b, '预备的1行动已到位。'); }
    if (b.nextAttackPenalty && b.nextAttackPenalty.round <= b.round) { b.flags.attackPenalty = b.nextAttackPenalty.amount; b.nextAttackPenalty = null; }
    b.party.forEach(function (h) { h.flags = {}; h.buff = 0; h.coverFrom = null; tp(b, h, 1); });
    if (first) {
      if (relic(b, 'battle_horn')) b.party.forEach(function (h) { tp(b, h, 1); });
      if (relic(b, 'opening_shield')) { var preferred = hero(b, 'pecorine'); block(b, alive(preferred) ? preferred : b.party.find(alive), 4, 'opening_shield'); }
      if (relic(b, 'warm_scarf')) heal(b, lowest(b), 3, 'warm_scarf', false);
    }
    if (b.nextConcertRound && b.nextConcertRound <= b.round) {
      b.nextConcertRound = 0; var front = b.party.find(alive);
      if (front) { block(b, front, 2, 'concert_ribbon'); relicEvent(b, 'concert_ribbon', front.uid, 2, { delivered: true }); }
    }
    draw(b, 5 - Math.min(2, clog)); prepare(b); event(b, 'round', null, null, b.round); log(b, '第' + b.round + '轮，' + b.energy + '行动点。');
  }
  function reserveEnergy(b) {
    // Preflight is deliberately read-only, including for a legacy save whose
    // normalization would otherwise add fields to a rejected operation.
    if (!b || b.status !== 'active' || !b.party || !b.party.some(alive)) return result(false, '当前不能预备行动。');
    if (b.pending) return result(false, '请先完成当前选牌。');
    if (b.flags && b.flags.reserveUsed || b.energyReserve >= 1) return result(false, '本轮已经预备过行动。');
    if (!(b.energy >= 1)) return result(false, '预备需要本轮1行动。');
    normalizeBattle(b);
    b.energy--; b.energyReserve = 1; b.flags.reserveUsed = true;
    event(b, 'reserveEnergy', null, null, 1, { deliveredRound: b.round + 1 });
    log(b, '花费1行动预备：下一轮额外获得1行动，最多4行动。');
    return result(true, '已预备1行动，将在下一轮返还。');
  }
  function endTurn(b) {
    var stop = gate(b); if (stop) return stop;
    b.enemies.filter(alive).forEach(function (e) {
      if (b.status !== 'active' || e.stars <= 0) return;
      hit(b, 'hatsune', e, e.stars, 'magic', { active: false, all: false, kind: 'star', reactions: [] }); e.stars = Math.max(0, e.stars - 1);
    });
    b.party.slice().forEach(function (h) {
      if (!alive(h) || b.status !== 'active') return;
      var poisons = h.debuffs.filter(function (x) { return x.type === 'poison' && x.dueRound <= b.round; });
      h.debuffs = h.debuffs.filter(function (x) { return poisons.indexOf(x) < 0; });
      poisons.forEach(function (poison) { if (alive(h) && b.status === 'active') hurt(b, null, h, poison.amount, false, 'poison'); });
    });
    var acting = b.enemies.slice();
    for (var i = 0; i < acting.length && b.status === 'active'; i++) {
      var e = acting[i]; if (!alive(e)) continue;
      var intent = e.intent;
      if (intent.type === 'attack') {
        refreshIntents(b);
        for (var k = 0; k < (intent.hits || 1) && b.status === 'active' && alive(e); k++) {
          var n = Math.max(0, intent.unweakenedAmount - (e.weak || 0)); e.weak = 0;
          var actualTarget = hurt(b, e, resolveIntentTarget(b, e), n, true, 'enemy', { stripBlock: k === 0 ? intent.stripBlock || 0 : 0 });
          if (intent.poison && alive(actualTarget) && b.status === 'active') {
            var poison = { type: 'poison', amount: intent.poison, dueRound: b.round + 1, expires: b.round + 1 }; actualTarget.debuffs.push(poison);
            event(b, 'debuff', e.uid, actualTarget.uid, poison.amount, { status: 'poison', dueRound: poison.dueRound, expires: poison.expires });
          }
        }
      } else if (intent.type === 'aoe') {
        refreshIntents(b); var amount = intent.amount;
        var recipients = b.party.filter(alive); if (intent.frontCount) recipients = recipients.slice(0, intent.frontCount);
        for (var j = 0; j < recipients.length && b.status === 'active'; j++) hurt(b, e, recipients[j], amount, false, 'enemy');
      } else if (intent.type === 'chant') {
        b.nextAttackPenalty = { amount: intent.amount || 2, round: b.round + 1 };
        event(b, 'chant', e.uid, null, b.nextAttackPenalty.amount, { round: b.round + 1 });
      } else if (intent.type === 'curse') {
        applyDebuff(b, resolveIntentTarget(b, e), intent.status || 'vulnerable', intent.amount || 2, intent.turns || 1);
      } else if (intent.type === 'summon' && intent.summon && e.summons < (e.maxSummons || 1)) {
        b.enemies.push(makeEnemy(intent.summon, b.enemies.length)); e.summons++; event(b, 'summon', e.uid);
      }
    }
    if (b.status !== 'active') return result(true, b.status === 'won' ? '战斗胜利。' : '本次远征失败。');
    b.party.forEach(function (h) { h.block = h.id === 'jun' && alive(h) ? Math.min(3, h.block) : 0; h.buff = 0; h.coverFrom = null; h.debuffs = h.debuffs.filter(function (x) { return x.expires > b.round; }); });
    b.enemies.forEach(function (e) {
      e.block = 0; e.weak = 0;
      if (e.breakLayers) { e.breakLayers = e.breakLayers.filter(function (layer) { return layer.expires > b.round; }); e.breakAmount = 0; e.breakExpires = 0; syncBreak(e, b.round + 1); }
      if (e.curseExpires <= b.round) { e.curseExpires = 0; e.curseUsedRound = 0; }
    });
    b.discardPile.push.apply(b.discardPile, b.hand.splice(0)); b.round++; beginTurn(b, false);
    return result(true, '下一轮。');
  }
  function createBattle(options) {
    if (!options || !Array.isArray(options.heroIds) || options.heroIds.length !== 3 || new Set(options.heroIds).size !== 3) throw new Error('必须选择三名不同角色。');
    var encounter = C.encounters[options.encounterId]; if (!encounter) throw new Error('未知战斗。');
    var seen = new Set();
    var deck = options.deck.map(function (c) {
      if (!c.uid || seen.has(c.uid)) throw new Error('卡牌uid必须唯一。'); seen.add(c.uid);
      var d = definition(c); if (!options.heroIds.includes(d.owner)) throw new Error('牌组包含非队员卡牌。'); return clone(c);
    });
    var b = { version: 2, encounterId: options.encounterId, encounterType: encounter.type, fatigue: clone(encounter.fatigue || null), party: options.heroIds.map(function (id) {
      var h = C.heroes[id]; if (!h) throw new Error('未知角色：' + id);
      var hp = options.hp && options.hp[id] !== undefined ? Math.min(h.hp, Math.max(0, options.hp[id])) : h.hp;
      return { id: id, uid: id, name: h.name, maxHp: h.hp, hp: hp, tp: 0, block: 0, buff: 0, coverFrom: null, debuffs: [], downed: false, flags: {} };
    }), enemies: encounter.enemies.map(makeEnemy), hand: [], drawPile: deck, discardPile: [], exhaustPile: [], downedPile: [], energy: 3, round: 1,
    status: 'active', pending: null, log: [], events: [], relics: (options.relics || []).slice(), seed: seedValue(options.seed),
    redrawUsed: false, flags: {}, battleFlags: {}, previousPaidOwner: null, nextConcertRound: 0, nextAttackPenalty: null, energyReserve: 0, turnEnergy: 3 };
    if (encounter.victoryCoreId) {
      var core = b.enemies.find(function (unit) { return unit.id === encounter.victoryCoreId; });
      if (!core) throw new Error('战斗胜利目标不存在。');
      b.bossCoreUid = core.uid;
    } else if (encounter.type === 'boss') b.bossCoreUid = b.enemies[0].uid;
    if (encounter.type === 'boss' && encounter.soloRevision > 0 && encounter.enemies.length === 1) b.bossSoloRevision = encounter.soloRevision;
    if (options.shuffle !== false) shuffle(b, b.drawPile);
    if (!checkEnd(b)) beginTurn(b, true);
    return b;
  }
  function preview(b, cardUid, targetUid, options) {
    var before = clone(b), after = clone(b), outcome = play(after, cardUid, targetUid, options);
    var damage = [], blockDiff = [];
    before.party.concat(before.enemies).forEach(function (unit) {
      var next = after.party.concat(after.enemies).find(function (x) { return x.uid === unit.uid; });
      if (!next) return;
      if (unit.hp !== next.hp) damage.push({ uid: unit.uid, amount: unit.hp - next.hp });
      if (unit.block !== next.block) blockDiff.push({ uid: unit.uid, amount: next.block - unit.block });
    });
    return { ok: outcome.ok, message: outcome.message, before: before, after: after, damage: damage, blockDiff: blockDiff };
  }
  function previewEndTurn(b) {
    var before = clone(b), after = clone(b), outcome = endTurn(after), damage = [], blockDiff = [];
    before.party.concat(before.enemies).forEach(function (unit) {
      var next = after.party.concat(after.enemies).find(function (x) { return x.uid === unit.uid; });
      if (!next) return;
      if (unit.hp !== next.hp) damage.push({ uid: unit.uid, amount: unit.hp - next.hp });
      if (unit.block !== next.block) blockDiff.push({ uid: unit.uid, amount: next.block - unit.block });
    });
    return { ok: outcome.ok, message: outcome.message, before: before, after: after, damage: damage, blockDiff: blockDiff };
  }
  function previewKnownChoice(b, cardUid, choose) {
    var before = clone(b), after = clone(b), outcome = choose(after, cardUid);
    return { ok: outcome.ok, message: outcome.message, before: before, after: after, damage: [], blockDiff: [] };
  }
  return { createBattle: createBattle, play: play, chooseGuide: chooseGuide, burst: burst, endTurn: endTurn, redraw: redraw, reserveEnergy: reserveEnergy,
    chooseRedraw: chooseRedraw, chooseRecoverTop: chooseRecoverTop, chooseRecovery: chooseRecoverTop,
    previewRedraw: function (b, uid) { return previewKnownChoice(b, uid, chooseRedraw); },
    previewRecoverTop: function (b, uid) { return previewKnownChoice(b, uid, chooseRecoverTop); }, normalizeBattle: normalizeBattle,
    preview: preview, previewEndTurn: previewEndTurn, legalTargets: legalTargets, legalBurstTargets: legalBurstTargets, cardView: cardView, setContent: function (content) { C = content; } };
});
