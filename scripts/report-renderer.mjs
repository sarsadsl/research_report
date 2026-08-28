const score = { green: 2, yellow: 1, red: 0 };
const signalLabel = { green: "綠燈", yellow: "黃燈", red: "紅燈" };

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const fmt = (value, digits = 2) => value == null ? "—" : Number(value).toFixed(digits);
const safeJson = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");

export function buildReportViewModel(pkg, profileName, profile) {
  const latestActual = [...pkg.actuals].sort((a,b) => b.period.localeCompare(a.period))[0];
  const scenario = pkg.dashboard.forecastScenario;
  const headlineForecasts = pkg.dashboard.headlineForecastYears.map((year) =>
    pkg.forecasts.find((row) => row.fiscalYear === year && row.scenario === scenario));
  const ranking = [...pkg.signalSnapshots].sort((a,b) =>
    score[b.status] - score[a.status] || a.metric.localeCompare(b.metric, "zh-TW"))
    .map((row,index) => ({ ...row, rank:index+1, score:score[row.status], label:signalLabel[row.status] }));
  const sourceMap = Object.fromEntries(pkg.sources.map((source) => [source.id, source]));
  return {
    schemaVersion: "1.0.0",
    profileName,
    profile,
    company: pkg.company,
    report: pkg.report,
    asOfDate: pkg.asOfDate,
    thesis: pkg.thesis,
    dashboard: pkg.dashboard,
    latestActual,
    headlineForecasts,
    ranking,
    sources: pkg.sources,
    sourceMap,
  };
}

export function injectFullReportMetadata(html, vm) {
  const pageCount = Math.max(
    (html.match(/<section\b[^>]*class=["'][^"']*\bpage\b/gi) || []).length,
    (html.match(/<section\b[^>]*class=["'][^"']*\bslide\b/gi) || []).length,
  );
  const expectedSourcePages = vm.profile.sourcePages ?? vm.profile.expectedPages;
  if (pageCount !== expectedSourcePages) {
    throw new Error(`Full report source regression failed: expected ${expectedSourcePages} pages, found ${pageCount}`);
  }
  const payload = `<script id="research-report-payload" type="application/json">${safeJson(vm)}</script>`;
  const marker = "</body>";
  if (!html.includes(marker)) throw new Error("Full report has no </body> marker");
  return html.replace(marker, `${payload}\n${marker}`);
}

function reportShell(vm, pages) {
  const title = `${vm.company.name} ${vm.company.ticker}｜Research Experiment`;
  const dots = pages.map((_,i) => `<button class="dot${i===0?" active":""}" data-page="${i}" aria-label="前往第 ${i+1} 頁">${i+1}</button>`).join("");
  const payload = safeJson(vm);
  return `<!doctype html>
<html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes"><title>${escapeHtml(title)}</title>
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%;font-family:"Noto Sans TC","Microsoft JhengHei",Arial,sans-serif;background:#eaf0f6;color:#172033}body{overflow:hidden}.reader{height:100%;display:grid;grid-template-rows:52px 1fr 62px}.top{background:#152236;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 18px;gap:10px}.top b{font-size:14px}.zoom,.nav,.dots{display:flex;gap:6px;align-items:center}.top button,.nav button,.dot{border:1px solid #d5dee9;background:#fff;color:#33445a;border-radius:8px;height:34px;min-width:38px;padding:0 9px;font-weight:800;cursor:pointer}.top button.active,.dot.active{background:#1f659e;color:#fff;border-color:#1f659e}.stage{overflow:auto;display:flex;justify-content:center;align-items:flex-start;padding:14px}.wrap{width:794px;height:1123px;position:relative;flex:none}.page{width:794px;height:1123px;background:#fff;position:absolute;inset:0;padding:38px 46px 34px;overflow:hidden;transform-origin:top left;display:none;box-shadow:0 10px 28px rgba(20,35,55,.14)}.page.active{display:block}.head{border-bottom:2px solid #182333;padding-bottom:9px;margin-bottom:18px;display:flex;justify-content:space-between;gap:20px}.head h1{margin:0;font-size:22px}.meta{font-size:10px;color:#718096;text-align:right;line-height:1.45}.title{font-size:15px;font-weight:900;margin:18px 0 9px}.call{border-left:4px solid #2d72aa;background:#f5f9fd;padding:12px 14px;border-radius:0 10px 10px 0;font-size:12px;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.card{border:1px solid #dce5ef;border-radius:12px;padding:12px;background:#fff}.card.green{background:#effbf5}.card.yellow{background:#fff8eb}.card.red{background:#fff2f4}.k{font-size:10px;color:#6d7b8e}.v{font-size:22px;font-weight:900;margin-top:3px}.small{font-size:10.5px;line-height:1.55;color:#5f6f82}table{width:100%;border-collapse:collapse;font-size:10px}th,td{padding:8px;border-bottom:1px solid #e3e9f0;text-align:left}th{background:#eef3f8}.nav{background:#f8fafc;border-top:1px solid #d9e2ed;justify-content:center;padding:8px}.count{font-size:11px;font-weight:900;color:#516176}.foot{position:absolute;left:46px;right:46px;bottom:15px;border-top:1px solid #dce4ed;padding-top:5px;display:flex;justify-content:space-between;font-size:8.5px;color:#7a8797}@media(max-width:700px){.top{padding:0 8px}.top b{font-size:11px}.stage{padding:8px}.zoom button{min-width:31px;padding:0 6px;font-size:10px}}@media print{body{overflow:visible;background:#fff}.reader{display:block}.top,.nav{display:none}.stage{display:block;padding:0;overflow:visible}.wrap{width:auto;height:auto}.page{display:block!important;position:relative;box-shadow:none;page-break-after:always;width:210mm;height:297mm}}
</style></head><body data-research-profile="${escapeHtml(vm.profileName)}"><div class="reader"><div class="top"><b>${escapeHtml(title)}</b><div class="zoom"><button data-z="fit" class="active">適合</button><button data-z="0.5">50%</button><button data-z="0.75">75%</button><button data-z="1">100%</button><button data-z="1.25">125%</button></div></div><main class="stage" id="stage"><div class="wrap" id="wrap">${pages.join("\n")}</div></main><nav class="nav"><button id="prev">←</button><div class="dots">${dots}</div><span class="count" id="count">1 / ${pages.length}</span><button id="next">→</button></nav></div>
<script id="research-report-payload" type="application/json">${payload}</script>
<script>(()=>{const pages=[...document.querySelectorAll('.page')],stage=document.getElementById('stage'),wrap=document.getElementById('wrap'),count=document.getElementById('count'),dots=[...document.querySelectorAll('.dot')];let active=0,zoom='fit';const scale=()=>{const n=zoom==='fit'?Math.min((stage.clientWidth-28)/794,(stage.clientHeight-28)/1123):Number(zoom);wrap.style.width=794*n+'px';wrap.style.height=1123*n+'px';pages.forEach(p=>p.style.transform='scale('+n+')')};const show=i=>{active=Math.max(0,Math.min(pages.length-1,i));pages.forEach((p,n)=>p.classList.toggle('active',n===active));dots.forEach((d,n)=>d.classList.toggle('active',n===active));count.textContent=(active+1)+' / '+pages.length;history.replaceState(null,'','#page-'+(active+1))};document.addEventListener('click',e=>{const z=e.target.closest('[data-z]');if(z){zoom=z.dataset.z;document.querySelectorAll('[data-z]').forEach(b=>b.classList.toggle('active',b===z));scale()}const d=e.target.closest('[data-page]');if(d)show(Number(d.dataset.page))});document.getElementById('prev').onclick=()=>show(active-1);document.getElementById('next').onclick=()=>show(active+1);addEventListener('resize',scale);addEventListener('keydown',e=>{if(['ArrowRight','PageDown'].includes(e.key))show(active+1);if(['ArrowLeft','PageUp'].includes(e.key))show(active-1)});const m=location.hash.match(/page-(\d+)/);show(m?Number(m[1])-1:0);scale();window.__researchLayout={version:'p1.4-profile-renderer',totalPages:pages.length,activePage:()=>active+1,overflows:()=>pages.map((p,i)=>({page:i+1,overflow:p.scrollHeight-p.clientHeight}))};})();</script></body></html>`;
}

function page(vm, number, title, content) {
  return `<section class="page${number===1?" active":""}" data-page="${number}"><div class="head"><h1>${escapeHtml(title)}</h1><div class="meta">${escapeHtml(vm.company.market)} · ${escapeHtml(vm.company.ticker)}<br>${escapeHtml(vm.asOfDate)} · ${escapeHtml(vm.report.version)}</div></div>${content}<div class="foot"><span>${escapeHtml(vm.report.title)}</span><span>Page ${number} / ${vm.profile.expectedPages}</span></div></section>`;
}

const sectionRenderers = {
  ranking(vm) {
    const cards = vm.ranking.slice(0,3).map(row => `<div class="card ${row.status}"><div class="k">#${row.rank} ${escapeHtml(row.metric)}</div><div class="v">${escapeHtml(row.label)}</div><div class="small">${escapeHtml(row.valueText)}<br>${escapeHtml(row.notes)}</div></div>`).join("");
    const rows = vm.ranking.map(row => `<tr><td>${row.rank}</td><td>${escapeHtml(row.metric)}</td><td>${escapeHtml(row.label)}</td><td>${escapeHtml(row.valueText)}</td><td>${escapeHtml(row.notes)}</td></tr>`).join("");
    return page(vm,1,"Research Signal Ranking",`<div class="call"><b>排序方法：</b>依最新 signal snapshot 的狀態排序（綠燈 2、黃燈 1、紅燈 0）；同分保持指標名稱排序。這是研究追蹤優先序，不是投資評等。</div><div class="title">Top Signals</div><div class="grid">${cards}</div><div class="title">完整排名</div><table><thead><tr><th>#</th><th>Metric</th><th>Status</th><th>Value</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>`);
  },
  "panel-summary"(vm) {
    const forecastCards = vm.headlineForecasts.map(row => `<div class="card"><div class="k">${row?.fiscalYear ?? "—"}F EPS · ${escapeHtml(row?.scenario)}</div><div class="v">${fmt(row?.eps)}</div><div class="small">Revenue ${fmt(row?.revenue,0)} 百萬<br>GM ${fmt(row?.grossMargin)}%</div></div>`).join("");
    const sources = vm.sources.map(source => `<li><b>${escapeHtml(source.provider)}</b> — ${escapeHtml(source.title)}（${escapeHtml(source.evidenceClass)}）</li>`).join("");
    return page(vm,2,"Panel Summary",`<div class="call"><b>研究結論：</b>${escapeHtml(vm.thesis.summary)}</div><div class="title">核心 KPI</div><div class="grid"><div class="card"><div class="k">${escapeHtml(vm.latestActual?.period)} EPS</div><div class="v">${fmt(vm.latestActual?.eps)}</div><div class="small">最新實績</div></div>${forecastCards}</div><div class="title">核心驗證鏈</div><div class="call">${vm.dashboard.verificationChain.map(escapeHtml).join(" → ")}。${escapeHtml(vm.dashboard.conclusion)}</div><div class="title">Sources</div><ul class="small">${sources}</ul>`);
  },
};

export function renderGeneratedReport(vm) {
  const pages = vm.profile.sections.map((type) => {
    const renderer = sectionRenderers[type];
    if (!renderer) throw new Error(`Unknown report section renderer: ${type}`);
    return renderer(vm);
  });
  if (pages.length !== vm.profile.expectedPages) throw new Error(`Expected ${vm.profile.expectedPages} generated pages, got ${pages.length}`);
  return reportShell(vm,pages);
}
