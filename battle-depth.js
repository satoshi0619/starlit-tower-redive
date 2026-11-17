(function (root, factory) {
  'use strict';
  const camera = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = camera;
  if (root) root.TowerBattleDepth = camera;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  const arenas = new WeakMap();
  const reducedMotion = root.matchMedia?.('(prefers-reduced-motion: reduce)');
  const supportEvents = new Set(['block', 'heal', 'cleanse']);
  const powers = { support: .23, attack: .45, heavy: .76, phase: 1 };
  const clamp = value => Math.max(-1, Math.min(1, value));

  function setOffset(arena, name, x, y) {
    arena.style.setProperty(`--depth-${name}x`, `${x.toFixed(2)}px`);
    arena.style.setProperty(`--depth-${name}y`, `${y.toFixed(2)}px`);
  }

  function clearAction(arena, state) {
    root.clearTimeout(state.release);
    root.clearTimeout(state.finish);
    state.action = '';
    setOffset(arena, 'focus-', 0, 0);
    arena.style.setProperty('--depth-push', '0');
    delete arena.dataset.depthAction;
  }

  function canMove(arena, state) {
    return arena.isConnected !== false && state.quality !== 'light' && !reducedMotion?.matches;
  }

  function bind(arena, quality) {
    if (!arena?.addEventListener || !arena.style?.setProperty || !arena.dataset) return;
    const existing = arenas.get(arena);
    if (existing) {
      existing.quality = quality;
      if (!canMove(arena, existing)) clear(arena);
      return;
    }

    const state = { quality, action: '', lastImpact: -Infinity, release: 0, finish: 0 };
    arenas.set(arena, state);
    arena.addEventListener('pointermove', event => {
      if (!canMove(arena, state) || event.pointerType !== 'mouse') return;
      const rect = arena.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = clamp(2 * (event.clientX - rect.left) / rect.width - 1);
      const y = clamp(2 * (event.clientY - rect.top) / rect.height - 1);
      setOffset(arena, '', x * 14, y * 8);
    }, { passive: true });
    arena.addEventListener('pointerleave', () => setOffset(arena, '', 0, 0));
  }

  function clear(arena) {
    const state = arenas.get(arena);
    if (!state) return;
    setOffset(arena, '', 0, 0);
    clearAction(arena, state);
  }

  function pulse(arena, state, action, x, y) {
    clearAction(arena, state);
    state.action = action;
    arena.dataset.depthAction = action;
    setOffset(arena, 'focus-', x, y);
    arena.style.setProperty('--depth-push', String(powers[action]));

    state.release = root.setTimeout(() => {
      if (arena.isConnected === false) return;
      delete arena.dataset.depthAction;
      setOffset(arena, 'focus-', 0, 0);
      arena.style.setProperty('--depth-push', '0');
    }, action === 'phase' ? 230 : 95);
    state.finish = root.setTimeout(() => {
      if (arena.isConnected !== false) clearAction(arena, state);
    }, action === 'phase' ? 520 : 345);
  }

  function impact(arena, event) {
    const state = arenas.get(arena);
    if (!state || !event?.target || !canMove(arena, state)) return;
    const hit = event.type === 'hit';
    if (!hit && !supportEvents.has(event.type)) return;

    const heavy = event.bossImpact || event.burst || !!event.bossStyle && event.raw >= 8;
    const action = hit ? (heavy ? 'heavy' : 'attack') : 'support';
    const now = root.performance.now();
    // Coalesce simultaneous waves. A queue of minor effects should never
    // pull the scenery away from a phase reveal or a heavier strike.
    if (state.action === 'phase' || (now - state.lastImpact < 90 && powers[state.action] >= powers[action])) return;

    const target = Array.from(arena.querySelectorAll('.fighter[data-id]'))
      .find(fighter => fighter.dataset.id === String(event.target));
    if (!target) return;
    const frame = arena.getBoundingClientRect(), rect = target.getBoundingClientRect();
    if (!frame.width || !frame.height) return;
    const x = clamp(2 * (rect.left + rect.width / 2 - frame.left) / frame.width - 1);
    const y = clamp(2 * (rect.top + rect.height / 2 - frame.top) / frame.height - 1);
    const distance = frame.width < 600 ? .55 : 1;
    state.lastImpact = now;
    pulse(arena, state, action, -x * 10 * distance * powers[action], -y * 5 * distance * powers[action]);
  }

  function phase(arena) {
    const state = arenas.get(arena);
    if (state && canMove(arena, state)) pulse(arena, state, 'phase', 0, 4);
  }

  return { bind, impact, phase, clear };
});
