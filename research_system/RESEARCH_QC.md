# Research Quality Control

P1.8 QC specification，於 P1.9 更新自動發布 gate。操作與交付範本見 [Workflow](RESEARCH_WORKFLOW.md)，人工視覺驗收見 [Style Guide](RESEARCH_STYLE_GUIDE.md)，發布紀錄見 [Publishing](RESEARCH_PUBLISHING.md)。

## 結果與阻擋規則

- `PASS`：指定檢查已執行且通過，保存環境、版本及證據。
- `FAIL`：缺陷未修正，阻擋相關匯入／交付／發布。
- `WARN`：非阻擋風險，記錄原因、影響與處理方式，不用來淡化 FAIL。
- `NOT_RUN`：未檢查，不等於通過；必要項目未跑一律阻擋發布。

所有必要自動及人工檢查皆 PASS、WARN 已記錄，才可填 `READY_TO_PUBLISH`，否則 `BLOCKED`。單一命令 READY 不代表整體 gate 通過。

## 目前實作與證據

| Gate | 執行方式 | 現有檢查／成功證據 | 未涵蓋 |
| --- | --- | --- | --- |
| Package | `npm.cmd run research:validate -- vpec-2455` | Schema、身分與版本、ID／引用、日期／欄位限制、部分 domain rules；JSON result PASS、canonical hashes | 來源真實性、外連可用性、全部公式重算及經濟語意 |
| Generated + regression | `npm.cmd run research:check` | Validator + generator --check + 現有 Node tests，exit 0 | 瀏覽器排版、D1、正文審閱；slug 固定 2455 |
| Import plan | `npm.cmd run research:import -- vpec-2455 --dry-run` | 本機 package／generated 檢查、hash 與預期筆數；DRY RUN | 不連 D1，不能證明權限、migration 或實際資料 |
| D1 | `npm.cmd run research:import -- vpec-2455 --local`（正式發布使用 publish gate） | Migrations、匯入、run ID + package hash + imported status、source／seed／report hash 回讀、12 表筆數 | 非逐欄比較；低階 importer 不代表完整發布 |
| Standalone | `npm.cmd run report:export -- vpec-2455` | Metadata、source pages、payload profile／slug、部分外部依賴模式、本機網站 HTML 逐 byte 相等；READY TO DELIVER | 無瀏覽器排版、未偵測所有網路 API／資源類型、不代表線上網站相同 |
| Rendered layout | `npm.cmd run report:qc -- vpec-2455` | Export 後以 Chrome／Edge 開 local HTML，驗證兩個 viewport runtime diagnostics；READY TO PUBLISH | Dashboard、Laptop、其他 profile、可讀性、互動點擊、全部 runtime errors、斷網封鎖 |
| Automated release | `npm.cmd run research:publish -- vpec-2455 --dry-run`（正式改 --remote） | 資料／測試、build、QC、hash seal；正式才匯入／部署並保存結果 | 不強制人工 handoff，不做 lifecycle transition |
| Release review | 人工填 handoff | 內容、來源、單位、假設、操作、離線及實際站點驗收 | 人工部分尚未自動記錄／強制 |

實作位於 `scripts/research-lib.mjs`、`research-generate.mjs`、`research-import.mjs`、`research-import-lib.mjs`、`report-exporter.mjs`、`report-qc.mjs` 與 `report_sources/vpec-layout-v7.js`。命令以 exit code 判定成功，不可只看到前段 metadata 的 imported status 就宣告完成。

## Package 與資料驗收

下列為必要 blocking 要求，工具未涵蓋部分由人工檢查：

- Manifest／package schema 與版本受支援，身分、reportVersion 一致；必要陣列及輸出存在，ID 與 composite keys 唯一。
- Source、claim、input claim、section payload 引用可解析；估計有分類，推論有方法及輸入；來源確實支持對應結論。
- 日期、期間、單位、幣別、scale 一致；相同 metric／period／scenario 不得衝突；未揭露值不能補成官方事實。
- 現有 validator 對多筆、非估計且 share 皆為數字的 segment period 檢查合計 `100 ± 0.5`，不是所有 segment group 都檢查。
- 現有 validator 在 bear／consensus／bull 都有數值時，檢查 revenue 與 EPS 的 `bear <= consensus <= bull`；其他指標與方法人工審查。
- Dashboard、完整正文、表格、圖表、standalone 的重要數字逐項對照 package。D1 同筆數不代表同內容，重要 KPI 須從目標環境/API 核對。
- Requested outputs 缺漏、缺來源標籤、必要單位／期間／方法不明均阻擋。

來源過舊、重要結論依賴低信心來源、缺選擇性比較期間可記 WARN；若已無法支持結論，升為 FAIL。目前沒有自動 freshness policy 或 confidence gate，不得把未執行的檢查填 PASS。

## 排版門檻與 viewport

現有 report:qc 只測 full-research：

| Viewport | 尺寸 | 驗收方式 |
| --- | --- | --- |
| Desktop | 1440 × 1000 | 自動幾何 + 人工逐頁 |
| Laptop | 1280 × 800 | 人工，目前未列入 CLI |
| Mobile portrait | 390 × 844 | 自動幾何 + 人工可讀性／觸控 |

Manifest quality booleans 是需求宣告；目前 CLI viewport／profile 固定，未從 manifest 生成任意測試矩陣。其他必要裝置／profile 須另外驗收。

自動 blocking 條件：diagnostics 缺失或 JSON 無法解析、browser timeout／非零退出、QC version 不是 `p1.6-layout-qc`、profile 不符、頁數／導覽點不等於 full-research payload 的實際 renderedPages、任何 layout fallback、超過 1 CSS px 的 overflow／clipping、兩方向皆超過 1 px 的 top-level overlap，或 document 水平溢出超過 1 px。

P1.9 另要求回讀的 CSS viewport 與上述尺寸完全一致，並檢查載入期間的 pageerror。透過 puppeteer-core 設定 viewport，不再依賴可能被瀏覽器限制的 window-size。CI 安裝 Noto CJK 作中文字體 fallback。

Overlap／clipping 只量測 `.page-inner` 的可見直接子元素，排除 absolute／fixed 元素，不涵蓋所有巢狀元素或遮擋。自動通過後仍須人工確認正文、表格、圖表、來源、頁尾，不能因幾何陣列為空就認定可讀。

人工 blocking 檢查：

- 缺必要章節、隱藏內容、字體過小、表格不完整、狀態只靠顏色、來源與結論分離。
- 上／下一頁、頁碼、Fit／50／75／100／125% 失效；resize 後越界；鍵盤焦點不可見或操作不可達。
- Runtime error、pagination 未完成、控制項遮正文、重要資訊依賴 hover。
- Dashboard／experiment-summary 畫面或互動失敗，不能用 full-research PASS 代替。

## Standalone 與離線

對本次輸出的檔案斷開網路，或在瀏覽器停用網路後重新載入，以 local file 開啟；逐頁確認正文、圖表、切頁、縮放及來源文字。來源外連可需要網路，必要閱讀功能不可需要網路。

缺／空檔、缺 report hash、必要外部 request、local file 無法開啟、與網站重要內容不同、runtime pagination 未完成均 FAIL。CLI 靜態字串檢查及 local-file headless 載入並未封鎖網路，不能替代人工離線測試。

保留目前 v7 safe pagination 與隱藏 diagnostics，現有 Full Report 仍依賴它們。排除 obsolete/debug scripts 的原則不代表移除必要 runtime。生成後有更動就重驗並更新 hash。

## 匯入及發布證據

Local／remote 結果分開記錄。research_runs 不儲存 QC；run 寫入在後驗證之前，後驗證失敗時可能已存在 imported 紀錄。來源附件 hash、不可變 artifact history、完整逐欄核對尚未實作。Hash 定義與重跑行為見 Workflow。

低階 importer 不先 materialize，也不以 reportHash null 阻擋匯入。P1.9 publish 及 CI 已改為先 build／QC、核對 public／standalone／built assets hashes，再匯入；部署前不重建報告。手動繞過發布入口直接操作 importer／Wrangler 仍不具有相同保護。

以下為人工填寫的摘要，未整合到 CLI；不得把範例當實測結果：

```text
Research: <company> <ticker> <slug>
Commit / environment / checked-at: <values>
Package: <version> <canonical hash>
Report: <version> <artifact hash>
Database local / remote: PASS|FAIL|NOT_RUN
Claims/Sources: PASS|FAIL|NOT_RUN
Dashboard: PASS|FAIL|NOT_RUN
Full Report: PASS|FAIL|NOT_RUN
Pages: <count>
Overflow / overlap / clipping / fallback: <counts or NOT_RUN>
Desktop / laptop / mobile: PASS|FAIL|NOT_RUN
Keyboard/zoom: PASS|FAIL|NOT_RUN
Standalone/offline: PASS|FAIL|NOT_RUN
Warnings: <reason and disposition>
Result: READY_TO_PUBLISH|BLOCKED
Deployment: <not deployed or actual result and URL>
```

## CI gate：P1.9 現況與後續要求

`.github/workflows/deploy-cloudflare.yml` 先判斷變更範圍並檢查文件。非 docs-only 變更及手動 dispatch 執行 P1.9 publish：validate → build → candidate → QC → seal → import → deploy。自動 QC FAIL／缺漏、artifact 漂移會阻擋遠端操作；失敗與成功都嘗試上傳證據 30 天。`npm run deploy` 走同一入口。人工內容 gate 尚未實作，仍須發布者完成。

已實作：發布前自動資料／排版 gate、hash 一致性核對、故意失敗測試、docs-only 分流及 release artifact。後續工作：

1. 將人工驗收紀錄接入發布前 gate，擴充 Laptop／其他 profile 的自動覆蓋。
2. 實作 lifecycle 轉移及未公開內容存取限制；目前 publisher 僅接受既有 published package。
3. 長期不可變歷史存放與跨服務恢復程序；CI artifact 有保留期限，D1 與 Worker 不是單一交易。

P1.9 的 DEPLOYED 只表示自動發布流程成功，不等於所有人工品質項目已 PASS。
