(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TowerPresentation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  // A reused video element must never retain another presentation's listeners.
  var owners = new WeakMap();
  function clampVolume(value) {
    value = Number(value);
    return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
  }
  function play(options) {
    options = options || {};
    var video = options.video || null;
    if (video && owners.has(video)) owners.get(video).cancel();
    var paths = Array.isArray(options.audioPaths) ? options.audioPaths.slice() : options.audioPaths ? [options.audioPaths] : [];
    var tracks = [], audioTracks = [], audioIndex = -1, videoDone = !options.fullVideo, audioDone = paths.length === 0;
    var videoNotified = false;
    var complete = false, reason = null, errors = [], phase = 'loading';
    var muted = !!options.muted, volume = clampVolume(options.volume === undefined ? 1 : options.volume);
    var videoMuted = options.videoMuted !== false;
    var controller;
    function callback(name, value) {
      if (typeof options[name] !== 'function') return;
      // A UI callback must not strand media or prevent the remaining cleanup.
      try { options[name](value); } catch (error) {
        errors.push('界面回调 ' + name + ' 失败：' + (error && error.message || String(error)));
      }
    }
    function snapshot(extra) {
      return Object.assign({ phase: phase, videoDone: videoDone, audioDone: audioDone, audioIndex: audioIndex,
        audioCount: paths.length, completed: complete, reason: reason, muted: muted, volume: volume, errors: errors.slice() }, extra || {});
    }
    function state(next, track, message) {
      phase = next;
      callback('onState', snapshot({ kind: track ? track.kind : null, index: track ? track.index : null,
        path: track ? track.path : null, message: message || '' }));
    }
    function notifyVideo(track, failed) {
      if (videoNotified || complete) return;
      videoNotified = true;
      callback('onVideoComplete', snapshot({ kind: 'video', failed: !!failed, path: track ? track.path : null }));
    }
    function detach(track) {
      if (!track.media) return;
      track.listeners.forEach(function (entry) { track.media.removeEventListener(entry[0], entry[1]); });
      track.listeners.length = 0;
    }
    function pause(track) {
      if (track.media && typeof track.media.pause === 'function') {
        try { track.media.pause(); } catch (_) { /* Cleanup must finish even for a detached element. */ }
      }
    }
    function finish(why) {
      if (complete) return;
      complete = true; reason = why; phase = 'complete';
      tracks.forEach(detach);
      if (why === 'skipped' || why === 'cancelled') tracks.forEach(function (track) { if (!track.done) pause(track); track.done = true; });
      if (video && owners.get(video) === controller) owners.delete(video);
      state('complete', null, why === 'error' ? '部分演出资源播放失败。' : '');
      callback('onComplete', why);
    }
    function maybeFinish() { if (!complete && videoDone && audioDone) finish(errors.length ? 'error' : 'ended'); }
    function errorMessage(track, error) {
      var label = track.kind === 'video' ? '视频' : '语音' + (track.index + 1);
      var message = error && error.message || '';
      if (error && error.name === 'NotAllowedError') message = '浏览器阻止了播放，请允许媒体播放后重试，或手动跳过';
      else if (!message && error && error.code) message = { 1: '加载被中止', 2: '网络或文件读取失败', 3: '媒体解码失败', 4: '文件缺失或格式不受支持' }[error.code] || '媒体读取失败';
      return label + '播放失败（' + (track.path || '未提供资源地址') + '）：' + (message || '文件不可用或播放请求被拒绝');
    }
    function settle(track, failed, error) {
      if (complete || track.done) return;
      track.done = true; detach(track);
      // Report visual completion before callbacks. The caller can return to the
      // battlefield while the remaining voice continues naturally in this player.
      if (track.kind === 'video') videoDone = true;
      if (failed) {
        pause(track); var message = errorMessage(track, error); errors.push(message);
        callback('onError', message); state('track-error', track, message);
      } else state('track-ended', track);
      if (complete) return;
      if (track.kind === 'video') notifyVideo(track, failed);
      else {
        // Ended audio is already paused in browsers; pausing here also stops custom
        // media implementations before the next voice can start.
        if (!failed) pause(track);
        nextAudio();
      }
      maybeFinish();
    }
    function configure(track) {
      var media = track.media;
      media.loop = false; media.volume = volume;
      media.muted = track.kind === 'video' ? videoMuted || muted : muted;
    }
    function start(track) {
      if (complete) return;
      if (!tracks.includes(track)) tracks.push(track);
      track.started = true;
      if (!track.media || typeof track.media.addEventListener !== 'function' || typeof track.media.play !== 'function') {
        settle(track, true, track.prepareError || new Error('播放器不可用')); return;
      }
      function listen(name, fn) { track.media.addEventListener(name, fn); track.listeners.push([name, fn]); }
      listen('ended', function () { settle(track, false); });
      listen('error', function () { settle(track, true, track.media.error); });
      listen('playing', function () { if (!complete && !track.done) state('playing', track); });
      ['waiting', 'stalled'].forEach(function (name) {
        listen(name, function () {
          if (!complete && !track.done) state('waiting', track, '媒体仍在缓冲，可以继续等待或手动跳过。');
        });
      });
      state('loading', track);
      if (complete || track.done) return;
      if (typeof track.path !== 'string' || !track.path.trim()) {
        settle(track, true, new Error('未提供有效资源地址')); return;
      }
      try {
        configure(track);
        if (!track.prepared) track.media.src = track.path;
        if (complete || track.done) return;
        var request = track.media.play();
        if (request && typeof request.then === 'function') {
          request.then(function () {
            if (!complete && !track.done) state('playing', track);
          }, function (error) { settle(track, true, error); });
        }
      } catch (error) { settle(track, true, error); }
    }
    function nextAudio() {
      if (complete) return;
      audioIndex++;
      if (audioIndex >= paths.length) { audioDone = true; maybeFinish(); return; }
      start(audioTracks[audioIndex]);
    }
    function prepareAudio(path, index) {
      var media, prepareError;
      try {
        if (options.createAudio) media = options.createAudio(path, index);
        else if (root && typeof root.Audio === 'function') media = new root.Audio();
        else throw new Error('当前环境没有音频播放器');
      } catch (error) {
        prepareError = error;
      }
      var track = { kind: 'audio', index: index, path: path, media: media, done: false, listeners: [], prepareError: prepareError };
      tracks.push(track);
      // Fetch and decode the next clip before its turn. Loading is never playing:
      // the serial nextAudio() gate remains the only place that starts a voice.
      if (media && typeof path === 'string' && path.trim()) {
        try {
          media.preload = 'auto'; configure(track); media.src = path;
          if (typeof media.load === 'function') media.load();
          track.prepared = true;
        } catch (error) { track.prepareError = error; }
      }
      return track;
    }
    controller = {
      skip: function () { finish('skipped'); },
      cancel: function () { finish('cancelled'); },
      setMuted: function (value) {
        if (complete) return; muted = !!value;
        tracks.forEach(function (track) { if (!track.done && track.media) configure(track); });
        state('settings', null);
      },
      setVolume: function (value) {
        if (complete) return; volume = clampVolume(value);
        tracks.forEach(function (track) { if (!track.done && track.media) configure(track); });
        state('settings', null);
      },
      getState: function () { return snapshot(); }
    };
    if (video) owners.set(video, controller);
    audioTracks = paths.map(prepareAudio);
    if (options.fullVideo) start({ kind: 'video', index: 0, path: options.videoSrc, media: video, done: false, listeners: [] });
    if (!complete) {
      if (paths.length) nextAudio();
      if (!options.fullVideo && !complete) notifyVideo(null, false);
      maybeFinish();
    }
    return controller;
  }
  return { play: play };
});
