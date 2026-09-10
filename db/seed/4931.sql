PRAGMA foreign_keys = ON;

INSERT INTO research_companies
(id,ticker,market,name,slug,sector,industry,currency,description,status,created_at,updated_at)
VALUES
('stl-4931','4931','TPEX','新盛力科技','stl-4931','電腦及週邊設備','鋰電池模組／電池備援系統','TWD','鋰離子電池模組設計與製造商，應用涵蓋資料中心與伺服器 BBU、電動工具及輕型電動交通工具。','active','2026-08-31','2026-08-31')
ON CONFLICT(id) DO UPDATE SET ticker=excluded.ticker,market=excluded.market,name=excluded.name,slug=excluded.slug,sector=excluded.sector,industry=excluded.industry,currency=excluded.currency,description=excluded.description,status=excluded.status,created_at=excluded.created_at,updated_at=excluded.updated_at;

INSERT INTO research_financial_actuals
(id,company_id,period,fiscal_year,quarter,revenue,gross_profit,gross_margin,operating_income,operating_margin,net_income,net_margin,eps,source_note,created_at)
VALUES
('stl-2025fy','stl-4931','2025FY',2025,NULL,2451.377,534.624,21.81,248.684,10.14,203.562,8.3,3.13,'official; sources=stl-src-annual','2026-08-31'),
('stl-2026q1','stl-4931','2026Q1',2026,1,791.378,174.763,22.08,98.188,12.41,97.094,12.27,1.48,'official; sources=stl-src-q1','2026-08-31'),
('stl-2026q2','stl-4931','2026Q2',2026,2,1113.26,259.71,23.33,167.774,15.07,144.542,12.98,2.2,'official; sources=stl-src-q2','2026-08-31')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,fiscal_year=excluded.fiscal_year,quarter=excluded.quarter,revenue=excluded.revenue,gross_profit=excluded.gross_profit,gross_margin=excluded.gross_margin,operating_income=excluded.operating_income,operating_margin=excluded.operating_margin,net_income=excluded.net_income,net_margin=excluded.net_margin,eps=excluded.eps,source_note=excluded.source_note,created_at=excluded.created_at;

INSERT INTO research_monthly_revenue
(id,company_id,year,month,revenue,mom,yoy,created_at)
VALUES
('stl-2601','stl-4931',2026,1,289.976,18.66,42.29,'2026-08-31'),
('stl-2602','stl-4931',2026,2,218.293,-24.72,-10.8,'2026-08-31'),
('stl-2603','stl-4931',2026,3,283.109,29.69,36.12,'2026-08-31'),
('stl-2604','stl-4931',2026,4,302.908,6.99,97.38,'2026-08-31'),
('stl-2605','stl-4931',2026,5,415.943,37.32,178.64,'2026-08-31'),
('stl-2606','stl-4931',2026,6,394.409,-5.18,145.09,'2026-08-31'),
('stl-2607','stl-4931',2026,7,449.435,13.95,159.52,'2026-08-31')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,year=excluded.year,month=excluded.month,revenue=excluded.revenue,mom=excluded.mom,yoy=excluded.yoy,created_at=excluded.created_at;

INSERT INTO research_segments
(id,company_id,period,segment,revenue,share,is_estimate,created_at)
VALUES
('stl-app-bbu','stl-4931','2025FY','電源備援系統／BBU',NULL,NULL,0,'2026-08-31'),
('stl-app-tools','stl-4931','2025FY','電動手工具',NULL,NULL,0,'2026-08-31'),
('stl-app-mobility','stl-4931','2025FY','輕型電動交通工具',NULL,NULL,0,'2026-08-31')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,segment=excluded.segment,revenue=excluded.revenue,share=excluded.share,is_estimate=excluded.is_estimate,created_at=excluded.created_at;

INSERT INTO research_forecasts
(id,company_id,fiscal_year,scenario,revenue,gross_margin,net_income,eps,opto_share,notes,created_at)
VALUES
('stl-2026-bear','stl-4931',2026,'bear',4004.1,19,300.3,4.58,NULL,'1-7M 實績加上 8-12 月平均月營收 3.3 億元；淨利率 7.5%。','2026-08-31'),
('stl-2026-base','stl-4931',2026,'base',4354.1,22,457.2,6.97,NULL,'1-7M 實績加上 8-12 月平均月營收 4.0 億元；淨利率 10.5%。','2026-08-31'),
('stl-2026-bull','stl-4931',2026,'bull',4704.1,24,588,8.97,NULL,'1-7M 實績加上 8-12 月平均月營收 4.7 億元；淨利率 12.5%。','2026-08-31'),
('stl-2027-bear','stl-4931',2027,'bear',4404.5,18,308.3,4.7,NULL,'2026 bear 營收再增 10%，淨利率 7%；反映價格與週轉壓力。','2026-08-31'),
('stl-2027-base','stl-4931',2027,'base',5442.6,22.5,571.5,8.72,NULL,'2026 base 營收再增 25%，淨利率維持 10.5%；不假設未公開新客戶。','2026-08-31'),
('stl-2027-bull','stl-4931',2027,'bull',6585.7,25,856.1,13.06,NULL,'2026 bull 營收再增 40%，淨利率 13%；需高功率 BBU 放量與良率／週轉同步改善。','2026-08-31')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,fiscal_year=excluded.fiscal_year,scenario=excluded.scenario,revenue=excluded.revenue,gross_margin=excluded.gross_margin,net_income=excluded.net_income,eps=excluded.eps,opto_share=excluded.opto_share,notes=excluded.notes,created_at=excluded.created_at;

INSERT INTO research_capacity_events
(id,company_id,event_date,label,equipment,technology,delta_units,base_units,expected_online_date,actual_online_date,status,notes)
VALUES
('stl-cap-product','stl-4931','2026-08','公開 BBU 產品電氣範圍','BESS／UPS／BBU','6V-300V、12W-25kW',NULL,NULL,NULL,NULL,'published capability','是產品能力範圍，不是特定客戶量產資格。'),
('stl-cap-ctdp','stl-4931','2025-12','取得 UL 1973 CTDP','內部實驗室','UL 1973 測試資料計畫',NULL,NULL,NULL,NULL,'qualified laboratory','證明測試能力、品質系統與資料可靠性；不等同 CSP 認證。'),
('stl-cap-ppe','stl-4931','2026-06','不動產、廠房及設備增加','生產與測試資產','帳面金額 2.209 億元',NULL,NULL,NULL,NULL,'ramping evidence','較 2025 年底增加 70.6%，支持擴張跡象，但未揭露對應產線數。'),
('stl-cap-rd','stl-4931','2025-FY','研發投入與 BBU 開發','研發資源','研發費用 0.935 億元／營收 3.81%',NULL,NULL,NULL,NULL,'actual','年報列示 AI 算力中心、伺服器機架與主板電源備援模組。')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,event_date=excluded.event_date,label=excluded.label,equipment=excluded.equipment,technology=excluded.technology,delta_units=excluded.delta_units,base_units=excluded.base_units,expected_online_date=excluded.expected_online_date,actual_online_date=excluded.actual_online_date,status=excluded.status,notes=excluded.notes;

INSERT INTO research_catalysts
(id,company_id,title,impact,status,notes,updated_at)
VALUES
('stl-cat-revenue','stl-4931','月營收站穩 4 億元以上','high','active','5 月與 7 月已超過 4 億元，需觀察後續連續性。','2026-08-31'),
('stl-cat-margin','stl-4931','BBU 組合帶動毛利率改善','high','active','公司年報將 2025 毛利增加歸因於 AI 算力中心備援系統等高毛利產品銷量增加。','2026-08-31'),
('stl-cat-product','stl-4931','12W-25kW 公開產品能力轉為出貨','high','watch','需要營收、毛利或公司公開量產資訊交叉確認。','2026-08-31'),
('stl-cat-cash','stl-4931','獲利成長轉為營業現金流','medium','watch','H1 營業現金流為 0.47 億元，低於稅後淨利 2.42 億元。','2026-08-31')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_risks
(id,company_id,title,impact,probability,status,notes,updated_at)
VALUES
('stl-risk-customer','stl-4931','客戶集中度高','high','high','active','2025 年最大匿名客戶占 55.12%，前兩大合計占 69.61%。','2026-08-31'),
('stl-risk-working-capital','stl-4931','應收與存貨快速增加','high','medium','active','2026H1 應收帳款與存貨較 2025 年底分別增加 62.7% 與 52.4%。','2026-08-31'),
('stl-risk-qualification','stl-4931','把產品規格誤當客戶資格','high','medium','watch','公開資料未確認特定 CSP、20/25kW 或 400/800V HVDC 客戶量產資格。','2026-08-31'),
('stl-risk-funding','stl-4931','擴張伴隨融資與負債增加','medium','medium','active','2026H1 發行公司債 6.54 億元，負債比由 2025 年底 41% 升至 57%。','2026-08-31')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,probability=excluded.probability,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_signal_rules
(id,company_id,metric,green_condition,yellow_condition,red_condition,weight,notes)
VALUES
('stl-rule-revenue','stl-4931','月營收','連續維持 >= 4.0 億元','3.3-4.0 億元','< 3.3 億元且連續下滑',1.4,'research_inference; sources=stl-src-investor'),
('stl-rule-gm','stl-4931','毛利率','>= 22%','19-22%','< 19%',1.3,'research_inference; sources=stl-src-q2,stl-src-annual'),
('stl-rule-cash','stl-4931','現金轉換','營業現金流接近或高於淨利','正值但明顯低於淨利','連續為負',1.2,'research_inference; sources=stl-src-q2'),
('stl-rule-working-capital','stl-4931','營運資金','應收與存貨增速不高於營收','短期高於營收、週轉尚可','連續惡化並侵蝕現金',1.2,'research_inference; sources=stl-src-q2'),
('stl-rule-qualification','stl-4931','客戶資格','公司或客戶公開確認量產','產品／實驗室能力已具備','認證或量產延遲',1.1,'research_inference; sources=stl-src-product,stl-src-ctdp'),
('stl-rule-concentration','stl-4931','客戶集中','最大客戶占比顯著下降','有新增客戶但集中仍高','最大客戶持續 > 50%',1.2,'research_inference; sources=stl-src-annual')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,metric=excluded.metric,green_condition=excluded.green_condition,yellow_condition=excluded.yellow_condition,red_condition=excluded.red_condition,weight=excluded.weight,notes=excluded.notes;

INSERT INTO research_signal_snapshots
(id,company_id,as_of_date,metric,status,value_text,source_type,notes)
VALUES
('stl-sig-revenue','stl-4931','2026-08-31','月營收','green','2026/07 4.494 億元','official','1-7M 累計 23.54 億元、年增 82.01%。'),
('stl-sig-gm','stl-4931','2026-08-31','毛利率','green','2026Q2 23.33%','official','高於 2025FY 21.81%，仍需檢查產品組合持續性。'),
('stl-sig-cash','stl-4931','2026-08-31','現金轉換','yellow','H1 OCF 0.47 億元','official','正值但明顯低於 H1 淨利 2.42 億元。'),
('stl-sig-working-capital','stl-4931','2026-08-31','營運資金','yellow','AR 9.10 億／存貨 8.59 億','official','兩者均較 2025 年底顯著增加。'),
('stl-sig-qualification','stl-4931','2026-08-31','客戶資格','yellow','25kW／300V 能力；CTDP 已取得','research_inference','能力可驗證，但特定 CSP／HVDC 量產資格未公開確認。'),
('stl-sig-concentration','stl-4931','2026-08-31','客戶集中','red','2025 最大客戶 55.12%','official','前兩大匿名客戶合計 69.61%。')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,as_of_date=excluded.as_of_date,metric=excluded.metric,status=excluded.status,value_text=excluded.value_text,source_type=excluded.source_type,notes=excluded.notes;

INSERT INTO research_sources
(id,company_id,source_type,source_group,source_title,published_date,url,file_name,notes,confidence)
VALUES
('stl-src-annual','stl-4931','official','新盛力科技','2025 年報',NULL,'https://www.stl-tech.com/upload/ckeditor/files/2025AnualReport_zh.pdf','sources/2025-AnnualReport-zh.pdf','財務、產品應用、研發、客戶集中與風險揭露。; accessed=2026-09-02; periods=2025FY','high'),
('stl-src-q1','stl-4931','official','新盛力科技','2026Q1 合併財務報告',NULL,'https://www.stl-tech.com/upload/ckeditor/files/FinancialStatements-2026Q1.pdf','sources/FinancialStatements-2026Q1.pdf','第一季實績。; accessed=2026-09-02; periods=2026Q1','high'),
('stl-src-q2','stl-4931','official','新盛力科技','2026Q2 合併財務報告',NULL,'https://www.stl-tech.com/upload/ckeditor/files/FinancialStatements-2026Q2.pdf','sources/FinancialStatements-2026Q2.pdf','第二季與上半年實績、資產負債及現金流。; accessed=2026-09-02; periods=2026Q2|2026H1','high'),
('stl-src-investor','stl-4931','official','新盛力科技','投資人專區與每月營收',NULL,'https://www.stl-tech.com/investor.asp',NULL,'公司基本資料、月營收與公開文件索引。; accessed=2026-09-02; periods=2025/01-2026/07','high'),
('stl-src-product','stl-4931','official','新盛力科技','儲能／電池備援系統產品規格',NULL,'https://www.stl-tech.com/product_info.asp?id=89',NULL,'公開產品範圍為 6V-300V、12W-25kW；不推論特定客戶資格。; accessed=2026-09-02; periods=current product capability','high'),
('stl-src-ctdp','stl-4931','official','新盛力科技','UL 1973 CTDP 資格公告','2025-12-05','https://www.stl-tech.com/news_info.asp?id=46',NULL,'實驗室測試能力、品質系統與資料可靠性資格。; accessed=2026-09-02; periods=2025','high'),
('stl-src-ir','stl-4931','official','新盛力科技','2025 法人說明會公開簡報','2025-11-27','https://www.stl-tech.com/upload/ckeditor/files/2025-EarningsCallMaterial.pdf','sources/2025-EarningsCallMaterial.pdf','公開簡報，不是券商研究報告。; accessed=2026-09-02; periods=2024Q1-2025Q3|outlook','high')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,source_type=excluded.source_type,source_group=excluded.source_group,source_title=excluded.source_title,published_date=excluded.published_date,url=excluded.url,file_name=excluded.file_name,notes=excluded.notes,confidence=excluded.confidence;

INSERT INTO research_reports
(id,company_id,title,slug,summary,thesis,status,version,html_path,pdf_path,created_at,updated_at,published_at)
VALUES
('stl-report-v1','stl-4931','新盛力 4931｜BBU 供應鏈公開資料深度研究','stl-4931','以官方財報、年報、月營收、產品規格與公開認證為基礎，區分已實現成長、產品能力與尚未公開確認的客戶資格。','AI 資料中心 BBU 需求 → 出貨與月營收 → 毛利率 → 營運資金 → 現金轉換 → EPS；產品規格與 UL 實驗室資格不等於特定 CSP 量產認證。','published','1.0','/research/reports/stl-4931.html',NULL,'2026-08-31','2026-08-31','2026-09-02')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,slug=excluded.slug,summary=excluded.summary,thesis=excluded.thesis,status=excluded.status,version=excluded.version,html_path=excluded.html_path,pdf_path=excluded.pdf_path,created_at=excluded.created_at,updated_at=excluded.updated_at,published_at=excluded.published_at;

INSERT INTO research_report_sections
(id,report_id,section_key,title,sort_order,content_json)
VALUES
('stl-sec-summary','stl-report-v1','stl-sec-summary','投資摘要與證據邊界',1,'{"type":"summary","payloadRefs":["thesis","signalSnapshots"],"showSources":true}'),
('stl-sec-actuals','stl-report-v1','stl-sec-actuals','已實現財務：獲利加速',2,'{"type":"financial-table","payloadRefs":["actuals"],"showSources":true}'),
('stl-sec-revenue','stl-report-v1','stl-sec-revenue','2026 月營收：BBU 放量代理指標',3,'{"type":"bar-chart","payloadRefs":["monthlyRevenue"],"showSources":true}'),
('stl-sec-business','stl-report-v1','stl-sec-business','業務組合：官方只揭露應用類別',4,'{"type":"financial-table","payloadRefs":["segments"],"showSources":true}'),
('stl-sec-scenario','stl-report-v1','stl-sec-scenario','2026F／2027F 公開資料情境',5,'{"type":"scenario-table","payloadRefs":["forecasts"],"showSources":true}'),
('stl-sec-capability','stl-report-v1','stl-sec-capability','公開能力、研發與擴張跡象',6,'{"type":"capacity","payloadRefs":["capacity"],"showSources":true}'),
('stl-sec-signals','stl-report-v1','stl-sec-signals','紅綠燈：營運強、風險也升高',7,'{"type":"signals","payloadRefs":["signalRules","signalSnapshots"],"showSources":true}'),
('stl-sec-risks','stl-report-v1','stl-sec-risks','催化劑與關鍵風險',8,'{"type":"catalysts-risks","payloadRefs":["catalysts","risks"],"showSources":true}'),
('stl-sec-sources','stl-report-v1','stl-sec-sources','公開資料來源與排除原則',9,'{"type":"sources","payloadRefs":["sources"],"showSources":true}'),
('stl-sec-conclusion','stl-report-v1','stl-sec-conclusion','結論與後續驗證清單',10,'{"type":"conclusion","payloadRefs":["thesis"],"showSources":true}'),
('stl-report-v1-dashboard','stl-report-v1','dashboard-config','Dashboard Config',0,'{"currentView":"2026H1 營收年增 70%、毛利率 22.8%、EPS 3.69 元，7 月營收續創本研究期高點；但前兩大客戶在 2025 年合計占 69.61%，且應收帳款、存貨、廠房設備與應付帳款同步擴大。","verificationChain":["月營收是否維持 4 億元以上","毛利率是否維持 22% 以上","應收與存貨週轉是否穩定","營業現金流是否跟上獲利","是否有公開可核對的新客戶資格","EPS 是否持續轉化"],"conclusion":"新盛力已出現明確 BBU 放量與獲利改善，但現階段最重要的不是推測客戶名稱，而是驗證營收、毛利率、週轉與公開資格是否連續兌現。","forecastScenario":"base","headlineForecastYears":[2026,2027],"focusMetric":{"field":"grossMargin","label":"毛利率"},"monthlyRevenue":{"focusYear":2026,"cumulativeThroughMonth":7,"unitDivisor":100,"unitLabel":"億"},"cagrCards":[{"field":"revenue","label":"2025A → 2027F Revenue CAGR","baseYear":2025,"targetYear":2027,"baseValue":2451.377,"years":2},{"field":"eps","label":"2025A → 2027F EPS CAGR","baseYear":2025,"targetYear":2027,"baseValue":3.13,"years":2}],"estimateNote":"* 2026F／2027F 為僅依公開實績建立的研究情境，不含任何券商或法人預測；產品規格與 UL CTDP 不代表特定 CSP 量產資格。"}')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,section_key=excluded.section_key,title=excluded.title,sort_order=excluded.sort_order,content_json=excluded.content_json;


-- Remove stale rows only after all canonical rows have been upserted.

DELETE FROM research_financial_actuals WHERE company_id='stl-4931' AND id NOT IN ('stl-2025fy','stl-2026q1','stl-2026q2');

DELETE FROM research_monthly_revenue WHERE company_id='stl-4931' AND id NOT IN ('stl-2601','stl-2602','stl-2603','stl-2604','stl-2605','stl-2606','stl-2607');

DELETE FROM research_segments WHERE company_id='stl-4931' AND id NOT IN ('stl-app-bbu','stl-app-tools','stl-app-mobility');

DELETE FROM research_forecasts WHERE company_id='stl-4931' AND id NOT IN ('stl-2026-bear','stl-2026-base','stl-2026-bull','stl-2027-bear','stl-2027-base','stl-2027-bull');

DELETE FROM research_capacity_events WHERE company_id='stl-4931' AND id NOT IN ('stl-cap-product','stl-cap-ctdp','stl-cap-ppe','stl-cap-rd');

DELETE FROM research_catalysts WHERE company_id='stl-4931' AND id NOT IN ('stl-cat-revenue','stl-cat-margin','stl-cat-product','stl-cat-cash');

DELETE FROM research_risks WHERE company_id='stl-4931' AND id NOT IN ('stl-risk-customer','stl-risk-working-capital','stl-risk-qualification','stl-risk-funding');

DELETE FROM research_signal_rules WHERE company_id='stl-4931' AND id NOT IN ('stl-rule-revenue','stl-rule-gm','stl-rule-cash','stl-rule-working-capital','stl-rule-qualification','stl-rule-concentration');

DELETE FROM research_signal_snapshots WHERE company_id='stl-4931' AND id NOT IN ('stl-sig-revenue','stl-sig-gm','stl-sig-cash','stl-sig-working-capital','stl-sig-qualification','stl-sig-concentration');

DELETE FROM research_sources WHERE company_id='stl-4931' AND id NOT IN ('stl-src-annual','stl-src-q1','stl-src-q2','stl-src-investor','stl-src-product','stl-src-ctdp','stl-src-ir');

DELETE FROM research_reports WHERE company_id='stl-4931' AND id NOT IN ('stl-report-v1');

DELETE FROM research_report_sections WHERE report_id='stl-report-v1' AND id NOT IN ('stl-sec-summary','stl-sec-actuals','stl-sec-revenue','stl-sec-business','stl-sec-scenario','stl-sec-capability','stl-sec-signals','stl-sec-risks','stl-sec-sources','stl-sec-conclusion','stl-report-v1-dashboard');
