const score={green:2,yellow:1,red:0};
const labels={green:"綠燈",yellow:"黃燈",red:"紅燈"};
const evidence={official:"官方",third_party_fact:"第三方",market_consensus:"市場共識",research_inference:"研究推論"};
const esc=(v="")=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const json=v=>JSON.stringify(v).replaceAll("<","\\u003c");
const num=(v,d=2)=>v==null?"—":Number(v).toLocaleString("zh-TW",{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=v=>v==null?"—":`${num(v,1)}%`;
const metricValue=(field,value)=>["grossMargin","optoShare"].includes(field)?pct(value):num(value,field==="eps"?2:1);
const scenarioMeta={bull:{label:"樂觀",order:0},consensus:{label:"保守",order:1},base:{label:"保守",order:1},bear:{label:"悲觀",order:2}};
const scenarioLabel=scenario=>scenarioMeta[scenario]?.label??scenario;
const sortScenarios=rows=>[...rows].sort((a,b)=>(scenarioMeta[a.scenario]?.order??99)-(scenarioMeta[b.scenario]?.order??99));

export function validateReportProfiles(doc){
  const errors=[];
  if(doc?.schemaVersion!=="1.0.0")errors.push("profile schemaVersion must be 1.0.0");
  if(!doc?.profiles||typeof doc.profiles!=="object")errors.push("profiles object is required");
  for(const [name,p] of Object.entries(doc?.profiles??{})){
    if(!["baseline","generated"].includes(p.kind))errors.push(`${name}: invalid kind`);
    if(!/^(?:public\/research\/reports|\.research-drafts\/reports)\/[a-z0-9-]+\.html$/.test(p.output??""))errors.push(`${name}: invalid output path`);
    if(p.expectedPages!==undefined&&(!Number.isInteger(p.expectedPages)||p.expectedPages<1))errors.push(`${name}: invalid expectedPages`);
    if(p.layout!==undefined&&p.layout!=="research-standard-v2")errors.push(`${name}: invalid layout`);
    if(!Array.isArray(p.sections)||!p.sections.length)errors.push(`${name}: sections are required`);
    if(p.kind==="baseline"){
      if(!Number.isInteger(p.sourcePages)||p.sourcePages<1)errors.push(`${name}: baseline sourcePages are required`);
      if(!Array.isArray(p.canonical?.sources)||!p.canonical.sources.length)errors.push(`${name}: baseline canonical sources are required`);
      if(!Number.isInteger(p.canonical?.byteLength)||p.canonical.byteLength<1)errors.push(`${name}: baseline canonical byteLength is required`);
      if(!/^[a-f0-9]{64}$/.test(p.canonical?.sha256??""))errors.push(`${name}: baseline canonical sha256 is required`);
      if(!p.canonical?.layoutCss||!p.canonical?.layoutJs||!p.canonical?.readerMarker)errors.push(`${name}: baseline layout patch is required`);
    }
  }
  if(errors.length)throw new Error(["Report profile validation failed:",...errors.map(e=>`- ${e}`)].join("\n"));
  return true;
}

export function buildReportViewModel(pkg,profileName,profile){
  const latestActual=[...pkg.actuals].sort((a,b)=>b.period.localeCompare(a.period))[0];
  const headlineForecasts=pkg.dashboard.headlineForecastYears.map(year=>pkg.forecasts.find(r=>r.fiscalYear===year&&r.scenario===pkg.dashboard.forecastScenario)).filter(Boolean);
  const ranking=[...pkg.signalSnapshots].sort((a,b)=>score[b.status]-score[a.status]||a.metric.localeCompare(b.metric,"zh-TW")).map((r,i)=>({...r,rank:i+1,score:score[r.status],label:labels[r.status]}));
  return {schemaVersion:"1.0.0",profileName,profile,company:pkg.company,report:pkg.report,asOfDate:pkg.asOfDate,thesis:pkg.thesis,dashboard:pkg.dashboard,latestActual,headlineForecasts,ranking,sections:pkg.sections,sources:pkg.sources,sourceMap:Object.fromEntries(pkg.sources.map(s=>[s.id,s])),claims:pkg.claims,actuals:pkg.actuals,monthlyRevenue:pkg.monthlyRevenue,segments:pkg.segments,forecasts:pkg.forecasts,capacity:pkg.capacity,catalysts:pkg.catalysts,risks:pkg.risks,signalRules:pkg.signalRules,signalSnapshots:pkg.signalSnapshots};
}

export function injectFullReportMetadata(html,vm){
  const count=Math.max((html.match(/<section\b[^>]*class=["'][^"']*\bpage\b/gi)||[]).length,(html.match(/<section\b[^>]*class=["'][^"']*\bslide\b/gi)||[]).length);
  const expected=vm.profile.sourcePages??vm.profile.expectedPages;
  if(expected&&count!==expected)throw new Error(`Full report source regression failed: expected ${expected} pages, found ${count}`);
  if(!html.includes("</body>"))throw new Error("Full report has no </body> marker");
  return html.replace("</body>",`<script id="research-report-payload" type="application/json">${json(vm)}</script>\n</body>`);
}

const makeRows=(items,cells)=>items.map(item=>`<tr>${cells.map(cell=>`<td>${cell(item)}</td>`).join("")}</tr>`).join("");
const table=(heads,body)=>`<table><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`;
const metric=(label,value,note="",tone="")=>`<article class="metric ${tone}"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(note)}</span></article>`;
const metrics=items=>`<div class="metrics">${items.join("")}</div>`;

const renderers={
  summary(vm){return `<div class="thesis"><em>DECISION FRAME</em><h2>${esc(vm.thesis.summary)}</h2><p>${esc(vm.dashboard.currentView)}</p></div><div class="chain">${vm.thesis.coreChain.map((x,i)=>`<div><b>${String(i+1).padStart(2,"0")}</b><span>${esc(x)}</span></div>`).join("")}</div><h3>核心訊號</h3>${metrics(vm.ranking.slice(0,3).map(x=>metric(x.metric,x.label,x.valueText,x.status)))}`},
  "kpi-grid"(vm){const focus=vm.headlineForecasts.at(-1),field=vm.dashboard.focusMetric.field;return metrics([metric(`${vm.latestActual?.period??"最新"} EPS`,num(vm.latestActual?.eps),"已實現"),...vm.headlineForecasts.map(x=>metric(`${x.fiscalYear}F EPS`,num(x.eps),`${scenarioLabel(x.scenario)}情境`)),metric(vm.dashboard.focusMetric.label,metricValue(field,focus?.[field]),"焦點 KPI")])},
  "financial-table"(vm,s){return s.payloadRefs.includes("segments")?table(["期間","分部","營收","占比","屬性"],makeRows(vm.segments,[r=>esc(r.period),r=>esc(r.segment),r=>num(r.revenue,1),r=>pct(r.share),r=>r.isEstimate?"估計":"實績"])):table(["期間","營收","毛利率","營業利益","淨利","EPS"],makeRows(vm.actuals,[r=>esc(r.period),r=>num(r.revenue,1),r=>pct(r.grossMargin),r=>num(r.operatingIncome,1),r=>num(r.netIncome,1),r=>num(r.eps)]))},
  "bar-chart"(vm){const max=Math.max(...vm.monthlyRevenue.map(r=>r.revenue),1),cfg=vm.dashboard.monthlyRevenue;return `<div class="bars">${vm.monthlyRevenue.map(r=>`<div><span>${r.year}/${String(r.month).padStart(2,"0")}</span><i><b style="width:${Math.max(2,r.revenue/max*100)}%"></b></i><strong>${num(r.revenue/cfg.unitDivisor,1)} ${esc(cfg.unitLabel)}</strong></div>`).join("")}</div>`},
  "line-chart"(vm){return renderers["bar-chart"](vm)},
  bridge(vm){return `<div class="thesis"><h2>${esc(vm.dashboard.verificationChain.join(" → "))}</h2><p>${esc(vm.dashboard.estimateNote)}</p></div>`},
  "scenario-table"(vm){const field=vm.dashboard.focusMetric.field,baseFields=new Set(["revenue","grossMargin","netIncome","eps"]),includeFocus=!baseFields.has(field);const heads=["年度","情境","營收","毛利率","淨利","EPS",...(includeFocus?[vm.dashboard.focusMetric.label]:[])],cells=[r=>String(r.fiscalYear),r=>esc(scenarioLabel(r.scenario)),r=>num(r.revenue,1),r=>pct(r.grossMargin),r=>num(r.netIncome,1),r=>num(r.eps),...(includeFocus?[r=>metricValue(field,r[field])]:[])];return table(heads,makeRows(sortScenarios(vm.forecasts),cells))},
  capacity(vm){return table(["項目","設備／技術","增量","預計上線","狀態"],makeRows(vm.capacity,[r=>esc(r.label),r=>esc([r.equipment,r.technology].filter(Boolean).join(" · ")),r=>r.deltaUnits==null?"—":String(r.deltaUnits),r=>esc(r.expectedOnlineDate??"—"),r=>esc(r.status)]))},
  signals(vm){return `<div class="signals">${vm.ranking.map(r=>`<article class="${r.status}"><b>${esc(r.metric)}</b><strong>${esc(r.label)}</strong><span>${esc(r.valueText)}</span><small>${esc(r.notes)}</small></article>`).join("")}</div>`},
  "catalysts-risks"(vm){const col=(title,items,tone)=>`<div class="split ${tone}"><h3>${title}</h3>${items.map(r=>`<article><b>${esc(r.title)}</b><p>${esc(r.notes??r.impact)}</p><small>影響 ${esc(r.impact)} · ${esc(r.status)}${r.probability?` · 機率 ${esc(r.probability)}`:""}</small></article>`).join("")}</div>`;return `<div class="twocol">${col("催化劑",vm.catalysts,"good")}${col("風險",vm.risks,"bad")}</div>`},
  sources(vm){return `<div class="sources">${vm.sources.map((s,i)=>`<article><b>${String(i+1).padStart(2,"0")}</b><div><strong>${esc(s.provider)}｜${esc(s.title)}</strong><p>${esc(evidence[s.evidenceClass]??s.evidenceClass)} · ${esc(s.publishedDate??"日期未標示")} · 信心 ${esc(s.confidence)}</p></div></article>`).join("")}</div>`},
  conclusion(vm){return `<div class="verdict"><em>RESEARCH VERDICT</em><h2>${esc(vm.dashboard.conclusion)}</h2><p>${esc(vm.thesis.summary)}</p><div class="chain">${vm.dashboard.verificationChain.map((x,i)=>`<div><b>${i+1}</b><span>${esc(x)}</span></div>`).join("")}</div><small>${esc(vm.dashboard.estimateNote)}</small></div>`}
};

const standardSection=(id,title,payloadRefs,showSources=true)=>({id,type:"composite",title,sortOrder:0,payloadRefs,showSources});
const module=(eyebrow,title,content,extra="")=>`<section class="module ${extra}"><div class="module-head"><em>${esc(eyebrow)}</em><h3>${esc(title)}</h3></div>${content}</section>`;
const bullets=items=>`<ul class="analysis-list">${items.filter(Boolean).map(item=>`<li>${esc(item)}</li>`).join("")}</ul>`;
const compactBars=vm=>renderers["bar-chart"](vm);
const actualTable=vm=>renderers["financial-table"](vm,{payloadRefs:["actuals"]});
const segmentTable=vm=>renderers["financial-table"](vm,{payloadRefs:["segments"]});
const scenarioTable=vm=>renderers["scenario-table"](vm);
const capacityTable=vm=>renderers.capacity(vm);
const cagr=(base,target,years)=>base>0&&target!=null&&years>0?(Math.pow(target/base,1/years)-1)*100:null;

const signedNum=(value,d=1)=>value==null||!Number.isFinite(value)?"—":`${value>=0?"+":""}${num(value,d)}`;
const signedPct=(value,d=1)=>value==null||!Number.isFinite(value)?"—":`${value>=0?"+":""}${num(value,d)}%`;
const range=(values,format)=>{
  const finite=values.filter(value=>Number.isFinite(value));
  if(!finite.length)return "—";
  const low=Math.min(...finite),high=Math.max(...finite);
  return low===high?format(low):`${format(low)}–${format(high)}`;
};

function monthlyTable(vm){
  const config=vm.dashboard.monthlyRevenue;
  const rows=[...vm.monthlyRevenue].sort((a,b)=>a.year-b.year||a.month-b.month).slice(-5);
  return table(["月份","營收","月增率","年增率"],makeRows(rows,[
    row=>`${row.year}/${String(row.month).padStart(2,"0")}`,
    row=>`${num(row.revenue/(config.unitDivisor||1),1)} ${esc(config.unitLabel)}`,
    row=>pct(row.mom),
    row=>pct(row.yoy),
  ]));
}

function financialChangeMetrics(vm){
  const rows=[...vm.actuals].sort((a,b)=>a.period.localeCompare(b.period));
  const latest=rows.at(-1),previous=rows.at(-2);
  return metrics([
    metric("最新營收變化",signedPct(latest&&previous?((latest.revenue/previous.revenue)-1)*100:null),"相較前一實績期間"),
    metric("毛利率變化",signedPct(latest&&previous?latest.grossMargin-previous.grossMargin:null),"百分點／相較前期"),
    metric("營益率變化",signedPct(latest&&previous?latest.operatingMargin-previous.operatingMargin:null),"百分點／相較前期"),
    metric("EPS 變化",signedNum(latest&&previous?latest.eps-previous.eps:null,2),"元／相較前期"),
  ]);
}

function profitabilityTable(vm){
  return table(["期間","毛利","毛利率","營業利益","營益率","淨利率","EPS"],makeRows(
    [...vm.actuals].sort((a,b)=>a.period.localeCompare(b.period)),
    [r=>esc(r.period),r=>num(r.grossProfit,1),r=>pct(r.grossMargin),r=>num(r.operatingIncome,1),r=>pct(r.operatingMargin),r=>pct(r.netMargin),r=>num(r.eps)]
  ));
}

function profitabilityRead(vm){
  const rows=[...vm.actuals].sort((a,b)=>a.period.localeCompare(b.period));
  const latest=rows.at(-1),previous=rows.at(-2);
  return bullets([
    latest?`${latest.period} 毛利率 ${pct(latest.grossMargin)}、營益率 ${pct(latest.operatingMargin)}、淨利率 ${pct(latest.netMargin)}。`:null,
    latest&&previous?`相較 ${previous.period}，毛利率 ${signedPct(latest.grossMargin-previous.grossMargin)}、營益率 ${signedPct(latest.operatingMargin-previous.operatingMargin)}。`:null,
    latest?`EPS ${num(latest.eps)} 元；後續需觀察獲利率是否與營收成長同步，而非只看單季絕對金額。`:null,
  ]);
}

function forecastTableForYear(vm,year){
  const rows=sortScenarios(vm.forecasts.filter(row=>row.fiscalYear===year));
  const field=vm.dashboard.focusMetric.field;
  const baseFields=new Set(["revenue","grossMargin","netIncome","eps"]);
  const includeFocus=!baseFields.has(field);
  const heads=["情境","營收","毛利率","淨利","EPS",...(includeFocus?[vm.dashboard.focusMetric.label]:[])];
  const cells=[r=>esc(scenarioLabel(r.scenario)),r=>num(r.revenue,1),r=>pct(r.grossMargin),r=>num(r.netIncome,1),r=>num(r.eps),...(includeFocus?[r=>metricValue(field,r[field])]:[])];
  return table(heads,makeRows(rows,cells));
}

function forecastMetricsForYear(vm,year){
  const rows=sortScenarios(vm.forecasts.filter(row=>row.fiscalYear===year));
  const headline=rows.find(row=>row.scenario===vm.dashboard.forecastScenario)??rows[0];
  return metrics([
    ...rows.map(row=>metric(`${year}F ${scenarioLabel(row.scenario)} EPS`,num(row.eps),`營收 ${num(row.revenue,1)} 百萬`)),
    headline?metric(`${year}F ${vm.dashboard.focusMetric.label}`,metricValue(vm.dashboard.focusMetric.field,headline[vm.dashboard.focusMetric.field]),`${scenarioLabel(headline.scenario)}情境`):null,
  ].filter(Boolean));
}

function forecastRead(vm,year){
  const rows=vm.forecasts.filter(row=>row.fiscalYear===year);
  const focus=vm.dashboard.focusMetric;
  const headline=rows.find(row=>row.scenario===vm.dashboard.forecastScenario)??rows[0];
  return bullets([
    headline?`${scenarioLabel(headline.scenario)}情境 ${year}F 營收 ${num(headline.revenue,1)} 百萬、EPS ${num(headline.eps)} 元。`:null,
    `悲觀到樂觀的 ${year}F EPS 區間為 ${range(rows.map(row=>row.eps),value=>num(value))} 元，代表結果對需求與產品組合有明顯敏感度。`,
    headline&&Number.isFinite(headline[focus.field])?`${focus.label} ${scenarioLabel(headline.scenario)}情境為 ${metricValue(focus.field,headline[focus.field])}，需和實績揭露一起追蹤。`:null,
  ]);
}

function scenarioRangeTable(vm){
  const years=[...new Set(vm.forecasts.map(row=>row.fiscalYear))].sort((a,b)=>a-b);
  const focus=vm.dashboard.focusMetric;
  return table(["年度","營收區間","毛利率區間","EPS 區間",`${focus.label}區間`],makeRows(years.map(year=>({year,rows:vm.forecasts.filter(row=>row.fiscalYear===year)})),[
    item=>String(item.year),
    item=>range(item.rows.map(row=>row.revenue),value=>num(value,1)),
    item=>range(item.rows.map(row=>row.grossMargin),value=>pct(value)),
    item=>range(item.rows.map(row=>row.eps),value=>num(value)),
    item=>range(item.rows.map(row=>row[focus.field]),value=>metricValue(focus.field,value)),
  ]));
}

function scenarioRead(vm){
  const years=[...new Set(vm.forecasts.map(row=>row.fiscalYear))].sort((a,b)=>a-b);
  const focus=vm.dashboard.focusMetric;
  return bullets([
    `模型涵蓋 ${years.map(year=>`${year}F`).join("、")}，以樂觀／保守／悲觀情境表達可觀察的結果範圍。`,
    `${focus.label}是判讀獲利兌現的焦點；若占比／組合未達假設，EPS 與毛利率可能同步下修。`,
    "情境是研究估計，不是公司承諾；新實績公布後應逐季回填並重算區間。",
  ]);
}

function capacityMetrics(vm){
  const quantified=vm.capacity.filter(row=>Number.isFinite(row.deltaUnits));
  const delta=quantified.reduce((sum,row)=>sum+row.deltaUnits,0);
  const active=vm.capacity.filter(row=>/actual|ramping|qualified/i.test(row.status??"")).length;
  return metrics([
    metric("公開能力節點",num(vm.capacity.length,0),"設備／產品／研發"),
    metric("已量化增量",quantified.length?`+${num(delta,0)}`:"—","僅計有單位數資料"),
    metric("已啟動或具備",num(active,0),"actual／ramp／qualified"),
    metric("判讀原則","到位 ≠ 放量","仍需利用率與出貨驗證"),
  ]);
}

function ruleRead(vm){
  const rules=[...vm.signalRules].sort((a,b)=>b.weight-a.weight);
  return bullets([
    rules.length?`權重較高的觀察項目：${rules.slice(0,3).map(rule=>rule.metric).join("、")}。`:null,
    "升級條件應由連續數據支持；單月創高或單一公告不足以改變完整判讀。",
    "若任一關鍵條件跌入降級區間，先回到來源與定義核對，再調整研究情境。",
  ]);
}

function outlineGrid(yearA,yearB){
  const titles=[
    "投資摘要與研究框架","已實現財務表現","月營收動能","產品組合與分部結構",
    "獲利結構與營運槓桿",`${yearA}F 獲利與情境區間`,`${yearB}F 成長與獲利兌現`,
    "情境、敏感度與判讀邏輯","產能、能力與成長兌現","驗證訊號與目前狀態",
    "升降級規則與觸發條件","催化劑與風險矩陣","研究結論與下階段驗證","資料來源與研究界線",
  ];
  return `<div class="outline-grid">${titles.map((title,index)=>`<div class="outline-item"><b>${String(index+1).padStart(2,"0")}</b><span>${esc(title)}</span></div>`).join("")}</div>`;
}

function actualBridge(vm){
  const rows=[...vm.actuals].sort((a,b)=>a.period.localeCompare(b.period));
  const latest=rows.at(-1),previous=rows.at(-2);
  const cards=[
    {title:"營收層",body:latest?`${latest.period} 營收 ${num(latest.revenue,1)} 百萬。`:"目前沒有足夠實績。",note:latest&&previous?`較 ${previous.period} ${signedPct((latest.revenue/previous.revenue-1)*100)}。`:"尚無前期比較。"},
    {title:"利潤層",body:latest?`毛利率 ${pct(latest.grossMargin)}、營益率 ${pct(latest.operatingMargin)}。`:"目前沒有足夠實績。",note:latest&&previous?`毛利率較前期 ${signedPct(latest.grossMargin-previous.grossMargin)}。`:"尚無前期比較。"},
    {title:"每股層",body:latest?`EPS ${num(latest.eps)} 元，淨利率 ${pct(latest.netMargin)}。`:"目前沒有足夠實績。",note:latest&&previous?`EPS 較前期 ${signedNum(latest.eps-previous.eps,2)} 元。`:"尚無前期比較。"},
  ];
  return `<div class="twocol">${cards.map(card=>`<div class="split good"><h3>${esc(card.title)}</h3><p>${esc(card.body)}</p><small>${esc(card.note)}</small></div>`).join("")}</div>`;
}

function monthlyMetrics(vm){
  const config=vm.dashboard.monthlyRevenue;
  const rows=[...vm.monthlyRevenue].filter(row=>row.year===config.focusYear&&row.month<=config.cumulativeThroughMonth);
  const latest=[...vm.monthlyRevenue].sort((a,b)=>a.year-b.year||a.month-b.month).at(-1);
  const cumulative=rows.reduce((sum,row)=>sum+Number(row.revenue||0),0)/(config.unitDivisor||1);
  return metrics([
    metric(`${config.focusYear} 1-${config.cumulativeThroughMonth}M 累計`,`${num(cumulative,1)} ${config.unitLabel}`,"公開月營收加總"),
    metric("最新月營收",latest?`${num(latest.revenue/(config.unitDivisor||1),1)} ${config.unitLabel}`:"—","最新可得月份"),
    metric("最新月增率",latest?pct(latest.mom):"—","單月動能"),
    metric("最新年增率",latest?pct(latest.yoy):"—","需求方向"),
  ]);
}

function marginVisual(vm){
  const rows=[...vm.actuals].sort((a,b)=>a.period.localeCompare(b.period));
  const max=Math.max(...rows.flatMap(row=>[row.grossMargin,row.operatingMargin,row.netMargin].filter(Number.isFinite)),50);
  const gradients={gross:"linear-gradient(90deg,#276ef1,#00a6a6)",operating:"linear-gradient(90deg,#5b4bc4,#9c89ef)",net:"linear-gradient(90deg,#d89316,#f2b84b)"};
  const series=[
    ["gross","毛利率",row=>row.grossMargin],
    ["operating","營益率",row=>row.operatingMargin],
    ["net","淨利率",row=>row.netMargin],
  ];
  const legend=`<div class="chart-legend" aria-label="利潤率圖例" style="display:flex;gap:14px;flex-wrap:wrap;margin:2px 0 8px;font-size:8px;color:var(--muted)">${series.map(([key,label])=>`<span class="${key}" style="display:inline-flex;align-items:center;gap:5px"><i style="display:inline-block;width:18px;height:6px;border-radius:999px;background:${gradients[key]}"></i>${esc(label)}</span>`).join("")}</div>`;
  return `${legend}<div class="bars">${series.flatMap(([key,label,get])=>rows.map(row=>`<div class="margin-bar ${key}"><span>${esc(label)} ${esc(row.period)}</span><i><b style="width:${Math.max(2,(get(row)||0)/max*100)}%;background:${gradients[key]}"></b></i><strong>${pct(get(row))}</strong></div>`)).join("")}</div>`;
}

function forecastBridge(vm,year){
  const rows=vm.forecasts.filter(row=>row.fiscalYear===year);
  const headline=rows.find(row=>row.scenario===vm.dashboard.forecastScenario)??rows[0];
  const low=rows.find(row=>row.scenario==="bear")??rows[0],high=rows.find(row=>row.scenario==="bull")??rows.at(-1);
  return `<div class="twocol"><div class="split good"><h3>營收條件</h3><p>${headline?`${year}F ${scenarioLabel(headline.scenario)}情境 ${num(headline.revenue,1)} 百萬；悲觀／樂觀區間 ${num(low?.revenue,1)}–${num(high?.revenue,1)} 百萬。`:"缺少可用預估。"}</p><small>先觀察需求、出貨與產品組合是否支持區間上緣。</small></div><div class="split"><h3>獲利條件</h3><p>${headline?`${scenarioLabel(headline.scenario)}情境 EPS ${num(headline.eps)} 元、毛利率 ${pct(headline.grossMargin)}。`:"缺少可用預估。"}</p><small>${esc(vm.dashboard.focusMetric.label)}是獲利兌現的重要觀察軸。</small></div></div>`;
}

function mixVisual(vm){
  const rows=vm.segments.filter(row=>Number.isFinite(row.share));
  if(rows.length)return `<div class="mix-bars">${rows.map(row=>`<div><span>${esc(row.period)} · ${esc(row.segment)}</span><i><b style="width:${Math.max(2,Math.min(100,row.share))}%"></b></i><strong>${pct(row.share)}</strong></div>`).join("")}</div>`;
  return `<div class="segment-cards">${vm.segments.map(row=>`<article><em>OFFICIAL CATEGORY</em><b>${esc(row.segment)}</b><span>${esc(row.period)} · 官方未揭露占比</span></article>`).join("")}</div>`;
}

function cagrMetrics(vm){
  return vm.dashboard.cagrCards.map(card=>{
    const target=vm.forecasts.find(row=>row.fiscalYear===card.targetYear&&row.scenario===vm.dashboard.forecastScenario);
    const value=cagr(card.baseValue,target?.[card.field],card.years);
    return metric(card.label,value==null?"—":pct(value),`${card.baseYear}A → ${card.targetYear}F`);
  });
}

function ruleCards(vm){
  return `<div class="rule-grid">${vm.signalRules.map(rule=>`<article><div><b>${esc(rule.metric)}</b><small>權重 ${num(rule.weight,1)}</small></div><p class="green"><span>升級</span>${esc(rule.greenCondition)}</p><p class="yellow"><span>觀察</span>${esc(rule.yellowCondition)}</p><p class="red"><span>降級</span>${esc(rule.redCondition)}</p></article>`).join("")}</div>`;
}

const closingRefinementCss=`.conclusion-page{grid-template-rows:auto auto minmax(0,1fr) auto;gap:12px}.next-stage{padding:16px 18px;background:var(--ink);color:#fff}.next-stage-head{display:flex;align-items:end;justify-content:space-between;gap:18px;margin-bottom:13px}.next-stage-head h3{margin:0;font-size:15px;letter-spacing:0}.next-stage-head p{max-width:290px;margin:0;font-size:8px;line-height:1.5;color:#bfd0df;text-align:right}.priority-track{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));position:relative}.priority-track:before{content:"";position:absolute;left:8%;right:8%;top:14px;height:1px;background:#557087}.priority-track article{position:relative;padding:0 18px 0 0}.priority-track article:before{content:"";display:block;width:10px;height:10px;margin:9px 0 12px;border:4px solid var(--ink);outline:2px solid #35d0ba;background:#35d0ba;position:relative;z-index:1}.priority-track b{display:block;font-size:8px;color:#35d0ba}.priority-track strong{display:block;margin-top:5px;font-size:10px;line-height:1.45;color:#fff}.closing-grid.focused{grid-template-columns:minmax(0,1.12fr) minmax(0,.88fr)}.closing-grid.focused .claim-list,.closing-grid.focused .update-list{height:auto}.closing-grid.focused .claim-list li,.closing-grid.focused .update-list li{padding:8px 0}.source-page{grid-template-rows:auto auto minmax(0,1fr) auto;gap:12px}.source-page .source-layout{align-self:start}.source-page .source-records{grid-auto-rows:auto;flex:0 0 auto}.source-page .source-record{padding:8px 0}.evidence-next{min-height:0;padding:15px 17px;background:#eef5fb;border-top:4px solid var(--teal);display:grid;grid-template-rows:auto minmax(0,1fr)}.evidence-next .next-stage-head{margin-bottom:10px}.evidence-next .next-stage-head h3{color:var(--ink);font-size:13px}.evidence-next .next-stage-head p{color:var(--muted)}.evidence-queue{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.evidence-queue article{padding:12px;background:#fff;border-top:2px solid var(--blue)}.evidence-queue b{display:block;font:800 10px Arial;color:var(--blue)}.evidence-queue strong{display:block;margin:7px 0 5px;font-size:9.5px;line-height:1.45}.evidence-queue span{display:block;font-size:7.5px;line-height:1.45;color:var(--muted)}`;

function conclusionPage(vm){
  const statusCounts={green:0,yellow:0,red:0};
  vm.ranking.forEach(row=>{if(statusCounts[row.status]!==undefined)statusCounts[row.status]+=1});
  const claims=vm.claims.slice(0,4);
  const priorities=vm.dashboard.verificationChain.slice(0,3);
  const followups=vm.dashboard.verificationChain.slice(3);
  return `<style>${closingRefinementCss}</style><div class="conclusion-page">
    <section class="decision-summary">
      <div><h2>${esc(vm.dashboard.conclusion)}</h2><p>${esc(vm.thesis.summary)}</p></div>
      <div class="status-strip">
        <article class="green"><strong>${statusCounts.green}</strong><span>支持訊號</span></article>
        <article class="yellow"><strong>${statusCounts.yellow}</strong><span>待確認</span></article>
        <article class="red"><strong>${statusCounts.red}</strong><span>風險訊號</span></article>
      </div>
    </section>
    <section class="next-stage">
      <div class="next-stage-head"><h3>下階段先看這三件事</h3><p>依研究驗證順序排列；先確認領先訊號，再判斷原始投資論點是否需要調整。</p></div>
      <div class="priority-track">${priorities.map((item,index)=>`<article><b>優先 ${index+1}</b><strong>${esc(item)}</strong></article>`).join("")}</div>
    </section>
    <div class="closing-grid focused">
      <section class="closing-panel">
        <div class="closing-head"><h3>支持目前判斷的證據</h3><span>${claims.length} 項研究主張</span></div>
        <ol class="claim-list" style="height:100%;grid-template-rows:repeat(${Math.max(claims.length,1)},minmax(0,1fr))">${claims.map((claim,index)=>`<li><b>${String(index+1).padStart(2,"0")}</b><div><strong>${esc(evidence[claim.evidenceClass]??claim.evidenceClass)}</strong><p>${esc(claim.text)}</p><small>信心 ${esc(claim.confidence)}</small></div></li>`).join("")}</ol>
      </section>
      <section class="closing-panel">
        <div class="closing-head"><h3>後續追蹤項目</h3><span>${followups.length} 個驗證節點</span></div>
        <ol class="update-list" style="height:100%;grid-template-rows:repeat(${Math.max(followups.length,1)},minmax(0,1fr))">${followups.map((item,index)=>`<li><b>${String(index+4).padStart(2,"0")}</b><span>${esc(item)}</span></li>`).join("")}</ol>
      </section>
    </div>
    <div class="decision-boundary"><b>目前判讀邊界</b><p>${esc(vm.dashboard.currentView)}</p><small>${esc(vm.dashboard.estimateNote)}</small></div>
  </div>`;
}

function sourcePage(vm){
  const counts=Object.fromEntries(Object.keys(evidence).map(key=>[key,vm.sources.filter(source=>source.evidenceClass===key).length]));
  const sourceCards=vm.sources.map((source,index)=>`<article class="source-record"><b>${String(index+1).padStart(2,"0")}</b><div><strong>${esc(source.provider)}｜${esc(source.title)}</strong><p>${esc(source.notes??"用於本報告的研究佐證。")}</p><small>${esc(evidence[source.evidenceClass]??source.evidenceClass)} · ${esc(source.publishedDate??source.accessedDate??"日期未標示")} · 信心 ${esc(source.confidence)}</small></div></article>`).join("");
  const legend=Object.entries(evidence).map(([key,label])=>`<article class="method-row ${key}"><div><b>${esc(label)}</b><span>${counts[key]??0} 筆來源</span></div><p>${key==="official"?"公司或主管機關直接揭露":key==="third_party_fact"?"可由公開資料交叉核對":key==="market_consensus"?"市場模型或共識，非公司承諾":"依公開資料推導並明確標示"}</p></article>`).join("");
  const evidencePriorities=vm.dashboard.verificationChain.slice(0,3);
  return `<div class="source-page">
    <div class="research-meta">
      <article><span>研究版本</span><strong>${esc(vm.report.version)}</strong></article>
      <article><span>資料截止日</span><strong>${esc(vm.asOfDate)}</strong></article>
      <article><span>公開來源</span><strong>${vm.sources.length}</strong></article>
      <article><span>研究主張</span><strong>${vm.claims.length}</strong></article>
    </div>
    <div class="source-layout">
      <section class="source-directory"><div class="closing-head"><h3>公開資料來源目錄</h3><span>可追溯至原始出處</span></div><div class="source-records">${sourceCards}</div></section>
      <section class="evidence-method"><div class="closing-head"><h3>證據分級方法</h3><span>事實與推論分開</span></div>${legend}</section>
    </div>
    <section class="evidence-next">
      <div class="next-stage-head"><h3>下一輪需要補強的公開證據</h3><p>追蹤項目必須由公司公告、主管機關資料或可交叉核對的公開事實支持。</p></div>
      <div class="evidence-queue">${evidencePriorities.map((item,index)=>`<article><b>Evidence ${String(index+1).padStart(2,"0")}</b><strong>${esc(item)}</strong><span>取得新公開資料後，重新核對目前結論與訊號狀態。</span></article>`).join("")}</div>
    </section>
    <div class="source-boundary"><b>公開與排除原則</b><p>${esc(vm.dashboard.estimateNote)}</p><small>公開事實可揭露；研究情境必須標示；未公開的券商、法人或客戶資訊不納入公開報告。</small></div>
  </div>`;
}

function standardPages(vm){
  const actuals=[...vm.actuals].sort((a,b)=>a.period.localeCompare(b.period));
  const latest=actuals.at(-1)??{};
  const months=[...vm.monthlyRevenue].sort((a,b)=>a.year-b.year||a.month-b.month);
  const latestMonth=months.at(-1)??{};
  const selectedForecasts=vm.headlineForecasts;
  const forecastYears=[...new Set(vm.forecasts.map(row=>row.fiscalYear))].sort((a,b)=>a-b);
  const forecastYearA=forecastYears[0]??selectedForecasts[0]?.fiscalYear??"最新";
  const forecastYearB=forecastYears.at(-1)??forecastYearA;
  const latestMonthLabel=latestMonth.year?`${latestMonth.year}/${String(latestMonth.month).padStart(2,"0")}`:"最新月份";
  const financialMetrics=metrics([
    metric(`${latest.period??"最新"} 營收`,num(latest.revenue,1),"百萬元／已實現"),
    metric(`${latest.period??"最新"} 毛利率`,pct(latest.grossMargin),"產品組合與成本"),
    metric(`${latest.period??"最新"} 營益率`,pct(latest.operatingMargin),"營運槓桿"),
    metric(`${latest.period??"最新"} EPS`,num(latest.eps),"元／已實現"),
  ]);
  const mixClaims=vm.claims.slice(0,3).map(claim=>claim.text);
  const capacityNotes=vm.capacity.map(row=>`${row.label}：${row.notes??row.status}`);
  const forecastNotes=selectedForecasts.map(row=>`${row.fiscalYear}F ${scenarioLabel(row.scenario)}：${row.notes??"依研究情境推估"}`);
  const latestSignalNotes=vm.ranking.filter(row=>row.status!=="green").slice(0,4).map(row=>`${row.metric}：${row.notes}`);
  const pages=[
    {
      section:standardSection("standard-summary","投資摘要與研究框架",["signalSnapshots","forecasts"]),
      content:`${renderers.summary(vm)}<h3>關鍵財務座標</h3>${renderers["kpi-grid"](vm)}${module("RESEARCH MAP","完整研究版閱讀順序",outlineGrid(forecastYearA,forecastYearB),"wide")}`,
    },
    {
      section:standardSection("standard-actuals","已實現財務表現",["actuals"]),
      content:`${financialMetrics}${financialChangeMetrics(vm)}${module("ACTUALS","季度／年度財務對照",actualTable(vm),"wide")}${module("BRIDGE","營收到 EPS 的實績橋接",actualBridge(vm),"wide")}${module("READ-THROUGH","實績變化怎麼讀",bullets(["先確認營收成長是否已穿透到毛利、營益與 EPS。",latest.period?`${latest.period} 是目前最新已實現觀察點，預估數不與實績混列。`:null]),"note")}`,
    },
    {
      section:standardSection("standard-monthly","月營收動能",["monthlyRevenue"]),
content:`${monthlyMetrics(vm)}${module("MOMENTUM",`${latestMonthLabel} 月營收與近期趨勢`,`<div class="module-grid"><div>${compactBars(vm)}</div><div>${monthlyTable(vm)}</div></div>`,"wide")}${module("READ-THROUGH","近期動能判讀",bullets([latestMonth.revenue!=null?`最新月營收 ${num(latestMonth.revenue/(vm.dashboard.monthlyRevenue.unitDivisor||1),1)} ${vm.dashboard.monthlyRevenue.unitLabel}。`:null,Number.isFinite(latestMonth.mom)?`月增率 ${pct(latestMonth.mom)}；單月跳升仍需觀察後續是否延續。`:null,Number.isFinite(latestMonth.yoy)?`年增率 ${pct(latestMonth.yoy)}，可作為需求方向的公開事實訊號。`:null,vm.dashboard.currentView]),"note")}`,
    },
    {
      section:standardSection("standard-mix","產品組合與分部結構",["segments","actuals"]),
      content:`${module("MIX SHIFT","營收結構變化",mixVisual(vm))}${module("DISCLOSURE","分部／應用資料",segmentTable(vm),"wide")}${module("READ-THROUGH","組合如何影響結論",bullets(mixClaims),"note")}`,
    },
    {
      section:standardSection("standard-profitability","獲利結構與營運槓桿",["actuals"]),
content:`${module("PROFITABILITY","毛利、營益與淨利率對照",profitabilityTable(vm),"wide")}${module("MARGIN PROFILE","各利潤率的實績輪廓",marginVisual(vm),"wide")}${module("MARGIN READ-THROUGH","獲利結構判讀",profitabilityRead(vm),"note")}${module("FOCUS","需要連續驗證的指標",bullets([`毛利率與 ${vm.dashboard.focusMetric.label} 是否同步改善。`,`營收放量後，營益率是否能維持而非被折舊、費用或低毛利產品抵銷。`]),"note")}`,
    },
    {
      section:standardSection("standard-forecast-a",`${forecastYearA}F 獲利與情境區間`,["forecasts"]),
      content:`${forecastMetricsForYear(vm,forecastYearA)}${module("FORECAST",`${forecastYearA}F 樂觀／保守／悲觀`,forecastTableForYear(vm,forecastYearA),"wide")}${module("BRIDGE",`${forecastYearA}F 營收與獲利條件`,forecastBridge(vm,forecastYearA),"wide")}${module("ASSUMPTIONS",`${forecastYearA}F 保守情境需要成立的條件`,forecastRead(vm,forecastYearA),"note")}`,
    },
    {
      section:standardSection("standard-forecast-b",`${forecastYearB}F 成長與獲利兌現`,["forecasts"]),
      content:`${forecastMetricsForYear(vm,forecastYearB)}${metrics(cagrMetrics(vm))}${module("FORECAST",`${forecastYearB}F 樂觀／保守／悲觀`,forecastTableForYear(vm,forecastYearB),"wide")}${module("BRIDGE",`${forecastYearB}F 營收與獲利條件`,forecastBridge(vm,forecastYearB),"wide")}${module("READ-THROUGH",`${forecastYearA}F → ${forecastYearB}F 的關鍵假設`,forecastRead(vm,forecastYearB),"note")}`,
    },
    {
      section:standardSection("standard-sensitivity","情境、敏感度與判讀邏輯",["forecasts"]),
      content:`${module("SENSITIVITY","跨年度結果區間",scenarioRangeTable(vm),"wide")}${module("SCENARIO MATRIX","完整情境矩陣",scenarioTable(vm),"wide")}${module("HOW TO READ","情境怎麼用",scenarioRead(vm),"note")}<p class="fineprint">${esc(vm.dashboard.estimateNote)}</p>`,
    },
    {
      section:standardSection("standard-capacity","產能、能力與成長兌現",["capacity"]),
      content:`${capacityMetrics(vm)}${module("CAPACITY MAP","公開能力與擴張節點",capacityTable(vm),"wide")}${module("EVIDENCE","從投入到營收的判讀",bullets(capacityNotes),"note")}<div class="verification-chain">${vm.dashboard.verificationChain.map((item,index)=>`<div><b>${index+1}</b><span>${esc(item)}</span></div>`).join("")}</div>`,
    },
    {
      section:standardSection("standard-signals","驗證訊號與目前狀態",["signalSnapshots"]),
      content:`${module("CURRENT SIGNALS","目前紅綠燈",renderers.signals(vm))}${module("CURRENT READING","下一階段先看什麼",bullets(latestSignalNotes.length?latestSignalNotes:["目前訊號多數偏正向，仍需等待新實績回填。","不要只用單一紅綠燈改變完整研究結論。"]),"note")}`,
    },
    {
      section:standardSection("standard-rules","升降級規則與觸發條件",["signalRules"]),
      content:`${module("DECISION RULES","後續怎麼升級或降級",ruleCards(vm),"wide")}${module("RULES OF USE","訊號規則的使用方式",ruleRead(vm),"note")}`,
    },
    {
      section:standardSection("standard-risks","催化劑與風險矩陣",["catalysts","risks"]),
      content:`${renderers["catalysts-risks"](vm)}${module("BOUNDARY","判讀邊界",`<p class="narrative">${esc(vm.dashboard.currentView)}</p><p class="fineprint">${esc(vm.dashboard.estimateNote)}</p>`,"note")}`,
    },
    {
      section:standardSection("standard-conclusion","研究結論與下階段驗證",["signalSnapshots","forecasts"],false),
      content:conclusionPage(vm),
    },
    {
      section:standardSection("standard-sources","資料來源、證據等級與研究界線",["sources"],false),
      content:sourcePage(vm),
    },
  ];
  return pages;
}

function sourceIds(vm,s){return [...new Set(s.payloadRefs.flatMap(ref=>Array.isArray(vm[ref])?vm[ref].flatMap(r=>r.sourceIds??[]):[]))]}
function rail(vm,s){if(!s.showSources)return"";const list=sourceIds(vm,s).slice(0,5).map(id=>vm.sourceMap[id]).filter(Boolean);return `<aside><em>EVIDENCE RAIL</em>${list.length?`<ol>${list.map(x=>`<li><b>${esc(evidence[x.evidenceClass]??x.evidenceClass)}</b>${esc(x.provider)}<small>${esc(x.title)}</small></li>`).join("")}</ol>`:"<p>本頁為結構化研究摘要；來源詳見資料來源頁。</p>"}</aside>`}
function page(vm,s,n,total,content){return `<section class="page slide${n===1?" active":""}" data-page="${n}" data-title="${esc(s.title)}"><div class="page-inner${s.showSources?"":" no-rail-page"}"><header><div><span>${String(n).padStart(2,"0")}</span><h1>${esc(s.title)}</h1></div><p>${esc(vm.company.market)} · ${esc(vm.company.ticker)}<br>${esc(vm.asOfDate)} · ${esc(vm.report.version)}</p></header><div class="layout${s.showSources?"":" no-rail"}"><main>${content}</main>${rail(vm,s)}</div><footer>${esc(vm.report.title)}<span>${n} / ${total}</span></footer></div></section>`}

const css=`:root{--ink:#12243a;--blue:#276ef1;--teal:#00a6a6;--green:#16856b;--amber:#d89316;--red:#cb4555;--line:#d7e0e9;--paper:#fbfcfe;--muted:#65778a}*{box-sizing:border-box}html,body{margin:0;height:100%;font-family:"Noto Sans TC","Microsoft JhengHei",Arial,sans-serif;background:#e9eef4;color:var(--ink)}body{overflow:hidden}.reader{height:100%;display:grid;grid-template-rows:54px minmax(0,1fr) 64px}.top{background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 18px}.brand{font-size:13px;font-weight:700;letter-spacing:.02em}.brand:before{content:"";display:inline-block;width:28px;height:3px;background:#35d0ba;margin:0 12px 3px 0}.zoom{display:flex;gap:6px;align-items:center}.top button,.nav>button{border:1px solid #cdd7e3;background:#fff;color:#31455d;border-radius:4px;height:34px;min-width:38px;padding:0 9px;font-weight:800}.top button.active{background:var(--blue);color:#fff;border-color:var(--blue)}.stage{overflow:auto;display:flex;justify-content:center;padding:14px}.wrap{width:794px;height:1123px;position:relative;flex:none}.page{width:794px;height:1123px;background:var(--paper);position:absolute;inset:0;overflow:hidden;transform-origin:top left;display:none;box-shadow:0 12px 34px #12243a29}.page.active{display:block}.page-inner{width:100%;height:100%;padding:34px 38px 28px;position:relative;overflow:hidden;background:linear-gradient(90deg,var(--paper) 0 76%,#f1f5f9 76%)}header{height:76px;border-top:5px solid var(--ink);border-bottom:1px solid #cad5e1;display:flex;justify-content:space-between;align-items:center}header>div{display:flex;align-items:center;gap:13px}header span{font:800 22px Arial;color:var(--blue)}h1{margin:0;font-size:22px;letter-spacing:-.02em}header p{font-size:10px;color:var(--muted);text-align:right;line-height:1.5}.layout{display:grid;grid-template-columns:minmax(0,3.15fr) minmax(145px,1fr);gap:20px;height:930px;padding-top:18px}.layout.no-rail{grid-template-columns:1fr}.layout main{min-width:0;overflow:hidden}h2{font-size:22px;line-height:1.48;margin:4px 0 10px;letter-spacing:-.02em}h3{font-size:12px;letter-spacing:.05em;margin:16px 0 8px}em{font:800 8px Arial;letter-spacing:.16em;color:var(--blue);font-style:normal}.thesis{border-left:5px solid var(--teal);padding:13px 16px;background:#eef9f8}.thesis p,.verdict p,.narrative{font-size:10px;line-height:1.7;color:#50657a}.chain{display:flex;gap:7px;margin:14px 0}.chain>div{flex:1;border-top:2px solid var(--blue);padding-top:7px}.chain b{display:block;color:var(--blue);font:800 9px Arial}.chain span{font-size:9px;line-height:1.4}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin:8px 0 12px}.metric{border:1px solid #d6e0ea;background:#fff;padding:9px;min-height:72px}.metric.green{border-top:4px solid var(--green)}.metric.yellow{border-top:4px solid var(--amber)}.metric.red{border-top:4px solid var(--red)}.metric small,.metric span{display:block;font-size:8px;line-height:1.35;color:var(--muted)}.metric strong{display:block;font:800 17px/1.45 Arial;color:var(--ink)}.module{margin:11px 0;padding:11px 12px;background:#fff;border:1px solid var(--line)}.module.note{background:#f3f7fb;border-left:4px solid var(--teal)}.module-head{display:flex;align-items:baseline;gap:10px;border-bottom:1px solid #e2e8ef;padding-bottom:6px;margin-bottom:8px}.module-head h3{margin:0;font-size:11px}.module-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:14px}.outline-grid{display:grid;grid-template-columns:1fr 1fr;column-gap:18px}.outline-item{display:grid;grid-template-columns:22px 1fr;gap:5px;align-items:center;padding:5px 0;border-bottom:1px solid #e2e8ef}.outline-item b{font:800 9px Arial;color:var(--blue)}.outline-item span{font-size:8px;line-height:1.35}.analysis-list{padding:0;margin:0;list-style:none}.analysis-list li{font-size:9px;line-height:1.55;padding:5px 0 5px 12px;border-bottom:1px solid #e2e8ef;position:relative}.analysis-list li:before{content:"";position:absolute;left:0;top:10px;width:5px;height:5px;background:var(--teal)}table{width:100%;border-collapse:collapse;font-size:8.4px;background:#fff}th,td{padding:6px 5px;border-bottom:1px solid #dfe6ee;text-align:right;vertical-align:top;line-height:1.35}th{background:var(--ink);color:#fff;font-weight:700}th:first-child,td:first-child,th:nth-child(2),td:nth-child(2){text-align:left}.bars{display:grid;gap:5px}.bars>div{display:grid;grid-template-columns:48px 1fr 66px;gap:6px;align-items:center;font-size:8px}.bars i{height:11px;background:#e2e9f0}.bars i b{display:block;height:100%;background:linear-gradient(90deg,var(--blue),var(--teal))}.bars strong{text-align:right}.mix-bars{display:grid;gap:5px}.mix-bars>div{display:grid;grid-template-columns:145px 1fr 38px;align-items:center;gap:7px;font-size:8px}.mix-bars i{height:9px;background:#e4eaf0}.mix-bars i b{display:block;height:100%;background:var(--teal)}.mix-bars strong{text-align:right}.segment-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.segment-cards article{padding:10px;border-top:3px solid var(--teal);background:#f3f7fb}.segment-cards b,.segment-cards span{display:block}.segment-cards b{font-size:10px;margin:5px 0}.segment-cards span{font-size:8px;color:var(--muted)}.layout aside{border-left:1px solid #c9d4df;padding-left:14px;overflow:hidden}.layout aside ol{list-style:none;padding:0;margin:10px 0}.layout aside li{font-size:8px;line-height:1.4;margin-bottom:12px}.layout aside li>b{display:table;background:#dfe8f2;padding:2px 4px;margin-bottom:3px}.layout aside small{display:block;color:var(--muted)}.layout aside p{font-size:8px;line-height:1.55;color:var(--muted)}.signals{display:grid;gap:5px}.signals article{display:grid;grid-template-columns:1fr 45px 1.25fr;gap:7px;padding:7px 8px;border-left:4px solid var(--muted);background:#f8fafc;font-size:8.5px}.signals article.green{border-color:var(--green)}.signals article.yellow{border-color:var(--amber)}.signals article.red{border-color:var(--red)}.signals article strong{color:var(--blue)}.signals article small{grid-column:1/-1;color:var(--muted)}.rule-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.rule-grid article{padding:8px;border:1px solid var(--line);background:#fbfcfe}.rule-grid article>div{display:flex;justify-content:space-between;font-size:9px;margin-bottom:5px}.rule-grid article small{color:var(--muted)}.rule-grid p{display:grid;grid-template-columns:34px 1fr;gap:5px;font-size:7.5px;line-height:1.35;margin:3px 0}.rule-grid p span{font-weight:800}.rule-grid .green span{color:var(--green)}.rule-grid .yellow span{color:var(--amber)}.rule-grid .red span{color:var(--red)}.twocol{display:grid;grid-template-columns:1fr 1fr;gap:10px}.split{padding:10px;background:#fff;border-top:4px solid var(--green)}.split.bad{border-color:var(--red)}.split h3{margin-top:0}.split article{border-top:1px solid #dfe6ee;padding:8px 0}.split p{font-size:8.5px;line-height:1.45;margin:4px 0}.split small{font-size:7.5px;color:var(--muted)}.verification-chain{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}.verification-chain div{display:flex;gap:7px;align-items:flex-start;padding:8px;background:#eef4fb;border-top:2px solid var(--blue)}.verification-chain b{font:800 9px Arial;color:var(--blue)}.verification-chain span{font-size:8px;line-height:1.35}.checklist{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px 0}.checklist article{display:flex;gap:10px;padding:10px;background:#f3f7fb;border-left:3px solid var(--teal)}.checklist b{font:800 10px Arial;color:var(--blue)}.checklist span{font-size:9px}.sources{display:grid;grid-template-columns:1fr 1fr;column-gap:18px}.sources article{display:grid;grid-template-columns:26px 1fr;gap:7px;border-bottom:1px solid #dbe4ed;padding:8px 0}.sources article>b{font:800 12px Arial;color:var(--blue)}.sources strong{font-size:9px}.sources p{font-size:8px;color:var(--muted);margin:3px 0}.evidence-legend{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:14px}.evidence-legend span{padding:10px;background:#f3f7fb;font-size:8px;line-height:1.4}.evidence-legend b{display:block;margin-bottom:4px;color:var(--blue)}.source-boundary{margin-top:14px;padding:12px;border-left:4px solid var(--amber);background:#fff8e9}.source-boundary p{font-size:9px;line-height:1.5;margin:4px 0}.verdict{padding:20px;border-top:6px solid var(--blue);background:#fff}.verdict h2{font-size:24px}.fineprint{font-size:8px;line-height:1.5;color:var(--muted);margin:8px 0}footer{position:absolute;left:38px;right:38px;bottom:14px;border-top:1px solid #cad5e1;padding-top:6px;display:flex;justify-content:space-between;font-size:8px;color:var(--muted)}.nav{min-width:0;background:#f8fafc;border-top:1px solid #d9e2ed;display:grid;grid-template-columns:40px minmax(0,560px) 40px;gap:12px;align-items:center;justify-content:center;padding:7px 12px}.nav-progress{min-width:0}.nav-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}.chapter{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px;font-weight:700;color:#52657a}.count{flex:none;font:800 10px Arial;color:var(--ink)}.dots{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:4px;min-width:0}.dot{display:block;width:100%;min-width:0;height:7px;padding:0;border:0;border-radius:999px;background:#d2dce7;color:transparent;font-size:0;cursor:pointer}.dot.active{background:var(--blue)}.dot:focus-visible,.top button:focus-visible,.nav>button:focus-visible{outline:3px solid #35d0ba;outline-offset:2px}@media(max-width:700px){.top{padding:0 8px}.brand{max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:10px}.stage{padding:8px}.zoom button{min-width:31px;padding:0 6px;font-size:10px}.zoom button:not(.active){display:none}.nav{grid-template-columns:34px minmax(0,1fr) 34px;gap:8px;padding-inline:8px}.nav>button{min-width:34px;padding:0}.chapter{font-size:8px}}@media print{body{overflow:visible;background:#fff}.reader{display:block}.top,.nav{display:none}.stage{display:block;padding:0;overflow:visible}.wrap{width:auto;height:auto}.page{display:block!important;position:relative;box-shadow:none;width:210mm;height:297mm;page-break-after:always;transform:none!important}}`;

const responsiveCss=`.page-inner.no-rail-page{background:var(--paper)}.layout.no-rail main{height:100%}.conclusion-page,.source-page{height:100%;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:16px}.decision-summary{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(220px,.75fr);gap:20px;padding:20px;background:#fff;border-top:6px solid var(--blue)}.decision-summary h2{margin:0 0 8px;font-size:24px}.decision-summary p{margin:0;font-size:10px;line-height:1.7;color:#50657a}.status-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;align-self:stretch}.status-strip article{display:flex;flex-direction:column;justify-content:center;padding:10px;background:#f4f7fb;border-top:4px solid var(--muted)}.status-strip article.green{border-color:var(--green)}.status-strip article.yellow{border-color:var(--amber)}.status-strip article.red{border-color:var(--red)}.status-strip strong{font:800 24px/1 Arial}.status-strip span{margin-top:7px;font-size:8px;color:var(--muted)}.closing-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;min-height:0}.closing-panel,.source-directory,.evidence-method{min-width:0;padding:14px;background:#fff;border:1px solid var(--line)}.closing-panel{display:flex;flex-direction:column}.closing-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:1px solid #dfe6ee}.closing-head h3{margin:0;font-size:12px;letter-spacing:.03em}.closing-head span{font-size:8px;color:var(--muted);white-space:nowrap}.claim-list,.update-list{display:grid;gap:0;padding:0;margin:6px 0 0;list-style:none}.claim-list{grid-template-rows:repeat(4,minmax(0,1fr));height:100%}.claim-list li,.update-list li{display:grid;grid-template-columns:28px 1fr;gap:9px;padding:9px 0;border-bottom:1px solid #e1e8ef}.claim-list li:last-child,.update-list li:last-child{border-bottom:0}.claim-list li>b,.update-list li>b{font:800 11px Arial;color:var(--blue)}.claim-list strong{display:block;font-size:8px;color:var(--teal)}.claim-list p{font-size:9px;line-height:1.5;margin:3px 0}.claim-list small{font-size:7.5px;color:var(--muted)}.update-list{grid-template-rows:repeat(7,minmax(0,1fr));height:100%}.update-list li{align-items:center}.update-list span{font-size:9px;line-height:1.4}.decision-boundary{padding:13px 15px;background:#eef5fb;border-top:2px solid var(--ink);display:grid;grid-template-columns:112px 1fr;gap:4px 14px}.decision-boundary b{grid-row:1/3;font-size:10px}.decision-boundary p,.decision-boundary small{margin:0;font-size:8.5px;line-height:1.5}.decision-boundary small{color:var(--muted)}.research-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.research-meta article{padding:12px;background:#eef4fb;border-top:3px solid var(--blue)}.research-meta span,.research-meta strong{display:block}.research-meta span{font-size:8px;color:var(--muted)}.research-meta strong{margin-top:5px;font:800 15px Arial}.source-layout{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(210px,.75fr);gap:12px;min-height:0}.source-directory,.evidence-method{display:flex;flex-direction:column}.source-records{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(0,1fr);column-gap:14px;flex:1}.source-record{display:grid;grid-template-columns:27px 1fr;gap:8px;padding:10px 0;border-bottom:1px solid #dfe6ee;min-width:0}.source-record>b{font:800 12px Arial;color:var(--blue)}.source-record strong{display:block;font-size:8.5px;line-height:1.35}.source-record p{font-size:7.7px;line-height:1.4;color:#50657a;margin:4px 0}.source-record small{display:block;font-size:7px;line-height:1.35;color:var(--muted)}.method-row{padding:11px 0;border-bottom:1px solid #dfe6ee}.method-row:last-child{border-bottom:0}.method-row>div{display:flex;justify-content:space-between;gap:8px}.method-row b{font-size:9px;color:var(--blue)}.method-row span{font-size:7.5px;color:var(--muted)}.method-row p{font-size:8px;line-height:1.45;margin:5px 0 0}.source-page .source-boundary{margin:0;padding:13px 15px;background:#fff8e9;border:0;border-top:2px solid var(--amber)}.source-page .source-boundary b{font-size:10px}.source-page .source-boundary p{font-size:8.5px;line-height:1.5;margin:4px 0}.source-page .source-boundary small{display:block;font-size:7.5px;line-height:1.45;color:#7b6841}`;
function shell(vm,items){const total=items.length,final={...vm,profile:{...vm.profile,expectedPages:total,renderedPages:total}},pages=items.map((x,i)=>page(final,x.section,i+1,total,x.content)),dots=items.map((item,i)=>`<button class="dot${i?"":" active"}" data-page="${i}" aria-label="第 ${i+1} 頁：${esc(item.section.title)}" title="${esc(item.section.title)}"></button>`).join(""),title=`${vm.company.name} ${vm.company.ticker}｜Full Research`;return `<!doctype html><html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5,user-scalable=yes"><title>${esc(title)}</title><style>${css}${responsiveCss}</style></head><body data-research-profile="${esc(vm.profileName)}"><div class="reader"><div class="top"><div class="brand">${esc(title)}</div><div class="zoom"><button data-z="fit" class="active">適合</button><button data-z=".75">75%</button><button data-z="1">100%</button><button data-z="1.25">125%</button></div></div><main class="stage" id="stage"><div class="wrap" id="wrap">${pages.join("\n")}</div></main><nav class="nav" aria-label="報告頁面導覽"><button id="prev" aria-label="上一頁">←</button><div class="nav-progress"><div class="nav-meta"><span class="chapter" id="chapter">${esc(items[0]?.section.title??"")}</span><span class="count" id="count">1 / ${total}</span></div><div class="dots">${dots}</div></div><button id="next" aria-label="下一頁">→</button></nav></div><pre hidden id="research-qc-result"></pre><script id="research-report-payload" type="application/json">${json(final)}</script><script>${runtime}</script></body></html>`}

const runtime=`(()=>{const pages=[...document.querySelectorAll('.page')],stage=document.getElementById('stage'),wrap=document.getElementById('wrap'),count=document.getElementById('count'),chapter=document.getElementById('chapter'),dots=[...document.querySelectorAll('.dot')];let active=0,zoom='fit';
const scale=()=>{const n=zoom==='fit'?Math.min((stage.clientWidth-28)/794,(stage.clientHeight-28)/1123):Number(zoom);wrap.style.width=794*n+'px';wrap.style.height=1123*n+'px';pages.forEach(p=>p.style.transform='scale('+n+')')};
const show=i=>{active=Math.max(0,Math.min(pages.length-1,i));pages.forEach((p,n)=>p.classList.toggle('active',n===active));dots.forEach((d,n)=>d.classList.toggle('active',n===active));count.textContent=(active+1)+' / '+pages.length;chapter.textContent=pages[active]?.dataset.title||'';stage.scrollTop=0;stage.scrollLeft=0};
const collectQc=()=>{const overflows=[],overlaps=[],clippings=[],before=active;pages.forEach((p,i)=>{show(i);const inner=p.querySelector('.page-inner'),box=inner.getBoundingClientRect(),blocks=[...inner.children].filter(x=>!['SCRIPT','STYLE'].includes(x.tagName));for(const area of [inner,p.querySelector('.layout main'),p.querySelector('.layout aside')].filter(Boolean))if(area.scrollHeight>area.clientHeight+1)overflows.push({page:i+1,pixels:area.scrollHeight-area.clientHeight,element:area.tagName});const rects=blocks.map(x=>({name:x.tagName,rect:x.getBoundingClientRect()}));for(const item of rects)if(item.rect.left<box.left-1||item.rect.right>box.right+1||item.rect.top<box.top-1||item.rect.bottom>box.bottom+1)clippings.push({page:i+1,element:item.name});for(let a=0;a<rects.length;a++)for(let b=a+1;b<rects.length;b++){const x=Math.min(rects[a].rect.right,rects[b].rect.right)-Math.max(rects[a].rect.left,rects[b].rect.left),y=Math.min(rects[a].rect.bottom,rects[b].rect.bottom)-Math.max(rects[a].rect.top,rects[b].rect.top);if(x>1&&y>1)overlaps.push({page:i+1,a:rects[a].name,b:rects[b].name})}});show(before);const result={version:'p1.6-layout-qc',pages:pages.length,dots:dots.length,profile:document.body.dataset.researchProfile,fallbacks:document.querySelectorAll('.layout-fallback').length,overflows,overlaps,clippings,horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),viewport:{width:innerWidth,height:innerHeight}};document.getElementById('research-qc-result').textContent=JSON.stringify(result);return result};
document.addEventListener('click',e=>{const z=e.target.closest('[data-z]');if(z){zoom=z.dataset.z;document.querySelectorAll('[data-z]').forEach(b=>b.classList.toggle('active',b===z));scale()}const d=e.target.closest('[data-page]');if(d)show(Number(d.dataset.page))});document.getElementById('prev').onclick=()=>show(active-1);document.getElementById('next').onclick=()=>show(active+1);addEventListener('resize',scale);addEventListener('keydown',e=>{if(['ArrowRight','PageDown'].includes(e.key))show(active+1);if(['ArrowLeft','PageUp'].includes(e.key))show(active-1)});show(0);scale();window.__researchLayout={version:'p1.10-generic-renderer',totalPages:pages.length,activePage:()=>active+1,collectQc}})();`;

const special={ranking:{id:"generated-ranking",type:"signals",title:"Research Signal Ranking",sortOrder:1,payloadRefs:["signalSnapshots"],showSources:true},"panel-summary":{id:"generated-summary",type:"summary",title:"Panel Summary",sortOrder:2,payloadRefs:["thesis","forecasts"],showSources:true}};
export function renderGeneratedReport(vm){
  if(vm.profile.layout==="research-standard-v2"){
    const rendered=standardPages(vm);
    if(vm.profile.expectedPages!==undefined&&rendered.length!==vm.profile.expectedPages)throw new Error(`Expected ${vm.profile.expectedPages} generated pages, got ${rendered.length}`);
    return enhanceZoomControls(shell(vm,rendered));
  }
  const selected=vm.profile.sections.includes("package-sections")?[...vm.sections].sort((a,b)=>a.sortOrder-b.sortOrder):vm.profile.sections.map(key=>special[key]??vm.sections.find(s=>s.id===key||s.type===key)).filter(Boolean);
  if(!vm.profile.sections.includes("package-sections")&&selected.length!==vm.profile.sections.length)throw new Error("One or more report sections could not be resolved");
  const rendered=selected.map(section=>{const render=renderers[section.type];if(!render)throw new Error(`Unknown report section renderer: ${section.type}`);return{section,content:render(vm,section)}});
  if(vm.profile.expectedPages!==undefined&&rendered.length!==vm.profile.expectedPages)throw new Error(`Expected ${vm.profile.expectedPages} generated pages, got ${rendered.length}`);
  return enhanceZoomControls(shell(vm,rendered));
}

const zoomControlsMarkup='<div class="zoom"><button type="button" data-z="fit" class="active fit-button" aria-label="縮放至適合大小">適合</button><label class="zoom-label" for="zoom-range">縮放</label><input id="zoom-range" class="zoom-range" type="range" min="50" max="150" step="1" value="100" aria-label="報告縮放比例" aria-valuetext="適合"><output id="zoom-value" class="zoom-value" for="zoom-range" aria-live="polite">適合</output></div>';
const zoomCss='.zoom{gap:10px}.top .fit-button{min-width:50px;min-height:44px;height:44px}.zoom-label{font-size:10px;font-weight:800;color:#d7e5f2;letter-spacing:.04em}.zoom-range{width:152px;height:44px;margin:0;accent-color:var(--teal);cursor:ew-resize;touch-action:pan-y}.zoom-range:focus-visible{outline:3px solid #35d0ba;outline-offset:2px}.zoom-value{min-width:42px;color:#fff;font:800 10px Arial;text-align:right}@media(max-width:700px){.zoom{gap:0}.zoom-label,.zoom-range,.zoom-value{display:none}.top .fit-button{min-width:48px}}';
const zoomRuntime='(()=>{const range=document.getElementById("zoom-range"),value=document.getElementById("zoom-value"),fit=document.querySelector("[data-z=fit]"),stage=document.getElementById("stage"),wrap=document.getElementById("wrap"),pages=[...document.querySelectorAll(".page")];if(!range||!value||!fit||!stage||!wrap)return;const fitScale=()=>Math.min((stage.clientWidth-28)/794,(stage.clientHeight-28)/1123);const apply=n=>{wrap.style.width=794*n+"px";wrap.style.height=1123*n+"px";pages.forEach(p=>p.style.transform="scale("+n+")")};const showFit=()=>{const n=fitScale();apply(n);const percent=Math.max(50,Math.min(150,Math.round(n*100)));range.value=String(percent);range.setAttribute("aria-valuenow",String(percent));range.setAttribute("aria-valuetext","適合");value.textContent="適合"};range.addEventListener("input",()=>{const n=Number(range.value)/100;apply(n);fit.classList.remove("active");range.setAttribute("aria-valuenow",range.value);range.setAttribute("aria-valuetext",range.value+"%");value.textContent=range.value+"%"});fit.addEventListener("click",showFit);addEventListener("resize",()=>{if(fit.classList.contains("active"))showFit()});showFit()})();';
function enhanceZoomControls(html){return html.replace(/<div class="zoom">[\s\S]*?<\/div>/,zoomControlsMarkup).replace('</style></head>',`<style>${zoomCss}</style></head>`).replace(/<\/script><\/body><\/html>$/ ,`</script><script>${zoomRuntime}</script></body></html>`)}
