PRAGMA foreign_keys = ON;

INSERT INTO research_companies
(id,ticker,market,name,slug,sector,industry,currency,description,status,created_at,updated_at)
VALUES
('jingu-8358','8358','TPEX','金居開發','jingu-8358','電子零組件','高階電解銅箔／HVLP 銅箔','TWD','金居開發生產電解銅箔，產品應用於銅箔基板、多層印刷電路板與高密度連接板；研究焦點為 RG、HVLP3+ 與 HVLP4 的 AI 伺服器材料升級。','active','2026-09-24','2026-09-24')
ON CONFLICT(id) DO UPDATE SET ticker=excluded.ticker,market=excluded.market,name=excluded.name,slug=excluded.slug,sector=excluded.sector,industry=excluded.industry,currency=excluded.currency,description=excluded.description,status=excluded.status,created_at=excluded.created_at,updated_at=excluded.updated_at;

INSERT INTO research_financial_actuals
(id,company_id,period,fiscal_year,quarter,revenue,gross_profit,gross_margin,operating_income,operating_margin,net_income,net_margin,eps,source_note,created_at)
VALUES
('jingu-2025fy','jingu-8358','2025FY',2025,NULL,7879.981,1714,21.81,1447,18.36,1062,13.48,4.21,'official; sources=jingu-src-official,jingu-src-financial-ratios','2026-09-24'),
('jingu-2026q1','jingu-8358','2026Q1',2026,1,2532.026,727,28.71,649,25.63,520,20.52,2.06,'third_party_fact; sources=jingu-src-financial-ratios,jingu-src-unified','2026-09-24'),
('jingu-2026q2','jingu-8358','2026Q2',2026,2,2804.964,768.4,27.39,685,24.42,545,19.43,2.16,'third_party_fact; sources=jingu-src-financial-ratios','2026-09-24')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,fiscal_year=excluded.fiscal_year,quarter=excluded.quarter,revenue=excluded.revenue,gross_profit=excluded.gross_profit,gross_margin=excluded.gross_margin,operating_income=excluded.operating_income,operating_margin=excluded.operating_margin,net_income=excluded.net_income,net_margin=excluded.net_margin,eps=excluded.eps,source_note=excluded.source_note,created_at=excluded.created_at;

INSERT INTO research_monthly_revenue
(id,company_id,year,month,revenue,mom,yoy,created_at)
VALUES
('jingu-2601','jingu-8358',2026,1,820.421,9.28,45.91,'2026-09-24'),
('jingu-2602','jingu-8358',2026,2,850.914,3.71,51.13,'2026-09-24'),
('jingu-2603','jingu-8358',2026,3,860.691,1.14,42.81,'2026-09-24'),
('jingu-2604','jingu-8358',2026,4,900.77,4.65,35.8,'2026-09-24'),
('jingu-2605','jingu-8358',2026,5,941.901,4.56,41.37,'2026-09-24'),
('jingu-2606','jingu-8358',2026,6,962.293,2.16,43.36,'2026-09-24'),
('jingu-2607','jingu-8358',2026,7,1008.644,4.81,54.86,'2026-09-24'),
('jingu-2608','jingu-8358',2026,8,1056.242,4.71,59.7,'2026-09-24')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,year=excluded.year,month=excluded.month,revenue=excluded.revenue,mom=excluded.mom,yoy=excluded.yoy,created_at=excluded.created_at;

INSERT INTO research_segments
(id,company_id,period,segment,revenue,share,is_estimate,created_at)
VALUES
('jingu-2026-hvlp','jingu-8358','2026E','HVLP3+／HVLP4 高階銅箔',NULL,NULL,1,'2026-09-24'),
('jingu-2026-rg','jingu-8358','2026E','RG／進階 RTF 銅箔',NULL,NULL,1,'2026-09-24'),
('jingu-2026-standard','jingu-8358','2026E','HTE／標準 RTF 與其他銅箔',NULL,NULL,1,'2026-09-24')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,segment=excluded.segment,revenue=excluded.revenue,share=excluded.share,is_estimate=excluded.is_estimate,created_at=excluded.created_at;

INSERT INTO research_forecasts
(id,company_id,fiscal_year,scenario,revenue,gross_margin,net_income,eps,opto_share,notes,created_at)
VALUES
('jingu-2026-bear','jingu-8358',2026,'bear',11115,29.6,2366,9.34,NULL,'Morgan Stanley 模型：HVLP4 產能與價格上行按較保守節奏，為外部機構低端參考。','2026-09-24'),
('jingu-2026-consensus','jingu-8358',2026,'consensus',12378,33.2,3029,11.99,NULL,'統一投顧 2026F 情境；非公司指引。','2026-09-24'),
('jingu-2026-bull','jingu-8358',2026,'bull',13000,35,3380,13,NULL,'假設 HVLP4 供需緊張延續、加工費順利轉嫁且 2H26 mix 升級快於基準。','2026-09-24'),
('jingu-2027-bear','jingu-8358',2027,'bear',15849,36.5,4650,18.4,NULL,'以 Morgan Stanley 2027F 營收／獲利作保守外部參考，反映三廠與 mix 仍在爬坡。','2026-09-24'),
('jingu-2027-consensus','jingu-8358',2027,'consensus',19064,37.8,5431,21.5,NULL,'統一投顧 2027F 情境；假設斗六三廠量產與 AI／PCIe5 雙引擎。','2026-09-24'),
('jingu-2027-bull','jingu-8358',2027,'bull',21000,40.5,6300,25,NULL,'假設 2027 年底高階產能接近 800 噸／月，且 HVLP4／RG mix 與價格優於基準。','2026-09-24'),
('jingu-2028-bear','jingu-8358',2028,'bear',22000,44,7300,28,NULL,'高階需求仍在但競爭者擴產與供需平衡使價格／利用率低於樂觀假設。','2026-09-24'),
('jingu-2028-consensus','jingu-8358',2028,'consensus',22496,47.2,8009,31.63,NULL,'Morgan Stanley 2028F 情境；供作高階產品 mix 與毛利率外部基準。','2026-09-24'),
('jingu-2028-bull','jingu-8358',2028,'bull',24000,49.5,9600,33,NULL,'高階材料升級、東南亞 RG 量產與 HVLP5／PTFE 額外選擇權部分實現；技術路線仍未確定。','2026-09-24')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,fiscal_year=excluded.fiscal_year,scenario=excluded.scenario,revenue=excluded.revenue,gross_margin=excluded.gross_margin,net_income=excluded.net_income,eps=excluded.eps,opto_share=excluded.opto_share,notes=excluded.notes,created_at=excluded.created_at;

INSERT INTO research_capacity_events
(id,company_id,event_date,label,equipment,technology,delta_units,base_units,expected_online_date,actual_online_date,status,notes)
VALUES
('jingu-cap-26-hvlp','jingu-8358','2026-Q4','既有產線整改至 HVLP3+／HVLP4','既有銅箔產線','HVLP3+／HVLP4',NULL,NULL,'2026-Q4',NULL,'ramping','統一投顧估計 2026 年底高階產能約 400-450 噸／月；此為 HVLP3+／HVLP4 合計，不等同可立即出售的 HVLP4 產能。'),
('jingu-cap-27-plant3','jingu-8358','2027-Q1','斗六三廠目標啟動量產','斗六三廠','高階銅箔產線',NULL,NULL,'2027-Q1',NULL,'planned','資本支出約 11 億元；研究資料規劃 2027 年底 HVLP3+／HVLP4 產能達約 800 噸／月。'),
('jingu-cap-27-hvlp4','jingu-8358','2027-Q4','HVLP4 單項產能模型','Co-Tech HVLP4','HVLP4',700,200,'2027-Q4',NULL,'modeled','Morgan Stanley 模型：2026 年底約 200 噸／月、2027 年底約 700 噸／月；不同於統一投顧的 HVLP3+／HVLP4 合計口徑。'),
('jingu-cap-28-sea','jingu-8358','2028-H2','東南亞 RG 系列新廠量產選項','Southeast Asia subsidiary','RG-series advanced RTF',500,NULL,'2028-H2',NULL,'planned','Morgan Stanley：月產能可能超過 500 噸；若 RG 轉至海外，台灣產能可釋放給更高階 HVLP4+。')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,event_date=excluded.event_date,label=excluded.label,equipment=excluded.equipment,technology=excluded.technology,delta_units=excluded.delta_units,base_units=excluded.base_units,expected_online_date=excluded.expected_online_date,actual_online_date=excluded.actual_online_date,status=excluded.status,notes=excluded.notes;

INSERT INTO research_catalysts
(id,company_id,title,impact,status,notes,updated_at)
VALUES
('jingu-cat-hvlp4','jingu-8358','HVLP4 進入 AI 新平台供應鏈','high','active','統一投顧與使用者提供研究資料均將 2Q26 視為 HVLP4 開始出貨／放量的時間點；需以後續營收、毛利率與客戶公告驗證。','2026-09-24'),
('jingu-cat-plant3','jingu-8358','斗六三廠 2027 年量產','high','watch','新廠若按時量產，將支撐 HVLP3+／HVLP4 與 PCIe5 相關 RG 銅箔的增量供給。','2026-09-24'),
('jingu-cat-pricing','jingu-8358','高階銅箔加工費與材料升級','high','active','產業報告指出 HVLP4 processing fee 顯著高於 HTE／RTF，且 2026 年銅箔加工費有上行；金居能否轉嫁與維持良率是關鍵。','2026-09-24'),
('jingu-cat-sea','jingu-8358','東南亞 RG 產能與台灣高階產能釋放','medium','watch','預計 2028H2 才可能貢獻，屬中長期選擇權，不納入短期已實現營收。','2026-09-24')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_risks
(id,company_id,title,impact,probability,status,notes,updated_at)
VALUES
('jingu-risk-ramp','jingu-8358','HVLP4 良率、認證與量產爬坡不及預期','high','medium','watch','高階銅箔的可出售產能受表面處理設備、製程容忍度、良率與客戶 qualification 約束，名目產能不等於有效出貨。','2026-09-24'),
('jingu-risk-competition','jingu-8358','競爭者擴產使供需由短缺轉為接近平衡','high','medium','watch','Jefferies 將中國供應商新增產能納入後，2027 年 HVLP4 等效供需可能接近平衡；價格與毛利率上行的持續性因此有分歧。','2026-09-24'),
('jingu-risk-input','jingu-8358','關鍵設備、玻纖布與銅箔成本波動','medium','medium','active','高階 CCL／銅箔的設備與材料供應集中；若加工費無法及時轉嫁，可能壓縮毛利率。','2026-09-24'),
('jingu-risk-technology','jingu-8358','PTFE／HVLP5 路線仍具不確定性','medium','medium','watch','VR300／Rubin Ultra 的 PTFE 或 HVLP5 採用仍在評估；若規格變化，供應商份額與材料價值鏈可能重排。','2026-09-24')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,probability=excluded.probability,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_signal_rules
(id,company_id,metric,green_condition,yellow_condition,red_condition,weight,notes)
VALUES
('jingu-rule-revenue','jingu-8358','月營收','>= 10 億元且年增維持正值','8.5-10 億元或年增明顯放緩','< 8.5 億元且連續回落',1.4,'research_inference; sources=jingu-src-official'),
('jingu-rule-gm','jingu-8358','毛利率','>= 30% 並持續上升','27-30% 或高階 mix 尚未穩定','< 27% 且連續下降',1.5,'research_inference; sources=jingu-src-financial-ratios,jingu-src-unified'),
('jingu-rule-hvlp','jingu-8358','HVLP4 認證與良率','量產出貨、良率與毛利率同步改善','客戶驗證或爬坡中，尚缺連續數據','量產延遲、良率不足或訂單轉弱',1.6,'research_inference; sources=jingu-src-unified,jingu-src-ms-initiation'),
('jingu-rule-capacity','jingu-8358','高階產能','2027 年底 HVLP4 約 700 噸／月且三廠按期量產','設備到位但量產／利用率待驗證','三廠延遲或有效產能低於模型',1.3,'research_inference; sources=jingu-src-unified,jingu-src-ms-initiation'),
('jingu-rule-pricing','jingu-8358','加工費與成本轉嫁','高階加工費上行且可轉嫁','成本上升、轉嫁速度不明','價格下跌或成本無法轉嫁',1.2,'research_inference; sources=jingu-src-yuanfu,jingu-src-jefferies'),
('jingu-rule-supply','jingu-8358','HVLP4 供需','需求增速持續高於可出售供給','2027 年新增供給使市場接近平衡','競爭擴產造成明顯過剩',1.1,'research_inference; sources=jingu-src-ms-initiation,jingu-src-jefferies')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,metric=excluded.metric,green_condition=excluded.green_condition,yellow_condition=excluded.yellow_condition,red_condition=excluded.red_condition,weight=excluded.weight,notes=excluded.notes;

INSERT INTO research_signal_snapshots
(id,company_id,as_of_date,metric,status,value_text,source_type,notes)
VALUES
('jingu-sig-revenue','jingu-8358','2026-09-24','月營收','green','2026/08 10.56 億元；1-8 月 74.02 億元','official','8 月 YoY +59.70%，1-8 月累計 YoY +46.82%；需觀察 9 月後延續性。'),
('jingu-sig-gm','jingu-8358','2026-09-24','毛利率','yellow','2026Q2 27.39%；2026H1 約 28.02%','third_party_fact','較 2025Q2 18.86% 明顯改善，但距離 30% 以上的綠燈門檻仍需連續驗證。'),
('jingu-sig-hvlp','jingu-8358','2026-09-24','HVLP4 認證與良率','yellow','研究資料指向 2Q26 開始進入 GPU 新平台供應鏈','research_inference','券商資料支持產品升級主軸，但公司正式客戶／量產揭露與連續良率仍待追蹤。'),
('jingu-sig-capacity','jingu-8358','2026-09-24','高階產能','yellow','2026 年底 HVLP3+/HVLP4 約 400-450 噸／月；三廠目標 2027Q1 量產','research_inference','產能規劃尚未完全轉成有效出貨；Morgan Stanley 與統一投顧的口徑分別為 HVLP4 單項與 HVLP3+／HVLP4 合計。'),
('jingu-sig-pricing','jingu-8358','2026-09-24','加工費與成本轉嫁','yellow','HVLP4 processing fee 顯著高於 HTE；2026 年銅箔加工費上行','research_inference','產業報告支持價格與 mix 催化，但金居實際轉嫁幅度仍需由毛利率驗證。'),
('jingu-sig-supply','jingu-8358','2026-09-24','HVLP4 供需','yellow','2027 年需求強，但納入中國供應商後供需可能接近平衡','market_consensus','上行來自缺貨與加工費；下行來自競爭者擴產、設備取得與良率執行。')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,as_of_date=excluded.as_of_date,metric=excluded.metric,status=excluded.status,value_text=excluded.value_text,source_type=excluded.source_type,notes=excluded.notes;

INSERT INTO research_sources
(id,company_id,source_type,source_group,source_title,published_date,url,file_name,notes,confidence)
VALUES
('jingu-src-official','jingu-8358','official','金居開發','金居官方營運資訊：2025-2026 月營收','2026-09-09','https://www.co-tech.com/tw/ir/operation',NULL,'公司官方頁列示 2026/01-08 月營收與累計 7,401,876 仟元；公司產品為電解銅箔。; accessed=2026-09-24; periods=2025FY|2026/01-2026/08','high'),
('jingu-src-financial-ratios','jingu-8358','third_party_fact','Goodinfo／MoneyDJ 公開資料','8358 金居季度財務比率與 EPS','2026-09-09','https://goodinfo.tw/tw/StockDetail.asp?STOCK_ID=8358',NULL,'2026Q2 毛利率 27.39%、營業利益率 24.42%、稅後淨利率 19.43%、EPS 2.16；2026H1 EPS 4.22。; accessed=2026-09-24; periods=2025FY|2026Q1|2026Q2|2026H1','high'),
('jingu-src-chatgpt','jingu-8358','research_inference','使用者提供 ChatGPT 分享頁','金居展望與財測分析（ChatGPT share）',NULL,'https://chatgpt.com/share/6ab3e863-1d70-83ee-ad56-b1543d0b7f90',NULL,'用於研究脈絡、產品升級與情境交叉核對；定量欄位優先採可核對的公司／券商資料。; accessed=2026-09-24; periods=2026F|2027F|2028F','medium'),
('jingu-src-gemini','jingu-8358','research_inference','使用者提供 Gemini 分享頁','金居研究資料（Gemini share，待內容確認）',NULL,'https://share.gemini.google/2VmyLp4lXAcA',NULL,'分享頁在目前存取流程出現第三方安全警告，未將未核對內容列入定量模型；待使用者確認內容後再更新。; accessed=2026-09-24; periods=2026F|2027F|2028F','low'),
('jingu-src-unified','jingu-8358','market_consensus','統一投顧','金居：AI 新平台即將量產，HVLP4 蓄勢待發','2026-05-20',NULL,'8358金居, 27F EPS 21.5元 TP 645元, 統一 20260520.pdf','使用者提供券商 PDF；2026F／2027F EPS 11.99／21.50，原始檔未隨公開 repo 發布，非公司指引。; accessed=2026-09-24; periods=2026Q1|2026F|2027F','medium'),
('jingu-src-ms-initiation','jingu-8358','market_consensus','Morgan Stanley','AI''s Hidden Backbone：Co-Tech initiation and HVLP4 cycle','2026-09-14',NULL,'20260914_CCL.PCB_MS.pdf','使用者提供券商 PDF；Co-Tech EPS 9.34／18.59／31.63，HVLP4 產能模型為 2026/27/28 年底約 200／700／800 噸／月；含利益衝突揭露。; accessed=2026-09-24; periods=2025FY|2026F|2027F|2028F','medium'),
('jingu-src-ms-sea','jingu-8358','market_consensus','Morgan Stanley','Southeast Asia expansion points to longer-term capacity upside','2026-09-14',NULL,'260914_ms_cotech.pdf','使用者提供券商 PDF；東南亞 RG 量產可能於 2028H2 開始，月產能超過 500 噸；原始檔未隨公開 repo 發布。; accessed=2026-09-24; periods=2026F|2027F|2028H2','medium'),
('jingu-src-ms-update','jingu-8358','third_party_fact','Morgan Stanley／公司初步公告資料','Announced preliminary August 2026 profits','2026-09-16',NULL,'260916_ms_cotech.pdf','使用者提供券商更新；2026/08 營收 1,056 百萬元、稅前 254 百萬元、稅後 203 百萬元、EPS 0.80；原始檔未隨公開 repo 發布。; accessed=2026-09-24; periods=2026/08|2026Q3','high'),
('jingu-src-jefferies','jingu-8358','market_consensus','Jefferies','PCB/CCL Update：Will High-speed Copper Foil Become Another Bottleneck?','2026-05-18',NULL,'China_Technology：PCB_CCL_Update：_Will_Highspeed_Copper_Foil_Become.pdf','使用者提供產業報告；估計 HVLP 需求由 2025 約 1.3kt/月增至 2030 超過 6kt/月，並指出 2027 年供需與設備／良率執行風險。; accessed=2026-09-24; periods=2025|2026F|2027F|2028F|2030F','medium'),
('jingu-src-yuanfu','jingu-8358','market_consensus','元富投顧','CCL 迎升級：缺貨漲聲響起','2026-09-04',NULL,'CCL迎升級-缺貨漲聲響起_20260904_元富.pdf','使用者提供產業報告；整理銅箔加工費、玻纖布與 AI 平台材料升級，非金居公司指引。; accessed=2026-09-24; periods=2026H2|2027F|2028F','medium'),
('jingu-src-citi','jingu-8358','market_consensus','花旗','Taiwan PCB / Laminates industry note','2026-09-01',NULL,'花旗_Taiwan PCB _ Laminates.pdf','使用者提供產業背景報告；用於供應鏈與 CCL 產能風險脈絡，不直接輸入金居 EPS。; accessed=2026-09-24; periods=2026F|2027F|2028F','low'),
('jingu-src-gf','jingu-8358','market_consensus','GF Securities','PCB: Content Upside & PTFE Adoption','2026-09-09',NULL,'GF - PCB- Content Upside _ PTFE Adoption.pdf','使用者提供產業報告；VR200／VR300 PCB content 與 PTFE 採用仍具不確定性，不視為金居已取得訂單。; accessed=2026-09-24; periods=2026F|2027F|2028F','low')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,source_type=excluded.source_type,source_group=excluded.source_group,source_title=excluded.source_title,published_date=excluded.published_date,url=excluded.url,file_name=excluded.file_name,notes=excluded.notes,confidence=excluded.confidence;

INSERT INTO research_reports
(id,company_id,title,slug,summary,thesis,status,version,html_path,pdf_path,created_at,updated_at,published_at)
VALUES
('jingu-report-v1','jingu-8358','金居 8358｜AI 伺服器高階銅箔研究','jingu-8358','金居的核心投資鏈是 AI 伺服器與高速交換器規格升級，帶動 RG／HVLP3+／HVLP4 銅箔的產品組合、加工費與產能價值提升；2026 年營收與毛利率已明顯改善，但 2027 年斗六三廠、HVLP4 良率與客戶放量仍是估值能否落地的關鍵。','AI PCB／CCL 規格升級 → HVLP4 與 RG 需求 → 可出售產能與加工費 → 毛利率 → 斗六三廠與東南亞擴產 → EPS。','published','1.0','/research/reports/jingu-8358.html',NULL,'2026-09-24','2026-09-24','2026-09-24')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,slug=excluded.slug,summary=excluded.summary,thesis=excluded.thesis,status=excluded.status,version=excluded.version,html_path=excluded.html_path,pdf_path=excluded.pdf_path,created_at=excluded.created_at,updated_at=excluded.updated_at,published_at=excluded.published_at;

INSERT INTO research_report_sections
(id,report_id,section_key,title,sort_order,content_json)
VALUES
('jingu-sec-summary','jingu-report-v1','jingu-sec-summary','投資摘要與證據邊界',1,'{"type":"summary","payloadRefs":["thesis","signalSnapshots"],"showSources":true}'),
('jingu-sec-actuals','jingu-report-v1','jingu-sec-actuals','已實現財務：營收與毛利率同步改善',2,'{"type":"financial-table","payloadRefs":["actuals"],"showSources":true}'),
('jingu-sec-revenue','jingu-report-v1','jingu-sec-revenue','2026 月營收：高階銅箔放量代理指標',3,'{"type":"bar-chart","payloadRefs":["monthlyRevenue"],"showSources":true}'),
('jingu-sec-mix','jingu-report-v1','jingu-sec-mix','產品結構：由一般銅箔走向 RG／HVLP',4,'{"type":"financial-table","payloadRefs":["segments"],"showSources":true}'),
('jingu-sec-scenario','jingu-report-v1','jingu-sec-scenario','2026F-2028F 情境與外部模型對照',5,'{"type":"scenario-table","payloadRefs":["forecasts"],"showSources":true}'),
('jingu-sec-capacity','jingu-report-v1','jingu-sec-capacity','高階產能、斗六三廠與東南亞選項',6,'{"type":"capacity","payloadRefs":["capacity"],"showSources":true}'),
('jingu-sec-signals','jingu-report-v1','jingu-sec-signals','紅綠燈：營運偏綠、執行待驗證',7,'{"type":"signals","payloadRefs":["signalRules","signalSnapshots"],"showSources":true}'),
('jingu-sec-risks','jingu-report-v1','jingu-sec-risks','催化劑與關鍵風險',8,'{"type":"catalysts-risks","payloadRefs":["catalysts","risks"],"showSources":true}'),
('jingu-sec-sources','jingu-report-v1','jingu-sec-sources','資料來源與研究限制',9,'{"type":"sources","payloadRefs":["sources"],"showSources":true}'),
('jingu-sec-conclusion','jingu-report-v1','jingu-sec-conclusion','研究結論',10,'{"type":"conclusion","payloadRefs":["thesis"],"showSources":true}'),
('jingu-report-v1-dashboard','jingu-report-v1','dashboard-config','Dashboard Config',0,'{"currentView":"2026/01-08 營收 74.02 億元、年增 46.82%；2026H1 EPS 4.22 元、毛利率約 28%。研究情境將 2026-2028 EPS 放在 9.3-33 元區間，差異主要來自 HVLP4／RG mix、加工費與產能爬坡速度。","verificationChain":["9 月以後月營收能否維持 10 億元上下並延續年增","毛利率能否由 2026H1 約 28% 站上 30% 以上","HVLP4 客戶驗證、良率與實際出貨是否連續改善","2026 年底 HVLP3+/HVLP4 產能 400-450 噸／月是否落地","斗六三廠 2027Q1 量產與 2027 年底 800 噸／月規劃是否兌現","競爭者擴產是否使 2027 年 HVLP4 等效供需由短缺轉為接近平衡"],"conclusion":"基本面已進入高成長段，但估值同時提前反映 2027-2028 的高階銅箔放量。可追蹤的結論是偏多而非無條件看多：月營收與毛利率是第一層驗證，HVLP4 良率／客戶資格與三廠量產是第二層驗證。外部券商 PT 參考為 Morgan Stanley NT$730、統一投顧 NT$645，兩者不代表本頁的個人化投資建議。","forecastScenario":"consensus","headlineForecastYears":[2026,2027,2028],"focusMetric":{"field":"eps","label":"EPS（元）"},"monthlyRevenue":{"focusYear":2026,"cumulativeThroughMonth":8,"unitDivisor":100,"unitLabel":"億元"},"cagrCards":[{"field":"revenue","label":"2025A → 2028F Revenue CAGR","baseYear":2025,"targetYear":2028,"baseValue":7879.981,"years":3},{"field":"eps","label":"2025A → 2028F EPS CAGR","baseYear":2025,"targetYear":2028,"baseValue":4.21,"years":3}],"estimateNote":"2026F-2028F 為本研究整合使用者提供報告與券商模型的情境值，不是公司財測；Morgan Stanley、統一投顧與產業報告的假設不同，應以後續實績更新。"}')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,section_key=excluded.section_key,title=excluded.title,sort_order=excluded.sort_order,content_json=excluded.content_json;


-- Remove stale rows only after all canonical rows have been upserted.

DELETE FROM research_financial_actuals WHERE company_id='jingu-8358' AND id NOT IN ('jingu-2025fy','jingu-2026q1','jingu-2026q2');

DELETE FROM research_monthly_revenue WHERE company_id='jingu-8358' AND id NOT IN ('jingu-2601','jingu-2602','jingu-2603','jingu-2604','jingu-2605','jingu-2606','jingu-2607','jingu-2608');

DELETE FROM research_segments WHERE company_id='jingu-8358' AND id NOT IN ('jingu-2026-hvlp','jingu-2026-rg','jingu-2026-standard');

DELETE FROM research_forecasts WHERE company_id='jingu-8358' AND id NOT IN ('jingu-2026-bear','jingu-2026-consensus','jingu-2026-bull','jingu-2027-bear','jingu-2027-consensus','jingu-2027-bull','jingu-2028-bear','jingu-2028-consensus','jingu-2028-bull');

DELETE FROM research_capacity_events WHERE company_id='jingu-8358' AND id NOT IN ('jingu-cap-26-hvlp','jingu-cap-27-plant3','jingu-cap-27-hvlp4','jingu-cap-28-sea');

DELETE FROM research_catalysts WHERE company_id='jingu-8358' AND id NOT IN ('jingu-cat-hvlp4','jingu-cat-plant3','jingu-cat-pricing','jingu-cat-sea');

DELETE FROM research_risks WHERE company_id='jingu-8358' AND id NOT IN ('jingu-risk-ramp','jingu-risk-competition','jingu-risk-input','jingu-risk-technology');

DELETE FROM research_signal_rules WHERE company_id='jingu-8358' AND id NOT IN ('jingu-rule-revenue','jingu-rule-gm','jingu-rule-hvlp','jingu-rule-capacity','jingu-rule-pricing','jingu-rule-supply');

DELETE FROM research_signal_snapshots WHERE company_id='jingu-8358' AND id NOT IN ('jingu-sig-revenue','jingu-sig-gm','jingu-sig-hvlp','jingu-sig-capacity','jingu-sig-pricing','jingu-sig-supply');

DELETE FROM research_sources WHERE company_id='jingu-8358' AND id NOT IN ('jingu-src-official','jingu-src-financial-ratios','jingu-src-chatgpt','jingu-src-gemini','jingu-src-unified','jingu-src-ms-initiation','jingu-src-ms-sea','jingu-src-ms-update','jingu-src-jefferies','jingu-src-yuanfu','jingu-src-citi','jingu-src-gf');

DELETE FROM research_reports WHERE company_id='jingu-8358' AND id NOT IN ('jingu-report-v1');

DELETE FROM research_report_sections WHERE report_id='jingu-report-v1' AND id NOT IN ('jingu-sec-summary','jingu-sec-actuals','jingu-sec-revenue','jingu-sec-mix','jingu-sec-scenario','jingu-sec-capacity','jingu-sec-signals','jingu-sec-risks','jingu-sec-sources','jingu-sec-conclusion','jingu-report-v1-dashboard');
