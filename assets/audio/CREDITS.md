# Audio Credits

## Original Princess Connect BGM — preferred in the remake

Nine original game recordings are stored in `assets/audio/priconne/`. They were
downloaded as matching ACB metadata and AWB sound banks from Cygames' public game
resource CDN, verified against resource-manifest version `10071200` by file size
and MD5, decoded by exact cue/subsong, and converted to browser-playable AAC/M4A.
The owner of the original game audio is Cygames.

The per-recording URLs, ACB/AWB hashes, exact cues, output SHA-256, measured
durations, source loop points, and actual verification states are in
`priconne/manifest.json`; `priconne/manifest.js` exposes the same data as
`window.TowerBgm`. The chosen scene mapping is for this fan-game and does not claim
that each song originally played in the same type of scene.

| Remake scene | Original title / internal cue | Recording |
|---|---|---|
| Title / map | 旅の始まり — `bgm_M61_juke` | `priconne/bgm_M61.m4a` |
| Ordinary battle | プリンセス・ファイト☆ — `bgm_M06` | `priconne/bgm_M06.m4a` |
| Elite battle | メサルティム — `bgm_M90` | `priconne/bgm_M90.m4a` |
| Act 1 boss | 魔物が！！ — `bgm_M17_02` | `priconne/bgm_M17.m4a` |
| Act 2 boss | 覇瞳皇帝 — `bgm_M49` | `priconne/bgm_M49.m4a` |
| Act 3 boss / boss fallback | 覇瞳皇帝' — `bgm_MC283` | `priconne/bgm_MC283.m4a` |
| Camp / rest / shop / event / chest / card rewards | 思い出の足跡 — `bgm_M333` | `priconne/bgm_M333.m4a` |
| Victory | Exact internal victory-jingle cue `bgm_jingle_win_01` | `priconne/bgm_jingle_win_01.m4a` |
| Defeat | 不穏な空気と立ち向かう闘志 — `bgm_M42_juke` | `priconne/bgm_M42.m4a` |

Title-to-bank mappings were read from the original game's musicbox rows in the
existing local master database; base soundtrack titles were cross-checked with
the publisher's [official soundtrack tracklist](https://columbia.jp/prod-info/COCX-40805-6/).
The victory jingle deliberately retains its internal cue name, without guessing
which named CD track it corresponds to. No music from uploads, fan covers, or AI
generation was substituted for these nine originals.

## Legacy BGM — preserved, not the preferred remake music

The older files below remain intact for provenance and backward compatibility.
They are general-purpose OpenGameArt tracks, not Princess Connect originals.

- `map.mp3`, `title.mp3`, `event.mp3`, `shop.mp3`, `rest.mp3`, `chest.mp3`, `reward.mp3`, `victory.mp3`: "Medieval: The Old Tower Inn" from OpenGameArt. Source: https://opengameart.org/content/medieval-the-old-tower-inn
- `battle.mp3`: "JRPG Epic Rock Battle Theme #1" from OpenGameArt. Source: https://opengameart.org/content/jrpg-epic-rock-battle-theme-1
- `elite.mp3`: "JRPG Epic Rock Battle Theme #1" full version from OpenGameArt. Source: https://opengameart.org/content/jrpg-epic-rock-battle-theme-1
- `boss.mp3`, `boss_act1.mp3`: "Fantastic Japanese-Style Shoot 'em up Game Music" / SOUND AIRYLUVS by ISAo from OpenGameArt. Source: https://opengameart.org/content/fantastic-japanese-style-shoot-em-up-game-music
- `boss_act2.mp3`: "Fantastic Battle Music, Piano, Electronic" by ISAo from OpenGameArt. Source: https://opengameart.org/content/fantastic-battle-music-piano-electronic
- `boss_act3.mp3`, `defeat.mp3`: "Boss Battle - Emotional Uplifting Metal Rock" by ISAo from OpenGameArt. Source: https://opengameart.org/content/boss-battle-emotional-uplifting-metal-rock

## SFX

- `sfx/*.ogg`: selected files from "80 CC0 RPG SFX" by rubberduck from OpenGameArt.
- `card_sfx/slash.ogg`, `heal.ogg`, `shield.ogg`, `support.ogg`, `combo.ogg`: selected files from "80 CC0 RPG SFX" by rubberduck from OpenGameArt. Source: https://opengameart.org/content/80-cc0-rpg-sfx
- `card_sfx/magic.ogg`, `debuff.ogg`, `burst_ready.ogg`, `burst_cast.ogg`: selected files from "Magic Spell SFX" from OpenGameArt. Source: https://opengameart.org/content/magic-spell-sfx

## Voice

- The remake's actual original character voices are in `assets/media/{heroId}/ub.m4a`
  and `assets/media/{heroId}/cutin.m4a`, for Pecorine, Kokkoro, Kyaru, Rei, Hatsune,
  and Yui. All twelve files were decoded from official character ACB banks with
  exact `vo_btl_{unitId}_ub_100` / `vo_btl_{unitId}_cutin_001` cue matching.
- Detailed public source URLs, original bank hashes, output hashes, durations and
  playback states are in `assets/media/manifest.json`; the browser script is
  `assets/media/manifest.js` (`window.TowerMedia`). Silent original cut-in MP4s and
  posters are in the same character directories.
- The old `voice/{heroId}_burst.ogg` naming convention is a legacy optional interface;
  it is not where the remake's currently prepared original voices are stored.
- Japanese word-for-word transcripts and audiovisual synchronization have not
  been human-reviewed. No guessed dialogue subtitles are supplied.

The SFX credited above remain generic OpenGameArt effects and are not represented
as original Princess Connect character audio. Source ownership and terms remain
those of the respective original providers.
