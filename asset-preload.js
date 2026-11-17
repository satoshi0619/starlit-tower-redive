(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && typeof root.Image === 'function') root.TowerAssetPreload = api.create(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create(host, { limit = 4, timeout = 12000 } = {}) {
    const jobs = new Map();
    const pending = [];
    let active = 0;

    function start(job) {
      active++;
      job.started = true;
      const image = new host.Image();
      let finished = false;
      const deadline = host.setTimeout(() => finish(false, true), timeout);
      function finish(ok, abort = false) {
        if (finished) return;
        finished = true;
        host.clearTimeout(deadline);
        image.onload = image.onerror = null;
        if (abort) image.removeAttribute('src');
        if (ok) job.image = image;
        else jobs.delete(job.path);
        job.resolve(ok);
        active--;
        pump();
      }
      image.onload = () => {
        if (typeof image.decode !== 'function') { finish(true); return; }
        image.decode().then(() => finish(true), () => finish(false));
      };
      image.onerror = () => finish(false);
      image.src = job.path;
    }

    function pump() {
      while (active < limit && pending.length) start(pending.shift());
    }

    function prepare(paths, { priority = false, onProgress } = {}) {
      const unique = Array.from(new Set(paths.filter(Boolean)));
      const selected = unique.map(path => {
        if (jobs.has(path)) return jobs.get(path);
        const job = { path, started: false };
        job.done = new Promise(resolve => { job.resolve = resolve; });
        jobs.set(path, job);
        pending.push(job);
        return job;
      });
      if (priority) {
        const promoted = selected.filter(job => !job.started);
        const rest = pending.filter(job => !promoted.includes(job));
        pending.splice(0, pending.length, ...promoted, ...rest);
      }
      const state = { total: selected.length, settled: 0, failed: 0 };
      const notify = () => onProgress?.({ ...state });
      notify();
      const done = Promise.all(selected.map(job => job.done.then(ok => {
        state.settled++;
        if (!ok) state.failed++;
        notify();
      }))).then(() => ({ ...state }));
      pump();
      return done;
    }

    return { prepare };
  }

  return { create };
});
