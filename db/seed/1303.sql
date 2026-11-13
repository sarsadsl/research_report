PRAGMA foreign_keys = ON;

INSERT INTO research_companies
(id,ticker,market,name,slug,sector,industry,currency,description,status,created_at,updated_at)
VALUES
('nanya-1303','1303','TW','南亞塑膠','nanya-1303','Materials','電子材料／塑化','TWD','電子材料、化工、聚酯及塑膠加工；另控制南電、持股南亞科技，必須區分合併與權益法。','active','2026-11-13','2026-11-13')
ON CONFLICT(id) DO UPDATE SET ticker=excluded.ticker,market=excluded.market,name=excluded.name,slug=excluded.slug,sector=excluded.sector,industry=excluded.industry,currency=excluded.currency,description=excluded.description,status=excluded.status,created_at=excluded.created_at,updated_at=excluded.updated_at;

INSERT INTO research_financial_actuals
(id,company_id,period,fiscal_year,quarter,revenue,gross_profit,gross_margin,operating_income,operating_margin,net_income,net_margin,eps,source_note,created_at)
VALUES
('na-a-2025FY','nanya-1303','2025FY',2025,NULL,259912,NULL,NULL,NULL,NULL,NULL,NULL,0.57,'third_party_fact; sources=na-concord','2026-11-13'),
('na-a-2025Q4','nanya-1303','2025Q4',2025,4,64470,NULL,NULL,NULL,NULL,NULL,NULL,0.62,'third_party_fact; sources=na-months','2026-11-13'),
('na-a-2026Q1','nanya-1303','2026Q1',2026,1,68596,NULL,11.94,NULL,5.45,NULL,NULL,1.8,'third_party_fact; sources=na-concord','2026-11-13'),
('na-a-2026Q2','nanya-1303','2026Q2',2026,2,83647,NULL,18.92,NULL,13.6,NULL,NULL,3.37,'third_party_fact; sources=na-concord','2026-11-13'),
('na-a-2026Q3','nanya-1303','2026Q3',2026,3,95597.286,NULL,NULL,NULL,NULL,NULL,NULL,4.9,'third_party_fact; sources=na-fin,na-uni10','2026-11-13'),
('na-a-2026YTD','nanya-1303','2026YTD',2026,NULL,247840.286,47406.927,19.13,33390.297,13.47,79840.503,32.21,10.07,'official; sources=na-fin','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,fiscal_year=excluded.fiscal_year,quarter=excluded.quarter,revenue=excluded.revenue,gross_profit=excluded.gross_profit,gross_margin=excluded.gross_margin,operating_income=excluded.operating_income,operating_margin=excluded.operating_margin,net_income=excluded.net_income,net_margin=excluded.net_margin,eps=excluded.eps,source_note=excluded.source_note,created_at=excluded.created_at;

INSERT INTO research_monthly_revenue
(id,company_id,year,month,revenue,mom,yoy,created_at)
VALUES
('na-m-1','nanya-1303',2026,1,22873,3.5,11.8,'2026-11-13'),
('na-m-2','nanya-1303',2026,2,18556,-18.9,-16,'2026-11-13'),
('na-m-3','nanya-1303',2026,3,27167,46.4,18.1,'2026-11-13'),
('na-m-4','nanya-1303',2026,4,27681,1.9,19.4,'2026-11-13'),
('na-m-5','nanya-1303',2026,5,28831,4.2,31.4,'2026-11-13'),
('na-m-6','nanya-1303',2026,6,27135,-5.9,31.8,'2026-11-13'),
('na-m-7','nanya-1303',2026,7,30573,12.7,44.5,'2026-11-13'),
('na-m-8','nanya-1303',2026,8,30601,0.1,46.8,'2026-11-13'),
('na-m-9','nanya-1303',2026,9,34423,12.5,55.3,'2026-11-13'),
('na-m-10','nanya-1303',2026,10,34942,1.5,64.6,'2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,year=excluded.year,month=excluded.month,revenue=excluded.revenue,mom=excluded.mom,yoy=excluded.yoy,created_at=excluded.created_at;

INSERT INTO research_segments
(id,company_id,period,segment,revenue,share,is_estimate,created_at)
VALUES
('na-seg-0','nanya-1303','2026H1','電子材料',NULL,52.7,0,'2026-11-13'),
('na-seg-1','nanya-1303','2026H1','化工',NULL,16.9,0,'2026-11-13'),
('na-seg-2','nanya-1303','2026H1','聚酯',NULL,15.8,0,'2026-11-13'),
('na-seg-3','nanya-1303','2026H1','塑膠加工',NULL,12.7,0,'2026-11-13'),
('na-seg-4','nanya-1303','2026H1','其他',NULL,1.9,0,'2026-11-13'),
('na-seg-10','nanya-1303','2026/10','電子材料',NULL,61.5,0,'2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,segment=excluded.segment,revenue=excluded.revenue,share=excluded.share,is_estimate=excluded.is_estimate,created_at=excluded.created_at;

INSERT INTO research_forecasts
(id,company_id,fiscal_year,scenario,revenue,gross_margin,net_income,eps,opto_share,notes,created_at)
VALUES
('na-f-2026-bear','nanya-1303',2026,'bear',340000,19.5,NULL,12.8,NULL,'壓力情境：DRAM/CCL漲幅放緩、擴產先產生費用。','2026-11-13'),
('na-f-2026-base','nanya-1303',2026,'base',352000,20.8,NULL,14.76,NULL,'EPS取自統一10/14單家券商；營收/毛利是本研究自設情境，非統一原始財務模型，也非市場共識。','2026-11-13'),
('na-f-2026-bull','nanya-1303',2026,'bull',365000,22.5,NULL,16.2,NULL,'樂觀情境：材料產品組合改善且轉投資收益維持高檔，非公司指引。','2026-11-13'),
('na-f-2027-bear','nanya-1303',2027,'bear',385000,21,NULL,16,NULL,'壓力情境：DRAM/CCL漲幅放緩、擴產先產生費用。','2026-11-13'),
('na-f-2027-base','nanya-1303',2027,'base',420000,25,NULL,22.21,NULL,'EPS取自統一10/14單家券商；營收/毛利是本研究自設情境，非統一原始財務模型，也非市場共識。','2026-11-13'),
('na-f-2027-bull','nanya-1303',2027,'bull',450000,28.5,NULL,26.5,NULL,'樂觀情境：材料產品組合改善且轉投資收益維持高檔，非公司指引。','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,fiscal_year=excluded.fiscal_year,scenario=excluded.scenario,revenue=excluded.revenue,gross_margin=excluded.gross_margin,net_income=excluded.net_income,eps=excluded.eps,opto_share=excluded.opto_share,notes=excluded.notes,created_at=excluded.created_at;

INSERT INTO research_capacity_events
(id,company_id,event_date,label,equipment,technology,delta_units,base_units,expected_online_date,actual_online_date,status,notes)
VALUES
('na-cap-0','nanya-1303','2026-11-11','彰濱玻纖布五廠：預計投資115.3億元','薄布/超薄布設備','高階AI PCB玻纖布',NULL,NULL,NULL,NULL,'approved','11/11董事會核准，媒體披露規劃年產1億公尺；投產、良率、折舊和現金支出未公告。'),
('na-cap-1','nanya-1303','2026-11-11','台灣必成：追加8億元','特殊玻纖紗','T紗與高階玻纖布上下游整合',NULL,NULL,NULL,NULL,'approved','增資不等於立即投產或產生收益，需核對擴產日程及產品驗證。'),
('na-cap-2','nanya-1303','2026-09-29','M6–M8 CCL高階訂單導入','既有CCL產線','高速銅箔基板',NULL,NULL,NULL,NULL,'planned','券商描述客戶協商與去瓶頸產能；尚未核對產能時間單位和實際可售量。')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,event_date=excluded.event_date,label=excluded.label,equipment=excluded.equipment,technology=excluded.technology,delta_units=excluded.delta_units,base_units=excluded.base_units,expected_online_date=excluded.expected_online_date,actual_online_date=excluded.actual_online_date,status=excluded.status,notes=excluded.notes;

INSERT INTO research_catalysts
(id,company_id,title,impact,status,notes,updated_at)
VALUES
('na-cat-0','nanya-1303','電子材料占比維持六成以上','高','active','11–12月月營收占比與毛利率是否同步上升','2026-11-13'),
('na-cat-1','nanya-1303','高階CCL客戶驗證與量產','高','watch','M6–M8需以可售量與ASP驗證，而非訂單敘事','2026-11-13'),
('na-cat-2','nanya-1303','玻纖布與特殊紗投資落實','中','watch','追蹤投產時程、良率、折舊及投入資本回報','2026-11-13'),
('na-cat-3','nanya-1303','南亞科及南電子公司獲利','高','watch','分別核對權益法及併表認列','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_risks
(id,company_id,title,impact,probability,status,notes,updated_at)
VALUES
('na-risk-0','nanya-1303','營業外收益佔稅前64.5%','high','high','watch','非營業收益包含多種科目，不能直接當作南亞科單一收益，也不能未核稅後就扣法定EPS。','2026-11-13'),
('na-risk-1','nanya-1303','轉投資DRAM景氣反轉','high','medium','watch','記憶體報價與營利波動影響權益法收益。','2026-11-13'),
('na-risk-2','nanya-1303','CCL新規格認證與良率','high','medium','watch','名目產能、可售量和實際接單不同。','2026-11-13'),
('na-risk-3','nanya-1303','擴產現金流與折舊','medium','medium','watch','115.3億元預算尚非已支出，需分年度CapEx/ROI。','2026-11-13'),
('na-risk-4','nanya-1303','舊目標價與高檔價格波動','high','high','watch','304元已接近當時券商320–325元目標，不宜把舊價當即時合理價。','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,probability=excluded.probability,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_signal_rules
(id,company_id,metric,green_condition,yellow_condition,red_condition,weight,notes)
VALUES
('na-rule-0','nanya-1303','月營收','≥340億元且年增持續','320–340億元','<320億元且續跌',1.2,'research_inference; sources=na-fin,na-sales'),
('na-rule-1','nanya-1303','電子材料比重','連續≥60%且毛利升','55–60%','<55%且連跌',1.3,'research_inference; sources=na-fin,na-sales'),
('na-rule-2','nanya-1303','盈餘品質','稅後正常化EPS可核對','業外明細仍需釐清','業外高占比且難追溯',1.5,'research_inference; sources=na-fin,na-sales'),
('na-rule-3','nanya-1303','M6–M8實際量產','取得出貨與價量證據','券商預估協商中','認證遞延或需求下修',1.1,'research_inference; sources=na-fin,na-sales'),
('na-rule-4','nanya-1303','新廠投資/報酬','投產與有效產能可追溯','核准投資未量產','延期或投資報酬不足',0.9,'research_inference; sources=na-fin,na-sales'),
('na-rule-5','nanya-1303','估值安全邊際','分部估值有≥20%空間','價差0–20%','舊目標價已到或下修',1.1,'research_inference; sources=na-fin,na-sales')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,metric=excluded.metric,green_condition=excluded.green_condition,yellow_condition=excluded.yellow_condition,red_condition=excluded.red_condition,weight=excluded.weight,notes=excluded.notes;

INSERT INTO research_signal_snapshots
(id,company_id,as_of_date,metric,status,value_text,source_type,notes)
VALUES
('na-signal-0','nanya-1303','2026-11-13','月營收','green','2026/10 349.42億元 / YoY+64.6%','research_inference','研究追蹤燈號，非交易指示；待新財報/月報重驗。'),
('na-signal-1','nanya-1303','2026-11-13','電子材料比重','green','2026/10 61.5%','research_inference','研究追蹤燈號，非交易指示；待新財報/月報重驗。'),
('na-signal-2','nanya-1303','2026-11-13','盈餘品質','red','2026YTD業外淨收益約佔稅前64.5%','research_inference','研究追蹤燈號，非交易指示；待新財報/月報重驗。'),
('na-signal-3','nanya-1303','2026-11-13','M6–M8實際量產','yellow','高階訂單仍需驗證','research_inference','研究追蹤燈號，非交易指示；待新財報/月報重驗。'),
('na-signal-4','nanya-1303','2026-11-13','新廠投資/報酬','yellow','11/11核准115.3億元玻纖布五廠','research_inference','研究追蹤燈號，非交易指示；待新財報/月報重驗。'),
('na-signal-5','nanya-1303','2026-11-13','估值安全邊際','yellow','11/13收304元；較舊320/325元僅5.3%/6.9%','research_inference','研究追蹤燈號，非交易指示；待新財報/月報重驗。')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,as_of_date=excluded.as_of_date,metric=excluded.metric,status=excluded.status,value_text=excluded.value_text,source_type=excluded.source_type,notes=excluded.notes;

INSERT INTO research_sources
(id,company_id,source_type,source_group,source_title,published_date,url,file_name,notes,confidence)
VALUES
('na-fin','nanya-1303','official','公開資訊觀測站公告','2026Q3合併財報決議公告','2026-11-11','https://tw.finance.yahoo.com/quote/1303/announcement',NULL,'1–9月營收247840.286、營業利益33390.297、稅前94063.169、歸母79840.503，單位百萬元；EPS10.07元; accessed=2026-11-13; periods=2026Q3|2026YTD','high'),
('na-sales','nanya-1303','official','南亞公告','2026年10月合併營收','2026-11-06','https://tw.stock.yahoo.com/quote/1303/announcement',NULL,'營收349.4億元、電子材料比重61.5%; accessed=2026-11-13; periods=2026/10','high'),
('na-months','nanya-1303','official','公開資訊彙整','2026月營收彙整','2026-11-13','https://report.sasugod.com/tw/1303',NULL,'月營收以來源四捨五入，另核對正式公告; accessed=2026-11-13; periods=2026/01-2026/10','high'),
('na-capex','nanya-1303','official','公開資訊觀測站公告','玻纖布五廠投資115.3億元','2026-11-11','https://www.moneydj.com/KMDJ/news/newsviewer.aspx?a=51a2ec7d-85d9-4586-b308-179af4781003',NULL,'董事會核准投資，非已支出或已投產; accessed=2026-11-13; periods=2026/11','high'),
('na-cna','nanya-1303','official','中央社','玻纖布五廠規劃年產1億公尺、台灣必成增資8億元','2026-11-12','https://www.cna.com.tw/news/afe/202611120043.aspx',NULL,'規劃而非實際量產與出貨; accessed=2026-11-13; periods=2026/11','high'),
('na-ir','nanya-1303','official','南亞塑膠公司','南亞2026年第3季法說會資訊索引','2026-11-09','https://www.npc.com.tw/j2npc/zhtw/investor/Earnings%20Conference',NULL,'官方法說會資料索引；詳細分項數值須持續核對; accessed=2026-11-13; periods=2026Q3','high'),
('na-price','nanya-1303','official','台股行情','南亞1303於2026/11/13收盤304元','2026-11-13','https://tw.stock.yahoo.com/quote/1303.TW',NULL,'基準收盤價，不代表後續可成交價格; accessed=2026-11-13; periods=2026/11/13','high'),
('na-uni09','nanya-1303','third_party_fact','統一投顧／狼友小站','南亞2026/09/29投資速報','2026-09-29',NULL,'統一-1303 南亞-20260929.pdf','當時目標價320元；EPS13.82/21.64；產品認證與高階CCL預估不是公司承諾; accessed=2026-11-13; periods=2026F|2027F','medium'),
('na-uni10','nanya-1303','third_party_fact','統一投顧／狼友小站','南亞2026/10/14新聞評析','2026-10-14',NULL,'統一-新聞評析-1303 南亞-20261014.pdf','EPS更新至14.76/22.21，當時稱舊320元目標價已到價且待更新; accessed=2026-11-13; periods=2026F|2027F','medium'),
('na-concord','nanya-1303','third_party_fact','康和投顧／狼友小站','南亞2026/10/05投資速報','2026-10-05',NULL,'康和投顧-【投資速報】南亞(1303)20261005.pdf','2026/27 EPS13.96/22.49，目標價325；2Q26營收836.47億元、EPS3.37; accessed=2026-11-13; periods=2026F|2027F|2026Q2','medium'),
('na-esun','nanya-1303','third_party_fact','玉山投顧／狼友小站','南亞2026/08/19研究報告','2026-08-19',NULL,'20260819_玉山投顧_研究報告_1303南亞_增加持股.pdf','2026/27 EPS14.89/14.09，目標價240；南電並表與南亞科權益法應分離; accessed=2026-11-13; periods=2026F|2027F|2026Q2','medium')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,source_type=excluded.source_type,source_group=excluded.source_group,source_title=excluded.source_title,published_date=excluded.published_date,url=excluded.url,file_name=excluded.file_name,notes=excluded.notes,confidence=excluded.confidence;

INSERT INTO research_reports
(id,company_id,title,slug,summary,thesis,status,version,html_path,pdf_path,created_at,updated_at,published_at)
VALUES
('na-report-20261113','nanya-1303','南亞塑膠1303｜AI電子材料、轉投資與盈餘品質完整研究','nanya-1303','2026/10營收349.4億元、電子材料占61.5%；2026年前三季EPS10.07，業外淨收益約占稅前64.5%。報告重點是拆開CCL/玻纖布、南亞科權益法、南電併表與股權處分，避免總EPS評價失真。','高階材料需求 → CCL／玻纖布價量升級 → 本業毛利 → 南亞科／南電獲利認列 → 業外項目穿透 → 正常化EPS／估值；缺稅後細項不得假設都是持續獲利。','published','1.0','/research/reports/nanya-1303.html',NULL,'2026-11-13','2026-11-13','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,slug=excluded.slug,summary=excluded.summary,thesis=excluded.thesis,status=excluded.status,version=excluded.version,html_path=excluded.html_path,pdf_path=excluded.pdf_path,created_at=excluded.created_at,updated_at=excluded.updated_at,published_at=excluded.published_at;

INSERT INTO research_report_sections
(id,report_id,section_key,title,sort_order,content_json)
VALUES
('na-section-1','na-report-20261113','na-section-1','投資摘要：三重獲利引擎',1,'{"type":"summary","payloadRefs":["thesis","signalSnapshots"],"showSources":true}'),
('na-section-2','na-report-20261113','na-section-2','2026Q3與2026/10正式數據',2,'{"type":"kpi-grid","payloadRefs":["actuals","monthlyRevenue"],"showSources":true}'),
('na-section-3','na-report-20261113','na-section-3','本業、稅前及營業外盈餘品質',3,'{"type":"financial-table","payloadRefs":["actuals","earningsQuality"],"showSources":true}'),
('na-section-4','na-report-20261113','na-section-4','2026月營收趨勢與電子材料占比',4,'{"type":"bar-chart","payloadRefs":["monthlyRevenue","segments"],"showSources":true}'),
('na-section-5','na-report-20261113','na-section-5','南亞科權益法、南電並表的差異',5,'{"type":"bridge","payloadRefs":["segments","claims"],"showSources":true}'),
('na-section-6','na-report-20261113','na-section-6','電子材料產品規格與擴建',6,'{"type":"capacity","payloadRefs":["segments","capacity"],"showSources":true}'),
('na-section-7','na-report-20261113','na-section-7','2026–27 EPS三情境與券商估值',7,'{"type":"scenario-table","payloadRefs":["forecasts","claims"],"showSources":true}'),
('na-section-8','na-report-20261113','na-section-8','驗證指標及下一季更新條件',8,'{"type":"signals","payloadRefs":["signalRules","signalSnapshots"],"showSources":true}'),
('na-section-9','na-report-20261113','na-section-9','催化劑與反證',9,'{"type":"catalysts-risks","payloadRefs":["catalysts","risks"],"showSources":true}'),
('na-section-10','na-report-20261113','na-section-10','來源及估計口徑',10,'{"type":"sources","payloadRefs":["sources","claims"],"showSources":true}'),
('na-section-11','na-report-20261113','na-section-11','結論：正常化EPS與分部估值',11,'{"type":"conclusion","payloadRefs":["thesis","earningsQuality","forecasts"],"showSources":true}'),
('na-report-20261113-dashboard','na-report-20261113','dashboard-config','Dashboard Config',0,'{"currentView":"2026年前三季EPS10.07，營業利益333.90億元與稅前940.63億元的差額為業外淨收益606.73億元，佔稅前64.5%；10月營收349.4億元，電子材料61.5%。","currentThesis":"材料升級、南亞科與南電三引擎同時改善，但須檢查持續性和會計口徑。新玻纖布五廠投資115.3億元，仍未投產。","verificationChain":["電子材料占比能否持續60%以上","M6–M8訂單轉可售量","毛利與營業利益率","南電併表/南亞科權益法","業外與處分損益穿透","擴產報酬與折舊","現金流/估值"],"conclusion":"基本面改善方向可驗證，但2026法定EPS大量包含營業外貢獻，應審慎評價。統一10/14 2027F EPS22.21（單家、非共識），304元股價對應總EPS約13.7倍；以9–10月舊320/325元目標價衡量，名義空間僅5.3%／6.9%。無足夠正常化EPS證據，不自行給出偽精準目標價。","forecastScenario":"base","headlineForecastYears":[2026,2027],"focusMetric":{"field":"grossMargin","label":"毛利率"},"monthlyRevenue":{"focusYear":2026,"cumulativeThroughMonth":10,"unitDivisor":100,"unitLabel":"億元"},"cagrCards":[{"field":"revenue","label":"2025A至2027F營收CAGR（情境）","baseYear":2025,"targetYear":2027,"baseValue":259912,"years":2},{"field":"eps","label":"2025A至2027F總EPS CAGR（低基期）","baseYear":2025,"targetYear":2027,"baseValue":0.57,"years":2}],"estimateNote":"基準EPS14.76/22.21來自統一10/14單家預估，並非市場共識；情境營收與毛利率由研究示意，不能與券商原模型混淆。康和2027F22.49、玉山8月14.09時點不同。業外淨收益606.73億元不等於南亞科收益，也不可直接按稅前總額扣EPS。"}')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,section_key=excluded.section_key,title=excluded.title,sort_order=excluded.sort_order,content_json=excluded.content_json;

INSERT INTO research_earnings_quality
(id,report_id,company_id,as_of_date,review_status,l2_status,payload_json,payload_hash,updated_at)
VALUES
('na-report-20261113-eq01','na-report-20261113','nanya-1303','2026-11-13','WARN','PASS','{"standard":"EQ-01-v1","reviewStatus":"WARN","reviewer":"研究報告資料核對（非會計師查核）","reviewedAt":"2026-11-13","coverageNote":"列近三年與最近四季；未取得完整年度業外明細之數值留null，不能當作零。","periods":[{"id":"na-eq-2023FY","period":"2023FY","periodType":"annual","currency":"TWD","scale":"million","revenue":null,"operatingIncome":null,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":null,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["na-uni09"],"claimIds":[],"normalizationNote":"尚缺稅後歸屬及特殊項目逐筆勾稽，正常化EPS暫留空，不把缺值寫成零。"},{"id":"na-eq-2024FY","period":"2024FY","periodType":"annual","currency":"TWD","scale":"million","revenue":null,"operatingIncome":null,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":0.42,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["na-esun"],"claimIds":[],"normalizationNote":"尚缺稅後歸屬及特殊項目逐筆勾稽，正常化EPS暫留空，不把缺值寫成零。"},{"id":"na-eq-2025FY","period":"2025FY","periodType":"annual","currency":"TWD","scale":"million","revenue":259912,"operatingIncome":null,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":0.57,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["na-concord"],"claimIds":[],"normalizationNote":"尚缺稅後歸屬及特殊項目逐筆勾稽，正常化EPS暫留空，不把缺值寫成零。"},{"id":"na-eq-2025Q4","period":"2025Q4","periodType":"quarter","currency":"TWD","scale":"million","revenue":64470,"operatingIncome":null,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":0.62,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["na-months"],"claimIds":[],"normalizationNote":"尚缺稅後歸屬及特殊項目逐筆勾稽，正常化EPS暫留空，不把缺值寫成零。"},{"id":"na-eq-2026Q1","period":"2026Q1","periodType":"quarter","currency":"TWD","scale":"million","revenue":68596,"operatingIncome":null,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":1.8,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["na-concord"],"claimIds":[],"normalizationNote":"尚缺稅後歸屬及特殊項目逐筆勾稽，正常化EPS暫留空，不把缺值寫成零。"},{"id":"na-eq-2026Q2","period":"2026Q2","periodType":"quarter","currency":"TWD","scale":"million","revenue":83647,"operatingIncome":null,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":3.37,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["na-concord"],"claimIds":[],"normalizationNote":"尚缺稅後歸屬及特殊項目逐筆勾稽，正常化EPS暫留空，不把缺值寫成零。"},{"id":"na-eq-2026Q3","period":"2026Q3","periodType":"quarter","currency":"TWD","scale":"million","revenue":95597.286,"operatingIncome":null,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":4.9,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["na-fin","na-uni10"],"claimIds":[],"normalizationNote":"尚缺稅後歸屬及特殊項目逐筆勾稽，正常化EPS暫留空，不把缺值寫成零。"},{"id":"na-eq-2026YTD","period":"2026YTD","periodType":"ytd","currency":"TWD","scale":"million","revenue":247840.286,"operatingIncome":33390.297,"nonOperatingNet":60672.872,"pretaxIncome":94063.169,"incomeTax":null,"netIncomeAttributable":79840.503,"reportedEps":10.07,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[{"id":"na-eq-adjust1","category":"equity_method","realization":"mixed","pretaxAmount":null,"epsImpact":null,"equityImpact":null,"method":"先辨識南亞科權益法、南電合併以及投資處分差異；缺正式逐筆稅後附註，暫不直接扣除。","sourceIds":["na-fin","na-esun"],"notes":"60672.872百萬元為整體業外淨差額，不是單一南亞科收益；待L2明細。"}],"sourceIds":["na-fin"],"claimIds":[],"normalizationNote":"尚缺稅後歸屬及特殊項目逐筆勾稽，正常化EPS暫留空，不把缺值寫成零。"}],"qualitativeFlags":["control_scope","related_party","forecast_discrepancy"],"l2":{"status":"PASS","summary":"完成L2初步來源穿透與總額對帳：前三季營業利益33390.297百萬元加業外淨差60672.872百萬元，等於稅前94063.169百萬元。南亞科權益法、南電合併損益與處分利益須分開，缺乏稅後單項分配資料，故歷史正常化EPS保留null並明示WARN。L2 PASS僅代表辨識與勾稽步驟完成，並非特殊損益逐項審計。","sourceIds":["na-fin","na-esun","na-uni09"],"claimIds":["na-claim-profit","na-claim-components"]},"valuation":{"epsBasis":"reported","prospectiveModelOnly":true,"doubleCountChecked":true,"notes":"沒有把606.73億元全部當作一次性稅後收益扣掉，也未將南電合併利益重加到權益法。券商EPS含轉投資貢獻，2027F不適宜直接與純電子材料公司的PE比較；分部估值需要更完整稅後拆分。"},"notes":"2026/11/13資料截止。券商目標價與預估係當期觀點，不代表目前投資建議。"}','3da0776da54f7f279997cb209be211bf591ba85fa68bc12cac46a5aad4b60132','2026-11-13')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,company_id=excluded.company_id,as_of_date=excluded.as_of_date,review_status=excluded.review_status,l2_status=excluded.l2_status,payload_json=excluded.payload_json,payload_hash=excluded.payload_hash,updated_at=excluded.updated_at;


-- Remove stale rows only after all canonical rows have been upserted.

DELETE FROM research_financial_actuals WHERE company_id='nanya-1303' AND id NOT IN ('na-a-2025FY','na-a-2025Q4','na-a-2026Q1','na-a-2026Q2','na-a-2026Q3','na-a-2026YTD');

DELETE FROM research_monthly_revenue WHERE company_id='nanya-1303' AND id NOT IN ('na-m-1','na-m-2','na-m-3','na-m-4','na-m-5','na-m-6','na-m-7','na-m-8','na-m-9','na-m-10');

DELETE FROM research_segments WHERE company_id='nanya-1303' AND id NOT IN ('na-seg-0','na-seg-1','na-seg-2','na-seg-3','na-seg-4','na-seg-10');

DELETE FROM research_forecasts WHERE company_id='nanya-1303' AND id NOT IN ('na-f-2026-bear','na-f-2026-base','na-f-2026-bull','na-f-2027-bear','na-f-2027-base','na-f-2027-bull');

DELETE FROM research_capacity_events WHERE company_id='nanya-1303' AND id NOT IN ('na-cap-0','na-cap-1','na-cap-2');

DELETE FROM research_catalysts WHERE company_id='nanya-1303' AND id NOT IN ('na-cat-0','na-cat-1','na-cat-2','na-cat-3');

DELETE FROM research_risks WHERE company_id='nanya-1303' AND id NOT IN ('na-risk-0','na-risk-1','na-risk-2','na-risk-3','na-risk-4');

DELETE FROM research_signal_rules WHERE company_id='nanya-1303' AND id NOT IN ('na-rule-0','na-rule-1','na-rule-2','na-rule-3','na-rule-4','na-rule-5');

DELETE FROM research_signal_snapshots WHERE company_id='nanya-1303' AND id NOT IN ('na-signal-0','na-signal-1','na-signal-2','na-signal-3','na-signal-4','na-signal-5');

DELETE FROM research_sources WHERE company_id='nanya-1303' AND id NOT IN ('na-fin','na-sales','na-months','na-capex','na-cna','na-ir','na-price','na-uni09','na-uni10','na-concord','na-esun');

DELETE FROM research_reports WHERE company_id='nanya-1303' AND id NOT IN ('na-report-20261113');

DELETE FROM research_report_sections WHERE report_id='na-report-20261113' AND id NOT IN ('na-section-1','na-section-2','na-section-3','na-section-4','na-section-5','na-section-6','na-section-7','na-section-8','na-section-9','na-section-10','na-section-11','na-report-20261113-dashboard');
