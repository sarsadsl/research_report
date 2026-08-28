# Research Report

個股研究資料庫 + 研究報告發布系統 P0。

目前第一檔 seed：**全新光電 (2455 TT)**。

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
npm run db:remote:migrate
npm run db:remote:seed
npm run deploy
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

## 發布模型

`research_reports.status` 支援：`draft` → `review` → `published` → `archived`。

`/research` 只顯示至少存在一份 `published` report 的公司。

## Report profiles（P1.4）

`research/<slug>/report-profiles.json` 控制同一份 Research Package 的 rendered outputs：

- `full-research`：保留 2455 現有 14 頁完整報告作為 regression baseline。
- `experiment-summary`：由通用 Report View Model 產生 ranking + panel summary 精簡報告。

兩份輸出都由 `npm run report:materialize` 建立，並內嵌 Research Package payload；不使用 runtime `fetch`，因此可直接以 `file://` 開啟。

## 下一階段 P1

- `/research/admin` 私有編輯器
- CSV / Excel 匯入
- Source attachment
- Signal rules GUI
- 自動 signal snapshot
- report sections 全部資料庫化
