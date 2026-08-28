import assert from "node:assert/strict";
import test from "node:test";
import { assertQcResult, chromeCandidates, parseQcResult } from "./report-qc.mjs";

const passing={version:"p1.6-layout-qc",pages:14,dots:14,profile:"full-research",fallbacks:0,overflows:[],overlaps:[],clippings:[],horizontalOverflow:0,viewport:{width:1440,height:1000}};

test("QC result parser reads the runtime payload",()=>{
  const html=`<html><body><script id="research-qc-result" type="application/json">${JSON.stringify(passing)}</script></body></html>`;
  assert.deepEqual(parseQcResult(html),passing);
});

test("QC result assertion accepts a clean report",()=>{
  assert.equal(assertQcResult(passing,{expectedPages:14,profile:"full-research"}),true);
});

test("QC result assertion rejects layout failures",()=>{
  assert.throws(()=>assertQcResult({...passing,overflows:[{page:4,pixels:9}],overlaps:[{page:7}],clippings:[{page:8}],fallbacks:1},{expectedPages:14,profile:"full-research"}),/layout fallbacks 1[\s\S]*overflow 1[\s\S]*overlap 1[\s\S]*clipping 1/);
});

test("Windows browser discovery includes Chrome and Edge",()=>{
  const candidates=chromeCandidates({PROGRAMFILES:"C:\\Program Files",LOCALAPPDATA:"C:\\Users\\tester\\AppData\\Local"},"win32");
  assert.ok(candidates.some(path=>path.endsWith("Google/Chrome/Application/chrome.exe")));
  assert.ok(candidates.some(path=>path.endsWith("Microsoft/Edge/Application/msedge.exe")));
});
