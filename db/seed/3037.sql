PRAGMA foreign_keys = ON;

INSERT INTO research_companies
(id,ticker,market,name,slug,sector,industry,currency,description,status,created_at,updated_at)
VALUES
('uni-company','3037','TW','欣興','unimicron-3037','電子零組件','IC載板、ABF、HDI、PCB','TWD','AI/HPC用ABF載板、HDI與PCB製造商','unlisted','2026-11-26','2026-11-26')
ON CONFLICT(id) DO UPDATE SET ticker=excluded.ticker,market=excluded.market,name=excluded.name,slug=excluded.slug,sector=excluded.sector,industry=excluded.industry,currency=excluded.currency,description=excluded.description,status=excluded.status,created_at=excluded.created_at,updated_at=excluded.updated_at;

INSERT INTO research_financial_actuals
(id,company_id,period,fiscal_year,quarter,revenue,gross_profit,gross_margin,operating_income,operating_margin,net_income,net_margin,eps,source_note,created_at)
VALUES
('uni-actual-2025q3','uni-company','2025Q3',2025,3,33994.419,4548.515,13.38,1532.544,4.51,2194.489,6.46,1.44,'official; sources=uni-mops','2026-11-26'),
('uni-actual-2025fy','uni-company','2025FY',2025,NULL,131240.882,18292.258,13.94,6674.372,5.09,6673.144,5.08,4.38,'official; sources=uni-fs25fy','2026-11-26'),
('uni-actual-2026q1','uni-company','2026Q1',2026,1,37446.455,6726.042,17.96,2756.634,7.36,5042.976,13.47,3.28,'official; sources=uni-fs26q1','2026-11-26'),
('uni-actual-2026q2','uni-company','2026Q2',2026,2,42889.818,10638.138,24.8,6651.152,15.51,13114.938,30.58,8.45,'official; sources=uni-fs26q2','2026-11-26'),
('uni-actual-2026q3','uni-company','2026Q3',2026,3,52649.835,15189.468,28.85,10527.733,20,10051.937,19.09,6.36,'official; sources=uni-mops','2026-11-26')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,fiscal_year=excluded.fiscal_year,quarter=excluded.quarter,revenue=excluded.revenue,gross_profit=excluded.gross_profit,gross_margin=excluded.gross_margin,operating_income=excluded.operating_income,operating_margin=excluded.operating_margin,net_income=excluded.net_income,net_margin=excluded.net_margin,eps=excluded.eps,source_note=excluded.source_note,created_at=excluded.created_at;

INSERT INTO research_monthly_revenue
(id,company_id,year,month,revenue,mom,yoy,created_at)
VALUES
('uni-month-1','uni-company',2026,1,12766.959,NULL,34.48,'2026-11-26'),
('uni-month-2','uni-company',2026,2,11600.477,-9.14,16.18,'2026-11-26'),
('uni-month-3','uni-company',2026,3,13079.019,12.75,23.27,'2026-11-26'),
('uni-month-4','uni-company',2026,4,13932.815,6.53,27.64,'2026-11-26'),
('uni-month-5','uni-company',2026,5,14059.973,0.91,32.37,'2026-11-26'),
('uni-month-6','uni-company',2026,6,14897.03,5.95,36.31,'2026-11-26'),
('uni-month-7','uni-company',2026,7,16253.637,9.11,43.69,'2026-11-26'),
('uni-month-8','uni-company',2026,8,17745.519,9.18,56.26,'2026-11-26'),
('uni-month-9','uni-company',2026,9,18650.679,5.1,64.67,'2026-11-26'),
('uni-month-10','uni-company',2026,10,18986.087,1.8,67.62,'2026-11-26')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,year=excluded.year,month=excluded.month,revenue=excluded.revenue,mom=excluded.mom,yoy=excluded.yoy,created_at=excluded.created_at;

INSERT INTO research_segments
(id,company_id,period,segment,revenue,share,is_estimate,created_at)
VALUES
('uni-segment-0','uni-company','2026Q3','ABF/BT載板',NULL,62,0,'2026-11-26'),
('uni-segment-1','uni-company','2026Q3','HDI',NULL,27,0,'2026-11-26'),
('uni-segment-2','uni-company','2026Q3','PCB',NULL,9,0,'2026-11-26'),
('uni-segment-3','uni-company','2026Q3','FPC',NULL,1,0,'2026-11-26'),
('uni-segment-4','uni-company','2026Q3','其他',NULL,1,0,'2026-11-26')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,segment=excluded.segment,revenue=excluded.revenue,share=excluded.share,is_estimate=excluded.is_estimate,created_at=excluded.created_at;

INSERT INTO research_forecasts
(id,company_id,fiscal_year,scenario,revenue,gross_margin,net_income,eps,opto_share,notes,created_at)
VALUES
('uni-forecast-2026-bear','uni-company',2026,'bear',181000,24.35,32244.697,20.15,NULL,'研究假設（百萬元、百萬股）。折舊 20,500 已計入毛利；Q4 毛利率 24%、費用率 12.5%、業外 100、稅 22%、非控制權益 350；併入 9M 歸母 28,209.851。 股數 1,600。','2026-11-26'),
('uni-forecast-2026-consensus','uni-company',2026,'consensus',191000,25.09,35911.274,22.59,NULL,'研究假設（百萬元、百萬股）。折舊 21,200 已計入毛利；Q4 毛利率 26.5%、費用率 10.1%、業外 550、稅 20%、非控制權益 350；併入 9M 歸母 28,209.851。 股數 1,590。','2026-11-26'),
('uni-forecast-2026-bull','uni-company',2026,'bull',203000,25.93,39760.911,25.09,NULL,'研究假設（百萬元、百萬股）。折舊 21,500 已計入毛利；Q4 毛利率 28.7%、費用率 9.5%、業外 1,250、稅 19%、非控制權益 350；併入 9M 歸母 28,209.851。 股數 1,585。','2026-11-26'),
('uni-forecast-2027-bear','uni-company',2027,'bear',218000,25,25246.2,15.49,NULL,'研究假設（百萬元、百萬股）。折舊 26,000 已計入毛利；費用率 9.5%、業外 500、稅 22%、非控制權益 1,500。 股數 1,630。','2026-11-26'),
('uni-forecast-2027-consensus','uni-company',2027,'consensus',255000,30,43060,26.75,NULL,'研究假設（百萬元、百萬股）。折舊 25,500 已計入毛利；費用率 8.5%、業外 1,000、稅 20%、非控制權益 1,600。 股數 1,610。','2026-11-26'),
('uni-forecast-2027-bull','uni-company',2027,'bull',280000,33,56196,35.12,NULL,'研究假設（百萬元、百萬股）。折舊 25,000 已計入毛利；費用率 8%、業外 1,600、稅 19%、非控制權益 1,800。 股數 1,600。','2026-11-26'),
('uni-forecast-2028-bear','uni-company',2028,'bear',240000,25.5,28729.2,17.31,NULL,'研究假設（百萬元、百萬股）。折舊 33,500 已計入毛利；費用率 9.4%、業外 500、稅 22%、非控制權益 1,800。 股數 1,660。','2026-11-26'),
('uni-forecast-2028-consensus','uni-company',2028,'consensus',290000,32,54196,33.25,NULL,'研究假設（百萬元、百萬股）。折舊 32,000 已計入毛利；費用率 8.2%、業外 1,100、稅 20%、非控制權益 1,900。 股數 1,630。','2026-11-26'),
('uni-forecast-2028-bull','uni-company',2028,'bull',340000,35.5,75268.4,46.75,NULL,'研究假設（百萬元、百萬股）。折舊 31,000 已計入毛利；費用率 7.9%、業外 1,800、稅 19%、非控制權益 2,200。 股數 1,610。','2026-11-26')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,fiscal_year=excluded.fiscal_year,scenario=excluded.scenario,revenue=excluded.revenue,gross_margin=excluded.gross_margin,net_income=excluded.net_income,eps=excluded.eps,opto_share=excluded.opto_share,notes=excluded.notes,created_at=excluded.created_at;

INSERT INTO research_capacity_events
(id,company_id,event_date,label,equipment,technology,delta_units,base_units,expected_online_date,actual_online_date,status,notes)
VALUES
('uni-cap-0','uni-company',NULL,'ABF／HDI 設備投資情境','ABF及HDI設備採購','ABF/HDI',NULL,NULL,NULL,NULL,'planned','研究情境。以設備驗收與達可使用狀態估算折舊起點，實際時程依公司公告。'),
('uni-cap-1','uni-company',NULL,'高階載板新設備與良率爬坡','高階載板產線','ABF/HDI',NULL,NULL,NULL,NULL,'planned','研究情境。以設備驗收與達可使用狀態估算折舊起點，實際時程依公司公告。'),
('uni-cap-2','uni-company',NULL,'載板廠擴產情境','ABF產線','ABF/HDI',NULL,NULL,NULL,NULL,'planned','研究情境。以設備驗收與達可使用狀態估算折舊起點，實際時程依公司公告。')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,event_date=excluded.event_date,label=excluded.label,equipment=excluded.equipment,technology=excluded.technology,delta_units=excluded.delta_units,base_units=excluded.base_units,expected_online_date=excluded.expected_online_date,actual_online_date=excluded.actual_online_date,status=excluded.status,notes=excluded.notes;

INSERT INTO research_catalysts
(id,company_id,title,impact,status,notes,updated_at)
VALUES
('uni-cat-0','uni-company','高階載板售價與良率提升','high','watch','季度毛利率、ABF產品組合和良率是驗證點。','2026-11-26'),
('uni-cat-1','uni-company','AI GPU/ASIC高階載板升級','high','watch','高層數與大面積載板需求提升，但客戶平台風險存在。','2026-11-26'),
('uni-cat-2','uni-company','新設備導入與產能釋出','high','watch','可能放大營收與折舊，貢獻時程需驗證。','2026-11-26')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_risks
(id,company_id,title,impact,probability,status,notes,updated_at)
VALUES
('uni-risk-0','uni-company','產品產地標示調查','high','unknown','watch','未決指控，可能衍生客戶驗證、合規或賠償風險。','2026-11-26'),
('uni-risk-1','uni-company','財報業外收益使EPS失真','high','high','watch','Q2有8,925百萬元業外淨收益，不可用法定EPS直接年化。','2026-11-26'),
('uni-risk-2','uni-company','擴產折舊及新產能良率','high','medium','watch','擴產前置費用與元件良率使折舊對毛利率的壓力非線性。以公司資本支出及折舊附註重驗。','2026-11-26'),
('uni-risk-3','uni-company','AI客戶集中與平台轉換','medium','medium','watch','AI產品與ABF景氣循環、客戶NPI驗證時程風險。','2026-11-26'),
('uni-risk-4','uni-company','簡化EPS模型錯誤風險','high','high','watch','轉債、加權股數與稅率未驗證，研究僅作流程測試。','2026-11-26')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,probability=excluded.probability,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_signal_rules
(id,company_id,metric,green_condition,yellow_condition,red_condition,weight,notes)
VALUES
('uni-rule-0','uni-company','Q3毛利率','≥29%','26–29%','<26%',25,'research_inference; sources=uni-ir'),
('uni-rule-1','uni-company','AI資料中心營收比重','≥68%','55–67%','<55%',20,'research_inference; sources=uni-ir'),
('uni-rule-2','uni-company','載板營收占比','≥62%','56–61%','<56%',15,'research_inference; sources=uni-ir'),
('uni-rule-3','uni-company','月營收','≥190億元','170–190億元','<170億元',15,'research_inference; sources=uni-monthly'),
('uni-rule-4','uni-company','業外貢獻下降','業外依賴續降','本業改善但業外偏大','營運主要靠業外',15,'research_inference; sources=uni-ir'),
('uni-rule-5','uni-company','法遵事件進度','有官方正式解決證據','案件進度未明','出貨或客戶嚴重受限',10,'official; sources=uni-prosecutor')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,metric=excluded.metric,green_condition=excluded.green_condition,yellow_condition=excluded.yellow_condition,red_condition=excluded.red_condition,weight=excluded.weight,notes=excluded.notes;

INSERT INTO research_signal_snapshots
(id,company_id,as_of_date,metric,status,value_text,source_type,notes)
VALUES
('uni-snapshot-0','uni-company','2026-11-26','Q3毛利率','yellow','28.85%','official','截至2026-11-20，後續依官方公告逐季更新。'),
('uni-snapshot-1','uni-company','2026-11-26','AI資料中心營收比重','green','68%','official','截至2026-11-20，後續依官方公告逐季更新。'),
('uni-snapshot-2','uni-company','2026-11-26','載板營收占比','green','62%','official','截至2026-11-20，後續依官方公告逐季更新。'),
('uni-snapshot-3','uni-company','2026-11-26','月營收','yellow','10月189.86億元','third_party_fact','截至2026-11-20，後續依官方公告逐季更新。'),
('uni-snapshot-4','uni-company','2026-11-26','業外貢獻下降','yellow','Q2業外89.25→Q3 26.35億元','official','截至2026-11-20，後續依官方公告逐季更新。'),
('uni-snapshot-5','uni-company','2026-11-26','法遵事件進度','yellow','調查仍待最新官方資料','official','桃檢公布 8 月搜索及約談訊息，司法結果仍待主管機關公告。')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,as_of_date=excluded.as_of_date,metric=excluded.metric,status=excluded.status,value_text=excluded.value_text,source_type=excluded.source_type,notes=excluded.notes;

INSERT INTO research_sources
(id,company_id,source_type,source_group,source_title,published_date,url,file_name,notes,confidence)
VALUES
('uni-ir','uni-company','official','欣興電子／法說會','2026年第三季法說簡報（公司製作）','2026-10-27','https://www.unimicron.com/files/money/Earnings/ch/2026-Q3-consolidated-ch.pdf',NULL,'公司法說簡報，損益及產品、應用別結構。; accessed=2026-11-26; periods=2026Q3','high'),
('uni-mops','uni-company','official','欣興電子／臺灣證券交易所電子書','2026Q3 合併財務報告',NULL,'https://doc.twse.com.tw/server-java/t57sb01?step=1&colorchg=1&co_id=3037&year=115&seamon=3&mtype=A',NULL,'第 7–8 頁為損益與 EPS，第 11 頁為現金流量，第 68–69 頁為季度與累計 EPS 附註。; accessed=2026-11-26; periods=2026Q3|2026YTD|2025Q3','high'),
('uni-monthly','uni-company','official','欣興電子','2026 年 1–10 月合併營收',NULL,'https://www.unimicron.com/money01.html',NULL,'公司財務資訊頁 115 年月營收表，原始單位為新臺幣千元。; accessed=2026-11-26; periods=2026M01|2026M02|2026M03|2026M04|2026M05|2026M06|2026M07|2026M08|2026M09|2026M10','high'),
('uni-model','uni-company','research_inference','本系統情境模型','2026–2028營收與EPS情境示意',NULL,NULL,NULL,'三情境假設，包括營收、毛利率、折舊、費用、業外、稅率、非控制權益及股數。; accessed=2026-11-20; periods=2026F|2027F|2028F','medium'),
('uni-fs25fy','uni-company','official','欣興電子／臺灣證券交易所電子書','2025FY 合併財務報告',NULL,'https://doc.twse.com.tw/server-java/t57sb01?step=1&colorchg=1&co_id=3037&year=114&seamon=4&mtype=A',NULL,'第 11–12 頁為損益與 EPS，第 84 頁為 EPS 附註。; accessed=2026-11-26; periods=2025FY','high'),
('uni-fs26q1','uni-company','official','欣興電子／臺灣證券交易所電子書','2026Q1 合併財務報告',NULL,'https://doc.twse.com.tw/server-java/t57sb01?step=1&colorchg=1&co_id=3037&year=115&seamon=1&mtype=A',NULL,'第 7–8 頁為損益與 EPS，第 64 頁為 EPS 附註。; accessed=2026-11-26; periods=2026Q1','high'),
('uni-fs26q2','uni-company','official','欣興電子／臺灣證券交易所電子書','2026Q2 合併財務報告',NULL,'https://doc.twse.com.tw/server-java/t57sb01?step=1&colorchg=1&co_id=3037&year=115&seamon=2&mtype=A',NULL,'第 7–8 頁為損益與 EPS，第 71 頁為 EPS 附註。; accessed=2026-11-26; periods=2026Q2','high'),
('uni-prosecutor','uni-company','official','臺灣桃園地方檢察署','桃檢偵辦上市公司涉嫌偽造原產地標示案新聞稿','2026-08-29','https://www.tyc.moj.gov.tw/294079/294166/294168/1434382/post',NULL,'新聞稿以「欣○公司」稱呼，公布搜索及約談進度。; accessed=2026-11-26; periods=2026Q3','high')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,source_type=excluded.source_type,source_group=excluded.source_group,source_title=excluded.source_title,published_date=excluded.published_date,url=excluded.url,file_name=excluded.file_name,notes=excluded.notes,confidence=excluded.confidence;

INSERT INTO research_reports
(id,company_id,title,slug,summary,thesis,status,version,html_path,pdf_path,created_at,updated_at,published_at)
VALUES
('uni-report-v01','uni-company','欣興（3037）｜高階載板、盈餘品質與擴產情境','unimicron-3037','第三季營收與營益提升。以申報財報重算 EPS 並測試折舊、業外與股數對三年獲利的影響。','AI高階載板需求有本業驗證，但不宜使用未正常化EPS直接估值。','draft','0.2','/research/reports/unimicron-3037.html',NULL,'2026-11-26','2026-11-26',NULL)
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,slug=excluded.slug,summary=excluded.summary,thesis=excluded.thesis,status=excluded.status,version=excluded.version,html_path=excluded.html_path,pdf_path=excluded.pdf_path,created_at=excluded.created_at,updated_at=excluded.updated_at,published_at=excluded.published_at;

INSERT INTO research_report_sections
(id,report_id,section_key,title,sort_order,content_json)
VALUES
('uni-section-1','uni-report-v01','uni-section-1','投資摘要：ABF高階載板獲利槓桿',1,'{"type":"summary","payloadRefs":["thesis","signalSnapshots"],"showSources":true}'),
('uni-section-2','uni-report-v01','uni-section-2','2026Q3財務實績與EPS口徑',2,'{"type":"kpi-grid","payloadRefs":["actuals","monthlyRevenue"],"showSources":true}'),
('uni-section-3','uni-report-v01','uni-section-3','季度營業利益與業外盈餘品質',3,'{"type":"financial-table","payloadRefs":["actuals","claims"],"showSources":true}'),
('uni-section-4','uni-report-v01','uni-section-4','2026月營收與載板產品組合',4,'{"type":"bar-chart","payloadRefs":["monthlyRevenue","segments"],"showSources":true}'),
('uni-section-5','uni-report-v01','uni-section-5','AI需求到毛利率的獲利橋接',5,'{"type":"bridge","payloadRefs":["actuals","claims"],"showSources":true}'),
('uni-section-6','uni-report-v01','uni-section-6','光復與楊梅產能擴充',6,'{"type":"capacity","payloadRefs":["capacity","risks"],"showSources":true}'),
('uni-section-7','uni-report-v01','uni-section-7','2026–2028自建三情境（非共識）',7,'{"type":"scenario-table","payloadRefs":["forecasts","claims"],"showSources":true}'),
('uni-section-8','uni-report-v01','uni-section-8','燈號與下季驗證條件',8,'{"type":"signals","payloadRefs":["signalRules","signalSnapshots"],"showSources":true}'),
('uni-section-9','uni-report-v01','uni-section-9','催化劑、合規與循環風險',9,'{"type":"catalysts-risks","payloadRefs":["catalysts","risks"],"showSources":true}'),
('uni-section-10','uni-report-v01','uni-section-10','官方、券商來源與驗證缺口',10,'{"type":"sources","payloadRefs":["sources","claims"],"showSources":true}'),
('uni-section-11','uni-report-v01','uni-section-11','結論：本業改善但EPS模型未完備',11,'{"type":"conclusion","payloadRefs":["thesis","forecasts","risks"],"showSources":true}'),
('uni-report-v01-dashboard','uni-report-v01','dashboard-config','Dashboard Config',0,'{"currentView":"2026Q3 營收 526.50 億元、毛利率 28.85%、基本 EPS 6.36 元，10 月營收 189.86 億元。","currentThesis":"AI DC應用68%、載板產品62%；高階ABF驅動本業改善，但業外淨收益、折舊和法律調查有重大不確定性。","verificationChain":["來源：公司2026Q3法說與法定公告","基本/稀釋EPS口徑","月營收與季度營收合計","載板與應用占比維度","業外正常化與EPS分母","擴產現金、折舊及良率","法遵與客戶認證","券商預測時間戳與模型比較"],"conclusion":"交易所申報數字已與 EPS 附註勾稽，估計仍受產能爬坡、業外及股數假設影響。","forecastScenario":"consensus","headlineForecastYears":[2026,2027,2028],"focusMetric":{"field":"grossMargin","label":"毛利率"},"monthlyRevenue":{"focusYear":2026,"cumulativeThroughMonth":10,"unitDivisor":100,"unitLabel":"億元"},"cagrCards":[{"field":"revenue","label":"2025A–2027F營收情境CAGR","baseYear":2025,"targetYear":2027,"baseValue":131240.882,"years":2}],"estimateNote":"三組預測為本研究下檔、基準、上檔情境。資料欄位 consensus 用於舊版儀表板的基準情境。折舊已計入製造成本，業外、稅率及股數均為模型假設。"}')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,section_key=excluded.section_key,title=excluded.title,sort_order=excluded.sort_order,content_json=excluded.content_json;

INSERT INTO research_earnings_quality
(id,report_id,company_id,as_of_date,review_status,l2_status,payload_json,payload_hash,updated_at)
VALUES
('uni-report-v01-eq01','uni-report-v01','uni-company','2026-11-26','WARN','NOT_RUN','{"standard":"EQ-01-v1","reviewStatus":"WARN","reviewer":"研究編製與申報文件初核","reviewedAt":"2026-11-26","coverageNote":"列示 2025 年度、2025Q3、2026Q1–Q3 及前三季申報資料。2023–2024 年度與 2025Q4 的完整調節待補。","periods":[{"id":"uni-eq-2025q3","period":"2025Q3","periodType":"quarter","currency":"TWD","scale":"million","revenue":33994.419,"operatingIncome":1532.544,"nonOperatingNet":1414.176,"pretaxIncome":2946.72,"incomeTax":495.769,"netIncomeAttributable":2194.489,"reportedEps":1.44,"normalizedEps":null,"weightedAverageShares":1522.46,"shareholdersEquity":null,"adjustments":[],"sourceIds":["uni-mops"],"normalizationNote":"各項特殊損益的實現性、所得稅及非控制權益須個別核對。"},{"id":"uni-eq-2025fy","period":"2025FY","periodType":"annual","currency":"TWD","scale":"million","revenue":131240.882,"operatingIncome":6674.372,"nonOperatingNet":2152.919,"pretaxIncome":8827.291,"incomeTax":1276.801,"netIncomeAttributable":6673.144,"reportedEps":4.38,"normalizedEps":null,"weightedAverageShares":1523.278,"shareholdersEquity":null,"adjustments":[],"sourceIds":["uni-fs25fy"],"normalizationNote":"各項特殊損益的實現性、所得稅及非控制權益須個別核對。"},{"id":"uni-eq-2026q1","period":"2026Q1","periodType":"quarter","currency":"TWD","scale":"million","revenue":37446.455,"operatingIncome":2756.634,"nonOperatingNet":3542.211,"pretaxIncome":6298.845,"incomeTax":918.107,"netIncomeAttributable":5042.976,"reportedEps":3.28,"normalizedEps":null,"weightedAverageShares":1536.954,"shareholdersEquity":null,"adjustments":[],"sourceIds":["uni-fs26q1"],"normalizationNote":"各項特殊損益的實現性、所得稅及非控制權益須個別核對。"},{"id":"uni-eq-2026q2","period":"2026Q2","periodType":"quarter","currency":"TWD","scale":"million","revenue":42889.818,"operatingIncome":6651.152,"nonOperatingNet":8924.635,"pretaxIncome":15575.787,"incomeTax":2233.4,"netIncomeAttributable":13114.938,"reportedEps":8.45,"normalizedEps":null,"weightedAverageShares":1552.215,"shareholdersEquity":null,"adjustments":[],"sourceIds":["uni-fs26q2"],"normalizationNote":"各項特殊損益的實現性、所得稅及非控制權益須個別核對。"},{"id":"uni-eq-2026q3","period":"2026Q3","periodType":"quarter","currency":"TWD","scale":"million","revenue":52649.835,"operatingIncome":10527.733,"nonOperatingNet":2635.511,"pretaxIncome":13163.244,"incomeTax":2743.054,"netIncomeAttributable":10051.937,"reportedEps":6.36,"normalizedEps":null,"weightedAverageShares":1580.052,"shareholdersEquity":null,"adjustments":[],"sourceIds":["uni-mops"],"normalizationNote":"各項特殊損益的實現性、所得稅及非控制權益須個別核對。"},{"id":"uni-eq-2026ytd","period":"2026YTD","periodType":"ytd","currency":"TWD","scale":"million","revenue":132986.108,"operatingIncome":19935.519,"nonOperatingNet":15102.357,"pretaxIncome":35037.876,"incomeTax":5894.561,"netIncomeAttributable":28209.851,"reportedEps":17.85,"normalizedEps":null,"weightedAverageShares":1580.052,"shareholdersEquity":null,"adjustments":[],"sourceIds":["uni-mops"],"normalizationNote":"FVPL 連結至金融資產及負債的揭露，稅後歸母及現金性質仍待逐項對帳。"}],"qualitativeFlags":[],"l2":{"status":"NOT_RUN","summary":"2026Q2 業外占稅前 57.3%，Q3 占 20.0%。Q2 的 FVPL 淨利益 92.10 億元，前三季累計 132.77 億元。尚須按標的穿透已實現及未實現損益，並核對稅後歸母及 OCI。","sourceIds":["uni-fs26q2","uni-mops"],"claimIds":["uni-c-nonop"]},"valuation":{"epsBasis":"not_applicable","doubleCountChecked":false,"notes":"先完成 EQ-01 L2，再決定可用的正常化 EPS 及估值倍數。"},"notes":"2026Q3 法說與財報使用合併損益及歸母淨利不同口徑。EPS 採申報附註，情境模型獨立揭露。"}','aa0842360e26b2cccfc68e4ba22fb4202cd69ac7abd577f0f75fb748dc63ca5a','2026-11-26')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,company_id=excluded.company_id,as_of_date=excluded.as_of_date,review_status=excluded.review_status,l2_status=excluded.l2_status,payload_json=excluded.payload_json,payload_hash=excluded.payload_hash,updated_at=excluded.updated_at;


-- Remove stale rows only after all canonical rows have been upserted.

DELETE FROM research_financial_actuals WHERE company_id='uni-company' AND id NOT IN ('uni-actual-2025q3','uni-actual-2025fy','uni-actual-2026q1','uni-actual-2026q2','uni-actual-2026q3');

DELETE FROM research_monthly_revenue WHERE company_id='uni-company' AND id NOT IN ('uni-month-1','uni-month-2','uni-month-3','uni-month-4','uni-month-5','uni-month-6','uni-month-7','uni-month-8','uni-month-9','uni-month-10');

DELETE FROM research_segments WHERE company_id='uni-company' AND id NOT IN ('uni-segment-0','uni-segment-1','uni-segment-2','uni-segment-3','uni-segment-4');

DELETE FROM research_forecasts WHERE company_id='uni-company' AND id NOT IN ('uni-forecast-2026-bear','uni-forecast-2026-consensus','uni-forecast-2026-bull','uni-forecast-2027-bear','uni-forecast-2027-consensus','uni-forecast-2027-bull','uni-forecast-2028-bear','uni-forecast-2028-consensus','uni-forecast-2028-bull');

DELETE FROM research_capacity_events WHERE company_id='uni-company' AND id NOT IN ('uni-cap-0','uni-cap-1','uni-cap-2');

DELETE FROM research_catalysts WHERE company_id='uni-company' AND id NOT IN ('uni-cat-0','uni-cat-1','uni-cat-2');

DELETE FROM research_risks WHERE company_id='uni-company' AND id NOT IN ('uni-risk-0','uni-risk-1','uni-risk-2','uni-risk-3','uni-risk-4');

DELETE FROM research_signal_rules WHERE company_id='uni-company' AND id NOT IN ('uni-rule-0','uni-rule-1','uni-rule-2','uni-rule-3','uni-rule-4','uni-rule-5');

DELETE FROM research_signal_snapshots WHERE company_id='uni-company' AND id NOT IN ('uni-snapshot-0','uni-snapshot-1','uni-snapshot-2','uni-snapshot-3','uni-snapshot-4','uni-snapshot-5');

DELETE FROM research_sources WHERE company_id='uni-company' AND id NOT IN ('uni-ir','uni-mops','uni-monthly','uni-model','uni-fs25fy','uni-fs26q1','uni-fs26q2','uni-prosecutor');

DELETE FROM research_reports WHERE company_id='uni-company' AND id NOT IN ('uni-report-v01');

DELETE FROM research_report_sections WHERE report_id='uni-report-v01' AND id NOT IN ('uni-section-1','uni-section-2','uni-section-3','uni-section-4','uni-section-5','uni-section-6','uni-section-7','uni-section-8','uni-section-9','uni-section-10','uni-section-11','uni-report-v01-dashboard');
