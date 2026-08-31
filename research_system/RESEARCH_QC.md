# Research Quality Control

P1.8 QC specification。定義發布要求及工具目前涵蓋範圍；操作與交付範本見 [Workflow](RESEARCH_WORKFLOW.md)，人工視覺驗收見 [Style Guide](RESEARCH_STYLE_GUIDE.md)。

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
| D1 | `npm.cmd run research:import -- vpec-2455 --local`（正式環境明確改 --remote） | Migrations、匯入、run ID + package hash + imported status、12 個 collection 表筆數；D1 import verified + RESULT: IMPORTED | 非逐欄比較、不回讀全部 hash、不驗證 artifact QC 或發布狀態 |
| Standalone | `npm.cmd run report:export -- vpec-2455` | Metadata、source pages、payload profile／slug、部分外部依賴模式、本機網站 HTML 逐 byte 相等；READY TO DELIVER | 無瀏覽器排版、未偵測所有網路 API／資源類型、不代表線上網站相同 |
| Rendered layout | `npm.cmd run report:qc -- vpec-2455` | Export 後以 Chrome／Edge 開 local HTML，驗證兩個 viewport runtime diagnostics；READY TO PUBLISH | Dashboard、Laptop、其他 profile、可讀性、互動點擊、全部 runtime errors、斷網封鎖 |
| Release review | 人工填 handoff | 內容、來源、單位、假設、操作、離線及實際站點驗收 | 尚無統一 CLI 或發布狀態 gate |

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

自動 blocking 條件：diagnostics 缺失或 JSON 無法解析、browser timeout／非零退出、QC version 不是 `p1.6-layout-qc`、profile 不符、頁數／導覽點不等於 full-research expectedPages（目前 14）、任何 layout fallback、超過 1 CSS px 的 overflow／clipping、兩方向皆超過 1 px 的 top-level overlap，或 document 水平溢出超過 1 px。

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

Importer 不先 materialize，也不以 reportHash null 阻擋匯入。Remote import 前應已有本次 QC 通過的 HTML。CI 目前在 deploy 的 materialization 前匯入，有記錄舊 report hash 的風險，後續發布流程應調整順序並驗證 artifact。

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

## CI gate：現況與後續要求

`.github/workflows/deploy-cloudflare.yml` 在 push main／手動觸發時執行：安裝 → research:check → Wrangler 設定／types → remote migrations → remote importer → deploy。它**尚未執行 report:qc 或人工內容 gate**。手動 deploy 也沒有這些保護；目前發布者須依操作規範先完成驗收，不能宣稱系統已自動攔下所有品質失敗。

後續自動發布工程的 Definition of Done：

1. Remote mutation 前先完成 package、生成、export／layout QC，保存 commit、profile、環境及 artifact hash；同份候選內容再匯入／部署。
2. 必要自動檢查 FAIL／NOT_RUN 以非零狀態阻擋；人工驗收有明確紀錄及發布前 gate。
3. QC／匯入失敗不能標記 published；部署失敗有可查狀態與恢復程序，不宣稱跨服務原子交易。
4. 發布紀錄關聯 artifact、hash、QC、run、實際 URL，保留不可變歷史證據。
5. 用故意失敗案例驗證 gate；先明定 docs-only push 的部署政策。

以上為待實作要求，P1.8 不修改 CI、資料庫或網站程式。
