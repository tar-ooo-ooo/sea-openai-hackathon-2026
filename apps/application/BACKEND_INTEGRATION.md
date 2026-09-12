# 後台串接說明

## 交付邊界

此包是可啟動的前端。`src/services/sandbox.ts` 目前負責本機資料與狀態運算，尚未存在下列 HTTP endpoints。下表是建議的 API 對應，團隊可依後台命名規則调整。

| 前端動作 | 現有方法 | 建議 API |
| --- | --- | --- |
| 建立草稿 | createCase | POST /api/applications |
| 查詢清單 | listCases | GET /api/applications |
| 讀取案件 | getCase | GET /api/applications/:id |
| 修改資料 | updateCase(id, patch, expectedVersion) | PATCH /api/applications/:id |
| 確認資料使用／代理權限 | grantConsent | POST /api/applications/:id/consent |
| 資料檢閱 | validateCase、setDraftStage | POST /api/applications/:id/review |
| 最終確認與送出 | approveSubmission、submitCase | POST /api/applications/:id/submit |
| 保存補件 | provideMissingInformation | PATCH /api/applications/:id/amendment |
| 送出補件 | submitAmendment | POST /api/applications/:id/amendment/submit |
| 狀態與時間軸 | getCaseState | GET /api/applications/:id/state |

建議伺服器的 submit endpoint 原子處理「核對被確認的資料版本、驗證授權、建立送出紀錄」。不可只信任前端的 consent flags 或目前狀態。`requestId` 可對應 Idempotency-Key；版本不符時建議回傳 409，保留使用者正在編輯的內容並要求重新取得最新資料。

## 前端需要修改的地方

1. `src/ui.tsx` 的 `useSandbox` 目前使用 useSyncExternalStore 訂閱本機 singleton。串接後可改為共用查詢 hook／快取，回傳清單、單筆案件、載入與錯誤狀態。
2. `HomePage.tsx` 的建立申請，以及 `ApplicationPage.tsx` 的 create、persist、consent、next、submit，須改為 await API。送出中停用相關按鈕，成功後才更新資料並跳頁；失敗時保留欄位與錯誤訊息。
3. `CasesPage.tsx` 的清單、單筆與 amend 須使用 API。補件保存、補件送出兩個動作的語意仍需區分。
4. 後台回傳權威的 version、dataRevision、狀態與 events。頁面不可自己從舊狀態推算成已收件或已排程。
5. 原本同一 origin 的 storage event 更新，在後台版改為重新查詢、輪詢或 SSE。跨使用者案件權限必須由伺服器檢查。

## 現有服務方法

`createCase`, `listCases`, `getCase`, `updateCase`, `setDraftStage`, `grantConsent`, `approveSubmission`, `submitCase`, `provideMissingInformation`, `submitAmendment`, `getCaseState`, `subscribe`, `getSnapshot`。

`simulateGovernmentEvent` 與 `reset` 為本機資料服務保留的測試／開發方法，沒有任何對外頁面、選單或控制台可呼叫。後台的受理、補件與評估事件應由經授權的承辦端提供；不要將這些開發方法直接暴露為無權限的 API。

`loadDemo` 已從應用程式移除；網站不會載入預填測試個案。

## 需要後端落實的規則

- 資料與授權綁定版本；修改資料或服務需求後，先前送出确认失效。
- 重複按送出或重試請求不得建立重複申請。
- 已提交案件不可當草稿直接覆寫；依補件或退回流程處理。
- 待補件時不能跳過補件直接安排評估；收件不等於服務核定。
- 表單生日目前為西元 YYYY-MM-DD，地址為完整文字。身分證／居留證號僅做 10 碼英數格式檢查，尚未做校驗碼或身分核實。
- 本版沒有登入、權限、檔案上傳與通知寄送；這些由後台及產品需求另行接入。

## 本機資料與來源

新前端使用 `ltc-applications.cases.v1`，避免舊版本預載案件出現在交付版。舊 `care-sandbox.cases.v1` 未刪除，但不再被讀取；不要將任何瀏覽器開發資料匯入真實後台。

介面參考衛福部 1966 服務頁與新北申辦表單：
- https://1966.gov.tw/LTC/cp-6533-70777-207.html
- https://service.ntpc.gov.tw/eservice/Ac124014.action

品牌為自製圖示與通用服務名稱；未使用官方徽章。網站只保留申請前端，沒有家屬聊天、Agent 執行器、訪視報告或專員工作台。
