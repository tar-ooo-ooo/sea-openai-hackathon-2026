# Sea × OpenAI Hackathon 2026

可直接開發的 Next.js App Router、TypeScript、PostgreSQL（Neon）與 Drizzle 基礎專案。

## 開始使用

需求：Node.js 20.9 以上。

```bash
npm install
cp .env.example .env.local
npm run dev
```

開啟 <http://localhost:3000>。使用資料庫前，請將 `.env.local` 的 `DATABASE_URL` 換成 Neon pooled connection string。

## 指令

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:generate
npm run db:migrate
```

目前沒有商業功能或資料表，因此尚未產生 migration。新增 schema 後先執行 `npm run db:generate` 並檢查 SQL，再以 `npm run db:migrate` 套用。

## 結構

- `src/app`：Next.js routes 與頁面
- `src/services/db`：唯一的 Drizzle client 與 PostgreSQL schema
- `drizzle`：執行 `npm run db:generate` 後產生、可提交的 migrations
- `docs/project-reference.pptx`：黑客松規則與方向的離線參考簡報
