// Killcoin Agency Registry: same-origin curated JSON only. The private Google Forms response sheet is NEVER queried here.
const $=id=>document.getElementById(id),search=$("caseSearch"),filter=$("caseFilter"),list=$("caseList"),message=$("registryStatus"),count=$("caseCount");
let entries=[];
function elm(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;}
function validLink(value){try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)?u.href:null;}catch{return null;}}
function info(parent,label,value){if(!value)return;const row=elm("div","meta-row");row.append(elm("b",null,label+"  "));row.append(document.createTextNode(String(value)));parent.append(row);}
function render(){
 const term=search.value.trim().toLowerCase(),status=filter.value;
 const match=entries.filter(c=>(status==="all"||c.status===status)&&(!term||[c.target,c.ticker,c.chain,c.contract,c.allegedOffense,c.caseId].join(" ").toLowerCase().includes(term)));
 list.replaceChildren();
 message.hidden=match.length>0;
 if(!match.length){message.replaceChildren(elm("strong",null,entries.length?"NO CASES MATCH THE SEARCH.":"NO PUBLIC NOMINEES YET."),elm("p",null,entries.length?"Try a different filter or search term.":"The public registry has not received an approved case. Nominations remain in a separate private review process. No submissions are published automatically."));return;}
 for(const c of match){
  const card=elm("article","case");
  const top=elm("div","case-top");top.append(elm("span",null,"CASE / "+c.caseId),elm("span","state",c.status));card.append(top);
  card.append(elm("h3",null,c.target),elm("div","subtitle",[c.ticker,c.chain].filter(Boolean).join(" · ")),elm("p","charge",c.allegedOffense));
  const meta=elm("div","meta");info(meta,"CONTRACT",c.contract);info(meta,"PUBLICATION",c.approvedAt);
  const href=validLink(c.evidenceUrl);if(href){const a=elm("a",null,"VIEW PUBLIC EVIDENCE ↗");a.href=href;a.target="_blank";a.rel="noopener noreferrer nofollow";meta.append(a);}card.append(meta);list.append(card);
 }
}
function normalize(c){
 if(!c||typeof c!=="object")return null;
 const o={caseId:String(c.caseId||"").slice(0,60),target:String(c.target||"").slice(0,120),ticker:String(c.ticker||"").slice(0,25),chain:String(c.chain||"").slice(0,40),
 contract:String(c.contract||"").slice(0,150),allegedOffense:String(c.allegedOffense||"").slice(0,700),evidenceUrl:String(c.evidenceUrl||"").slice(0,2048),
 status:String(c.status||"").toUpperCase(),approvedAt:String(c.approvedAt||"").slice(0,40)};
 if(!o.target||!o.caseId||!o.allegedOffense||!validLink(o.evidenceUrl)||!["ACTIVE","UNDER SURVEILLANCE","ARCHIVED"].includes(o.status))return null;
 return o;
}
async function load(){
 message.hidden=false;message.replaceChildren(elm("strong",null,"READING PUBLIC CASE RECORDS…"));count.textContent="—";
 try{
  const response=await fetch("../data/approved-nominees.json",{cache:"no-store"});if(!response.ok)throw Error("Registry file unavailable");
  const payload=await response.json();if(payload.schema!=="hitlist.approved-registry.v1"||!Array.isArray(payload.cases))throw Error("Invalid registry format");
  entries=payload.cases.slice(0,200).map(normalize).filter(Boolean);count.textContent=String(entries.length).padStart(2,"0");render();
 }catch(err){message.hidden=false;message.replaceChildren(elm("strong",null,"REGISTRY TEMPORARILY UNAVAILABLE"),elm("p",null,"The public case feed could not be loaded. Private nominations have not been exposed."));}
}
search.addEventListener("input",render);filter.addEventListener("change",render);load();