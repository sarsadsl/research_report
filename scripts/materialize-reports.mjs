import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { buildReportViewModel, renderGeneratedReport, validateReportProfiles } from "./report-renderer.mjs";

const root=process.cwd();
const requested=process.argv.slice(2);
const slugs=requested.length?requested:(await readdir(join(root,"research"),{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>entry.name);
let written=0;
for(const slug of slugs){
  const directory=join(root,"research",slug);
  let pkg,profiles;
  try{[pkg,profiles]=await Promise.all([readFile(join(directory,"research-package.json"),"utf8").then(JSON.parse),readFile(join(directory,"report-profiles.json"),"utf8").then(JSON.parse)]);}
  catch(error){if(requested.length)throw error;continue;}
  if(pkg.company?.slug!==slug)throw new Error(`${slug}: package/company slug mismatch`);
  validateReportProfiles(profiles);
  for(const [profileName,profile] of Object.entries(profiles.profiles)){
    if(profile.kind!=="generated")throw new Error(`${slug}/${profileName}: P1.10 requires a generated profile`);
    const html=renderGeneratedReport(buildReportViewModel(pkg,profileName,profile));
    const target=resolve(root,profile.output);
    await mkdir(dirname(target),{recursive:true});
    await writeFile(target,html,"utf8");
    console.log(`Materialized ${profile.output} (${Buffer.byteLength(html)} bytes/${createHash("sha256").update(html).digest("hex")})`);
    written++;
  }
}
if(!written)throw new Error("No complete research packages were found to materialize");
