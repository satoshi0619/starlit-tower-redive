(function (root, create) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = create;
  if (root) root.TowerMediaPreload = create(root);
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';

  const maxTotalBytes = 12 * 1024 * 1024;
  const maxClipBytes = 3 * 1024 * 1024;
  const retryDelay = 15000;
  const entries = new Map();
  const retryAfter = new Map();
  let wanted = new Set();
  let active = null;
  let totalBytes = 0;

  function canWarm() {
    const network = root.navigator?.connection;
    return /^https?:$/.test(root.location?.protocol || '') && root.navigator?.onLine !== false &&
      !network?.saveData && network?.effectiveType !== '2g' && network?.effectiveType !== 'slow-2g' &&
      typeof root.fetch === 'function' && typeof root.AbortController === 'function' &&
      typeof root.Blob === 'function' && typeof root.URL?.createObjectURL === 'function' &&
      typeof root.URL?.revokeObjectURL === 'function';
  }

  function key(path) {
    if (typeof path !== 'string' || !path) return null;
    try {
      const url = new root.URL(path, root.document?.baseURI || root.location.href);
      return url.origin === root.location.origin && /\.(mp4|webm|mp3|m4a|ogg)$/i.test(url.pathname) ? url.href : null;
    } catch (_) {
      return null;
    }
  }

  function prune() {
    for (const [path, entry] of entries) {
      if (entry.users || wanted.has(path)) continue;
      entries.delete(path);
      totalBytes -= entry.bytes;
      root.URL.revokeObjectURL(entry.url);
    }
  }

  async function load(job) {
    const signal = job.controller.signal;
    const response = await root.fetch(job.path, { signal, priority: 'low', mode: 'same-origin' });
    const available = () => Math.min(maxClipBytes, maxTotalBytes - totalBytes);
    const size = Number(response.headers.get('content-length'));
    if (response.status !== 200 || size > available()) {
      await response.body?.cancel();
      return null;
    }
    const reader = response.body?.getReader();
    if (!reader) {
      if (!size || size > available()) return null;
      return response.blob();
    }

    const chunks = [];
    let bytes = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > available()) {
          await reader.cancel();
          return null;
        }
        chunks.push(value);
      }
      if (bytes) return new root.Blob(chunks, { type: response.headers.get('content-type') || '' });
      return null;
    } finally {
      reader.releaseLock();
    }
  }

  function drain() {
    if (active || !canWarm() || totalBytes >= maxTotalBytes) return;
    const now = Date.now();
    const path = [...wanted].find(url => !entries.has(url) && !(retryAfter.get(url) > now));
    if (!path) return;
    const job = { path, controller: new root.AbortController() };
    active = job;
    const timeout = root.setTimeout(() => job.controller.abort(), 12000);
    load(job).then(blob => {
      if (job.controller.signal.aborted || !wanted.has(path)) return;
      if (!blob || !blob.size || blob.size > maxClipBytes || totalBytes + blob.size > maxTotalBytes) return;
      const url = root.URL.createObjectURL(blob);
      entries.set(path, { url, bytes: blob.size, users: 0 });
      totalBytes += blob.size;
    }).catch(() => {}).finally(() => {
      root.clearTimeout(timeout);
      if (!entries.has(path) && wanted.has(path) && !job.replaced) retryAfter.set(path, Date.now() + retryDelay);
      active = null;
      drain();
    });
  }

  function warm(paths) {
    wanted = canWarm() && Array.isArray(paths) ? new Set(paths.map(key).filter(Boolean)) : new Set();
    if (active && !wanted.has(active.path)) {
      active.replaced = true;
      active.controller.abort();
    }
    for (const path of retryAfter.keys()) if (!wanted.has(path)) retryAfter.delete(path);
    prune();
    drain();
  }

  function resolve(path) {
    return entries.get(key(path))?.url || path;
  }

  // Hold a snapshot while the presentation plays in case the queue is changed
  // by navigation or by another cut-in finishing first.
  function reserve(paths) {
    const leased = new Map();
    for (const path of paths || []) {
      const url = key(path), entry = entries.get(url);
      if (!entry || leased.has(url)) continue;
      entry.users++;
      leased.set(url, entry);
    }
    return {
      resolve(path) { return leased.get(key(path))?.url || path; },
      release() {
        for (const entry of leased.values()) entry.users--;
        leased.clear();
        prune();
        drain();
      }
    };
  }

  return { warm, resolve, reserve };
});
