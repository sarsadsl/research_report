(() => {
  const report=document.querySelector('.report');
  const viewport=document.getElementById('readerViewport');
  const dotBox=document.getElementById('pageDots');
  if(!report||!viewport)return;
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
  const indexFromScroll=()=>Math.max(0,Math.min(total-1,Math.round(viewport.scrollLeft/Math.max(1,viewport.clientWidth))));
  const hashMatch=location.hash.match(/(?:page-)?(\d+)$/);setActive(hashMatch?Number(hashMatch[1])-1:0);
  let scrollRaf=0;viewport.addEventListener('scroll',()=>{if(scrollRaf)return;scrollRaf=requestAnimationFrame(()=>{scrollRaf=0;setActive(indexFromScroll());});},{passive:true});
  const goTo=(index)=>{index=Math.max(0,Math.min(total-1,index));const target=slides[index];setActive(index);target.classList.add('page-enter');viewport.scrollTo({left:index*viewport.clientWidth,top:0,behavior:'auto'});history.replaceState(null,'',`#page-${index+1}`);requestAnimationFrame(()=>requestAnimationFrame(()=>target.classList.remove('page-enter')));};
  document.addEventListener('click',(event)=>{const a=event.target.closest?.('.reader-dot,.bottom-arrow');if(!a)return;let index=a.dataset.goto!==undefined?Number(a.dataset.goto):NaN;if(!Number.isFinite(index)){const m=(a.getAttribute('href')||'').match(/page-(\d+)/);if(m)index=Number(m[1])-1;}if(!Number.isFinite(index))return;event.preventDefault();goTo(index);},true);
  requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.classList.add('reader-layout-ready')));
  window.__researchLayout={version:'v7-safe-pagination',totalPages:total,activePage:()=>activeIndex+1,overflows:()=>slides.map((slide,i)=>{const inner=slide.querySelector('.page-inner');return{page:i+1,fallback:slide.classList.contains('layout-fallback'),overflow:inner?inner.scrollHeight-inner.clientHeight:0};})};
})();
