// Temporary diagnostic-only PR. Never merge: public production readback via GitHub-hosted CI.
import test from "node:test";
const root="https://research-report.sarsadsl.workers.dev";
const slugs=["vpec-2455","stl-4931","jingu-8358","gogolook-6902","umc-2303"];
test("readback current public research versions",async()=>{
  for(const slug of slugs){
    const url=root+"/api/research/"+slug;
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
      const body=await response.text();
      let parsed;try{parsed=JSON.parse(body)}catch{}
      const report=parsed?.reports?.[0]??parsed?.report??parsed?.data?.reports?.[0]??parsed?.data?.report??null;
      console.log("PROD_PROBE_API",JSON.stringify({slug,http:response.status,report,topKeys:parsed&&Object.keys(parsed),sample:body.slice(0,600)}));
    }catch(e){console.log("PROD_PROBE_API_ERROR",slug,String(e));}
    try {
      const url=root+"/research/reports/"+slug+".html";
      const response=await fetch(url,{signal:AbortSignal.timeout(12000)});
      const html=await response.text();
      console.log("PROD_PROBE_HTML",JSON.stringify({slug,http:response.status,bytes:html.length,hasNov2026:html.includes("2026-11-13"),hasQ3:html.includes("2026Q3"),has2026Oct:html.includes("2026/10")}));
    }catch(e){console.log("PROD_PROBE_HTML_ERROR",slug,String(e));}
  }
});
