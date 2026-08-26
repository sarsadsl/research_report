PRAGMA foreign_keys = ON;

INSERT OR REPLACE INTO research_companies
(id,ticker,market,name,slug,sector,industry,currency,description,status,created_at,updated_at)
VALUES
('vpec-2455','2455','TW','全新光電','vpec-2455','半導體','化合物半導體 / 光通訊','TWD','聚焦 III-V 化合物半導體磊晶，研究主軸為 AI 光通訊帶動光電子占比提升。','active','2026-08-26','2026-08-26');

INSERT OR REPLACE INTO research_financial_actuals VALUES
('vpec-25q4','vpec-2455','2025Q4',2025,4,959.6,357.6,37.27,209.0,21.78,194.0,20.22,1.05,'年度財報拆分與研究資料交叉核對','2026-08-26'),
('vpec-26q1','vpec-2455','2026Q1',2026,1,959.3,365.4,38.09,226.7,23.63,195.1,20.34,1.06,'官方財務報告','2026-08-26'),
('vpec-26q2','vpec-2455','2026Q2',2026,2,965.4,372.7,38.61,223.8,23.18,213.6,22.13,1.15,'官方財務報告','2026-08-26');

INSERT OR REPLACE INTO research_monthly_revenue VALUES
('vpec-2607','vpec-2455',2026,7,422.1,29.48,45.12,'2026-08-26');

INSERT OR REPLACE INTO research_segments VALUES
('vpec-25q4-micro','vpec-2455','2025Q4','微電子',678.4,70.7,0,'2026-08-26'),
('vpec-25q4-opto','vpec-2455','2025Q4','光電子',281.2,29.3,0,'2026-08-26'),
('vpec-26q1-micro','vpec-2455','2026Q1','微電子',718.0,74.9,0,'2026-08-26'),
('vpec-26q1-opto','vpec-2455','2026Q1','光電子',241.3,25.1,0,'2026-08-26'),
('vpec-26q2-micro','vpec-2455','2026Q2','微電子',703.7,72.9,0,'2026-08-26'),
('vpec-26q2-opto','vpec-2455','2026Q2','光電子',261.7,27.1,0,'2026-08-26'),
('vpec-2607-opto','vpec-2455','2026/07','光電子',168.8,40.0,1,'2026-08-26');

INSERT OR REPLACE INTO research_forecasts VALUES
('vpec-26-bear','vpec-2455',2026,'bear',4197,39.03,889,4.76,35.0,'市場區間低端 / 保守情境','2026-08-26'),
('vpec-26-consensus','vpec-2455',2026,'consensus',4470,40.6,1026,5.55,35.8,'五份最新去識別化研究模型中位數','2026-08-26'),
('vpec-26-bull','vpec-2455',2026,'bull',4581,40.30,1071,5.73,NULL,'投顧自研樂觀情境，未明示精確光電子占比','2026-08-26'),
('vpec-27-bear','vpec-2455',2027,'bear',4946,40.59,NULL,6.19,43.3,'市場區間低端 / 保守情境','2026-08-26'),
('vpec-27-consensus','vpec-2455',2027,'consensus',5870,44.8,NULL,8.55,51.0,'五份最新去識別化研究模型中位數','2026-08-26'),
('vpec-27-bull','vpec-2455',2027,'bull',6943,45.62,NULL,11.02,50.1,'投顧自研樂觀情境；光電子占比為 >50% 的展示值','2026-08-26');

INSERT OR REPLACE INTO research_capacity_events VALUES
('vpec-mocvd-base','vpec-2455','2026-03','公司揭露現有 MOCVD 基準','MOCVD','mixed',0,62,NULL,NULL,'actual','公司公開資訊：現有約 62 台。'),
('vpec-mocvd-5','vpec-2455','2026-Q2','第一階段擴產 +5 台','MOCVD','4 InP + 1 GaN',5,62,'2026-2027',NULL,'ramping','工具數由 62 推導至 67，gross tool count 約 +8.1%。'),
('vpec-mocvd-7','vpec-2455','2026-Q3','最新累計規劃 +7 台','MOCVD','6 InP + 1 GaN',7,62,'2028',NULL,'planned','相對 62 台工具數約 +11.3%；後追加 2 台偏 2028 完成。'),
('vpec-ebeam','vpec-2455','2026-Q2','CW Laser 二次磊晶設備','E-Beam','CW Laser',1,NULL,NULL,NULL,'planned','研究資料稱為第 3 台 E-Beam。');

INSERT OR REPLACE INTO research_catalysts VALUES
('vpec-cat-inp','vpec-2455','InP 基板供應改善','high','watch','供應改善可同時釋放既有設備與新機 utilization。','2026-08-26'),
('vpec-cat-200g','vpec-2455','200G PD 放量','high','active','Data Center receive-side 新一代產品放量。','2026-08-26'),
('vpec-cat-cw','vpec-2455','CW Laser / 發射端產品','high','watch','若由小量轉為可見營收，可進一步提高 ASP 與 mix。','2026-08-26'),
('vpec-cat-mocvd','vpec-2455','新增 InP MOCVD 到位','medium','watch','重點不是到機本身，而是 qualification 與 utilization。','2026-08-26');

INSERT OR REPLACE INTO research_risks VALUES
('vpec-risk-inp','vpec-2455','InP 原料 / 出口許可再度受阻','high','medium','watch','若供應再度不規則，光電子出貨可能再次受壓。','2026-08-26'),
('vpec-risk-mix','vpec-2455','光電子占比未如期提升','high','medium','watch','2027 模型對 mix 高度敏感。','2026-08-26'),
('vpec-risk-ramp','vpec-2455','新機與新產品 ramp 延遲','medium','medium','watch','折舊可能先於營收，壓抑短期 GM / OP margin。','2026-08-26'),
('vpec-risk-micro','vpec-2455','微電子需求偏弱','medium','medium','watch','若手機/RF 轉弱，光電子需更快成長才能抵消。','2026-08-26');

INSERT OR REPLACE INTO research_signal_rules VALUES
('vpec-rule-revenue','vpec-2455','月營收','>= 4.2 億且可延續','4.0-4.2 億附近','< 4.0 億且連續回落',1.2,'先看 H2 run-rate 是否達標'),
('vpec-rule-opto','vpec-2455','光電子占比','>= 40% 並往 45-50%','35-40%','低 30% 或更低',1.5,'核心結構指標'),
('vpec-rule-gm','vpec-2455','毛利率','>= 41-42%','38-41%','< 38%',1.4,'驗證 mix / ASP 是否轉化'),
('vpec-rule-inp','vpec-2455','InP 供應','供應順暢','偶有遞延 / 許可不穩','明顯卡關',1.2,'原料是重要先行指標'),
('vpec-rule-util','vpec-2455','MOCVD utilization','新機到位且 utilization 上升','ramp / 認證中','低利用率且折舊先行',1.0,'設備效益的核心'),
('vpec-rule-product','vpec-2455','新產品','200G PD / CW Laser 明顯放量','小量出貨','認證或量產延後',1.0,'新產品放量驗證');

INSERT OR REPLACE INTO research_signal_snapshots VALUES
('vpec-sig-revenue','vpec-2455','2026-08-26','月營收','green','2026/07 4.22 億','official','單月創高，仍需 8-12 月延續'),
('vpec-sig-opto','vpec-2455','2026-08-26','光電子占比','green','2026/07 研究估計 >40%','research_estimate','非官方 segment disclosure'),
('vpec-sig-gm','vpec-2455','2026-08-26','毛利率','yellow','26Q2 38.61%','official','仍需 H2 站穩 40% 以上'),
('vpec-sig-inp','vpec-2455','2026-08-26','InP 供應','yellow','供應改善中','company_research','仍需觀察供應連續性'),
('vpec-sig-util','vpec-2455','2026-08-26','MOCVD utilization','yellow','新機 ramp 待驗證','company_research','設備到位不等於有效產能'),
('vpec-sig-product','vpec-2455','2026-08-26','新產品','green','200G PD / CW Laser 放量訊號','company_research','需確認營收貢獻持續擴大');

INSERT OR REPLACE INTO research_sources VALUES
('vpec-src-official','vpec-2455','official','公司公開資訊','2026Q1/Q2 財報與公司公開資訊','2026-08-26',NULL,NULL,'已公布實績與設備資訊優先使用官方資料。','high'),
('vpec-src-consensus','vpec-2455','market_research','市場共識','去識別化市場研究模型集合','2026-08-26',NULL,NULL,'五份最新國內機構 / 外資研究模型中位數與區間。','medium'),
('vpec-src-prop','vpec-2455','proprietary_research','投顧自研樂觀情境','投顧自研樂觀模型','2026-08-18',NULL,'全新.pdf','只作樂觀情境比較，不覆蓋官方已公布實績。','medium');

INSERT OR REPLACE INTO research_reports VALUES
('vpec-report-v1','vpec-2455','全新光電 2455｜2025Q4-2027F 深度研究','vpec-2455','聚焦已實現財報改善、光電子營收占比、2026F/2027F 情境、MOCVD 產能與紅綠燈結論。','核心論述是 InP 供應 → utilization → 光電子營收 → mix → GM → OP margin → EPS 的連續轉化。','published','1.0','/research/reports/vpec-2455.html',NULL,'2026-08-26','2026-08-26','2026-08-26');

INSERT OR REPLACE INTO research_report_sections VALUES
('vpec-sec-01','vpec-report-v1','actuals','已實現財報變化',1,NULL),
('vpec-sec-02','vpec-report-v1','mix','營收結構與光電子占比',2,NULL),
('vpec-sec-03','vpec-report-v1','profitability','獲利品質與毛利率驅動',3,NULL),
('vpec-sec-04','vpec-report-v1','2026f','2026F 驗證',4,NULL),
('vpec-sec-05','vpec-report-v1','2027f','2027F 與 CAGR',5,NULL),
('vpec-sec-06','vpec-report-v1','risk','情境、風險與追蹤',6,NULL),
('vpec-sec-07','vpec-report-v1','capacity','產能擴充量化',7,NULL),
('vpec-sec-08','vpec-report-v1','signal','紅綠燈結論',8,NULL);
