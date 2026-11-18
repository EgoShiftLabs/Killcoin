import test from "node:test";
import assert from "node:assert/strict";
import {parseCSV,buildRegistry} from "../scripts/sync-registry.mjs";
const header="case_id,target,ticker,chain,contract,alleged_offense,evidence_url,case_status,approved_at,publish\n";
test("quoted CSV commas, newlines and escape sequences",()=>{
 assert.deepEqual(parseCSV('a,b\n"two, words","line 1\nline ""2"""\n'),[["a","b"],["two, words",'line 1\nline "2"']]);
});
test("only YES-approved project records are converted",()=>{
 const content=header+'KC-001,"Frog, Again",FRG,Solana,abc,"Updates stopped",https://example.org/records,ACTIVE,2026-11-18,YES\nKC-002,Private,,,,No proof,https://example.org/2,ACTIVE,,NO\n';
 const rows=buildRegistry(content);
 assert.equal(rows.length,1);assert.equal(rows[0].target,"Frog, Again");assert.equal(rows[0].allegedOffense,"Updates stopped");
 assert.equal("email" in rows[0],false);
});
test("unsafe public source links fail closed",()=>{
 assert.throws(()=>buildRegistry(header+'KC-003,Unsafe,,,,Bad,javascript:alert(1),ACTIVE,,YES\n'),/Invalid published case/);
 assert.throws(()=>buildRegistry(header+'KC-003,Unsafe,,,,Bad,http://example.org,ACTIVE,,YES\n'),/Invalid published case/);
 assert.throws(()=>buildRegistry(header+'KC-003,Unsafe,,,,Bad,https://example.org,OPEN,,YES\n'),/Invalid published case/);
});
test("private response sheets cannot be interpreted as public case feeds",()=>{
 assert.throws(()=>buildRegistry("Timestamp,Email Address,Name,Offense\n2026-11-18,agent@example.com,token,rumor\n"),/missing columns/);
});
test("duplicate case ids fail",()=>{
 assert.throws(()=>buildRegistry(header+'KC-004,Project A,,,,Description,https://example.org/a,ARCHIVED,,YES\nKC-004,Project B,,,,Description,https://example.org/b,ACTIVE,,YES\n'),/Duplicate public/);
});
test("zero approved records is valid but unapproved never appears",()=>{
 assert.deepEqual(buildRegistry(header+'KC-009,Not approved,,,,,,ACTIVE,,NO\n'),[]);
});
