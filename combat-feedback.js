(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TowerFeedback = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';
  var owners = new WeakMap();
  var colors = { pecorine: '#ffd078', rei: '#9adaff', kokkoro: '#8debc1', kyaru: '#ba82ff', hatsune: '#c3b6ff', yui: '#ffc4ce' };
  Object.values(global.TowerContent && global.TowerContent.heroes || {}).forEach(function (h) { if (h.color) colors[h.id] = h.color; });
  var statusLabels = { buff: '鼓舞', breakAmount: '破甲', weak: '减攻', stars: '星屑', curseExpires: '咒痕', coverFrom: '掩护' };
  function units(b) { return b ? (b.party || []).concat(b.enemies || []) : []; }
  function unitId(u) { return u && (u.uid || u.id); }
  function plan(options) {
    options = options || {};
    var events = options.events || [], output = [], actionOwner = options.owner || null;
    events.forEach(function (e) {
      if (e.type === 'play' || e.type === 'burst') actionOwner = e.source || actionOwner;
      if (e.type === 'relic' && e.relicId === 'last_ember_locket') output.push({type:'status',visual:'status',target:e.target,source:e.target,label:'命锁 · 留下1生命',amount:0});
      if (['hit', 'heal', 'block', 'cleanse', 'debuff', 'downed', 'payHp'].includes(e.type) && e.target) {
        output.push(Object.assign({}, e, { source: e.source || actionOwner,
          visual: e.type === 'hit' ? (e.damageType === 'magic' || e.sourceKind === 'star' ? 'magic' : 'physical') : e.type,
          burst: !!options.burst || e.sourceKind === 'burst' }));
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
    var records = plan(options), animations = [], nodes = [], cancelled = false, done = false;
    var boss = options.boss || null;
    records.forEach(function (e) {
      if (boss && e.type === 'hit' && e.source === boss.unitId && e.sourceKind === 'enemy') {
        e.burst = true; e.bossImpact = true;
        if (boss.bossId !== 'christina') e.visual = 'magic';
      }
    });
    var layer = doc.createElement('div'); layer.className = 'combat-fx-layer' + (reduce ? ' reduced-motion' : ''); layer.setAttribute('aria-hidden', 'true');
    var arena = scope.querySelector && scope.querySelector('.arena'), arenaRect = arena && arena.getBoundingClientRect();
    var bounds = arenaRect && arenaRect.width > 0 && arenaRect.height > 0 ? { left: arenaRect.left, top: arenaRect.top, width: arenaRect.width, height: arenaRect.height } : null;
    // All generated artwork is clipped to the real arena, including a compact
    // arena on a phone. Coordinates are still measured from the live fighters.
    if (bounds) {
      layer.style.left = bounds.left + 'px'; layer.style.top = bounds.top + 'px';
      layer.style.width = bounds.width + 'px'; layer.style.height = bounds.height + 'px';
      layer.style.right = 'auto'; layer.style.bottom = 'auto';
      layer.dataset.arenaBounded = 'true';
    }
    (doc.body || scope).appendChild(layer);
    var resolve, promise = new Promise(function (yes) { resolve = yes; });
    function cleanup() {
      if (done) return; done = true;
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
      return { x: r.left + r.width / 2, y: r.top + r.height * .49, width: r.width, height: r.height };
    }
    function mark(kind, p, color, text) {
      var n = doc.createElement('span'); n.className = 'combat-fx fx-' + kind;
      n.style.left = (p.x - (bounds ? bounds.left : 0)) + 'px'; n.style.top = (p.y - (bounds ? bounds.top : 0)) + 'px'; n.style.setProperty('--fx-color', color);
      if (text) n.textContent = text; layer.appendChild(n); nodes.push(n); return n;
    }
    function animate(el, frames, duration, delay, easing) {
      if (!el || cancelled || typeof el.animate !== 'function') return Promise.resolve();
      var animation;
      try { animation = el.animate(frames, { duration: duration, delay: delay || 0, easing: easing || 'cubic-bezier(.18,.72,.25,1)', fill: 'both' }); }
      catch (_) { return Promise.resolve(); }
      animations.push(animation); return animation.finished.catch(function () {});
    }
    function fade(n, duration, delay, scale) {
      return animate(n, reduce ? [{ opacity: 0 }, { opacity: 1, offset: .25 }, { opacity: 0 }] :
        [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.25)' }, { opacity: 1, offset: .2, transform: 'translate(-50%,-50%) scale(.9)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(' + (scale || 1.5) + ')' }], duration, delay);
    }
    function float(p, color, text, delay, big) {
      var anchor = { x: p.x, y: p.y - Math.min(35, p.height * .18) };
      if (bounds) {
        anchor.x = Math.max(bounds.left + 34, Math.min(bounds.left + bounds.width - 34, anchor.x));
        anchor.y = Math.max(bounds.top + Math.min(58, bounds.height * .32), anchor.y);
      }
      var n = mark('number' + (big ? ' big' : ''), anchor, color, text);
      return animate(n, reduce ? [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 0 }] :
        [{ opacity: 0, transform: 'translate(-50%,10px) scale(.75)' }, { opacity: 1, transform: 'translate(-50%,-8px) scale(1.12)', offset: .22 }, { opacity: 1, offset: .6 }, { opacity: 0, transform: 'translate(-50%,-65px) scale(1)' }], reduce ? 350 : 720, delay);
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
    var all = [], sourceTimes = new Map(), sourceMoved = new Set(), targetMoved = new Set(), lastSource = null, actionAt = 0;
    records.forEach(function (e, i) {
      var targetEl = find(e.target), targetArt = art(targetEl), p = point(targetArt);
      if (!p) return;
      var sourceEl = find(e.source), sourceArt = art(sourceEl), origin = point(sourceArt) || p;
      var color = colors[e.source] || (targetEl.classList.contains('enemy') ? '#e6c38b' : '#ff9d9d');
      if (e.source && e.source !== lastSource && sourceTimes.size) actionAt += 150;
      lastSource = e.source;
      var count = sourceTimes.get(e.source) || 0; sourceTimes.set(e.source, count + 1);
      // Group attacks remain simultaneous across targets; multiple hits on the
      // same target are staggered, so a sword combo reads as several strikes.
      var same = records.slice(0, i).filter(function (x) { return x.source === e.source && x.target === e.target && x.type === e.type; }).length;
      var delay = reduce ? 0 : Math.min(800, actionAt + same * 105), impactAt = delay + (reduce ? 0 : 210);
      if (e.type === 'downed') {
        all.push(animate(targetArt, [{ opacity: 1, filter: 'grayscale(0)' }, { opacity: .4, filter: 'grayscale(1)' }], reduce ? 180 : 450, delay + (reduce ? 0 : 350)));
        all.push(float(p, '#c6cbd8', '倒地', delay + (reduce ? 0 : 480)));
        return;
      }
      if (e.type === 'hit') {
        var magic = e.visual === 'magic', enemyAttack = !targetEl.classList.contains('enemy');
        color = e.bossImpact ? boss.accent : magic ? colors[e.source] || '#b4c4ff' : enemyAttack ? '#ffac9d' : colors[e.source] || '#ffe1a2';
        if (!reduce && sourceArt && !sourceMoved.has(e.source)) {
          sourceMoved.add(e.source);
          var direction = p.x >= origin.x ? 1 : -1;
          all.push(animate(sourceArt, magic ? [{ filter: 'brightness(1)' }, { filter: 'brightness(1.35) drop-shadow(0 0 13px ' + color + ')', offset: .4 }, { filter: 'brightness(1)' }] :
            [{ transform: 'translateX(0)' }, { transform: 'translateX(' + direction * 13 + 'px)', offset: .3 }, { transform: 'translateX(' + direction * 13 + 'px)', offset: .42 }, { transform: 'translateX(0)' }], 410, delay));
          if (magic) {
            var charge = size(mark('cast-ring', origin, color), 72);
            all.push(fade(charge, 430, delay, 1.15));
          }
        }
        if (magic && !reduce) {
          var missile = mark('missile', origin, color), dx = p.x - origin.x, dy = p.y - origin.y;
          all.push(trail(origin, p, color, delay, true));
          all.push(animate(missile, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.3)' }, { opacity: 1, offset: .15 }, { opacity: 1, transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px)) scale(.9)' }], 230, delay, 'ease-in'));
          all.push(rune(p, color, delay + 60, e.burst));
          for (var ghost = 1; ghost <= 2; ghost++) {
            var echo = mark('spell-echo', { x: origin.x + dx * .15 * ghost, y: origin.y + dy * .15 * ghost }, color);
            all.push(animate(echo, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.25)' }, { opacity: .65, offset: .2 },
              { opacity: 0, transform: 'translate(calc(-50% + ' + dx * (1 - .15 * ghost) + 'px),calc(-50% + ' + dy * (1 - .15 * ghost) + 'px)) scale(.5)' }], 290, delay + ghost * 30, 'ease-in'));
          }
        } else if (!reduce) {
          if (sourceArt) all.push(trail(origin, p, color, delay, false));
          all.push(arc(p, color, impactAt - 65, enemyAttack ? 30 : -25, e.burst));
          if (!enemyAttack) {
            var cross = mark('cross-cut', p, color); cross.style.setProperty('--fx-angle', same % 2 ? '-32deg' : '38deg');
            all.push(fade(cross, e.burst ? 500 : 320, impactAt + 55, e.burst ? 1.6 : 1.1));
          }
        }
        var hit = mark(magic ? 'blast' : enemyAttack ? 'claw' : 'slash', p, color);
        all.push(fade(hit, reduce ? 220 : e.burst ? 560 : 360, impactAt, e.burst ? 2.1 : 1.45));
        all = all.concat(particles(p, color, impactAt, e.burst ? 10 : 6));
        if (!reduce) {
          all.push(ring(p, color, impactAt + 15, e.burst));
          var core = mark('impact-core', p, color);
          all.push(fade(core, e.burst ? 330 : 240, impactAt, e.burst ? 1.7 : 1.2));
          if (!targetMoved.has(e.target)) {
            targetMoved.add(e.target);
            all.push(animate(targetArt, [{ filter: 'brightness(1)', transform: 'translateX(0)' },
              { filter: 'brightness(1.6)', transform: 'translateX(-5px)', offset: .15 },
              { filter: 'brightness(1.6)', transform: 'translateX(-5px)', offset: .28 },
              { transform: 'translateX(4px)', offset: .48 }, { filter: 'brightness(1)', transform: 'translateX(0)' }], e.burst ? 390 : 310, impactAt));
          }
        }
        all.push(float(p, e.amount > 0 ? '#fff0db' : '#bbe1ff', e.amount > 0 ? '−' + e.amount : '格挡', impactAt + 20, e.burst));
        if (e.absorbed > 0 && e.amount > 0) all.push(float({ x: p.x, y: p.y + 32, height: 0 }, '#b1dcff', '护盾吸收 ' + e.absorbed, impactAt + 90));
      } else {
        var heal = e.type === 'heal', block = e.type === 'block', payment = e.type === 'payHp', negative = e.type === 'debuff' || ['breakAmount', 'weak', 'curseExpires', 'stars'].includes(e.status);
        color = payment ? '#ff91ac' : heal ? '#9cf4c4' : block ? '#a6dcff' : negative ? '#d6b0ff' : colors[e.source] || '#d9f6cf';
        var glow = mark(heal ? 'heal' : block ? 'shield' : 'aura', p, color);
        all.push(fade(glow, reduce ? 250 : 600, delay, 1.3));
        if (!reduce) {
          var floor = size(mark('ground-halo', { x: p.x, y: p.y + Math.min(46, p.height * .25) }, color), block ? 108 : 125);
          all.push(fade(floor, 700, delay, 1.3));
          all = all.concat(supportParticles(p, color, delay + 70, heal ? 'heal' : 'block', e.burst));
          if (block) {
            var crest = mark('ward-crest', p, color);
            all.push(fade(crest, 590, delay + 90, 1.1));
          }
        }
        if (heal && !reduce) {
          for (var j = 0; j < 3; j++) {
            var plus = mark('plus', { x: p.x - 32 + j * 32, y: p.y + 30 }, color, '+');
            all.push(animate(plus, [{ opacity: 0, transform: 'translate(-50%,0)' }, { opacity: 1, offset: .2 }, { opacity: 0, transform: 'translate(-50%,-85px)' }], 650, delay + j * 55));
          }
        }
        var label = payment ? '付血 −' + e.amount : heal ? '+' + e.amount : block ? '护盾 +' + e.amount : e.type === 'cleanse' ? '净化' : e.type === 'debuff' ? '负面状态' : e.label || '支援';
        var numberPoint = { x: p.x, y: p.y + (heal ? -10 : block ? 28 : 19), height: 0 };
        all.push(float(numberPoint, color, label, delay + 40, false));
      }
      if (typeof options.onCue === 'function') { try { options.onCue(e); } catch (_) {} }
    });
    if (boss && records.some(function (e) { return e.bossImpact; })) {
      layer.dataset.bossImpact = boss.bossId;
      var bossTargets = [], bossSeen = new Set();
      records.filter(function (e) { return e.bossImpact; }).forEach(function (e) { if (bossSeen.has(e.target)) return; bossSeen.add(e.target); var p = point(art(find(e.target))); if (p) bossTargets.push(p); });
      if (!reduce && bossTargets.length) {
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
    }
    var burstEvent = (options.events || []).find(function (e) { return e.type === 'burst'; });
    if ((options.burst || burstEvent) && records.length) {
      var owner = options.owner || burstEvent && burstEvent.source || records[0].source, color = colors[owner] || '#ffe3ad';
      var unique = [], seen = new Set();
      records.filter(function (e) { return e.type === 'hit' || (['kokkoro', 'yui'].includes(owner) && ['heal', 'block'].includes(e.type)); }).forEach(function (e) {
        if (seen.has(e.target)) return; seen.add(e.target); var p = point(art(find(e.target))); if (p) unique.push(p);
      });
      var caster = point(art(find(owner))), focus = unique.length ? { x: unique.reduce(function (n, p) { return n + p.x; }, 0) / unique.length, y: unique.reduce(function (n, p) { return n + p.y; }, 0) / unique.length } : caster;
      if (focus) {
        layer.dataset.signature = owner;
        if (reduce) {
          var seal = size(mark('signature-' + owner + ' quiet-seal', focus, color), 80);
          seal.textContent = owner === 'hatsune' ? '✦' : owner === 'yui' ? '♡' : owner === 'kokkoro' ? '❀' : '◇';
          all.push(fade(seal, 360, 0, 1));
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
    Promise.all(all).then(cleanup, cleanup);
    return promise;
  }
  return { play: play, plan: plan };
});
