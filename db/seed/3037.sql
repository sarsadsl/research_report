PRAGMA foreign_keys = ON;

INSERT INTO research_companies
(id,ticker,market,name,slug,sector,industry,currency,description,status,created_at,updated_at)
VALUES
('uni-company','3037','TW','欣興','unimicron-3037','電子零組件','IC載板、ABF、HDI、PCB','TWD','AI/HPC用ABF載板、HDI與PCB製造商','active','2026-11-26','2026-11-26')
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
('uni-forecast-2026-bear','uni-company',2026,'bear',181000,24.35,32244.697,20.1,NULL,'研究假設（百萬元、百萬股）。折舊 20,500 已計入毛利；Q4 毛利率 24%、費用率 12.5%、業外 100、稅 22%、非控制權益 350；併入 9M 歸母 28,209.851。 股數 1,604。','2026-11-26'),
('uni-forecast-2026-consensus','uni-company',2026,'consensus',191000,25.09,35911.274,22.5,NULL,'研究假設（百萬元、百萬股）。折舊 21,200 已計入毛利；Q4 毛利率 26.5%、費用率 10.1%、業外 550、稅 20%、非控制權益 350；併入 9M 歸母 28,209.851。 股數 1,596。','2026-11-26'),
('uni-forecast-2026-bull','uni-company',2026,'bull',203000,25.93,39760.911,24.93,NULL,'研究假設（百萬元、百萬股）。折舊 21,500 已計入毛利；Q4 毛利率 28.7%、費用率 9.5%、業外 1,250、稅 19%、非控制權益 350；併入 9M 歸母 28,209.851。 股數 1,595。','2026-11-26'),
('uni-forecast-2027-bear','uni-company',2027,'bear',218000,25,25246.2,15.03,NULL,'研究假設（百萬元、百萬股）。折舊 26,000 已計入毛利；費用率 9.5%、業外 500、稅 22%、非控制權益 1,500。 股數 1,680。','2026-11-26'),
('uni-forecast-2027-consensus','uni-company',2027,'consensus',255000,30,43060,26.02,NULL,'研究假設（百萬元、百萬股）。折舊 25,500 已計入毛利；費用率 8.5%、業外 1,000、稅 20%、非控制權益 1,600。 股數 1,655。','2026-11-26'),
('uni-forecast-2027-bull','uni-company',2027,'bull',280000,33,56196,34.12,NULL,'研究假設（百萬元、百萬股）。折舊 25,000 已計入毛利；費用率 8%、業外 1,600、稅 19%、非控制權益 1,800。 股數 1,647。','2026-11-26'),
('uni-forecast-2028-bear','uni-company',2028,'bear',240000,25.5,28729.2,16.8,NULL,'研究假設（百萬元、百萬股）。折舊 33,500 已計入毛利；費用率 9.4%、業外 500、稅 22%、非控制權益 1,800。 股數 1,710。','2026-11-26'),
('uni-forecast-2028-consensus','uni-company',2028,'consensus',290000,32,54196,32.36,NULL,'研究假設（百萬元、百萬股）。折舊 32,000 已計入毛利；費用率 8.2%、業外 1,100、稅 20%、非控制權益 1,900。 股數 1,675。','2026-11-26'),
('uni-forecast-2028-bull','uni-company',2028,'bull',340000,35.5,75268.4,45.48,NULL,'研究假設（百萬元、百萬股）。折舊 31,000 已計入毛利；費用率 7.9%、業外 1,800、稅 19%、非控制權益 2,200。 股數 1,655。','2026-11-26')
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
('uni-risk-1','uni-company','業外波動與法定 EPS 年化風險','high','high','watch','Q2 業外淨收益 89.25 億元，與經常營業利益分列。','2026-11-26'),
('uni-risk-2','uni-company','擴產折舊及新產能良率','high','medium','watch','擴產前置費用與元件良率使折舊對毛利率的壓力非線性。以公司資本支出及折舊附註重驗。','2026-11-26'),
('uni-risk-3','uni-company','AI客戶集中與平台轉換','medium','medium','watch','AI產品與ABF景氣循環、客戶NPI驗證時程風險。','2026-11-26'),
('uni-risk-4','uni-company','增資與轉債稀釋','high','high','watch','以 Q3 期末股本校準。轉債轉換時間及後續股數依各情境估計。','2026-11-26')
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
('uni-snapshot-0','uni-company','2026-11-26','Q3毛利率','yellow','28.85%','official','資料截止日 2026-11-26；依同口徑公告追蹤。'),
('uni-snapshot-1','uni-company','2026-11-26','AI資料中心營收比重','green','68%','official','資料截止日 2026-11-26；依同口徑公告追蹤。'),
('uni-snapshot-2','uni-company','2026-11-26','載板營收占比','green','62%','official','資料截止日 2026-11-26；依同口徑公告追蹤。'),
('uni-snapshot-3','uni-company','2026-11-26','月營收','yellow','10月189.86億元','third_party_fact','資料截止日 2026-11-26；依同口徑公告追蹤。'),
('uni-snapshot-4','uni-company','2026-11-26','業外貢獻下降','yellow','Q2 89.25 億、Q3 26.36 億','official','資料截止日 2026-11-26；依同口徑公告追蹤。'),
('uni-snapshot-5','uni-company','2026-11-26','法遵事件進度','yellow','調查仍待最新官方資料','official','桃檢公布 8 月搜索及約談訊息，司法結果仍待主管機關公告。')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,as_of_date=excluded.as_of_date,metric=excluded.metric,status=excluded.status,value_text=excluded.value_text,source_type=excluded.source_type,notes=excluded.notes;

INSERT INTO research_sources
(id,company_id,source_type,source_group,source_title,published_date,url,file_name,notes,confidence)
VALUES
('uni-ir','uni-company','official','欣興電子／法說會','2026年第三季法說簡報（公司製作）','2026-10-27','https://www.unimicron.com/files/money/Earnings/ch/2026-Q3-consolidated-ch.pdf',NULL,'公司法說簡報，損益及產品、應用別結構。; accessed=2026-11-26; periods=2026Q3','high'),
('uni-mops','uni-company','official','欣興電子／臺灣證券交易所電子書','2026Q3 合併財務報告',NULL,'https://doc.twse.com.tw/server-java/t57sb01?step=1&colorchg=1&co_id=3037&year=115&seamon=3&mtype=A',NULL,'第 5–8、11–12、25、58–59、63–64、68–69、88、91、96 頁公開核對資料。; accessed=2026-11-26; periods=2026Q3|2026YTD|2025Q3','high'),
('uni-monthly','uni-company','official','欣興電子','2026 年 1–10 月合併營收',NULL,'https://www.unimicron.com/money01.html',NULL,'公司財務資訊頁 115 年月營收表，原始單位為新臺幣千元。; accessed=2026-11-26; periods=2026M01|2026M02|2026M03|2026M04|2026M05|2026M06|2026M07|2026M08|2026M09|2026M10','high'),
('uni-model','uni-company','research_inference','本系統情境模型','2026–2028營收與EPS情境示意',NULL,NULL,NULL,'自建情境，以官方 2026 前三季損益和 Q3 期末股本為起點。2026 = 9M 已實現加 Q4（Q4 營收×〔毛利率－費用率〕＋業外）×（1－稅率）－非控制權益；2027–28 用全年同一公式。EPS 等於歸母淨利除以模型加權股數。各列披露假設；基準情境用舊欄位 consensus 儲存，資料類型為自行推估。; accessed=2026-11-20; periods=2026F|2027F|2028F','medium'),
('uni-fs25fy','uni-company','official','欣興電子／臺灣證券交易所電子書','2025FY 合併財務報告',NULL,'https://doc.twse.com.tw/server-java/t57sb01?step=1&colorchg=1&co_id=3037&year=114&seamon=4&mtype=A',NULL,'公開核對資料涵蓋第 10–12、84、110 頁。; accessed=2026-11-26; periods=2025FY','high'),
('uni-fs26q1','uni-company','official','欣興電子／臺灣證券交易所電子書','2026Q1 合併財務報告',NULL,'https://doc.twse.com.tw/server-java/t57sb01?step=1&colorchg=1&co_id=3037&year=115&seamon=1&mtype=A',NULL,'第 7–8 頁為損益與 EPS，第 64 頁為 EPS 附註。; accessed=2026-11-26; periods=2026Q1','high'),
('uni-fs26q2','uni-company','official','欣興電子／臺灣證券交易所電子書','2026Q2 合併財務報告',NULL,'https://doc.twse.com.tw/server-java/t57sb01?step=1&colorchg=1&co_id=3037&year=115&seamon=2&mtype=A',NULL,'公開核對資料涵蓋第 6–8、25、67、71、99 頁。; accessed=2026-11-26; periods=2026Q2','high'),
('uni-prosecutor','uni-company','official','臺灣桃園地方檢察署','桃檢偵辦上市公司涉嫌偽造原產地標示案新聞稿','2026-08-29','https://www.tyc.moj.gov.tw/294079/294166/294168/1434382/post',NULL,'新聞稿以「欣○公司」稱呼，公布搜索及約談進度。; accessed=2026-11-26; periods=2026Q3','high'),
('uni-fs24fy','uni-company','official','欣興電子／臺灣證券交易所電子書','2024 年度合併財務報告（含 2023 年比較）',NULL,'https://doc.twse.com.tw/server-java/t57sb01?step=1&colorchg=1&co_id=3037&year=113&seamon=4&mtype=A',NULL,'研讀第 11–13、79 頁（權益、損益與基本每股盈餘）。; accessed=2026-11-26; periods=2023FY|2024FY','high'),
('uni-q4-ir','uni-company','official','欣興電子','2025Q4 營運結果',NULL,'https://www.unimicron.com/files/money/Earnings/ch/2025-Q4-consolidated-ch.pdf',NULL,'法說簡報第 4 頁，單季基本 EPS 與歸母獲利。; accessed=2026-11-26; periods=2025Q4','high'),
('uni-twse','uni-company','official','臺灣證券交易所','115 年 11 月欣興日成交資訊',NULL,'https://www.twse.com.tw/exchangeReport/STOCK_DAY?date=20261101&stockNo=3037&response=html',NULL,'11 月 25 日正式收盤價 585 元，作比較基準。; accessed=2026-11-26; periods=2026-11-25','high')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,source_type=excluded.source_type,source_group=excluded.source_group,source_title=excluded.source_title,published_date=excluded.published_date,url=excluded.url,file_name=excluded.file_name,notes=excluded.notes,confidence=excluded.confidence;

INSERT INTO research_reports
(id,company_id,title,slug,summary,thesis,status,version,html_path,pdf_path,created_at,updated_at,published_at)
VALUES
('uni-report-v01','uni-company','欣興（3037）｜高階載板、盈餘品質與擴產情境','unimicron-3037','第三季營收與營益提升。以申報財報重算 EPS 並測試折舊、業外與股數對三年獲利的影響。','AI高階載板需求有本業驗證，但不宜使用未正常化EPS直接估值。','published','1.0','/research/reports/unimicron-3037.html',NULL,'2026-11-26','2026-11-26','2026-11-26')
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
('uni-report-v01-dashboard','uni-report-v01','dashboard-config','Dashboard Config',0,'{"currentView":"2026Q3 營收 526.50 億元、毛利率 28.85%、基本 EPS 6.36 元，10 月營收 189.86 億元。","currentThesis":"AI DC應用68%、載板產品62%；高階ABF驅動本業改善，但業外淨收益、折舊和法律調查有重大不確定性。","verificationChain":["高階載板需求","產品組合與良率","毛利率及營益率","折舊與稼動率","業外與股數","客戶與法遵"],"conclusion":"高階載板帶動營益改善。擴產折舊、持股評價與轉債稀釋仍是主要變數。","forecastScenario":"consensus","headlineForecastYears":[2026,2027,2028],"focusMetric":{"field":"grossMargin","label":"毛利率"},"monthlyRevenue":{"focusYear":2026,"cumulativeThroughMonth":10,"unitDivisor":100,"unitLabel":"億元"},"cagrCards":[{"field":"revenue","label":"2025A–2027F營收情境CAGR","baseYear":2025,"targetYear":2027,"baseValue":131240.882,"years":2}],"estimateNote":"悲觀、基準與樂觀均為自建情境。舊欄位 consensus 對應基準估計。折舊內含於毛利，2026 年 EPS 含前三季已公布業外。"}')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,section_key=excluded.section_key,title=excluded.title,sort_order=excluded.sort_order,content_json=excluded.content_json;

INSERT INTO research_earnings_quality
(id,report_id,company_id,as_of_date,review_status,l2_status,payload_json,payload_hash,updated_at)
VALUES
('uni-report-v01-eq01','uni-report-v01','uni-company','2026-11-26','WARN','PASS','{"standard":"EQ-01-v1","reviewStatus":"WARN","reviewer":"研究編製，依公開財報科目、附註及附表交叉核對","reviewedAt":"2026-11-26","coverageNote":"2023–2025 全年及最近四季均已查核。2025Q4 損益以年度減前三季，EPS 核對公司法說。歷史正常化點值因逐項稅後歸屬未公開而保留空值。","periods":[{"id":"uni-eq-2023fy","period":"2023FY","periodType":"annual","currency":"TWD","scale":"million","revenue":104036.151,"operatingIncome":8919.919,"nonOperatingNet":6655.013,"pretaxIncome":15574.932,"incomeTax":3349.83,"netIncomeAttributable":11980.052,"reportedEps":7.88,"weightedAverageShares":1519.515,"normalizedEps":null,"shareholdersEquity":90660.883,"adjustments":[],"sourceIds":["uni-fs24fy"],"normalizationNote":"全年法定口徑。缺逐項稅後歸屬時保留正常化點值。"},{"id":"uni-eq-2024fy","period":"2024FY","periodType":"annual","currency":"TWD","scale":"million","revenue":115373.282,"operatingIncome":5116.677,"nonOperatingNet":2204.033,"pretaxIncome":7320.71,"incomeTax":1764.696,"netIncomeAttributable":5082.063,"reportedEps":3.34,"weightedAverageShares":1521.256,"normalizedEps":null,"shareholdersEquity":93264.763,"adjustments":[],"sourceIds":["uni-fs24fy"],"normalizationNote":"全年法定口徑。缺逐項稅後歸屬時保留正常化點值。"},{"id":"uni-eq-2025fy","period":"2025FY","periodType":"annual","currency":"TWD","scale":"million","revenue":131240.882,"operatingIncome":6674.372,"nonOperatingNet":2152.919,"pretaxIncome":8827.291,"incomeTax":1276.801,"netIncomeAttributable":6673.144,"reportedEps":4.38,"normalizedEps":null,"weightedAverageShares":1523.278,"shareholdersEquity":100569.302,"adjustments":[],"sourceIds":["uni-fs25fy"],"normalizationNote":"各項特殊損益的實現性、所得稅及非控制權益須個別核對。"},{"id":"uni-eq-2025q3","period":"2025Q3","periodType":"quarter","currency":"TWD","scale":"million","revenue":33994.419,"operatingIncome":1532.544,"nonOperatingNet":1414.176,"pretaxIncome":2946.72,"incomeTax":495.769,"netIncomeAttributable":2194.489,"reportedEps":1.44,"normalizedEps":null,"weightedAverageShares":1522.46,"shareholdersEquity":92099.518,"adjustments":[],"sourceIds":["uni-mops"],"normalizationNote":"各項特殊損益的實現性、所得稅及非控制權益須個別核對。"},{"id":"uni-eq-2025q4","period":"2025Q4","periodType":"quarter","currency":"TWD","scale":"million","revenue":34690.886,"operatingIncome":2365.656,"nonOperatingNet":1784.802,"pretaxIncome":4150.458,"incomeTax":234.605,"netIncomeAttributable":3534.504,"reportedEps":2.32,"weightedAverageShares":1525.705326,"normalizedEps":null,"shareholdersEquity":100569.302,"adjustments":[],"sourceIds":["uni-fs25fy","uni-mops","uni-q4-ir"],"normalizationNote":"年度與前三季基本股數按 365／273／92 天加權差推估單季股數；單季基本 EPS 2.32 元由法說獨立確認。"},{"id":"uni-eq-2026q1","period":"2026Q1","periodType":"quarter","currency":"TWD","scale":"million","revenue":37446.455,"operatingIncome":2756.634,"nonOperatingNet":3542.211,"pretaxIncome":6298.845,"incomeTax":918.107,"netIncomeAttributable":5042.976,"reportedEps":3.28,"normalizedEps":null,"weightedAverageShares":1536.954,"shareholdersEquity":113384.008,"adjustments":[{"id":"uni-fvpl-2026q1","category":"FVPL","realization":"mixed","pretaxAmount":2507.241,"epsImpact":null,"equityImpact":null,"method":"財報附註六（二）所列合併稅前淨額，與附註六（三十）對帳。","sourceIds":["uni-fs26q2"],"notes":"逐筆已實現、所得稅及稅後歸母分配未公開。保留法定 EPS，另列估計敏感度。"}],"sourceIds":["uni-fs26q1"],"normalizationNote":"各項特殊損益的實現性、所得稅及非控制權益須個別核對。"},{"id":"uni-eq-2026q2","period":"2026Q2","periodType":"quarter","currency":"TWD","scale":"million","revenue":42889.818,"operatingIncome":6651.152,"nonOperatingNet":8924.635,"pretaxIncome":15575.787,"incomeTax":2233.4,"netIncomeAttributable":13114.938,"reportedEps":8.45,"normalizedEps":null,"weightedAverageShares":1552.215,"shareholdersEquity":123886.281,"adjustments":[{"id":"uni-fvpl-2026q2","category":"FVPL","realization":"mixed","pretaxAmount":9210.323,"epsImpact":null,"equityImpact":null,"method":"財報附註六（二）所列合併稅前淨額，與附註六（三十）對帳。","sourceIds":["uni-fs26q2"],"notes":"逐筆已實現、所得稅及稅後歸母分配未公開。保留法定 EPS，另列估計敏感度。"}],"sourceIds":["uni-fs26q2"],"normalizationNote":"僅作壓力測試。若全數屬歸母，假設增量稅率 0%–20%，全數排除 FVPL 後 EPS 約 2.52–3.70 元。尚有其他一次性科目；歷史正常化點值留空。"},{"id":"uni-eq-2026q3","period":"2026Q3","periodType":"quarter","currency":"TWD","scale":"million","revenue":52649.835,"operatingIncome":10527.733,"nonOperatingNet":2635.511,"pretaxIncome":13163.244,"incomeTax":2743.054,"netIncomeAttributable":10051.937,"reportedEps":6.36,"normalizedEps":null,"weightedAverageShares":1580.052,"shareholdersEquity":177832.637,"adjustments":[{"id":"uni-fvpl-2026q3","category":"FVPL","realization":"mixed","pretaxAmount":1559.712,"epsImpact":null,"equityImpact":null,"method":"財報附註六（二）所列合併稅前淨額，與附註六（三十）對帳。","sourceIds":["uni-mops"],"notes":"逐筆已實現、所得稅及稅後歸母分配未公開。保留法定 EPS，另列估計敏感度。"},{"id":"uni-fvoci-q3","category":"FVOCI","realization":"unrealized","pretaxAmount":null,"epsImpact":0,"equityImpact":-0.711,"method":"第三季財報第 8 頁科目 8316。","sourceIds":["uni-mops"],"notes":"列入 OCI，當期 EPS 影響為 0。金額為當期綜合損益變動。"}],"sourceIds":["uni-mops"],"normalizationNote":"僅作壓力測試。若全數屬歸母，假設增量稅率 0%–20%，全數排除 FVPL 後 EPS 約 5.37–5.57 元。尚有其他一次性科目；歷史正常化點值留空。"},{"id":"uni-eq-2026ytd","period":"2026YTD","periodType":"ytd","currency":"TWD","scale":"million","revenue":132986.108,"operatingIncome":19935.519,"nonOperatingNet":15102.357,"pretaxIncome":35037.876,"incomeTax":5894.561,"netIncomeAttributable":28209.851,"reportedEps":17.85,"normalizedEps":null,"weightedAverageShares":1580.052,"shareholdersEquity":177832.637,"adjustments":[{"id":"uni-fvpl-2026ytd","category":"FVPL","realization":"mixed","pretaxAmount":13277.276,"epsImpact":null,"equityImpact":null,"method":"財報附註六（二）所列合併稅前淨額，與附註六（三十）對帳。","sourceIds":["uni-mops"],"notes":"逐筆已實現、所得稅及稅後歸母分配未公開。保留法定 EPS，另列估計敏感度。"},{"id":"uni-fvoci-ytd","category":"FVOCI","realization":"unrealized","pretaxAmount":null,"epsImpact":0,"equityImpact":112.62,"method":"第三季財報第 8 頁科目 8316。","sourceIds":["uni-mops"],"notes":"前三季 OCI 未實現評價，當期 EPS 影響為 0。"}],"sourceIds":["uni-mops"],"normalizationNote":"僅作壓力測試。若全數屬歸母，假設增量稅率 0%–20%，全數排除 FVPL 後 EPS 約 9.45–11.13 元。尚有其他一次性科目；歷史正常化點值留空。"}],"qualitativeFlags":["cross_holding"],"l2":{"status":"PASS","summary":"Q2 FVPL 92.10 億，未上市櫃股 91.23 億；9M FVPL 132.77 億，其中未上市櫃股 131.56 億。Q3 末諧永及焱元帳面合計 215.63 億，占歸母權益 12.1%。第三層級變動、現金流調節及 OCI 已對帳。未披露逐標的已實現與稅後歸母分配，歷史正常化點值留空並提供稅率敏感度。","sourceIds":["uni-mops","uni-fs26q2","uni-fs25fy"],"claimIds":["uni-c-nonop","uni-c-eq-l2","uni-c-eq-oci"]},"valuation":{"epsBasis":"normalized","prospectiveModelOnly":true,"doubleCountChecked":true,"notes":"以 2027F 自建基準 EPS 26.02 元為前瞻獲利基礎，無歷史 FVPL 重複扣除。11/25 收盤 585 元相當於 22.5 倍。估值敏感度用 18／22／26 倍（四捨五入參考中點、上下各 4 倍），對應 468.36／572.44／676.52 元。","scenarios":[{"id":"uni-pe-18x","epsBasis":"forecast","period":"2027F","scenario":"consensus","eps":26.02,"multiple":18,"impliedPrice":468.36,"sourceIds":["uni-model","uni-twse"]},{"id":"uni-pe-22x","epsBasis":"forecast","period":"2027F","scenario":"consensus","eps":26.02,"multiple":22,"impliedPrice":572.44,"sourceIds":["uni-model","uni-twse"]},{"id":"uni-pe-26x","epsBasis":"forecast","period":"2027F","scenario":"consensus","eps":26.02,"multiple":26,"impliedPrice":676.52,"sourceIds":["uni-model","uni-twse"]}]},"notes":"Q3 財報第 25、64、88 頁揭露 FVPL 與第三層級。第 11–12 頁區分稅前調節及投資現金，處分價款與利益各有口徑。第 96 頁列示期末持股，變動含交易及評價。"}','fbaf5d2361aeba475d81ff0804f2fcf9bff07841e7f41b5b98cdb92da0a56762','2026-11-26')
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

DELETE FROM research_sources WHERE company_id='uni-company' AND id NOT IN ('uni-ir','uni-mops','uni-monthly','uni-model','uni-fs25fy','uni-fs26q1','uni-fs26q2','uni-prosecutor','uni-fs24fy','uni-q4-ir','uni-twse');

DELETE FROM research_reports WHERE company_id='uni-company' AND id NOT IN ('uni-report-v01');

DELETE FROM research_report_sections WHERE report_id='uni-report-v01' AND id NOT IN ('uni-section-1','uni-section-2','uni-section-3','uni-section-4','uni-section-5','uni-section-6','uni-section-7','uni-section-8','uni-section-9','uni-section-10','uni-section-11','uni-report-v01-dashboard');
