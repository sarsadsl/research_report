PRAGMA foreign_keys = ON;

INSERT INTO research_companies
(id,ticker,market,name,slug,sector,industry,currency,description,status,created_at,updated_at)
VALUES
('liteon-2301','2301','TW','光寶科','liteon-2301','電源供應器／電子零組件','高瓦數 PSU／BBU／Power Rack／液冷','TWD','CSP AI機櫃需求 → 8.5kW PSU＋BBU → 110kW Power Shelf → 800VDC Power Rack → 產品組合與出貨擴張 → 毛利／營益率 → 擴產資本效率。2027F機櫃認列節奏是券商差距根源。','unlisted','2026-11-13','2026-11-13')
ON CONFLICT(id) DO UPDATE SET ticker=excluded.ticker,market=excluded.market,name=excluded.name,slug=excluded.slug,sector=excluded.sector,industry=excluded.industry,currency=excluded.currency,description=excluded.description,status=excluded.status,created_at=excluded.created_at,updated_at=excluded.updated_at;

INSERT INTO research_financial_actuals
(id,company_id,period,fiscal_year,quarter,revenue,gross_profit,gross_margin,operating_income,operating_margin,net_income,net_margin,eps,source_note,created_at)
VALUES
('liteon-a-2025FY','liteon-2301','2025FY',2025,NULL,166084.859,38039.258,22.9,16737.802,10.08,15115.934,9.1,6.64,'third_party_fact; sources=liteon-src-financial','2026-11-13'),
('liteon-a-2025Q4','liteon-2301','2025Q4',2025,4,44356,9633,21.72,4653,10.49,3860,8.7,1.7,'third_party_fact; sources=liteon-src-financial','2026-11-13'),
('liteon-a-2026Q1','liteon-2301','2026Q1',2026,1,43407.292,9402.933,21.66,4099.305,9.44,3775.414,8.7,1.66,'third_party_fact; sources=liteon-src-financial','2026-11-13'),
('liteon-a-2026Q2','liteon-2301','2026Q2',2026,2,52703.454,14348.457,27.22,8202.55,15.56,7115.83,13.5,3.14,'third_party_fact; sources=liteon-src-financial','2026-11-13'),
('liteon-a-2026Q3','liteon-2301','2026Q3',2026,3,57403.018,14866.698,25.9,8655.453,15.08,7429.346,12.94,3.27,'third_party_fact; sources=liteon-src-financial','2026-11-13'),
('liteon-a-2026YTD','liteon-2301','2026YTD',2026,NULL,153513.764,38618.088,25.16,20957.308,13.65,18320.59,11.93,8.08,'third_party_fact; sources=liteon-src-financial','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,fiscal_year=excluded.fiscal_year,quarter=excluded.quarter,revenue=excluded.revenue,gross_profit=excluded.gross_profit,gross_margin=excluded.gross_margin,operating_income=excluded.operating_income,operating_margin=excluded.operating_margin,net_income=excluded.net_income,net_margin=excluded.net_margin,eps=excluded.eps,source_note=excluded.source_note,created_at=excluded.created_at;

INSERT INTO research_monthly_revenue
(id,company_id,year,month,revenue,mom,yoy,created_at)
VALUES
('liteon-m-01','liteon-2301',2026,1,14112,-5.3,16.2,'2026-11-13'),
('liteon-m-02','liteon-2301',2026,2,12812,-9.2,17.4,'2026-11-13'),
('liteon-m-03','liteon-2301',2026,3,16484,28.7,23.4,'2026-11-13'),
('liteon-m-04','liteon-2301',2026,4,16695,1.3,24.5,'2026-11-13'),
('liteon-m-05','liteon-2301',2026,5,17354,4,29.6,'2026-11-13'),
('liteon-m-06','liteon-2301',2026,6,18656,7.5,37,'2026-11-13'),
('liteon-m-07','liteon-2301',2026,7,19006,1.9,37.6,'2026-11-13'),
('liteon-m-08','liteon-2301',2026,8,19592,3.1,25.2,'2026-11-13'),
('liteon-m-09','liteon-2301',2026,9,18848,-3.8,22.1,'2026-11-13'),
('liteon-m-10','liteon-2301',2026,10,20071,6.5,32,'2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,year=excluded.year,month=excluded.month,revenue=excluded.revenue,mom=excluded.mom,yoy=excluded.yoy,created_at=excluded.created_at;

INSERT INTO research_segments
(id,company_id,period,segment,revenue,share,is_estimate,created_at)
VALUES
('liteon-seg-0','liteon-2301','2026Q3','資訊與消費性電子',NULL,27,0,'2026-11-13'),
('liteon-seg-1','liteon-2301','2026Q3','雲端及物聯網',NULL,59,0,'2026-11-13'),
('liteon-seg-2','liteon-2301','2026Q3','光電／車用',NULL,14,0,'2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,segment=excluded.segment,revenue=excluded.revenue,share=excluded.share,is_estimate=excluded.is_estimate,created_at=excluded.created_at;

INSERT INTO research_forecasts
(id,company_id,fiscal_year,scenario,revenue,gross_margin,net_income,eps,opto_share,notes,created_at)
VALUES
('liteon-f-2027-bear','liteon-2301',2027,'bear',244680,27.8,33298,14.63,NULL,'研究情境（非統計市場共識）；netIncome按EPS×假設約2276百萬股估算；忽略稅率及稀釋股數變動，僅供相對情境。','2026-11-13'),
('liteon-f-2027-consensus','liteon-2301',2027,'consensus',288740,27.2,33571,14.75,NULL,'研究情境（非統計市場共識）；netIncome按EPS×假設約2276百萬股估算；忽略稅率及稀釋股數變動，僅供相對情境。','2026-11-13'),
('liteon-f-2027-bull','liteon-2301',2027,'bull',317000,26.9,40809,17.93,NULL,'研究情境（非統計市場共識）；netIncome按EPS×假設約2276百萬股估算；忽略稅率及稀釋股數變動，僅供相對情境。','2026-11-13'),
('liteon-f-2028-bear','liteon-2301',2028,'bear',340000,26,38692,17,NULL,'研究情境（非統計市場共識）；netIncome按EPS×假設約2276百萬股估算；忽略稅率及稀釋股數變動，僅供相對情境。','2026-11-13'),
('liteon-f-2028-consensus','liteon-2301',2028,'consensus',386546,29,49048,21.55,NULL,'研究情境（非統計市場共識）；netIncome按EPS×假設約2276百萬股估算；忽略稅率及稀釋股數變動，僅供相對情境。','2026-11-13'),
('liteon-f-2028-bull','liteon-2301',2028,'bull',420000,29.5,53486,23.5,NULL,'研究情境（非統計市場共識）；netIncome按EPS×假設約2276百萬股估算；忽略稅率及稀釋股數變動，僅供相對情境。','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,fiscal_year=excluded.fiscal_year,scenario=excluded.scenario,revenue=excluded.revenue,gross_margin=excluded.gross_margin,net_income=excluded.net_income,eps=excluded.eps,opto_share=excluded.opto_share,notes=excluded.notes,created_at=excluded.created_at;

INSERT INTO research_capacity_events
(id,company_id,event_date,label,equipment,technology,delta_units,base_units,expected_online_date,actual_online_date,status,notes)
VALUES
('liteon-cap-0','liteon-2301','2026-10-30','8.5kW PSU＋BBU','Gen3 ASIC 機櫃','8.5 kW PSU+BBU',NULL,NULL,NULL,NULL,'production','法說及華南報告提及量產；客戶份額未知'),
('liteon-cap-1','liteon-2301','2026-10-30','VR 110kW／Helios 42吋Power Shelf','高功率GPU平台','110 kW Power Shelf',NULL,NULL,NULL,NULL,'production','量產轉實際收入需後續公司揭露'),
('liteon-cap-2','liteon-2301','2026-10-30','800VDC Power Rack','HVDC電源櫃','800 V DC',NULL,NULL,NULL,NULL,'qualification','2026Q4樣機；元大預估2027商轉；凱基較保守'),
('liteon-cap-3','liteon-2301','2026-11-13','美國德州廠','McKinney電源產線','Power Rack / PSU',NULL,NULL,NULL,NULL,'planned','華南記載2027Q2試運營；非已量產'),
('liteon-cap-4','liteon-2301','2026-11-13','高雄／越南擴產','高雄二期及越南海防','PSU/BBU',NULL,NULL,NULL,NULL,'ramp','2026 CapEx上調197億元，2027預期增加')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,event_date=excluded.event_date,label=excluded.label,equipment=excluded.equipment,technology=excluded.technology,delta_units=excluded.delta_units,base_units=excluded.base_units,expected_online_date=excluded.expected_online_date,actual_online_date=excluded.actual_online_date,status=excluded.status,notes=excluded.notes;

INSERT INTO research_catalysts
(id,company_id,title,impact,status,notes,updated_at)
VALUES
('liteon-cat-0','liteon-2301','高瓦數PSU與BBU滲透提高','high','watch','產品升級可提升AI電源收入內容價值','2026-11-13'),
('liteon-cat-1','liteon-2301','2027 800VDC Power Rack認證','high','watch','從樣機轉量產出貨、追蹤客戶正式採購','2026-11-13'),
('liteon-cat-2','liteon-2301','新CSP客戶拓展','high','watch','凱基認為部分明顯貢獻可能至2028','2026-11-13'),
('liteon-cat-3','liteon-2301','擴產稼動與液冷產品','medium','watch','若良率、稼動跟進營業利益槓桿','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_risks
(id,company_id,title,impact,probability,status,notes,updated_at)
VALUES
('liteon-risk-0','liteon-2301','CSP缺電與機櫃供應鏈長短料','high','high','watch','元大2027營收較08舊版下修12.6%','2026-11-13'),
('liteon-risk-1','liteon-2301','2026–2027資本支出與折舊','high','high','watch','2026預算197億元，管理層稱2027更高','2026-11-13'),
('liteon-risk-2','liteon-2301','2026Q1業外占比超過15%','high','medium','watch','870.6百萬元／4969.9百萬元≈17.5%，EQ-01 L2需穿透','2026-11-13'),
('liteon-risk-3','liteon-2301','2027券商獲利差距大','high','high','watch','元大17.93相較華南14.63元高22.6%','2026-11-13'),
('liteon-risk-4','liteon-2301','新客戶試產與正式量產落差','high','high','watch','樣機出貨不可視為已確認年度收入','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,probability=excluded.probability,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_signal_rules
(id,company_id,metric,green_condition,yellow_condition,red_condition,weight,notes)
VALUES
('liteon-rule-0','liteon-2301','AI營收占比','2027已認列AI占比達50%','40%至50%且定義清楚','低於40%且下修持續',1,'research_inference; sources=liteon-src-model'),
('liteon-rule-1','liteon-2301','800VDC Power Rack','客戶正式量產與採購','送樣驗證','認證延後逾兩季',1,'research_inference; sources=liteon-src-model'),
('liteon-rule-2','liteon-2301','雲端業務占比','雲端及物聯網持續≥60%','55%–60%','<50%且毛利同步降',1,'research_inference; sources=liteon-src-model'),
('liteon-rule-3','liteon-2301','EQ-01與現金流','L2完成且OCF支持高獲利','關鍵業外／OCF待核對','L2未完成卻以法定EPS高估值',1,'research_inference; sources=liteon-src-model')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,metric=excluded.metric,green_condition=excluded.green_condition,yellow_condition=excluded.yellow_condition,red_condition=excluded.red_condition,weight=excluded.weight,notes=excluded.notes;

INSERT INTO research_signal_snapshots
(id,company_id,as_of_date,metric,status,value_text,source_type,notes)
VALUES
('liteon-signal-0','liteon-2301','2026-11-13','AI營收占比','yellow','華南轉述公司預期2027 AI占比40–50%','research_inference','研究監測用非買賣建議；必要時等待下季公告驗證'),
('liteon-signal-1','liteon-2301','2026-11-13','800VDC Power Rack','yellow','2026Q4樣機出貨，量產待驗證','research_inference','研究監測用非買賣建議；必要時等待下季公告驗證'),
('liteon-signal-2','liteon-2301','2026-11-13','雲端業務占比','yellow','2026Q3事業群占比59%','research_inference','研究監測用非買賣建議；必要時等待下季公告驗證'),
('liteon-signal-3','liteon-2301','2026-11-13','EQ-01與現金流','yellow','FY2025及2026Q1觸發L2，未完成','research_inference','研究監測用非買賣建議；必要時等待下季公告驗證')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,as_of_date=excluded.as_of_date,metric=excluded.metric,status=excluded.status,value_text=excluded.value_text,source_type=excluded.source_type,notes=excluded.notes;

INSERT INTO research_sources
(id,company_id,source_type,source_group,source_title,published_date,url,file_name,notes,confidence)
VALUES
('liteon-src-financial','liteon-2301','third_party_fact','富聯網／公開資訊觀測站轉錄','光寶科 IFRS 累計綜合損益表','2026-10-30','https://ww2.money-link.com.tw/TWStock/StockBasic.aspx?SymId=2301&TWMId=Basic_IIAM2',NULL,'網頁可查，原始法定科目仍需以MOPS財報複核; accessed=2026-11-13; periods=2025FY|2026Q1|2026Q2|2026Q3|2026YTD','medium'),
('liteon-src-quarter','liteon-2301','third_party_fact','MoneyDJ／公開資訊觀測站轉錄','115年第3季綜合損益表含業外明細','2026-10-30','https://www.moneydj.com/kmdj/news/newsviewer.aspx?a=fe20bf69-40ff-4c21-9795-786bdd66b75e&c=MB06',NULL,'網頁可查，原始法定科目仍需以MOPS財報複核; accessed=2026-11-13; periods=2026Q3|2026YTD','medium'),
('liteon-src-monthly','liteon-2301','third_party_fact','SASUGOD／公開資訊觀測站轉錄','2026年1–10月歷月營收','2026-11-13','https://report.sasugod.com/tw/2301',NULL,'網頁可查，原始法定科目仍需以MOPS財報複核; accessed=2026-11-13; periods=2026M01|2026M10','medium'),
('liteon-src-yuanta-aug','liteon-2301','market_consensus','元大投顧','光寶科 2026/08/03 Top Call EPS18.94','2026-08-03',NULL,NULL,'私人研究資料，僅登錄摘要及文件日期；未公開券商PDF或分享私人Drive識別資料; accessed=2026-11-13; periods=2026F|2027F','medium'),
('liteon-src-yuanta-nov','liteon-2301','market_consensus','元大投顧','光寶科 2026/11/02 2027F EPS17.93、營收3170億元','2026-11-02',NULL,NULL,'私人研究資料，僅登錄摘要及文件日期；未公開券商PDF或分享私人Drive識別資料; accessed=2026-11-13; periods=2026F|2027F','medium'),
('liteon-src-kgi','liteon-2301','market_consensus','凱基投顧','光寶科 2026/10/30 2027F EPS14.75、2028F EPS21.55','2026-10-30',NULL,NULL,'私人研究資料，僅登錄摘要及文件日期；未公開券商PDF或分享私人Drive識別資料; accessed=2026-11-13; periods=2026F|2027F|2028F','medium'),
('liteon-src-huanan','liteon-2301','market_consensus','華南投顧','光寶科 2026/11/02 2027F EPS14.63、營收2446.8億元','2026-11-02',NULL,NULL,'私人研究資料，僅登錄摘要及文件日期；未公開券商PDF或分享私人Drive識別資料; accessed=2026-11-13; periods=2026F|2027F','medium'),
('liteon-src-cathay-aug','liteon-2301','market_consensus','國泰證期研究部','光寶科 2026/08/03舊版 2027F EPS12.62','2026-08-03',NULL,NULL,'私人研究資料，僅登錄摘要及文件日期；未公開券商PDF或分享私人Drive識別資料; accessed=2026-11-13; periods=2026F|2027F','medium'),
('liteon-src-model','liteon-2301','research_inference','研究報告追蹤','PSU/BBU/HVDC分類、假設情境與QC審核草案','2026-11-13',NULL,NULL,'私人研究資料，僅登錄摘要及文件日期；未公開券商PDF或分享私人Drive識別資料; accessed=2026-11-13; periods=2026Q3|2027F|2028F','medium')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,source_type=excluded.source_type,source_group=excluded.source_group,source_title=excluded.source_title,published_date=excluded.published_date,url=excluded.url,file_name=excluded.file_name,notes=excluded.notes,confidence=excluded.confidence;

INSERT INTO research_reports
(id,company_id,title,slug,summary,thesis,status,version,html_path,pdf_path,created_at,updated_at,published_at)
VALUES
('liteon-report-20261113-draft','liteon-2301','光寶科（2301）｜AI電力基建與盈餘品質標準Full Report（待審）','liteon-2301','2026Q3營收574.03億元、EPS3.27、毛利率25.9%、營益率15.1%；2026/10營收200.71億元。2027F EPS元大17.93元、凱基14.75元、華南14.63元，分歧反映新CSP與Power Rack交貨時點。','CSP AI機櫃需求 → 8.5kW PSU＋BBU → 110kW Power Shelf → 800VDC Power Rack → 產品組合與出貨擴張 → 毛利／營益率 → 擴產資本效率。2027F機櫃認列節奏是券商差距根源。','draft','0.2.0','/research/reports/liteon-2301.html',NULL,'2026-11-13','2026-11-13',NULL)
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,slug=excluded.slug,summary=excluded.summary,thesis=excluded.thesis,status=excluded.status,version=excluded.version,html_path=excluded.html_path,pdf_path=excluded.pdf_path,created_at=excluded.created_at,updated_at=excluded.updated_at,published_at=excluded.published_at;

INSERT INTO research_report_sections
(id,report_id,section_key,title,sort_order,content_json)
VALUES
('liteon-sec-1','liteon-report-20261113-draft','liteon-sec-1','投資主張：已實現進度與反證',1,'{"type":"summary","payloadRefs":["thesis","signalSnapshots"],"showSources":true}'),
('liteon-sec-2','liteon-report-20261113-draft','liteon-sec-2','財務摘要與2027–2028估計',2,'{"type":"kpi-grid","payloadRefs":["actuals","forecasts"],"showSources":true}'),
('liteon-sec-3','liteon-report-20261113-draft','liteon-sec-3','財報與盈餘品質 EQ-01',3,'{"type":"financial-table","payloadRefs":["actuals","earningsQuality"],"showSources":true}'),
('liteon-sec-4','liteon-report-20261113-draft','liteon-sec-4','2026年歷月營收與需求驗證',4,'{"type":"bar-chart","payloadRefs":["monthlyRevenue"],"showSources":true}'),
('liteon-sec-5','liteon-report-20261113-draft','liteon-sec-5','營收與獲利率變化',5,'{"type":"line-chart","payloadRefs":["actuals"],"showSources":true}'),
('liteon-sec-6','liteon-report-20261113-draft','liteon-sec-6','2027–2028研究情境與券商差異',6,'{"type":"scenario-table","payloadRefs":["forecasts"],"showSources":true}'),
('liteon-sec-7','liteon-report-20261113-draft','liteon-sec-7','AI電力架構與商業化節點',7,'{"type":"capacity","payloadRefs":["capacity"],"showSources":true}'),
('liteon-sec-8','liteon-report-20261113-draft','liteon-sec-8','投資燈號與升降級條件',8,'{"type":"signals","payloadRefs":["signalSnapshots"],"showSources":true}'),
('liteon-sec-9','liteon-report-20261113-draft','liteon-sec-9','催化劑／下行風險',9,'{"type":"catalysts-risks","payloadRefs":["catalysts","risks"],"showSources":true}'),
('liteon-sec-10','liteon-report-20261113-draft','liteon-sec-10','來源台帳與券商估計限制',10,'{"type":"sources","payloadRefs":["sources"],"showSources":true}'),
('liteon-sec-11','liteon-report-20261113-draft','liteon-sec-11','總結：正式發布前的關鍵待驗證點',11,'{"type":"conclusion","payloadRefs":["thesis"],"showSources":true}'),
('liteon-report-20261113-draft-dashboard','liteon-report-20261113-draft','dashboard-config','Dashboard Config',0,'{"currentView":"2026Q3營收574.03億元、EPS3.27、毛利率25.9%、營益率15.1%；2026/10營收200.71億元。2027F EPS元大17.93元、凱基14.75元、華南14.63元，分歧反映新CSP與Power Rack交貨時點。","currentThesis":"CSP AI機櫃需求 → 8.5kW PSU＋BBU → 110kW Power Shelf → 800VDC Power Rack → 產品組合與出貨擴張 → 毛利／營益率 → 擴產資本效率。2027F機櫃認列節奏是券商差距根源。","verificationChain":["AI營收占比","800VDC Power Rack","雲端業務占比","EQ-01與現金流"],"conclusion":"黃燈：AI電源產品升級已反映在獲利，但尚需驗證新CSP、800VDC認證、2027擴產現金流。2026/11元大較08舊版下修2027營收12.6%，提醒缺料與缺電影響並非一次性。2026Q1單季業外占稅前約17.5%，觸發EQ-01 L2；正式版不得在穿透審閱前上架。","forecastScenario":"consensus","headlineForecastYears":[2027,2028],"focusMetric":{"field":"grossMargin","label":"毛利率"},"monthlyRevenue":{"focusYear":2026,"cumulativeThroughMonth":10,"unitDivisor":100,"unitLabel":"億元"},"cagrCards":[{"field":"revenue","label":"2025A至2027F營收成長（研究情境）","baseYear":2025,"targetYear":2027,"baseValue":166084.859,"years":2},{"field":"eps","label":"2025A至2027F EPS成長（研究情境）","baseYear":2025,"targetYear":2027,"baseValue":6.64,"years":2}],"estimateNote":"2027F EPS元大11/02 17.93，2027營收3170億元、毛利26.9%、目標350；凱基10/30 EPS14.75、營收2887.4億元、毛利27.2%、目標295；華南11/02 EPS14.63、營收2446.8億元、毛利27.8%、目標278。元大8/03舊版 EPS18.94 → 11/02下修17.93；營收3627.3→3170億元。2028凱基估EPS21.55。所有為單家券商、非同日共識；bear/consensus/bull僅為本研究情境。800VDC樣機非已量產。"}')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,section_key=excluded.section_key,title=excluded.title,sort_order=excluded.sort_order,content_json=excluded.content_json;

INSERT INTO research_earnings_quality
(id,report_id,company_id,as_of_date,review_status,l2_status,payload_json,payload_hash,updated_at)
VALUES
('liteon-report-20261113-draft-eq01','liteon-report-20261113-draft','liteon-2301','2026-11-13','NOT_RUN','NOT_RUN','{"standard":"EQ-01-v1","reviewStatus":"NOT_RUN","reviewer":"待研究審閱人正式簽核","reviewedAt":"2026-11-13","coverageNote":"已有公開損益科目基本橋接；歷史2023/2024明細、業外按附註分類、OCF/FCF及每股調整未完整；不得以資料不足冒稱PASS。","periods":[{"id":"liteon-eq-2023FY","period":"2023FY","periodType":"annual","revenue":148330,"operatingIncome":null,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":6.36,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["liteon-src-financial"],"claimIds":["liteon-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"},{"id":"liteon-eq-2024FY","period":"2024FY","periodType":"annual","revenue":137134,"operatingIncome":12934,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":11942,"reportedEps":5.21,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["liteon-src-financial"],"claimIds":["liteon-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"},{"id":"liteon-eq-2025FY","period":"2025FY","periodType":"annual","revenue":166084.859,"operatingIncome":16737.802,"nonOperatingNet":2975.365,"pretaxIncome":19713.167,"incomeTax":4601.373,"netIncomeAttributable":15115.934,"reportedEps":6.64,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["liteon-src-financial"],"claimIds":["liteon-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"},{"id":"liteon-eq-2025Q4","period":"2025Q4","periodType":"quarter","revenue":44356,"operatingIncome":4653,"nonOperatingNet":560,"pretaxIncome":5213,"incomeTax":null,"netIncomeAttributable":3860,"reportedEps":1.7,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["liteon-src-financial"],"claimIds":["liteon-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"},{"id":"liteon-eq-2026Q1","period":"2026Q1","periodType":"quarter","revenue":43407.292,"operatingIncome":4099.305,"nonOperatingNet":870.596,"pretaxIncome":4969.901,"incomeTax":1195.242,"netIncomeAttributable":3775.414,"reportedEps":1.66,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["liteon-src-financial"],"claimIds":["liteon-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"},{"id":"liteon-eq-2026Q2","period":"2026Q2","periodType":"quarter","revenue":52703.454,"operatingIncome":8202.55,"nonOperatingNet":1165.729,"pretaxIncome":9368.279,"incomeTax":2248.392,"netIncomeAttributable":7115.83,"reportedEps":3.14,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["liteon-src-financial"],"claimIds":["liteon-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"},{"id":"liteon-eq-2026Q3","period":"2026Q3","periodType":"quarter","revenue":57403.018,"operatingIncome":8655.453,"nonOperatingNet":1142.472,"pretaxIncome":9797.925,"incomeTax":2349.035,"netIncomeAttributable":7429.346,"reportedEps":3.27,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["liteon-src-financial"],"claimIds":["liteon-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"},{"id":"liteon-eq-2026YTD","period":"2026YTD","periodType":"ytd","revenue":153513.764,"operatingIncome":20957.308,"nonOperatingNet":3178.797,"pretaxIncome":24136.105,"incomeTax":5792.669,"netIncomeAttributable":18320.59,"reportedEps":8.08,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":97453.074,"adjustments":[],"sourceIds":["liteon-src-financial"],"claimIds":["liteon-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"}],"qualitativeFlags":["forecast_discrepancy"],"l2":{"status":"NOT_RUN","summary":"2025FY及2026Q1非營業占比已達EQ-01 L2門檻，業外穿透與常態化EPS未完成。","sourceIds":["liteon-src-financial","liteon-src-model"],"claimIds":["liteon-claim-quality"]},"valuation":{"epsBasis":"reported","doubleCountChecked":false,"prospectiveModelOnly":true,"notes":"預測EPS僅作研究情境，不把尚未穿透的歷史reported EPS視為normalised EPS。沒有完成重複扣除檢查及OCF驗證。"},"notes":"2026Q1營業外損益870.596／稅前4969.901≈17.5%；2025全年業外2975.365／稅前19713.167≈15.1%。達EQ-01 L2觸發門檻，需拆金融資產FVPL、利息、匯兌及權益法，核對母公司稅後歸屬及現金／非現金。OCF、資本支出及年度2023/24業外尚未完整驗證，暫標NOT_RUN，禁止正式發布。"}','6a6e2779f86dc683a928f5b6b9e166d1f1c91d925fce71e76e4ab95fc1eb6dd3','2026-11-13')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,company_id=excluded.company_id,as_of_date=excluded.as_of_date,review_status=excluded.review_status,l2_status=excluded.l2_status,payload_json=excluded.payload_json,payload_hash=excluded.payload_hash,updated_at=excluded.updated_at;


-- Remove stale rows only after all canonical rows have been upserted.

DELETE FROM research_financial_actuals WHERE company_id='liteon-2301' AND id NOT IN ('liteon-a-2025FY','liteon-a-2025Q4','liteon-a-2026Q1','liteon-a-2026Q2','liteon-a-2026Q3','liteon-a-2026YTD');

DELETE FROM research_monthly_revenue WHERE company_id='liteon-2301' AND id NOT IN ('liteon-m-01','liteon-m-02','liteon-m-03','liteon-m-04','liteon-m-05','liteon-m-06','liteon-m-07','liteon-m-08','liteon-m-09','liteon-m-10');

DELETE FROM research_segments WHERE company_id='liteon-2301' AND id NOT IN ('liteon-seg-0','liteon-seg-1','liteon-seg-2');

DELETE FROM research_forecasts WHERE company_id='liteon-2301' AND id NOT IN ('liteon-f-2027-bear','liteon-f-2027-consensus','liteon-f-2027-bull','liteon-f-2028-bear','liteon-f-2028-consensus','liteon-f-2028-bull');

DELETE FROM research_capacity_events WHERE company_id='liteon-2301' AND id NOT IN ('liteon-cap-0','liteon-cap-1','liteon-cap-2','liteon-cap-3','liteon-cap-4');

DELETE FROM research_catalysts WHERE company_id='liteon-2301' AND id NOT IN ('liteon-cat-0','liteon-cat-1','liteon-cat-2','liteon-cat-3');

DELETE FROM research_risks WHERE company_id='liteon-2301' AND id NOT IN ('liteon-risk-0','liteon-risk-1','liteon-risk-2','liteon-risk-3','liteon-risk-4');

DELETE FROM research_signal_rules WHERE company_id='liteon-2301' AND id NOT IN ('liteon-rule-0','liteon-rule-1','liteon-rule-2','liteon-rule-3');

DELETE FROM research_signal_snapshots WHERE company_id='liteon-2301' AND id NOT IN ('liteon-signal-0','liteon-signal-1','liteon-signal-2','liteon-signal-3');

DELETE FROM research_sources WHERE company_id='liteon-2301' AND id NOT IN ('liteon-src-financial','liteon-src-quarter','liteon-src-monthly','liteon-src-yuanta-aug','liteon-src-yuanta-nov','liteon-src-kgi','liteon-src-huanan','liteon-src-cathay-aug','liteon-src-model');

DELETE FROM research_reports WHERE company_id='liteon-2301' AND id NOT IN ('liteon-report-20261113-draft');

DELETE FROM research_report_sections WHERE report_id='liteon-report-20261113-draft' AND id NOT IN ('liteon-sec-1','liteon-sec-2','liteon-sec-3','liteon-sec-4','liteon-sec-5','liteon-sec-6','liteon-sec-7','liteon-sec-8','liteon-sec-9','liteon-sec-10','liteon-sec-11','liteon-report-20261113-draft-dashboard');
