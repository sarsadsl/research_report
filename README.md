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

## 發布模型

`research_reports.status` 支援：`draft` → `review` → `published` → `archived`。

`/research` 只顯示至少存在一份 `published` report 的公司。

## 下一階段 P1

- `/research/admin` 私有編輯器
- CSV / Excel 匯入
- Source attachment
- Signal rules GUI
- 自動 signal snapshot
- report sections 全部資料庫化
