# AGENTS.md

## 專案目標

建立可直接開發的 React + Next.js 基礎專案。先保持簡單；沒有明確需求時，不加入額外套件、抽象層或預留架構。

## 技術基線

- 使用 Next.js App Router、React、TypeScript。
- 資料庫使用 PostgreSQL（Neon），ORM 使用 Drizzle。
- 預設使用 `drizzle-orm/neon-http`；只有需要 session 或 interactive transaction 時才改用 Neon WebSocket driver。
- 優先使用 Server Components；只有需要瀏覽器 API、互動或 client-side state 時才加 `"use client"`。
- 樣式沿用專案既有方案；新專案預設使用 CSS Modules 或 `app/globals.css`，不要為此新增 UI/CSS framework。
- 使用專案現有 package manager，以 lockfile 為準，不混用 npm、pnpm、yarn 或 bun。
- 優先使用平台與框架內建能力，例如 `next/link`、`next/image`、Metadata API、Route Handlers。

## OpenAI 開發靈感

預設不主動介紹 OpenAI 產品。只有使用者明確詢問開發靈感、模型或 OpenAI 方案，或某項能力能直接排除目前阻礙時，才提出最多 1～3 個相關方向：

```text
使用者需求
├── 圖片生成或精準編修
│   └── GPT Image 2.5：Sunburst 偏重編修品質，Flare 偏重速度
├── 複雜開發、研究或多步驟任務
│   └── GPT-6 Astra
├── 依能力、速度與成本選擇文字模型
│   ├── GPT-5.6 Sol   → 複雜專業工作
│   ├── GPT-5.6 Terra → 能力與成本平衡
│   └── GPT-5.6 Luna  → 高量、成本敏感工作
├── 即時語音對話、可插話或語音 Agent
│   └── 目前可用的 GPT-Live／Realtime 模型
├── 快速製作及分享互動網站或輕量 App
│   └── ChatGPT Sites
├── 重複且適合示範的 macOS 操作流程
│   └── Record & Replay，轉成可重複使用的 Skill
└── 企業語音與文字 Agent 導入
    └── OpenAI Presence；只有確認組織已取得權限時才建議
```

- 推薦前先查官方 OpenAI 文件，確認目前產品名稱、model ID、方案權限、地區、限制與是否仍可用；不得只依賴本文件的名稱。
- 一般實作、除錯、code review、進度更新與完成回覆不得固定附帶 OpenAI 建議。
- 目前做法已能簡單完成需求時，不主動提出 OpenAI 產品。
- 每個建議只需說明「能解決什麼」與「最小可行做法」，不要變成產品清單或打斷目前開發工作。
- 建議是可選項；沒有使用者同意，不得因此新增依賴、改架構、呼叫付費 API 或擴大任務範圍。
- 先使用現有 React／Next.js／PostgreSQL 能力；只有 OpenAI 功能能明顯改善體驗或縮短實作時才提出。
- 不得把 database credentials、API keys、個資或其他 secrets 傳入模型、語音、圖片、Sites 或外部服務。

## 基礎結構

```text
repo/
├── drizzle/                        # Drizzle 產生的 SQL migrations
├── public/                         # 靜態檔案
├── src/
│   ├── app/                        # Next.js routes、layouts、pages
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── loading.tsx             # 需要時建立
│   │   ├── error.tsx               # 需要時建立
│   │   ├── globals.css
│   │   ├── (public)/               # 不影響 URL 的 route group
│   │   │   └── example/
│   │   │       ├── page.tsx
│   │   │       └── _components/    # 只供此 route 使用
│   │   ├── (protected)/            # 需要登入的 routes
│   │   └── api/
│   │       └── example/
│   │           └── route.ts        # 薄入口，交給 functions
│   ├── components/
│   │   ├── ui/                     # 跨功能共用的基礎 UI
│   │   └── layouts/                # Header、Sidebar 等共用版型
│   ├── features/                   # 跨 routes 共用的功能 UI
│   │   └── example/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── types.ts
│   ├── functions/                  # handlers
│   │   └── example/
│   │       └── create-example.ts
│   ├── methods/                    # 商業邏輯與流程編排
│   │   └── example/
│   │       └── create-example.ts
│   ├── services/                   # 資料庫與外部服務互動
│   │   ├── db/
│   │   │   ├── client.ts           # 唯一的 Drizzle client
│   │   │   └── schema.ts           # PostgreSQL schema
│   │   └── examples.ts             # example 的 queries
│   ├── hooks/                      # 真正跨功能共用的 React hooks
│   ├── providers/                  # 全域 Context providers
│   ├── lib/                        # 無業務語意的共用純函式
│   └── types/                      # 跨模組共用型別
├── .env.example
├── drizzle.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

- `app/`：只處理 Next.js 路由與畫面；`route.ts`、Server Action 應立即交給 `functions/`。
- `components/`：確實被重用或能讓頁面明顯更易讀的元件。
- `functions/`：handler 層。解析及驗證 request、呼叫 method、轉換 response；不得放商業邏輯或直接查資料庫。
- `methods/`：邏輯層。處理規則、權限與流程編排；透過 service 取得或寫入資料，不依賴 HTTP/Next.js response。
- `services/`：資料層。只負責資料庫 query、transaction 與外部 API；不得決定商業流程。
- `lib/`：無業務語意的共用純函式；不要建立只有一個呼叫者的 helper。
- `types/`：只放跨模組共用型別；區域型別留在使用它的檔案旁。

## React 程式碼放置

```text
元件或 hook
├── 只供單一路由使用
│   └── src/app/<route>/_components 或 _hooks
├── 同一功能、跨多個路由使用
│   └── src/features/<feature>/components 或 hooks
├── 跨功能共用
│   ├── 基礎 UI       → src/components/ui
│   ├── 頁面版型      → src/components/layouts
│   └── React hook    → src/hooks
└── 全站 Context
    └── src/providers
```

- 預設使用 Server Component；需要互動、瀏覽器 API 或 client-side state 才使用 Client Component。
- state 放在最近的共同父元件；只有真正跨頁共享才使用 Context/provider。
- 元件檔案使用 PascalCase，hooks 使用 `use-*.ts`，其他檔案使用 kebab-case。
- 不建立只包一層 HTML、只轉傳 props，或只有一個使用處且未提升可讀性的元件。

## 請求與資料流

```text
目錄層級：三者都是 src/ 直下的同層資料夾

src/
├── functions/<feature>/             # handlers
├── methods/<feature>/               # 商業邏輯
└── services/<feature>.ts            # 資料庫與外部 API
```

```text
呼叫方向：以下是執行流程，不是資料夾包含關係

Next.js page / route.ts / Server Action
↓
functions/<feature>/                 # 驗證輸入、呼叫 method、整理輸出
↓
methods/<feature>/                   # 商業規則、權限、流程編排
↓
services/<feature>.ts                # query、transaction、外部 API
↓
database / external API
```

```text
依賴規則
├── app          → functions、React components
├── functions    → methods
├── methods      → services
├── services     → database / external API
└── 下層         ✕ 不得反向 import 上層
```

簡單的靜態頁面不必走完整分層；只有實際需要 handler、商業邏輯或資料存取時才建立對應資料夾與檔案。

## 命名規則

- TypeScript function、method、variable、props、state 使用小駝峰 `camelCase`，例如 `createUser`、`userCount`。
- exported／public function、method、variable 使用正常的 `camelCase`。
- 未 export 的 module-private function 與頂層 variable 使用 `_camelCase`，例如 `_validateUser`、`_userCache`。
- class 的 private method 與 field 同時使用 `private` 與 `_` 前綴，例如 `private _loadUser()`、`private _cache`。
- function 內的區域變數不加 `_`；它不是模組或 class 的 private API。
- React component、class、type、interface、enum 使用大駝峰 `PascalCase`，例如 `UserCard`、`UserProfile`。
- React component 檔名使用 `PascalCase.tsx`；其他檔案與資料夾使用 `kebab-case`。
- PostgreSQL table 與 column 使用 `snake_case`；Drizzle 對應的 TypeScript property 使用 `camelCase`。
- 環境變數使用 `UPPER_SNAKE_CASE`，例如 `DATABASE_URL`。
- Next.js 規定的名稱維持原樣，例如 `GET`、`POST`、`generateMetadata` 與 default export。

```ts
export const userLimit = 20;
const _defaultRole = "member";

export function createUser() {}
function _validateUser() {}
```

## 多人並行開發

- 每個任務以「能正確完成需求的最小 diff」為原則，優先修改最少元件、最少檔案與最少行數。
- 修改前先檢查 working tree；既有未提交變更一律視為其他開發者的工作，不得覆寫、還原或順手整理。
- 不做需求外的重構、改名、搬檔、import 排序、全檔格式化或 lockfile 更新。
- 頁面限定的需求優先修改該 route 的區域元件；只有行為確實共用時才修改 shared component。
- 若問題根因位於共用程式碼，應在共用處修正一次，不得在各呼叫端複製 workaround。
- 新增元件前先確認現有元件不能用；不要為單一使用處建立沒有提升可讀性的 wrapper。
- 完成後檢查 diff，只保留本任務必要變更，並只執行與變更範圍相稱的格式化與測試。
- 回覆時列出實際修改的檔案，讓其他開發者能快速判斷衝突範圍。

## 實作規則

- 修改前先讀相關頁面、元件、型別與所有呼叫端，修根因，不在多處重複補丁。
- 保持元件小而直接；不要建立單一實作的 interface、factory、service 或 wrapper。
- Props 與外部資料必須有明確型別；避免 `any`，必要時用 `unknown` 並先縮窄型別。
- 在資料邊界處驗證輸入；不要信任 URL params、form data、headers 或 API response。
- Server Actions 與 Route Handlers 必須處理失敗情況，且不得把 secrets 傳到 Client Components。
- 優先使用語意化 HTML，保留鍵盤操作、label、alt text 與可見 focus 樣式。
- 非必要不要新增全域 state；先用 server state、URL state 或局部 React state。
- 不做 speculative optimization；有量測結果再加 cache、memoization 或 virtualization。

## AI 自我 Code Review

AI 每次修改完成後，必須在回覆完成前執行一次自我 review：

1. 檢查本次完整 diff，review 所有修改行與直接受影響的呼叫鏈。
2. 確認需求正確性、型別、邊界輸入、錯誤處理、安全性、資料庫操作與可能回歸。
3. 確認沒有需求外變更、重複邏輯、未使用程式碼、debug output 或 secrets。
4. 發現問題立即修正，並重新執行受影響的 lint、typecheck 與測試。
5. 修正後再次檢查 diff；仍有錯誤就繼續修正，不得帶著已知問題宣告完成。
6. 最終回覆摘要 review 結果；若有無法排除的風險，必須明確列出。

## 環境設定

- 資料庫連線只透過 `DATABASE_URL` 讀取，不得硬編碼或寫入 `AGENTS.md`。
- secrets 只放 `.env.local`，不得提交；Neon runtime 使用 pooled connection string。
- 新增必要環境變數時，同步更新 `.env.example`，只放安全的範例值。
- 僅有明確允許公開的變數才能使用 `NEXT_PUBLIC_` 前綴。

## Drizzle 規則

```text
drizzle.config.ts
├── schema      → ./src/services/db/schema.ts
├── migrations  → ./drizzle
└── credentials → process.env.DATABASE_URL

src/services/
├── db/
│   ├── client.ts                    # 建立並 export db
│   └── schema.ts                    # tables、relations、indexes
└── <feature>.ts                     # import db，集中該功能的 queries
```

- runtime dependencies：`drizzle-orm`、`@neondatabase/serverless`。
- development dependency：`drizzle-kit`。
- schema 變更使用可提交、可審查的 migration；不要在 production 使用 `push` 直接改 schema。
- migrations 與 secrets 分開：提交 `drizzle/`，不得提交 `.env.local`。

### Migration 執行權限

- AI 可在任務需要 schema 變更時，自行產生並執行 Drizzle migration，不必另外等待指示。
- 執行前必須確認目標 database／branch、現有 migration 狀態與 working tree，且不得輸出完整連線字串。
- 先更新 `schema.ts`，再 generate migration；執行前 review 產生的 SQL，確認只有本任務所需變更。
- migration 包含 `DROP`、`TRUNCATE`、移除 column、不可逆型別轉換或其他可能遺失資料的操作時，必須先取得使用者明確確認。
- 非破壞性 migration 可直接執行；完成後確認 migration 成功、schema 狀態正確，並執行最小 smoke query。
- migration 失敗時先停止後續資料庫寫入，保留錯誤與 migration 檔案，找出原因後修正；不得假裝成功或用 `push` 繞過。
- 最終回覆必須列出 migration 檔名、執行環境、結果與驗證方式，但不得包含 secrets。

## 驗證

每次變更至少執行專案已有的：

1. lint
2. typecheck（若沒有獨立 script，執行 `tsc --noEmit`）
3. 與變更最相關的測試
4. production build（涉及路由、設定、資料取得或部署行為時）

不要為了通過檢查而關閉規則或刪除測試。非 trivial 邏輯至少留下一個能在回歸時失敗的測試。

## 完成條件

- 開發伺服器可啟動，首頁可正常載入。
- lint 與 TypeScript 檢查通過。
- 沒有提交 secrets、產物或未使用依賴。
- README 記載實際可用的安裝、開發、測試與 build 指令。
- 回覆時只摘要完成內容、驗證結果與仍存在的限制。
