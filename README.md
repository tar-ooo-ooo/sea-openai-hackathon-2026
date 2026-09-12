# Sea × OpenAI Hackathon 2026

本專案將使用者前台、後台專員介面與共用 API 分離。

## 架構與 ports

```text
使用者前台 apps/user             http://localhost:3000
後台專員 apps/admin              http://localhost:3001
共用 API apps/api                http://localhost:3002
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

接著在三個 terminal 分別執行：

```bash
npm run dev:user
npm run dev:admin
npm run dev:api
```

所有本機環境變數集中在專案根目錄 `.env.local`。使用資料庫前，請將其中的 `DATABASE_URL` 換成 Neon pooled connection string。兩個前端透過共用 `fetchApi` 呼叫 `http://localhost:3002`。

`POST /chat` 接受 `{ "message": "...", "userId": "使用者 UUID（選填）" }`。帶上 `Accept: application/x-ndjson` 時，透過 OpenAI Agents SDK 逐行回傳 `progress`、`result` 或 `error` 事件；未指定時維持 `{ "reply": "..." }` JSON。登入使用者帶入 `userId` 時，API 只讀寫該使用者最近 20 則 `chat_messages`；表示要申請長照時，Agent 會把資料收整到該使用者的 `application_intakes`，完整後產生 `application_packages` 與 `application_services`。使用前須在根目錄 `.env.local` 設定 server-only `OPENAI_API_KEY`。

啟動 API 後可開啟 Swagger UI：`http://localhost:3002/api/docs`；OpenAPI JSON 位於 `http://localhost:3002/api/openapi`。

### Agent function tools

目前只有申請資料收整 Agent 配置 function tool；一般問答 Agent 沒有 tools。

| Tool | 觸發時機 | 用途與結果 |
| --- | --- | --- |
| `collect_application_intake` | 帶有有效 `userId`，且使用者表示要申請長照或已有收整中的草稿 | 將使用者明確提供的欄位合併到該 user 的 `application_intakes.data`。資料未齊時回傳 `collecting` 與缺少欄位；必填資料、同意與至少一項服務齊全後回傳 `packaged`，並建立 `application_packages` 與 `application_services`。 |

讀取最近 20 則對話、保存 user／assistant 訊息及依 `userId` 查詢草稿是 API method/service 的固定流程，不是交由 Agent 自行決定是否呼叫的 function tool。

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
| `application_packages` | 每位使用者、每個照顧對象的申請案件與需求摘要 |
| `application_services` | 案件內有順序的服務建議、原因及申請狀態 |
| `application_intakes` | Agent 收整中的長照申請草稿；完整後連到產生的申請大禮包 |
| `emergency_triages` | `follow_up`／`emergency` 分流事件與時間，不保存原始健康描述 |

Schema 位於 `apps/api/src/services/db/schema.ts`，migration 位於 `drizzle/`。確認 SQL 後以 `npm run db:migrate` 套用。

## 結構

- `apps/user`：使用者前台，port `3000`
- `apps/admin`：後台專員介面，port `3001`
- `apps/api`：兩個前端共用的 API，port `3002`
- `apps/api/src/services/db`：唯一的 Drizzle client 與 PostgreSQL schema
- `drizzle`：執行 `npm run db:generate` 後產生、可提交的 migrations
- `docs/project-reference.pptx`：黑客松規則與方向的離線參考簡報
