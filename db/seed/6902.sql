PRAGMA foreign_keys = ON;

INSERT INTO research_companies
(id,ticker,market,name,slug,sector,industry,currency,description,status,created_at,updated_at)
VALUES
('gogolook-6902','6902','TW','Gogolook 走著瞧','gogolook-6902','數位雲端','信任科技／防詐軟體／金融科技 TrustTech','TWD','以 Whoscall 消費者防詐、企業防詐與金融科技建立多元收入；袋鼠金融為金融媒合平台，JUJI 為承擔分期應收與信用風險的金融科技服務，不能全部視為純訂閱軟體。','active','2026-10-23','2026-10-23')
ON CONFLICT(id) DO UPDATE SET ticker=excluded.ticker,market=excluded.market,name=excluded.name,slug=excluded.slug,sector=excluded.sector,industry=excluded.industry,currency=excluded.currency,description=excluded.description,status=excluded.status,created_at=excluded.created_at,updated_at=excluded.updated_at;

INSERT INTO research_financial_actuals
(id,company_id,period,fiscal_year,quarter,revenue,gross_profit,gross_margin,operating_income,operating_margin,net_income,net_margin,eps,source_note,created_at)
VALUES
('gogo-2025fy','gogolook-6902','2025FY',2025,NULL,1048.183,925.917,88.34,63.333,6.04,53.846,5.14,1.58,'official; sources=gogo-src-annual,gogo-src-oct','2026-10-23'),
('gogo-2026q1','gogolook-6902','2026Q1',2026,1,303.108,270.006,89.08,54.853,18.1,58.021,19.14,1.64,'official; sources=gogo-src-oct,gogo-src-q2','2026-10-23'),
('gogo-2026q2','gogolook-6902','2026Q2',2026,2,309.716,277.491,89.6,63.744,20.58,59.606,19.25,1.69,'official; sources=gogo-src-q2,gogo-src-oct','2026-10-23')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,fiscal_year=excluded.fiscal_year,quarter=excluded.quarter,revenue=excluded.revenue,gross_profit=excluded.gross_profit,gross_margin=excluded.gross_margin,operating_income=excluded.operating_income,operating_margin=excluded.operating_margin,net_income=excluded.net_income,net_margin=excluded.net_margin,eps=excluded.eps,source_note=excluded.source_note,created_at=excluded.created_at;

INSERT INTO research_monthly_revenue
(id,company_id,year,month,revenue,mom,yoy,created_at)
VALUES
('gogo-2601','gogolook-6902',2026,1,104.361,2.74,37.39,'2026-10-23'),
('gogo-2602','gogolook-6902',2026,2,90.876,-12.92,16.56,'2026-10-23'),
('gogo-2603','gogolook-6902',2026,3,107.871,18.7,26.12,'2026-10-23'),
('gogo-2604','gogolook-6902',2026,4,98.842,-8.37,21.15,'2026-10-23'),
('gogo-2605','gogolook-6902',2026,5,100.681,1.86,27.7,'2026-10-23'),
('gogo-2606','gogolook-6902',2026,6,110.192,9.45,36.46,'2026-10-23'),
('gogo-2607','gogolook-6902',2026,7,109.746,-0.4,30.83,'2026-10-23'),
('gogo-2608','gogolook-6902',2026,8,111.984,2.04,29.55,'2026-10-23'),
('gogo-2609','gogolook-6902',2026,9,113.873,1.69,17.87,'2026-10-23')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,year=excluded.year,month=excluded.month,revenue=excluded.revenue,mom=excluded.mom,yoy=excluded.yoy,created_at=excluded.created_at;

INSERT INTO research_segments
(id,company_id,period,segment,revenue,share,is_estimate,created_at)
VALUES
('gogo-mix-ads','gogolook-6902','2026Q2','消費者防詐／數位廣告',105.874,34.18,0,'2026-10-23'),
('gogo-mix-sub','gogolook-6902','2026Q2','消費者防詐／APP 訂閱',90.437,29.2,0,'2026-10-23'),
('gogo-mix-corp','gogolook-6902','2026Q2','企業防詐',28.617,9.24,0,'2026-10-23'),
('gogo-mix-juji','gogolook-6902','2026Q2','JUJI／客戶合約收入',26.285,8.49,0,'2026-10-23'),
('gogo-mix-interest','gogolook-6902','2026Q2','金融科技／利息收入',28.819,9.3,0,'2026-10-23'),
('gogo-mix-fin-corp','gogolook-6902','2026Q2','金融科技／企業服務',29.684,9.58,0,'2026-10-23')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,segment=excluded.segment,revenue=excluded.revenue,share=excluded.share,is_estimate=excluded.is_estimate,created_at=excluded.created_at;

INSERT INTO research_forecasts
(id,company_id,fiscal_year,scenario,revenue,gross_margin,net_income,eps,opto_share,notes,created_at)
VALUES
('gogo-2026-bear','gogolook-6902',2026,'bear',1272.427,88.645,221.533,6.15,NULL,'H1 營收 612.824＋Q3 月營收 335.603＋Q4 每月 108 百萬；H2 GM 88%、費用 465 百萬（含信用損失）、業外 0、H2 稅率 10%；H1 淨利 117.627 鎖定，全年淨利／36 百萬股。','2026-10-23'),
('gogo-2026-base','gogolook-6902',2026,'base',1302.427,89.16,263.674,7.32,NULL,'H1 營收 612.824＋Q3 月營收 335.603＋Q4 每月 118 百萬；H2 GM 89%、費用 455 百萬（含信用損失）、業外 0、H2 稅率 8%；H1 淨利 117.627 鎖定，全年淨利／36 百萬股。','2026-10-23'),
('gogo-2026-bull','gogolook-6902',2026,'bull',1338.427,89.698,310.518,8.63,NULL,'H1 營收 612.824＋Q3 月營收 335.603＋Q4 每月 130 百萬；H2 GM 90%、費用 450 百萬（含信用損失）、業外 0、H2 稅率 5%；H1 淨利 117.627 鎖定，全年淨利／36 百萬股。','2026-10-23'),
('gogo-2027-bear','gogolook-6902',2027,'bear',1399.67,87.5,178.834,4.97,NULL,'2026 悲觀營收再增 10%；GM 87.5%，全年費用為（H1 428.9＋H2 465）×1.12 百萬，業外 0、稅率正常化為 20%、36 百萬股。營收增但 EPS 可下降，反映信用成本／費用與稅負壓力。','2026-10-23'),
('gogo-2027-base','gogolook-6902',2027,'base',1562.912,89,349.104,9.7,NULL,'2026 基準營收再增 20%；GM 89%，全年費用為（H1 428.9＋H2 455）×1.08 百萬，業外 0、稅率 20%、36 百萬股。需訂閱、企業合約與金融科技同步成長，且信用損失納入費用後仍有營運槓桿。','2026-10-23'),
('gogo-2027-bull','gogolook-6902',2027,'bull',1739.955,90,493.398,13.71,NULL,'2026 樂觀營收再增 30%；GM 90%，全年費用為（H1 428.9＋H2 450）×1.08 百萬，業外 0、稅率 20%、36 百萬股。須海外付費與企業擴張超預期且信用成本受控，非公司承諾。','2026-10-23')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,fiscal_year=excluded.fiscal_year,scenario=excluded.scenario,revenue=excluded.revenue,gross_margin=excluded.gross_margin,net_income=excluded.net_income,eps=excluded.eps,opto_share=excluded.opto_share,notes=excluded.notes,created_at=excluded.created_at;

INSERT INTO research_capacity_events
(id,company_id,event_date,label,equipment,technology,delta_units,base_units,expected_online_date,actual_online_date,status,notes)
VALUES
('gogo-cap-data','gogolook-6902','2026-10-15','防詐資料與分發能力','Whoscall／ScamAdviser','電話、網域與 AI 風險資料',NULL,NULL,NULL,NULL,'published capability','官方披露 Whoscall 月活躍用戶逾 1,800 萬；MAU／下載數不是付費人數，資料規模仍需由留存與變現驗證。'),
('gogo-cap-japan','gogolook-6902','2026-06','日本樂天試用轉付費','電信通路／Whoscall 訂閱','試用推廣與訂閱轉換',NULL,NULL,NULL,NULL,'ramping evidence','公司表示試用戶正轉為付費，預期 H2 動能增加；未揭露轉換率、ARPU 或對應合約金額。'),
('gogo-cap-gpf','gogolook-6902','2026-09','泰國 GPF 合作備忘錄','GPF／ITMX／DPA','B2C 防詐、企業認證與 Watchmen',NULL,NULL,NULL,NULL,'MoU / not revenue','體系涵蓋逾 120 萬名會員，不等於 120 萬付費用戶；待部署、付費採用與收入確認。'),
('gogo-cap-juji','gogolook-6902','2026-06','JUJI 分期資產規模','AI 風控／分期服務','分期應收 507.667 百萬元',NULL,NULL,NULL,NULL,'actual','Q1 426.603 → Q2 507.667 百萬，QoQ +19.00%；擴張同時需要資金、催收與備抵，不代表無風險的收入。')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,event_date=excluded.event_date,label=excluded.label,equipment=excluded.equipment,technology=excluded.technology,delta_units=excluded.delta_units,base_units=excluded.base_units,expected_online_date=excluded.expected_online_date,actual_online_date=excluded.actual_online_date,status=excluded.status,notes=excluded.notes;

INSERT INTO research_catalysts
(id,company_id,title,impact,status,notes,updated_at)
VALUES
('gogo-cat-conversion','gogolook-6902','海外試用轉付費與通路擴張','high','watch','日本樂天轉換與泰國電信／GPF 通路可增加收入；先驗證訂閱收入，再驗證獲客費用與留存，不能用合作涵蓋人數直接推 EPS。','2026-10-23'),
('gogo-cat-corporate','gogolook-6902','企業防詐形成可持續合約','high','active','Q2 企業防詐 28.617 百萬，較去年 17.952 百萬增加約 59%；ASI、Watchmen 與認證服務需看收入續約，不只看合作新聞。','2026-10-23'),
('gogo-cat-leverage','gogolook-6902','費用率下降穿透至營業利益','high','active','Q2 營收 QoQ +2.18%，營業費用由 Q1 215.153 降至 213.747 百萬，營益率由 18.10% 升至 20.58%；下季看行銷投放與信用損失後能否延續。','2026-10-23'),
('gogo-cat-cash','gogolook-6902','JUJI 擴張與收現同步改善','high','watch','H1 營業現金流由去年 -120.948 改善至 +38.966 百萬，但僅為淨利 117.627 百萬的 33.13%；下一輪要看分期回收與資金成本。','2026-10-23')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_risks
(id,company_id,title,impact,probability,status,notes,updated_at)
VALUES
('gogo-risk-credit','gogolook-6902','信用損失與分期應收擴張','high','medium','active','H1 預期信用減損 18.654 百萬，去年同期 8.381 百萬；Q2 分期應收 507.667 百萬。AI 風控不是零違約保證，新增案件可能尚未經完整回收週期。','2026-10-23'),
('gogo-risk-cash','gogolook-6902','獲利不等於可自由分配現金','high','medium','active','H1 OCF 38.966 百萬，籌資現金流 +64.466 百萬；六月短借、長借及一年內到期長借合計 360.028 百萬。金融科技應收吸收資金，現金增加不能全歸因本業收現。','2026-10-23'),
('gogo-risk-tax','gogolook-6902','低稅率與股數口徑不可永久外推','high','high','watch','H1 所得稅 3.673／稅前淨利 121.300 百萬，有效稅率約 3.03%；模型 2027 稅率回到 20%。官方基本 EPS 與稀釋 EPS 分開，預估用 36 百萬股，不回改歷史 EPS。','2026-10-23'),
('gogo-risk-platform','gogolook-6902','平台、資料隱私與變現落差','high','medium','watch','廣告／訂閱依賴行動平台、通路與資料使用條件；隱私與偵測準確性影響信任。合作 MOU、MAU 與新功能均不能直接視為收入或護城河的永久保證。','2026-10-23')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,probability=excluded.probability,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_signal_rules
(id,company_id,metric,green_condition,yellow_condition,red_condition,weight,notes)
VALUES
('gogo-rule-revenue','gogolook-6902','月營收動能','最新月 >= 1.10 億且 YoY >= 15%','未達綠燈，但月營收 >= 1.00 億且 YoY >= 0%','月營收 < 1.00 億或 YoY < 0%',1.2,'research_inference; sources=gogo-src-monthly-exact,gogo-src-model'),
('gogo-rule-margin','gogolook-6902','營運槓桿','最新季營益率 >= 20%','最新季營益率 >= 15% 且 < 20%','最新季營益率 < 15%',1.4,'research_inference; sources=gogo-src-q2,gogo-src-model'),
('gogo-rule-credit','gogolook-6902','信用成本','信用損失／營收 <= 3%，且回收品質已有連續佐證','比率 > 3% 且 <= 4%，或缺連續回收資料','比率 > 4% 或回收品質明顯惡化',1.5,'research_inference; sources=gogo-src-q2,gogo-src-model'),
('gogo-rule-cash','gogolook-6902','現金轉換','同期 OCF／淨利 >= 70%，且淨利為正','同期 OCF 為正但轉換率 < 70%，或淨利非正','同期 OCF 為負且無可驗證改善',1.4,'research_inference; sources=gogo-src-q2,gogo-src-model'),
('gogo-rule-overseas','gogolook-6902','海外變現','海外付費或合約收入有連續量化成長證據','合作／試用已啟動，轉換率與收入未完整揭露','重要合作取消或變現持續不及預期',1.1,'research_inference; sources=gogo-src-oct,gogo-src-model'),
('gogo-rule-tax','gogolook-6902','稅負與稀釋','正常稅率與稀釋後 EPS 仍達基準，且有實績支持','獲利為正，但稅率正常化與稀釋影響待驗證','正常化後 EPS 連續低於悲觀情境',1.2,'research_inference; sources=gogo-src-q2,gogo-src-model')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,metric=excluded.metric,green_condition=excluded.green_condition,yellow_condition=excluded.yellow_condition,red_condition=excluded.red_condition,weight=excluded.weight,notes=excluded.notes;

INSERT INTO research_signal_snapshots
(id,company_id,as_of_date,metric,status,value_text,source_type,notes)
VALUES
('gogo-sig-revenue','gogolook-6902','2026-10-23','月營收動能','green','9 月 1.139 億／YoY +17.87%','research_inference','Q3 月營收合計 3.356 億、QoQ +8.36%；年增率較 7–8 月放緩，尚無 Q3 獲利資料。'),
('gogo-sig-margin','gogolook-6902','2026-10-23','營運槓桿','green','Q2 營益率 20.58%','research_inference','Q1 為 18.10%；Q2 毛利率 89.60%，成長已穿透至營業利益，但須再看行銷費用與信用損失。'),
('gogo-sig-credit','gogolook-6902','2026-10-23','信用成本','yellow','H1 信用損失／營收 3.04%','research_inference','18.654／612.824 百萬；信用損失增速高於營收，尚缺完整分期批次回收與逾期遷徙資料，不能宣稱風險消失。'),
('gogo-sig-cash','gogolook-6902','2026-10-23','現金轉換','yellow','H1 OCF／淨利 33.13%','research_inference','OCF 38.966、淨利 117.627 百萬；比去年改善但仍未達研究設定的 70% 驗證門檻。'),
('gogo-sig-overseas','gogolook-6902','2026-10-23','海外變現','yellow','日本轉付費／泰國 GPF MOU','research_inference','公司公開確認進度，但付費轉換率、合約金額與獲客成本未完整揭露；GPF 會員不是付費戶。'),
('gogo-sig-tax','gogolook-6902','2026-10-23','稅負與稀釋','yellow','H1 有效稅率約 3.03%','research_inference','官方 Q2 基本 EPS 1.69、稀釋 EPS 1.68；本站 2027 情境採 20% 稅率及 36 百萬股，並非公司指引。')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,as_of_date=excluded.as_of_date,metric=excluded.metric,status=excluded.status,value_text=excluded.value_text,source_type=excluded.source_type,notes=excluded.notes;

INSERT INTO research_sources
(id,company_id,source_type,source_group,source_title,published_date,url,file_name,notes,confidence)
VALUES
('gogo-src-q2','gogolook-6902','official','Gogolook','2026Q2 合併財務報告','2026-08-12','https://cdn.prod.website-files.com/661dfb2b775d251b95374643/6ac4b25860e75b56ec0c3525_(Final)%E8%B5%B0%E8%91%97%E7%9E%A7%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8.2026%E5%90%88%E4%BD%B5%E7%AC%AC%E4%BA%8C%E5%AD%A3.FS.AllReport(%E5%90%AB%E9%99%84%E8%A8%BB%E9%99%84%E8%A1%A8).ENG.IFRS.pdf',NULL,'公司財報索引提供之英文版；中文原版優先。頁4–8 財務、現金流，頁28 收入拆分，頁32–33 基本／稀釋 EPS。Q2 淨利 59.606、營業利益 63.744 百萬。; accessed=2026-10-23; periods=2026Q2|2026H1|2025H1','high'),
('gogo-src-annual','gogolook-6902','official','Gogolook','2025 年合併財務報告',NULL,'https://cdn.prod.website-files.com/661dfb2b775d251b95374643/69e2007e6748293781726cfc_Gogolook%202025%20consolidated%20financial%20statements.pdf',NULL,'年度收入、損益、現金流與經營風險；基本 EPS 採官方加權平均股數，不用最新股本回算。; accessed=2026-10-23; periods=2025FY|2024FY','high'),
('gogo-src-oct','gogolook-6902','official','Gogolook','2026/10/15 公開投資人簡報','2026-10-15','https://cdn.prod.website-files.com/661dfb2b775d251b95374643/6ad0f20034335de1f02c8666_690220261015E001.pdf',NULL,'日期為10月但財務仍是Q2，不能當Q3實績。頁7–13 損益、收入結構、JUJI與費用；頁14–15 GPF與日本通路；頁21–22 前瞻展望非承諾。; accessed=2026-10-23; periods=2026Q2|2026H1|2026H2 outlook','high'),
('gogo-src-monthly','gogolook-6902','official','Gogolook','公司每月營收專區',NULL,'https://www.gogolook.com/investors/financial/monthly-revenue',NULL,'公司以百萬元整數顯示，作方向與年增交叉檢查；仟元精度另列具名公開資料商，不由整數值反推精確數字。; accessed=2026-10-23; periods=2026/01-2026/09','high'),
('gogo-src-monthly-exact','gogolook-6902','third_party_fact','TechNews 公司資料／公開資訊觀測站彙整','6902 月營收明細（仟元）',NULL,'https://info.technews.tw/company/53755364-%E8%B5%B0%E8%91%97%E7%9E%A7%E8%82%A1%E4%BB%BD%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8',NULL,'與公司月營收及公告交叉核對；1–9月逐月相加948,426仟元，公告累計948,427仟元。差1仟元可能來自歷史調整／累計口徑，未確認原因，不修改月值湊數。; accessed=2026-10-23; periods=2025/12|2026/01-2026/09','high'),
('gogo-src-september','gogolook-6902','third_party_fact','中央社／Yahoo 股市','2026 年9月營收公告轉載','2026-10-08','https://tw.stock.yahoo.com/news/%E5%85%AC%E5%91%8A-gogolook-2026%E5%B9%B49%E6%9C%88%E5%90%88%E4%BD%B5%E7%87%9F%E6%94%B61-14%E5%84%84%E5%85%83-%E5%B9%B4%E5%A2%9E17-064412323.html',NULL,'9月113,873仟元、YoY17.87%；公告累計948,427仟元、YoY26.87%。轉載明列來源，非假稱直接取得MOPS API。; accessed=2026-10-23; periods=2026/09|2026/01-09','high'),
('gogo-src-model','gogolook-6902','research_inference','Research Desk','公開資料情境與訊號方法',NULL,'https://research-report.sarsadsl.workers.dev/research/reports/gogolook-6902',NULL,'H1實績固定；2026營收＝H1＋Q3月營收＋Q4假設；淨利＝H1淨利＋（H2營收×GM－H2費用）×（1－H2稅率）。2027依各情境營收成長、GM、費用成長、20%稅率計算；業外0、36百萬股。所有數值、公式與門檻為本站自建，沒有引用私有券商預測。; accessed=2026-10-23; periods=2026F|2027F','medium')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,source_type=excluded.source_type,source_group=excluded.source_group,source_title=excluded.source_title,published_date=excluded.published_date,url=excluded.url,file_name=excluded.file_name,notes=excluded.notes,confidence=excluded.confidence;

INSERT INTO research_reports
(id,company_id,title,slug,summary,thesis,status,version,html_path,pdf_path,created_at,updated_at,published_at)
VALUES
('gogolook-report-v1','gogolook-6902','Gogolook 6902｜防詐變現、營運槓桿與信用風險研究','gogolook-6902','Q2 基本 EPS 1.69 元、H1 3.33 元；9 月營收 1.139 億元，Q3 月營收加總 3.356 億元。高毛利與費用效率支持獲利，但 JUJI 分期應收增加、現金轉換與稅率正常化仍需驗證，整體黃燈。','防詐資料與產品能力 → 付費／企業合約 → 營收 → 費用效率 → 信用損失與回收 → EPS。','published','1.0','/research/reports/gogolook-6902.html',NULL,'2026-10-23','2026-10-23','2026-10-23')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,slug=excluded.slug,summary=excluded.summary,thesis=excluded.thesis,status=excluded.status,version=excluded.version,html_path=excluded.html_path,pdf_path=excluded.pdf_path,created_at=excluded.created_at,updated_at=excluded.updated_at,published_at=excluded.published_at;

INSERT INTO research_report_sections
(id,report_id,section_key,title,sort_order,content_json)
VALUES
('gogo-sec-summary','gogolook-report-v1','gogo-sec-summary','投資摘要與研究框架',1,'{"type":"summary","payloadRefs":["thesis","signalSnapshots"],"showSources":true}'),
('gogo-sec-financial','gogolook-report-v1','gogo-sec-financial','財務實績與 EPS 口徑',2,'{"type":"financial-table","payloadRefs":["actuals"],"showSources":true}'),
('gogo-sec-monthly','gogolook-report-v1','gogo-sec-monthly','月營收與動能驗證',3,'{"type":"bar-chart","payloadRefs":["monthlyRevenue"],"showSources":true}'),
('gogo-sec-business','gogolook-report-v1','gogo-sec-business','防詐與金融科技收入結構',4,'{"type":"financial-table","payloadRefs":["segments"],"showSources":true}'),
('gogo-sec-scenario','gogolook-report-v1','gogo-sec-scenario','2026F／2027F 自建研究情境',5,'{"type":"scenario-table","payloadRefs":["forecasts"],"showSources":true}'),
('gogo-sec-capability','gogolook-report-v1','gogo-sec-capability','資料、通路與變現能力',6,'{"type":"capacity","payloadRefs":["capacity"],"showSources":true}'),
('gogo-sec-signals','gogolook-report-v1','gogo-sec-signals','獲利品質驗證訊號',7,'{"type":"signals","payloadRefs":["signalSnapshots","signalRules"],"showSources":true}'),
('gogo-sec-risks','gogolook-report-v1','gogo-sec-risks','催化劑與信用風險',8,'{"type":"catalysts-risks","payloadRefs":["catalysts","risks"],"showSources":true}'),
('gogo-sec-source','gogolook-report-v1','gogo-sec-source','公開來源與模型方法',9,'{"type":"sources","payloadRefs":["sources"],"showSources":true}'),
('gogo-sec-conclusion','gogolook-report-v1','gogo-sec-conclusion','研究結論與下一輪問題',10,'{"type":"conclusion","payloadRefs":["thesis"],"showSources":true}'),
('gogolook-report-v1-dashboard','gogolook-report-v1','dashboard-config','Dashboard Config',0,'{"currentView":"截至 2026-10-23，最新核閱財報為 Q2：營收 3.097 億、基本 EPS 1.69 元；H1 EPS 3.33 元。9 月營收 1.139 億，YoY +17.87%；Q3 月營收加總 3.356 億、較 Q2 +8.36%，僅代表營收動能，不代表 Q3 獲利。H1 OCF 0.390 億／淨利 1.176 億，JUJI 分期應收 5.077 億，為下一輪驗證重點。","currentThesis":"付費與合約成長能否持續轉為營業利益，且不被信用成本、資金需求與稅率正常化抵銷？","verificationChain":["Q3 營益率能否維持 20% 以上，營收成長是否穿透為獲利","JUJI 信用損失／營收是否維持可控，分期回收是否跟上放款","營業現金流／淨利能否由 H1 約 33% 改善","日本樂天試用轉付費與泰國 GPF 合作，是否形成可核對收入","Q4 月營收能否支持基準情境平均 1.18 億元","稅率回升與股權獎酬稀釋後，EPS 成長是否仍成立"],"conclusion":"維持黃燈、等待獲利品質驗證。防詐變現與營運槓桿已有財報支持，但不是無信用風險的純 SaaS；下一次優先核對 Q3 營益率、信用損失與營業現金流。","forecastScenario":"base","headlineForecastYears":[2026,2027],"focusMetric":{"field":"grossMargin","label":"毛利率"},"monthlyRevenue":{"focusYear":2026,"cumulativeThroughMonth":9,"unitDivisor":100,"unitLabel":"億"},"cagrCards":[{"field":"revenue","label":"2025A → 2027F Revenue CAGR","baseYear":2025,"targetYear":2027,"baseValue":1048.183,"years":2},{"field":"eps","label":"2025A → 2027F EPS CAGR","baseYear":2025,"targetYear":2027,"baseValue":1.58,"years":2}],"estimateNote":"2026F／2027F 為本站依公開資料自行建立的研究情境，非公司財測、非市場共識，不公開券商附件、目標價或專有模型。預估統一採 3,600 萬股，與官方實績的加權平均股數分開。Q3 僅有月營收，不能填作季度獲利；月營收逐月加總與公告累計差 1 仟元，保留原值不湊數。"}')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,section_key=excluded.section_key,title=excluded.title,sort_order=excluded.sort_order,content_json=excluded.content_json;


-- Remove stale rows only after all canonical rows have been upserted.

DELETE FROM research_financial_actuals WHERE company_id='gogolook-6902' AND id NOT IN ('gogo-2025fy','gogo-2026q1','gogo-2026q2');

DELETE FROM research_monthly_revenue WHERE company_id='gogolook-6902' AND id NOT IN ('gogo-2601','gogo-2602','gogo-2603','gogo-2604','gogo-2605','gogo-2606','gogo-2607','gogo-2608','gogo-2609');

DELETE FROM research_segments WHERE company_id='gogolook-6902' AND id NOT IN ('gogo-mix-ads','gogo-mix-sub','gogo-mix-corp','gogo-mix-juji','gogo-mix-interest','gogo-mix-fin-corp');

DELETE FROM research_forecasts WHERE company_id='gogolook-6902' AND id NOT IN ('gogo-2026-bear','gogo-2026-base','gogo-2026-bull','gogo-2027-bear','gogo-2027-base','gogo-2027-bull');

DELETE FROM research_capacity_events WHERE company_id='gogolook-6902' AND id NOT IN ('gogo-cap-data','gogo-cap-japan','gogo-cap-gpf','gogo-cap-juji');

DELETE FROM research_catalysts WHERE company_id='gogolook-6902' AND id NOT IN ('gogo-cat-conversion','gogo-cat-corporate','gogo-cat-leverage','gogo-cat-cash');

DELETE FROM research_risks WHERE company_id='gogolook-6902' AND id NOT IN ('gogo-risk-credit','gogo-risk-cash','gogo-risk-tax','gogo-risk-platform');

DELETE FROM research_signal_rules WHERE company_id='gogolook-6902' AND id NOT IN ('gogo-rule-revenue','gogo-rule-margin','gogo-rule-credit','gogo-rule-cash','gogo-rule-overseas','gogo-rule-tax');

DELETE FROM research_signal_snapshots WHERE company_id='gogolook-6902' AND id NOT IN ('gogo-sig-revenue','gogo-sig-margin','gogo-sig-credit','gogo-sig-cash','gogo-sig-overseas','gogo-sig-tax');

DELETE FROM research_sources WHERE company_id='gogolook-6902' AND id NOT IN ('gogo-src-q2','gogo-src-annual','gogo-src-oct','gogo-src-monthly','gogo-src-monthly-exact','gogo-src-september','gogo-src-model');

DELETE FROM research_reports WHERE company_id='gogolook-6902' AND id NOT IN ('gogolook-report-v1');

DELETE FROM research_report_sections WHERE report_id='gogolook-report-v1' AND id NOT IN ('gogo-sec-summary','gogo-sec-financial','gogo-sec-monthly','gogo-sec-business','gogo-sec-scenario','gogo-sec-capability','gogo-sec-signals','gogo-sec-risks','gogo-sec-source','gogo-sec-conclusion','gogolook-report-v1-dashboard');
