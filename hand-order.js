(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.TowerHandOrder=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function sort(hand,heroIds,cards){
    return hand.map((card,index)=>({card,index,owner:cards[card.defId]?.owner})).sort((a,b)=>{
      const ai=heroIds.indexOf(a.owner),bi=heroIds.indexOf(b.owner);
      return (ai<0?99:ai)-(bi<0?99:bi)||a.index-b.index;
    }).map(x=>x.card);
  }
  return {sort};
});
