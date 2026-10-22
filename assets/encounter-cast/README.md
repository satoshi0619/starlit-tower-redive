# 高塔出场人物素材

本目录提供三幕首领的“高塔幻影”形象、花凛补给员，以及六名玩家角色的方形归属头像。高塔身份、战斗对应关系、中文标题与短对白都是本作设计，不表示《公主连结！Re:Dive》的原作剧情。未修改战斗数值、`content.js`、界面代码或样式。

## 直接接入

加载 `assets/encounter-cast/manifest.js`，浏览器获得 `window.TowerEncounterCast`；CommonJS 可 `require()` 同一文件。JSON 完整版为 `manifest.json`。

```js
const cast = TowerEncounterCast.bosses[encounter.id];
const art = cast?.art;                    // 仓库根目录相对路径
const name = `${cast.role} · ${cast.displayName}`;
const sample = cast?.voice?.path;         // 官方角色样音，见下文
const merchant = TowerEncounterCast.merchant;
const ownerIcon = TowerEncounterCast.avatars[hero.id]?.icon;
```

| 本作映射 | 原作人物 | 完整立绘 | 来源 |
| --- | --- | --- | --- |
| `forest_boss` / `seal_knight` | 克莉丝提娜 / クリスティーナ | `christina-full.svg` | 官方游戏角色页的 `image_astrum` 原 PNG |
| `ruins_boss` / `echo_master` | 似似花 / ネネカ | `neneka-full.svg` | 官方游戏角色页的 `image_astrum` 原 PNG |
| `summit_boss` / `tower_crown` | 霸瞳皇帝 / 覇瞳皇帝（カイザーインサイト） | `kaiser-insight-full.svg` | 本地已有 Fandom 原作透明图收藏 |
| `merchant` | 花凛 / カリン | `karin-full.svg` | 本地已有 Fandom 原作透明图收藏 |

上述中文显示名沿用本项目称呼；`originalName` 保存核实过的日文原名。`bosses` 按遭遇 ID、`enemies` 按敌人 ID 提供同一形象，方便已有存档继续使用；映射不会改变敌人的玩法身份。

四张全身 SVG 均内嵌完整原始 PNG 字节，`viewBox` 只排除最外围 alpha 为 0 的空白，保留头发、武器、双腿和鞋。没有补画、AI 重绘、抠白背景或拉伸重建。原 PNG 同时保存在目录根部。

## 来源核实

- 官方游戏角色入口：[公主连结 Re:Dive 角色](https://priconne-redive.jp/character/)。本次检查了站点自身公开角色页使用的 `image_astrum`、`image_panel_astrum`、`voice` 字段。原始角色记录保存在 `sources/official-character-records.json`，其中只有选定的公开媒体 URL、名称、配色和尺寸，不保存站点浏览器配置值。
- 克莉丝提娜：[官方角色页](https://priconne-redive.jp/character/christina/)。原图 `whole_christina.png` 为 2288 × 2696，实际非透明区域 869 × 2044。
- 似似花：[官方角色页](https://priconne-redive.jp/character/neneka/)。原图 `whole_neneka.png` 为 2288 × 2696，实际非透明区域 1248 × 1748。
- 花凛：[官方角色页](https://priconne-redive.jp/character/karin/)。立绘优先复用本地 `priconne_standing_pngs/Karin -- Karin (game).png`，269 × 535，来自 [Fandom 的原 PNG](https://static.wikia.nocookie.net/princess-connect/images/3/35/Karin_%28game%29.png/revision/latest?cb=20180219093232)；身份与官方样音由角色页核实。Fandom 是社区镜像，不能称作官方分发地址。
- 霸瞳皇帝：[官方角色页](https://priconne-redive.jp/character/omniscientkaiser/)及[官方游戏登场公告](https://dmg.priconne-redive.jp/news/detail.php?id=20164)。立绘优先复用本地 `priconne_standing_pngs/Kaiser Insight -- Kaiser Insight (game).png`，430 × 680，来自 [Fandom 的原 PNG](https://static.wikia.nocookie.net/princess-connect/images/0/0d/Kaiser_Insight_%28game%29.png/revision/latest?cb=20180314164523)。

本地原有克莉丝提娜、似似花 `*-astrum-sprite-normal.png` 剧情图缺少小腿/脚部，已实际查看并排除出本目录出场立绘；没有将它们放大冒充全身。

`sources/download-receipts.json` 记录实际下载 URL、HTTP 状态、文件大小、SHA-256；本地复用文件同时记录原路径。原图与原声权利归 Cygames 所有（© Cygames, Inc.）；官方发布或社区可下载仅说明出处，不等于取得重新发布或商用许可。

## 原声与本作对白的边界

四段 MP3 是上述四个官方游戏角色页直接播放的 **角色示范样音**，分别为 6.841、11.964、6.732、5.510 秒。`voice.kind` 为 `official_character_sample`，可以作为本作入场样音使用；不应标为 UB 或战斗原声。

角色与文件的官方关联已核对，HTTP 200、文件大小和 SHA-256 已记录，FFprobe 编码检查与 FFmpeg 整文件解码均通过。尚未逐句听写或连续人工听验，`humanListening: false`、`transcript: null`。清单的 `entryLine` 是本作自写对白，**不能把它当成 MP3 的原文/翻译字幕**。没有生成或克隆任何声音，也没有挪用六名玩家角色的 UB 语音。

## 六人方形头像

`avatars/{pecorine,rei,kokkoro,kyaru,hatsune,yui}.svg` 用于卡牌归属图标。每个 SVG 内嵌官方角色页 `image_panel_astrum` 的原始 PNG，通过已登记的方形 `viewBox` 显示头部；没有把全卡画面缩成头像，没有改动源像素。原始面板图与裁切框分别保存在 `sources/panel-*.png` 和 manifest 中。

角色资源 ID 已与当前 `assets/media/manifest.json` 核对：佩可 105801、怜 100301、可可萝 105901、凯露 106001、初音 101201、优衣 100201。官方站的 `karyl` 对应本项目 `kyaru`，清单已处理这个名字差异。

## 已完成的验证

- 实际像素与 alpha 范围扫描；四张全身图均保留透明背景，实际看图确认完整身体与脚部。
- 四段官方样音的编解码与整段解码。
- 六张自包含 SVG 方头像实际渲染，并查看 `qa/avatar-contact.png`；四张立绘查看 `qa/full-body-contact.png`。
- `manifest.js` 在 CommonJS 和无模块浏览器全局环境均可加载，18 个使用路径均存在。

本目录检查不等于主游戏界面的集成验收，也不包含对样音说话内容的人工审核。

## 再生成

`prepare-assets.cjs` 用官方站当前公开数据下载指定媒体，复用两张本地全身图，保存来源回执。运行：`node --use-system-ca assets/encounter-cast/prepare-assets.cjs`。站点脚本结构变化时会报错停止，不会猜路径扫站或请求预览数据。

`build-manifest.cjs` 使用当前 Codex 工作区的 Sharp、FFprobe 和 FFmpeg 生成 SVG/清单/验证图。运行：`node assets/encounter-cast/build-manifest.cjs`。这些是本地准备脚本；游戏运行只需静态媒体与 manifest，不需要 Node 或图片处理依赖。
