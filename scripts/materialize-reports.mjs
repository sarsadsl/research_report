import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { buildReportViewModel, injectFullReportMetadata, renderGeneratedReport, validateReportProfiles } from "./report-renderer.mjs";

const root=process.cwd();
const requested=process.argv.slice(2);
const slugs=requested.length?requested:(await readdir(join(root,"research"),{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>entry.name);
const digest=value=>createHash("sha256").update(value).digest("hex");

async function renderBaseline(pkg,profileName,profile){
  const canonical=profile.canonical;
  const parts=await Promise.all(canonical.sources.map(file=>readFile(resolve(root,file),"utf8")));
  const source=gunzipSync(Buffer.from(parts.join("").replace(/\s+/g,""),"base64"));
  if(source.length!==canonical.byteLength||digest(source)!==canonical.sha256){
    throw new Error(`${pkg.company.slug}/${profileName}: canonical baseline verification failed`);
  }
  const vm=buildReportViewModel(pkg,profileName,profile);
  let html=injectFullReportMetadata(source.toString("utf8"),vm);
  const [layoutCss,layoutJs]=await Promise.all([
    readFile(resolve(root,canonical.layoutCss),"utf8"),
    readFile(resolve(root,canonical.layoutJs),"utf8"),
  ]);
  const markerAt=html.lastIndexOf(canonical.readerMarker);
  if(markerAt<0)throw new Error(`${pkg.company.slug}/${profileName}: reader bootstrap marker not found`);
  const patch=`\n<style id="v7-safe-pagination-style">\n${layoutCss}\n</style>\n<script id="v7-safe-pagination-script">\n${layoutJs}\n</script>`;
  return html.slice(0,markerAt)+patch+html.slice(markerAt);
}

let written=0;
for(const slug of slugs){
  const directory=join(root,"research",slug);
  let pkg,profiles;
  try{
    [pkg,profiles]=await Promise.all([
      readFile(join(directory,"research-package.json"),"utf8").then(JSON.parse),
      readFile(join(directory,"report-profiles.json"),"utf8").then(JSON.parse),
    ]);
  }catch(error){if(requested.length)throw error;continue;}
  if(pkg.company?.slug!==slug)throw new Error(`${slug}: package/company slug mismatch`);
  validateReportProfiles(profiles);
  for(const [profileName,profile] of Object.entries(profiles.profiles)){
    const html=profile.kind==="baseline"
      ?await renderBaseline(pkg,profileName,profile)
      :renderGeneratedReport(buildReportViewModel(pkg,profileName,profile));
    const target=resolve(root,profile.output);
    await mkdir(dirname(target),{recursive:true});
    await writeFile(target,html,"utf8");
    console.log(`Materialized ${profile.output} (${Buffer.byteLength(html)} bytes/${digest(html)})`);
    written++;
  }
}
if(!written)throw new Error("No complete research packages were found to materialize");
