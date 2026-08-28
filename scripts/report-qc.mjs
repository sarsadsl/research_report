import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { exportStandaloneReport } from "./report-exporter.mjs";

const profiles = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

export function chromeCandidates(env = process.env, platform = process.platform) {
  const explicit = env.RESEARCH_CHROME_PATH ? [env.RESEARCH_CHROME_PATH] : [];
  if (platform === "win32") return [...explicit,
    join(env.PROGRAMFILES ?? "C:\\Program Files", "Google/Chrome/Application/chrome.exe"),
    join(env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google/Chrome/Application/chrome.exe"),
    join(env.LOCALAPPDATA ?? "", "Google/Chrome/Application/chrome.exe"),
    join(env.PROGRAMFILES ?? "C:\\Program Files", "Microsoft/Edge/Application/msedge.exe"),
    join(env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Microsoft/Edge/Application/msedge.exe"),
  ];
  if (platform === "darwin") return [...explicit, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"];
  return [...explicit, "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge"];
}

export function findChrome(options = {}) {
  const candidate = chromeCandidates(options.env, options.platform).find((path) => path && existsSync(path));
  if (!candidate) throw new Error("Chrome/Edge not found. Set RESEARCH_CHROME_PATH to the browser executable.");
  return candidate;
}

export function parseQcResult(html) {
  const match = html.match(/<([a-z0-9]+)\b[^>]*\bid=["']research-qc-result["'][^>]*>([\s\S]*?)<\/\1>/i);
  if (!match) throw new Error("research-qc-result was not produced");
  try { return JSON.parse(match[2]); } catch { throw new Error("research-qc-result is invalid JSON"); }
}

export function assertQcResult(result, { expectedPages, profile }) {
  const errors=[];
  if(result.version!=="p1.6-layout-qc")errors.push(`unexpected QC version ${result.version}`);
  if(result.pages!==expectedPages)errors.push(`pages ${result.pages}/${expectedPages}`);
  if(result.dots!==expectedPages)errors.push(`navigation dots ${result.dots}/${expectedPages}`);
  if(result.profile!==profile)errors.push(`profile ${result.profile}/${profile}`);
  if(result.fallbacks!==0)errors.push(`layout fallbacks ${result.fallbacks}`);
  if(result.overflows?.length)errors.push(`overflow ${result.overflows.length}`);
  if(result.overlaps?.length)errors.push(`overlap ${result.overlaps.length}`);
  if(result.clippings?.length)errors.push(`clipping ${result.clippings.length}`);
  if(result.horizontalOverflow>1)errors.push(`horizontal overflow ${result.horizontalOverflow}px`);
  if(errors.length)throw new Error(["Rendered report QC failed:",...errors.map(error=>`- ${error}`)].join("\n"));
  return true;
}

async function runHeadlessQc({ chromePath, htmlPath, viewport, expectedPages, profile }) {
  const userDataDir=await mkdtemp(join(tmpdir(),"research-qc-"));
  try{
    const result=spawnSync(chromePath,[
      "--headless=new","--disable-gpu","--disable-extensions","--no-first-run","--no-default-browser-check",
      `--user-data-dir=${userDataDir}`,`--window-size=${viewport.width},${viewport.height}`,"--virtual-time-budget=3000",
      "--dump-dom",pathToFileURL(htmlPath).href,
    ],{encoding:"utf8",timeout:30000,maxBuffer:10*1024*1024,windowsHide:true});
    if(result.error)throw result.error;
    if(result.status!==0)throw new Error(`Headless browser exited ${result.status}: ${(result.stderr||"").trim()}`);
    const qc=parseQcResult(result.stdout);
    assertQcResult(qc,{expectedPages,profile});
    return{name:viewport.name,...qc};
  }finally{await rm(userDataDir,{recursive:true,force:true});}
}

export async function runReportQc({ slug, rootDir=process.cwd(), chromePath }={}) {
  if(!slug)throw new Error("Usage: npm run report:qc -- <slug>");
  const exported=await exportStandaloneReport({rootDir,slug});
  const profileDocument=JSON.parse(await readFile(resolve(rootDir,"research",slug,"report-profiles.json"),"utf8"));
  const expectedPages=Number(profileDocument.profiles["full-research"].expectedPages);
  const browser=chromePath??findChrome();
  const results=[];
  for(const viewport of profiles)results.push(await runHeadlessQc({chromePath:browser,htmlPath:exported.outputPath,viewport,expectedPages,profile:"full-research"}));
  return{slug,file:basename(exported.outputPath),browser,expectedPages,websiteParity:exported.identicalToWebsite,results};
}

async function main(){
  const result=await runReportQc({slug:process.argv[2]});
  for(const item of result.results)console.log(`${item.name}: pages=${item.pages}, overflow=${item.overflows.length}, overlap=${item.overlaps.length}, clipping=${item.clippings.length}, fallback=${item.fallbacks}, horizontal=${item.horizontalOverflow}px — PASS`);
  console.log(`Standalone: ${result.file} — PASS\nWebsite parity: ${result.websiteParity?"PASS":"FAIL"}\nRESULT: READY TO PUBLISH`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
