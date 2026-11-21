# 原作魔物与Boss素材

此目录使用《Princess Connect! Re:Dive》原作 Spine 模型，来源为 wthee 公开社区镜像。原美术、贴图及动画归 Cygames 所有。游戏读取离线导出的透明 PNG。

第一幕双射手使用原作「堅果射手」（203700）的待机姿势和投掷前一帧。同一模型的两张图分别对应两名敌人，原始组件来源、文件校验值与取帧时间见 [坚果射手素材记录](nut-shooter-source.json)。

v3.22 中，哥布林护卫、狗头人、史莱姆、树精、两种魔像、火炎法师、狼人、火焰骷髅、兽人首领和坚果射手出手时会使用各自的原作攻击动作。每个图集保存 16 帧，材质、骨骼与动作取自本目录原有的同一套模型。两名坚果射手共用图集，各自保留与原有立绘相符的对齐坐标。飞出的坚果和熔岩石分别取自原贴图的 `203700/weapo` 和 `202300/rock` 区域。游戏按实际攻击目标绘制飞行路线。

图集和出手位置见 [攻击动作清单](attacks/manifest.js)。源码树中的 `node tools/render-enemy-attacks.cjs` 使用本地原始文件重新生成它们。各帧使用同一投影和透明边距，清单中的 `reference` 与既有立绘的完整像素边界对齐。每种动作的命中帧经逐帧目视选定。人形守关者沿用角色立绘和各自的招式演出。

模型、战斗动画、atlas、贴图URL与SHA-256、原作ID、输出尺寸及透明像素检查记录在manifest.json；manifest.js提供TowerEnemyMedia.enemies，对应现有25个玩法敌人ID。玩法机制是本作设计，不声称复刻原作怪物数值。

普通魔物：Goblin Guard、Kobold、Gellatina、Wood Soul、Golem、Blue Golem、Fire Mage、Werewolf、Flaming Skulls。Boss分别使用Lizardman（300500）、Sea Drake（301000）、Orc Leader（300700）。中文显示采用图鉴/社区索引名称的简体表述，不标为官方简中译名。

导出使用原作idle姿势（无idle时使用attack），保存完整模型与透明边距。没有把贴图碎片或裁切头像当作完整魔物，没有AI补画身体。sources目录保留离线转换需要的原始组件、工具与许可。

来源：[原作模型镜像](https://wthee.xyz/spine/index.html)、[普通魔物名称参考](https://princess-connect.fandom.com/wiki/Common_Enemies)、[Boss名称参考](https://princess-connect.fandom.com/wiki/Boss_Enemies)。复现脚本为项目tools/fetch-enemy-sprites.cjs。
