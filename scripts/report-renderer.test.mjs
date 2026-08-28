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

test("full report metadata injection preserves baseline pages", async () => {
  const {pkg,profiles}=await load();
  const vm=buildReportViewModel(pkg,"full-research",profiles.profiles["full-research"]);
  const pages=Array.from({length:8},(_,i)=>`<section class="page">${i+1}</section>`).join("");
  const baseline=`<!doctype html><html><body>${pages}</body></html>`;
  const rendered=injectFullReportMetadata(baseline,vm);
  assert.equal((rendered.match(/<section class="page/g)||[]).length,8);
  assert.match(rendered,/"profileName":"full-research"/);
});

test("full report regression rejects unexpected page count", async () => {
  const {pkg,profiles}=await load();
  const vm=buildReportViewModel(pkg,"full-research",profiles.profiles["full-research"]);
  assert.throws(()=>injectFullReportMetadata("<html><body><section class=\"page\"></section></body></html>",vm),/expected 8 pages/);
});
