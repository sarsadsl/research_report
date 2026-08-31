import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { launch } from "puppeteer-core";
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
  if (!result || typeof result !== "object") throw new Error("Rendered report QC result is missing");
  if (!Number.isInteger(expectedPages) || expectedPages < 1) errors.push("invalid expected page count");
  for (const key of ["overflows", "overlaps", "clippings"]) {
    if (!Array.isArray(result[key])) errors.push(`missing or invalid ${key}`);
  }
  if (!Number.isFinite(result.horizontalOverflow) || result.horizontalOverflow < 0) errors.push("invalid horizontal overflow");
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

export async function runHeadlessQc({ chromePath, htmlPath, viewport, expectedPages, profile }) {
  const userDataDir=await mkdtemp(join(tmpdir(),"research-qc-"));
  let browser;
  try{
    browser=await launch({executablePath:chromePath,headless:true,userDataDir,timeout:30000,
      defaultViewport:{width:viewport.width,height:viewport.height,deviceScaleFactor:1},
      args:["--disable-gpu","--disable-extensions","--no-first-run","--no-default-browser-check"]});
    const page=await browser.newPage();
    const runtimeErrors=[];
    page.on("pageerror",error=>runtimeErrors.push(String(error)));
    await page.goto(pathToFileURL(htmlPath).href,{waitUntil:"load",timeout:30000});
    await page.waitForFunction(()=>Boolean(window.__researchLayout?.collectQc),{timeout:10000});
    await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
    const qc=await page.evaluate(()=>window.__researchLayout.collectQc());
    qc.runtimeErrors=runtimeErrors;
    try {
      assertQcResult(qc,{expectedPages,profile});
      if(qc.viewport?.width!==viewport.width||qc.viewport?.height!==viewport.height)throw new Error("QC viewport does not match requested device metrics");
      if(runtimeErrors.length)throw new Error(`Report runtime errors: ${runtimeErrors.length}`);
    }
    catch (error) { error.qc = {name:viewport.name,...qc}; throw error; }
    return{name:viewport.name,...qc};
  }finally{
    if(browser)await browser.close();
    await rm(userDataDir,{recursive:true,force:true});
  }
}

export async function runReportQc({ slug, rootDir=process.cwd(), chromePath, materialize=true }={}) {
  if(!slug)throw new Error("Usage: npm run report:qc -- <slug>");
  const exported=await exportStandaloneReport({rootDir,slug,materialize});
  const profileDocument=JSON.parse(await readFile(resolve(rootDir,"research",slug,"report-profiles.json"),"utf8"));
  const expectedPages=Number(profileDocument.profiles["full-research"].expectedPages);
  const browser=chromePath??findChrome();
  const results=[];
  for(const viewport of profiles) {
    try { results.push(await runHeadlessQc({chromePath:browser,htmlPath:exported.outputPath,viewport,expectedPages,profile:"full-research"})); }
    catch (error) {
      error.qc = {slug,reportHash:exported.reportHash,websiteParity:exported.identicalToWebsite,results:[...results,...(error.qc?[error.qc]:[])]};
      throw error;
    }
  }
  return{slug,file:basename(exported.outputPath),browser,expectedPages,reportHash:exported.reportHash,websiteParity:exported.identicalToWebsite,results};
}

async function main(){
  const result=await runReportQc({slug:process.argv[2]});
  for(const item of result.results)console.log(`${item.name}: viewport=${item.viewport.width}x${item.viewport.height}, pages=${item.pages}, overflow=${item.overflows.length}, overlap=${item.overlaps.length}, clipping=${item.clippings.length}, fallback=${item.fallbacks}, horizontal=${item.horizontalOverflow}px — PASS`);
  console.log(`Standalone: ${result.file} — PASS\nWebsite parity: ${result.websiteParity?"PASS":"FAIL"}\nRESULT: READY TO PUBLISH`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
