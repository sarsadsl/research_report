# P1.9 — Gated Research Publishing

P1.9 將自動資料／排版 gate 接入正式發布。人工來源核對、完整正文一致性、可讀性、無障礙及真正離線驗收仍依 [Workflow](RESEARCH_WORKFLOW.md) 與 [QC](RESEARCH_QC.md) 執行；本命令不代表這些人工項目已通過，也不實作 draft／review 狀態轉移。

## 命令與範圍

在 repo 根目錄執行。現階段只支援 `vpec-2455`，需安裝相容 Node、專案 dependencies、Chrome／Edge，以及有效的 `wrangler.jsonc`。

```powershell
# 建置、export、真實瀏覽器 QC、保存證據；不寫遠端 D1、不部署
npm.cmd run research:publish -- vpec-2455 --dry-run

# 同一完整流程，通過後才匯入遠端 D1 並部署
npm.cmd run research:publish -- vpec-2455 --remote
```

未指定旗標時也是 dry-run。Remote 要求研究內容已人工審閱、package report status 是 published，且來源工作區已提交；生成的 report HTML 可有差異，不需提交。這只是沿用現有 published package 的發布，不會自動把 draft 改為 published。

`npm.cmd run deploy` 及舊 `node scripts/run-cloudflare.mjs deploy` 都導向這個 gate。沒有 skip-QC／skip-build 選項。預覽命令不寫入遠端，維持原行為。

低階 `research:import --remote`、Wrangler 及 Cloudflare dashboard 仍能直接維護遠端資源；P1.9 是專案發布入口的保護，不是 Cloudflare 帳號的權限邊界。維護命令不可當成已通過發布流程的替代證據。

## 執行順序

| 階段 | 動作 | 失敗影響 |
| --- | --- | --- |
| validate | Package/schema、generated 一致性、全部現有 tests、發布目標與來源狀態 | 不建置、不寫 D1、不部署 |
| build | OpenNext 建置，Next build 內生成網站 report | 不寫 D1、不部署 |
| candidate | 核對來源未漂移、所有 profile 的 public／built assets 逐 byte 一致，計算 build/report hashes | 不寫 D1、不部署 |
| qc | 對已建置的同份報告 export、Desktop／Mobile 瀏覽器檢查，不再 materialize | 不寫 D1、不部署 |
| seal | 再核對來源、整個 .open-next tree、HTML／standalone hashes，保存交付副本 | 不寫 D1、不部署 |
| import | 最後核對後，執行現有 importer 的 migrations、SQL、筆數與 hash 後驗證 | 不部署；D1 可能已有部分變更，不宣稱回滾 |
| deploy | 再次核對 hashes，直接部署已建置 Worker/assets，不重跑 OpenNext 或 materialize | 保存失敗階段；不回滾已匯入 D1 |

乾跑在 seal 後停止，結果為 `VALIDATED_NOT_DEPLOYED`；正式成功為 `DEPLOYED`；失敗為 `FAILED` 且 CLI 非零退出。尚未執行階段為 NOT_RUN。進程被強制終止時紀錄可能停在 RUNNING，須視為結果未知，先確認外部狀態再重跑。

QC 必須同時包含 desktop、mobile、正確 report hash、website parity、頁數、導覽點及完整幾何結果；缺少陣列或 horizontalOverflow 不再視為通過。Failed QC 的已取得 diagnostics 也會保存。

P1.9 使用 puppeteer-core 控制已安裝的 Chrome／Edge，明確設定並回讀 CSS viewport 1440×1000、390×844，避免舊 window-size 參數受瀏覽器最小視窗限制。載入期間的 pageerror 也會阻擋。CI 安裝 Noto CJK 字體，避免缺少中文 fallback 字體使排版結果失真；不放寬既定 14 頁與幾何門檻。

## 版本與紀錄

每次執行建立獨立 `.research-publish/<timestamp-uuid>/`，不覆寫另一輪的證據，且整個目錄被 Git 忽略：

- `release.json`：commit、是否 dirty、target、account/database、時間、各 stage 狀態、canonical package／manifest／source／seed hash、raw package hash、report hash、build hash、source-input hash、QC、D1 run ID、部署結果／version ID／URL。
- `qc.json`：已取得的完整 QC 結果，包含失敗時可取得的 diagnostics。
- `report.html`：通過 QC 並 seal 的 standalone 副本；seal 前失敗不會有此交付檔。

原始 process logs 留在終端或 Actions log，不寫進交付 JSON；不保存 API token 或完整環境變數。Build hash 是排序後各檔案路徑／內容 hash 的集合 hash；source-input hash 涵蓋 Git tracked／非 ignored untracked 檔案及 Wrangler config，排除會生成的 profile HTML 與 next-env.d.ts。它用於同次流程的漂移檢查，不能直接代替 canonical package hash。

同 package 重跑依舊共用 D1 run ID，但每次 release 證據獨立。Importer 現在除 run/package 與 12 表筆數外，會回讀核對 source、seed、report hashes；仍非全表逐欄值驗證。

Record 的 manualReview 欄位清楚標示人工驗收未由程式記錄。不要把 DEPLOYED 當作所有研究品質／人工 gate 都 PASS。

## GitHub Actions

Push main 先用整個 push 的 before／after diff 判斷範圍，停用 rename 合併，避免把移走 runtime 檔案誤判為文件更新：

- 僅 `README.md`、`research_system/` 直屬 Markdown、`docs/**/*.md`：只執行 docs:check，不安裝發布 dependencies、不注入 Cloudflare secrets、不匯入、不部署。
- 混合程式碼、schema、研究資料、workflow 或其他路徑變更：執行完整發布 gate。
- workflow_dispatch 手動觸發或初始 push：執行完整 gate。無法讀取有效 diff 時失敗，不猜測為 docs-only。

發布 job 設 concurrency 且不中斷進行中的發布，避免在 D1 與 Worker 之間被新 push 取消。依 GitHub 排程，等待中的執行可能被後續排程取代；每個已執行 release 仍保留自己的證據。

成功／失敗都嘗試上傳 release artifact，名稱含 commit、Actions run ID 及 attempt，保留 30 天。這是有限期 CI 證據，不是永久歷史儲存；人工需要長期留存時應下載保存。若在初始化、文件檢查或安裝階段失敗，可能尚未有 release.json，Actions log 是該階段的證據。

## 失敗與重跑

先讀 release.json 的 failedStage 及 Actions／terminal log。Source／build／report 漂移時重新從完整流程開始，不能拿舊 QC 繼續部署。QC 不通過就修正來源／排版再跑，不調大容忍值避過 gate。

在 import／deploy 失敗時外部狀態可能已變更；確認 D1 run、hash 與 Worker 版本，再使用完整流程安全重跑。不要刪庫、強制改 status 或忽略失敗來完成發布。

Windows `Generated file is stale` 處理方式不變：先 research:generate，再 research:check。Chrome／Edge 路徑不標準時指定 RESEARCH_CHROME_PATH。OpenNext 在 Windows 仍可能有相容性限制；正式 CI 於 Ubuntu 驗證。

## 驗收證據與後續

Tests 覆蓋：乾跑無 external effects、成功順序、任一前置 stage 失敗阻擋遠端、缺漏／失敗 QC、hash 不符、build／import 前後漂移、D1 失敗阻擋 deploy、部署失敗保存已匯入結果、artifact 檔案更動及 docs-only／混合／rename 路徑判斷。故意失敗測試使用隔離的 I/O adapters，不觸碰正式資料庫。

尚未涵蓋：人工內容 gate 自動化、其他 profile／Laptop 自動 QC、狀態轉移與私密存取、跨服務交易／回滾、永久歷史 artifact、部署後全站／內容驗收。參見 [Roadmap](P1_ROADMAP.md)。

實作依據：[Wrangler deploy](https://developers.cloudflare.com/workers/wrangler/commands/workers/)、[GitHub workflow artifacts](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-what-your-workflow-does/storing-and-sharing-data-from-a-workflow)。
