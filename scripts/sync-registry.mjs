// HITLIST Agency: Read only a SEPARATE approved-only Google Sheets public CSV, NEVER the private response sheet.
import {readFile,writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";
export function parseCSV(text){
 if(typeof text!=="string")throw Error("Expected CSV text");
 const rows=[];let row=[],value="",quoted=false,str=text.replace(/^\uFEFF/,"");
 for(let i=0;i<str.length;i++){
  const ch=str[i];
  if(quoted){
   if(ch==='"'&&str[i+1]==='"'){value+='"';i++;}
   else if(ch==='"')quoted=false;else value+=ch;
  }else{
   if(ch==='"'){if(value!=="")throw Error("Malformed CSV quotation");quoted=true;}
   else if(ch===","){row.push(value);value="";}
   else if(ch==="\n"||ch==="\r"){row.push(value);value="";if(row.some(v=>v.trim()))rows.push(row);row=[];if(ch==="\r"&&str[i+1]==="\n")i++;}
   else value+=ch;
  }
 }
 if(quoted)throw Error("Unterminated CSV quotation");
 row.push(value);if(row.some(v=>v.trim()))rows.push(row);
 return rows;
}
const mandatory=["case_id","target","alleged_offense","evidence_url","case_status","publish"];
const statuses=new Set(["ACTIVE","UNDER SURVEILLANCE","ARCHIVED"]);
const clean=(value,max)=>String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);
const validHttps=url=>{try{const u=new URL(url);return u.protocol==="https:"&&Boolean(u.hostname)&&!u.username&&!u.password;}catch{return false;}};
export function buildRegistry(csv){
 const rows=parseCSV(csv);
 if(!rows.length)throw Error("CSV has no headers. Refusing to overwrite the public registry.");
 const headers=rows[0].map(x=>x.trim().toLowerCase()),missing=mandatory.filter(x=>!headers.includes(x));
 if(missing.length)throw Error("Public CSV missing columns: "+missing.join(", "));
 if(new Set(headers).size!==headers.length)throw Error("Duplicate CSV headers.");
 const cases=[],seen=new Set();
 for(let i=1;i<rows.length;i++){
  const raw=Object.fromEntries(headers.map((h,j)=>[h,rows[i][j]??""]));
  if(clean(raw.publish,10).toUpperCase()!=="YES")continue;
  const c={caseId:clean(raw.case_id,60),target:clean(raw.target,120),ticker:clean(raw.ticker,25),chain:clean(raw.chain,40),
   contract:clean(raw.contract,150),allegedOffense:clean(raw.alleged_offense,700),evidenceUrl:clean(raw.evidence_url,2048),
   status:clean(raw.case_status,30).toUpperCase(),approvedAt:clean(raw.approved_at,40),nominationCount:0};
  const rawCount=clean(raw.nomination_count,20);
  if(rawCount){
   if(!/^(0|[1-9][0-9]{0,5})$/.test(rawCount))throw Error("Invalid nomination_count at CSV row "+(i+1));
   c.nominationCount=Number(rawCount);
  }
  if(!/^[A-Z0-9-]{2,60}$/i.test(c.caseId)||!c.target||!c.allegedOffense||!validHttps(c.evidenceUrl)||!statuses.has(c.status))throw Error("Invalid published case at CSV row "+(i+1)+". Fix the public sheet.");
  if(seen.has(c.caseId.toLowerCase()))throw Error("Duplicate public case_id: "+c.caseId);
  seen.add(c.caseId.toLowerCase());cases.push(c);
  if(cases.length>200)throw Error("Public registry exceeds 200 cases; paginate before extending.");
 }
 return cases;
}
async function main(){
 const url=process.env.HITLIST_PUBLIC_CSV_URL?.trim();
 if(!url){console.log("No approved-only Google CSV configured; preserving current registry.");return;}
 const u=new URL(url);
 if(u.protocol!=="https:"||u.hostname!=="docs.google.com"||!u.pathname.startsWith("/spreadsheets/"))throw Error("Only Google Sheets public CSV URLs are permitted.");
 const response=await fetch(u,{signal:AbortSignal.timeout(25000),headers:{accept:"text/csv"}});
 if(!response.ok)throw Error("Public sheet download failed: "+response.status+". Do not use the private response sheet.");
 const content=await response.text();if(content.length>500000)throw Error("Public registry CSV unexpectedly large");
 const cases=buildRegistry(content);
 const file=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../data/approved-nominees.json"),old=JSON.parse(await readFile(file,"utf8"));
 if(old.schema!=="hitlist.approved-registry.v1")throw Error("Incorrect existing registry schema");
 if(JSON.stringify(old.cases)===JSON.stringify(cases)){console.log("No reviewed case changes.");return;}
 await writeFile(file,JSON.stringify({schema:"hitlist.approved-registry.v1",updatedAt:new Date().toISOString(),cases},null,2)+"\n");
 console.log("Updated public registry with "+cases.length+" approved cases.");
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(err=>{console.error(err.message);process.exitCode=1;});
