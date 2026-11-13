import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateEarningsQuality } from "./earnings-quality.mjs";
import { validateResearch } from "./research-lib.mjs";

const load = async () => {
  const [manifest,researchPackage,manifestSchema,packageSchema] = await Promise.all([
    "research/vpec-2455/manifest.json",
    "research/vpec-2455/research-package.json",
    "research_system/schemas/research-manifest-v1.schema.json",
    "research_system/schemas/research-package-v1.schema.json",
  ].map(file=>readFile(file,"utf8").then(JSON.parse)));
  return {manifest,researchPackage,manifestSchema,packageSchema};
};
function fixture(input) {
  const sourceId=input.researchPackage.sources[0].id;
  input.researchPackage.asOfDate="2026-11-13";
  input.researchPackage.earningsQuality={
    standard:"EQ-01-v1",reviewStatus:"PASS",reviewer:"Research QC",reviewedAt:"2026-11-13",
    coverageNote:"Fixture uses one audited quarter; other years unavailable in sample",
    qualitativeFlags:["cross_holding"],
    periods:[{
      id:"eq-2026q3",period:"2026Q3",periodType:"quarter",currency:"TWD",scale:"million",
      revenue:200,operatingIncome:80,nonOperatingNet:20,pretaxIncome:100,incomeTax:18,
      netIncomeAttributable:82,reportedEps:1,normalizedEps:0.8,
      weightedAverageShares:82,shareholdersEquity:500,
      adjustments:[{
        id:"eq-fvpl",category:"FVPL",realization:"unrealized",pretaxAmount:20,
        epsImpact:0.2,equityImpact:30,method:"Look-through, after-tax attributed EPS adjustment",
        sourceIds:[sourceId],claimIds:[],notes:"synthetic test only"
      }],
      sourceIds:[sourceId],claimIds:[],normalizationNote:"Synthetic after-tax attribution"
    }],
    l2:{status:"PASS",summary:"Cross-holding traced to underlying instrument in fixture",sourceIds:[sourceId],claimIds:[]},
    valuation:{epsBasis:"normalized",doubleCountChecked:true,notes:"Exclude this mark-to-market only once"},
    notes:"Testing fixture, not a claim about VPEC",
  };
  return input;
}
test("EQ-01: legacy reports remain readable without the audit",async()=>{
  const x=await load();
  assert.equal(validateResearch(x).ok,true);
});
test("EQ-01: published full report after effective date must include review",async()=>{
  const x=await load();delete x.researchPackage.earningsQuality;x.researchPackage.asOfDate="2026-11-13";
  const r=validateResearch(x);
  assert.equal(r.ok,false);
  assert.match(r.errors.join("\n"),/requires earningsQuality/);
});
test("EQ-01: reconciled audit and qualified L2 pass with triggers",async()=>{
  const x=fixture(await load()),r=validateResearch(x);
  assert.equal(r.ok,true,r.errors.join("\n"));
  const flags=evaluateEarningsQuality(x.researchPackage.earningsQuality);
  assert.equal(flags.requiresL2,true);
  assert.ok(flags.reasons.includes("QUALITATIVE:cross_holding"));
  assert.ok(flags.reasons.includes("NON_OPERATING_SHARE:2026Q3"));
});
test("EQ-01: triggered L2 cannot be marked NOT_RUN on published research",async()=>{
  const x=fixture(await load());x.researchPackage.earningsQuality.l2.status="NOT_RUN";
  const r=validateResearch(x);
  assert.equal(r.ok,false);
  assert.match(r.errors.join("\n"),/L2 is required/);
});
test("EQ-01: bad EPS bridge, FVOCI-through-EPS, and duplicate deduction each fail",async()=>{
  const x=fixture(await load());
  x.researchPackage.earningsQuality.periods[0].normalizedEps=0.2;
  assert.match(validateResearch(x).errors.join("\n"),/normalizedEps does not reconcile/);
  x.researchPackage.earningsQuality.periods[0].normalizedEps=0.8;
  const adj=x.researchPackage.earningsQuality.periods[0].adjustments[0];
  adj.category="FVOCI";
  assert.match(validateResearch(x).errors.join("\n"),/FVOCI valuation cannot/);
  adj.category="FVPL";
  x.researchPackage.earningsQuality.valuation.doubleCountChecked=false;
  assert.match(validateResearch(x).errors.join("\n"),/double deductions/);
});
test("EQ-01: invalid provenance cannot pass even with PASS review label",async()=>{
  const x=fixture(await load());
  x.researchPackage.earningsQuality.periods[0].adjustments[0].sourceIds=["missing-eq-source"];
  assert.match(validateResearch(x).errors.join("\n"),/missing source missing-eq-source/);
});
test("EQ-01: below threshold audit does not require artificial L2",async()=>{
  const x=fixture(await load()),eq=x.researchPackage.earningsQuality,p=eq.periods[0];
  p.operatingIncome=90;p.nonOperatingNet=10;p.adjustments=[];p.normalizedEps=1;p.normalizationNote="";
  eq.qualitativeFlags=[];eq.l2={status:"NOT_RUN",summary:"",sourceIds:[],claimIds:[]};
  assert.equal(evaluateEarningsQuality(eq).requiresL2,false);
  const result=validateResearch(x);
  assert.equal(result.ok,true,result.errors.join("\n"));
});
test("EQ-01: near-zero pretax triggers review without an unstable ratio",async()=>{
  const x=fixture(await load()),p=x.researchPackage.earningsQuality.periods[0];
  p.pretaxIncome=0;p.operatingIncome=-20;
  const evaluated=evaluateEarningsQuality(x.researchPackage.earningsQuality);
  assert.ok(evaluated.reasons.includes("NEAR_ZERO_PRETAX:2026Q3"));
});
