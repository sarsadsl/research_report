import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { launch } from "puppeteer-core";
import { findChrome } from "./report-qc.mjs";

const root=process.cwd();
const outputDir=resolve(root,".research-publish","visual-review");
const captures=[
  {slug:"vpec-2455",chapter:1,width:1440,height:1000},
  {slug:"vpec-2455",chapter:3,width:1440,height:1000},
  {slug:"vpec-2455",chapter:4,width:1440,height:1000},
  {slug:"vpec-2455",chapter:5,width:1440,height:1000},
  {slug:"vpec-2455",chapter:6,width:1440,height:1000},
  {slug:"vpec-2455",chapter:7,width:1440,height:1000},
  {slug:"vpec-2455",chapter:8,width:1440,height:1000},
  {slug:"vpec-2455",chapter:9,width:1440,height:1000},
  {slug:"vpec-2455",chapter:10,width:1440,height:1000},
  {slug:"vpec-2455",chapter:14,width:1440,height:1000},
  {slug:"stl-4931",chapter:1,width:1440,height:1000},
  {slug:"vpec-2455",chapter:1,width:390,height:844,name:"mobile"},
];

await mkdir(outputDir,{recursive:true});
const browser=await launch({executablePath:findChrome(),headless:true,defaultViewport:{width:1440,height:1000,deviceScaleFactor:1},args:["--disable-gpu","--disable-extensions","--no-first-run","--no-default-browser-check"]});
try{
  for(const capture of captures){
    const page=await browser.newPage();
    await page.setViewport({width:capture.width,height:capture.height,deviceScaleFactor:1});
    const report=resolve(root,"public","research","reports",`${capture.slug}.html`);
    await page.goto(pathToFileURL(report).href,{waitUntil:"load",timeout:30000});
    await page.waitForFunction(()=>Boolean(window.__researchLayout?.showPage),{timeout:10000});
    await page.evaluate(async chapter=>{window.__researchLayout.showPage(chapter);await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},capture.chapter);
    const output=resolve(outputDir,`${capture.slug}${capture.name?`-${capture.name}`:""}-chapter-${String(capture.chapter).padStart(2,"0")}.png`);
    await page.screenshot({path:output,type:"png",fullPage:Boolean(capture.name)});
    console.log(output);
    await page.close();
  }
}finally{await browser.close()}
