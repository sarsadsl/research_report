(() => {
  const report=document.querySelector('.report');
  const viewport=document.getElementById('readerViewport');
  const dotBox=document.getElementById('pageDots');
  if(!report||!viewport)return;
  const payloadNode=document.getElementById('research-report-payload');
  let payload=null;
  try{payload=payloadNode?JSON.parse(payloadNode.textContent||''):null;}catch{}
  const hydrateVpecBaseline=()=>{
    if(payload?.profileName!=='full-research'||payload?.company?.slug!=='vpec-2455')return;
    const page=number=>report.querySelector(`.slide[data-page="${number}"]`);
    const safe=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
    const fmt=(value,digits=1)=>Number(value).toLocaleString('zh-TW',{minimumFractionDigits:digits,maximumFractionDigits:digits});
    const monthly=[...(payload.monthlyRevenue||[])].sort((a,b)=>a.year-b.year||a.month-b.month);
    const latest=monthly.at(-1),july=monthly.find(row=>row.year===2026&&row.month===7);
    const latestOpto=(payload.segments||[]).find(row=>row.period===`${latest?.year}/${String(latest?.month||'').padStart(2,'0')}`&&row.segment==='光電子');
    if(!latest||!latestOpto)return;
    const monthLabel=`${latest.year}/${String(latest.month).padStart(2,'0')}`;
    const revenueYi=fmt(latest.revenue/(payload.dashboard?.monthlyRevenue?.unitDivisor||100),2);
    const optoShare=fmt(latestOpto.share,1);
    const julyShare=july?fmt((payload.segments||[]).find(row=>row.period==='2026/07'&&row.segment==='光電子')?.share||40.1,1):'40.1';
    const p1=page(1);
    if(p1){
      const darkCard=p1.querySelector('.card.kpi.dark');
      if(darkCard){
        const label=darkCard.querySelector('.label'),value=darkCard.querySelector('.value'),delta=darkCard.querySelector('.delta');
        if(label)label.textContent=`${monthLabel} 營收`;
        if(value)value.textContent=`${revenueYi} 億`;
        if(delta)delta.textContent='7–8 月連續創高';
      }
      const date=p1.querySelector('div[style*="font-size:16px"]');
      if(date)date.textContent=String(payload.asOfDate||'').slice(0,7).replace('-','.');
      const core=[...p1.querySelectorAll('.bigcall')].find(node=>(node.textContent||'').includes('核心判斷：'));
      if(core)core.innerHTML=`<b>核心判斷：</b>2025Q4 → 2026Q2 的真正變化，不只是營收總量，而是<b>毛利率與每股獲利持續改善</b>。7–8 月營收連續創高，${monthLabel} 營收達 ${safe(revenueYi)} 億元；公開資料整理的光電子占比約 ${safe(optoShare)}%（非公司正式分部揭露），代表先前受限的需求開始釋放。若產品組合改善能延續，2027 年光電子占比超越微電子仍是獲利彈性的核心來源。`;
      const toc=[...p1.querySelectorAll('.toc-item')];
      const mixDesc=toc[1]?.querySelector('.toc-desc');
      if(mixDesc)mixDesc.textContent='InP 限制下的占比變化，以及 7–8 月供應改善後的訊號。';
      const abs=[...p1.querySelectorAll('.abs-item')];
      const revenueAbs=abs.find(node=>(node.textContent||'').includes('營收是否加速？'));
      if(revenueAbs){const span=revenueAbs.querySelector('span');if(span)span.textContent=`季度尚未；7–8 月連續創高。追蹤 9–12 月是否維持 4.2 億以上。`;}
      const optoAbs=abs.find(node=>(node.textContent||'').includes('光電子是否成主引擎？'));
      if(optoAbs){const span=optoAbs.querySelector('span');if(span)span.textContent=`H1 約 26%，7 月約 ${julyShare}% → ${monthLabel} 約 ${optoShare}%；驗證 2026F 全年約 36%。`;}
      const pending=[...p1.querySelectorAll('.card')].find(node=>(node.textContent||'').includes('上半年光電子占比僅約 26%'));
      if(pending){const text=pending.querySelector('.small');if(text)text.textContent=`上半年光電子占比約 26%；7–8 月營收連續創高，${monthLabel} 光電子占比公開資料整理約 ${optoShare}%。後續要看 9–12 月能否延續，而非只看單月高點。`;}
      const source=[...p1.querySelectorAll('.sourcebox')].find(node=>(node.textContent||'').includes('未正式揭露的 7 月光電子占比'));
      if(source)source.textContent='營運層：產品、InP 供應、MOCVD、新產品量產與應用方向採公司公開資訊與公開資料整理；未正式揭露的 7–8 月光電子占比明確標示為研究估計。';
      const policy=[...p1.querySelectorAll('.two-col-text p')].find(node=>(node.textContent||'').includes('未正式揭露的 7 月光電子占比'));
      if(policy)policy.innerHTML='<b>營運層：</b>產品、InP 供應、MOCVD、新產品量產與應用方向採公司公開資訊與公開資料整理；未正式揭露的 7–8 月光電子占比明確標示為研究估計。';
    }
    const p3=page(3);
    if(p3){
      const stacks=[...p3.querySelectorAll('.stack-wrap')],latestStack=stacks.at(-1);
      if(latestStack){
        const label=latestStack.querySelector('.stack-label'),micro=latestStack.querySelector('.micro'),opto=latestStack.querySelector('.opto'),note=latestStack.querySelector('.stack-note');
        if(label)label.textContent=monthLabel;
        if(micro){micro.style.width=`${Math.max(0,100-latestOpto.share)}%`;micro.textContent=`${fmt(100-latestOpto.share,1)}%`;}
        if(opto){opto.style.width=`${latestOpto.share}%`;opto.textContent=`${optoShare}%`;}
        if(note)note.textContent='公開資料整理';
      }
      const read=[...p3.querySelectorAll('p')].find(node=>(node.textContent||'').includes('7 月總營收'));
      if(read)read.innerHTML=`7–8 月營收連續創高；${monthLabel} 營收 ${safe(revenueYi)} 億元，若光電子占比公開資料整理約 ${safe(optoShare)}% 成立，單月光電子約 ${safe(fmt(latestOpto.revenue/100,2))} 億元。接下來需要 9–12 月連續性，才能確認是遞延訂單回補，還是新的 run-rate。`;
      const tiny=[...p3.querySelectorAll('.tiny')].find(node=>(node.textContent||'').includes('7 月光電子占比'));
      if(tiny)tiny.textContent=`注意：7–8 月光電子占比約 ${julyShare}% → ${optoShare}% 為公開資料整理與研究推估，非公司正式分部公告；但 ${monthLabel} 總營收 ${safe(revenueYi)} 億為已公告實績。`;
      const title=[...p3.querySelectorAll('.title')].find(node=>(node.textContent||'').includes('7 月為何'));
      if(title)title.textContent='7–8 月為何是關鍵但仍不足以定論？';
      const source=p3.querySelector('.sourcebox');
      if(source)source.textContent='本頁產品占比與產業路線來自公司公開資訊與公開資料整理；7–8 月占比、個別產品毛利率為研究估計，不等同公司財報分部揭露。';
      const strips=[...p3.querySelectorAll('.bs')];
      if(strips[0]){const b=strips[0].querySelector('b'),span=strips[0].querySelector('span');if(b)b.textContent='8月訊號';if(span)span.textContent=`營收 ${safe(revenueYi)} 億、光電子占比公開資料整理約 ${safe(optoShare)}%。`}
      const small=[...p3.querySelectorAll('.small')].find(node=>(node.textContent||'').includes('接下來需要 8-12'));
      if(small)small.textContent='接下來需要 9-12 月連續性，才能確認是遞延訂單回補，還是新的 run-rate。';
    }
    const p4=page(4),forecastNote=p4?.querySelector('.table-note');
    if(forecastNote&&!forecastNote.dataset.publicUpdate){
      forecastNote.textContent=`${forecastNote.textContent} 8 月公開實績已納入月營收頁；年度情境仍維持既有市場共識，待正式財報與後續月營收再重估。`;
      forecastNote.dataset.publicUpdate='1';
    }
    if(p4){
      const continuation=[...p4.querySelectorAll('.small')].find(node=>(node.textContent||'').includes('若 8-12 月維持 7 月附近水準'));
      if(continuation)continuation.textContent='若 9–12 月維持 7–8 月附近水準，全年營收共識具有相當可達性。';
      const mixCondition=[...p4.querySelectorAll('.small')].find(node=>(node.textContent||'').includes('7 月 >40% 是重要起點'));
      if(mixCondition)mixCondition.textContent='全年共識約 36%；由於 H1 僅約 26%，H2 需要明顯拉高，7–8 月 >40% 是重要起點。';
      const roseCondition=[...p4.querySelectorAll('.small')].find(node=>(node.textContent||'').includes('如果只用 7 月營收年化'));
      if(roseCondition)roseCondition.textContent='如果只用 7–8 月營收年化，會忽略 Q3/Q4 EPS 預估中的毛利率跳升假設。2026F 的關鍵不是「營收有沒有 45 億」，而是「光電子占比與 ASP 能不能讓毛利率跨過 40%」。';
    }
    const p8=page(8),signal=p8?.querySelector('.signal-now');
    if(signal){
      const badge=signal.querySelector('.badge'),heading=signal.querySelector('.txt b'),body=signal.querySelector('.txt span');
      if(badge)badge.innerHTML='目前<br/>偏綠';
      if(heading)heading.textContent=`截至 26Q2 + ${monthLabel} 的目前判讀`;
      if(body)body.innerHTML=`公司目前判讀偏綠：7–8 月營收連續創高，${monthLabel} 光電子占比公開資料整理約 <b>${safe(optoShare)}%</b>，方向進一步轉正；但仍需用 9–12 月營收、毛利率是否站穩 40% 以上，以及 InP 供應是否穩定來確認，尚不能直接視為全面綠燈。`;
    }
    if(p8){
      const greenRule=[...p8.querySelectorAll('li')].find(node=>(node.textContent||'').includes('8-12 月可延續'));
      if(greenRule)greenRule.innerHTML=greenRule.innerHTML.replace('8-12 月可延續','9–12 月可延續');
    }
    const conclusion=[...(p8?.querySelectorAll('.bigcall')||[])].find(node=>(node.textContent||'').includes('截至目前的結論'));
    if(conclusion)conclusion.innerHTML=`<b>截至目前的結論：</b>全新已從「光電子成長故事」進入「財務數字開始驗證」階段。25Q4–26Q2 的毛利率與 EPS 已改善，7–8 月營收連續創高、${monthLabel} 光電子占比公開資料整理約 ${safe(optoShare)}%，因此目前判定為<b>偏綠</b>；若接下來營收維持高檔、光電子占比穩在 45% 左右、GM 升至 41–42% 且 InP 供應順暢，才可提高 2027 共識模型可信度。`;
  };
  hydrateVpecBaseline();
  document.documentElement.classList.remove('reader-layout-ready');
  const originals=[...report.querySelectorAll(':scope > .slide')];
  const overflowPx=1;
  const titleFor=(slide,idx)=>{if(idx===0)return '摘要、目錄與研究大綱';const n=slide.querySelector('.topline .name');return n?n.textContent.trim():`第 ${idx+1} 頁`;};
  const forcedFor=(title,idx)=>{
    if(idx===0)return ['研究結論速覽'];
    if(title.includes('04｜2026F'))return ['把全年共識反推成 H2 毛利率'];
    if(title.includes('05｜2027F'))return ['把 CAGR 拆成'];
    if(title.includes('06｜情境分析'))return ['從「數字」轉成投資論述升降級規則'];
    if(title.includes('07｜產能擴充量化'))return ['把設備擴產放回 2027F 模型'];
    return [];
  };
  const beginsWithAny=(node,phrases)=>{const t=(node.innerText||'').trim();return phrases.some(p=>t.startsWith(p));};

  originals.forEach((original,originalIndex)=>{
    const originalInner=original.querySelector('.page-inner'); if(!originalInner)return;
    const baseTitle=titleFor(original,originalIndex), forced=forcedFor(baseTitle,originalIndex);
    const needsFlow=forced.length>0 || originalInner.scrollHeight>originalInner.clientHeight+overflowPx;
    if(!needsFlow)return;
    const template=original.cloneNode(true), nodes=[...originalInner.children].map(n=>n.cloneNode(true));
    let part=0;
    const makeSlide=()=>{const slide=template.cloneNode(true);slide.removeAttribute('id');slide.removeAttribute('data-page');const inner=slide.querySelector('.page-inner');inner.replaceChildren();if(part>0){const top=document.createElement('div');top.className='topline continuation-topline';top.innerHTML=`<div class="name">${baseTitle}（續 ${part+1}）</div><div class="meta">內容分頁以保留安全留白，避免重疊或裁切</div>`;inner.appendChild(top);}slide.dataset.chapterTitle=part===0?baseTitle:`${baseTitle}（續 ${part+1}）`;return slide;};
    let current=makeSlide(); original.replaceWith(current); let inner=current.querySelector('.page-inner');
    const startNew=()=>{part+=1;const next=makeSlide();current.after(next);current=next;inner=current.querySelector('.page-inner');return inner;};
    for(const node of nodes){
      const prefix=part>0?1:0;
      if(beginsWithAny(node,forced) && inner.children.length>prefix){startNew();}
      inner.appendChild(node);
      if(inner.scrollHeight<=inner.clientHeight+overflowPx)continue;
      inner.removeChild(node);
      let carry=null;
      const last=inner.lastElementChild;
      if(last && last.classList.contains('section-title')){carry=last;carry.remove();}
      startNew();
      if(carry)inner.appendChild(carry);
      inner.appendChild(node);
      if(inner.scrollHeight>inner.clientHeight+overflowPx){current.classList.add('layout-fallback');}
    }
  });

  const slides=[...report.querySelectorAll(':scope > .slide')], total=slides.length;
  slides.forEach((slide,i)=>{slide.id=`page-${i+1}`;slide.dataset.page=String(i+1);if(!slide.dataset.chapterTitle)slide.dataset.chapterTitle=titleFor(slide,i);const spans=slide.querySelectorAll('.footer span');if(spans.length)spans[spans.length-1].textContent=`Page ${i+1} / ${total}`;});
  if(dotBox){dotBox.replaceChildren(...slides.map((slide,i)=>{const a=document.createElement('a');a.className=`reader-dot${i===0?' active':''}`;a.href=`#page-${i+1}`;a.dataset.goto=String(i);a.setAttribute('aria-label',`前往第 ${i+1} 頁`);a.textContent=String(i+1);return a;}));}
  for(const id of ['bottomPageCount','topPageCount']){const el=document.getElementById(id);if(el)el.textContent=`1 / ${total}`;}
  let activeIndex=0;
  const setActive=(index)=>{index=Math.max(0,Math.min(total-1,index));activeIndex=index;slides.forEach((slide,i)=>{slide.classList.toggle('is-active',i===index);slide.classList.toggle('is-near',Math.abs(i-index)<=1);});};
  const collectQc=()=>{
    const tolerance=1,overflows=[],overlaps=[],clippings=[];
    for(const [index,slide] of slides.entries()){
      const inner=slide.querySelector('.page-inner');if(!inner)continue;
      const overflow=Math.max(0,inner.scrollHeight-inner.clientHeight);
      if(overflow>tolerance)overflows.push({page:index+1,pixels:overflow});
      const innerRect=inner.getBoundingClientRect();
      const children=[...inner.children].filter((element)=>{const style=getComputedStyle(element),rect=element.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&style.position!=='absolute'&&style.position!=='fixed'&&rect.width>0&&rect.height>0;});
      for(const [childIndex,element] of children.entries()){
        const rect=element.getBoundingClientRect();
        if(rect.left<innerRect.left-tolerance||rect.right>innerRect.right+tolerance||rect.top<innerRect.top-tolerance||rect.bottom>innerRect.bottom+tolerance){clippings.push({page:index+1,element:element.className||element.tagName});}
        for(const other of children.slice(childIndex+1)){
          const otherRect=other.getBoundingClientRect(),width=Math.min(rect.right,otherRect.right)-Math.max(rect.left,otherRect.left),height=Math.min(rect.bottom,otherRect.bottom)-Math.max(rect.top,otherRect.top);
          if(width>tolerance&&height>tolerance)overlaps.push({page:index+1,first:element.className||element.tagName,second:other.className||other.tagName,width:Math.round(width),height:Math.round(height)});
        }
      }
    }
    return{version:'p1.6-layout-qc',pages:total,dots:dotBox?.children.length??0,fallbacks:slides.filter(slide=>slide.classList.contains('layout-fallback')).length,overflows,overlaps,clippings,horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),viewport:{width:innerWidth,height:innerHeight},profile:document.body.dataset.researchProfile||'full-research'};
  };
  const indexFromScroll=()=>Math.max(0,Math.min(total-1,Math.round(viewport.scrollLeft/Math.max(1,viewport.clientWidth))));
  const hashMatch=location.hash.match(/(?:page-)?(\d+)$/);setActive(hashMatch?Number(hashMatch[1])-1:0);
  let scrollRaf=0;viewport.addEventListener('scroll',()=>{if(scrollRaf)return;scrollRaf=requestAnimationFrame(()=>{scrollRaf=0;setActive(indexFromScroll());});},{passive:true});
  const goTo=(index)=>{index=Math.max(0,Math.min(total-1,index));const target=slides[index];setActive(index);target.classList.add('page-enter');viewport.scrollTo({left:index*viewport.clientWidth,top:0,behavior:'auto'});history.replaceState(null,'',`#page-${index+1}`);requestAnimationFrame(()=>requestAnimationFrame(()=>target.classList.remove('page-enter')));};
  document.addEventListener('click',(event)=>{const a=event.target.closest?.('.reader-dot,.bottom-arrow');if(!a)return;let index=a.dataset.goto!==undefined?Number(a.dataset.goto):NaN;if(!Number.isFinite(index)){const m=(a.getAttribute('href')||'').match(/page-(\d+)/);if(m)index=Number(m[1])-1;}if(!Number.isFinite(index))return;event.preventDefault();goTo(index);},true);
  const publishQc=()=>{let output=document.getElementById('research-qc-result');if(!output){output=document.createElement('pre');output.id='research-qc-result';output.hidden=true;document.body.appendChild(output);}output.textContent=JSON.stringify(collectQc());};
  publishQc();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{document.documentElement.classList.add('reader-layout-ready');publishQc();}));
  window.__researchLayout={version:'v7-safe-pagination',totalPages:total,activePage:()=>activeIndex+1,overflows:()=>slides.map((slide,i)=>{const inner=slide.querySelector('.page-inner');return{page:i+1,fallback:slide.classList.contains('layout-fallback'),overflow:inner?inner.scrollHeight-inner.clientHeight:0};}),collectQc};
})();
