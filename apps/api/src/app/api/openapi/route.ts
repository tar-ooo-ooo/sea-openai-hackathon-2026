const _openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Sea × OpenAI Hackathon API",
    version: "0.1.0",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Health" },
    { name: "Database" },
    { name: "Chat" },
  ],
  paths: {
    "/api/chat/history": {
      get: {
        tags: ["Chat"],
        summary: "取得登入使用者最近 20 則聊天紀錄（由舊至新）",
        security: [{ userSession: [] }],
        responses: {
          "200": {
            description: "聊天紀錄；Cache-Control: no-store",
            content: { "application/json": { schema: {
              type: "object", required: ["messages"], properties: { messages: {
                type: "array", maxItems: 20, items: {
                  type: "object", required: ["role", "content"], properties: {
                    role: { type: "string", enum: ["user", "assistant"] }, content: { type: "string" },
                  },
                },
              } },
            } } },
          },
          "401": { description: "未登入或 session 已過期" },
          "403": { description: "CORS 來源不允許" },
          "503": { description: "無法驗證登入或讀取紀錄" },
        },
      },
    },
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "檢查 API 狀態",
        responses: {
          "200": {
            description: "API 正常運作",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status"],
                  properties: { status: { type: "string", const: "ok" } },
                },
              },
            },
          },
        },
      },
    },
    "/api/database/clear": {
      post: {
        tags: ["Database"],
        summary: "清空 public schema 內所有資料",
        description: "保留資料表結構與 Drizzle migration 紀錄。MVP 版本沒有驗證。",
        responses: {
          "200": {
            description: "清空成功",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["cleared"],
                  properties: { cleared: { type: "boolean", const: true } },
                },
              },
            },
          },
          "500": { $ref: "#/components/responses/InternalServerError" },
        },
      },
    },
    "/chat": {
      post: {
        tags: ["Chat"],
        summary: "與長照 Agent 對話",
        security: [{ userSession: [] }],
        description: "必須登入；身分由 care_user_session cookie 決定。設定 Accept: application/x-ndjson 可逐行接收 progress、result 或 error 事件。串流開始後的錯誤以 error 事件回傳，HTTP 狀態仍為 200。",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ChatRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Agent 回覆",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChatResponse" },
              },
              "application/x-ndjson": {
                schema: { type: "string" },
                example: "{\"type\":\"progress\",\"progress\":{\"id\":\"analysis\",\"label\":\"正在整理回覆\",\"status\":\"active\"}}\n{\"type\":\"result\",\"result\":{\"reply\":\"您好\"}}\n",
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { description: "未登入或 session 已過期" },
          "403": { description: "userId 與 session 不符，或 CORS 來源不允許" },
          "502": { $ref: "#/components/responses/BadGateway" },
          "503": { $ref: "#/components/responses/ServiceUnavailable" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      userSession: { type: "apiKey", in: "cookie", name: "care_user_session" },
    },
    schemas: {
      ChatRequest: {
        type: "object",
        additionalProperties: false,
        required: ["message"],
        properties: {
          message: { type: "string", minLength: 1, maxLength: 4000 },
          userId: { type: "string", format: "uuid", deprecated: true, description: "不需傳入；若傳入必須與 session 使用者一致" },
        },
      },
      ChatResponse: {
        type: "object",
        required: ["reply"],
        properties: { reply: { type: "string" } },
      },
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: { error: { type: "string" } },
      },
    },
    responses: {
      BadRequest: {
        description: "輸入格式錯誤",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      BadGateway: {
        description: "AI 服務暫時無法使用",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ServiceUnavailable: {
        description: "尚未設定 AI 服務，或無法驗證登入狀態",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      InternalServerError: {
        description: "資料庫操作失敗",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  },
};

export function GET() {
  return Response.json(_openApiDocument);
}
