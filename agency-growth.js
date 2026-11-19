/* KILL COIN / THE AGENCY 2.0 recruitment cards and secure intake status */
(()=>{'use strict';
const personnel={
 blackout:{name:'BLACKOUT',className:'THE VETERAN',role:'FIELD OPERATIVE',description:'Decades in the trenches. Never breaks protocol.',serial:'001'},
 vesper:{name:'VESPER',className:'THE STRATEGIST',role:'STRATEGY DIVISION',description:'Sees the collapse before the first candle.',serial:'002'},
 sable:{name:'SABLE',className:'INTELLIGENCE',role:'INTELLIGENCE DIVISION',description:'Every contract begins with information.',serial:'003'}
};
let chosen=null;
const $=s=>document.querySelector(s);
const cards=[...document.querySelectorAll('[data-recruit-agent]')];
const status=$('#recruitSelectionStatus');
const badge=$('#recruitBadgeDownload');
const share=$('#recruitShareX');
for(const card of cards){
 const id=card.dataset.recruitAgent;
 const galleryButton=$('.agent-download[data-agent="'+id+'"]');
 const portrait=galleryButton?.closest('.agent-card')?.querySelector('.agent-portrait img');
 const dest=card.querySelector('.recruit-photo img');
 if(portrait&&dest){dest.src=portrait.src;dest.alt=personnel[id].name+' — Agency operative portrait'}
 card.querySelector('.recruit-pick')?.addEventListener('click',()=>choose(id));
}
function choose(id){
 if(!personnel[id])return;
 chosen=id;
 cards.forEach(c=>{const yes=c.dataset.recruitAgent===id;c.dataset.active=String(yes);c.querySelector('.recruit-pick')?.setAttribute('aria-pressed',String(yes));c.querySelector('.recruit-pick').textContent=yes?'OPERATIVE SELECTED ✓':'CHOOSE '+personnel[c.dataset.recruitAgent].name});
 status.innerHTML='<strong>FILE OPENED / '+personnel[id].name+'</strong><p>'+personnel[id].className+' · Your operative selection is saved on this device. No account or token required.</p>';
 badge.disabled=false;share.disabled=false;
 try{localStorage.setItem('killcoin.recruit.selected.v1',id)}catch(_e){}
}
try{const remembered=localStorage.getItem('killcoin.recruit.selected.v1');if(personnel[remembered])choose(remembered)}catch(_e){}
function makeBadge(){
 if(!chosen)return null;
 const p=personnel[chosen],canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;const ctx=canvas.getContext('2d');if(!ctx)return null;
 let grad=ctx.createLinearGradient(0,0,1200,630);grad.addColorStop(0,'#0d0b0f');grad.addColorStop(.55,'#24131a');grad.addColorStop(1,'#09090b');ctx.fillStyle=grad;ctx.fillRect(0,0,1200,630);
 ctx.strokeStyle='rgba(187,133,89,.18)';for(let x=0;x<1200;x+=47){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,630);ctx.stroke()}
 const portrait=$('[data-recruit-agent="'+chosen+'"] .recruit-photo img');
 if(portrait&&portrait.complete&&portrait.naturalWidth){
  ctx.save();ctx.beginPath();ctx.rect(765,50,385,530);ctx.clip();
  const iw=portrait.naturalWidth,ih=portrait.naturalHeight,r=Math.max(385/iw,530/ih);ctx.drawImage(portrait,765+(385-iw*r)/2,50+(530-ih*r)/2,iw*r,ih*r);
  ctx.restore();const shade=ctx.createLinearGradient(760,0,1160,0);shade.addColorStop(0,'rgba(13,11,15,.85)');shade.addColorStop(.35,'rgba(13,11,15,.1)');shade.addColorStop(1,'rgba(13,11,15,0)');ctx.fillStyle=shade;ctx.fillRect(740,50,420,530);
 }
 ctx.strokeStyle='#b38a54';ctx.lineWidth=3;ctx.strokeRect(35,35,1130,560);
 ctx.fillStyle='#d7ae78';ctx.font='bold 24px Arial';ctx.fillText('KILL COIN / THE AGENCY',75,96);
 ctx.fillStyle='#eeeeeb';ctx.font='bold 62px Impact,Arial Black,Arial';ctx.fillText('CLEARANCE',75,220);ctx.fillText('GRANTED',75,290);
 ctx.fillStyle='#dfb16e';ctx.font='bold 59px Impact,Arial Black,Arial';ctx.fillText(p.name,75,385);
 ctx.fillStyle='#d5c2c1';ctx.font='bold 24px Arial';ctx.fillText(p.role,78,432);
 ctx.fillStyle='#b9a9aa';ctx.font='19px Arial';ctx.fillText('THE TRENCHES HAVE AN AGENCY NOW.',78,515);
 ctx.fillText('x.com/hitlist187   •   #KillCoin #Hitlist',78,552);
 ctx.fillStyle='#d2a96e';ctx.font='bold 18px Arial';ctx.fillText('AGENT / '+p.serial,990,101);
 return canvas;
}
badge?.addEventListener('click',()=>{
 const canvas=makeBadge();if(!canvas)return;
 try{const a=document.createElement('a');a.href=canvas.toDataURL('image/png');a.download='KILLCOIN-RECRUIT-'+personnel[chosen].name+'.png';document.body.appendChild(a);a.click();a.remove();}catch(_e){status.innerHTML='<strong>CARD COULD NOT BE EXPORTED</strong><p>Please try again in a different browser.</p>';}
});
share?.addEventListener('click',()=>{
 if(!chosen)return;
 const p=personnel[chosen];
 const msg='I chose '+p.name+' / '+p.className+' in THE AGENCY. The trenches have an agency now. Choose your operative: https://egoshiftlabs.github.io/Killcoin/#recruit @hitlist187 #KillCoin #Hitlist';
 window.open('https://x.com/intent/tweet?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
});
const form=$('#secureNominationLink'),gate=$('#nominationGateStatus');
if(form&&gate){
 const url=(form.dataset.formUrl||'').trim();
 if(/^https:\/\/docs\.google\.com\/forms\/d\//.test(url)&&/viewform(?:[?#]|$)/.test(url)){
  form.href=url;form.hidden=false;gate.textContent='SECURE INTAKE OPEN — Submit using the Google Form. Your response is stored in the private review queue after Google confirms it; publication requires editorial approval.';
 }else{
  form.hidden=true;gate.textContent='SECURE INTAKE SETUP IN PROGRESS — We are not accepting site nominations until the private submission form is verified. No case has been filed from this page.';
 }
}
})();
