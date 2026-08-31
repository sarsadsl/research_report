# P1.9 Verification Record

驗證日期：2026-09-01（Asia/Taipei）。發布程式版本：`54c485458c1adc94f4ad4d7ad270dd9642d0b1c1`；主要實作 commit：`2edbac4`。本紀錄為技術發布驗證，不代替人工研究內容審閱。

## 已執行結果

| 檢查 | 結果與證據 |
| --- | --- |
| Node tests | 55 項全數 PASS，包含故意失敗／缺漏 QC、viewport、hash 漂移、import／deploy 失敗及 docs-only／rename 分流 |
| 文件與 workflow | docs:check PASS，workflow YAML 可解析，git diff whitespace check PASS |
| Windows 完整 dry-run | VALIDATED_NOT_DEPLOYED；release `2026-08-31T16-10-00-696Z-f17d5332-adcf-41bf-ae85-6efa458a8115`；import／deploy 均 NOT_RUN |
| 本機 D1 | 新增 source／seed／report hash 回讀核對成功，RESULT: IMPORTED |
| 正式 CI | [Run 33412524403](https://github.com/sarsadsl/research_report/actions/runs/33412524403) SUCCESS，release.json 為 DEPLOYED |
| Desktop／Mobile | 實際 CSS viewport 1440×1000、390×844；各 14 頁，overflow／overlap／clipping／fallback／runtime error 皆 0 |
| 線上 smoke check | `/research`、`/research/vpec-2455`、`/research/reports/vpec-2455.html`、`/api/research/vpec-2455` 均 HTTP 200，API slug 正確 |
| 線上 artifact 一致性 | 線上 Full Report SHA-256 與 CI 驗收、D1 run reportHash 相同 |

## 正式發布識別

```text
Release: 2026-08-31T16-10-13-817Z-ea378235-646c-49ea-972f-cb858651c549
Commit: 54c485458c1adc94f4ad4d7ad270dd9642d0b1c1
D1 run: vpec-2455-v1-1-1c05417ce5e9
Canonical package SHA-256: 1c05417ce5e9bf7bb5404b67e93ab0ed504a5d03d022037b51a03fc385cff8f7
Report SHA-256: da73105a31482fe147966f23ce09dcff9c9be511207e33fbc6dc8cf71418718b
Worker version: 4ad98a40-cd77-46df-bad7-4985b9d6fa89
```

[正式網站](https://research-report.sarsadsl.workers.dev/research)。完整 release.json、qc.json、report.html 在成功 Actions run 的 artifact，保留期限 30 天。

## 真實阻擋案例

[Run 33412153480](https://github.com/sarsadsl/research_report/actions/runs/33412153480) 在 Linux 的舊 headless／字體環境產生 13 頁，違反 14 頁回歸條件，因此停止於 qc。保存的 release.json 明確為 FAILED，import／deploy 均 NOT_RUN，失敗 artifact 上傳成功。

修正採精確 CSS viewport 控制並在 CI 安裝 CJK 字體；未調低頁數要求或放寬幾何容忍值。Windows 原先的 window-size 請求也曾被瀏覽器限制為 500px，現已改為設定且回讀精確 390px，並有對應錯誤尺寸測試。

## 純文件分流驗證輸入

本文件的新增單獨提交，僅改動 `research_system/P1_9_VERIFICATION.md`，用來驗證已上線的 docs-only 規則。對應 commit 的 Actions run 應執行 Determine deployment scope／Check documentation，並跳過 dependencies、Cloudflare 設定、QC 發布命令與 artifact 上傳。可在本文件提交對應的 Actions run 核對各 step 結果，不以「workflow 整體成功」推定曾部署。

## 限制

人工來源／內容／無障礙／互動／真正離線驗收仍由發布者負責；P1.9 不提供跨服務原子回滾、草稿私密性或永久歷史保存。參見 [Publishing](RESEARCH_PUBLISHING.md) 與 [QC](RESEARCH_QC.md)。
