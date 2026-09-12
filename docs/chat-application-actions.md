# 聊天申請操作：前端串接契約草案

目前僅使用者前端已支援，現有聊天 API 與歷史 API 尚未產生或保存 action。此文件不是已上線 API 規格；後端實作時須同步更新 OpenAPI。

## Agent 組員需回傳的格式

申請禮包建立完成後，將明確對應的案件 UUID 附在 NDJSON result：

```json
{"type":"result","result":{"reply":"申請準備資料已整理完成，請先查看。","action":{"type":"application_review","caseId":"00000000-0000-4000-8000-000000000001"}}}
```

歷史 API 的對應 assistant 訊息亦須回傳同一 action，才能重新整理後保留按鈕：

```json
{"messages":[{"role":"assistant","content":"申請準備資料已整理完成，請先查看。","action":{"type":"application_review","caseId":"00000000-0000-4000-8000-000000000001"}}]}
```

- caseId 是 application_packages.id，不是草稿 ID；必須由後端確認屬於登入使用者。不得猜測最新案件或解析回覆文字產生動作。
- action 可省略，舊文字回應保持相容。未知動作或不合法 UUID 不顯示按鈕，仍顯示原文；user 訊息不允許操作入口。
- 前端固定渲染「查看申請資料」「開始代填申請」，不執行模型提供的 HTML、URL 或程式碼。
- 查看資料使用既有 GET /api/cases/{id}，由 API 驗證本人權限；每次開啟重新讀取，404／登入失效／錯誤沿用案件頁處理。這只是申請準備報告，不是完整個資表單或最終送件確認。
- 代填按鈕目前始終 disabled，顯示「代填功能串接中」。不開啟 3003、不呼叫代填 API、不送出申請。
- 瀏覽器代填、執行狀態、最終確認、重複執行防護與送件收據尚待 Agent／API 組員實作；不得只啟用按鈕就宣告串接完成。

## 驗收方式

以測試 fixture／攔截的聊天回應注入上述 result，或待後端提供 action 後驗證：按鈕位於 assistant 氣泡內；查看資料開啟右側原生 dialog；Tab 焦點留在面板內，Escape／關閉可返回聊天按鈕；代填按鈕不可操作。使用已登入帳號本人的真實測試案件 UUID，範例 UUID 不保證存在。一般回應不應出現按鈕。
