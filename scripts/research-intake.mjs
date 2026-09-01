import { createHash } from "node:crypto";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertSafeSlug } from "./research-lib.mjs";

export function parseIntakeArgs(args){
  const [slug,...rest]=args; assertSafeSlug(slug??"");
  const options={slug,check:false};
  for(let i=0;i<rest.length;i++){
    const flag=rest[i];
    if(flag==="--check"){options.check=true;continue}
    if(!["--company","--ticker","--market","--as-of"].includes(flag))throw new Error(`Unknown intake option: ${flag}`);
    const value=rest[++i];if(!value||value.startsWith("--"))throw new Error(`${flag} requires a value`);
    options[{"--company":"companyName","--ticker":"ticker","--market":"market","--as-of":"asOfDate"}[flag]]=value;
  }
  return options;
}

const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value??"")&&!Number.isNaN(new Date(`${value}T00:00:00Z`).valueOf());
export async function checkIntake(root,slug){
  const directory=resolve(root,"research",slug),file=join(directory,"intake.json");
  const intake=JSON.parse(await readFile(file,"utf8")),errors=[];
  if(intake.schemaVersion!=="1.0.0")errors.push("schemaVersion must be 1.0.0");
  if(intake.slug!==slug)errors.push("slug mismatch");
  for(const key of ["companyName","ticker","market"])if(!String(intake[key]??"").trim())errors.push(`${key} is required`);
  if(!validDate(intake.asOfDate))errors.push("asOfDate must be YYYY-MM-DD");
  if(!Array.isArray(intake.sources))errors.push("sources must be an array");
  const inventory=[];
  for(const [index,source] of (intake.sources??[]).entries()){
    if(!source.id||!source.title||!source.provider)errors.push(`sources[${index}] requires id, title and provider`);
    if(!source.file&&!source.url)errors.push(`sources[${index}] requires file or url`);
    if(source.url){try{new URL(source.url)}catch{errors.push(`sources[${index}] has an invalid url`)}}
    if(source.file){
      const full=resolve(directory,source.file),inside=relative(directory,full);
      if(inside.startsWith("..")||inside.includes(":"))errors.push(`sources[${index}] file must stay inside research/${slug}`);
      else try{const bytes=await readFile(full),info=await stat(full);inventory.push({id:source.id,file:inside.replaceAll("\\","/"),bytes:info.size,sha256:createHash("sha256").update(bytes).digest("hex")})}catch{errors.push(`sources[${index}] file is missing: ${source.file}`)}
    }
  }
  if(errors.length)throw new Error(["Research intake check failed:",...errors.map(e=>`- ${e}`)].join("\n"));
  return {slug,sources:intake.sources.length,files:inventory};
}

export async function createIntake(root,options){
  for(const key of ["companyName","ticker","market","asOfDate"])if(!options[key])throw new Error(`Missing --${key==="companyName"?"company":key==="asOfDate"?"as-of":key}`);
  if(!validDate(options.asOfDate))throw new Error("--as-of must be YYYY-MM-DD");
  const directory=resolve(root,"research",options.slug),file=join(directory,"intake.json");
  try{await access(file);throw new Error(`${relative(root,file)} already exists`)}catch(error){if(error.code!=="ENOENT")throw error}
  await mkdir(join(directory,"sources"),{recursive:true});
  const intake={schemaVersion:"1.0.0",slug:options.slug,companyName:options.companyName,ticker:options.ticker,market:options.market,asOfDate:options.asOfDate,requestedOutputs:["dashboard","full-report","standalone"],researchQuestions:[],sources:[],notes:"先加入來源與研究問題；完成 package 前不會進入網站建置或發布。"};
  await writeFile(file,JSON.stringify(intake,null,2)+"\n");
  await writeFile(join(directory,"notes.md"),`# ${options.companyName} research intake\n\n1. 將來源檔放入 \`sources/\`，或在 intake.json 記錄 URL。\n2. 為每個來源填入 id、title、provider、evidenceClass，以及 file 或 url。\n3. 執行 \`npm run research:intake -- ${options.slug} --check\`。\n4. 通過後再整理成 manifest、research-package 與 report-profiles。\n`);
  return {slug:options.slug,file:relative(root,file)};
}

async function main(){const options=parseIntakeArgs(process.argv.slice(2));const result=options.check?await checkIntake(process.cwd(),options.slug):await createIntake(process.cwd(),options);console.log(JSON.stringify(result,null,2));}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1});
