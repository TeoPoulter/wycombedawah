export class Queue {
 constructor(ids,random=Math.random){this.ids=[...new Set(ids)];this.random=random;this.bad=new Set;this.bag=[];this.history=[];this.index=-1;this.started=false;this.repeat='all'}
 get current(){return this.history[this.index]||null}
 next(manual=true){
  while(this.index<this.history.length-1){const id=this.history[++this.index];if(!this.bad.has(id))return id}
  if(!this.bag.length){if(this.started&&this.repeat==='off'&&!manual)return null;this.bag=this.ids.filter(id=>!this.bad.has(id));for(let i=this.bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]]}if(this.bag.length>1&&this.bag.at(-1)===this.current)[this.bag[0],this.bag[this.bag.length-1]]=[this.bag.at(-1),this.bag[0]];this.started=true}
  while(this.bag.length){const id=this.bag.pop();if(!this.bad.has(id)){this.history.push(id);this.index=this.history.length-1;return id}}return null
 }
 previous(){while(this.index>0){const id=this.history[--this.index];if(!this.bad.has(id))return id}return this.current}
 reject(id){this.bad.add(id);this.bag=this.bag.filter(x=>x!==id)}
}
