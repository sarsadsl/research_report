import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildReportViewModel, injectFullReportMetadata, renderGeneratedReport, validateReportProfiles } from "./report-renderer.mjs";

const load = async () => {
  const [pkg, profiles] = await Promise.all([
    readFile("research/vpec-2455/research-package.json", "utf8").then(JSON.parse),
    readFile("research/vpec-2455/report-profiles.json", "utf8").then(JSON.parse),
  ]);
  return { pkg, profiles };
};

test("experiment profile builds ranking and two standalone pages", async () => {
  const {pkg,profiles}=await load();
  const vm=buildReportViewModel(pkg,"experiment-summary",profiles.profiles["experiment-summary"]);
  assert.equal(vm.ranking.length,pkg.signalSnapshots.length);
  assert.ok(vm.ranking.every((row,index)=>index===0||vm.ranking[index-1].score>=row.score));
  const html=renderGeneratedReport(vm);
  assert.equal((html.match(/<section class="page/g)||[]).length,2);
  assert.match(html,/id="research-report-payload"/);
  assert.match(html,/window\.__researchLayout/);
  assert.doesNotMatch(html,/\bfetch\s*\(/);
});

test("report profiles reject unsafe output paths", async()=>{
  const {profiles}=await load();
  const invalid=structuredClone(profiles);
  invalid.profiles["experiment-summary"].output="../outside.html";
  assert.throws(()=>validateReportProfiles(invalid),/invalid output path/);
});

test("VPEC full report remains a verified canonical baseline", async () => {
  const {profiles}=await load();
  const profile=profiles.profiles["full-research"];
  assert.equal(profile.kind,"baseline");
  assert.equal(profile.sourcePages,8);
  assert.equal(profile.expectedPages,14);
  assert.equal(profile.canonical.sha256,"b7092685eab8bfb3479723b29771c746d1cb94e70edef41afa373493745c4ea8");
  assert.equal(validateReportProfiles(profiles),true);
});

test("materialized VPEC artifact preserves the original reader and page design", async () => {
  const html=await readFile("public/research/reports/vpec-2455.html","utf8");
  assert.equal((html.match(/<div class="slide" data-page=/g)||[]).length,8);
  assert.match(html,/<title>全新光電 2455 TT｜互動式分頁研究報告<\/title>/);
  assert.match(html,/id="v7-safe-pagination-style"/);
  assert.match(html,/id="v7-safe-pagination-script"/);
  assert.match(html,/"expectedPages":14/);
  assert.doesNotMatch(html,/EVIDENCE RAIL/);
});

test("VPEC template comparison uses the same generated public format as STL", async () => {
  const {pkg,profiles}=await load();
  const profile=profiles.profiles["template-comparison"];
  const html=renderGeneratedReport(buildReportViewModel(pkg,"template-comparison",profile));
  assert.equal(profile.output,"public/research/reports/vpec-2455-template.html");
  assert.equal(profile.expectedPages,14);
  assert.equal((html.match(/<section class="page slide/g)||[]).length,14);
  assert.match(html,/已實現財務表現/);
  assert.match(html,/月營收動能/);
  assert.match(html,/產品組合與分部結構/);
  assert.match(html,/獲利結構與營運槓桿/);
  assert.match(html,/class="margin-bar gross/);
  assert.match(html,/class="margin-bar operating/);
  assert.match(html,/class="margin-bar net/);
  assert.match(html,/class="chart-legend"/);
  assert.match(html,/background:linear-gradient\(90deg,#5b4bc4,#9c89ef\)/);
  assert.match(html,/情境、敏感度與判讀邏輯/);
  assert.match(html,/樂觀／保守／悲觀/);
  assert.match(html,/悲觀到樂觀/);
  assert.match(html,/<td>樂觀<\/td>/);
  assert.match(html,/<td>保守<\/td>/);
  assert.match(html,/<td>悲觀<\/td>/);
  assert.match(html,/class="nav-progress"/);
  assert.match(html,/EVIDENCE RAIL/);
  assert.match(html,/id="zoom-range"/);
  assert.match(html,/type="range" min="50" max="150" step="1"/);
  assert.match(html,/aria-label="報告縮放比例"/);
  assert.doesNotMatch(html,/data-z="\.75"|data-z="1\.25"/);
  assert.match(html,/addEventListener\("input"/);
  assert.match(html,/stage\.scrollTop=0;stage\.scrollLeft=0/);
  assert.match(html,/\.zoom-label,\.zoom-range,\.zoom-value\{display:none\}/);
  assert.match(html,/class="conclusion-page"/);
  assert.match(html,/支持目前判斷的證據/);
  assert.match(html,/下階段先看這三件事/);
  assert.equal((html.match(/優先 [123]/g)||[]).length,3);
  assert.match(html,/class="source-page"/);
  assert.match(html,/下一輪需要補強的公開證據/);
  assert.equal((html.match(/Evidence 0[123]/g)||[]).length,3);
  assert.match(html,/公開與排除原則/);
  assert.match(html,/class="page-inner no-rail-page"/);
  assert.match(html,/"profileName":"template-comparison"/);
});

test("STL full report shares the dense v2 research layout", async () => {
  const [pkg,profiles]=await Promise.all([
    readFile("research/stl-4931/research-package.json","utf8").then(JSON.parse),
    readFile("research/stl-4931/report-profiles.json","utf8").then(JSON.parse),
  ]);
  const profile=profiles.profiles["full-research"];
  const html=renderGeneratedReport(buildReportViewModel(pkg,"full-research",profile));
  assert.equal(profile.layout,"research-standard-v2");
  assert.equal(profile.expectedPages,14);
  assert.equal((html.match(/<section class="page slide/g)||[]).length,14);
  assert.match(html,/BBU/);
  assert.match(html,/應收與存貨快速增加/);
  assert.match(html,/7 筆來源/);
  assert.match(html,/未公開的券商、法人或客戶資訊不納入公開報告/);
});

test("baseline profiles fail closed without canonical source metadata", async()=>{
  const {profiles}=await load();
  const invalid=structuredClone(profiles);
  delete invalid.profiles["full-research"].canonical;
  assert.throws(()=>validateReportProfiles(invalid),/baseline canonical sources are required/);
});

test("report profiles allow ignored local draft outputs", async()=>{
  const {profiles}=await load();
  const draft=structuredClone(profiles);
  draft.profiles["full-research"].output=".research-drafts/reports/fixture-9001.html";
  assert.equal(validateReportProfiles(draft),true);
});

test("a synthetic second company supports different KPI, years and sections",async()=>{
  const {pkg}=await load();
  const second=structuredClone(pkg);
  second.company={...second.company,id:"fixture-9001",ticker:"9001",market:"TEST",name:"合成製造測試公司",slug:"fixture-9001"};
  second.report={...second.report,id:"fixture-report",slug:"fixture-9001",title:"合成製造測試報告",status:"draft",version:"fixture-1",publishedAt:undefined};
  second.dashboard={...second.dashboard,forecastScenario:"consensus",headlineForecastYears:[2027],focusMetric:{field:"grossMargin",label:"毛利率"}};
  second.sections=[
    {...second.sections[0],id:"fixture-summary",sortOrder:1},
    {id:"fixture-kpi",type:"kpi-grid",title:"製造 KPI",sortOrder:2,payloadRefs:["actuals","forecasts"],showSources:true},
    {...second.sections[4],id:"fixture-scenarios",sortOrder:3},
    {...second.sections[6],id:"fixture-signals",sortOrder:4},
    {...second.sections[8],id:"fixture-sources",sortOrder:5},
    {...second.sections[9],id:"fixture-conclusion",sortOrder:6},
  ];
  const profile={kind:"generated",output:"public/research/reports/fixture-9001.html",sections:["package-sections"]};
  const html=renderGeneratedReport(buildReportViewModel(second,"full-research",profile));
  assert.equal((html.match(/<section class="page/g)||[]).length,6);
  assert.match(html,/合成製造測試公司/);assert.match(html,/毛利率/);
  assert.doesNotMatch(html,/<th>毛利率<\/th>[\s\S]*<th>毛利率<\/th>/);
});
