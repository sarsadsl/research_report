# 新盛力科技股份有限公司 research intake

## 2026-10-21 公開資料更新（report 1.1）

- 官方月營收補入 8 月 495,100、9 月 424,843 仟元，Q3 月營收合計 1,369,378 仟元。
- 8 月為研究期高點，9 月回落，維持收入成長與獲利／現金轉換分開驗證。
- 本次官方索引尚未見 Q3 財報；財測、財務實績、客戶資格及燈號門檻未更改。
- 新盛力納入一般 package 一致性檢查與本機 fallback，不再排除為 regression fixture。

1. 將來源檔放入 `sources/`，或在 intake.json 記錄 URL。
2. 為每個來源填入 id、title、provider、evidenceClass，以及 file 或 url。
3. 執行 `npm run research:intake -- stl-4931 --check`。
4. 通過後再整理成 manifest、research-package 與 report-profiles。
