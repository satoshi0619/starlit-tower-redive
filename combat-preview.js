(function(root,factory){
  'use strict';
  var api=typeof module==='object'&&module.exports?factory(require('./combat-engine.js'),require('./content.js')):factory(root.TowerCombat,root.TowerContent);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TowerCombatPreview=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(initialEngine,initialContent){
  'use strict';
  var clone=function(value){return JSON.parse(JSON.stringify(value));};
  var supported=['hit','heavy','curseHit','block','heal','tp','cleanse','cover','buff','guide','draw','payHp','consumeBreak','stripBarrier','recover','debuff','break','weak','curse','stars','starPulse','dispel'];
  var labels={buff:'鼓舞',breakAmount:'破甲',weak:'减攻',stars:'星屑',barrier:'魔盾',armor:'护甲',attackBuff:'强化',curseTurns:'咒痕剩余轮数',coverFrom:'掩护',vulnerable:'破绽',slow:'迟缓',clog:'阻滞',poison:'毒'};
  var number=function(value){return typeof value==='number'&&Number.isFinite(value)?value:0;};
  var uid=function(unit){return unit.uid||unit.id;};
  function create(deps){
    deps=deps||{};var E=deps.engine||initialEngine,C=deps.content||initialContent;
    function state(unit,round){
      var values={};
      ['buff','breakAmount','weak','stars','barrier','armor','attackBuff'].forEach(function(key){values[key]=number(unit[key]);});
      values.curseTurns=unit.curseExpires>0?Math.max(0,unit.curseExpires-round+1):0;
      values.coverFrom=unit.coverFrom?String(C.heroes[unit.coverFrom]?.name||unit.coverFrom):'';
      ['vulnerable','slow','clog','poison'].forEach(function(type){values[type]=(unit.debuffs||[]).filter(function(layer){return layer.type===type&&layer.expires>=round;}).reduce(function(total,layer){return total+number(layer.amount);},0);});
      return values;
    }
    function change(before,after){return {before:number(before),after:number(after),delta:number(after)-number(before)};}
    function publicUnits(before,after,partyOnly){
      var sources=(before.party||[]).concat(partyOnly?[]:before.enemies||[]),next=(after.party||[]).concat(after.enemies||[]);
      return sources.map(function(unit){
        var target=next.find(function(other){return uid(other)===uid(unit);})||unit;
        var old=state(unit,before.round),current=state(target,after.round),statuses=[];
        Object.keys(old).forEach(function(key){if(old[key]!==current[key])statuses.push({key:key,label:labels[key],before:old[key],after:current[key]});});
        var hp=change(unit.hp,target.hp),block=change(unit.block,target.block),tp=change(unit.tp,target.tp);
        return {uid:String(uid(unit)),name:String(C.heroes[unit.id]?.name||unit.name||unit.id),side:(before.party||[]).some(function(h){return uid(h)===uid(unit);})?'party':'enemy',hp:hp,block:block,tp:tp,statuses:statuses,changed:!!(hp.delta||block.delta||tp.delta||statuses.length)};
      });
    }
    function fail(message){return {ok:false,summary:message||'当前无法预览。',units:[],notice:''};}
    function reserveView(b){
      var damaged=!!(b&&(typeof E.hasReserveDamage==='function'?E.hasReserveDamage(b):b.flags?.reserveDamaged)),state=b?.flags?.reserveBroken?'broken':damaged?'damaged':b?.energyReserve?'reserved':b?.flags?.reserveUsed?'used':'ready';
      var views={
        ready:{label:'蓄势 −1',detail:'无伤下轮 +1',message:'支付1行动；本轮任一队员受到生命伤害就不能保住蓄势。护盾挡完不算，主动付血不算；毒和反伤计入。'},
        reserved:{label:'蓄势中',detail:'无伤下轮 +1',message:'已支付1行动；本轮之后任一队员受到生命伤害，蓄势就会打断，下轮不加行动，已支付的行动不退还。'},
        damaged:{label:'本轮受伤',detail:'无法蓄势',message:'本轮已有队员受到生命伤害，不能蓄势；之后治疗也不会恢复本轮资格。'},
        broken:{label:'蓄势已断',detail:'下轮 +0',message:'队员受到生命伤害，蓄势已打断；下轮不加行动，已支付的1行动不退还，本轮不能重新蓄势。'},
        used:{label:'本轮已用',detail:'不能再蓄势',message:'本轮已经使用过蓄势，不能再次使用。'}
      },view=views[state];
      return {state:state,label:view.label,detail:view.detail,message:view.message,disabled:state!=='ready'||!b||b.status!=='active'||!(b.energy>=1)||!!b.pending};
    }
    function reserveForecast(before,after,kind){
      var events=(after.events||[]).slice((before.events||[]).length),wasReserved=!!before.energyReserve,broken=events.some(function(event){return event.type==='reserveBroken';});
      if(wasReserved&&after.status!=='active')return {state:'finished',text:'战斗结束，不结转蓄势行动'};
      if(broken)return {state:'broken',text:kind==='turn'?'蓄势将打断，下轮不加行动':'此操作会打断蓄势，下轮不加行动'};
      if(kind==='turn'&&wasReserved){
        if(events.some(function(event){return event.type==='energy'&&event.sourceKind==='reserve'&&event.amount>0;}))return {state:'delivered',text:'蓄势保住，下轮 +1行动'};
      }
      if(kind!=='turn'&&reserveView(before).state==='ready'&&reserveView(after).state==='damaged')return {state:'damaged',text:'此操作后本轮不能蓄势'};
      return null;
    }
    function summarize(units,energy,pendingKind,turn){
      var parts=[];
      units.forEach(function(unit){if(unit.hp.delta)parts.push(unit.name+(unit.hp.delta<0?' −':' +')+Math.abs(unit.hp.delta)+'生命');});
      units.forEach(function(unit){if(unit.block.delta)parts.push(unit.name+(unit.block.delta<0?' −':' +')+Math.abs(unit.block.delta)+'盾');});
      if(parts.length>3)parts=parts.slice(0,3).concat(['其他变化见目标详情']);
      if(!parts.length)parts.push(turn?'三人本轮不会掉血':pendingKind?'出牌后需完成选牌':'生命与护盾不变');
      if(!turn&&energy.spent>0)parts.push('支付'+energy.spent+'行动');
      return parts.join('；');
    }
    function result(before,after,kind,effects){
      var units=publicUnits(before,after,kind==='turn'),energy={before:number(before.energy),after:number(after.energy),spent:kind==='turn'?0:Math.max(0,number(before.energy)-number(after.energy))};
      var pendingKind=after.pending?String(after.pending.type):null;
      var notices=[],reserve=reserveForecast(before,after,kind);
      if((effects||[]).some(function(effect){return effect.type==='draw';}))notices.push('抽到的牌在实际入手后揭示。');
      if(pendingKind==='guide')notices.push('实际出牌后查看候选并选择；此处不揭示牌顶。');
      if(pendingKind==='recoverTop')notices.push('实际出牌后选择弃牌置顶；不立即抽牌。');
      if(kind==='turn')notices.push('仅预览公开战况；不展示下一轮手牌。');
      if(reserve)notices.push(reserve.text+'。');
      return {ok:true,kind:kind,summary:summarize(units,energy,pendingKind,kind==='turn'),units:units,energy:energy,status:String(after.status),pendingKind:pendingKind,reserve:reserve,notice:notices.join(' ')};
    }
    function action(b,spec){
      spec=spec||{};
      if(!b||!E||!C)return fail('当前无法预览。');
      try{
        var before=clone(b),after=clone(b),view,outcome;
        if(spec.kind==='card'){
          var card=(after.hand||[]).find(function(item){return item.uid===spec.uid;});
          if(!card)return fail('卡牌不在手中。');
          view=E.cardView(card,after);
        }else if(spec.kind==='burst')view=C.heroes[spec.heroId]?.burst;
        else return fail('此操作暂不提供预览。');
        if(!view)return fail('当前无法预览。');
        if((view.effects||[]).some(function(effect){return !supported.includes(effect.type);}))return fail('此效果暂不提供准确预览。');
        outcome=spec.kind==='card'?E.play(after,spec.uid,spec.target,clone(spec.options||{})):E.burst(after,spec.heroId,spec.target,clone(spec.options||{}));
        if(!outcome?.ok)return fail(outcome?.message);
        return result(before,after,spec.kind,view.effects);
      }catch(_){return fail('当前无法准确预览，请查看完整规则。');}
    }
    function turn(b){
      if(!b||!E)return fail('当前无法预览。');
      try{var before=clone(b),after=clone(b),outcome=E.endTurn(after);return outcome?.ok?result(before,after,'turn',[]):fail(outcome?.message);}catch(_){return fail('当前无法准确预览，请查看完整规则。');}
    }
    function seenHas(seen,id){return !!(seen&&(typeof seen.has==='function'?seen.has(id):Array.isArray(seen)?seen.includes(id):seen[id]));}
    function hint(b,context){
      context=context||{};
      if(!b||b.status!=='active'||b.pending||context.suppressed||!E||!C)return null;
      var seen=context.seen,before=context.before;
      try{
        if(!seenHas(seen,'buff-consumed')&&before&&before.round===b.round){
          var newEvents=(b.events||[]).slice((before.events||[]).length);
          var consumed=(before.party||[]).find(function(old){
            var now=(b.party||[]).find(function(unit){return uid(unit)===uid(old);});
            return old.buff>0&&now?.hp>0&&!now.buff&&newEvents.some(function(event){return event.type==='hit'&&event.source===uid(old)&&['card','burst'].includes(event.sourceKind);});
          });
          if(consumed)return {id:'buff-consumed',anchor:'statuses',heroId:consumed.id,text:(C.heroes[consumed.id]?.name||consumed.name)+'的鼓舞已用于这次单体攻击的首段，使用后会消耗。'};
        }
        var working=clone(b),hand=working.hand||[],living=(working.party||[]).filter(function(unit){return unit.hp>0;});
        if(!seenHas(seen,'redraw')&&!working.redrawUsed&&!working.flags?.redrawUsed&&hand.length&&living.length){
          var pool=(working.drawPile||[]).some(function(card){return living.some(function(unit){return C.cards[card.defId]?.owner===unit.id;});});
          var blocked=hand.some(function(card){var view=E.cardView(card,working);return view.cost>working.energy||(['enemy','enemyAny','ally','otherAlly'].includes(view.target)&&!E.legalTargets(working,card.uid).length);});
          if(pool&&blocked)return {id:'redraw',anchor:'redraw',text:'每战可免费调度一次：换掉一张手牌，找指定伙伴的随机一张牌。不会消耗行动。'};
        }
        if(!seenHas(seen,'reserve-risk')&&!reserveView(working).disabled&&hand.some(function(card){return E.cardView(card,working).cost>=3;}))return {id:'reserve-risk',anchor:'reserve-energy',text:'蓄势本轮少1行动，无伤撑过本轮后下轮多1行动。任一队员受到生命伤害便无法蓄势或会打断；护盾挡完、主动付血不算。当前手牌轮末仍会弃置。'};
      }catch(_){return null;}
      return null;
    }
    return {action:action,turn:turn,hint:hint,reserveView:reserveView};
  }
  var api=create();api.create=create;return api;
});
