(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TowerBossPerformance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';
  var owners = new WeakMap(), played = new WeakSet(), serial = 0;
  var profiles = {
    christina: { color: '#b03b4a', accent: '#ffdb8d', motif: 'swords' },
    neneka: { color: '#7045ab', accent: '#e4beff', motif: 'mirrors' },
    kaiser_insight: { color: '#8d243c', accent: '#f6c4b2', motif: 'throne' },
    fubuki: { color: '#99504c', accent: '#ffd4a1', motif: 'swords' },
    yamato: { color: '#675287', accent: '#dac7ff', motif: 'swords' },
    ranpha: { color: '#6c497e', accent: '#e5baf8', motif: 'mirrors' },
    misora: { color: '#8c486e', accent: '#ffb8dc', motif: 'mirrors' },
    kaiser: { color: '#8d243c', accent: '#f6c4b2', motif: 'throne' }
  };
  function plan(options) {
    options = options || {};
    var b = options.before, events = options.events || [], cast = options.cast || global.TowerEncounterCast || {};
    if (!b || b.status !== 'active' || !b.bossCoreUid) return null;
    var core = (b.enemies || []).find(function (e) { return e.uid === b.bossCoreUid; });
    if (!core || !(core.hp > 0)) return null;
    var intent = core.intent || {}, multi = intent.type === 'attack' && Number(intent.hits || 1) > 1;
    if (intent.type !== 'aoe' && !multi) return null;
    var friends = new Set((b.party || []).filter(function (u) { return u.hp > 0; }).map(function (u) { return u.uid || u.id; }));
    var hits = events.filter(function (e) { return e.type === 'hit' && e.source === core.uid && e.sourceKind === 'enemy' && friends.has(e.target); });
    // An intent is only a forecast. A genuine core-enemy hit must exist after
    // resolution; stars, reflect damage, guards and a dead core cannot invent it.
    if (!hits.length) return null;
    var entry = cast.bosses && cast.bosses[b.encounterId] || cast.enemies && cast.enemies[core.id] || cast;
    var profile = profiles[entry.id];
    if (!profile || typeof entry.art !== 'string' || !entry.art) return null;
    return {
      key: [b.encounterId, b.round, core.uid, intent.type, intent.name].join(':'),
      bossId: entry.id, unitId: core.uid, round: b.round, encounterId: b.encounterId,
      name: entry.displayName || core.name, art: entry.art, skillName: (entry.ub && intent.name ? intent.name.split(/[：:]/)[0] : intent.name) || (multi ? '连续攻击' : '群体攻击'),
      intentType: intent.type, hitCount: hits.length, firstHitIndex: events.indexOf(hits[0]), targetIds: Array.from(new Set(hits.map(function (e) { return e.target; }))),
      intendedHits: multi ? Number(intent.hits) : null, color: profile.color, accent: profile.accent, motif: profile.motif,
      durationMs: 1400, presentationKind: entry.ub && entry.ub.video ? 'source-short-cutin' : 'original-code-cutin', ub: entry.ub || null
    };
  }
  function resolved(reason) {
    var p = Promise.resolve({ reason: reason });
    p.visualDone = p; p.cancel = p.skip = p.setVolume = p.setMuted = function () {};
    p.getState = function () { return { completed: true, reason: reason, visualDone: true, visualReason: reason, voiceTail: false, media: null, errors: [] }; };
    return p;
  }
  function play(options) {
    options = options || {}; var cue = options.cue;
    if (!cue || !profiles[cue.bossId]) return resolved('unavailable');
    var scope = options.root || global.document, doc = options.document || scope && (scope.ownerDocument || scope);
    if (!doc || !doc.body || typeof doc.createElement !== 'function') return resolved('unavailable');
    if (played.has(cue)) return resolved('duplicate');
    if (owners.has(doc)) owners.get(doc)();
    played.add(cue);
    var reduce = options.reducedMotion === undefined ? !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) : !!options.reducedMotion;
    var complete = false, completionReason = null, visualReleased = false, visualReason = null, focusReleased = false;
    var tracks = [], mediaPlayer = null, errors = [], resolve, resolveVisual;
    var result = new Promise(function (yes) { resolve = yes; });
    result.visualDone = new Promise(function (yes) { resolveVisual = yes; });
    var previousFocus = doc.activeElement;
    var overlay = doc.createElement('section'); overlay.className = 'boss-performance boss-performance-' + cue.bossId + (reduce ? ' reduced-motion' : '');
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', cue.name + ' · ' + cue.skillName);
    overlay.dataset.boss = cue.bossId; overlay.dataset.cueKey = cue.key;
    overlay.style.setProperty('--bossfx-color', cue.color); overlay.style.setProperty('--bossfx-accent', cue.accent);
    function add(tag, cls, parent, value) { var el = doc.createElement(tag); el.className = cls; if (value) el.textContent = value; (parent || overlay).appendChild(el); return el; }
    var backdrop = add('div', 'boss-performance-backdrop');
    var scene = add('div', 'boss-performance-scene');
    var crest = add('div', 'boss-performance-crest boss-crest-' + cue.motif, scene);
    var ghosts = [];
    if (cue.bossId === 'neneka' && !reduce) {
      ['left', 'right'].forEach(function (side) { var image = add('img', 'boss-performance-portrait boss-mirror-' + side, scene); image.src = cue.art; image.alt = ''; image.setAttribute('aria-hidden', 'true'); ghosts.push(image); });
    }
    var portrait = add('img', 'boss-performance-portrait boss-performance-main', scene); portrait.src = cue.art; portrait.alt = cue.name;
    var ornament = add('div', 'boss-performance-ornament boss-ornament-' + cue.motif, scene);
    var strokes = [];
    if (!reduce) {
      var count = cue.bossId === 'christina' ? 6 : cue.bossId === 'neneka' ? 5 : 8;
      for (var i = 0; i < count; i++) {
        var stroke = add('i', 'boss-performance-stroke boss-stroke-' + cue.motif, ornament);
        stroke.style.setProperty('--n', String(i)); stroke.style.setProperty('--angle', (cue.bossId === 'christina' ? i % 2 ? 31 : -31 : i * 45) + 'deg');
        strokes.push(stroke);
      }
    }
    var copy = add('div', 'boss-performance-copy');
    add('p', 'boss-performance-warning', copy, 'BOSS · 关键招式');
    add('p', 'boss-performance-name', copy, cue.name);
    var title = add('h2', 'boss-performance-title', copy, cue.skillName); title.id = 'boss-performance-title-' + (++serial);
    overlay.setAttribute('aria-labelledby', title.id);
    add('p', 'boss-performance-type', copy, cue.intentType === 'aoe' ? '群体攻击' : '连续攻击 · ' + cue.intendedHits + '段');
    var button = add('button', 'boss-performance-skip', overlay, '跳过演出'); button.type = 'button'; button.setAttribute('aria-label', '跳过Boss招式演出');
    function releaseFocus() {
      if (focusReleased) return; focusReleased = true;
      // Only restore the focus we took. A voice tail ending must not pull focus
      // away from a card, target or a later dialog the player has already chosen.
      var active = doc.activeElement;
      if (active && active !== button && !(typeof overlay.contains === 'function' && overlay.contains(active))) return;
      if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') { try { previousFocus.focus({ preventScroll: true }); } catch (_) {} }
    }
    function releaseVisual(reason) {
      if (visualReleased || complete) return;
      visualReleased = true; visualReason = reason || 'ended';
      overlay.classList.add('voice-tail');
      overlay.removeAttribute('aria-modal'); overlay.setAttribute('role', 'status');
      if (doc.removeEventListener) doc.removeEventListener('keydown', key, true);
      button.textContent = '略过余音'; button.setAttribute('aria-label', '略过Boss招式余音');
      releaseFocus();
      var state = { reason: visualReason, cue: cue };
      // Resolve even if a UI callback fails; the caller must never remain locked
      // just because its decorative hit feedback failed to mount.
      try { if (typeof options.onVisualComplete === 'function') options.onVisualComplete(state); }
      catch (error) { errors.push(error && error.message || String(error)); }
      resolveVisual(state);
    }
    function finish(reason) {
      if (complete) return;
      // Leaving the scene is cancellation, not an instruction to apply a hit.
      // Explicit skip still advances combat and therefore releases its visual.
      if (reason !== 'cancelled') releaseVisual(reason);
      if (complete) return; complete = true; completionReason = reason;
      if (!visualReleased) { visualReason = reason; resolveVisual({ reason: reason, cue: cue }); }
      if (mediaPlayer && reason !== 'ended' && reason !== 'error') mediaPlayer.cancel();
      tracks.forEach(function (a) { try { a.cancel(); } catch (_) {} });
      button.removeEventListener('click', skip); if (doc.removeEventListener) doc.removeEventListener('keydown', key, true);
      overlay.remove(); if (owners.get(doc) === cancel) owners.delete(doc);
      releaseFocus();
      resolve({ reason: reason, cue: cue });
    }
    function cancel() { finish('cancelled'); }
    function skip(event) { if (event) { event.preventDefault(); event.stopPropagation(); } finish('skipped'); }
    function key(event) { if (event.key === 'Escape') skip(event); }
    button.addEventListener('click', skip); if (doc.addEventListener) doc.addEventListener('keydown', key, true);
    result.cancel = cancel; result.skip = function () { skip(); };
    result.setVolume = function (value) { if (!complete && mediaPlayer) mediaPlayer.setVolume(value); };
    result.setMuted = function (value) { if (!complete && mediaPlayer) mediaPlayer.setMuted(value); };
    result.getState = function () { return { completed: complete, reason: completionReason, visualDone: visualReleased,
      visualReason: visualReason, voiceTail: visualReleased && !complete, media: mediaPlayer ? mediaPlayer.getState() : null, errors: errors.slice() }; };
    owners.set(doc, cancel);
    doc.body.appendChild(overlay);
    if (typeof button.focus === 'function') button.focus({ preventScroll: true });
    if (cue.ub && global.TowerPresentation) {
      var video = add('video', 'boss-performance-video', scene);
      var fullVideo = options.fullVideo !== false && !reduce && !!cue.ub.video;
      video.playsInline = true; video.controls = false; video.preload = 'auto'; video.hidden = !fullVideo;
      if (fullVideo) { portrait.hidden = true; crest.hidden = true; ornament.hidden = true; }
      var paths = options.audio === false ? [] : options.fullVideo === false ? [cue.ub.voice].filter(Boolean) : (cue.ub.audioPaths || [cue.ub.cutinVoice, cue.ub.voice].filter(Boolean));
      function releaseVideo(state) {
        if (visualReleased || complete) return;
        video.hidden = true; overlay.classList.add('voice-tail');
        releaseVisual(state && state.failed ? 'error' : 'ended');
      }
      mediaPlayer = global.TowerPresentation.play({ video: video, videoSrc: cue.ub.video, fullVideo: fullVideo,
        audioPaths: paths, volume: options.volume === undefined ? .6 : options.volume,
        onVideoComplete: releaseVideo,
        onState: function (s) { overlay.dataset.videoDone = String(s.videoDone); overlay.dataset.audioDone = String(s.audioDone); overlay.dataset.phase = s.phase; },
        onComplete: function (why) { finish(why); }
      });
      // A muted/invalid source can finish synchronously during construction.
      if (complete) mediaPlayer.cancel();
      return result;
    }
    function animate(el, frames, duration, delay, easing) {
      if (complete || typeof el.animate !== 'function') return Promise.resolve();
      try { var a = el.animate(frames, { duration: duration, delay: delay || 0, fill: 'both', easing: easing || 'cubic-bezier(.16,.72,.25,1)' }); tracks.push(a); return a.finished.catch(function () {}); }
      catch (_) { return Promise.resolve(); }
    }
    function begin() {
      if (complete) return; var waits = [], duration = reduce ? 450 : 1400;
      waits.push(animate(overlay, [{ opacity: 0 }, { opacity: 1, offset: .14 }, { opacity: 1, offset: .8 }, { opacity: 0 }], duration, 0, 'linear')); 
      if (!reduce) {
        waits.push(animate(portrait, [{ opacity: 0, transform: 'translateX(-26px) scale(.97)' }, { opacity: 1, offset: .2, transform: 'translateX(0) scale(1)' }, { opacity: 1, offset: .78 }, { opacity: 0, transform: 'translateX(14px) scale(1.01)' }], duration, 0, 'linear'));
        waits.push(animate(copy, [{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, offset: .2, transform: 'translateX(0)' }, { opacity: 1, offset: .82 }, { opacity: 0 }], 1300, 80, 'linear'));
        waits.push(animate(crest, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.7) rotate(-12deg)' }, { opacity: .8, offset: .25, transform: 'translate(-50%,-50%) scale(1) rotate(0deg)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.14) rotate(8deg)' }], 1150));
        ghosts.forEach(function (ghost, i) {
          var dx = i ? 75 : -75;
          waits.push(animate(ghost, [{ opacity: 0, transform: 'translateX(0) scale(.86)' }, { opacity: .42, offset: .3, transform: 'translateX(' + dx + 'px) scale(.86)' }, { opacity: 0, transform: 'translateX(' + dx * 1.3 + 'px) scale(.82)' }], 1150, i * 30));
        });
        strokes.forEach(function (stroke, i) {
          var frames = cue.bossId === 'neneka' ? [{ opacity: 0, transform: 'translate(-50%,-50%) rotate(' + i * 36 + 'deg) scale(.4)' }, { opacity: .8, offset: .35 }, { opacity: 0, transform: 'translate(-50%,-50%) rotate(' + (i * 36 + 60) + 'deg) scale(1.4)' }] :
            [{ opacity: 0, transform: 'translate(-50%,-50%) rotate(var(--angle)) scaleX(.05)' }, { opacity: .9, offset: .25, transform: 'translate(-50%,-50%) rotate(var(--angle)) scaleX(1)' }, { opacity: 0, transform: 'translate(-50%,-50%) rotate(var(--angle)) scaleX(1.12)' }];
          waits.push(animate(stroke, frames, cue.bossId === 'neneka' ? 800 : 620, 160 + i * (cue.bossId === 'kaiser_insight' ? 42 : 55)));
        });
      }
      Promise.all(waits).then(function () { finish('ended'); }, function () { finish('ended'); });
    }
    // The same full-body SVG is already in the battle scene; decode before its
    // entrance when supported. A cancelled loading cue never starts afterwards.
    if (typeof portrait.decode === 'function') { try { portrait.decode().catch(function () {}).then(begin); } catch (_) { begin(); } }
    else begin();
    return result;
  }
  return { plan: plan, play: play };
});
