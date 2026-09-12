# 前端資料契約

精確 TypeScript 型別以 `src/types.ts` 為準。所有資料仍使用 schemaVersion: 1。

## 案件主要欄位

| 欄位 | 意義 |
| --- | --- |
| id | 案件編號，正式串接由後端產生 |
| version | 案件版本，包含資料及事件修改 |
| dataRevision | 申請資料版本，最終確認須綁定此值 |
| jurisdiction | 預計接受服務的縣市 |
| applicantRole | SELF / FAMILY_PROXY / PROFESSIONAL_PROXY / OTHER_PROXY |
| currentSituation | HOME / HOSPITAL_DISCHARGE / INSTITUTION / OTHER |
| applicant | name、nationalId、phone、email、relationship |
| recipient | name、nationalId、birthDate、currentAddress、registeredAddress |
| careContext | 疾病近況、日常活動、照顧安排、申請原因及補充說明 |
| intake | 性別、語言、同住、看護、近期住院、移位、穿衣、申請服務複選與消息來源 |
| consent | privacyAccepted、proxyConfirmed、finalSubmissionApproved、approvedRevision |
| precheck | disability、dementia、indigenous、pac 等自述旗標，以及初步管道提示 |
| draftStage | 表單處理階段；不等於案件辦理狀態 |
| application | status、submittedAt、missingFields、amendment |
| assessment | scheduledAt、summary |
| timelineEvents | id、type、label、detail、at |
| createdAt / updatedAt | ISO 時間字串 |

`intake` 為可選物件，缺少時前端使用空值。`requestedServices` 為字串陣列，表示需求勾選而非核定服務。

## 編輯與送出

CasePatch 可修改 jurisdiction、applicantRole、currentSituation、applicant、recipient、careContext、intake 及自述 precheck flags。版本與案件状态不應由一般申請人 patch 任意覆寫。

草稿契約保留：DRAFT、ROUTED、PRECHECK_COMPLETE、WAITING_CONSENT、PROFILE_INCOMPLETE、READY_TO_REVIEW、READY_TO_SUBMIT。畫面只有同意書、填寫資料、檢視資料；不是七個 UI 步驟。

目前前端送出流程：資料驗證 → READY_TO_REVIEW → READY_TO_SUBMIT → 使用者勾選確認 → approveSubmission(id, dataRevision) → submitCase(id, requestId?)。

## 案件生命週期

SUBMITTED → NEEDS_MORE_INFORMATION → SUBMITTED → ASSESSMENT_SCHEDULED → ASSESSMENT_COMPLETED → PROFESSIONAL_REVIEW → SERVICE_COORDINATION → ACTIVE → CLOSED。

另支援 RETURNED 修正重交。`CASE_ACCEPTED` 為收件事件，不等於正式核定。

補件目前只支援 `recipient.currentAddress`。通知須包含 field、label、reason；保存补件不立即覆寫原資料，確認送出後才套用並記錄修改。

`getCaseState` 回傳 schemaVersion、caseId、version、state、missingFields、allowedActions、events。不含未發布的後續事件；JSON 不再顯示於使用者頁面，可由服務或未來 API 取得。

## DOM 整合

表單保留 label、原生 input/select、fieldset/legend 與 `data-agent-field`，例如 applicant-name、recipient-nationalId、recipient-currentAddress、intake-language。

操作保留 `data-agent-action="start-application|continue|submit-application|submit-amendment"`。`privacy-consent`、`proxy-consent`、`final-confirmation` 為分開的確認控制項；正式授權仍以後端驗證為準。
