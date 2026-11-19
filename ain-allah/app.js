const $=id=>document.getElementById(id),articles=[...document.querySelectorAll('.evidence')],sections=[...document.querySelectorAll('.section')];
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/(^|[\s—،])بن(?=$|[\s،])/g,'$1ابن').toLowerCase();
const searchable=new Map(articles.map(article=>[article,normalize(article.textContent)]));
function search(){
 const terms=normalize($('search').value.trim()).split(/\s+/).filter(Boolean);let found=0;
 for(const article of articles){const show=terms.every(term=>searchable.get(article).includes(term));article.hidden=!show;if(show)found++;if(terms.length&&show)article.querySelectorAll('.related').forEach(el=>el.open=true)}
 for(const section of sections)section.hidden=![...section.querySelectorAll('.evidence')].some(el=>!el.hidden);
 $('no-results').hidden=found>0;$('result-status').hidden=!terms.length;$('result-status').textContent=terms.length?`${found} ${found===1?'entry':'entries'} found`:'';$('clear-search').hidden=!terms.length;
 document.querySelectorAll('.contents a').forEach(link=>{const section=document.getElementById(link.hash.slice(1));link.hidden=section?.hidden||false});
}
$('search').addEventListener('input',search);$('clear-search').addEventListener('click',()=>{$('search').value='';search();$('search').focus()});
$('language-toggle').addEventListener('click',()=>{const arabic=document.body.classList.toggle('arabic-only');$('language-toggle').setAttribute('aria-pressed',String(arabic));$('language-toggle').textContent=arabic?'Show English':'Arabic only'});
$('reading-toggle').addEventListener('click',()=>{const large=document.body.classList.toggle('large-text');$('reading-toggle').setAttribute('aria-pressed',String(large))});
let printState;
window.addEventListener('beforeprint',()=>{printState={hidden:[...document.querySelectorAll('.section[hidden],.evidence[hidden]')],details:[...document.querySelectorAll('details')].map(d=>[d,d.open])};printState.hidden.forEach(e=>e.hidden=false);printState.details.forEach(([e])=>e.open=true)});
window.addEventListener('afterprint',()=>{if(!printState)return;printState.hidden.forEach(e=>e.hidden=true);printState.details.forEach(([e,open])=>e.open=open);printState=null});
$('print').addEventListener('click',()=>window.print());
let toastTimer;
function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,2600)}
for(const button of document.querySelectorAll('[data-copy]'))button.addEventListener('click',async()=>{const article=document.getElementById(button.dataset.copy);const parts=[article.querySelector('h3').textContent,...[...article.querySelectorAll('blockquote .arabic,blockquote .translation')].map(e=>e.textContent),...([...article.querySelectorAll('.source')].map(a=>`${a.textContent}: ${a.href}`)),...(article.querySelector('.context p')?[`Context: ${article.querySelector('.context p').textContent}`]:[]),`${location.origin}${location.pathname}#${article.id}`];try{await navigator.clipboard.writeText(parts.join('\n\n'));notify('Passage and references copied.')}catch{notify('Copy is unavailable in this browser. Select the passage to copy it.')}});
let queued=false;
function readingPosition(){queued=false;const max=document.documentElement.scrollHeight-innerHeight;$('progress').style.transform=`scaleX(${max>0?scrollY/max:0})`;const visible=sections.filter(s=>!s.hidden);let active=visible[0];const cutoff=parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)+(active?parseFloat(getComputedStyle(active).scrollMarginTop):0)+8;for(const section of visible)if(section.getBoundingClientRect().top<=cutoff)active=section;document.querySelectorAll('.contents a').forEach(link=>{if(link.hash==='#'+active?.id)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current')})}
addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(readingPosition)}},{passive:true});readingPosition();
