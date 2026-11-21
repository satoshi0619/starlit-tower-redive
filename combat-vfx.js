(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TowerVFX = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (global) {
  'use strict';

  // Artwork is generated in battlefield coordinates. It never owns combat
  // state, audio, input locks or cinematic completion.
  var profiles = {
    pecorine: { family: 'sword', motif: 'royal-blade', color: '#ffc36b', accent: '#fff0b8' },
    rei: { family: 'sword', motif: 'crescent', color: '#8bc8ff', accent: '#e1f8ff' },
    kokkoro: { family: 'wind', motif: 'wind-leaves', color: '#72dfb0', accent: '#e2ffd0' },
    kyaru: { family: 'magic', motif: 'void', color: '#bc87ff', accent: '#f0c8ff' },
    hatsune: { family: 'magic', motif: 'starfall', color: '#bdabff', accent: '#ffe1fa' },
    yui: { family: 'heal', motif: 'angel', color: '#ffaec7', accent: '#fff1c6' },
    jun: { family: 'sword', motif: 'citadel', color: '#93c8ef', accent: '#e8f9ff' },
    nozomi: { family: 'sword', motif: 'stage', color: '#ff9dce', accent: '#ffe2ab' },
    shizuru: { family: 'sword', motif: 'feather-ward', color: '#a7c8ff', accent: '#ffdfef' },
    makoto: { family: 'claw', motif: 'wolf', color: '#c4acff', accent: '#f8e2ff' },
    suzuna: { family: 'arrow', motif: 'heart-arrow', color: '#ffafd7', accent: '#fff0db' },
    arisa: { family: 'arrow', motif: 'forest-arrows', color: '#9de38c', accent: '#eaffc7' },
    miyako: { family: 'fist', motif: 'ghost', color: '#addef4', accent: '#fff1c9' },
    anna: { family: 'magic', motif: 'dark-flame', color: '#bc8cf0', accent: '#ffb8e7' },
    yori: { family: 'magic', motif: 'lightning', color: '#d7b2ff', accent: '#fff3b8' },
    kaori: { family: 'fist', motif: 'tidal-fists', color: '#70d6df', accent: '#ffe3a4' },
    saren: { family: 'sword', motif: 'phoenix', color: '#ffcd74', accent: '#ffedca' },
    monika: { family: 'sword', motif: 'rapier', color: '#b5d7ff', accent: '#fff3b0' }
  };
  Object.keys(profiles).forEach(function (id) { Object.freeze(profiles[id]); });
  Object.freeze(profiles);
  // Normalized positions on the fitted art, measured at the sword tip, staff
  // head, bow grip, shield rim or striking hand of the current standing pose.
  var weaponAnchors = {
    pecorine:[.26,.33], rei:[.87,.18], kokkoro:[.967,.024], kyaru:[.25,.32], hatsune:[.19,.09], yui:[.22,.24],
    jun:[.35,.35], nozomi:[.099,.192], shizuru:[.20,.53], makoto:[.94,.55], suzuna:[.80,.42], arisa:[.73,.58],
    miyako:[.83,.21], anna:[.86,.12], yori:[.96,.018], kaori:[.32,.30], saren:[.94,.53], monika:[.06,.79]
  };
  var heroStrokes = {
    pecorine:'cut', rei:'cut', kokkoro:'wind', kyaru:'hex', hatsune:'starfall', yui:'radiance',
    jun:'bash', nozomi:'echo-blade', shizuru:'cut', makoto:'fang', suzuna:'arrow', arisa:'leaf-arrow',
    miyako:'ghost-fist', anna:'flame', yori:'lightning', kaori:'fist', saren:'ember-blade', monika:'thrust'
  };
  var cardStrokes = {
    rei_dance:'sword-dance', rei_break:'thrust', rei_feint:'back-cut', pecorine_heavy:'heavy', pecorine_sweep:'sweep',
    m3:'thrust', z3:'piercing-arrow', ar5:'piercing-arrow', hatsune_meteor:'meteor', u5:'wisp'
  };
  function strokeOf(hit) { return cardStrokes[hit.cardId] || heroStrokes[hit.source]; }
  function isMeleeCard(hit) {
    if (hit.type !== 'hit' || hit.sourceKind !== 'card' || hit.burst ||
        hit.visual === 'magic' || hit.damageType === 'magic' || strokeOf(hit) === 'wisp') return false;
    var family = profiles[hit.source]?.family;
    return family === 'sword' || family === 'claw' || family === 'fist';
  }
  // The mechanical hits land at 210 ms and then 105 ms apart. A multi-hit
  // card gets one continuous pose with its recoveries fitted between contacts.
  function strikePose(hit, dx, dy, compact, light, hits) {
    var stroke = strokeOf(hit);
    if (!stroke) return null;
    var family = profiles[hit.source].family;
    var direction = dx < 0 ? -1 : 1;
    var arrow = family === 'arrow', spell = hit.visual === 'magic';
    var heavy = stroke === 'heavy' || stroke === 'bash' || stroke === 'sweep';
    var jab = stroke === 'fist' || stroke === 'ghost-fist' || stroke === 'thrust';
    var reach = arrow ? -.5 : spell ? .12 : heavy ? .97 : jab ? .86 : .78;
    var lean = arrow ? -5 : spell ? -3 : heavy ? 9 : jab ? 3 : 8;
    var lift = light ? 1 : compact ? 2 : 4;
    var count = clamp(hits || 1, 1, 8), duration = 210 + (count - 1) * 105 + 145;
    function key(at, reachPart, rise, angle, sx, sy) {
      return {offset:at / duration, translate:(dx * reachPart).toFixed(2) + 'px ' + (dy * reachPart + rise).toFixed(2) + 'px',
        rotate:(angle * direction).toFixed(2) + 'deg', scale:sx + ' ' + sy};
    }
    var keys = [key(0,0,0,0,1,1)];
    if (arrow || spell) {
      // The projectile leaves the bow/staff 120 ms before the target impact.
      // An archer draws then recoils. A caster lifts and releases from the staff.
      for (var shot = 0; shot < count; shot++) {
        var release = 90 + shot * 105;
        keys.push(key(release - 25, arrow ? -.22 : .08, spell ? -lift : 1, -lean * .7, .98, 1.02));
        keys.push(key(release, arrow ? .08 : .32, spell ? -lift * 1.8 : 0, lean * .45, 1.025, .985));
        keys.push(key(release + 34, arrow ? -.48 : .17, spell ? -lift * 1.2 : -1, lean, .985, 1.012));
      }
      keys.push(key(duration,0,0,0,1,1));
      return {duration:duration, keys:keys};
    }
    keys.push(key(82,heavy ? -.30 : -.16,1,-lean*.62,1.015,.985));
    for (var i = 0; i < count; i++) {
      var contact = 210 + i * 105, swing = i % 2 ? -1 : 1;
      keys.push(key(contact,reach * (i ? .83 : 1),spell ? -lift * 2 : -lift,lean*swing,arrow ? .97 : 1.035,.99));
      if (i + 1 < count) keys.push(key(contact+55,reach*.40,0,-lean*swing*.35,.992,1.012));
    }
    keys.push(key(duration,0,0,0,1,1));
    return {duration:duration,keys:keys};
  }
  var bosses = {
    fubuki: { motif: 'barrage', color: '#edb77d', accent: '#fff0c2' },
    christina: { motif: 'sword-rain', color: '#ffba72', accent: '#ffeac0' },
    ranpha: { motif: 'orchid', color: '#cda0ed', accent: '#f3d1ff' },
    misora: { motif: 'prism', color: '#ff91c8', accent: '#ffe4f4' },
    kaiser: { motif: 'eclipse', color: '#e66b99', accent: '#ffd2c0' },
    kaiser_insight: { motif: 'eclipse', color: '#e66b99', accent: '#ffd2c0' },
    neneka: { motif: 'prism', color: '#c79af4', accent: '#e9d7ff' },
    yamato: { motif: 'sword-rain', color: '#c4adf1', accent: '#f4e5ff' }
  };
  Object.keys(bosses).forEach(function (id) { Object.freeze(bosses[id]); });
  Object.freeze(bosses);
  var TAU = Math.PI * 2;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function envelope(t) { return Math.sin(Math.PI * clamp(t, 0, 1)); }
  function seed(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  function create(options) {
    options = options || {};
    var doc = options.document || global.document, layer = options.layer, bounds = options.bounds;
    if (options.reducedMotion || !doc || doc.hidden || !layer || !bounds || !(bounds.width > 0 && bounds.height > 0)) return null;
    if (typeof global.requestAnimationFrame !== 'function' || typeof doc.createElement !== 'function') return null;
    var canvas, ctx;
    try {
      canvas = doc.createElement('canvas');
      if (typeof canvas.getContext !== 'function') return null;
      ctx = canvas.getContext('2d', { alpha: true });
    } catch (_) { return null; }
    if (!ctx) return null;

    var quality = options.quality === 'light' || options.quality === 'rich' ? options.quality : bounds.width < 600 || bounds.height < 210 ? 'light' : 'rich';
    var light = quality === 'light', particleBudget = light ? 64 : 180, emitted = 0;
    var ratio = Math.min(light ? 1 : 2, global.devicePixelRatio || 1, Math.sqrt(1800000 / (bounds.width * bounds.height)));
    ratio = Math.max(.001, ratio);
    canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
    canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
    canvas.className = 'combat-vfx-canvas';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.dataset.quality = quality;
    canvas.dataset.pixelRatio = String(Math.round(ratio * 100) / 100);
    layer.appendChild(canvas);
    var particleStamps = new Map();
    var tasks = [], lastEnd = 0, raf = null, done = false, started = null, resolve;
    var finished = new Promise(function (yes) { resolve = yes; });
    var unit = clamp(bounds.height * .31, 54, 116);
    function local(p) { return { x: p.x - bounds.left, y: p.y - bounds.top }; }
    function add(start, life, draw) {
      if (done) return;
      start = Math.max(0, Number(start) || 0); life = Math.max(1, Number(life) || 1);
      tasks.push({ start: start, life: life, draw: draw }); lastEnd = Math.max(lastEnd, start + life);
    }
    function cleanup(cancelled, reason) {
      if (done) return; done = true;
      if (raf !== null && typeof global.cancelAnimationFrame === 'function') global.cancelAnimationFrame(raf);
      if (typeof doc.removeEventListener === 'function') doc.removeEventListener('visibilitychange', hidden);
      if (typeof global.removeEventListener === 'function') global.removeEventListener('resize', resized);
      if (typeof canvas.removeEventListener === 'function') canvas.removeEventListener('contextlost', lost);
      canvas.remove(); tasks.length = 0;
      particleStamps.clear();
      resolve({ cancelled: !!cancelled, quality: quality, reason: reason || 'finished' });
    }
    function hidden() { if (doc.hidden) cleanup(true, 'hidden'); }
    function resized() { cleanup(true, 'resize'); }
    function lost() { cleanup(true, 'context-lost'); }
    function frame(now) {
      if (done) return;
      if (doc.hidden) { cleanup(true, 'hidden'); return; }
      if (started === null) started = now;
      var elapsed = now - started;
      try {
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, bounds.width, bounds.height);
        ctx.globalCompositeOperation = 'lighter';
        tasks.forEach(function (task) {
          var t = (elapsed - task.start) / task.life;
          if (t < 0 || t > 1) return;
          ctx.save(); task.draw(t); ctx.restore();
        });
      } catch (_) { cleanup(true, 'render-error'); return; }
      if (elapsed >= lastEnd) { cleanup(false); return; }
      raf = global.requestAnimationFrame(frame);
    }
    function paint(color, alpha, width, brush = ctx) {
      brush.globalAlpha = clamp(alpha, 0, 1); brush.strokeStyle = color; brush.fillStyle = color;
      brush.lineWidth = width || 1; brush.lineCap = 'round'; brush.lineJoin = 'round';
      brush.shadowColor = color; brush.shadowBlur = light ? 0 : 7;
    }
    function path(points, color, alpha, width) {
      paint(color, alpha, width); ctx.beginPath();
      points.forEach(function (p, i) { if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke();
    }
    function circle(p, radius, color, alpha, width, squash) {
      paint(color, alpha, width); ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(.1, radius), Math.max(.1, radius * (squash || 1)), 0, 0, TAU); ctx.stroke();
    }
    function shape(kind, p, size, rotation, color, alpha, brush = ctx) {
      paint(color, alpha, 1.2, brush); brush.translate(p.x, p.y); brush.rotate(rotation || 0); brush.beginPath();
      if (kind === 'heart') {
        brush.moveTo(0, size * .8); brush.bezierCurveTo(-size * 1.4, -.1 * size, -size * .6, -size, 0, -size * .35);
        brush.bezierCurveTo(size * .6, -size, size * 1.4, -.1 * size, 0, size * .8);
      } else if (kind === 'leaf' || kind === 'petal' || kind === 'feather') {
        brush.moveTo(0, -size); brush.bezierCurveTo(size * .9, -size * .3, size * .65, size * .6, 0, size);
        brush.bezierCurveTo(-size * .45, size * .3, -size * .45, -size * .3, 0, -size);
      } else if (kind === 'diamond') {
        brush.moveTo(0, -size); brush.lineTo(size * .55, 0); brush.lineTo(0, size); brush.lineTo(-size * .55, 0); brush.closePath();
      } else {
        var sides = kind === 'star' ? 10 : 8;
        for (var i = 0; i < sides; i++) {
          var a = i / sides * TAU - Math.PI / 2, r = i % 2 ? size * .28 : size;
          if (i) brush.lineTo(Math.cos(a) * r, Math.sin(a) * r); else brush.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        brush.closePath();
      }
      brush.fill(); brush.stroke();
    }
    // A mote only changes position, rotation, size and opacity during flight.
    // Rasterize its outline and soft glow once per colour and size, at native
    // resolution. Offscreen tiles live only for the current battle action.
    function particleStamp(kind, color, size) {
      var key = kind + ':' + color + ':' + size;
      if (particleStamps.has(key)) return particleStamps.get(key);
      var tile = doc.createElement('canvas');
      var pixels = Math.ceil((size + 13) * 2 * ratio);
      tile.width = tile.height = pixels;
      var brush = tile.getContext('2d');
      if (!brush) return null;
      brush.setTransform(ratio, 0, 0, ratio, pixels / 2, pixels / 2);
      brush.globalCompositeOperation = 'lighter';
      shape(kind, {x:0,y:0}, size, 0, color, 1, brush);
      particleStamps.set(key, tile);
      return tile;
    }
    function motes(p, color, start, count, kind, radius, inward) {
      count = Math.max(0, Math.min(light ? Math.ceil(count * .42) : count, particleBudget - emitted));
      emitted += count; canvas.dataset.particles = String(emitted);
      var data = Array.from({ length: count }, function (_, i) {
        var key = i + emitted * .73;
        return { angle: seed(key) * TAU, radius: radius * (.45 + seed(key + 3) * .65), size: 2 + seed(key + 5) * (kind === 'leaf' || kind === 'feather' ? 6 : 3.5), bend: (seed(key + 9) - .5) * 36 };
      });
      if (!light && typeof ctx.drawImage === 'function') {
        data.forEach(function (m) {
          m.tileSize = Math.round(m.size * 2) / 2;
          m.tile = particleStamp(kind || 'spark', color, m.tileSize);
        });
      }
      add(start, 540, function (t) {
        var intensity = envelope(t);
        data.forEach(function (m) {
          var travel = inward ? 1 - ease(t) : ease(t), a = m.angle + t * .35;
          var at = { x: p.x + Math.cos(a) * m.radius * travel, y: p.y + Math.sin(a) * m.radius * travel * .65 - t * m.bend };
          var size = m.size * (.8 + intensity * .3);
          ctx.save();
          if (m.tile) {
            var width = m.tile.width / ratio * size / m.tileSize;
            ctx.globalAlpha = intensity * .8;
            ctx.translate(at.x, at.y);
            ctx.rotate(a + t);
            ctx.drawImage(m.tile, -width / 2, -width / 2, width, width);
          } else {
            shape(kind || 'spark', at, size, a + t, color, intensity * .8);
          }
          ctx.restore();
        });
      });
    }
    function shock(p, color, start, scale) {
      add(start, 440, function (t) {
        if (!light) {
          // A short coloured bloom gives the impact some weight against the
          // bright arena, without a white flash or hiding the standing art.
          var radius = unit * (.3 + ease(t) * .64) * scale;
          var glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
          glow.addColorStop(0, color); glow.addColorStop(.35, color); glow.addColorStop(1, 'transparent');
          ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = envelope(t) * .24;
          ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'lighter';
        }
        circle(p, unit * (.14 + ease(t) * .58) * scale, color, (1 - t) * .75, 2.3 * (1 - t) + .4);
        circle(p, unit * (.08 + ease(t) * .5) * scale, color, (1 - t) * .38, 1, .36);
        if (t < .45) {
          ctx.save(); shape('spark', p, unit * (.1 + t * .32) * scale, .3, '#fff4d9', (1 - t / .45) * .85); ctx.restore();
        }
      });
    }
    function slash(p, color, start, angle, scale, life) {
      add(start, life || 420, function (t) {
        var spread = unit * scale, progress = ease(Math.min(1, t * 2.6));
        ctx.translate(p.x, p.y); ctx.rotate(angle);
        paint(color, envelope(t) * .7, 8 * (1 - t) + 1);
        ctx.beginPath(); ctx.ellipse(0, 12, spread, spread * .43, 0, Math.PI * 1.12, Math.PI * (1.12 + .8 * progress)); ctx.stroke();
        paint('#fff6df', envelope(t) * .92, 2.3 * (1 - t) + .6);
        ctx.beginPath(); ctx.ellipse(0, 9, spread * .96, spread * .4, 0, Math.PI * 1.12, Math.PI * (1.12 + .8 * progress)); ctx.stroke();
      });
    }
    function bolt(from, to, color, start, life, kind, releasePoint) {
      add(start, life, function (t) {
        if (releasePoint) { from = releasePoint(); releasePoint = null; }
        var k = t * t, head = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - Math.sin(t * Math.PI) * (kind === 'arrow' ? 0 : 20) };
        var back = Math.max(0, k - .22), tail = { x: from.x + (to.x - from.x) * back, y: from.y + (to.y - from.y) * back };
        path([tail, head], color, Math.min(1, t * 5) * .75, kind === 'arrow' ? 3 : 5);
        ctx.save(); shape(kind === 'arrow' ? 'diamond' : 'spark', head, kind === 'arrow' ? 9 : 10, Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2, '#fff0d8', Math.min(1, t * 4) * .95); ctx.restore();
      });
    }
    function rune(p, color, start, scale, life) {
      add(start, life || 690, function (t) {
        var r = unit * scale * (.7 + ease(t) * .3), alpha = envelope(t) * .55;
        circle(p, r, color, alpha, 1.5); circle(p, r * .8, color, alpha * .6, 1);
        for (var i = 0; i < 6; i++) {
          var a = i / 6 * TAU + t * .45, b = a + TAU / 3;
          path([{ x: p.x + Math.cos(a) * r * .7, y: p.y + Math.sin(a) * r * .7 }, { x: p.x + Math.cos(b) * r * .7, y: p.y + Math.sin(b) * r * .7 }], color, alpha, 1);
        }
      });
    }
    function shield(p, color, start, scale, life) {
      add(start, life || 650, function (t) {
        var s = unit * scale * (.8 + ease(t) * .2), a = envelope(t) * .75;
        var pts = [[0,-.65],[.45,-.4],[.38,.25],[0,.65],[-.38,.25],[-.45,-.4],[0,-.65]].map(function (xy) { return { x: p.x + xy[0] * s, y: p.y + xy[1] * s }; });
        path(pts, color, a, 3); path([{ x: p.x, y: p.y - s * .28 }, { x: p.x, y: p.y + s * .3 }], color, a, 2);
        path([{ x: p.x - s * .2, y: p.y }, { x: p.x + s * .2, y: p.y }], color, a, 2);
        circle({ x: p.x, y: p.y + s * .65 }, s * .65, color, a * .55, 1.5, .22);
      });
    }
    function wings(p, color, start, scale) {
      add(start, 850, function (t) {
        var open = .6 + ease(t) * .4, alpha = envelope(t) * .66;
        [-1, 1].forEach(function (side) {
          for (var i = 0; i < (light ? 4 : 7); i++) {
            var a = -.8 + i * .19, length = unit * scale * (1 - i * .065) * open;
            ctx.save(); shape('feather', { x: p.x + side * Math.cos(a) * length, y: p.y + Math.sin(a) * length - 12 }, unit * scale * .24, side * (a + .65), color, alpha); ctx.restore();
          }
        });
      });
    }
    function lightning(p, color, start, scale, count) {
      for (var b = 0; b < count; b++) (function (index) {
        add(start + index * 65, 330, function (t) {
          var x = p.x + (index - (count - 1) / 2) * unit * .32, h = unit * scale;
          path([{ x: x + h * .15, y: p.y - h }, { x: x - h * .15, y: p.y - h * .42 }, { x: x + h * .1, y: p.y - h * .48 }, { x: x - h * .12, y: p.y + h * .24 }], color, envelope(t) * .8, 6 * (1 - t) + 1);
          path([{ x: x + h * .15, y: p.y - h }, { x: x - h * .15, y: p.y - h * .42 }, { x: x + h * .1, y: p.y - h * .48 }, { x: x - h * .12, y: p.y + h * .24 }], '#fff2ca', envelope(t) * .9, 1.3);
        });
      })(b);
    }
    function flame(p, color, start, life) {
      add(start, life || 700, function (t) {
        for (var i = -1; i <= 1; i++) {
          var s = unit * (.32 + envelope(t) * .2), x = p.x + i * unit * .25, y = p.y + unit * .35, sway = Math.sin(t * TAU + i) * s * .2;
          paint(color, envelope(t) * .45, 1.5); ctx.beginPath(); ctx.moveTo(x, y);
          ctx.bezierCurveTo(x - s, y - s * .5, x + sway - s * .2, y - s, x + sway, y - s * 2.3);
          ctx.bezierCurveTo(x + sway + s * .25, y - s * 1.1, x + s, y - s * .55, x, y);
          ctx.fill(); ctx.stroke();
        }
      });
    }
    function tracked(point) {
      if (!point?.weapon) {
        var fixed = local(point);
        return function () { return fixed; };
      }
      return function () { return local(point.weapon()); };
    }
    function ribbon(curve, tail, head, width, color, accent, opacity) {
      if (head <= tail || opacity <= 0) return;
      var sides = [[],[]], points = [], steps = light ? 8 : 15;
      for (var i = 0; i <= steps; i++) {
        var u = i / steps, at = tail + (head - tail) * u, p = curve(at), next = curve(at + .001);
        var dx = next.x - p.x, dy = next.y - p.y, length = Math.max(.001, Math.hypot(dx, dy));
        var thickness = width * (.025 + Math.pow(Math.sin(Math.PI*u), .75));
        points.push(p);
        sides[0].push({x:p.x - dy / length * thickness, y:p.y + dx / length * thickness});
        sides[1].push({x:p.x + dy / length * thickness, y:p.y - dx / length * thickness});
      }
      ctx.save();
      // A layer of saturated ink under the thin glint remains readable on
      // the bright arena floor; additive white on its own disappears there.
      ctx.globalCompositeOperation = 'source-over';
      paint(color,opacity,1); ctx.beginPath();
      sides[0].concat(sides[1].reverse()).forEach(function (p, i) { if (i) ctx.lineTo(p.x,p.y); else ctx.moveTo(p.x,p.y); });
      ctx.closePath(); ctx.fill();
      path(points,accent,opacity,Math.max(1,width*.22)); ctx.restore();
    }
    function windRelay(from, to, start) {
      add(start,285,function(t) {
        var a=from(), b=to(), height=Math.min(unit*.55,Math.hypot(b.x-a.x,b.y-a.y)*.20);
        // Tall staves can already reach the top of a short arena. Bend down
        // into the battlefield there so the support trail remains visible.
        if (Math.min(a.y,b.y)<height+12) height=-height*.70;
        function curve(u) {
          return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u-height*Math.sin(Math.PI*u)};
        }
        var head=clamp(t*1.32,0,1), tail=clamp((t-.35)*1.6,0,1);
        ribbon(curve,tail,head,unit*.042,'#39bd91','#e4ffb7',envelope(t));
        var tip=curve(head);ctx.save();shape('leaf',tip,unit*.064,-.7,'#d2ffc1',envelope(t));ctx.restore();
      });
    }
    function meleeStrike(record, points, impact) {
      var stroke = strokeOf(record), beat = record.strikeIndex || 0;
      var blunt = ['fist', 'ghost-fist', 'bash'].includes(stroke);
      var heavy = ['heavy', 'sweep', 'bash'].includes(stroke);
      var thrust = stroke === 'thrust' || (stroke === 'sword-dance' && beat % 3 === 2);
      var reverse = stroke === 'back-cut' || (stroke === 'sword-dance' && beat % 3 === 1);
      var contact = local(points.meleeContact || points.target), from = local(points.origin || points.target);
      var side = points.meleeContact?.side;
      var approach = side ? (side > 0 ? 0 : Math.PI) : Math.atan2(contact.y - from.y, contact.x - from.x);
      var forward = { x: Math.cos(approach), y: Math.sin(approach) };
      var reach = Math.min(unit * .62, Math.max(16, (points.target.width || unit) * .35));
      var hand = tracked(points.origin || points.target);
      var boosted = record.encouragement?.sources?.kokkoro > 0;
      var blocked = record.absorbed > 0 && !record.amount;
      canvas.dataset.heroMotion = stroke;

      // Dimensions below are fractions of the struck figure, independent of
      // the space between the formations. The portrait supplies all travel.
      function markAt(along, across) {
        return { x: contact.x + reach * (forward.x * along - forward.y * across),
          y: contact.y + reach * (forward.y * along + forward.x * across) };
      }
      if (!blunt && !points.secondaryMelee) {
        var lead = heavy ? 45 : 33, linger = heavy ? 114 : 85;
        add(impact - lead, lead + linger, function (t) {
          var elapsed = t * (lead + linger) - lead;
          if (elapsed < 0) {
            var tip = hand();
            if (Math.hypot(tip.x - contact.x, tip.y - contact.y) > reach) return;
          }
          var progress = clamp(1 + elapsed / lead, 0, 1);
          var fade = clamp(elapsed / linger, 0, 1);
          var wind = boosted && elapsed >= 0 && elapsed < 65;
          function curve(u) {
            if (thrust) return markAt(-.78 + u * .94, .13 * (1-u));
            var edge = 2 * u - 1;
            var belly = 1 - edge * edge;
            var sweep = stroke === 'sweep' ? .76 * edge : (heavy ? 1.02 : .82) * edge;
            return markAt(.52 * belly + .19 * edge - .30, reverse ? -sweep : sweep);
          }
          ribbon(curve, fade, progress, reach * (thrust ? .026 : heavy ? .076 : .046),
            wind ? '#36bb90' : '#73808b', wind ? '#e4ffbb' : '#fff4de', 1 - fade);
        });
      }

      // Fists compress against the body, shields hit rim-first, and swords
      // shed a few short chips. Nothing flies from the attacker's home slot.
      add(impact, blunt ? 122 : 108, function (t) {
        var color = boosted && t < .56 ? '#36bb90' : blocked ? '#afdfff' : '#fff0ce';
        var alpha = 1 - t;
        if (blunt && !points.secondaryMelee) {
          var width = stroke === 'bash' ? .37 : .21;
          var kick = .10 + ease(t) * .16;
          path([markAt(-.10, -width), markAt(kick, -.08), markAt(kick, .08), markAt(-.10, width)],
            color, alpha, heavy ? 3.8 : 2.7);
        }
        var count = light || points.secondaryMelee ? 3 : heavy ? 6 : 4;
        for (var i = 0; i < count; i++) {
          var angle = -.99 + i * 1.98 / (count - 1) + (beat % 2 ? .18 : -.10);
          var distance = (.12 + .45 * ease(t)) * (i % 2 ? .73 : 1);
          var tail = distance - .20 * alpha;
          path([markAt(tail * Math.cos(angle), tail * Math.sin(angle)),
            markAt(distance * Math.cos(angle), distance * Math.sin(angle))], color, alpha, heavy ? 2.5 : 1.8);
        }
      });
    }
    function arrowStroke(stroke, hand, target, impact, color, accent, beat) {
      var lead=120, release;
      add(impact-lead,lead,function(t) {
        if (!release) release=hand();
        var dx=target.x-release.x,dy=target.y-release.y,speed=.14*t+.86*t*t;
        var arc=(stroke==='leaf-arrow' ? .42 : .11)*unit*(beat%2 ? .65 : 1);
        function curve(u) { return {x:release.x+dx*u,y:release.y+dy*u-arc*Math.sin(Math.PI*u)}; }
        var distance=Math.max(32,Math.hypot(dx,dy)), tail=Math.max(0,speed-unit*(stroke==='piercing-arrow'?.75:.44)/distance);
        ribbon(curve,tail,speed,stroke==='piercing-arrow'?4:2.6,color,accent,1);
        var head=curve(speed), angle=Math.atan2(dy-arc*Math.PI*Math.cos(Math.PI*speed),dx);
        ctx.save();shape('diamond',head,unit*.061,angle+Math.PI/2,accent,1);ctx.restore();
        if (stroke==='leaf-arrow' && !light) { ctx.save();shape('leaf',curve(tail),5,angle-.5,color,.85);ctx.restore(); }
      });
    }
    function heroAttack(record, points, target, start, impact, profile) {
      var stroke=strokeOf(record), hand=tracked(points.origin || points.target), color=profile.color, accent=profile.accent;
      var grip=hand(), beat=record.strikeIndex || 0;
      canvas.dataset.heroMotion=stroke;
      if (stroke==='arrow'||stroke==='leaf-arrow'||stroke==='piercing-arrow') {
        arrowStroke(stroke,hand,target,impact,color,accent,beat);
      } else if (record.visual==='magic') {
        var fromSky=stroke==='meteor'||stroke==='starfall';
        var targetOrigin=fromSky ? {x:target.x+unit*.57,y:Math.max(4,target.y-unit*1.42)} : grip;
        rune(grip,color,start,.18,210);
        if (stroke==='lightning') {
          add(impact-95,160,function(t) {
            var dx=target.x-grip.x,dy=target.y-grip.y,level=envelope(t),points=[grip];
            for(var i=1;i<7;i++) points.push({x:grip.x+dx*i/7,y:grip.y+dy*i/7+(i%2 ? 1:-1)*level*unit*.16});
            points.push(target);path(points,color,level,5);path(points,accent,level,1.5);
          });
        } else {
          var travel=fromSky ? 165 : 120;
          bolt(targetOrigin,target,color,impact-travel,travel,'magic',fromSky ? null : hand);
          if (stroke==='hex') rune(target,color,impact-32,.33,245);
          if (stroke==='flame') flame(target,color,impact-90,350);
          if (stroke==='radiance'||stroke==='wisp') circleWave(target,accent,impact-12,.44,330);
          if (stroke==='meteor'||stroke==='starfall') {
            add(impact-165,165,function(t) {
              var k=t*t, p={x:targetOrigin.x+(target.x-targetOrigin.x)*k,y:targetOrigin.y+(target.y-targetOrigin.y)*k};
              ctx.save();shape('star',p,unit*(stroke==='meteor'?.19:.105),t*1.9,accent,.9);ctx.restore();
            });
          }
        }
      }
    }
    function cue(record, points) {
      if (done || !record || !points || !points.target) return;
      var p = local(points.target), o = local(points.origin || points.target), start = points.delay || 0, impact = points.impactAt === undefined ? start + 210 : points.impactAt;
      var profile = profiles[record.source], color = points.color || profile && profile.color || '#c1b6ff';
      var family = profile && profile.family || (record.visual === 'magic' ? 'magic' : 'claw');
      if (record.type === 'hit') {
        if (isMeleeCard(record)) { meleeStrike(record, points, impact); return; }
        var indirect = ['star', 'poison', 'reflect', 'counter', 'relic', 'passive'].includes(record.sourceKind);
        if (indirect) {
          // Delayed damage belongs to its victim. It must not make a dead or
          // unrelated caster appear to perform an additional active attack.
          motes(p, color, impact, 5, record.sourceKind === 'star' ? 'star' : 'diamond', unit * .45);
        } else if (points.stageMotion) {
          // The stage layer draws the individual spell, blade, or shell.
          // Keep Canvas hit sparks and absorption without a second projectile.
        } else if (profile && record.sourceKind==='card' && !record.burst) {
          heroAttack(record,points,p,start,impact,profile);
        } else if (record.visual === 'magic' || family === 'arrow' || family === 'wind') {
          rune(o, color, start, .26, 300); bolt(o, p, color, start, 210, family === 'arrow' ? 'arrow' : 'magic');
        } else if (family === 'fist') {
          add(impact - 70, 330, function (t) {
            var r = unit * (.16 + ease(t) * .3); circle(p, r, color, envelope(t) * .8, 5, .7);
            for (var i = 0; i < 5; i++) { var a = (i - 2) * .22; path([{ x: p.x - Math.cos(a) * r * 2, y: p.y - Math.sin(a) * r * 2 }, { x: p.x - Math.cos(a) * r * .6, y: p.y - Math.sin(a) * r * .6 }], color, envelope(t) * .5, 2); }
          });
        } else {
          slash(p, color, impact - 65, -.3, record.burst ? 1.1 : .76, 390);
          if (family === 'claw') [-.2, .2].forEach(function (a) { slash({ x: p.x + a * unit, y: p.y }, color, impact - 35, a - .4, .65, 340); });
        }
        if (record.amount > 0) { shock(p, color, impact, record.burst ? 1.25 : .8); motes(p, color, impact, record.burst ? 17 : 9, 'spark', unit * (record.burst ? 1.05 : .7)); }
        else if (record.absorbed > 0) { motes(p, '#b5e5ff', impact, 7, 'diamond', unit * .55); }
        else shock(p, '#d7e5f7', impact, .38);
      } else if (record.type === 'heal' || record.type === 'cleanse') {
        add(start, 620, function (t) {
          circle({ x: p.x, y: p.y + unit * .45 }, unit * (.28 + ease(t) * .35), color, envelope(t) * .7, 2, .25);
          for (var i = 0; i < 3; i++) { var x = p.x + (i - 1) * unit * .27, y = p.y + unit * .4 - ease(t) * unit * 1.05; path([{ x: x - 4, y: y }, { x: x + 4, y: y }], color, envelope(t) * .85, 2); path([{ x: x, y: y - 4 }, { x: x, y: y + 4 }], color, envelope(t) * .85, 2); }
        });
        motes(p, color, start + 50, 12, 'spark', unit * .6, true);
      } else if (record.type === 'block') { shield(p, color, start, 1.2); motes(p, color, start, 8, 'diamond', unit * .65, true); }
      else if (record.type === 'status' || record.type === 'support' || record.type === 'debuff') {
        if (record.status==='buff' && record.source==='kokkoro' && record.target!=='kokkoro') {
          windRelay(tracked(points.origin || points.target),tracked(points.target),start);
        }
        rune(p, color, start, .48, 560); motes(p, color, start + 20, 8, record.status === 'stars' ? 'star' : 'spark', unit * .65);
      }
    }
    function burst(options) {
      if (done || !options || !options.focus) return;
      var id = options.owner, profile = profiles[id]; if (!profile) return;
      var p = local(options.focus), targets = (options.targets || []).map(local), c = profile.color, accent = profile.accent;
      if (!targets.length) targets = [p];
      var motif = profile.motif;
      // Each signature occupies the same short window; more detail never adds
      // an additional player input lock or waits for particles off screen.
      shock(p, c, 230, 1.65); motes(p, accent, 240, 25, motif === 'starfall' ? 'star' : 'spark', unit * 1.4);
      if (motif === 'royal-blade' || motif === 'rapier') {
        add(50, 700, function (t) {
          var s = unit * (motif === 'rapier' ? .85 : 1.25), y = p.y - s * .15 + (ease(t) - .5) * s * .25;
          path([{ x: p.x, y: y - s }, { x: p.x, y: y + s * .55 }], c, envelope(t) * .7, motif === 'rapier' ? 5 : 15);
          path([{ x: p.x, y: y - s }, { x: p.x, y: y + s * .55 }], accent, envelope(t) * .9, 2);
          path([{ x: p.x - s * .23, y: y + s * .35 }, { x: p.x + s * .23, y: y + s * .35 }], c, envelope(t), 5);
        });
        slash(p, accent, 220, -.2, 1.7, 570); if (motif === 'rapier') lightning(p, c, 220, 1.2, 3);
      } else if (motif === 'crescent' || motif === 'wolf') {
        [-.7, .55, -.15].forEach(function (a, i) { slash({ x: p.x + (i - 1) * 12, y: p.y + (i - 1) * 7 }, i === 1 ? accent : c, 60 + i * 125, a, motif === 'wolf' ? 1.25 : 1.6, 540); });
        if (motif === 'wolf') motes(p, accent, 290, 18, 'diamond', unit * 1.5);
      } else if (motif === 'wind-leaves') {
        targets.forEach(function (at, i) { motes(at, c, i * 20, 16, 'leaf', unit * 1.1); circleWave(at, accent, i * 20, 1); });
        slash(p, accent, 160, .1, 1.6, 670); slash(p, c, 260, Math.PI, 1.45, 650);
      } else if (motif === 'void' || motif === 'dark-flame') {
        rune(p, c, 0, 1.05, 950); motes(p, accent, 50, 24, 'diamond', unit * 1.35, true);
        add(80, 800, function (t) {
          var r = unit * (.1 + envelope(t) * .38), gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          ctx.globalCompositeOperation = 'source-over'; gradient.addColorStop(0, motif === 'void' ? '#49266c' : '#7f397e'); gradient.addColorStop(.5, c); gradient.addColorStop(1, 'transparent'); ctx.globalAlpha = envelope(t) * .8; ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'lighter'; circle(p, r * 1.15, accent, envelope(t) * .75, 2);
        });
        if (motif === 'dark-flame') targets.forEach(function (at, i) { flame(at, accent, 170 + i * 30); motes(at, '#e89be1', 200, 14, 'petal', unit); });
      } else if (motif === 'starfall') {
        targets.forEach(function (at, i) {
          for (var s = 0; s < (light ? 2 : 4); s++) { var from = { x: at.x + unit * (.6 + s * .12), y: Math.max(8, at.y - unit * 1.7) }; bolt(from, at, s % 2 ? accent : c, 15 + s * 90 + i * 15, 330, 'magic'); }
          motes(at, accent, 350 + i * 20, 13, 'star', unit);
        });
        rune(p, c, 70, .85, 800);
      } else if (motif === 'angel' || motif === 'phoenix' || motif === 'feather-ward') {
        if (motif === 'feather-ward') {
          // Shizuru protects with a crescent of her sword; Yui owns the full
          // angel-wing silhouette. Their defensive bursts remain easy to read.
          slash(p, c, 100, -.65, 1.45, 620); slash(p, accent, 230, .15, 1.2, 590);
          add(60, 760, function (t) {
            var s = unit * .8, angle = -.35;
            ctx.translate(p.x, p.y); ctx.rotate(angle);
            path([{ x: 0, y: -s }, { x: 0, y: s * .5 }], c, envelope(t) * .8, 7);
            path([{ x: 0, y: -s }, { x: 0, y: s * .5 }], accent, envelope(t) * .9, 1.5);
            path([{ x: -s * .24, y: s * .3 }, { x: s * .24, y: s * .3 }], c, envelope(t) * .85, 3);
          });
        } else wings(p, accent, 20, motif === 'phoenix' ? 1.2 : .95);
        targets.forEach(function (at, i) { if (motif !== 'phoenix') shield(at, c, i * 30, 1.35, 850); motes(at, c, 110 + i * 20, 12, 'feather', unit * .9); });
        if (motif === 'phoenix') slash(p, c, 210, -.25, 1.65, 600);
      } else if (motif === 'citadel') {
        targets.forEach(function (at, i) { shield(at, c, i * 30, 1.65, 950); motes(at, accent, 160, 12, 'diamond', unit * 1.05, true); });
        add(80, 850, function (t) { for (var i = -2; i <= 2; i++) { var x = p.x + i * unit * .28, y = p.y + unit * .65; path([{ x: x, y: y }, { x: x, y: y - unit * (.8 - Math.abs(i) * .1) * ease(t) }], c, envelope(t) * .4, 7); } });
      } else if (motif === 'stage') {
        targets.forEach(function (at, i) { circleWave(at, c, i * 30, 1.2); motes(at, accent, i * 25, 12, 'star', unit); });
        add(30, 880, function (t) {
          for (var i = 0; i < 5; i++) { var x = p.x + (i - 2) * unit * .4, y = p.y + unit * .3 - t * unit * 1.1; paint(i % 2 ? c : accent, envelope(t) * .85, 2); ctx.beginPath(); ctx.ellipse(x, y, 5, 3, -.4, 0, TAU); ctx.fill(); path([{ x: x + 4, y: y }, { x: x + 4, y: y - 20 }, { x: x + 13, y: y - 14 }], c, envelope(t) * .8, 2); }
        });
      } else if (motif === 'heart-arrow' || motif === 'forest-arrows') {
        var count = motif === 'heart-arrow' ? 3 : light ? 4 : 6;
        for (var a = 0; a < count; a++) { var from = { x: p.x - unit * (1.5 + a * .1), y: p.y + (a - (count - 1) / 2) * unit * .27 }; bolt(from, p, a % 2 ? accent : c, a * 65, 300, 'arrow'); }
        motes(p, accent, 270, 22, motif === 'heart-arrow' ? 'heart' : 'leaf', unit * 1.2);
      } else if (motif === 'ghost') {
        add(10, 900, function (t) {
          var s = unit * (.45 + envelope(t) * .15), y = p.y - t * unit * .2;
          ctx.globalCompositeOperation = 'source-over'; paint(c, envelope(t) * .38, 2.5); ctx.beginPath(); ctx.moveTo(p.x - s, y + s * .55); ctx.bezierCurveTo(p.x - s, y - s * 1.2, p.x + s, y - s * 1.2, p.x + s, y + s * .55); ctx.lineTo(p.x + s * .5, y + s * .35); ctx.lineTo(p.x, y + s * .6); ctx.lineTo(p.x - s * .5, y + s * .35); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.globalCompositeOperation = 'lighter'; circle({ x: p.x - s * .25, y: y - s * .05 }, 2.5, accent, envelope(t), 2); circle({ x: p.x + s * .25, y: y - s * .05 }, 2.5, accent, envelope(t), 2);
        });
        [120, 280, 420].forEach(function (at) { shock(p, accent, at, .85); });
      } else if (motif === 'lightning') { rune(p, c, 10, .9, 800); targets.forEach(function (at, i) { lightning(at, accent, 100 + i * 25, 1.7, light ? 2 : 4); }); }
      else if (motif === 'tidal-fists') {
        [-1, 0, 1].forEach(function (i) { var at = { x: p.x + i * unit * .3, y: p.y + Math.abs(i) * 12 }; shock(at, i === 0 ? accent : c, 50 + (i + 1) * 140, 1.1); slash(at, c, 80 + (i + 1) * 140, .1 * i, 1, 480); });
      }
      // A translucent perimeter closes the composition without washing out art.
      add(0, 1050, function (t) { circle(p, unit * (1.25 + ease(t) * .2), c, envelope(t) * .16, 1); });
    }
    function circleWave(p, color, start, scale, life) {
      add(start, life || 820, function (t) {
        circle({ x: p.x, y: p.y + unit * .45 }, unit * scale * (.3 + ease(t) * .8), color, envelope(t) * .5, 2, .27);
        circle({ x: p.x, y: p.y + unit * .44 }, unit * scale * (.2 + ease(t) * .7), color, envelope(t) * .28, 1, .27);
      });
    }
    function boss(options) {
      if (done || !options || !options.focus) return;
      var profile = bosses[options.bossId]; if (!profile) return;
      var p = local(options.focus), targets = (options.targets || []).map(local), c = profile.color, accent = profile.accent;
      if (!targets.length) targets = [p];
      if (profile.motif === 'sword-rain' || profile.motif === 'barrage') {
        targets.forEach(function (at, i) {
          for (var n = 0; n < (light ? 2 : 4); n++) {
            var from = { x: at.x + (n - 1) * unit * .22, y: Math.max(0, at.y - unit * 1.6) };
            bolt(from, at, n % 2 ? accent : c, 20 + n * 85 + i * 20, 260, profile.motif === 'barrage' ? 'magic' : 'arrow');
          }
          slash(at, c, 210, -.5, 1.25, 570); motes(at, accent, 260, 14, 'diamond', unit);
        });
      } else if (profile.motif === 'orchid') {
        rune(p, c, 0, 1.2, 950);
        add(60, 880, function (t) {
          for (var n = 0; n < 8; n++) { var a = n * TAU / 8 + t * .4; ctx.save(); shape('petal', { x: p.x + Math.cos(a) * unit * .5 * ease(t), y: p.y + Math.sin(a) * unit * .4 * ease(t) }, unit * .4, a + Math.PI / 2, c, envelope(t) * .42); ctx.restore(); }
        });
        targets.forEach(function (at, i) { motes(at, accent, 150 + i * 25, 16, 'petal', unit * 1.1); circleWave(at, c, 90, 1.2); });
      } else if (profile.motif === 'prism') {
        targets.forEach(function (at, i) {
          add(i * 30, 820, function (t) {
            ctx.save(); shape('diamond', at, unit * (.65 + envelope(t) * .25), .15 + t * .45, c, envelope(t) * .22); ctx.restore();
            path([{ x: at.x - unit, y: at.y - unit * .6 }, { x: at.x + unit, y: at.y + unit * .6 }], accent, envelope(t) * .7, 4);
            path([{ x: at.x - unit, y: at.y + unit * .6 }, { x: at.x + unit, y: at.y - unit * .6 }], c, envelope(t) * .7, 3);
          });
          motes(at, accent, 260, 14, 'diamond', unit * 1.2);
        });
      } else {
        add(0, 900, function (t) {
          var r = unit * (.65 + ease(t) * .25); ctx.globalCompositeOperation = 'source-over'; paint('#441a3e', envelope(t) * .45, 1); ctx.beginPath(); ctx.arc(p.x, p.y - unit * .2, r, 0, TAU); ctx.fill();
          ctx.globalCompositeOperation = 'lighter'; circle({ x: p.x, y: p.y - unit * .2 }, r, c, envelope(t) * .8, 4); circle({ x: p.x, y: p.y - unit * .2 }, r * 1.15, accent, envelope(t) * .35, 1);
        });
        targets.forEach(function (at, i) {
          for (var blade = 0; blade < 3; blade++) bolt({ x: at.x + (blade - 1) * unit * .35, y: Math.max(0, at.y - unit * 1.7) }, at, blade === 1 ? accent : c, 100 + blade * 85 + i * 15, 260, 'arrow');
          shock(at, c, 350 + i * 20, 1.3); motes(at, accent, 390, 17, 'diamond', unit * 1.25);
        });
      }
    }
    if (typeof doc.addEventListener === 'function') doc.addEventListener('visibilitychange', hidden);
    if (typeof global.addEventListener === 'function') global.addEventListener('resize', resized);
    if (typeof canvas.addEventListener === 'function') canvas.addEventListener('contextlost', lost);
    raf = global.requestAnimationFrame(frame);
    return { cue: cue, burst: burst, boss: boss, finished: finished, cancel: function () { cleanup(true, 'cancelled'); }, canvas: canvas, quality: quality };
  }
  return { create: create, profiles: profiles, bosses: bosses, weaponAnchors: weaponAnchors, strikePose: strikePose, isMeleeCard: isMeleeCard };
});
