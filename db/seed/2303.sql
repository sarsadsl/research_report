PRAGMA foreign_keys = ON;

INSERT INTO research_companies
(id,ticker,market,name,slug,sector,industry,currency,description,status,created_at,updated_at)
VALUES
('umc-2303','2303','TW','聯華電子','umc-2303','半導體','晶圓代工／22/28nm／矽光子','TWD','專注成熟及特殊製程的晶圓代工；2026Q3本業復甦，2026年權益法業外收益與間接交叉持股需盈餘品質穿透。','active','2026-11-13','2026-11-13')
ON CONFLICT(id) DO UPDATE SET ticker=excluded.ticker,market=excluded.market,name=excluded.name,slug=excluded.slug,sector=excluded.sector,industry=excluded.industry,currency=excluded.currency,description=excluded.description,status=excluded.status,created_at=excluded.created_at,updated_at=excluded.updated_at;

INSERT INTO research_financial_actuals
(id,company_id,period,fiscal_year,quarter,revenue,gross_profit,gross_margin,operating_income,operating_margin,net_income,net_margin,eps,source_note,created_at)
VALUES
('umc-a-2025Q4','umc-2303','2025Q4',2025,4,61810,NULL,30.7,NULL,NULL,NULL,NULL,0.8,'official; sources=umc-src-q1','2026-11-13'),
('umc-a-2026Q1','umc-2303','2026Q1',2026,1,61038,NULL,29.2,11276,18.5,16170,26.49,1.29,'official; sources=umc-src-q1','2026-11-13'),
('umc-a-2026Q2','umc-2303','2026Q2',2026,2,68733,22323,32.5,14950,21.8,42260,61.48,3.39,'official; sources=umc-src-q2','2026-11-13'),
('umc-a-2026Q3','umc-2303','2026Q3',2026,3,74239.117,25204.523,34,18642.533,25.1,16434,22.14,1.32,'official; sources=umc-src-q3fs','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,fiscal_year=excluded.fiscal_year,quarter=excluded.quarter,revenue=excluded.revenue,gross_profit=excluded.gross_profit,gross_margin=excluded.gross_margin,operating_income=excluded.operating_income,operating_margin=excluded.operating_margin,net_income=excluded.net_income,net_margin=excluded.net_margin,eps=excluded.eps,source_note=excluded.source_note,created_at=excluded.created_at;

INSERT INTO research_monthly_revenue
(id,company_id,year,month,revenue,mom,yoy,created_at)
VALUES
('umc-month-1','umc-2303',2026,1,20862.15,NULL,5.33,'2026-11-13'),
('umc-month-2','umc-2303',2026,2,19345.126,-7.27,6.33,'2026-11-13'),
('umc-month-3','umc-2303',2026,3,20830.626,7.68,4.89,'2026-11-13'),
('umc-month-4','umc-2303',2026,4,22663.945,8.8,10.8,'2026-11-13'),
('umc-month-5','umc-2303',2026,5,22943.755,1.23,17.78,'2026-11-13'),
('umc-month-6','umc-2303',2026,6,23124.962,0.79,22.85,'2026-11-13'),
('umc-month-7','umc-2303',2026,7,23844.045,3.11,18.98,'2026-11-13'),
('umc-month-8','umc-2303',2026,8,25044.641,5.04,30.71,'2026-11-13'),
('umc-month-9','umc-2303',2026,9,25350.431,1.22,27.22,'2026-11-13'),
('umc-month-10','umc-2303',2026,10,25197.532,-0.6,18.33,'2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,year=excluded.year,month=excluded.month,revenue=excluded.revenue,mom=excluded.mom,yoy=excluded.yoy,created_at=excluded.created_at;

INSERT INTO research_segments
(id,company_id,period,segment,revenue,share,is_estimate,created_at)
VALUES
('umc-seg-node-0','umc-2303','2026Q3製程','22/28nm製程',NULL,35,0,'2026-11-13'),
('umc-seg-node-1','umc-2303','2026Q3製程','40nm製程',NULL,16,0,'2026-11-13'),
('umc-seg-node-2','umc-2303','2026Q3製程','65nm製程',NULL,19,0,'2026-11-13'),
('umc-seg-node-3','umc-2303','2026Q3製程','其他製程',NULL,30,0,'2026-11-13'),
('umc-seg-app-0','umc-2303','2026Q3應用','通訊',NULL,39,0,'2026-11-13'),
('umc-seg-app-1','umc-2303','2026Q3應用','消費電子',NULL,32,0,'2026-11-13'),
('umc-seg-app-2','umc-2303','2026Q3應用','電腦',NULL,13,0,'2026-11-13'),
('umc-seg-app-3','umc-2303','2026Q3應用','其他',NULL,16,0,'2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,period=excluded.period,segment=excluded.segment,revenue=excluded.revenue,share=excluded.share,is_estimate=excluded.is_estimate,created_at=excluded.created_at;

INSERT INTO research_forecasts
(id,company_id,fiscal_year,scenario,revenue,gross_margin,net_income,eps,opto_share,notes,created_at)
VALUES
('umc-f-2027-bear','umc-2303',2027,'bear',297000,33,57822,4.6,NULL,'獨立前瞻常態化情境，2026YTD歷史EPS須另查；ASP改善偏慢、折舊壓力。','2026-11-13'),
('umc-f-2027-consensus','umc-2303',2027,'consensus',333000,36,72906,5.8,NULL,'獨立前瞻常態化情境，2026YTD歷史EPS須另查；以合理利用率、ASP實現與費用控制估算。','2026-11-13'),
('umc-f-2027-bull','umc-2303',2027,'bull',361000,39,89247,7.1,NULL,'獨立前瞻常態化情境，2026YTD歷史EPS須另查；ASP與特殊製程毛利強於預期。','2026-11-13'),
('umc-f-2028-bear','umc-2303',2028,'bear',309000,33,60336,4.8,NULL,'獨立前瞻常態化情境，2026YTD歷史EPS須另查；ASP改善偏慢、折舊壓力。；未包含已確定可核對的2028新產能現金支出時程，新增設備折舊另參壓測。','2026-11-13'),
('umc-f-2028-consensus','umc-2303',2028,'consensus',375000,38,84219,6.7,NULL,'2028F基準營收375,000百萬元、EPS6.70元為自建估計，並非券商共識。32億美元追加預算於2028年底開始安裝、2030達規劃規模；尚不掌握分年支付／折舊時程，因此維持原基準、另提供追加折舊壓測，切勿重複扣減。','2026-11-13'),
('umc-f-2028-bull','umc-2303',2028,'bull',430000,42,110616,8.8,NULL,'獨立前瞻常態化情境，2026YTD歷史EPS須另查；ASP與特殊製程毛利強於預期。；未包含已確定可核對的2028新產能現金支出時程，新增設備折舊另參壓測。','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,fiscal_year=excluded.fiscal_year,scenario=excluded.scenario,revenue=excluded.revenue,gross_margin=excluded.gross_margin,net_income=excluded.net_income,eps=excluded.eps,opto_share=excluded.opto_share,notes=excluded.notes,created_at=excluded.created_at;

INSERT INTO research_capacity_events
(id,company_id,event_date,label,equipment,technology,delta_units,base_units,expected_online_date,actual_online_date,status,notes)
VALUES
('umc-cap-0','umc-2303','2026-10-28','新加坡／台南追加擴產預算','新加坡Fab 12i／台南Fab 12A','PIC、矽電容、TFLN',NULL,NULL,NULL,NULL,'approved','董事會新增資本預算約32億美元（新台幣1027.81億元）；2026現金制CapEx原指引20億美元，兩者非同年度實際支出。2028年底開始裝機，2030達規劃規模。'),
('umc-cap-1','umc-2303','2026-10-28','12吋矽光子 PIC','新加坡晶圓廠','12吋PIC／1.6T平台',18000,NULL,NULL,NULL,'planned','規劃月產能1.8萬片；1.6T相關平台進入客戶驗證階段。預定2028年底起裝機、2030達規劃量，並非已出貨量。'),
('umc-cap-2','umc-2303','2026-10-28','台南 eDTC／矽電容','台南 Fab 12A','DTC／矽電容',22000,NULL,NULL,NULL,'planned','規劃月產能2.2萬片；AI伺服器供電需求延伸到嵌入式電容，量產與營收認列須持續驗證。'),
('umc-cap-3','umc-2303','2026-10-28','8吋 TFLN 光調變器','既有8吋晶圓廠轉線','1.6T已驗證／3.2T研發中',20000,NULL,NULL,NULL,'qualification','規劃月產能2萬片；1.6T已達系統驗證里程碑、3.2T技術仍在開發，廠房轉線短期可能影響利用率。')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,event_date=excluded.event_date,label=excluded.label,equipment=excluded.equipment,technology=excluded.technology,delta_units=excluded.delta_units,base_units=excluded.base_units,expected_online_date=excluded.expected_online_date,actual_online_date=excluded.actual_online_date,status=excluded.status,notes=excluded.notes;

INSERT INTO research_catalysts
(id,company_id,title,impact,status,notes,updated_at)
VALUES
('umc-cat-0','umc-2303','2027實收混合ASP改善','high','watch','應由各季實際出貨、價格與毛利率驗證。','2026-11-13'),
('umc-cat-1','umc-2303','22nm占比持續提升','high','watch','Q3為18.3%，下一步看高價值產品占比與毛利。','2026-11-13'),
('umc-cat-2','umc-2303','2029年AI相關營收占比25%以上目標','high','watch','管理層目標至2029年AI相關業務占公司營收逾25%，範圍含PMIC、FPGA、connectivity、PIC及先進封裝；需持續追蹤商用收入與新產能折舊。','2026-11-13'),
('umc-cat-3','umc-2303','高稼動率延續','medium','watch','利用率與折舊成本吸收同步改善。','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_risks
(id,company_id,title,impact,probability,status,notes,updated_at)
VALUES
('umc-risk-0','umc-2303','交叉持股影響EPS、OCI與淨值','high','high','watch','關聯企業持有聯電股票的未實現評價損益可逆轉，必須按會計準則穿透。','2026-11-13'),
('umc-risk-1','umc-2303','成熟製程競爭與中國擴產','high','medium','watch','需求改善不等於定價永久可持續。','2026-11-13'),
('umc-risk-2','umc-2303','追加擴產預算的折舊與自由現金流壓力','high','medium','watch','董事會核准約32億美元新增資本預算，支出時程未完整公布。2028年底起安裝、2030才達目標；若ASP和量產增量不足抵銷折舊，2028–2030 EPS及FCF可能低於基準。','2026-11-13'),
('umc-risk-3','umc-2303','矽光子認證及量產不確定','high','medium','watch','技術通過驗證不等於獲得有意義毛利。','2026-11-13'),
('umc-risk-4','umc-2303','季度業外波動造成預估落差','high','high','watch','若股價下跌，迅捷等評價可能由獲利轉損失。','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,impact=excluded.impact,probability=excluded.probability,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at;

INSERT INTO research_signal_rules
(id,company_id,metric,green_condition,yellow_condition,red_condition,weight,notes)
VALUES
('umc-rule-0','umc-2303','月營收','≥260億元持續','250-260億元','<250億元連續減少',1.2,'research_inference; sources=umc-src-model'),
('umc-rule-1','umc-2303','產能利用率','>=90%且毛利增','85%-90%','<85%',1.2,'research_inference; sources=umc-src-model'),
('umc-rule-2','umc-2303','22nm製程占比','>=20%','15%-20%','<15%',1.1,'research_inference; sources=umc-src-model'),
('umc-rule-3','umc-2303','業外收益品質','已查清特殊收益來源，並能計算稅後每股盈餘影響','已確認業外收益來源，但部分稅後影響仍待核對','重大業外收益缺乏說明，或估值錯把一次性收益當長期獲利',1.6,'research_inference; sources=umc-src-model'),
('umc-rule-4','umc-2303','2027ASP驗證','實收年增大於8%','漲價尚待合約','成本上升且無實收漲價',1.3,'research_inference; sources=umc-src-model'),
('umc-rule-5','umc-2303','矽光子與新業務','產生明確收入與毛利','送樣認證中','投產延後或無營收',1,'research_inference; sources=umc-src-model')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,metric=excluded.metric,green_condition=excluded.green_condition,yellow_condition=excluded.yellow_condition,red_condition=excluded.red_condition,weight=excluded.weight,notes=excluded.notes;

INSERT INTO research_signal_snapshots
(id,company_id,as_of_date,metric,status,value_text,source_type,notes)
VALUES
('umc-signal-0','umc-2303','2026-11-13','月營收','yellow','2026/10 251.98億元，年增18.33%','official','研究追蹤訊號，不等於股價買賣指示；請依官方更新再次驗證。'),
('umc-signal-1','umc-2303','2026-11-13','產能利用率','green','2026Q3 92%，高於Q2 85%','official','研究追蹤訊號，不等於股價買賣指示；請依官方更新再次驗證。'),
('umc-signal-2','umc-2303','2026-11-13','22nm製程占比','yellow','Q3 18.3%；22/28nm合計35%','official','研究追蹤訊號，不等於股價買賣指示；請依官方更新再次驗證。'),
('umc-signal-3','umc-2303','2026-11-13','業外收益品質','yellow','Q1-Q3權益法利益281.01億元；正常化EPS待查','official','業外投資收益雖已確認主要來源，但對股東真正獲利的稅後影響仍待核對；不可直接視為本業成長。'),
('umc-signal-4','umc-2303','2026-11-13','2027ASP驗證','yellow','展望≠實績，毛利率待查','research_inference','研究追蹤訊號，不等於股價買賣指示；請依官方更新再次驗證。'),
('umc-signal-5','umc-2303','2026-11-13','矽光子與新業務','yellow','PIC、TFLN開發與商用需追蹤','research_inference','研究追蹤訊號，不等於股價買賣指示；請依官方更新再次驗證。')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,as_of_date=excluded.as_of_date,metric=excluded.metric,status=excluded.status,value_text=excluded.value_text,source_type=excluded.source_type,notes=excluded.notes;

INSERT INTO research_sources
(id,company_id,source_type,source_group,source_title,published_date,url,file_name,notes,confidence)
VALUES
('umc-src-q3fs','umc-2303','official','聯電／SEC','2026Q3 財報含權益法關聯企業附註','2026-10-28','https://www.sec.gov/Archives/edgar/data/1033767/000119312526435003/umc-ex99_1.htm',NULL,'以原始財報與公告為準；研究推論與官方數值分開。; accessed=2026-11-13; periods=2026Q3|2026YTD','high'),
('umc-src-q3','umc-2303','official','聯華電子','2026Q3 財報暨法說公告','2026-10-28','https://www.umc.com/zh-TW/News/press_release/Content/investor/20261028',NULL,'以原始財報與公告為準；研究推論與官方數值分開。; accessed=2026-11-13; periods=2026Q3','high'),
('umc-src-q2','umc-2303','official','聯華電子','2026Q2 財報暨法說公告','2026-07-29','https://www.umc.com/zh-TW/News/press_release/Content/investor/20260729',NULL,'以原始財報與公告為準；研究推論與官方數值分開。; accessed=2026-11-13; periods=2026Q2','high'),
('umc-src-q1','umc-2303','official','聯華電子','2026Q1 財報暨法說公告','2026-04-29','https://www.umc.com/zh-TW/News/press_release/Content/investor/20260429',NULL,'以原始財報與公告為準；研究推論與官方數值分開。; accessed=2026-11-13; periods=2026Q1|2025Q4','high'),
('umc-src-months','umc-2303','official','聯華電子','2026年1至10月月營收','2026-11-05','https://www.umc.com/zh-TW/IR_Financial/monthly_sales_revenue',NULL,'以原始財報與公告為準；研究推論與官方數值分開。; accessed=2026-11-13; periods=2026/01-2026/10','high'),
('umc-src-overview','umc-2303','official','聯華電子','2025年投資人關係總覽','2026-11-13','https://www.umc.com/zh-TW/IR/ir_overview',NULL,'以原始財報與公告為準；研究推論與官方數值分開。; accessed=2026-11-13; periods=2025FY','high'),
('umc-src-20f','umc-2303','official','SEC／聯華電子','2025 Form 20-F IASB IFRS 與庫藏股會計政策','2026-04-30','https://www.sec.gov/Archives/edgar/data/1033767/000119312526193757/d91630d20f.htm',NULL,'以原始財報與公告為準；研究推論與官方數值分開。; accessed=2026-11-13; periods=2025FY','high'),
('umc-src-price','umc-2303','third_party_fact','Yahoo 股市','聯電2026/11/13收盤價101.5元','2026-11-13','https://tw.finance.yahoo.com/quote/2303.TW',NULL,'以原始財報與公告為準；研究推論與官方數值分開。; accessed=2026-11-13; periods=2026-11-13','medium'),
('umc-src-model','umc-2303','research_inference','研究報告系統','自建2027–2028估值、財報品質與特殊持股敏感度','2026-11-13',NULL,NULL,'以原始財報與公告為準；研究推論與官方數值分開。; accessed=2026-11-13; periods=2026YTD|2027F|2028F','medium'),
('umc-src-capexboard','umc-2303','official','聯電／SEC Form 6-K','2026/10/28董事會通過資本預算新台幣102,781百萬元','2026-10-28','https://www.sec.gov/Archives/edgar/data/1033767/000119312526434992/umc-ex99.htm',NULL,'正式核准的追加預算，不能等同2026已執行現金資本支出。; accessed=2026-11-13; periods=2026Q4|2027-2030','high'),
('umc-src-q3call','umc-2303','third_party_fact','UMC Q3 2026 公開法說逐字稿','2026年第三季法說問答：PIC、DTC、TFLN產能與2028–2030時程','2026-10-28','https://www.fool.com/earnings/call-transcripts/2026/10/28/umc-umc-q3-2026-earnings-call-transcript/',NULL,'來源為公開法說逐字紀錄，產能目標與財務實績區分。; accessed=2026-11-13; periods=2027-2030','medium'),
('umc-src-firstcapital-20261102','umc-2303','third_party_fact','第一金證券投顧','2026/11/02 聯電研究：2027F EPS 7.64元','2026-11-02',NULL,NULL,'狼友小站內部授權資料；僅交叉核對個別估算數字，不公開原始報告內容或檔案。; accessed=2026-11-13; periods=2027F','medium'),
('umc-src-hongyuan-20261029','umc-2303','third_party_fact','宏遠投顧','2026/10/29 聯電研究：2027F EPS 7.05元','2026-10-29',NULL,NULL,'狼友小站內部授權資料；個別研究估算不等於統計市場共識，不公開報告內容。; accessed=2026-11-13; periods=2027F','medium')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,source_type=excluded.source_type,source_group=excluded.source_group,source_title=excluded.source_title,published_date=excluded.published_date,url=excluded.url,file_name=excluded.file_name,notes=excluded.notes,confidence=excluded.confidence;

INSERT INTO research_reports
(id,company_id,title,slug,summary,thesis,status,version,html_path,pdf_path,created_at,updated_at,published_at)
VALUES
('umc-2303-report-v1-1','umc-2303','聯電 2303｜2026Q3 業外收益警報、2027–2028估值與擴產現金流檢驗','umc-2303','v1.1納入2026/10/28追加資本預算（約32億美元）、PIC／DTC／TFLN規劃月產能、2028–2030設備投入時程、AI 2029營收占比目標及EPS股數口徑。2026前三季權益法收益281.01億元，占稅前34.4%，歷史正常化EPS待驗證；自建2027F EPS5.80元、2028F EPS6.70元，非券商共識。','成熟製程稼動率回升→22nm組合→毛利率→業外收益穿透→可持續EPS→估值','published','1.1','/research/reports/umc-2303.html',NULL,'2026-11-13','2026-11-13','2026-11-13')
ON CONFLICT(id) DO UPDATE SET company_id=excluded.company_id,title=excluded.title,slug=excluded.slug,summary=excluded.summary,thesis=excluded.thesis,status=excluded.status,version=excluded.version,html_path=excluded.html_path,pdf_path=excluded.pdf_path,created_at=excluded.created_at,updated_at=excluded.updated_at,published_at=excluded.published_at;

INSERT INTO research_report_sections
(id,report_id,section_key,title,sort_order,content_json)
VALUES
('umc-sec-1','umc-2303-report-v1-1','umc-sec-1','投資摘要',1,'{"type":"summary","payloadRefs":["thesis","signalSnapshots"],"showSources":true}'),
('umc-sec-2','umc-2303-report-v1-1','umc-sec-2','財務KPI',2,'{"type":"kpi-grid","payloadRefs":["actuals","forecasts"],"showSources":true}'),
('umc-sec-3','umc-2303-report-v1-1','umc-sec-3','財報與業外獲利',3,'{"type":"financial-table","payloadRefs":["actuals","earningsQuality"],"showSources":true}'),
('umc-sec-4','umc-2303-report-v1-1','umc-sec-4','月營收',4,'{"type":"bar-chart","payloadRefs":["monthlyRevenue"],"showSources":true}'),
('umc-sec-5','umc-2303-report-v1-1','umc-sec-5','評價情境',5,'{"type":"scenario-table","payloadRefs":["forecasts"],"showSources":true}'),
('umc-sec-6','umc-2303-report-v1-1','umc-sec-6','AI產能、追加資本預算與量產節點',6,'{"type":"capacity","payloadRefs":["capacity"],"showSources":true}'),
('umc-sec-7','umc-2303-report-v1-1','umc-sec-7','檢核指標',7,'{"type":"signals","payloadRefs":["signalSnapshots"],"showSources":true}'),
('umc-sec-8','umc-2303-report-v1-1','umc-sec-8','催化劑與風險',8,'{"type":"catalysts-risks","payloadRefs":["catalysts","risks"],"showSources":true}'),
('umc-sec-9','umc-2303-report-v1-1','umc-sec-9','來源與限制',9,'{"type":"sources","payloadRefs":["sources"],"showSources":true}'),
('umc-sec-10','umc-2303-report-v1-1','umc-sec-10','研究結論',10,'{"type":"conclusion","payloadRefs":["thesis"],"showSources":true}'),
('umc-2303-report-v1-1-dashboard','umc-2303-report-v1-1','dashboard-config','Dashboard Config',0,'{"currentView":"2026Q3本業復甦：營收742.4億元、毛利率34%、營益率25.1%、利用率92%；然而前三季權益法收益281.01億元占稅前34.4%，歷史正常化EPS尚待核對。2026/10/28董事會追加約32億美元資本預算、規劃新加坡PIC、台南DTC與8吋TFLN產能；設備2028年底起安裝，2027-2028 EPS仍應計入折舊與現金流的不確定性。","currentThesis":"成熟製程獲利隨22nm和稼動率改善，但2026非經常投資收益不可持續；新增資本預算需要關注2028起現金流出與折舊啟動、新平台客戶承諾及2029 AI營收目標落地。","verificationChain":["22/28nm稼動率","實收ASP與毛利","本業利益","業外投資穿透","2028起追加CapEx","折舊與自由現金流","2029 AI營收目標"],"conclusion":"v1.1維持中性偏審慎：2027自建EPS5.8元、18x PE合理價104.4元，並非市場共識。2028自建EPS6.7元基準暫保留、尚未納入確定的新增CapEx年度時程；提供不同投入比例下的增量折舊壓力測試，不把上限壓測直接扣除兩次。2026前三季法定EPS6元含大額權益法收益，稅後正常化EPS仍待查；追蹤2027實收ASP、22nm份額、TFLN/PIC良率與2028–2030投資進度。","forecastScenario":"consensus","headlineForecastYears":[2027,2028],"focusMetric":{"field":"grossMargin","label":"毛利率"},"monthlyRevenue":{"focusYear":2026,"cumulativeThroughMonth":10,"unitDivisor":100,"unitLabel":"億元"},"cagrCards":[{"field":"revenue","label":"2025A至2027F營收CAGR","baseYear":2025,"targetYear":2027,"baseValue":237553,"years":2},{"field":"eps","label":"2025A至2027F EPS CAGR","baseYear":2025,"targetYear":2027,"baseValue":3.34,"years":2}],"estimateNote":"**模型口徑**：2027/28基準EPS5.80／6.70與2028基準營收375,000百萬元均為自建推估，非券商共識。狼友小站兩家個別券商估計：第一金2027F EPS7.64(11/02)、宏遠7.05(10/29)，非完整共識樣本。2026Q3 EPS1.32元的基本加權流通股12,460.655百萬股；2026前三季EPS6.00元使用約12,476百萬股，不能以期末股本代替。追加32億美元為董事會預算核准，2026現金制資本支出指引20億美元，兩者非同一口徑；未能確認投產時程前不直接重估2028 EPS。","capexSensitivity":{"budgetNtdMillion":102781,"approvedBudgetUsdMillion":3200,"existing2026CashCapexUsdMillion":2000,"depreciationYears":8,"taxRate":0.2,"weightedSharesMillion":12460.655,"sourceIds":["umc-src-capexboard","umc-src-q3call","umc-src-q3","umc-src-model"],"notes":"僅為增量壓力測試：依追加核准預算×假設投入比重÷8年折舊×(1−20%稅率)÷124.60655億股估算全年EPS影響；與實際2028費用無關，也不代表預算已支出。新產能預計2028年底起安裝、2030達規劃規模；若基準EPS已含折舊，不可再次扣除。"}}')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,section_key=excluded.section_key,title=excluded.title,sort_order=excluded.sort_order,content_json=excluded.content_json;

INSERT INTO research_earnings_quality
(id,report_id,company_id,as_of_date,review_status,l2_status,payload_json,payload_hash,updated_at)
VALUES
('umc-2303-report-v1-1-eq01','umc-2303-report-v1-1','umc-2303','2026-11-13','WARN','PASS','{"standard":"EQ-01-v1","reviewStatus":"WARN","reviewer":"研究報告編製／財報初步核對（非會計師審計）","reviewedAt":"2026-11-13","coverageNote":"已列示近三年摘要、最近四季與2026年前三季資料；歷年業外細項和迅捷投資收益的稅後歸屬尚未逐筆釐清，因此扣除特殊收益後的歷史EPS仍待驗證。","periods":[{"id":"umc-eq-2023FY","period":"2023FY","periodType":"annual","currency":"TWD","scale":"million","revenue":222533,"operatingIncome":null,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":null,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["umc-src-overview"],"claimIds":[],"normalizationNote":"完整歷史歸母稅後特殊損益尚未逐項勾稽；不能把未揭露填0。"},{"id":"umc-eq-2024FY","period":"2024FY","periodType":"annual","currency":"TWD","scale":"million","revenue":232303,"operatingIncome":null,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":null,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["umc-src-overview"],"claimIds":[],"normalizationNote":"完整歷史歸母稅後特殊損益尚未逐項勾稽；不能把未揭露填0。"},{"id":"umc-eq-2025FY","period":"2025FY","periodType":"annual","currency":"TWD","scale":"million","revenue":237553,"operatingIncome":null,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":3.34,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["umc-src-overview"],"claimIds":[],"normalizationNote":"完整歷史歸母稅後特殊損益尚未逐項勾稽；不能把未揭露填0。"},{"id":"umc-eq-2025Q4","period":"2025Q4","periodType":"quarter","currency":"TWD","scale":"million","revenue":61810,"operatingIncome":null,"nonOperatingNet":null,"pretaxIncome":null,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":0.8,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["umc-src-q1"],"claimIds":[],"normalizationNote":"完整歷史歸母稅後特殊損益尚未逐項勾稽；不能把未揭露填0。"},{"id":"umc-eq-2026Q1","period":"2026Q1","periodType":"quarter","currency":"TWD","scale":"million","revenue":61038,"operatingIncome":11276,"nonOperatingNet":5367,"pretaxIncome":16643,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":1.29,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["umc-src-q1","umc-src-q3fs"],"claimIds":[],"normalizationNote":"完整歷史歸母稅後特殊損益尚未逐項勾稽；不能把未揭露填0。"},{"id":"umc-eq-2026Q2","period":"2026Q2","periodType":"quarter","currency":"TWD","scale":"million","revenue":68733,"operatingIncome":14950,"nonOperatingNet":30236,"pretaxIncome":45186,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":3.39,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["umc-src-q2","umc-src-q3fs"],"claimIds":[],"normalizationNote":"完整歷史歸母稅後特殊損益尚未逐項勾稽；不能把未揭露填0。"},{"id":"umc-eq-2026Q3","period":"2026Q3","periodType":"quarter","currency":"TWD","scale":"million","revenue":74239.117,"operatingIncome":18642.533,"nonOperatingNet":1268.401,"pretaxIncome":19910.934,"incomeTax":null,"netIncomeAttributable":null,"reportedEps":1.32,"normalizedEps":null,"weightedAverageShares":null,"shareholdersEquity":null,"adjustments":[],"sourceIds":["umc-src-q3fs"],"claimIds":[],"normalizationNote":"完整歷史歸母稅後特殊損益尚未逐項勾稽；不能把未揭露填0。"},{"id":"umc-eq-2026YTD","period":"2026YTD","periodType":"ytd","currency":"TWD","scale":"million","revenue":204009.681,"operatingIncome":44868.934,"nonOperatingNet":36871.951,"pretaxIncome":81740.885,"incomeTax":7010.957,"netIncomeAttributable":74865.383,"reportedEps":6,"normalizedEps":null,"weightedAverageShares":12475,"shareholdersEquity":470916.768,"adjustments":[{"id":"umc-eq-mark","category":"equity_method","realization":"unrealized","pretaxAmount":17000,"epsImpact":null,"equityImpact":null,"method":"迅捷持聯電441.371百萬股×(154.5-49.1)元×聯電持迅捷36.49%=約169.8億元；非官方單列的稅後收益。","sourceIds":["umc-src-q3fs","umc-src-20f","umc-src-model"],"claimIds":["umc-claim-sensitivity"],"notes":"研究估算；所得稅及非控制權益未知，不得直接扣除全部權益法收益281億元。"}],"sourceIds":["umc-src-q3fs"],"claimIds":[],"normalizationNote":"2026YTD法定EPS6.00元、權益法收益281.01億元占稅前34.4%；迅捷自身股票評價約170億元僅為稅前近似，歷史正常化EPS保持null。"}],"qualitativeFlags":["cross_holding","spv","accounting_policy_difference"],"l2":{"status":"PASS","summary":"已核對2026年第三季財報揭露的關聯企業投資收益，以及迅捷、焱元等關聯企業持有聯電股票的情況，並對照年度申報財報的庫藏股處理。惟相關所得稅、真正歸屬聯電股東的金額，以及股東權益的列報差異仍須逐項確認。","sourceIds":["umc-src-q3fs","umc-src-20f","umc-src-model"],"claimIds":["umc-claim-equity","umc-claim-cross","umc-claim-sensitivity"]},"valuation":{"epsBasis":"normalized","prospectiveModelOnly":true,"doubleCountChecked":true,"notes":"2027年悲觀、基準、樂觀三種情境的每股盈餘分別為4.6、5.8及7.1元，是依未來正常營運獨立預測；沒有把2026年特殊投資評價收益重複扣除。2026年前三季扣除特殊收益後的實際每股盈餘仍待驗證。 2028年額外資本預算尚無完整分年現金支出、折舊和新增收入橋接，因此新增獨立折舊壓測，但不直接降低原2028基準EPS，以免重複扣除或虛構時程。"},"notes":"資料截止2026年11月13日；股價101.5元為當日研究基準價。關聯企業投資收益與自行持股評價會計處理須以公開財報附註和持股結構查核，不能把估算值直接當作稅後獲利。"}','6efd77c4aaff47e3b7bf28e5f0e94a9efa5f0073726400e0c6e086d173bd73e9','2026-11-13')
ON CONFLICT(id) DO UPDATE SET report_id=excluded.report_id,company_id=excluded.company_id,as_of_date=excluded.as_of_date,review_status=excluded.review_status,l2_status=excluded.l2_status,payload_json=excluded.payload_json,payload_hash=excluded.payload_hash,updated_at=excluded.updated_at;


-- Remove stale rows only after all canonical rows have been upserted.

DELETE FROM research_financial_actuals WHERE company_id='umc-2303' AND id NOT IN ('umc-a-2025Q4','umc-a-2026Q1','umc-a-2026Q2','umc-a-2026Q3');

DELETE FROM research_monthly_revenue WHERE company_id='umc-2303' AND id NOT IN ('umc-month-1','umc-month-2','umc-month-3','umc-month-4','umc-month-5','umc-month-6','umc-month-7','umc-month-8','umc-month-9','umc-month-10');

DELETE FROM research_segments WHERE company_id='umc-2303' AND id NOT IN ('umc-seg-node-0','umc-seg-node-1','umc-seg-node-2','umc-seg-node-3','umc-seg-app-0','umc-seg-app-1','umc-seg-app-2','umc-seg-app-3');

DELETE FROM research_forecasts WHERE company_id='umc-2303' AND id NOT IN ('umc-f-2027-bear','umc-f-2027-consensus','umc-f-2027-bull','umc-f-2028-bear','umc-f-2028-consensus','umc-f-2028-bull');

DELETE FROM research_capacity_events WHERE company_id='umc-2303' AND id NOT IN ('umc-cap-0','umc-cap-1','umc-cap-2','umc-cap-3');

DELETE FROM research_catalysts WHERE company_id='umc-2303' AND id NOT IN ('umc-cat-0','umc-cat-1','umc-cat-2','umc-cat-3');

DELETE FROM research_risks WHERE company_id='umc-2303' AND id NOT IN ('umc-risk-0','umc-risk-1','umc-risk-2','umc-risk-3','umc-risk-4');

DELETE FROM research_signal_rules WHERE company_id='umc-2303' AND id NOT IN ('umc-rule-0','umc-rule-1','umc-rule-2','umc-rule-3','umc-rule-4','umc-rule-5');

DELETE FROM research_signal_snapshots WHERE company_id='umc-2303' AND id NOT IN ('umc-signal-0','umc-signal-1','umc-signal-2','umc-signal-3','umc-signal-4','umc-signal-5');

DELETE FROM research_sources WHERE company_id='umc-2303' AND id NOT IN ('umc-src-q3fs','umc-src-q3','umc-src-q2','umc-src-q1','umc-src-months','umc-src-overview','umc-src-20f','umc-src-price','umc-src-model','umc-src-capexboard','umc-src-q3call','umc-src-firstcapital-20261102','umc-src-hongyuan-20261029');

DELETE FROM research_reports WHERE company_id='umc-2303' AND id NOT IN ('umc-2303-report-v1-1');

DELETE FROM research_report_sections WHERE report_id='umc-2303-report-v1-1' AND id NOT IN ('umc-sec-1','umc-sec-2','umc-sec-3','umc-sec-4','umc-sec-5','umc-sec-6','umc-sec-7','umc-sec-8','umc-sec-9','umc-sec-10','umc-2303-report-v1-1-dashboard');
