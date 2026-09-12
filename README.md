# Sea × OpenAI Hackathon 2026

本專案將使用者前台、長照申請頁、後台專員介面與共用 API 分離。

## 架構與 ports

```text
使用者前台 apps/user             http://localhost:3000
後台專員 apps/admin              http://localhost:3001
共用 API apps/api                http://localhost:3002
長照申請頁 apps/application      http://localhost:3003
                                  ↓
                             Neon PostgreSQL
```

使用者前台與後台專員介面是獨立 Next.js app，但共用同一個 API。只有 API 可以使用 Drizzle 存取資料庫，且專員權限必須由 API 驗證。

## 開始使用

需求：Node.js 20.9 以上。

```bash
npm install
cp .env.example .env.local
```

接著在四個 terminal 分別執行：

```bash
npm run dev:user
npm run dev:admin
npm run dev:api
npm run dev:application
```

長照申請頁請使用 `http://localhost:3003`；開發模式不使用區網 IP，避免 Next.js 靜態資源與 HMR WebSocket 被拒絕。

`apps/application` 是獨立 Next.js App Router app，包含服務說明、申請表及案件進度頁面。已支援以民眾 session 透過 `GET /api/application-intakes/{id}` 讀取既有草稿，確認表單後以 POST 建立案件；本機表單與部分案件畫面仍使用 `localStorage`，尚非完整的伺服器案件管理流程。Demo 請使用虛構資料。

後台工作台透過 `GET /api/admin/triages` 顯示 `emergency_triages` 的分流程度、原始訊息，並連結目前的使用者姓名、電話與地區；緊急優先、同程度依時間新至舊，僅專員可讀且不快取。既有資料若未保存原始訊息會明確標示；此表目前沒有處理狀態或被照顧者／申請關聯，不會自動配對申請。正式送出的申請則由 `application_packages` 與對應的 `care_cases` 提供給後台處理。

後台首頁「申請資料列表」只顯示已有 `application_packages` 且對應 `care_cases.status = new` 的待接案申請；專員按「開始接案」會更新既有 care case 為 `assessing`、認領承辦人並寫入接案時間，不會建立第二筆個案。開始處理後，案件會移至「正式申請案件」。點選「查看完整明細」仍可讀取申請摘要、服務需求及關聯表單內容。API 僅專員可讀，回應不快取。

民眾在 application 確認送出時，API 會在同一批資料庫操作中建立 `application_packages`、服務需求與對應的 `care_cases`；新個案狀態為 `new`。`source_application_package_id` 是兩者的一對一關聯，唯一索引避免同一申請重複建立個案；migration `0005_backfill-care-cases.sql` 會為既有申請資料補齊個案。後台可查看完整申請，並由正式申請案件進入 Case 360 處理。

所有本機環境變數集中在專案根目錄 `.env.local`。使用資料庫前，請將其中的 `DATABASE_URL` 換成 Neon pooled connection string。user 與 admin 透過共用 `fetchApi` 呼叫 `http://localhost:3002`；application 已串接既有草稿的讀取與確認送出 API。

`POST /chat` 接受 `{ "message": "..." }`，必須帶登入 cookie（前端使用 `credentials: "include"`）。API 由 session 決定使用者；舊版 `userId` 若與 session 不符會回傳 403，未登入回傳 401。明確要求忽略既有指令、冒充 system／developer 或洩漏提示詞的訊息會以 `400` 拒絕。帶上 `Accept: application/x-ndjson` 時，透過 OpenAI Agents SDK 逐行回傳 `progress`、`result` 或 `error` 事件；未指定時維持 `{ "reply": "..." }` JSON。Agent 會使用該使用者的 `chat_summaries` 與尚未摘要的 `chat_messages`；未摘要訊息達 80 則時，會將較舊的 60 則合併進摘要並保留最近 20 則原文。表示要申請長照時，Agent 會把資料收整到該使用者的 `application_intakes`，資料完整後引導使用者檢視表單；只有確認送出 API 才建立 `application_packages` 與 `application_services`。使用前須在根目錄 `.env.local` 設定 server-only `OPENAI_API_KEY`。

`GET /api/chat/history` 依登入 cookie 回傳 `{ messages: [{ role, content }] }`，最多 20 則、由舊至新，不接受指定他人的 userId 且不快取。聊天頁重新整理會重讀紀錄。串流錯誤不會自動重送，需先重讀紀錄確認後端是否已保存；目前不提供完整歷史分頁、互動卡或 token 逐字串流。Agent 尚未做個資遮罩，Demo 僅能使用虛構資料。

長照制度相關回答以衛生福利部長照專區（1966）的「長期照顧服務法」、「長期照顧服務申請及給付辦法」與「申請長照服務」頁面作為官方參考；一般回答不主動列出網址，使用者明確詢問來源時才提供最相關的官方連結。資格、額度、補助與實際服務仍以各縣市長期照顧管理中心最新評估及核定為準。

啟動 API 後可開啟 Swagger UI：`http://localhost:3002/api/docs`；OpenAPI JSON 位於 `http://localhost:3002/api/openapi`。

`GET /api/cases` 使用登入 cookie 查詢本人的案件，回傳 `{ drafts, cases }`，不接受 query 參數。`drafts` 包含收集中草稿的 `id`、`status`、`targetName`、`jurisdiction`、`summary`、`missingFields`、`updatedAt`；`cases` 包含案件的 `id`、`targetName`、`summary`、`createdAt`、`updatedAt` 與 `services`（`id`、`position`、`category`、`name`、`reason`、`status`）。兩者依更新時間新至舊排列，服務依 position 排序。未分頁、不快取，也不回傳完整草稿或身分證／聯絡資料欄位；無資料回傳空陣列。401 表示未登入，400 表示有不支援的 query，503 表示驗證或資料讀取失敗。「我的案件」畫面已串接此 API，進入頁面或按「更新案件」會重讀資料；支援載入、無資料、逾時、登入失效及錯誤重試。草稿可連回聊天補充資訊，但尚不支援指定草稿續辦、直接編輯或送出申請。

### 案件詳情導覽

詳情採申請準備報告版型，分成準備進度、照顧需求、服務原因或待補資訊、下一步提醒。單筆查詢新增 `item.careOverview`，由本人草稿或案件所連結的已完成草稿擷取照顧描述白名單，包含照顧情境、日常協助、照顧支持與環境；不輸出身分證、生日、地址、電話欄位。未記錄的值為 `null`，沒有關聯草稿時為空陣列，不推測診斷、等級、補助或服務效益。自由文字仍可能含使用者自行輸入的個資，Demo 應繼續使用虛構資料。

- `/cases` 顯示可點擊的摘要卡；案件點入 `/cases/[id]`，收集中草稿點入 `/cases/drafts/[id]`。
- `GET /api/cases/{id}` 回傳 `{ kind: "case", item }`，包含完整需求摘要與各服務的原因、狀態。
- `GET /api/case-drafts/{id}` 回傳 `{ kind: "draft", item }`，包含目前摘要、服務縣市、缺漏資訊與更新時間，不回傳原始個資欄位。
- 兩個端點都使用登入 cookie，以本人 ID 與資料 UUID 篩選。未登入 401、無效 ID／query 400、他人或不存在資料 404、讀取失敗 503，且不快取。
- 草稿完成轉成案件後，原草稿詳情會顯示找不到資料，請返回列表查看新案件。草稿的聊天入口仍是一般 `/chat`，不會指定 Agent 續辦某筆草稿。

### Agent function tools

目前只有申請資料收整 Agent 配置 function tools；一般問答 Agent 沒有 tools。

| Tool | 觸發時機 | 用途與結果 |
| --- | --- | --- |
| `collect_application_intake` | 使用者提供新的申請資料 | 將使用者明確提供的欄位合併到該 user 的 `application_intakes.data`；資料未齊時回傳 `collecting` 與缺少欄位，齊全時回傳 `ready`。 |
| `update_application_package` | 使用者明確要求修改或更新既有長照服務方案 | 重新讀取該 user 最新的既有方案，只合併明確指定的變更，並同步更新 intake、方案摘要與服務清單。 |

讀取摘要與近期對話、保存 user／assistant 訊息及依 `userId` 查詢草稿是 API method/service 的固定流程，不是交由 Agent 自行決定是否呼叫的 function tool。

清空所有 `public` 資料表資料時，呼叫 `POST /api/database/clear`。此 API 保留資料表與 Drizzle migration 紀錄。

## 指令

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:generate
npm run db:migrate
```

## 資料庫 Schema

| 資料表 | 用途 |
| --- | --- |
| `users` | 帳號、密碼雜湊與必填身份（`user`／`admin`） |
| `profiles` | 使用者姓名、出生日期、地區與電話；每個帳號一筆 |
| `chat_messages` | 使用者與 AI 的聊天紀錄，以及可選的申請流程連結 |
| `chat_summaries` | 每位使用者一份滾動式對話摘要，以及摘要涵蓋到的最後訊息位置 |
| `application_packages` | 每位使用者、每個照顧對象的申請案件與需求摘要 |
| `application_services` | 案件內有順序的服務建議、原因及申請狀態 |
| `application_intakes` | Agent 收整中的長照申請草稿；完整後連到產生的長照服務方案 |
| `emergency_triages` | `follow_up`／`emergency` 分流事件、時間、原始訊息 `message` 與事件當下姓名 `user_name`（既有紀錄可為空） |

Schema 位於 `apps/api/src/services/db/schema.ts`，migration 位於 `drizzle/`。確認 SQL 後以 `npm run db:migrate` 套用。

### 危急訊息分流 API

`POST /api/emergency-triages` 接收 `{ "message": "我休克了" }`，需可信 `Origin` 與 `care_user_session` cookie；前台使用 `fetchApi` 呼叫。只接受非空白、最多 4000 字的原始訊息，不接受 `userId` 或客戶端指定分級。

- `normal`：回傳 `{ urgency: "normal", saved: false, triageId: null }`，不寫入。
- `follow_up`／`emergency`：將 session 使用者 ID、原始 `message` 與 `urgency` 寫入 `emergency_triages`，同一 SQL 從該使用者的 `profiles.name` 保存姓名快照 `user_name`（無 profile 為 null），回傳 `{ urgency, saved: true, triageId }`。姓名不傳給模型；歷史事件不隨 profile 改名，也不回填無法確認的舊姓名。
- 驗證失敗回傳 400／401／403；模型逾時、拒答、格式錯誤或儲存失敗回傳 503，不可視為沒有風險。寫入失敗可能結果未知；目前無重試去重，呼叫端不要自動重送。

沿用現有 `OPENAI_API_KEY` 與模型，只傳此則訊息、不附 profile 或帳號，停用 SDK tracing 並設定 `store: false`（不代表供應商所有資料保留皆關閉）。原始訊息仍可能包含個資；使用此功能前須取得適當同意。聊天頁每次有效送出訊息時，會並行呼叫此 API，不等待分流完成才顯示聊天回覆；不重送歷史紀錄、不依賴聊天回覆是否成功。分流使用獨立 35 秒前端逾時，不因聊天結束取消；失敗或回應格式無效時顯示獨立警示，不鎖住聊天，也不因下一次成功而掩蓋先前失敗。沒有自動重試或救護通知；關閉頁面仍可能中斷請求，此方式不是可靠背景佇列。

分類採結構化輸出，參考 [OpenAI 文件](https://developers.openai.com/api/docs/guides/structured-outputs)；危急例示參考 [救護服務警訊](https://www.londonambulance.nhs.uk/our-services/emergency-care/calling-999/) 與 [中風警訊](https://www.nhs.uk/conditions/stroke/symptoms/)。這是未經臨床驗證的輔助分流，不是醫療診斷或救護通報；只看單則訊息可能誤判或漏判，不能作為唯一緊急判斷機制。`follow_up` 是產品追蹤分類，不是官方醫療分級。

離線回歸：`node --test apps/api/src/functions/emergency-triages/index.test.mjs apps/api/src/methods/emergency-triages/index.test.mjs apps/api/src/services/openai/emergency-triage.test.mjs`。模型語意測試需自行明確啟用：`TRIAGE_LIVE_TEST=1 node --import ./scripts/load-env.mjs --test apps/api/src/services/openai/emergency-triage.test.mjs`，會使用虛構訊息呼叫付費 API，但不寫入資料庫。

合併後的 migration 順序為 `0002_vengeful_reavers`（後台個案）→ `0003_happy_sheva_callister`（聊天摘要，原 main 的 `0002_happy_sheva_callister`）。兩份 SQL 內容與原始時間戳保留，snapshot 已合併成連續歷史。本次 Git 合併沒有執行 migration；若目標資料庫曾只套用聊天摘要、未套用後台個案，須先核對 migration 紀錄與實際資料表，不能直接假設 `db:migrate` 會補齊較早的變更。

## 使用者端第一版

使用 `npm run dev:api`（development）時，使用者註冊與登入只檢查字號格式「大寫英文＋1 或 2＋八位數字」，略過加權檢查碼，方便虛構資料測試。密碼規則、帳號唯一性與 session 驗證不變；專員登入不放寬。production、test 或未設定 NODE_ENV 仍驗證檢查碼，因此不合檢查碼的 Demo 帳號無法在正式模式登入。

- 個人檔案：登入後進入 `/profile` 自動讀取本人姓名、生日、地區與電話；四項填齊後手動儲存。使用 `GET /api/profile`、`PUT /api/profile`，尚未建立時回傳 `profile: null`。不修改案件或帳密；Agent 自動補入尚未串接，限制見 [個人檔案串接說明](docs/profile-integration.md)。

- `/`：公開介紹首頁。
- `/login`：身分證字號＋密碼登入／註冊；成功後導向 `/home`。
- `/home`、`/chat`、`/cases`：需經 API 驗證登入狀態的桌面版型。聊天已串接真實 API、處理進度及最近 20 則歷史；案件頁顯示收集中草稿、缺漏資訊、需求摘要及服務建議與狀態。
- 使用者 API：`POST /api/user-auth/register`、`POST /api/user-auth/login`、`POST /api/user-auth/logout`、`GET /api/user-auth/session`。
- 註冊／登入 body：`{ "nationalId": "...", "password": "..." }`，成功只回傳 `{ user: { id, role } }`；不回傳身分證字號或密碼雜湊。
- 註冊固定建立 `user` 角色，專員登入流程不在本次範圍。

在 repo 根目錄 `.env.local` 加入至少 32 字元的隨機 `USER_SESSION_SECRET`，可用以下命令產生後手動填入（不要提交或分享輸出）：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 建立本機後台專員帳號

先完成 migration，並確認 `.env.local` 的 `DATABASE_URL` 指向本機開發／測試用資料庫。接著在 PowerShell 設定一次性的環境變數後執行：

```powershell
$env:ADMIN_NATIONAL_ID = "A123456789"
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR((Read-Host "專員測試密碼" -AsSecureString))
try {
  $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  npm run seed:admin
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  Remove-Item Env:ADMIN_NATIONAL_ID, Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
}
```

此指令只會新增 `role = 'admin'` 的帳號，密碼以與登入流程相同的 scrypt 參數雜湊後寫入；若身分證字號已存在，會失敗且不更新既有帳號。請使用通過檢查碼的測試身分證字號，且不要在 shell history、`.env.local` 或版本控制中保存密碼。

API 的 `dev:api`、`build:api`、`start:api` 與 Drizzle 都明確載入根目錄 `.env.local`；請在 repo 根目錄執行指令，不要另外維護 `apps/api/.env.local`。user／admin 不載入後端 secrets，也不可用 `NEXT_PUBLIC_` 暴露它們。

修改環境變數後重新啟動 API。未設定 secret 或無法連線資料庫時，登入／註冊安全失敗，不會假裝成功。前台使用 `fetchApi` 搭配 `credentials: "include"`，不在瀏覽器儲存帳密或 token。

密碼格式為 `scrypt-v1:<salt>:<hash>`，參數 N=32768、r=8、p=1、64-byte key；既有其他雜湊格式不會自動遷移。Session 使用 8 小時 HMAC 簽章 HttpOnly cookie；每次 session 查詢再由資料庫確認使用者角色。未來的資料 API 必須自行呼叫身份驗證 method，不能只依賴前台 layout。

本機請統一使用 `localhost`，不要混用 `127.0.0.1`。API app 的 `apps/api/src/proxy.ts` 統一處理所有端點（含 `/api/*`、`/chat` 及未來新增路由）的 CORS 與 OPTIONS，handler 不需重複設定。開發環境允許 `http://localhost:3000`、`http://localhost:3001`、`http://localhost:3003`，支援 cookie；後台 handler 另限制只接受 `http://localhost:3001`。不可信 Origin 在進入 handler 前回傳 403。無 Origin 的伺服器請求可通過，但登入／登出等 cookie 寫入仍要求可信 Origin。CORS 不取代身分驗證。production 必須設定 `USER_AUTH_ALLOWED_ORIGINS` 明確 allowlist，並使用 HTTPS；後台登入與 `/api/admin/*` 另須設定只含後台網域的 `ADMIN_ALLOWED_ORIGINS`。需要呼叫後台的網域須同時通過兩層 allowlist。現階段固定 localhost API URL 仍是本機 Demo 契約，尚不適合直接部署。

MVP 限制：沒有忘記密碼、身份真實性查驗、跨裝置登出；登出會清除目前 cookie，但已複製的簽章 token 在到期前仍有效。限流為單一 API process 共用每分鐘 30 次登入／註冊嘗試，正式服務需改為持久化、分身份限流。請勿使用真實個資或常用密碼測試。

`npm test` 包含密碼雜湊、身分證檢查碼與 session 防竄改／過期測試。啟動 API 後，可執行 `AUTH_HTTP_TEST=1 npm test` 驗證 CORS、錯誤輸入、匿名 session 與登出 cookie；此測試不建立帳號或寫入資料庫。真實註冊／登入仍須在配置好資料庫及 secret 後另行驗證。

確認本機 API 所連的 Neon 是測試用資料庫後，可執行 `AUTH_DATABASE_TEST=1 node --test apps/api/src/functions/user-auth/database.test.mjs`。這會建立並保留一筆隨機測試帳號，驗證註冊、拒絕重複帳號、錯誤密碼、正常登入、重讀 session 與登出 cookie，不清空或刪除既有資料。輸出僅包含測試帳號 UUID，不含帳密。此為 HTTP 整合測試，不取代瀏覽器的 cookie／重新整理操作驗證。

## 結構

- `apps/user`：使用者前台，port `3000`
- `apps/admin`：後台專員介面，port `3001`
- `apps/api`：user 與 admin 共用的 API，port `3002`
- `apps/application`：長照服務申請頁面（Next.js App Router），port `3003`
- `apps/api/src/services/db`：唯一的 Drizzle client 與 PostgreSQL schema
- `drizzle`：執行 `npm run db:generate` 後產生、可提交的 migrations
- `docs/project-reference.pptx`：黑客松規則與方向的離線參考簡報
