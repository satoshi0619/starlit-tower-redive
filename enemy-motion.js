(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TowerEnemyMotion = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // The reference rectangle is the old, padded portrait in the coordinate
  // system shared by every frame. Both resting images of the nut shooter have
  // different padding, but the feet must stay planted when either one attacks.
  function placement(art, clip, flip) {
    const reference = clip.reference;
    const scale = art.width / reference.w;
    const left = art.x - art.width / 2 - reference.x * scale;
    return {
      left: flip ? art.x * 2 - left - clip.frameWidth * scale : left,
      top: art.y - art.height * .49 - reference.y * scale,
      scale, flip
    };
  }

  function fitFrame(clip, pose, range, frame) {
    // Use the occupied pixels of this pose, not the full common sheet cell.
    // On a narrow phone an attacking face may otherwise leave the battlefield.
    const ink = clip.inkX?.[frame] || [0, clip.frameWidth];
    const left = pose.flip ? clip.frameWidth - ink[1] : ink[0];
    const right = pose.flip ? clip.frameWidth - ink[0] : ink[1];
    const shrink = pose.shrink;
    const scale = pose.scale * shrink;
    const shift = Math.max(range.left - pose.left - left * scale, Math.min(0,range.right - pose.left - right * scale));
    return { scale, shrink, shift };
  }

  function framesFor(clip, pose, range, contact, duration) {
    const rows = Math.ceil(clip.frames / clip.columns);
    const last = clip.frames - 1;
    const body = [], atlas = [];
    for (let i = 0; i <= last; i++) {
      const x = -(i % clip.columns) * 100 / clip.columns;
      const y = -Math.floor(i / clip.columns) * 100 / rows;
      const at = i <= clip.contactFrame
        ? contact * i / Math.max(1, clip.contactFrame)
        : contact + (duration - contact) * (i - clip.contactFrame) / (last - clip.contactFrame);
      const fit = fitFrame(clip, pose, range, i);
      let transform = 'translateX(' + fit.shift + 'px) scale(' + fit.shrink + ')';
      if (pose.flip) transform += ' translateX(' + clip.frameWidth * pose.scale + 'px) scaleX(-1)';
      const [tileX, tileY] = clip.tileOffsets?.[i] || [0, 0];
      transform += ' translate(' + tileX * pose.scale + 'px,' + tileY * pose.scale + 'px)';
      const timing = { offset: at / duration, easing: 'steps(1, end)' };
      body.push({ ...timing, transform, opacity: 1 });
      atlas.push({ ...timing, transform: 'translate3d(' + x + '%,' + y + '%,0)' });
    }
    return { body, atlas };
  }

  function create({ document, layer, bounds, assets, preloader, light }) {
    if (!bounds || !assets || !preloader?.getReadyImage) return null;
    const animations = [];
    const nodes = [];
    const activeBodies = new Map();

    function track(el, frames, delay, duration) {
      const a = el.animate(frames, { delay, duration, fill: 'none', easing: 'linear' });
      animations.push(a);
    }

    function body(clip, pose, range, portrait, container, event, delay, contact) {
      const box = container.getBoundingClientRect();
      const sprite = document.createElement('span');
      const atlas = document.createElement('span');
      sprite.className = 'enemy-attack-sprite';
      atlas.className = 'enemy-attack-atlas';
      sprite.dataset.source = event.source;
      sprite.setAttribute('aria-hidden', 'true');
      Object.assign(sprite.style, {
        left: (pose.left - box.left) / box.width * 100 + '%',
        top: (pose.top - box.top) / box.height * 100 + '%',
        width: (clip.tileWidth || clip.frameWidth) * pose.scale / box.width * 100 + '%',
        height: (clip.tileHeight || clip.frameHeight) * pose.scale / box.height * 100 + '%',
        transformOrigin: '0 ' + ((clip.reference.y + clip.reference.h) * pose.scale) + 'px'
      });
      Object.assign(atlas.style, {
        backgroundImage: 'url("' + clip.src + '")',
        width: clip.columns * 100 + '%',
        height: Math.ceil(clip.frames / clip.columns) * 100 + '%'
      });
      sprite.appendChild(atlas);
      container.insertBefore(sprite, portrait.nextSibling);
      nodes.push(sprite);
      // All poses end while the ordinary damage number is still on screen.
      // No animation created here participates in the game's input lock.
      const duration = contact + (light ? 240 : 365);
      const frames = framesFor(clip, pose, range, contact, duration);
      track(sprite, frames.body, delay, duration);
      track(atlas, frames.atlas, delay, duration);
      track(portrait, [{ visibility: 'hidden' }, { visibility: 'hidden' }], delay, duration);
    }

    function fire(clip, pose, range, target, event, delay, flight, sourceWidth) {
      const shot = clip.projectile;
      const fit = fitFrame(clip, pose, range, clip.contactFrame);
      const feet = clip.reference.y + clip.reference.h;
      const start = {
        x: pose.left + fit.shift + (pose.flip ? clip.frameWidth - shot.x : shot.x) * fit.scale,
        y: pose.top + feet * pose.scale + (shot.y - feet) * fit.scale
      };
      const dx = target.x - start.x, dy = target.y - start.y;
      const lift = Math.min(Math.abs(dx) * .13, bounds.height * .19, Math.max(0, Math.min(start.y, target.y) - bounds.top - 8));
      const carrier = document.createElement('span');
      carrier.className = 'enemy-projectile ' + (shot.kind === 'nut' ? 'is-nut' : 'is-magic') + (shot.src ? ' has-art' : '');
      carrier.dataset.source = event.source;
      carrier.dataset.target = event.target;
      const width = Math.max(12, Math.min(56, bounds.width * .052, sourceWidth * .38));
      carrier.style.left = (start.x - bounds.left) + 'px';
      carrier.style.top = (start.y - bounds.top) + 'px';
      carrier.style.width = width + 'px';
      if (shot.src) carrier.style.setProperty('--shot-art', 'url("' + shot.src + '")');
      layer.appendChild(carrier);
      nodes.push(carrier);
      // A parabolic path ends on the actual recipient (including redirected
      // hits). Each registered shot belongs to exactly one engine hit record.
      const frames = [];
      for (let step = 0; step <= 10; step++) {
        const t = step / 10;
        const y = dy * t - 4 * lift * t * (1 - t);
        const tilt = Math.atan2((dy - 4 * lift * (1 - 2 * t)) * Math.sign(dx), Math.abs(dx)) * 180 / Math.PI;
        frames.push({ offset: t, opacity: 1, transform: 'translate(calc(-50% + ' + dx * t + 'px),calc(-50% + ' + y + 'px)) rotate(' + tilt + 'deg)' });
      }
      track(carrier, frames, delay, flight);
    }

    function cue(event, sourceArt, origin, target, delay, impactAt) {
      if (event.type !== 'hit' || event.sourceKind !== 'enemy' || !sourceArt) return null;
      const portrait = sourceArt.querySelector('.enemy-portrait');
      if (!portrait || typeof portrait.animate !== 'function' || !portrait.naturalWidth) return null;
      const name = (portrait.getAttribute('src') || '').split('/').pop().split('?')[0];
      const clip = assets.byArt[name];
      if (!clip) return null;
      if (!preloader.getReadyImage(clip.src) || (clip.projectile?.src && !preloader.getReadyImage(clip.projectile.src))) {
        // A player may have skipped home loading, or resumed an older battle.
        // Never wait for a request during an action. Queue a later attempt.
        preloader.prepare([clip.src, clip.projectile?.src].filter(Boolean), { priority: true });
        return null;
      }
      const box = sourceArt.getBoundingClientRect();
      const narrow = bounds.width < 600;
      const range = narrow ? {left:Math.max(bounds.left+2,box.left),right:Math.min(bounds.left+bounds.width-2,box.left+box.width)}
        : {left:bounds.left+2,right:bounds.left+bounds.width-2};
      if (box.width <= 0 || box.height <= 0 || range.right <= range.left) return null;
      const flip = narrow && target.x > origin.x + origin.width * .14;
      const pose = activeBodies.get(portrait) || placement(origin, clip, flip);
      const lead = impactAt - delay;
      const contact = clip.projectile ? Math.round(lead * .43) : lead;
      if (!activeBodies.has(portrait)) {
        // Fit once for the widest real pose. Per-frame shrinking makes an
        // enemy pulse in size while its arm crosses the edge of a phone.
        const widest = clip.inkX ? Math.max(...clip.inkX.map(([l, r]) => r - l)) : clip.frameWidth;
        pose.shrink = Math.min(1, (range.right - range.left) / Math.max(1, widest * pose.scale));
        activeBodies.set(portrait,pose);
        body(clip, pose, range, portrait, sourceArt, event, delay, contact);
      }
      if (clip.projectile) fire(clip, pose, range, target, event, delay + contact, lead - contact, origin.width);
      return { projectile: !!clip.projectile };
    }

    function cancel() {
      animations.forEach(animation => animation.cancel());
      nodes.forEach(node => node.remove());
    }
    return { cue, cancel };
  }
  return { create };
});
