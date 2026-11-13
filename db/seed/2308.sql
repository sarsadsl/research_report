PRAGMA foreign_keys = ON;

INSERT INTO research_companies
(id,ticker,market,name,slug,sector,industry,currency,description,status,created_at,updated_at)
VALUES
('delta-2308','2308','TW','台達電','delta-2308','電子零組件／電力管理','電源供應／資料中心電力基礎建設／液冷','TWD','高瓦數 PSU → ±400V／800V HVDC Power Rack → 液冷協同設計 → 系統級驗證與交貨 → 毛利／營益率 → OCF／FCF。2026Q3 營收創高但毛利率降至 34.08%，反證短期仍有供應瓶頸。','unlisted','2026-11-13','2026-11-13')
ON CONFLICT(id) DO UPDATE SET ticker=excluded.ticker,market=excluded.market,name=excluded.name,slug=excluded.slug,sector=excluded.sector,industry=excluded.industry,currency=excluded.currency,description=excluded.description,status=excluded.status,created_at=excluded.created_at,updated_at=excluded.updated_at;

INSERT INTO research_financial_actuals
(id,company_id,period,fiscal_year,quarter,revenue,gross_profit,gross_margin,operating_income,operating_margin,net_income,net_margin,eps,source_note,created_at)
VALUES
('delta-a-2025FY','delta-2308','2025FY',2025,NULL,554885.168,190156.558,34.27,83932.074,15.13,60108.399,10.83,23.14,'third_party_fact; sources=delta-src-financial','2026-11-13'),
('delta-a-2025Q4','delta-2308','2025Q4',2025,4,161613,55903,34.59,26418,16.35,17324,10.72,6.67,'third_party_fact; sources=delta-src-financial','2026-11-13'),
('delta-a-2026Q1','delta-2308','2026Q1',2026,1,159352.652,58960.871,37,28417.303,17.83,20555.591,12.9,7.91,'third_party_fact; sources=delta-src-financial','2026-11-13'),
('delta-a-2026Q2','delta-2308','2026Q2',2026,2,183256.08,65307.95,35.63,30570.042,16.68,25135.64,13.72,9.68,'third_party_fact; sources=delta-src-financial','2026-11-13'),
('delta-a-2026Q3','delta-2308','2026Q3',2026,3,197058.804,67154.634,34.08,32620.13,16.55,23494.595,11.92,9.04,'third_party_fact; sources=delta-src-financial','2026-11-13'),
('delta-a-2026YTD','delta-2308','2026YTD',2026,NULL,539667.536,191423.455,35.47,91607.475,16.97,69185.826,12.82,26.64,'third_party_fact; sources=delta-src-financial','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,fiscal_year=excluded.fiscal_year,quarter=excluded.quarter,revenue=excluded.revenue,gross_profit=excluded.gross_profit,gross_margin=excluded.gross_margin,operating_income=excluded.operating_income,operating_margin=excluded.operating_margin,net_income=excluded.net_income,net_margin=excluded.net_margin,eps=excluded.eps,source_note=excluded.source_note,created_at=excluded.created_at;

INSERT INTO research_monthly_revenue
(id,company_id,year,month,revenue,mom,yoy,created_at)
VALUES
('delta-m-01','delta-2308',2026,1,49675,-7.5,32.9,'2026-11-13'),
('delta-m-02','delta-2308',2026,2,49897,0.5,31,'2026-11-13'),
('delta-m-03','delta-2308',2026,3,59780,19.8,37.6,'2026-11-13'),
('delta-m-04','delta-2308',2026,4,58692,-1.8,43.9,'2026-11-13'),
('delta-m-05','delta-2308',2026,5,58962,0.5,43.6,'2026-11-13'),
('delta-m-06','delta-2308',2026,6,65603,11.3,55.4,'2026-11-13'),
('delta-m-07','delta-2308',2026,7,67073,2.2,47.8,'2026-11-13'),
('delta-m-08','delta-2308',2026,8,64586,-3.7,35,'2026-11-13'),
('delta-m-09','delta-2308',2026,9,65400,1.3,14.6,'2026-11-13'),
('delta-m-10','delta-2308',2026,10,74666,14.2,30.1,'2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,year=excluded.year,month=excluded.month,revenue=excluded.revenue,mom=excluded.mom,yoy=excluded.yoy,created_at=excluded.created_at;

INSERT INTO research_segments
(id,company_id,period,segment,revenue,share,is_estimate,created_at)
VALUES
('delta-seg-0','delta-2308','2026Q2','電源及零組件',NULL,53,0,'2026-11-13'),
('delta-seg-1','delta-2308','2026Q2','交通',NULL,5,0,'2026-11-13'),
('delta-seg-2','delta-2308','2026Q2','自動化',NULL,8,0,'2026-11-13'),
('delta-seg-3','delta-2308','2026Q2','基礎設施',NULL,34,0,'2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,segment=excluded.segment,revenue=excluded.revenue,share=excluded.share,is_estimate=excluded.is_estimate,created_at=excluded.created_at;

INSERT INTO research_forecasts
(id,company_id,fiscal_year,scenario,revenue,gross_margin,net_income,eps,opto_share,notes,created_at)
VALUES
('delta-f-2027-bear','delta-2308',2027,'bear',1057740,35,160816,61.9,NULL,'研究情境（非統計市場共識）；netIncome按EPS×假設約2598百萬股估算；忽略稅率及稀釋股數變動，僅供相對情境。','2026-11-13'),
('delta-f-2027-consensus','delta-2308',2027,'consensus',1190000,38,181860,70,NULL,'研究情境（非統計市場共識）；netIncome按EPS×假設約2598百萬股估算；忽略稅率及稀釋股數變動，僅供相對情境。','2026-11-13'),
('delta-f-2027-bull','delta-2308',2027,'bull',1289311,40.1,209866,80.78,NULL,'研究情境（非統計市場共識）；netIncome按EPS×假設約2598百萬股估算；忽略稅率及稀釋股數變動，僅供相對情境。','2026-11-13'),
('delta-f-2028-bear','delta-2308',2028,'bear',1240000,35,205242,79,NULL,'研究情境（非統計市場共識）；netIncome按EPS×假設約2598百萬股估算；忽略稅率及稀釋股數變動，僅供相對情境。','2026-11-13'),
('delta-f-2028-consensus','delta-2308',2028,'consensus',1550000,38,270192,104,NULL,'研究情境（非統計市場共識）；netIncome按EPS×假設約2598百萬股估算；忽略稅率及稀釋股數變動，僅供相對情境。','2026-11-13'),
('delta-f-2028-bull','delta-2308',2028,'bull',1800000,40,316956,122,NULL,'研究情境（非統計市場共識）；netIncome按EPS×假設約2598百萬股估算；忽略稅率及稀釋股數變動，僅供相對情境。','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,fiscal_year=excluded.fiscal_year,scenario=excluded.scenario,revenue=excluded.revenue,gross_margin=excluded.gross_margin,net_income=excluded.net_income,eps=excluded.eps,opto_share=excluded.opto_share,notes=excluded.notes,created_at=excluded.created_at;

INSERT INTO research_capacity_events
(id,company_id,event_date,label,equipment,technology,delta_units,base_units,expected_online_date,actual_online_date,status,notes)
VALUES
('delta-cap-0','delta-2308','2026-11-13','高瓦數 PSU / Power Shelf','AI伺服器電源 / 12–18kW級','high-power PSU',NULL,NULL,NULL,NULL,'production','2026Q4材料與良率、可認列出貨需核對'),
('delta-cap-1','delta-2308','2026-11-13','±400V HVDC','Power Rack / 高壓直流配電','±400 V DC',NULL,NULL,NULL,NULL,'qualification','元大預期2026Q4少量、2027商轉；非公司保證'),
('delta-cap-2','delta-2308','2026-11-13','800V Power Rack','DC/DC 與電力系統整合','800 V DC',NULL,NULL,NULL,NULL,'qualification','按CSP分別跟進樣機、認證、採購單、認列'),
('delta-cap-3','delta-2308','2026-11-13','液冷 CDUs','資料中心散熱與側櫃方案','liquid cooling',NULL,NULL,NULL,NULL,'production','元大預期2026Q2液冷單季出貨約250億元，後續追蹤ASP'),
('delta-cap-4','delta-2308','2026-11-13','SST / SOFC','固態變壓器與能源架構','SST',NULL,NULL,NULL,NULL,'research','長期技術選擇權，不計入已認列營收')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,event_date=excluded.event_date,label=excluded.label,equipment=excluded.equipment,technology=excluded.technology,delta_units=excluded.delta_units,base_units=excluded.base_units,expected_online_date=excluded.expected_online_date,actual_online_date=excluded.actual_online_date,status=excluded.status,notes=excluded.notes;

INSERT INTO research_catalysts
(id,company_id,title,impact,status,notes,updated_at)
VALUES
('delta-cat-0','delta-2308','4Q26高瓦數PSU交貨修復','high','watch','缺料／認證問題緩解、毛利回升','2026-11-13'),
('delta-cat-1','delta-2308','2027HVDC客戶量產與市占提升','high','watch','從樣機認證轉換到正式量產、實際收入','2026-11-13'),
('delta-cat-2','delta-2308','液冷與電源系統整包','high','watch','跨電力與散熱內容價值及毛利','2026-11-13'),
('delta-cat-3','delta-2308','2027新產能良率與固定成本攤提','medium','watch','若稼動率提升則營運槓桿改善','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_risks
(id,company_id,title,impact,probability,status,notes,updated_at)
VALUES
('delta-risk-0','delta-2308','2026Q3券商財測明顯落空','high','high','watch','09/30 元大 EPS10.78 實際9.04，估算差16.1%','2026-11-13'),
('delta-risk-1','delta-2308','PMIC／MOSFET短缺與新產品認證','high','high','watch','可能延後Power Rack放量與毛利修復','2026-11-13'),
('delta-risk-2','delta-2308','存貨跌價與成本轉嫁','high','medium','watch','價格上漲不等於毛利率已恢復','2026-11-13'),
('delta-risk-3','delta-2308','資本支出與應收存貨占用現金','high','medium','watch','後續以OCF與自由現金流驗證','2026-11-13'),
('delta-risk-4','delta-2308','2027年高EPS與高本益比雙重假設','high','high','watch','元大80.78較2026Q3年化值大幅提高','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,probability=excluded.probability,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_signal_rules
(id,company_id,metric,green_condition,yellow_condition,red_condition,weight,notes)
VALUES
('delta-rule-0','delta-2308','第三季毛利修復','2026Q4毛利率≥38%','34–38%','連續季度低於34%',1,'research_inference; sources=delta-src-model'),
('delta-rule-1','delta-2308','高瓦數PSU出貨','明確正式量產並揭露收入','交貨正常但客戶建置遞延','兩季延遲交貨',1,'research_inference; sources=delta-src-model'),
('delta-rule-2','delta-2308','2027 HVDC商轉','正式批量採購','樣機／客戶驗證','測試轉量產中止',1,'research_inference; sources=delta-src-model'),
('delta-rule-3','delta-2308','現金流與盈餘品質','OCF與淨利同步轉佳','OCF/非經常收益未完成核對','OCF長期落後淨利且存貨上升',1,'research_inference; sources=delta-src-model')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,metric=excluded.metric,green_condition=excluded.green_condition,yellow_condition=excluded.yellow_condition,red_condition=excluded.red_condition,weight=excluded.weight,notes=excluded.notes;

INSERT INTO research_signal_snapshots
(id,company_id,as_of_date,metric,status,value_text,source_type,notes)
VALUES
('delta-signal-0','delta-2308','2026-11-13','第三季毛利修復','yellow','2026Q3毛利34.08%，2026Q4未公布','research_inference','研究監測用非買賣建議；必要時等待下季公告驗證'),
('delta-signal-1','delta-2308','2026-11-13','高瓦數PSU出貨','yellow','2026Q3新平台驗證與長短料干擾','research_inference','研究監測用非買賣建議；必要時等待下季公告驗證'),
('delta-signal-2','delta-2308','2026-11-13','2027 HVDC商轉','yellow','元大預期2H27放量，仍屬券商估計','research_inference','研究監測用非買賣建議；必要時等待下季公告驗證'),
('delta-signal-3','delta-2308','2026-11-13','現金流與盈餘品質','yellow','EQ-01 L1尚未完成，NOT_RUN','research_inference','研究監測用非買賣建議；必要時等待下季公告驗證')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,as_of_date=excluded.as_of_date,metric=excluded.metric,status=excluded.status,value_text=excluded.value_text,source_type=excluded.source_type,notes=excluded.notes;

INSERT INTO research_sources
(id,company_id,source_type,source_group,source_title,published_date,url,file_name,notes,confidence)
VALUES
('delta-src-financial','delta-2308','third_party_fact','富聯網／公開資訊觀測站轉錄','台達電 IFRS 累計綜合損益表','2026-10-28','https://ww2.money-link.com.tw/TWStock/StockBasic.aspx?SymId=2308&TWMId=Basic_IIAM2',NULL,'網頁可查，原始法定科目仍需以MOPS財報複核; accessed=2026-11-13; periods=2025FY|2026Q1|2026Q2|2026Q3|2026YTD','medium'),
('delta-src-quarter','delta-2308','third_party_fact','中央社','2026Q3 每股盈餘9.04、營收與毛利率','2026-10-28','https://www.cna.com.tw/news/afe/202610280291.aspx',NULL,'網頁可查，原始法定科目仍需以MOPS財報複核; accessed=2026-11-13; periods=2026Q3|2026YTD','medium'),
('delta-src-monthly','delta-2308','third_party_fact','SASUGOD／公開資訊觀測站轉錄','2026年1–10月歷月營收','2026-11-13','https://report.sasugod.com/tw/2308',NULL,'網頁可查，原始法定科目仍需以MOPS財報複核; accessed=2026-11-13; periods=2026M01|2026M10','medium'),
('delta-src-yuanta-mar','delta-2308','market_consensus','元大投顧','台達電 2026/03/02 HVDC估2H26小量，2027F EPS61.90','2026-03-02',NULL,NULL,'私人研究資料，僅登錄摘要及文件日期；未公開券商PDF或分享私人Drive識別資料; accessed=2026-11-13; periods=2026F|2027F','medium'),
('delta-src-yuanta-jul','delta-2308','market_consensus','元大投顧','台達電 2026/07/31 2027F EPS79.56','2026-07-31',NULL,NULL,'私人研究資料，僅登錄摘要及文件日期；未公開券商PDF或分享私人Drive識別資料; accessed=2026-11-13; periods=2026F|2027F','medium'),
('delta-src-yuanta-sep','delta-2308','market_consensus','元大投顧','台達電 2026/09/30 2027F EPS80.78；2028F EPS121.6','2026-09-30',NULL,NULL,'私人研究資料，僅登錄摘要及文件日期；未公開券商PDF或分享私人Drive識別資料; accessed=2026-11-13; periods=2026F|2027F|2028F','medium'),
('delta-src-integrated','delta-2308','third_party_fact','狼友小站整理資料','台達電 V3 全量來源圖文研究 2026/11/05','2026-11-05',NULL,NULL,'私人研究資料，僅登錄摘要及文件日期；未公開券商PDF或分享私人Drive識別資料; accessed=2026-11-13; periods=2026F|2027F|2028F','medium'),
('delta-src-model','delta-2308','research_inference','研究報告追蹤','電源內容價值、量產門檻、bear/base/bull情境（編製者假設）','2026-11-13',NULL,NULL,'私人研究資料，僅登錄摘要及文件日期；未公開券商PDF或分享私人Drive識別資料; accessed=2026-11-13; periods=2026Q3|2027F|2028F','medium')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,source_type=excluded.source_type,source_group=excluded.source_group,source_title=excluded.source_title,published_date=excluded.published_date,url=excluded.url,file_name=excluded.file_name,notes=excluded.notes,confidence=excluded.confidence;

INSERT INTO research_reports
(id,company_id,title,slug,summary,thesis,status,version,html_path,pdf_path,created_at,updated_at,published_at)
VALUES
('delta-report-20261113-draft','delta-2308','台達電（2308）｜AI電力基建與盈餘品質標準Full Report（待審）','delta-2308','2026Q3營收1,970.59億元、EPS9.04、毛利率34.08%；2026/10月營收746.66億元。元大9月對Q3 EPS10.78估計高於實績，2027年80.78元模型待Q4交貨與毛利率驗證。','高瓦數 PSU → ±400V／800V HVDC Power Rack → 液冷協同設計 → 系統級驗證與交貨 → 毛利／營益率 → OCF／FCF。2026Q3 營收創高但毛利率降至 34.08%，反證短期仍有供應瓶頸。','draft','0.2.0','/research/reports/delta-2308.html',NULL,'2026-11-13','2026-11-13',NULL)
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,slug=excluded.slug,summary=excluded.summary,thesis=excluded.thesis,status=excluded.status,version=excluded.version,html_path=excluded.html_path,pdf_path=excluded.pdf_path,created_at=excluded.created_at,updated_at=excluded.updated_at,published_at=excluded.published_at;

INSERT INTO research_report_sections
(id,report_id,section_key,title,sort_order,content_json)
VALUES
('delta-sec-1','delta-report-20261113-draft','delta-sec-1','投資主張：已實現進度與反證',1,'{"type":"summary","payloadRefs":["thesis","signalSnapshots"],"showSources":true}'),
('delta-sec-2','delta-report-20261113-draft','delta-sec-2','財務摘要與2027–2028估計',2,'{"type":"kpi-grid","payloadRefs":["actuals","forecasts"],"showSources":true}'),
('delta-sec-3','delta-report-20261113-draft','delta-sec-3','財報與盈餘品質 EQ-01',3,'{"type":"financial-table","payloadRefs":["actuals","earningsQuality"],"showSources":true}'),
('delta-sec-4','delta-report-20261113-draft','delta-sec-4','2026年歷月營收與需求驗證',4,'{"type":"bar-chart","payloadRefs":["monthlyRevenue"],"showSources":true}'),
('delta-sec-5','delta-report-20261113-draft','delta-sec-5','營收與獲利率變化',5,'{"type":"line-chart","payloadRefs":["actuals"],"showSources":true}'),
('delta-sec-6','delta-report-20261113-draft','delta-sec-6','2027–2028研究情境與券商差異',6,'{"type":"scenario-table","payloadRefs":["forecasts"],"showSources":true}'),
('delta-sec-7','delta-report-20261113-draft','delta-sec-7','AI電力架構與商業化節點',7,'{"type":"capacity","payloadRefs":["capacity"],"showSources":true}'),
('delta-sec-8','delta-report-20261113-draft','delta-sec-8','投資燈號與升降級條件',8,'{"type":"signals","payloadRefs":["signalSnapshots"],"showSources":true}'),
('delta-sec-9','delta-report-20261113-draft','delta-sec-9','催化劑／下行風險',9,'{"type":"catalysts-risks","payloadRefs":["catalysts","risks"],"showSources":true}'),
('delta-sec-10','delta-report-20261113-draft','delta-sec-10','來源台帳與券商估計限制',10,'{"type":"sources","payloadRefs":["sources"],"showSources":true}'),
('delta-sec-11','delta-report-20261113-draft','delta-sec-11','總結：正式發布前的關鍵待驗證點',11,'{"type":"conclusion","payloadRefs":["thesis"],"showSources":true}'),
('delta-report-20261113-draft-dashboard','delta-report-20261113-draft','dashboard-config','Dashboard Config',0,'{"currentView":"2026Q3營收1,970.59億元、EPS9.04、毛利率34.08%；2026/10月營收746.66億元。元大9月對Q3 EPS10.78估計高於實績，2027年80.78元模型待Q4交貨與毛利率驗證。","currentThesis":"高瓦數 PSU → ±400V／800V HVDC Power Rack → 液冷協同設計 → 系統級驗證與交貨 → 毛利／營益率 → OCF／FCF。2026Q3 營收創高但毛利率降至 34.08%，反證短期仍有供應瓶頸。","verificationChain":["第三季毛利修復","高瓦數PSU出貨","2027 HVDC商轉","現金流與盈餘品質"],"conclusion":"黃燈：AI電源與液冷具中期長期競爭優勢，惟 2026Q3 EPS 較元大9月估計低約16.1%、毛利率低2.22個百分點；2027元大80.78元、GS75.23元與國泰62.28元估計不能視為單一共識。L1業外與OCF、應收存貨未全部核對，正式版暫不發布。","forecastScenario":"consensus","headlineForecastYears":[2027,2028],"focusMetric":{"field":"grossMargin","label":"毛利率"},"monthlyRevenue":{"focusYear":2026,"cumulativeThroughMonth":10,"unitDivisor":100,"unitLabel":"億元"},"cagrCards":[{"field":"revenue","label":"2025A至2027F營收成長（研究情境）","baseYear":2025,"targetYear":2027,"baseValue":554885.168,"years":2},{"field":"eps","label":"2025A至2027F EPS成長（研究情境）","baseYear":2025,"targetYear":2027,"baseValue":23.14,"years":2}],"estimateNote":"2027E 具名券商：元大09/30 EPS80.78元、營收12,893.11億元、目標價2430；GS07/30 EPS75.23；國泰10/16 EPS62.28；富邦06/12 EPS66.45。GS的2028E EPS172.30、元大09/30 2028E EPS121.6，均非市場共識。以下 bear/consensus/bull 為研究情境而非券商統計共識。2026Q3 元大09/30 預估 EPS10.78 vs 公布9.04；股價、目標價採各報告當時日期，不得當成即時價格。"}')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,section_key=excluded.section_key,title=excluded.title,sort_order=excluded.sort_order,content_json=excluded.content_json;

INSERT INTO research_earnings_quality
(id,report_id,company_id,as_of_date,review_status,l2_status,payload_json,payload_hash,updated_at)
VALUES
('delta-report-20261113-draft-eq01','delta-report-20261113-draft','delta-2308','2026-11-13','NOT_RUN','NOT_RUN','{"standard":"EQ-01-v1","reviewStatus":"NOT_RUN","reviewer":"待研究審閱人正式簽核","reviewedAt":"2026-11-13","coverageNote":"已有公開損益科目基本橋接；歷史2023/2024明細、業外按附註分類、OCF/FCF及每股調整未完整；不得以資料不足冒稱PASS。","periods":[{"id":"delta-eq-2023FY","period":"2023FY","periodType":"annual","revenue":null,"operatingIncome":null,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":12.86,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["delta-src-financial"],"claimIds":["delta-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"},{"id":"delta-eq-2024FY","period":"2024FY","periodType":"annual","revenue":421148,"operatingIncome":47652,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":35229,"reportedEps":13.56,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["delta-src-financial"],"claimIds":["delta-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"},{"id":"delta-eq-2025FY","period":"2025FY","periodType":"annual","revenue":554885.168,"operatingIncome":83932.074,"nonOperatingNet":3933.922,"pretaxIncome":87865.996,"incomeTax":19929.688,"netIncomeAttributable":60108.399,"reportedEps":23.14,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["delta-src-financial"],"claimIds":["delta-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"},{"id":"delta-eq-2025Q4","period":"2025Q4","periodType":"quarter","revenue":161613,"operatingIncome":26418,"nonOperatingNet":-770,"pretaxIncome":25649,"incomeTax":6011,"netIncomeAttributable":17324,"reportedEps":6.67,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["delta-src-financial"],"claimIds":["delta-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"},{"id":"delta-eq-2026Q1","period":"2026Q1","periodType":"quarter","revenue":159352.652,"operatingIncome":28417.303,"nonOperatingNet":2675.52,"pretaxIncome":31092.823,"incomeTax":7258.274,"netIncomeAttributable":20555.591,"reportedEps":7.91,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["delta-src-financial"],"claimIds":["delta-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"},{"id":"delta-eq-2026Q2","period":"2026Q2","periodType":"quarter","revenue":183256.08,"operatingIncome":30570.042,"nonOperatingNet":4429.572,"pretaxIncome":34999.614,"incomeTax":7830.563,"netIncomeAttributable":25135.64,"reportedEps":9.68,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["delta-src-financial"],"claimIds":["delta-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"},{"id":"delta-eq-2026Q3","period":"2026Q3","periodType":"quarter","revenue":197058.804,"operatingIncome":32620.13,"nonOperatingNet":1046.363,"pretaxIncome":33666.493,"incomeTax":7608.253,"netIncomeAttributable":23494.595,"reportedEps":9.04,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["delta-src-financial"],"claimIds":["delta-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"},{"id":"delta-eq-2026YTD","period":"2026YTD","periodType":"ytd","revenue":539667.536,"operatingIncome":91607.475,"nonOperatingNet":8151.455,"pretaxIncome":99758.93,"incomeTax":22697.09,"netIncomeAttributable":69185.826,"reportedEps":26.64,"currency":"TWD","scale":"million","normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":318197.309,"adjustments":[],"sourceIds":["delta-src-financial"],"claimIds":["delta-claim-quality"],"normalizationNote":"業外細項、稅後調整及非控制權益尚未達EQ-01正式查核，正常化EPS保持null。報表金額以百萬元；加權平均股數未經原始註釋確認，不以股本猜測。"}],"qualitativeFlags":[],"l2":{"status":"NOT_RUN","summary":"尚未完成近三年特殊損益／現金流審核，未確認L2必要性不得宣告無異常。","sourceIds":["delta-src-financial","delta-src-model"],"claimIds":["delta-claim-quality"]},"valuation":{"epsBasis":"reported","doubleCountChecked":false,"prospectiveModelOnly":true,"notes":"預測EPS僅作研究情境，不把尚未穿透的歷史reported EPS視為normalised EPS。沒有完成重複扣除檢查及OCF驗證。"},"notes":"2026Q2金融資產評價、信用減損及2025Q4資產減損待附註級逐項核對。已掌握損益表總數但三年全部調整及OCF未完成，不計算正常化EPS；不宣稱EQ-01 PASS。"}','f58ac4cdbaecd1da8d5ee97438c1094a7473a9ef9e382030cdaf89906a3a7a52','2026-11-13')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,company_id=excluded.company_id,as_of_date=excluded.as_of_date,review_status=excluded.review_status,l2_status=excluded.l2_status,payload_json=excluded.payload_json,payload_hash=excluded.payload_hash,updated_at=excluded.updated_at;


-- Remove stale rows only after all canonical rows have been upserted.

DELETE FROM research_financial_actuals WHERE company_id='delta-2308' AND id NOT IN ('delta-a-2025FY','delta-a-2025Q4','delta-a-2026Q1','delta-a-2026Q2','delta-a-2026Q3','delta-a-2026YTD');

DELETE FROM research_monthly_revenue WHERE company_id='delta-2308' AND id NOT IN ('delta-m-01','delta-m-02','delta-m-03','delta-m-04','delta-m-05','delta-m-06','delta-m-07','delta-m-08','delta-m-09','delta-m-10');

DELETE FROM research_segments WHERE company_id='delta-2308' AND id NOT IN ('delta-seg-0','delta-seg-1','delta-seg-2','delta-seg-3');

DELETE FROM research_forecasts WHERE company_id='delta-2308' AND id NOT IN ('delta-f-2027-bear','delta-f-2027-consensus','delta-f-2027-bull','delta-f-2028-bear','delta-f-2028-consensus','delta-f-2028-bull');

DELETE FROM research_capacity_events WHERE company_id='delta-2308' AND id NOT IN ('delta-cap-0','delta-cap-1','delta-cap-2','delta-cap-3','delta-cap-4');

DELETE FROM research_catalysts WHERE company_id='delta-2308' AND id NOT IN ('delta-cat-0','delta-cat-1','delta-cat-2','delta-cat-3');

DELETE FROM research_risks WHERE company_id='delta-2308' AND id NOT IN ('delta-risk-0','delta-risk-1','delta-risk-2','delta-risk-3','delta-risk-4');

DELETE FROM research_signal_rules WHERE company_id='delta-2308' AND id NOT IN ('delta-rule-0','delta-rule-1','delta-rule-2','delta-rule-3');

DELETE FROM research_signal_snapshots WHERE company_id='delta-2308' AND id NOT IN ('delta-signal-0','delta-signal-1','delta-signal-2','delta-signal-3');

DELETE FROM research_sources WHERE company_id='delta-2308' AND id NOT IN ('delta-src-financial','delta-src-quarter','delta-src-monthly','delta-src-yuanta-mar','delta-src-yuanta-jul','delta-src-yuanta-sep','delta-src-integrated','delta-src-model');

DELETE FROM research_reports WHERE company_id='delta-2308' AND id NOT IN ('delta-report-20261113-draft');

DELETE FROM research_report_sections WHERE report_id='delta-report-20261113-draft' AND id NOT IN ('delta-sec-1','delta-sec-2','delta-sec-3','delta-sec-4','delta-sec-5','delta-sec-6','delta-sec-7','delta-sec-8','delta-sec-9','delta-sec-10','delta-sec-11','delta-report-20261113-draft-dashboard');
