/* The local game shell. All combat decisions go through TowerCombat;
 * the run, economy and rewards are owned by TowerRun. */
(() => {
  'use strict';
  const C = window.TowerContent, E = window.TowerCombat, R = window.TowerRun, T=window.TowerTutorial;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const SAVE = 'starlitTower.redesign.v2', SETTINGS = 'starlitTower.settings.v2', TUTORIAL_SEEN='starlitTower.tutorial.v2.2';
  const defaults = {audio:true,volume:.32,fullBurst:true};
  let settings = {...defaults}, run = null, screen = 'home', chosen = ['pecorine','rei','kokkoro'];
  let selected = null, spendBlock = 0, consumeCurse = true, hoverTarget = null, modalContext = null;
  let bgm = null, bgmMode = '', voice = null, voiceController=null, voiceSequence=0, voiceDucking=false, activeBossPerformance=null, activePresentation = null, toastTimer = null;
  let saved = null, busy = false, eventCursor = 0, activeFeedback=null, tutorialEnabled=true, merchantLine='', merchantEntering=false, dockObserver=null, burstSession=0;
  try { settings = {...defaults,...JSON.parse(localStorage.getItem(SETTINGS)||'{}')}; saved = JSON.parse(localStorage.getItem(SAVE)||'null'); } catch (_) {}
  try { tutorialEnabled=localStorage.getItem(TUTORIAL_SEEN)!=='done'; }catch(_){}
  if (!C || !E || !R) { $('app').innerHTML='<div class="page"><h2>游戏文件尚未加载完整</h2><p>请确认 content.js、combat-engine.js、tower-run.js 与入口放在同一文件夹。</p></div>'; return; }
  const heroes = Object.values(C.heroes), definitions = Object.values(C.cards);
  const heroArt = h => h.art || h.portrait;
  const heroIcon = h => window.TowerEncounterCast?.avatars?.[h.id]?.icon || heroArt(h);
  const clone = value => JSON.parse(JSON.stringify(value));
  const visibleHand = () => window.TowerHandOrder.sort(battle()?.hand||[],run?.heroIds||[],C.cards);
  const teaching = () => T?.active(run);
  const updateTutorialPointer = () => window.TowerTutorialPointer?.update({root:$('app'),run:screen==='battle'?run:null,selected,busy,modalOpen:$('modal').open});
  const uidOf = h => h.uid || h.id;
  const enemyNames={ 'Goblin Guard':'哥布林护卫','Kobold':'狗头人','Gellatina':'软泥怪','Wood Soul':'木灵','Golem':'魔像','Blue Golem':'蓝魔像','Fire Mage':'火焰法师','Werewolf':'狼人','Flaming Skulls':'火焰骷髅','Lizardman':'蜥蜴人','Sea Drake':'希德雷克','Orc Leader':'兽人首领' };
  function applyEnemyArt(unit){const cast=window.TowerEncounterCast?.enemies?.[unit.id];if(cast){unit.art=cast.art;unit.name=cast.displayName;unit.originalName=cast.originalName||cast.displayName;unit.isBoss=true;unit.castColor=cast.accent||cast.color;return unit;}const m=window.TowerEnemyMedia?.enemies?.[unit.id];if(m){unit.art=m.art;unit.combatRoleName??=unit.name;unit.name=unit.device?'封印魔像':enemyNames[m.originalName]||m.indexName||m.originalName;unit.originalName=m.originalName;}return unit;}
  // Keep changed standing art fresh for returning online players.
  for(const group of ['characters','bosses','enemies'])Object.values(window.TowerEncounterCast?.[group]||{}).forEach(entry=>{if(entry.art&&!entry.art.includes('release='))entry.art+=(entry.art.includes('?')?'&':'?')+'release=3.5.0';});
  Object.values(C.encounters).forEach(enc=>enc.enemies.forEach(applyEnemyArt));
  const battle = () => run?.battle;
  const inEcho = () => run?.echo?.status==='active';
  const bossCast = () => { const enc=C.encounters[battle()?.encounterId]; return window.TowerEncounterCast?.bosses?.[enc?.sourceEncounterId||battle()?.encounterId]; };
  const currentAct = () => C.acts.find(a=>a.id===run?.act) || C.acts[0];
  const bText = (label,action,extra='',cls='') => `<button class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
  function save() {
    if (!run) return;
    try { localStorage.setItem(SAVE,JSON.stringify(run)); saved=run; } catch (_) { toast('浏览器未允许本地存档；本次仍可继续游玩。'); }
  }
  function toast(message) { $('toast').textContent=message; $('toast').classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3000); }
  function closeModal() { $('modal').close(); modalContext=null; updateTutorialPointer(); }
  function modal(title,body,label='EXPEDITION NOTES') { window.TowerTutorialPointer?.hide(); $('modal-title').textContent=title; $('modal-label').textContent=label; $('modal-body').innerHTML=body; if(!$('modal').open)$('modal').showModal(); }
  function music(mode) {
    if (mode===bgmMode && bgm) { if(settings.audio&&!busy&&!bgm.ended) bgm.play().catch(()=>{}); return; }
    if(bgm){bgm.pause();bgm.remove();}
    const track=window.TowerBgm?.tracks?.[mode];
    bgmMode=mode; bgm=new Audio(track?.path||`assets/audio/${mode}.mp3`);
    const audio=bgm,looping=track?.loop??true;
    const hasLoopPoints=looping&&Number.isFinite(track?.loopStartSeconds)&&Number.isFinite(track?.loopEndSeconds)&&track.loopEndSeconds>track.loopStartSeconds;
    bgm.loop=looping&&!hasLoopPoints;refreshBgmVolume();
    if(hasLoopPoints){
      const resumeLoop=()=>{if(bgm!==audio)return;audio.currentTime=track.loopStartSeconds+Math.max(0,audio.currentTime-track.loopEndSeconds);if(settings.audio)audio.play().catch(()=>{});};
      audio.addEventListener('timeupdate',()=>{if(bgm===audio&&!audio.paused&&audio.currentTime>=track.loopEndSeconds)resumeLoop();});
      audio.addEventListener('ended',resumeLoop);
    }
    bgm.dataset.trackTitle=track?.title||mode;
    bgm.id='bgm-player';bgm.preload='auto';bgm.setAttribute('aria-hidden','true');document.body.append(bgm);
    bgm.addEventListener('error',()=>toast('当前背景音乐无法播放，请在设置中检查声音。'),{once:true});
    if(settings.audio)bgm.play().catch(()=>{});
  }
  function sound(name) { if(!settings.audio)return; const a=new Audio(`assets/audio/sfx/${name}.ogg`); a.volume=settings.volume; a.play().catch(()=>{}); }
  function refreshBgmVolume(){if(bgm)bgm.volume=settings.volume*((activeBossPerformance||activePresentation||voiceDucking) ? .18 : .55);}
  function refreshBossAudio(){activeBossPerformance?.setMuted?.(!settings.audio);activeBossPerformance?.setVolume?.(Math.min(1,settings.volume*2)*(activePresentation?.getState?.().completed===false ? .35 : 1));refreshBgmVolume();}
  function stopBossPerformance(){const performance=activeBossPerformance;activeBossPerformance=null;performance?.cancel?.();refreshBgmVolume();}
  function stopVoice(){voiceSequence++;voiceController?.cancel();voiceController=null;voiceDucking=false;if(voice){voice.pause();voice.remove();voice=null;}refreshBgmVolume();}
  function playVoice(path,done,options={}) {
    stopVoice();if(!settings.audio||!path){done?.('muted');return null;}
    const sequence=voiceSequence,audio=new Audio();voice=audio;audio.id='scene-voice-player';audio.hidden=true;audio.setAttribute('aria-hidden','true');audio.dataset.kind=options.kind||'character-sample';document.body.append(audio);
    voiceDucking=!!options.duck;refreshBgmVolume();
    const controller=window.TowerPresentation.play({fullVideo:false,audioPaths:[path],createAudio:()=>audio,volume:Math.min(1,settings.volume*2),
      onState:state=>{if(sequence===voiceSequence){audio.dataset.state=state.phase;options.onState?.(state);}},
      onComplete:reason=>{if(sequence!==voiceSequence)return;voiceController=null;voiceDucking=false;audio.dataset.result=reason;refreshBgmVolume();done?.(reason);}
    });
    if(!controller.getState().completed)voiceController=controller;return controller;
  }
  function hpBar(hp,max){return `<div class="hp-track ${hp/max<.35?'low':''}"><i style="width:${Math.max(0,Math.min(100,hp/max*100))}%"></i></div>`;}
  function partyPanel(){return `<div class="party-strip">${run.heroIds.map(id=>{const h=C.heroes[id];return `<div class="party-mini"><img src="${esc(heroArt(h))}" alt=""><div class="mini-info"><div><span>${esc(h.name)}</span><span>${run.hp[id]} / ${h.hp}</span></div>${hpBar(run.hp[id],h.hp)}</div></div>`;}).join('')}</div>`;}
  function relicPanel(){return run.relics.length?`<div class="relic-strip">${run.relics.map(id=>{const r=C.relics[id];return r?`<button class="relic-icon" style="padding:0" data-action="relic-info" data-id="${esc(id)}" title="${esc(r.name+'：'+r.text)}"><img class="relic-icon" src="${esc(r.art)}" alt="${esc(r.name)}" style="border:0;width:100%;height:100%"></button>`:'';}).join('')}</div>`:'<p class="explain">遗物会改变战斗节奏。挑战精英和Boss，可以挑选一件。</p>';}
  function cardView(card,b){try{return E.cardView(card,b||battle())||C.cards[card.defId];}catch(_){const d=C.cards[card.defId];return {...d,...(card.branch?d.branches[card.branch]:{})};}}
  const tags = {attack:'攻击',physical:'物理',magic:'魔法',support:'支援',guard:'护盾',debuff:'减益',buff:'强化',draw:'选牌',tp:'充能',stars:'星屑',star:'星屑',curse:'咒痕',area:'群体',heal:'治疗',cleanse:'净化',dispel:'驱散',payHp:'生命代价',exhaust:'本场消耗',recover:'弃牌置顶',follow:'追击'};
  function cardHTML(card,action='select-card',extra='',cls='',override=null){
    const v=override||cardView(card),h=C.heroes[v.owner]||C.heroes[C.cards[card.defId]?.owner]||heroes[0],short=window.TowerCardCopy?.shortText(v)||v.text;
    const unaffordable=screen==='battle' && !override && v.cost>battle()?.energy;
    const lesson=teaching()?T.expected(run):null,locked=action==='select-card'&&lesson&&(lesson.kind!=='card'||lesson.uid!==card.uid);
    return `<button class="card ${cls} ${selected?.uid===card.uid?'selected':''} ${unaffordable?'unaffordable':''} ${locked?'tutorial-locked':''} ${lesson?.kind==='card'&&lesson.uid===card.uid?'tutorial-highlight':''}" style="--hero:${esc(h.color)}" data-owner="${h.id}" data-action="${action}" data-id="${esc(card.uid)}" aria-label="${esc(h.name+' · '+v.name+' · '+v.cost+'行动。'+v.text)}" ${locked?'disabled':''} ${extra}><span class="card-top"><span class="card-avatar" title="${esc(h.name)}"><img src="${esc(heroIcon(h))}" alt="${esc(h.name)}" ${!window.TowerEncounterCast?.avatars?.[h.id]?'class="avatar-fallback"':''}></span><span class="card-cost" aria-label="${v.cost}行动">${v.cost}</span></span>${card.branch?`<span class="upgraded">${esc(card.branch)} 分支</span>`:''}<h3>${esc(v.name)}</h3><p class="card-short-copy" title="${esc(v.text)}">${esc(short)}</p><span class="card-tags">${(v.tags||C.cards[card.defId]?.tags||[]).map(t=>`<span>${esc(tags[t]||t)}</span>`).join('')}${v.exhaust?'<span>本场消耗</span>':''}</span></button>`;
  }
  function render(){
    const handScroll=$('app').querySelector('.hand')?.scrollLeft||0;
    if(run?.battle)run.battle.enemies.forEach(applyEnemyArt);
    if(run?.screen==='battle' && run.battle?.status && run.battle.status!=='active' && !busy&&!teaching()){R.finishBattle(run);save();}
    if(run)screen=run.screen;
    document.body.dataset.screen=screen;
    $('deck-count').textContent=run?.deck?.length??'—';
    $('run-meta').textContent=run?`${inEcho()?'登顶后 · 回响练招':`第 ${run.act} 幕`} · ${run.gold} 金币${run.testRun?' · 测试远征':''}`:'';
    const views={home:renderHome,setup:renderSetup,map:renderMap,battle:renderBattle,event:renderEvent,camp:renderCamp,shop:renderShop,reward:renderReward,result:renderResult};
    $('app').innerHTML=(views[screen]||renderHome)();
    const hand=$('app').querySelector('.hand');if(hand)hand.scrollLeft=handScroll;
    if(hand&&selected?.uid){const card=hand.querySelector('.selected');if(card){const r=card.getBoundingClientRect(),p=hand.getBoundingClientRect();if(r.right>p.right)hand.scrollLeft+=r.right-p.right+4;else if(r.left<p.left)hand.scrollLeft+=r.left-p.left-4;}}
    dockObserver?.disconnect();const dock=$('app').querySelector('.battle-dock');
    if(dock&&window.ResizeObserver){dockObserver=new ResizeObserver(entries=>document.body.style.setProperty('--battle-dock-height',Math.ceil(entries[0].contentRect.height)+'px'));dockObserver.observe(dock);}
    if(screen==='shop')$('app').querySelectorAll('[data-action="buy"]').forEach(button=>{if(run.room.purchased.includes(button.dataset.id)){button.disabled=true;button.textContent='本次已购买';button.closest('.shop-item').classList.add('sold');}});
    if(screen==='battle'&&battle()?.pending) pendingCardModal();
    const mode=screen==='battle'?(battle()?.type==='boss'||C.encounters[battle()?.encounterId]?.type==='boss'?`boss_act${C.encounters[battle()?.encounterId]?.act||run.act}`:C.encounters[battle()?.encounterId]?.type==='elite'?'elite':'battle'):{home:'title',setup:'title',map:'map',event:'event',camp:'rest',shop:'shop',reward:'reward',result:run?.result==='won'?'victory':'defeat'}[screen];
    music(mode||'map');
    eventCursor=screen==='battle'?(battle().events||[]).length:0;
    if(screen==='battle'&&!teaching()&&!busy&&C.encounters[battle().encounterId]?.type==='boss'&&run.room&&!run.room.introSeen)showBossEntry();
    updateTutorialPointer();
  }
  function renderHome(){
    return `<section class="landing"><div class="landing-art" aria-hidden="true"></div><div class="landing-copy"><p class="eyebrow">兰德索尔传闻 · 一场同人原创冒险</p><h1>传闻塔顶，<br><em>能实现心愿。</em></h1><div class="landing-story"><p>兰德索尔附近，一座来历不明的高塔忽然现世。<br>随之传开的，是一个令人心动的传闻：<strong>登上塔顶，就能实现心愿。</strong></p><p>怀着各自的期盼，伙伴们三人一组，踏上登塔之旅。<br>而塔中拦路的魔物与强敌，竟是这个世界中熟悉身影的幻影……</p></div><div class="actions">${bText(saved&&saved.screen!=='result'?'开启新远征':'组队挑战高塔','new-run','','primary')}${saved?bText('继续上次远征','continue'):''}</div><div class="landing-notes"><div><strong>${String(heroes.length).padStart(2,'0')}</strong><span>各具特色的角色</span></div><div><strong>03</strong><span>相伴整局的伙伴</span></div><div><strong>16</strong><span>通往塔顶的抉择</span></div></div><p class="landing-footnote">v3.5 公开试玩版 · 三幕十战 · 登顶后可选回响<br>自动保存 · 固定三人构筑 · 十八位伙伴的战斗习惯</p></div><p class="landing-quote">「那么，这次也一起出发吧。」</p></section>`;
  }
  function recommendedTeams(){
    const labels=[['初次登塔推荐','护盾承伤 → 破甲 → 剑锋收尾','物理爆发 · 稳住前排'],['喜欢魔法与群攻','咒痕点杀 → 星痕清场 → 指路调牌','魔法输出 · 处理后排'],['喜欢治疗与容错','佩可掩护 → 凯露突破 → 优衣修复','物魔搭配 · 治疗容错']];
    return `<section class="recommended-teams" aria-labelledby="recommended-title"><div class="recommended-heading"><div><p class="eyebrow">从一套配合开始</p><h3 id="recommended-title">先选一支推荐队伍</h3><p>点击下方队伍即可选好三人；也可以在下方自由搭配。</p></div><span class="recommend-hint">选好后，再点击「踏入高塔」</span></div><div class="recommended-grid">${C.teams.map((t,i)=>{const active=chosen.length===t.ids.length&&t.ids.every((id,n)=>chosen[n]===id);return `<button class="recommended-team ${active?'is-picked':''}" data-action="preset" data-index="${i}" aria-pressed="${active}" aria-label="选用${esc(t.name)}，${t.ids.map(id=>esc(C.heroes[id].name)).join('、')}"><span class="recommend-tag">${labels[i]?.[0]||'推荐配合'}</span><span class="recommend-title">${esc(t.name)}</span><span class="recommend-members">${t.ids.map(id=>`<span><img src="${esc(heroIcon(C.heroes[id]))}" alt=""><span>${esc(C.heroes[id].name)}</span></span>`).join('')}</span><span class="recommend-plan">${esc(labels[i]?.[1]||t.text)}</span><span class="recommend-footer"><span>${esc(labels[i]?.[2]||'三人协作')}</span><strong>${active?'✓ 已选用':'选用这支队伍 →'}</strong></span></button>`;}).join('')}</div><p class="recommend-caution">${esc(C.teams.find(t=>t.ids.length===chosen.length&&t.ids.every((id,i)=>chosen[i]===id))?.text||'自由搭配：留意承伤、输出与支援的配合；每位伙伴都会带入自己的6张起始牌。')}</p></section>`;
  }
  function renderSetup(){
    return `<section class="page"><div class="page-head"><div><p class="eyebrow">YOUR PARTY · YOUR DECK</p><h2>这次，和谁一起出发？</h2><p class="muted">开局选定三人，围绕她们构筑整局。左侧角色站在最前排；战后奖励只会出现同行角色的卡牌。</p></div><span class="pill gold">每人 6 张起始牌 · 共 18 张</span></div>${recommendedTeams()}<div class="custom-party-heading"><h3>也可以自由搭配</h3><p>点击角色加入或移出队伍，最多同行三人。</p></div><div class="roster">${heroes.map(h=>{const i=chosen.indexOf(h.id);return `<button class="hero-choice ${i>=0?'selected':''}" style="--hero:${esc(h.color)}" data-action="toggle-hero" data-id="${h.id}" aria-pressed="${i>=0}"><span class="selection-index">${i>=0?i+1:'＋'}</span><img src="${esc(heroArt(h))}" alt="${esc(h.name)}"><span class="hero-copy"><span class="role">${esc(h.role)} · ${h.hp} HP</span><h3>${esc(h.name)}</h3><p>${esc(h.summary||h.passive)}</p></span></button>`;}).join('')}</div><div class="selection-bar"><div class="formation"><span>前排 → 后排</span>${chosen.map((id,i)=>`<div class="formation-chip" style="--hero:${C.heroes[id].color}">${esc(C.heroes[id].name)}${i?bText('←','move-hero',`data-index="${i}" aria-label="${esc(C.heroes[id].name)}向前换位"`):''}${bText('详情','hero-info',`data-id="${id}"`)}</div>`).join('')}</div><div class="actions"><label class="seed-field">远征种子<input id="seed-input" value="${Date.now().toString(36).slice(-6).toUpperCase()}" maxlength="24" aria-label="远征种子"></label>${bText('踏入高塔','start-run',chosen.length!==3?'disabled':'','primary')}</div></div><label class="tutorial-option"><input type="checkbox" id="tutorial-enabled" ${tutorialEnabled?'checked':''}> 出发前进行新手演练 · 固定牌序与三人必杀，可随时跳过</label><p class="danger-note" style="margin-top:16px">全队倒地才会失败。倒地伙伴本场退出，获胜后恢复25%生命。注意敌人意图，在营地恢复伤势；每场战斗可免费调度一次手牌。</p></section>`;
  }
  function renderMap(){
    const act=currentAct(),choices=R.choices(run),steps=R.mapSteps(run),labels=steps.map(s=>s.label),icons=steps.map(s=>s.icon);
    const boss=R.publicBoss(run),bossCast=window.TowerEncounterCast?.bosses?.[boss?.id],owed=run.campDebt?.[run.act]?.status==='owed';
    const bossPreview=boss?`<section class="panel boss-forecast"><p class="eyebrow">本幕守关幻影 · 已确定</p><h3>${esc(bossCast?.displayName||boss.name)}</h3><p class="muted">${esc(boss.description)}</p>${owed?'<p class="danger-note">泉眼已预支本幕免费营地，可自费购物或继续前进。</p>':''}</section>`:'';
    return `<section class="page"><div class="page-head"><div><p class="eyebrow">ACT ${run.act} / 3 · EXPEDITION ${esc(run.seed)}</p><h2>${esc(act.name)}</h2><p class="muted">${esc(act.subtitle)}</p></div><span class="pill gold">${run.gold} 金币 · ${run.deck.length} 张牌</span></div><div class="map-layout"><div class="map-canvas"><div class="map-vignette"></div><div class="map-title"><p class="eyebrow">THE PATH AHEAD</p><h3>星愿之路</h3><p>每个选择，都会留在下一手牌里。</p></div><div class="map-route" style="--route-steps:${steps.length}">${labels.map((t,i)=>`<div class="map-node ${i===run.stage?'current':i<run.stage?'done':'future'}"><span class="node-icon">${i<run.stage?'✓':icons[i]}</span><div><strong>${t}</strong><small>${i<run.stage?'已经走过':i===run.stage?'你在这里 · 选择右侧路线':`第 ${i+1} 个节点`}</small></div></div>`).join('')}</div></div><aside class="map-side">${bossPreview}<section class="panel"><h3>同行的伙伴</h3>${partyPanel()}</section><section class="panel"><p class="eyebrow">NEXT STEP</p><h3 style="margin-bottom:12px">${labels[run.stage]}</h3>${choices.map(c=>`<button class="room-choice" data-action="enter-room" data-id="${esc(c.id)}"><span class="choice-icon">${esc(c.icon||'◇')}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.text||c.description||'')}</small></span><span class="arrow">→</span></button>`).join('')}</section><section class="panel"><h3>沿途的馈赠 <small class="muted" style="font:11px system-ui">${run.relics.length} 件遗物</small></h3>${relicPanel()}</section></aside></div></section>`;
  }
  function fighterStatus(u,isAlly){
    const s=[];if(u.block)s.push(`<span class="status shield">盾 ${u.block}</span>`);if(u.barrier)s.push(`<span class="status shield">魔盾 ${u.barrier}</span>`);if(u.armor)s.push(`<span class="status">护甲 ${u.armor}</span>`);if(u.stars)s.push(`<span class="status star" title="星屑最多3层，轮末结算后减少1层">✧ ${u.stars}/3</span>`);
    if((u.curseExpires??0)>=battle().round&&u.curseExpires>0)s.push('<span class="status curse" title="重复施咒刷新时长；每轮首次主动命中附伤2，不增加附伤次数">咒痕</span>');
    if(u.breakAmount&&(u.breakExpires??0)>=battle().round){const layers=(u.breakLayers||[]).map(l=>l.amount+'点／剩'+(l.expires-battle().round+1)+'轮').join('；');s.push(`<span class="status mark" title="${esc(layers||'后续每段物理伤害增加该数值')}" >破甲 +${u.breakAmount}</span>`);}
    if(u.weak)s.push(`<span class="status mark" title="可累加；只减少下一次单体攻击的第一段，随后消耗">减攻 ${typeof u.weak==='number'?u.weak:u.weak.amount||''}</span>`);
    if(u.buff)s.push(`<span class="status star" title="可累加；本轮下一次单体攻击首段加伤，使用后消耗">鼓舞 +${typeof u.buff==='number'?u.buff:u.buff.amount||''}</span>`);
    const debuffs={};(u.debuffs||[]).filter(d=>d.expires>=battle().round).forEach(d=>{const group=debuffs[d.type]||(debuffs[d.type]={amount:0,layers:[]});group.amount+=d.amount;group.layers.push(d.amount+'点／剩'+(d.expires-battle().round+1)+'轮');});
    Object.entries(debuffs).forEach(([type,group])=>s.push(`<span class="status mark" title="${esc(group.layers.join('；'))}">${esc({vulnerable:'破绽',slow:'迟缓',clog:'阻滞',poison:'毒'}[type]||type)} ${group.amount}</span>`));
    if(u.coverFrom)s.push(`<span class="status shield">${esc(C.heroes[u.coverFrom]?.name||'队友')}掩护</span>`);
    return s.join('')||'<span class="status">无附加状态</span>';
  }
  function keywordsModal(){modal('卡牌关键词',`<div class="keyword-list">${Object.entries(window.TowerCardCopy?.terms||{}).map(([name,text])=>`<section><h3>${esc(name)}</h3><p>${esc(text)}</p></section>`).join('')}<section><h3>蓄势</h3><p>本轮支付1行动，下一轮获得1行动，每轮最多预备1点。不抽牌、不增加TP、不触发出牌被动，正常上限4行动；迟缓仍然扣除1行动。剩余手牌仍在轮末弃置，需要为下一轮提前安排。</p></section><section><h3>叠加与到期</h3><p>鼓舞、减攻和破甲数值相加。鼓舞与减攻在下一次对应攻击首段一次消耗；破甲每一层独立到期。破绽在下一次敌方命中合计消耗，毒分层结算。净化1种状态会清除该类型所有层。迟缓全队每轮最多扣1行动，阻滞最多减少2张抽牌。</p></section></div>`,'完整规则始终可以查看');}
  function selectedTargets(){const all=legalSelectedTargets(),e=teaching()?T.expected(run):null;return e&&e.target?all.filter(id=>id===e.target):all;}
  function legalSelectedTargets(){
    if(!selected||!battle())return [];
    if(selected.kind==='burst'){
      if(E.legalBurstTargets)return E.legalBurstTargets(battle(),selected.heroId);
      const t=C.heroes[selected.heroId].burst.target;
      if(t==='enemyAny')return battle().enemies.filter(x=>x.hp>0).map(uidOf);
      if(t==='enemy'){const fronts=battle().enemies.filter(x=>x.hp>0&&!x.device&&x.position!=='back');return battle().enemies.filter(x=>x.hp>0&&(x.device||!fronts.length||x.position!=='back')).map(uidOf);}
      if(t==='ally'||t==='otherAlly')return battle().party.filter(x=>x.hp>0&&(t!=='otherAlly'||x.id!==selected.heroId)).map(uidOf);
      return [];
    }
    try{return E.legalTargets(battle(),selected.uid).map(x=>typeof x==='object'?uidOf(x):x);}catch(_){return [];}
  }
  function intentText(e){
    const i=e.intent||{};const amount=i.damage??i.amount??0;const target=battle().party.find(h=>uidOf(h)===(i.targetUid||e.lockedTargetUid));
    const hits=i.hitDamages?.length?i.hitDamages.join(' + '):`${amount}${i.hits>1?` × ${i.hits}`:''}`;
    const suffix=i.type==='aoe'?`全队各 ${amount} 伤害`:i.type==='attack'?`${hits} 伤害 → ${target?.name||C.heroes[target?.id]?.name||({front:'前排',back:'后排',lowest:'生命最低'}[i.target]||'伙伴')}`:i.type==='curse'?'施加破绽 · 可净化':i.type==='guard'?(i.counter?`迎击 ${i.counter}`:i.barrier?`魔盾 ${i.barrier}`:(i.block||i.amount)?`护盾 ${i.block||i.amount}`:'准备下一轮'):'调整阵势';
    return `${esc(i.name||'准备行动')}<span>${esc(suffix)}</span>`;
  }
  function enemyArt(u){
    const art=u.art||window.TowerEnemyMedia?.enemies?.[u.id]?.art;
    return art?`<img class="enemy-portrait" src="${esc(art)}" alt="${esc(u.originalName||u.name)}" loading="eager">`:`<span class="enemy-glyph" aria-hidden="true">${esc(u.icon||'◇')}</span>`;
  }
  function tutorialPanel(){
    const note=teaching()?T.info(run):null;if(!note)return '';
    return `<section class="tutorial-panel" data-step="${note.step}" aria-label="新手指引"><div class="tutorial-copy"><span class="tutorial-progress">配合练习 ${note.step}/9 · 可随时跳过</span><h3>${esc(note.title)}</h3><p>${esc(note.text)}</p></div><div class="tutorial-actions">${note.button?bText(esc(note.button),note.action,'','primary'):''}${bText('跳过教学','tutorial-skip','','small')}${bText('指引','tutorial-info','aria-label="查看完整新手指引"','small tutorial-help')}</div></section>`;
  }
  function bossHealth(b,enc){
    if(enc.type!=='boss')return '';
    const unit=b.enemies.find(e=>e.uid===b.bossCoreUid)||b.enemies[0];
    const ratio=Math.max(0,unit.hp/unit.maxHp),phase=ratio>.65?'生命充裕 · 观察招式':ratio>.3?'生命受创 · 抓住破绽':'濒临击破 · 集中火力';
    return `<section class="boss-health" aria-label="Boss生命条" style="--boss:${esc(unit.castColor||unit.color||'#ca9cde')}"><div class="boss-heading"><span class="eyebrow">${inEcho()?'回响练招':`ACT ${run.act} · BOSS`}</span><h3>${esc(unit.name)}</h3><strong>${unit.hp} / ${unit.maxHp}</strong></div><div class="boss-hp-track"><i class="boss-hp-fill" style="width:${ratio*100}%"></i></div><span class="boss-phase">${phase} · ${b.round>=7?'伤害逐步增强':'第7回合起伤害逐步增强'}</span></section>`;
  }
  function renderBattle(){
    const b=battle(),enc=C.encounters[b.encounterId]||{},targets=selectedTargets(),lesson=teaching()?T.expected(run):null;
    const finale=enc.type==='boss'&&(enc.bossId==='kaiser'||['paper_kaiser','summit_boss'].includes(enc.id)),core=b.enemies.find(e=>e.uid===b.bossCoreUid)||b.enemies[0],phase=core.hp/core.maxHp<.3?'critical':core.hp/core.maxHp<.65?'wounded':'steady',turnEnergy=b.turnEnergy||Math.max(3,b.energy);
    const allies=b.party.map((u,i)=>{
      const h=C.heroes[u.id],id=uidOf(u),lit=lesson?.kind==='burst'&&lesson.owner===u.id;
      return `<article class="fighter ${targets.includes(id)?'targetable':''} ${u.hp<=0?'dead down':''}" data-action="target" data-id="${esc(id)}" tabindex="${targets.includes(id)?'0':'-1'}" aria-label="${esc(h.name)}，${u.hp<=0?'已倒地':u.hp+'生命'}"><div class="fighter-art"><span class="fighter-front">${['前排','中位','后排'][i]}${u.hp<=0?' · 倒地':''}</span><img src="${esc(heroArt(h))}" alt=""></div><div class="fighter-info"><div class="fighter-name"><span>${esc(h.name)}</span><span class="hp-number">${u.hp} / ${u.maxHp}</span></div>${hpBar(u.hp,u.maxHp)}<div class="statuses">${u.hp<=0?'<span class="status mark">本场退出 · 获胜后恢复</span>':fighterStatus(u,true)}</div><div class="tp-row" aria-label="${u.tp} / 6 TP">${Array.from({length:6},(_,j)=>`<i class="${j<u.tp?'on':''}"></i>`).join('')}</div><button class="ub-button ${u.tp>=6&&u.hp>0?'ready':''} ${lit?'tutorial-highlight':''}" data-action="select-burst" data-id="${u.id}" data-tp="${u.hp<=0?'倒地':u.tp+'/6'}" aria-label="${esc(h.name+' · '+h.burst.name+' · '+(u.hp<=0?'本场倒地':u.tp+'/6 TP'))}" ${u.hp<=0||u.tp<6||b.energy<1||busy||(lesson&&!lit)?'disabled':''}><span>${esc(h.burst.name)}</span><small>${u.hp<=0?'暂时倒地':`必杀 · ${u.tp}/6 TP`}</small></button></div></article>`;
    }).join('');
    const enemies=b.enemies.filter(e=>e.hp>0).map(u=>{
      const id=uidOf(u);return `<article class="fighter enemy ${u.isBoss?'boss':''} ${targets.includes(id)?'targetable':''}" data-action="target" data-id="${esc(id)}" data-unit-id="${esc(u.id)}" tabindex="${targets.includes(id)?'0':'-1'}" aria-label="${esc(u.name)}，${u.hp}生命"><div class="intent">${intentText(u)}</div><div class="enemy-art" style="--foe:${esc(u.color||'#b194c0')}">${enemyArt(u)}<span class="fighter-front">${u.device?'装置':u.isBoss?'BOSS':enc.victoryCoreId===u.id?'胜利目标':u.position==='back'?'后排':'前排'}</span></div><div class="fighter-info"><div class="fighter-name"><span>${esc(u.name)}</span><span class="hp-number">${u.hp}/${u.maxHp}</span></div>${u.isBoss?'':hpBar(u.hp,u.maxHp)}<div class="statuses">${fighterStatus(u,false)}</div></div></article>`;
    }).join('');
    const hand=visibleHand(),handHTML=hand.map((c,i)=>cardHTML(c,'select-card','',i===0||C.cards[c.defId].owner!==C.cards[hand[i-1].defId].owner?'hand-group-start':'')).join('');
    return `<section class="battle-page ${finale?'final-battle':''}"><div class="battle-toolbar"><div><p class="eyebrow">${inEcho()?'ECHO':`ACT ${run.act}`} · ${teaching()?'TRAINING':enc.type==='boss'?'BOSS ENCOUNTER':enc.type==='elite'?'ELITE ENCOUNTER':'BATTLE'}</p><h2>${esc(enc.name||b.name||'遭遇战')} <span class="round-label">第 ${b.round} 回合</span></h2><p>${esc(enc.description||'')}</p></div><div class="actions">${b.round>=7?'<span class="pill gold">敌人正在逐步加压</span>':''}${window.TowerTestTools&&window.TowerBuild?.testTools===true?bText('测试胜利','test-victory',lesson?'disabled title="请先完成或跳过练习"':(inEcho()?'title="只结束本次回响，不发奖励，不改主线战果"':'title="跳过本场战斗，正常发放奖励，并标记本局为测试远征"'),'small test-victory'):''}${inEcho()?bText('结束回响','echo-exit','','small'):''}${bText('记录','battle-log','','small')}</div></div>${enc.objective?`<div class="battle-objective" role="note"><span>胜利条件</span>${esc(enc.objective)}</div>`:''}${tutorialPanel()}${bossHealth(b,enc)}<div class="arena ${enc.type==='boss'?'boss-arena':''} ${finale?'final-arena':''} ${enc.type==='boss'&&!finale?'solo-boss-arena':''}" data-phase="${phase}" ${enc.type==='boss'?`style="background-image:linear-gradient(#10182b88,#10182bcc),url('${esc(currentAct().background)}')"`:''}><span class="arena-label">同行伙伴 · 前排 → 后排</span><span class="arena-label enemy-label">敌方 · 下一步意图</span><div class="fighters allies">${allies}</div><div class="fighters enemies">${enemies}</div></div><section class="hand-panel"><div class="hand-toolbar"><span class="hand-order-note">手牌 · 按同行顺序排列</span><div class="draw-counters">${bText('手牌详情','battle-pile','data-pile="hand"','small')}${bText('战况','battle-info','','small')}${bText(`牌库 ${b.drawPile.length}`,'battle-pile','data-pile="draw"','small')}${bText(`弃牌 ${b.discardPile.length}`,'battle-pile','data-pile="discard"','small')}${bText('免费调度','redraw',b.redrawUsed||b.flags?.redrawUsed||lesson?'disabled':'','small')}</div></div><div class="hand">${handHTML||'<p class="empty">本轮没有手牌了，可以释放必杀或结束回合。</p>'}</div><div class="log-box">${b.log.slice(-3).map(t=>`<p>${esc(typeof t==='string'?t:t.text||JSON.stringify(t))}</p>`).join('')}</div></section><section class="battle-dock ${selected?'is-selecting':''} ${selected?.kind==='burst'&&['none','allEnemies','self'].includes(C.heroes[selected.heroId].burst.target)?'has-burst-confirm':''}" aria-label="战斗操作栏"><div class="dock-main"><div class="energy-display">${Array.from({length:turnEnergy},(_,i)=>`<span class="energy-dot ${i>=b.energy?'off':''}"><span>${i<b.energy?'✦':'·'}</span></span>`).join('')}<span class="energy-text">行动 ${b.energy}/${turnEnergy}</span></div><div class="dock-options">${renderTargetPanel()}</div><span class="shortcut">1–5 选牌 · Enter 结束回合</span><div class="actions">${selected?bText('取消','cancel-select','','small'):''}${!lesson?bText(b.energyReserve?'<span>已蓄势</span><small>下轮 +1</small>':'<span>蓄势 −1</span><small>下轮 +1</small>','reserve-energy',`aria-label="蓄势：本轮支付1行动，下一轮获得1行动；最多预备1点，不加TP" title="本轮少1行动，下一轮多1行动，最多4；不抽牌、不增加TP" ${b.energy<1||b.energyReserve||b.flags?.reserveUsed||busy||b.pending?'disabled':''}`,'small reserve-energy'):''}${bText('结束回合 →','end-turn',busy||b.pending||(lesson&&lesson.kind!=='endTurn')?'disabled':'',`primary end-turn ${lesson?.kind==='endTurn'?'tutorial-highlight':''}`)}</div></div></section></section>`;
  }

  function renderTargetPanel(){
    if(!selected)return '';
    const b=battle(),card=b.hand.find(c=>c.uid===selected.uid),v=selected.kind==='burst'?C.heroes[selected.heroId].burst:cardView(card),effects=v.effects||[];
    const heavy=effects.find(e=>e.type==='heavy'),hasCurse=effects.some(e=>e.type==='curseHit'&&e.consume);
    let controls=''; if(heavy){const actor=b.party.find(h=>h.id===v.owner);const cap=Math.min(heavy.cap,actor?.block||0);controls+=`<details class="combat-choice"><summary>耗盾 ${spendBlock}</summary><div class="combat-choice-panel"><label>消耗护盾 <input id="spend-block" type="range" min="0" max="${cap}" step="${heavy.step}" value="${spendBlock}"> <strong>${spendBlock}</strong></label></div></details>`;}
    if(hasCurse)controls+=`<details class="combat-choice"><summary>${consumeCurse?'引爆咒痕':'保留咒痕'}</summary><div class="combat-choice-panel"><label><input type="checkbox" id="consume-curse" ${consumeCurse?'checked':''}> 引爆咒痕，获得额外伤害并移除</label></div></details>`;
    if(selected.kind==='burst' && ['none','allEnemies','self'].includes(v.target))controls+=bText('释放UB · 1行动','confirm-burst','','primary small');
    return controls;
  }
  function renderEvent(){
    const event=run.room.event,availability=R.eventAvailability(run,event);
    return `<section class="page room-scene"><div class="room-art"></div><div class="room-copy"><p class="eyebrow">AN ENCOUNTER ON THE WAY</p><h2>${esc(event.name)}</h2><p class="muted">${esc(event.text)}</p>${event.choices.map((c,i)=>{
      const a=availability[i],fee=c.hpCost,details=[c.description||'',c.cost?`支付 ${c.cost} 金币`:'',fee?fee.scope==='upgradeOwner'?`升级牌所属角色亲自支付 ${fee.amount} 生命` :fee.scope==='party'?`三人各支付 ${fee.amount} 生命`:`选择一名队员支付 ${fee.amount} 生命`:'',c.campAdvance?'预支本幕免费营地；之后可自费购物或直接前进':'',a.healPreview?'实际恢复：'+run.heroIds.map(id=>`${C.heroes[id].name} +${a.healPreview[id]}`).join('／'):'',a.reason].filter(Boolean);
      return `<button class="room-choice" data-action="event-choice" data-index="${i}" ${!a.enabled?'disabled':''}><span class="choice-icon">${['✧','◇'][i]||'✦'}</span><span><strong>${esc(c.label)}</strong><small>${details.map(esc).join('<br>')}</small></span><span class="arrow">→</span></button>`;
    }).join('')}<div class="divider"></div>${partyPanel()}</div></section>`;
  }
  function renderCamp(){return `<section class="page room-scene"><div class="room-art" style="background-image:linear-gradient(#11192b44,#11192b77),url('assets/ui/map_bg.webp')"></div><div class="room-copy"><p class="eyebrow">A MOMENT OF REST</p><h2>在星光下稍作休息</h2><p class="muted">火光渐渐亮起。可以休息恢复伤势，也可以把这段安静的时间，用来练习一种招式。</p><button class="room-choice" data-action="camp-heal"><span class="choice-icon">♧</span><span><strong>分享补给</strong><small>全队恢复各自最大生命的35%。</small></span><span class="arrow">→</span></button><button class="room-choice" data-action="camp-upgrade"><span class="choice-icon">✧</span><span><strong>练习招式</strong><small>选择一张未升级卡，选择A或B分支。</small></span><span class="arrow">→</span></button><div class="divider"></div>${partyPanel()}</div></section>`;}
  function shopStock(){return run.room?.stock||run.shopStock||{};}
  function renderShop(){
    const stock=shopStock(),relicIds=stock.relics||[],cardIds=stock.cards||[],m=window.TowerEncounterCast?.merchant;
    const line=merchantLine||m?.entryLine||'欢迎，旅人。先看看下一场战斗需要什么吧。';
    const arrival=m?`<section class="merchant-scene ${merchantEntering?'merchant-arrival':''}"><div class="merchant-portrait"><img src="${esc(m.art)}" alt="${esc(m.displayName)}"></div><div class="merchant-dialogue"><span class="eyebrow">THE TRAVELING SHOP</span><h3>${esc(m.displayName)}的补给时间</h3><p class="merchant-line" role="status">${esc(line)}</p><p class="muted">各项服务与商品，本次到访各限购一次。${m.voice?bText('角色原声','merchant-voice','','small'):''}</p></div></section>`:'';
    return `<section class="page"><div class="page-head"><div><p class="eyebrow">A BREAK IN THE JOURNEY</p><h2>旅人的小铺</h2><p class="muted">把路费花在下一场真正需要的地方。</p></div><div class="actions"><span class="pill gold">${run.gold} 金币</span>${bText('继续前进 →','leave-shop','','primary')}</div></div>${arrival}<div class="shop-grid">${[['heal','旅途补给','全队各恢复6生命。',35],['upgrade','招式练习','选择一张卡，升级为A或B分支。',45],['remove','整理行囊','移除一张卡，牌组至少保留12张。',40]].map(([id,name,text,cost])=>`<article class="shop-item"><p class="eyebrow">SERVICE</p><h3>${name}</h3><p class="muted">${text}</p><p class="price">${cost} 金币</p>${bText('购买','buy',`data-id="${id}" ${run.gold<cost?'disabled':''}`)}</article>`).join('')}${relicIds.map(id=>{const r=C.relics[id],eligibility=R.relicAvailability(run,id);return r?`<article class="shop-item relic-shop"><span class="relic-art-box"><img src="${esc(r.art)}" alt=""></span><h3>${esc(r.name)}</h3><p class="muted rule-copy">${esc(r.text)}</p><p class="price">75 金币</p>${!eligibility.enabled?`<p class="danger-note">${esc(eligibility.reason)}</p>`:''}${bText(run.relics.includes(id)?'已持有':!eligibility.enabled?'当前构筑不适用':'购买遗物','buy',`data-id="relic:${id}" ${run.gold<75||run.relics.includes(id)||!eligibility.enabled?'disabled':''}`)}</article>`:'';}).join('')}${cardIds.map(id=>{const c=C.cards[id];return c?`<article class="shop-item"><p class="eyebrow">${esc(C.heroes[c.owner].name)} · CARD</p><h3>${esc(c.name)}</h3><p class="muted">${esc(c.text)}</p><p class="price">40 金币</p>${bText('购买卡牌','buy',`data-id="card:${id}" ${run.gold<40?'disabled':''}`)}</article>`:'';}).join('')}</div></section>`;
  }

  function renderReward(){
    const rw=run.reward||{},kind=rw.type||'card',options=rw.options||[];
    const title={relic:'带走一件馈赠',upgrade:'把胜利，练成新的招式',card:'让下一手牌有所不同'}[kind];
    const text={relic:'选择一件遗物，它将伴随这场远征。',upgrade:'Boss的试炼换来一次免费练习。选择一张牌，再决定它的升级方向。',card:'点击牌面正常领取；也可付费换招，保持牌组张数不变。'}[kind];
    const rendered=options.map((o,i)=>{
      const id=typeof o==='string'?o:o.defId||o.id;
      if(kind==='relic'){const r=C.relics[id];return r?`<button class="relic-card relic-reward" data-action="take-reward" data-index="${i}"><span class="relic-art-box"><img src="${esc(r.art)}" alt=""></span><h3>${esc(r.name)}</h3><p class="rule-copy">${esc(r.text)}</p></button>`:'';}
      const card=kind==='upgrade'?run.deck.find(c=>c.uid===id):{uid:`reward-${i}`,defId:id,branch:null};
      if(!card)return '';
      const html=cardHTML(card,'take-reward',`data-index="${i}"`,'reward-card');
      if(kind!=='card')return html;
      const swap=R.swapOptions(run,i);
      return `<article class="reward-choice">${html}<details class="branch-rules reward-rules"><summary>完整规则</summary><p class="rule-copy">${esc(C.cards[id].text)}</p></details><span class="reward-take-note">领取 · 牌组 +1张</span>${bText('换招 · '+swap.cost+'金币','swap-open',`data-index="${i}" ${swap.enabled?'':'disabled'}`,'swap-button')}<small class="swap-reason">${esc(swap.enabled?'替换同角色的未升级起手副本':swap.reason)}</small></article>`;
    }).join('');
    return `<section class="page reward-layout"><div class="reward-mark">${kind==='relic'?'◇':'✦'}</div><p class="eyebrow">A NEW POSSIBILITY</p><h2>${title}</h2><p class="muted">${text}</p>${kind==='card'?`<p class="swap-budget">现有 <strong>${run.gold}金币</strong> · 牌组 ${run.deck.length}张 · 第一、二幕各最多换招一次</p>`:''}<div class="${kind==='upgrade'?'modal-cards':'reward-cards'}" style="margin:24px 0">${rendered}</div>${bText(kind==='relic'?'放弃遗物':kind==='upgrade'?'暂不练习':'跳过卡牌 · 获得8金币','skip-reward')}<p class="explain" style="margin-top:20px">胜利整备：存活者各恢复2生命，倒地者恢复至25%最大生命。进入下一幕时额外恢复35%。</p></section>`;
  }
  function swapModal(index){
    const check=R.swapOptions(run,index);if(!check.enabled){toast(check.reason);return;}
    const id=run.reward.options[index],d=C.cards[id],h=C.heroes[d.owner];
    modal('为'+h.name+'换一种招式',`<p class="muted">用下面一张未升级起手副本，换成《${esc(d.name)}》。同名相同副本合并展示，只替换其中一张；至少保留另一张同名牌。已升级的牌不会出现在这里。</p><div class="swap-preview"><strong>金币 ${run.gold} → ${run.gold-check.cost}</strong><span>牌组 ${run.deck.length} → ${run.deck.length}张</span><span>新招：${d.cost}行动 · ${esc(d.name)}</span></div><p class="rule-copy">${esc(d.text)}</p><div class="modal-cards">${check.cards.filter((card,i,all)=>all.findIndex(c=>c.defId===card.defId)===i).map(card=>cardHTML(card,'swap-select-old')).join('')}</div>${bText('取消，回到奖励','close-modal','','small')}`,'选择将替换的起手副本');
    modalContext={type:'swap',index};
  }
  function confirmSwap(uid){
    const index=modalContext?.index,check=R.swapOptions(run,index),old=check.cards.find(c=>c.uid===uid);
    if(!check.enabled||!old){toast(check.reason||'这张牌当前不能替换。');return;}
    const next={uid:'swap-preview',defId:run.reward.options[index],branch:null};
    modal('确认这次换招',`<p class="muted">只替换这个副本，其他同名牌保留。第一、二幕各最多一次，本幕确认后不能再次换招。</p><div class="swap-comparison"><div><p>移出牌组</p>${cardHTML(old,'noop','','reward-card')}</div><span aria-hidden="true">→</span><div><p>加入牌组</p>${cardHTML(next,'noop','','reward-card')}</div></div><div class="swap-preview"><strong>支付 ${check.cost}金币 · 剩余 ${run.gold-check.cost}金币</strong><span>牌组张数不变 · 不再获得本次其他牌或跳牌8金币</span></div><div class="actions">${bText('确认支付并换招','swap-confirm',`data-index="${index}" data-id="${esc(uid)}"`,'primary')}${bText('重新选择','swap-open',`data-index="${index}"`)}${bText('取消','close-modal')}</div>`,'旧牌 → 新招');
    modalContext={type:'swap',index};
  }
  function renderEcho(){
    if(run.result!=='won'||run.layoutVersion!==1)return '';
    if(run.echo){const e=run.echo;return `<section class="echo-result"><span class="eyebrow">回响已经结束 · 主线登顶保持不变</span><h3>${esc(e.name||'回响练招')} · ${{won:'挑战完成',lost:'本次未能取胜',abandoned:'已主动结束'}[e.status]||'已结束'}</h3><p>经历${e.rounds||1}回合。主线牌组、遗物、金币和战果完整保留。${e.testWins?'本次回响使用了测试胜利。':''}</p></section>`;}
    const options=R.echoChoices(run);if(!options.length)return '';
    return `<section class="echo-section"><p class="eyebrow">再试一招，也可以就此启程归家</p><h2>登顶之后 · 幻影回响</h2><p class="muted">你已经完成主线。可以用最终牌组和遗物，再挑战一位本局未遇到的幻影。全员满血入场，随时可结束；胜负都保留登顶结果。每局最多一场，无额外成长奖励。</p><div class="echo-options">${options.map(choice=>{const m=window.TowerEncounterCast?.bosses?.[choice.sourceEncounterId];return `<button class="echo-choice" data-action="echo-start" data-id="${esc(choice.id)}">${m?`<img src="${esc(m.art)}" alt="">`:''}<span><small>未曾交手的幻影</small><strong>${esc(m?.displayName||choice.name)}</strong><span>以当前构筑挑战 →</span></span></button>`;}).join('')}</div></section>`;
  }
  function renderResult(){const won=run.result==='won';return `<section class="result"><span class="result-icon">${won?'✦':'◇'}</span><p class="eyebrow">${run.testRun?`测试远征 · 使用测试胜利 ${run.stats.testWins||0} 次 · `:''}${won?'THE WISH AT THE SUMMIT':'EVERY JOURNEY LEAVES A STORY'}</p><h1>${won?'把星愿，带回家。':'这一程，暂且停下。'}</h1><p class="muted">${won?'三名伙伴走过了高塔。每一次选牌、每一份护盾，都留下了自己的回响。':'伙伴们暂时停下了脚步。保留这次学到的敌人意图，换一种出牌顺序，也许就会走得更远。'}</p><div class="result-stats"><div><strong>${run.stats.battles||0}</strong><span>经历战斗</span></div><div><strong>${run.relics.length}</strong><span>收集遗物</span></div><div><strong>${run.deck.filter(c=>c.branch).length}</strong><span>分支升级</span></div></div>${partyPanel()}<p class="explain" style="margin-top:25px">远征种子 ${esc(run.seed)} · ${run.heroIds.map(id=>esc(C.heroes[id].name)).join(' / ')}</p>${renderEcho()}<div class="actions" style="justify-content:center;margin-top:25px">${won?bText('完成远征，返回首页','return-title','','primary'):bText('以相同队伍和种子重试','retry','','primary')}${bText('重新选择伙伴','new-run')}</div></section>`;}
  function guideModal(){const p=battle().pending;modal('指路 · 选择一张牌',`<p class="muted">这是实际牌顶的 ${p.cards.length} 张牌。选择一张入手，其余按原顺序放到牌底。选取后剩余 ${battle().energy} 行动。</p><div class="reward-cards">${p.cards.map(c=>cardHTML(c,'choose-guide','','reward-card')).join('')}</div>`,'FOLLOW THE WIND');modalContext={type:'guide'};}
  function pendingCardModal(){
    const b=battle(),p=b.pending;if(p.type==='guide'){guideModal();return;}
    const pile=p.type==='redraw'?b.drawPile:b.discardPile,cards=(p.cardUids||[]).map(uid=>pile.find(c=>c.uid===uid)).filter(Boolean).filter(c=>!(p.selectedUids||[]).includes(c.uid));
    const redraw=p.type==='redraw',chosen=(p.selectedUids||[]).map(uid=>b.discardPile.concat(b.drawPile).find(c=>c.uid===uid)).filter(Boolean);
    modal(redraw?'歪针罗盘 · 选择替换牌':'留一手 · 选择下一轮牌序',`<p class="muted">${redraw?'候选来自所选角色的实际抽牌堆；只换入一张，原手牌置底，未选牌保留原顺序。本战调度次数已经使用，刷新不会重抽。':`从实际弃牌堆选择至多 ${p.count} 张，按选择顺序置于牌顶，第一张最先抽到。它们不会立刻入手。`}</p>${chosen.length?`<p class="explain">已选牌顶顺序：${chosen.map(c=>esc(cardView(c).name)).join(' → ')}</p>`:''}<div class="reward-cards">${cards.map(c=>cardHTML(c,redraw?'choose-redraw':'choose-recover','','reward-card')).join('')}</div>${!redraw?bText('按当前选择结束','finish-recover','','small'):''}`,'CHOOSE FROM REVEALED CARDS');
    modalContext={type:p.type};
  }
  function deckModal(mode='view',onDone=null,pile=null,options={}){
    if(!run){toast('选择同行伙伴后，就能查看她们的起始牌。');return;}
    const source=pile==='hand'?visibleHand():pile==='draw'?battle().drawPile:pile==='discard'?battle().discardPile:run.deck;
    const list=source.filter(c=>(mode!=='upgrade'||!c.branch)&&(!options.hpCost||options.hpCost.scope!=='upgradeOwner'||run.hp[C.cards[c.defId].owner]>options.hpCost.amount)).sort((a,b)=>{const aa=C.cards[a.defId],bb=C.cards[b.defId];return run.heroIds.indexOf(aa.owner)-run.heroIds.indexOf(bb.owner)||aa.id.localeCompare(bb.id);});
    modal(mode==='upgrade'?'选择要练习的招式':mode==='remove'?'选择要移除的牌':pile==='draw'?'抽牌堆 · 按角色整理':pile==='discard'?'弃牌堆':pile==='hand'?'当前手牌 · 完整牌面':'本次远征的牌组',`<p class="muted" style="font-size:12px">${mode==='upgrade'?'每次练习升级一张牌。A与B分支互斥，升级后本局不能改选。':mode==='remove'?'移除后，这张牌不会再出现在本局战斗中。':pile==='draw'?'按角色整理展示，不透露随机牌序。指路可以查看真实牌顶。':'卡面使用短说明；点击卡牌查看完整规则。'+bText('关键词说明','card-keywords','','small')}</p><div class="modal-cards">${list.map(c=>cardHTML(c,mode==='view'?'inspect-card':'pick-deck-card')).join('')||'<p class="empty">没有符合条件的卡牌。</p>'}</div>`,'YOUR DECK');
    if(options.hpCost)$('modal-body').insertAdjacentHTML('afterbegin',`<p class="danger-note">${options.hpCost.scope==='upgradeOwner'?`练习者本人支付 ${options.hpCost.amount} 生命；仅显示付血后仍存活的队员卡牌。`:'本次选择需要支付生命。'}</p>`);
    modalContext={type:'deck',mode,onDone,source,options};
  }
  function branchModal(card,done,options={}){const d=C.cards[card.defId];modal('为这张牌选择一种方向',`<p class="muted">${esc(d.name)} · ${esc(C.heroes[d.owner].name)}。分支会改变卡牌用途，原有卡牌的其它副本不变。</p>${options.hpCost?`<p class="danger-note">${esc(C.heroes[d.owner].name)}将亲自支付 ${options.hpCost.amount} 生命：${run.hp[d.owner]} → ${run.hp[d.owner]-options.hpCost.amount}。</p>`:''}<div class="upgrade-branches">${['A','B'].map(branch=>`<div>${cardHTML({...card,branch},'pick-branch',`data-branch="${branch}"`,'reward-card',{...d,...d.branches[branch]})}<details class="branch-rules"><summary>完整规则</summary><p class="rule-copy">${esc(d.branches[branch].text)}</p></details></div>`).join('')}</div>`,'A DIFFERENT WAY TO PLAY');modalContext={type:'branch',card,done};}
  function rules(){modal('在下一手牌里找到配合',`<div class="rule-grid"><section><h3>本次更新的新内容</h3><p>新远征三幕共16节点、10场战斗。第二幕增加指挥者据点；交替双卫与第三幕指挥所可从地图选择。第一、二幕卡牌奖励可花40金币，用同角色未升级起手副本换取展示的新牌；每幕一次，保留另一张同名牌。登顶结算后可用最终构筑参加一场自选回响，随时结束，不影响主线结果。</p></section><section><h3>三人，整局同行</h3><p>每人三种起始牌，各两张，共18张。奖励只出同行角色的牌。站位从左到右，前排挡住近战对后排的攻击；法术可以越过前排。只有全队倒地才会失败。倒地角色本场不能行动，她的牌暂离循环；获胜后以25%生命重新同行。</p></section><section><h3>行动与必杀</h3><p>每轮基础3行动、抽5张牌，剩余手牌在轮末弃置。可主动蓄势：本轮支付1行动，下轮多1行动，最多预备1点，正常上限4；不抽牌、不加TP。每人每轮自然获得1TP；打出自己的付费普通牌再得1TP。6TP可使用UB，仍需1行动。普通护盾在敌方阶段结束后清零。</p></section><section><h3>搜索与免费调度</h3><p>指路花1行动，查看实际牌顶，选一张入手、其余置底。每战还可以免费调度一次：选择一张手牌，从当前抽牌堆随机找一张指定角色牌替换，原牌置底；没有对应牌不会消耗次数。</p></section><section><h3>状态可以叠加</h3><p>鼓舞、减攻与破甲数值相加。鼓舞和减攻只在下一次对应单体攻击的首段兑现并消耗；破甲逐层独立到期。咒痕刷新时长，星屑最多3层。迟缓全队最多扣1行动，阻滞最多少抽2张。</p></section><section><h3>伤害顺序很重要</h3><p>物理每段受护甲减免和破甲加成。魔法先消耗有限魔法屏障。星屑最多3层，轮末造成层数伤害再减1。咒痕每轮首次被主动命中额外受2伤；引爆会消耗它。群攻和星屑不吃鼓舞。</p></section><section><h3>看清敌人的意图</h3><p>目标在回合开始时锁定。击杀敌人可以阻止它行动；牵星等减攻只影响下一次单体攻击，挡不住群攻。第7轮起，敌人的伤害会公开逐步增加，战斗不能无限拖延。</p></section><section><h3>沿途做出取舍</h3><p>每幕有普通战、事件、普通或精英分支、营地或商店、Boss，新远征共16节点、10场战斗。战斗胜利时存活者各回复2生命，倒地者恢复至25%最大生命，通过一幕额外恢复35%。营地可选治疗或升级；无用的牌可以跳过奖励或在商店移除。</p></section></div><div class="divider"></div><p class="explain">自动存档保存在此浏览器。新版与旧版存档分开。音频及完整演出可在设置中调整。键盘：1–5选手牌，Enter结束回合，Esc取消。</p>`,'HOW TO PLAY');}
  function showSettings(){modal('声音与演出',`<div class="setting-row"><span>游戏声音<small>音乐、效果音与角色原声</small></span><input type="checkbox" id="setting-audio" ${settings.audio?'checked':''} aria-label="开启游戏声音"></div><div class="setting-row"><span>音量</span><input type="range" id="setting-volume" min="0" max="1" step=".01" value="${settings.volume}" aria-label="游戏音量"></div><div class="setting-row"><span>完整必杀演出<small>短片后接战场特效；Boss命中后即可行动，余音自然播完。快速模式省略视频</small></span><input type="checkbox" id="setting-burst" ${settings.fullBurst?'checked':''} aria-label="完整必杀演出"></div><div class="divider"></div><div class="actions">${bText('查看素材来源','media-info')}${bText('返回标题','return-title')}</div><p class="media-credit" style="margin-top:20px">18名角色均已接入本人的原版短cut-in与必杀配音。短片结束后，剩余语音会自然播完；可在素材页查看每人的来源与接入状态。</p>`,'MAKE YOURSELF COMFORTABLE');}
  function mediaInfo(){const media=window.TowerMedia?.characters||{};modal('角色原声与演出来源',`<p class="muted">角色影音与BGM来自公主连接公开资源清单，原作魔物模型经社区镜像取得并导出完整姿势。各项来源已分别记录；立绘、魔物与影音版权属于 Cygames 等相关权利方。</p><div class="rule-grid">${heroes.map(h=>{const m=media[h.id]?.ub;return `<section><h3>${esc(h.name)}</h3><p>${m?.video?'原版短cut-in已接入':'当前使用立绘演出'} · ${m?.voice?'原版UB配音已接入':'暂无UB原声'}</p>${m?bText('试听UB','audition',`data-id="${h.id}"`,'small'):''}</section>`;}).join('')}</div><div class="divider"></div><p class="media-credit">角色影音、魔物和BGM均有独立来源清单。原作魔物模型与曲目选用不改变本作的战斗数值和剧情。</p>`,'MEDIA CREDITS');}
  function startRun(ids=chosen,seed=null){
    try{stopBossPerformance();run=R.create({heroIds:[...ids],seed:seed||$('seed-input')?.value||Date.now().toString(36)});if(tutorialEnabled)T.begin(run);selected=null;closeModal();save();render();window.scrollTo(0,0);}catch(error){toast(error.message||'无法开始远征');}
  }
  function applyResult(result,{rerender=true}={}){if(result?.ok===false){toast(result.message||'当前无法执行');return false;}if(result?.message)toast(result.message);save();if(rerender)render();return true;}
  function combatLock(value){busy=value;$('app').inert=value;document.querySelector('.topbar').inert=value;document.body.classList.toggle('combat-busy',value);if(value)window.TowerTutorialPointer?.hide();else updateTutorialPointer();}
  async function afterCombat(result,{before=null,owner=null,presented=false,trainingAction=null}={}){
    if(result?.ok===false){toast(result.message);return false;}
    const b=battle(),events=(b.events||[]).slice(before?.events?.length??eventCursor);
    selected=null;hoverTarget=null;spendBlock=0;save();combatLock(true);
    if(!presented){
      try{
        const bossCue=window.TowerBossPerformance?.plan({before,events,cast:window.TowerEncounterCast});let remaining=events;
        if(bossCue){
          const preceding=events.slice(0,bossCue.firstHitIndex);remaining=events.slice(bossCue.firstHitIndex);
          if(preceding.length){activeFeedback=window.TowerFeedback.play({events:preceding,root:$('app')});await activeFeedback;activeFeedback=null;}
          // Cards remain usable during the previous voice tail. Only another
          // Boss cut-in waits for that voice, so two Boss lines never overlap.
          if(activeBossPerformance)await activeBossPerformance;
          stopVoice();if(bgm)bgm.volume=settings.volume*.18;
          let impact=null;
          const performance=window.TowerBossPerformance.play({cue:bossCue,root:$('app'),audio:settings.audio,fullVideo:settings.fullBurst,volume:Math.min(1,settings.volume*2),onVisualComplete:()=>{
            if(impact)return;
            sound('burst');impact=window.TowerFeedback.play({events:remaining,root:$('app'),before,after:b,owner,boss:bossCue});activeFeedback=impact;
          }});
          activeBossPerformance=performance;
          performance.then(()=>{if(activeBossPerformance===performance){activeBossPerformance=null;refreshBgmVolume();}});
          await (performance.visualDone||performance);
          if(impact){await impact;remaining=[];activeFeedback=null;}
          refreshBgmVolume();
        }
        if(remaining.some(e=>e.type==='hit'))sound('attack');else if(remaining.some(e=>e.type==='heal'))sound('heal');
        activeFeedback=window.TowerFeedback.play({events:remaining,root:$('app'),before,after:b,owner,boss:bossCue});await activeFeedback;
      }catch(_){toast('这次效果未能显示，战斗已正常结算。');}
      activeFeedback=null;refreshBgmVolume();
    }
    if(teaching()&&trainingAction){const step=T.advance(run,trainingAction);if(!step.ok)toast(step.message);}
    if(!teaching()&&b.status!=='active')R.finishBattle(run);
    combatLock(false);save();render();if(teaching())scrollLesson();
    return true;
  }
  function performAction(invoke,meta={}){
    if(busy||!battle())return;
    if(teaching()&&meta.trainingAction){const checked=T.validate(run,meta.trainingAction);if(!checked.ok){toast(checked.message);return;}}
    const before=clone(battle()),result=invoke();
    if(result?.ok!==false&&teaching()&&meta.trainingAction)T.advance(run,meta.trainingAction);
    return afterCombat(result,{...meta,trainingAction:null,before});
  }
  function playTarget(id){
    if(!selected||busy||!battle())return;
    const action=selected.kind==='burst'?{kind:'burst',owner:selected.heroId,target:id}:{kind:'card',uid:selected.uid,owner:C.cards[battle().hand.find(c=>c.uid===selected.uid)?.defId]?.owner,target:id};
    if(teaching()){const checked=T.validate(run,action);if(!checked.ok){toast(checked.message);return;}}
    if(selected.kind==='burst'){
      const heroId=selected.heroId,before=clone(battle()),r=E.burst(battle(),heroId,id,{consumeCurse});if(r.ok===false){toast(r.message);return;}
      if(teaching())T.advance(run,action);
      selected=null;save();burstAnimation(heroId,{before,events:battle().events.slice(before.events.length)},()=>afterCombat(r,{before,owner:heroId,presented:true}));
    }else{
      sound('card');const cardUid=selected.uid;
      performAction(()=>E.play(battle(),cardUid,id,{spendBlock,consumeCurse}),{owner:action.owner,trainingAction:action});
    }
  }

  function selectCard(id){
    if(busy||battle()?.pending)return;
    const c=battle()?.hand.find(c=>c.uid===id);if(!c)return;
    const v=cardView(c);if(teaching()){const step=T.expected(run);if(step.kind!=='card'||step.uid!==id){toast('请先完成高亮提示的这一步。');return;}}if(v.cost>battle().energy){toast('本轮行动不足。');return;}
    if(selected?.uid===id){selected=null;render();return;}selected={kind:'card',uid:id};spendBlock=0;consumeCurse=true;
    if(['none','self','allEnemies'].includes(v.target)){playTarget(v.target==='self'?v.owner:null);return;}render();
  }
  function turnForecast(){
    const p=E.previewEndTurn(battle());if(!p.ok){toast(p.message);return;}
    const after=p.after, before=p.before;
    const party=before.party.map(h=>{const a=after.party.find(x=>x.id===h.id);return `<p><strong>${esc(C.heroes[h.id].name)}</strong>：${h.hp} → ${a.hp} 生命${a.hp===h.hp?' · 本轮不会掉血':''}${a.hp<=0?' · 将倒下':''}</p>`;}).join('');
    const stars=after.events.slice(before.events.length).filter(e=>e.source==='starlight_ward'&&e.type==='block').map(e=>`星光护符先为${C.heroes[e.target]?.name||'队友'}提供${e.amount}盾。`).join('');
    modal('如果现在结束回合',`<p class="muted" style="font-size:12px">按当前护盾、星屑、减攻、掩护与锁定目标结算。继续出牌后，结果也会变化；预览不会消耗资源或改变真实牌序。</p><div class="forecast">${party}${stars?`<p>${esc(stars)}</p>`:''}<p>${after.status==='won'?'敌方倒下，战斗胜利。':after.status==='lost'?'全队将倒地，本次远征将失败。':'敌方行动结束后进入下一轮。'}</p></div>`,'READ THE NEXT MOVE');
  }
  function burstAnimation(id,{before,events},done){
    stopVoice();
    if(activePresentation)activePresentation.cancel();
    const session=++burstSession;let cancelled=false,localEffects=null;const current=()=>!cancelled&&session===burstSession;
    combatLock(true);
    const h=C.heroes[id],m=window.TowerMedia?.characters[id]?.ub,layer=$('burst-overlay'),video=$('burst-video');
    if(voice){voice.pause();voice.onended=null;voice=null;}
    $('burst-name').textContent=h.burst.name;$('burst-hero').textContent=h.name;$('burst-portrait').src=heroArt(h);
    layer.classList.remove('returning');layer.hidden=false;layer.dataset.completionReason='';
    const fullVideo=!!(settings.fullBurst&&m?.video);
    video.hidden=!fullVideo;$('burst-portrait').hidden=fullVideo;$('burst-status').textContent='必杀即将发动';
    if(bgm)bgm.volume=settings.volume*.18;
    const audioPaths=settings.audio?(settings.fullBurst?[m?.cutinVoice,m?.voice]:[m?.voice]).filter(Boolean):[];
    let impactStarted=false,visuals=Promise.resolve();
    function impact(immediate=false){
      if(impactStarted||!current())return visuals;impactStarted=true;
      visuals=(async()=>{
        layer.classList.add('returning');
        if(fullVideo&&!immediate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>setTimeout(resolve,200));
        if(!current())return;
        layer.hidden=true;
        sound(events.some(e=>e.type==='hit')?'burst':'heal');
        try{localEffects=window.TowerFeedback.play({events,root:$('app'),before,after:battle(),owner:id,burst:true});activeFeedback=localEffects;await localEffects;}catch(_){}
        if(!current())return;if(activeFeedback===localEffects)activeFeedback=null;
        document.querySelectorAll('.fighter[data-id]').forEach(el=>{
          const u=battle()?.party.concat(battle()?.enemies||[]).find(x=>uidOf(x)===el.dataset.id);if(!u)return;
          const hp=el.querySelector('.hp-number'),fill=el.querySelector('.hp-track i');
          if(hp)hp.textContent=`${u.hp} / ${u.maxHp}`;if(fill)fill.style.width=`${Math.max(0,u.hp/u.maxHp*100)}%`;
          if(u.hp<=0)el.classList.add('dead');
        });
        const boss=battle()?.enemies.find(e=>e.uid===battle().bossCoreUid),bossFill=$('app').querySelector('.boss-hp-fill');
        if(boss&&bossFill)bossFill.style.width=`${Math.max(0,boss.hp/boss.maxHp*100)}%`;
        const bossNumber=$('app').querySelector('.boss-heading strong');if(boss&&bossNumber)bossNumber.textContent=`${boss.hp} / ${boss.maxHp}`;
      })();
      return visuals;
    }
    activePresentation=window.TowerPresentation.play({video,videoSrc:m?.video,fullVideo,audioPaths,volume:Math.min(1,settings.volume*2),
      onState:s=>{if(!current())return;layer.dataset.videoDone=String(s.videoDone);layer.dataset.audioDone=String(s.audioDone);layer.dataset.playbackPhase=s.phase;$('burst-status').textContent=s.phase==='waiting'?'正在缓冲，可等待或手动跳过':'必杀演出中';$('burst-tail').hidden=!(s.videoDone&&!s.audioDone&&!s.completed);$('burst-tail-name').textContent=h.name+' · 语音演出中';},
      onVideoComplete:()=>impact(),
      onError:()=>toast('部分演出资源未能播放，战斗效果仍会继续。'),
      onComplete:async reason=>{
        layer.dataset.completionReason=reason;
        if(reason==='cancelled'){cancelled=true;localEffects?.cancel?.();if(session===burstSession){layer.hidden=true;$('burst-tail').hidden=true;activePresentation=null;window.finishBurst=null;refreshBossAudio();combatLock(false);}return;}
        await impact(reason==='skipped');
        if(!current())return;
        layer.hidden=true;$('burst-tail').hidden=true;activePresentation=null;window.finishBurst=null;
        refreshBossAudio();
        // Keep the action locked until both the real audio and battle effects finish.
        await done();
      }
    });
    if(activePresentation?.getState().completed)activePresentation=null;
    refreshBossAudio();
    window.finishBurst=()=>activePresentation?.skip();
  }

  function finishTutorial(skipped){const result=T.finish(run,skipped);if(result.ok){tutorialEnabled=false;try{localStorage.setItem(TUTORIAL_SEEN,'done');}catch(_){}selected=null;applyResult(result);window.scrollTo(0,0);}else toast(result.message);}
  function scrollLesson(){const e=T.expected(run);if(e?.kind==='card'){const el=$('app').querySelector(`.card[data-id="${CSS.escape(e.uid)}"]`),hand=el?.parentElement;if(el&&hand){const r=el.getBoundingClientRect(),p=hand.getBoundingClientRect();if(r.left<p.left||r.right>p.right)hand.scrollTo({left:Math.max(0,el.offsetLeft-hand.offsetLeft-8),behavior:'smooth'});}}updateTutorialPointer();}
  function battleInfo(){const b=battle(),enc=C.encounters[b.encounterId]||{};modal('战场详情',`<div class="actions" style="margin-bottom:14px">${bText('完整记录','battle-log','','small')}${bText('结算预览','turn-forecast','','small')}${bText('关键词说明','card-keywords','','small')}</div><p class="muted">${esc(enc.description||'查看当前生命、状态与敌人的下一步行动。')}</p><div class="battle-inspection">${b.party.concat(b.enemies.filter(e=>e.hp>0)).map(u=>`<article><h3>${esc(C.heroes[u.id]?.name||u.name)}</h3><p>生命 ${u.hp} / ${u.maxHp}${C.heroes[u.id]?` · 必杀 ${u.tp}/6 TP`:''}</p><div>${u.hp<=0?'本场退出 · 胜利后以25%生命归队':fighterStatus(u,!!C.heroes[u.id])}</div>${u.intent?`<div class="intent">${intentText(u)}</div>`:''}</article>`).join('')}</div>`,'BATTLE DETAILS');}

  function playBossEntryVoice(){
    const m=bossCast(),layer=$('boss-entry');if(!m||layer.hidden)return;
    const status=$('boss-entry-voice-status'),ready=layer.querySelector('[data-action="boss-ready"]');delete layer.dataset.voiceResult;ready.textContent='跳过登场，开始战斗';status.textContent='登场语音播放中';
    playVoice(m.voice?.path,reason=>{if(layer.hidden)return;layer.dataset.voiceResult=reason;ready.textContent='迎接挑战';status.textContent=reason==='ended'?'登场语音播放完毕':reason==='error'?'语音未能播放，可点击重播原声重试。':'游戏声音已关闭';},{kind:'boss-entry',duck:true,onState:state=>{layer.dataset.voiceState=state.phase;}});
  }
  function showBossEntry(){const m=bossCast();if(!m)return;run.room.introSeen=true;save();const layer=$('boss-entry');layer.style.setProperty('--boss',m.accent||m.color);layer.innerHTML=`<img src="${esc(m.art)}" alt="${esc(m.displayName)}"><div><p class="eyebrow">${inEcho()?'登顶后 · 回响练招':`ACT ${run.act} · 高塔幻影`}</p><h2>${esc(m.displayName)}</h2><h3>${esc(m.title)}</h3><p>${esc(m.entryLine)}</p><div class="actions">${bText('迎接挑战','boss-ready','','primary')}${m.voice?.path?bText('重播原声','boss-voice','','small'):''}</div><p id="boss-entry-voice-status" class="entry-voice-status" role="status"></p></div>`;layer.hidden=false;layer.classList.add('is-entering');combatLock(true);playBossEntryVoice();}
  function service(invoke,options={}){
    const r=invoke();
    if(r?.pending==='hero'){
      modal('由谁承担遗物匣的反震？',`<p class="muted">选定后一起支付金币与 ${r.hpCost} 生命，再展示遗物三选一。关闭窗口不会扣除资源。</p><div class="reward-cards">${r.heroIds.map(id=>`<button class="relic-card" data-action="pick-payer" data-id="${id}"><img src="${esc(heroIcon(C.heroes[id]))}" alt=""><h3>${esc(C.heroes[id].name)}</h3><p>生命 ${run.hp[id]} → ${run.hp[id]-r.hpCost}</p></button>`).join('')}</div>`,'A REAL PRICE');
      modalContext={type:'payer',onDone:selection=>{if(applyResult(invoke(selection))){closeModal();render();}}};
    }else if(r?.pending){deckModal(r.pending,selection=>{if(applyResult(invoke(selection))){closeModal();render();}},null,options);}else applyResult(r);
  }
  function redrawModal(){const b=battle();if(!b||b.pending)return;modal('免费调度 · 每战一次',`<p class="muted" style="font-size:12px">选一张手牌，再选想找的角色。从当前抽牌堆随机取她的一张牌替换，原牌放牌底。当前没有她的牌时，不消耗次数。</p><label class="seed-field">想找谁的牌 <select id="redraw-hero" style="background:#18243a;padding:8px;border-radius:4px">${b.party.map(h=>`<option value="${h.id}">${esc(C.heroes[h.id].name)}（牌库${b.drawPile.filter(c=>C.cards[c.defId].owner===h.id).length}张）</option>`).join('')}</select></label><div class="reward-cards">${b.hand.map(c=>cardHTML(c,'redraw-card')).join('')}</div>`,'A SMALL CHANGE');}
  document.addEventListener('click',event=>{
    const el=event.target.closest('[data-action]');if(!el)return;const a=el.dataset.action,id=el.dataset.id,index=Number(el.dataset.index);
    if(busy&&!['skip-burst','boss-ready','boss-voice'].includes(a))return;
    if(a==='boss-ready'){stopVoice();$('boss-entry').hidden=true;combatLock(false);return;}
    if(a==='boss-voice'){playBossEntryVoice();return;}
    if(a==='merchant-voice'){playVoice(window.TowerEncounterCast?.merchant?.voice?.path);return;}
    if(a==='tutorial-info'){const n=T.info(run);if(n)modal(n.title,`<p class="muted">${esc(n.text)}</p>`,'配合练习 '+n.step+'/9');return;}
    if(a==='tutorial-next'){T.advance(run,{kind:'intro'});save();render();scrollLesson();return;}
    if(a==='tutorial-skip'){finishTutorial(true);return;}
    if(a==='tutorial-finish'){finishTutorial(false);return;}
    if(a==='close-modal'){if(battle()?.pending)toast('请先完成已经揭示的卡牌选择。');else closeModal();return;}
    if(a==='home'||a==='return-title'){stopBossPerformance();stopVoice();closeModal();if(run)save();run=null;screen='home';render();return;}
    if(a==='new-run'){stopBossPerformance();stopVoice();closeModal();if(run)save();run=null;screen='setup';render();window.scrollTo(0,0);return;}
    if(a==='continue'){if(saved&&[2,3].includes(saved.version)){try{run=R.normalize(clone(saved));if(run.battle)E.normalizeBattle(run.battle);save();render();}catch(_){toast('存档暂时无法恢复，原记录仍保留。');}}else toast('没有可恢复的远征存档。');return;}
    if(a==='toggle-hero'){const i=chosen.indexOf(id);if(i>=0)chosen.splice(i,1);else if(chosen.length<3)chosen.push(id);else{toast('先取消一名伙伴，再选择新的同行者。');return;}render();return;}
    if(a==='preset'){chosen=[...C.teams[index].ids];render();toast(C.teams[index].text);return;}
    if(a==='move-hero'){[chosen[index-1],chosen[index]]=[chosen[index],chosen[index-1]];render();return;}
    if(a==='start-run'){startRun();return;}
    if(a==='retry'){const ids=[...run.heroIds],seed=run.seed;chosen=ids;startRun(ids,seed);return;}
    if(a==='hero-info'){const h=C.heroes[id];modal(h.name,`<p class="eyebrow">${esc(h.role)} · ${h.hp} HP</p><p class="muted">${esc(h.passive)}</p><p class="explain">UB · ${esc(h.burst.name)}：${esc(h.burst.text)}</p><div class="reward-cards">${definitions.filter(c=>c.owner===id&&c.starter).map(c=>cardHTML({uid:c.id,defId:c.id,branch:null},'inspect-card')).join('')}</div>`,'A COMPANION FOR THE JOURNEY');return;}
    if(a==='deck'){deckModal();return;}if(a==='rules'){rules();return;}if(a==='settings'){showSettings();return;}if(a==='media-info'){mediaInfo();return;}if(a==='audition'){playVoice(window.TowerMedia?.characters[id]?.ub.voice);return;}
    if(a==='relic-info'){const r=C.relics[id];modal(r.name,`<div class="relic-detail"><span class="relic-art-box"><img src="${esc(r.art)}" alt=""></span><p class="muted rule-copy">${esc(r.text)}</p></div>`,'A GIFT FOR THE JOURNEY');return;}
    if(a==='enter-room'){selected=null;merchantLine='';merchantEntering=id==='shop';const entered=applyResult(R.enter(run,id));merchantEntering=false;if(entered&&screen==='shop')playVoice(window.TowerEncounterCast?.merchant?.voice?.path);window.scrollTo(0,0);return;}
    if(a==='swap-open'){swapModal(index);return;}
    if(a==='swap-select-old'){confirmSwap(id);return;}
    if(a==='swap-confirm'){const result=R.swapReward(run,index,id);if(result.ok)closeModal();applyResult(result);return;}
    if(a==='echo-start'){const result=R.startEcho(run,id);selected=null;applyResult(result);return;}
    if(a==='echo-exit'){modal('结束这场回响？',`<p class="muted">你的主线已经登顶。结束后保留主线通关、金币、牌组与遗物；本局不能再次开启回响。</p><div class="actions">${bText('结束回响，保留登顶','echo-exit-confirm','','primary')}${bText('继续这场挑战','close-modal')}</div>`,'主线战果不受影响');return;}
    if(a==='echo-exit-confirm'){const result=R.exitEcho(run);if(result.ok){stopBossPerformance();selected=null;closeModal();}applyResult(result);return;}
    if(a==='select-card'){selectCard(id);return;}if(a==='cancel-select'){selected=null;render();return;}
    if(a==='target'){if(selectedTargets().includes(id))playTarget(id);return;}
    if(a==='select-burst'){if(teaching()){const step=T.expected(run);if(step.kind!=='burst'||step.owner!==id){toast('先体验高亮伙伴的必杀。');return;}}selected={kind:'burst',heroId:id};consumeCurse=true;render();return;}
    if(a==='confirm-burst'){const h=C.heroes[selected?.heroId];if(h)playTarget(h.burst.target==='self'?selected.heroId:null);return;}
    if(a==='test-victory'){if(window.TowerBuild?.testTools!==true)return;const result=window.TowerTestTools?.grantVictory(run);if(!result)return;selected=null;if(result.ok)closeModal();applyResult(result);return;}
    if(a==='reserve-energy'){if(!teaching()){selected=null;performAction(()=>E.reserveEnergy(battle()));}return;}
    if(a==='card-keywords'){keywordsModal();return;}
    if(a==='end-turn'){selected=null;performAction(()=>E.endTurn(battle()),{trainingAction:{kind:'endTurn'}});return;}
    if(['choose-guide','choose-redraw','choose-recover','finish-recover'].includes(a)){performAction(()=>{const r=a==='choose-guide'?E.chooseGuide(battle(),id):a==='choose-redraw'?E.chooseRedraw(battle(),id):E.chooseRecoverTop(battle(),a==='finish-recover'?null:id);if(r.ok!==false)closeModal();return r;});return;}
    if(a==='redraw'){if(!teaching())redrawModal();return;}if(a==='redraw-card'){const heroId=$('redraw-hero').value;performAction(()=>{const r=E.redraw(battle(),id,heroId);if(r.ok!==false)closeModal();return r;});return;}
    if(a==='battle-pile'){deckModal('view',null,el.dataset.pile);return;}
    if(a==='battle-info'){battleInfo();return;}
    if(a==='battle-log'){modal('这场战斗的完整记录',`<div class="explain">${battle().log.map(t=>`<p>${esc(typeof t==='string'?t:t.text||JSON.stringify(t))}</p>`).join('')}</div>`,'BATTLE HISTORY');return;}
    if(a==='turn-forecast'){if($('modal').open)closeModal();turnForecast();return;}
    if(a==='take-reward'||a==='skip-reward'){
      if(a==='take-reward'&&run.reward.type==='upgrade'){
        const card=run.deck.find(c=>c.uid===run.reward.options[index]);
        if(card)branchModal(card,selection=>{if(applyResult(R.takeReward(run,index,{branch:selection.branch}))){closeModal();render();}});
      }else applyResult(R.takeReward(run,a==='skip-reward'?'skip':index));return;
    }
    if(a==='event-choice'){service(selection=>R.eventChoice(run,index,selection),{hpCost:run.room.event.choices[index].hpCost});return;}
    if(a==='camp-heal'){applyResult(R.camp(run,'heal'));return;}if(a==='camp-upgrade'){service(selection=>R.camp(run,'upgrade',selection));return;}
    if(a==='buy'){service(selection=>{const r=R.buy(run,id,selection);if(r.ok&&!r.pending)merchantLine=id==='heal'?'补给准备好了。休息一下，再出发吧。':id==='upgrade'?'练习的成果，一定会在下一场派上用场。':id==='remove'?'轻装前进，也是一种很好的选择。':'已经替你装进行囊了，愿它成为你的助力。';return r;});return;}if(a==='leave-shop'){stopVoice();applyResult(R.leaveShop(run));return;}
    if(a==='pick-payer'){modalContext?.onDone?.({heroId:id});return;}
    if(a==='pick-deck-card'){const ctx=modalContext,card=ctx.source.find(c=>c.uid===id);if(ctx.mode==='upgrade')branchModal(card,s=>ctx.onDone(s),ctx.options);else ctx.onDone({cardUid:id});return;}
    if(a==='pick-branch'){const ctx=modalContext;ctx.done({cardUid:ctx.card.uid,branch:el.dataset.branch});return;}
    if(a==='inspect-card'){const card=run?.deck.find(c=>c.uid===id)||{uid:id,defId:id,branch:null},d=C.cards[card.defId];if(d){const v=cardView(card);modal(v.name,`<p class="muted rule-copy">${esc(v.text)}</p>${bText('关键词说明','card-keywords','','small')}<div class="upgrade-branches">${['A','B'].map(branch=>`<div>${cardHTML({...card,branch},'noop','','reward-card',{...d,...d.branches[branch]})}<p class="branch-full-copy rule-copy">${esc(d.branches[branch].text)}</p></div>`).join('')}</div>`,'CARD & UPGRADE BRANCHES');}return;}
    if(a==='skip-burst'){window.finishBurst?.();}
  });
  document.addEventListener('input',event=>{const el=event.target;if(el.id==='tutorial-enabled')tutorialEnabled=el.checked;if(el.id==='spend-block'){spendBlock=Number(el.value);el.nextElementSibling.textContent=spendBlock;el.closest('.combat-choice').querySelector('summary').textContent='耗盾 '+spendBlock;}if(el.id==='consume-curse'){consumeCurse=el.checked;el.closest('.combat-choice').querySelector('summary').textContent=consumeCurse?'引爆咒痕':'保留咒痕';}if(el.id.startsWith('setting-')){if(el.id==='setting-audio')settings.audio=el.checked;if(el.id==='setting-burst')settings.fullBurst=el.checked;if(el.id==='setting-volume')settings.volume=Number(el.value);if(bgm){refreshBgmVolume();settings.audio?bgm.play().catch(()=>{}):bgm.pause();}refreshBossAudio();if(voiceController)voiceController.setVolume(Math.min(1,settings.volume*2));if(voice&&!settings.audio)stopVoice();try{localStorage.setItem(SETTINGS,JSON.stringify(settings));}catch(_){}}});
  document.addEventListener('keydown',event=>{
    const target=event.target.closest('[data-action="target"]');
    if(target&&['Enter',' '].includes(event.key)&&selectedTargets().includes(target.dataset.id)){event.preventDefault();playTarget(target.dataset.id);return;}
    if(event.key==='Escape'){
      if(!$('boss-entry').hidden){stopVoice();$('boss-entry').hidden=true;combatLock(false);return;}
      if(busy){window.finishBurst?.();return;}
      if(battle()?.pending){event.preventDefault();return;}selected=null;
      if($('modal').open)closeModal();else if(screen==='battle')render();return;
    }
    if(event.target.matches('input,select,textarea')||$('modal').open||busy||screen!=='battle')return;
    if(/^[1-5]$/.test(event.key)){const c=visibleHand()[Number(event.key)-1];if(c)selectCard(c.uid);}
    if(event.key==='Enter'&&!event.target.closest('button')){event.preventDefault();selected=null;performAction(()=>E.endTurn(battle()),{trainingAction:{kind:'endTurn'}});}
  });
  $('modal').addEventListener('cancel',event=>{if(battle()?.pending){event.preventDefault();toast('请先完成已经揭示的卡牌选择。');}});
  $('modal').addEventListener('close',updateTutorialPointer);
  window.addEventListener('pagehide',()=>{stopBossPerformance();window.TowerTutorialPointer?.destroy();});
  window.addEventListener('pageshow',updateTutorialPointer);
  window.TowerApp = {getRun:()=>run,getScreen:()=>screen,startRun,render,save};
  render();
})();
