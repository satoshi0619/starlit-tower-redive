# 原作魔物与Boss素材

此目录使用《Princess Connect! Re:Dive》原作Spine模型，来源为wthee公开社区镜像，非Cygames官方分发端点。原美术、贴图及动画归Cygames所有。游戏只加载离线导出的12张完整透明PNG，不加载转换器或第三方运行时代码。

模型、战斗动画、atlas、贴图URL与SHA-256、原作ID、输出尺寸及透明像素检查记录在manifest.json；manifest.js提供TowerEnemyMedia.enemies，对应现有25个玩法敌人ID。玩法机制是本作设计，不声称复刻原作怪物数值。

普通魔物：Goblin Guard、Kobold、Gellatina、Wood Soul、Golem、Blue Golem、Fire Mage、Werewolf、Flaming Skulls。Boss分别使用Lizardman（300500）、Sea Drake（301000）、Orc Leader（300700）。中文显示采用图鉴/社区索引名称的简体表述，不标为官方简中译名。

导出使用原作idle姿势（无idle时使用attack），保存完整模型与透明边距。没有把贴图碎片或裁切头像当作完整魔物，没有AI补画身体。sources目录保留离线转换需要的原始组件、工具与许可。

来源：[原作模型镜像](https://wthee.xyz/spine/index.html)、[普通魔物名称参考](https://princess-connect.fandom.com/wiki/Common_Enemies)、[Boss名称参考](https://princess-connect.fandom.com/wiki/Boss_Enemies)。复现脚本为项目tools/fetch-enemy-sprites.cjs。
