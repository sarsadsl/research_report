import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { checkIntake, createIntake, parseIntakeArgs } from "./research-intake.mjs";

test("intake arguments and scaffold are safe and checkable",async()=>{
  const root=await mkdtemp(join(tmpdir(),"research-intake-"));
  try{
    const options=parseIntakeArgs(["sample-9001","--company","示範公司","--ticker","9001","--market","TEST","--as-of","2026-09-01"]);
    await createIntake(root,options);
    const file=join(root,"research","sample-9001","intake.json"),intake=JSON.parse(await readFile(file,"utf8"));
    intake.sources=[{id:"src-1",title:"合成測試資料",provider:"Fixture",evidenceClass:"official",file:"sources/input.txt"}];
    await writeFile(join(root,"research","sample-9001","sources","input.txt"),"fixture\n");
    await writeFile(file,JSON.stringify(intake));
    const result=await checkIntake(root,"sample-9001");
    assert.equal(result.files[0].bytes,8);assert.match(result.files[0].sha256,/^[a-f0-9]{64}$/);
  }finally{await rm(root,{recursive:true,force:true})}
});

test("intake rejects unsafe slugs and paths",()=>{
  assert.throws(()=>parseIntakeArgs(["../bad"]),/Invalid research slug/);
});
