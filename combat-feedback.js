(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TowerFeedback = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';
  var owners = new WeakMap();
  var colors = { pecorine: '#ffd078', rei: '#9adaff', kokkoro: '#8debc1', kyaru: '#ba82ff', hatsune: '#c3b6ff', yui: '#ffc4ce' };
  var indirectHits = new Set(['star', 'poison', 'reflect', 'counter', 'relic', 'passive']);
  Object.values(global.TowerContent && global.TowerContent.heroes || {}).forEach(function (h) { if (h.color) colors[h.id] = h.color; });
  var bossStyles = {
    christina: { motif: 'blade', color: '#ffc681', defaultAttack: 'slash', weapon: [.25, .73] },
    fubuki: { motif: 'shell', color: '#bdefff', defaultAttack: 'projectile', weapon: [.09, .21] },
    ranpha: { motif: 'petal', color: '#edbfff', defaultAttack: 'projectile', weapon: [.89, .46] },
    misora: { motif: 'prism', color: '#ff9ed7', defaultAttack: 'projectile', weapon: [.90, .23] },
    kaiser: { motif: 'ember', color: '#ffb2b6', defaultAttack: 'slash', weapon: [.23, .37] }
  };
  var legacyBossIds = { seal_knight: 'christina', tower_crown: 'kaiser' };
  var statusLabels = { buff: '鼓舞', breakAmount: '破甲', weak: '减攻', stars: '星屑', curseExpires: '咒痕', coverFrom: '掩护' };
  // Left/right points inside opaque art at 25%, 33%, 41% and 49% of its
  // fitted height. Coordinates are thousandths of the cropped portrait.
  // Insets avoid translucent wisps and the empty space beside small enemies.
  var enemySilhouettes = {
    'christina-full.svg': [306, 779, 192, 876, 121, 689, 189, 605],
    'fubuki-full.svg': [65, 702, 167, 721, 332, 645, 249, 697],
    'kaiser-full.svg': [324, 676, 275, 762, 242, 774, 287, 767],
    'misora-full.svg': [144, 931, 111, 906, 71, 476, 65, 471],
    'neneka-full.svg': [348, 738, 344, 662, 272, 700, 195, 803],
    'ranpha-full.svg': [383, 706, 333, 719, 333, 724, 318, 740],
    'yamato-full.svg': [320, 542, 250, 609, 278, 641, 267, 651],
    'blue-golem.png': [518, 685, 404, 756, 379, 851, 179, 837],
    'fire-mage.png': [366, 561, 288, 580, 267, 809, 238, 731],
    'flaming-skulls.png': [326, 732, 218, 717, 216, 744, 106, 689],
    'gellatina.png': [233, 569, 165, 555, 132, 574, 119, 602],
    'goblin-guard.png': [144, 616, 120, 632, 100, 680, 108, 842],
    'golem.png': [526, 689, 415, 761, 422, 856, 201, 842],
    'kobold.png': [388, 672, 385, 870, 244, 796, 195, 797],
    'nut-shooter-ready.png': [502, 716, 493, 792, 304, 651, 276, 528],
    'nut-shooter.png': [211, 466, 198, 498, 185, 877, 221, 867],
    'orc-leader.png': [391, 712, 276, 892, 184, 851, 163, 745],
    'werewolf.png': [418, 582, 114, 643, 163, 640, 225, 788],
    'wood-soul.png': [434, 562, 406, 619, 303, 703, 179, 691]
  };
  function measuredEnemySurface(artwork, yFraction, fromLeft) {
    var src = artwork?.querySelector('.enemy-portrait')?.getAttribute?.('src');
    if (!src) return null;
    var name = src.split(/[?#]/)[0].split('/').pop();
    var rows = enemySilhouettes[name === 'kaiser-insight-full.svg' ? 'kaiser-full.svg' : name];
    if (!rows) return null;
    var row = Math.max(0, Math.min(3, Math.round((yFraction - .25) / .08)));
    return { x: rows[row * 2 + (fromLeft ? 0 : 1)] / 1000, y: .25 + row * .08 };
  }
  function units(b) { return b ? (b.party || []).concat(b.enemies || []) : []; }
  function unitId(u) { return u && (u.uid || u.id); }
  function meleeContact(origin, target, anchor, arena, compact, artwork) {
    var side = origin.x <= target.x ? 1 : -1;
    if (compact && Math.abs(target.x - origin.x) < origin.width * .65) {
      side = target.x - arena.left > arena.width / 2 ? 1 : -1;
    }
    var top = target.y - target.height * .49;
    var floor = Math.min(arena.top + arena.height - 2, top + target.height + 3);
    var tentativeY = Math.max(.25, Math.min(.49, (floor - top - (1-anchor[1])*origin.height)/target.height));
    var surface = measuredEnemySurface(artwork, tentativeY, side > 0);
    var y = top + target.height * (surface?.y ?? tentativeY);
    var contactX = target.x + ((surface?.x ?? (side > 0 ? .26 : .74)) - .5) * target.width;
    var space = side > 0 ? contactX - arena.left : arena.left + arena.width - contactX;
    var scale = Math.min(1, Math.max(.18, (space - 4) / (origin.width * Math.max(anchor[0], 1 - anchor[0]))),
      (floor - y) / (origin.height * (1 - anchor[1])),
      (y - arena.top - 2) / (origin.height * anchor[1]));
    return { x: contactX, y: y, scale: scale, side: side };
  }
  function plan(options) {
    options = options || {};
    var events = options.events || [], output = [], actionOwner = options.owner || null;
    var activeCard, hitCounts = new Map();
    var core = options.before?.enemies?.find(function (unit) { return unitId(unit) === options.before.bossCoreUid; });
    var style = core && bossStyles[legacyBossIds[core.id] || core.id];
    var move = core && events.find(function (e) { return e.type === 'bossMove' && e.source === unitId(core); });
    var intent = core?.intent;
    var attack = move?.presentation || intent?.presentation || (intent?.type === 'aoe' ? 'wave' : intent?.hits > 1 ? 'volley' : style?.defaultAttack);
    events.forEach(function (e) {
      if (e.type === 'play' || e.type === 'burst') {
        actionOwner = e.source || actionOwner;
        activeCard = e.type === 'play' ? e.defId : null;
        hitCounts.clear();
      }
      if (e.type === 'relic' && e.relicId === 'last_ember_locket') output.push({type:'status',visual:'status',target:e.target,source:e.target,label:'命锁 · 留下1生命',amount:0});
      if (e.type === 'intentChange' && e.source) output.push(Object.assign({}, e, { target: e.source, visual: 'status' }));
      if (e === move && style && ['guard', 'chant', 'curse'].includes(e.moveType)) {
        output.push(Object.assign({}, e, { bossStyle: style, bossAttack: e.moveType === 'guard' ? 'guard' : 'debuff' }));
      }
      if (['hit', 'heal', 'block', 'cleanse', 'debuff', 'downed', 'payHp', 'stripBlock'].includes(e.type) && e.target) {
        var record = Object.assign({}, e, { source: e.source || actionOwner,
          visual: e.type === 'hit' ? (e.damageType === 'magic' || e.sourceKind === 'star' ? 'magic' : 'physical') : e.type,
          burst: !!options.burst || e.sourceKind === 'burst' });
        if (activeCard && e.source === actionOwner && e.sourceKind === 'card' && e.type === 'hit') {
          record.cardId = activeCard;
          record.strikeIndex = hitCounts.get(e.target) || 0;
          hitCounts.set(e.target, record.strikeIndex + 1);
        }
        if (style && e.source === unitId(core) && e.sourceKind === 'enemy' && e.type === 'hit') {
          record.bossStyle = style;
          record.bossAttack = attack;
          if (style.motif === 'petal') record.visual = 'magic';
        }
        output.push(record);
      }
    });
    // Buffs and status applications are represented in state, not engine events.
    // Deriving only positive changes also avoids replaying an expired status.
    var oldUnits = units(options.before);
    units(options.after).forEach(function (u) {
      var old = oldUnits.find(function (x) { return unitId(x) === unitId(u); });
      if (!old) return;
      Object.keys(statusLabels).forEach(function (key) {
        if ((typeof u[key] === 'number' ? u[key] > (old[key] || 0) : u[key] && u[key] !== old[key])) {
          output.push({ type: 'status', visual: 'status', status: key, label: statusLabels[key], source: actionOwner, target: unitId(u), amount: 0, burst: !!options.burst });
        }
      });
    });
    if (!output.length) {
      var action = events.find(function (e) { return ['play', 'burst', 'guide'].includes(e.type); });
      if (action && (action.target || action.source)) output.push({ type: 'support', visual: 'support', source: action.source, target: action.target || action.source, label: action.type === 'guide' ? '指路' : '支援', amount: 0 });
    }
    return output;
  }
  function play(options) {
    options = options || {};
    var scope = options.root || global.document, doc = options.document || scope && (scope.ownerDocument || scope);
    if (!scope || !doc || typeof doc.createElement !== 'function') return Promise.resolve({ played: 0 });
    if (owners.has(scope)) owners.get(scope)();
    var reduce = options.reducedMotion === undefined ? !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) : !!options.reducedMotion;
    var records = plan(options), animations = [], nodes = [], timers = [], cancelled = false, done = false, canvas = null;
    var boss = options.boss || null;
    var opening = !boss && options.phaseOpening;
    var openingStyle = opening && Object.hasOwn(bossStyles, opening.bossId) && bossStyles[opening.bossId];
    records.forEach(function (e) {
      if (boss && e.type === 'hit' && e.source === boss.unitId && e.sourceKind === 'enemy') {
        e.burst = true; e.bossImpact = true;
        if (boss.bossId !== 'christina') e.visual = 'magic';
      }
    });
    var layer = doc.createElement('div'); layer.className = 'combat-fx-layer' + (reduce ? ' reduced-motion' : ''); layer.setAttribute('aria-hidden', 'true');
    var arena = scope.querySelector && scope.querySelector('.arena'), arenaRect = arena && arena.getBoundingClientRect();
    var bounds = arenaRect && arenaRect.width > 0 && arenaRect.height > 0 ? { left: arenaRect.left, top: arenaRect.top, width: arenaRect.width, height: arenaRect.height } : null;
    var battlePage = arena && arena.closest && arena.closest('.battle-page');
    var phase = battlePage && battlePage.dataset.bossForm;
    var light = options.quality === 'light';
    var depth = !!arena?.classList?.contains('has-depth') && !light;
    var supportActor = depth && !reduce && options.owner && !records.some(function (record) {
      return record.type === 'hit' && record.source === options.owner;
    }) ? options.owner : null;
    var compact = bounds && bounds.width < 600;
    // All generated artwork is clipped to the real arena, including a compact
    // arena on a phone. Coordinates are still measured from the live fighters.
    if (bounds) {
      layer.style.left = bounds.left + 'px'; layer.style.top = bounds.top + 'px';
      layer.style.width = bounds.width + 'px'; layer.style.height = bounds.height + 'px';
      layer.style.right = 'auto'; layer.style.bottom = 'auto';
      layer.dataset.arenaBounded = 'true';
    }
    (doc.body || scope).appendChild(layer);
    var enemyMotion = !reduce && global.TowerEnemyMotion?.create({
      document:doc, layer:layer, bounds:bounds, light:light,
      assets:global.TowerEnemyMotionAssets, preloader:global.TowerAssetPreload
    });
    // The canvas renderer is optional: unsupported devices keep the original
    // DOM effects and numbers. Both renderers use the same resolved events.
    try { canvas = global.TowerVFX && global.TowerVFX.create({layer:layer,document:doc,bounds:bounds,quality:options.quality || 'auto',reducedMotion:reduce}); } catch (_) {}
    var resolve, promise = new Promise(function (yes) { resolve = yes; });
    function cleanup() {
      if (done) return; done = true;
      timers.forEach(function (t) { global.clearTimeout(t); });
      if (canvas) canvas.cancel();
      if (enemyMotion) enemyMotion.cancel();
      animations.forEach(function (a) { try { a.cancel(); } catch (_) {} });
      nodes.forEach(function (n) { n.remove(); }); layer.remove();
      if (owners.get(scope) === cancel) owners.delete(scope);
      resolve({ played: records.length, cancelled: cancelled });
    }
    function cancel() { cancelled = true; cleanup(); }
    owners.set(scope, cancel); promise.cancel = cancel;
    function find(id) {
      if (!id || !scope.querySelectorAll) return null;
      return Array.from(scope.querySelectorAll('.fighter[data-id]')).find(function (el) { return el.dataset.id === String(id); }) || null;
    }
    function art(el) { return el && (el.querySelector('.fighter-art, .enemy-art') || el); }
    function point(el) {
      if (!el) return null; var r = el.getBoundingClientRect();
      // object-fit:contain leaves transparent gutters around full-height Boss
      // art. Aim at the rendered image body instead of its container centre.
      var img = el.querySelector && el.querySelector('img');
      if (img && img.naturalWidth > 0 && img.naturalHeight > 0 && global.getComputedStyle) {
        var ir = img.getBoundingClientRect(), style = global.getComputedStyle(img);
        if (style.objectFit === 'contain' && ir.width > 0 && ir.height > 0) {
          var scale = Math.min(ir.width / img.naturalWidth, ir.height / img.naturalHeight);
          var w = img.naturalWidth * scale, h = img.naturalHeight * scale;
          var pos = (style.objectPosition || '50% 50%').split(' ');
          var px = parseFloat(pos[0]) / 100, py = parseFloat(pos[1]) / 100;
          r = {left:ir.left + (ir.width-w)*(isFinite(px)?px:.5),top:ir.top+(ir.height-h)*(isFinite(py)?py:.5),width:w,height:h};
        }
      }
      return { x: r.left + r.width / 2, y: r.top + r.height * .49, width: r.width, height: r.height };
    }
    // The zero-size attachment inherits the same lunge, rotation and camera
    // transform as the full portrait. It stays on the weapon during a combo.
    var weaponPins = new Map();
    function weaponPoint(id, artwork, center, bossAnchor) {
      var anchor = bossAnchor || global.TowerVFX?.weaponAnchors?.[id];
      if ((!canvas && !bossAnchor) || !anchor || !artwork || !center) return;
      if (!weaponPins.has(id)) {
        var rect = artwork.getBoundingClientRect();
        if (!(rect.width > 0 && rect.height > 0)) return;
        var pin = doc.createElement('i');
        var x = center.x + (anchor[0] - .5) * center.width;
        var y = center.y + (anchor[1] - .49) * center.height;
        pin.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;left:' +
          (100 * (x - rect.left) / rect.width) + '%;top:' + (100 * (y - rect.top) / rect.height) + '%';
        artwork.appendChild(pin); nodes.push(pin);
        weaponPins.set(id, function () {
          var pos = pin.getBoundingClientRect();
          return { x: pos.left, y: pos.top };
        });
      }
      return weaponPins.get(id);
    }
    function impact(e, at) {
      if (typeof options.onImpact !== 'function') return Promise.resolve();
      return new Promise(function (yes) {
        var timer = global.setTimeout(function () { if (!cancelled) { try { options.onImpact(e); } catch (_) {} } yes(); }, at);
        timers.push(timer);
      });
    }
    function mark(kind, p, color, text) {
      var n = doc.createElement('span'); n.className = 'combat-fx fx-' + kind;
      n.style.left = (p.x - (bounds ? bounds.left : 0)) + 'px'; n.style.top = (p.y - (bounds ? bounds.top : 0)) + 'px'; n.style.setProperty('--fx-color', color);
      if (text) n.textContent = text; layer.appendChild(n); nodes.push(n); return n;
    }
    function animate(el, frames, duration, delay, easing, fill) {
      if (!el || cancelled || typeof el.animate !== 'function') return Promise.resolve();
      var animation;
      try { animation = el.animate(frames, { duration: duration, delay: delay || 0, easing: easing || 'cubic-bezier(.18,.72,.25,1)', fill: fill || 'both' }); }
      catch (_) { return Promise.resolve(); }
      animations.push(animation); return animation.finished.catch(function () {});
    }
    function fade(n, duration, delay, scale) {
      return animate(n, reduce ? [{ opacity: 0 }, { opacity: 1, offset: .25 }, { opacity: 0 }] :
        [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.25)' }, { opacity: 1, offset: .2, transform: 'translate(-50%,-50%) scale(.9)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(' + (scale || 1.5) + ')' }], duration, delay);
    }
    function float(p, color, text, delay, big, label, encouragement, meleeSide) {
      // Keep the weapon and the recipient's face clear at the contact frame.
      var anchor = { x: p.x, y: meleeSide ? p.y - p.height * .49 - 8 : p.y - Math.min(35, p.height * .18) };
      if (bounds) {
        anchor.x = Math.max(bounds.left + 34, Math.min(bounds.left + bounds.width - 34, anchor.x));
        anchor.y = Math.max(bounds.top + (meleeSide ? 24 : Math.min(58, bounds.height * .32)), anchor.y);
      }
      var n = mark('number' + (big ? ' big' : '') + (label ? ' label' : ''), anchor, color, text);
      if (encouragement && !light && !reduce) {
        var badge = doc.createElement('span');
        badge.className = 'fx-encouragement';
        var sources = Object.entries(encouragement.sources || {});
        // On an old save the total may include points awarded before source
        // tracking. Keep the total, but never credit those points to a hero.
        if (sources.reduce(function (sum, pair) { return sum + pair[1]; }, 0) === encouragement.amount) {
          sources.forEach(function (pair) {
            var source = pair[0], url = options.sourceIcon?.(source);
            if (!url) return;
            var image = doc.createElement('img');
            image.dataset.source = source;
            image.alt = ''; image.src = url;
            badge.appendChild(image);
          });
        }
        var caption = doc.createElement('span');
        caption.textContent = '鼓舞 +' + encouragement.amount;
        badge.appendChild(caption);
        n.appendChild(badge);
        n.className += ' empowered';
        // Beside the target, with room for the ordinary combo numbers to
        // continue rising in their original lane.
        if (bounds) {
          var half = Math.ceil(n.offsetWidth / 2) || 55;
          var direction = meleeSide || (anchor.x < bounds.left + bounds.width / 2 ? 1 : -1);
          var beside = anchor.x + direction * (half + 12);
          n.style.left = Math.max(half + 3, Math.min(bounds.width - half - 3, beside - bounds.left)) + 'px';
        }
      }
      return animate(n, reduce ? [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 0 }] :
        [{ opacity: 0, transform: 'translate(-50%,10px) scale(.75)' }, { opacity: 1, transform: 'translate(-50%,-8px) scale(1.12)', offset: encouragement ? .085 : .22 }, { opacity: 1, offset: .6 }, { opacity: 0, transform: 'translate(-50%,-65px) scale(1)' }], reduce ? 350 : 720, delay);
    }
    function particles(p, color, delay, count) {
      if (reduce) return [];
      return Array.from({ length: count || 7 }, function (_, i) {
        var angle = i / (count || 7) * Math.PI * 2, n = mark('spark', p, color);
        return animate(n, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.4)' }, { opacity: 1, offset: .15 },
          { opacity: 0, transform: 'translate(calc(-50% + ' + Math.cos(angle) * 70 + 'px),calc(-50% + ' + Math.sin(angle) * 60 + 'px)) scale(.15)' }], 400, delay);
      });
    }
    function size(n, value) { n.style.setProperty('--fx-size', Math.round(value) + 'px'); return n; }
    // A stopped blow leaves the crest intact. Damage through the ward parts
    // it along the zigzag where the two facets meet.
    function shieldContact(p, side, pierced, at, targetHeight) {
      var crest = size(mark('contact-ward' + (pierced ? ' pierced' : ''), p, '#bce9ff'),
        Math.max(28, Math.min(compact ? 43 : 64, targetHeight * .43)));
      var facets = pierced
        ? '<path d="M24 3 43 11 38 31 31 38 23 46 30 29 21 24 27 15Z"/><path d="M24 3 27 15 21 24 30 29 23 46 10 33 5 11Z"/>'
        : '<path d="M24 3 43 11 38 31 23 46 10 33 5 11Z"/><path class="ward-chevron" d="m14 22 8 7 12-15"/>';
      crest.innerHTML = '<svg viewBox="0 0 48 50" aria-hidden="true">' + facets + '</svg>';
      var life = pierced ? 218 : 185;
      if (pierced && !reduce) {
        Array.from(crest.querySelectorAll?.('path') || []).forEach(function (part, i) {
          var sign = i ? -1 : 1;
          all.push(animate(part, [{ transform:'none' }, { offset:.26, transform:'none' },
            { transform:'translate(' + sign * 9 + 'px,' + (i ? 8 : -3) + 'px) rotate(' + sign * 13 + 'deg)' }],
            life, at, 'ease-out', 'none'));
        });
      }
      var fixed = 'translate(-50%,-50%) rotate(' + side * -12 + 'deg)';
      return animate(crest, [
        { opacity:0, transform:fixed + (reduce ? '' : ' scale(.77)') },
        { offset:.12, opacity:1, transform:fixed }, { offset:.47, opacity:1, transform:fixed },
        { opacity:0, transform:fixed + (reduce ? '' : pierced ? ' scale(1.08)' : ' scale(.95)') }
      ], life, at, 'linear');
    }
    function recoilTrack(body, beats) {
      // Fit each recovery between actual hits so the target meets the blade
      // again, including when a combo goes through its shield partway through.
      beats.sort(function (a,b) { return a.at - b.at || b.force - a.force; });
      beats = beats.filter(function (beat, i) { return !i || beat.at !== beats[i-1].at; });
      var start = beats[0].at, last = beats[beats.length-1];
      var total = last.at - start + last.life, frames = [];
      function frame(at, x, y, tilt, sx, sy) {
        frames.push({ offset:Math.min(1,(at-start)/total), composite:'add',
          transform:'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) rotate(' + tilt.toFixed(2) + 'deg) scale(' + sx + ',' + sy + ')' });
      }
      beats.forEach(function (b, i) {
        var life = Math.min(b.life, i+1 < beats.length ? beats[i+1].at - b.at : b.life);
        frame(b.at, 0,0,0,1,1);
        frame(b.at + life*.22, b.x, b.y, b.tilt, b.brace ? 1.03 : .985, b.brace ? .96 : 1.01);
        frame(b.at + life*.54, b.x*.72, b.y*.58, b.tilt*.77, 1,1);
        frame(b.at + life*.79, -b.x*.10, 0, -b.tilt*.18, 1,1);
        frame(b.at + life, 0,0,0,1,1);
      });
      return animate(body, frames, total, start, 'linear', 'none');
    }
    // Lift only the painted portrait out of its HUD column. The outer node
    // follows the weapon point; rotating the pose about that point lets the
    // arm/weapon finish a strike while the wielder stays in contact range.
    function approach(hit, sourceArt, origin, targets, delay) {
      var portrait = sourceArt?.querySelector('img');
      var anchor = global.TowerVFX?.weaponAnchors?.[hit.source];
      if (!bounds || !anchor || !portrait?.naturalWidth || !portrait.cloneNode || !targets.length) return null;
      var closest = targets.reduce(function (a, b) {
        return Math.hypot(a.x-origin.x, a.y-origin.y) <= Math.hypot(b.x-origin.x, b.y-origin.y) ? a : b;
      });
      var contact = meleeContact(origin, closest, anchor, bounds, compact, art(find(closest.id)));
      var ax = origin.x + (anchor[0] - .5) * origin.width, ay = origin.y + (anchor[1] - .49) * origin.height;
      var actor = doc.createElement('div');
      actor.className = 'melee-actor'; actor.dataset.source = hit.source; actor.dataset.target = closest.id;
      actor.dataset.contactX = String(contact.x - bounds.left); actor.dataset.contactY = String(contact.y - bounds.top);
      Object.assign(actor.style, {left: (ax - bounds.left) + 'px', top: (ay - bounds.top) + 'px'});
      var pose = doc.createElement('div'); pose.className = 'melee-pose';
      Object.assign(pose.style, {left: -anchor[0] * origin.width + 'px', top: -anchor[1] * origin.height + 'px',
        width: origin.width + 'px', height: origin.height + 'px', transformOrigin: (anchor[0]*100) + '% ' + (anchor[1]*100) + '%'});
      var sprite = portrait.cloneNode(false); sprite.className = 'melee-portrait'; sprite.alt = '';
      var pin = doc.createElement('i'); pin.className = 'melee-weapon-pin';
      Object.assign(pin.style, {left: (anchor[0]*100)+'%', top: (anchor[1]*100)+'%'});
      pose.appendChild(sprite); pose.appendChild(pin); actor.appendChild(pose); layer.appendChild(actor); nodes.push(actor);

      var side = contact.side, flip = Math.sign(anchor[0] - .5) === side ? 1 : -1;
      var reach = Math.min(compact ? 12 : 25, origin.width * contact.scale * .14);
      var dx = contact.x - ax, dy = contact.y - ay;
      var count = 1 + targets.reduce(function (last, t) { return Math.max(last, t.strikeIndex); }, 0);
      var lastHit = 210 + (count-1)*105, duration = lastHit + 145;
      var path = [], poses = [];
      function key(at, x, y, scale, angle, facing, opacity) {
        path.push({offset: at/duration, visibility:'visible', opacity:opacity,
          transform:'translate('+x.toFixed(2)+'px,'+y.toFixed(2)+'px) scale('+scale.toFixed(4)+')'});
        poses.push({offset:at/duration, transform:'rotate('+(angle*side)+'deg) scaleX('+facing+')'});
      }
      var heavy = hit.cardId==='pecorine_heavy' || hit.source==='jun';
      var bend = heavy ? 12 : hit.source==='kaori' || hit.source==='miyako' ? 5 : 8;
      key(0,0,0,1,0,1,1);
      key(50,-side*reach*.4,2,1,-bend*.55,1,1);
      key(82,dx*.16,dy*.16-2,1,-bend*.4,1,.52);
      key(132,dx*.91-side*reach,dy*.92-4,contact.scale,-bend,flip,.93);
      key(165,dx-side*reach,dy-3,contact.scale,-bend*1.4,flip,1);
      for (var beat=0; beat<count; beat++) {
        var at=210+beat*105, angle=beat%2 ? -bend : bend;
        key(at,dx,dy,contact.scale,angle,flip,1);
        if (beat+1<count) key(at+54,dx-side*reach,dy+(beat%2 ? 2 : -3),contact.scale,-angle*.75,flip,1);
      }
      key(lastHit+31,dx-side*reach*.21,dy+1,contact.scale,bend*.38,flip,1);
      key(lastHit+64,dx*.82-side*reach,dy*.84-3,contact.scale,-bend*.32,flip,.9);
      key(lastHit+111,dx*.10,dy*.10-2,1,-bend*.22,1,.67);
      key(duration,0,0,1,0,1,1);
      // Neither visibility override survives cancel, a new action, or a
      // resize that removes the feedback layer. The callback resolves on
      // the pre-existing combo schedule, independently of image loading.
      all.push(animate(portrait,[{visibility:'hidden'},{visibility:'hidden'}],duration,delay,'linear','none'));
      all.push(animate(actor,path,duration,delay,'linear','none'));
      all.push(animate(pose,poses,duration,delay,'linear','none'));
      return { primary:closest.id, contact:contact, tip:function () {
        var box=pin.getBoundingClientRect(); return { x:box.left, y:box.top };
      }};
    }
    function attackPose(sourceArt, origin, target, posture, bossAction, delay, openingHit, heroHit) {
      var dx = target.x - origin.x, dy = target.y - origin.y;
      var distance = Math.max(1, Math.hypot(dx, dy));
      var ranged = posture === 'ranged', cast = posture === 'cast';
      var travel = cast ? 14 : ranged ? 28 : bossAction ? (compact ? 66 : 145) : (compact ? 29 : 54);
      var reach = Math.min(distance * .52, light ? travel * .65 : openingHit ? travel * 1.18 : travel);
      var x = dx / distance * reach, y = dy / distance * reach;
      var lean = (dx >= 0 ? 1 : -1) * (bossAction ? 16 : 10);
      var attackScale = openingHit && !light ? 1.18 : bossAction ? 1.12 : 1.09;
      var translate = function (a, b) { return a.toFixed(2) + 'px ' + b.toFixed(2) + 'px'; };
      var turn = function (angle) { return (depth ? '.12 .8 1 ' : '') + angle + 'deg'; };
      if (heroHit?.cardId && global.TowerVFX?.strikePose) {
        var frames = global.TowerVFX.strikePose(heroHit, x, y, compact, light, heroHit.comboHits);
        if (frames) return animate(sourceArt, frames.keys, frames.duration, delay, 'linear');
      }
      var duration = bossAction ? 560 : 390;
      var windup = cast ? translate(-x * .35, 7) : translate(-x * .25, -y * .25 + 3);
      var release = ranged ? translate(-x * .55, -y * .55 - 4) : translate(x, y - (cast ? 15 : 2));
      // Projectile users absorb their recoil at the firing position. Casters
      // rise out of a compressed stance; only a melee strike carries forward.
      var recovery = ranged ? translate(-x * .18, -y * .18) : cast ? translate(x * .22, -6) : translate(x * .76, y * .76);
      return animate(sourceArt, [
        { translate: '0px 0px', rotate: turn(0), scale: '1' },
        { translate: windup, rotate: turn(-lean * .55), scale: cast ? '1.08 .91' : '.96 1.04', offset: .26 },
        { translate: release, rotate: turn((ranged ? -.5 : cast ? .28 : 1) * lean), scale: cast ? '.97 1.11' : attackScale + ' .96', offset: 210 / duration },
        { translate: recovery, rotate: turn(lean * (ranged ? -.18 : .6)), scale: '1.04 1', offset: .68 },
        { translate: '0px 0px', rotate: turn(0), scale: '1' }
      ], duration, delay, 'linear');
    }
    function departure(origin, target, color, delay) {
      var foot = { x: origin.x, y: Math.min(bounds.top + bounds.height - 11, origin.y + origin.height * .47) };
      var scuff = size(mark('depth-step', foot, color), Math.min(130, origin.width * .9));
      var direction = target.x >= origin.x ? -1 : 1;
      return animate(scuff, [
        { opacity: 0, transform: 'translate(-50%,-50%) scale(.45,.66)' },
        { opacity: .82, transform: 'translate(-50%,-50%) scale(.8,1)', offset: .22 },
        { opacity: 0, transform: 'translate(calc(-50% + ' + direction * 25 + 'px),-88%) scale(1.45,1.3)' }
      ], 360, delay + 94);
    }
    function phaseOpeningEffect(sourceArt, origin, target, delay, impactAt, group) {
      layer.dataset.phaseOpening = opening.bossId;
      var color = openingStyle.color, motif = ' opening-' + openingStyle.motif;
      var middle = bounds.left + bounds.width / 2;
      var title = mark('phase-opening-title', { x: middle, y: bounds.top + Math.min(32, bounds.height * .15) }, color, opening.skillName);
      var work = [animate(title, [
        { opacity: 0 }, { opacity: 1, offset: .13 }, { opacity: 1, offset: .76 }, { opacity: 0 }
      ], reduce ? 290 : 530, delay, 'linear')];
      if (reduce) return work;

      var charge = size(mark('phase-opening-charge' + motif, origin, color), Math.min(compact ? 95 : 166, origin.height * .85));
      work.push(animate(charge, [
        { opacity: 0, transform: 'translate(-50%,-50%) scale(1.32)' },
        { opacity: .86, transform: 'translate(-50%,-50%) scale(.88)', offset: .37 },
        { opacity: 1, transform: 'translate(-50%,-50%) scale(.63)', offset: .59 },
        { opacity: 0, transform: 'translate(-50%,-50%) scale(1.57)' }
      ], 354, delay, 'linear'));
      if (light) return work;

      var backdrop = mark('phase-opening-backdrop', { x: middle, y: bounds.top + bounds.height / 2 }, color);
      work.push(animate(backdrop, [
        { opacity: 0 }, { opacity: .9, offset: .3 }, { opacity: .8, offset: .57 }, { opacity: 0 }
      ], 515, delay));
      var impactPoint = group ? { x: middle, y: origin.y } : target;
      var crest = size(mark('phase-opening-impact' + motif, impactPoint, color), Math.min(bounds.height * .92, group ? 208 : compact ? 80 : 124));
      work.push(fade(crest, 310, impactAt, group ? 2.7 : 1.66));
      if (opening.bossId === 'christina') {
        Array.from(sourceArt.querySelectorAll?.('.boss-form-wing') || []).forEach(function (wing) {
          work.push(animate(wing, [
            { scale: '1 1' }, { scale: '.54 .82', offset: .42 },
            { scale: '1.14 1.06', offset: .63 }, { scale: '1 1' }
          ], 445, delay));
        });
      }
      return work;
    }
    function bossStrike(origin, target, color, at, group) {
      var wave = size(mark('boss-rush-wave', target, color), Math.min(compact ? 150 : 260, bounds.height * .93));
      var angle = Math.atan2(target.y - origin.y, target.x - origin.x) * 180 / Math.PI;
      wave.style.setProperty('--rush-angle', group ? '0deg' : angle + 'deg');
      return animate(wave, [
        { opacity: 0, transform: 'translate(-50%,-50%) scale(.45)' },
        { opacity: .9, transform: 'translate(-50%,-50%) scale(1)', offset: .18 },
        { opacity: 0, transform: 'translate(-50%,-50%) scale(1.65)' }
      ], 380, Math.max(0, at - 65));
    }
    function bossTechnique(record, origin, p, delay, impactAt, first, group) {
      var style = record.bossStyle, kind = record.bossAttack, color = style.color;
      var subjectSize = Math.min(compact ? 110 : 190, origin.height * .78);
      var work = [];
      // Positions follow the cropped standing portrait, even in the wide solo arena.
      var tip = { x: origin.x + (style.weapon[0] - .5) * origin.width, y: origin.y + (style.weapon[1] - .49) * origin.height };
      if (kind === 'guard' || kind === 'debuff') {
        var defensive = kind === 'guard' && !record.ward ? 'rest' : kind;
        var stance = size(mark('boss-technique boss-' + defensive + ' boss-' + style.motif, origin, color), subjectSize);
        work.push(fade(stance, 500, delay, 1.3));
      } else if (kind === 'wave') {
        if (first) {
          var shock = size(mark('boss-technique boss-wave boss-' + style.motif, origin, color), Math.min(235, bounds.height * .95));
          work.push(animate(shock, [
            { opacity: 0, transform: 'translate(-50%,-50%) scale(.18)' },
            { opacity: .62, transform: 'translate(-50%,-50%) scale(.84)', offset: .28 },
            { opacity: .78, transform: 'translate(-50%,-50%) scale(1.32)', offset: .49 },
            { opacity: 0, transform: 'translate(-50%,-50%) scale(2.7)' }
          ], 570, delay));
        }
        work.push(fade(size(mark('boss-technique boss-wave-hit boss-' + style.motif, p, color), compact ? 74 : 130), 360, impactAt, 1.45));
      } else if (kind === 'volley' || kind === 'projectile') {
        var dx = p.x - tip.x, dy = p.y - tip.y;
        var flash = size(mark('boss-weapon-glint', tip, color), Math.min(compact ? 29 : 43, origin.height * .28));
        work.push(fade(flash, 145, delay + 8, 1.2));
        var flight = mark('boss-technique boss-shot boss-' + style.motif, tip, color);
        flight.style.setProperty('--shot-angle', Math.atan2(dy, dx) + 'rad');
        var flightFrames = [
          { opacity: 0, transform: 'translate(-50%,-50%) rotate(var(--shot-angle)) scale(.42)' },
          { opacity: 1, offset: .2, transform: 'translate(-50%,-50%) rotate(var(--shot-angle))' },
          { opacity: .95, transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px)) rotate(var(--shot-angle))' }
        ];
        // Misora's cannon points away from the party. Let the prism leave
        // the muzzle before it turns back towards the actual recipient.
        if (style.motif === 'prism' && !light) {
          var bend = Math.max(0, Math.min(compact ? 12 : 24, bounds.left + bounds.width - tip.x - 12));
          flightFrames[1] = { opacity: 1, offset: .27, transform: 'translate(calc(-50% + ' + bend + 'px), -105%) rotate(-18deg)' };
        }
        work.push(animate(flight, flightFrames, 136, Math.max(delay, impactAt - 136), 'ease-in').then(function () { flight.remove(); }));
        work.push(fade(size(mark('boss-technique boss-shot-hit boss-' + style.motif, p, color), compact ? 62 : 98), 280, impactAt, 1.3));
      } else if (kind === 'slash') {
        var blocked = record.absorbed > 0 && record.amount === 0;
        var contact = blocked ? { x: p.x + Math.sign(tip.x - p.x) * p.width * .26, y: p.y } : p;
        if (first) {
          var gleam = size(mark('boss-weapon-glint', tip, color), Math.min(compact ? 42 : 62, origin.height * .32));
          work.push(fade(gleam, 190, delay, 1.2));
        }
        var cut = mark('boss-blade-path', tip, color);
        cut.style.width = Math.hypot(contact.x - tip.x, contact.y - tip.y) + 'px';
        cut.style.rotate = Math.atan2(contact.y - tip.y, contact.x - tip.x) + 'rad';
        if (typeof global.requestAnimationFrame === 'function') {
          var readTip = weaponPoint(record.source, art(find(record.source)), origin, style.weapon);
          var followUntil = global.performance.now() + impactAt + 55;
          function followBlade(now) {
            if (done || !readTip || now > followUntil) return;
            var live = readTip(), layerBox = layer.getBoundingClientRect();
            cut.style.left = (live.x - layerBox.left) + 'px';
            cut.style.top = (live.y - layerBox.top) + 'px';
            cut.style.width = Math.hypot(contact.x - live.x, contact.y - live.y) + 'px';
            cut.style.rotate = Math.atan2(contact.y - live.y, contact.x - live.x) + 'rad';
            if (gleam) { gleam.style.left = cut.style.left; gleam.style.top = cut.style.top; }
            global.requestAnimationFrame(followBlade);
          }
          global.requestAnimationFrame(followBlade);
        }
        work.push(animate(cut, [
          { opacity: 0, scale: '.02 .55' },
          { opacity: .72, scale: '.26 .8', offset: .30 },
          { opacity: .98, scale: '1 1', offset: .62 },
          { opacity: 0, scale: '1 .14' }
        ], 145, Math.max(delay, impactAt - 90), 'linear'));
        if (!blocked) work.push(arc(contact, color, impactAt - 30, style.motif === 'ember' ? 61 : -35, true));
        if (group && !blocked) work.push(arc(contact, '#fff3d2', impactAt - 4, 29, true));
      }
      return work;
    }
    function shakeStage(at, power) {
      var frames = [
        { transform: 'translate(0,0)' },
        { transform: 'translate(' + -power + 'px,' + power * .42 + 'px)', offset: .12 },
        { transform: 'translate(' + power * .65 + 'px,' + -power * .27 + 'px)', offset: .28 },
        { transform: 'translate(' + -power * .38 + 'px,0)', offset: .45 },
        { transform: 'translate(' + power * .19 + 'px,0)', offset: .64 },
        { transform: 'translate(0,0)' }
      ];
      return [animate(arena, frames, 235, at, 'linear'), animate(layer, frames, 235, at, 'linear')];
    }
    function ring(p, color, delay, big) {
      var n = size(mark('impact-ring', p, color), big ? 112 : 78);
      return fade(n, big ? 600 : 440, delay, big ? 1.65 : 1.35);
    }
    function arc(p, color, delay, angle, wide) {
      var n = size(mark('arc', p, color), wide ? 208 : 145);
      n.style.setProperty('--fx-angle', angle + 'deg');
      return animate(n, [{ opacity: 0, transform: 'translate(-50%,-50%) rotate(' + (angle - 32) + 'deg) scale(.55)' },
        { opacity: .95, offset: .28, transform: 'translate(-50%,-50%) rotate(' + angle + 'deg) scale(1)' },
        { opacity: 0, transform: 'translate(-50%,-50%) rotate(' + (angle + 28) + 'deg) scale(1.12)' }], wide ? 510 : 370, delay);
    }
    function trail(from, to, color, delay, magic) {
      var dx = to.x - from.x, dy = to.y - from.y;
      var angle = Math.atan2(dy, dx) * 180 / Math.PI;
      var n = mark(magic ? 'spell-trail' : 'speed-trail', { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, color);
      n.style.width = Math.max(25, Math.hypot(dx, dy)) + 'px';
      n.style.setProperty('--fx-angle', angle + 'deg');
      return animate(n, [{ opacity: 0, transform: 'translate(-50%,-50%) rotate(' + angle + 'deg) scaleX(.12)' },
        { opacity: magic ? .75 : .48, offset: .5, transform: 'translate(-50%,-50%) rotate(' + angle + 'deg) scaleX(1)' },
        { opacity: 0, transform: 'translate(-50%,-50%) rotate(' + angle + 'deg) scaleX(.85)' }], magic ? 430 : 320, delay);
    }
    function rune(p, color, delay, big) {
      var n = size(mark('rune', p, color), big ? 154 : 98);
      return animate(n, [{ opacity: 0, transform: 'translate(-50%,-50%) rotate(-38deg) scale(.4)' },
        { opacity: .8, offset: .25, transform: 'translate(-50%,-50%) rotate(0deg) scale(1)' },
        { opacity: 0, transform: 'translate(-50%,-50%) rotate(42deg) scale(1.15)' }], big ? 760 : 560, delay);
    }
    function supportParticles(p, color, delay, kind, big) {
      if (reduce) return [];
      var count = big ? 8 : 5;
      return Array.from({ length: count }, function (_, i) {
        var angle = i / count * Math.PI * 2, radius = big ? 50 : 35;
        var from = { x: p.x + Math.cos(angle) * radius, y: p.y + Math.sin(angle) * radius * .7 + 16 };
        var n = mark(kind === 'heal' ? 'mote' : 'ward-shard', from, color);
        return animate(n, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.4) rotate(0deg)' },
          { opacity: .95, offset: .3 }, { opacity: 0, transform: 'translate(calc(-50% + ' + Math.cos(angle) * 15 + 'px),-62px) scale(.25) rotate(65deg)' }], 630, delay + i * 25);
      });
    }
    function sigil(owner, p, color, delay) {
      var max = bounds ? Math.min(bounds.height * .8, bounds.width * .65, 230) : 200;
      var n = size(mark('signature-' + owner, p, color), Math.max(90, max));
      var svg = {
        pecorine: '<path d="M100 10 113 51 108 112 131 121 128 133 108 129 107 165 113 176 100 187 87 176 93 165 92 129 72 133 69 121 92 112 87 51Z"/><path class="secondary" d="M100 25v92M84 124h32"/>',
        rei: '<path d="M30 155 143 28 162 13 153 37 48 169 30 180 37 158ZM40 20 61 35 173 152 178 176 156 164 45 48Z"/><path class="secondary" d="m37 171 116-144M49 36l116 128"/>',
        kokkoro: '<g fill="none"><circle cx="100" cy="100" r="61"/><circle cx="100" cy="100" r="72" stroke-dasharray="3 9"/></g><path d="M100 104Q57 73 83 48q20-10 17 42 0-55 22-42 22 27-21 56 52-19 49 8-15 25-49-6 22 46-6 46-24-10 3-45-44 29-48 3 5-23 49-6Z"/><path class="secondary" d="M48 142q-12-27 17-34 5 25-17 34ZM151 143q14-29-15-35-9 26 15 35Z"/>',
        kyaru: '<g fill="none"><circle cx="100" cy="100" r="78"/><circle cx="100" cy="100" r="62"/><path d="m100 22 68 117H32Zm0 156L32 61h136Z"/><circle cx="100" cy="100" r="27" stroke-dasharray="4 6"/></g><path d="m100 74 9 18 19 8-19 9-9 18-9-18-19-9 19-8Z"/>',
        hatsune: '<g fill="none"><circle cx="100" cy="100" r="60" stroke-dasharray="2 10"/><path d="m39 66 60-39 67 53-40 75-72-19Z"/></g><path d="m100 48 12 35 36 4-28 23 8 35-28-21-30 21 10-35-29-23 37-4Z"/><path class="secondary" d="m35 43 5 14 15 4-14 6-6 15-5-15-14-6 14-4Zm125 99 4 11 12 4-12 5-4 11-5-11-11-5 11-4Z"/>',
        yui: '<g fill="none"><ellipse cx="100" cy="51" rx="42" ry="13"/><circle cx="100" cy="100" r="65" stroke-dasharray="2 8"/></g><path d="M94 143Q45 130 32 67q38 9 51 38-28-11-28-10 15 33 40 38Zm12 0q49-13 62-76-38 9-51 38 28-11 28-10-15 33-40 38Z"/><path class="secondary" d="M100 95c-21-24-38 3 0 28 38-25 21-52 0-28Z"/>'
      };
      if (svg[owner]) n.innerHTML = '<svg viewBox="0 0 200 200" aria-hidden="true">' + svg[owner] + '</svg>';
      return animate(n, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.65)' },
        { opacity: .8, offset: .22, transform: 'translate(-50%,-50%) scale(1)' },
        { opacity: .75, offset: .58 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.15)' }], 1000, delay);
    }
    var all = [], sourceMoved = new Set(), recoils = new Map(), lastHitAt = new Map(), meleeActors = new Map();
    var bossShots = 0;
    var lastSource = null, actionAt = 0, stageShook = false, openingPlayed = false;
    records.forEach(function (e, i) {
      var targetEl = find(e.target), targetArt = art(targetEl), p = point(targetArt);
      if (!p) return;
      if (e.type === 'intentChange') {
        var intent = targetEl.querySelector('.intent');
        var callout = point(intent) || p;
        if (bounds) callout.x = Math.max(bounds.left + 44, Math.min(bounds.left + bounds.width - 44, callout.x));
        var at = (lastHitAt.get(e.target) || 0) + (reduce ? 0 : 60);
        var interrupted = mark('intent-break', callout, '#fce5b2', '突刺已打断');
        all.push(animate(interrupted, [{ opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: 1, offset: .75 }, { opacity: 0 }], 480, at));
        all.push(impact(e, at));
        return;
      }
      if (e.type === 'bossMove') {
        if (!reduce && bounds) {
          var braces = e.bossAttack === 'guard';
          all.push(animate(targetArt, [
            { scale: '1', translate: '0 0' },
            { scale: braces ? '.94 1.02' : '1.06 1.04', translate: braces ? '0 4px' : '0 -8px', offset: .32 },
            { scale: '1', translate: '0 0' }
          ], 410));
          var ward = Math.max(0, options.before?.enemies?.find(function (unit) { return unitId(unit) === e.source; })?.intent?.amount || 0);
          all = all.concat(bossTechnique(Object.assign({}, e, { ward: ward }), p, p, 0, 120, true));
        }
        return;
      }
      var sourceEl = find(e.source), sourceArt = art(sourceEl), origin = point(sourceArt) || p;
      if (e.cardId || e.status === 'buff') {
        origin.weapon = weaponPoint(e.source, sourceArt, origin);
        if (e.status === 'buff') p.weapon = weaponPoint(e.target, targetArt, p);
      }
      var color = colors[e.source] || (targetEl.classList.contains('enemy') ? '#e6c38b' : '#ff9d9d');
      if (e.source && lastSource && e.source !== lastSource) actionAt += 150;
      if (e.source) lastSource = e.source;
      // Group attacks remain simultaneous across targets; multiple hits on the
      // same target are staggered, so a sword combo reads as several strikes.
      var same = records.slice(0, i).filter(function (x) { return x.source === e.source && x.target === e.target && x.type === e.type; }).length;
      // Number consecutive shots by the action, not the target. A shot that
      // knocks a hero down can change targets without collapsing the cadence.
      var volleyStep = e.bossAttack === 'volley' ? bossShots++ : same;
      var delay = reduce ? 0 : Math.min(800, actionAt + volleyStep * 105), impactAt = delay + (reduce ? 0 : 210);
      var downAt = reduce ? 0 : (lastHitAt.get(e.target) ?? impactAt) + 130;
      var stripAt = delay + (reduce ? 0 : 165);
      all.push(impact(e, e.type === 'hit' ? impactAt : e.type === 'downed' ? downAt : e.type === 'stripBlock' ? stripAt : delay + 40));
      if (e.type === 'downed') {
        all.push(animate(targetArt, [{ opacity: 1, filter: 'grayscale(0)' }, { opacity: .4, filter: 'grayscale(1)' }], reduce ? 180 : 450, downAt));
        all.push(float(p, '#c6cbd8', '倒地', downAt + (reduce ? 0 : 130)));
        return;
      }
      if (e.type === 'hit') {
        lastHitAt.set(e.target, impactAt);
        var magic = e.visual === 'magic', enemyAttack = !targetEl.classList.contains('enemy');
        var melee = global.TowerVFX?.isMeleeCard?.(e), actor = null, contact = p, secondary = false;
        if (melee && !reduce && bounds) {
          if (!meleeActors.has(e.source)) {
            var recipients = records.filter(function (hit) {
              return hit.source === e.source && hit.cardId === e.cardId && global.TowerVFX.isMeleeCard(hit);
            }).map(function (hit) {
              var body = point(art(find(hit.target)));
              return body && Object.assign(body, {id:hit.target, strikeIndex:hit.strikeIndex || 0});
            }).filter(Boolean);
            meleeActors.set(e.source, approach(e, sourceArt, origin, recipients, delay));
          }
          actor = meleeActors.get(e.source);
          if (actor) {
            origin.weapon = actor.tip;
            secondary = actor.primary !== e.target;
            contact = secondary ? meleeContact(origin, p, global.TowerVFX.weaponAnchors[e.source], bounds, compact, targetArt) : actor.contact;
          }
        }
        var bossAction = e.sourceKind === 'enemy' && !!(sourceEl && (sourceEl.classList.contains('boss') || e.bossImpact));
        var openingHit = !!(openingStyle && !openingPlayed && bossAction && bounds && sourceArt && e.source === opening.unitId);
        var heavy = bossAction && (openingHit || e.bossImpact || (e.raw || e.amount) >= (phase ? 6 : 9));
        var group = !!(bossAction && options.before && options.before.enemies && options.before.enemies.some(function (unit) {
          return unitId(unit) === e.source && unit.intent && unit.intent.type === 'aoe';
        }));
        color = e.bossImpact ? boss.accent : magic ? colors[e.source] || '#b4c4ff' : enemyAttack ? '#ffac9d' : colors[e.source] || '#ffe1a2';
        if (e.bossStyle) color = e.bossStyle.color;
        if (openingHit) {
          openingPlayed = true;
          all = all.concat(phaseOpeningEffect(sourceArt, origin, p, delay, impactAt, group));
        }
        var technique = !reduce && bounds && e.bossAttack && !e.bossImpact;
        if (technique) all = all.concat(bossTechnique(e, origin, p, delay, impactAt, !sourceMoved.has(e.source), group));
        var enemyPose = enemyMotion && enemyMotion.cue(e, sourceArt, origin, p, delay, impactAt);
        var stageMotion = !!(technique || enemyPose?.projectile);
        if (canvas) canvas.cue(e, {origin:origin,target:p,color:color,delay:delay,impactAt:impactAt,stageMotion:stageMotion,
          meleeContact:melee && contact,secondaryMelee:secondary});
        if (!reduce && sourceArt && e.source !== e.target && !sourceMoved.has(e.source) && !indirectHits.has(e.sourceKind)) {
          sourceMoved.add(e.source);
          var profile = global.TowerVFX && global.TowerVFX.profiles && global.TowerVFX.profiles[e.source];
          var rangedAttack = e.bossAttack === 'projectile' || e.bossAttack === 'volley' || profile?.family === 'arrow';
          var posture = group || e.bossAttack === 'wave' ? 'cast' : rangedAttack ? 'ranged' : magic ? 'cast' : 'melee';
          if (e.cardId) e.comboHits = 1 + records.reduce(function (last, hit) {
            return hit.cardId === e.cardId && hit.source === e.source ? Math.max(last, hit.strikeIndex || 0) : last;
          }, 0);
          if (!enemyPose && !actor) {
            all.push(attackPose(sourceArt, origin, p, posture, bossAction, delay, openingHit, e));
          }
          if (!enemyPose && depth && bounds && posture === 'melee') all.push(departure(origin, p, color, delay));
          if (heavy && bounds) {
            var windup = size(mark('boss-windup', origin, color), Math.min(148, origin.height * .63));
            all.push(fade(windup, 285, delay, 1.2));
            if (!light && !stageShook) {
              stageShook = true;
              all = all.concat(shakeStage(impactAt, compact ? 3 : phase ? 9 : 6));
            }
          }
          if (magic && !canvas) {
            var charge = size(mark('cast-ring', origin, color), 72);
            all.push(fade(charge, 430, delay, 1.15));
          }
        }
        if (!reduce && heavy && bounds && same === 0 && (!technique || e.bossAttack === 'slash')) all.push(bossStrike(origin, p, color, impactAt, group));
        if (magic && !reduce && !canvas && !stageMotion) {
          var missile = mark('missile', origin, color), dx = p.x - origin.x, dy = p.y - origin.y;
          all.push(trail(origin, p, color, delay, true));
          all.push(animate(missile, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: 1, offset: .15 }, { opacity: 1, transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px)) scale(.9)' }], 230, delay, 'ease-in'));
          all.push(rune(p, color, delay + 60, e.burst));
          for (var ghost = 1; ghost <= 2; ghost++) {
            var echo = mark('spell-echo', { x: origin.x + dx * .15 * ghost, y: origin.y + dy * .15 * ghost }, color);
            all.push(animate(echo, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.25)' }, { opacity: .65, offset: .2 },
              { opacity: 0, transform: 'translate(calc(-50% + ' + dx * (1 - .15 * ghost) + 'px),calc(-50% + ' + dy * (1 - .15 * ghost) + 'px)) scale(.5)' }], 290, delay + ghost * 30, 'ease-in'));
          }
        } else if (melee && !reduce && !canvas) {
          if (!secondary) {
            var closeCut = size(mark('melee-contact-cut', contact, color), Math.max(16, Math.min(compact ? 46 : 70, p.width * .54)));
            closeCut.style.rotate = (same % 2 ? 32 : -28) + 'deg';
            all.push(fade(closeCut, 140, impactAt - 15, 1.08));
          }
        } else if (!reduce && !canvas && !stageMotion) {
          if (sourceArt) all.push(trail(origin, p, color, delay, false));
          all.push(arc(p, color, impactAt - 65, enemyAttack ? 30 : -25, e.burst));
          if (!enemyAttack) {
            var cross = mark('cross-cut', p, color); cross.style.setProperty('--fx-angle', same % 2 ? '-32deg' : '38deg');
            all.push(fade(cross, e.burst ? 500 : 320, impactAt + 55, e.burst ? 1.6 : 1.1));
          }
        }
        if (!canvas) {
          var hit = mark(melee ? 'melee-contact-spark' : magic ? 'blast' : enemyPose?.projectile ? 'impact-core' : enemyAttack ? 'claw' : 'slash', contact, color);
          all.push(fade(hit, reduce ? 220 : e.burst ? 560 : 360, impactAt, e.burst ? 2.1 : 1.45));
          if (!melee) all = all.concat(particles(p, color, impactAt, e.burst ? 10 : 6));
        }
        if (!reduce) {
          if (!canvas && !melee) {
            all.push(ring(p, color, impactAt + 15, e.burst));
            var core = mark('impact-core', p, color);
            all.push(fade(core, e.burst ? 330 : 240, impactAt, e.burst ? 1.7 : 1.2));
          }
        }
        var side = actor ? contact.side : p.x >= origin.x ? 1 : -1;
        if (e.absorbed > 0) {
          var wardPoint = actor ? contact : { x:p.x - side*p.width*.18, y:p.y };
          all.push(shieldContact(wardPoint, side, e.amount > 0, impactAt, p.height));
        }
        if (!reduce && (e.amount > 0 || e.absorbed > 0)) {
          var isBossTarget = targetEl.classList.contains('boss');
          var body = isBossTarget ? targetArt : targetArt.querySelector('img, .enemy-glyph') || targetArt;
          var brace = !e.amount, weight = Math.min(1, (e.amount || 0)/10);
          var maxPush = Math.min(compact ? 12 : 25, p.width*.14) * (light ? .72 : 1);
          if (isBossTarget) maxPush *= .62;
          var force = brace ? maxPush*.10 : maxPush*(.34+.66*weight);
          var dy = !actor && compact ? Math.sign(p.y-origin.y)*force*.30 : 0;
          if (magic && !brace) dy -= force*.42;
          var beats = recoils.get(body);
          if (!beats) recoils.set(body, beats = []);
          beats.push({ at:impactAt, x:force*side, y:brace ? 2 : dy, tilt:side*(brace ? .45 : 1.8+weight*3.1),
            force:force, brace:brace, life:brace ? 110 : 150+weight*86 });
        }
        if (e.encouragement) {
          var status = sourceEl?.querySelector('[data-status="buff"]');
          if (status) all.push(animate(status, [{}, { backgroundColor: '#c1ffe5', color: '#184b36', boxShadow: '0 0 0 2px #87e6b5', offset: .24 }, {}], 280, impactAt));
        }
        all.push(float(p, e.amount > 0 ? '#fff0db' : '#bbe1ff', e.amount > 0 ? '−' + e.amount : e.absorbed > 0 ? '格挡' : '0', impactAt + (e.encouragement ? 0 : 20), e.burst, false, e.encouragement, actor && contact.side));
        if (e.absorbed > 0 && e.amount > 0) all.push(float({ x: p.x, y: p.y + 32, height: 0 }, '#b1dcff', '护盾吸收 ' + e.absorbed, impactAt + 90));
      } else {
        var heal = e.type === 'heal', block = e.type === 'block', payment = e.type === 'payHp', negative = e.type === 'debuff' || ['breakAmount', 'weak', 'curseExpires', 'stars'].includes(e.status);
        color = payment ? '#ff91ac' : heal ? '#9cf4c4' : block ? '#a6dcff' : negative ? '#d6b0ff' : colors[e.source] || '#d9f6cf';
        if (supportActor && sourceArt && supportActor === e.source && !sourceMoved.has(e.source) &&
            (heal || block || e.type === 'cleanse' || e.type === 'support' || e.type === 'status')) {
          sourceMoved.add(e.source);
          all.push(animate(sourceArt, [
            { translate: '0 0', scale: '1' },
            { translate: '0 -5px', scale: '.98 1.06', offset: .15 },
            { translate: '0 -3px', scale: '1 1.025', offset: .48 },
            { translate: '0 0', scale: '1' }
          ], 270, delay));
        }
        if (canvas && !payment) canvas.cue(e, {origin:origin,target:p,color:color,delay:delay,impactAt:delay+40});
        var glow = mark(heal ? 'heal' : block ? 'shield' : 'aura', p, color);
        all.push(fade(glow, reduce ? 250 : 600, delay, 1.3));
        if (!reduce && !canvas) {
          var floor = size(mark('ground-halo', { x: p.x, y: p.y + Math.min(46, p.height * .25) }, color), block ? 108 : 125);
          all.push(fade(floor, 700, delay, 1.3));
          all = all.concat(supportParticles(p, color, delay + 70, heal ? 'heal' : 'block', e.burst));
          if (block) {
            var crest = mark('ward-crest', p, color);
            all.push(fade(crest, 590, delay + 90, 1.1));
          }
        }
        if (heal && !reduce && !canvas) {
          for (var j = 0; j < 3; j++) {
            var plus = mark('plus', { x: p.x - 32 + j * 32, y: p.y + 30 }, color, '+');
            all.push(animate(plus, [{ opacity: 0, transform: 'translate(-50%,0)' }, { opacity: 1, offset: .2 }, { opacity: 0, transform: 'translate(-50%,-85px)' }], 650, delay + j * 55));
          }
        }
        var label = payment ? '付血 −' + e.amount : heal ? '+' + e.amount : block ? '护盾 +' + e.amount : e.type === 'stripBlock' ? '剥盾 −' + e.amount : e.type === 'cleanse' ? '净化' : e.type === 'debuff' ? '负面状态' : e.label || '支援';
        var numberPoint = { x: p.x, y: p.y + (heal ? -10 : block ? 28 : 19), height: 0 };
        all.push(float(numberPoint, color, label, e.type === 'stripBlock' ? stripAt : delay + 40, false, !heal));
      }
      if (typeof options.onCue === 'function') { try { options.onCue(e); } catch (_) {} }
    });
    if (boss && records.some(function (e) { return e.bossImpact; })) {
      layer.dataset.bossImpact = boss.bossId;
      var bossTargets = [], bossSeen = new Set();
      records.filter(function (e) { return e.bossImpact; }).forEach(function (e) { if (bossSeen.has(e.target)) return; bossSeen.add(e.target); var p = point(art(find(e.target))); if (p) bossTargets.push(p); });
      if (!reduce && bossTargets.length && !canvas) {
        var center = { x: bossTargets.reduce(function (sum, p) { return sum + p.x; }, 0) / bossTargets.length, y: bossTargets.reduce(function (sum, p) { return sum + p.y; }, 0) / bossTargets.length };
        if (bounds) {
          var dark = mark('vignette boss-impact-vignette', { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }, boss.color);
          dark.style.width = bounds.width + 'px'; dark.style.height = bounds.height + 'px';
          all.push(animate(dark, [{ opacity: 0 }, { opacity: .95, offset: .18 }, { opacity: .6, offset: .6 }, { opacity: 0 }], 850));
        }
        all.push(fade(size(mark('boss-impact-wave', center, boss.accent), Math.min(170, bounds ? bounds.height * .8 : 170)), 780, 110, 2.1));
        if (boss.bossId === 'christina') {
          all.push(arc(center, '#ffcd8c', 180, -35, true)); all.push(arc(center, '#e47d79', 270, 35, true));
        } else if (boss.bossId === 'neneka') {
          bossTargets.forEach(function (p, i) { var mirror = size(mark('boss-mirror-impact', p, '#ddbcff'), 95); all.push(fade(mirror, 650, 100 + i * 35, 1.5)); });
        } else {
          for (var blade = 0; blade < 6; blade++) {
            var dx = (blade - 2.5) * 31, curtain = mark('boss-blade', { x: center.x + dx, y: center.y - 45 }, '#e99da5');
            all.push(animate(curtain, [{ opacity: 0, transform: 'translate(-50%,-50%) rotate(17deg) scaleY(.3)' }, { opacity: .85, offset: .3 }, { opacity: 0, transform: 'translate(-50%,calc(-50% + 70px)) rotate(17deg) scaleY(1.2)' }], 540, 70 + blade * 55));
          }
        }
      }
      if (canvas && bossTargets.length) canvas.boss({bossId:boss.bossId,focus:{x:bossTargets.reduce(function (n,p){return n+p.x;},0)/bossTargets.length,y:bossTargets.reduce(function (n,p){return n+p.y;},0)/bossTargets.length},targets:bossTargets,color:boss.accent});
    }
    var burstEvent = (options.events || []).find(function (e) { return e.type === 'burst'; });
    if ((options.burst || burstEvent) && records.length) {
      var owner = options.owner || burstEvent && burstEvent.source || records[0].source, color = colors[owner] || '#ffe3ad';
      var unique = [], seen = new Set();
      var strikeRecords = records.filter(function (e) { return e.type === 'hit' && e.source === owner; });
      var focusRecords = strikeRecords.length ? strikeRecords : records.filter(function (e) { return ['heal','block','status','support'].includes(e.type); });
      focusRecords.forEach(function (e) {
        if (seen.has(e.target)) return; seen.add(e.target); var p = point(art(find(e.target))); if (p) unique.push(p);
      });
      var caster = point(art(find(owner))), focus = unique.length ? { x: unique.reduce(function (n, p) { return n + p.x; }, 0) / unique.length, y: unique.reduce(function (n, p) { return n + p.y; }, 0) / unique.length } : caster;
      if (focus) {
        layer.dataset.signature = owner;
        if (reduce) {
          var seal = size(mark('signature-' + owner + ' quiet-seal', focus, color), 80);
          seal.textContent = owner === 'hatsune' ? '✦' : owner === 'yui' ? '♡' : owner === 'kokkoro' ? '❀' : '◇';
          all.push(fade(seal, 360, 0, 1));
        } else if (canvas) {
          canvas.burst({owner:owner,focus:focus,targets:unique,color:color});
        } else {
          if (bounds) {
            var stage = mark('vignette', { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }, color);
            stage.style.width = bounds.width + 'px'; stage.style.height = bounds.height + 'px';
            all.push(animate(stage, [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: .8, offset: .55 }, { opacity: 0 }], 1050, 0));
          }
          all.push(sigil(owner, focus, color, 0));
          all.push(fade(size(mark('burst-wave', focus, color), 155), 850, 180, 2.3));
          if (owner === 'pecorine') {
            var sword = size(mark('royal-sword', focus, color), bounds ? Math.min(240, bounds.height * .9) : 220);
            all.push(animate(sword, [{ opacity: 0, transform: 'translate(-50%,calc(-50% - 38px)) scaleY(.4)' }, { opacity: 1, offset: .28, transform: 'translate(-50%,-50%) scaleY(1)' }, { opacity: .95, offset: .46 }, { opacity: 0, transform: 'translate(-50%,calc(-50% + 20px)) scaleY(1.1)' }], 760, 80));
            all.push(arc(focus, color, 260, -14, true));
          } else if (owner === 'rei') {
            [-38, 39, -17].forEach(function (angle, i) { all.push(arc({ x: focus.x + (i - 1) * 10, y: focus.y + (i - 1) * 9 }, i === 1 ? '#e7f5ff' : color, 95 + i * 110, angle, true)); });
          } else if (owner === 'kokkoro') {
            for (var leaf = 0; leaf < 10; leaf++) {
              var angle = leaf / 10 * Math.PI * 2, petal = mark('leaf', focus, color);
              all.push(animate(petal, [{ opacity: 0, transform: 'translate(-50%,-50%) rotate(' + leaf * 36 + 'deg) scale(.2)' }, { opacity: .9, offset: .25 }, { opacity: 0, transform: 'translate(calc(-50% + ' + Math.cos(angle) * 105 + 'px),calc(-50% + ' + Math.sin(angle) * 64 + 'px)) rotate(' + (leaf * 36 + 130) + 'deg) scale(.75)' }], 860, leaf * 22));
            }
            all.push(arc(focus, color, 140, 8, true)); all.push(arc(focus, '#d5ffe2', 260, 168, true));
          } else if (owner === 'kyaru') {
            all.push(rune(focus, color, 0, true));
            var voidCore = size(mark('void', focus, color), bounds ? Math.min(150, bounds.height * .6) : 150);
            all.push(fade(voidCore, 820, 100, 1.6));
            for (var thread = 0; thread < 6; thread++) {
              var angle = thread * Math.PI / 3, orb = mark('void-orb', { x: focus.x + Math.cos(angle) * 105, y: focus.y + Math.sin(angle) * 70 }, color);
              all.push(animate(orb, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: .85, offset: .25 }, { opacity: 0, transform: 'translate(calc(-50% - ' + Math.cos(angle) * 105 + 'px),calc(-50% - ' + Math.sin(angle) * 70 + 'px)) scale(.1)' }], 680, 50 + thread * 25, 'ease-in'));
            }
          } else if (owner === 'hatsune') {
            unique.forEach(function (target, index) {
              for (var s = 0; s < 3; s++) {
                var fall = Math.min(125, bounds ? bounds.height * .6 : 125), star = mark('meteor', { x: target.x + 35 + s * 12, y: Math.max(bounds ? bounds.top + 8 : 0, target.y - fall) }, s === 1 ? '#f4b8ec' : '#bce4ff');
                all.push(animate(star, [{ opacity: 0, transform: 'translate(-50%,-50%) rotate(-24deg) scale(.4)' }, { opacity: 1, offset: .2 }, { opacity: 0, transform: 'translate(calc(-50% - ' + (35 + s * 12) + 'px),calc(-50% + ' + fall + 'px)) rotate(-24deg) scale(.9)' }], 560, index * 50 + s * 95, 'ease-in'));
              }
            });
          } else if (owner === 'yui') {
            unique.forEach(function (target, i) {
              var blessing = mark('blessing', { x: target.x, y: target.y - 25 }, '#ffe0ba');
              all.push(animate(blessing, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.6)' }, { opacity: .95, offset: .3 }, { opacity: 0, transform: 'translate(-50%,calc(-50% - 35px)) scale(1.25)' }], 820, 100 + i * 55));
            });
          }
        }
      }
    }
    recoils.forEach(function (beats, body) { all.push(recoilTrack(body, beats)); });
    if (canvas) all.push(canvas.finished);
    Promise.all(all).then(cleanup, cleanup);
    return promise;
  }
  return { play: play, plan: plan };
});
