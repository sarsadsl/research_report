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

test("full report is generated from package sections with content-driven pages", async () => {
  const {pkg,profiles}=await load();
  const vm=buildReportViewModel(pkg,"full-research",profiles.profiles["full-research"]);
  const rendered=renderGeneratedReport(vm);
  assert.equal((rendered.match(/<section class="page/g)||[]).length,pkg.sections.length);
  assert.match(rendered,/"profileName":"full-research"/);
  assert.match(rendered,/EVIDENCE RAIL/);
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
});
