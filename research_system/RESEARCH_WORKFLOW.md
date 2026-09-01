# Research Workflow

P1.8 操作規範，於 P1.9 更新發布入口、P1.10 加入新報告 intake 與通用 Full Report。適用於研究建立、更新、驗收與交付；正式參考個股為 `vpec-2455`，另有不發布的合成第二家公司測試。欄位見 [Data Contract](RESEARCH_DATA_SCHEMA.md)，呈現見 [Style Guide](RESEARCH_STYLE_GUIDE.md)，驗收見 [QC Specification](RESEARCH_QC.md)，自動發布細節見 [Publishing](RESEARCH_PUBLISHING.md)。

## 維護來源與產物

| 檔案／資源 | 維護方式 |
| --- | --- |
| `research/<slug>/research-package.json` | 研究資料唯一人工維護來源，包括數值、來源、claims、假設、Dashboard 設定與 report 版本 |
| `research/<slug>/manifest.json` | 身分、reportVersion、所需輸出與品質要求；版本須與 package 一致 |
| `research/<slug>/intake.json`、`sources/` | 新研究的問題與來源清單；package 完成前不會進入 build／publish |
| `research/<slug>/report-profiles.json` | Profile、輸出位置及 section 選擇；正式 Full Report 用 `package-sections`，頁數由 package 內容決定 |
| `research/<slug>/notes.md` | 決策與待查問題，不作為另一份數值來源 |
| `lib/research/generated/<slug>.json`、`db/seed/<ticker>.sql` | Generator 產生，禁止手改；有實質差異時與 package 一起提交 |
| D1 | Package 衍生資料，由 importer 更新 |
| `public/research/reports/*.html` | Materializer 產物；正式 full report 可被網站發布，experiment 與本機生成差異不另行手改 |
| `exports/*.html` | Standalone 交付檔，Git 已忽略，不提交 GitHub |

Full Report 由 `research-package.json` 的 `sections` 與通用 renderer 產生，不再讀取 2455 legacy HTML。每個 section 的 `payloadRefs` 決定資料與 evidence rail；頁數是排序後的 section 數，不設公司專屬固定頁數。

## 新報告 intake

先建立不會被網站建置或發布的來源工作區：

```powershell
npm.cmd run research:intake -- <slug> --company "公司名稱" --ticker <代號> --market <市場> --as-of YYYY-MM-DD
```

將檔案放在 `research/<slug>/sources/`，或在 `intake.json` 記錄 URL；每筆來源填 `id`、`title`、`provider`、`evidenceClass` 及 `file`／`url`。檢查相對路徑、必填欄位與附件 SHA-256：

```powershell
npm.cmd run research:intake -- <slug> --check
```

Intake PASS 只表示來源清單可讀。接著才依 schema 建立 `manifest.json`、`research-package.json`、`report-profiles.json`，完成 claims、估計分類及內容審閱，再依本文件後續流程驗證。機密或未授權附件不可提交公開 repo。

## 研究準備與證據

1. 確定公司、slug、資料截止日、研究範圍、report 版本與 manifest 所需輸出。
2. 先登錄來源，再摘錄事實或撰寫結論；接受公司公告、財報、法說、交易所、具名第三方資料、具名共識與明確研究假設。
3. 保留期間、單位、幣別、scale、sourceIds、claimIds；計算列出方法與輸入 claim。
4. 釐清衝突來源後更新 package、manifest 版本及 notes，不讓 Dashboard 和正文各取不同數值。
5. 按以下流程驗證；manifest 所要求的輸出是交付義務。

| evidenceClass | 使用規則 |
| --- | --- |
| `official` | 公司、監管或交易所正式揭露，保留原始期間與單位 |
| `third_party_fact` | 具名資料商的事實，標示提供者與擷取日期 |
| `market_consensus` | 有出處的市場預估，不把自己的 base case 偽稱共識 |
| `research_inference` | 計算、估計、情境或判斷，明列假設、方法及輸入，不寫成官方揭露 |

## PowerShell 操作順序

在 repo 根目錄執行。每個命令 exit code 0 才往下；PowerShell 不會因前一個原生程式失敗自動停止後續貼上的命令。首次安裝或 lockfile 改動後執行 `npm.cmd ci`。目前 CI 使用 Node 22；本機需相容 Node 及供 layout QC 使用的 Chrome／Edge。

### 1. 驗證與生成（不寫 D1）

```powershell
git status --short
npm.cmd run research:validate -- vpec-2455
npm.cmd run research:generate -- vpec-2455
npm.cmd run research:check
```

保留使用者無關變更。`research:check` 包含 validator、generated 一致性及現有單元測試，目前固定檢查 2455，**不含瀏覽器 QC 或 D1 驗證**。

### 2. 產出報告及驗收（不寫 D1）

```powershell
npm.cmd run report:export -- vpec-2455
npm.cmd run report:qc -- vpec-2455
```

兩個命令都先 materialize 網站報告，QC 會再次 export。輸出命名為 `exports/<SLUG_PREFIX>_<TICKER>_<AS_OF_DATE>_full_report.html`，目前範例為 `exports/VPEC_2455_2026-08-27_full_report.html`。

依 QC 規範手動驗收 Desktop、Laptop、Mobile、鍵盤與縮放、斷網開檔、來源與數字一致性。用 `npm.cmd run dev` 檢查本機 Dashboard 和 Full Report；沒有 D1 binding 時是 fallback，不能當遠端資料驗證證據。CLI 的 READY 只代表該命令的檢查完成。

### 3. 匯入計畫與本機 D1

```powershell
npm.cmd run research:import -- vpec-2455 --dry-run
npm.cmd run research:import -- vpec-2455 --local
```

Dry-run 不連接或修改 D1，也不驗證 Cloudflare 登入／權限。Local 成功須看到 `D1 import verified: <run-id>` 及 `RESULT: IMPORTED`。Importer 預設 local，自動套用待執行 migrations；只有外部流程已完成 migration 才使用 `--skip-migrations`。

### 4. 正式匯入與部署（會修改外部狀態）

內容、排版、本機匯入驗收完成，確認發布範圍及帳號／database ID，並提交來源變更後，使用 P1.9 gate：

```powershell
npm.cmd run research:publish -- vpec-2455 --dry-run
npm.cmd run research:publish -- vpec-2455 --remote
```

正式命令或其別名 `npm.cmd run deploy` 會先完成建置、QC、artifact 核對，再匯入與部署，不需先另跑 remote migrations／import。低階 importer 保留作維護，不是完整發布 gate。

Push main 的 CI 對程式、研究資料或混合變更執行同一 gate；純 README、research_system 直屬 Markdown、docs Markdown 僅做文件檢查。手動 workflow_dispatch 仍跑完整發布。QC 後不重建報告，來源／build／report hash 漂移會阻擋；各階段證據保存於 .research-publish 及 CI artifact。人工內容、來源與離線驗收尚未自動強制，發布者仍須保存。

部署後檢查實際站點的 `/research`、`/research/vpec-2455`、`/research/reports/vpec-2455.html`、`/api/research/vpec-2455`。交付填實際 origin，不猜測網址。Remote import 成功不代表網站部署完成。

## 版本、hash 與匯入稽核

- 分別記錄 packageVersion、report version、資料截止日；`manifest.reportVersion` 必須等於 `package.report.version`。內容更新需調整 report 版本與變更說明。
- `research_runs` 保存 company、report version、截止日、package/source/seed/report hashes、預期筆數及 importedAt。Importer 狀態為 `imported`，沒有 QC、發布 URL 或部署結果欄位。
- 同一 package 正常重跑使用相同 run ID，更新 seed/report hash、筆數與時間，不新增 run；這不是不可變 artifact history。D1 資料 upsert 並清理舊列，不保留完整歷史快照。
- Run 在匯入 SQL 尾端寫入，**之後**才逐表核對筆數。後驗證失敗時 run 可能已存在，以命令成功及 `RESULT: IMPORTED` 為準，不只看 imported status。
- 整體不是涵蓋 migration、匯入、後驗證、部署的單一交易。失敗後查明階段、修正原因，再重跑 idempotent importer；不能假設全流程已回滾。
- Report hash 來自 importer 讀到的本機 HTML；缺檔可為 null，存在也不代表 QC 通過。因此先產出及驗收，再匯入。不同 artifact 可有同一 package hash，交付要同時保存 report hash。

| Hash | 目前計算來源 |
| --- | --- |
| Validator／importer packageHash | Canonical package JSON：object keys 排序，array 順序保留 |
| Validator manifestHash | Canonical manifest JSON，目前未寫入 research_runs |
| Importer sourceHash | Canonical package.sources，不是來源附件內容 hash |
| Importer seedHash／reportHash | SQL／HTML 的 UTF-8 文字，換行會影響結果 |
| Exporter Package SHA-256 | Package 檔案原始 UTF-8 文字，**不是** canonical packageHash |
| Exporter Report SHA-256 | Standalone HTML；輸出時確認與本機網站 HTML 逐 byte 一致 |

不能直接比對 exporter 的 Package SHA-256 與 importer 的 canonical packageHash 判斷資料一致；交付表分欄保存。

## Lifecycle 與停止條件

規範流程：`draft` 補資料 → `review` 核對證據 → `published` 通過全部 blocking QC → `archived` 保留歷史。WARN 記錄理由；未跑必要檢查填 NOT_RUN，視為 BLOCKED。

目前只有 status 欄位與部分讀取限制：D1 repository 篩選 published report；validator 檢查 publishedAt，沒有狀態轉移控制器。Fallback 與公開 static HTML **沒有等同的私密存取保證**。不得把未公開研究或機密附件放進 public、fallback 或公開 repo，不能只靠 draft/review 標籤保護內容。不可變歷史、存取控制與自動 gate 屬後續工程。

Schema／引用錯誤、數值衝突、估計冒充事實、缺期間／單位／方法、必要章節／輸出缺漏、不可讀或越界、互動／離線失敗、D1 驗證不符、部署版本與驗收版本不符，均阻擋相關匯入、交付或發布。

## 常見問題與產物整理

- `Generated file is stale`：重跑 `research:generate` 及 `research:check`。Windows `core.autocrlf=true` 可把 LF 轉 CRLF；generator 採文字完全相等比較，內容相同也可能 stale。重生後 Git 無實質 diff 就不需 commit，不可略過檢查或修改資料製造差異。
- Cloudflare `7403`：核對登入身份、D1 權限及 account/database ID。列出資料庫不保證 query 成功，一次重試成功不足以斷定根因。不刪庫、不重建 ID、不公開 token、不盲目連續重試。
- Browser 找不到：設定 `RESEARCH_CHROME_PATH` 為已安裝的 Chrome／Edge 執行檔；沒跑 QC 不能填 PASS。
- `nothing to commit`：查看 git diff，生成檔可能已與 Git 內容相同。不要用 `git add .` 或 `git commit -a` 把 report 產物一起提交。

需要整理 2455 HTML 時才執行以下可恢復操作；include-untracked 包含 experiment 檔，pathspec 限定範圍：

```powershell
git stash push --include-untracked -m "local generated research reports" -- public/research/reports/vpec-2455.html public/research/reports/vpec-2455-experiment.html
git status --short
git stash list
```

恢復前用 `git stash show --stat --include-untracked 'stash@{n}'` 確認項目，再用 `git stash apply 'stash@{n}'`，n 換成確認後編號。不要盲目 pop 最新一筆。Stash 會改變工作區 HTML，之後匯入／交付前須重新 materialize／QC，避免記錄舊 artifact 的 hash。

## Handoff 範本

由發布者填寫保存於交付紀錄；這是人工範本，不是 CLI 已整合的結果。文件修改任務不應假裝已完成研究發布。

```text
Research / ticker / slug:
研究結論與本次變更:
As-of date / packageVersion / reportVersion:
Evidence classes / sources / assumptions:
Commit / environment / database:
Canonical package SHA-256 / source SHA-256 / seed SHA-256:
Exporter raw-package SHA-256 / report SHA-256:
D1 run ID / local result / remote result:
Claims & numeric consistency / reviewer:
Dashboard URL / verification result:
Full Report URL / profile / pages:
Desktop / laptop / mobile / keyboard & zoom:
Overflow / overlap / clipping / fallbacks:
Standalone artifact / offline check / website parity:
Deployment result / deployed commit / checked at:
WARN / NOT_RUN / known limitations:
Result: READY_TO_PUBLISH | BLOCKED
```

READY_TO_PUBLISH 是驗收結論，不等於已部署；部署結果另外填寫。後續工程見 [Roadmap](P1_ROADMAP.md)。
