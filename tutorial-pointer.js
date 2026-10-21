(function (root, factory) {
  'use strict';
  var api;
  if (typeof module === 'object' && module.exports) api = factory(root, require('./tutorial.js'), require('./content.js'));
  else api = factory(root, root.TowerTutorial, root.TowerContent);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TowerTutorialPointer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (global, initialTutorial, initialContent) {
  'use strict';
  function create(deps) {
    deps = deps || {};
    var doc = deps.document || global.document, win = deps.window || doc && doc.defaultView || global;
    var tutorial = deps.tutorial || initialTutorial, content = deps.content || initialContent || { heroes: {}, cards: {} };
    var current = null, overlay = null, label = null, line = null, head = null, focus = null;
    var resizeObserver = null, observed = null, frame = null, listeners = [], destroyed = false;
    var state = { visible: false, reason: 'inactive' };
    function snapshot() { return Object.assign({}, state); }
    function node(tag, ns) { return ns && doc.createElementNS ? doc.createElementNS('http://www.w3.org/2000/svg', tag) : doc.createElement(tag); }
    function ensureOverlay() {
      if (overlay) return;
      overlay = node('div'); overlay.className = 'tutorial-pointer'; overlay.setAttribute('aria-hidden', 'true');
      var svg = node('svg', true); svg.setAttribute('class', 'tutorial-pointer-svg'); svg.setAttribute('focusable', 'false');
      line = node('path', true); line.setAttribute('class', 'tutorial-pointer-line');
      head = node('path', true); head.setAttribute('class', 'tutorial-pointer-head');
      svg.appendChild(line); svg.appendChild(head); overlay.appendChild(svg);
      focus = node('span'); focus.className = 'tutorial-pointer-focus'; overlay.appendChild(focus);
      label = node('span'); label.className = 'tutorial-pointer-label'; overlay.appendChild(label);
      overlay.hidden = true; doc.body.appendChild(overlay);
    }
    function hideVisual(reason) { if (overlay) overlay.hidden = true; state = { visible: false, reason: reason || 'hidden' }; return snapshot(); }
    function detach() {
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); }); listeners.length = 0;
      if (resizeObserver) resizeObserver.disconnect(); resizeObserver = null; observed = null;
      if (frame !== null && win.cancelAnimationFrame) win.cancelAnimationFrame(frame); frame = null;
    }
    function hide() { current = null; detach(); return hideVisual('hidden'); }
    function destroy() { hide(); if (overlay) overlay.remove(); overlay = label = line = head = focus = null; destroyed = true; }
    function listen(target, type, fn, capture) {
      if (!target || !target.addEventListener) return;
      target.addEventListener(type, fn, capture); listeners.push([target, type, fn, capture]);
    }
    function schedule() {
      if (destroyed || !current || frame !== null) return;
      if (win.requestAnimationFrame) frame = win.requestAnimationFrame(function () { frame = null; position(); });
      else position();
    }
    function cinematic() {
      if (!doc) return false;
      for (var i = 0; i < 3; i++) {
        var el = doc.getElementById && doc.getElementById(['burst-overlay', 'burst-tail', 'boss-entry'][i]);
        if (el && !el.hidden && el.isConnected !== false) return true;
      }
      return !!(doc.querySelector && doc.querySelector('.boss-performance'));
    }
    function blocked() {
      if (!current || !current.run || !current.run.tutorial || !current.run.tutorial.active || current.run.screen !== 'battle') return 'inactive';
      if (current.busy || current.root && current.root.inert || cinematic()) return 'busy';
      if (current.modalOpen || doc.querySelector && doc.querySelector('dialog[open]')) return 'modal';
      if (!current.root || current.root.isConnected === false || typeof current.root.querySelectorAll !== 'function') return 'no-root';
      return null;
    }
    function enabled(el) {
      if (!el || el.disabled || el.hidden || el.isConnected === false || el.getAttribute && el.getAttribute('aria-disabled') === 'true') return false;
      if (el.closest && el.closest('[hidden]')) return false;
      if (el.getClientRects && !el.getClientRects().length) return false;
      return true;
    }
    function find(action, id, targetable) {
      var all = current.root.querySelectorAll('[data-action="' + action + '"]');
      return Array.from(all).find(function (el) { return enabled(el) && (id === undefined || String(el.dataset.id) === String(id)) && (!targetable || el.classList.contains('targetable')); }) || null;
    }
    function targetLabel(id) {
      var b = current.run.battle || {}, u = (b.party || []).concat(b.enemies || []).find(function (x) { return (x.uid || x.id) === id; });
      return content.heroes && content.heroes[id] && content.heroes[id].name || u && u.name || '发光目标';
    }
    function resolve() {
      var t = tutorial || global.TowerTutorial, e, selected = current.selected, el, text;
      try { e = t && t.expected(current.run); } catch (_) { return null; }
      if (!e) return null;
      var hero = content.heroes && content.heroes[e.owner], heroName = hero && hero.name || e.owner || '伙伴';
      if (e.kind === 'intro') { el = find('tutorial-next'); text = '点击这里，开始练习'; }
      else if (e.kind === 'complete') { el = find('tutorial-finish'); text = '点击这里，正式出发'; }
      else if (e.kind === 'endTurn') { el = find('end-turn'); text = '点击这里，结束回合'; }
      else if (e.kind === 'card') {
        if (selected && selected.kind === 'card' && selected.uid === e.uid) {
          if (!e.target) return null; el = find('target', e.target, true); text = '点击' + targetLabel(e.target) + '作为目标';
        } else {
          el = find('select-card', e.uid);
          var card = content.cards && content.cards[e.defId]; text = '点击' + heroName + '的「' + (card && card.name || '高亮牌') + '」';
        }
      } else if (e.kind === 'burst') {
        if (selected && selected.kind === 'burst' && selected.heroId === e.owner) {
          el = find('confirm-burst');
          if (el) text = '点击这里，释放必杀';
          else if (e.target) { el = find('target', e.target, true); text = '点击' + targetLabel(e.target) + '释放必杀'; }
        } else { el = find('select-burst', e.owner); text = '点击' + heroName + '的必杀'; }
      }
      if (!el) return null;
      var anchor = el;
      if (el.dataset.action === 'select-card') anchor = el.querySelector('.card-top') || el;
      if (el.dataset.action === 'target') anchor = el.querySelector('.fighter-art, .enemy-art') || el;
      return { el: el, anchor: anchor, label: text, kind: e.kind };
    }
    function rect(el) {
      var r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right === undefined ? r.left + r.width : r.right, bottom: r.bottom === undefined ? r.top + r.height : r.bottom };
    }
    function intersect(a, b, x, y) {
      var l = x ? Math.max(a.left, b.left) : a.left, r = x ? Math.min(a.right, b.right) : a.right;
      var t = y ? Math.max(a.top, b.top) : a.top, d = y ? Math.min(a.bottom, b.bottom) : a.bottom;
      return { left: l, right: r, top: t, bottom: d, width: Math.max(0, r - l), height: Math.max(0, d - t) };
    }
    function visibleRect(el, initial, viewport) {
      var value = intersect(initial, viewport, true, true), parent = el.parentElement;
      while (parent && parent !== doc.body) {
        var style = win.getComputedStyle ? win.getComputedStyle(parent) : {}, hand = parent.classList && parent.classList.contains('hand');
        var x = hand || /auto|scroll|hidden|clip/.test(style.overflowX || style.overflow || ''), y = /auto|scroll|hidden|clip/.test(style.overflowY || style.overflow || '');
        if (x || y) value = intersect(value, rect(parent), x, y);
        parent = parent.parentElement;
      }
      return value;
    }
    function watch(target) {
      if (observed === target || !win.ResizeObserver) return;
      if (resizeObserver) resizeObserver.disconnect();
      resizeObserver = new win.ResizeObserver(schedule); observed = target;
      resizeObserver.observe(current.root); resizeObserver.observe(target);
      var hand = target.closest && target.closest('.hand'); if (hand) resizeObserver.observe(hand);
    }
    function position() {
      if (destroyed || !current) return hideVisual('inactive');
      var reason = blocked(); if (reason) return hideVisual(reason);
      var resolved = resolve(); if (!resolved) return hideVisual('no-target');
      var width = win.innerWidth || doc.documentElement && doc.documentElement.clientWidth || 1280;
      var height = win.innerHeight || doc.documentElement && doc.documentElement.clientHeight || 720;
      var viewport = { left: 0, top: 0, right: width, bottom: height }, a = rect(resolved.anchor), full = rect(resolved.el);
      var visible = visibleRect(resolved.anchor, a, viewport);
      if (a.width <= 0 || a.height <= 0 || visible.width < Math.min(24, a.width * .35) || visible.height < Math.min(18, a.height * .3)) return hideVisual('offscreen');
      var compactDock = height <= 680 && ['confirm-burst', 'end-turn'].includes(resolved.el.dataset.action);
      if (compactDock) resolved.label = resolved.el.dataset.action === 'confirm-burst' ? '释放必杀' : '结束回合';
      ensureOverlay(); overlay.hidden = false; label.textContent = resolved.label;
      var measure = label.getBoundingClientRect(), w = Math.min(measure.width || 190, width - 16), h = measure.height || 38, margin = 8, gap = compactDock ? 16 : 39;
      var cx = visible.left + visible.width / 2, cy = visible.top + visible.height / 2;
      function clamp(n, low, high) { return Math.max(low, Math.min(Math.max(low, high), n)); }
      var candidates = [
        { side: 'above', x: clamp(cx - w / 2, margin, width - w - margin), y: full.top - gap - h },
        { side: 'left', x: full.left - gap - w, y: clamp(cy - h / 2, margin, height - h - margin) },
        { side: 'right', x: full.right + gap, y: clamp(cy - h / 2, margin, height - h - margin) },
        { side: 'below', x: clamp(cx - w / 2, margin, width - w - margin), y: full.bottom + gap }
      ];
      if (compactDock) candidates = [candidates[1], candidates[2], candidates[0], candidates[3]];
      var best = candidates.find(function (p) { return p.x >= margin && p.y >= margin && p.x + w <= width - margin && p.y + h <= height - margin; }) || candidates[0];
      best.x = clamp(best.x, margin, width - w - margin); best.y = clamp(best.y, margin, height - h - margin);
      label.style.left = best.x + 'px'; label.style.top = best.y + 'px';
      var start, end;
      if (best.side === 'above') { start = { x: best.x + w / 2, y: best.y + h + 2 }; end = { x: cx, y: visible.top - 6 }; }
      else if (best.side === 'below') { start = { x: best.x + w / 2, y: best.y - 2 }; end = { x: cx, y: visible.bottom + 6 }; }
      else if (best.side === 'left') { start = { x: best.x + w + 2, y: best.y + h / 2 }; end = { x: visible.left - 6, y: cy }; }
      else { start = { x: best.x - 2, y: best.y + h / 2 }; end = { x: visible.right + 6, y: cy }; }
      end.x = clamp(end.x, margin, width - margin); end.y = clamp(end.y, margin, height - margin);
      var dx = end.x - start.x, dy = end.y - start.y, length = Math.max(1, Math.hypot(dx, dy)), ux = dx / length, uy = dy / length;
      var baseX = end.x - ux * 10, baseY = end.y - uy * 10;
      line.setAttribute('d', 'M' + start.x + ' ' + start.y + ' Q' + (start.x + dx * .58) + ' ' + (start.y + dy * .28) + ' ' + end.x + ' ' + end.y);
      head.setAttribute('d', 'M' + end.x + ' ' + end.y + ' L' + (baseX - uy * 5) + ' ' + (baseY + ux * 5) + ' L' + (baseX + uy * 5) + ' ' + (baseY - ux * 5) + ' Z');
      var focusRect = resolved.el.dataset.action === 'target' ? visible : visibleRect(resolved.el, full, viewport);
      focus.style.left = Math.max(2, focusRect.left - 3) + 'px'; focus.style.top = Math.max(2, focusRect.top - 3) + 'px';
      focus.style.width = Math.min(width - Math.max(2, focusRect.left - 3) - 2, focusRect.width + 6) + 'px'; focus.style.height = Math.min(height - Math.max(2, focusRect.top - 3) - 2, focusRect.height + 6) + 'px';
      overlay.dataset.placement = best.side; overlay.dataset.tutorialAction = resolved.el.dataset.action;
      state = { visible: true, reason: null, targetAction: resolved.el.dataset.action, targetId: resolved.el.dataset.id || null,
        label: resolved.label, placement: best.side, labelRect: { left: best.x, top: best.y, width: w, height: h }, tip: end };
      watch(resolved.el); return snapshot();
    }
    function update(options) {
      if (destroyed || !doc || !doc.body || !doc.createElement) return hideVisual(destroyed ? 'destroyed' : 'unavailable');
      detach(); current = options || {};
      var reason = blocked(); if (reason) return hideVisual(reason);
      listen(doc, 'scroll', schedule, true); listen(win, 'resize', schedule, false);
      if (win.visualViewport) { listen(win.visualViewport, 'resize', schedule, false); listen(win.visualViewport, 'scroll', schedule, false); }
      return position();
    }
    return { update: update, hide: hide, destroy: destroy, getState: snapshot };
  }
  var singleton;
  function instance() { if (!singleton) singleton = create(); return singleton; }
  return { create: create, update: function (options) { return instance().update(options); }, hide: function () { return instance().hide(); },
    destroy: function () { if (singleton) singleton.destroy(); singleton = null; }, getState: function () { return instance().getState(); } };
});
