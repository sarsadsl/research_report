# P1 — Research Publishing System Roadmap

## 目標與範圍

建立可重複執行的研究發布流程：Sources → Research Package → Validate／Generate → Report／QC → D1 import → Deploy／Standalone handoff。

Research Package 是研究資料唯一人工維護來源。D1、fallback 與 Full Report 都是衍生資料；P1.10 起正式報告直接由 package sections 產生。

P1.8 依實際提交與 CLI 校正本表。舊 roadmap 將 P1.6 命名為 one-command publishing、P1.7 命名為 second-company proof；兩者仍是後續工作，**不能因編號沿用而視為完成**。

## 已交付階段

| 階段 | 實際交付 | 驗證與限制 |
| --- | --- | --- |
| P1.0 | 初版 Workflow、Data Schema、Style Guide、QC、roadmap（9d75012） | 初始規範，未全部由程式強制 |
| P1.1 | Package／manifest、schema、2455 參考資料（6808176） | Validator 可接受，來源真實性仍需審閱 |
| P1.2 | Validator、fallback／D1 seed generator（595754c） | 先驗證再生成，research:check 檢查一致性與測試 |
| P1.3 | Package 驅動 Dashboard（c2231c5） | 2455 參考實作；列表 repository 仍有固定年份等限制 |
| P1.4 | Full-research baseline、experiment-summary profiles（52b254b、ab76c0b） | 完整報告保留 legacy，實驗版有通用 renderer |
| P1.5 | Standalone exporter（3af07d9） | 網站 HTML 逐 byte 複製、靜態檢查，未凍結 runtime DOM |
| P1.6 | Rendered layout QC（b05c8a1、54930be） | Desktop／mobile 瀏覽器檢查，未接入 deploy CI |
| P1.7 | Verified D1 importer（35f57a5） | Dry-run、migrations、hash／run metadata、12 表筆數、idempotent 重跑，非發布 gate |
| P1.8 | 操作規範及驗收文件整理 | 按下列 DoD 驗收，不改 runtime、CI 或正式資料 |
| P1.9 | 自動發布 gate、hash 一致性與 release artifacts | 先建置／QC 再遠端匯入／部署；純文件分流；人工 gate 與 lifecycle 仍待實作 |
| P1.10 | 新報告 intake、通用 Full Report、第二家公司回歸 fixture | 頁數內容驅動；移除 2455 legacy renderer 與固定 2027F 清單；合成 fixture 不發布 |

## P1.8 — Workflow、Style Guide、QC specification

交付：

- [Workflow](RESEARCH_WORKFLOW.md)：來源分類、操作順序、local／remote 範圍、hash 定義、lifecycle 限制、失敗處理、handoff 範本。
- [Style Guide](RESEARCH_STYLE_GUIDE.md)：資料呈現、來源／估計標示、圖表、頁數、跨裝置、互動與 standalone 驗收。
- [QC Specification](RESEARCH_QC.md)：PASS／FAIL／WARN／NOT_RUN、門檻、證據、自動／人工覆蓋範圍與未實作 CI gate。
- [README](../README.md)：規範入口、正確命令、發布副作用及已知限制。
- 本 roadmap：編號符合實際交付，保留尚未達成的原始目標。

Definition of Done：

- 現有 npm 命令皆可在 package.json 找到；不存在的 publish CLI 清楚標為未實作。
- Generated files、tracked legacy HTML、standalone 的維護界線明確。
- 不把匯入筆數、run status 或單一 CLI READY 當成完整發布／內容驗收證據。
- Windows stale／換行、stash 未追蹤產物、Cloudflare 授權失敗有不破壞資料的操作說明。
- Remote import、deploy、push main 的外部副作用明確標示，文件修改不自行發布。
- 文件連結／命令、diff 及現有 regression tests 檢查通過，沒有不相關修改。

## P1.9 — 自動發布 gate 與稽核串接

交付 [Publishing 操作規範](RESEARCH_PUBLISHING.md)、research:publish 命令、共用 CI／deploy gate、docs-only 檢查、每輪獨立 release 證據、D1 source／seed／report hash 回讀與故意失敗測試。

Definition of Done：前置資料／build／QC／hash 失敗不執行遠端 D1 或 deploy；通過後使用同份已建置報告；來源／build／artifact 漂移有檢查；匯入失敗阻擋部署；保存 commit、QC、hash、run ID、部署結果；docs-only 不觸發 remote；測試與完整 dry-run 通過。

此階段不實作人工內容 gate、lifecycle 轉移或永久歷史儲存。CI artifact 保留 30 天，D1／Worker 並非跨服務交易。

## 後續工作（未完成）

### 發布 gate 與稽核串接

P1.9 已接上自動 build／QC → D1 → deploy 及 artifact 紀錄。接著補人工內容 gate、部署後完整驗收與長期稽核保存。

完成條件：FAIL／NOT_RUN 能阻擋發布，匯入／部署對應同份驗收內容，回報版本、hash、QC、run ID、URL 與部署結果，失敗案例測試證明 gate 有效。

### Lifecycle、存取控制、歷史保存

將 draft → review → published → archived 從欄位約定提升為受控流程，保留不可變 artifact；草稿不得透過 fallback 或 static URL 外洩。

完成條件：讀取限制及狀態轉移有測試，更新不覆寫發布歷史，重跑匯入不偽造發布結果。

### 通用 Full Report 與第二家公司（P1.10 已完成）

把 legacy 正文移到 package／通用 section renderer，頁數內容驅動，移除公司／固定年份耦合；加入不同 KPI／章節的第二家公司。

完成結果：`research:intake` 建立 source-first 工作區；`package.sections` 決定 Full Report 章節與頁數；focus KPI 與 headline year 已資料化；2455 通過 export、desktop／laptop／mobile、offline gate，合成第二家公司 fixture 以不同 KPI、年份及六章配置通過 renderer 測試。內容與來源審閱仍是人工驗收。

## 交付與 legacy 邊界

- 在 main 使用小型可恢復 commit，保留無關使用者變更；非 docs-only push 會觸發發布 gate，須依發布範圍處理。
- 阻擋檢查未過不得宣告該階段完成；資料正確優先於閱讀性、視覺及少頁數。
- 不提交 exports 或新生成 experiment HTML；既有 tracked `public/research/reports/vpec-2455.html` 由通用 renderer 重建，作為網站發布 artifact。
- `report_sources/vpec-2455.v4.*` 與 v7 layout 僅保留歷史參考，不再參與 materialize、export 或 publish。
- 區分官方事實、第三方資料、市場共識、研究推論。P1.8 文件驗收不等於新研究內容通過發布驗收。
