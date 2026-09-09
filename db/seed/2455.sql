PRAGMA foreign_keys = ON;

INSERT INTO research_companies
(id,ticker,market,name,slug,sector,industry,currency,description,status,created_at,updated_at)
VALUES
('vpec-2455','2455','TW','全新光電','vpec-2455','半導體','化合物半導體 / 光通訊','TWD','聚焦 III-V 化合物半導體磊晶，研究主軸為 AI 光通訊帶動光電子占比提升。','active','2026-09-04','2026-09-04')
ON CONFLICT(id) DO UPDATE SET ticker=excluded.ticker,market=excluded.market,name=excluded.name,slug=excluded.slug,sector=excluded.sector,industry=excluded.industry,currency=excluded.currency,description=excluded.description,status=excluded.status,created_at=excluded.created_at,updated_at=excluded.updated_at;

INSERT INTO research_financial_actuals
(id,company_id,period,fiscal_year,quarter,revenue,gross_profit,gross_margin,operating_income,operating_margin,net_income,net_margin,eps,source_note,created_at)
VALUES
('vpec-25q4','vpec-2455','2025Q4',2025,4,959.6,357.6,37.27,209,21.78,194,20.22,1.05,'official; sources=vpec-src-official','2026-09-04'),
('vpec-26q1','vpec-2455','2026Q1',2026,1,959.3,365.4,38.09,226.7,23.63,195.1,20.34,1.06,'official; sources=vpec-src-official','2026-09-04'),
('vpec-26q2','vpec-2455','2026Q2',2026,2,965.4,372.7,38.61,223.8,23.18,213.6,22.13,1.15,'official; sources=vpec-src-official','2026-09-04')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,fiscal_year=excluded.fiscal_year,quarter=excluded.quarter,revenue=excluded.revenue,gross_profit=excluded.gross_profit,gross_margin=excluded.gross_margin,operating_income=excluded.operating_income,operating_margin=excluded.operating_margin,net_income=excluded.net_income,net_margin=excluded.net_margin,eps=excluded.eps,source_note=excluded.source_note,created_at=excluded.created_at;

INSERT INTO research_monthly_revenue
(id,company_id,year,month,revenue,mom,yoy,created_at)
VALUES
('vpec-2601','vpec-2455',2026,1,340.3,6.6,30.2,'2026-09-04'),
('vpec-2602','vpec-2455',2026,2,307.7,-9.57,15.9,'2026-09-04'),
('vpec-2603','vpec-2455',2026,3,311.2,1.13,16.6,'2026-09-04'),
('vpec-2604','vpec-2455',2026,4,318.6,2.36,37.7,'2026-09-04'),
('vpec-2605','vpec-2455',2026,5,320.8,0.68,46.5,'2026-09-04'),
('vpec-2606','vpec-2455',2026,6,326,1.62,23.6,'2026-09-04'),
('vpec-2607','vpec-2455',2026,7,422.1,29.5,45.1,'2026-09-04'),
('vpec-2608','vpec-2455',2026,8,470.904,11.56,71.16,'2026-09-04')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,year=excluded.year,month=excluded.month,revenue=excluded.revenue,mom=excluded.mom,yoy=excluded.yoy,created_at=excluded.created_at;

INSERT INTO research_segments
(id,company_id,period,segment,revenue,share,is_estimate,created_at)
VALUES
('vpec-25q4-micro','vpec-2455','2025Q4','微電子',678.4,70.7,0,'2026-09-04'),
('vpec-25q4-opto','vpec-2455','2025Q4','光電子',281.2,29.3,0,'2026-09-04'),
('vpec-26q1-micro','vpec-2455','2026Q1','微電子',718,74.9,0,'2026-09-04'),
('vpec-26q1-opto','vpec-2455','2026Q1','光電子',241.3,25.1,0,'2026-09-04'),
('vpec-26q2-micro','vpec-2455','2026Q2','微電子',703.7,72.9,0,'2026-09-04'),
('vpec-26q2-opto','vpec-2455','2026Q2','光電子',261.7,27.1,0,'2026-09-04'),
('vpec-2607-opto','vpec-2455','2026/07','光電子',169.3,40.1,1,'2026-09-04'),
('vpec-2608-opto','vpec-2455','2026/08','光電子',217.1,46.1,1,'2026-09-04')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,segment=excluded.segment,revenue=excluded.revenue,share=excluded.share,is_estimate=excluded.is_estimate,created_at=excluded.created_at;

INSERT INTO research_forecasts
(id,company_id,fiscal_year,scenario,revenue,gross_margin,net_income,eps,opto_share,notes,created_at)
VALUES
('vpec-26-bear','vpec-2455',2026,'bear',4197,39.03,889,4.76,35,'市場區間低端 / 保守情境','2026-09-04'),
('vpec-26-consensus','vpec-2455',2026,'consensus',4470,40.6,1026,5.55,35.8,'五份最新去識別化研究模型中位數','2026-09-04'),
('vpec-26-bull','vpec-2455',2026,'bull',4581,40.3,1071,5.73,NULL,'投顧自研樂觀情境','2026-09-04'),
('vpec-27-bear','vpec-2455',2027,'bear',4946,40.59,NULL,6.19,43.3,'市場區間低端 / 保守情境','2026-09-04'),
('vpec-27-consensus','vpec-2455',2027,'consensus',5870,44.8,NULL,8.55,51,'五份最新去識別化研究模型中位數','2026-09-04'),
('vpec-27-bull','vpec-2455',2027,'bull',6943,45.62,NULL,11.02,50.1,'光電子占比為 >50% 的展示值','2026-09-04')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,fiscal_year=excluded.fiscal_year,scenario=excluded.scenario,revenue=excluded.revenue,gross_margin=excluded.gross_margin,net_income=excluded.net_income,eps=excluded.eps,opto_share=excluded.opto_share,notes=excluded.notes,created_at=excluded.created_at;

INSERT INTO research_capacity_events
(id,company_id,event_date,label,equipment,technology,delta_units,base_units,expected_online_date,actual_online_date,status,notes)
VALUES
('vpec-mocvd-base','vpec-2455','2026-03','公司揭露現有 MOCVD 基準','MOCVD','mixed',0,62,NULL,NULL,'actual','公司公開資訊：現有約 62 台。'),
('vpec-mocvd-5','vpec-2455','2026-Q2','第一階段擴產 +5 台','MOCVD','4 InP + 1 GaN',5,62,'2026-2027',NULL,'ramping','工具數由 62 推導至 67，gross tool count 約 +8.1%。'),
('vpec-mocvd-7','vpec-2455','2026-Q3','最新累計規劃 +7 台','MOCVD','6 InP + 1 GaN',7,62,'2028',NULL,'planned','相對 62 台工具數約 +11.3%；後追加 2 台偏 2028 完成。'),
('vpec-ebeam','vpec-2455','2026-Q2','CW Laser 二次磊晶設備','E-Beam','CW Laser',1,NULL,NULL,NULL,'planned','研究資料稱為第 3 台 E-Beam。')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,event_date=excluded.event_date,label=excluded.label,equipment=excluded.equipment,technology=excluded.technology,delta_units=excluded.delta_units,base_units=excluded.base_units,expected_online_date=excluded.expected_online_date,actual_online_date=excluded.actual_online_date,status=excluded.status,notes=excluded.notes;

INSERT INTO research_catalysts
(id,company_id,title,impact,status,notes,updated_at)
VALUES
('vpec-cat-inp','vpec-2455','InP 基板供應改善','high','watch','供應改善可同時釋放既有設備與新機 utilization。','2026-09-04'),
('vpec-cat-200g','vpec-2455','200G PD 放量','high','active','Data Center receive-side 新一代產品放量。','2026-09-04'),
('vpec-cat-cw','vpec-2455','CW Laser / 發射端產品','high','watch','若由小量轉為可見營收，可進一步提高 ASP 與 mix。','2026-09-04'),
('vpec-cat-mocvd','vpec-2455','新增 InP MOCVD 到位','medium','watch','重點不是到機本身，而是 qualification 與 utilization。','2026-09-04')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_risks
(id,company_id,title,impact,probability,status,notes,updated_at)
VALUES
('vpec-risk-inp','vpec-2455','InP 原料 / 出口許可再度受阻','high','medium','watch','若供應再度不規則，光電子出貨可能再次受壓。','2026-09-04'),
('vpec-risk-mix','vpec-2455','光電子占比未如期提升','high','medium','watch','2027 模型對 mix 高度敏感。','2026-09-04'),
('vpec-risk-ramp','vpec-2455','新機與新產品 ramp 延遲','medium','medium','watch','折舊可能先於營收，壓抑短期 GM / OP margin。','2026-09-04'),
('vpec-risk-micro','vpec-2455','微電子需求偏弱','medium','medium','watch','若手機/RF 轉弱，光電子需更快成長才能抵消。','2026-09-04')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,probability=excluded.probability,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_signal_rules
(id,company_id,metric,green_condition,yellow_condition,red_condition,weight,notes)
VALUES
('vpec-rule-revenue','vpec-2455','月營收','>= 4.2 億且可延續','4.0-4.2 億附近','< 4.0 億且連續回落',1.2,'research_inference; sources=vpec-src-official,vpec-src-consensus'),
('vpec-rule-opto','vpec-2455','光電子占比','>= 40% 並往 45-50%','35-40%','低 30% 或更低',1.5,'research_inference; sources=vpec-src-official,vpec-src-consensus'),
('vpec-rule-gm','vpec-2455','毛利率','>= 41-42%','38-41%','< 38%',1.4,'research_inference; sources=vpec-src-official,vpec-src-consensus'),
('vpec-rule-inp','vpec-2455','InP 供應','供應順暢','偶有遞延 / 許可不穩','明顯卡關',1.2,'research_inference; sources=vpec-src-official,vpec-src-consensus'),
('vpec-rule-util','vpec-2455','MOCVD utilization','新機到位且 utilization 上升','ramp / 認證中','低利用率且折舊先行',1,'research_inference; sources=vpec-src-official,vpec-src-consensus'),
('vpec-rule-product','vpec-2455','新產品','200G PD / CW Laser 明顯放量','小量出貨','認證或量產延後',1,'research_inference; sources=vpec-src-official,vpec-src-consensus')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,metric=excluded.metric,green_condition=excluded.green_condition,yellow_condition=excluded.yellow_condition,red_condition=excluded.red_condition,weight=excluded.weight,notes=excluded.notes;

INSERT INTO research_signal_snapshots
(id,company_id,as_of_date,metric,status,value_text,source_type,notes)
VALUES
('vpec-sig-revenue','vpec-2455','2026-09-04','月營收','green','2026/08 4.71 億；前8月 28.18 億','third_party_fact','7–8 月連續創高；前8月 YoY +35.87%，仍需 9-12 月延續'),
('vpec-sig-opto','vpec-2455','2026-09-04','光電子占比','green','2026/08 研究估計 46.1%','research_inference','公開資料整理，非官方 segment disclosure；需觀察 9-12 月持續性'),
('vpec-sig-gm','vpec-2455','2026-08-26','毛利率','yellow','26Q2 38.61%','official','仍需 H2 站穩 40% 以上'),
('vpec-sig-inp','vpec-2455','2026-08-26','InP 供應','yellow','供應改善中','research_inference','仍需觀察供應連續性'),
('vpec-sig-util','vpec-2455','2026-08-26','MOCVD utilization','yellow','新機 ramp 待驗證','research_inference','設備到位不等於有效產能'),
('vpec-sig-product','vpec-2455','2026-08-26','新產品','green','200G PD / CW Laser 放量訊號','research_inference','需確認營收貢獻持續擴大')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,as_of_date=excluded.as_of_date,metric=excluded.metric,status=excluded.status,value_text=excluded.value_text,source_type=excluded.source_type,notes=excluded.notes;

INSERT INTO research_sources
(id,company_id,source_type,source_group,source_title,published_date,url,file_name,notes,confidence)
VALUES
('vpec-src-official','vpec-2455','official','公司公開資訊','2026Q1/Q2 財報與公司公開資訊','2026-08-26',NULL,NULL,'已公布實績與設備資訊優先使用官方資料。; accessed=2026-08-26; periods=2025Q4|2026Q1|2026Q2|2026-Q3','high'),
('vpec-src-goodinfo','vpec-2455','third_party_fact','Goodinfo','2455 全新－每月營收','2026-08-27','https://goodinfo.tw/tw/ShowSaleMonChart.asp?STOCK_ID=2455',NULL,'月營收、MoM 與 YoY。; accessed=2026-08-27; periods=2026/01-2026/07','high'),
('vpec-src-revenue-2608','vpec-2455','third_party_fact','MoneyDJ（公開資訊整理）','全新 2026/08 月營收公告','2026-09-03','https://www.moneydj.com/kmdj/news/newsviewer.aspx?a=311ce118-77fa-4d4d-956c-19c9df502c62',NULL,'公開月營收公告整理；470.904 百萬元、MoM +11.56%、YoY +71.16%，前八月累計 2,817.693 百萬元、YoY +35.87%。; accessed=2026-09-09; periods=2026/08|2026/01-2026/08','high'),
('vpec-src-mix-2608','vpec-2455','third_party_fact','MoneyDJ','全新 8 月營收創高與產品 mix 公開資訊','2026-09-04','https://www.moneydj.com/KMDJ/news/newsviewer.aspx?a=b1b50928-0759-49ed-9b33-ea7e857bb534',NULL,'公開媒體整理之光電子占比約 46.1%；非公司正式 segment disclosure。; accessed=2026-09-09; periods=2026/07|2026/08','medium'),
('vpec-src-consensus','vpec-2455','market_consensus','市場共識','去識別化市場研究模型集合','2026-08-26',NULL,NULL,'五份最新國內機構 / 外資研究模型中位數與區間。; accessed=2026-08-26; periods=2026F|2027F','medium'),
('vpec-src-prop','vpec-2455','research_inference','投顧自研樂觀情境','投顧自研樂觀模型','2026-08-18',NULL,'全新.pdf','只作樂觀情境比較，不覆蓋官方已公布實績。; accessed=2026-08-26; periods=2026F|2027F','medium')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,source_type=excluded.source_type,source_group=excluded.source_group,source_title=excluded.source_title,published_date=excluded.published_date,url=excluded.url,file_name=excluded.file_name,notes=excluded.notes,confidence=excluded.confidence;

INSERT INTO research_reports
(id,company_id,title,slug,summary,thesis,status,version,html_path,pdf_path,created_at,updated_at,published_at)
VALUES
('vpec-report-v1','vpec-2455','全新光電 2455｜2025Q4-2027F 深度研究','vpec-2455','完整版：已實現財報與利潤 Bridge、7–8 月營收與光電子營收占比、2026F H2 反推、2027F CAGR / 分部拆解、MOCVD 產能量化與紅綠燈結論。','InP 供應 → utilization → 光電子營收 → mix → GM → OP margin → EPS。','published','1.2','/research/reports/vpec-2455.html',NULL,'2026-09-04','2026-09-04','2026-09-09')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,slug=excluded.slug,summary=excluded.summary,thesis=excluded.thesis,status=excluded.status,version=excluded.version,html_path=excluded.html_path,pdf_path=excluded.pdf_path,created_at=excluded.created_at,updated_at=excluded.updated_at,published_at=excluded.published_at;

INSERT INTO research_report_sections
(id,report_id,section_key,title,sort_order,content_json)
VALUES
('vpec-sec-summary','vpec-report-v1','vpec-sec-summary','投資摘要',1,'{"type":"summary","payloadRefs":["thesis","signalSnapshots"],"showSources":true}'),
('vpec-sec-actuals','vpec-report-v1','vpec-sec-actuals','已實現財報變化',2,'{"type":"financial-table","payloadRefs":["actuals"],"showSources":true}'),
('vpec-sec-revenue','vpec-report-v1','vpec-sec-revenue','月營收趨勢',3,'{"type":"bar-chart","payloadRefs":["monthlyRevenue"],"showSources":true}'),
('vpec-sec-mix','vpec-report-v1','vpec-sec-mix','營收結構與光電子占比',4,'{"type":"financial-table","payloadRefs":["segments"],"showSources":true}'),
('vpec-sec-scenario','vpec-report-v1','vpec-sec-scenario','2026F / 2027F 情境',5,'{"type":"scenario-table","payloadRefs":["forecasts"],"showSources":true}'),
('vpec-sec-capacity','vpec-report-v1','vpec-sec-capacity','產能擴充量化',6,'{"type":"capacity","payloadRefs":["capacity"],"showSources":true}'),
('vpec-sec-signals','vpec-report-v1','vpec-sec-signals','紅綠燈結論',7,'{"type":"signals","payloadRefs":["signalRules","signalSnapshots"],"showSources":true}'),
('vpec-sec-risks','vpec-report-v1','vpec-sec-risks','催化劑與風險',8,'{"type":"catalysts-risks","payloadRefs":["catalysts","risks"],"showSources":true}'),
('vpec-sec-sources','vpec-report-v1','vpec-sec-sources','資料來源',9,'{"type":"sources","payloadRefs":["sources"],"showSources":true}'),
('vpec-sec-conclusion','vpec-report-v1','vpec-sec-conclusion','研究結論',10,'{"type":"conclusion","payloadRefs":["thesis"],"showSources":true}'),
('vpec-report-v1-dashboard','vpec-report-v1','dashboard-config','Dashboard Config',0,'{"currentView":"目前判讀：偏綠。7–8 月營收連續創高、光電子占比研究估計升至約 46%；完整報告保留 2026F H2 反推、2027F CAGR / 分部拆解、MOCVD 產能量化與升降級規則。","verificationChain":["InP 供應","新機 utilization","光電子營收","光電子占比","毛利率","營益率","EPS"],"conclusion":"現階段方向偏正向，7–8 月營收與光電子 mix 提供上修訊號；但毛利率能否站穩 40%、InP 供應連續性與新機利用率仍需要連續數季驗證。","forecastScenario":"consensus","headlineForecastYears":[2026,2027],"focusMetric":{"field":"optoShare","label":"光電子占比"},"monthlyRevenue":{"focusYear":2026,"cumulativeThroughMonth":8,"unitDivisor":100,"unitLabel":"億"},"cagrCards":[{"field":"revenue","label":"2025A → 2027F Revenue CAGR","baseYear":2025,"targetYear":2027,"baseValue":3380,"years":2},{"field":"eps","label":"2025A → 2027F EPS CAGR","baseYear":2025,"targetYear":2027,"baseValue":2.96,"years":2}],"estimateNote":"* 研究估計值，非公司正式 segment disclosure。"}')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,section_key=excluded.section_key,title=excluded.title,sort_order=excluded.sort_order,content_json=excluded.content_json;


-- Remove stale rows only after all canonical rows have been upserted.

DELETE FROM research_financial_actuals WHERE company_id='vpec-2455' AND id NOT IN ('vpec-25q4','vpec-26q1','vpec-26q2');

DELETE FROM research_monthly_revenue WHERE company_id='vpec-2455' AND id NOT IN ('vpec-2601','vpec-2602','vpec-2603','vpec-2604','vpec-2605','vpec-2606','vpec-2607','vpec-2608');

DELETE FROM research_segments WHERE company_id='vpec-2455' AND id NOT IN ('vpec-25q4-micro','vpec-25q4-opto','vpec-26q1-micro','vpec-26q1-opto','vpec-26q2-micro','vpec-26q2-opto','vpec-2607-opto','vpec-2608-opto');

DELETE FROM research_forecasts WHERE company_id='vpec-2455' AND id NOT IN ('vpec-26-bear','vpec-26-consensus','vpec-26-bull','vpec-27-bear','vpec-27-consensus','vpec-27-bull');

DELETE FROM research_capacity_events WHERE company_id='vpec-2455' AND id NOT IN ('vpec-mocvd-base','vpec-mocvd-5','vpec-mocvd-7','vpec-ebeam');

DELETE FROM research_catalysts WHERE company_id='vpec-2455' AND id NOT IN ('vpec-cat-inp','vpec-cat-200g','vpec-cat-cw','vpec-cat-mocvd');

DELETE FROM research_risks WHERE company_id='vpec-2455' AND id NOT IN ('vpec-risk-inp','vpec-risk-mix','vpec-risk-ramp','vpec-risk-micro');

DELETE FROM research_signal_rules WHERE company_id='vpec-2455' AND id NOT IN ('vpec-rule-revenue','vpec-rule-opto','vpec-rule-gm','vpec-rule-inp','vpec-rule-util','vpec-rule-product');

DELETE FROM research_signal_snapshots WHERE company_id='vpec-2455' AND id NOT IN ('vpec-sig-revenue','vpec-sig-opto','vpec-sig-gm','vpec-sig-inp','vpec-sig-util','vpec-sig-product');

DELETE FROM research_sources WHERE company_id='vpec-2455' AND id NOT IN ('vpec-src-official','vpec-src-goodinfo','vpec-src-revenue-2608','vpec-src-mix-2608','vpec-src-consensus','vpec-src-prop');

DELETE FROM research_reports WHERE company_id='vpec-2455' AND id NOT IN ('vpec-report-v1');

DELETE FROM research_report_sections WHERE report_id='vpec-report-v1' AND id NOT IN ('vpec-sec-summary','vpec-sec-actuals','vpec-sec-revenue','vpec-sec-mix','vpec-sec-scenario','vpec-sec-capacity','vpec-sec-signals','vpec-sec-risks','vpec-sec-sources','vpec-sec-conclusion','vpec-report-v1-dashboard');
