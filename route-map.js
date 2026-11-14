(() => {
  'use strict';

  const roomTypes = {
    battle: { label: '普通战', icon: '<path d="m5 19 3-3m0 0 9-11 3-1-1 3-11 9m-2-2 4 4"/><path d="m19 19-3-3m-2-2L5 5 3 4l1 3 8 8m6-1-4 4"/>' },
    elite: { label: '精英战', icon: '<path d="m12 3 7 3v5c0 4-2.7 7.5-7 10-4.3-2.5-7-6-7-10V6l7-3Z"/><path d="m12 7 1.4 3.1 3.4.4-2.5 2.2.7 3.4-3-1.7-3 1.7.7-3.4-2.5-2.2 3.4-.4L12 7Z"/>' },
    boss: { label: 'Boss', icon: '<path d="m4 7 4.5 3.5L12 4l3.5 6.5L20 7l-2 10H6L4 7Zm2 13h12"/><path d="M12 11v3"/>' },
    event: { label: '奇遇', icon: '<path d="M12 3c1.3 5.5 3.5 7.7 9 9-5.5 1.3-7.7 3.5-9 9-1.3-5.5-3.5-7.7-9-9 5.5-1.3 7.7-3.5 9-9Z"/>' },
    camp: { label: '营地', icon: '<path d="m4 19 8-15 8 15H4Zm4 0 4-8 4 8M12 4l2-2"/>' },
    shop: { label: '商店', icon: '<path d="M4 9h16l-2-5H6L4 9Zm1 2v9h14v-9m-9 9v-5h4v5M4 9c0 2 3 3 4 0 1 3 4 3 4 0 1 3 4 3 4 0 1 3 4 2 4 0"/>' },
    pass: { label: '通行', icon: '<path d="M12 20V4m-6 6 6-6 6 6"/>' }
  };
  const stateLabels = {
    current: '当前位置', reachable: '可前往', visited: '已走过', future: '后续可达', closed: '本次无法到达'
  };
  const floorHeight = 100;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function icon(type) {
    return `<span class="route-emblem" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false">${roomTypes[type].icon}</svg></span>`;
  }

  function nodeState(id, view, reachable, visited, future) {
    if (reachable.has(id)) return 'reachable';
    if (id === view.currentId) return 'current';
    if (visited.has(id)) return 'visited';
    return future.has(id) ? 'future' : 'closed';
  }

  function renderNode(entry) {
    const { node, lane, state } = entry;
    const type = Object.hasOwn(roomTypes, node.type) ? node.type : 'pass';
    const kind = roomTypes[type].label;
    const description = node.text ? `。${node.text}` : '';
    const name = node.name || kind;
    const label = escapeHtml(type === 'boss' ? `${name}，${stateLabels[state]}` : `${kind}，${name}，${stateLabels[state]}`);
    const rewards = node.rewardText ? `。${node.rewardText}` : '';
    const title = escapeHtml(`${stateLabels[state]} · ${type === 'boss' ? name : `${kind} · ${name}`}${description}${rewards}`);
    const attrs = `class="route-node is-${state}" style="--route-lane:${lane + 1}" data-node-id="${escapeHtml(node.id)}" data-route-state="${state}" data-route-type="${type}" title="${title}"`;
    const status = state === 'current' ? '当前' : state === 'visited' ? '✓' : state === 'reachable' ? '↑' : '';
    const caption = type === 'boss' ? '幕末 Boss' : kind;
    const body = `${icon(type)}<span class="route-node__label">${escapeHtml(caption)}</span>${status ? `<span class="route-node__status" aria-hidden="true">${status}</span>` : ''}`;

    if (state === 'reachable' || state === 'future') {
      const action = state === 'reachable' ? 'enter-room' : 'route-info';
      return `<button type="button" ${attrs} aria-label="${label}" data-action="${action}" data-id="${escapeHtml(node.id)}">${body}</button>`;
    }
    return `<div ${attrs} aria-label="${label}"${state === 'current' ? ' aria-current="step"' : ''}>${body}</div>`;
  }

  function edge(from, to, state) {
    const midY = (from.y + to.y) / 2;
    const path = `M${from.x} ${from.y}C${from.x} ${midY} ${to.x} ${midY} ${to.x} ${to.y}`;
    return { state, markup: `<path class="route-edge is-${state}" d="${path}" vector-effect="non-scaling-stroke"/>` };
  }

  function render(view) {
    if (!view || !view.rows?.length) return '';

    const rows = view.rows.slice().sort((a, b) => a.index - b.index);
    const reachable = new Set(view.reachable || []);
    const visited = new Set(view.visited || []);
    const future = new Set(reachable);
    const entries = new Map();

    // The graph's edges always lead to a later floor. This pass shades out
    // routes severed by an earlier choice while keeping their labels legible.
    rows.forEach((row, rowIndex) => {
      for (const node of row.nodes) {
        const lane = Number.isInteger(node.lane) && node.lane >= 0 && node.lane < 3 ? node.lane : 1;
        if (future.has(node.id)) {
          for (const target of node.next || []) future.add(target);
        }
        entries.set(node.id, {
          node,
          lane,
          state: nodeState(node.id, view, reachable, visited, future),
          x: lane * 200 + 100,
          y: (rows.length - rowIndex - .5) * floorHeight
        });
      }
    });

    const edges = [];
    for (const entry of entries.values()) {
      for (const target of entry.node.next || []) {
        const next = entries.get(target);
        if (!next) continue;
        let state = 'future';
        if (entry.state === 'current' && next.state === 'reachable') state = 'reachable';
        else if (visited.has(entry.node.id) && visited.has(target)) state = 'visited';
        else if (entry.state === 'closed' || next.state === 'closed') state = 'closed';
        edges.push(edge(entry, next, state));
      }
    }

    const entrance = { x: 300, y: rows.length * floorHeight };
    for (const node of rows[0].nodes) {
      const target = entries.get(node.id);
      const state = target.state === 'current' ? 'visited' : target.state;
      edges.push(edge(entrance, target, state));
    }

    const priority = { closed: 0, future: 1, visited: 2, reachable: 3 };
    const pathMarkup = edges.sort((a, b) => priority[a.state] - priority[b.state]).map(item => item.markup).join('');
    const floorMarkup = rows.map((row, index) => `<div class="route-plot__floor" data-route-floor="${escapeHtml(row.index)}" style="--route-row:${rows.length - index}">${row.nodes.map(node => renderNode(entries.get(node.id))).join('')}</div>`).join('');
    const legend = ['battle', 'elite', 'boss', 'event', 'camp', 'shop'].map(type => `<span class="route-key" data-route-type="${type}">${icon(type)}${roomTypes[type].label}</span>`).join('');

    return `<section class="route-atlas" aria-label="星愿之路分支地图">
      <header class="route-atlas__head"><h3>星愿之路</h3><p class="route-atlas__hint">从下往上 · 亮起即可前往</p></header>
      <div class="route-atlas__legend" aria-label="房间图例">${legend}</div>
      <div class="route-plot" style="--route-count:${rows.length}">
        <svg class="route-plot__lines" viewBox="0 0 600 ${rows.length * floorHeight}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${pathMarkup}</svg>
        ${floorMarkup}
      </div>
      <div class="route-atlas__entry"><span aria-hidden="true">✦</span> 登塔入口</div>
    </section>`;
  }

  const api = Object.freeze({ render });
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.TowerRouteMap = api;
})();
