# Original Princess Connect BGM

This directory contains nine original game BGM recordings in AAC/M4A, mapped to
sixteen scene keys. The existing generic MP3 music in the parent audio directory
has not been overwritten.

Load `manifest.js` as a normal script, then read:

```js
const track = window.TowerBgm.tracks[mode];
track.path;              // relative to game root
track.title;             // original Japanese title, or the exact victory cue
track.loop;              // false only for the victory jingle
track.loopStartSeconds;  // original source sample loop point / 48000
track.loopEndSeconds;    // original source sample loop point / 48000
track.source.acb.url;
track.source.awb.url;
track.cue;
track.sha256;
track.durationSeconds;
track.verified;
```

The available keys are `title`, `map`, `battle`, `elite`, `boss_act1`, `boss_act2`,
`boss_act3`, `boss`, `camp`, `rest`, `shop`, `event`, `chest`, `reward`, `victory`,
and `defeat`. `recordings` lists the nine unique files without repeated modes.

## Loop behavior

The files contain the original source waveform once, including its intro; loops
are not baked into several repetitions. The eight looping tracks have native HCA
loop points measured in samples. Keep the first playback at time 0, then jump from
the native loop end to native loop start for subsequent repeats. A plain HTML
`audio.loop=true` instead repeats the intro too. Browser `timeupdate` callbacks are
not sample-accurate, so native points are metadata for the player and do not alone
prove seamless audible looping. The victory jingle has `loop:false` and null
start/end points.

## Provenance

All ACB and AWB source files were downloaded from the original game's public
Cygames CDN, using version `10071200` of the official Sound resource manifest:

https://prd-priconne-redive.akamaized.net/dl/Resources/10071200/Jpn/Sound/manifest/soundmanifest

The manifest contains 1,200 BGM ACB/AWB pairs. Only these nine selected banks were
used. Every source matches its official expected byte length and MD5; actual
SHA-256 values and exact public asset URLs are recorded per file. AWB contains the
HCA waveform and the companion ACB gives exact cue names. The conversion selects
a concrete wave/subsong associated with the named cue; it does not simulate every
possible cue-event behavior of the full game audio engine.

Eight Japanese song titles were matched to musicbox rows in the existing original
game master database (`work/redive_jp.db`); the table name, database hash and exact
rows are retained in the manifest. Basic soundtrack titles were additionally
cross-checked against the publisher's official album listing:

https://columbia.jp/prod-info/COCX-40805-6/

The victory jingle is intentionally identified by `bgm_jingle_win_01`; no official
album title was guessed for that short recording. Scene assignment, including the
failure screen, is this fan-game's arrangement rather than a claim about which
scene originally used each piece.

The original game audio is owned by Cygames. These are not OpenGameArt substitutes,
covers, or generated music. The older generic sources are separately preserved in
`../CREDITS.md` under the legacy heading.

## Reproduce and verify

Use `tools/media/prepare_bgm.py`, which reuses the existing project-local FFmpeg,
ffprobe and vgmstream tools. Raw ACB/AWB, WAV intermediates and cue metadata are in
`work/media-research-2026-10-20/`; only this directory's browser assets need to be
packaged. Preparation resets browser verification, so run
`tools/media/verify_bgm.cjs` afterward.

`preview.html` is a standalone local audition page. Validation includes expected
source hash matching, exact cue matching, ffprobe duration and codec inspection,
full FFmpeg decode, and actual full browser playback in headless Edge at 16x,
muted. Muted QA does not establish human listening, subjective scene fit, or
seamless loop transitions; those distinctions remain in `verified`.
