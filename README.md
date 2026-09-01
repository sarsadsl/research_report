# Research Report

個股研究資料庫 + 研究報告發布系統。P1.10 已加入 source-first intake、通用 Full Report 與第二家公司回歸驗證。

目前第一檔 seed：**全新光電 (2455 TT)**。

## 操作規範（P1.8）

- [Research Workflow](research_system/RESEARCH_WORKFLOW.md)：來源、版本、PowerShell 操作順序、hash、失敗處理與 handoff 範本。
- [Research Style Guide](research_system/RESEARCH_STYLE_GUIDE.md)：數字與證據標示、圖表、版面、跨裝置、互動與離線交付。
- [Research QC](research_system/RESEARCH_QC.md)：自動／人工檢查範圍、門檻、PASS／FAIL／WARN／NOT_RUN 及 CI 缺口。
- [Roadmap](research_system/P1_ROADMAP.md)：已交付階段與後續發布 gate、歷史保存、完整報告通用化。
- [P1.9 Publishing](research_system/RESEARCH_PUBLISHING.md)：發布命令、阻擋條件、artifact/hash、docs-only CI 與重跑方式。

更新研究的順序：驗證／生成 → export／QC／人工內容驗收 → local import → remote import → deploy／實際站點驗收。以下功能段落是命令索引，完整順序與停止條件以 Workflow 為準。

Push main 會觸發 GitHub Actions。純文件 allowlist 變更只跑文件檢查；程式／研究資料／混合變更先建置與 QC，通過才寫入 D1、部署。`npm run deploy` 也經過相同 gate。人工內容／來源／離線驗收仍是發布者責任，CLI 的 DEPLOYED 不等於全部人工項目已 PASS。

## P0 功能

- `/research`：已發布個股研究列表
- `/research/vpec-2455`：2455 dashboard
- `/research/reports/vpec-2455.html`：完整互動式研究報告
- `/api/research`、`/api/research/[slug]`：唯讀 API
- Drizzle SQLite / Cloudflare D1 schema
- Cloudflare D1 migration + 2455 seed
- 財報實績、月營收、segment mix、三情境 forecast、capacity、catalyst/risk、signal rules / snapshots、report version

## 本機快速預覽

```bash
npm install
npm run dev
```

沒有 Cloudflare D1 binding 時會自動使用 `lib/research/seed.ts`，因此 UI 可以先直接開發與預覽。

## 啟用 Cloudflare D1

```bash
npx wrangler login
npx wrangler d1 create research-report-db
cp wrangler.jsonc.example wrangler.jsonc
# 將 database_id 填入 wrangler.jsonc
npm run db:local:migrate
npm run db:local:seed
npm run preview
```

正式部署前再執行：

```bash
npm run research:publish -- vpec-2455 --dry-run
npm run research:publish -- vpec-2455 --remote
```

程式會嘗試取得 `RESEARCH_DB` D1 binding；若不存在則自動 fallback 到 seed data。

## Research Package（P1）

`research/<slug>/research-package.json` 是研究資料的唯一人工維護來源。修改 package 後先執行：

```bash
npm run research:validate -- vpec-2455
npm run research:generate -- vpec-2455
npm run research:check
```

`research:generate` 會產生：

- `lib/research/generated/vpec-2455.json`：本機 fallback 資料
- `db/seed/2455.sql`：D1 idempotent seed

請勿直接編輯這兩個 generated files。匯入 D1：

```bash
npm run research:import -- vpec-2455 --local
npm run research:import -- vpec-2455 --remote
```

Remote 模式必須明確指定 `--remote`；未指定時 importer 預設只操作 local D1。

### D1 importer 與 Research Run（P1.7）

Importer 會先驗證 Research Package 與 generated SQL、套用尚未執行的 migration，再以 idempotent SQL 匯入 D1。完成後會逐表核對筆數，並在 `research_runs` 保存：研究版本、package/source/seed/report SHA-256、匯入時間與各資料表筆數。

先只檢查、不寫入資料庫：

```bash
npm run research:import -- vpec-2455 --dry-run
```

本機完整匯入與驗證：

```bash
npm run research:import -- vpec-2455 --local
```

正式 D1 必須明確使用 `--remote`：

```bash
npm run research:import -- vpec-2455 --remote
```

只有在 migration 已由外部流程套用時才使用 `--skip-migrations`。Migration、匯入、後驗證不是單一交易；run 紀錄在匯入 SQL 尾端寫入，之後才核對筆數，因此後驗證失敗時仍可能存在 imported 紀錄。以 exit code 0、`D1 import verified` 及 `RESULT: IMPORTED` 為成功證據；失敗先查明階段，再修正並重跑。

匯入前先生成並驗收本次報告，避免記錄舊 HTML 的 hash。Importer 保存 canonical package hash，exporter 的 Package SHA-256 則是原始檔案文字 hash，兩者不能直接比對。`research_runs` 不是完整發布歷史，也不保存 QC；同 package 重跑會更新原 run 的部分欄位。詳見 Workflow。

## 發布模型

`research_reports.status` 支援：`draft` → `review` → `published` → `archived`。

D1 repository 以 `published` report 篩選列表與詳細資料。這不等於完整 lifecycle enforcement：目前沒有狀態轉移控制器，fallback 與公開 static HTML 也不提供等同的私密性。未公開研究不可只靠 draft／review 標籤保護，不要放進 public、fallback 或公開 repo。

## 新報告 intake（P1.10）

```powershell
npm.cmd run research:intake -- sample-9001 --company "公司名稱" --ticker 9001 --market TW --as-of 2026-09-01
npm.cmd run research:intake -- sample-9001 --check
```

第一個命令只建立 `intake.json`、`notes.md` 與 `sources/`，不會建立 public HTML、fallback 或 D1 seed。加入來源與研究問題並通過 `--check` 後，才整理為正式 Research Package。詳見 Workflow。

## Report profiles（P1.10）

`research/<slug>/report-profiles.json` 控制同一份 Research Package 的 rendered outputs：

- `full-research`：直接依 `research-package.json` 的 sections 生成；章節與頁數內容驅動。
- `experiment-summary`：由通用 Report View Model 產生 ranking + panel summary 精簡報告。

兩份輸出都由 `npm run report:materialize -- <slug>` 建立，並內嵌由 Research Package 建立的 view-model payload；不使用 runtime `fetch`，可直接以 `file://` 開啟。正式 renderer 不含公司或固定年份分支，Dashboard 清單的 headline year 也由 package 設定。

## Standalone HTML exporter（P1.5）

正式交付完整報告時執行：

```bash
npm run report:export -- vpec-2455
```

exporter 會先以同一份 Research Package 重新 materialize 網站報告，再將完整報告逐 byte 複製到：

```text
exports/VPEC_2455_2026-08-27_full_report.html
```

輸出前會檢查頁數、Research Package payload、profile、runtime fetch 與外部 script / stylesheet / media 依賴。`exports/` 已加入 `.gitignore`，交付檔不會上傳 GitHub。

## Rendered layout QC（P1.6）

使用本機 Chrome 或 Edge 對 standalone HTML 執行 desktop 與 mobile 真實排版檢查：

```bash
npm run report:qc -- vpec-2455
```

PowerShell 若停用 `npm.ps1`，請使用：

```powershell
npm.cmd run report:qc -- vpec-2455
```

此命令遇到頁數／導航點不一致、layout fallback、overflow、top-level overlap、clipping、整頁橫向溢出或 standalone 與本機網站輸出不一致時會非零退出。它檢查 full-research 的 Desktop 1440×1000、Laptop 1024×768、Mobile 390×844；Dashboard、experiment-summary、可讀性、互動與真正斷網測試仍需人工驗收。P1.9 已將這些自動 QC 接入 CI 與 deploy 入口；缺漏 diagnostics 也會失敗。若 Chrome／Edge 安裝在非標準位置，可設定 `RESEARCH_CHROME_PATH`。

## 自動發布（P1.9）

```powershell
npm.cmd run research:publish -- vpec-2455 --dry-run
```

未指定旗標時也是 dry-run；成功為 VALIDATED_NOT_DEPLOYED。正式執行需提交來源修改，再加 `--remote`；流程為 validate → build → candidate → QC → seal → import → deploy，QC 後不再重新生成報告。沒有 skip-QC 選項。

每次紀錄位於 `.research-publish/<timestamp-uuid>/`，包含 release.json、可取得的 qc.json 及驗收通過的 report.html。Actions 保存成功／失敗證據 30 天。匯入後會核對 source／seed／report hashes；任何前置失敗都不寫遠端、不部署。Import 後失敗不代表遠端已回滾。

## Windows 與生成產物

PowerShell 可一律使用 `npm.cmd`。遇到 `Generated file is stale`，重新執行 `research:generate` 再跑 `research:check`；Git 換行轉換也可能造成此錯誤。如果重生後沒有實質 Git diff，就不需要 commit。生成的 JSON／SQL 有實質差異時才與 package 一起提交。

不要手改本機生成的 report HTML；`exports/` 已忽略，tracked 的 `public/research/reports/vpec-2455.html` 由通用 materializer 重建。需要保留並整理本機兩份 HTML 時，使用 Workflow 內限定檔案且包含未追蹤檔的 stash 指令。

## 下一階段 P1

- `/research/admin` 私有編輯器
- CSV / Excel 匯入
- Source attachment
- Signal rules GUI
- 自動 signal snapshot
- report sections 全部資料庫化
