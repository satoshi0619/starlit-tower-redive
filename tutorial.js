(function(root,factory){
  const api=typeof module==='object'&&module.exports?factory(require('./content.js'),require('./combat-engine.js')):factory(root.TowerContent,root.TowerCombat);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TowerTutorial=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,E){
  'use strict';
  const first={pecorine:'pecorine_slash',rei:'rei_break',kokkoro:'kokkoro_buff',kyaru:'kyaru_curse',hatsune:'hatsune_rain',yui:'yui_heal'};
  const priority={kokkoro:0,saren:0,monika:0,nozomi:0,rei:1,makoto:1,kyaru:2,yui:3,shizuru:3,jun:3,hatsune:4,anna:4,alisa:4,suzuna:4,yori:4,kaori:5,miyako:5,pecorine:5};
  function firstCard(run,id){
    if(id==='yui'&&run.heroIds.includes('kokkoro'))return 'yui_light';
    if(first[id])return first[id];
    const candidates=Object.values(C.cards).filter(c=>c.owner===id&&c.starter&&c.cost===1&&!(c.effects||[]).some(e=>['guide','recover'].includes(e.type)));
    const card=candidates.find(c=>(c.tags||[]).includes('attack'))||candidates[0];
    if(!card)throw new Error(C.heroes[id].name+'缺少可用的教学招式。');
    return card.id;
  }
  const lessons={
    pecorine:'佩可一边进攻一边获得护盾，承担前排压力。',rei:'怜先破甲，后续物理攻击会更有效。',
    kokkoro:'可可萝把鼓舞交给队友，让下一次单体攻击更有力。',kyaru:'凯露的魔法能越过前排，先给后排挂上咒痕。',
    hatsune:'初音的星雨同时铺下星痕，适合对付多个敌人。',yui:'优衣把生命补给受伤的伙伴，治疗牌本场使用后会消耗。'
  };
  function active(run){return !!run?.tutorial?.active;}
  function begin(run){
    if(run.act!==1||run.stage!==0||run.screen!=='map')throw new Error('教学仅在出发前开始。');
    const b=E.createBattle({heroIds:run.heroIds.slice(),deck:run.deck,encounterId:'tutorial_gate',relics:[],seed:'three-wishes-tutorial',shuffle:false});
    const all=b.hand.concat(b.drawPile);b.hand=[];b.drawPile=[];
    for(const id of run.heroIds){const i=all.findIndex(c=>c.defId===firstCard(run,id));if(i<0)throw new Error('教学牌不在起始牌组中。');b.hand.push(all.splice(i,1)[0]);}
    b.hand.push(...all.splice(0,2));b.drawPile=all;
    b.party.forEach(h=>h.hp=Math.max(1,h.maxHp-6));
    b.log.push('安全演练：受伤状态仅用于教学，完成或跳过都会恢复远征初始状态。');
    run.battle=b;run.screen='battle';run.tutorial={active:true,phase:'intro',index:0,cardOrder:run.heroIds.slice().sort((a,b)=>(priority[a]??5)-(priority[b]??5)),cardUids:b.hand.slice(0,3).map(c=>c.uid),cards:[],bursts:[]};
    return run;
  }
  function expected(run){
    if(!active(run))return null;
    const t=run.tutorial,b=run.battle,order=t.phase==='cards'?(t.cardOrder||run.heroIds):run.heroIds,id=order[t.index];
    if(t.phase==='intro')return {kind:'intro'};
    if(t.phase==='endTurn')return {kind:'endTurn'};
    if(t.phase==='complete')return {kind:'complete'};
    const targetKind=t.phase==='cards'?C.cards[firstCard(run,id)].target:C.heroes[id].burst.target;
    let target=null;
    if(targetKind==='otherAlly')target=order[(t.index+1)%3];
    else if(targetKind==='ally')target=run.heroIds[0];
    else if(targetKind==='self')target=id;
    else if(targetKind==='enemy')target=b.enemies[0].uid;
    else if(targetKind==='enemyAny')target=b.enemies[1].uid;
    return {kind:t.phase==='cards'?'card':'burst',owner:id,defId:firstCard(run,id),uid:t.cardUids[run.heroIds.indexOf(id)],target};
  }
  function validate(run,action){
    const e=expected(run);if(!e)return {ok:true};
    if(e.kind!==action.kind)return {ok:false,message:'先完成高亮提示的这一步，也可以随时跳过教学。'};
    if(e.kind==='card'&&e.uid!==action.uid)return {ok:false,message:'先使用当前高亮伙伴的卡牌。'};
    if(e.kind==='burst'&&e.owner!==action.owner)return {ok:false,message:'先体验当前高亮伙伴的必杀。'};
    if(['card','burst'].includes(e.kind)&&(action.target??null)!==e.target)return {ok:false,message:'点击高亮目标，体验这张牌的作用。'};
    return {ok:true};
  }
  function advance(run,action){
    const checked=validate(run,action);if(!checked.ok)return checked;
    const t=run.tutorial;if(!t?.active)return {ok:true};
    if(t.phase==='intro')t.phase='cards';
    else if(t.phase==='cards'){
      t.cards.push((t.cardOrder||run.heroIds)[t.index]);t.index++;
      if(t.index===3){t.index=0;t.phase='endTurn';}
    }else if(t.phase==='endTurn'){
      t.phase='bursts';t.index=0;run.battle.energy=3;
      run.battle.party.forEach(h=>h.tp=6);
      run.battle.log.push('练习补给：三人的TP充满。正式战斗需要逐轮积攒，UB仍消耗1行动。');
    }else if(t.phase==='bursts'){
      t.bursts.push(run.heroIds[t.index]);t.index++;
      if(t.index===3){t.index=0;t.phase='complete';}
    }
    return {ok:true};
  }
  function info(run){
    const e=expected(run);if(!e)return null;
    const t=run.tutorial,h=C.heroes[e.owner];
    if(e.kind==='intro')return {step:1,title:'三名伙伴，共用一手牌',text:'头像表示卡牌归属，手牌按队伍顺序排列。每轮有3行动；跟着箭头点击，分别体验三人的工作。受伤状态仅用于练习。',button:'开始配合练习',action:'tutorial-next'};
    if(e.kind==='card')return {step:2+t.index,title:`${h.name} · ${h.role}`,text:(e.defId==='yui_light'?'优衣的微光一边攻击，一边保护受伤队友。群体治疗留给稍后的必杀。':lessons[h.id]||C.cards[e.defId].text)+` 跟随箭头，点击头像为${h.name}的高亮卡${e.target?'，再点击高亮目标':''}。`};
    if(e.kind==='endTurn')return {step:5,title:'看清意图，再结束回合',text:'三张牌刚好用完3行动。敌人上方展示了它的下一步，护盾会先吸收伤害。点击屏幕底部始终可见的“结束回合”。'};
    if(e.kind==='burst')return {step:6+t.index,title:`${h.name} · ${h.burst.name}`,text:`练习已为三人补满TP。点击${h.name}发光的必杀按钮${e.target?'，再点击高亮目标':'，然后确认释放'}。正式战斗需要6TP和1行动。`};
    return {step:9,title:'三人的配合，从这里开始',text:'你已经体验了三人的专属牌和必杀。接下来保留相同三人，挑选奖励、升级与遗物，构筑属于她们的远征。进入正式远征时会清除练习伤势，以满生命出发。',button:'进入正式远征',action:'tutorial-finish'};
  }
  function finish(run,skipped=false){
    if(!active(run))return {ok:false,message:'当前没有进行中的教学。'};
    if(!skipped&&run.tutorial.phase!=='complete')return {ok:false,message:'请先完成练习，或选择跳过。'};
    const cards=run.tutorial.cards.slice(),bursts=run.tutorial.bursts.slice();
    run.tutorial={active:false,completed:!skipped,skipped,cards,bursts};
    run.battle=null;run.room=null;run.screen='map';
    run.history.push({type:'tutorial',completed:!skipped,bursts:bursts.slice(),act:1,stage:0});
    return {ok:true,message:skipped?'已跳过教学，正式远征开始。':'练习完成，三人满状态出发。'};
  }
  return {begin,active,expected,validate,advance,info,finish};
});
