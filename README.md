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
cp .env.example apps/api/.env.local
```

接著在三個 terminal 分別執行：

```bash
npm run dev:user
npm run dev:admin
npm run dev:api
```

使用資料庫前，請將 `apps/api/.env.local` 的 `DATABASE_URL` 換成 Neon pooled connection string。前端加入 API 呼叫時，在各 app 的 `.env.local` 設定 `NEXT_PUBLIC_API_URL=http://localhost:3002`。

## 指令

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:generate
npm run db:migrate
```

目前只有 API health check，尚無商業功能或資料表。新增 `apps/api/src/services/db/schema.ts` 後先執行 `npm run db:generate` 並檢查 SQL，再以 `npm run db:migrate` 套用。

## 結構

- `apps/user`：使用者前台，port `3000`
- `apps/admin`：後台專員介面，port `3001`
- `apps/api`：兩個前端共用的 API，port `3002`
- `apps/api/src/services/db`：唯一的 Drizzle client 與 PostgreSQL schema
- `drizzle`：執行 `npm run db:generate` 後產生、可提交的 migrations
- `docs/project-reference.pptx`：黑客松規則與方向的離線參考簡報
